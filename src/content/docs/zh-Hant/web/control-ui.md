---
summary: "Gateway 的瀏覽器型控制 UI（聊天、節點、設定）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Control UI"
---

# Control UI (瀏覽器)

Control UI 是一個由 Gateway 提供的輕量級 **Vite + Lit** 單頁應用程式：

- 預設值：`http://<host>:18789/`
- 選用前綴：設定 `gateway.controlUi.basePath`（例如 `/openclaw`）

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

儀表板設定面板會為目前瀏覽器分頁工作階段和選取的閘道 URL 保存一個權杖；密碼則不會被持久化。首次連線時，入門指引通常會為共用金鑰驗證產生一個閘道權杖，但當 `gateway.auth.mode` 為 `"password"` 時，密碼驗證也可以運作。

## 裝置配對（首次連線）

當您從新的瀏覽器或裝置連線到控制 UI 時，閘道需要**一次性配對核准**——即使您透過 `gateway.auth.allowTailscale: true` 位於同一個 Tailnet 上。這是一項為了防止未經授權存取的安全措施。

**您會看到的畫面：**「disconnected (1008): pairing required」（已中斷連線 (1008)：需要配對）

**要核准裝置：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果瀏覽器使用變更後的驗證詳細資訊（角色/範圍/公開金鑰）重試配對，先前的待處理請求將被取代，並建立一個新的 `requestId`。請在核准前重新執行 `openclaw devices list`。

一旦核准，該裝置將會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新核准。請參閱 [Devices CLI](/en/cli/devices) 以了解權杖輪換和撤銷。

**備註：**

- 直接的本機迴路瀏覽器連線 (`127.0.0.1` / `localhost`) 會
  自動核准。
- 來自 Tailnet 和區域網路 (LAN) 的瀏覽器連線仍然需要明確核准，即使它們來自同一台機器。
- 每個瀏覽器設定檔都會產生一個唯一的裝置 ID，因此切換瀏覽器或清除瀏覽器資料將需要重新配對。

## 語言支援

控制 UI 可以根據您的瀏覽器地區設定在首次載入時進行本地化。若要稍後覆寫它，請開啟 **Overview -> Gateway Access -> Language**。地區設定選擇器位於 Gateway Access 卡片中，而非 Appearance 底下。

- 支援的語言地區：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`
- 非英文翻譯會在瀏覽器中延遲載入。
- 選取的語言地區會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 缺少的翻譯鍵會回退為英文。

## 它目前可以做到什麼

- 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (代理程式事件)
- 頻道：內建以及捆綁/外部外掛程式頻道狀態、QR 登入，以及個別頻道設定 (`channels.status`, `web.login.*`, `config.patch`)
- 執行個體： Presence 清單 + 重新整理 (`system-presence`)
- 工作階段：清單 + 逐個工作階段的模型/思考/快速/詳細/推理覆寫 (`sessions.list`, `sessions.patch`)
- 夢境：夢境狀態、啟用/停用切換，以及夢境日誌讀取器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Cron 工作：清單/新增/編輯/執行/啟用/停用 + 執行歷程記錄 (`cron.*`)
- 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)
- 節點：清單 + 能力 (`node.list`)
- 執行核准：編輯閘道或節點允許清單 + `exec host=gateway/node` 的詢問策略 (`exec.approvals.*`)
- 設定：檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 設定：套用 + 透過驗證重新啟動 (`config.apply`) 並喚醒最後一個使用中的工作階段
- 設定寫入包含基底雜湊防護，以防止覆寫並行編輯
- Config 寫入 (`config.set`/`config.apply`/`config.patch`) 也會對提交的 config payload 中的 refs 進行 active SecretRef 解析的預檢；未解析的已提交 active ref 會在寫入前被拒絕
- Config schema + 表單渲染 (`config.schema` / `config.schema.lookup`，
  包括欄位 `title` / `description`、匹配的 UI 提示、直接子項
  摘要、巢狀物件/wildcard/陣列/組合節點上的文件元數據，
  以及可用的 plugin + channel schemas)；僅當快照具有安全的原始往返時，
  才提供原始 JSON 編輯器
- 如果快照無法安全地往返原始文字，Control UI 將強制使用表單模式並禁用該快照的原始模式
- 結構化的 SecretRef 物件值在表單文字輸入中以唯讀方式呈現，以防止意外地將物件轉換為字串而損毀
- 偵錯：status/health/models 快照 + 事件日誌 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)
- 日誌：帶有過濾器/匯出 (`logs.tail`) 的 gateway 檔案日誌即時追蹤
- 更新：執行套件/git 更新 + 重啟 (`update.run`) 並附帶重啟報告

Cron jobs 面板備註：

- 對於隔離任務，傳送預設為 announce summary。如果您只想內部執行，可以切換為 none。
- 當選擇 announce 時，會顯示 Channel/target 欄位。
- Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於 main-session 任務，提供 webhook 和 none 傳送模式。
- 進階編輯控制項包括 delete-after-run、清除 agent 覆寫、cron exact/stagger 選項、
  agent model/thinking 覆寫，以及盡力而為傳送切換開關。
- 表單驗證是內聯的，顯示欄位級別的錯誤；無效值會停用儲存按鈕，直到修正為止。
- 設定 `cron.webhookToken` 以發送專屬的 bearer token，如果省略則 webhook 將在沒有 auth 標頭的情況下發送。
- 已棄用的後援：儲存具有 `notify: true` 的舊版任務在遷移之前仍可使用 `cron.webhook`。

## Chat 行為

- `chat.send` 是**非阻塞性的**：它立即以 `{ runId, status: "started" }` 確認，並且回應透過 `chat` 事件串流傳輸。
- 使用相同的 `idempotencyKey` 重新發送會在執行時返回 `{ status: "in_flight" }`，並在完成後返回 `{ status: "ok" }`。
- `chat.history` 回應受到大小限制以確保 UI 安全。當對話記錄項目過大時，Gateway 可能會截斷長文字欄位，省略繁重的元資料區塊，並用預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.history` 也會從可見的助理文字中移除僅供顯示的內聯指令標籤 (例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`)、純文字工具呼叫 XML 載荷 (包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截斷的工具呼叫區塊)，以及洩漏的 ASCII/全形模型控制權杖，並且省略其整個可見文字僅為確切靜音權杖 `NO_REPLY` / `no_reply` 的助理項目。
- `chat.inject` 會將助理附註附加到工作階段對話記錄，並廣播 `chat` 事件以進行僅限 UI 的更新 (無 agent 執行，無通道傳遞)。
- 聊天標頭的模型和思維選擇器會透過 `sessions.patch` 立即修補使用中的工作階段；它們是持久的工作階段覆蓋設定，而非僅限單次輪詢的發送選項。
- 停止：
  - 點擊 **停止** (呼叫 `chat.abort`)
  - 輸入 `/stop` (或獨立的中止短語，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以中止帶外操作
  - `chat.abort` 支援 `{ sessionKey }` (無 `runId`) 以中止該工作階段的所有使用中執行
- 中止部分保留：
  - 當執行中止時，部分助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字持久化到對話記錄歷史中
  - 持久化的條目包含中止元數據，因此對話記錄的使用者可以區分中止的部分內容與正常完成輸出

## Tailnet 存取（建議）

### 整合式 Tailscale Serve（首選）

將 Gateway 保持在 loopback，並讓 Tailscale Serve 使用 HTTPS 對其進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/` （或您設定的 `gateway.controlUi.basePath`）

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭 (`tailscale-user-login`) 進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭進行比對來驗證身分，並且僅在請求使用 Tailscale 的 `x-forwarded-*` 標頭命中 loopback 時才接受這些請求。如果您希望即使是 Serve 流量也需要明確的共用金鑰憑證，請設定 `gateway.auth.allowTailscale: false`。然後使用 `gateway.auth.mode: "token"` 或 `"password"`。
對於該非同步 Serve 身分路徑，在寫入速率限制之前，相同客戶端 IP 和驗證範圍的失敗驗證嘗試會被序列化。因此，來自同一瀏覽器的並發錯誤重試可能會在第二次請求時顯示 `retry later`，而不是兩個並行競爭的純不匹配。
無 Token 的 Serve 驗證假設 gateway 主機是受信任的。如果該主機上可能執行不受信任的本機程式碼，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/` （或您設定的 `gateway.controlUi.basePath`）

將匹配的共用金鑰貼上到 UI 設定中（作為 `connect.params.auth.token` 或 `connect.params.auth.password` 發送）。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在 **不安全的上下文** 中執行並封鎖 WebCrypto。預設情況下，OpenClaw 會 **封鎖** 沒有裝置身分的 Control UI 連線。

記載的例外情況：

- 僅限 localhost 的不安全 HTTP 與 `gateway.controlUi.allowInsecureAuth=true` 的相容性
- 操作員透過 `gateway.auth.mode: "trusted-proxy"` 成功進行 Control UI 身份驗證
- 緊急情況 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建議修復方式：** 使用 HTTPS (Tailscale Serve) 或在本地開啟 UI：

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

`allowInsecureAuth` 僅為本地相容性切換：

- 它允許 localhost Control UI 工作階段在非安全 HTTP 環境下
  無需裝置身分繼續運作。
- 它不會略過配對檢查。
- 它不會放寬遠端 (非 localhost) 裝置身分要求。

**僅限緊急情況：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 會停用 Control UI 裝置身分檢查，並造成
嚴重的安全性降級。緊急使用後應立即還原。

受信任代理伺服器註記：

- 成功的受信任代理伺服器驗證可允許 **操作員** Control UI 工作階段
  無需裝置身分
- 這 **不** 適用於節點角色 Control UI 工作階段
- 相同主機的 loopback 反向代理伺服器仍不滿足受信任代理伺服器驗證；請參閱
  [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)

請參閱 [Tailscale](/en/gateway/tailscale) 以取得 HTTPS 設定指引。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下方式建置：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

選用的絕對基礎路徑 (當您想要固定的資產 URL 時)：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

對於本地開發 (獨立的開發伺服器)：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然後將 UI 指向您的 Gateway WS URL (例如 `ws://127.0.0.1:18789`)。

## 除錯/測試：開發伺服器 + 遠端 Gateway

Control UI 是靜態檔案；WebSocket 目標可設定，且可與
HTTP 來源不同。當您想要在本地使用 Vite 開發伺服器
但 Gateway 在其他地方執行時，這非常方便。

1. 啟動 UI 開發伺服器： `pnpm ui:dev`
2. 開啟類似以下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

選用的一次性驗證 (如果需要)：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

註記：

- `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
- 應盡可能透過 URL 片段 (`#token=...`) 傳遞 `token`。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。為了相容性，舊版 `?token=` 查詢參數仍會匯入一次，但僅作為後備機制，並會在啟動後立即移除。
- `password` 僅保留在記憶體中。
- 當設定 `gatewayUrl` 時，UI 不會後退到使用設定或環境憑證。
  請明確提供 `token` (或 `password`)。缺少明確憑證即為錯誤。
- 當 Gateway 位於 TLS (Tailscale Serve、HTTPS 代理等) 後方時，請使用 `wss://`。
- 為防止點擊劫持，僅在頂層視窗 (非嵌入) 中接受 `gatewayUrl`。
- 非迴路 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`
  (完整來源)。這包括遠端開發設定。
- 除嚴密控制的
  本地測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器來源，而非「符合我正在使用的任何主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host 標頭來源後援模式，但這是一種危險的安全性模式。

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

遠端存取設定詳細資訊：[Remote access](/en/gateway/remote)。

## 相關

- [Dashboard](/en/web/dashboard) — gateway 儀表板
- [WebChat](/en/web/webchat) — 基於瀏覽器的聊天介面
- [TUI](/en/web/tui) — 終端機使用者介面
- [Health Checks](/en/gateway/health) — gateway 健康監控
