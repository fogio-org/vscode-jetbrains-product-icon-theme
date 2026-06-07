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
    { name: 'add',                codepoint: 0x28 },
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
    // { name: 'warning',            codepoint: 0x62 },
    { name: 'server-process',     codepoint: 0x63 },
    { name: 'open-preview',       codepoint: 0x64 },

    // ─── Activity Bar / Views ───────────────────────────
    // { name: 'testing-view-icon',  codepoint: 0x70, codicon: 'beaker' },
    { name: 'beaker',  codepoint: 0x70, codicon: 'beaker' },
    { name: 'comments-view-icon', codepoint: 0x71, codicon: 'comment-discussion' },
    { name: 'timeline-view-icon', codepoint: 0x72, codicon: 'history' },
    { name: 'outline-view-icon',  codepoint: 0x73, codicon: 'list-tree' },

    // ─── Editor Actions ─────────────────────────────────
    { name: 'pin',                codepoint: 0x80 },
    { name: 'go-to-file',         codepoint: 0x81 },
    // { name: 'save',               codepoint: 0x82 },
    // { name: 'save-all',           codepoint: 0x83 },
    { name: 'arrow-left',         codepoint: 0x84 },
    { name: 'arrow-right',        codepoint: 0x85 },

    // ─── Status Bar & Code Actions ──────────────────────
    // { name: 'error',              codepoint: 0x90 },
    // { name: 'info',               codepoint: 0x91 },
    { name: 'sync',               codepoint: 0x92 },
    { name: 'check',              codepoint: 0x93 },
    // { name: 'radio-tower',        codepoint: 0x94 },
    { name: 'lightbulb',          codepoint: 0x95 },
    { name: 'lightbulb-autofix',  codepoint: 0x96 },
    { name: 'sparkle',            codepoint: 0x97 },

    // ─── Testing ────────────────────────────────────────
    { name: 'testing-run-icon',      codepoint: 0xA0, codicon: 'play' },
    { name: 'testing-debug-icon',    codepoint: 0xA1, codicon: 'debug-alt' },
    // { name: 'testing-passed-icon',   codepoint: 0xA2, codicon: 'pass-filled' },
    { name: 'testing-failed-icon',   codepoint: 0xA3, codicon: 'error' },
    { name: 'testing-error-icon',    codepoint: 0xA4, codicon: 'warning' },
    { name: 'testing-skipped-icon',  codepoint: 0xA5, codicon: 'circle-slash' },

    // ─── Breakpoints ────────────────────────────────────
    { name: 'debug-breakpoint',             codepoint: 0xB0, codicon: 'circle-filled' },
    { name: 'debug-breakpoint-disabled',    codepoint: 0xB1, codicon: 'circle-outline' },
    { name: 'debug-breakpoint-conditional', codepoint: 0xB2, codicon: 'debug-breakpoint-conditional' },
    // { name: 'debug-breakpoint-log',         codepoint: 0xB3, codicon: 'debug-breakpoint-log' },
    { name: 'debug-stackframe',             codepoint: 0xB4 },

    // ─── Symbols ────────────────────────────────────────
    { name: 'symbol-class',       codepoint: 0xC0 },
    { name: 'symbol-method',      codepoint: 0xC1 },
    { name: 'symbol-function',    codepoint: 0xC2, codicon: 'symbol-method' },
    { name: 'symbol-interface',   codepoint: 0xC3 },
    { name: 'symbol-variable',    codepoint: 0xC4 },
    { name: 'symbol-field',       codepoint: 0xC5 },
    { name: 'symbol-enum',        codepoint: 0xC6 },
    { name: 'symbol-property',    codepoint: 0xC7 },
    { name: 'symbol-constant',    codepoint: 0xC8 },
    { name: 'symbol-constructor', codepoint: 0xC9, codicon: 'symbol-method' },
    { name: 'symbol-parameter',   codepoint: 0xCA },

    // ─── File, Folder, Diff, Layout ─────────────────────
    { name: 'file',               codepoint: 0xD0 },
    { name: 'folder',             codepoint: 0xD1 },
    { name: 'folder-opened',      codepoint: 0xD2 },
    { name: 'diff-insert',        codepoint: 0xD3, codicon: 'diff-added' },
    { name: 'diff-remove',        codepoint: 0xD4, codicon: 'diff-removed' },
    { name: 'diff-renamed',       codepoint: 0xD5 },
    // { name: 'layout-panel',       codepoint: 0xD6 },
    // { name: 'layout-sidebar-left', codepoint: 0xD7 },

    // ─── Misc UI ────────────────────────────────────────
    { name: 'lock',               codepoint: 0xE0 },
    { name: 'unlock',             codepoint: 0xE1 },
    { name: 'link-external',      codepoint: 0xE2 },
    { name: 'star-full',          codepoint: 0xE3 },
    { name: 'star-empty',         codepoint: 0xE4 },
    { name: 'home',               codepoint: 0xE5 },
    { name: 'shield',             codepoint: 0xE6 },
    // { name: 'sort-precedence',    codepoint: 0xE7 },
    { name: 'cloud-upload',       codepoint: 0xE8 },
    // { name: 'tag',                codepoint: 0xE9 },
    { name: 'wrench',             codepoint: 0xEA, codicon: 'tools' },
];

export const ALIASES = [
    { name: 'source-control',  target: 'git-commit' },
    { name: 'pinned',          target: 'pin' },
    // { name: 'check-all',       target: 'check' },
];
