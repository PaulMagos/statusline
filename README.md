# codexstatusline

A Codex CLI status-line configurator forked from `ccstatusline`.

Codex does not currently use Claude Code's external `statusLine.command` JSON pipe. Instead, it reads built-in footer item identifiers from `tui.status_line` in `~/.codex/config.toml`. This fork keeps the existing TUI editor and maps supported widgets to Codex's native status-line items.

## What Works

- Interactive TUI for choosing status-line widgets.
- Install action that writes `tui.status_line = [...]` to Codex `config.toml`.
- Existing local renderer and preview for experimenting with layouts.
- Codex config discovery via `CODEX_HOME`, with `CLAUDE_CONFIG_DIR` accepted as a legacy fallback.
- Codex transcript and cache helpers for usage, context, block timers, and token widgets where compatible.

## Important Limitation

Codex only accepts its built-in status-line item ids. Custom colors, separators, powerline rendering, arbitrary command widgets, and multi-line formatting are useful in this tool's preview, but cannot be faithfully installed into Codex until Codex exposes an external status-line formatter API.

Supported widget mappings include:

```text
model -> model
thinking-effort -> model-with-reasoning
current-working-dir -> current-dir
git-branch -> git-branch
context-percentage -> context-used
context-length/context-window -> context-window-size
tokens-total -> used-tokens
tokens-input -> total-input-tokens
tokens-output -> total-output-tokens
block timer/reset -> five-hour-limit
weekly usage/reset -> weekly-limit
version -> codex-version
session-name -> thread-title
codex-session-id -> session-id
```

Unsupported widgets are skipped during install.

## Usage

```bash
bun install
bun run start
```

From the TUI, edit your line and choose **Configure Codex status line**. The installer updates:

```text
~/.codex/config.toml
```

Example output:

```toml
[tui]
status_line = ["model-with-reasoning", "current-dir", "git-branch", "context-used"]
```

To disable the Codex status line, use the uninstall action in the TUI. It writes:

```toml
[tui]
status_line = null
```

## Development

```bash
bun run lint
bun test
bun run build
```

The bundled binary is written to `dist/codexstatusline.js`.
