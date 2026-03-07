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
 * Count pip dots inside a DOM element by looking for SVG circles
 * or elements with "dot" in the class name.
 */
function countDots(el) {
  return el.querySelectorAll('circle, [class*="dot" i]').length;
}

/**
 * Find the React props key used on this page.
 * React attaches __reactProps$<random> to DOM elements.
 */
function findReactPropsKey() {
  const el = document.querySelector("button") || document.querySelector("div");
  if (!el) return null;
  return Object.keys(el).find((k) => k.startsWith("__reactProps"));
}

/**
 * Identify domino buttons in the tray. Each domino button contains
 * two halves with pip dots (SVG circles). Returns an array of
 * { element, firstDots, secondDots }.
 */
function findDominoButtons() {
  const reactKey = findReactPropsKey();
  const buttons = [...document.querySelectorAll("button")];
  const dominos = [];

  for (const btn of buttons) {
    /* Try React props first */
    if (reactKey) {
      const props = btn[reactKey];
      if (props && "firstDots" in props && "secondDots" in props) {
        dominos.push({
          element: btn,
          firstDots: props.firstDots,
          secondDots: props.secondDots,
          inTray: props.inTray !== false,
        });
        continue;
      }
    }

    /* Fallback: count dots visually in each half */
    const halves = btn.querySelectorAll('[class*="half" i], [class*="Half" i]');
    if (halves.length === 2) {
      dominos.push({
        element: btn,
        firstDots: countDots(halves[0]),
        secondDots: countDots(halves[1]),
        inTray: true,
      });
    } else if (countDots(btn) > 0 || btn.querySelector("svg")) {
      /* Single element with dots — try to split */
      const allDots = [...btn.querySelectorAll('circle, [class*="dot" i]')];
      if (allDots.length >= 0) {
        const rect = btn.getBoundingClientRect();
        const mid = rect.x + rect.width / 2;
        const isHorizontal = rect.width > rect.height;
        let first = 0, second = 0;
        for (const dot of allDots) {
          const dr = dot.getBoundingClientRect();
          if (isHorizontal) {
            if (dr.x + dr.width / 2 < mid) first++;
            else second++;
          } else {
            const vmid = rect.y + rect.height / 2;
            if (dr.y + dr.height / 2 < vmid) first++;
            else second++;
          }
        }
        dominos.push({ element: btn, firstDots: first, secondDots: second, inTray: true });
      }
    }
  }

  return dominos;
}

/**
 * Find droppable board cells. Returns an array of
 * { element, row, col } sorted by position.
 */
function findBoardCells(puzzle) {
  const divs = [...document.querySelectorAll("div")];
  const droppable = divs.filter(
    (d) =>
      d.className &&
      typeof d.className === "string" &&
      d.className.includes("droppable") &&
      !d.className.includes("hidden")
  );

  if (droppable.length === 0) return [];

  /* Sort cells by position: top-to-bottom, left-to-right */
  const withPos = droppable.map((el) => {
    const r = el.getBoundingClientRect();
    return { element: el, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  /* Determine grid structure from puzzle regions */
  const allCellCoords = [];
  for (const region of puzzle.regions) {
    for (const c of region.cells) allCellCoords.push(c);
  }
  allCellCoords.sort((a, b) => a.row - b.row || a.col - b.col);

  /* Sort DOM cells the same way: by Y then X */
  const cellSize = withPos.length > 1
    ? Math.min(...withPos.map((c) => {
        const r = c.element.getBoundingClientRect();
        return Math.min(r.width, r.height);
      }))
    : 52;
  const tolerance = cellSize * 0.4;

  withPos.sort((a, b) => {
    if (Math.abs(a.y - b.y) < tolerance) return a.x - b.x;
    return a.y - b.y;
  });

  /* Map sorted DOM positions to sorted puzzle coordinates */
  if (withPos.length !== allCellCoords.length) {
    console.warn(
      `[pips-solver] Cell count mismatch: DOM=${withPos.length}, puzzle=${allCellCoords.length}`
    );
    return [];
  }

  return withPos.map((pos, i) => ({
    element: pos.element,
    row: allCellCoords[i].row,
    col: allCellCoords[i].col,
  }));
}

/**
 * Simulate a pointer drag from one element to another.
 */
function simulateDrag(fromEl, toEl) {
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  const sx = from.x + from.width / 2;
  const sy = from.y + from.height / 2;
  const ex = to.x + to.width / 2;
  const ey = to.y + to.height / 2;

  const common = { bubbles: true, cancelable: true, pointerId: 1 };

  fromEl.dispatchEvent(new PointerEvent("pointerdown", { ...common, clientX: sx, clientY: sy }));

  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = sx + ((ex - sx) * i) / steps;
    const y = sy + ((ey - sy) * i) / steps;
    document.dispatchEvent(new PointerEvent("pointermove", { ...common, clientX: x, clientY: y }));
  }

  toEl.dispatchEvent(new PointerEvent("pointerup", { ...common, clientX: ex, clientY: ey }));
}

/**
 * Attempt to place dominoes on the board via DOM interaction.
 * Returns true if placement appears to have started, false otherwise.
 *
 * @param {{placements: Array, grid: Map<string,number>}} solution
 * @param {{regions: Array}} puzzle
 * @returns {boolean}
 */
function tryAutoPlace(solution, puzzle) {
  try {
    const dominos = findDominoButtons();
    const cells = findBoardCells(puzzle);

    if (dominos.length === 0 || cells.length === 0) {
      console.log("[pips-solver] Could not find dominos or cells, falling back to overlay");
      return false;
    }

    console.log(`[pips-solver] Found ${dominos.length} dominos, ${cells.length} cells`);

    const cellMap = new Map();
    for (const c of cells) cellMap.set(`${c.row},${c.col}`, c);

    const used = new Set();
    const queue = [];

    for (const placement of solution.placements) {
      const targetA = cellMap.get(`${placement.cellA.row},${placement.cellA.col}`);
      const targetB = cellMap.get(`${placement.cellB.row},${placement.cellB.col}`);
      if (!targetA || !targetB) {
        console.warn("[pips-solver] Target cell not found for placement", placement);
        return false;
      }

      /* Find matching domino in tray */
      let found = false;
      for (let i = 0; i < dominos.length; i++) {
        if (used.has(i)) continue;
        const d = dominos[i];
        const matchNormal =
          d.firstDots === placement.pipA && d.secondDots === placement.pipB;
        const matchFlipped =
          d.firstDots === placement.pipB && d.secondDots === placement.pipA;

        if (matchNormal || matchFlipped) {
          used.add(i);
          queue.push({ domino: d, targetA, targetB, matchFlipped });
          found = true;
          break;
        }
      }

      if (!found) {
        console.warn("[pips-solver] No matching domino for", placement.pipA, placement.pipB);
        return false;
      }
    }

    /* Execute placements sequentially with delays */
    let delay = 0;
    for (const { domino, targetA } of queue) {
      setTimeout(() => {
        simulateDrag(domino.element, targetA.element);
      }, delay);
      delay += 250;
    }

    return true;
  } catch (err) {
    console.error("[pips-solver] Auto-place failed:", err);
    return false;
  }
}

/**
 * Place the solution on the board.
 * Always shows the overlay. Attempts auto-placement as a bonus.
 *
 * @param {{placements: Array, grid: Map<string,number>}} solution
 * @param {{regions: Array}} puzzle
 */
function placeSolution(solution, puzzle) {
  showSolutionOverlay(solution, puzzle);
  try {
    tryAutoPlace(solution, puzzle);
  } catch (e) {
    console.log("[pips-solver] Auto-place skipped:", e.message);
  }
}

if (typeof module !== "undefined") {
  module.exports = { placeSolution, showSolutionOverlay, tryAutoPlace };
}
