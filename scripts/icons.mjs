export const FONT_NAME = 'jetbrains-product-icon-theme';

export const ICONS = [
    // ─── Original icons ─────────────────────────────────
    { name: 'explorer-view-icon', codepoint: 0x01, codicon: 'files' },
    { name: 'extensions',         codepoint: 0x02 },
    { name: 'files',              codepoint: 0x03 },
    { name: 'search',             codepoint: 0x04 },
    { name: 'settings-gear',      codepoint: 0x05 },
    { name: 'terminal',           codepoint: 0x06 },
    { name: 'account',            codepoint: 0x07 },
    { name: 'filter',             codepoint: 0x08 },
    { name: 'git-pull-request',   codepoint: 0x0E },
    { name: 'remote-explorer',    codepoint: 0x0F },
    { name: 'split-horizontal',   codepoint: 0x10 },
    { name: 'split-vertical',     codepoint: 0x11 },
    { name: 'git-branch',         codepoint: 0x12 },
    { name: 'git-commit',         codepoint: 0x13 },
    { name: 'git-fetch',          codepoint: 0x14 },
    { name: 'git-compare',        codepoint: 0x15 },
    { name: 'git-merge',          codepoint: 0x16 },
    { name: 'run-view-icon',      codepoint: 0x17, codicon: 'debug-alt' },
    { name: 'new-file',           codepoint: 0x18 },
    { name: 'new-folder',         codepoint: 0x19 },

    // ─── General UI ─────────────────────────────────────
    // { name: 'close',              codepoint: 0x20 },
    { name: 'chevron-down',       codepoint: 0x21 },
    { name: 'chevron-right',      codepoint: 0x22 },
    { name: 'chevron-up',         codepoint: 0x23 },
    { name: 'collapse-all',       codepoint: 0x24 },
    { name: 'expand-all',         codepoint: 0x25 },
    { name: 'trash',              codepoint: 0x26 },
    { name: 'edit',               codepoint: 0x27 },
    // { name: 'add',                codepoint: 0x28 },
    { name: 'copy',               codepoint: 0x29 },
    { name: 'history',            codepoint: 0x2A },
    { name: 'cloud-download',     codepoint: 0x2B },
    { name: 'export',             codepoint: 0x2C },
    { name: 'refresh',            codepoint: 0x2D },
    { name: 'eye',                codepoint: 0x2E },
    { name: 'bookmark',           codepoint: 0x2F },

    // ─── Search ─────────────────────────────────────────
    { name: 'regex',              codepoint: 0x30 },
    { name: 'case-sensitive',     codepoint: 0x31 },
    { name: 'whole-word',         codepoint: 0x32 },
    { name: 'preserve-case',     codepoint: 0x33 },
    { name: 'replace',            codepoint: 0x34 },

    // ─── Run & Debug ────────────────────────────────────
    { name: 'debug',              codepoint: 0x40 },
    { name: 'debug-pause',        codepoint: 0x41 },
    { name: 'debug-stop',         codepoint: 0x42 },
    { name: 'debug-continue',     codepoint: 0x43 },
    { name: 'debug-step-over',    codepoint: 0x44 },
    { name: 'debug-step-into',    codepoint: 0x45 },
    { name: 'debug-step-out',     codepoint: 0x46 },
    { name: 'debug-restart',      codepoint: 0x47 },
    { name: 'debug-disconnect',   codepoint: 0x48 },
    { name: 'debug-rerun',        codepoint: 0x49 },
    { name: 'play',               codepoint: 0x4A },
    { name: 'debug-console',      codepoint: 0x4B },

    // ─── VCS ────────────────────────────────────────────
    { name: 'diff',               codepoint: 0x50 },
    { name: 'git-stash',          codepoint: 0x51 },
    { name: 'git-stash-apply',    codepoint: 0x52 },

    // ─── Panels & Views ─────────────────────────────────
    { name: 'output',             codepoint: 0x60 },
    { name: 'bell',               codepoint: 0x61 },
    { name: 'warning',            codepoint: 0x62 },
    { name: 'server-process',     codepoint: 0x63 },
    { name: 'open-preview',       codepoint: 0x64 },
];

export const ALIASES = [
    { name: 'source-control', target: 'git-commit' },
];
