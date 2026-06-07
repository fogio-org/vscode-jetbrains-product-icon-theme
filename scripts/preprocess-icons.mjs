#!/usr/bin/env node

/**
 * Preprocess JetBrains expui SVGs → monochrome 16×16 product icons.
 *
 * Handles: circle→path, rect→path, stroke→fill, color normalization.
 * Reads from assets/icons/original/*__*.svg, writes to assets/icons/prepared/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORIG_DIR = path.resolve(__dirname, '..', 'assets', 'icons', 'original');
const PREP_DIR = path.resolve(__dirname, '..', 'assets', 'icons', 'prepared');

// ─── Circle → Path ──────────────────────────────────────────────

function circleToPath(cx, cy, r) {
    return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
}

function circleToOutlinedPath(cx, cy, r, strokeWidth = 1) {
    const outer = r + strokeWidth / 2;
    const inner = r - strokeWidth / 2;
    const outerPath = `M${cx - outer},${cy}a${outer},${outer} 0 1,0 ${2 * outer},0a${outer},${outer} 0 1,0 ${-2 * outer},0Z`;
    const innerPath = `M${cx - inner},${cy}a${inner},${inner} 0 1,1 ${2 * inner},0a${inner},${inner} 0 1,1 ${-2 * inner},0Z`;
    return outerPath + innerPath;
}

function circleToFilledPath(cx, cy, r) {
    return circleToPath(cx, cy, r);
}

// ─── Rect → Path ────────────────────────────────────────────────

function rectToPath(x, y, w, h, rx = 0, ry = 0) {
    rx = rx || 0;
    ry = ry || rx;
    if (rx === 0 && ry === 0) {
        return `M${x},${y}h${w}v${h}h${-w}Z`;
    }
    return `M${x + rx},${y}h${w - 2 * rx}a${rx},${ry} 0 0 1 ${rx},${ry}v${h - 2 * ry}a${rx},${ry} 0 0 1 ${-rx},${ry}h${-(w - 2 * rx)}a${rx},${ry} 0 0 1 ${-rx},${-ry}v${-(h - 2 * ry)}a${rx},${ry} 0 0 1 ${rx},${-ry}Z`;
}

// ─── Stroke → Fill (polylines) ──────────────────────────────────

function parseSimplePath(d) {
    const points = [];
    const cmds = d.match(/[MLCQAZmlcqaz][^MLCQAZmlcqaz]*/g) || [];
    let cx = 0, cy = 0;
    for (const cmd of cmds) {
        const type = cmd[0];
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (type === 'M') { cx = nums[0]; cy = nums[1]; points.push({ x: cx, y: cy }); }
        else if (type === 'L') { cx = nums[0]; cy = nums[1]; points.push({ x: cx, y: cy }); }
        else if (type === 'l') { cx += nums[0]; cy += nums[1]; points.push({ x: cx, y: cy }); }
        else if (type === 'H') { cx = nums[0]; points.push({ x: cx, y: cy }); }
        else if (type === 'h') { cx += nums[0]; points.push({ x: cx, y: cy }); }
        else if (type === 'V') { cy = nums[0]; points.push({ x: cx, y: cy }); }
        else if (type === 'v') { cy += nums[0]; points.push({ x: cx, y: cy }); }
        else if (type === 'Z' || type === 'z') { /* close */ }
    }
    return points;
}

function offsetSegment(p1, p2, dist) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return [p1, p2];
    const nx = -dy / len * dist;
    const ny = dx / len * dist;
    return [
        { x: p1.x + nx, y: p1.y + ny },
        { x: p2.x + nx, y: p2.y + ny },
    ];
}

function roundCapPath(cx, cy, r) {
    return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
}

function strokePolylineToFill(points, strokeWidth, linecap = 'round', linejoin = 'round', closed = false) {
    const hw = strokeWidth / 2;
    if (points.length < 2) return '';

    const leftSide = [];
    const rightSide = [];

    for (let i = 0; i < points.length - 1; i++) {
        const [l1, l2] = offsetSegment(points[i], points[i + 1], hw);
        const [r1, r2] = offsetSegment(points[i], points[i + 1], -hw);
        leftSide.push([l1, l2]);
        rightSide.push([r1, r2]);
    }

    let d = '';

    // Build the outline path
    // Left side forward
    d += `M${fmt(leftSide[0][0].x)},${fmt(leftSide[0][0].y)}`;
    for (let i = 0; i < leftSide.length; i++) {
        if (i > 0 && linejoin === 'round') {
            const prev = leftSide[i - 1][1];
            const curr = leftSide[i][0];
            const center = points[i];
            const r = hw;
            d += arcBetween(prev, curr, center, r);
        }
        d += `L${fmt(leftSide[i][1].x)},${fmt(leftSide[i][1].y)}`;
    }

    // End cap
    if (!closed && linecap === 'round') {
        const last = points[points.length - 1];
        const endL = leftSide[leftSide.length - 1][1];
        const endR = rightSide[rightSide.length - 1][1];
        d += `A${fmt(hw)},${fmt(hw)} 0 0,1 ${fmt(endR.x)},${fmt(endR.y)}`;
    } else {
        const endR = rightSide[rightSide.length - 1][1];
        d += `L${fmt(endR.x)},${fmt(endR.y)}`;
    }

    // Right side backward
    for (let i = rightSide.length - 1; i >= 0; i--) {
        d += `L${fmt(rightSide[i][0].x)},${fmt(rightSide[i][0].y)}`;
        if (i > 0 && linejoin === 'round') {
            const curr = rightSide[i][0];
            const prev = rightSide[i - 1][1];
            const center = points[i];
            const r = hw;
            d += arcBetween(curr, prev, center, r);
        }
    }

    // Start cap
    if (!closed && linecap === 'round') {
        d += `A${fmt(hw)},${fmt(hw)} 0 0,1 ${fmt(leftSide[0][0].x)},${fmt(leftSide[0][0].y)}`;
    }

    d += 'Z';
    return d;
}

function arcBetween(from, to, center, r) {
    const a1 = Math.atan2(from.y - center.y, from.x - center.x);
    const a2 = Math.atan2(to.y - center.y, to.x - center.x);
    let sweep = a2 - a1;
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (sweep < -Math.PI) sweep += 2 * Math.PI;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    const sweepFlag = sweep > 0 ? 1 : 0;
    return `A${fmt(r)},${fmt(r)} 0 ${largeArc},${sweepFlag} ${fmt(to.x)},${fmt(to.y)}`;
}

function fmt(n) {
    return Math.round(n * 10000) / 10000;
}

// ─── SVG Processing ─────────────────────────────────────────────

function extractAttr(tag, name) {
    const re = new RegExp(`${name}="([^"]*)"`, 'i');
    const m = tag.match(re);
    return m ? m[1] : null;
}

function extractAttrNum(tag, name) {
    const val = extractAttr(tag, name);
    return val !== null ? parseFloat(val) : null;
}

function processCircleElement(tag, context) {
    const cx = extractAttrNum(tag, 'cx') || 0;
    const cy = extractAttrNum(tag, 'cy') || 0;
    const r = extractAttrNum(tag, 'r') || 0;
    const fill = extractAttr(tag, 'fill');
    const stroke = extractAttr(tag, 'stroke');
    const strokeWidth = extractAttrNum(tag, 'stroke-width') || 1;

    if (stroke && fill !== 'none' && fill) {
        // Filled + stroked circle → outlined circle (ring)
        return `<path d="${circleToOutlinedPath(cx, cy, r, strokeWidth)}" fill="#000000"/>`;
    } else if (stroke && (!fill || fill === 'none')) {
        // Stroke-only circle → outlined circle
        return `<path d="${circleToOutlinedPath(cx, cy, r, strokeWidth)}" fill="#000000"/>`;
    } else if (fill && fill !== 'none' && fill !== 'white' && fill !== '#FFFFFF' && fill !== '#ffffff') {
        if (context === 'background') {
            // Background circle → outlined
            return `<path d="${circleToOutlinedPath(cx, cy, r, 1)}" fill="#000000"/>`;
        }
        return `<path d="${circleToPath(cx, cy, r)}" fill="#000000"/>`;
    } else {
        return '';
    }
}

function processRectElement(tag) {
    const x = extractAttrNum(tag, 'x') || 0;
    const y = extractAttrNum(tag, 'y') || 0;
    const w = extractAttrNum(tag, 'width') || 0;
    const h = extractAttrNum(tag, 'height') || 0;
    const rx = extractAttrNum(tag, 'rx') || 0;
    const ry = extractAttrNum(tag, 'ry') || 0;
    const fill = extractAttr(tag, 'fill');
    const stroke = extractAttr(tag, 'stroke');

    if (fill === 'none' && !stroke) return '';
    if (fill === 'white' || fill === '#FFFFFF' || fill === '#ffffff') return '';

    return `<path d="${rectToPath(x, y, w, h, rx, ry)}" fill="#000000"/>`;
}

function processPathElement(tag) {
    const d = extractAttr(tag, 'd');
    if (!d) return '';

    const fill = extractAttr(tag, 'fill');
    const stroke = extractAttr(tag, 'stroke');
    const strokeWidth = extractAttrNum(tag, 'stroke-width') || 1;
    const linecap = extractAttr(tag, 'stroke-linecap') || 'butt';
    const linejoin = extractAttr(tag, 'stroke-linejoin') || 'miter';
    const fillRule = extractAttr(tag, 'fill-rule');

    // Skip white fills (typically for knockouts in colored icons)
    if (fill === 'white' || fill === '#FFFFFF' || fill === '#ffffff') {
        if (stroke) {
            // Has stroke on white fill → process stroke
        } else {
            // White fill, no stroke — it's a knockout in the original colored icon
            // For monochrome, we still need it as a cutout
            const attrs = fillRule ? ` fill-rule="${fillRule}" clip-rule="${fillRule}"` : '';
            return `<path d="${d}" fill="#000000"${attrs}/>`;
        }
    }

    if (stroke && (!fill || fill === 'none')) {
        // Stroke-only path → convert to filled outline
        const points = parseSimplePath(d);
        if (points.length >= 2) {
            const filledD = strokePolylineToFill(points, strokeWidth, linecap, linejoin);
            if (filledD) {
                return `<path d="${filledD}" fill="#000000"/>`;
            }
        }
        // Fallback: keep as-is with fill
        return `<path d="${d}" fill="#000000"/>`;
    }

    // Fill-based path
    const attrs = fillRule ? ` fill-rule="${fillRule}" clip-rule="${fillRule}"` : '';
    return `<path d="${d}" fill="#000000"${attrs}/>`;
}

function processSvg(content, iconName) {
    // Remove comments
    content = content.replace(/<!--[\s\S]*?-->/g, '');

    // Extract viewBox
    const vbMatch = content.match(/viewBox="([^"]*)"/);
    const viewBox = vbMatch ? vbMatch[1] : '0 0 16 16';

    // Collect all shape elements
    const elements = [];

    // Find circles
    const circleRe = /<circle\b[^/>]*\/?>(?:<\/circle>)?/g;
    let m;
    const circles = [];
    while ((m = circleRe.exec(content)) !== null) {
        circles.push(m[0]);
    }

    // Determine if first circle is a background (large, centered)
    const isSymbolIcon = iconName.startsWith('symbol-') ||
        iconName === 'error' || iconName === 'info' ||
        iconName === 'timeline-view-icon' || iconName === 'testing-skipped-icon' ||
        iconName === 'sort-precedence';

    for (let i = 0; i < circles.length; i++) {
        const ctx = (i === 0 && isSymbolIcon) ? 'background' : 'normal';
        const processed = processCircleElement(circles[i], ctx);
        if (processed) elements.push(processed);
    }

    // Find rects
    const rectRe = /<rect\b[^/>]*\/?>(?:<\/rect>)?/g;
    while ((m = rectRe.exec(content)) !== null) {
        const processed = processRectElement(m[0]);
        if (processed) elements.push(processed);
    }

    // Find paths
    const pathRe = /<path\b[^/>]*\/?>(?:<\/path>)?/g;
    while ((m = pathRe.exec(content)) !== null) {
        const processed = processPathElement(m[0]);
        if (processed) elements.push(processed);
    }

    return `<svg width="16" height="16" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${elements.join('\n')}\n</svg>\n`;
}

// ─── Main ───────────────────────────────────────────────────────

function main() {
    const files = fs.readdirSync(ORIG_DIR).filter(f => f.includes('__') && f.endsWith('.svg'));

    console.log(`Processing ${files.length} icons...\n`);

    let ok = 0, fail = 0;
    for (const file of files) {
        const iconName = file.split('__')[0];
        const content = fs.readFileSync(path.join(ORIG_DIR, file), 'utf-8');

        try {
            const processed = processSvg(content, iconName);
            const outPath = path.join(PREP_DIR, `${iconName}.svg`);
            fs.writeFileSync(outPath, processed);
            console.log(`  ✓ ${iconName}`);
            ok++;
        } catch (e) {
            console.error(`  ✗ ${iconName}: ${e.message}`);
            fail++;
        }
    }

    console.log(`\nDone: ${ok} processed, ${fail} failed.`);
}

main();
