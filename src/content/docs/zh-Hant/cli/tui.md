---
summary: "連線至 Gateway 的終端機 UI (`openclaw tui`) 的 CLI 參考"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `openclaw tui`

開啟連線至 Gateway 的終端機 UI。

相關：

- TUI 指南：[TUI](/en/web/tui)

注意：

- `tui` 盡可能解析已設定的 gateway auth SecretRefs 以進行 token/password 驗證 (`env`/`file`/`exec` 提供者)。
- 從已設定的 agent 工作區目錄內啟動時，TUI 會自動選取該 agent 作為 session key 預設值 (除非明確將 `--session` 設為 `agent:<id>:...`)。

## 範例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```
