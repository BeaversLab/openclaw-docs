---
summary: "連線至 Gateway 的終端機 UI (`openclaw tui`) 之 CLI 參考資料"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `openclaw tui`

開啟連線至 Gateway 的終端機 UI。

相關連結：

- TUI 指南：[TUI](/zh-Hant/web/tui)

注意事項：

- `tui` 會盡可能解析針對 token/password 認證所設定的 gateway auth SecretRefs (`env`/`file`/`exec` providers)。
- 當從已設定的 agent 工作區目錄內啟動時，TUI 會自動選取該 agent 作為 session key 的預設值 (除非明確將 `--session` 設定為 `agent:<id>:...`)。

## 範例

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
