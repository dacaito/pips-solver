#!/usr/bin/env bash
set -euo pipefail

# Build the bookmarklet by concatenating source files into
# a single IIFE, then minifying with terser.
#
# Output: dist/bookmarklet.js  (minified IIFE)
#         dist/bookmarklet.txt (javascript: URL, ready to paste)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p dist

# Concatenate source files (order matters: deps before entry)
BUNDLE="dist/bundle.js"
cat > "$BUNDLE" <<'BANNER'
(async function pipsSolverBookmarklet() {
BANNER

# Inline fetcher (strip module.exports)
sed '/module\.exports/d' src/fetcher.js >> "$BUNDLE"
echo "" >> "$BUNDLE"

# Inline solver (strip module.exports)
sed '/module\.exports/d' src/solver.js >> "$BUNDLE"
echo "" >> "$BUNDLE"

# Inline placer (strip module.exports)
sed '/module\.exports/d' src/placer.js >> "$BUNDLE"
echo "" >> "$BUNDLE"

# Inline entry point logic (strip require blocks and the outer IIFE wrapper)
sed '/typeof require/,/^}/d; /typeof module/d; /^(async function/d; /^})();/d' src/index.js >> "$BUNDLE"

cat >> "$BUNDLE" <<'FOOTER'
})();
FOOTER

echo "Bundled → $BUNDLE ($(wc -c < "$BUNDLE" | tr -d ' ') bytes)"

# Check if terser is available
if command -v npx &>/dev/null && npx terser --version &>/dev/null 2>&1; then
  npx terser "$BUNDLE" \
    --compress --mangle \
    --output dist/bookmarklet.js

  # Create the javascript: URL
  echo -n "javascript:" > dist/bookmarklet.txt
  cat dist/bookmarklet.js >> dist/bookmarklet.txt

  SIZE=$(wc -c < dist/bookmarklet.js | tr -d ' ')
  echo "Minified → dist/bookmarklet.js ($SIZE bytes)"
  echo "URL      → dist/bookmarklet.txt"
else
  echo "terser not found — using unminified bundle."
  echo "(Install: npm install -g terser)"
  cp "$BUNDLE" dist/bookmarklet.js

  echo -n "javascript:" > dist/bookmarklet.txt
  # URL-encode the bundle for bookmarklet use
  cat dist/bookmarklet.js >> dist/bookmarklet.txt

  echo "URL → dist/bookmarklet.txt (unminified)"
fi

echo "Done."
