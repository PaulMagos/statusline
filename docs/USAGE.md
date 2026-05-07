# Usage

Run the TUI:

```bash
bun run start
```

Edit the status-line widgets, then choose **Configure Codex status line** from the main menu.

The tool writes a native Codex status line to:

```text
~/.codex/config.toml
```

Example:

```toml
[tui]
status_line = ["model-with-reasoning", "current-dir", "git-branch", "context-used"]
```

## Supported Items

Codex only supports its built-in item ids. This tool maps compatible widgets to those ids:

- `model`
- `model-with-reasoning`
- `current-dir`
- `git-branch`
- `context-remaining`
- `context-used`
- `five-hour-limit`
- `weekly-limit`
- `codex-version`
- `used-tokens`
- `total-input-tokens`
- `total-output-tokens`
- `session-id`
- `thread-title`
- `context-window-size`

Unsupported widgets are skipped during install.

## Disable

Use the uninstall action in the TUI. It writes:

```toml
[tui]
status_line = null
```
