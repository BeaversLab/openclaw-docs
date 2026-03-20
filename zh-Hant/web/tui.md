---
summary: "終端使用者介面 (TUI)：從任何機器連線到 Gateway"
read_when:
  - 您想要 TUI 的入門教學
  - 您需要 TUI 功能、指令和快捷鍵的完整清單
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

3. 輸入訊息並按下 Enter。

遠端 Gateway：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果您的 Gateway 使用密碼驗證，請使用 `--password`。

## 您所看到的

- 標頭：連線 URL、當前代理程式、當前作業階段。
- 聊天記錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態 (connecting、running、streaming、idle、error)。
- 頁尾：連線狀態 + agent + session + model + think/fast/verbose/reasoning + token 計數 + deliver。
- 輸入：具有自動完成功能的文字編輯器。

## 心智模型：代理程式 + 作業階段

- 代理程式是唯一的代碼 (例如 `main`、`research`)。Gateway 會公開清單。
- 作業階段屬於當前的代理程式。
- 作業階段金鑰儲存為 `agent:<agentId>:<sessionKey>`。
  - 如果您輸入 `/session main`，TUI 會將其展開為 `agent:<currentAgent>:main`。
  - 如果您輸入 `/session agent:other:main`，您會明確切換到該代理程式作業階段。
- 作業階段範圍：
  - `per-sender` (預設)：每個代理程式有多個作業階段。
  - `global`：TUI 始終使用 `global` 作業階段 (選擇器可能為空白)。
- 當前的代理程式 + 作業階段始終顯示在頁尾中。

## 發送 + 傳遞

- 訊息會傳送到 Gateway；預設情況下不會傳遞給提供者。
- 開啟傳遞：
  - `/deliver on`
  - 或設定面板
  - 或使用 `openclaw tui --deliver` 啟動

## 選擇器 + 覆蓋層

- 模型選擇器：列出可用模型並設定作業階段覆寫。
- 代理程式選擇器：選擇不同的代理程式。
- 作業階段選擇器：僅顯示當前代理程式的作業階段。
- 設定：切換傳遞、工具輸出展開和思考可見性。

## 鍵盤快捷鍵

- Enter：發送訊息
- Esc：中止活動中的執行
- Ctrl+C：清除輸入 (按兩次以退出)
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：代理程式選擇器
- Ctrl+P：作業階段選擇器
- Ctrl+O：切換工具輸出展開
- Ctrl+T：切換思考可見性 (重新載入歷史記錄)

## 斜線指令

核心：

- `/help`
- `/status`
- `/agent <id>` (或 `/agents`)
- `/session <key>` (或 `/sessions`)
- `/model <provider/model>` (或 `/models`)

工作階段控制：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (別名：`/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

工作階段生命週期：

- `/new` 或 `/reset` (重設工作階段)
- `/abort` (中止正在執行的操作)
- `/settings`
- `/exit`

其他 Gateway 斜線指令（例如 `/context`）會被轉發至 Gateway 並顯示為系統輸出。請參閱[斜線指令](/zh-Hant/tools/slash-commands)。

## 本機 Shell 指令

- 在一行開頭加上 `!` 即可在 TUI 主機上執行本機 Shell 指令。
- TUI 在每個工作階段開始時會提示一次以允許本機執行；拒絕將會在該工作階段中保持停用 `!`。
- 指令會在 TUI 工作目錄中的全新非互動式 Shell 中執行（沒有永續的 `cd`/env）。
- 本機 Shell 指令會在其環境中接收 `OPENCLAW_SHELL=tui-local`。
- 單獨的 `!` 會作為一般訊息傳送；前置空格不會觸發本機執行。

## 工具輸出

- 工具呼叫會以包含參數與結果的卡片形式顯示。
- Ctrl+O 可在收起與展開檢視之間切換。
- 當工具執行時，部分更新會串流至同一個卡片中。

## 終端機顏色

- TUI 會將助手內文文字保留在您終端機的預設前景色，讓深色與淺色終端機都能保持可讀性。
- 如果您的終端機使用淺色背景且自動偵測錯誤，請在啟動 `openclaw tui` 之前設定 `OPENCLAW_THEME=light`。
- 若要改為強制使用原始深色調色盤，請設定 `OPENCLAW_THEME=dark`。

## 歷史記錄 + 串流

- 連線時，TUI 會載入最新的歷史記錄（預設 200 則訊息）。
- 串流回應會原地更新直到完成。
- TUI 也會監聽代理程式工具事件，以提供更豐富的工具卡片。

## 連線詳細資訊

- TUI 會向註冊為 `mode: "tui"`。
- 重新連線會顯示系統訊息；事件間隙會顯示在記錄檔中。

## 選項

- `--url <url>`：Gateway WebSocket URL（預設為組態或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 權杖（若需要）
- `--password <password>`：Gateway 密碼（若需要）
- `--session <key>`：工作階段金鑰（預設：`main`，若範圍為全域則為 `global`）
- `--deliver`：將助理回覆傳送給提供者（預設關閉）
- `--thinking <level>`：覆寫傳送的思考層級
- `--timeout-ms <ms>`：代理程式逾時時間，以毫秒為單位（預設為 `agents.defaults.timeoutSeconds`）

注意：當您設定 `--url` 時，TUI 不會回退到組態或環境認證。請明確傳遞 `--token` 或 `--password`。缺少明確認證即為錯誤。

## 疑難排解

傳送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線且處於閒置/忙碌狀態。
- 檢查 Gateway 記錄檔：`openclaw logs --follow`。
- 確認代理程式可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您期望在聊天頻道中收到訊息，請啟用傳送（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`：要載入的歷史記錄項目數（預設 200）

## 連線疑難排解

- `disconnected`：確保 Gateway 正在執行，且您的 `--url/--token/--password` 正確。
- 選擇器中沒有代理程式：檢查 `openclaw agents list` 和您的路由組態。
- 空白的工作階段選擇器：您可能處於全域範圍，或是尚未有任何工作階段。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
