---
summary: "Microsoft Teams 機器人支援狀態、功能及配置"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams (外掛程式)

> 「入此門者，當放棄一切希望。」

更新日期：2026-01-21

狀態：支援文字 + DM 附件；頻道/群組檔案傳送需要 `sharePointSiteId` + Graph 權限（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。投票會透過 Adaptive Cards 發送。訊息動作針對以檔案為優先的傳送會顯示明確的 `upload-file`。

## 需要外掛程式

Microsoft Teams 作為外掛程式發行，未隨附於核心安裝中。

**重大變更 (2026.1.15)：** Microsoft Teams 已從核心移出。如果您使用它，必須安裝此外掛程式。

原因說明：保持核心安裝更輕量，並讓 Microsoft Teams 相依性能獨立更新。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/msteams
```

本機結帳 (當從 git repo 執行時)：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

如果您在設定期間選擇 Teams 且偵測到 git 結帳，
OpenClaw 將自動提供本機安裝路徑。

詳細資訊：[外掛程式](/en/tools/plugin)

## 快速設定 (初學者)

1. 安裝 Microsoft Teams 外掛程式。
2. 建立 **Azure Bot** (App ID + client secret + tenant ID)。
3. 使用這些憑證設定 OpenClaw。
4. 透過公開 URL 或通道公開 `/api/messages`（預設連接埠 3978）。
5. 安裝 Teams 應用程式套件並啟動閘道。

最小配置：

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

注意：群組聊天預設會被封鎖（`channels.msteams.groupPolicy: "allowlist"`）。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 以允許任何成員，以提及為門檻）。

## 目標

- 透過 Teams 私訊、群組聊天或頻道與 OpenClaw 對話。
- 保持路由確定性：回覆一律會回到它們抵達的頻道。
- 預設為安全的頻道行為 (除非另有配置，否則需要提及)。

## 配置寫入

預設情況下，Microsoft Teams 允許寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 存取控制 (私訊 + 群組)

**私訊存取**

- 預設值：`channels.msteams.dmPolicy = "pairing"`。未知的發送者在獲批准前將被忽略。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID。
- UPN/顯示名稱是可變的；預設情況下停用直接比對，且僅在啟用 `channels.msteams.dangerouslyAllowNameMatching: true` 時開啟。
- 當認證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取權**

- 預設值：`channels.msteams.groupPolicy = "allowlist"`（除非您新增 `groupAllowFrom`，否則為封鎖狀態）。使用 `channels.defaults.groupPolicy` 以在未設定時覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些發送者可以在群組聊天/頻道中觸發（會退回至 `channels.msteams.allowFrom`）。
- 設定 `groupPolicy: "open"` 以允許任何成員（預設仍受限於提及機制）。
- 若要**不允許任何頻道**，請設定 `channels.msteams.groupPolicy: "disabled"`。

範例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"],
    },
  },
}
```

**Teams + 頻道允許清單**

- 透過在 `channels.msteams.teams` 下列出團隊和頻道，來限定群組/頻道回覆的範圍。
- 金鑰應使用穩定的團隊 ID 和頻道交談 ID。
- 當 `groupPolicy="allowlist"` 且存在 Teams 允許清單時，僅接受列出的團隊/頻道（提及限制）。
- 設定精靈接受 `Team/Channel` 條目並為您儲存它們。
- 啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）
  並記錄對應關係；未解析的團隊/頻道名稱將保持輸入狀態，但除非啟用 `channels.msteams.dangerouslyAllowNameMatching: true`，否則預設會在路由時被忽略。

範例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "My Team": {
          channels: {
            General: { requireMention: true },
          },
        },
      },
    },
  },
}
```

## 運作方式

1. 安裝 Microsoft Teams 外掛程式。
2. 建立 **Azure Bot**（應用程式 ID + 金鑰 + 租用戶 ID）。
3. 建置 **Teams 應用程式套件**，其中參照該 Bot 並包含下列 RSC 權限。
4. 將 Teams 應用程式上傳/安裝到團隊（或個人範圍以進行私訊）。
5. 在 `~/.openclaw/openclaw.json`（或環境變數）中設定 `msteams` 並啟動閘道。
6. 閘道預設會在 `/api/messages` 上監聽 Bot Framework webhook 流量。

## Azure Bot 設定（先決條件）

在設定 OpenClaw 之前，您需要建立 Azure Bot 資源。

### 步驟 1：建立 Azure Bot

1. 前往 [建立 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **[基本]** 索引標籤：

   | 欄位             | 值                                                     |
   | ---------------- | ------------------------------------------------------ |
   | **Bot 名稱代碼** | 您的 Bot 名稱，例如 `openclaw-msteams`（必須是唯一的） |
   | **訂閱**         | 選取您的 Azure 訂閱                                    |
   | **資源群組**     | 建立新的或使用現有的                                   |
   | **定價層級**     | **免費** (適用於開發/測試)                             |
   | **應用程式類型** | **單一租用戶** (建議 - 請參閱下方註記)                 |
   | **建立類型**     | **建立新的 Microsoft 應用程式 ID**                     |

> **棄用公告：** 新的多租用戶 Bot 建立功能已於 2025-07-31 後停用。新的 Bot 請使用 **單一租用戶**。

3. 點擊 **Review + create** (審閱 + 建立) → **Create** (建立) (等候約 1-2 分鐘)

### 步驟 2：取得認證

1. 前往您的 Azure Bot 資源 → **Configuration** (組態)
2. 複製 **Microsoft App ID** → 這是您的 `appId`
3. 點擊 **Manage Password** (管理密碼) → 前往應用程式註冊
4. 在 **Certificates & secrets** (憑證與密碼) 下方 → **New client secret** (新增用戶端密碼) → 複製 **Value** (值) → 這就是您的 `appPassword`
5. 前往 **Overview** (概觀) → 複製 **Directory (tenant) ID** (目錄 (租用戶) ID) → 這就是您的 `tenantId`

### 步驟 3：設定訊息端點

1. 在 Azure Bot 中 → **Configuration** (組態)
2. 將 **Messaging endpoint** (訊息端點) 設定為您的 webhook URL：
   - 正式環境：`https://your-domain.com/api/messages`
   - 本機開發：使用通道（請參閱下方的[本機開發](#local-development-tunneling)）

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot 中 → **Channels** (頻道)
2. 點擊 **Microsoft Teams** → Configure (設定) → Save (儲存)
3. 接受服務條款

## 本機開發 (通道)

Teams 無法連線至 `localhost`。請使用通道進行本機開發：

**選項 A：ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**選項 B：Tailscale Funnel**

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Teams 開發人員入口網站 (替代方案)

除了手動建立 manifest ZIP 檔案之外，您也可以使用 [Teams 開發人員入口網站](https://dev.teams.microsoft.com/apps)：

1. 點擊 **+ New app** (+ 新增應用程式)
2. 填寫基本資訊 (名稱、描述、開發人員資訊)
3. 前往 **App features** (應用程式功能) → **Bot**
4. 選取 **Enter a bot ID manually** (手動輸入 Bot ID) 並貼上您的 Azure Bot 應用程式 ID
5. 勾選範圍：**Personal** (個人)、**Team** (團隊)、**Group Chat** (群組聊天)
6. 點擊 **Distribute** (發佈) → **Download app package** (下載應用程式套件)
7. 在 Teams 中：**Apps** (應用程式) → **Manage your apps** (管理您的應用程式) → **Upload a custom app** (上傳自訂應用程式) → 選取 ZIP 檔案

這通常比手動編輯 JSON 資訊清單更容易。

## 測試 Bot

**選項 A：Azure Web Chat (先驗證 webhook)**

1. 在 Azure 入口網站 → 您的 Azure Bot 資源 → **Test in Web Chat** (在 Web 聊天中測試)
2. 傳送訊息 - 您應該會看到回應
3. 這確認您的 webhook 端點在 Teams 設定之前運作正常

**選項 B：Teams (安裝應用程式後)**

1. 安裝 Teams 應用程式 (側載或組織目錄)
2. 在 Teams 中尋找機器人並傳送訊息
3. 檢查 gateway 日誌中的傳入活動

## 安裝（最簡文字模式）

1. **安裝 Microsoft Teams 外掛程式**
   - 來自 npm：`openclaw plugins install @openclaw/msteams`
   - 從本機結帳：`openclaw plugins install ./path/to/local/msteams-plugin`

2. **機器人註冊**
   - 建立一個 Azure Bot（見上文）並記下：
     - App ID
     - Client secret (App password)
     - Tenant ID (單一租戶)

3. **Teams 應用程式資訊清單**
   - 包含一個帶有 `botId = <App ID>` 的 `bot` 項目。
   - 範圍：`personal`、`team`、`groupChat`。
   - `supportsFiles: true` （個人範圍檔案處理所需）。
   - 新增 RSC 權限（見下文）。
   - 建立圖示：`outline.png` (32x32) 和 `color.png` (192x192)。
   - 將這三個檔案壓縮在一起：`manifest.json`、`outline.png`、`color.png`。

4. **設定 OpenClaw**

   ```json5
   {
     channels: {
       msteams: {
         enabled: true,
         appId: "<APP_ID>",
         appPassword: "<APP_PASSWORD>",
         tenantId: "<TENANT_ID>",
         webhook: { port: 3978, path: "/api/messages" },
       },
     },
   }
   ```

   您也可以使用環境變數來代替設定鍵：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **機器人端點**
   - 將 Azure Bot 傳訊端點設為：
     - `https://<host>:3978/api/messages` （或您選擇的路徑/連接埠）。

6. **執行 gateway**
   - 當安裝外掛程式且存在含有憑證的 `msteams` 設定時，Teams 頻道會自動啟動。

## 成員資訊動作

OpenClaw 針對 Microsoft Teams 公開了支援 Graph 的 `member-info` 動作，讓代理程式和自動化能夠直接從 Microsoft Graph 解析頻道成員詳細資料（顯示名稱、電子郵件、角色）。

需求：

- `Member.Read.Group` RSC 權限（已包含在推薦的 manifest 中）
- 若要進行跨團隊查詢：需具備 `User.Read.All` Graph 應用程式權限並取得管理員同意

此動作由 `channels.msteams.actions.memberInfo` 閘控（預設：當有 Graph 憑證可用時啟用）。

## 歷程記錄內容

- `channels.msteams.historyLimit` 控制要將多少最近的頻道/群組訊息包裝到提示中。
- 會退回至 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設 50）。
- 擷取的執行緒歷程記錄會透過寄件者允許清單（`allowFrom` / `groupAllowFrom`）進行篩選，因此執行緒內容植入僅包含來自允許寄件者的訊息。
- DM 歷程記錄可以用 `channels.msteams.dmHistoryLimit`（使用者輪次）限制。每位使用者的覆寫設定：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限 (Manifest)

這是我們 Teams 應用程式 manifest 中**現有的資源特定權限**。它們僅適用於安裝該應用程式的團隊/聊天內。

**對於頻道（團隊範圍）：**

- `ChannelMessage.Read.Group` (應用程式) - 接收所有頻道訊息而無需 @提及
- `ChannelMessage.Send.Group` (應用程式)
- `Member.Read.Group` (應用程式)
- `Owner.Read.Group` (應用程式)
- `ChannelSettings.Read.Group` (應用程式)
- `TeamMember.Read.Group` (應用程式)
- `TeamSettings.Read.Group` (應用程式)

**針對群組聊天：**

- `ChatMessage.Read.Chat` (應用程式) - 接收所有群組聊天訊息而不需 @提及

## Teams 資訊清單範例 (已編輯)

包含必要欄位的精簡、有效範例。請置換 ID 和 URL。

```json5
{
  $schema: "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  manifestVersion: "1.23",
  version: "1.0.0",
  id: "00000000-0000-0000-0000-000000000000",
  name: { short: "OpenClaw" },
  developer: {
    name: "Your Org",
    websiteUrl: "https://example.com",
    privacyUrl: "https://example.com/privacy",
    termsOfUseUrl: "https://example.com/terms",
  },
  description: { short: "OpenClaw in Teams", full: "OpenClaw in Teams" },
  icons: { outline: "outline.png", color: "color.png" },
  accentColor: "#5B6DEF",
  bots: [
    {
      botId: "11111111-1111-1111-1111-111111111111",
      scopes: ["personal", "team", "groupChat"],
      isNotificationOnly: false,
      supportsCalling: false,
      supportsVideo: false,
      supportsFiles: true,
    },
  ],
  webApplicationInfo: {
    id: "11111111-1111-1111-1111-111111111111",
  },
  authorization: {
    permissions: {
      resourceSpecific: [
        { name: "ChannelMessage.Read.Group", type: "Application" },
        { name: "ChannelMessage.Send.Group", type: "Application" },
        { name: "Member.Read.Group", type: "Application" },
        { name: "Owner.Read.Group", type: "Application" },
        { name: "ChannelSettings.Read.Group", type: "Application" },
        { name: "TeamMember.Read.Group", type: "Application" },
        { name: "TeamSettings.Read.Group", type: "Application" },
        { name: "ChatMessage.Read.Chat", type: "Application" },
      ],
    },
  },
}
```

### 資訊清單注意事項 (必備欄位)

- `bots[].botId` **必須**符合 Azure Bot 應用程式 ID。
- `webApplicationInfo.id` **必須**符合 Azure Bot 應用程式 ID。
- `bots[].scopes` 必須包含您計畫使用的介面 (`personal`、`team`、`groupChat`)。
- 在個人範圍中處理檔案需要 `bots[].supportsFiles: true`。
- 如果您需要頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送。

### 更新現有應用程式

若要更新已安裝的 Teams 應用程式 (例如，新增 RSC 權限)：

1. 使用新設定更新您的 `manifest.json`
2. **增加 `version` 欄位的值** (例如，`1.0.0` → `1.1.0`)
3. **重新壓縮** 包含圖示的資訊清單 (`manifest.json`、`outline.png`、`color.png`)
4. 上傳新的 zip 檔案：
   - **選項 A (Teams 系統管理中心)：** Teams 系統管理中心 → Teams 應用程式 → 管理應用程式 → 尋找您的應用程式 → 上傳新版本
   - **選項 B (側載)：** 在 Teams 中 → 應用程式 → 管理您的應用程式 → 上傳自訂應用程式
5. **針對團隊頻道：** 在每個團隊中重新安裝應用程式以讓新權限生效
6. **完全結束並重新啟動 Teams** (不只是關閉視窗) 以清除快取的應用程式中繼資料

## 功能：僅限 RSC 與 Graph 的比較

### 使用 **僅限 Teams RSC** (已安裝應用程式，無 Graph API 權限)

可運作：

- 讀取頻道訊息 **文字** 內容。
- 傳送頻道訊息 **文字** 內容。
- 接收 **個人 (DM)** 檔案附件。

無法運作：

- 頻道/群組 **圖片或檔案內容** (僅包含 HTML 存根)。
- 下載儲存在 SharePoint/OneDrive 的附件。
- 讀取訊息歷史記錄 (即時 Webhook 事件以外)。

### 使用 **Teams RSC + Microsoft Graph 應用程式權限**

新增：

- 下載託管內容（貼上訊息中的圖片）。
- 下載儲存在 SharePoint/OneDrive 中的檔案附件。
- 透過 Graph 讀取頻道/聊天訊息記錄。

### RSC 與 Graph API

| 功能           | RSC 權限           | Graph API                 |
| -------------- | ------------------ | ------------------------- |
| **即時訊息**   | 是（透過 webhook） | 否（僅輪詢）              |
| **歷史訊息**   | 否                 | 是（可查詢記錄）          |
| **設定複雜度** | 僅應用程式清單     | 需要管理員同意 + 權杖流程 |
| **離線運作**   | 否（必須執行中）   | 是（隨時查詢）            |

**總結：** RSC 用於即時監聽；Graph API 用於存取歷史記錄。若要在離線時補上錯過的訊息，您需要使用具有 `ChannelMessage.Read.All` 的 Graph API（需要管理員同意）。

## 啟用 Graph 的媒體 + 記錄（頻道所需）

如果您需要在 **頻道** 中使用圖片/檔案，或想要擷取 **訊息記錄**，您必須啟用 Microsoft Graph 權限並授予管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊** 中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All` （頻道附件 + 記錄）
   - `Chat.Read.All` 或 `ChatMessage.Read.All` （群組聊天）
2. 為租用戶**授予管理員同意**。
3. 增加 Teams 應用程式的 **清單版本**，重新上傳，並**在 Teams 中重新安裝應用程式**。
4. **完全結束並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**提及使用者的額外權限：** 對於交談中的使用者，使用者 @提及開箱即用。但是，如果您想要動態搜尋並提及**不在目前交談中**的使用者，請新增 `User.Read.All` （應用程式）權限並授予管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長（例如，LLM 回應緩慢），您可能會看到：

- 閘道逾時
- Teams 重試訊息（導致重複）
- 回應遺失

OpenClaw 透過快速回應並主動發送回應來處理此問題，但非常緩慢的回應仍可能導致問題。

### 格式設定

Teams markdown 比 Slack 或 Discord 更有限：

- 基本格式設定有效：**粗體**，_斜體_，`code`，連結
- 複雜的 Markdown（表格、巢狀清單）可能無法正確呈現
- 支援針對投票和任意卡片傳送的 Adaptive Cards（見下文）

## 設定

金鑰設定（共用頻道模式請參閱 `/gateway/configuration`）：

- `channels.msteams.enabled`：啟用/停用頻道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.webhook.port`（預設為 `3978`）
- `channels.msteams.webhook.path`（預設為 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：pairing）
- `channels.msteams.allowFrom`：DM 允許清單（建議使用 AAD 物件 ID）。當可使用 Graph 存取權時，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：緊急開關，用於重新啟用可變更的 UPN/顯示名稱比對及直接團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`：出站文字區塊大小。
- `channels.msteams.chunkMode`：`length`（預設）或 `newline` 以在長度分割前依空行（段落邊界）分割。
- `channels.msteams.mediaAllowHosts`：入站附件主機的允許清單（預設為 Microsoft/Teams 網域）。
- `channels.msteams.mediaAuthAllowHosts`：在媒體重試時附加 Authorization 標頭的允許清單（預設為 Graph + Bot Framework 主機）。
- `channels.msteams.requireMention`：在頻道/群組中要求 @提及（預設為 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（請參閱 [回覆樣式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：各團隊覆寫。
- `channels.msteams.teams.<teamId>.requireMention`：各團隊覆寫。
- `channels.msteams.teams.<teamId>.tools`：當缺少頻道覆寫時使用的預設各團隊工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：預設各團隊各寄件者工具原則覆寫（支援 `"*"` 萬用字元）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：各頻道覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：各頻道覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：各頻道工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：各頻道各發送者工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 金鑰應使用顯式前綴：
  `id:`、`e164:`、`username:`、`name:`（舊版無前綴金鑰仍僅對應至 `id:`）。
- `channels.msteams.actions.memberInfo`：啟用或停用以 Graph 為後端的成員資訊動作（預設值：當有 Graph 憑證時啟用）。
- `channels.msteams.sharePointSiteId`：用於群組聊天/頻道中檔案上傳的 SharePoint 網站 ID（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與工作階段

- 工作階段金鑰遵循標準代理程式格式（請參閱 [/concepts/session](/en/concepts/session)）：
  - 直接訊息共用主工作階段（`agent:<agentId>:<mainKey>`）。
  - 頻道/群組訊息使用交談 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆風格：主題串與貼文

Teams 最近在相同的基礎資料模型上推出了兩種頻道 UI 風格：

| 風格                   | 描述                           | 建議的 `replyStyle` |
| ---------------------- | ------------------------------ | ------------------- |
| **貼文**（經典）       | 訊息顯示為卡片，下方有串列回覆 | `thread`（預設值）  |
| **主題串**（類 Slack） | 訊息線性流動，更像 Slack       | `top-level`         |

**問題：** Teams API 不會公開頻道使用的 UI 風格。如果您使用錯誤的 `replyStyle`：

- 在主題串風格頻道中使用 `thread` → 回覆會顯示得尷尬地巢狀化
- 在貼文風格頻道中使用 `top-level` → 回覆會顯示為獨立的頂層貼文，而非在主題串中

**解決方案：** 根據頻道的設定方式，逐頻道設定 `replyStyle`：

```json5
{
  channels: {
    msteams: {
      replyStyle: "thread",
      teams: {
        "19:abc...@thread.tacv2": {
          channels: {
            "19:xyz...@thread.tacv2": {
              replyStyle: "top-level",
            },
          },
        },
      },
    },
  },
}
```

## 附件與圖片

**目前限制：**

- **直接訊息 (DMs)：** 圖片和檔案附件透過 Teams 機器人檔案 API 運作。
- **頻道/群組：** 附件存放於 M365 儲存空間 中。Webhook 載荷僅包含 HTML 存根，而非實際檔案位元組。下載頻道附件**需要 Graph API 權限**。
- 若要明確優先傳送檔案，請使用 `action=upload-file` 搭配 `media` / `filePath` / `path`；選用的 `message` 將成為隨附的文字/留言，而 `filename` 則會覆寫上傳的名稱。

若無 Graph 權限，包含圖片的頻道訊息將僅以文字形式接收 (機器人無法存取圖片內容)。
預設情況下，OpenClaw 僅從 Microsoft/Teams 主機名稱下載媒體。可透過 `channels.msteams.mediaAllowHosts` 覆寫 (使用 `["*"]` 以允許任何主機)。
授權標頭僅會附加至 `channels.msteams.mediaAuthAllowHosts` 中的主機 (預設為 Graph + Bot Framework 主機)。請嚴格管理此清單 (避免多租用戶後綴)。

## 在群組聊天中傳送檔案

機器人可以使用 FileConsentCard 流程 (內建) 在直接訊息 中傳送檔案。然而，**在群組聊天/頻道中傳送檔案** 需要額外設定：

| 內容                | 檔案傳送方式                              | 所需設定                             |
| ------------------- | ----------------------------------------- | ------------------------------------ |
| **直接訊息 (DMs)**  | FileConsentCard → 使用者接受 → 機器人上傳 | 開箱即用                             |
| **群組聊天/頻道**   | 上傳至 SharePoint → 分享連結              | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片 (任何內容)** | Base64 編碼內嵌                           | 開箱即用                             |

### 為何群組聊天需要 SharePoint

機器人沒有個人 OneDrive 磁碟機 (`/me/drive` Graph API 端點不適用於應用程式身分識別)。若要在群組聊天/頻道中傳送檔案，機器人會上傳至 **SharePoint 網站** 並建立分享連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中**新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (應用程式) - 上傳檔案至 SharePoint
   - `Chat.Read.All` (應用程式) - 選用，啟用個別使用者分享連結

2. 為租用戶**授予管理員同意**。

3. **取得您的 SharePoint 網站 ID：**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **設定 OpenClaw：**

   ```json5
   {
     channels: {
       msteams: {
         // ... other config ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2",
       },
     },
   }
   ```

### 分享行為

| 權限                                    | 分享行為                               |
| --------------------------------------- | -------------------------------------- |
| 僅限 `Sites.ReadWrite.All`              | 全組織分享連結（組織內任何人皆可存取） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每個使用者分享連結（僅聊天成員可存取） |

每個使用者的分享更安全，因為只有聊天參與者可以存取檔案。如果缺少 `Chat.Read.All` 權限，機器人會退回到全組織分享。

### 退回行為

| 情境                                        | 結果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，傳送分享連結                  |
| 群組聊天 + 檔案 + 無 `sharePointSiteId`     | 嘗試上傳至 OneDrive（可能會失敗），僅傳送文字    |
| 個人聊天 + 檔案                             | FileConsentCard 流程（不需 SharePoint 即可運作） |
| 任何情境 + 圖片                             | Base64 編碼內嵌（不需 SharePoint 即可運作）      |

### 檔案儲存位置

上傳的檔案會儲存在已設定 SharePoint 網站之預設文件庫中的 `/OpenClawShared/` 資料夾內。

## 投票 (Adaptive Cards)

OpenClaw 會將 Teams 投票以 Adaptive Cards 形式傳送（沒有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票會由閘道記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道必須保持上線才能記錄投票。
- 投票尚不會自動發布結果摘要（如有需要請檢查存放檔案）。

## Adaptive Cards (任意)

使用 `message` 工具或 CLI 傳送任何 Adaptive Card JSON 給 Teams 使用者或對話。

`card` 參數接受 Adaptive Card JSON 物件。當提供 `card` 時，訊息文字為選填。

**Agent 工具：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello!" }],
  },
}
```

**CLI：**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

參閱 [Adaptive Cards 文件](https://adaptivecards.io/) 以了解卡片架構和範例。關於目標格式的詳細資訊，請參閱下方的 [Target formats](#target-formats)。

## 目標格式

MSTeams 目標使用前綴字來區分使用者和對話：

| 目標類型         | 格式                             | 範例                                             |
| ---------------- | -------------------------------- | ------------------------------------------------ |
| 使用者 (依 ID)   | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`      |
| 使用者 (依名稱)  | `user:<display-name>`            | `user:John Smith` (需要 Graph API)               |
| 群組/頻道        | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`         |
| 群組/頻道 (原始) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (如果包含 `@thread`) |

**CLI 範例：**

```bash
# Send to a user by ID
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# Send to a user by display name (triggers Graph API lookup)
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# Send to a group chat or channel
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# Send an Adaptive Card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
```

**Agent 工具範例：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:John Smith",
  message: "Hello!",
}
```

```json5
{
  action: "send",
  channel: "msteams",
  target: "conversation:19:abc...@thread.tacv2",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello" }],
  },
}
```

注意：若沒有 `user:` 前綴，名稱預設解析為群組/團隊。當以顯示名稱指定人員時，請務必使用 `user:`。

## 主動訊息

- 主動訊息僅在用戶互動**之後**才可能發生，因為我們會在該時間點儲存對話參考。
- 請參閱 `/gateway/configuration` 以取得 `dmPolicy` 和允許清單閘道。

## 團隊和頻道 ID (常見陷阱)

Teams URL 中的 `groupId` 查詢參數**並非**用於設定的團隊 ID。請改為從 URL 路徑中擷取 ID：

**團隊 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**頻道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**設定用：**

- 團隊 ID = `/team/` 之後的路徑區段 (經 URL 解碼，例如 `19:Bk4j...@thread.tacv2`)
- 頻道 ID = `/channel/` 之後的路徑區段 (經 URL 解碼)
- **忽略** `groupId` 查詢參數

## 私人頻道

機器人在私人頻道中的支援有限：

| 功能               | 標準頻道 | 私人頻道         |
| ------------------ | -------- | ---------------- |
| 機器人安裝         | 是       | 有限             |
| 即時訊息 (webhook) | 是       | 可能無法運作     |
| RSC 權限           | 是       | 行為可能不同     |
| @mentions          | 是       | 如果可存取機器人 |
| Graph API 記錄     | 是       | 是 (需要權限)    |

**如果私人頻道無法運作的解決方法：**

1. 使用標準頻道進行機器人互動
2. 使用 DM - 用戶隨時可以直接傳訊息給機器人
3. 使用 Graph API 取得歷史記錄 (需要 `ChannelMessage.Read.All`)

## 疑難排解

### 常見問題

- **頻道中未顯示圖片：** 缺少 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全結束/重新開啟 Teams。
- **頻道中無回應：** 預設需要提及；請設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行設定。
- **版本不符 (Teams 仍顯示舊版資訊清單)：** 移除並重新新增應用程式，並完全結束 Teams 以重新整理。
- **來自 webhook 的 401 未授權：** 在沒有 Azure JWT 的情況下手動測試時是預期的 - 表示端點可存取但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **"Icon file cannot be empty"：** 清單引用的圖示檔案大小為 0 位元組。請建立有效的 PNG 圖示（`outline.png` 為 32x32，`color.png` 為 192x192）。
- **"webApplicationInfo.Id already in use"：** 應用程式仍安裝在另一個團隊/聊天中。請先找到並將其解除安裝，或等待 5-10 分鐘以完成傳播。
- **上傳時出現 "Something went wrong"：** 請改透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發者工具 (F12) → Network 分頁，並檢查回應主體以取得實際錯誤。
- **側載失敗：** 請嘗試「Upload an app to your org's app catalog」而非「Upload a custom app」——這通常能繞過側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否與您的機器人 App ID 完全相符
2. 重新上傳應用程式並在團隊/聊天中重新安裝
3. 檢查您的組織管理員是否已封鎖 RSC 權限
4. 確認您使用的範圍正確：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## 相關

- [Channels Overview](/en/channels) — 所有支援的頻道
- [Pairing](/en/channels/pairing) — DM 驗證與配對流程
- [Groups](/en/channels/groups) — 群組聊天行為與提及控管
- [Channel Routing](/en/channels/channel-routing) — 訊息的工作階段路由
- [Security](/en/gateway/security) — 存取模型與強化防護
