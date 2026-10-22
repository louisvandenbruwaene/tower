# Tower Power

Air traffic control, very realistic in spirit but highly simplified, played only by typing words. Your area is the radar circle. Arrivals (blue) come in high; bring them down low, clear them to land and fly them into one of the two landing circles off the runway ends: there they turn onto the runway and land. Departures (gold) each want to leave in one of 8 directions: take them off east or west down the runway, then turn them so they leave the circle through their own slice. Same level and too close, a departure leaving through the wrong slice, or an arrival leaving your area: strike. Three strikes and you replay the level.

Every command is `plane action [direction]`, in any capitals:

```
heron turn s              # n ne e se s sw w nw
heron turn l              # sl sr = 45°, l r = 90°, hl hr = 135°

heron descend             # down to low (descend mid stops at mid)
heron ascend              # up to high (ascend mid stops at mid)
heron hold                # circle on the spot until a turn or land
heron land                # cleared to land: it turns onto the runway in the next landing circle it flies into
wren takeoff e             # e or w; it climbs to mid and flies straight on until you turn it
```

A unique start of a word is enough, faded text in the prompt is a suggestion (→ takes it all, Tab one word), and typos are fixed at once (nt = north), the reply showing what was understood. Seven levels plus endless: the first four run in slow motion and suggest every move with the reason, later ones speed up and leave it to you. Waiting is shown on the radar: a bar for level changes, a dashed line for turns, an amber runway while it is busy. `demo` shows a built-in controller playing (it types into the real prompt and says why). Later realism (real heights, aircraft types, wind, weather, schedules) is listed in [IDEAS.md](IDEAS.md). One self-contained HTML file, no build step: open [`index.html`](index.html).

## Play on this Mac

```
./app/install_app.sh   # puts Tower Power in /Applications
./app/make_icon.sh     # only needed after editing app/icon.html
```

Dev: `index.html#dev` exposes `window.G` (S, step, exec, run, decide, startLevel…) for headless tests.
