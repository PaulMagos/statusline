# Usage

Run the TUI:

```bash
bun run start
```

Choose native-compatible status-line items, then select **Configure Codex status line** from the main menu.

The tool writes a plain native Codex footer configuration to:

```text
~/.codex/config.toml
```

Example:

```toml
[tui]
status_line = ["model-with-reasoning", "current-dir", "git-branch", "context-used"]
```

## Supported Items

Codex only supports its built-in item ids. It does not render this tool's local preview, colors, labels, separators, or powerline styling. This tool maps compatible widgets to these plain native ids:

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
