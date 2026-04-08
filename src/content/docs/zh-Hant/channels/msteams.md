---
summary: "Microsoft Teams 機器人支援狀態、功能及配置"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> 「入此門者，當放棄一切希望。」

更新日期：2026-01-21

狀態：支援文字 + 私訊附件；頻道/群組檔案傳送需要 `sharePointSiteId` + Graph 權限（請參閱 [在群組聊天中傳送檔案](#sending-files-in-group-chats)）。投票會透過 Adaptive Cards 傳送。訊息操作會為檔案優先傳送公開明確的 `upload-file`。

## 內建外掛程式

Microsoft Teams 在目前的 OpenClaw 版本中作為內建外掛程式提供，因此在正常的封裝組建中無需額外安裝。

如果您使用的是排除內建 Teams 的舊版組建或自訂安裝，請手動安裝：

```bash
openclaw plugins install @openclaw/msteams
```

本機簽出（從 git repo 執行時）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

詳細資訊：[外掛程式](/en/tools/plugin)

## 快速設定（初學者）

1. 確認 Microsoft Teams 外掛程式可用。
   - 目前的封裝版 OpenClaw 發行版本已包含它。
   - 較舊/自訂安裝可以使用上述命令手動新增。
2. 建立 **Azure Bot**（App ID + 用戶端金鑰 + 租用戶 ID）。
3. 使用這些憑證設定 OpenClaw。
4. 透過公開 URL 或通道公開 `/api/messages`（預設連接埠 3978）。
5. 安裝 Teams 應用程式套件並啟動閘道。

最小設定：

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

注意：群組聊天預設被封鎖（`channels.msteams.groupPolicy: "allowlist"`）。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 以允許任何成員，以提及為門檻）。

## 目標

- 透過 Teams 私訊、群組聊天或頻道與 OpenClaw 對話。
- 保持路由確定性：回覆一律回到訊息送達的頻道。
- 預設為安全的頻道行為（除非另有設定，否則需要提及）。

## 設定寫入

預設情況下，允許 Microsoft Teams 寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 存取控制（私訊 + 群組）

**私訊存取**

- 預設：`channels.msteams.dmPolicy = "pairing"`。未知發送者將被忽略，直到獲得批准。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID。
- UPN/顯示名稱是可變的；直接比對預設為停用，且僅在使用 `channels.msteams.dangerouslyAllowNameMatching: true` 時啟用。
- 當憑證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取**

- 預設值：`channels.msteams.groupPolicy = "allowlist"`（除非新增 `groupAllowFrom`，否則會被封鎖）。使用 `channels.defaults.groupPolicy` 可在未設定時覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些傳送者可以在群組聊天/頻道中觸發（會回退至 `channels.msteams.allowFrom`）。
- 設定 `groupPolicy: "open"` 以允許任何成員（預設仍受提及限制）。
- 若要不允許**任何頻道**，請設定 `channels.msteams.groupPolicy: "disabled"`。

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

- 透過在 `channels.msteams.teams` 下列出團隊和頻道，以限定群組/頻道的回覆範圍。
- 金鑰應使用穩定的團隊 ID 和頻道對話 ID。
- 當 `groupPolicy="allowlist"` 且存在 Teams 允許清單時，僅接受列出的團隊/頻道（受提及限制）。
- 組態精靈接受 `Team/Channel` 項目並為您儲存它們。
- 啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）並記錄對應關係；未解析的團隊/頻道名稱會保持原樣輸入，但除非啟用 `channels.msteams.dangerouslyAllowNameMatching: true`，否則預設會在路由時被忽略。

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

## 運作原理

1. 確保 Microsoft Teams 外掛程式可用。
   - 目前的封裝版 OpenClaw 發行版本已內建此外掛程式。
   - 較舊或自訂的安裝版本可以使用上述命令手動新增。
2. 建立 **Azure Bot**（應用程式 ID + 密鑰 + 租用戶 ID）。
3. 建置參照該 Bot 並包含下列 RSC 權限的 **Teams 應用程式套件**。
4. 將 Teams 應用程式上傳/安裝至團隊（或個人範圍以進行 DM）。
5. 在 `~/.openclaw/openclaw.json`（或環境變數）中設定 `msteams` 並啟動閘道。
6. 閘道預設會在 `/api/messages` 上接聽 Bot Framework webhook 流量。

## Azure Bot 設定（必要條件）

在設定 OpenClaw 之前，您需要建立 Azure Bot 資源。

### 步驟 1：建立 Azure Bot

1. 前往 [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **[基本]** 索引標籤：

   | 欄位             | 數值                                               |
   | ---------------- | -------------------------------------------------- |
   | **Bot 處理程序** | 您的 Bot 名稱，例如 `openclaw-msteams`（必須唯一） |
   | **訂閱**         | 選取您的 Azure 訂閱                                |
   | **資源群組**     | 建立新的或使用現有的                               |
   | **定價層**       | **免費** 適用於開發/測試                           |
   | **應用程式類型** | **單一租戶** (建議 - 請參閱下方的註解)             |
   | **建立類型**     | **建立新的 Microsoft App ID**                      |

> **棄用公告：** 在 2025-07-31 之後，已棄用建立新的多租戶 Bot。新 Bot 請使用 **單一租戶**。

3. 點擊 **Review + create** → **Create** (等待約 1-2 分鐘)

### 步驟 2：取得認證資訊

1. 前往您的 Azure Bot 資源 → **Configuration**
2. 複製 **Microsoft App ID** → 這就是您的 `appId`
3. 點擊 **Manage Password** → 前往應用程式註冊
4. 在 **Certificates & secrets** 下 → **New client secret** → 複製 **Value** → 這就是您的 `appPassword`
5. 前往 **Overview** → 複製 **Directory (tenant) ID** → 這就是您的 `tenantId`

### 步驟 3：設定傳訊端點

1. 在 Azure Bot 中 → **Configuration**
2. 將 **Messaging endpoint** 設定為您的 webhook URL：
   - 正式環境： `https://your-domain.com/api/messages`
   - 本機開發： 使用通道 (請參閱下方的 [Local Development](#local-development-tunneling))

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot 中 → **Channels**
2. 點擊 **Microsoft Teams** → Configure → Save
3. 接受服務條款

## 本機開發

Teams 無法連線至 `localhost`。請使用通道進行本機開發：

**選項 A： ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**選項 B： Tailscale Funnel**

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Teams 開發人員入口網站 (替代方案)

您可以使用 [Teams Developer Portal](https://dev.teams.microsoft.com/apps) 來代替手動建立 ZIP 資訊清單：

1. 點擊 **+ New app**
2. 填寫基本資訊 (名稱、描述、開發人員資訊)
3. 前往 **App features** → **Bot**
4. 選取 **Enter a bot ID manually** 並貼上您的 Azure Bot App ID
5. 勾選範圍： **Personal**、 **Team**、 **Group Chat**
6. 點擊 **Distribute** → **Download app package**
7. 在 Teams 中： **Apps** → **Manage your apps** → **Upload a custom app** → 選取該 ZIP 檔案

這通常比手動編輯 JSON 資訊清單更容易。

## 測試 Bot

**選項 A： Azure Web Chat (先驗證 webhook)**

1. 在 Azure 入口網站中 → 您的 Azure Bot 資源 → **Test in Web Chat**
2. 傳送訊息 - 您應該會看到回應
3. 這能確認在設定 Teams 之前，您的 webhook 端點運作正常

**選項 B： Teams (安裝應用程式後)**

1. 安裝 Teams 應用程式 (側載或組織目錄)
2. 在 Teams 中尋找 Bot 並傳送私人訊息
3. 檢查閘道記錄中的傳入活動

## 設定 (僅限純文字)

1. **確保 Microsoft Teams 外掛程式可用**
   - 目前封裝的 OpenClaw 版本已經內建了它。
   - 較舊或自訂的安裝可以手動新增：
     - 從 npm 安裝：`openclaw plugins install @openclaw/msteams`
     - 從本地結帳安裝：`openclaw plugins install ./path/to/local/msteams-plugin`

2. **Bot 註冊**
   - 建立一個 Azure Bot（見上文）並記下：
     - App ID
     - 用戶端金鑰 (App password)
     - 租戶 ID (Tenant ID，單一租戶)

3. **Teams 應用程式資訊清單**
   - 包含一個帶有 `botId = <App ID>` 的 `bot` 項目。
   - 範圍：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（個人範圍檔案處理所需）。
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

   您也可以使用環境變數代替設定金鑰：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Bot 端點**
   - 將 Azure Bot 訊息端點設為：
     - `https://<host>:3978/api/messages`（或您選擇的路徑/連接埠）。

6. **執行閘道**
   - 當內建或手動安裝的外掛程式可用，且存在包含憑證的 `msteams` 設定時，Teams 頻道會自動啟動。

## 成員資訊動作

OpenClaw 為 Microsoft Teams 提供了一個由 Graph 支援的 `member-info` 動作，以便代理程式和自動化可以直接從 Microsoft Graph 解析頻道成員詳細資料（顯示名稱、電子郵件、角色）。

需求：

- `Member.Read.Group` RSC 權限（已在建議的資訊清單中）
- 對於跨團隊查詢：具有管理員同意的 `User.Read.All` Graph 應用程式權限

該動作受 `channels.msteams.actions.memberInfo` 控制（預設：當有 Graph 憑證時啟用）。

## 歷史紀錄內容

- `channels.msteams.historyLimit` 控制有多少最近的頻道/群組訊息被包裝到提示中。
- 會退回至 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設為 50）。
- 獲取的執行緒歷史記錄會依據發送者允許清單（`allowFrom` / `groupAllowFrom`）進行篩選，因此執行緒上下文植入僅包含來自允許發送者的訊息。
- 引用的附件上下文（`ReplyTo*` 派生自 Teams 回覆 HTML）目前會按接收到的內容原樣傳遞。
- 換句話說，允許清單控制誰可以觸發代理；目前只有特定的補充上下文路徑會被篩選。
- DM 歷史記錄可以使用 `channels.msteams.dmHistoryLimit`（使用者輪次）進行限制。每個使用者的覆寫設定：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限

這些是我們 Teams 應用程式清單中**現有的 resourceSpecific 權限**。它們僅適用於安裝該應用程式的小組/聊天內。

**對於頻道：**

- `ChannelMessage.Read.Group` (應用程式) - 在無 @提及 的情況下接收所有頻道訊息
- `ChannelMessage.Send.Group` (應用程式)
- `Member.Read.Group` (應用程式)
- `Owner.Read.Group` (應用程式)
- `ChannelSettings.Read.Group` (應用程式)
- `TeamMember.Read.Group` (應用程式)
- `TeamSettings.Read.Group` (應用程式)

**對於群組聊天：**

- `ChatMessage.Read.Chat` (應用程式) - 在無 @提及 的情況下接收所有群組聊天訊息

## Teams 清單範例（已編輯）

包含必要欄位的最小有效範例。請替換 ID 和 URL。

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

### 清單注意事項

- `bots[].botId` **必須**與 Azure Bot 應用程式 ID 相符。
- `webApplicationInfo.id` **必須**與 Azure Bot 應用程式 ID 相符。
- `bots[].scopes` 必須包含您計畫使用的介面（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 是在個人範圍內處理檔案所必需的。
- 如果您希望處理頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送權限。

### 更新現有應用程式

若要更新已安裝的 Teams 應用程式（例如，新增 RSC 權限）：

1. 使用新設定更新您的 `manifest.json`
2. **增加 `version` 欄位的值**（例如，從 `1.0.0` 增加到 `1.1.0`）
3. **重新壓縮** 包含圖示的資訊清單 (`manifest.json`, `outline.png`, `color.png`)
4. 上傳新的 zip 檔案：
   - **選項 A (Teams 系統管理中心)：** Teams 系統管理中心 → Teams 應用程式 → 管理應用程式 → 尋找您的應用程式 → 上傳新版本
   - **選項 B (側載)：** 在 Teams → 應用程式 → 管理您的應用程式 → 上傳自訂應用程式
5. **針對團隊頻道：** 在每個團隊中重新安裝應用程式，讓新的權限生效
6. **完全結束並重新啟動 Teams** (不只是關閉視窗)，以清除快取的應用程式中繼資料

## 功能：僅限 RSC 與 Graph

### 使用 **僅限 Teams RSC** (已安裝應用程式，無 Graph API 權限)

可運作：

- 讀取頻道訊息 **文字** 內容。
- 傳送頻道訊息 **文字** 內容。
- 接收 **個人 (DM)** 檔案附件。

無法運作：

- 頻道/群組 **圖片或檔案內容** (承載僅包含 HTML 存根)。
- 下載儲存在 SharePoint/OneDrive 中的附件。
- 讀取訊息歷程記錄 (即時 Webhook 事件之外)。

### 使用 **Teams RSC + Microsoft Graph 應用程式權限**

新增：

- 下載託管內容 (貼上訊息中的圖片)。
- 下載儲存在 SharePoint/OneDrive 中的檔案附件。
- 透過 Graph 讀取頻道/聊天訊息歷程記錄。

### RSC 與 Graph API

| 功能           | RSC 權限           | Graph API                 |
| -------------- | ------------------ | ------------------------- |
| **即時訊息**   | 是 (透過 webhook)  | 否 (僅輪詢)               |
| **歷史訊息**   | 否                 | 是 (可查詢歷程記錄)       |
| **設定複雜度** | 僅應用程式資訊清單 | 需要管理員同意 + 權杖流程 |
| **可離線運作** | 否 (必須執行中)    | 是 (隨時查詢)             |

**重點：** RSC 用於即時監聽；Graph API 用於歷程存取。若要趕上離線期間錯過的訊息，您需要搭配 `ChannelMessage.Read.All` 的 Graph API (需要管理員同意)。

## 已啟用 Graph 的媒體 + 歷程記錄 (頻道所需)

如果您需要 **頻道** 中的圖片/檔案，或是想要擷取 **訊息歷程記錄**，您必須啟用 Microsoft Graph 權限並授與管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊** 中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All` (頻道附件 + 歷程記錄)
   - `Chat.Read.All` 或 `ChatMessage.Read.All` (群組聊天)
2. 為租用戶 **授與管理員同意**。
3. 更新 Teams 應用程式的 **資訊清單版本**，重新上傳，並**在 Teams 中重新安裝應用程式**。
4. **完全結束並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**使用者提及的額外權限：**對於交談中的使用者，使用者 @提及 功能可立即使用。然而，如果您想要動態搜尋並提及**不在目前交談中**的使用者，請新增 `User.Read.All` (應用程式) 權限並授與管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長 (例如，緩慢的 LLM 回應)，您可能會看到：

- 閘道逾時
- Teams 重試訊息 (導致重複)
- 回應遺失

OpenClaw 透過快速回應並主動發送回應來處理此問題，但非常緩慢的回應可能仍會造成問題。

### 格式

Teams Markdown 比 Slack 或 Discord 更受限：

- 基本格式運作正常：**粗體**、_斜體_、`code`、連結
- 複雜的 Markdown (表格、巢狀清單) 可能無法正確呈現
- 支援針對投票和任意卡片傳送的調適型卡片 (見下文)

## 組態

關鍵設定 (請參閱 `/gateway/configuration` 以了解共用頻道模式)：

- `channels.msteams.enabled`：啟用/停用頻道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.webhook.port` (預設為 `3978`)
- `channels.msteams.webhook.path` (預設為 `/api/messages`)
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled` (預設：pairing)
- `channels.msteams.allowFrom`：DM 允許清單 (建議使用 AAD 物件 ID)。當 Graph 存取可用時，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：緊急開關，用於重新啟用可變動的 UPN/顯示名稱比對及直接的團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`：輸出文字區塊大小。
- `channels.msteams.chunkMode`：`length` (預設) 或 `newline` 以在長度區塊分割前於空白行 (段落邊界) 分割。
- `channels.msteams.mediaAllowHosts`：入站附件主機的允許清單（預設為 Microsoft/Teams 網域）。
- `channels.msteams.mediaAuthAllowHosts`：允許在媒體重試時附加 Authorization 標頭的允許清單（預設為 Graph + Bot Framework 主機）。
- `channels.msteams.requireMention`：在頻道/群組中要求 @提及（預設為 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（請參閱 [回覆樣式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：每個團隊的覆寫。
- `channels.msteams.teams.<teamId>.requireMention`：每個團隊的覆寫。
- `channels.msteams.teams.<teamId>.tools`：當缺少頻道覆寫時使用的預設每個團隊工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：預設每個團隊每個發送者的工具原則覆寫（支援 `"*"` 萬用字元）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：每個頻道的覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：每個頻道的覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：每個頻道的工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：每個頻道每個發送者的工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 金鑰應使用明確的前綴：
  `id:`、`e164:`、`username:`、`name:`（舊版無前綴金鑰仍僅對應至 `id:`）。
- `channels.msteams.actions.memberInfo`：啟用或停用以 Graph 為基礎的成員資訊動作（預設：當 Graph 憑證可用時啟用）。
- `channels.msteams.sharePointSiteId`：用於在群組聊天/頻道中上傳檔案的 SharePoint 網站 ID（請參閱 [在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與工作階段

- 工作階段金鑰遵循標準代理程式格式（請參閱 [/concepts/session](/en/concepts/session)）：
  - 直接訊息共用主要工作階段（`agent:<agentId>:<mainKey>`）。
  - 頻道/群組訊息使用對話 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆樣式：串執 vs 貼文

Teams 最近在同一個底層資料模型上引進了兩種頻道 UI 樣式：

| 樣式                   | 描述                               | 建議 `replyStyle`  |
| ---------------------- | ---------------------------------- | ------------------ |
| **貼文**（經典）       | 訊息以卡片形式顯示，下方有串接回覆 | `thread`（預設值） |
| **串執**（類似 Slack） | 訊息線性流動，更像 Slack           | `top-level`        |

**問題所在：** Teams API 並不會公開頻道使用的是哪種 UI 樣式。如果您使用了錯誤的 `replyStyle`：

- 在串執式頻道中使用 `thread` → 回覆會顯得巢狀嵌套且尷尬
- 在貼文式頻道中使用 `top-level` → 回覆會顯示為獨立的頂層貼文，而不是在串執中

**解決方案：** 根據頻道的設置方式，逐頻道配置 `replyStyle`：

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

**目前的限制：**

- **私人訊息 (DMs)：** 圖片與檔案附件透過 Teams 機器人檔案 API 運作。
- **頻道/群組：** 附件存放於 M365 儲存空間 (SharePoint/OneDrive)。Webhook 載荷僅包含 HTML 存根，並非實際的檔案位元組。**需要 Graph API 權限** 才能下載頻道附件。
- 若要明確優先發送檔案，請將 `action=upload-file` 搭配 `media` / `filePath` / `path` 使用；選用的 `message` 將成為隨附的文字/留言，而 `filename` 則會覆寫上傳的名稱。

若沒有 Graph 權限，包含圖片的頻道訊息將僅以文字形式接收（圖片內容無法供機器人存取）。
預設情況下，OpenClaw 僅從 Microsoft/Teams 的主機名稱下載媒體。可透過 `channels.msteams.mediaAllowHosts` 覆寫（使用 `["*"]` 以允許任何主機）。
授權標頭僅會附加給 `channels.msteams.mediaAuthAllowHosts` 中的主機（預設為 Graph + Bot Framework 主機）。請保持此列表嚴格（避免多租用戶後綴）。

## 在群組聊天中發送檔案

機器人可以使用 FileConsentCard 流程（內建）在私訊 (DM) 中傳送檔案。但是，**在群組聊天/頻道中傳送檔案** 需要額外的設定：

| 內容                | 檔案傳送方式                              | 所需設定                             |
| ------------------- | ----------------------------------------- | ------------------------------------ |
| **私訊 (DM)**       | FileConsentCard → 使用者接受 → 機器人上傳 | 開箱即用                             |
| **群組聊天/頻道**   | 上傳至 SharePoint → 分享連結              | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片 (任何情境)** | Base64 編碼內嵌                           | 開箱即用                             |

### 為什麼群組聊天需要 SharePoint

機器人沒有個人 OneDrive 磁碟機（`/me/drive` Graph API 端點不適用於應用程式身分識別）。若要在群組聊天/頻道中傳送檔案，機器人會上傳至 **SharePoint 網站** 並建立分享連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中**新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (應用程式) - 將檔案上傳至 SharePoint
   - `Chat.Read.All` (應用程式) - 選用，啟用個別使用者的分享連結

2. **授與租戶管理員同意**。

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

| 權限                                    | 分享行為                                |
| --------------------------------------- | --------------------------------------- |
| 僅限 `Sites.ReadWrite.All`              | 全組織分享連結 (組織內任何人皆可存取)   |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 個別使用者的分享連結 (僅聊天成員可存取) |

個別使用者分享更安全，因為只有聊天參與者可以存取檔案。如果缺少 `Chat.Read.All` 權限，機器人會退回至全組織分享。

### 退回行為

| 情境                                        | 結果                                            |
| ------------------------------------------- | ----------------------------------------------- |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，傳送分享連結                 |
| 群組聊天 + 檔案 + 沒有 `sharePointSiteId`   | 嘗試 OneDrive 上傳 (可能失敗)，僅傳送文字       |
| 個人聊天 + 檔案                             | FileConsentCard 流程 (無需 SharePoint 即可運作) |
| 任何情境 + 圖片                             | Base64 編碼內嵌 (無需 SharePoint 即可運作)      |

### 檔案儲存位置

上傳的檔案會儲存在已設定 SharePoint 網站之預設文件庫的 `/OpenClawShared/` 資料夾中。

## 投票 (調適性卡片)

OpenClaw 會將 Teams 投票以調適性卡片 的形式傳送 (沒有原生的 Teams 投票 API)。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票由閘道記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道必須保持上線才能記錄投票。
- 投票尚不會自動發布結果摘要（如有需要，請檢查儲存檔案）。

## Adaptive Cards（任意）

使用 `message` 工具或 CLI 將任何 Adaptive Card JSON 發送給 Teams 使用者或對話。

`card` 參數接受 Adaptive Card JSON 物件。當提供 `card` 時，訊息文字是可選的。

**Agent tool:**

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

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

請參閱 [Adaptive Cards 文件](https://adaptivecards.io/) 以了解卡片結構描述和範例。有關目標格式的詳細資訊，請參閱下方的 [Target formats](#target-formats)。

## 目標格式

MSTeams 目標使用前綴來區分使用者和對話：

| 目標類型          | 格式                             | 範例                                               |
| ----------------- | -------------------------------- | -------------------------------------------------- |
| 使用者（依 ID）   | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`        |
| 使用者（依名稱）  | `user:<display-name>`            | `user:John Smith` （需要 Graph API）               |
| 群組/頻道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`           |
| 群組/頻道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2` （如果包含 `@thread`） |

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

**Agent tool 範例：**

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

注意：如果沒有 `user:` 前綴，名稱預設為群組/團隊解析。當依顯示名稱指定人員時，請務必使用 `user:`。

## 主動訊息

- 只有在使用者互動**之後**，才能傳送主動訊息，因為我們會在該時點儲存對話參考。
- 請參閱 `/gateway/configuration` 以了解 `dmPolicy` 和允許清單閘道。

## 團隊和頻道 ID（常見陷阱）

Teams URL 中的 `groupId` 查詢參數**不是**用於設定的團隊 ID。請改為從 URL 路徑擷取 ID：

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

**用於設定：**

- 團隊 ID = `/team/` 之後的路徑區段（URL 解碼，例如 `19:Bk4j...@thread.tacv2`）
- 頻道 ID = `/channel/` 之後的路徑區段（URL 解碼）
- **忽略** `groupId` 查詢參數

## 私人頻道

機器人在私人頻道中的支援有限：

| 功能               | 標準頻道 | 私人頻道         |
| ------------------ | -------- | ---------------- |
| 機器人安裝         | 是       | 有限             |
| 即時訊息 (webhook) | 是       | 可能無法運作     |
| RSC 權限           | 是       | 可能表現不同     |
| @提及              | 是       | 如果可存取機器人 |
| Graph API 歷史記錄 | 是       | 是 (需要權限)    |

**如果私人頻道無法運作的解決方法：**

1. 使用標準頻道進行機器人互動
2. 使用 DM - 使用者隨時可以直接傳訊息給機器人
3. 使用 Graph API 進行歷史存取 (需要 `ChannelMessage.Read.All`)

## 疑難排解

### 常見問題

- **頻道中未顯示圖片：** 缺少 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全結束/重新開啟 Teams。
- **頻道中沒有回應：** 預設需要提及；設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行設定。
- **版本不符 (Teams 仍顯示舊資訊清單)：** 移除並重新新增應用程式，並完全結束 Teams 以重新整理。
- **來自 webhook 的 401 未經授權錯誤：** 在沒有 Azure JWT 的情況下手動測試時是預期的結果 - 這表示端點可以連線但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **"圖示檔案不能為空白"：** 資訊清單參照了大小為 0 位元組的圖示檔案。請建立有效的 PNG 圖示 (`outline.png` 為 32x32，`color.png` 為 192x192)。
- **"webApplicationInfo.Id 已在使用中"：** 應用程式仍安裝在另一個團隊/聊天中。請先尋找並將其解除安裝，或等待 5-10 分鐘以進行傳播。
- **上傳時出現 "發生問題"：** 改為透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發者工具 (F12) → 網路 分頁，並檢查回應主體以取得實際錯誤。
- **側載失敗：** 請嘗試「將應用程式上傳到組織的應用程式目錄」，而不是「上傳自訂應用程式」 - 這通常可以繞過側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否完全符合您機器人的應用程式 ID
2. 重新上傳應用程式並在團隊/聊天中重新安裝
3. 檢查您的組織管理員是否已封鎖 RSC 權限
4. 確認您使用的是正確的範圍：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [建立 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams 開發者入口網站](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams 應用程式資訊清單架構](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收頻道訊息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 權限參考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 機器人檔案處理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [主動傳訊](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — DM 驗證和配對流程
- [群組](/en/channels/groups) — 群組聊天行為和提及控制
- [頻道路由](/en/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/en/gateway/security) — 存取模型和強化防護
