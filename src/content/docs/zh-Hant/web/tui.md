---
summary: "終端使用者介面 (TUI)：從任何機器連線到 Gateway"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (Terminal UI)

## 快速入門

1. 啟動 Gateway。

```exec
openclaw gateway
```

2. 開啟 TUI。

```exec
openclaw tui
```

3. 輸入訊息並按下 Enter。

遠端 Gateway：

```exec
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 使用密碼驗證，請使用 `--password`。

## 您所看到的介面

- 標頭：連線 URL、目前的 agent、目前的 session。
- 聊天紀錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態 (connecting, running, streaming, idle, error)。
- 頁尾：連線狀態 + agent + session + 模型 + think/fast/verbose/reasoning + token 計數 + deliver。
- 輸入區：具備自動完成功能的文字編輯器。

## 心智模型：agents + sessions

- Agents 是唯一的識別碼 (例如 `main`、`research`)。Gateway 會公開此列表。
- Sessions 屬於目前的 agent。
- Session 金鑰儲存為 `agent:<agentId>:<sessionKey>`。
  - 如果您輸入 `/session main`，TUI 會將其展開為 `agent:<currentAgent>:main`。
  - 如果您輸入 `/session agent:other:main`，您會明確切換到該 agent session。
- Session 範圍：
  - `per-sender` (預設)：每個 agent 有許多 sessions。
  - `global`：TUI 總是使用 `global` session (選擇器可能為空)。
- 目前的 agent + session 始終顯示在頁尾中。

## 傳送 + 遞送

- 訊息會傳送到 Gateway；預設情況下不會遞送給提供者。
- 開啟遞送功能：
  - `/deliver on`
  - 或是設定面板
  - 或是以 `openclaw tui --deliver` 啟動

## 選擇器 + 覆蓋層

- 模型選擇器：列出可用模型並設定 session 覆蓋。
- Agent 選擇器：選擇不同的 agent。
- Session 選擇器：僅顯示目前 agent 的 sessions。
- 設定：切換遞送、工具輸出展開，以及思考可見性。

## 鍵盤快捷鍵

- Enter：傳送訊息
- Esc：中止正在執行的操作
- Ctrl+C：清除輸入 (按兩次以退出)
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：agent 選擇器
- Ctrl+P：session 選擇器
- Ctrl+O：切換工具輸出展開
- Ctrl+T：切換思考可見性 (會重新載入歷史記錄)

## 斜線指令

核心：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

Session controls：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（別名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

Session lifecycle：

- `/new` 或 `/reset`（重置 session）
- `/abort`（中止正在運行的 run）
- `/settings`
- `/exit`

其他 Gateway 斜線指令（例如 `/context`）會被轉發至 Gateway 並顯示為系統輸出。請參閱[斜線指令](/zh-Hant/tools/slash-commands)。

## Local shell commands

- 在行首加上 `!` 以在 TUI 主機上執行本地 shell 指令。
- TUI 會在每個 session 提示一次以允許本地執行；拒絕將在該 session 期間停用 `!`。
- 指令會在 TUI 工作目錄中的全新非互動式 shell 中執行（沒有持續性的 `cd`/env）。
- 本地 shell 指令會在其環境中接收 `OPENCLAW_SHELL=tui-local`。
- 單獨的 `!` 會作為一般訊息傳送；前導空格不會觸發本地執行。

## Tool output

- 工具呼叫會以包含參數與結果的卡片顯示。
- Ctrl+O 會切換摺疊/展開檢視。
- 當工具執行時，部分更新會串流至同一張卡片。

## Terminal colors

- TUI 會將助理內文保持為終端機的預設前景色，讓深色與淺色終端機都能維持可讀性。
- 如果您的終端機使用淺色背景且自動偵測錯誤，請在啟動 `openclaw tui` 之前設定 `OPENCLAW_THEME=light`。
- 若要改為強制使用原始深色調色盤，請設定 `OPENCLAW_THEME=dark`。

## History + streaming

- 連線時，TUI 會載入最新的歷史記錄（預設為 200 則訊息）。
- 串流回應會在原地更新，直到完成。
- TUI 也會監聽 Agent 工具事件，以顯示更豐富的工具資訊卡。

## 連線詳細資訊

- TUI 會向 Gateway 註冊為 `mode: "tui"`。
- 重新連線會顯示一則系統訊息；事件間隙會顯示在日誌中。

## 選項

- `--url <url>`：Gateway WebSocket URL（預設為設定或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 權杖（若需要）
- `--password <password>`：Gateway 密碼（若需要）
- `--session <key>`：Session 金鑰（預設：`main`，若範圍為全域則為 `global`）
- `--deliver`：將助理回覆傳送給提供者（預設關閉）
- `--thinking <level>`：覆寫傳送的思考層級
- `--timeout-ms <ms>`：Agent 逾時時間，以毫秒為單位（預設為 `agents.defaults.timeoutSeconds`）

注意：當您設定 `--url` 時，TUI 不會回退至設定或環境變數中的憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確的憑證視為錯誤。

## 疑難排解

傳送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線且處於閒置/忙碌狀態。
- 檢查 Gateway 日誌：`openclaw logs --follow`。
- 確認 Agent 可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您預期在聊天頻道中收到訊息，請啟用傳遞功能（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要載入的歷史記錄項目數量（預設為 200）

## 連線疑難排解

- `disconnected`：請確保 Gateway 正在執行，且您的 `--url/--token/--password` 正確。
- 選擇器中沒有 Agent：請檢查 `openclaw agents list` 和您的路由設定。
- 空的 Session 選擇器：您可能處於全域範圍，或者還沒有任何 Session。
