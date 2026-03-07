/**
 * Test the solver against known Pips puzzles.
 *
 * Run: node test/test-solver.js
 *
 * Uses hardcoded puzzle data so tests work without API access.
 */

const { solve, cellKey, allCells } = require("../src/solver");
const { parsePuzzle } = require("../src/fetcher");

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function printGrid(solution, regions) {
  const cells = allCells(regions);
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const c of cells) {
    minR = Math.min(minR, c.row); maxR = Math.max(maxR, c.row);
    minC = Math.min(minC, c.col); maxC = Math.max(maxC, c.col);
  }
  const placementMap = new Map();
  solution.placements.forEach((p, idx) => {
    placementMap.set(cellKey(p.cellA.row, p.cellA.col), idx);
    placementMap.set(cellKey(p.cellB.row, p.cellB.col), idx);
  });
  for (let r = minR; r <= maxR; r++) {
    let line = "";
    for (let c = minC; c <= maxC; c++) {
      const k = cellKey(r, c);
      const val = solution.grid.get(k);
      if (val === undefined) { line += "  "; continue; }
      line += val.toString();
      const rightKey = cellKey(r, c + 1);
      const rightGroup = placementMap.get(rightKey);
      line += (rightGroup !== undefined && placementMap.get(k) !== rightGroup) ? "|" : " ";
    }
    console.log("    " + line);
  }
}

function regionSum(solution, indices) {
  return indices.reduce((s, [r, c]) => s + (solution.grid.get(cellKey(r, c)) ?? 0), 0);
}

/* ================================================================== */
/* 1) Easy puzzle — 2x4 grid, 4 dominoes, sum constraints              */
/* ================================================================== */

console.log("\n--- Test 1: Easy 2x4 grid with sum constraints ---");
{
  const raw = {
    dominoes: [[3, 4], [0, 3], [5, 1], [2, 1]],
    regions: [
      { indices: [[0, 0], [0, 1]], type: "sum", target: 7 },
      { indices: [[0, 2], [0, 3]], type: "sum", target: 6 },
      { indices: [[1, 0], [1, 1], [1, 2], [1, 3]], type: "empty" },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);

  assert(sol !== null, "Has a solution");
  if (sol) {
    assert(sol.placements.length === 4, "Uses 4 dominoes");
    assert(regionSum(sol, [[0, 0], [0, 1]]) === 7, "Region 0 sum = 7");
    assert(regionSum(sol, [[0, 2], [0, 3]]) === 6, "Region 1 sum = 6");
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 2) Medium — 3x4 grid, 6 dominoes, mixed constraints                 */
/*    Known solvable: [5|6][0|1] / [1|2][3|4] / [2|3][4|5]            */
/* ================================================================== */

console.log("\n--- Test 2: Medium 3x4 grid, mixed constraints ---");
{
  const raw = {
    dominoes: [[1, 2], [3, 4], [5, 6], [0, 1], [2, 3], [4, 5]],
    regions: [
      { indices: [[0, 0], [0, 1], [0, 2], [0, 3]], type: "sum", target: 10 },
      { indices: [[1, 0], [1, 1]], type: "sum", target: 11 },
      { indices: [[1, 2], [1, 3]], type: "less", target: 3 },
      { indices: [[2, 0], [2, 1], [2, 2], [2, 3]], type: "greater", target: 10 },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);

  assert(sol !== null, "Has a solution");
  if (sol) {
    assert(sol.placements.length === 6, "Uses 6 dominoes");
    const s0 = regionSum(sol, [[0, 0], [0, 1], [0, 2], [0, 3]]);
    assert(s0 === 10, `Row 0 sum = ${s0} (expected 10)`);
    const s1a = regionSum(sol, [[1, 0], [1, 1]]);
    assert(s1a === 11, `Row 1 left sum = ${s1a} (expected 11)`);
    const s1b = regionSum(sol, [[1, 2], [1, 3]]);
    assert(s1b < 3, `Row 1 right sum = ${s1b} < 3`);
    const s2 = regionSum(sol, [[2, 0], [2, 1], [2, 2], [2, 3]]);
    assert(s2 > 10, `Row 2 sum = ${s2} > 10`);
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 3) Larger — 4x4 grid, 8 dominoes, sum constraints                   */
/*    Known solvable arrangement exists (all horizontal):               */
/*    [1|6][5|6] row=18, [4|6][4|3] row=17,                           */
/*    [6|6][5|5] row=22, [3|0][0|4] row=7                             */
/* ================================================================== */

console.log("\n--- Test 3: Larger 4x4 grid, 8 dominoes ---");
{
  const raw = {
    dominoes: [[0, 4], [1, 6], [5, 6], [4, 6], [4, 3], [6, 6], [5, 5], [3, 0]],
    regions: [
      { indices: [[0, 0], [0, 1], [0, 2], [0, 3]], type: "sum", target: 18 },
      { indices: [[1, 0], [1, 1], [1, 2], [1, 3]], type: "sum", target: 17 },
      { indices: [[2, 0], [2, 1], [2, 2], [2, 3]], type: "sum", target: 22 },
      { indices: [[3, 0], [3, 1], [3, 2], [3, 3]], type: "sum", target: 7 },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const t0 = performance.now();
  const sol = solve(puzzle);
  const dt = performance.now() - t0;

  assert(sol !== null, "Has a solution");
  if (sol) {
    assert(sol.placements.length === 8, "Uses 8 dominoes");
    assert(regionSum(sol, [[0, 0], [0, 1], [0, 2], [0, 3]]) === 18, "Row 0 sum = 18");
    assert(regionSum(sol, [[1, 0], [1, 1], [1, 2], [1, 3]]) === 17, "Row 1 sum = 17");
    assert(regionSum(sol, [[2, 0], [2, 1], [2, 2], [2, 3]]) === 22, "Row 2 sum = 22");
    assert(regionSum(sol, [[3, 0], [3, 1], [3, 2], [3, 3]]) === 7, "Row 3 sum = 7");
    console.log(`  Solved in ${dt.toFixed(1)}ms`);
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 4) Equals constraint — 3 cells must share a value                   */
/* ================================================================== */

console.log("\n--- Test 4: Equals constraint ---");
{
  const raw = {
    dominoes: [[3, 3], [3, 5]],
    regions: [
      { indices: [[0, 0], [0, 1], [1, 0]], type: "equals" },
      { indices: [[1, 1]], type: "empty" },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);

  assert(sol !== null, "Has a solution");
  if (sol) {
    const v00 = sol.grid.get("0,0"), v01 = sol.grid.get("0,1"), v10 = sol.grid.get("1,0");
    assert(v00 === v01 && v01 === v10, `Equals: ${v00},${v01},${v10} are all equal`);
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 5) Unequal constraint — all values distinct                         */
/* ================================================================== */

console.log("\n--- Test 5: Unequal constraint ---");
{
  const raw = {
    dominoes: [[2, 4], [1, 3]],
    regions: [
      { indices: [[0, 0], [0, 1], [1, 0], [1, 1]], type: "unequal" },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);

  assert(sol !== null, "Has a solution");
  if (sol) {
    const vals = ["0,0", "0,1", "1,0", "1,1"].map(k => sol.grid.get(k));
    assert(new Set(vals).size === 4, `Unequal: ${vals.join(",")} are distinct`);
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 6) Less-than and Greater-than                                       */
/* ================================================================== */

console.log("\n--- Test 6: Less/Greater constraints ---");
{
  const raw = {
    dominoes: [[1, 2], [5, 6]],
    regions: [
      { indices: [[0, 0], [0, 1]], type: "less", target: 5 },
      { indices: [[1, 0], [1, 1]], type: "greater", target: 9 },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);

  assert(sol !== null, "Has a solution");
  if (sol) {
    const top = regionSum(sol, [[0, 0], [0, 1]]);
    const bot = regionSum(sol, [[1, 0], [1, 1]]);
    assert(top < 5, `Less: ${top} < 5`);
    assert(bot > 9, `Greater: ${bot} > 9`);
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 7) Irregular board shape (L-shape)                                  */
/* ================================================================== */

console.log("\n--- Test 7: Irregular L-shaped board ---");
{
  const raw = {
    dominoes: [[2, 3], [4, 5], [1, 6]],
    regions: [
      {
        indices: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
        type: "empty",
      },
    ],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);

  assert(sol !== null, "L-shape has a solution");
  if (sol) {
    assert(sol.placements.length === 3, "Uses 3 dominoes");
    console.log("  Grid:"); printGrid(sol, puzzle.regions);
  }
}

/* ================================================================== */
/* 8) Unsolvable puzzle returns null                                   */
/* ================================================================== */

console.log("\n--- Test 8: Unsolvable puzzle ---");
{
  const raw = {
    dominoes: [[6, 6]],
    regions: [{ indices: [[0, 0], [0, 1]], type: "sum", target: 1 }],
  };
  const puzzle = parsePuzzle(raw);
  const sol = solve(puzzle);
  assert(sol === null, "Returns null for unsolvable");
}

/* ================================================================== */
/* Summary                                                             */
/* ================================================================== */

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
