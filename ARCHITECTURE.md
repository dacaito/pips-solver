# Architecture

Single-file Python solver (`autoplay.py`) using Playwright for browser automation.

## Pipeline

```
Navigate to /games/pips/{difficulty}
  → Dismiss overlays (cookie, welcome, tutorial)
  → Fetch puzzle JSON via page.evaluate (same-origin)
  → DFS backtracking solve
  → Mouse-drag each domino from tray to board
```

## Data Model

```python
Cell      = namedtuple("Cell", "row col")
Domino    = namedtuple("Domino", "a b")
Region    = namedtuple("Region", "cells constraint target")
Placement = namedtuple("Placement", "domino cell_a cell_b pip_a pip_b")
```

## Solver

DFS backtracking: pick the first empty cell, try each empty neighbor as the second half of a domino, try each unused domino in both orientations, recurse.

**Pruning:**
- **Isolated cell**: empty cell with no empty neighbors → prune
- **Region constraints**: partial sums checked against target bounds using remaining pip inventory
- **Forward checks**: `equals` regions verify enough matching pips remain; `unequal` regions verify enough distinct values remain

## DOM Detection

**Dominoes**: `button` elements with class `halfDomino`. Pip counts from React fiber's `numDots` prop (`__reactFiber$` → `memoizedProps`), fallback to counting `[class*="dot"]` spans. Adjacent halves paired by position.

**Board cells**: `div` elements with class `droppableCell`, excluding those with `hid`. Sorted by visual position, mapped 1:1 to sorted puzzle coordinates.

**Placement**: `page.mouse.down()` → smooth `move()` steps → `up()`. These are real browser input events (not JS-dispatched), so React's drag handler processes them natively.

## API

```
GET https://www.nytimes.com/svc/pips/v1/{YYYY-MM-DD}.json
→ { easy, medium, hard } each with { dominoes: [[a,b],...], regions: [{indices, type, target},...] }
```

Constraint types: `sum`, `equals`, `unequal`, `less`, `greater`, `empty`.
