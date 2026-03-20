---
summary: "Microsoft Teams 機器人支援狀態、功能及設定"
read_when:
  - 正在處理 MS Teams 頻道功能
title: "Microsoft Teams"
---

# Microsoft Teams (外掛程式)

> 「放棄所有希望吧，你們這些進入這裡的人。」

更新日期：2026-01-21

狀態：支援文字 + 私訊附件；頻道/群組檔案傳送需要 `sharePointSiteId` + Graph 權限（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。投票是透過 Adaptive Cards 傳送的。

## 需要外掛程式

Microsoft Teams 以外掛程式形式發行，並未隨附於核心安裝中。

**重大變更 (2026.1.15)：** MS Teams 已移出核心。如果您使用它，必須安裝此外掛程式。

可解釋原因：讓核心安裝更輕量，並允許 MS Teams 相關依賴獨立更新。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/msteams
```

本機結帳 (當從 git repo 執行時)：

```bash
openclaw plugins install ./extensions/msteams
```

如果您在設定期間選擇 Teams 且偵測到 git checkout，
OpenClaw 將自動提供本機安裝路徑。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定 (初學者)

1. 安裝 Microsoft Teams 外掛程式。
2. 建立 **Azure Bot** (App ID + client secret + tenant ID)。
3. 使用那些憑證設定 OpenClaw。
4. 透過公開 URL 或通道公開 `/api/messages`（預設連接埠 3978）。
5. 安裝 Teams 應用程式套件並啟動閘道。

最精簡設定：

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

注意：群組聊天預設為封鎖（`channels.msteams.groupPolicy: "allowlist"`）。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 以允許任何成員，以提及為閘道）。

## 目標

- 透過 Teams 私訊、群組聊天或頻道與 OpenClaw 對話。
- 保持路由確定性：回覆一律傳回收到訊息的頻道。
- 預設為安全的頻道行為（除非另有設定，否則需要提及）。

## 設定寫入

預設情況下，允許 Microsoft Teams 寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 存取控制 (私訊 + 群組)

**私訊存取**

- 預設值：`channels.msteams.dmPolicy = "pairing"`。未知的寄件者將被忽略，直到獲得核准為止。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID。
- UPN/顯示名稱是可變的；直接比對預設為停用，僅在使用 `channels.msteams.dangerouslyAllowNameMatching: true` 時啟用。
- 當憑證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取**

- 預設值：`channels.msteams.groupPolicy = "allowlist"`（除非您新增 `groupAllowFrom`，否則為封鎖狀態）。使用 `channels.defaults.groupPolicy` 以在未設定時覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些寄件者可以在群組聊天/頻道中觸發（回退至 `channels.msteams.allowFrom`）。
- 設定 `groupPolicy: "open"` 以允許任何成員（預設仍以提及為閘道）。
- 若要允許**無頻道**，請設定 `channels.msteams.groupPolicy: "disabled"`。

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

- 透過在 `channels.msteams.teams` 下列出團隊和頻道來限制群組/頻道回覆的範圍。
- 金鑰應使用穩定的團隊 ID 和頻道對話 ID。
- 當 `groupPolicy="allowlist"` 且存在 Teams 允許清單時，僅接受列出的團隊/頻道（以提及為閘道）。
- 設定精靈接受 `Team/Channel` 項目並為您儲存它們。
- 啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）
  並記錄此對應；未解析的團隊/頻道名稱會保持原樣，但除非啟用了 `channels.msteams.dangerouslyAllowNameMatching: true`，否則預設會在路由時被忽略。

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
2. 建立 **Azure Bot**（App ID + secret + tenant ID）。
3. 建置參照該 Bot 的 **Teams 應用程式套件**，並包含下列 RSC 權限。
4. 將 Teams 應用程式上傳/安裝到團隊中（或 DM 的個人範圍）。
5. 在 `~/.openclaw/openclaw.json`（或環境變數）中設定 `msteams` 並啟動閘道。
6. 閘道預設會在 `/api/messages` 上聆聽 Bot Framework webhook 流量。

## Azure Bot 設定（先決條件）

在設定 OpenClaw 之前，您需要建立 Azure Bot 資源。

### 步驟 1：建立 Azure Bot

1. 前往 [建立 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **Basics** 分頁：

   | 欄位              | 值                                                    |
   | ------------------ | -------------------------------------------------------- |
   | **Bot handle**     | 您的 Bot 名稱，例如 `openclaw-msteams`（必須是唯一的） |
   | **Subscription**   | 選取您的 Azure 訂用帳戶                           |
   | **Resource group** | 建立新的或使用現有的                               |
   | **定價層**   | **免費** 適用於開發/測試                                 |
   | **應用程式類型**    | **單一租用戶**（建議 - 請參閱下方備註）         |
   | **建立類型**  | **建立新的 Microsoft 應用程式 ID**                          |

> **棄用公告：** 建立新的多租用戶 Bot 已於 2025-07-31 後棄用。新的 Bot 請使用 **單一租用戶**。

3. 按一下 **檢閱 + 建立** → **建立**（等待約 1-2 分鐘）

### 步驟 2：取得認證

1. 前往您的 Azure Bot 資源 → **設定**
2. 複製 **Microsoft App ID** → 這是您的 `appId`
3. 按一下 **管理密碼** → 前往應用程式註冊
4. 在 **Certificates & secrets** 下 → **New client secret** → 複製 **Value** → 這是您的 `appPassword`
5. 前往 **Overview** → 複製 **Directory (tenant) ID** → 這是您的 `tenantId`

### 步驟 3：設定訊息端點

1. 在 Azure Bot 中 → **設定**
2. 將 **訊息端點** 設定為您的 webhook URL：
   - 正式環境：`https://your-domain.com/api/messages`
   - 本機開發：使用通道（請參見下方的 [Local Development](#local-development-tunneling)）

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot 中 → **頻道**
2. 按一下 **Microsoft Teams** → 設定 → 儲存
3. 接受服務條款

## 本機開發（通道）

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

## Teams 開發人員入口網站（替代方案）

除了手動建立 manifest ZIP 檔案，您也可以使用 [Teams Developer Portal](https://dev.teams.microsoft.com/apps)：

1. 按一下 **+ 新增應用程式**
2. 填寫基本資訊（名稱、描述、開發人員資訊）
3. 前往 **應用程式功能** → **Bot**
4. 選取 **手動輸入 Bot ID** 並貼上您的 Azure Bot 應用程式 ID
5. 勾選範圍：**個人**、**團隊**、**群組聊天**
6. 按一下 **發佈** → **下載應用程式套件**
7. 在 Teams 中：**應用程式** → **管理您的應用程式** → **上傳自訂應用程式** → 選取 ZIP 檔

這通常比手動編輯 JSON 資訊清單更容易。

## 測試 Bot

**選項 A：Azure Web Chat（先驗證 webhook）**

1. 在 Azure 入口網站中 → 您的 Azure Bot 資源 → **在 Web Chat 中測試**
2. 傳送訊息 - 您應該會看到回應
3. 這能確認您的 webhook 端點在進行 Teams 設定前運作正常

**選項 B：Teams（安裝應用程式後）**

1. 安裝 Teams 應用程式（側載或組織目錄）
2. 在 Teams 中尋找機器人並傳送私人訊息
3. 檢查閘道日誌中的傳入活動

## 設定（僅限文字，最小化）

1. **安裝 Microsoft Teams 外掛程式**
   - 來自 npm：`openclaw plugins install @openclaw/msteams`
   - 來自本地端簽出版本：`openclaw plugins install ./extensions/msteams`

2. **機器人註冊**
   - 建立 Azure Bot（參見上文）並記下：
     - 應用程式 ID
     - 用戶端密碼（應用程式密碼）
     - 租戶 ID（單一租戶）

3. **Teams 應用程式資訊清單**
   - 包含一個帶有 `botId = <App ID>` 的 `bot` 項目。
   - 範圍：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（個人範圍檔案處理所需）。
   - 新增 RSC 權限（見下文）。
   - 建立圖示：`outline.png` (32x32) 和 `color.png` (192x192)。
   - 將這三個檔案一起壓縮：`manifest.json`、`outline.png`、`color.png`。

4. **設定 OpenClaw**

   ```json
   {
     "msteams": {
       "enabled": true,
       "appId": "<APP_ID>",
       "appPassword": "<APP_PASSWORD>",
       "tenantId": "<TENANT_ID>",
       "webhook": { "port": 3978, "path": "/api/messages" }
     }
   }
   ```

   您也可以使用環境變數代替設定金鑰：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **機器人端點**
   - 將 Azure Bot 傳訊端點設定為：
     - `https://<host>:3978/api/messages`（或您選擇的路徑/連接埠）。

6. **執行閘道**
   - 當此外掛程式安裝完成且存在包含認證的 `msteams` 設定時，Teams 頻道會自動啟動。

## 歷程記錄內容

- `channels.msteams.historyLimit` 控制有多少近期的頻道/群組訊息會被包裝到提示詞中。
- 預設為 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設值為 50）。
- 可以透過 `channels.msteams.dmHistoryLimit`（使用者輪次）限制 DM 歷史記錄。每個使用者的覆寫設定：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限（資訊清單）

這些是我們 Teams 應用程式資訊清單中**現有的 resourceSpecific 權限**。它們僅適用於安裝應用程式的團隊/聊天內部。

**針對頻道（團隊範圍）：**

- `ChannelMessage.Read.Group` (Application) - 在不使用 @提及 的情況下接收所有頻道訊息
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**對於群組聊天：**

- `ChatMessage.Read.Chat` (Application) - 在不使用 @提及 的情況下接收所有群組聊天訊息

## Teams 宣告範例 (已編輯)

包含必填欄位的最小、有效範例。請替換 ID 和 URL。

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  "manifestVersion": "1.23",
  "version": "1.0.0",
  "id": "00000000-0000-0000-0000-000000000000",
  "name": { "short": "OpenClaw" },
  "developer": {
    "name": "Your Org",
    "websiteUrl": "https://example.com",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "description": { "short": "OpenClaw in Teams", "full": "OpenClaw in Teams" },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#5B6DEF",
  "bots": [
    {
      "botId": "11111111-1111-1111-1111-111111111111",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": true
    }
  ],
  "webApplicationInfo": {
    "id": "11111111-1111-1111-1111-111111111111"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "ChannelMessage.Read.Group", "type": "Application" },
        { "name": "ChannelMessage.Send.Group", "type": "Application" },
        { "name": "Member.Read.Group", "type": "Application" },
        { "name": "Owner.Read.Group", "type": "Application" },
        { "name": "ChannelSettings.Read.Group", "type": "Application" },
        { "name": "TeamMember.Read.Group", "type": "Application" },
        { "name": "TeamSettings.Read.Group", "type": "Application" },
        { "name": "ChatMessage.Read.Chat", "type": "Application" }
      ]
    }
  }
}
```

### 宣告注意事項 (必備欄位)

- `bots[].botId` **必須**符合 Azure Bot App ID。
- `webApplicationInfo.id` **必須**符合 Azure Bot App ID。
- `bots[].scopes` 必須包含您計畫使用的介面 (`personal`, `team`, `groupChat`)。
- 在個人範圍內處理檔案需要 `bots[].supportsFiles: true`。
- 如果您希望頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送權限。

### 更新現有應用程式

若要更新已安裝的 Teams 應用程式 (例如，新增 RSC 權限)：

1. 使用新設定更新您的 `manifest.json`
2. **增加 `version` 欄位的數值**（例如：`1.0.0` → `1.1.0`）
3. **重新壓縮** 包含圖示的資訊清單 (`manifest.json`, `outline.png`, `color.png`)
4. 上傳新的 zip 檔案：
   - **選項 A (Teams 系統管理中心)：** Teams 系統管理中心 → Teams 應用程式 → 管理應用程式 → 尋找您的應用程式 → 上傳新版本
   - **選項 B (側載)：** 在 Teams 中 → 應用程式 → 管理您的應用程式 → 上傳自訂應用程式
5. **對於團隊頻道：** 在每個團隊中重新安裝應用程式以讓新權限生效
6. **完全關閉並重新啟動 Teams** (不僅是關閉視窗) 以清除快取的應用程式中繼資料

## 功能：僅限 RSC 與 Graph

### 使用 **僅限 Teams RSC** (已安裝應用程式，無 Graph API 權限)

運作正常：

- 讀取頻道訊息 **文字** 內容。
- 傳送頻道訊息 **文字** 內容。
- 接收 **個人 (DM)** 檔案附件。

無法運作：

- 頻道/群組 **圖片或檔案內容** (僅包含 HTML 存根的承載)。
- 下載儲存在 SharePoint/OneDrive 中的附件。
- 讀取訊息記錄 (超出即時 webhook 事件)。

### 使用 **Teams RSC + Microsoft Graph 應用程式權限**

新增功能：

- 下載託管的內容（貼上到訊息中的圖片）。
- 下載儲存在 SharePoint/OneDrive 中的檔案附件。
- 透過 Graph 讀取頻道/聊天訊息歷史記錄。

### RSC 與 Graph API

| 功能              | RSC 權限      | Graph API                           |
| ----------------------- | -------------------- | ----------------------------------- |
| **即時訊息**  | 是（透過 webhook）    | 否（僅輪詢）                   |
| **歷史訊息** | 否                   | 是（可查詢歷史記錄）             |
| **設定複雜度**    | 僅需 App manifest    | 需要管理員同意 + 權杖流程 |
| **可離線運作**       | 否（必須運作中） | 是（隨時查詢）                 |

**總結：** RSC 用於即時監聽；Graph API 用於歷史存取。若要在離線時追上錯過的訊息，您需要使用具有 `ChannelMessage.Read.All` 的 Graph API（需要管理員同意）。

## 已啟用 Graph 的媒體 + 歷史記錄（頻道所需）

如果您需要 **頻道** 中的圖片/檔案，或是想要擷取 **訊息歷史記錄**，您必須啟用 Microsoft Graph 權限並授與管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊** 中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All` (頻道附件 + 歷史記錄)
   - `Chat.Read.All` 或 `ChatMessage.Read.All` (群組聊天)
2. **授與租用戶的管理員同意**。
3. 將 Teams 應用程式的 **manifest 版本** 號遞增、重新上傳，並 **在 Teams 中重新安裝應用程式**。
4. **完全結束並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**提及使用者的其他權限：** 對於交談中的使用者，使用者 @提及 可直接運作。但是，如果您想要動態搜尋並提及 **不在目前交談中** 的使用者，請新增 `User.Read.All` (應用程式) 權限並授與管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長（例如：LLM 回應緩慢），您可能會看到：

- 閘道逾時
- Teams 重試訊息（導致重複）
- 回應遺失

OpenClaw 透過快速回應並主動發送回復來處理此問題，但非常緩慢的回應仍可能造成問題。

### 格式設定

Teams 的 markdown 比 Slack 或 Discord 更受限：

- 基本格式可用：**粗體**、_斜體_、`code`、連結
- 複雜的 markdown（表格、巢狀清單）可能無法正確呈現
- 投票和任意卡片發送支援 Adaptive Cards（見下文）

## 設定

關鍵設定 (共用頻道模式請參閱 `/gateway/configuration`)：

- `channels.msteams.enabled`：啟用/停用頻道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.webhook.port` (預設為 `3978`)
- `channels.msteams.webhook.path` (預設為 `/api/messages`)
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled` (預設：pairing)
- `channels.msteams.allowFrom`：DM 允許清單 (建議使用 AAD 物件 ID)。當可使用 Graph 存取時，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：緊急開關，可重新啟用可變動的 UPN/顯示名稱比對和直接的團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`：輸出文字區塊大小。
- `channels.msteams.chunkMode`：`length` (預設) 或 `newline` 在長度區塊切割之前以空行 (段落邊界) 進行分割。
- `channels.msteams.mediaAllowHosts`：輸入附件主機的允許清單 (預設為 Microsoft/Teams 網域)。
- `channels.msteams.mediaAuthAllowHosts`：在媒體重試時附加 Authorization 標頭的允許清單 (預設為 Graph + Bot Framework 主機)。
- `channels.msteams.requireMention`：在頻道/群組中要求 @提及 (預設為 true)。
- `channels.msteams.replyStyle`：`thread | top-level` (請參閱 [回覆樣式](#reply-style-threads-vs-posts))。
- `channels.msteams.teams.<teamId>.replyStyle`：各團隊的覆寫。
- `channels.msteams.teams.<teamId>.requireMention`：各團隊的覆寫。
- `channels.msteams.teams.<teamId>.tools`：當缺少通道覆寫時使用的預設每團隊工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：預設每團隊每寄件者工具原則覆寫（支援 `"*"` 萬用字元）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：每通道覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：每通道覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：每通道工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：每通道每寄件者工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 鍵應使用明確的前綴：
  `id:`、`e164:`、`username:`、`name:`（舊版無前綴鍵仍僅對應至 `id:`）。
- `channels.msteams.sharePointSiteId`：群組聊天/通道中檔案上傳的 SharePoint 網站 ID（請參閱 [在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與工作階段

- 工作階段鍵遵循標準代理程式格式（請參閱 [/concepts/session](/zh-Hant/concepts/session)）：
  - 直接訊息共用主工作階段（`agent:<agentId>:<mainKey>`）。
  - 頻道/群組訊息使用對話 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆樣式：串列與貼文

Teams 最近在相同的基礎資料模型上推出了兩種頻道 UI 樣式：

| 樣式                    | 描述                                               | 建議使用 `replyStyle` |
| ------------------------ | --------------------------------------------------------- | ------------------------ |
| **貼文** (經典)      | 訊息顯示為卡片，下方有串列回覆 | `thread`（預設）       |
| **串列** (類似 Slack) | 訊息線性流動，更像 Slack                   | `top-level`              |

**問題所在：** Teams API 不會公開通道使用的是哪種 UI 樣式。如果您使用了錯誤的 `replyStyle`：

- 在執行緒樣式的通道中使用 `thread` → 回覆會顯示得彆扭地巢狀排列
- 在貼文樣式的通道中使用 `top-level` → 回覆會顯示為個別的頂層貼文，而非在執行緒中

**解決方案：** 根據通道的設定方式，為每個通道設定 `replyStyle`：

```json
{
  "msteams": {
    "replyStyle": "thread",
    "teams": {
      "19:abc...@thread.tacv2": {
        "channels": {
          "19:xyz...@thread.tacv2": {
            "replyStyle": "top-level"
          }
        }
      }
    }
  }
}
```

## 附件與圖片

**目前的限制：**

- **DM：** 圖片和檔案附件透過 Teams 機器人檔案 API 運作。
- **頻道/群組：** 附件位於 M365 儲存空間 (SharePoint/OneDrive) 中。Webhook 載荷僅包含 HTML 存根，而不包含實際的檔案位元組。下載頻道附件**需要 Graph API 權限**。

如果沒有 Graph 權限，包含圖片的頻道訊息將以純文字形式接收（機器人無法存取圖片內容）。
根據預設，OpenClaw 只會從 Microsoft/Teams 主機名稱下載媒體。請使用 `channels.msteams.mediaAllowHosts` 覆寫（使用 `["*"]` 允許任何主機）。
授權標頭僅會附加到 `channels.msteams.mediaAuthAllowHosts` 中的主機（預設為 Graph + Bot Framework 主機）。請保持此列表嚴格（避免多租戶後綴）。

## 在群組聊天中傳送檔案

Bot 可以使用 FileConsentCard 流程 (內建) 在 DM 中傳送檔案。但是，**在群組聊天/頻道中傳送檔案**需要額外設定：

| 內容                  | 傳送檔案的方式                           | 所需設定                                    |
| ------------------------ | -------------------------------------------- | ----------------------------------------------- |
| **DM**                  | FileConsentCard → 使用者接受 → Bot 上傳 | 開箱即用                            |
| **群組聊天/頻道** | 上傳至 SharePoint → 分享連結            | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片 (任何內容)** | Base64 編碼內聯                        | 開箱即用                            |

### 為什麼群組聊天需要 SharePoint

機器人沒有個人的 OneDrive 磁碟機（`/me/drive` Graph API 端點不適用於應用程式身分識別）。若要在群組聊天/頻道中傳送檔案，機器人會上傳到 **SharePoint 網站** 並建立共用連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中**新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (應用程式) - 將檔案上傳至 SharePoint
   - `Chat.Read.All` (應用程式) - 選用，啟用每個使用者的共用連結

2. **授與租用戶管理員同意**。

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

| 權限                              | 分享行為                                          |
| --------------------------------------- | --------------------------------------------------------- |
| 僅限 `Sites.ReadWrite.All`              | 全組織分享連結 (組織內任何人皆可存取) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每個使用者的分享連結 (僅聊天成員可存取)      |

每個使用者的共用更安全，因為只有聊天參與者可以存取檔案。如果缺少 `Chat.Read.All` 權限，機器人會退回到全組織共用。

### 退回行為

| 場景                                          | 結果                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，發送分享連結            |
| 群組聊天 + 檔案 + 無 `sharePointSiteId`         | 嘗試上傳至 OneDrive（可能失敗），僅發送文字 |
| 個人聊天 + 檔案                              | FileConsentCard 流程（無需 SharePoint 即可運作）    |
| 任何情境 + 圖片                               | Base64 編碼內嵌（無需 SharePoint 即可運作）   |

### 檔案儲存位置

已上傳的檔案會儲存在已設定 SharePoint 網站的預設文件庫中的 `/OpenClawShared/` 資料夾中。

## 投票 (Adaptive Cards)

OpenClaw 會以 Adaptive Cards 形式傳送 Teams 投票（沒有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票會由閘道記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道必須保持上線才能記錄投票。
- 投票尚不會自動發布結果摘要（如需查看，請檢查儲存檔案）。

## Adaptive Cards (任意)

使用 `message` 工具或 CLI 將任何 Adaptive Card JSON 傳送給 Teams 使用者或對話。

`card` 參數接受 Adaptive Card JSON 物件。當提供 `card` 時，訊息文字是選用的。

**Agent 工具：**

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:<id>",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{ "type": "TextBlock", "text": "Hello!" }]
  }
}
```

**CLI：**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

請參閱 [Adaptive Cards 文件](https://adaptivecards.io/) 以取得卡片架構和範例。如需目標格式的詳細資訊，請參閱下方的 [目標格式](#target-formats)。

## 目標格式

MSTeams 目標使用前綴來區分使用者和對話：

| 目標類型         | 格式                           | 範例                                             |
| ------------------- | -------------------------------- | --------------------------------------------------- |
| 使用者 (依 ID)        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| 使用者 (依名稱)      | `user:<display-name>`            | `user:John Smith` (需要 Graph API)              |
| 群組/頻道       | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
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

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:John Smith",
  "message": "Hello!"
}
```

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "conversation:19:abc...@thread.tacv2",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{ "type": "TextBlock", "text": "Hello" }]
  }
}
```

注意：如果沒有 `user:` 前綴，名稱預設為群組/團隊解析。當以顯示名稱鎖定人員時，請務必使用 `user:`。

## 主動訊息

- 主動訊息僅在使用者互動**之後**才可能發生，因為我們會在該時間點儲存交談參考。
- 請參閱 `/gateway/configuration` 以取得 `dmPolicy` 和允許清單閘道資訊。

## 團隊和頻道 ID (常見陷阱)

Teams URL 中的 `groupId` 查詢參數**不是**用於設定的團隊 ID。請改從 URL 路徑擷取 ID：

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

- 團隊 ID = `/team/` 之後的路徑區段 (URL 解碼後，例如 `19:Bk4j...@thread.tacv2`)
- 頻道 ID = `/channel/` 之後的路徑區段 (URL 解碼後)
- **忽略** `groupId` 查詢參數

## 私人頻道

機器人在私人頻道中的支援有限：

| 功能                      | 標準頻道 | 私人頻道       |
| ---------------------------- | ----------------- | ---------------------- |
| 機器人安裝             | 是               | 有限                |
| 即時訊息 (webhook) | 是               | 可能無法運作           |
| RSC 權限              | 是               | 行為可能不同 |
| @mentions                    | 是               | 如果可存取機器人   |
| Graph API 歷程記錄            | 是               | 是 (需具備權限) |

**如果私人頻道無法運作，變通方法如下：**

1. 使用標準頻道進行機器人互動
2. 使用 DM - 使用者永遠可以直接傳訊息給機器人
3. 使用 Graph API 進行歷史存取 (需要 `ChannelMessage.Read.All`)

## 疑難排解

### 常見問題

- **頻道中不顯示圖片：** 缺少 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全關閉並重新開啟 Teams。
- **頻道中無回應：** 預設需要提及；請設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行設定。
- **版本不符 (Teams 仍顯示舊的資訊清單)：** 移除並重新新增應用程式，並完全關閉 Teams 以重新整理。
- **Webhook 傳回 401 未授權：** 如果在沒有 Azure JWT 的情況下手動測試，這是預期的結果 - 表示端點可連線但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **「圖示檔案不能為空白」：** 資訊清單參考的圖示檔案大小為 0 位元組。請建立有效的 PNG 圖示 (`outline.png` 為 32x32，`color.png` 為 192x192)。
- **"webApplicationInfo.Id already in use":** 應用程式仍安裝在另一個團隊/聊天中。請先找到並將其解除安裝，或等待 5-10 分鐘以進行傳播。
- **上傳時發生「錯誤」**：請改透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發人員工具 (F12) → [網路] 分頁，然後檢查回應主體以找出實際錯誤。
- **側載失敗：** 請嘗試使用「上傳應用程式至您組織的應用程式目錄」，而不是「上傳自訂應用程式」— 這通常可以規避側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否與您機器人的 App ID 完全相符
2. 重新上傳應用程式並在團隊/聊天中重新安裝
3. 檢查您的組織管理員是否已封鎖 RSC 權限
4. 確認您使用正確的範圍：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [建立 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams 開發人員入口網站](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams 應用程式資訊清單結構描述](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收頻道訊息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 權限參考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 機器人檔案處理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [主動發訊息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

import en from "/components/footer/en.mdx";

<en />
