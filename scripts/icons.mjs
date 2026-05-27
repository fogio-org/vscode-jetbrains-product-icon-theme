export const FONT_NAME = 'jetbrains-product-icon-theme';

export const ICONS = [
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
];

export const ALIASES = [
    { name: 'source-control', target: 'git-commit' },
];
