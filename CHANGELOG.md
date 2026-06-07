# Change Log

## 1.2.0

- Add 47 new product icons from JetBrains New UI (intellij-community `expui/`):
  - Activity Bar: comments-view, timeline-view, outline-view
  - Editor actions: pin/pinned, go-to-file, arrow-left/right
  - Status bar & code actions: sync, check, lightbulb, lightbulb-autofix, sparkle
  - Testing: testing-run, testing-debug, testing-failed, testing-error, testing-skipped
  - Breakpoints: debug-breakpoint, debug-breakpoint-disabled, debug-breakpoint-conditional, debug-stackframe
  - Symbols (breadcrumbs/outline): class, method, function, interface, variable, field, enum, property, constant, constructor, parameter
  - File & diff: folder-opened, diff-insert, diff-remove, diff-renamed
  - Misc: lock, unlock, link-external, star-full, star-empty, home, shield, cloud-upload, wrench
- Add icon preprocessing pipeline (`scripts/preprocess-icons.mjs`): converts JetBrains expui SVGs (colored, stroked, circles) to monochrome 16×16 filled paths
- Original JetBrains icons saved in `assets/icons/original/` for reference
- Temporarily disable close, warning while custom versions are prepared
- Total: 110 product icon definitions (108 glyphs + 2 aliases)

## 1.1.0

- Add 41 new product icons from JetBrains New UI:
  - General UI: close, chevron-down/right/up, collapse-all, expand-all, trash, edit, add, copy, history, cloud-download, export, refresh, eye, bookmark
  - Search: regex, case-sensitive, whole-word, preserve-case, replace
  - Run & Debug: debug, debug-pause/stop/continue/step-over/step-into/step-out/restart/disconnect/rerun, play, debug-console
  - VCS: diff, git-stash, git-stash-apply
  - Panels: output, bell, warning, server-process, open-preview
- Shared icon registry (`scripts/icons.mjs`) — single source of truth for build and preview
- Total: 62 product icon definitions (61 glyphs + 1 alias)

## 1.0.0

- Automated font build pipeline (`npm run build`): SVG → SVG font → TTF → WOFF2
- Fix icon vertical alignment — icons now match default codicon baseline
- Fix `fill-rule="evenodd"` rendering — holes in icons (account, settings-gear, etc.) display correctly
- Fix remote-explorer icon rendering
- Add icon comparison preview image (`npm run preview`)
- Enable all 20 product icons (split-horizontal, split-vertical, git-branch now active)

## 0.1.1

- Add CI and release workflows
- Add manifest and product icon theme validation scripts
- Update readme badges

## 0.1.0

- Add icons: new-file, new-folder

## 0.0.2

- Add compatible extensions list to readme

## 0.0.1

- Initial release
