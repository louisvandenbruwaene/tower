// Tower Power test bot: a controller that plays like a careful but slow player. Not part of the game; it is for
// checking difficulty and catching regressions. Load it after index.html's script in a test page (it uses the game's
// globals), then each second: const d=decide(); if(d) exec(d[0]). decide() returns [command words, reason] or null.
const RING = 250; // where waiting planes circle, px from the airport
const D = {cool: new Map()}; // per plane and order: not before this game time again
const toward = p => compassWordFor(AIRPORT_X - p.x, AIRPORT_Y - p.y); // the compass word pointing at the airport
// where a plane will be in t seconds if nothing changes; a circling plane is its circle's centre, widened by its radius
function future(p, t, alt = p.targetLevel) {
  const c = climbRateOf(p),
    lvl = p.level + Math.sign(alt - p.level) * Math.min(Math.abs(alt - p.level), c * t);
  if (p.state === 'hold') {
    const c = p.holdCentre || spotHoldCentre(p);
    return [c.x, c.y, lvl, turnRadius(p, holdSpeed(p))];
  } // also a plane asked to hold here
  // landing: to the runway end, then along it; taking off: down the runway, then out
  const gf = CIRCLES[p.landingEnd],
    gr = CIRCLES[p.takeoffEnd],
    legs =
      p.state === 'final' && gf
        ? [
            [gf.endX, gf.endY],
            [gf.runway.x, gf.runway.y],
          ]
        : p.state === 'roll'
          ? [[gr.endX + gr.dirX * 2 * RUNWAY_HALF, gr.endY + gr.dirY * 2 * RUNWAY_HALF]]
          : [];
  const v = Math.max(p.speed, approachSpeed(p)),
    tgt = p.state === 'tofix' ? Math.atan2(FIXES[p.fix].y - p.y, FIXES[p.fix].x - p.x) : p.targetHeading;
  let x = p.x,
    y = p.y,
    go = v * t,
    lv = lvl;
  for (const [lx, ly] of legs) {
    const d = Math.hypot(lx - x, ly - y);
    if (go <= d) return [x + ((lx - x) * go) / d, y + ((ly - y) * go) / d, p.state === 'roll' ? 0 : lvl, 0];
    go -= d;
    x = lx;
    y = ly;
  }
  if (p.state === 'roll') lv = Math.min(alt, (c * go) / v); // climbing only starts at the end of the runway
  if (p.state === 'final') return [p.runway.x, p.runway.y, 0, 0];
  return [x + Math.cos(tgt) * go, y + Math.sin(tgt) * go, lv, 0];
}
function meets(a, b, altA = a.targetLevel, altB = b.targetLevel) {
  for (let t = 0; t <= 20; t += 0.5) {
    const [ax, ay, al, ar] = future(a, t, altA),
      [bx, by, bl, br] = future(b, t, altB);
    if (Math.abs(al - bl) < VERT_SEP_LEVELS + 0.2 && Math.hypot(ax - bx, ay - by) < separationNeeded(a, b) + 16 + ar + br)
      return true;
  }
  return false;
}
const clearAt = (p, alt) => alt <= highestLevel(p) && game.planes.every(o => o === p || onGround(o) || !meets(p, o, alt));
// the first level (from the wanted list) where this plane could circle without meeting anyone
const holdLevel = (p, levels) =>
  levels.find(lv => game.planes.every(o => o === p || onGround(o) || !meets({...p, state: 'hold'}, o, lv)));
// shortest form: ascend = the top level, descend = low
const levelCmd = (p, lv) =>
  lv === highestLevel(p) && lv > p.targetLevel
    ? [p.name, 'ascend']
    : lv === 0
      ? [p.name, 'descend']
      : [p.name, lv > p.targetLevel ? 'ascend' : 'descend', LEVEL_NAMES[lv]];
// would this plane, flying straight on (or that way), run into a storm cell in the next 14 s
const stormAhead = (p, d) => {
  const q = d ? {...p, state: 'fly', targetHeading: rad(HEADINGS[d])} : p;
  return game.storms.some(s => {
    for (let t = 0; t <= 14; t++) {
      const [x, y, , r] = future(q, t);
      if (Math.hypot(x - s.x - s.vx * t, y - s.y - s.vy * t) < s.r + 14 + r) return true;
    }
    return false;
  });
};
// returns [command words, reason]
function decide() {
  const air = game.planes.filter(p => !onGround(p)),
    free = p => p.state === 'fly' || p.state === 'hold' || p.state === 'tofix';
  const runwayInUse =
    RUNWAYS.some(runwayBusy) || game.planes.some(p => p.state === 'taxi' || p.state === 'lineup' || p.state === 'enter');
  const landing = game.planes.some(p => p.state === 'final' || p.state === 'rollout' || p.cleared);
  const once = (p, k, sec) => {
    const key = p.name + k;
    if ((D.cool.get(key) || 0) > game.time) return false;
    D.cool.set(key, game.time + sec);
    return true;
  };
  const ups = rules.levels.filter(i => i > 0).reverse(); // every level but low, highest first
  // the one arrival allowed down to low: a mayday first, then whoever is low already, else the closest
  const arrs = game.planes
    .filter(p => p.kind === 'arr' && free(p) && !p.cleared)
    .sort(
      (x, y) =>
        !!y.mayday - !!x.mayday ||
        !!y.type.prio - !!x.type.prio ||
        x.targetLevel - y.targetLevel ||
        distanceFromAirport(x) - distanceFromAirport(y),
    );
  const next = arrs[0];
  // compare with the true bearing, and allow more than the 22.5° a compass word can be off, or turns flip-flop
  const pointing = p =>
    p.state === 'hold' || Math.abs(wrap(Math.atan2(AIRPORT_Y - p.y, AIRPORT_X - p.x) - p.targetHeading)) <= rad(35);
  // a departure is let go only if its whole climb-out misses everyone
  const climbOut = (p, way) => {
    const k = Object.keys(CIRCLES).find(k => CIRCLES[k].way === way),
      g = CIRCLES[k];
    return {
      ...p,
      state: 'roll',
      takeoffEnd: k,
      runway: g.runway,
      x: g.endX,
      y: g.endY,
      heading: g.landHeading,
      targetHeading: rad(HEADINGS[p.dest]),
      speed: approachSpeed(p),
      level: 0,
      targetLevel: DEPART_LEVEL,
    };
  };
  // 1. separation before anything else: give one of the two a different level
  for (const a of air)
    for (const b of air) {
      if (a === b || !meets(a, b)) continue;
      for (const p of [a, b].filter(q => free(q) && !q.cleared).sort((x, y) => (y.kind !== 'arr') - (x.kind !== 'arr'))) {
        const o = p === a ? b : a;
        for (const lv of p.kind !== 'arr' ? ups : p === next ? [0, ...ups.slice().reverse()] : ups)
          if (lv !== p.targetLevel && clearAt(p, lv) && once(p, 'sep', 4))
            return [
              levelCmd(p, lv),
              `${p.name} and ${o.name} are heading for the same spot at the same level. ${p.name} goes ${LEVEL_NAMES[lv]}, so one passes over the other.`,
            ];
        const nearEdge = distanceFromAirport(p) > RADAR - 2 * turnRadius(p, holdSpeed(p)) - 25; // its circle would be pulled far inward to stay in your area
        if (
          p.kind === 'arr' &&
          p.state !== 'hold' &&
          !nearEdge &&
          holdLevel(p, [p.targetLevel]) !== undefined &&
          once(p, 'sep', 4)
        )
          return [[p.name, 'hold'], `${p.name} would get too close to ${o.name}. It circles on the spot until the way is clear.`];
      }
    }
  // storms: turn away to the nearest heading that misses them
  for (const p of air.filter(q => free(q) && !q.cleared))
    if (stormAhead(p)) {
      const d = [...COMPASS_WORDS]
        .sort((x, y) => Math.abs(wrap(rad(HEADINGS[x]) - p.targetHeading)) - Math.abs(wrap(rad(HEADINGS[y]) - p.targetHeading)))
        .find(k => !stormAhead(p, k));
      if (d && once(p, 'storm', 4))
        return [[p.name, 'turn', d], `${p.name} is heading into a storm cell. Turn it ${shortUpper(d)}, around it.`];
    }
  // an arrival heading out near the edge of the circle is turned back before it leaves your area
  for (const p of arrs) {
    const out = Math.cos(p.targetHeading - Math.atan2(p.y - AIRPORT_Y, p.x - AIRPORT_X));
    if (p.state === 'fly' && !p.cleared && distanceFromAirport(p) > RADAR - 70 && out > 0 && once(p, 'edge', 5))
      return [
        [p.name, 'turn', toward(p)],
        `${p.name} is heading out of your area. Turn it ${shortUpper(toward(p))}, back toward the airport.`,
      ];
  }
  // 2. the next arrival comes down and lands
  if (next) {
    const p = next;
    if (
      landing &&
      p.targetLevel > MISSED_LEVEL &&
      distanceFromAirport(p) < RING + 20 &&
      clearAt(p, MISSED_LEVEL) &&
      once(p, 'down', 8)
    )
      return [
        levelCmd(p, MISSED_LEVEL),
        `${p.name} is next to land, but the runway is still in use. Bring it down to mid for now.`,
      ];
    if (
      landing &&
      p.state === 'fly' &&
      distanceFromAirport(p) < RING - 40 &&
      holdLevel(p, [p.targetLevel]) !== undefined &&
      once(p, 'hold', 6)
    )
      return [[p.name, 'hold'], `${p.name} is next, but someone is still landing. It circles until the runway is free.`];
    if (!landing && p.targetLevel > 0 && clearAt(p, 0) && once(p, 'down', 8))
      return [levelCmd(p, 0), `${p.name} is next to land. Bring it down to low first: that takes a while.`];
    // pointed at the nearest open landing circle, re-aimed as it closes in; cleared once inside
    const k = circleAt(p);
    if (
      !landing &&
      p.targetLevel === 0 &&
      !(k && circleOpen(k)) &&
      !isHeading(p, wayToCircle(p)) &&
      !stormAhead(p, wayToCircle(p)) &&
      once(p, 'aimgate', 3)
    )
      return [
        [p.name, 'turn', wayToCircle(p)],
        `${p.name} is next to land. Point it at the ${nearestCircle(p)} landing circle: landing is only possible inside one${Object.keys(CIRCLES).every(circleOpen) ? '' : ' that is open (no storm over it, approaches into the wind)'}.`,
      ];
    if (!landing && p.targetLevel === 0 && k && circleOpen(k) && once(p, 'land', 1))
      return [[p.name, 'land'], `${p.name} is inside the landing circle. Clear it to land: it turns onto the runway by itself.`];
  }
  // 3. everyone else waits, circling near the airport on a free level
  for (const p of arrs) {
    if (p !== next && p.state === 'fly' && distanceFromAirport(p) < RING - 40) {
      const hl = holdLevel(p, [p.targetLevel, ...ups]);
      if (hl === p.targetLevel && once(p, 'hold', 6))
        return [
          [p.name, 'hold'],
          `Only one plane lands at a time and ${next.name} is first. ${p.name} circles here, ${LEVEL_NAMES[hl]}, until its turn.`,
        ];
      if (hl !== undefined && hl !== p.targetLevel && once(p, 'stack', 6))
        return [
          levelCmd(p, hl),
          `${p.name} must wait for ${next.name}, but its level is taken near the airport. Move it to ${LEVEL_NAMES[hl]} first.`,
        ];
    }
    if (
      p.state === 'fly' &&
      distanceFromAirport(p) >= RING - 40 &&
      !pointing(p) &&
      !stormAhead(p, toward(p)) &&
      once(p, 'aim', 6)
    )
      return [[p.name, 'turn', toward(p)], `${p.name} is not pointing at the airport. Turn it ${shortUpper(toward(p))}.`];
  }
  // 4. departures: take off down the runway end closest to their direction (or into the wind), then turn them that way;
  // overflights are turned back to their exit after any detour
  for (const p of game.planes.filter(p => p.kind !== 'arr').sort((a, b) => !!b.type.prio - !!a.type.prio)) {
    const way = bestTakeoffWay(p.dest);
    if (
      p.state === 'ready' &&
      !runwayInUse &&
      !landing &&
      !(next && next.targetLevel === 0) &&
      air.every(o => !meets(climbOut(p, way), o)) &&
      once(p, 'go', 3)
    )
      return [
        [p.name, 'takeoff', way],
        `The runway is free. ${p.name} wants to leave ${shortUpper(p.dest)}: take off ${shortUpper(way)}, ${rules.wind ? 'into the wind' : 'the runway direction closest to it'}.`,
      ];
    if ((free(p) || p.state === 'roll') && !isHeading(p, p.dest) && !stormAhead(p, p.dest) && once(p, 'dir', 4))
      return [
        [p.name, 'turn', p.dest],
        `${p.name} is on its way out. Turn it ${shortUpper(p.dest)}, so it leaves the circle on the ${shortUpper(p.dest)} side.`,
      ];
  }
  return null;
}
