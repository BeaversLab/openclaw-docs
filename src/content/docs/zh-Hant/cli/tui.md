---
summary: " `openclaw tui` （閘道支援或本地嵌入式終端機 UI）的 CLI 參考"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use openclaw chat or openclaw tui --local
title: "tui"
---

# `openclaw tui`

開啟連接到閘道的終端機 UI，或在本地嵌入式模式下執行。

相關：

- TUI 指南：[TUI](/zh-Hant/web/tui)

注意：

- `chat` 和 `terminal` 是 `openclaw tui --local` 的別名。
- `--local` 不能與 `--url`、`--token` 或 `--password` 組合使用。
- `tui` 會在可能的情況下解析已設定的閘道驗證 SecretRefs 以進行 token/password 驗證（`env`/`file`/`exec` 提供者）。
- 從已設定的 agent 工作區目錄中啟動時，TUI 會自動選取該 agent 作為 session key 的預設值（除非明確將 `--session` 設為 `agent:<id>:...`）。
- 本地模式直接使用嵌入式 agent 執行時。大多數本地工具都能運作，但僅限閘道的功能無法使用。
- 本地模式會在 TUI 指令介面中加入 `/auth [provider]`。
- 外掛程式審核閘門在本地模式下仍然適用。需要審核的工具會在終端機中提示進行決策；由於不涉及閘道，因此不會有靜默的自動審核。

## 範例

```bash
openclaw chat
openclaw tui --local
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
openclaw chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

## 設定修復迴圈

當目前的設定已通過驗證，並且您希望嵌入式 agent 檢查它、將其與文件進行比較，並協助從同一個終端機修復它時，請使用本地模式：

如果 `openclaw config validate` 已經失敗，請先使用 `openclaw configure` 或
`openclaw doctor --fix`。`openclaw chat` 不會繞過無效
設定的防護。

```bash
openclaw chat
```

然後在 TUI 內部：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

使用 `openclaw config set` 或 `openclaw configure` 套用特定的修復，然後
重新執行 `openclaw config validate`。請參閱 [TUI](/zh-Hant/web/tui) 和 [Config](/zh-Hant/cli/config)。
