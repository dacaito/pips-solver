/**
 * Places solved dominoes onto the NYT Pips board.
 *
 * Strategy:
 *   1. Try automated placement via DOM interaction
 *   2. Fall back to a solution overlay if automation fails
 *
 * The automated approach is fragile (NYT uses CSS Modules with hashed
 * class names), so the overlay fallback ensures the user always sees
 * the answer.
 */

/**
 * Show the solution as a styled overlay on the page.
 *
 * @param {{placements: Array, grid: Map<string,number>}} solution
 * @param {{regions: Array}} puzzle
 */
function showSolutionOverlay(solution, puzzle) {
  const existing = document.getElementById("pips-solver-overlay");
  if (existing) existing.remove();

  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  const validCells = new Set();
  for (const region of puzzle.regions) {
    for (const c of region.cells) {
      minR = Math.min(minR, c.row); maxR = Math.max(maxR, c.row);
      minC = Math.min(minC, c.col); maxC = Math.max(maxC, c.col);
      validCells.add(`${c.row},${c.col}`);
    }
  }

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  const placementId = new Map();
  solution.placements.forEach((p, idx) => {
    placementId.set(`${p.cellA.row},${p.cellA.col}`, idx);
    placementId.set(`${p.cellB.row},${p.cellB.col}`, idx);
  });

  const COLORS = [
    "#e8d5b7", "#b7d5e8", "#d5e8b7", "#e8b7d5",
    "#d5b7e8", "#b7e8d5", "#e8c9b7", "#b7c9e8",
    "#c9e8b7", "#e8b7c9", "#c9b7e8", "#b7e8c9",
    "#f0dcc0", "#c0dcf0", "#dcf0c0", "#f0c0dc",
  ];

  let gridHTML = "";
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const key = `${r},${c}`;
      if (!validCells.has(key)) {
        gridHTML += `<div style="width:48px;height:48px;"></div>`;
        continue;
      }

      const val = solution.grid.get(key);
      const pid = placementId.get(key);
      const bg = pid !== undefined ? COLORS[pid % COLORS.length] : "#ddd";

      const borderTop = (r > minR && placementId.get(`${r - 1},${c}`) === pid) ? "none" : "2px solid #333";
      const borderBottom = (r < maxR && placementId.get(`${r + 1},${c}`) === pid) ? "none" : "2px solid #333";
      const borderLeft = (c > minC && placementId.get(`${r},${c - 1}`) === pid) ? "none" : "2px solid #333";
      const borderRight = (c < maxC && placementId.get(`${r},${c + 1}`) === pid) ? "none" : "2px solid #333";

      gridHTML += `<div style="
        width:48px; height:48px;
        display:flex; align-items:center; justify-content:center;
        font-size:24px; font-weight:bold; color:#222;
        background:${bg};
        border-top:${borderTop}; border-bottom:${borderBottom};
        border-left:${borderLeft}; border-right:${borderRight};
        box-sizing:border-box;
      ">${val ?? ""}</div>`;
    }
  }

  const overlay = document.createElement("div");
  overlay.id = "pips-solver-overlay";
  overlay.innerHTML = `
    <div style="
      position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    " onclick="if(event.target===this)this.remove()">
      <div style="
        background:#fff; border-radius:12px; padding:24px;
        box-shadow:0 8px 32px rgba(0,0,0,0.3);
        max-width:90vw; max-height:90vh; overflow:auto;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;font-size:20px;color:#333;">Pips Solution</h2>
          <button onclick="this.closest('#pips-solver-overlay').remove()" style="
            background:none;border:none;font-size:24px;cursor:pointer;color:#666;
          ">&times;</button>
        </div>
        <div style="
          display:grid;
          grid-template-columns:repeat(${cols}, 48px);
          gap:0;
          margin-bottom:16px;
        ">${gridHTML}</div>
        <div style="color:#888;font-size:13px;">
          ${solution.placements.length} dominoes placed. Click outside to close.
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * Attempt to place dominoes on the board via DOM interaction.
 * Returns true if successful, false if automation isn't possible.
 *
 * @param {{placements: Array, grid: Map<string,number>}} solution
 * @param {{regions: Array}} puzzle
 * @returns {boolean}
 */
function tryAutoPlace(solution, puzzle) {
  /* placeholder — requires deeper DOM reverse-engineering */
  /* see ARCHITECTURE.md for the planned approach */
  return false;
}

/**
 * Place the solution on the board, with fallback to overlay.
 *
 * @param {{placements: Array, grid: Map<string,number>}} solution
 * @param {{regions: Array}} puzzle
 */
function placeSolution(solution, puzzle) {
  if (!tryAutoPlace(solution, puzzle)) {
    showSolutionOverlay(solution, puzzle);
  }
}

if (typeof module !== "undefined") {
  module.exports = { placeSolution, showSolutionOverlay, tryAutoPlace };
}
