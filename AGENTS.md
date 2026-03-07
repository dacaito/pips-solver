# Agent Context

> A JavaScript bookmarklet that solves NYT Pips puzzles in one click.

## File Map

```
src/
  fetcher.js    — Fetches puzzle JSON from NYT API, parses into Puzzle object
  solver.js     — DFS backtracking solver (pure logic, no DOM/network)
  placer.js     — Displays solution overlay on the NYT page
  index.js      — Entry point: wires fetcher → solver → placer

test/
  test-solver.js — Node.js tests with hardcoded puzzles (run: node test/test-solver.js)

build.sh        — Concatenates src/ files, minifies with terser, outputs bookmarklet URL
dist/           — Build output (gitignored)
  bundle.js     — Concatenated unminified source
  bookmarklet.js — Minified IIFE
  bookmarklet.txt — javascript: URL ready to paste into a bookmark
```

## How to Test

```bash
node test/test-solver.js
```

All tests use hardcoded puzzle data (no API access needed). Tests verify:
- Sum, equals, unequal, less, greater constraints
- Multiple board sizes (2x4, 3x4, 4x4)
- Irregular board shapes
- Unsolvable puzzle detection

## How to Build

```bash
./build.sh
```

Produces `dist/bookmarklet.txt` — the `javascript:` URL to paste into a bookmark.
Requires `terser` (`npm install -g terser`). Falls back to unminified if terser is missing.

## Key Design Decisions

1. **DFS over constraint solvers (Z3, OR-Tools)**: Can't run native solvers in a browser bookmarklet. DFS with pruning is fast enough (< 100ms for hard puzzles in JS).

2. **Overlay fallback over DOM automation**: NYT uses CSS Modules with hashed class names that change on every deployment. Direct DOM manipulation would break constantly. The overlay always works.

3. **Same-origin API fetch**: Running as a bookmarklet on nytimes.com means we can call `/svc/pips/v1/{date}.json` directly — no CORS, no auth headers needed.

4. **Modules with CommonJS exports**: Each file exports via `module.exports` for Node.js testing, stripped during the bookmarklet build. No bundler needed.

## Common Modifications

### Add a new constraint type

1. Add the type string to the `ConstraintType` typedef in `src/solver.js`
2. Add a `case` in the `checkRegion()` switch statement in `src/solver.js`
3. Add a test case in `test/test-solver.js`

### Improve the placer (automated DOM placement)

`tryAutoPlace()` in `src/placer.js` has a working implementation that:
1. Finds dominos via React props (`firstDots`/`secondDots`) or by counting SVG circles
2. Finds droppable cells by class name pattern and maps them to puzzle coordinates by position
3. Simulates pointer drag events (`pointerdown` -> `pointermove` -> `pointerup`)

The overlay always shows as backup. To improve auto-placement:
- If the game changes its event model, update `simulateDrag()`
- If the cell identification breaks, check the class name pattern in `findBoardCells()`
- If domino identification breaks, check the React props key discovery in `findDominoButtons()`

### Change the overlay appearance

Edit `showSolutionOverlay()` in `src/placer.js`. The overlay uses inline styles for bookmarklet compatibility (no external CSS).

### Test against a real puzzle from the API

```bash
# Requires NYT-S cookie from browser DevTools
NYT_S_COOKIE="your-cookie" node -e "
  const {fetchPuzzle} = require('./src/fetcher');
  const {solve} = require('./src/solver');
  fetchPuzzle('2025-10-14', 'hard', process.env.NYT_S_COOKIE)
    .then(({puzzle}) => {
      const sol = solve(puzzle);
      console.log(sol ? 'Solved!' : 'No solution');
    });
"
```

## Dependencies

- Runtime: None (pure JS, browser-native `fetch`)
- Build: `terser` (optional, for minification)
- Test: Node.js >= 18 (uses `performance.now()`)

## API Reference

Endpoint: `GET /svc/pips/v1/{YYYY-MM-DD}.json`

Returns `{ easy, medium, hard }` each containing `{ dominoes, regions }`.
See `ARCHITECTURE.md` for the full schema.
