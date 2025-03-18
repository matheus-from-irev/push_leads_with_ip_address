#!/bin/bash

# Exit on any error
set -e

echo "📂 Preparing files for GitHub Pages deployment..."

# Define paths
SRC_DIR="src"
DIST_DIR="gh-pages-deploy"

# Remove any existing deployment directory and create a new one
rm -rf $DIST_DIR
mkdir -p $DIST_DIR

# Copy necessary files
cp -r $SRC_DIR/index.html $DIST_DIR/
cp -r $SRC_DIR/main.js $DIST_DIR/
cp -r $SRC_DIR/modules $DIST_DIR/
cp -r assets $DIST_DIR/

echo "🔄 Updating asset paths in index.html..."
sed -i 's#src="/#src="./#g' $DIST_DIR/index.html
sed -i 's#href="/#href="./#g' $DIST_DIR/index.html

# Ensure we're on the main branch before creating gh-pages
git checkout main

# Create and switch to a fresh gh-pages branch
echo "📌 Creating a new gh-pages branch..."
git branch -D gh-pages 2>/dev/null || true  # Delete old branch if it exists
git checkout --orphan gh-pages

# Remove all files from git tracking (but keep them locally)
git rm -rf . --quiet

# Move deployment files to the repository root
mv $DIST_DIR/* .
rmdir $DIST_DIR

# Add and commit the new deployment files
git add .
git commit -m "🚀 Deploy to GitHub Pages"

# Push the new branch to GitHub
git push -u origin gh-pages --force

# Switch back to the main branch
git checkout main

echo "✅ GitHub Pages setup complete!"
echo "🔗 Visit: https://yourusername.github.io/repository-name/"
