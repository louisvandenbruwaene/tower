# Tower Power: ideas for later

The game is deliberately simplified: named levels instead of real heights, eight directions. Since the career rework a run is a roguelike career (shifts, rent, promotions, airports, the devil's tattoos, a skill tree between careers); the design and the synergy graph of every tattoo are on the design page made for it.

## In the game

- **Aircraft types**: prop, jet, bizjet, heavy, each with its own speed, turn rate, climb rate and pictogram. Wake turbulence: more room around a heavy, and its runway rests a few seconds after it.
- **Slow, realistic turns**: turn rates of 20 to 40°/s, so a cleared plane may swing a little outside its landing circle while it lines up.
- **Wind**: decides the runway direction (land and take off into the wind, the other landing circles close) and comes and goes: calm for the first couple of minutes, then blowing from the east or west, then calm again.
- **Weather**: storm cells drift with the wind, north or south of the runways. Flying into one is a strike.
- **Emergencies**: fuel on arrivals, MAYDAY below 45 s, a strike when it runs out.
- **Holding fixes**: ALPHA, BRAVO, KILO, ZULU (`heron hold kilo`).
- **Taxiing**: departures taxi from the apron to the runway end and wait there until the runway is free. Arrivals roll out after touchdown, and the runway stays busy until they turn off.
- **Readback errors**: now and then a pilot mishears a turn or a level, and the reply shows it.
- **Neighbouring sector**: in a shift, after 10 planes, purple overflights start crossing your area.
- **Money**: every type pays its own fare (prop $400 to private jet $4,000), 1% less per second beyond par, 10% more per plane in a streak.
- **Priority flights**: VIP private jets and MEDEVAC air ambulances go first both ways, with a deadline. Military fighters now and then.
- **Tuning in one place**: every number sits in the TUNING block at the top of index.html.
- **Career**: 3-minute shifts, A/B/C reviews, promotions on two tracks (a harder sector, or 2 · 4 · 6 intern screens), a weekly job board of ten airports with seasons, rent rising 30% a week, broke ends it, retiring wins, fired sends you back to intern.
- **The devil**: 38 tattoos in 7 styles (plus 20 pieces of shop kit), most strong ones with a catch or a sacrifice, matching pairs, style marks, Blood, favours; drawn on your body in blood.
- **Skill tree**: milestones buy information and comfort between careers (path lines, conflict markers, warnings, slow motion, pauses, radio skills, intern help).
- **Helicopters**: airports with helipads have up to three (HOTEL, OSCAR, INDIA) north of the airport. Helicopters fly at low only, `land` sends one straight to a free pad where it hovers in and sets down, `takeoff` lifts one straight up off its pad to hover at low until it is turned. A helicopter keeps its pad from landing until it has left again (it turns around there, then departs), so there are never more helicopters than pads; they pay $2,500 a flight.
- **Daily career**: seeded by the date (traffic, sketches, job offers), no skills, timed like a speedrun. Today's results are kept locally (no online leaderboard yet).

## Still to do

- **Real heights**: feet or flight levels instead of low / mid / high, with a minimum separation of 1000 ft.
- **Realistic distances**: nautical miles on the radar, separation of 3 to 5 nm, speeds in knots.
- **Low visibility**: longer final approaches in bad weather.
- **Schedules**: a timetable of arrivals and departures, delays that build up.
- **Balance with people**: the career's numbers were tuned with the built-in controller (a slow player); real play will move rent, tier pay and the intern mistake rate.
- **Runway crossings by taxiing planes**: taxiing across a runway in use (crossing runways exist, the taxiways ignore them).
- **Handoffs**: neighbouring sectors that only accept planes at a given level and direction.
- **A second airport**: the radar zooms out once the neighbouring sector opens, and its arrivals and departures share your airspace.
- **An online leaderboard** for the daily shift (needs a server).
- **More tattoos and airports**: the tables in § 1 take new rows; every tattoo should link to at least three others.
- **Radio phrasing**: optional real ATC phrases ("heron, descend and maintain four thousand").
