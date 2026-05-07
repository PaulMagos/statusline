# Development

## Setup

```bash
bun install
bun run start
```

## Checks

```bash
bun run lint
bun test
bun run build
```

## Key Files

- `src/codexstatusline.ts`: CLI entry point.
- `src/tui/App.tsx`: main TUI state and install flow.
- `src/utils/codex-settings.ts`: reads and writes Codex `config.toml`.
- `src/widgets/`: widget catalog used by the editor and preview renderer.

## Codex Install Model

Codex status-line configuration is native TOML:

```toml
[tui]
status_line = ["model-with-reasoning", "current-dir", "git-branch"]
```

The installer maps compatible widgets to Codex built-in item ids and skips unsupported widgets. It backs up `config.toml` to `config.toml.orig` before writing.

Use `CODEX_HOME` to point at a non-default Codex home. `CLAUDE_CONFIG_DIR` is still recognized as a legacy fallback.
