---
summary: "終端機介面 (TUI)：從任何機器連線到 Gateway"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (終端機介面)

## 快速開始

1. 啟動 Gateway。

```bash
openclaw gateway
```

2. 開啟 TUI。

```bash
openclaw tui
```

3. 輸入訊息並按下 Enter。

遠端 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 使用密碼驗證，請使用 `--password`。

## 您所看到的介面

- 標題列：連線 URL、目前代理程式、目前工作階段。
- 聊天記錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態 (連線中、執行中、串流中、閒置、錯誤)。
- 頁尾：連線狀態 + agent + session + 模型 + think/fast/verbose/trace/reasoning + token 計數 + deliver。
- 輸入區：帶有自動完成的文字編輯器。

## 心智模型：代理程式 + 工作階段

- 代理程式是唯一的代碼 (例如 `main`、`research`)。Gateway 會公開這個列表。
- 工作階段屬於目前的代理程式。
- 工作階段金鑰以 `agent:<agentId>:<sessionKey>` 的形式儲存。
  - 如果您輸入 `/session main`，TUI 會將其展開為 `agent:<currentAgent>:main`。
  - 如果您輸入 `/session agent:other:main`，您將會明確切換到該代理程式工作階段。
- 工作階段範圍：
  - `per-sender` (預設)：每個代理程式都有多個工作階段。
  - `global`：TUI 總是使用 `global` 工作階段 (選擇器可能為空)。
- 目前的代理程式和工作階段始終顯示在底部列中。

## 傳送 + 遞送

- 訊息會傳送到 Gateway；預設情況下不會遞送給供應商。
- 開啟遞送：
  - `/deliver on`
  - 或設定面板
  - 或使用 `openclaw tui --deliver` 啟動

## 選擇器 + 覆蓋層

- 模型選擇器：列出可用的模型並設定工作階段覆蓋。
- 代理程式選擇器：選擇不同的代理程式。
- 工作階段選擇器：僅顯示目前代理程式的工作階段。
- 設定：切換遞送、工具輸出展開和思考可見性。

## 鍵盤快捷鍵

- Enter：傳送訊息
- Esc：中止正在執行的操作
- Ctrl+C：清除輸入 (按兩次以退出)
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：代理程式選擇器
- Ctrl+P：工作階段選擇器
- Ctrl+O：切換工具輸出展開
- Ctrl+T：切換思考可見性 (重新載入歷史記錄)

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
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (別名：`/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Session 生命週期：

- `/new` 或 `/reset` (重置 session)
- `/abort` (中止正在執行的任務)
- `/settings`
- `/exit`

其他 Gateway 斜線指令 (例如 `/context`) 會轉發至 Gateway 並顯示為系統輸出。請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

## 本地 shell 指令

- 在行首加上 `!` 以在 TUI 主機上執行本地 shell 指令。
- TUI 會在每個 session 提示一次以允許本地執行；拒絕將會在該 session 中停用 `!`。
- 指令會在 TUI 工作目錄中全新的非互動式 shell 中執行 (沒有持續存在的 `cd`/env)。
- 本地 shell 指令會在其環境中接收 `OPENCLAW_SHELL=tui-local`。
- 單獨的 `!` 會被當作一般訊息發送；開頭的空格不會觸發本地執行。

## 工具輸出

- 工具呼叫會以卡片形式顯示，包含參數與結果。
- Ctrl+O 可在摺疊/展開檢視之間切換。
- 當工具執行時，部分更新會串流傳輸至同一個卡片中。

## 終端機顏色

- TUI 會將助手內文文字保留在終端機的預設前景色中，讓深色和淺色終端機都能保持清晰可讀。
- 如果您的終端機使用淺色背景且自動偵測錯誤，請在啟動 `openclaw tui` 之前設定 `OPENCLAW_THEME=light`。
- 若要改為強制使用原始深色調色盤，請設定 `OPENCLAW_THEME=dark`。

## 歷史記錄 + 串流傳輸

- 連線時，TUI 會載入最新的歷史記錄 (預設 200 則訊息)。
- 串流回應會就地更新直到完成。
- TUI 也會監聽 agent 工具事件，以顯示更豐富的工具卡片。

## 連線詳細資訊

- TUI 會向 Gateway 註冊為 `mode: "tui"`。
- 重新連線會顯示系統訊息；事件缺口會顯示在日誌中。

## 選項

- `--url <url>`：Gateway WebSocket URL（預設為 config 或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 權杖（如果需要）
- `--password <password>`：Gateway 密碼（如果需要）
- `--session <key>`：Session 金鑰（預設為 `main`，當範圍為 global 時則為 `global`）
- `--deliver`：將助理回覆傳遞給提供者（預設關閉）
- `--thinking <level>`：覆蓋傳送的思考等級
- `--message <text>`：連線後發送初始訊息
- `--timeout-ms <ms>`：Agent 逾時時間，單位為毫秒（預設為 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`：要載入的歷史記錄條目（預設 `200`）

注意：當您設定 `--url` 時，TUI 不會回退到 config 或環境變數的憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確的憑證是一個錯誤。

## 疑難排解

發送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線且處於 idle/busy 狀態。
- 檢查 Gateway 日誌：`openclaw logs --follow`。
- 確認 agent 可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您預期在聊天頻道中收到訊息，請啟用傳遞（`/deliver on` 或 `--deliver`）。

## 連線疑難排解

- `disconnected`：確保 Gateway 正在運行，並且您的 `--url/--token/--password` 是正確的。
- 選擇器中沒有 agent：檢查 `openclaw agents list` 和您的路由配置。
- 空的 session 選擇器：您可能處於 global 範圍內，或者尚未有任何 session。

## 相關

- [Control UI](/zh-Hant/web/control-ui) — 網頁式控制介面
- [CLI Reference](/zh-Hant/cli) — 完整的 CLI 指令參考
