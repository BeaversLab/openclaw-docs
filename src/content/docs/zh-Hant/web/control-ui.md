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

一旦批准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新批准。請參閱 [Devices CLI](/zh-Hant/cli/devices) 以了解令牌輪換和撤銷。

**備註：**

- 直接的本機回送瀏覽器連線 (`127.0.0.1` / `localhost`) 會
  自動獲得批准。
- 來自 Tailnet 和 LAN 的瀏覽器連線仍然需要明確批准，即使
  它們來自同一台機器。
- 每個瀏覽器設定檔都會產生唯一的裝置 ID，因此切換瀏覽器或
  清除瀏覽器資料將需要重新配對。

## 個人身份（瀏覽器本地）

Control UI 支援每個瀏覽器的個人身份——顯示名稱和大頭貼，附加到外送訊息上以便在共享會話中進行歸屬識別。此身份儲存在瀏覽器儲存空間中，範圍僅限於目前的瀏覽器設定檔，除非您隨請求明確提交，否則不會離開 Gateway 主機。

- 身份僅限於**瀏覽器本地**。它不會同步到其他裝置，也不屬於 Gateway 設定檔的一部分。
- 清除網站資料或切換瀏覽器會將身份重置為空；Control UI 不會嘗試從伺服器狀態重建它。
- 除了您實際發送的訊息上正常的逐字稿作者權中繼資料外，沒有任何關於個人身份的資料會被儲存在伺服器端。

## 執行時設定端點

Control UI 從 `/__openclaw/control-ui-config.json` 獲取其執行時設定。該端點受到與其餘 HTTP 表面相同的 Gateway 驗證保護：未經驗證的瀏覽器無法獲取它，成功的獲取需要已經有效的 Gateway 令牌/密碼、Tailscale Serve 身份或受信任的代理身份。這可以防止 Control UI 功能旗標和端點中繼資料洩漏給共用主機上的未經驗證掃描器。

## 語言支援

Control UI 可以根據您的瀏覽器語言環境在首次載入時進行本地化。若稍後要覆寫，請開啟 **概覽 -> Gateway 存取 -> 語言**。語言環境選擇器位於 Gateway 存取卡片中，而不在外觀下。

- 支援的語言環境：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`tr`、`uk`、`id`、`pl`、`th`
- 非英文翻譯會在瀏覽器中延遲載入。
- 選取的地區設定會儲存在瀏覽器儲存空間中，並在下次造訪時重複使用。
- 遺失的翻譯鍵會回退至英文。

## 目前的功能

- 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (代理程式事件)
- 頻道：內建加上捆綁/外部外掛頻道狀態、QR 登入和各頻道設定 (`channels.status`, `web.login.*`, `config.patch`)
- 執行個體：在線清單 + 重新整理 (`system-presence`)
- 工作階段：清單 + 各工作階段的模型/思考/快速/詳細/追蹤/推理覆寫 (`sessions.list`, `sessions.patch`)
- 夢境：作夢狀態、啟用/停用切換和夢境日誌讀取器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Cron 工作：清單/新增/編輯/執行/啟用/停用 + 執行歷史 (`cron.*`)
- 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)
- 節點：清單 + 功能 (`node.list`)
- 執行核准：編輯閘道或節點允許清單 + 詢問 `exec host=gateway/node` 的策略 (`exec.approvals.*`)
- 設定：檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 設定：套用 + 透過驗證重新啟動 (`config.apply`) 並喚醒最後一個作用中的工作階段
- 設定寫入包含一個基底雜湊防護，以防止覆蓋並行的編輯
- 設定寫入 (`config.set`/`config.apply`/`config.patch`) 也會對提交設定承載中的參照進行作用中 SecretRef 解析預檢；未解析的作用中提交參照會在寫入前被拒絕
- Config schema + form rendering (`config.schema` / `config.schema.lookup`,
  including field `title` / `description`, matched UI hints, immediate child
  summaries, docs metadata on nested object/wildcard/array/composition nodes,
  plus plugin + channel schemas when available); Raw JSON editor is
  available only when the snapshot has a safe raw round-trip
- If a snapshot cannot safely round-trip raw text, Control UI forces Form mode and disables Raw mode for that snapshot
- Raw JSON editor "Reset to saved" preserves the raw-authored shape (formatting, comments, `$include` layout) instead of re-rendering a flattened snapshot, so external edits survive a reset when the snapshot can safely round-trip
- Structured SecretRef object values are rendered read-only in form text inputs to prevent accidental object-to-string corruption
- Debug: status/health/models snapshots + event log + manual RPC calls (`status`, `health`, `models.list`)
- Logs: live tail of gateway file logs with filter/export (`logs.tail`)
- Update: run a package/git update + restart (`update.run`) with a restart report

Cron jobs panel notes:

- For isolated jobs, delivery defaults to announce summary. You can switch to none if you want internal-only runs.
- Channel/target fields appear when announce is selected.
- Webhook mode uses `delivery.mode = "webhook"` with `delivery.to` set to a valid HTTP(S) webhook URL.
- For main-session jobs, webhook and none delivery modes are available.
- Advanced edit controls include delete-after-run, clear agent override, cron exact/stagger options,
  agent model/thinking overrides, and best-effort delivery toggles.
- Form validation is inline with field-level errors; invalid values disable the save button until fixed.
- Set `cron.webhookToken` to send a dedicated bearer token, if omitted the webhook is sent without an auth header.
- Deprecated fallback: stored legacy jobs with `notify: true` can still use `cron.webhook` until migrated.

## Chat behavior

- `chat.send` 是**非阻塞**的：它立即用 `{ runId, status: "started" }` 確認，回應透過 `chat` 事件串流傳輸。
- 使用相同的 `idempotencyKey` 重新發送會在執行時返回 `{ status: "in_flight" }`，並在完成後返回 `{ status: "ok" }`。
- `chat.history` 回應的大小受到限制以確保 UI 安全。當對話條目過大時，Gateway 可能會截斷長文字欄位、省略沈重的元資料區塊，並用預留位置 (`[chat.history omitted: message too large]`) 替換過大的訊息。
- `chat.history` 還會從可見的助手文字中移除僅供顯示的內聯指令標籤（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截斷的工具呼叫區塊），以及洩漏的 ASCII/全形模型控制權杖，並且會省略整個可見文字僅為精確靜默權杖 `NO_REPLY` / `no_reply` 的助手條目。
- `chat.inject` 會將助手備註附加到會話對話記錄，並廣播 `chat` 事件以僅更新 UI（無代理程式執行，無通道傳遞）。
- 聊天標頭的模型和思維選擇器會透過 `sessions.patch` 立即修補活躍會話；它們是持久的會話覆寫，而非僅限單次輪迴的發送選項。
- 停止：
  - 點擊 **Stop** (呼叫 `chat.abort`)
  - 輸入 `/stop` (或獨立的中止片語如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以中止頻外操作
  - `chat.abort` 支援 `{ sessionKey }` (無 `runId`) 以中止該會話的所有活躍執行
- 中止部分保留：
  - 當執行被中止時，部分助手文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助手文字持久化到對話紀錄中
  - 持久化的條目包含中止中繼資料，以便對話紀錄的消費者可以區分中止的部分內容與正常的完成輸出

## 託管的嵌入

助手訊息可以使用 `[embed ...]`
簡碼內嵌呈現託管的網頁內容。iframe 沙箱策略由
`gateway.controlUi.embedSandbox` 控制：

- `strict`：停用託管嵌入內部的指令碼執行
- `scripts`：允許互動式嵌入，同時保持來源隔離；這是
  預設值，對於獨立的瀏覽器遊戲/小工具通常已足夠
- `trusted`：在 `allow-scripts` 的基礎上新增 `allow-same-origin`，用於
  有意需要更強權限的同站文件

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

僅當嵌入文件確實需要同來源行為時才使用 `trusted`。對於大多數代理產生的遊戲和互動式畫布，`scripts` 是
更安全的選擇。

絕對的外部 `http(s)` 嵌入 URL 預設保持封鎖狀態。如果您
有意讓 `[embed url="https://..."]` 載入第三方頁面，請設定
`gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 存取 (推薦)

### 整合式 Tailscale Serve (首選)

將 Gateway 保持在 loopback 上，並讓 Tailscale Serve 使用 HTTPS 對其進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 要求可以透過 Tailscale 身分標頭
(`tailscale-user-login`) 進行驗證。OpenClaw
透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址
並將其與標頭匹配來驗證身分，並且僅當請求透過 Tailscale 的 `x-forwarded-*` 標頭
命中 loopback 時才接受這些請求。如果您希望即使對於 Serve 流量也要求明確的共用秘密
憑證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或
`"password"`。
對於該非同步 Serve 身分路徑，相同客戶端 IP
和驗證範圍的失敗驗證嘗試會在速率限制寫入之前進行序列化。因此，來自同一瀏覽器的並發錯誤重試
可能在第二次請求時顯示 `retry later`，
而不是兩個並行競爭的單純不匹配。
無 Token Serve 驗證假設閘道主機是受信任的。如果該主機上可能執行不受信任的本機
程式碼，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/` (或您設定的 `gateway.controlUi.basePath`)

將相符的共用秘密貼上到 UI 設定中（作為
`connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，
瀏覽器會在 **非安全上下文** 中執行並封鎖 WebCrypto。預設情況下，
OpenClaw 會**封鎖** 沒有裝置身分的 Control UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 與 `gateway.controlUi.allowInsecureAuth=true` 的相容性
- 透過 `gateway.auth.mode: "trusted-proxy"` 成功的操作員 Control UI 驗證
- break-glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議的修復方法：** 使用 HTTPS (Tailscale Serve) 或在本地開啟 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在閘道主機上)

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

`allowInsecureAuth` 僅是本地相容性切換：

- 它允許 localhost 控制UI會話在非安全 HTTP 上下文中進行，而無需裝置身分。
- 它不繞過配對檢查。
- 它不會放寬遠端（非 localhost）裝置身分要求。

**僅限緊急破窗：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 會停用控制 UI 裝置身分檢查，這是嚴重的安全性降級。緊急使用後請迅速還原。

受信任代理伺服器註記：

- 成功的受信任代理伺服器驗證可以允許無需裝置身分的 **操作員** 控制UI會話
- 這**不**適用於節點角色 控制UI會話
- 同主機回送反向代理伺服器仍不滿足受信任代理伺服器驗證；請參閱
  [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)

關於 HTTPS 設定指引，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

## 內容安全性原則

控制 UI 附帶嚴格的 `img-src` 原則：僅允許 **同源**資產和 `data:` URL。遠端 `http(s)` 和協議相對映像 URL 會被瀏覽器拒絕，且不會發出網路提取。

實際上的含義：

- 在相對路徑下提供的頭像和圖片（例如 `/avatars/<id>`）仍然會渲染。
- 內聯 `data:image/...` URL 仍然會渲染（適用於通訊協定內的 Payload）。
- 由頻道元資料發出的遠端頭像 URL 會在控制 UI 的頭像輔助程式中被剝離，並替換為內建的標誌/徽章，因此受損或惡意的頻道無法強制從操作員瀏覽器提取任意的遠端映像。

您無需更改任何設定即可獲得此行為 — 它始終處於開啟狀態且不可配置。

## 頭像路由驗證

當設定閘道驗證時，控制 UI 頭像端點需要與 API 其餘部分相同的閘道權杖：

- `GET /avatar/<agentId>` 僅向經過驗證的呼叫者傳回頭像映像。`GET /avatar/<agentId>?meta=1` 在相同規則下傳回頭像元資料。
- 對任一路由的未經驗證請求都會被拒絕（與同層的 assistant-media 路由相符）。這可以防止頭像路由在受保護的主機上洩漏代理程式身分。
- 控制 UI 本身在獲取頭像時會將 Gateway token 作為 bearer header 轉發，並使用經過驗證的 blob URL，以便影像仍能在儀表板中呈現。

如果您停用 Gateway 驗證（不建議在共用主機上這樣做），頭像路由也會變成未驗證狀態，與 Gateway 的其餘部分保持一致。

## 建構 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下指令建構：

```bash
pnpm ui:build
```

選用的絕對基礎路徑（當您需要固定的資產 URL 時）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本地開發（獨立的開發伺服器）：

```bash
pnpm ui:dev
```

然後將 UI 指向您的 Gateway WS URL（例如 `ws://127.0.0.1:18789`）。

## 除錯/測試：開發伺服器 + 遠端 Gateway

控制 UI 是靜態檔案；WebSocket 目標是可配置的，並且可以與 HTTP 來源不同。當您希望在本地使用 Vite 開發伺服器但 Gateway 在其他地方執行時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟如下 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

選用的一次性驗證（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

備註：

- `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
- 應盡可能通過 URL 片段（`#token=...`）傳遞 `token`。片段不會傳送到伺服器，從而避免請求日誌和 Referer 洩漏。舊版 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為後備方案，並會在啟動後立即移除。
- `password` 僅保存在記憶體中。
- 設定 `gatewayUrl` 後，UI 不會回退到配置或環境憑證。
  請明確提供 `token`（或 `password`）。缺少明確憑證是一個錯誤。
- 當 Gateway 位於 TLS 之後時（例如 Tailscale Serve、HTTPS 代理等），請使用 `wss://`。
- `gatewayUrl` 僅在頂層視窗中被接受（非嵌入式），以防止點擊劫持。
- 非回環控制 UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`
  （完整來源）。這包括遠端開發設定。
- 除非是嚴密控制的
  本地測試，否則請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這意味著允許任何瀏覽器來源，而不是「匹配我正在使用的任何主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host-header origin 後援模式，但這是一種危險的安全性模式。

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
