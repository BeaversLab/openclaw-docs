---
summary: "Google Chat 應用程式支援狀態、功能和設定"
read_when:
  - 正在處理 Google Chat 頻道功能
title: "Google Chat"
---

# Google Chat (Chat API)

狀態：已準備好透過 Google Chat API webhooks (僅限 HTTP) 支援私訊與聊天室。

## 快速設定（初學者）

1. 建立 Google Cloud 專案並啟用 **Google Chat API**。
   - 前往：[Google Chat API 憑證](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未啟用 API，請啟用它。
2. 建立 **Service Account**：
   - 按下 **Create Credentials** > **Service Account**。
   - 您可以隨意命名 (例如 `openclaw-chat`)。
   - 將權限留空（按下 **Continue**）。
   - 將擁有存取權的主體留空（按下 **Done**）。
3. 建立並下載 **JSON Key**：
   - 在服務帳戶列表中，點擊您剛建立的那個。
   - 前往 **Keys** 分頁。
   - 點擊 **Add Key** > **Create new key**。
   - 選擇 **JSON** 並按下 **Create**。
4. 將下載的 JSON 檔案儲存在您的閘道主機上 (例如 `~/.openclaw/googlechat-service-account.json`)。
5. 在 [Google Cloud Console Chat Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 中建立 Google Chat 應用程式：
   - 填寫 **Application info**：
     - **應用程式名稱**：(例如 `OpenClaw`)
     - **大頭貼 URL**：(例如 `https://openclaw.ai/logo.png`)
     - **描述**：(例如 `Personal AI Assistant`)
   - 啟用 **Interactive features**。
   - 在 **Functionality** 下，勾選 **Join spaces and group conversations**。
   - 在 **Connection settings** 下，選擇 **HTTP endpoint URL**。
   - 在 **Triggers** 下，選取 **Use a common HTTP endpoint URL for all triggers**，並將其設定為您閘道的公開 URL，後面加上 `/googlechat`。
     - _提示：執行 `openclaw status` 以尋找您閘道的公開 URL。_
   - 在 **Visibility** 下，勾選 **Make this Chat app available to specific people and groups in &lt;Your Domain&gt;**。
   - 在文字方塊中輸入您的電子郵件地址 (例如 `user@example.com`)。
   - 點擊底部的 **Save**。
6. **啟用應用程式狀態**：
   - 儲存後，**重新整理頁面**。
   - 尋找 **App status** 區段（通常在儲存後位於頂部或底部附近）。
   - 將狀態變更為 **Live - available to users**。
   - 再次點擊 **Save**。
7. 使用服務帳號路徑 + webhook 對象配置 OpenClaw：
   - Env: `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - Or config: `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 設定 webhook 對象類型 + 數值（需符合您的 Chat 應用程式設定）。
9. 啟動閘道。Google Chat 將 POST 到您的 webhook 路徑。

## 新增至 Google Chat

一旦閘道開始運作，且您的電子郵件已加入可見性清單：

1. 前往 [Google Chat](https://chat.google.com/)。
2. 點擊 **Direct Messages** 旁邊的 **+**（加號）圖示。
3. 在搜尋列（您通常新增人員的地方）中，輸入您在 Google Cloud Console 中設定的 **App name**。
   - **注意**：此機器人將_不會_出現在「Marketplace」瀏覽清單中，因為它是私人應用程式。您必須透過名稱搜尋它。
4. 從結果中選擇您的機器人。
5. 點擊 **Add** 或 **Chat** 以開始 1:1 對話。
6. 傳送 "Hello" 以觸發助理！

## 公開 URL（僅限 Webhook）

Google Chat Webhook 需要一個公開的 HTTPS 端點。為了安全起見，**僅將 `/googlechat` 路徑暴露**至網際網路。請將 OpenClaw 儀表板和其他敏感端點保留在您的私人網路上。

### 選項 A：Tailscale Funnel（推薦）

使用 Tailscale Serve 作為私人儀表板，並使用 Funnel 作為公開 Webhook 路徑。這樣可以將 `/` 保持為私人狀態，同時僅公開 `/googlechat`。

1. **檢查您的閘道綁定的位址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   記下 IP 地址 (例如 `127.0.0.1`、`0.0.0.0`，或是您的 Tailscale IP，如 `100.x.x.x`)。

2. **僅將儀表板暴露至 tailnet（連接埠 8443）：**

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

4. **授權節點以進行 Funnel 存取：**
   如果系統提示，請造叫輸出中顯示的授權 URL，以便在您的 tailnet 原則中為此節點啟用 Funnel。

5. **驗證設定：**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

您的公開 Webhook URL 將會是：
`https://<node-name>.<tailnet>.ts.net/googlechat`

您的私人儀表板將僅限於 tailnet 存取：
`https://<node-name>.<tailnet>.ts.net:8443/`

在 Google Chat 應用程式設定中使用公開 URL (不含 `:8443`)。

> 注意：此設定在重新開機後會持續存在。若要稍後移除，請執行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 選項 B：反向代理伺服器（Caddy）

如果您使用像 Caddy 這類反向代理，請僅代理特定路徑：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

使用此設定，任何對 `your-domain.com/` 的請求都將被忽略或傳回 404，而 `your-domain.com/googlechat` 則會安全地路由到 OpenClaw。

### 選項 C：Cloudflare Tunnel

設定您的隧道入口規則，僅路由 webhook 路徑：

- **路徑**：`/googlechat` -> `http://localhost:18789/googlechat`
- **預設規則**：HTTP 404 (Not Found)

## 運作原理

1. Google Chat 會將 webhook POST 請求傳送至閘道。每個請求都包含一個 `Authorization: Bearer <token>` 標頭。
   - 當標頭存在時，OpenClaw 會在讀取/解析完整 webhook 內容之前驗證 bearer auth。
   - 在主體中攜帶 `authorizationEventObject.systemIdToken` 的 Google Workspace Add-on 請求是透過更嚴格的預先驗證主體預算來支援。
2. OpenClaw 會根據設定的 `audienceType` + `audience` 驗證權杖：
   - `audienceType: "app-url"` → 受眾 是您的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受眾 是 Cloud 專案編號。
3. 訊息依據空間路由：
   - DM 使用階段金鑰 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - Spaces 使用階段金鑰 `agent:<agentId>:googlechat:group:<spaceId>`。
4. DM 存取預設為配對模式。未知發送者會收到配對碼；請使用以下指令核准：
   - `openclaw pairing approve googlechat <code>`
5. 群組 Spaces 預設需要 @-提及。如果提及偵測需要應用程式的使用者名稱，請使用 `botUser`。

## 目標

使用這些識別碼進行傳遞和允許清單：

- 直接訊息：`users/<userId>` (建議)。
- 原始電子郵件 `name@example.com` 是可變的，且僅在 `channels.googlechat.dangerouslyAllowNameMatching: true` 時用於直接允許清單匹配。
- 已棄用：`users/<email>` 被視為使用者 ID，而非電子郵件允許清單。
- Spaces：`spaces/<spaceId>`。

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

- 服務帳號憑證也可以使用 `serviceAccount` (JSON 字串) 內嵌傳遞。
- 也支援 `serviceAccountRef` (env/file SecretRef)，包括 `channels.googlechat.accounts.<id>.serviceAccountRef` 下的每個帳戶參考。
- 如果未設定 `webhookPath`，預設 webhook 路徑為 `/googlechat`。
- `dangerouslyAllowNameMatching` 會重新啟用允許清單的可變電子郵件主體匹配 (緊急應變相容模式)。
- 當啟用 `actions.reactions` 時，可以透過 `reactions` 工具和 `channels action` 使用回應。
- `typingIndicator` 支援 `none`、`message`（預設）以及 `reaction`（反應需要使用者 OAuth）。
- 附件會透過 Chat API 下載並儲存在媒體管線中（大小由 `mediaMaxMb` 限制）。

機密參考詳情：[機密管理](/zh-Hant/gateway/secrets)。

## 疑難排解

### 405 不允許的方法

如果 Google Cloud Logs Explorer 顯示如下錯誤：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

這表示未註冊 webhook 處理程序。常見原因：

1. **未設定頻道**：您的設定中缺少 `channels.googlechat` 區段。請使用以下指令驗證：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果傳回「Config path not found」，請新增設定（請參閱 [設定亮點](#config-highlights)）。

2. **外掛程式未啟用**：檢查外掛程式狀態：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果顯示「disabled」，請將 `plugins.entries.googlechat.enabled: true` 新增至您的設定。

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

- 檢查 `openclaw channels status --probe` 以找出驗證錯誤或缺少的 audience 設定。
- 如果未收到任何訊息，請確認 Chat 應用程式的 webhook URL + 事件訂閱。
- 如果提及閘門阻擋了回覆，請將 `botUser` 設為應用程式的使用者資源名稱，並驗證 `requireMention`。
- 傳送測試訊息時請使用 `openclaw logs --follow`，以查看請求是否抵達閘道。

相關文件：

- [閘道設定](/zh-Hant/gateway/configuration)
- [安全性](/zh-Hant/gateway/security)
- [反應](/zh-Hant/tools/reactions)

import en from "/components/footer/en.mdx";

<en />
