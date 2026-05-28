#!/usr/bin/env python3
"""
Prepare JetBrains original SVGs for font pipeline.

Reads from assets/icons/original/ (raw JetBrains filenames)
Writes to assets/icons/prepared/ (VS Code product icon IDs)

For fill-based elements: normalize fill to #000000
For stroke-based elements: expand stroke to filled path using skia-pathops
"""

import os
import re
import math
import pathops
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
ORIGINAL_DIR = os.path.join(ROOT_DIR, 'assets', 'icons', 'original')
PREPARED_DIR = os.path.join(ROOT_DIR, 'assets', 'icons', 'prepared')

NS = {'svg': 'http://www.w3.org/2000/svg'}
ET.register_namespace('', 'http://www.w3.org/2000/svg')

# Background/interior fill colors in multi-color JetBrains icons.
# These layers overlap with outline paths and must be skipped for monochrome.
# #43454A = dark background/shadow fill behind outlines
# #F2FCF3 = light interior fill inside green outlines (run_debug, run_rerun)
SKIP_FILL_COLORS = {'#43454a', '#f2fcf3'}

# Mapping: original filename (without .svg) -> prepared filename (without .svg)
NAME_MAP = {
    # General UI
    'close': 'close',
    'chevronDown': 'chevron-down',
    'chevronRight': 'chevron-right',
    'chevronUp': 'chevron-up',
    'collapseAll': 'collapse-all',
    'expandAll': 'expand-all',
    'delete': 'trash',
    'edit': 'edit',
    'add': 'add',
    'copy': 'copy',
    'history': 'history',
    'download': 'cloud-download',
    'export': 'export',
    'refresh': 'refresh',
    'actions_toggleVisibility': 'eye',
    'tw_bookmarks': 'bookmark',

    # Search
    'regex': 'regex',
    'matchCase': 'case-sensitive',
    'exactWords': 'whole-word',
    'preserveCase': 'preserve-case',
    'actions_replace': 'replace',

    # Run & Debug
    'run_debug': 'debug',
    'run_pause': 'debug-pause',
    'run_stop': 'debug-stop',
    'run_resume': 'debug-continue',
    'run_stepOver': 'debug-step-over',
    'run_stepInto': 'debug-step-into',
    'run_stepOut': 'debug-step-out',
    'run_restart': 'debug-restart',
    'run_killProcess': 'debug-disconnect',
    'run_rerun': 'debug-rerun',
    'run_run': 'play',
    'tw_debug': 'debug-console',

    # VCS
    'vcs_diff': 'diff',
    'vcs_shelve': 'git-stash',
    'vcs_unshelve': 'git-stash-apply',

    # Panels & Views
    'tw_messages': 'output',
    'tw_notifications': 'bell',
    'tw_problems': 'warning',
    'tw_services': 'server-process',
    'actions_preview': 'open-preview',

    # Original icons (already have correct names)
    'explorer-view-icon': 'explorer-view-icon',
    'extensions': 'extensions',
    'files': 'files',
    'search': 'search',
    'settings-gear': 'settings-gear',
    'terminal': 'terminal',
    'account': 'account',
    'filter': 'filter',
    'git-pull-request': 'git-pull-request',
    'remote-explorer': 'remote-explorer',
    'split-horizontal': 'split-horizontal',
    'split-vertical': 'split-vertical',
    'git-branch': 'git-branch',
    'git-commit': 'git-commit',
    'git-fetch': 'git-fetch',
    'git-compare': 'git-compare',
    'git-merge': 'git-merge',
    'run-view-icon': 'run-view-icon',
    'new-file': 'new-file',
    'new-folder': 'new-folder',
}


def parse_number(s):
    """Parse a number from string, handling various formats."""
    s = s.strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_svg_path_d(d):
    """Parse SVG path 'd' attribute into a list of commands."""
    # Tokenize
    tokens = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)

    commands = []
    i = 0
    current_cmd = None

    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            current_cmd = t
            i += 1
        else:
            # Implicit command: repeat last, or L after M
            if current_cmd is None:
                break
            pass

        if current_cmd in ('M', 'm'):
            x, y = float(tokens[i]), float(tokens[i+1])
            commands.append((current_cmd, [x, y]))
            i += 2
            # After M, implicit becomes L; after m, implicit becomes l
            current_cmd = 'L' if current_cmd == 'M' else 'l'
        elif current_cmd in ('L', 'l'):
            x, y = float(tokens[i]), float(tokens[i+1])
            commands.append((current_cmd, [x, y]))
            i += 2
        elif current_cmd in ('H', 'h'):
            x = float(tokens[i])
            commands.append((current_cmd, [x]))
            i += 1
        elif current_cmd in ('V', 'v'):
            y = float(tokens[i])
            commands.append((current_cmd, [y]))
            i += 1
        elif current_cmd in ('C', 'c'):
            coords = [float(tokens[i+j]) for j in range(6)]
            commands.append((current_cmd, coords))
            i += 6
        elif current_cmd in ('S', 's'):
            coords = [float(tokens[i+j]) for j in range(4)]
            commands.append((current_cmd, coords))
            i += 4
        elif current_cmd in ('Q', 'q'):
            coords = [float(tokens[i+j]) for j in range(4)]
            commands.append((current_cmd, coords))
            i += 4
        elif current_cmd in ('T', 't'):
            coords = [float(tokens[i+j]) for j in range(2)]
            commands.append((current_cmd, coords))
            i += 2
        elif current_cmd in ('A', 'a'):
            coords = [float(tokens[i+j]) for j in range(7)]
            commands.append((current_cmd, coords))
            i += 7
        elif current_cmd in ('Z', 'z'):
            commands.append((current_cmd, []))
        else:
            i += 1

    return commands


def svg_commands_to_absolute(commands):
    """Convert all relative SVG commands to absolute."""
    abs_cmds = []
    cx, cy = 0, 0
    sx, sy = 0, 0  # subpath start

    for cmd, args in commands:
        if cmd == 'M':
            cx, cy = args[0], args[1]
            sx, sy = cx, cy
            abs_cmds.append(('M', [cx, cy]))
        elif cmd == 'm':
            cx += args[0]
            cy += args[1]
            sx, sy = cx, cy
            abs_cmds.append(('M', [cx, cy]))
        elif cmd == 'L':
            cx, cy = args[0], args[1]
            abs_cmds.append(('L', [cx, cy]))
        elif cmd == 'l':
            cx += args[0]
            cy += args[1]
            abs_cmds.append(('L', [cx, cy]))
        elif cmd == 'H':
            cx = args[0]
            abs_cmds.append(('L', [cx, cy]))
        elif cmd == 'h':
            cx += args[0]
            abs_cmds.append(('L', [cx, cy]))
        elif cmd == 'V':
            cy = args[0]
            abs_cmds.append(('L', [cx, cy]))
        elif cmd == 'v':
            cy += args[0]
            abs_cmds.append(('L', [cx, cy]))
        elif cmd == 'C':
            abs_cmds.append(('C', list(args)))
            cx, cy = args[4], args[5]
        elif cmd == 'c':
            abs_args = [
                cx + args[0], cy + args[1],
                cx + args[2], cy + args[3],
                cx + args[4], cy + args[5],
            ]
            abs_cmds.append(('C', abs_args))
            cx, cy = abs_args[4], abs_args[5]
        elif cmd == 'S':
            abs_cmds.append(('S', list(args)))
            cx, cy = args[2], args[3]
        elif cmd == 's':
            abs_args = [
                cx + args[0], cy + args[1],
                cx + args[2], cy + args[3],
            ]
            abs_cmds.append(('S', abs_args))
            cx, cy = abs_args[2], abs_args[3]
        elif cmd == 'Q':
            abs_cmds.append(('Q', list(args)))
            cx, cy = args[2], args[3]
        elif cmd == 'q':
            abs_args = [
                cx + args[0], cy + args[1],
                cx + args[2], cy + args[3],
            ]
            abs_cmds.append(('Q', abs_args))
            cx, cy = abs_args[2], abs_args[3]
        elif cmd == 'T':
            abs_cmds.append(('T', list(args)))
            cx, cy = args[0], args[1]
        elif cmd == 't':
            abs_args = [cx + args[0], cy + args[1]]
            abs_cmds.append(('T', abs_args))
            cx, cy = abs_args[0], abs_args[1]
        elif cmd == 'A':
            abs_cmds.append(('A', list(args)))
            cx, cy = args[5], args[6]
        elif cmd == 'a':
            abs_args = list(args)
            abs_args[5] = cx + args[5]
            abs_args[6] = cy + args[6]
            abs_cmds.append(('A', abs_args))
            cx, cy = abs_args[5], abs_args[6]
        elif cmd in ('Z', 'z'):
            abs_cmds.append(('Z', []))
            cx, cy = sx, sy

    return abs_cmds


def resolve_smooth_curves(commands):
    """Resolve S and T commands to full C and Q commands."""
    result = []
    prev_cmd = None
    prev_ctrl = None  # last control point for smooth continuation

    for cmd, args in commands:
        if cmd == 'S':
            # Smooth cubic: reflect previous C's second control point
            if prev_cmd == 'C' and prev_ctrl is not None:
                x1 = 2 * result[-1][1][-2] - prev_ctrl[0]
                y1 = 2 * result[-1][1][-1] - prev_ctrl[1]
            else:
                x1 = result[-1][1][-2] if result else 0
                y1 = result[-1][1][-1] if result else 0
            result.append(('C', [x1, y1, args[0], args[1], args[2], args[3]]))
            prev_ctrl = (args[0], args[1])
            prev_cmd = 'C'
        elif cmd == 'T':
            # Smooth quad: reflect previous Q's control point
            if prev_cmd == 'Q' and prev_ctrl is not None:
                x1 = 2 * result[-1][1][-2] - prev_ctrl[0]
                y1 = 2 * result[-1][1][-1] - prev_ctrl[1]
            else:
                x1 = result[-1][1][-2] if result else 0
                y1 = result[-1][1][-1] if result else 0
            result.append(('Q', [x1, y1, args[0], args[1]]))
            prev_ctrl = (x1, y1)
            prev_cmd = 'Q'
        elif cmd == 'C':
            result.append((cmd, args))
            prev_ctrl = (args[2], args[3])  # second control point
            prev_cmd = 'C'
        elif cmd == 'Q':
            result.append((cmd, args))
            prev_ctrl = (args[0], args[1])
            prev_cmd = 'Q'
        else:
            result.append((cmd, args))
            prev_ctrl = None
            prev_cmd = cmd

    return result


def arc_to_cubics(cx, cy, rx, ry, x_rotation, large_arc, sweep, ex, ey):
    """Convert SVG arc to cubic bezier curves. Returns list of (C, [x1,y1,x2,y2,x,y])."""
    if rx == 0 or ry == 0:
        return [('L', [ex, ey])]

    rx, ry = abs(rx), abs(ry)
    phi = math.radians(x_rotation)
    cos_phi = math.cos(phi)
    sin_phi = math.sin(phi)

    # Step 1: Compute (x1', y1')
    dx = (cx - ex) / 2
    dy = (cy - ey) / 2
    x1p = cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy

    # Step 2: Compute (cx', cy')
    x1p2, y1p2 = x1p * x1p, y1p * y1p
    rx2, ry2 = rx * rx, ry * ry

    # Ensure radii are large enough
    lam = x1p2 / rx2 + y1p2 / ry2
    if lam > 1:
        s = math.sqrt(lam)
        rx *= s
        ry *= s
        rx2 = rx * rx
        ry2 = ry * ry

    num = max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2)
    den = rx2 * y1p2 + ry2 * x1p2
    sq = math.sqrt(num / den) if den > 0 else 0
    if large_arc == sweep:
        sq = -sq
    cxp = sq * rx * y1p / ry
    cyp = -sq * ry * x1p / rx

    # Step 3: Compute (cx, cy) from (cx', cy')
    ccx = cos_phi * cxp - sin_phi * cyp + (cx + ex) / 2
    ccy = sin_phi * cxp + cos_phi * cyp + (cy + ey) / 2

    # Step 4: Compute theta1 and dtheta
    def angle(ux, uy, vx, vy):
        dot = ux * vx + uy * vy
        cross = ux * vy - uy * vx
        n = math.sqrt((ux*ux + uy*uy) * (vx*vx + vy*vy))
        if n == 0:
            return 0
        c = max(-1, min(1, dot / n))
        a = math.acos(c)
        if cross < 0:
            a = -a
        return a

    theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dtheta = angle(
        (x1p - cxp) / rx, (y1p - cyp) / ry,
        (-x1p - cxp) / rx, (-y1p - cyp) / ry,
    )

    if not sweep and dtheta > 0:
        dtheta -= 2 * math.pi
    elif sweep and dtheta < 0:
        dtheta += 2 * math.pi

    # Split into segments (max 90 degrees each)
    n_segs = max(1, int(math.ceil(abs(dtheta) / (math.pi / 2))))
    d_per = dtheta / n_segs

    result = []
    alpha = 4.0 * math.tan(d_per / 4) / 3.0

    cos_theta = math.cos(theta1)
    sin_theta = math.sin(theta1)

    for _ in range(n_segs):
        cos_theta2 = math.cos(theta1 + d_per)
        sin_theta2 = math.sin(theta1 + d_per)

        # Endpoint of arc segment on unit circle
        ep1x = cos_theta
        ep1y = sin_theta
        ep2x = cos_theta2
        ep2y = sin_theta2

        # Control points on unit circle
        q1x = ep1x - alpha * ep1y
        q1y = ep1y + alpha * ep1x
        q2x = ep2x + alpha * ep2y
        q2y = ep2y - alpha * ep2x

        # Transform back
        def transform(px, py):
            x = cos_phi * rx * px - sin_phi * ry * py + ccx
            y = sin_phi * rx * px + cos_phi * ry * py + ccy
            return x, y

        cp1x, cp1y = transform(q1x, q1y)
        cp2x, cp2y = transform(q2x, q2y)
        epx, epy = transform(ep2x, ep2y)

        result.append(('C', [cp1x, cp1y, cp2x, cp2y, epx, epy]))

        theta1 += d_per
        cos_theta = cos_theta2
        sin_theta = sin_theta2

    return result


def add_commands_to_pathops(p, commands):
    """Add parsed SVG commands to a pathops.Path."""
    cx, cy = 0, 0

    for cmd, args in commands:
        if cmd == 'M':
            p.moveTo(args[0], args[1])
            cx, cy = args[0], args[1]
        elif cmd == 'L':
            p.lineTo(args[0], args[1])
            cx, cy = args[0], args[1]
        elif cmd == 'C':
            p.cubicTo(args[0], args[1], args[2], args[3], args[4], args[5])
            cx, cy = args[4], args[5]
        elif cmd == 'Q':
            p.quadTo(args[0], args[1], args[2], args[3])
            cx, cy = args[2], args[3]
        elif cmd == 'A':
            # Convert arc to cubics first
            rx, ry = args[0], args[1]
            x_rot = args[2]
            large_arc = int(args[3])
            sweep = int(args[4])
            ex, ey = args[5], args[6]
            cubics = arc_to_cubics(cx, cy, rx, ry, x_rot, large_arc, sweep, ex, ey)
            for c_cmd, c_args in cubics:
                if c_cmd == 'L':
                    p.lineTo(c_args[0], c_args[1])
                elif c_cmd == 'C':
                    p.cubicTo(c_args[0], c_args[1], c_args[2], c_args[3], c_args[4], c_args[5])
            cx, cy = ex, ey
        elif cmd == 'Z':
            p.close()


def pathops_to_svg_d(p, precision=4):
    """Convert a pathops.Path to SVG 'd' attribute string."""
    # Convert conics to quads for SVG compatibility
    p.convertConicsToQuads(0.1)

    parts = []
    fmt = f'{{:.{precision}f}}'

    for verb, pts in p:
        if verb == 0:  # MOVE
            parts.append(f'M{fmt.format(pts[0][0])},{fmt.format(pts[0][1])}')
        elif verb == 1:  # LINE
            parts.append(f'L{fmt.format(pts[0][0])},{fmt.format(pts[0][1])}')
        elif verb == 2:  # QUAD
            parts.append(f'Q{fmt.format(pts[0][0])},{fmt.format(pts[0][1])} {fmt.format(pts[1][0])},{fmt.format(pts[1][1])}')
        elif verb == 4:  # CUBIC
            parts.append(f'C{fmt.format(pts[0][0])},{fmt.format(pts[0][1])} {fmt.format(pts[1][0])},{fmt.format(pts[1][1])} {fmt.format(pts[2][0])},{fmt.format(pts[2][1])}')
        elif verb == 5:  # CLOSE
            parts.append('Z')

    return ' '.join(parts)


def rect_to_path_commands(x, y, w, h, rx=0, ry=0):
    """Convert SVG <rect> to path commands."""
    rx = min(rx, w / 2)
    ry = min(ry, h / 2)
    if rx == 0 and ry == 0:
        return [
            ('M', [x, y]),
            ('L', [x + w, y]),
            ('L', [x + w, y + h]),
            ('L', [x, y + h]),
            ('Z', []),
        ]
    # Rounded rectangle
    return [
        ('M', [x + rx, y]),
        ('L', [x + w - rx, y]),
        ('A', [rx, ry, 0, 0, 1, x + w, y + ry]),
        ('L', [x + w, y + h - ry]),
        ('A', [rx, ry, 0, 0, 1, x + w - rx, y + h]),
        ('L', [x + rx, y + h]),
        ('A', [rx, ry, 0, 0, 1, x, y + h - ry]),
        ('L', [x, y + ry]),
        ('A', [rx, ry, 0, 0, 1, x + rx, y]),
        ('Z', []),
    ]


def circle_to_path_commands(ccx, ccy, r):
    """Convert SVG <circle> to path commands using 4 arcs."""
    return [
        ('M', [ccx + r, ccy]),
        ('A', [r, r, 0, 0, 1, ccx, ccy + r]),
        ('A', [r, r, 0, 0, 1, ccx - r, ccy]),
        ('A', [r, r, 0, 0, 1, ccx, ccy - r]),
        ('A', [r, r, 0, 0, 1, ccx + r, ccy]),
        ('Z', []),
    ]


def ellipse_to_path_commands(ccx, ccy, rx, ry):
    """Convert SVG <ellipse> to path commands."""
    return [
        ('M', [ccx + rx, ccy]),
        ('A', [rx, ry, 0, 0, 1, ccx, ccy + ry]),
        ('A', [rx, ry, 0, 0, 1, ccx - rx, ccy]),
        ('A', [rx, ry, 0, 0, 1, ccx, ccy - ry]),
        ('A', [rx, ry, 0, 0, 1, ccx + rx, ccy]),
        ('Z', []),
    ]


def get_linecap(elem):
    """Get stroke-linecap from element."""
    cap = elem.get('stroke-linecap', 'butt')
    style = elem.get('style', '')
    m = re.search(r'stroke-linecap:\s*(\w+)', style)
    if m:
        cap = m.group(1)
    if cap == 'round':
        return pathops.LineCap.ROUND_CAP
    elif cap == 'square':
        return pathops.LineCap.SQUARE_CAP
    return pathops.LineCap.BUTT_CAP


def get_linejoin(elem):
    """Get stroke-linejoin from element."""
    join = elem.get('stroke-linejoin', 'miter')
    style = elem.get('style', '')
    m = re.search(r'stroke-linejoin:\s*(\w+)', style)
    if m:
        join = m.group(1)
    if join == 'round':
        return pathops.LineJoin.ROUND_JOIN
    elif join == 'bevel':
        return pathops.LineJoin.BEVEL_JOIN
    return pathops.LineJoin.MITER_JOIN


def get_stroke_width(elem):
    """Get stroke width from element."""
    sw = elem.get('stroke-width', '1')
    style = elem.get('style', '')
    m = re.search(r'stroke-width:\s*([\d.]+)', style)
    if m:
        sw = m.group(1)
    return float(sw)


def get_miter_limit(elem):
    """Get stroke-miterlimit."""
    ml = elem.get('stroke-miterlimit', '4')
    return float(ml)


def has_stroke(elem):
    """Check if element has a visible stroke."""
    stroke = elem.get('stroke', '')
    if not stroke or stroke == 'none':
        return False
    return True


def has_fill(elem):
    """Check if element has a visible fill."""
    fill = elem.get('fill', '')
    if fill == 'none':
        return False
    if fill:
        # Explicit fill set (and it's not 'none')
        return True
    # No explicit fill — check inherited fill
    inherited = elem.get('_inherited_fill', '')
    if inherited == 'none':
        return False
    # Default fill is black (visible)
    return True


def element_to_commands(elem):
    """Convert any SVG element to path commands."""
    tag = elem.tag.replace(f'{{{NS["svg"]}}}', '')

    if tag == 'path':
        d = elem.get('d', '')
        if not d:
            return []
        cmds = parse_svg_path_d(d)
        cmds = svg_commands_to_absolute(cmds)
        cmds = resolve_smooth_curves(cmds)
        return cmds

    elif tag == 'rect':
        x = float(elem.get('x', '0'))
        y = float(elem.get('y', '0'))
        w = float(elem.get('width', '0'))
        h = float(elem.get('height', '0'))
        rx = float(elem.get('rx', '0'))
        ry = float(elem.get('ry', '0'))
        if rx and not ry:
            ry = rx
        if ry and not rx:
            rx = ry
        return rect_to_path_commands(x, y, w, h, rx, ry)

    elif tag == 'circle':
        ccx = float(elem.get('cx', '0'))
        ccy = float(elem.get('cy', '0'))
        r = float(elem.get('r', '0'))
        return circle_to_path_commands(ccx, ccy, r)

    elif tag == 'ellipse':
        ccx = float(elem.get('cx', '0'))
        ccy = float(elem.get('cy', '0'))
        rx = float(elem.get('rx', '0'))
        ry = float(elem.get('ry', '0'))
        return ellipse_to_path_commands(ccx, ccy, rx, ry)

    elif tag == 'line':
        x1 = float(elem.get('x1', '0'))
        y1 = float(elem.get('y1', '0'))
        x2 = float(elem.get('x2', '0'))
        y2 = float(elem.get('y2', '0'))
        return [('M', [x1, y1]), ('L', [x2, y2])]

    elif tag == 'polyline':
        points = elem.get('points', '')
        nums = [float(x) for x in re.findall(r'[-+]?(?:\d+\.?\d*|\.\d+)', points)]
        if len(nums) < 4:
            return []
        cmds = [('M', [nums[0], nums[1]])]
        for i in range(2, len(nums) - 1, 2):
            cmds.append(('L', [nums[i], nums[i+1]]))
        return cmds

    elif tag == 'polygon':
        points = elem.get('points', '')
        nums = [float(x) for x in re.findall(r'[-+]?(?:\d+\.?\d*|\.\d+)', points)]
        if len(nums) < 4:
            return []
        cmds = [('M', [nums[0], nums[1]])]
        for i in range(2, len(nums) - 1, 2):
            cmds.append(('L', [nums[i], nums[i+1]]))
        cmds.append(('Z', []))
        return cmds

    return []


def stroke_to_fill(commands, stroke_width, linecap, linejoin, miter_limit):
    """Convert stroked path to filled path using skia-pathops."""
    p = pathops.Path()
    add_commands_to_pathops(p, commands)
    p.stroke(stroke_width, linecap, linejoin, miter_limit)
    return p


def split_into_subpaths(commands):
    """Split a list of commands into subpaths (each starting with M)."""
    subpaths = []
    current = []
    for cmd, args in commands:
        if cmd == 'M' and current:
            subpaths.append(current)
            current = []
        current.append((cmd, args))
    if current:
        subpaths.append(current)
    return subpaths


def commands_signed_area(commands):
    """Compute signed area of a subpath. Positive = CW in SVG coords."""
    points = []
    cx, cy = 0, 0
    for cmd, args in commands:
        if cmd == 'M':
            cx, cy = args[0], args[1]
            points.append((cx, cy))
        elif cmd == 'L':
            cx, cy = args[0], args[1]
            points.append((cx, cy))
        elif cmd == 'C':
            # Sample cubic at intervals for area approximation
            x0, y0 = cx, cy
            for i in range(1, 9):
                t = i / 8
                mt = 1 - t
                px = mt**3*x0 + 3*mt**2*t*args[0] + 3*mt*t**2*args[2] + t**3*args[4]
                py = mt**3*y0 + 3*mt**2*t*args[1] + 3*mt*t**2*args[3] + t**3*args[5]
                points.append((px, py))
            cx, cy = args[4], args[5]
        elif cmd == 'Q':
            x0, y0 = cx, cy
            for i in range(1, 9):
                t = i / 8
                mt = 1 - t
                px = mt**2*x0 + 2*mt*t*args[0] + t**2*args[2]
                py = mt**2*y0 + 2*mt*t*args[1] + t**2*args[3]
                points.append((px, py))
            cx, cy = args[2], args[3]
        elif cmd == 'A':
            # Convert arc to endpoint for area (simplified)
            cx, cy = args[5], args[6]
            points.append((cx, cy))

    area = 0
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1] - points[j][0] * points[i][1]
    return area / 2


def commands_bbox(commands):
    """Compute bounding box of a subpath."""
    points = []
    cx, cy = 0, 0
    for cmd, args in commands:
        if cmd == 'M':
            cx, cy = args[0], args[1]
            points.append((cx, cy))
        elif cmd == 'L':
            cx, cy = args[0], args[1]
            points.append((cx, cy))
        elif cmd == 'C':
            points.append((args[0], args[1]))
            points.append((args[2], args[3]))
            cx, cy = args[4], args[5]
            points.append((cx, cy))
        elif cmd == 'Q':
            points.append((args[0], args[1]))
            cx, cy = args[2], args[3]
            points.append((cx, cy))
        elif cmd == 'A':
            cx, cy = args[5], args[6]
            points.append((cx, cy))

    if not points:
        return (0, 0, 0, 0)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return (min(xs), min(ys), max(xs), max(ys))


def bbox_contains(outer, inner):
    """Check if outer bbox contains inner bbox."""
    E = 0.01
    return (outer[0] <= inner[0] + E and outer[1] <= inner[1] + E and
            outer[2] >= inner[2] - E and outer[3] >= inner[3] - E)


def reverse_subpath_commands(commands):
    """Reverse winding direction of a subpath."""
    segs = []
    cx, cy = 0, 0
    sx, sy = 0, 0

    for cmd, args in commands:
        if cmd == 'M':
            cx, cy = args[0], args[1]
            sx, sy = cx, cy
        elif cmd == 'L':
            segs.append(('L', cx, cy, args[0], args[1]))
            cx, cy = args[0], args[1]
        elif cmd == 'C':
            segs.append(('C', cx, cy, args[0], args[1], args[2], args[3], args[4], args[5]))
            cx, cy = args[4], args[5]
        elif cmd == 'Q':
            segs.append(('Q', cx, cy, args[0], args[1], args[2], args[3]))
            cx, cy = args[2], args[3]
        elif cmd == 'A':
            segs.append(('A', cx, cy, args[0], args[1], args[2], args[3], args[4], args[5], args[6]))
            cx, cy = args[5], args[6]
        elif cmd == 'Z':
            if abs(cx - sx) > 0.001 or abs(cy - sy) > 0.001:
                segs.append(('L', cx, cy, sx, sy))

    if not segs:
        return commands

    segs.reverse()
    # Start from what was the last point
    result = [('M', [segs[0][3] if segs[0][0] == 'L' else
                     segs[0][7] if segs[0][0] == 'C' else
                     segs[0][5] if segs[0][0] == 'Q' else
                     segs[0][8],
                     segs[0][4] if segs[0][0] == 'L' else
                     segs[0][8] if segs[0][0] == 'C' else
                     segs[0][6] if segs[0][0] == 'Q' else
                     segs[0][9]])]

    for s in segs:
        if s[0] == 'L':
            result.append(('L', [s[1], s[2]]))
        elif s[0] == 'C':
            # Reverse cubic: swap control points
            result.append(('C', [s[5], s[6], s[3], s[4], s[1], s[2]]))
        elif s[0] == 'Q':
            result.append(('Q', [s[3], s[4], s[1], s[2]]))
        elif s[0] == 'A':
            # Reverse arc: flip sweep flag
            result.append(('A', [s[3], s[4], s[5], s[6], 1 - s[7], s[1], s[2]]))

    result.append(('Z', []))
    return result


def convert_evenodd_to_nonzero(commands):
    """Convert evenodd fill-rule paths to nonzero by fixing winding directions.

    Algorithm (same as build-font.mjs):
    1. Split into subpaths
    2. Sort by area (largest first)
    3. Determine nesting depth based on bbox containment
    4. Even depth = outer (CW), odd depth = hole (CCW)
    5. Reverse subpaths with wrong winding
    """
    subpaths = split_into_subpaths(commands)
    if len(subpaths) <= 1:
        return commands  # Single subpath — no holes possible

    analyzed = []
    for sp in subpaths:
        area = commands_signed_area(sp)
        bbox = commands_bbox(sp)
        analyzed.append({'commands': sp, 'area': area, 'bbox': bbox, 'depth': 0})

    # Sort by absolute area (largest first)
    analyzed.sort(key=lambda x: -abs(x['area']))

    # Determine nesting depth
    for i in range(len(analyzed)):
        analyzed[i]['depth'] = 0
        for j in range(i):
            if bbox_contains(analyzed[j]['bbox'], analyzed[i]['bbox']):
                analyzed[i]['depth'] += 1

    # Fix winding directions
    for sp in analyzed:
        should_be_cw = (sp['depth'] % 2 == 0)  # Even depth = outer (CW)
        is_cw = (sp['area'] > 0)
        if is_cw != should_be_cw:
            sp['commands'] = reverse_subpath_commands(sp['commands'])

    # Reconstruct commands
    result = []
    for sp in analyzed:
        result.extend(sp['commands'])
    return result


def fill_path(commands, fill_rule='nonzero'):
    """Create a pathops.Path from fill commands.

    NOTE: We do NOT convert evenodd→nonzero here anymore.
    Instead, the output SVG uses fill-rule="evenodd" and the build
    script's preprocessSvg() handles the conversion with correct
    winding for the font pipeline (Y-flip in svgicons2svgfont).
    """
    p = pathops.Path()
    add_commands_to_pathops(p, commands)
    return p


def get_viewbox(svg_elem):
    """Get viewBox as (x, y, w, h)."""
    vb = svg_elem.get('viewBox', '')
    if vb:
        parts = [float(x) for x in vb.split()]
        return parts
    w = float(svg_elem.get('width', '16'))
    h = float(svg_elem.get('height', '16'))
    return [0, 0, w, h]


def process_svg(input_path, output_name):
    """Process a single SVG file: convert strokes to fills, normalize colors."""
    tree = ET.parse(input_path)
    root = tree.getroot()

    vb = get_viewbox(root)
    vb_w, vb_h = vb[2], vb[3]

    # Need to rescale if viewBox is not 16x16
    scale_x = 16.0 / vb_w if vb_w != 16 else 1.0
    scale_y = 16.0 / vb_h if vb_h != 16 else 1.0
    need_scale = (vb_w != 16 or vb_h != 16)

    # Check if root SVG has fill="none" (common in JetBrains icons)
    root_fill = root.get('fill', '')

    # Collect all shape elements (including inside <g> and <defs>)
    all_paths = []

    def collect_elements(parent, inherited_fill=None, depth=0):
        parent_tag = parent.tag.replace(f'{{{NS["svg"]}}}', '')
        # Track inherited fill
        if parent.get('fill'):
            inherited_fill = parent.get('fill')
        for elem in parent:
            tag = elem.tag.replace(f'{{{NS["svg"]}}}', '')
            if tag in ('g', 'clipPath'):
                collect_elements(elem, inherited_fill, depth + 1)
                continue
            if tag in ('defs', 'title', 'desc', 'metadata'):
                continue
            if tag in ('path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'):
                # Attach inherited fill info
                elem.set('_inherited_fill', inherited_fill or '')
                all_paths.append(elem)

    collect_elements(root, root_fill)

    if not all_paths:
        print(f'  WARNING: No shape elements found in {input_path}')
        return False

    # Process each element
    result_paths = []

    for elem in all_paths:
        commands = element_to_commands(elem)
        if not commands:
            continue

        elem_has_stroke = has_stroke(elem)
        elem_has_fill = has_fill(elem)
        fill_val = elem.get('fill', '')
        fill_rule = elem.get('fill-rule', 'nonzero')
        clip_rule = elem.get('clip-rule', '')
        if clip_rule == 'evenodd':
            fill_rule = 'evenodd'

        # Skip background/interior fill layers in multi-color icons.
        # If element also has stroke, keep it as stroke-only instead of skipping.
        resolved_fill = fill_val or elem.get('_inherited_fill', '') or ''
        skip_fill = resolved_fill.lower() in SKIP_FILL_COLORS
        if skip_fill and not elem_has_stroke:
            continue
        if skip_fill:
            elem_has_fill = False  # treat as stroke-only

        if elem_has_stroke and not elem_has_fill:
            # Pure stroke element -> convert stroke to fill
            sw = get_stroke_width(elem)
            lc = get_linecap(elem)
            lj = get_linejoin(elem)
            ml = get_miter_limit(elem)
            p = stroke_to_fill(commands, sw, lc, lj, ml)
            result_paths.append(p)

        elif elem_has_stroke and elem_has_fill and fill_val != 'none':
            # Has both stroke and fill
            # Add fill path
            p_fill = fill_path(commands, fill_rule)
            result_paths.append(p_fill)
            # Add stroke path
            sw = get_stroke_width(elem)
            lc = get_linecap(elem)
            lj = get_linejoin(elem)
            ml = get_miter_limit(elem)
            p_stroke = stroke_to_fill(commands, sw, lc, lj, ml)
            result_paths.append(p_stroke)

        elif elem_has_fill or (not elem_has_stroke and fill_val != 'none'):
            # Pure fill element
            p = fill_path(commands, fill_rule)
            result_paths.append(p)

    if not result_paths:
        print(f'  WARNING: No valid paths generated for {output_name}')
        return False

    # Combine all paths into a single pathops.Path by appending subpaths
    result = pathops.Path()
    for p in result_paths:
        # Convert conics before iterating
        p.convertConicsToQuads(0.1)
        for verb, pts in p:
            if verb == 0:   # MOVE
                result.moveTo(pts[0][0], pts[0][1])
            elif verb == 1: # LINE
                result.lineTo(pts[0][0], pts[0][1])
            elif verb == 2: # QUAD
                result.quadTo(pts[0][0], pts[0][1], pts[1][0], pts[1][1])
            elif verb == 4: # CUBIC
                result.cubicTo(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1])
            elif verb == 5: # CLOSE
                result.close()

    # NOTE: Do NOT call pathops.simplify() here — it destroys winding
    # directions needed for holes (stroked circles, rects become solid).
    # The stroke() output already has correct winding (outer CW, inner CCW).

    # Apply scale if needed
    if need_scale:
        scaled = pathops.Path()
        result.convertConicsToQuads(0.1)
        for verb, pts in result:
            if verb == 0:
                scaled.moveTo(pts[0][0] * scale_x, pts[0][1] * scale_y)
            elif verb == 1:
                scaled.lineTo(pts[0][0] * scale_x, pts[0][1] * scale_y)
            elif verb == 2:
                scaled.quadTo(
                    pts[0][0] * scale_x, pts[0][1] * scale_y,
                    pts[1][0] * scale_x, pts[1][1] * scale_y,
                )
            elif verb == 4:
                scaled.cubicTo(
                    pts[0][0] * scale_x, pts[0][1] * scale_y,
                    pts[1][0] * scale_x, pts[1][1] * scale_y,
                    pts[2][0] * scale_x, pts[2][1] * scale_y,
                )
            elif verb == 5:
                scaled.close()
        result = scaled

    d = pathops_to_svg_d(result, precision=4)

    # Write output SVG
    output_path = os.path.join(PREPARED_DIR, f'{output_name}.svg')
    svg_content = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">\n'
        f'<path d="{d}" fill="#000000" fill-rule="evenodd"/>\n'
        f'</svg>\n'
    )
    with open(output_path, 'w') as f:
        f.write(svg_content)

    return True


def main():
    os.makedirs(PREPARED_DIR, exist_ok=True)

    success = 0
    failed = 0
    skipped = 0

    for orig_name, prep_name in sorted(NAME_MAP.items()):
        orig_path = os.path.join(ORIGINAL_DIR, f'{orig_name}.svg')
        if not os.path.exists(orig_path):
            print(f'  SKIP: {orig_name}.svg not found')
            skipped += 1
            continue

        try:
            ok = process_svg(orig_path, prep_name)
            if ok:
                print(f'  OK: {orig_name} -> {prep_name}')
                success += 1
            else:
                failed += 1
        except Exception as e:
            print(f'  FAIL: {orig_name} -> {prep_name}: {e}')
            import traceback
            traceback.print_exc()
            failed += 1

    print(f'\nDone: {success} OK, {failed} failed, {skipped} skipped')


if __name__ == '__main__':
    main()
