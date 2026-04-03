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
  儀表板設定面板會保留目前瀏覽器分頁工作階段及所選 Gateway URL 的權杖；密碼則不會被保存。
  Onboarding 預設會產生一個 gateway token，請在首次連線時將其貼上至此處。

## 裝置配對（首次連線）

當您從新的瀏覽器或裝置連線至 Control UI 時，Gateway
會要求進行**一次性配對核准**——即使您已透過 `gateway.auth.allowTailscale: true` 位於同一個 Tailnet
上。這是一項防止未經授權存取的安全措施。

**您會看到的訊息：**「disconnected (1008): pairing required」（需要配對）

**若要核准裝置：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果瀏覽器以變更的驗證詳細資料（角色/範圍/公開金鑰）
重試配對，先前的待處理要求將會被取代，並建立一個新的 `requestId`。
請在核准前重新執行 `openclaw devices list`。

一旦批准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新批准。請參閱 [Devices CLI](/en/cli/devices) 以了解 token 輪換和撤銷。

**備註：**

- 本機連線（`127.0.0.1`）會自動核准。
- 遠端連線（LAN、Tailnet 等）需要明確核准。
- 每個瀏覽器設定檔都會產生一個唯一的裝置 ID，因此切換瀏覽器或
  清除瀏覽器資料將需要重新配對。

## 語言支援

控制介面 (Control UI) 可以在初次載入時根據您的瀏覽器語言環境進行本地化，您稍後也可以在存取卡片中的語言選擇器中覆寫它。

- 支援的語言環境：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`
- 非英文翻譯會在瀏覽器中以延遲載入的方式處理。
- 選取的語言環境會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 遺失的翻譯鍵會回退至英文。

## 它可以做什麼（目前）

- 透過 Gateway WS 與模型聊天 (`chat.history`、`chat.send`、`chat.abort`、`chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (代理程式事件)
- 頻道：WhatsApp/Telegram/Discord/Slack + 外掛程式頻道 (Mattermost 等) 狀態 + QR 登入 + 每個頻道的設定 (`channels.status`、`web.login.*`、`config.patch`)
- 執行個體：在線狀態列表 + 重新整理 (`system-presence`)
- 工作階段：列表 + 每個工作階段的思考/快速/詳細/推理覆寫 (`sessions.list`、`sessions.patch`)
- Cron 工作：列表/新增/編輯/執行/啟用/停用 + 執行歷史記錄 (`cron.*`)
- 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)
- 節點：列表 + 功能 (`node.list`)
- 執行核准：編輯閘道或節點允許列表 + `exec host=gateway/node` 的詢問原則 (`exec.approvals.*`)
- 設定：檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`、`config.set`)
- 設定：套用 + 搭配驗證重新啟動 (`config.apply`) 並喚醒最後一個使用中的工作階段
- 設定寫入包含基本雜湊守衛，以防止覆蓋並行的編輯
- 配置寫入 (`config.set`/`config.apply`/`config.patch`) 也會對提交的配置負載中的參照進行預檢 active SecretRef 解析；未解析的 active 提交參照會在寫入前被拒絕
- 配置架構 + 表單呈現 (`config.schema`，包括外掛 + 通道架構)；只有當快照能安全地進行原始往返時，才提供 Raw JSON 編輯器
- 如果快照無法安全地往返原始文字，Control UI 會強制啟用表單模式，並針對該快照停用 Raw 模式
- 結構化 SecretRef 物件值在表單文字輸入中呈現為唯讀，以防止意外將物件轉換為字串而損毀
- Debug：status/health/models 快照 + 事件日誌 + 手動 RPC 呼叫 (`status`, `health`, `models.list`)
- 日誌：即時追蹤 gateway 檔案日誌並具有過濾/匯出功能 (`logs.tail`)
- 更新：執行套件/git 更新 + 重新啟動 (`update.run`) 並附帶重新啟動報告

Cron jobs 面板備註：

- 對於 isolated jobs，交付預設為 announce summary。如果您只需要內部執行，可以切換為 none。
- 選取 announce 時會出現 Channel/target 欄位。
- Webhook 模式使用 `delivery.mode = "webhook"` 並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於 main-session jobs，可以使用 webhook 和 none 交付模式。
- 進階編輯控制項包括 delete-after-run、clear agent override、cron exact/stagger 選項、agent model/thinking 覆蓋，以及 best-effort delivery 切換開關。
- 表單驗證是內嵌的，顯示欄位層級的錯誤；無效的值會停用儲存按鈕，直到修正為止。
- 設定 `cron.webhookToken` 以傳送專用的 bearer token；如果省略，webhook 將在不帶 auth 標頭的情況下傳送。
- 已棄用的後援：具有 `notify: true` 的已儲存 legacy jobs 在遷移前仍可使用 `cron.webhook`。

## Chat 行為

- `chat.send` 是**非阻塞**的：它會立即以 `{ runId, status: "started" }` 進行確認，並透過 `chat` 事件串流回應。
- 使用相同的 `idempotencyKey` 重新發送會在執行時返回 `{ status: "in_flight" }`，並在完成後返回 `{ status: "ok" }`。
- `chat.history` 回應會因 UI 安全性而有大小限制。當對話記錄條目過大時，Gateway 可能會截斷長文字欄位、省略繁重的元資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.inject` 會將助理備註附加至工作階段對話記錄，並廣播 `chat` 事件以進行僅 UI 的更新（不執行 agent，不透過管道傳送）。
- 停止：
  - 點擊 **Stop**（呼叫 `chat.abort`）
  - 輸入 `/stop`（或獨立的中止短語，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以進行帶外中止
  - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該工作階段的所有活動執行
- 中止部分的保留：
  - 當執行中止時，部分的助理文字仍可在 UI 中顯示
  - 當有緩衝輸出時，Gateway 會將中止的部分助理文字保存至對話記錄歷史中
  - 已保存的條目包含中止元資料，因此對話記錄消費者可以區分中止部分與正常完成輸出

## Tailnet 存取（建議）

### 整合式 Tailscale Serve（建議選項）

將 Gateway 保持在 loopback 上，並讓 Tailscale Serve 使用 HTTPS 代理它：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/`（或您設定的 `gateway.controlUi.basePath`）

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身份標頭
(`tailscale-user-login`) 進行驗證。OpenClaw
透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址
並將其與標頭匹配來驗證身份，並且僅當請求透過 Tailscale 的 `x-forwarded-*` 標頭
存取 loopback 時才接受這些請求。如果您希望即使對於 Serve 流量也要求 token/密碼，
請設定 `gateway.auth.allowTailscale: false` (或強制 `gateway.auth.mode: "password"`)。
無 Token Serve 驗證假設 gateway 主機是受信任的。如果該主機上可能執行不受信任的本機
程式碼，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後打開：

- `http://<tailscale-ip>:18789/` (或您設定的 `gateway.controlUi.basePath`)

將 token 貼上到 UI 設定中 (作為 `connect.params.auth.token` 發送)。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，
瀏覽器將在 **不安全的上下文** 中運作並阻擋 WebCrypto。預設情況下，
OpenClaw 會 **阻擋** 沒有裝置身份的 Control UI 連線。

**建議的修復方法：** 使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

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

`allowInsecureAuth` 僅是一個本機相容性切換開關：

- 它允許 localhost Control UI 工作階段在
  不安全的 HTTP 上下文中沒有裝置身份的情況下繼續。
- 它不會繞過配對檢查。
- 它不會放寬遠端 (非 localhost) 裝置身份要求。

**僅供緊急情況使用：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 會停用 Control UI 裝置身份檢查，這是一個
嚴重的安全性降級。緊急使用後請迅速還原。

請參閱 [Tailscale](/en/gateway/tailscale) 以取得 HTTPS 設定指導。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。使用以下指令建置它們：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可選的絕對基礎 (當您想要固定的資產 URL 時)：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本機開發 (獨立的 dev server)：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然後將 UI 指向您的 Gateway WS URL (例如 `ws://127.0.0.1:18789`)。

## 除錯/測試：開發伺服器 + 遠端 Gateway

Control UI 是靜態檔案；WebSocket 目標是可配置的，並且可以與 HTTP origin 不同。當您想要在本地使用 Vite 開發伺服器但 Gateway 在其他地方運行時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟如下 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可選的一次性授權（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

備註：

- `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
- 應盡可能透過 URL 片段 (`#token=...`) 傳遞 `token`。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。舊版的 `?token=` 查詢參數仍會為了相容性匯入一次，但僅作為後備方案，並會在啟動後立即移除。
- `password` 僅保留在記憶體中。
- 當設定 `gatewayUrl` 時，UI 不會回退到設定或環境認證。
  請明確提供 `token` (或 `password`)。缺少明確的認證是一種錯誤。
- 當 Gateway 位於 TLS (Tailscale Serve, HTTPS proxy 等) 之後時，請使用 `wss://`。
- `gatewayUrl` 僅在頂層視窗 (非嵌入式) 中被接受，以防止點擊劫持。
- 非本機回路的 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`
  (完整的 origin)。這包括遠端開發設定。
- 除嚴格控制的
  本地測試外，請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這表示允許任何瀏覽器 origin，而不是「符合我正在使用的任何主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用
  Host 標頭 origin 後援模式，但這是一種危險的安全性模式。

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
