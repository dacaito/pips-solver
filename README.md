# Pips Solver

Automatically solves [NYT Pips](https://www.nytimes.com/games/pips) puzzles. Opens a browser, solves the puzzle, and drags every domino into place.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

## Usage

```bash
source .venv/bin/activate

python autoplay.py                           # today's easy
python autoplay.py --difficulty hard         # today's hard
python autoplay.py --difficulty medium --headed   # watch it solve
python autoplay.py --date 2025-10-14         # specific date
```

Options: `--difficulty easy|medium|hard`, `--date YYYY-MM-DD`, `--headed`, `--slow N` (ms).

## How It Works

1. **Navigate** directly to `/games/pips/{difficulty}`
2. **Dismiss** cookie consent, welcome modal, tutorial overlays
3. **Fetch** puzzle data from the NYT API (same-origin, no auth needed)
4. **Solve** via DFS backtracking with pruning (< 1ms easy, < 100ms hard)
5. **Place** each domino using Playwright's `page.mouse` API — real browser input events that React processes natively
