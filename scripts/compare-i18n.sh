#!/bin/bash
#
# Batch i18n quality check script
# Compares all markdown files between /en and /zh directories
#
# Usage:
#   ./scripts/compare-i18n.sh              # Compare en vs zh
#   ./scripts/compare-i18n.sh --json       # Output as JSON
#   ./scripts/compare-i18n.sh --check terminology,codeBlocks  # Specific checks
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Paths
QUALITY_CLI="${PROJECT_ROOT}/.claude/skills/beaver-markdown-i18n/scripts/quality-cli.js"
SOURCE_DIR="${PROJECT_ROOT}/en"
TARGET_DIR="${PROJECT_ROOT}/zh"

# Check if quality-cli.js exists
if [[ ! -f "$QUALITY_CLI" ]]; then
    echo -e "${RED}Error: quality-cli.js not found at $QUALITY_CLI${NC}"
    exit 1
fi

# Check if directories exist
if [[ ! -d "$SOURCE_DIR" ]]; then
    echo -e "${RED}Error: Source directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
    echo -e "${RED}Error: Target directory not found: $TARGET_DIR${NC}"
    exit 1
fi

# Parse arguments
ARGS=()
for arg in "$@"; do
    ARGS+=("$arg")
done

echo "Running i18n quality check..."
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo ""

# Run the quality CLI
node "$QUALITY_CLI" --dir "$SOURCE_DIR" "$TARGET_DIR" --target-locale zh "${ARGS[@]}"

exit_code=$?

echo ""
if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
else
    echo -e "${RED}✗ Some checks failed. See details above.${NC}"
fi

exit $exit_code
