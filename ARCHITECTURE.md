# Architecture

## Overview

A JavaScript bookmarklet that solves [NYT Pips](https://www.nytimes.com/games/pips) puzzles in one click. Fetches the puzzle data from the NYT API, solves it with DFS backtracking, and displays the solution as an overlay on the page.

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  fetcher.js │     │  solver.js   │     │  placer.js   │
│             │     │              │     │              │
│ Fetch JSON  │────>│ DFS solve    │────>│ Show overlay  │
│ Parse into  │     │ Return       │     │ (or auto-    │
│ Puzzle obj  │     │ Solution obj │     │  place DOM)  │
└─────────────┘     └──────────────┘     └──────────────┘
       ↑                                        │
       │                                        ↓
  NYT API                              Browser page
  /svc/pips/v1/{date}.json             nytimes.com/games/pips
```

`index.js` wires these three modules together in sequence.

## Data Structures

### Puzzle (input)

```javascript
{
  dominoes: [{ left: 3, right: 5 }, ...],   // available domino tiles
  regions: [{
    cells: [{ row: 0, col: 1 }, ...],       // cells belonging to this region
    type: "sum" | "equals" | "unequal" | "less" | "greater" | "empty",
    target: 7 | null                         // target value (null for equals/unequal/empty)
  }, ...]
}
```

### Solution (output)

```javascript
{
  placements: [{
    domino: { left: 3, right: 5 },
    cellA: { row: 0, col: 0 },  cellB: { row: 0, col: 1 },
    pipA: 3,                     pipB: 5
  }, ...],
  grid: Map { "0,0" => 3, "0,1" => 5, ... }   // cell key -> pip value
}
```

## Solver Algorithm

### DFS Backtracking with Pruning

The solver uses depth-first search to place dominoes one at a time:

1. **Pick the first empty cell** on the board
2. **Try each empty neighbor** as the second cell of a domino
3. **Try each unused domino** in both orientations (skip the second orientation for doubles like 3|3)
4. **Validate** constraints after each placement; backtrack if invalid
5. **Recurse** until all cells are filled or all branches exhausted

### Pruning Strategies

Three levels of pruning, each reducing the search space:

**Level 1 — Isolated cell detection:**
After placing a domino, check if any remaining empty cell has zero empty neighbors. Such a cell can never be filled, so we prune immediately. This catches geometrically impossible states early.

**Level 2 — Region constraint checking:**
After each placement, verify all region constraints are still satisfiable:

| Constraint | Partial check | Full check |
|------------|---------------|------------|
| `sum` | Partial sum <= target; partial sum + max remaining >= target | Sum == target |
| `less` | Partial sum + min remaining < target | Sum < target |
| `greater` | Partial sum + max remaining > target | Sum > target |
| `equals` | All placed values identical | All values identical |
| `unequal` | No duplicate placed values | All values distinct |

**Level 3 — Forward inventory check:**
For `equals` regions: if a value has been placed, check that enough matching pip values remain in unused dominoes to fill the remaining cells. For `unequal` regions: check that enough distinct values remain.

### Board Representation

- **cells**: Flat array of all valid `{row, col}` positions (extracted from regions)
- **board**: Array of `number | null`, indexed by cell position (null = empty)
- **neighbors**: Precomputed adjacency list mapping each cell index to its orthogonal neighbor indices
- **remaining**: Object mapping domino key (`"3|5"`) to count of unused copies

### Complexity

For N dominoes, the worst case is exponential. However, the pruning strategies make it practical:
- Easy puzzles (4-5 dominoes): < 1ms
- Hard puzzles (16 dominoes): typically < 100ms in JavaScript

## API Format

### Endpoint

```
GET https://www.nytimes.com/svc/pips/v1/{YYYY-MM-DD}.json
```

Same-origin when running as a bookmarklet on nytimes.com (no CORS issues). May require the `NYT-S` cookie when fetched from outside the browser.

### Response

```json
{
  "printDate": "2025-08-24",
  "editor": "Ian Livengood",
  "easy": {
    "id": 188,
    "constructors": "Rodolfo Kurchan",
    "dominoes": [[0, 4], [1, 6], ...],
    "regions": [
      { "indices": [[1, 0]], "type": "sum", "target": 6 },
      { "indices": [[0, 1], [0, 2]], "type": "equals" },
      ...
    ]
  },
  "medium": { ... },
  "hard": { ... }
}
```

### Constraint Types

| API `type` | Meaning |
|------------|---------|
| `"sum"` | Cell values in region sum to exactly `target` |
| `"equals"` | All cell values in region are the same number |
| `"unequal"` | All cell values in region are distinct |
| `"less"` | Cell values in region sum to less than `target` |
| `"greater"` | Cell values in region sum to more than `target` |
| `"empty"` | No constraint (just fill the cells) |

## Placer Strategy

### Solution Overlay (current implementation)

Renders a grid overlay on top of the page showing:
- Pip values in each cell
- Color-coded domino groupings (each domino gets a distinct background color)
- Borders between different dominoes

### Automated DOM Placement (`tryAutoPlace`)

The NYT Pips UI uses React with CSS Modules (hashed class names) and pointer events for drag-and-drop. The auto-placer attempts:

1. **Find dominos** — scans `button` elements for React props (`firstDots`, `secondDots`) via the dynamically-discovered `__reactProps$` key. Falls back to counting SVG `circle` elements in each domino half.
2. **Find board cells** — scans for `div` elements with "droppable" in the class name (e.g., `Board-module_droppableCell__ndah2`). Excludes hidden cells.
3. **Map cells to coordinates** — sorts DOM cells by visual position (top-to-bottom, left-to-right) and maps them 1:1 to the sorted puzzle cell coordinates.
4. **Match dominos to placements** — for each solution placement, finds the tray domino with matching pip counts (checking both orientations).
5. **Simulate pointer drag** — dispatches `pointerdown` on the domino, a sequence of `pointermove` events along the path, and `pointerup` on the target cell.

This is a best-effort approach. The overlay always shows regardless of whether auto-placement succeeds, so the user always sees the answer.

## Known Limitations

- The solver assumes all dominoes must be used (every cell must be filled). This matches all known NYT Pips puzzles.
- Automated DOM placement is not yet implemented; the overlay fallback always works.
- API access from Node.js requires a valid `NYT-S` session cookie.
- Very large puzzles (20+ dominoes) may take longer, but all published NYT puzzles solve in under a second.

## External References

- [NYT Pips rules](https://help.nytimes.com/360011158491-New-York-Times-Games/pips)
- [Solving NYT Pips with SMT (Z3)](https://kerrigan.dev/blog/nyt-pips) — Z3 approach, API discovery
- [Solving NYT Pips with F#](https://dev.to/shimmer/solving-the-ny-times-pips-game-with-f-5bbe) — backtracking with tiling trees
- [Andrew Healey's JS solver](https://healeycodes.com/solving-nyt-pips-puzzle) — DFS with pruning in TypeScript
- [MiniZinc constraint solver](http://www.righto.com/2025/10/solve-nyt-pips-with-constraints.html) — solver comparison benchmarks
