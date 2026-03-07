# Agent Context

> Python Playwright auto-solver for NYT Pips. Single file, ~200 lines.

## Files

```
autoplay.py        — everything: fetch, solve, place
requirements.txt   — playwright, requests
```

## Run

```bash
source .venv/bin/activate
python autoplay.py --headed --difficulty easy
```

## Key Decisions

1. **Playwright `page.mouse`** for placement — real browser events, not JS-dispatched. React processes them natively.
2. **DFS backtracking** — fast enough (< 1ms easy, < 100ms hard). No external solver needed.
3. **React fiber** for domino pip detection — `__reactFiber$` → `memoizedProps.numDots`.
4. **Direct difficulty URL** — navigate to `/games/pips/easy` etc., dismiss overlays after.

## Common Fixes

**Domino detection breaks**: `find_tray_dominoes()` — check `halfDomino` class name, `numDots` fiber prop, dot-span fallback.

**Board cell detection breaks**: `find_board_cells()` — check `droppableCell` class, `hid` exclusion pattern.

**Overlay sequence changes**: `dismiss_overlays()` — cookie removal, data-testid selectors, tutorial button text.

**New constraint type**: add case in `check()` inside `solve()`.
