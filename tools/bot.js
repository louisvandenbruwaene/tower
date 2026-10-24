// Tower Power test bot: a controller that plays like a careful but slow player. Not part of the game; it is for
// checking difficulty and catching regressions. Load it after index.html's script in a test page (it uses the game's
// globals), then each second: const d=decide(); if(d) exec(d[0]). decide() returns [command words, reason] or null.
const RING=250;                // where waiting planes circle, px from the airport
const D={cool:new Map()};      // per plane and order: not before this game time again
const toward=p=>compass(AX-p.x,AY-p.y);   // the compass word pointing at the airport
// where a plane will be in t seconds if nothing changes; a circling plane is its circle's centre, widened by its radius
function future(p,t,alt=p.tgtAlt){
  const c=climbRate(p),lvl=p.alt+Math.sign(alt-p.alt)*Math.min(Math.abs(alt-p.alt),c*t);
  if(p.state==='hold'){const c=p.hc||spotCentre(p);return[c.x,c.y,lvl,turnR(p,vHold(p))]}   // also a plane asked to hold here
  // landing: to the runway end, then along it; taking off: down the runway, then out
  const gf=GATES[p.gk],gr=GATES[p.tk],legs=p.state==='final'&&gf?[[gf.tx,gf.ty],[gf.rw.x,gf.rw.y]]:p.state==='roll'?[[gr.tx+gr.ux*2*RW,gr.ty+gr.uy*2*RW]]:[];
  const v=Math.max(p.spd,vApp(p)),tgt=p.state==='tofix'?Math.atan2(FIXES[p.fix].y-p.y,FIXES[p.fix].x-p.x):p.tgt;
  let x=p.x,y=p.y,go=v*t,lv=lvl;
  for(const[lx,ly]of legs){const d=Math.hypot(lx-x,ly-y);if(go<=d)return[x+(lx-x)*go/d,y+(ly-y)*go/d,p.state==='roll'?0:lvl,0];go-=d;x=lx;y=ly}
  if(p.state==='roll')lv=Math.min(alt,c*go/v);          // climbing only starts at the end of the runway
  if(p.state==='final')return[p.rw.x,p.rw.y,0,0];
  return[x+Math.cos(tgt)*go,y+Math.sin(tgt)*go,lv,0]}
function meets(a,b,altA=a.tgtAlt,altB=b.tgtAlt){
  for(let t=0;t<=20;t+=.5){const[ax,ay,al,ar]=future(a,t,altA),[bx,by,bl,br]=future(b,t,altB);
    if(Math.abs(al-bl)<.7&&Math.hypot(ax-bx,ay-by)<sepOf(a,b)+16+ar+br)return true}return false}
const clearAt=(p,alt)=>alt<=ceil(p)&&S.planes.every(o=>o===p||onGround(o)||!meets(p,o,alt));
// the first level (from the wanted list) where this plane could circle without meeting anyone
const holdLevel=(p,levels)=>levels.find(lv=>S.planes.every(o=>o===p||onGround(o)||!meets({...p,state:'hold'},o,lv)));
// shortest form: ascend = the top level, descend = low
const levelCmd=(p,lv)=>lv===ceil(p)&&lv>p.tgtAlt?[p.name,'ascend']:lv===0?[p.name,'descend']:[p.name,lv>p.tgtAlt?'ascend':'descend',LV[lv]];
// would this plane, flying straight on (or that way), run into a storm cell in the next 14 s
const stormAhead=(p,d)=>{const q=d?{...p,state:'fly',tgt:rad(HEADINGS[d])}:p;
  return S.storms.some(s=>{for(let t=0;t<=14;t++){const[x,y,,r]=future(q,t);if(Math.hypot(x-s.x-s.vx*t,y-s.y-s.vy*t)<s.r+14+r)return true}return false})};
// returns [command words, reason]
function decide(){
  const air=S.planes.filter(p=>!onGround(p)),free=p=>p.state==='fly'||p.state==='hold'||p.state==='tofix';
  const runwayBusy=RUNWAYS.some(rwBusy)||S.planes.some(p=>p.state==='taxi'||p.state==='lineup'||p.state==='enter');
  const landing=S.planes.some(p=>p.state==='final'||p.state==='rollout'||p.cleared);
  const once=(p,k,sec)=>{const key=p.name+k;if((D.cool.get(key)||0)>S.t)return false;D.cool.set(key,S.t+sec);return true};
  const ups=[...Array(CFG.levels-1)].map((_,i)=>CFG.levels-1-i);   // every level but low, highest first
  // the one arrival allowed down to low: a mayday first, then whoever is low already, else the closest
  const arrs=S.planes.filter(p=>p.kind==='arr'&&free(p)&&!p.cleared).sort((x,y)=>(!!y.mayday-!!x.mayday)||(!!y.T.prio-!!x.T.prio)||(x.tgtAlt-y.tgtAlt)||(fromAirport(x)-fromAirport(y)));
  const next=arrs[0];
  // compare with the true bearing, and allow more than the 22.5° a compass word can be off, or turns flip-flop
  const pointing=p=>p.state==='hold'||Math.abs(wrap(Math.atan2(AY-p.y,AX-p.x)-p.tgt))<=rad(35);
  // a departure is let go only if its whole climb-out misses everyone
  const climbOut=(p,way)=>{const k=Object.keys(GATES).find(k=>GATES[k].hw===way),g=GATES[k];return{...p,state:'roll',tk:k,rw:g.rw,x:g.tx,y:g.ty,hdg:g.h,tgt:rad(HEADINGS[p.dest]),spd:vApp(p),alt:0,tgtAlt:1}};
  // 1. separation before anything else: give one of the two a different level
  for(const a of air)for(const b of air){if(a===b||!meets(a,b))continue;
    for(const p of [a,b].filter(q=>free(q)&&!q.cleared).sort((x,y)=>(y.kind!=='arr')-(x.kind!=='arr'))){const o=p===a?b:a;
      for(const lv of p.kind!=='arr'?ups:p===next?[0,...ups.slice().reverse()]:ups)if(lv!==p.tgtAlt&&clearAt(p,lv)&&once(p,'sep',4))
        return[levelCmd(p,lv),`${p.name} and ${o.name} are heading for the same spot at the same level. ${p.name} goes ${LV[lv]}, so one passes over the other.`];
      const nearEdge=fromAirport(p)>RADAR-2*turnR(p,vHold(p))-25;   // its circle would be pulled far inward to stay in your area
      if(p.kind==='arr'&&p.state!=='hold'&&!nearEdge&&holdLevel(p,[p.tgtAlt])!==undefined&&once(p,'sep',4))
        return[[p.name,'hold'],`${p.name} would get too close to ${o.name}. It circles on the spot until the way is clear.`]}}
  // storms: turn away to the nearest heading that misses them
  for(const p of air.filter(q=>free(q)&&!q.cleared))if(stormAhead(p)){
    const d=[...KEYS].sort((x,y)=>Math.abs(wrap(rad(HEADINGS[x])-p.tgt))-Math.abs(wrap(rad(HEADINGS[y])-p.tgt))).find(k=>!stormAhead(p,k));
    if(d&&once(p,'storm',4))return[[p.name,'turn',d],`${p.name} is heading into a storm cell. Turn it ${U(d)}, around it.`]}
  // an arrival heading out near the edge of the circle is turned back before it leaves your area
  for(const p of arrs){const out=Math.cos(p.tgt-Math.atan2(p.y-AY,p.x-AX));
    if(p.state==='fly'&&!p.cleared&&fromAirport(p)>RADAR-70&&out>0&&once(p,'edge',5))
      return[[p.name,'turn',toward(p)],`${p.name} is heading out of your area. Turn it ${U(toward(p))}, back toward the airport.`]}
  // 2. the next arrival comes down and lands
  if(next){const p=next;
    if(landing&&p.tgtAlt>=2&&fromAirport(p)<RING+20&&clearAt(p,1)&&once(p,'down',8))
      return[levelCmd(p,1),`${p.name} is next to land, but the runway is still in use. Bring it down to mid for now.`];
    if(landing&&p.state==='fly'&&fromAirport(p)<RING-40&&holdLevel(p,[p.tgtAlt])!==undefined&&once(p,'hold',6))
      return[[p.name,'hold'],`${p.name} is next, but someone is still landing. It circles until the runway is free.`];
    if(!landing&&p.tgtAlt>0&&clearAt(p,0)&&once(p,'down',8))
      return[levelCmd(p,0),`${p.name} is next to land. Bring it down to low first: that takes a while.`];
    // pointed at the nearest open landing circle, re-aimed as it closes in; cleared once inside
    const k=inGate(p);
    if(!landing&&p.tgtAlt===0&&!(k&&gateOpen(k))&&!headingFor(p,toGate(p))&&!stormAhead(p,toGate(p))&&once(p,'aimgate',3))
      return[[p.name,'turn',toGate(p)],`${p.name} is next to land. Point it at the ${nearestGate(p)} landing circle: landing is only possible inside one${Object.keys(GATES).every(gateOpen)?'':' that is open (no storm over it, approaches into the wind)'}.`];
    if(!landing&&p.tgtAlt===0&&k&&gateOpen(k)&&once(p,'land',1))
      return[[p.name,'land'],`${p.name} is inside the landing circle. Clear it to land: it turns onto the runway by itself.`]}
  // 3. everyone else waits, circling near the airport on a free level
  for(const p of arrs){
    if(p!==next&&p.state==='fly'&&fromAirport(p)<RING-40){const hl=holdLevel(p,[p.tgtAlt,...ups]);
      if(hl===p.tgtAlt&&once(p,'hold',6))return[[p.name,'hold'],`Only one plane lands at a time and ${next.name} is first. ${p.name} circles here, ${LV[hl]}, until its turn.`];
      if(hl!==undefined&&hl!==p.tgtAlt&&once(p,'stack',6))return[levelCmd(p,hl),`${p.name} must wait for ${next.name}, but its level is taken near the airport. Move it to ${LV[hl]} first.`]}
    if(p.state==='fly'&&fromAirport(p)>=RING-40&&!pointing(p)&&!stormAhead(p,toward(p))&&once(p,'aim',6))return[[p.name,'turn',toward(p)],`${p.name} is not pointing at the airport. Turn it ${U(toward(p))}.`]}
  // 4. departures: take off down the runway end closest to their direction (or into the wind), then turn them that way;
  // overflights are turned back to their exit after any detour
  for(const p of S.planes.filter(p=>p.kind!=='arr').sort((a,b)=>!!b.T.prio-!!a.T.prio)){const way=runwayFor(p.dest);
    if(p.state==='ready'&&!runwayBusy&&!landing&&!(next&&next.tgtAlt===0)&&air.every(o=>!meets(climbOut(p,way),o))&&once(p,'go',3))
      return[[p.name,'takeoff',way],`The runway is free. ${p.name} wants to leave ${U(p.dest)}: take off ${U(way)}, ${CFG.wind?'into the wind':'the runway direction closest to it'}.`];
    if((free(p)||p.state==='roll')&&!headingFor(p,p.dest)&&!stormAhead(p,p.dest)&&once(p,'dir',4))
      return[[p.name,'turn',p.dest],`${p.name} is on its way out. Turn it ${U(p.dest)}, so it leaves the circle on the ${U(p.dest)} side.`]}
  return null}
