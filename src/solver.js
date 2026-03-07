/**
 * DFS backtracking solver for NYT Pips puzzles.
 *
 * Pure logic — no DOM, no network. Takes a parsed puzzle object,
 * returns a solution (array of domino placements) or null.
 */

/**
 * @typedef {{row: number, col: number}} Cell
 * @typedef {{left: number, right: number}} Domino
 * @typedef {'sum'|'equals'|'unequal'|'less'|'greater'|'empty'} ConstraintType
 * @typedef {{cells: Cell[], type: ConstraintType, target: number|null}} Region
 * @typedef {{dominoes: Domino[], regions: Region[]}} Puzzle
 * @typedef {{domino: Domino, cellA: Cell, cellB: Cell}} Placement
 * @typedef {{placements: Placement[], grid: Map<string, number>}} Solution
 */

function cellKey(row, col) {
  return `${row},${col}`;
}

/**
 * Build an adjacency list for the set of valid cells.
 * Returns { cellIndex: Map<string, number>, neighbors: number[][] }
 */
function buildAdjacency(cells) {
  const cellIndex = new Map();
  cells.forEach((c, i) => cellIndex.set(cellKey(c.row, c.col), i));

  const neighbors = cells.map(() => []);
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  for (let i = 0; i < cells.length; i++) {
    const { row, col } = cells[i];
    for (const [dr, dc] of dirs) {
      const ni = cellIndex.get(cellKey(row + dr, col + dc));
      if (ni !== undefined) neighbors[i].push(ni);
    }
  }

  return { cellIndex, neighbors };
}

/**
 * Collect all unique cells from every region.
 */
function allCells(regions) {
  const seen = new Set();
  const cells = [];
  for (const r of regions) {
    for (const c of r.cells) {
      const k = cellKey(c.row, c.col);
      if (!seen.has(k)) {
        seen.add(k);
        cells.push(c);
      }
    }
  }
  return cells;
}

/**
 * Map each cell index to the regions it belongs to.
 */
function buildCellRegions(cells, regions, cellIndex) {
  const cellRegions = cells.map(() => []);
  for (const region of regions) {
    for (const c of region.cells) {
      const idx = cellIndex.get(cellKey(c.row, c.col));
      if (idx !== undefined) cellRegions[idx].push(region);
    }
  }
  return cellRegions;
}

/**
 * Check whether a region's constraints are still satisfiable
 * given the current board state and remaining dominoes.
 *
 * @param {Region} region
 * @param {(number|null)[]} board - current pip values per cell index
 * @param {Map<string, number>} cellIndex
 * @param {number[]} sparePips - flat array of all available pip values from unused domino halves
 * @returns {boolean} true if region is still feasible
 */
function checkRegion(region, board, cellIndex, sparePips) {
  const vals = [];
  let emptyCount = 0;

  for (const c of region.cells) {
    const idx = cellIndex.get(cellKey(c.row, c.col));
    const v = board[idx];
    if (v !== null) {
      vals.push(v);
    } else {
      emptyCount++;
    }
  }

  const filled = vals.length;
  const total = region.cells.length;

  switch (region.type) {
    case "empty":
      return true;

    case "sum": {
      const partialSum = vals.reduce((a, b) => a + b, 0);
      if (partialSum > region.target) return false;
      if (emptyCount === 0) return partialSum === region.target;
      const sortedSpare = [...sparePips].sort((a, b) => a - b);
      const minExtra = sortedSpare.slice(0, emptyCount).reduce((a, b) => a + b, 0);
      const maxExtra = sortedSpare.slice(-emptyCount).reduce((a, b) => a + b, 0);
      if (partialSum + minExtra > region.target) return false;
      if (partialSum + maxExtra < region.target) return false;
      return true;
    }

    case "less": {
      const partialSum = vals.reduce((a, b) => a + b, 0);
      if (partialSum >= region.target) return false;
      if (emptyCount === 0) return partialSum < region.target;
      const sortedSpare = [...sparePips].sort((a, b) => a - b);
      const minExtra = sortedSpare.slice(0, emptyCount).reduce((a, b) => a + b, 0);
      if (partialSum + minExtra >= region.target) return false;
      return true;
    }

    case "greater": {
      const partialSum = vals.reduce((a, b) => a + b, 0);
      if (emptyCount === 0) return partialSum > region.target;
      const sortedSpare = [...sparePips].sort((a, b) => a - b);
      const maxExtra = sortedSpare.slice(-emptyCount).reduce((a, b) => a + b, 0);
      if (partialSum + maxExtra <= region.target) return false;
      return true;
    }

    case "equals": {
      if (filled === 0) return true;
      const target = vals[0];
      if (vals.some(v => v !== target)) return false;
      if (emptyCount > 0) {
        const available = sparePips.filter(p => p === target).length;
        if (available < emptyCount) return false;
      }
      return true;
    }

    case "unequal": {
      const seen = new Set();
      for (const v of vals) {
        if (seen.has(v)) return false;
        seen.add(v);
      }
      if (emptyCount > 0) {
        const uniqueAvailable = new Set(
          sparePips.filter(p => !seen.has(p))
        );
        if (uniqueAvailable.size < emptyCount) return false;
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Check if any empty cell has become isolated (no empty neighbor).
 */
function hasIsolatedCell(board, neighbors) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    if (!neighbors[i].some(j => board[j] === null)) return true;
  }
  return false;
}

/**
 * Collect all spare pip values from remaining domino halves.
 */
function getSparePips(remaining) {
  const pips = [];
  for (const [key, count] of Object.entries(remaining)) {
    if (count <= 0) continue;
    const [a, b] = key.split("|").map(Number);
    for (let i = 0; i < count; i++) {
      pips.push(a, b);
    }
  }
  return pips;
}

/**
 * Solve a Pips puzzle.
 *
 * @param {Puzzle} puzzle
 * @returns {Solution|null}
 */
function solve(puzzle) {
  const cells = allCells(puzzle.regions);
  const { cellIndex, neighbors } = buildAdjacency(cells);
  const cellRegions = buildCellRegions(cells, puzzle.regions, cellIndex);
  const M = cells.length;

  const board = new Array(M).fill(null);
  const placements = [];

  const remaining = {};
  for (const d of puzzle.dominoes) {
    const key = `${d.left}|${d.right}`;
    remaining[key] = (remaining[key] || 0) + 1;
  }

  function affectedRegions(idxA, idxB) {
    const regions = new Set();
    for (const r of cellRegions[idxA]) regions.add(r);
    for (const r of cellRegions[idxB]) regions.add(r);
    return regions;
  }

  function checkAll(sparePips) {
    for (const region of puzzle.regions) {
      if (!checkRegion(region, board, cellIndex, sparePips)) return false;
    }
    return true;
  }

  function dfs() {
    let target = -1;
    for (let k = 0; k < M; k++) {
      if (board[k] === null) { target = k; break; }
    }
    if (target < 0) return true;

    const emptyNeighbors = neighbors[target].filter(j => board[j] === null);
    if (emptyNeighbors.length === 0) return false;

    for (const ni of emptyNeighbors) {
      for (const key of Object.keys(remaining)) {
        if (remaining[key] <= 0) continue;
        const [a, b] = key.split("|").map(Number);

        for (let orient = 0; orient < 2; orient++) {
          if (orient === 1 && a === b) continue;
          const va = orient === 0 ? a : b;
          const vb = orient === 0 ? b : a;

          board[target] = va;
          board[ni] = vb;
          remaining[key]--;

          if (!hasIsolatedCell(board, neighbors)) {
            const sparePips = getSparePips(remaining);
            if (checkAll(sparePips)) {
              placements.push({
                domino: { left: a, right: b },
                cellA: cells[target],
                cellB: cells[ni],
                pipA: va,
                pipB: vb,
              });

              if (dfs()) return true;
              placements.pop();
            }
          }

          board[target] = null;
          board[ni] = null;
          remaining[key]++;
        }
      }
    }
    return false;
  }

  const solved = dfs();
  if (!solved) return null;

  const grid = new Map();
  for (let i = 0; i < M; i++) {
    grid.set(cellKey(cells[i].row, cells[i].col), board[i]);
  }

  return { placements, grid };
}

if (typeof module !== "undefined") {
  module.exports = { solve, cellKey, allCells };
}
