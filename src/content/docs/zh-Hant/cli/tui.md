---
summary: " `openclaw tui` （閘道支援或本地嵌入式終端機 UI）的 CLI 參考"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use openclaw chat or openclaw tui --local
title: "TUI"
---

# `openclaw tui`

開啟連接到閘道的終端機 UI，或在本地嵌入式模式下執行。

相關：

- TUI 指南：[TUI](/zh-Hant/web/tui)

## 選項

| 旗標                  | 預設值                              | 說明                                                             |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `--local`             | `false`                             | 對本機內嵌代理執行環境執行，而非 Gateway。                       |
| `--url <url>`         | 來自組態的 `gateway.remote.url`     | Gateway WebSocket URL。                                          |
| `--token <token>`     | （無）                              | Gateway 權杖（若需要）。                                         |
| `--password <pass>`   | （無）                              | Gateway 密碼（若需要）。                                         |
| `--session <key>`     | `main`（當範圍為全域時為 `global`） | 工作階段金鑰。在代理工作區內，除非加前綴，否則會自動選取該代理。 |
| `--deliver`           | `false`                             | 透過設定的管道傳送助理回覆。                                     |
| `--thinking <level>`  | （模型預設值）                      | 思考層級覆寫。                                                   |
| `--message <text>`    | （無）                              | 連線後傳送初始訊息。                                             |
| `--timeout-ms <ms>`   | `agents.defaults.timeoutSeconds`    | 代理逾時時間。無效的值會記錄警告並被忽略。                       |
| `--history-limit <n>` | `200`                               | 附加時要載入的歷史記錄項目。                                     |

別名：`openclaw chat` 和 `openclaw terminal` 會隱含 `--local` 來叫用相同的指令。

備註：

- `chat` 和 `terminal` 是 `openclaw tui --local` 的別名。
- `--local` 不能與 `--url`、`--token` 或 `--password` 結合使用。
- `tui` 會在可能時解析設定的 gateway auth SecretRefs 以進行權杖/密碼驗證（`env`/`file`/`exec` 提供者）。
- 當從設定的代理工作區目錄內啟動時，TUI 會自動選取該代理作為工作階段金鑰的預設值（除非 `--session` 明確設為 `agent:<id>:...`）。
- 本機模式直接使用內嵌代理執行環境。大多數本機工具均可運作，但僅限 Gateway 的功能則無法使用。
- 本機模式會在 TUI 指令介面內新增 `/auth [provider]`。
- 外掛程式核准閘門在本地模式中仍然適用。需要核准的工具會在終端機中提示做出決定；不會有因為不涉及 Gateway 而被靜默自動核准的情況。
- Session [目標](/zh-Hant/tools/goal) 會顯示在頁尾中，並可以使用 `/goal` 進行管理。

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

## 設定修復循環

當目前的設定已經通過驗證，且您希望嵌入式代理程式檢查它、將其與文件進行比較，並在同一個終端機中協助修復它時，請使用本機模式：

如果 `openclaw config validate` 已經失敗，請先使用 `openclaw configure` 或
`openclaw doctor --fix`。`openclaw chat` 不會繞過無效
設定的防護機制。

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

## 相關

- [CLI 參考](/zh-Hant/cli)
- [TUI](/zh-Hant/web/tui)
- [目標](/zh-Hant/tools/goal)
