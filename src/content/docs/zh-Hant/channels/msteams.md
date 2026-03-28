---
summary: "Microsoft Teams 機器人支援狀態、功能和組態"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams (外掛程式)

> 「凡入此門者，放棄一切希望。」

更新日期：2026-01-21

狀態：支援文字 + 私訊附件；頻道/群組檔案傳送需要 `sharePointSiteId` + Graph 權限（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。投票是透過 Adaptive Cards 傳送的。

## 需要外掛程式

Microsoft Teams 以外掛程式形式提供，未包含在核心安裝中。

**重大變更 (2026.1.15)：** Microsoft Teams 已移出核心。如果您使用它，則必須安裝該外掛程式。

可解釋性：讓核心安裝更輕量，並讓 Microsoft Teams 相依性能獨立更新。

透過 CLI 安裝 (npm registry)：

```exec
openclaw plugins install @openclaw/msteams
```

本機簽出（當從 git 儲存庫執行時）：

```exec
openclaw plugins install ./extensions/msteams
```

如果您在設定過程中選擇 Teams，並且偵測到 git 簽出，OpenClaw 將會自動提供本機安裝路徑。

詳細資訊：[Plugins](/zh-Hant/tools/plugin)

## 快速設定（初學者）

1. 安裝 Microsoft Teams 外掛程式。
2. 建立一個 **Azure Bot**（App ID + 用戶端密鑰 + 租用戶 ID）。
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

注意：群組聊天預設為封鎖 (`channels.msteams.groupPolicy: "allowlist"`)。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 以允許任何成員，以提及為門檻）。

## 目標

- 透過 Teams 私訊 (DM)、群組聊天或頻道與 OpenClaw 對話。
- 保持路由決定性：回覆一律會回到訊息抵達的頻道。
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

- 預設值：`channels.msteams.dmPolicy = "pairing"`。未知的傳送者將被忽略，直到獲得核准。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID。
- UPN/顯示名稱是可變的；預設停用直接比對，僅在啟用 `channels.msteams.dangerouslyAllowNameMatching: true` 時開啟。
- 當憑證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取**

- 預設值：`channels.msteams.groupPolicy = "allowlist"`（除非您新增 `groupAllowFrom`，否則為封鎖狀態）。當未設定時，使用 `channels.defaults.groupPolicy` 來覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些傳送者可以在群組聊天/頻道中觸發（預設回退至 `channels.msteams.allowFrom`）。
- 設定 `groupPolicy: "open"` 以允許任何成員（預設仍需提及才能觸發）。
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

- 透過在 `channels.msteams.teams` 下列出團隊和頻道，來限制群組/頻道的回覆範圍。
- 金鑰應使用穩定的團隊 ID 和頻道對話 ID。
- 當 `groupPolicy="allowlist"` 且存在 Teams 允許清單時，僅接受列出的團隊/頻道（需提及才能觸發）。
- 設定精靈會接受 `Team/Channel` 條目並為您儲存。
- 在啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）
  並記錄對應關係；未解析的團隊/頻道名稱將保持原樣，但預設情況下會在路由時被忽略，除非啟用了 `channels.msteams.dangerouslyAllowNameMatching: true`。

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
2. 建立 **Azure Bot**（App ID + 金鑰 + 租用戶 ID）。
3. 建置參照該 Bot 並包含下列 RSC 權限的 **Teams 應用程式套件**。
4. 將 Teams 應用程式上傳/安裝到團隊中（或安裝到個人範圍以進行 DM）。
5. 在 `~/.openclaw/openclaw.json` 中設定 `msteams`（或環境變數）並啟動閘道。
6. 預設情況下，閘道會在 `/api/messages` 上監聽 Bot Framework Webhook 流量。

## Azure Bot 設定（先決條件）

在設定 OpenClaw 之前，您需要建立 Azure Bot 資源。

### 步驟 1：建立 Azure Bot

1. 前往 [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **[Basics]** 分頁：

   | 欄位               | 值                                                  |
   | ------------------ | --------------------------------------------------- |
   | **Bot handle**     | 您的機器人名稱，例如 `openclaw-msteams`（必須唯一） |
   | **Subscription**   | 選取您的 Azure 訂閱                                 |
   | **Resource group** | 建立新的或使用現有的                                |
   | **Pricing tier**   | 開發/測試選用 **[Free]**                            |
   | **Type of App**    | **[Single Tenant]**（推薦 - 請參見下方說明）        |
   | **Creation type**  | **[Create new Microsoft App ID]**                   |

> **棄用通知：** 新增多租戶機器人的建立功能已在 2025-07-31 後停止支援。新機器人請使用 **[Single Tenant]**。

3. 點擊 **[Review + create]** → **[Create]**（等待約 1-2 分鐘）

### 步驟 2：取得認證

1. 前往您的 Azure Bot 資源 → **[Configuration]**
2. 複製 **Microsoft App ID** → 這就是您的 `appId`
3. 點擊 **[Manage Password]** → 前往應用程式註冊
4. 在 **Certificates & secrets** 下 → **New client secret** → 複製 **Value** → 這就是您的 `appPassword`
5. 前往 **Overview** → 複製 **Directory (tenant) ID** → 這就是您的 `tenantId`

### 步驟 3：設定訊息端點

1. 在 Azure Bot 中 → **Configuration**
2. 將 **Messaging endpoint** 設定為您的 webhook URL：
   - 正式環境：`https://your-domain.com/api/messages`
   - 本機開發：使用通道（請參閱下方的 [Local Development](#local-development-tunneling)）

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot 中 → **Channels**
2. 點擊 **Microsoft Teams** → Configure → Save
3. 接受服務條款

## 本機開發（通道傳輸）

Teams 無法連線至 `localhost`。請使用通道進行本機開發：

**選項 A：ngrok**

```exec
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**選項 B：Tailscale Funnel**

```exec
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Teams 開發者入口網站（替代方案）

您可以透過 [Teams 開發人員入口網站](https://dev.teams.microsoft.com/apps) 使用，而不需手動建立資訊清單 ZIP：

1. 按一下 **+ 新增應用程式**
2. 填寫基本資訊（名稱、描述、開發人員資訊）
3. 前往 **應用程式功能** → **Bot**
4. 選取 **手動輸入 Bot ID** 並貼上您的 Azure Bot 應用程式 ID
5. 勾選範圍：**個人**、**團隊**、**群組聊天**
6. 按一下 **發佈** → **下載應用程式套件**
7. 在 Teams 中：**應用程式** → **管理您的應用程式** → **上傳自訂應用程式** → 選取該 ZIP 檔案

這通常比手動編輯 JSON 資訊清單更容易。

## 測試 Bot

**選項 A：Azure Web Chat（先驗證 webhook）**

1. 在 Azure 入口網站 → 您的 Azure Bot 資源 → **在 Web Chat 中測試**
2. 傳送訊息 - 您應該會看到回應
3. 這可確認在進行 Teams 設定之前，您的 webhook 端點正常運作

**選項 B：Teams（安裝應用程式後）**

1. 安裝 Teams 應用程式（側載或組織目錄）
2. 在 Teams 中尋找 Bot 並傳送私訊
3. 檢查傳入活動的閘道日誌

## 安裝（純文字精簡版）

1. **安裝 Microsoft Teams 外掛程式**
   - 從 npm 安裝：`openclaw plugins install @openclaw/msteams`
   - 從本機簽出版本安裝：`openclaw plugins install ./extensions/msteams`

2. **Bot 註冊**
   - 建立 Azure Bot（見上方說明）並記下：
     - 應用程式 ID
     - 用戶端金鑰（應用程式密碼）
     - 租用戶 ID（單一租用戶）

3. **Teams 應用程式資訊清單**
   - 包含一個 `bot` 項目並設為 `botId = <App ID>`。
   - 範圍：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（個人範圍檔案處理所需）。
   - 新增 RSC 權限（見下方）。
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

   您也可以使用環境變數代替 config 金鑰：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Bot 端點**
   - 將 Azure Bot 訊息端點設定為：
     - `https://<host>:3978/api/messages` (或您選擇的路徑/連接埠)。

6. **執行閘道**
   - 當外掛程式安裝完成且存在包含憑證的 `msteams` 設定時，Teams 頻道會自動啟動。

## 歷史記錄上下文

- `channels.msteams.historyLimit` 控制要將多少最近的頻道/群組訊息包裝到提示中。
- 會回退到 `messages.groupChat.historyLimit`。將 `0` 設定為以停用 (預設為 50)。
- 可以透過 `channels.msteams.dmHistoryLimit`（使用者輪次）限制 DM 記錄。每個使用者的覆寫：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限 (Manifest)

這些是我們 Teams App Manifest 中的**現有 resourceSpecific 權限**。它們僅適用於安裝該 App 的團隊/聊天內。

**對於頻道 (團隊範圍)：**

- `ChannelMessage.Read.Group` (應用程式) - 接收所有頻道訊息而無需 @提及
- `ChannelMessage.Send.Group` (應用程式)
- `Member.Read.Group` (應用程式)
- `Owner.Read.Group` (應用程式)
- `ChannelSettings.Read.Group` (應用程式)
- `TeamMember.Read.Group` (應用程式)
- `TeamSettings.Read.Group` (應用程式)

**對於群組聊天：**

- `ChatMessage.Read.Chat` (應用程式) - 接收所有群組聊天訊息而無需 @提及

## Teams Manifest 範例 (已編輯)

包含必填欄位的簡單有效範例。請替換 ID 和 URL。

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

### 資訊清單注意事項（必填欄位）

- `bots[].botId` **必須**符合 Azure Bot 應用程式 ID。
- `webApplicationInfo.id` **必須**符合 Azure Bot 應用程式 ID。
- `bots[].scopes` 必須包含您計畫使用的介面（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 是在個人範圍中進行檔案處理所必需的。
- 如果您想要頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送權限。

### 更新現有應用程式

若要更新已安裝的 Teams 應用程式（例如，新增 RSC 權限）：

1. 使用新設定更新您的 `manifest.json`
2. **增加 `version` 欄位的值**（例如，`1.0.0` → `1.1.0`）
3. **重新壓縮**包含圖示的清單檔案 (`manifest.json`, `outline.png`, `color.png`)
4. 上傳新的 zip 檔案：
   - **選項 A (Teams Admin Center)：** Teams Admin Center → Teams 應用程式 → 管理應用程式 → 尋找您的應用程式 → 上傳新版本
   - **選項 B (側載)：** 在 Teams → 應用程式 → 管理您的應用程式 → 上傳自訂應用程式
5. **對於團隊頻道：** 在每個團隊中重新安裝應用程式，以讓新的權限生效
6. **完全關閉並重新啟動 Teams** (不只是關閉視窗)，以清除快取的應用程式中繼資料

## 功能：僅限 RSC 與 Graph 的比較

### 使用 **僅限 Teams RSC** (已安裝應用程式，無 Graph API 權限)

可運作：

- 讀取頻道訊息 **文字** 內容。
- 傳送頻道訊息 **文字** 內容。
- 接收 **個人 (DM)** 檔案附件。

無法運作：

- 頻道/群組 **圖片或檔案內容** (僅包含 HTML 殘存部分的 payload)。
- 下載儲存在 SharePoint/OneDrive 中的附件。
- 讀取訊息記錄（即時 Webhook 事件之外的記錄）。

### 使用 **Teams RSC + Microsoft Graph 應用程式權限**

新增：

- 下載託管的內容（貼上訊息中的圖片）。
- 下載儲存在 SharePoint/OneDrive 中的檔案附件。
- 透過 Graph 讀取頻道/聊天訊息記錄。

### RSC 與 Graph API

| 功能           | RSC 權限             | Graph API                   |
| -------------- | -------------------- | --------------------------- |
| **即時訊息**   | 是（透過 webhook）   | 否（僅輪詢）                |
| **歷史訊息**   | 否                   | 是（可查詢記錄）            |
| **設定複雜度** | 僅需應用程式資訊清單 | 需要管理員同意 + Token 流程 |
| **離線運作**   | 否（必須執行中）     | 是（隨時查詢）              |

**總結：** RSC 用於即時監聽；Graph API 用於歷史存取。若要在離線時追回錯過的訊息，您需要 Graph API 搭配 `ChannelMessage.Read.All`（需要管理員同意）。

## 啟用 Graph 的媒體 + 歷史記錄（頻道所需）

如果您需要在**頻道**中使用圖片/檔案或想要擷取**訊息歷史記錄**，您必須啟用 Microsoft Graph 權限並授予管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊**中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All` (頻道附件 + 歷史記錄)
   - `Chat.Read.All` 或 `ChatMessage.Read.All` (群組聊天)
2. 為租用戶**授予管理員同意**。
3. 增加 Teams 應用程式的 **manifest 版本**，重新上傳，並**在 Teams 中重新安裝應用程式**。
4. **完全退出並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**提及使用者的額外權限：**對於對話中的使用者，使用者 @提及功能開箱即用。不過，如果您想要動態搜尋並提及**目前對話之外**的使用者，請新增 `User.Read.All` (應用程式) 權限並授予管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長（例如 LLM 回應緩慢），您可能會看到：

- 閘道逾時
- Teams 重試訊息（導致重複）
- 回應遺失

OpenClaw 透過快速回傳並主動傳送回應來處理此問題，但極為緩慢的回應仍可能造成問題。

### 格式設定

Teams 的 Markdown 比 Slack 或 Discord 更受限：

- 基本格式運作正常：**粗體**、_斜體_、`code`、連結
- 複雜的 Markdown（表格、巢狀清單）可能無法正確轉譯
- 投票和任意卡片傳送支援調適性卡片（見下文）

## 設定

關鍵設定（共用頻道模式請參閱 `/gateway/configuration`）：

- `channels.msteams.enabled`：啟用/停用頻道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.webhook.port`（預設值 `3978`）
- `channels.msteams.webhook.path`（預設值 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：pairing）
- `channels.msteams.allowFrom`：DM 允許清單（建議使用 AAD 物件 ID）。如果可存取 Graph，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：緊急開關，用於重新啟用可變 UPN/顯示名稱匹配以及直接團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`：傳出文字區塊大小。
- `channels.msteams.chunkMode`：`length`（預設）或 `newline`，以便在按長度進行區塊分割之前先依據空白行（段落邊界）進行分割。
- `channels.msteams.mediaAllowHosts`：傳入附件主機的允許清單（預設為 Microsoft/Teams 網域）。
- `channels.msteams.mediaAuthAllowHosts`：在媒體重試時附加 Authorization 標頭的允許清單（預設為 Graph + Bot Framework 主機）。
- `channels.msteams.requireMention`：在頻道/群組中需要 @提及（預設為 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（請參閱 [回覆樣式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：每個團隊的覆蓋設定。
- `channels.msteams.teams.<teamId>.requireMention`：每個團隊的覆蓋設定。
- `channels.msteams.teams.<teamId>.tools`：預設的每個團隊工具原則覆蓋設定 (`allow`/`deny`/`alsoAllow`)，當缺少頻道覆蓋設定時使用。
- `channels.msteams.teams.<teamId>.toolsBySender`：預設的每個團隊每個傳送者工具原則覆蓋設定 (支援 `"*"` 萬用字元)。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：每個頻道的覆蓋設定。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：每個頻道的覆蓋設定。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：每個頻道的工具原則覆蓋設定 (`allow`/`deny`/`alsoAllow`)。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：個別頻道個別傳送者的工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 金鑰應使用明確的前綴：
  `id:`、`e164:`、`username:`、`name:`（舊版無前綴金鑰仍僅對應至 `id:`）。
- `channels.msteams.sharePointSiteId`：用於群組聊天/頻道中檔案上傳的 SharePoint 網站 ID（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與工作階段

- 工作階段金鑰遵循標準代理程式格式（請參閱 [/concepts/session](/zh-Hant/concepts/session)）：
  - 直接訊息共用主工作階段 (`agent:<agentId>:<mainKey>`)。
  - 頻道/群組訊息使用對話 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆風格：主題串 vs 貼文

Teams 最近在相同的底層資料模型上推出了兩種頻道 UI 風格：

| 風格                    | 描述                                 | 建議 `replyStyle` |
| ----------------------- | ------------------------------------ | ----------------- |
| **貼文** (經典)         | 訊息以卡片形式顯示，下方带有串狀回覆 | `thread` (預設)   |
| **主題串** (類似 Slack) | 訊息線性流動，更像 Slack             | `top-level`       |

**問題所在：** Teams API 不會公開頻道使用哪種 UI 風格。如果您使用了錯誤的 `replyStyle`：

- 在主題串風格頻道中使用 `thread` → 回覆會顯得尷尬地巢狀顯示
- 在貼文風格頻道中使用 `top-level` → 回覆會顯示為獨立的頂層貼文，而不是在串內

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

- **私訊 (DM)：** 圖片和檔案附件可透過 Teams 機器人檔案 API 運作。
- **頻道/群組：** 附件儲存在 M365 儲存空間。Webhook 載荷僅包含 HTML 存根，而非實際檔案位元組。下載頻道附件**需要 Graph API 權限**。

若沒有 Graph 權限，包含圖片的頻道訊息將僅以文字形式接收 (機器人無法存取圖片內容)。
根據預設，OpenClaw 僅從 Microsoft/Teams 主機名稱下載媒體。可使用 `channels.msteams.mediaAllowHosts` 覆寫 (使用 `["*"]` 以允許任何主機)。
授權標頭僅會附加給 `channels.msteams.mediaAuthAllowHosts` 中的主機 (預設為 Graph + Bot Framework 主機)。請嚴格維護此清單 (避免多租用戶後綴)。

## 在群組聊天中傳送檔案

機器人可以使用 FileConsentCard 流程（內建）在私人訊息（DM）中發送檔案。然而，**在群組聊天/頻道中發送檔案**需要額外的設定：

| 語境                 | 檔案發送方式                              | 所需設定                             |
| -------------------- | ----------------------------------------- | ------------------------------------ |
| **私人訊息 (DMs)**   | FileConsentCard → 使用者接受 → 機器人上傳 | 開箱即用                             |
| **群組聊天/頻道**    | 上傳至 SharePoint → 分享連結              | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片（任何語境）** | Base64 編碼內嵌                           | 開箱即用                             |

### 為何群組聊天需要 SharePoint

機器人沒有個人的 OneDrive 磁碟機（`/me/drive` Graph API 端點不適用於應用程式身分識別）。為了在群組聊天/頻道中發送檔案，機器人會上傳到 **SharePoint 網站** 並建立分享連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中 **新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (應用程式) - 將檔案上傳至 SharePoint
   - `Chat.Read.All` (Application) - 選用，啟用個別使用者共用連結

2. **授予租用戶管理員同意**。

3. **取得您的 SharePoint 網站 ID：**

   ```exec
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

### 共用行為

| 權限                                    | 共用行為                              |
| --------------------------------------- | ------------------------------------- |
| 僅 `Sites.ReadWrite.All`                | 全組織共用連結 (組織內任何人皆可存取) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 個別使用者共用連結 (僅聊天成員可存取) |

個別使用者共用更安全，因為只有聊天參與者可以存取檔案。如果缺少 `Chat.Read.All` 權限，機器人會退回到全組織共用。

### 後備行為

| 情境                                        | 結果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，傳送共用連結                  |
| 群組聊天 + 檔案 + 無 `sharePointSiteId`     | 嘗試 OneDrive 上傳 (可能失敗)，僅傳送文字        |
| 個人聊天 + 檔案                             | FileConsentCard 流程（無需 SharePoint 即可運作） |
| 任何內容 + 圖片                             | Base64 編碼內嵌（無需 SharePoint 即可運作）      |

### 檔案儲存位置

上傳的檔案會儲存在已設定 SharePoint 網站之預設文件庫中的 `/OpenClawShared/` 資料夾裡。

## 投票（Adaptive Cards）

OpenClaw 會將 Teams 投票以 Adaptive Cards 形式傳送（Teams 沒有原生的投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票記錄會由閘道器記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道器必須保持上線才能記錄投票。
- 投票尚不自動發佈結果摘要（如有需要請檢查儲存檔案）。

## Adaptive Cards（任意）

使用 `message` 工具或 CLI 將任何 Adaptive Card JSON 傳送給 Teams 使用者或對話。

`card` 參數接受一個 Adaptive Card JSON 物件。當提供 `card` 時，訊息文字為選填。

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

```exec
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

請參閱 [Adaptive Cards 文件](https://adaptivecards.io/) 以了解卡片結構描述和範例。有關目標格式的詳細資訊，請參閱下方的 [Target formats](#target-formats)。

## 目標格式

MSTeams 目標使用前綴來區分使用者和對話：

| 目標類型          | 格式                             | 範例                                                |
| ----------------- | -------------------------------- | --------------------------------------------------- |
| 使用者 (透過 ID)  | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| 使用者 (透過名稱) | `user:<display-name>`            | `user:John Smith` (需要 Graph API)                  |
| 群組/頻道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| 群組/頻道 (原始)  | `<conversation-id>`              | `19:abc123...@thread.tacv2` (if contains `@thread`) |

**CLI 範例：**

```exec
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

注意：如果沒有 `user:` 前綴，名稱預設為群組/團隊解析。當以顯示名稱為目標找人時，請務必使用 `user:`。

## 主動訊息

- 只有在使用者互動**之後**，才可能發送主動訊息，因為我們會在當時儲存對話參考。
- 請參閱 `/gateway/configuration` 以了解 `dmPolicy` 和允許清單閘道。

## 團隊與頻道 ID (常見陷阱)

Teams URL 中的 `groupId` 查詢參數**並非**用於設定的團隊 ID。請改從 URL 路徑中提取 ID：

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

- 團隊 ID = `/team/` 之後的路徑段（URL 解碼後，例如 `19:Bk4j...@thread.tacv2`）
- 頻道 ID = `/channel/` 之後的路徑段（URL 解碼後）
- **忽略** `groupId` 查詢參數

## 私人頻道

機器人在私人頻道中的支援有限：

| 功能               | 標準頻道 | 私人頻道         |
| ------------------ | -------- | ---------------- |
| 機器人安裝         | 是       | 有限             |
| 即時訊息 (webhook) | 是       | 可能無法運作     |
| RSC 權限           | 是       | 行為可能不同     |
| @提及              | 是       | 如果機器人可存取 |
| Graph API 歷史記錄 | 是       | 是（需要權限）   |

**如果私人頻道無法運作的解決方法：**

1. 使用標準頻道進行機器人互動
2. 使用 DM - 使用者可以隨時直接傳訊息給機器人
3. 使用 Graph API 進行歷史存取（需要 `ChannelMessage.Read.All`）

## 疑難排解

### 常見問題

- **頻道中圖片未顯示：** 缺少 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全關閉後重新開啟 Teams。
- **頻道中無回應：** 預設需要提及；請設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行設定。
- **版本不相符 (Teams 仍顯示舊版資訊清單)：** 移除並重新新增應用程式，並完全關閉 Teams 以重新整理。
- **來自 Webhook 的 401 未授權錯誤：** 在沒有 Azure JWT 的情況下手動測試時預期會發生此情況 - 這表示端點可達但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **「圖示檔案不能為空白」：** 資訊清單參照的圖示檔案大小為 0 位元組。請建立有效的 PNG 圖示 (`outline.png` 為 32x32，`color.png` 為 192x192)。
- **"webApplicationInfo.Id already in use"**：應用程式仍安裝在另一個團隊/聊天中。請先找到並將其解除安裝，或等待 5-10 分鐘以供傳播。
- **上傳時出現「Something went wrong」**：改透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發者工具 (F12) → Network 分頁，並檢查回應主體 (response body) 以取得實際錯誤。
- **側載失敗：** 請嘗試使用「將應用程式上傳至您組織的應用程式目錄」，而不是「上傳自訂應用程式」——這通常可以繞過側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否與您機器人的 App ID 完全一致
2. 重新上傳應用程式並在小組/聊天中重新安裝
3. 檢查您的組織管理員是否封鎖了 RSC 權限
4. 確認您使用的範圍正確：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [建立 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams 開發者入口網站](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams 應用程式資訊清單架構](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收頻道訊息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 權限參考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 機器人檔案處理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [主動訊息傳遞](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
