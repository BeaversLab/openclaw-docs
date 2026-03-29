---
summary: "終端使用者介面 (TUI)：從任何機器連線到 Gateway"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (終端使用者介面)

## 快速入門

1. 啟動 Gateway。

```bash
openclaw gateway
```

2. 開啟 TUI。

```bash
openclaw tui
```

3. 輸入訊息並按 Enter。

遠端 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 使用密碼驗證，請使用 `--password`。

## 介面概觀

- 標頭：連線 URL、目前的 Agent、目前的 Session。
- 聊天記錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態 (connecting, running, streaming, idle, error)。
- 頁尾：連線狀態 + agent + session + model + think/verbose/reasoning + token 數量 + deliver。
- 輸入區：具有自動完成功能的文字編輯器。

## 心智模型：Agents + Sessions

- Agents 是唯一的代碼 (例如 `main`, `research`)。Gateway 會公開此列表。
- Sessions 屬於目前的 Agent。
- Session 金鑰儲存為 `agent:<agentId>:<sessionKey>`。
  - 如果您輸入 `/session main`，TUI 會將其展開為 `agent:<currentAgent>:main`。
  - 如果您輸入 `/session agent:other:main`，您將會明確切換到該 agent session。
- Session 範圍：
  - `per-sender` (預設)：每個 agent 有多個 sessions。
  - `global`：TUI 總是使用 `global` session (選擇器可能為空)。
- 目前的 agent + session 總是顯示在頁尾。

## 發送 + 傳遞

- 訊息會被發送到 Gateway；預設情況下不會傳遞給供應商。
- 開啟傳遞：
  - `/deliver on`
  - 或設定面板
  - 或以 `openclaw tui --deliver` 啟動

## 選擇器 + 覆蓋層

- 模型選擇器：列出可用模型並設定 session 覆蓋。
- Agent 選擇器：選擇不同的 agent。
- Session 選擇器：僅顯示目前 agent 的 sessions。
- 設定：切換傳遞、工具輸出展開和思考顯示。

## 鍵盤快捷鍵

- Enter：發送訊息
- Esc：中止正在執行的操作
- Ctrl+C：清除輸入 (按兩次以退出)
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：Agent 選擇器
- Ctrl+P：Session 選擇器
- Ctrl+O：切換工具輸出展開
- Ctrl+T：切換思考顯示 (重新載入歷史記錄)

## 斜線指令

核心：

- `/help`
- `/status`
- `/agent <id>` (或 `/agents`)
- `/session <key>` (或 `/sessions`)
- `/model <provider/model>` (或 `/models`)

會話控制：

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (別名：`/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

會話生命週期：

- `/new` 或 `/reset` (重設會話)
- `/abort` (中止正在運行的任務)
- `/settings`
- `/exit`

其他 Gateway 斜線指令 (例如 `/context`) 會轉發到 Gateway 並顯示為系統輸出。參閱 [斜線指令](/en/tools/slash-commands)。

## 本機 Shell 指令

- 在行首加上 `!` 以在 TUI 主機上執行本機 Shell 指令。
- TUI 會在每個會話提示一次以允許本機執行；拒絕將會在該會話中停用 `!`。
- 指令在 TUI 工作目錄中的全新非互動式 Shell 中執行 (無持久 `cd`/env)。
- 單獨的 `!` 將作為一般訊息發送；前導空格不會觸發本機執行。

## 工具輸出

- 工具呼叫會顯示為包含參數與結果的卡片。
- Ctrl+O 可在收起/展開視圖之間切換。
- 當工具執行時，部分更新會串流到同一張卡片中。

## 歷史紀錄 + 串流

- 連線時，TUI 會載入最新的歷史紀錄 (預設 200 則訊息)。
- 串流回應會在原地更新直到完成。
- TUI 也會監聽 Agent 工具事件以顯示更豐富的工具卡片。

## 連線詳細資訊

- TUI 會向 Gateway 註冊為 `mode: "tui"`。
- 重新連線會顯示系統訊息；事件間隔會顯示在記錄中。

## 選項

- `--url <url>`: Gateway WebSocket URL (預設為設定或 `ws://127.0.0.1:<port>`)
- `--token <token>`: Gateway 權杖 (如果需要)
- `--password <password>`：Gateway 密碼（如果需要）
- `--session <key>`：Session 金鑰（預設為 `main`，或當範圍為全域時為 `global`）
- `--deliver`：將助理回覆傳送給提供者（預設關閉）
- `--thinking <level>`：覆寫傳送的思考等級
- `--timeout-ms <ms>`：Agent 逾時時間，以毫秒為單位（預設為 `agents.defaults.timeoutSeconds`）

注意：當您設定 `--url` 時，TUI 將不會回退到設定檔或環境變數憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確憑證將會導致錯誤。

## 疑難排解

傳送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線並處於閒置/忙碌狀態。
- 檢查 Gateway 日誌：`openclaw logs --follow`。
- 確認 agent 可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您預期在聊天頻道中收到訊息，請啟用傳送（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要載入的歷史記錄項目（預設 200）

## 疑難排解

- `disconnected`：確保 Gateway 正在執行並且您的 `--url/--token/--password` 是正確的。
- 選擇器中沒有 agent：檢查 `openclaw agents list` 和您的路由設定。
- 空白的 session 選擇器：您可能處於全域範圍，或者尚未建立任何 session。
