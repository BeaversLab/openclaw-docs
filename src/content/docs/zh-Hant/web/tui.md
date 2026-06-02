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
- 在配置文件中編寫設置後，`openclaw` 和 `openclaw crestodian` 也會使用此 TUI shell，並以 Crestodian 作為本地設置和修復聊天後端。

## 您看到的畫面

- 標頭：連線 URL、目前的 Agent、目前的 Session。
- 聊天紀錄：使用者訊息、助理回覆、系統通知、工具卡片。
- 狀態列：連線/執行狀態（connecting, running, streaming, idle, error）。
- 頁尾：連線狀態 + 代理 + 會話 + 模型 + 目標狀態 + 思考/快速/詳細/追蹤/推理 + Token 計數 + 遞送。
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
- 如果會話有[目標](/zh-Hant/tools/goal)，頁尾會顯示其精簡狀態，例如 `Pursuing goal`、`Goal paused (/goal resume)` 或 `Goal achieved`。
- 若在未指定 `--session` 的情況下啟動，如果該會話仍然存在，閘道模式的 TUI 會恢復相同閘道、代理和會話範圍的最後一個選定會話。傳遞 `--session`、`/session`、`/new` 或 `/reset` 仍保持顯式指定。

## 傳送 + 遞送

- 訊息會傳送到閘道；預設情況下不會遞送到提供者。
- TUI 是一個像 WebChat 一樣的內部來源介面，而不是通用的出站通道。需要 `tools.message` 才能顯示回覆的 Harness 可以使用無目標的 `message.send` 來滿足當前的 TUI 回合；顯式的提供者遞送仍然使用正常配置的通道，並且絕不會回退到 `lastChannel`。
- 開啟遞送功能：
  - `/deliver on`
  - 或設定面板
  - 或使用 `openclaw tui --deliver` 啟動

## 選擇器 + 覆蓋層

- 模型選擇器：列出可用模型並設定會話覆蓋。
- 代理選擇器：選擇不同的代理。
- 會話選擇器：顯示目前代理在過去 7 天內更新的最多 50 個會話。使用 `/session <key>` 跳轉到較舊的已知會話。
- 設定：切換遞送、工具輸出擴展和思考可見性。

## 鍵盤快捷鍵

- Enter：傳送訊息
- Esc：中止執行中
- Ctrl+C：清除輸入（按兩次以退出）
- Ctrl+D：退出
- Ctrl+L：模型選擇器
- Ctrl+G：代理選擇器
- Ctrl+P：會話選擇器
- Ctrl+O：切換工具輸出擴展
- Ctrl+T：切換思考可見性（重新載入歷史記錄）

## 斜線指令

核心：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

會話控制：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/trace <on|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/goal [status] | /goal start <objective> | /goal pause|resume|complete|block|clear`
- `/elevated <on|off|ask|full>` (別名： `/elev`)
- `/activation <mention|always>`
- `/deliver <on|off>`

Session 生命週期：

- `/new` 或 `/reset` (重置 session)
- `/abort` (中止正在執行的 run)
- `/settings`
- `/exit`

僅限本地模式：

- `/auth [provider]` 會在 TUI 內開啟供應商驗證/登入流程。

其他 Gateway 斜線指令 (例如 `/context`) 會被轉發至 Gateway 並顯示為系統輸出。請參閱 [Slash commands](/zh-Hant/tools/slash-commands)。

## 本地 shell 指令

- 在行首加上 `!` 以在 TUI 主機上執行本地 shell 指令。
- TUI 會在每個 session 開始時提示一次以允許本地執行；拒絕將會在該 session 中保持 `!` 停用。
- 指令會在 TUI 工作目錄中全新的非互動式 shell 中執行 (沒有持續性的 `cd`/env)。
- 本地 shell 指令會在其環境中接收 `OPENCLAW_SHELL=tui-local`。
- 單獨的 `!` 會作為一般訊息發送；前置空格不會觸發本地執行。

## 從本地 TUI 修復配置

當目前的配置已經通過驗證，且您希望
內嵌的 Agent 在同一台機器上檢查它、將其與文件進行比對，
並協助修復差異而不依賴正在執行的 Gateway 時，請使用本地模式。

如果 `openclaw config validate` 已經失敗，請先從 `openclaw configure`
或 `openclaw doctor --fix` 開始。 `openclaw chat` 無法繞過無效
配置防護機制。

典型迴圈：

1. 啟動本地模式：

```bash
openclaw chat
```

2. 詢問 Agent 您想要檢查的項目，例如：

```text
Compare my gateway auth config with the docs and suggest the smallest fix.
```

3. 使用本地 shell 指令取得確切的證據和驗證：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

4. 使用 `openclaw config set` 或 `openclaw configure` 套用特定的變更，然後重新執行 `!openclaw config validate`。
5. 如果 Doctor 建議進行自動遷移或修復，請檢視並執行 `!openclaw doctor --fix`。

提示：

- 比起手動編輯 `openclaw.json`，更建議使用 `openclaw config set` 或 `openclaw configure`。
- `openclaw docs "<query>"` 會搜尋來自同一台機器的即時文件索引。
- 當您需要結構化 Schema 和 SecretRef/可解析性錯誤時，`openclaw config validate --json` 非常實用。

## 工具輸出

- 工具呼叫會以卡片形式顯示，其中包含引數與結果。
- Ctrl+O 可在摺疊與展開視圖之間切換。
- 當工具執行時，部分更新會串流至同一張卡片。

## 終端機顏色

- TUI 會將助手內文文字保留在終端機的預設前景色中，因此深色和淺色終端機都能保持清晰可讀。
- 如果您的終端機使用淺色背景且自動偵測錯誤，請在啟動 `openclaw tui` 之前設定 `OPENCLAW_THEME=light`。
- 若要改為強制使用原始深色調色盤，請設定 `OPENCLAW_THEME=dark`。

## 歷史記錄 + 串流

- 連線時，TUI 會載入最新的歷史記錄（預設為 200 則訊息）。
- 串流回應會就地更新直到完成。
- TUI 也會監聽 Agent 工具事件，以提供更豐富的工具卡片。

## 連線詳情

- TUI 會向 Gateway 註冊為 `mode: "tui"`。
- 重新連線會顯示系統訊息；事件間隙會在日誌中顯示。

## 選項

- `--local`：針對本機內嵌 Agent 執行環境執行
- `--url <url>`：Gateway WebSocket URL（預設為設定或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway Token（如果需要）
- `--password <password>`：Gateway 密碼（如果需要）
- `--session <key>`：Session 金鑰（預設：`main`，若範圍為全域則為 `global`）
- `--deliver`：將助理回覆傳送給提供者（預設關閉）
- `--thinking <level>`：覆寫傳送時的思考等級
- `--message <text>`：連線後傳送初始訊息
- `--timeout-ms <ms>`：Agent 逾時時間，單位為毫秒（預設為 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`：要載入的歷史記錄條目（預設 `200`）

<Warning>當您設定 `--url` 時，TUI 不會回退到設定檔或環境變數的憑證。請明確傳遞 `--token` 或 `--password`。缺少明確憑證會導致錯誤。在本機模式下，請勿傳遞 `--url`、`--token` 或 `--password`。</Warning>

## 疑難排解

傳送訊息後沒有輸出：

- 在 TUI 中執行 `/status` 以確認 Gateway 已連線且處於閒置/忙碌狀態。
- 檢查 Gateway 日誌：`openclaw logs --follow`。
- 確認代理程式可以執行：`openclaw status` 和 `openclaw models status`。
- 如果您預期在聊天頻道中收到訊息，請啟用傳遞（`/deliver on` 或 `--deliver`）。

## 連線疑難排解

- `disconnected`：確保 Gateway 正在執行，並且您的 `--url/--token/--password` 是正確的。
- 選擇器中沒有代理程式：請檢查 `openclaw agents list` 和您的路由設定。
- 空白的工作階段選擇器：您可能處於全域範圍內，或者還沒有任何工作階段。

## 相關資訊

- [控制介面 (Control UI)](/zh-Hant/web/control-ui) — 基於網頁的控制介面
- [設定 (Config)](/zh-Hant/cli/config) — 檢查、驗證和編輯 `openclaw.json`
- [醫生 (Doctor)](/zh-Hant/cli/doctor) — 引導式修復和遷移檢查
- [CLI 參考資料 (CLI Reference)](/zh-Hant/cli) — 完整的 CLI 指令參考資料
