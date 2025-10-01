#!/usr/bin/env bash
# Verification script for Phase 1 implementation

set -e

echo "=========================================="
echo "Phase 1 Implementation Verification"
echo "=========================================="
echo ""

echo "1. Checking directory structure..."
for dir in src/types src/utils src/stages src/extractors tests; do
  if [ -d "$dir" ]; then
    echo "   ✓ $dir exists"
  else
    echo "   ✗ $dir missing"
    exit 1
  fi
done
echo ""

echo "2. Checking source files..."
files=(
  "src/types/state.ts"
  "src/types/analysis.ts"
  "src/types/script.ts"
  "src/utils/prompts.ts"
  "src/stages/analysis.ts"
  "src/stages/script.ts"
  "src/extractors/commit.ts"
  "src/index.ts"
  "tests/integration-test.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✓ $file exists"
  else
    echo "   ✗ $file missing"
    exit 1
  fi
done
echo ""

echo "3. Building project..."
bun run build:tsc > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✓ Build successful"
else
  echo "   ✗ Build failed"
  exit 1
fi
echo ""

echo "4. Checking compiled JavaScript..."
if [ -f "dist/src/index.js" ]; then
  echo "   ✓ Main server compiled"
else
  echo "   ✗ Main server not compiled"
  exit 1
fi
echo ""

echo "5. Running integration tests..."
if bun tests/integration-test.ts > /tmp/phase1-test.log 2>&1; then
  echo "   ✓ All tests passed"
  echo ""
  echo "Test output:"
  tail -n 5 /tmp/phase1-test.log | sed 's/^/   /'
else
  echo "   ✗ Tests failed"
  cat /tmp/phase1-test.log
  exit 1
fi
echo ""

echo "=========================================="
echo "✓ Phase 1 Implementation Verified"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  - Review PHASE1_SUMMARY.md for details"
echo "  - Read PHASE1_USAGE.md for usage guide"
echo "  - Test with MCP Inspector:"
echo "    npx @modelcontextprotocol/inspector bun dist/src/index.js"
echo ""
