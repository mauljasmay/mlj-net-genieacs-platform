#!/bin/bash
# Create deployable ZIP for MLJ NET GenieACS Platform
# Run from project root

set -e

PROJECT_NAME="mlj-net-genieacs-platform"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="${PROJECT_NAME}-${TIMESTAMP}.zip"
OUTPUT_DIR="/home/z/my-project/download"
SRC_DIR="/home/z/my-project"

mkdir -p "$OUTPUT_DIR"

# Create a temp directory for staging
STAGE_DIR=$(mktemp -d)
mkdir -p "$STAGE_DIR/$PROJECT_NAME"

# Copy source files
cp -r "$SRC_DIR/src" "$STAGE_DIR/$PROJECT_NAME/"
cp -r "$SRC_DIR/prisma" "$STAGE_DIR/$PROJECT_NAME/"
cp -r "$SRC_DIR/public" "$STAGE_DIR/$PROJECT_NAME/"

# Copy config files
cp "$SRC_DIR/package.json" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/bun.lock" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/next.config.ts" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/tsconfig.json" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/postcss.config.mjs" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/tailwind.config.ts" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/eslint.config.mjs" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/components.json" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/Caddyfile" "$STAGE_DIR/$PROJECT_NAME/"

# Copy deployment scripts (already generated clean by Python)
cp "$SRC_DIR/install.sh" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/setup.sh" "$STAGE_DIR/$PROJECT_NAME/"
cp "$SRC_DIR/generate-scripts.py" "$STAGE_DIR/$PROJECT_NAME/"

# Ensure LF line endings in all shell scripts in staging
for f in "$STAGE_DIR/$PROJECT_NAME/install.sh" "$STAGE_DIR/$PROJECT_NAME/setup.sh"; do
    if [ -f "$f" ]; then
        tr -d '\r' < "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
        chmod +x "$f"
    fi
done

# Remove any .db files from staging
find "$STAGE_DIR" -name "*.db" -delete 2>/dev/null || true
find "$STAGE_DIR" -name "*.db-wal" -delete 2>/dev/null || true
find "$STAGE_DIR" -name "*.db-shm" -delete 2>/dev/null || true

# Create ZIP
cd "$STAGE_DIR"
zip -r "$OUTPUT_DIR/$ZIP_NAME" "$PROJECT_NAME/" -x "*$PROJECT_NAME/node_modules/*" -x "*$PROJECT_NAME/.next/*" -x "*$PROJECT_NAME/db/*"

# Cleanup
rm -rf "$STAGE_DIR"

SIZE=$(du -h "$OUTPUT_DIR/$ZIP_NAME" | cut -f1)
echo ""
echo "  ZIP created: $OUTPUT_DIR/$ZIP_NAME"
echo "  Size: $SIZE"
echo ""
