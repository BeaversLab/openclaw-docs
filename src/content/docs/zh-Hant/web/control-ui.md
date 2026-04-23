---
summary: "適用於 Gateway 的瀏覽器控制 UI（聊天、節點、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制 UI"
---

# Control UI (瀏覽器)

Control UI 是一個由 Gateway 提供的輕量級 **Vite + Lit** 單頁應用程式：

- 預設值：`http://<host>:18789/`
- 可選前綴：設定 `gateway.controlUi.basePath`（例如 `/openclaw`）

它會在相同連接埠上**直接與 Gateway WebSocket 通訊**。

## 快速開啟（本機）

如果 Gateway 正在同一台電腦上執行，請開啟：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果頁面載入失敗，請先啟動 Gateway：`openclaw gateway`。

驗證資訊會在 WebSocket 交握期間透過以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 當 `gateway.auth.allowTailscale: true` 時的 Tailscale Serve 身份標頭
- 當 `gateway.auth.mode: "trusted-proxy"` 時的 trusted-proxy 身份標頭

儀表板設定面板會保留目前瀏覽器分頁階段和選定的 Gateway URL 的權杖；密碼不會被保存。初次連線時，引導程序通常會產生用於共享金鑰驗證的 Gateway 權杖，但如果 `gateway.auth.mode` 是 `"password"`，密碼驗證也可以使用。

## 裝置配對（首次連線）

當您從新的瀏覽器或裝置連線到控制 UI 時，即使您在具有 `gateway.auth.allowTailscale: true` 的同一 Tailnet 上，Gateway 也需要**一次性配對核准**。這是為了防止未經授權存取的安全性措施。

**您會看到的畫面：**「disconnected (1008): pairing required」（已中斷連線 (1008)：需要配對）

**要核准裝置：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果瀏覽器以變更後的驗證詳細資料（角色/範圍/公開金鑰）重試配對，先前的待處理請求將被取代，並建立一個新的 `requestId`。請在核准前重新執行 `openclaw devices list`。

如果瀏覽器已經配對，並且您將其從唯讀存取權限變更為
寫入/管理員存取權限，這將被視為權限升級，而不是靜默
重新連線。OpenClaw 會保持舊的批准處於啟用狀態，阻止
更廣泛的重新連線，並要求您明確批准新的範圍集。

一旦獲得批准，該裝置將被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，
否則將不需要重新批准。請參閱
[Devices CLI](/zh-Hant/cli/devices) 以了解 Token 輪換和撤銷。

**備註：**

- 直接的本機回送瀏覽器連線 (`127.0.0.1` / `localhost`) 會
  自動獲得批准。
- 來自 Tailnet 和 LAN 的瀏覽器連線仍然需要明確批准，即使
  它們來自同一台機器。
- 每個瀏覽器設定檔都會產生唯一的裝置 ID，因此切換瀏覽器或
  清除瀏覽器資料將需要重新配對。

## 語言支援

控制 UI 可以在首次載入時根據您的瀏覽器語言地區進行本地化。
若稍後要變更，請開啟 **Overview -> Gateway Access -> Language**。
地區選擇器位於 Gateway Access 卡片中，而不是在 Appearance 下。

- 支援的地區：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`tr`、`uk`、`id`、`pl`
- 非英語翻�會在瀏覽器中以懶加載方式載入。
- 選取的地區會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 遺漏的翻譯鍵會回退至英文。

## 它目前的功能

- 透過 Gateway WS 與模型聊天 (`chat.history`、`chat.send`、`chat.abort`、`chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (agent 事件)
- 頻道：內建以及捆綁/外掛程式頻道狀態、QR 登入和各頻道設定 (`channels.status`、`web.login.*`、`config.patch`)
- Instances: presence list + refresh (`system-presence`)
- Sessions: list + per-session model/thinking/fast/verbose/trace/reasoning overrides (`sessions.list`, `sessions.patch`)
- Dreams: dreaming status, enable/disable toggle, and Dream Diary reader (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Cron jobs: list/add/edit/run/enable/disable + run history (`cron.*`)
- Skills: status, enable/disable, install, API key updates (`skills.*`)
- Nodes: list + caps (`node.list`)
- Exec approvals: edit gateway or node allowlists + ask policy for `exec host=gateway/node` (`exec.approvals.*`)
- Config: view/edit `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Config: apply + restart with validation (`config.apply`) and wake the last active session
- Config writes include a base-hash guard to prevent clobbering concurrent edits
- Config writes (`config.set`/`config.apply`/`config.patch`) also preflight active SecretRef resolution for refs in the submitted config payload; unresolved active submitted refs are rejected before write
- Config schema + form rendering (`config.schema` / `config.schema.lookup`,
  including field `title` / `description`, matched UI hints, immediate child
  summaries, docs metadata on nested object/wildcard/array/composition nodes,
  plus plugin + channel schemas when available); Raw JSON editor is
  available only when the snapshot has a safe raw round-trip
- If a snapshot cannot safely round-trip raw text, Control UI forces Form mode and disables Raw mode for that snapshot
- Structured SecretRef object values are rendered read-only in form text inputs to prevent accidental object-to-string corruption
- Debug: status/health/models snapshots + event log + manual RPC calls (`status`, `health`, `models.list`)
- 日誌：即時追蹤 Gateway 檔案日誌並支援過濾/匯出 (`logs.tail`)
- 更新：執行套件/Git 更新並重新啟動 (`update.run`)，隨附重新啟動報告

Cron 工作面板註記：

- 對於獨立工作，傳送方式預設為公告摘要。如果您僅用於內部執行，可以切換為無。
- 選取公告時會顯示頻道/目標欄位。
- Webhook 模式使用 `delivery.mode = "webhook"` 並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於主工作階段工作，可使用 webhook 和無傳送模式。
- 進階編輯控制項包含執行後刪除、清除代理覆寫、cron 精確/交錯選項、代理模型/思考覆寫，以及盡力而為傳送切換開關。
- 表單驗證為內聯顯示，包含欄位層級錯誤；無效值會停用儲存按鈕，直到修正為止。
- 設定 `cron.webhookToken` 以傳送專屬的 bearer token，若省略則 webhook 會在無驗證標頭的情況下傳送。
- 已棄用的後援：具有 `notify: true` 的儲存舊版工作仍可使用 `cron.webhook` 直到遷移為止。

## 聊天行為

- `chat.send` 為 **非阻斷式**：它會立即以 `{ runId, status: "started" }` 確認且回應會透過 `chat` 事件串流。
- 使用相同的 `idempotencyKey` 重新傳送會在執行時傳回 `{ status: "in_flight" }`，並在完成後傳回 `{ status: "ok" }`。
- `chat.history` 回應會因 UI 安全而限制大小。當文字記錄項目過大時，Gateway 可能會截斷長文字欄位、省略龐大的中繼資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.history` 也會從可見的助理文字中移除僅供顯示的內聯指令標籤（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊），以及外洩的 ASCII/全形模型控制權杖，並且會省略其整個可見文字僅為確切的靜默權杖 `NO_REPLY` / `no_reply` 的助理條目。
- `chat.inject` 會將助理備註附加到會話紀錄，並廣播 `chat` 事件以進行僅限 UI 的更新（無 Agent 執行，無通道傳遞）。
- 聊天標頭的模型和思考選擇器會透過 `sessions.patch` 立即修補活動會話；它們是持久的會話覆寫，而非僅限單次輪次的傳送選項。
- 停止：
  - 點擊 **Stop** （呼叫 `chat.abort`）
  - 輸入 `/stop` （或獨立的中止短語，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以帶外中止
  - `chat.abort` 支援 `{ sessionKey }` （無 `runId`）以中止該會話的所有活動執行
- 中止部分保留：
  - 當執行被中止時，部分的助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將被中止的部分助理文字持久化到紀錄歷史中
  - 持久化的條目包含中止元數據，以便紀錄消費者能區分中止的部分與正常完成輸出

## 託管內嵌

助理訊息可以使用 `[embed ...]`
短代碼內聯呈現託管的網頁內容。iframe sandbox 原則由
`gateway.controlUi.embedSandbox` 控制：

- `strict`：停用託管內嵌中的腳本執行
- `scripts`: 允許互動式嵌入，同時保持來源隔離；這是
  預設值，對於獨立的瀏覽器遊戲/小工具通常已足夠
- `trusted`: 在 `allow-scripts` 之上為同站
  文件新增 `allow-same-origin`，以滿足刻意需要更強權限的情況

範例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

僅當嵌入文件確實需要同源行為時才使用 `trusted`。對於大多數代理生成的遊戲和互動式畫布，`scripts` 是
更安全的選擇。

絕對外部 `http(s)` 嵌入 URL 預設保持封鎖。如果您
刻意希望 `[embed url="https://..."]` 載入第三方頁面，請設定
`gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 存取（推薦）

### 整合式 Tailscale Serve（首選）

將 Gateway 保持在 loopback 上，並讓 Tailscale Serve 以 HTTPS 對其進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath`）

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭
(`tailscale-user-login`) 進行驗證。OpenClaw
會透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址
並將其與標頭進行比對來驗證身分，並且僅在請求透過 Tailscale 的 `x-forwarded-*` 標頭
命中 loopback 時接受這些請求。如果您想對 Serve 流量也要求明確的共享金鑰
認證，請設定
`gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或
`"password"`。
對於該非同步 Serve 身分路徑，相同客戶端 IP
和驗證範圍的失敗驗證嘗試會在速率限制寫入前進行序列化。因此，來自同一瀏覽器的並發失敗重試
可能會在第二次請求時顯示 `retry later`
，而不是兩個單純的比對失敗並行競爭。
無 Token 的 Serve 驗證假設 gateway 主機是受信任的。如果該主機上可能執行不受信任的本地
程式碼，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/` （或您設定的 `gateway.controlUi.basePath`）

將匹配的共用金鑰貼入 UI 設定中（作為 `connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

## 不安全的 HTTP

如果您透過純 HTTP （`http://<lan-ip>` 或 `http://<tailscale-ip>`）開啟儀表板，
瀏覽器將在 **非安全環境** 中執行並封鎖 WebCrypto。根據預設，
OpenClaw 會 **封鎖** 沒有裝置身分的控制 UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 相容性，適用於 `gateway.controlUi.allowInsecureAuth=true`
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功進行操作員控制 UI 驗證
- 應急 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的解決方法：** 使用 HTTPS （Tailscale Serve）或在本地開啟 UI：

- `https://<magicdns>/` （Serve）
- `http://127.0.0.1:18789/` （在 Gateway 主機上）

**不安全驗證切換行為：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` 僅為本機相容性切換：

- 它允許 localhost 控制 UI 會話在非安全的 HTTP 環境中
  無需裝置身分即可繼續進行。
- 它不會略過配對檢查。
- 它不會放寬遠端 （非 localhost） 裝置身分的要求。

**僅限應急：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 會停用控制 UI 裝置身分檢查，
這會嚴重降低安全性。請在緊急使用後迅速還原。

信任代理 注意事項：

- 成功的信任代理 驗證可允許 **操作員** 控制 UI 會話
  無需裝置身分
- 這 **不** 適用於節點角色 控制 UI 會話
- 相同主機的迴路反向代理仍不滿足信任代理 驗證；請參閱
  [信任代理 驗證](/zh-Hant/gateway/trusted-proxy-auth)

關於 HTTPS 設定指南，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

## 建置 UI

Gateway 會從 `dist/control-ui` 提供靜態檔案。使用以下指令進行建置：

```bash
pnpm ui:build
```

選用的絕對基底 （當您想要固定的資產 URL 時）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

若要進行本機開發 （獨立的開發伺服器）：

```bash
pnpm ui:dev
```

接著將 UI 指向您的 Gateway WS URL （例如 `ws://127.0.0.1:18789`）。

## 除錯/測試：開發伺服器 + 遠端 Gateway

控制 UI 是靜態檔案；WebSocket 目標是可配置的，且可以與 HTTP 來源不同。當您想要在本地使用 Vite 開發伺服器但 Gateway 在其他地方運行時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟類似這樣的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可選的一次性授權（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

備註：

- `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
- 應盡可能透過 URL 片段 (`#token=...`) 傳遞 `token`。片段不會傳送到伺服器，這避免了請求日誌和 Referer 洩漏。舊版 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為後備方案，並會在啟動後立即剔除。
- `password` 僅儲存在記憶體中。
- 當設定了 `gatewayUrl` 時，UI 不會後退到使用設定檔或環境變數的憑證。
  請明確提供 `token` (或 `password`)。缺少明確憑證視為錯誤。
- 當 Gateway 位於 TLS (Tailscale Serve, HTTPS 代理等) 之後時，請使用 `wss://`。
- 為了防止點擊劫持，`gatewayUrl` 僅在頂層視窗（非嵌入）中被接受。
- 非本機回環 的控制 UI 部署必須明確設定
  `gateway.controlUi.allowedOrigins`（完整來源）。這包括遠端開發設置。
- 除了嚴格控制的
  本地測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host 標頭來源後退模式，但這是一種危險的安全模式。

範例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

遠端存取設置詳細資訊：[Remote access](/zh-Hant/gateway/remote)。

## 相關

- [Dashboard](/zh-Hant/web/dashboard) — gateway 儀表板
- [WebChat](/zh-Hant/web/webchat) — 基於瀏覽器的聊天介面
- [TUI](/zh-Hant/web/tui) — 終端機使用者介面
- [Health Checks](/zh-Hant/gateway/health) — gateway 健康監控
