# Windows

The project is developed with Bun and should run anywhere Bun supports the required dependencies.

Codex configuration is still TOML:

```toml
[tui]
status_line = ["model-with-reasoning", "current-dir", "git-branch"]
```

By default, Codex uses:

```text
%USERPROFILE%\.codex\config.toml
```

Set `CODEX_HOME` to use another Codex home:

```powershell
$env:CODEX_HOME="C:\path\to\.codex"
```

Then run:

```powershell
bun install
bun run start
```
