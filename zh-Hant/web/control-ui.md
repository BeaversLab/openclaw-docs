---
summary: "適合 Gateway 的瀏覽器型控制介面（聊天、節點、設定）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制介面"
---

# 控制介面（瀏覽器）

控制介面是一個由 Gateway 提供的小型 **Vite + Lit** 單頁應用程式：

- 預設值： `http://<host>:18789/`
- 可選前綴：設定 `gateway.controlUi.basePath`（例如 `/openclaw`）

它會在相同連接埠上**直接與 Gateway WebSocket 通訊**。

## 快速開啟（本機）

如果 Gateway 在同一台電腦上執行，請開啟：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/））

如果頁面載入失敗，請先啟動 Gateway：`openclaw gateway`。

驗證會在 WebSocket 握手期間透過以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  儀表板設定面板會保留目前瀏覽器分頁工作階段與所選 Gateway URL 的權杖；密碼則不會被保存。
  入門預設會產生 gateway 權杖，因此請在首次連線時將其貼上。

## 裝置配對（首次連線）

當您從新的瀏覽器或裝置連線至控制介面時，Gateway
會要求**一次性配對核准**—即使您位於擁有
`gateway.auth.allowTailscale: true` 的相同 Tailnet 上也是如此。這是為了防止
未經授權存取的安全性措施。

**您會看到的內容：**「已斷線 (1008)：需要配對」

**若要核准裝置：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

一旦核准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷其權限，否則不需要重新核准。
請參閱 [裝置 CLI](/zh-Hant/cli/devices) 以了解權杖輪替與撤銷。

**備註：**

- 本機連線 (`127.0.0.1`) 會自動獲得核准。
- 遠端連線 (LAN、Tailnet 等) 需要明確核准。
- 每個瀏覽器設定檔都會產生唯一的裝置 ID，因此切換瀏覽器或
  清除瀏覽器資料將需要重新配對。

## 語言支援

控制介面可以根據您的瀏覽器語言在首次載入時自動本地化，您之後也可以從 Access 卡中的語言選擇器進行變更。

- 支援的地區設定：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`
- 非英語翻譯會在瀏覽器中以懶載入方式載入。
- 選取的地區設定會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 遺漏的翻譯鍵會回退為英文。

## 它可以做什麼（目前）

- 透過 Gateway WS 與模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中串流工具呼叫 + 即時工具輸出卡片 (agent 事件)
- 頻道：WhatsApp/Telegram/Discord/Slack + 外掛程式頻道 (Mattermost 等) 狀態 + QR 登入 + 各頻道設定 (`channels.status`, `web.login.*`, `config.patch`)
- 執行個體：在線清單 + 重新整理 (`system-presence`)
- 工作階段：清單 + 依工作階段覆寫思考/快速/詳細/推理模式 (`sessions.list`, `sessions.patch`)
- Cron 工作：清單/新增/編輯/執行/啟用/停用 + 執行紀錄 (`cron.*`)
- 技能：狀態、啟用/停用、安裝、API 金鑰更新 (`skills.*`)
- 節點：清單 + 功能 (`node.list`)
- 執行核准：編輯閘道或節點允許清單 + 詢問 `exec host=gateway/node` 的請求策略 (`exec.approvals.*`)
- 設定：檢視/編輯 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 設定：套用 + 驗證後重新啟動 (`config.apply`) 並喚醒最後一個作用中的工作階段
- 設定寫入包含 base-hash 防護，以防止覆蓋並行的編輯
- Config schema + form rendering (`config.schema`, including plugin + channel schemas); Raw JSON editor remains available
- Debug: status/health/models snapshots + event log + manual RPC calls (`status`, `health`, `models.list`)
- Logs: live tail of gateway file logs with filter/export (`logs.tail`)
- 更新：執行套件/git 更新並重新啟動 (`update.run`)，並附上重新啟動報告

Cron jobs 面板說明：

- 對於隔離的工作，傳送預設為公告摘要。如果您僅需內部執行，可以切換為無。
- 選擇公告時會顯示頻道/目標欄位。
- Webhook 模式使用 `delivery.mode = "webhook"`，並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於主要階段工作，可以使用 webhook 和無傳送模式。
- 進階編輯控制項包括執行後刪除、清除代理覆寫、cron 精確/錯開選項、代理模型/思考覆寫，以及盡力傳送切換開關。
- 表單驗證為內聯，並顯示欄位層級錯誤；無效值會停用儲存按鈕，直到修正為止。
- 設定 `cron.webhookToken` 以傳送專用的 bearer token，如果省略則 webhook 將在沒有 auth 標頭的情況下傳送。
- 已棄用的後援：具有 `notify: true` 的儲存舊版工作在遷移前仍可使用 `cron.webhook`。

## 聊天行為

- `chat.send` 是**非阻塞**的：它會立即以 `{ runId, status: "started" }` 確認，並且回應透過 `chat` 事件串流傳輸。
- 使用相同的 `idempotencyKey` 重新傳送，執行時會傳回 `{ status: "in_flight" }`，完成後則傳回 `{ status: "ok" }`。
- `chat.history` 回應的大小受限制以確保 UI 安全。當對話紀錄條目過大時，Gateway 可能會截斷長文字欄位、省略繁重的元資料區塊，並以預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.inject` 會在階段對話紀錄中附加一則助理備註，並廣播 `chat` 事件以進行僅限 UI 的更新（不執行代理，不進行頻道傳送）。
- 停止：
  - 點擊 **Stop** (呼叫 `chat.abort`)
  - 輸入 `/stop` (或獨立的中止詞彙，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以帶外中止
  - `chat.abort` 支援 `{ sessionKey }`（無 `runId`）以中止該會話的所有活躍執行
- 中止部分保留：
  - 當執行被中止時，部分助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字保存到對話歷史中
  - 保存的條目包含中止元資料，因此對話消費者可以區分中止的部分和正常完成輸出

## Tailnet 存取（建議）

### 整合式 Tailscale Serve（偏好）

將 Gateway 保持在 loopback 上，並讓 Tailscale Serve 使用 HTTPS 對其進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/`（或您設定的 `gateway.controlUi.basePath`）

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，Control UI/WebSocket Serve 請求可以透過 Tailscale 身分標頭
(`tailscale-user-login`) 進行驗證。OpenClaw
透過使用 `tailscale whois` 解析 `x-forwarded-for` 位址
並將其與標頭比對來驗證身分，並且僅在請求
透過 Tailscale 的 `x-forwarded-*` 標頭到達 loopback 時才接受這些請求。如果您
希望即使對於 Serve 流量也要求 token/密碼，請設定
`gateway.auth.allowTailscale: false`（或強制 `gateway.auth.mode: "password"`）。
無 Token 的 Serve 驗證假設 gateway 主機是受信任的。如果不受信任的本機
程式碼可能在该主機上運行，請要求 token/密碼驗證。

### 綁定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/`（或您設定的 `gateway.controlUi.basePath`）

將 token 貼上到 UI 設定中（作為 `connect.params.auth.token` 發送）。

## 不安全的 HTTP

如果您透過純 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）開啟儀表板，
瀏覽器將在**非安全上下文**中運行並阻止 WebCrypto。預設情況下，
OpenClaw **阻止**沒有裝置身分的 Control UI 連線。

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

- 它允許 localhost Control UI 會話在非安全 HTTP 上下文中無需裝置身分即可繼續進行。
- 它不會繞過配對檢查。
- 它不會放寬遠端（非 localhost）裝置身分要求。

**僅限緊急情況（Break-glass only）：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 會停用 Control UI 裝置身分檢查，這是嚴重的安全性降級。在緊急使用後請迅速還原。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以取得 HTTPS 設定指南。

## 建置 UI

Gateway 會從 `dist/control-ui` 提供靜態檔案。請使用以下指令建置：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

選用的絕對基礎路徑（當您想要固定的資產 URL 時）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用於本地開發（獨立的開發伺服器）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然後將 UI 指向您的 Gateway WS URL（例如 `ws://127.0.0.1:18789`）。

## 除錯/測試：開發伺服器 + 遠端 Gateway

Control UI 是靜態檔案；WebSocket 目標是可設定的，且可以與 HTTP 來源不同。當您想要在本地使用 Vite 開發伺服器，但 Gateway 運行在其他地方時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟類似以下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

選用的一次性驗證（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

備註：

- `gatewayUrl` 會在載入後儲存在 localStorage 中，並從 URL 中移除。
- `token` 會從 URL 片段匯入，針對目前的瀏覽器分頁會話和選定的 gateway URL 儲存在 sessionStorage 中，並從 URL 中移除；它不會儲存在 localStorage 中。
- `password` 僅保留在記憶體中。
- 當設定了 `gatewayUrl` 時，UI 不會還原至設定或環境認證。請明確提供 `token`（或 `password`）。缺少明確的認證是一種錯誤。
- 當 Gateway 位於 TLS（Tailscale Serve、HTTPS 代理等）後方時，請使用 `wss://`。
- 為了防止點擊劫持，`gatewayUrl` 僅在頂層視窗中接受（非嵌入）。
- 非迴路 Control UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`（完整來源）。這包括遠端開發設定。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 會啟用 Host 標頭來源還原模式，但這是一種危險的安全性模式。

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
