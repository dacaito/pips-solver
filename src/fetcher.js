/**
 * Fetches and parses NYT Pips puzzle data.
 *
 * In-browser (bookmarklet): uses same-origin fetch to /svc/pips/v1/{date}.json
 * In Node.js (testing):     uses node-fetch or built-in fetch with optional cookie
 */

/**
 * Parse a raw puzzle JSON object (one difficulty level) into the solver's format.
 *
 * API shape:
 *   { dominoes: [[0,4],[1,6],...], regions: [{ indices: [[r,c],...], type: "sum", target: 6 }, ...] }
 *
 * Solver shape:
 *   { dominoes: [{left,right},...], regions: [{ cells: [{row,col},...], type, target },...] }
 */
function parsePuzzle(raw) {
  const dominoes = raw.dominoes.map(([left, right]) => ({ left, right }));

  const regions = raw.regions.map((r) => ({
    cells: r.indices.map(([row, col]) => ({ row, col })),
    type: r.type,
    target: r.target ?? null,
  }));

  return { dominoes, regions };
}

/**
 * Detect the current difficulty from the page URL or DOM.
 * Falls back to "hard" if detection fails.
 */
function detectDifficulty() {
  if (typeof window === "undefined") return "hard";

  const url = window.location.href;
  if (url.includes("/easy")) return "easy";
  if (url.includes("/medium")) return "medium";
  if (url.includes("/hard")) return "hard";

  const activeTab = document.querySelector(
    '[data-testid="difficulty-tab"][aria-selected="true"], ' +
    '[class*="active"][class*="difficulty" i], ' +
    'button[aria-pressed="true"]'
  );
  if (activeTab) {
    const text = activeTab.textContent.toLowerCase();
    if (text.includes("easy")) return "easy";
    if (text.includes("medium")) return "medium";
    if (text.includes("hard")) return "hard";
  }

  return "hard";
}

/**
 * Fetch puzzle data for a given date.
 *
 * @param {string} [date] - YYYY-MM-DD, defaults to today
 * @param {string} [difficulty] - 'easy'|'medium'|'hard', defaults to auto-detect
 * @param {string} [cookie] - NYT-S cookie for Node.js testing
 * @returns {Promise<{puzzle: object, difficulty: string, date: string}>}
 */
async function fetchPuzzle(date, difficulty, cookie) {
  if (!date) {
    const now = new Date();
    date = now.toISOString().slice(0, 10);
  }

  if (!difficulty) {
    difficulty = detectDifficulty();
  }

  const isNode = typeof window === "undefined";
  const url = isNode
    ? `https://www.nytimes.com/svc/pips/v1/${date}.json`
    : `/svc/pips/v1/${date}.json`;

  const headers = {};
  if (isNode && cookie) {
    headers["Cookie"] = `NYT-S=${cookie}`;
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`Failed to fetch puzzle: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  if (!data[difficulty]) {
    throw new Error(
      `Difficulty "${difficulty}" not found. Available: ${Object.keys(data).filter(k => ["easy", "medium", "hard"].includes(k)).join(", ")}`
    );
  }

  const puzzle = parsePuzzle(data[difficulty]);
  return { puzzle, difficulty, date };
}

if (typeof module !== "undefined") {
  module.exports = { fetchPuzzle, parsePuzzle, detectDifficulty };
}
