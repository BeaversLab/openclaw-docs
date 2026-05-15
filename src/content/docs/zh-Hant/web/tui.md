---
summary: "Terminal UI (TUI)：連線至 Gateway 或以嵌入式模式在本地執行"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
title: "TUI"
---

## 快速開始

### Gateway 模式

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

### 本機模式

在沒有 Gateway 的情況下執行 TUI：

```bash
openclaw chat
# or
openclaw tui --local
```

備註：

- `openclaw chat` 和 `openclaw terminal` 是 `openclaw tui --local` 的別名。
- `--local` 不能與 `--url`、`--token` 或 `--password` 結合使用。
- 本機模式直接使用內建的代理程式執行環境。大多數本機工具可以使用，但僅限 Gateway 的功能無法使用。
- `openclaw` 和 `openclaw crestodian` 也使用此 TUI shell，並以 Crestodian 作為本機設定和修復聊天後端。

## 您看到的畫面

- 標頭：連線 URL、目前的 Agent、目前的 Session。
- 聊天紀錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態（connecting, running, streaming, idle, error）。
- 頁尾：連線狀態 + agent + session + model + think/fast/verbose/trace/reasoning + token 計數 + deliver。
- 輸入：帶有自動完成功能的文字編輯器。

## 心智模型：agents + sessions

- 代理程式是唯一的識別碼（例如 `main`、`research`）。Gateway 會公開該清單。
- Session 屬於目前的 Agent。
- Session 金鑰會被儲存為 `agent:<agentId>:<sessionKey>`。
  - 如果您輸入 `/session main`，TUI 會將其展開為 `agent:<currentAgent>:main`。
  - 如果您輸入 `/session agent:other:main`，您會明確切換到該代理程式 session。
- Session 範圍：
  - `per-sender`（預設值）：每個代理程式都有許多 session。
  - `global`：TUI 總是使用 `global` session（選擇器可能為空）。
- 目前的 agent + session 始終顯示在頁尾中。
- 當不使用 `--session` 啟動時，如果該對話階段仍然存在，閘道模式 TUI 會恢復相同閘道、代理程式和對話階段範圍的最後選取對話階段。傳遞 `--session`、`/session`、`/new` 或 `/reset` 則保持明確指定。

## 傳送與傳遞

- 訊息會傳送到閘道；預設情況下不會傳遞給提供者。
- 開啟傳遞功能：
  - `/deliver on`
  - 或設定面板
  - 或使用 `openclaw tui --deliver` 啟動

## 選擇器與疊加層

- 模型選擇器：列出可用的模型並設定對話階段覆蓋。
- 代理程式選擇器：選擇不同的代理程式。
- 對話階段選擇器：顯示目前代理程式在過去 7 天內更新的最多 50 個對話階段。使用 `/session <key>` 跳轉到較舊的已知對話階段。
- 設定：切換傳遞、工具輸出展開和思考過程的可見性。

## 鍵盤快捷鍵

- Enter：傳送訊息
- Esc：中止正在執行的作業
- Ctrl+C：清除輸入（按兩次以退出）
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：代理程式選擇器
- Ctrl+P：對話階段選擇器
- Ctrl+O：切換工具輸出展開
- Ctrl+T：切換思考過程可見性（會重新載入歷史記錄）

## 斜線指令

核心：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

對話階段控制：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（別名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

對話階段生命週期：

- `/new` 或 `/reset`（重設對話階段）
- `/abort`（中止正在執行的作業）
- `/settings`
- `/exit`

僅限本地模式：

- `/auth [provider]` 在 TUI 中開啟提供者授權/登入流程。

其他 Gateway 斜線指令（例如 `/context`）會被轉發到 Gateway 並顯示為系統輸出。請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。

## 本機 Shell 指令

- 在行首加上 `!` 即可在 TUI 主機上執行本機 Shell 指令。
- TUI 在每個工作階段會提示一次以允許本機執行；若拒絕，該工作階段將保持 `!` 停用狀態。
- 指令會在 TUI 工作目錄中於一個全新的、非互動式 Shell 中執行（沒有持續性的 `cd`/env）。
- 本機 Shell 指令會在其環境中接收 `OPENCLAW_SHELL=tui-local`。
- 單獨的 `!` 會作為一般訊息傳送；前置空格不會觸發本機執行。

## 從本機 TUI 修復設定

當目前的設定已通過驗證，且您希望嵌入式 Agent 在同一台機器上檢查它、將其與文件進行比較，並協助修復差異而不依賴執行中的 Gateway 時，請使用本機模式。

如果 `openclaw config validate` 已經失敗，請先從 `openclaw configure` 或 `openclaw doctor --fix` 開始。`openclaw chat` 無法繞過無效設定的防護機制。

典型循環：

1. 啟動本機模式：

```bash
openclaw chat
```

2. 告知 Agent 您想要檢查的內容，例如：

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. 使用本機 Shell 指令以取得確切證據和驗證：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. 使用 `openclaw config set` 或 `openclaw configure` 套用小幅變更，然後重新執行 `!openclaw config validate`。
5. 如果 Doctor 建議進行自動遷移或修復，請檢閱並執行 `!openclaw doctor --fix`。

提示：

- 優先使用 `openclaw config set` 或 `openclaw configure`，而非手動編輯 `openclaw.json`。
- `openclaw docs "<query>"` 會從同一台機器搜尋即時文件索引。
- 當您需要結構化 Schema 以及 SecretRef/可解析性錯誤時，`openclaw config validate --json` 很有用。

## 工具輸出

- 工具呼叫會以卡片形式顯示，其中包含引數和結果。
- Ctrl+O 可在收合與展開檢視之間切換。
- 當工具執行時，部分更新會串流至同一張卡片中。

## 終端機顏色

- TUI 會將助理的內文文字保留在終端機的預設前景色中，讓深色和淺色終端機都能保持可讀性。
- 如果您的終端機使用淺色背景且自動偵測錯誤，請在啟動 `openclaw tui` 之前設定 `OPENCLAW_THEME=light`。
- 若要改用原本的深色調色盤，請設定 `OPENCLAW_THEME=dark`。

## 歷史記錄 + 串流

- 連線時，TUI 會載入最新的歷史記錄（預設為 200 則訊息）。
- 串流回應會就地更新直到完成。
- TUI 也會監聽代理程式工具事件，以提供更豐富的工具卡片。

## 連線詳細資訊

- TUI 會向 Gateway 註冊為 `mode: "tui"`。
- 重新連線會顯示系統訊息；事件間隙會顯示於日誌中。

## 選項

- `--local`：針對本機內嵌的代理程式執行環境執行
- `--url <url>`：Gateway WebSocket URL（預設為設定或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway 權杖（若有需要）
- `--password <password>`：Gateway 密碼（若有需要）
- `--session <key>`：Session 金鑰（預設：`main`，若範圍為全域則為 `global`）
- `--deliver`：將助理回覆傳送給提供者（預設關閉）
- `--thinking <level>`：覆寫傳送的思考層級
- `--message <text>`：連線後傳送初始訊息
- `--timeout-ms <ms>`：代理程式逾時時間，單位為毫秒（預設為 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`：要載入的歷史記錄條目數（預設 `200`）

<Warning>當您設定 `--url` 時，TUI 不會回退至設定或環境認證。請明確傳遞 `--token` 或 `--password`。缺少明確的認證是一項錯誤。在本機模式下，請勿傳遞 `--url`、`--token` 或 `--password`。</Warning>

## 疑難排解

傳送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線且處於閒置/忙碌狀態。
- 檢查 Gateway 日誌：`openclaw logs --follow`。
- 確認代理程式可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您預期在聊天頻道中收到訊息，請啟用傳遞（`/deliver on` 或 `--deliver`）。

## 連線疑難排解

- `disconnected`：確保 Gateway 正在運作，且您的 `--url/--token/--password` 是正確的。
- 選取器中沒有 Agent：請檢查 `openclaw agents list` 和您的路由設定。
- 空的 Session 選取器：您可能處於全域範圍，或者尚未有任何 Session。

## 相關

- [Control UI](/zh-Hant/web/control-ui) — 基於 Web 的控制介面
- [Config](/zh-Hant/cli/config) — 檢查、驗證和編輯 `openclaw.json`
- [Doctor](/zh-Hant/cli/doctor) — 引導式修復和遷移檢查
- [CLI Reference](/zh-Hant/cli) — 完整的 CLI 指令參考
