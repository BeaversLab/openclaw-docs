---
summary: "`openclaw tui`（連接到 Gateway 的終端機 UI）的 CLI 參考"
read_when:
  - 您需要 Gateway 的終端機 UI（適合遠端操作）
  - 您想從腳本傳遞 url/token/session
title: "tui"
---

# `openclaw tui`

開啟連接到 Gateway 的終端機 UI。

相關連結：

- TUI 指南：[TUI](/zh-Hant/web/tui)

備註：

- `tui` 會在可能的情況下解析已配置的 gateway auth SecretRefs 以進行 token/password 驗證（`env`/`file`/`exec` 提供者）。
- 從已配置的 agent 工作區目錄內啟動時，TUI 會自動選取該 agent 作為 session key 的預設值（除非明確將 `--session` 設為 `agent:<id>:...`）。

## 範例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import en from "/components/footer/en.mdx";

<en />
