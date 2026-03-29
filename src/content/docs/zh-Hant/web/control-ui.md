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

一旦核准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 將其撤銷，否則將不需要重新核准。
請參閱 [Devices CLI](/en/cli/devices) 以了解權杖輪換與撤銷。

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
- 設定結構描述 + 表單呈現 (`config.schema`，包括外掛程式 + 頻道結構描述)；原始 JSON 編輯器仍可使用
- 偵錯：狀態/健全狀況/模型快照 + 事件記錄 + 手動 RPC 呼叫 (`status`、`health`、`models.list`)
- 日誌：即時追蹤閘道檔案日誌並支援過濾/匯出 (`logs.tail`)
- 更新：執行套件/git 更新 + 重新啟動 (`update.run`)，並附帶重新啟動報告

Cron 任務面板備註：

- 對於隔離任務，傳遞預設為公告摘要。如果您想要僅限內部的執行，可以切換為無。
- 選取公告時會出現頻道/目標欄位。
- Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於主工作階段任務，提供 webhook 和無傳遞模式。
- 進階編輯控制項包括執行後刪除、清除代理覆寫、cron 精確/錯開選項、代理模型/思考覆寫，以及盡力傳遞切換開關。
- 表單驗證為行內，並會顯示欄位層級錯誤；無效的數值會停用儲存按鈕，直到修正為止。
- 設定 `cron.webhookToken` 以傳送專屬 bearer token，如果省略，則傳送不含 auth 標頭的 webhook。
- 已棄用的後備機制：儲存具有 `notify: true` 的舊版任務在遷移前仍可使用 `cron.webhook`。

## 聊天行為

- `chat.send` 是**非阻塞**的：它會立即以 `{ runId, status: "started" }` 確認，並且回應透過 `chat` 事件串流傳輸。
- 使用相同的 `idempotencyKey` 重新傳送，會在執行期間回傳 `{ status: "in_flight" }`，並在完成後回傳 `{ status: "ok" }`。
- `chat.history` 回應的大小受限以確保 UI 安全。當對話紀錄條目過大時，閘道可能會截斷長文字欄位、省略龐大的中繼資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.inject` 會將助理備註附加到工作階段對話紀錄，並廣播 `chat` 事件以進行僅限 UI 的更新（不執行代理，不進行頻道傳遞）。
- 停止：
  - 點擊 **停止** (呼叫 `chat.abort`)
  - 輸入 `/stop` (或獨立的中止片語，例如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以進行帶外中止
  - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該階段的所有活躍執行
- 中止部分保留：
  - 當執行被中止時，部分助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字保存到逐字稿歷史中
  - 保存的條目包含中止中繼資料，因此逐字稿消費者可以區分中止的部分與正常完成的輸出

## Tailnet 存取（推薦）

### 整合式 Tailscale Serve（優先）

將 Gateway 保持在 loopback 上，並讓 Tailscale Serve 使用 HTTPS 進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/`（或您設定的 `gateway.controlUi.basePath`）

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭 (`tailscale-user-login`) 進行驗證。OpenClaw 透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭匹配來驗證身分，並且僅在請求透過 Tailscale 的 `x-forwarded-*` 標頭命中 loopback 時才接受這些請求。如果您希望即使對於 Serve 流量也要求令牌/密碼，請設定 `gateway.auth.allowTailscale: false`（或強制 `gateway.auth.mode: "password"`）。無令牌 Serve 驗證假設 gateway 主機是受信任的。如果不受信任的本機程式碼可能在该主機上運行，請要求令牌/密碼驗證。

### 綁定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/`（或您設定的 `gateway.controlUi.basePath`）

將令牌貼上到 UI 設定中（作為 `connect.params.auth.token` 發送）。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器會在**不安全的上下文**中運行並阻擋 WebCrypto。預設情況下，OpenClaw 會**阻擋**沒有裝置身分的 Control UI 連線。

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

`allowInsecureAuth` 僅是一個本地相容性切換：

- 它允許在本機 控制介面會話在不安全 HTTP 環境下，於不具備裝置身分的情況下繼續進行。
- 它並不會繞過配對檢查。
- 它不會放寬遠端 (非 localhost) 的裝置身分要求。

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

`dangerouslyDisableDeviceAuth` 會停用控制介面的裝置身分檢查，並將會造成嚴重的安全性降級。請在緊急使用後盡速還原。

請參閱 [Tailscale](/en/gateway/tailscale) 以取得 HTTPS 設定指南。

## 建構 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。使用以下指令進行建構：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可選的絕對路徑基底 (當您想要固定的資源 URL 時)：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

若為本地開發 (獨立的開發伺服器)：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然後將 UI 指向您的 Gateway WS URL (例如 `ws://127.0.0.1:18789`)。

## 除錯/測試：開發伺服器 + 遠端 Gateway

控制介面是靜態檔案；WebSocket 目標可設定，並且可以與 HTTP 來源不同。當您想要在本地使用 Vite 開發伺服器，但 Gateway 在其他地方運行時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟類似這樣的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可選的一次性驗證 (如果需要)：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

備註：

- `gatewayUrl` 在載入後會儲存在 localStorage 中，並從 URL 中移除。
- `token` 應盡可能透過 URL 片段 (`#token=...`) 傳遞。片段不會傳送至伺服器，這可避免請求日誌 和 Referer 洩漏。舊版 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為後備手段，並在啟動後立即移除。
- `password` 僅保存在記憶體中。
- 當設定 `gatewayUrl` 時，UI 不會回退至設定或環境認證。請明確提供 `token` (或 `password`)。缺少明確認證會被視為錯誤。
- 當 Gateway 位於 TLS 後方 (Tailscale Serve、HTTPS 代理等) 時，請使用 `wss://`。
- 為防止點擊劫持，`gatewayUrl` 僅在頂層視窗 (非嵌入式) 中被接受。
- 非迴路 控制介面部署必須明確設定 `gateway.controlUi.allowedOrigins` (完整來源)。這包括遠端開發環境。
- 請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`，除非是在嚴格控制的本地測試中。這表示允許任何瀏覽器來源，而不是「符合我目前使用的主機」。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 啟用 Host 標頭來源後援模式，但這是一種危險的安全模式。

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
