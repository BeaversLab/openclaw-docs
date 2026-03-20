---
summary: "適合 Gateway 的瀏覽器式控制 UI（聊天、節點、設定）"
read_when:
  - 您想要透過瀏覽器操作 Gateway
  - 您想要不透過 SSH 通道取得 Tailnet 存取權
title: "控制 UI"
---

# 控制 UI (瀏覽器)

控制 UI 是一個由 Gateway 提供的小型 **Vite + Lit** 單頁應用程式：

- default: `http://<host>:18789/`
- 選用前綴：設定 `gateway.controlUi.basePath` (例如 `/openclaw`)

它會在同一連接埠上**直接與 Gateway WebSocket 通訊**。

## 快速開啟 (本機)

如果 Gateway 正在您的電腦上執行，請開啟：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果頁面載入失敗，請先啟動 Gateway：`openclaw gateway`。

認證會在 WebSocket 交握期間透過以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  儀表板設定面板會為目前的瀏覽器分頁會話和選定的 Gateway URL 保留權杖；密碼不會被保存。
  入門程序預設會產生一個 gateway 權杖，因此請在首次連線時將其貼上。

## 裝置配對 (首次連線)

當您從新的瀏覽器或裝置連線到控制 UI 時，Gateway
需要**一次性配對核准** — 即使您位於擁有
`gateway.auth.allowTailscale: true` 的同一 Tailnet 上。這是一項防止未經授權存取的安全措施。

**您會看到的內容：** "disconnected (1008): pairing required"

**若要核准裝置：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

一旦核准，該裝置會被記住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤銷它，否則不需要重新核准。請參閱 [裝置 CLI](/zh-Hant/cli/devices) 以了解權杖輪換和撤銷。

**備註：**

- 本機連線 (`127.0.0.1`) 會自動核准。
- 遠端連線 (LAN、Tailnet 等) 需要明確核准。
- 每個瀏覽器設定檔都會產生唯一的裝置 ID，因此切換瀏覽器或清除瀏覽器資料將需要重新配對。

## 語言支援

控制 UI 可以在首次載入時根據您的瀏覽器地區設定自動本地化，您之後也可以從「存取」卡片中的語言選擇器進行變更。

- 支援的語言環境：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`
- 非英語翻譯會在瀏覽器中進行延遲載入。
- 選取的語言環境會儲存在瀏覽器儲存空間中，並在未來造訪時重複使用。
- 缺少的翻譯鍵會回退至英語。

## 它可以做什麼（目前）

- 透過 Gateway WS 與模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中串流工具呼叫 + 即時工具輸出卡片（agent 事件）
- 頻道：WhatsApp/Telegram/Discord/Slack + 外掛程式頻道（Mattermost 等）狀態 + QR 登入 + 逐頻道設定（`channels.status`、`web.login.*`、`config.patch`）
- 執行個體：上線清單 + 重新整理（`system-presence`）
- 工作階段：清單 + 逐工作階段的思考/快速/詳細/推理覆寫（`sessions.list`、`sessions.patch`）
- Cron 工作：清單/新增/編輯/執行/啟用/停用 + 執行歷史記錄（`cron.*`）
- 技能：狀態、啟用/停用、安裝、API 金鑰更新（`skills.*`）
- 節點：清單 + 功能（`node.list`）
- 執行核准：編輯 gateway 或節點允許清單 + 詢問 `exec host=gateway/node` 的原則（`exec.approvals.*`）
- 設定：檢視/編輯 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）
- 設定：套用 + 驗證後重新啟動（`config.apply`）並喚醒上次使用中的工作階段
- 設定寫入包含 base-hash 保護，以防止覆寫並行編輯
- 設定架構 + 表單呈現（`config.schema`，包括外掛程式 + 頻道架構）；原始 JSON 編輯器仍可使用
- 偵錯：狀態/健全狀況/模型快照 + 事件記錄 + 手動 RPC 呼叫（`status`、`health`、`models.list`）
- 記錄檔：gateway 檔案記錄檔的即時追蹤，並具備篩選/匯出功能（`logs.tail`）
- 更新：執行套件/Git 更新並重新啟動 (`update.run`)，並附上重新啟動報告

Cron 任務面板注意事項：

- 對於隔離任務，傳遞預設為公告摘要。如果您只想在內部執行，可以切換為無。
- 選擇公告時會顯示頻道/目標欄位。
- Webhook 模式使用 `delivery.mode = "webhook"` 並將 `delivery.to` 設定為有效的 HTTP(S) webhook URL。
- 對於主要會話任務，提供 webhook 和無傳遞模式。
- 進階編輯控制項包括執行後刪除、清除代理覆寫、cron 精確/交錯選項、代理模型/思考覆寫，以及盡力傳遞切換開關。
- 表單驗證與欄位層級錯誤內聯顯示；無效值會停用儲存按鈕，直到修正為止。
- 設定 `cron.webhookToken` 以傳送專用的 bearer token，如果省略，則 webhook 將在不帶 auth 標頭的情況下傳送。
- 已棄用的後備方案：儲存具有 `notify: true` 的舊版任務仍可使用 `cron.webhook`，直到遷移為止。

## 聊天行為

- `chat.send` 是 **非阻塞** 的：它立即使用 `{ runId, status: "started" }` 確認，回應透過 `chat` 事件串流傳輸。
- 使用相同的 `idempotencyKey` 重新傳送，執行時會傳回 `{ status: "in_flight" }`，完成後則傳回 `{ status: "ok" }`。
- `chat.history` 回應為了 UI 安全而有大小限制。當對話條目太大時，Gateway 可能會截斷長文字欄位，省略繁重的元資料區塊，並用預留位置 (`[chat.history omitted: message too large]`) 取代過大的訊息。
- `chat.inject` 會將助理備註附加到會話對話中，並廣播 `chat` 事件以進行僅限 UI 的更新 (不執行代理，不進行頻道傳遞)。
- 停止：
  - 點擊 **停止** (呼叫 `chat.abort`)
  - 輸入 `/stop` (或獨立的中止詞組，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`) 以進行非頻道中止
  - `chat.abort` 支援 `{ sessionKey }`（不使用 `runId`）以中止該工作階段的所有執行
- 中止部分保留：
  - 當執行被中止時，部分助理文字仍可顯示在 UI 中
  - 當存在緩衝輸出時，Gateway 會將中止的部分助理文字保存至文字記錄歷史
  - 已儲存的項目包含中止中繼資料，以便文字記錄消費者能區分中止的部分輸出與正常完成輸出

## Tailnet 存取（建議）

### 整合式 Tailscale Serve（偏好）

將 Gateway 保持在 loopback 上，並讓 Tailscale Serve 使用 HTTPS 對其進行代理：

```bash
openclaw gateway --tailscale serve
```

開啟：

- `https://<magicdns>/`（或您設定的 `gateway.controlUi.basePath`）

預設情況下，當 `gateway.auth.allowTailscale` 為 `true` 時，控制 UI/WebSocket Serve 要求可以透過 Tailscale 身分標頭 (`tailscale-user-login`) 進行驗證。OpenClaw 透過 `tailscale whois` 解析 `x-forwarded-for` 位址並將其與標頭匹配來驗證身分，且僅在要求透過 Tailscale 的 `x-forwarded-*` 標頭命中 loopback 時才接受這些要求。如果您希望即使是 Serve 流量也要求 token/密碼，請設定 `gateway.auth.allowTailscale: false`（或強制 `gateway.auth.mode: "password"`）。無 Token Serve 驗證假設 gateway 主機是受信任的。如果不受信任的本機程式碼可能在该主機上執行，請要求 token/密碼驗證。

### 綁定至 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然後開啟：

- `http://<tailscale-ip>:18789/`（或您設定的 `gateway.controlUi.basePath`）

將 token 貼到 UI 設定中（作為 `connect.params.auth.token` 發送）。

## 不安全的 HTTP

如果您透過純 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 開啟儀表板，瀏覽器將在**不安全的上下文**中執行並封鎖 WebCrypto。預設情況下，OpenClaw 會**封鎖**沒有裝置身分的控制 UI 連線。

**建議的修復方法：**使用 HTTPS (Tailscale Serve) 或在本機開啟 UI：

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

- 它允許 localhost 控制台會話在非安全 HTTP 上下文中無需設備身分即可繼續。
- 它不會繞過配對檢查。
- 它不會放寬遠端（非 localhost）設備身分要求。

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

`dangerouslyDisableDeviceAuth` 會停用控制台設備身分檢查，並會造成嚴重的安全性降級。請在緊急使用後迅速還原。

請參閱 [Tailscale](/zh-Hant/gateway/tailscale) 以取得 HTTPS 設定指引。

## 建置 UI

Gateway 從 `dist/control-ui` 提供靜態檔案。請使用以下指令建置：

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

控制 UI 是靜態檔案；WebSocket 目標可設定，且可以與 HTTP 來源不同。當您想要在本地使用 Vite 開發伺服器但 Gateway 在其他地方執行時，這非常方便。

1. 啟動 UI 開發伺服器：`pnpm ui:dev`
2. 開啟類似這樣的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

選用的一次性驗證（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

備註：

- `gatewayUrl` 會在載入後儲存於 localStorage 中，並從 URL 中移除。
- `token` 應盡可能透過 URL 片段 (`#token=...`) 傳遞。片段不會傳送到伺服器，這可避免請求日誌和 Referer 洩漏。舊版 `?token=` 查詢參數為了相容性仍會匯入一次，但僅作為備用方案，並且在啟動後會立即移除。
- `password` 僅儲存在記憶體中。
- 當設定 `gatewayUrl` 時，UI 不會回退到設定或環境變數認證。請明確提供 `token`（或 `password`）。缺少明確的認證是一種錯誤。
- 當 Gateway 位於 TLS（Tailscale Serve、HTTPS 代理等）後方時，請使用 `wss://`。
- `gatewayUrl` 只在頂層視窗（非嵌入）中接受，以防止點擊劫持。
- 非迴路控制 UI 部署必須明確設定 `gateway.controlUi.allowedOrigins`（完整的來源）。這包括遠端開發設定。
- 除非經過嚴格控制的本地測試，否則請勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。這意味著允許任何瀏覽器來源，而不是「符合我正在使用的任何主機」。
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

遠端存取設定詳細資訊：[遠端存取](/zh-Hant/gateway/remote)。

import en from "/components/footer/en.mdx";

<en />
