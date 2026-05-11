---
summary: "Google Chat 應用程式支援狀態、功能和設定"
read_when:
  - Working on Google Chat channel features
title: "Google Chat"
---

狀態：已準備好透過 Google Chat API Webhooks (僅限 HTTP) 接收私人訊息 + 聊天室訊息。

## 快速設定（初學者）

1. 建立一個 Google Cloud 專案並啟用 **Google Chat API**。
   - 前往：[Google Chat API 憑證](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未啟用，請啟用該 API。
2. 建立 **服務帳戶**：
   - 點擊 **建立憑證** (Create Credentials) > **服務帳戶** (Service Account)。
   - 隨意命名（例如 `openclaw-chat`）。
   - 將權限留白（點擊 **繼續** (Continue)）。
   - 將擁有存取權的主體留白（點擊 **完成** (Done)）。
3. 建立並下載 **JSON 金鑰**：
   - 在服務帳戶清單中，點擊您剛才建立的那一個。
   - 前往 **金鑰** (Keys) 分頁。
   - 點擊 **新增金鑰** (Add Key) > **建立新金鑰** (Create new key)。
   - 選擇 **JSON** 並點擊 **建立** (Create)。
4. 將下載的 JSON 檔案儲存在您的閘道主機上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中建立一個 Google Chat 應用程式：
   - 填寫 **應用程式資訊** (Application info)：
     - **應用程式名稱** (App name):（例如 `OpenClaw`）
     - **大頭貼 URL** (Avatar URL):（例如 `https://openclaw.ai/logo.png`）
     - **描述** (Description):（例如 `Personal AI Assistant`）
   - 啟用 **互動功能** (Interactive features)。
   - 在 **功能** (Functionality) 下，勾選 **加入聊天室和群組對話** (Join spaces and group conversations)。
   - 在 **連線設定** (Connection settings) 下，選取 **HTTP 端點 URL** (HTTP endpoint URL)。
   - 在 **觸發條件** (Triggers) 下，選取 **對所有觸發條件使用通用的 HTTP 端點 URL** (Use a common HTTP endpoint URL for all triggers)，並將其設定為您閘道的公開 URL 後面加上 `/googlechat`。
     - _提示：執行 `openclaw status` 以尋找您閘道的公開 URL。_
   - 在 **顯示範圍** (Visibility) 下，勾選 **讓此 Chat 應用程式提供給 `<Your Domain>` 中的特定人員和群組使用** (Make this Chat app available to specific people and groups in)。
   - 在文字方塊中輸入您的電子郵件地址（例如 `user@example.com`）。
   - 點擊底部的 **儲存** (Save)。
6. **啟用應用程式狀態**：
   - 儲存後，**重新整理頁面**。
   - 尋找 **應用程式狀態** (App status) 區段（通常在儲存後的頂部或底部附近）。
   - 將狀態變更為 **上線 - 提供給使用者使用** (Live - available to users)。
   - 再次點擊 **儲存** (Save)。
7. 使用服務帳戶路徑 + webhook 對象 (audience) 設定 OpenClaw：
   - 環境變數： `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或設定檔： `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 設定 webhook 對象類型 + 數值（需符合您的 Chat 應用程式設定）。
9. 啟動閘道。Google Chat 將會 POST 到您的 webhook 路徑。

## 新增至 Google Chat

一旦閘道運行起來，且您的電子郵件已新增到可見性清單中：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 點擊 **Direct Messages** 旁邊的 **+** (加號) 圖示。
3. 在搜尋列（您通常用來新增人員的地方）中，輸入您在 Google Cloud Console 中設定的 **App name**。
   - **注意**：由於這是一個私人應用程式，因此機器人*不會*出現在「Marketplace」瀏覽清單中。您必須按名稱搜尋它。
4. 從結果中選擇您的機器人。
5. 點擊 **Add** 或 **Chat** 以開始 1:1 對話。
6. 傳送 "Hello" 以觸發助理！

## 公開 URL (僅 Webhook)

Google Chat webhook 需要一個公開的 HTTPS 端點。為了安全起見，**僅將 `/googlechat` 路徑暴露**在網際網路上。將 OpenClaw 儀表板和其他敏感端點保留在您的私人網路上。

### 選項 A：Tailscale Funnel (推薦)

使用 Tailscale Serve 做為私人儀表板，並使用 Funnel 做為公開 webhook 路徑。這樣可以保持 `/` 為私人狀態，同時僅暴露 `/googlechat`。

1. **檢查您的閘道綁定的位址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   記下 IP 位址（例如 `127.0.0.1`、`0.0.0.0` 或您的 Tailscale IP，如 `100.x.x.x`）。

2. **僅將儀表板暴露給 tailnet (連接埠 8443)：**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **僅公開暴露 webhook 路徑：**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **授權節點進行 Funnel 存取：**
   如果有提示，請造訪輸出中顯示的授權 URL，以在您的 tailnet 原則中為此節點啟用 Funnel。

5. **驗證設定：**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

您的公開 webhook URL 將會是：
`https://<node-name>.<tailnet>.ts.net/googlechat`

您的私人儀表板將僅限於 tailnet：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 應用程式設定中使用公開 URL (不含 `:8443`)。

> 注意：此設定在重新開機後會持續存在。若要稍後移除它，請執行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 選項 B：反向代理

如果您使用像 Caddy 這樣的反向代理，請僅代理特定路徑：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此設定，任何對 `your-domain.com/` 的請求將被忽略或傳回 404，而 `your-domain.com/googlechat` 則會安全地路由到 OpenClaw。

### 選項 C：Cloudflare Tunnel

設定您的通道 ingress 規則以僅路由 webhook 路徑：

- **路徑**：`/googlechat` -> `http://localhost:18789/googlechat`
- **預設規則**：HTTP 404 (Not Found)

## 運作方式

1. Google Chat 會傳送 webhook POST 請求到閘道。每個請求都包含一個 `Authorization: Bearer <token>` 標頭。
   - 當標頭存在時，OpenClaw 會在讀取/解析完整的 webhook 主體之前驗證 bearer auth。
   - 在主體中攜帶 `authorizationEventObject.systemIdToken` 的 Google Workspace Add-on 請求是透過更嚴格的預先驗證主體預算所支援。
2. OpenClaw 會根據設定的 `audienceType` + `audience` 驗證權杖：
   - `audienceType: "app-url"` → 受眾 是您的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受眾 是 Cloud 專案編號。
3. 訊息會依空間 路由：
   - DM 使用工作階段金鑰 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - 空間 使用工作階段金鑰 `agent:<agentId>:googlechat:group:<spaceId>`。
4. DM 存取預設為配對模式。未知發送者會收到配對碼；請透過以下方式批准：
   - `openclaw pairing approve googlechat <code>`
5. 群組空間預設需要 @-mention。如果提及偵測需要應用程式的使用者名稱，請使用 `botUser`。

## 目標

使用這些識別碼進行傳遞與允許清單：

- 直接訊息：`users/<userId>` (推薦)。
- 原始電子郵件 `name@example.com` 是可變動的，且僅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 時用於直接允許清單比對。
- 已棄用：`users/<email>` 被視為使用者 ID，而非電子郵件允許清單。
- 空間：`spaces/<spaceId>`。

## 設定重點

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
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          allow: true,
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
- 也支援 `serviceAccountRef` (env/file SecretRef)，包括 `channels.googlechat.accounts.<id>.serviceAccountRef` 下的個別帳戶參照。
- 如果未設定 `webhookPath`，預設 webhook 路徑為 `/googlechat`。
- `dangerouslyAllowNameMatching` 會重新啟用允許清單的可變動電子郵件主體比對 (緊急相容性模式)。
- 啟用 `actions.reactions` 時，可以透過 `reactions` 工具和 `channels action` 使用反應。
- 訊息動作公開了用於文字的 `send` 和用於明確附件傳送的 `upload-file`。`upload-file` 接受 `media` / `filePath` / `path` 以及可選的 `message`、`filename` 和執行緒目標。
- `typingIndicator` 支援 `none`、`message` (預設) 和 `reaction` (反應需要使用者 OAuth)。
- 附件會透過 Chat API 下載並儲存在媒體管線中 (大小由 `mediaMaxMb` 上限)。

金鑰參考詳細資訊：[金鑰管理](/zh-Hant/gateway/secrets)。

## 疑難排解

### 405 Method Not Allowed

如果 Google Cloud Logs Explorer 顯示類似以下的錯誤：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

這表示未註冊 webhook 處理程式。常見原因：

1. **未設定通道**：您的設定中缺少 `channels.googlechat` 區塊。請使用以下指令驗證：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果傳回「Config path not found」，請新增設定 (請參閱 [設定重點](#config-highlights))。

2. **未啟用外掛程式**：檢查外掛程式狀態：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果顯示「disabled」，請在您的設定中加入 `plugins.entries.googlechat.enabled: true`。

3. **未重新啟動閘道**：新增設定後，請重新啟動閘道：

   ```bash
   openclaw gateway restart
   ```

驗證通道是否正在執行：

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### 其他問題

- 檢查 `openclaw channels status --probe` 是否有驗證錯誤或缺少受眾設定。
- 如果未收到任何訊息，請確認 Chat 應用程式的 webhook URL + 事件訂閱。
- 如果提及閘門封鎖了回覆，請將 `botUser` 設定為應用程式的使用者資源名稱，並驗證 `requireMention`。
- 傳送測試訊息時使用 `openclaw logs --follow` 以查看要求是否到達閘道。

相關文件：

- [閘道設定](/zh-Hant/gateway/configuration)
- [安全性](/zh-Hant/gateway/security)
- [反應](/zh-Hant/tools/reactions)

## 相關

- [通道概覽](/zh-Hant/channels) — 所有支援的通道
- [配對](/zh-Hant/channels/pairing) — 私訊認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘道
- [通道路由](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
