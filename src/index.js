/**
 * Pips Solver — bookmarklet entry point.
 *
 * Wires: fetcher -> solver -> placer
 *
 * When running as a bookmarklet on nytimes.com/games/pips,
 * this fetches the day's puzzle, solves it, and displays
 * (or auto-places) the solution.
 */

/* In bookmarklet mode, these are concatenated into a single IIFE.
   In Node.js test mode, they're loaded via require(). */

if (typeof require !== "undefined") {
  /* Node.js — for testing only */
  var { fetchPuzzle } = require("./fetcher");
  var { solve } = require("./solver");
  var { placeSolution } = require("./placer");
}

(async function pipsSolver() {
  try {
    const STATUS_ID = "pips-solver-status";

    function showStatus(msg) {
      if (typeof document === "undefined") {
        console.log(msg);
        return;
      }
      let el = document.getElementById(STATUS_ID);
      if (!el) {
        el = document.createElement("div");
        el.id = STATUS_ID;
        el.style.cssText = `
          position:fixed; top:16px; left:50%; transform:translateX(-50%);
          z-index:100000; padding:12px 24px; border-radius:8px;
          background:#222; color:#fff; font-size:15px;
          font-family:-apple-system,BlinkMacSystemFont,sans-serif;
          box-shadow:0 4px 16px rgba(0,0,0,0.3);
          transition:opacity 0.3s;
        `;
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
    }

    function hideStatus() {
      const el = document.getElementById(STATUS_ID);
      if (el) {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 400);
      }
    }

    showStatus("Fetching puzzle...");

    const { puzzle, difficulty, date } = await fetchPuzzle();

    showStatus(`Solving ${difficulty} (${date})...`);

    const solution = solve(puzzle);

    if (!solution) {
      showStatus("No solution found!");
      setTimeout(hideStatus, 3000);
      return;
    }

    showStatus(`Solved! ${solution.placements.length} dominoes.`);

    placeSolution(solution, puzzle);

    setTimeout(hideStatus, 2000);
  } catch (err) {
    console.error("[pips-solver]", err);
    if (typeof alert !== "undefined") {
      alert(`Pips Solver error: ${err.message}`);
    }
  }
})();
