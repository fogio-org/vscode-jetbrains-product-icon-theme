#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ICONS as ALL_ICONS, ALIASES } from './icons.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CUSTOM_DIR = path.resolve(__dirname, '..', 'assets', 'icons', 'prepared');
const CODICON_DIR = path.resolve(__dirname, '..', 'node_modules', '@vscode', 'codicons', 'src', 'icons');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'assets', 'img', 'comparison.png');

const PREVIEW_ICONS = [
    ...ALL_ICONS.map((i) => ({
        name: i.name,
        codicon: i.codicon || i.name,
        customSvg: i.name,
    })),
    ...ALIASES.map((a) => ({
        name: a.name,
        codicon: a.name,
        customSvg: a.target,
    })),
];

const SCALE = 2;
const COLS = 3;
const CELL_W = 280;
const CELL_H = 56;
const ICON_SLOT = 36;
const PAD = 24;
const HEADER_H = 48;
const GAP = 8;

const BG = '#1e1e1e';
const CELL_BG = '#252526';
const BORDER = '#3c3c3c';
const TEXT_DIM = '#858585';
const TEXT_LIGHT = '#cccccc';

async function renderIcon(svgFilePath, fill, opacity = 1) {
    if (!fs.existsSync(svgFilePath)) return null;

    let svg = fs.readFileSync(svgFilePath, 'utf-8');
    svg = svg
        .replace(/fill="currentColor"/g, `fill="${fill}"`)
        .replace(/fill="#[0-9a-fA-F]+"/g, `fill="${fill}"`)
        .replace(/fill:#[0-9a-fA-F]+/g, `fill:${fill}`)
        .replace(/style="[^"]*"/g, (m) =>
            m.replace(/fill:[^;"]+/g, `fill:${fill}`)
        );

    if (opacity < 1) {
        svg = svg.replace(/<svg\b/, `<svg opacity="${opacity}"`);
    }

    const rendered = await sharp(Buffer.from(svg), { density: 72 * ICON_SLOT })
        .resize(ICON_SLOT * SCALE, ICON_SLOT * SCALE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    return rendered;
}

async function main() {
    const rows = Math.ceil(PREVIEW_ICONS.length / COLS);
    const gridW = COLS * CELL_W + (COLS - 1) * GAP;
    const width = gridW + PAD * 2;
    const height = HEADER_H + rows * (CELL_H + GAP) + PAD * 2;

    const W = width * SCALE;
    const H = height * SCALE;

    const headerSvg = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
            <rect width="${W}" height="${H}" fill="${BG}"/>
            <text x="${PAD * SCALE}" y="${(PAD + 16) * SCALE}" fill="${TEXT_LIGHT}" font-family="sans-serif" font-size="${14 * SCALE}" font-weight="bold">Icon Comparison</text>
            <text x="${(width - PAD) * SCALE}" y="${(PAD + 16) * SCALE}" text-anchor="end" fill="${TEXT_DIM}" font-family="sans-serif" font-size="${11 * SCALE}">
                <tspan opacity="0.4">Default</tspan>  →  <tspan>JetBrains</tspan>
            </text>
        </svg>
    `);

    const composites = [];

    for (let i = 0; i < PREVIEW_ICONS.length; i++) {
        const icon = PREVIEW_ICONS[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cellX = PAD + col * (CELL_W + GAP);
        const cellY = PAD + HEADER_H + row * (CELL_H + GAP);

        const cellSvg = Buffer.from(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${CELL_W * SCALE}" height="${CELL_H * SCALE}">
                <rect width="${CELL_W * SCALE}" height="${CELL_H * SCALE}" rx="${6 * SCALE}" fill="${CELL_BG}" stroke="${BORDER}" stroke-width="${SCALE}"/>
                <text x="${12 * SCALE}" y="${(CELL_H / 2 + 4) * SCALE}" fill="${TEXT_DIM}" font-family="monospace" font-size="${11 * SCALE}">${icon.name}</text>
            </svg>
        `);
        composites.push({
            input: await sharp(cellSvg).png().toBuffer(),
            top: cellY * SCALE,
            left: cellX * SCALE,
        });

        const codiconFile = path.join(CODICON_DIR, `${icon.codicon}.svg`);
        const codiconBuf = await renderIcon(codiconFile, '#cccccc', 0.35);
        if (codiconBuf) {
            const iconX = cellX + CELL_W - ICON_SLOT * 2 - 16;
            const iconY = cellY + (CELL_H - ICON_SLOT) / 2;
            composites.push({
                input: codiconBuf,
                top: Math.round(iconY * SCALE),
                left: Math.round(iconX * SCALE),
            });
        }

        const customFile = path.join(CUSTOM_DIR, `${icon.customSvg}.svg`);
        const customBuf = await renderIcon(customFile, '#cccccc');
        if (customBuf) {
            const iconX = cellX + CELL_W - ICON_SLOT - 10;
            const iconY = cellY + (CELL_H - ICON_SLOT) / 2;
            composites.push({
                input: customBuf,
                top: Math.round(iconY * SCALE),
                left: Math.round(iconX * SCALE),
            });
        }
    }

    const base = await sharp(headerSvg).png().toBuffer();
    await sharp(base)
        .composite(composites)
        .png()
        .toFile(OUTPUT_PATH);

    const stats = fs.statSync(OUTPUT_PATH);
    console.log(`Comparison image: ${OUTPUT_PATH} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
});
