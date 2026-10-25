// Tower Power test bot: a controller that plays like a careful but slow player. Not part of the game; it is for
// checking difficulty and catching regressions. Load it after index.html's script in a test page (it uses the game's
// globals), then each second: const d=decide(); if(d) exec(d[0]). decide() returns [command words, reason] or null.
const RING = 250; // where waiting planes circle, px from the airport
const D = {cool: new Map()}; // per plane and order: not before this game time again
const toward = plane => compassWordFor(AIRPORT_X - plane.x, AIRPORT_Y - plane.y); // the compass word pointing at the airport
// where a plane will be in t seconds if nothing changes; a circling plane is its circle's centre, widened by its radius
function future(plane, t, alt = plane.targetLevel) {
  const c = climbRateOf(plane),
    lvl = plane.level + Math.sign(alt - plane.level) * Math.min(Math.abs(alt - plane.level), c * t);
  if (plane.state === 'hold') {
    const c = plane.holdCentre || spotHoldCentre(plane);
    return [c.x, c.y, lvl, turnRadius(plane, holdSpeed(plane))];
  } // also a plane asked to hold here
  // landing: to the runway end, then along it; taking off: down the runway, then out
  const gf = CIRCLES[plane.landingEnd],
    gr = CIRCLES[plane.takeoffEnd],
    legs =
      plane.state === 'final' && gf
        ? [
            [gf.endX, gf.endY],
            [gf.runway.x, gf.runway.y],
          ]
        : plane.state === 'roll'
          ? [[gr.endX + gr.dirX * 2 * RUNWAY_HALF_LENGTH, gr.endY + gr.dirY * 2 * RUNWAY_HALF_LENGTH]]
          : [];
  const v = Math.max(plane.speed, approachSpeed(plane)),
    tgt =
      plane.state === 'tofix'
        ? Math.atan2(FIXES[plane.holdFix].y - plane.y, FIXES[plane.holdFix].x - plane.x)
        : plane.targetHeading;
  let x = plane.x,
    y = plane.y,
    go = v * t,
    level = lvl;
  for (const [lx, ly] of legs) {
    const d = Math.hypot(lx - x, ly - y);
    if (go <= d) return [x + ((lx - x) * go) / d, y + ((ly - y) * go) / d, plane.state === 'roll' ? 0 : lvl, 0];
    go -= d;
    x = lx;
    y = ly;
  }
  if (plane.state === 'roll') level = Math.min(alt, (c * go) / v); // climbing only starts at the end of the runway
  if (plane.state === 'final') return [plane.runway.x, plane.runway.y, 0, 0];
  return [x + Math.cos(tgt) * go, y + Math.sin(tgt) * go, level, 0];
}
function meets(a, b, altA = a.targetLevel, altB = b.targetLevel) {
  for (let t = 0; t <= 20; t += 0.5) {
    const [ax, ay, al, ar] = future(a, t, altA),
      [bx, by, bl, br] = future(b, t, altB);
    if (
      Math.abs(al - bl) < VERTICAL_SEPARATION_LEVELS + 0.2 &&
      Math.hypot(ax - bx, ay - by) < separationNeeded(a, b) + 16 + ar + br
    )
      return true;
  }
  return false;
}
const clearAt = (plane, alt) =>
  alt <= highestLevel(plane) && game.planes.every(option => option === plane || onGround(option) || !meets(plane, option, alt));
// the first level (from the wanted list) where this plane could circle without meeting anyone
const holdLevel = (plane, levels) =>
  levels.find(level =>
    game.planes.every(option => option === plane || onGround(option) || !meets({...plane, state: 'hold'}, option, level)),
  );
// shortest form: ascend = the top level, descend = low
const levelCmd = (plane, level) =>
  level === highestLevel(plane) && level > plane.targetLevel
    ? [plane.name, 'ascend']
    : level === 0
      ? [plane.name, 'descend']
      : [plane.name, level > plane.targetLevel ? 'ascend' : 'descend', LEVEL_NAMES[level]];
// would this plane, flying straight on (or that way), run into a storm cell in the next 14 s
const stormAhead = (plane, d) => {
  const otherPlane = d ? {...plane, state: 'fly', targetHeading: degreesToRadians(HEADINGS[d])} : plane;
  return game.storms.some(s => {
    for (let t = 0; t <= 14; t++) {
      const [x, y, , r] = future(otherPlane, t);
      if (Math.hypot(x - s.x - s.vx * t, y - s.y - s.vy * t) < s.radius + 14 + r) return true;
    }
    return false;
  });
};
// returns [command words, reason]
function decide() {
  const air = game.planes.filter(plane => !onGround(plane)),
    free = plane => plane.state === 'fly' || plane.state === 'hold' || plane.state === 'tofix';
  const runwayInUse =
    RUNWAYS.some(runwayBusy) ||
    game.planes.some(plane => plane.state === 'taxi' || plane.state === 'lineup' || plane.state === 'enter');
  const landing = game.planes.some(plane => plane.state === 'final' || plane.state === 'rollout' || plane.cleared);
  const once = (plane, k, sec) => {
    const key = plane.name + k;
    if ((D.cool.get(key) || 0) > game.time) return false;
    D.cool.set(key, game.time + sec);
    return true;
  };
  const ups = rules.levels.filter(i => i > 0).reverse(); // every level but low, highest first
  // the one arrival allowed down to low: a mayday first, then whoever is low already, else the closest
  const arrs = game.planes
    .filter(plane => plane.kind === 'arr' && free(plane) && !plane.cleared)
    .sort(
      (x, y) =>
        !!y.mayday - !!x.mayday ||
        !!y.type.priority - !!x.type.priority ||
        x.targetLevel - y.targetLevel ||
        distanceFromAirport(x) - distanceFromAirport(y),
    );
  const next = arrs[0];
  // compare with the true bearing, and allow more than the 22.5° a compass word can be off, or turns flip-flop
  const pointing = plane =>
    plane.state === 'hold' ||
    Math.abs(normaliseAngle(Math.atan2(AIRPORT_Y - plane.y, AIRPORT_X - plane.x) - plane.targetHeading)) <= degreesToRadians(35);
  // a departure is let go only if its whole climb-out misses everyone
  const climbOut = (plane, way) => {
    const k = Object.keys(CIRCLES).find(k => CIRCLES[k].way === way),
      circle = CIRCLES[k];
    return {
      ...plane,
      state: 'roll',
      takeoffEnd: k,
      runway: circle.runway,
      x: circle.endX,
      y: circle.endY,
      heading: circle.landHeading,
      targetHeading: degreesToRadians(HEADINGS[plane.exitWay]),
      speed: approachSpeed(plane),
      level: 0,
      targetLevel: DEPART_LEVEL,
    };
  };
  // 1. separation before anything else: give one of the two a different level
  for (const a of air)
    for (const b of air) {
      if (a === b || !meets(a, b)) continue;
      for (const plane of [a, b]
        .filter(otherPlane => free(otherPlane) && !otherPlane.cleared)
        .sort((x, y) => (y.kind !== 'arr') - (x.kind !== 'arr'))) {
        const option = plane === a ? b : a;
        for (const level of plane.kind !== 'arr' ? ups : plane === next ? [0, ...ups.slice().reverse()] : ups)
          if (level !== plane.targetLevel && clearAt(plane, level) && once(plane, 'sep', 4))
            return [
              levelCmd(plane, level),
              `${plane.name} and ${option.name} are heading for the same spot at the same level. ${plane.name} goes ${LEVEL_NAMES[level]}, so one passes over the other.`,
            ];
        const nearEdge = distanceFromAirport(plane) > areaRadius - 2 * turnRadius(plane, holdSpeed(plane)) - 25; // its circle would be pulled far inward to stay in your area
        if (
          plane.kind === 'arr' &&
          plane.state !== 'hold' &&
          !nearEdge &&
          holdLevel(plane, [plane.targetLevel]) !== undefined &&
          once(plane, 'sep', 4)
        )
          return [
            [plane.name, 'hold'],
            `${plane.name} would get too close to ${option.name}. It circles on the spot until the way is clear.`,
          ];
      }
    }
  // storms: turn away to the nearest heading that misses them
  for (const plane of air.filter(otherPlane => free(otherPlane) && !otherPlane.cleared))
    if (stormAhead(plane)) {
      const d = [...COMPASS_WORDS]
        .sort(
          (x, y) =>
            Math.abs(normaliseAngle(degreesToRadians(HEADINGS[x]) - plane.targetHeading)) -
            Math.abs(normaliseAngle(degreesToRadians(HEADINGS[y]) - plane.targetHeading)),
        )
        .find(k => !stormAhead(plane, k));
      if (d && once(plane, 'storm', 4))
        return [[plane.name, 'turn', d], `${plane.name} is heading into a storm cell. Turn it ${shortWayUpper(d)}, around it.`];
    }
  // an arrival heading out near the edge of the circle is turned back before it leaves your area
  for (const plane of arrs) {
    const out = Math.cos(plane.targetHeading - Math.atan2(plane.y - AIRPORT_Y, plane.x - AIRPORT_X));
    if (
      plane.state === 'fly' &&
      !plane.cleared &&
      distanceFromAirport(plane) > areaRadius - 70 &&
      out > 0 &&
      once(plane, 'edge', 5)
    )
      return [
        [plane.name, 'turn', toward(plane)],
        `${plane.name} is heading out of your area. Turn it ${shortWayUpper(toward(plane))}, back toward the airport.`,
      ];
  }
  // 2. the next arrival comes down and lands
  if (next) {
    const plane = next;
    if (
      landing &&
      plane.targetLevel > MISSED_LEVEL &&
      distanceFromAirport(plane) < RING + 20 &&
      clearAt(plane, MISSED_LEVEL) &&
      once(plane, 'down', 8)
    )
      return [
        levelCmd(plane, MISSED_LEVEL),
        `${plane.name} is next to land, but the runway is still in use. Bring it down to mid for now.`,
      ];
    if (
      landing &&
      plane.state === 'fly' &&
      distanceFromAirport(plane) < RING - 40 &&
      holdLevel(plane, [plane.targetLevel]) !== undefined &&
      once(plane, 'hold', 6)
    )
      return [[plane.name, 'hold'], `${plane.name} is next, but someone is still landing. It circles until the runway is free.`];
    if (!landing && plane.targetLevel > 0 && clearAt(plane, 0) && once(plane, 'down', 8))
      return [levelCmd(plane, 0), `${plane.name} is next to land. Bring it down to low first: that takes a while.`];
    // pointed at the nearest open landing circle, re-aimed as it closes in; cleared once inside
    const k = circleAt(plane);
    if (
      !landing &&
      plane.targetLevel === 0 &&
      !(k && circleOpen(k)) &&
      !isHeading(plane, wayToCircle(plane)) &&
      !stormAhead(plane, wayToCircle(plane)) &&
      once(plane, 'aimgate', 3)
    )
      return [
        [plane.name, 'turn', wayToCircle(plane)],
        `${plane.name} is next to land. Point it at the ${nearestCircle(plane)} landing circle: landing is only possible inside one${Object.keys(CIRCLES).every(circleOpen) ? '' : ' that is open (no storm over it, approaches into the wind)'}.`,
      ];
    if (!landing && plane.targetLevel === 0 && k && circleOpen(k) && once(plane, 'land', 1))
      return [
        [plane.name, 'land'],
        `${plane.name} is inside the landing circle. Clear it to land: it turns onto the runway by itself.`,
      ];
  }
  // 3. everyone else waits, circling near the airport on a free level
  for (const plane of arrs) {
    if (plane !== next && plane.state === 'fly' && distanceFromAirport(plane) < RING - 40) {
      const hl = holdLevel(plane, [plane.targetLevel, ...ups]);
      if (hl === plane.targetLevel && once(plane, 'hold', 6))
        return [
          [plane.name, 'hold'],
          `Only one plane lands at a time and ${next.name} is first. ${plane.name} circles here, ${LEVEL_NAMES[hl]}, until its turn.`,
        ];
      if (hl !== undefined && hl !== plane.targetLevel && once(plane, 'stack', 6))
        return [
          levelCmd(plane, hl),
          `${plane.name} must wait for ${next.name}, but its level is taken near the airport. Move it to ${LEVEL_NAMES[hl]} first.`,
        ];
    }
    if (
      plane.state === 'fly' &&
      distanceFromAirport(plane) >= RING - 40 &&
      !pointing(plane) &&
      !stormAhead(plane, toward(plane)) &&
      once(plane, 'aim', 6)
    )
      return [
        [plane.name, 'turn', toward(plane)],
        `${plane.name} is not pointing at the airport. Turn it ${shortWayUpper(toward(plane))}.`,
      ];
  }
  // 4. departures: take off down the runway end closest to their direction (or into the wind), then turn them that way;
  // overflights are turned back to their exit after any detour
  for (const plane of game.planes.filter(plane => plane.kind !== 'arr').sort((a, b) => !!b.type.priority - !!a.type.priority)) {
    const way = bestTakeoffWay(plane.exitWay);
    if (
      plane.state === 'ready' &&
      !runwayInUse &&
      !landing &&
      !(next && next.targetLevel === 0) &&
      air.every(option => !meets(climbOut(plane, way), option)) &&
      once(plane, 'go', 3)
    )
      return [
        [plane.name, 'takeoff', way],
        `The runway is free. ${plane.name} wants to leave ${shortWayUpper(plane.exitWay)}: take off ${shortWayUpper(way)}, ${windBlowing() ? 'into the wind' : 'the runway direction closest to it'}.`,
      ];
    if (
      (free(plane) || plane.state === 'roll') &&
      !isHeading(plane, plane.exitWay) &&
      !stormAhead(plane, plane.exitWay) &&
      once(plane, 'dir', 4)
    )
      return [
        [plane.name, 'turn', plane.exitWay],
        `${plane.name} is on its way out. Turn it ${shortWayUpper(plane.exitWay)}, so it leaves the circle on the ${shortWayUpper(plane.exitWay)} side.`,
      ];
  }
  return null;
}
