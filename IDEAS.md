# Tower Power: ideas for later

The game is deliberately simplified: named levels instead of real heights, eight directions, every rule switched on step by step through the levels.

## In the game

- **Aircraft types**: prop, jet, bizjet, heavy, each with its own speed, turn rate, climb rate and pictogram. Wake turbulence: more room around a heavy, and its runway rests a few seconds after it.
- **Slow, realistic turns**: turn rates of 20 to 40°/s, so a cleared plane may swing a little outside its landing circle while it lines up.
- **Wind**: decides the runway direction (land and take off into the wind, the other landing circles close) and turns now and then.
- **Weather**: storm cells drift with the wind, north or south of the runways. Flying into one is a strike.
- **Emergencies**: fuel on arrivals, MAYDAY below 45 s, a strike when it runs out.
- **Holding fixes**: ALPHA, BRAVO, KILO, ZULU (`heron hold kilo`).
- **Taxiing**: departures taxi from the apron to the runway end and wait there until the runway is free. Arrivals roll out after touchdown, and the runway stays busy until they turn off.
- **Readback errors**: now and then a pilot mishears a turn or a level, and the reply shows it.
- **Neighbouring sector**: in a shift, after 10 planes, purple overflights start crossing your area.
- **Scoring by delay**: 100 per plane, less a point for every second beyond par.
- **Traffic scenarios as data**: each level lists its traffic and which rules are on (`LEVELS` and `RULES` in index.html).
- **Roguelike shift**: three strikes end a shift and pay a token per 100 points. Tokens buy permanent upgrades: more height levels (top, peak), a second runway, navigation (departures turn to their exit by themselves, and `land` works anywhere) and bigger tanks.
- **Daily shift**: seeded by the date, so everyone gets the same traffic, with no upgrades. Today's five best scores are kept locally (no online leaderboard yet).

## Still to do

- **Real heights**: feet or flight levels instead of low / mid / high, with a minimum separation of 1000 ft.
- **Realistic distances**: nautical miles on the radar, separation of 3 to 5 nm, speeds in knots.
- **Low visibility**: longer final approaches in bad weather.
- **Schedules**: a timetable of arrivals and departures, delays that build up, rewards for on-time handling.
- **Crossing runways**, and runway crossings by taxiing planes.
- **Handoffs**: neighbouring sectors that only accept planes at a given level and direction.
- **A second airport**: the radar zooms out once the neighbouring sector opens, and its arrivals and departures share your airspace.
- **An online leaderboard** for the daily shift (needs a server).
- **More upgrades**: a wider radar, a faster climb, an automatic separation alert.
- **Radio phrasing**: optional real ATC phrases ("heron, descend and maintain four thousand").
