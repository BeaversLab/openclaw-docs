---
summary: "Google Chat 應用程式支援狀態、功能和組態"
read_when:
  - Working on Google Chat channel features
title: "Google Chat"
---

# Google Chat (Chat API)

狀態：已準備好透過 Google Chat API webhooks 支援私訊 (DM) 和聊天室 (僅限 HTTP)。

## 快速設定 (初學者)

1. 建立一個 Google Cloud 專案並啟用 **Google Chat API**。
   - 前往：[Google Chat API Credentials](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未啟用，請啟用 API。
2. 建立 **Service Account**：
   - 按一下 **Create Credentials** > **Service Account**。
   - 將其命名為您喜歡的名稱 (例如 `openclaw-chat`)。
   - 將權限留白 (按一下 **Continue**)。
   - 將擁有存取權的主體 留白 (按一下 **Done**)。
3. 建立並下載 **JSON Key**：
   - 在服務帳戶清單中，按一下您剛建立的那一個。
   - 前往 **Keys** 分頁。
   - 按一下 **Add Key** > **Create new key**。
   - 選取 **JSON** 並按下 **建立**。
4. 將下載的 JSON 檔案儲存在您的 Gateway 主機上（例如 `~/.openclaw/googlechat-service-account.json`）。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中建立一個 Google Chat 應用程式：
   - 填寫 **Application info**：
     - **App name**：（例如 `OpenClaw`）
     - **Avatar URL**：（例如 `https://openclaw.ai/logo.png`）
     - **Description**：（例如 `Personal AI Assistant`）
   - 啟用 **Interactive features**。
   - 在 **Functionality** 下，勾選 **Join spaces and group conversations**。
   - 在 **Connection settings** 下，選取 **HTTP endpoint URL**。
   - 在 **Triggers** 下，選取 **Use a common HTTP endpoint URL for all triggers**，並將其設定為您 Gateway 的公開 URL 後面加上 `/googlechat`。
     - _提示：執行 `openclaw status` 以尋找您 Gateway 的公開 URL。_
   - 在 **可見度** (Visibility) 下，勾選 **讓此 Chat 應用程式可供 &lt;您的網域&gt; 中的特定人員和群組使用**。
   - 在文字方塊中輸入您的電子郵件地址 (例如 `user@example.com`)。
   - 按一下底部的 **儲存** (Save)。
6. **啟用應用程式狀態**：
   - 儲存後，**重新整理頁面**。
   - 尋找 **應用程式狀態** (App status) 區段 (通常在儲存後位於頂部或底部附近)。
   - 將狀態變更為 **即時 - 提供給使用者使用** (Live - available to users)。
   - 再次按一下 **儲存** (Save)。
7. 使用服務帳戶路徑 + webhook 受眾 (audience) 來設定 OpenClaw：
   - Env: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或設定: `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 設定 webhook 受眾類型 + 數值 (須符合您的 Chat 應用程式設定)。
9. 啟動閘道。Google Chat 將 POST 資料到您的 webhook 路徑。

## 新增至 Google Chat

一旦閘道正在執行，且您的電子郵件已新增至可見度清單中：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 點擊 **直接訊息** 旁邊的 **+**（加號）圖示。
3. 在搜尋列（通常用於新增人員的地方）中，輸入您在 Google Cloud Console 中設定的 **應用程式名稱**。
   - **注意**：機器人將*不*會出現在「Marketplace」瀏覽清單中，因為它是一個私人應用程式。您必須依名稱搜尋它。
4. 從結果中選取您的機器人。
5. 點擊 **Add** 或 **Chat** 以開始一對一對話。
6. 傳送 "Hello" 以觸發助理！

## 公開 URL（僅 Webhook）

Google Chat Webhook 需要一個公開的 HTTPS 端點。為了安全起見，**僅將 `/googlechat` 路徑暴露**至網際網路。將 OpenClaw 儀表板和其他敏感端點保留在您的私人網路上。

### 選項 A：Tailscale Funnel（推薦）

針對私有儀表板使用 Tailscale Serve，並針對公開 webhook 路徑使用 Funnel。這能讓 `/` 保持私有，同時僅公開 `/googlechat`。

1. **檢查您的閘道綁定的位址：**

   ```exec
   ss -tlnp | grep 18789
   ```

   記下 IP 位址（例如 `127.0.0.1`、`0.0.0.0` 或您的 Tailscale IP，如 `100.x.x.x`）。

2. **僅將儀表板暴露至 tailnet（埠 8443）：**

   ```exec
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **僅公開 webhook 路徑：**

   ```exec
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **授權節點存取 Funnel：**
   如果系統提示，請造叫輸出中顯示的授權 URL，以在您的 tailnet 原則中啟用此節點的 Funnel 功能。

5. **驗證組態：**

   ```exec
   tailscale serve status
   tailscale funnel status
   ```

您的公開 webhook URL 將會是：
`https://<node-name>.<tailnet>.ts.net/googlechat`

您的私有儀表板將保持僅限 tailnet 存取：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 應用程式設定中使用公開 URL（不含 `:8443`）。

> 注意：此設定在重新開機後會持續保留。若要稍後移除它，請執行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 選項 B：反向代理（Caddy）

如果您使用像 Caddy 這樣的反向代理，僅代理特定路徑：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此設定，任何對 `your-domain.com/` 的請求都將被忽略或傳回 404，而 `your-domain.com/googlechat` 則會安全地路由至 OpenClaw。

### 選項 C：Cloudflare Tunnel

設定通道的入口規則以僅路由 Webhook 路徑：

- **路徑**：`/googlechat` -> `http://localhost:18789/googlechat`
- **預設規則**：HTTP 404 (Not Found)

## 運作方式

1. Google Chat 會將 Webhook POST 請求傳送至閘道。每個請求都包含一個 `Authorization: Bearer <token>` 標頭。
   - 當標頭存在時，OpenClaw 會在讀取/解析完整的 webhook 主體之前驗證 bearer auth。
   - 透過更嚴格的預先驗證主體預算，支援在主體中攜帶 `authorizationEventObject.systemIdToken` 的 Google Workspace 擴充功能請求。
2. OpenClaw 會根據設定的 `audienceType` + `audience` 驗證權杖：
   - `audienceType: "app-url"` → audience 是您的 HTTPS webhook URL。
   - `audienceType: "project-number"` → audience 是 Cloud 專案編號。
3. 訊息依空間路由：
   - DM 使用會話金鑰 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - Spaces 使用會話金鑰 `agent:<agentId>:googlechat:group:<spaceId>`。
4. DM 存取預設為配對模式。未知發送者會收到配對碼；透過以下方式批准：
   - `openclaw pairing approve googlechat <code>`
5. 群組空間預設需要 @-提及。如果提及偵測需要應用程式的使用者名稱，請使用 `botUser`。

## 目標

使用這些識別符進行傳遞和允許清單：

- 直接訊息：`users/<userId>`（建議）。
- 原始電子郵件 `name@example.com` 是可變的，僅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 時用於直接允許清單匹配。
- 已棄用：`users/<email>` 被視為使用者 ID，而非電子郵件允許清單。
- 聊天室：`spaces/<spaceId>`。

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

註記：

- 服務帳號憑證也可以透過 `serviceAccount`（JSON 字串）內嵌傳遞。
- 也支援 `serviceAccountRef`（env/file SecretRef），包括 `channels.googlechat.accounts.<id>.serviceAccountRef` 下的每個帳號參照。
- 如果未設定 `webhookPath`，預設的 Webhook 路徑為 `/googlechat`。
- `dangerouslyAllowNameMatching` 會針對允許清單重新啟用可變電子郵件主體匹配（應急相容模式）。
- 當啟用 `actions.reactions` 時，可以透過 `reactions` 工具和 `channels action` 使用反應。
- `typingIndicator` 支援 `none`、`message`（預設）以及 `reaction`（反應需要使用者 OAuth）。
- 附件會透過 Chat API 下載並儲存在媒體管道中（大小上限由 `mediaMaxMb` 限制）。

秘密參考詳細資訊：[Secrets Management](/zh-Hant/gateway/secrets)。

## 疑難排解

### 405 Method Not Allowed

如果 Google Cloud Logs Explorer 顯示類似錯誤：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

這表示未註冊 webhook 處理程序。常見原因：

1. **未設定通道**：您的設定中缺少 `channels.googlechat` 區段。請使用以下方式驗證：

   ```exec
   openclaw config get channels.googlechat
   ```

   如果返回「Config path not found」，請新增設定（請參閱 [Config highlights](#config-highlights)）。

2. **未啟用外掛程式**：檢查外掛程式狀態：

   ```exec
   openclaw plugins list | grep googlechat
   ```

   如果顯示「disabled」，請將 `plugins.entries.googlechat.enabled: true` 新增至您的設定中。

3. **閘道未重新啟動**：新增設定後，請重新啟動閘道：

   ```exec
   openclaw gateway restart
   ```

驗證頻道是否正在執行：

```exec
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### 其他問題

- 檢查 `openclaw channels status --probe` 是否有驗證錯誤或缺少受众設定。
- 如果沒有收到訊息，請確認 Chat 應用程式的 webhook URL 和事件訂閱。
- 如果提及閘門阻擋了回覆，請將 `botUser` 設定為應用程式的使用者資源名稱，並驗證 `requireMention`。
- 傳送測試訊息時使用 `openclaw logs --follow`，以查看請求是否到達閘道。

相關文件：

- [Gateway configuration](/zh-Hant/gateway/configuration)
- [Security](/zh-Hant/gateway/security)
- [回應](/zh-Hant/tools/reactions)
