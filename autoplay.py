#!/Users/cao/LocalDocs/pips-solver/.venv/bin/python3
"""
NYT Pips auto-solver.

Opens the game, solves the puzzle, and places all dominoes automatically.

    python autoplay.py                          # today's easy
    python autoplay.py --difficulty hard        # today's hard
    python autoplay.py --date 2025-10-14       # specific date
    python autoplay.py --headed                 # watch the browser
"""

import argparse, time
from collections import namedtuple
from datetime import date
from playwright.sync_api import sync_playwright

Cell = namedtuple("Cell", "row col")
Domino = namedtuple("Domino", "a b")
Region = namedtuple("Region", "cells constraint target")
Placement = namedtuple("Placement", "domino cell_a cell_b pip_a pip_b")

# ── Fetch ─────────────────────────────────────────────────────────

def fetch_puzzle(page, difficulty, puzzle_date=None):
    url = f"https://www.nytimes.com/svc/pips/v1/{puzzle_date or date.today().isoformat()}.json"
    data = page.evaluate(f'fetch("{url}").then(r=>r.json())')
    raw = data[difficulty]
    dominoes = [Domino(d[0], d[1]) for d in raw["dominoes"]]
    regions = [
        Region(
            cells=[Cell(i[0], i[1]) for i in r["indices"]],
            constraint=r["type"],
            target=r.get("target"),
        )
        for r in raw["regions"]
    ]
    return dominoes, regions

# ── Solve ─────────────────────────────────────────────────────────

def solve(dominoes, regions):
    cells, seen = [], set()
    for r in regions:
        for c in r.cells:
            if c not in seen:
                seen.add(c)
                cells.append(c)

    idx = {c: i for i, c in enumerate(cells)}
    adj = [[] for _ in cells]
    for i, c in enumerate(cells):
        for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            n = Cell(c.row + dr, c.col + dc)
            if n in idx:
                adj[i].append(idx[n])

    board = [None] * len(cells)
    remaining = {}
    for d in dominoes:
        remaining[d] = remaining.get(d, 0) + 1
    result = []

    def spare():
        out = []
        for (a, b), n in remaining.items():
            out.extend([a, b] * n)
        return out

    def check():
        sp = spare()
        for r in regions:
            vals = [board[idx[c]] for c in r.cells if board[idx[c]] is not None]
            empty = sum(1 for c in r.cells if board[idx[c]] is None)
            ct, tgt = r.constraint, r.target

            if ct == "empty":
                continue
            elif ct == "sum":
                s = sum(vals)
                if s > tgt:
                    return False
                if empty == 0:
                    if s != tgt: return False
                else:
                    lo = sorted(sp)[:empty]
                    hi = sorted(sp)[-empty:]
                    if s + sum(lo) > tgt or s + sum(hi) < tgt:
                        return False
            elif ct == "less":
                if sum(vals) + sum(sorted(sp)[:empty]) >= tgt:
                    return False
            elif ct == "greater":
                if sum(vals) + sum(sorted(sp)[-empty:]) <= tgt and empty == 0:
                    return False
                if empty == 0 and sum(vals) <= tgt:
                    return False
            elif ct == "equals":
                if vals and any(v != vals[0] for v in vals):
                    return False
                if vals and empty > 0 and sum(1 for p in sp if p == vals[0]) < empty:
                    return False
            elif ct == "unequal":
                if len(vals) != len(set(vals)):
                    return False
                if empty > 0 and len(set(p for p in sp if p not in set(vals))) < empty:
                    return False
        return True

    def isolated():
        for i, v in enumerate(board):
            if v is None and not any(board[j] is None for j in adj[i]):
                return True
        return False

    def dfs():
        t = next((i for i, v in enumerate(board) if v is None), -1)
        if t < 0:
            return True
        empties = [j for j in adj[t] if board[j] is None]
        if not empties:
            return False
        for ni in empties:
            for key, cnt in list(remaining.items()):
                if cnt <= 0:
                    continue
                for va, vb in ({(key.a, key.b), (key.b, key.a)} if key.a != key.b else {(key.a, key.b)}):
                    board[t], board[ni] = va, vb
                    remaining[key] -= 1
                    if not isolated() and check():
                        result.append(Placement(key, cells[t], cells[ni], va, vb))
                        if dfs():
                            return True
                        result.pop()
                    board[t] = board[ni] = None
                    remaining[key] += 1
        return False

    return result if dfs() else None

# ── Place ─────────────────────────────────────────────────────────

def find_tray_dominoes(page):
    """Detect complete dominoes in the tray by grouping halves via their shared
    parent DOM element. Returns left/top half position for grab targeting.
    """
    return page.evaluate("""() => {
        const halves = [...document.querySelectorAll('button')]
            .filter(b => (b.className||'').includes('halfDomino'))
            .filter(b => { const r = b.getBoundingClientRect(); return r.width > 10 && r.y > 600; });

        const groups = new Map();
        for (const h of halves) {
            const p = h.parentElement;
            if (!groups.has(p)) groups.set(p, []);
            groups.get(p).push(h);
        }

        function dots(b) {
            const fk = Object.keys(b).find(k => k.startsWith('__reactFiber'));
            if (fk) {
                let f = b[fk];
                for (let i = 0; i < 10 && f; i++, f = f.return)
                    if (f.memoizedProps?.numDots != null) return f.memoizedProps.numDots;
            }
            return b.querySelectorAll('[class*="dot"]').length;
        }

        const out = [];
        for (const [, pair] of groups) {
            if (pair.length !== 2) continue;
            const [h1, h2] = pair;
            const r1 = h1.getBoundingClientRect(), r2 = h2.getBoundingClientRect();
            const c1 = { d: dots(h1), x: r1.x+r1.width/2, y: r1.y+r1.height/2 };
            const c2 = { d: dots(h2), x: r2.x+r2.width/2, y: r2.y+r2.height/2 };
            const horiz = Math.abs(c1.y - c2.y) < Math.abs(c1.x - c2.x);
            let lt, rb;
            if (horiz) { [lt, rb] = c1.x < c2.x ? [c1, c2] : [c2, c1]; }
            else        { [lt, rb] = c1.y < c2.y ? [c1, c2] : [c2, c1]; }
            out.push({ a: lt.d, b: rb.d,
                       x: (c1.x+c2.x)/2, y: (c1.y+c2.y)/2,
                       ltx: lt.x, lty: lt.y });
        }
        return out;
    }""")


def find_board_cells(page, regions):
    """Map visible board cells to puzzle coordinates."""
    positions = page.evaluate("""() => {
        return [...document.querySelectorAll('div')]
            .filter(d => (d.className||'').includes('droppableCell') && !(d.className||'').includes('hid'))
            .filter(d => { const r = d.getBoundingClientRect(); return r.width > 0; })
            .map(d => { const r = d.getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2, w: r.width }; });
    }""")
    coords = sorted({c for r in regions for c in r.cells})
    sz = min(p["w"] for p in positions) if positions else 52
    positions.sort(key=lambda p: (round(p["y"] / (sz * 0.4)), p["x"]))
    if len(positions) != len(coords):
        return None
    return {c: (p["x"], p["y"]) for c, p in zip(coords, positions)}


def rotation_clicks(tray_lt, tray_rb, left_pip, right_pip, is_vertical):
    """How many clockwise clicks to orient the tray domino correctly.

    tray_lt/tray_rb: pip values of left/top and right/bottom halves in tray.
    left_pip: pip value needed on the left (horizontal) or top (vertical) cell.
    right_pip: pip value needed on the right (horizontal) or bottom (vertical) cell.
    is_vertical: whether the target placement is vertical.

    Tray default (0): tray_lt=LEFT, tray_rb=RIGHT (horizontal).
    After 1 click:    tray_lt=TOP,  tray_rb=BOTTOM (vertical).
    After 2 clicks:   tray_lt=RIGHT, tray_rb=LEFT (flipped horizontal).
    After 3 clicks:   tray_lt=BOTTOM, tray_rb=TOP (flipped vertical).
    """
    lt_matches = (tray_lt == left_pip and tray_rb == right_pip)
    if not is_vertical:  # horizontal target
        return 0 if lt_matches else 2
    else:                # vertical target
        return 1 if lt_matches else 3


TRAY_HALF_COUNT_JS = """() => [...document.querySelectorAll('button')]
    .filter(b => (b.className||'').includes('halfDomino')
              && b.getBoundingClientRect().width > 10
              && b.getBoundingClientRect().y > 600).length"""


def drag(page, sx, sy, dx, dy, steps=10):
    page.mouse.move(sx, sy)
    page.mouse.down()
    time.sleep(0.03)
    for i in range(1, steps + 1):
        page.mouse.move(sx + (dx - sx) * i / steps, sy + (dy - sy) * i / steps)
        time.sleep(0.02)
    page.mouse.up()
    time.sleep(0.1)


def wait_drop(page, prev_half_count, timeout=1.0):
    """Poll until tray half-count drops (domino was accepted by the board)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if page.evaluate(TRAY_HALF_COUNT_JS) < prev_half_count:
            return True
        time.sleep(0.02)
    return False


def place(page, regions, placements):
    cell_map = find_board_cells(page, regions)
    if not cell_map:
        print("  Failed to map board cells.", flush=True)
        return False

    for i, p in enumerate(placements):
        tray = find_tray_dominoes(page)
        half_count = len(tray) * 2

        dst_a = cell_map.get(p.cell_a)
        dst_b = cell_map.get(p.cell_b)
        if not dst_a or not dst_b:
            print(f"  No position for {p.cell_a} or {p.cell_b}", flush=True)
            return False

        dr = p.cell_b.row - p.cell_a.row
        dc = p.cell_b.col - p.cell_a.col
        is_vertical = (dc == 0)

        if is_vertical:
            left_pip = p.pip_a if dr > 0 else p.pip_b
            right_pip = p.pip_b if dr > 0 else p.pip_a
        else:
            left_pip = p.pip_a if dc > 0 else p.pip_b
            right_pip = p.pip_b if dc > 0 else p.pip_a
        drop_x = (dst_a[0] + dst_b[0]) / 2
        drop_y = (dst_a[1] + dst_b[1]) / 2

        ti = next((j for j, t in enumerate(tray) if
            (t["a"] == p.domino.a and t["b"] == p.domino.b) or
            (t["a"] == p.domino.b and t["b"] == p.domino.a)), None)
        if ti is None:
            print(f"  No tray match for {p.domino}", flush=True)
            return False

        t = tray[ti]
        clicks = rotation_clicks(t["a"], t["b"], left_pip, right_pip, is_vertical)
        da, db = p.domino.a, p.domino.b

        for ci in range(clicks):
            page.mouse.click(t["ltx"], t["lty"])
            time.sleep(0.25)
            tray2 = find_tray_dominoes(page)
            matches = [t2 for t2 in tray2
                       if {t2["a"], t2["b"]} == {da, db}]
            if matches:
                matches.sort(key=lambda t2: abs(t2["x"]-t["x"]) + abs(t2["y"]-t["y"]))
                t = matches[0]

        grab_x, grab_y = t["ltx"], t["lty"]

        tag = f"rot={clicks}" if clicks else "h"
        print(f"  [{i+1}/{len(placements)}] {p.pip_a}|{p.pip_b} → "
              f"({p.cell_a.row},{p.cell_a.col}),({p.cell_b.row},{p.cell_b.col}) {tag}",
              end="", flush=True)

        for attempt in range(3):
            pre = page.evaluate(TRAY_HALF_COUNT_JS)
            drag(page, grab_x, grab_y, drop_x, drop_y)
            if wait_drop(page, pre):
                break
            # Re-detect position for retry
            tray2 = find_tray_dominoes(page)
            matches = [t2 for t2 in tray2
                       if {t2["a"], t2["b"]} == {da, db}]
            if not matches:
                break
            matches.sort(key=lambda t2: abs(t2["x"]-t["x"]) + abs(t2["y"]-t["y"]))
            t = matches[0]
            grab_x, grab_y = t["ltx"], t["lty"]
            print(f" retry{attempt+1}", end="", flush=True)
        print(flush=True)
    return True

# ── Navigation ────────────────────────────────────────────────────

def dismiss_overlays(page, difficulty):
    page.evaluate('document.querySelectorAll("#fides-overlay,[id*=fides]").forEach(e=>e.remove())')
    time.sleep(0.3)
    for sel in [f'[data-testid="{difficulty.upper()}-toggle-button"]',
                '[data-testid="play-button"]',
                'button:has-text("Skip Tutorial")',
                'button:has-text("Got it")',
                '[aria-label="Close"]']:
        try:
            loc = page.locator(sel).first
            if loc.is_visible(timeout=800):
                loc.click(force=True)
                time.sleep(0.4)
        except Exception:
            pass

# ── Main ──────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="NYT Pips auto-solver")
    ap.add_argument("--difficulty", choices=["easy", "medium", "hard"], default="easy")
    ap.add_argument("--date", help="YYYY-MM-DD (default: today)")
    ap.add_argument("--headed", action="store_true", help="show browser")
    ap.add_argument("--slow", type=int, default=0, help="slow-mo ms")
    args = ap.parse_args()

    pw = sync_playwright().start()
    browser = None
    try:
        browser = pw.chromium.launch(headless=not args.headed, slow_mo=args.slow)
        page = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()

        url = f"https://www.nytimes.com/games/pips/{args.difficulty}"
        print(f"Opening {url} ...", flush=True)
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        dismiss_overlays(page, args.difficulty)

        print(f"Fetching {args.difficulty} puzzle ...", flush=True)
        dominoes, regions = fetch_puzzle(page, args.difficulty, args.date)
        print(f"  {len(dominoes)} dominoes, {len(regions)} regions", flush=True)

        print("Solving ...", flush=True)
        t0 = time.time()
        placements = solve(dominoes, regions)
        ms = (time.time() - t0) * 1000
        if not placements:
            print("No solution found.", flush=True)
            return
        print(f"  Solved in {ms:.1f}ms — {len(placements)} placements", flush=True)

        print("Placing ...", flush=True)
        ok = place(page, regions, placements)
        print("Done!" if ok else "Placement failed.", flush=True)

        if args.headed:
            input("Press Enter to close browser...")
    except KeyboardInterrupt:
        pass
    finally:
        if browser:
            browser.close()
        pw.stop()

if __name__ == "__main__":
    main()
