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

一旦核准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新核准。請參閱[裝置 CLI](/zh-Hant/cli/devices)以了解權杖輪換和撤銷。

**備註：**

- 直接本機回送瀏覽器連線（`127.0.0.1` / `localhost`）會自動核准。
- 來自 Tailnet 和區域網路 (LAN) 的瀏覽器連線仍然需要明確核准，即使它們來自同一台機器。
- 每個瀏覽器設定檔都會產生一個唯一的裝置 ID，因此切換瀏覽器或清除瀏覽器資料將需要重新配對。

## 語言支援

控制 UI 可以根據您的瀏覽器地區設定在首次載入時進行本地化。若要稍後覆寫它，請開啟 **Overview -> Gateway Access -> Language**。地區設定選擇器位於 Gateway Access 卡片中，而非 Appearance 底下。

- 支援的地區設定：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`tr`、`uk`、`id`、`pl`
- 非英文翻譯會在瀏覽器中延遲載入。
- 選取的語言地區會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 缺少的翻譯鍵會回退為英文。

## 它目前可以做到什麼

- 透過 Gateway WS 與模型聊天 (`chat.history`、`chat.send`、`chat.abort`、`chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (代理程式事件)
- 頻道：內建以及捆綁/外部外掛頻道狀態、QR 登入和個別頻道設定 (`channels.status`、`web.login.*`、`config.patch`)
- 實例：存在清單 + 重新整理 (`system-presence`)
- 會話：清單 + 每個會話的模型/思考/快速/詳細/追蹤/推理覆寫 (`sessions.list`、`sessions.patch`)
- 夢境：做夢狀態、啟用/停用切換，以及夢境日誌閱讀器 (`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`)
- Cron 工作：清單/新增/編輯/執行/啟用/停用 + 執行歷史記錄 (`cron.*`)
- 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)
- 節點：清單 + 權限 (`node.list`)
- 執行核准：編輯閘道或節點允許清單 + 針對 `exec host=gateway/node` 的詢問策略 (`exec.approvals.*`)
- 設定：檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`、`config.set`)
- 設定：套用 + 驗證後重新啟動 (`config.apply`) 並喚醒最後一個使用中的會話
- 設定寫入包含基底雜湊防護，以防止覆寫並行編輯
- 設定寫入 (`config.set`/`config.apply`/`config.patch`) 也會對提交的設定負載中的參照進行預先檢查作用中的 SecretRef 解析；未解析的作用中已提交參照會在寫入前被拒絕
- Config schema + form rendering (`config.schema` / `config.schema.lookup`,
  including field `title` / `description`, matched UI hints, immediate child
  summaries, docs metadata on nested object/wildcard/array/composition nodes,
  plus plugin + channel schemas when available); Raw JSON editor is
  available only when the snapshot has a safe raw round-trip
- 如果快照無法安全地往返原始文字，Control UI 將強制使用表單模式並禁用該快照的原始模式
- 結構化的 SecretRef 物件值在表單文字輸入中以唯讀方式呈現，以防止意外地將物件轉換為字串而損毀
- Debug: status/health/models snapshots + event log + manual RPC calls (`status`, `health`, `models.list`)
- Logs: live tail of gateway file logs with filter/export (`logs.tail`)
- Update: run a package/git update + restart (`update.run`) with a restart report

Cron jobs 面板備註：

- 對於隔離任務，傳送預設為 announce summary。如果您只想內部執行，可以切換為 none。
- 當選擇 announce 時，會顯示 Channel/target 欄位。
- Webhook mode uses `delivery.mode = "webhook"` with `delivery.to` set to a valid HTTP(S) webhook URL.
- 對於 main-session 任務，提供 webhook 和 none 傳送模式。
- 進階編輯控制項包括 delete-after-run、清除 agent 覆寫、cron exact/stagger 選項、
  agent model/thinking 覆寫，以及盡力而為傳送切換開關。
- 表單驗證是內聯的，顯示欄位級別的錯誤；無效值會停用儲存按鈕，直到修正為止。
- Set `cron.webhookToken` to send a dedicated bearer token, if omitted the webhook is sent without an auth header.
- Deprecated fallback: stored legacy jobs with `notify: true` can still use `cron.webhook` until migrated.

## Chat 行為

- `chat.send` is **non-blocking**: it acks immediately with `{ runId, status: "started" }` and the response streams via `chat` events.
- Re-sending with the same `idempotencyKey` returns `{ status: "in_flight" }` while running, and `{ status: "ok" }` after completion.
- `chat.history` responses are size-bounded for UI safety. When transcript entries are too large, Gateway may truncate long text fields, omit heavy metadata blocks, and replace oversized messages with a placeholder (`[chat.history omitted: message too large]`).
- `chat.history` 也會從可見的助理文字中去除僅供顯示的內聯指令標籤（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊），以及洩漏的 ASCII/全形模型控制權杖，並且會省略整個可見文字僅包含確切靜默權杖 `NO_REPLY` / `no_reply` 的助理條目。
- `chat.inject` 會將助理附註附加到會話紀錄並廣播 `chat` 事件以進行僅限 UI 的更新（無代理執行，無通道傳送）。
- 聊天標頭的模型和思考選取器會透過 `sessions.patch` 立即修補使用中的會話；它們是持續性的會話覆寫，而非僅限單次回覆的傳送選項。
- 停止：
  - 點擊 **Stop**（呼叫 `chat.abort`）
  - 輸入 `/stop`（或獨立的中止詞組，例如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以中止非同步作業
  - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該會話的所有執行中作業
- 中止部分保留：
  - 當執行中止時，部分助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字持久化到對話記錄歷史中
  - 持久化的條目包含中止元數據，因此對話記錄的使用者可以區分中止的部分內容與正常完成輸出

## 託管嵌入

助理訊息可以使用 `[embed ...]` 簡碼在行內呈現託管的網頁內容。iframe 沙盒原則由
`gateway.controlUi.embedSandbox` 控制：

- `strict`：停用託管嵌入內的腳本執行
- `scripts`：允許互動式嵌入，同時保持來源隔離；這是
  預設值，通常足以用於自包含的瀏覽器遊戲/小工具
- `trusted`：在 `allow-scripts` 之上新增 `allow-same-origin`，針對
  故意需要更強權限的同站文件

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

僅當嵌入文件確實需要同源行為時才使用 `trusted`。對於大多數代理生成的遊戲和互動畫布，`scripts` 是更安全的選擇。

絕對外部 `http(s)` 嵌入 URL 預設保持封鎖狀態。如果您有意要 `[embed url="https://..."]` 載入第三方頁面，請設定 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 存取（建議）

### 整合式 Tailscale Serve（首選）

將 Gateway 保持在 loopback，並讓 Tailscale Serve 使用 HTTPS 對其進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭 (`tailscale-user-login`) 進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭匹配來驗證身分，並且僅當請求透過 Tailscale 的 `x-forwarded-*` 標頭到達 loopback 時才接受這些請求。如果您想即使對於 Serve 流量也要求明確的共享金鑰憑證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或 `"password"`。
對於該非同步 Serve 身分路徑，相同客戶端 IP 和驗證範圍的失敗驗證嘗試會在速率限制寫入之前進行序列化。因此，來自同一個瀏覽器的併發錯誤重試可能會在第二個請求上顯示 `retry later`，而不是兩個普通的並行競爭不匹配。
無 Token 的 Serve 驗證假設 gateway 主機是受信任的。如果不受信任的本機程式碼可能會在該主機上執行，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/` (或您設定的 `gateway.controlUi.basePath`)

將匹配的共用金鑰貼上到 UI 設定中（傳送為 `connect.params.auth.token` 或 `connect.params.auth.password`）。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，
瀏覽器將在**不安全的上下文**中運作並阻擋 WebCrypto。根據預設，
OpenClaw 會**阻擋**沒有裝置身分的控制 UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 相容性與 `gateway.controlUi.allowInsecureAuth=true`
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功進行操作員控制 UI 驗證
- 緊急破門 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修復方法：** 使用 HTTPS (Tailscale Serve) 或在本地開啟 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在 gateway 主機上)

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

`allowInsecureAuth` 僅是一個本地相容性切換開關：

- 它允許 localhost 控制 UI 工作階段在不安全的 HTTP 上下文中
  無需裝置身分即可繼續。
- 它不會繞過配對檢查。
- 它不會放寬遠端 (非 localhost) 裝置身分要求。

**僅限緊急破門：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 會停用控制 UI 裝置身分檢查，這會導致
嚴重的安全性降級。緊急使用後請盡快還原。

受信任 Proxy 說明：

- 成功的受信任 Proxy 驗證可以允許沒有
  裝置身分的 **操作員** 控制 UI 工作階段
- 這並**不**適用於節點角色 (node-role) 的控制 UI 工作階段
- 相同主機的迴路反向 Proxy 仍然無法滿足受信任 Proxy 驗證；請參閱
  [受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以取得 HTTPS 設定指南。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下指令建置：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

選用的絕對基礎路徑 (當您需要固定的資產 URL 時)：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

對於本地開發 (獨立的 dev server)：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然後將 UI 指向您的 Gateway WS URL (例如 `ws://127.0.0.1:18789`)。

## 除錯/測試：dev server + 遠端 Gateway

控制 UI 為靜態檔案；WebSocket 目標可設定，且可以
與 HTTP 來源不同。當您想要在本地使用 Vite dev server
但 Gateway 在其他地方運作時，這非常方便。

1. 啟動 UI dev server：`pnpm ui:dev`
2. 開啟類似以下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

選用的一次性驗證 (如果需要)：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

說明：

- `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
- 應盡可能透過 URL 片段（`#token=...`）傳遞 `token`。片段不會傳送到伺服器，這可以避免請求日誌和 Referer 洩漏。舊版的 `?token=` 查詢參數為了相容性仍會被匯入一次，但僅作為備用方案，並會在啟動後立即被移除。
- `password` 僅保存在記憶體中。
- 當設定了 `gatewayUrl` 時，UI 不會回退到設定檔或環境變數的認證資訊。
  請明確提供 `token`（或 `password`）。缺少明確的認證資訊會導致錯誤。
- 當 Gateway 位於 TLS（Tailscale Serve、HTTPS 代理等）之後時，請使用 `wss://`。
- 為了防止點擊劫持，`gatewayUrl` 僅在頂層視窗中被接受（不允許嵌入式）。
- 非本機迴路的 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`
  （完整的來源）。這包括遠端開發設定。
- 除了在嚴格控制的
  本地測試環境外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這意味著允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host 標頭來源回退模式，但這是一個危險的安全模式。

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

遠端存取設定詳細資訊：[Remote access](/zh-Hant/gateway/remote)。

## 相關

- [Dashboard](/zh-Hant/web/dashboard) — gateway 儀表板
- [WebChat](/zh-Hant/web/webchat) — 基於瀏覽器的聊天介面
- [TUI](/zh-Hant/web/tui) — 終端機使用者介面
- [Health Checks](/zh-Hant/gateway/health) — gateway 健康監控
