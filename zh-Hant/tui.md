---
summary: "終端使用者介面 (TUI)：從任何機器連線到 Gateway"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

# TUI (終端使用者介面)

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

## 您看到的介面

- 頂部：連線 URL、當前代理、當前工作階段。
- 聊天記錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態 (連線中、執行中、串流中、閒置、錯誤)。
- 底部：連線狀態 + 代理 + 工作階段 + 模型 + 思考/詳細/推理 + Token 計數 + 傳遞。
- 輸入框：帶有自動完成的文字編輯器。

## 心智模型：代理 + 工作階段

- 代理是唯一識別碼 (例如 `main`、`research`)。Gateway 會公開該列表。
- 工作階段屬於當前的代理。
- 工作階段金鑰儲存為 `agent:<agentId>:<sessionKey>`。
  - 如果您輸入 `/session main`，TUI 會將其展開為 `agent:<currentAgent>:main`。
  - 如果您輸入 `/session agent:other:main`，您會明確切換到該代理工作階段。
- 工作階段範圍：
  - `per-sender` (預設)：每個代理都有多個工作階段。
  - `global`：TUI 始終使用 `global` 工作階段 (選擇器可能為空)。
- 當前的代理 + 工作階段始終顯示在底部。

## 發送 + 傳遞

- 訊息會發送到 Gateway；預設情況下不會傳遞給供應商。
- 開啟傳遞：
  - `/deliver on`
  - 或設定面板
  - 或以 `openclaw tui --deliver` 開始

## 選擇器 + 覆蓋層

- 模型選擇器：列出可用模型並設定工作階段覆寫。
- 代理選擇器：選擇不同的代理。
- 工作階段選擇器：僅顯示當前代理的工作階段。
- 設定：切換傳遞、工具輸出展開和思考可見性。

## 鍵盤快捷鍵

- Enter：發送訊息
- Esc：中止執行中
- Ctrl+C：清除輸入 (按兩次以退出)
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：代理選擇器
- Ctrl+P：工作階段選擇器
- Ctrl+O：切換工具輸出展開
- Ctrl+T：切換思考可見性 (重新載入歷史記錄)

## 斜線指令

核心：

- `/help`
- `/status`
- `/agent <id>` (或 `/agents`)
- `/session <key>` (或 `/sessions`)
- `/model <provider/model>` (或 `/models`)

Session 控制項：

- `/think <off|minimal|low|medium|high>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>` (別名：`/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Session 生命週期：

- `/new` 或 `/reset` (重設 session)
- `/abort` (中止正在執行的任務)
- `/settings`
- `/exit`

其他 Gateway 斜線指令 (例如 `/context`) 會轉發至 Gateway 並顯示為系統輸出。請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

## 本機 shell 指令

- 在行首加上 `!` 以在 TUI 主機上執行本機 shell 指令。
- TUI 在每次 session 時會提示一次以允許本機執行；若拒絕，則該 session 期間將停用 `!`。
- 指令會在 TUI 工作目錄中的全新非互動式 shell 中執行 (無持續性的 `cd`/env)。
- 單獨的 `!` 會作為一般訊息傳送；前置空格不會觸發本機執行。

## 工具輸出

- 工具呼叫會顯示為包含參數與結果的卡片。
- Ctrl+O 可切換折疊/展開檢視。
- 當工具執行時，部分更新會串流至同一張卡片中。

## 歷史記錄 + 串流

- 連線時，TUI 會載入最新的歷史記錄 (預設為 200 則訊息)。
- 串流回應會就地更新直到完成。
- TUI 也會監聽代理程式工具事件，以提供更豐富的工具卡片。

## 連線詳細資訊

- TUI 會向 Gateway 註冊為 `mode: "tui"`。
- 重新連線會顯示系統訊息；事件間隔會顯示於日誌中。

## 選項

- `--url <url>`：Gateway WebSocket URL (預設為 config 或 `ws://127.0.0.1:<port>`)
- `--token <token>`：Gateway token (如有需要)
- `--password <password>`: Gateway 密碼（如果需要）
- `--session <key>`: Session 金鑰（預設為 `main`，當範圍為全域時則為 `global`）
- `--deliver`: 將助手回覆傳遞給提供者（預設關閉）
- `--thinking <level>`: 覆寫發送的思考等級
- `--timeout-ms <ms>`: Agent 逾時時間，單位為毫秒（預設為 `agents.defaults.timeoutSeconds`）

注意：當您設定 `--url` 時，TUI 不會回退至設定檔或環境變數憑證。
請明確傳遞 `--token` 或 `--password`。缺少明確憑證是一種錯誤。

## 疑難排解

傳送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線且處於閒置/忙碌狀態。
- 檢查 Gateway 日誌：`openclaw logs --follow`。
- 確認 Agent 可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您預期在聊天頻道中收到訊息，請啟用傳遞功能（`/deliver on` 或 `--deliver`）。
- `--history-limit <n>`: 要載入的歷史記錄項目（預設 200）

## 疑難排解

- `disconnected`: 確保 Gateway 正在執行並且您的 `--url/--token/--password` 是正確的。
- 選擇器中沒有 Agent：請檢查 `openclaw agents list` 和您的路由設定。
- 空的 Session 選擇器：您可能處於全域範圍，或者還沒有任何 Session。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
