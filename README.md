# Tower

Air traffic control on a radar. Arrivals (blue) come in high and must be brought down low and landed. Departures (gold) wait at the runway, take off and leave high over their named fix. Two planes on the same level that get too close cost a strike. Three strikes end the shift.

Prototype, played only by typing words: no mouse, no numbers. Every word autocompletes (Tab or →, ↑↓ pick a suggestion), and any unique prefix works. Esc pauses. One self-contained HTML file, no build step: open [`index.html`](index.html).

```
heron west low          # turn to a compass heading, descend
heron land               # low and inside the dashed ring: it flies the approach itself
wren takeoff to maple high
kite left slow           # left/right = 45°, hold = circle, abort = go around
```

## Play on this Mac

```
./app/install_app.sh   # puts Tower in /Applications
./app/make_icon.sh     # only needed after editing app/icon.html
```

Dev: `index.html#dev` exposes `window.G` (S, step, exec, options) for headless tests.
