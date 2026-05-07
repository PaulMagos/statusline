# AGENTS.md

Guidance for agents working on `codexstatusline`.

## Project Overview

This is a Codex CLI adaptation of `ccstatusline`. Codex currently configures its footer with `tui.status_line` in `~/.codex/config.toml`, using built-in item identifiers. This project keeps the existing TUI editor and maps compatible widgets to those native Codex item ids.

## Commands

```bash
bun install
bun run start
bun run lint
bun test
bun run build
```

Use Bun for project commands.

## Architecture

- `src/codexstatusline.ts`: entry point for preview rendering and the TUI.
- `src/tui/`: React/Ink configuration UI.
- `src/utils/codex-settings.ts`: Codex config integration. Writes `tui.status_line` to `config.toml`.
- `src/widgets/`: widget definitions used by the preview/editor.
- `src/utils/renderer.ts`: local renderer used for preview and piped JSON testing.

## Codex Constraints

Do not reintroduce Claude Code's `statusLine.command` installation flow as the primary path. Codex does not currently expose an equivalent external status-line formatter contract.

When installing into Codex, only built-in item ids can be persisted. Unsupported widgets should be skipped or documented, not serialized into invalid TOML.

`CODEX_HOME` is the preferred custom config directory. `CLAUDE_CONFIG_DIR` is accepted only as a migration fallback for old tests/configs.

## Quality Rules

- Run `bun run lint` and `bun test` after code changes.
- Keep docs explicit about the native Codex `tui.status_line` limitation.
- Avoid broad rewrites outside the Codex integration layer unless the tests or build require them.
