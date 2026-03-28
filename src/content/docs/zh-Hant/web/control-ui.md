---
summary: "適用於 Gateway 的瀏覽器型控制 UI（聊天、節點、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制 UI"
---

# 控制 UI（瀏覽器）

控制 UI 是一個由 Gateway 提供的小型 **Vite + Lit** 單頁應用程式：

- 預設值： `http://<host>:18789/`
- 可選前綴：設定 `gateway.controlUi.basePath`（例如 `/openclaw`）

它會在同一連接埠上**直接與 Gateway WebSocket** 通訊。

## 快速開啟（本機）

如果 Gateway 在同一台電腦上運作，請開啟：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果頁面載入失敗，請先啟動 Gateway：`openclaw gateway`。

驗證會在 WebSocket 交握期間透過以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  儀表板設定面板會保留目前瀏覽器分頁工作階段和選定 gateway URL 的 token；密碼不會被保存。
  Onboarding 預設會產生 gateway token，因此在首次連線時將其貼上即可。

## 裝置配對（首次連線）

當您從新的瀏覽器或裝置連線到控制 UI 時，即使您與 `gateway.auth.allowTailscale: true` 位於同一個 Tailnet 上，Gateway
也會要求**一次性配對核准**。這是一項防止未經授權存取的安全措施。

**您會看到的內容：**「已中斷連線 (1008)：需要配對」

**若要核准裝置：**

```exec
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果瀏覽器使用變更後的驗證詳細資料（角色/範圍/公開金鑰）重試配對，之前的待處理要求將被取代，並建立一個新的 `requestId`。
在核准之前，請重新執行 `openclaw devices list`。

一旦核准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新核准。
關於 token 輪替和撤銷，請參閱[裝置 CLI](/zh-Hant/cli/devices)。

**備註：**

- 本機連線 (`127.0.0.1`) 會自動核准。
- 遠端連線（LAN、Tailnet 等）需要明確核准。
- 每個瀏覽器設定檔都會產生唯一的裝置 ID，因此切換瀏覽器或
  清除瀏覽器資料將需要重新配對。

## 語言支援

控制介面 (Control UI) 可在首次載入時根據您的瀏覽器語言環境自動本地化，之後您也可以從存取卡片中的語言選擇器進行變更。

- 支援的語言環境：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`
- 非英文翻譯會在瀏覽器中進行延遲載入。
- 選取的語言環境會儲存在瀏覽器儲存空間中，並在下次造訪時重複使用。
- 缺少的翻譯鍵值會回退至英文。

## 目前可以做到的事

- 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (agent 事件)
- 頻道：WhatsApp/Telegram/Discord/Slack + 外掛程式頻道 (Mattermost 等) 狀態 + QR 登入 + 依頻道設定 (`channels.status`, `web.login.*`, `config.patch`)
- 執行個體：在線狀態列表 + 重新整理 (`system-presence`)
- 工作階段：列表 + 依工作階段覆寫思考/快速/詳細/推理設定 (`sessions.list`, `sessions.patch`)
- Cron 工作：列表/新增/編輯/執行/啟用/停用 + 執行歷史記錄 (`cron.*`)
- 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)
- 節點：列表 + 功能 (`node.list`)
- 執行核准：編輯閘道或節點允許清單 + 查詢 `exec host=gateway/node` 的詢問原則 (`exec.approvals.*`)
- 設定：檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 設定：套用 + 透過驗證重新啟動 (`config.apply`) 並喚醒上次的工作階段
- 設定寫入包含 base-hash 保護機制，以防止覆寫並行編輯
- 設定架構 + 表單呈現 (`config.schema`，包括外掛程式 + 頻道架構)；原始 JSON 編輯器仍可使用
- 偵錯：狀態/健康狀況/模型快照 + 事件記錄 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)
- 日誌：即時追蹤閘道檔案日誌，支援篩選/匯出 (`logs.tail`)
- 更新：執行套件/Git 更新並重新啟動 (`update.run`)，並提供重新啟動報告

Cron 工作面板說明：

- 對於獨立工作，傳送方式預設為 announce summary。如果您只想在內部執行，可以切換為 none。
- 選取 announce 時會顯示頻道/目標欄位。
- Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於 main-session 工作，提供 webhook 和 none 傳送模式。
- 進階編輯控制項包括執行後刪除 (delete-after-run)、清除代理覆寫 (clear agent override)、cron 精確/錯開選項、代理模型/思維覆寫 (agent model/thinking overrides)，以及盡力傳送切換開關。
- 表單驗證為即時顯示欄位層級錯誤；無效數值會停用儲存按鈕直到修正為止。
- 設定 `cron.webhookToken` 以傳送專用的 bearer token，如果省略則 webhook 將在不含 auth 標頭的情況下傳送。
- 已棄用的回退機制：具有 `notify: true` 的儲存舊版工作在遷移之前仍可使用 `cron.webhook`。

## 聊天行為

- `chat.send` 是**非阻斷式**的：它會立即使用 `{ runId, status: "started" }` 進行確認，且回應會透過 `chat` 事件串流傳輸。
- 使用相同的 `idempotencyKey` 重新傳送會在執行期間傳回 `{ status: "in_flight" }`，並在完成後傳回 `{ status: "ok" }`。
- `chat.history` 回應會針對 UI 安全性進行大小限制。當對話記錄項目過大時，閘道可能會截斷長文字欄位、省略繁重的元資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.inject` 會在對話記錄中附加一則助理註記，並廣播 `chat` 事件以僅更新 UI (不執行代理，不透過頻道傳送)。
- 停止：
  - 按一下 **Stop** (呼叫 `chat.abort`)
  - 輸入 `/stop` (或獨立的中止片語，例如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以帶外中止 (abort out-of-band)
  - `chat.abort` 支援 `{ sessionKey }` (無 `runId`) 以中止該工作階段的所有執行中作業
- 中止部分保留：
  - 當執行被中止時，部分助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字保存到轉錄紀錄歷史中
  - 保存的條目包含中止元數據，以便轉錄紀錄的消費者能區分中止的部分輸出與正常的完成輸出

## Tailnet 存取 (推薦)

### 整合式 Tailscale Serve (偏好)

將 Gateway 保持在 loopback，並讓 Tailscale Serve 使用 HTTPS 將其代理：

```exec
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/` (或您設定的 `gateway.controlUi.basePath`)

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 要求可以透過 Tailscale 身分標頭 (`tailscale-user-login`) 進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭匹配來驗證身分，並且僅在請求透過 Tailscale 的 `x-forwarded-*` 標頭打到 loopback 時才接受這些請求。如果您想針對 Serve 流量也要求 token/密碼，請設定 `gateway.auth.allowTailscale: false` (或強制 `gateway.auth.mode: "password"`)。無 Token Serve 驗證假設 gateway 主機是受信任的。如果不受信任的本機程式碼可能會在該主機上執行，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```exec
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/` (或您設定的 `gateway.controlUi.basePath`)

將 token 貼上到 UI 設定中 (作為 `connect.params.auth.token` 發送)。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在 **不安全的上下文** 中執行並封鎖 WebCrypto。預設情況下，OpenClaw 會 **封鎖** 沒有裝置身分的 Control UI 連線。

**建議的解決方案：** 使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

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

`allowInsecureAuth` 僅供本機相容性切換使用：

- 它允許本機控制 UI 工作階段在非安全 HTTP 環境中
  無需裝置身分即可繼續運作。
- 它不會略過配對檢查。
- 它不會放寬遠端（非本機）裝置身分的要求。

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

`dangerouslyDisableDeviceAuth` 會停用控制 UI 裝置身分檢查，這是
一個嚴重的安全性降級。緊急使用後請立即還原。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以取得 HTTPS 設定指引。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下指令建置：

```exec
pnpm ui:build # auto-installs UI deps on first run
```

選用的絕對基礎路徑（當您想要固定的資源 URL 時）：

```exec
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本機開發（獨立的開發伺服器）：

```exec
pnpm ui:dev # auto-installs UI deps on first run
```

然後將 UI 指向您的 Gateway WS URL（例如 `ws://127.0.0.1:18789`）。

## 偵錯/測試：開發伺服器 + 遠端 Gateway

控制 UI 由靜態檔案組成；WebSocket 目標是可設定的，並且可以
與 HTTP 來源不同。當您想要在本機執行 Vite 開發伺服器
但 Gateway 在其他地方執行時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟類似以下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

選用的一次性授權（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

注意：

- `gatewayUrl` 會在載入後儲存在 localStorage 中並從 URL 中移除。
- `token` 應盡可能透過 URL 片段（`#token=...`）傳遞。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。舊版的 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為後備方案，並會在啟動後立即被移除。
- `password` 僅保存在記憶體中。
- 當設定 `gatewayUrl` 時，UI 不會還原至設定或環境變數的憑證。
  請明確提供 `token`（或 `password`）。缺少明確憑證是一個錯誤。
- 當 Gateway 位於 TLS 後方（Tailscale Serve、HTTPS proxy 等）時，請使用 `wss://`。
- `gatewayUrl` 只在最上層視窗（非嵌入式）中被接受，以防止點擊劫持。
- 非回環控制 UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`
  （完整的來源）。這包括遠端開發設定。
- 請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`，除非是在嚴密控制的本地測試中。這表示允許任何瀏覽器來源，而非「符合我正在使用的任何主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式，但這是一種具危險性的安全模式。

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
