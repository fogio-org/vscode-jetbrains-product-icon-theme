#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const themes = pkg.contributes.productIconThemes.map((theme) => ({
  id: theme.id,
  label: theme.label,
  file: path.join(root, theme.path),
}));

let totalErrors = 0;

const failFile = (fileName, message) => {
  console.error(`✗ ${fileName}: ${message}`);
  totalErrors++;
};

const toLineColumn = (source, offset) => {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
};

const stripJsonComments = (source) => {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') {
        i += 1;
      }
      if (i < source.length) {
        result += '\n';
      }
      continue;
    }

    if (char === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') {
          result += '\n';
        }
        i += 1;
      }
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
};

const stripTrailingCommas = (source) => {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ',') {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) {
        j += 1;
      }

      if (source[j] === '}' || source[j] === ']') {
        continue;
      }
    }

    result += char;
  }

  return result;
};

const parseJsonc = (source, fileName) => {
  const normalized = stripTrailingCommas(stripJsonComments(source));

  try {
    return JSON.parse(normalized);
  } catch (error) {
    const match = error.message.match(/position (\d+)/);
    if (match) {
      const offset = Number(match[1]);
      const { line, column } = toLineColumn(normalized, offset);
      failFile(fileName, `parse error at line ${line}, column ${column}: ${error.message}`);
    } else {
      failFile(fileName, `parse error: ${error.message}`);
    }
    return null;
  }
};

for (const theme of themes) {
  const fileName = path.basename(theme.file);
  const raw = fs.readFileSync(theme.file, 'utf8');
  const obj = parseJsonc(raw, fileName);

  if (!obj) {
    continue;
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    failFile(fileName, 'theme file must contain an object');
    continue;
  }

  if (!Array.isArray(obj.fonts) || obj.fonts.length === 0) {
    failFile(fileName, 'fonts must be a non-empty array');
    continue;
  }

  if (!obj.iconDefinitions || typeof obj.iconDefinitions !== 'object' || Array.isArray(obj.iconDefinitions)) {
    failFile(fileName, 'iconDefinitions must be an object');
    continue;
  }

  const fontIds = new Set();

  for (const [index, font] of obj.fonts.entries()) {
    if (!font || typeof font !== 'object' || Array.isArray(font)) {
      failFile(fileName, `fonts[${index}] must be an object`);
      continue;
    }

    if (typeof font.id !== 'string' || font.id.trim() === '') {
      failFile(fileName, `fonts[${index}].id must be a non-empty string`);
      continue;
    }

    if (fontIds.has(font.id)) {
      failFile(fileName, `fonts contains duplicate id: ${font.id}`);
      continue;
    }
    fontIds.add(font.id);

    if (!Array.isArray(font.src) || font.src.length === 0) {
      failFile(fileName, `fonts[${index}].src must be a non-empty array`);
      continue;
    }

    for (const [srcIndex, src] of font.src.entries()) {
      if (!src || typeof src !== 'object' || Array.isArray(src)) {
        failFile(fileName, `fonts[${index}].src[${srcIndex}] must be an object`);
        continue;
      }

      if (typeof src.path !== 'string' || src.path.trim() === '') {
        failFile(fileName, `fonts[${index}].src[${srcIndex}].path must be a non-empty string`);
      } else {
        const fontPath = path.resolve(path.dirname(theme.file), src.path);
        if (!fs.existsSync(fontPath)) {
          failFile(fileName, `fonts[${index}].src[${srcIndex}].path points to a missing file: ${src.path}`);
        }
      }

      if (typeof src.format !== 'string' || src.format.trim() === '') {
        failFile(fileName, `fonts[${index}].src[${srcIndex}].format must be a non-empty string`);
      }
    }
  }

  const iconEntries = Object.entries(obj.iconDefinitions);
  const seenFontCharacters = new Map();

  if (iconEntries.length === 0) {
    failFile(fileName, 'iconDefinitions must not be empty');
    continue;
  }

  for (const [iconId, definition] of iconEntries) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      failFile(fileName, `iconDefinitions.${iconId} must be an object`);
      continue;
    }

    if (typeof definition.fontCharacter !== 'string' || definition.fontCharacter.trim() === '') {
      failFile(fileName, `iconDefinitions.${iconId}.fontCharacter must be a non-empty string`);
    }

    if (typeof definition.fontId !== 'string' || definition.fontId.trim() === '') {
      failFile(fileName, `iconDefinitions.${iconId}.fontId must be a non-empty string`);
    } else if (!fontIds.has(definition.fontId)) {
      failFile(fileName, `iconDefinitions.${iconId}.fontId references unknown font: ${definition.fontId}`);
    }

    if (typeof definition.fontCharacter === 'string' && definition.fontCharacter.trim() !== '') {
      const owners = seenFontCharacters.get(definition.fontCharacter) || [];
      owners.push(iconId);
      seenFontCharacters.set(definition.fontCharacter, owners);
    }
  }

  const reusedCharacters = [...seenFontCharacters.entries()].filter(([, iconIds]) => iconIds.length > 1);
  if (reusedCharacters.length > 0) {
    console.log(`⚠ ${fileName}: shared glyph mappings detected`);
    for (const [fontCharacter, iconIds] of reusedCharacters) {
      console.log(`  - ${JSON.stringify(fontCharacter)} used by: ${iconIds.join(', ')}`);
    }
  }

  console.log(`✓ ${fileName} — fonts: ${obj.fonts.length}, icons: ${iconEntries.length}`);
}

if (totalErrors > 0) {
  console.error(`\n✗ ${totalErrors} error(s)`);
  process.exit(1);
}

console.log('\n✓ all product icon themes valid');
