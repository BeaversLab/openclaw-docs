---
summary: "Google Chat 應用程式支援狀態、功能及組態設定"
read_when:
  - Working on Google Chat channel features
title: "Google Chat"
---

狀態：透過 Google Chat API Webhook 支援私訊 (DM) + 聊天室的 可下載外掛程式（僅限 HTTP）。

## 安裝

在設定頻道之前，請先安裝 Google Chat：

```bash
openclaw plugins install @openclaw/googlechat
```

本機檢出（當從 git 儲存庫執行時）：

```bash
openclaw plugins install ./path/to/local/googlechat-plugin
```

## 快速設定（初學者）

1. 建立一個 Google Cloud 專案並啟用 **Google Chat API**。
   - 前往：[Google Chat API 憑證](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未啟用，請啟用該 API。
2. 建立 **Service Account**：
   - 按一下 **Create Credentials** > **Service Account**。
   - 隨意命名（例如 `openclaw-chat`）。
   - 將權限留空（按一下 **Continue**）。
   - 將具備存取權的主體留空（按一下 **Done**）。
3. 建立並下載 **JSON 金鑰**：
   - 在服務帳戶清單中，按一下您剛建立的帳戶。
   - 前往 **Keys** 分頁。
   - 按一下 **Add Key** > **Create new key**。
   - 選取 **JSON** 並按一下 **Create**。
4. 將下載的 JSON 檔案儲存在您的閘道主機上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中建立一個 Google Chat 應用程式：
   - 填寫 **Application info**：
     - **App name**：（例如 `OpenClaw`）
     - **Avatar URL**：（例如 `https://openclaw.ai/logo.png`）
     - **Description**：（例如 `Personal AI Assistant`）
   - 啟用 **Interactive features**。
   - 在 **Functionality** 下，勾選 **Join spaces and group conversations**。
   - 在 **Connection settings** 下，選取 **HTTP endpoint URL**。
   - 在 **Triggers** 下，選取 **Use a common HTTP endpoint URL for all triggers** 並將其設定為您閘道的公開 URL，後面加上 `/googlechat`。
     - _提示：執行 `openclaw status` 以尋找您閘道的公開 URL。_
   - 在 **Visibility** 下，勾選 **Make this Chat app available to specific people and groups in `<Your Domain>`**。
   - 在文字方塊中輸入您的電子郵件地址（例如 `user@example.com`）。
   - 按一下底部的 **Save**。
6. **啟用應用程式狀態**：
   - 儲存後，**重新整理頁面**。
   - 尋找 **App status** 區段（通常在儲存後位於頂部或底部附近）。
   - 將狀態變更為 **Live - available to users**。
   - 再次點擊 **Save**。
7. 使用服務帳戶路徑和 webhook 受眾配置 OpenClaw：
   - 環境變數：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或配置檔：`channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 設定 webhook 受眾類型和值（需與您的 Chat 應用程式配置相符）。
9. 啟動 gateway。Google Chat 將會 POST 到您的 webhook 路徑。

## 新增至 Google Chat

一旦 gateway 運作中，且您的電子郵件已新增至可見性列表：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 點擊 **Direct Messages** 旁邊的 **+** (加號) 圖示。
3. 在搜尋列（您通常用來新增人員的地方）中，輸入您在 Google Cloud Console 中設定的 **App name**。
   - **注意**：由於這是一個私人應用程式，該機器人將 _不_ 會出現在「Marketplace」瀏覽列表中。您必須透過名稱搜尋它。
4. 從結果中選取您的機器人。
5. 點擊 **Add** 或 **Chat** 以開始 1:1 對話。
6. 傳送 "Hello" 以觸發助理！

## 公開 URL (僅 Webhook)

Google Chat webhooks 需要一個公開的 HTTPS 端點。為了安全起見，**僅將 `/googlechat` 路徑** 暴露給網際網路。請將 OpenClaw 儀表板和其他敏感端點保留在您的私人網路上。

### 選項 A：Tailscale Funnel (推薦)

將 Tailscale Serve 用於私人儀表板，並將 Funnel 用於公開 webhook 路徑。這能保持 `/` 的私有性，同時僅公開 `/googlechat`。

1. **檢查您的 gateway 繫結到的位址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   記下 IP 位址（例如 `127.0.0.1`、`0.0.0.0`，或您的 Tailscale IP，如 `100.x.x.x`）。

2. **僅將儀表板暴露給 tailnet (連接埠 8443)：**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **僅公開 webhook 路徑：**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **授權節點以進行 Funnel 存取：**
   如果系統提示，請前往輸出中顯示的授權 URL，以在您的 tailnet 原則中為此節點啟用 Funnel。

5. **驗證配置：**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

您的公開 webhook URL 將會是：
`https://<node-name>.<tailnet>.ts.net/googlechat`

您的私人儀表板將僅限 tailnet 存取：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 應用程式配置中使用公開 URL（不含 `:8443`）。

> 注意：此配置在重新開機後會持續存在。若要稍後移除它，請執行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 選項 B：反向代理

如果您使用像 Caddy 這樣的反向代理，請僅代理特定路徑：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此配置，任何對 `your-domain.com/` 的請求都將被忽略或返回 404，而 `your-domain.com/googlechat` 則會安全地路由到 OpenClaw。

### 選項 C：Cloudflare Tunnel

設定您的通道入口規則，以僅路由 Webhook 路徑：

- **路徑**：`/googlechat` -> `http://localhost:18789/googlechat`
- **預設規則**：HTTP 404 (Not Found)

## 運作原理

1. Google Chat 會將 Webhook POST 請求傳送到閘道。每個請求都包含一個 `Authorization: Bearer <token>` 標頭。
   - 當標頭存在時，OpenClaw 會在讀取/解析完整的 Webhook 內容之前驗證 Bearer 認證。
   - 對於在內容中攜帶 `authorizationEventObject.systemIdToken` 的 Google Workspace Add-on 請求，則透過更嚴格的預先認證內容預算來支援。
2. OpenClaw 會根據設定的 `audienceType` + `audience` 驗證 Token：
   - `audienceType: "app-url"` → audience 是您的 HTTPS Webhook URL。
   - `audienceType: "project-number"` → audience 是 Cloud 專案編號。
3. 訊息會依據空間進行路由：
   - DM 使用會話金鑰 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - Spaces 使用會話金鑰 `agent:<agentId>:googlechat:group:<spaceId>`。
4. DM 存取預設為配對模式。未知的發送者會收到配對碼；請使用以下方式核准：
   - `openclaw pairing approve googlechat <code>`
5. 群組空間預設需要 @-提及。如果提及偵測需要應用程式的使用者名稱，請使用 `botUser`。

## 目標

使用這些識別碼進行傳送與允許清單設定：

- 直接訊息：`users/<userId>` (推薦)。
- 原始電子郵件 `name@example.com` 是可變的，僅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 時用於直接允許清單比對。
- 已棄用：`users/<email>` 被視為使用者 ID，而非電子郵件允許清單。
- Spaces：`spaces/<spaceId>`。

## 配置重點

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // or serviceAccountRef: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; helps mention detection
      allowBots: false,
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          enabled: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Short answers only.",
        },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

備註：

- 服務帳號憑證也可以透過 `serviceAccount` (JSON 字串) 內嵌傳遞。
- `serviceAccountRef` 也受支援 (env/file SecretRef)，包括 `channels.googlechat.accounts.<id>.serviceAccountRef` 下的每個帳號參照。
- 如果未設定 `webhookPath`，預設的 webhook 路徑為 `/googlechat`。
- `dangerouslyAllowNameMatching` 會針對允許清單重新啟用可變的電子郵件主體比對（緊急相容模式）。
- 當啟用 `actions.reactions` 時，可以透過 `reactions` 工具和 `channels action` 使用回應功能。
- 訊息動作會針對文字公開 `send`，並針對明確的附件傳送公開 `upload-file`。`upload-file` 接受 `media` / `filePath` / `path`，以及選用的 `message`、`filename` 和執行緒目標。
- `typingIndicator` 支援 `none`、`message`（預設值）和 `reaction`（回應功能需要使用者 OAuth）。
- 附件會透過 Chat API 下載並儲存在媒體管線中（大小由 `mediaMaxMb` 限制）。
- Bot 傳送的 Google Chat 訊息預設會被忽略。如果您刻意設定了 `allowBots: true`，接受的 bot 傳送訊息將會使用共用的 [bot 迴圈防護](/zh-Hant/channels/bot-loop-protection)。請設定 `channels.defaults.botLoopProtection`，並在當某個聊天室需要不同的配額時使用 `channels.googlechat.botLoopProtection` 或 `channels.googlechat.groups.<space>.botLoopProtection` 來覆寫。

Secrets 參考資料詳情：[Secrets Management](/zh-Hant/gateway/secrets)。

## 疑難排解

### 405 Method Not Allowed

如果 Google Cloud Logs Explorer 顯示類似以下的錯誤：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

這表示 webhook 處理程式尚未註冊。常見原因：

1. **頻道未設定**：您的設定中缺少 `channels.googlechat` 區段。請使用以下方式驗證：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果回傳「Config path not found」，請新增設定（請參閱 [Config highlights](#config-highlights)）。

2. **外掛程式未啟用**：請檢查外掛程式狀態：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果顯示「disabled」，請將 `plugins.entries.googlechat.enabled: true` 加入您的設定。

3. **閘道未重新啟動**：新增設定後，請重新啟動閘道：

   ```bash
   openclaw gateway restart
   ```

驗證頻道是否正在執行：

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### 其他問題

- 檢查 `openclaw channels status --probe` 是否有驗證錯誤或缺少 audience 設定。
- 如果沒有收到任何訊息，請確認 Chat 應用程式的 webhook URL + 事件訂閱。
- 如果提及閘門阻擋了回覆，請將 `botUser` 設為應用程式的使用者資源名稱，並驗證 `requireMention`。
- 在傳送測試訊息時使用 `openclaw logs --follow`，以查看請求是否到達閘道。

相關文件：

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [Security](/zh-Hant/gateway/security)
- [Reactions](/zh-Hant/tools/reactions)

## 相關

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — DM 驗證和配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為和提及閘門
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
