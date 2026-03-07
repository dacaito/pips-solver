# Pips Solver

A bookmarklet that solves [NYT Pips](https://www.nytimes.com/games/pips) puzzles in one click.

Click the bookmark while on the Pips page and the solution appears as an overlay showing exactly where each domino goes.

## Installation

### Option A: Drag to bookmarks bar

1. Build the bookmarklet: `./build.sh`
2. Open `dist/bookmarklet.txt` and copy its contents
3. Create a new bookmark in your browser and paste the contents as the URL
4. Name it "Solve Pips" (or whatever you like)

### Option B: Manual bookmark

1. Right-click your bookmarks bar → "Add page..." / "Add bookmark..."
2. Set the name to "Solve Pips"
3. Paste the contents of `dist/bookmarklet.txt` as the URL

## Usage

1. Go to [nytimes.com/games/pips](https://www.nytimes.com/games/pips)
2. Select a difficulty (Easy, Medium, or Hard)
3. Click the "Solve Pips" bookmark
4. The solution overlay appears showing pip values and domino groupings

The solver auto-detects which difficulty you're playing based on the page URL.

## Building from Source

```bash
# Install terser (one-time)
npm install -g terser

# Build the bookmarklet
./build.sh
```

Output:
- `dist/bundle.js` — concatenated source (readable)
- `dist/bookmarklet.js` — minified
- `dist/bookmarklet.txt` — `javascript:` URL ready to paste

## Testing

```bash
node test/test-solver.js
```

Runs the solver against hardcoded puzzles covering all constraint types (sum, equals, unequal, less, greater) and various board sizes.

## How It Works

1. **Fetch**: Calls the NYT Pips API (`/svc/pips/v1/{date}.json`) from the same origin
2. **Solve**: DFS backtracking with pruning — isolated cell detection, constraint checking, and forward inventory analysis
3. **Display**: Renders a color-coded grid overlay on the page

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical design.

## Project Structure

```
src/
  fetcher.js    — NYT API client + JSON parser
  solver.js     — DFS solver (pure logic)
  placer.js     — Solution overlay display
  index.js      — Bookmarklet entry point
test/
  test-solver.js — Solver test suite
build.sh         — Build script
```
