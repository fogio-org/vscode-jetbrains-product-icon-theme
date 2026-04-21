#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const expectString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`package.json must declare a non-empty string field: ${field}`);
  }
};

const expectFile = (relativePath, field) => {
  expectString(relativePath, field);
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`${field} points to a missing file: ${relativePath}`);
  }
};

['name', 'displayName', 'publisher', 'version', 'description'].forEach((field) => {
  expectString(pkg[field], field);
});

if (!pkg.engines || typeof pkg.engines.vscode !== 'string' || pkg.engines.vscode.trim() === '') {
  fail('package.json must declare engines.vscode');
}

expectFile(pkg.icon, 'icon');

if (
  !pkg.contributes ||
  !Array.isArray(pkg.contributes.productIconThemes) ||
  pkg.contributes.productIconThemes.length === 0
) {
  fail('package.json must declare contributes.productIconThemes with at least one icon theme');
}

const themeIds = new Set();

for (const [index, theme] of pkg.contributes.productIconThemes.entries()) {
  if (!theme || typeof theme !== 'object') {
    fail(`contributes.productIconThemes[${index}] must be an object`);
  }

  expectString(theme.label, `contributes.productIconThemes[${index}].label`);
  expectString(theme.id, `contributes.productIconThemes[${index}].id`);
  expectFile(theme.path, `contributes.productIconThemes[${index}].path`);

  if (themeIds.has(theme.id)) {
    fail(`contributes.productIconThemes contains duplicate id: ${theme.id}`);
  }
  themeIds.add(theme.id);
}

if (pkg.categories && !pkg.categories.includes('Themes')) {
  fail('package.json categories must include "Themes" for an icon theme extension');
}

console.log('✓ package.json manifest valid');
console.log(`✓ product icon themes declared: ${pkg.contributes.productIconThemes.length}`);
