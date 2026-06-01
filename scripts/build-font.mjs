#!/usr/bin/env node

import { SVGIcons2SVGFontStream } from 'svgicons2svgfont';
import svg2ttf from 'svg2ttf';
import ttf2woff2 from 'ttf2woff2';
import { SVGPathData, SVGPathDataTransformer as T } from 'svg-pathdata';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { FONT_NAME, ICONS, ALIASES } from './icons.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ICONS_DIR = path.resolve(__dirname, '..', 'assets', 'icons', 'prepared');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'producticons');

const FONT_HEIGHT = 1024;
const DESCENT = 0;

// ─── Evenodd → Nonzero Winding Conversion ───────────────────────

const M = SVGPathData.MOVE_TO;
const L = SVGPathData.LINE_TO;
const C = SVGPathData.CURVE_TO;
const Q = SVGPathData.QUAD_TO;
const Z = SVGPathData.CLOSE_PATH;

function preprocessSvg(svgContent) {
    return svgContent.replace(/<path\b[^>]*?\/?>/g, (match) => {
        if (!match.includes('fill-rule="evenodd"')) return match;

        const dMatch = match.match(/\bd="([^"]*)"/);
        if (!dMatch) return match;

        try {
            const fixedD = convertEvenOddToNonZero(dMatch[1]);
            return match
                .replace(`d="${dMatch[1]}"`, `d="${fixedD}"`)
                .replace(/\s*fill-rule="evenodd"/g, '')
                .replace(/\s*clip-rule="evenodd"/g, '');
        } catch (e) {
            console.warn(`    evenodd fix failed: ${e.message}`);
            return match;
        }
    });
}

function convertEvenOddToNonZero(d) {
    const pathData = new SVGPathData(d)
        .toAbs()
        .transform(T.NORMALIZE_HVZ())
        .transform(T.NORMALIZE_ST())
        .transform(T.A_TO_C());

    const subPaths = splitSubPaths(pathData.commands);
    if (subPaths.length <= 1) return new SVGPathData(pathData.commands).encode();

    const analyzed = subPaths.map((commands) => ({
        commands,
        area: signedArea(commands),
        bbox: boundingBox(commands),
    }));

    analyzed.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));

    for (let i = 0; i < analyzed.length; i++) {
        analyzed[i].depth = 0;
        for (let j = 0; j < i; j++) {
            if (bboxContains(analyzed[j].bbox, analyzed[i].bbox)) {
                analyzed[i].depth++;
            }
        }
    }

    for (const sp of analyzed) {
        const shouldBePositive = sp.depth % 2 === 0;
        if ((sp.area > 0) !== shouldBePositive) {
            sp.commands = reverseSubPath(sp.commands);
        }
    }

    return new SVGPathData(analyzed.flatMap((sp) => sp.commands)).encode();
}

function splitSubPaths(commands) {
    const result = [];
    let current = [];
    for (const cmd of commands) {
        if (cmd.type === M && current.length > 0) {
            result.push(current);
            current = [];
        }
        current.push(cmd);
    }
    if (current.length > 0) result.push(current);
    return result;
}

function commandsToPoints(commands) {
    const points = [];
    let cx = 0, cy = 0;
    for (const cmd of commands) {
        if (cmd.type === M || cmd.type === L) {
            cx = cmd.x; cy = cmd.y;
            points.push({ x: cx, y: cy });
        } else if (cmd.type === C) {
            const x0 = cx, y0 = cy;
            for (let i = 1; i <= 8; i++) {
                const t = i / 8, mt = 1 - t;
                points.push({
                    x: mt*mt*mt*x0 + 3*mt*mt*t*cmd.x1 + 3*mt*t*t*cmd.x2 + t*t*t*cmd.x,
                    y: mt*mt*mt*y0 + 3*mt*mt*t*cmd.y1 + 3*mt*t*t*cmd.y2 + t*t*t*cmd.y,
                });
            }
            cx = cmd.x; cy = cmd.y;
        } else if (cmd.type === Q) {
            const x0 = cx, y0 = cy;
            for (let i = 1; i <= 8; i++) {
                const t = i / 8, mt = 1 - t;
                points.push({
                    x: mt*mt*x0 + 2*mt*t*cmd.x1 + t*t*cmd.x,
                    y: mt*mt*y0 + 2*mt*t*cmd.y1 + t*t*cmd.y,
                });
            }
            cx = cmd.x; cy = cmd.y;
        }
    }
    return points;
}

function signedArea(commands) {
    const pts = commandsToPoints(commands);
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return area / 2;
}

function boundingBox(commands) {
    const pts = commandsToPoints(commands);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
}

function bboxContains(outer, inner) {
    const E = 0.01;
    return (
        outer.minX <= inner.minX + E && outer.minY <= inner.minY + E &&
        outer.maxX >= inner.maxX - E && outer.maxY >= inner.maxY - E
    );
}

function reverseSubPath(commands) {
    const segs = [];
    let cx = 0, cy = 0, startX = 0, startY = 0;

    for (const cmd of commands) {
        if (cmd.type === M) {
            cx = cmd.x; cy = cmd.y;
            startX = cx; startY = cy;
        } else if (cmd.type === L) {
            segs.push({ t: 'L', fx: cx, fy: cy, tx: cmd.x, ty: cmd.y });
            cx = cmd.x; cy = cmd.y;
        } else if (cmd.type === C) {
            segs.push({
                t: 'C', fx: cx, fy: cy,
                x1: cmd.x1, y1: cmd.y1, x2: cmd.x2, y2: cmd.y2,
                tx: cmd.x, ty: cmd.y,
            });
            cx = cmd.x; cy = cmd.y;
        } else if (cmd.type === Q) {
            segs.push({
                t: 'Q', fx: cx, fy: cy,
                x1: cmd.x1, y1: cmd.y1,
                tx: cmd.x, ty: cmd.y,
            });
            cx = cmd.x; cy = cmd.y;
        } else if (cmd.type === Z) {
            if (Math.abs(cx - startX) > 0.001 || Math.abs(cy - startY) > 0.001) {
                segs.push({ t: 'L', fx: cx, fy: cy, tx: startX, ty: startY });
            }
        }
    }

    if (!segs.length) return commands;
    segs.reverse();

    const out = [{ type: M, x: segs[0].tx, y: segs[0].ty }];
    for (const s of segs) {
        if (s.t === 'L') {
            out.push({ type: L, x: s.fx, y: s.fy });
        } else if (s.t === 'C') {
            out.push({ type: C, x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1, x: s.fx, y: s.fy });
        } else if (s.t === 'Q') {
            out.push({ type: Q, x1: s.x1, y1: s.y1, x: s.fx, y: s.fy });
        }
    }
    out.push({ type: Z });
    return out;
}

// ─── Font Build Pipeline ─────────────────────────────────────────

async function main() {
    console.log(`Building ${FONT_NAME}...\n`);

    const missing = ICONS.filter(
        (i) => !fs.existsSync(path.join(ICONS_DIR, `${i.name}.svg`))
    );
    if (missing.length) {
        console.warn('Missing SVGs (skipped):');
        missing.forEach((i) => console.warn(`  - ${i.name}.svg`));
        console.warn();
    }

    const icons = ICONS.filter((i) =>
        fs.existsSync(path.join(ICONS_DIR, `${i.name}.svg`))
    );

    const svgFont = await buildSvgFont(icons);
    console.log(`  SVG font generated (${icons.length} glyphs)`);

    const ttf = svg2ttf(svgFont, {
        copyright: 'JetBrains s.r.o., Apache 2.0 License',
        version: '1.0',
    });
    const ttfBuffer = Buffer.from(ttf.buffer);
    console.log(`  TTF converted (${(ttfBuffer.length / 1024).toFixed(1)} KB)`);

    const woff2Buffer = ttf2woff2(ttfBuffer);
    console.log(`  WOFF2 compressed (${(woff2Buffer.length / 1024).toFixed(1)} KB)`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const woff2Path = path.join(OUTPUT_DIR, `${FONT_NAME}.woff2`);
    fs.writeFileSync(woff2Path, woff2Buffer);

    const manifest = buildManifest(icons);
    const manifestPath = path.join(OUTPUT_DIR, `${FONT_NAME}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

    console.log(
        `\nDone: ${icons.length} glyphs in font, ${Object.keys(manifest.iconDefinitions).length} in manifest.`
    );
}

function buildSvgFont(icons) {
    return new Promise((resolve, reject) => {
        let svgFont = '';
        const fontStream = new SVGIcons2SVGFontStream({
            fontName: FONT_NAME,
            fontHeight: FONT_HEIGHT,
            descent: DESCENT,
            normalize: false,
            centerHorizontally: true,
            log: () => {},
        });

        fontStream.on('data', (chunk) => { svgFont += chunk; });
        fontStream.on('end', () => resolve(svgFont));
        fontStream.on('error', reject);

        for (const icon of icons) {
            const svgPath = path.join(ICONS_DIR, `${icon.name}.svg`);
            let content = fs.readFileSync(svgPath, 'utf-8');

            if (content.includes('fill-rule="evenodd"')) {
                content = preprocessSvg(content);
                console.log(`  Fixed evenodd: ${icon.name}`);
            }

            const glyph = Readable.from(Buffer.from(content));
            glyph.metadata = {
                name: icon.name,
                unicode: [String.fromCodePoint(icon.codepoint)],
            };
            fontStream.write(glyph);
        }

        fontStream.end();
    });
}

function buildManifest(icons) {
    const iconDefinitions = {};

    for (const icon of icons) {
        iconDefinitions[icon.name] = {
            fontCharacter: `\\${icon.codepoint.toString(16)}`,
            fontId: FONT_NAME,
        };
    }

    for (const alias of ALIASES) {
        const target = icons.find((i) => i.name === alias.target);
        if (target) {
            iconDefinitions[alias.name] = {
                fontCharacter: `\\${target.codepoint.toString(16)}`,
                fontId: FONT_NAME,
            };
        }
    }

    return {
        fonts: [
            {
                id: FONT_NAME,
                src: [
                    {
                        path: `./${FONT_NAME}.woff2`,
                        format: 'woff2',
                    },
                ],
                style: 'normal',
                weight: 'normal',
            },
        ],
        iconDefinitions,
    };
}

main().catch((err) => {
    console.error('\nBuild failed:', err.message);
    process.exit(1);
});
