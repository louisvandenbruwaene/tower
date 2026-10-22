# Tower Power

Air traffic control on a radar, played only by typing words. Arrivals (blue) come in high and must be brought down low and landed. Departures (gold) take off, climb to high and fly to their exit point by themselves. Two planes on the same level getting too close cost a strike. Three strikes and you replay the level.

Every command is `plane action [direction]`, in any capitals:

```
heron turn south          # compass direction: north … northwest
heron turn softleft       # 45°; hardleft / hardright = 90°
heron turn maple          # straight to an edge point
heron descend low         # climb / descend, to low · mid · high (no word = one level)
heron hold                # circle on the spot
heron land                # low and inside the dashed ring
wren takeoff              # or: wren takeoff north
```

A unique start of a word is enough, faded text in the prompt is a suggestion (→ takes it all, Tab one word), and a typo gets "did you mean …? yes / no". Seven levels plus endless: the first four run in slow motion and suggest every move with the reason, later ones speed up and leave it to you. Waiting is shown on the radar: a bar for level changes, a dashed line for turns, an amber runway while it is busy. `demo` shows a built-in controller playing (it types into the real prompt and says why). One self-contained HTML file, no build step: open [`index.html`](index.html).

## Play on this Mac

```
./app/install_app.sh   # puts Tower Power in /Applications
./app/make_icon.sh     # only needed after editing app/icon.html
```

Dev: `index.html#dev` exposes `window.G` (S, step, exec, run, decide, startLevel…) for headless tests.
