---
summary: "Microsoft Teams 機器人支援狀態、功能和設定"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> 「入此門者，當放棄一切希望。」

更新日期：2026-03-25

狀態：支援文字 + DM 附件；頻道/群組檔案發送需要 `sharePointSiteId` + Graph 權限（請參閱[在群組聊天中發送檔案](#sending-files-in-group-chats)。投票是透過 Adaptive Cards 發送的。訊息動作會針對以檔案優先的發送公開顯式的 `upload-file`。

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

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定（初學者）

1. 確認 Microsoft Teams 外掛程式可用。
   - 目前的封裝版 OpenClaw 發行版本已包含它。
   - 較舊/自訂安裝可以使用上述命令手動新增。
2. 建立 **Azure Bot**（App ID + 用戶端金鑰 + 租用戶 ID）。
3. 使用這些憑證設定 OpenClaw。
4. 透過公開 URL 或通道公開 `/api/messages`（預設連接埠 3978）。
5. 安裝 Teams 應用程式套件並啟動閘道。

最簡設定（用戶端密碼）：

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

對於生產環境部署，建議考慮使用[聯合驗證](#federated-authentication-certificate--managed-identity)（憑證或受控識別），而非用戶端密碼。

注意：群組聊天預設會被封鎖（`channels.msteams.groupPolicy: "allowlist"`）。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 允許任何成員，透過提及限制）。

## 目標

- 透過 Teams 私訊、群組聊天或頻道與 OpenClaw 對話。
- 保持路由確定性：回覆一律會回到它們抵達的頻道。
- 預設為安全的頻道行為 (除非另有配置，否則需要提及)。

## 配置寫入

預設情況下，Microsoft Teams 被允許寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 存取控制 (私訊 + 群組)

**私訊存取**

- 預設值：`channels.msteams.dmPolicy = "pairing"`。未知的寄件者將被忽略，直到獲得核准。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID。
- UPN/顯示名稱是可變的；直接比對預設為停用，且僅能透過 `channels.msteams.dangerouslyAllowNameMatching: true` 啟用。
- 當認證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取權**

- 預設值：`channels.msteams.groupPolicy = "allowlist"`（除非您新增 `groupAllowFrom`，否則會被封鎖）。若未設定，請使用 `channels.defaults.groupPolicy` 覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些寄件者可以在群組聊天/頻道中觸發（會退回 `channels.msteams.allowFrom`）。
- 設定 `groupPolicy: "open"` 以允許任何成員（預設仍需提及）。
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

- 透過在 `channels.msteams.teams` 下列出團隊和頻道，來限制群組/頻道回覆的範圍。
- 金鑰應使用穩定的團隊 ID 和頻道交談 ID。
- 當 `groupPolicy="allowlist"` 和團隊允許清單同時存在時，只會接受列出的團隊/頻道（提及限制）。
- 設定精靈接受 `Team/Channel` 條目並為您儲存它們。
- 啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）
  並記錄對應關係；未解析的團隊/頻道名稱會保持輸入狀態，但在預設情況下會被忽略路由，除非啟用了 `channels.msteams.dangerouslyAllowNameMatching: true`。

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

1. 確保 Microsoft Teams 外掛程式可用。
   - 目前的封裝版 OpenClaw 版本已經包含它。
   - 較舊或自訂的安裝可以使用上述指令手動新增。
2. 建立一個 **Azure Bot** (App ID + secret + tenant ID)。
3. 建構一個參照該 Bot 並包含下列 RSC 權限的 **Teams 應用程式套件**。
4. 將 Teams 應用程式上傳/安裝到團隊中（或安裝到個人範圍以進行 DM）。
5. 在 `~/.openclaw/openclaw.json` (或環境變數) 中設定 `msteams` 並啟動閘道。
6. 閘道預設會在 `/api/messages` 上監聽 Bot Framework webhook 流量。

## Azure Bot 設定 (先決條件)

在設定 OpenClaw 之前，您需要建立一個 Azure Bot 資源。

### 步驟 1：建立 Azure Bot

1. 前往 [建立 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **[基本]** 索引標籤：

   | 欄位             | 數值                                                  |
   | ---------------- | ----------------------------------------------------- |
   | **Bot 名稱**     | 您的 Bot 名稱，例如 `openclaw-msteams` (必須是唯一的) |
   | **訂閱**         | 選取您的 Azure 訂閱                                   |
   | **資源群組**     | 建立新的或使用現有的                                  |
   | **定價層**       | **免費** 用於開發/測試                                |
   | **應用程式類型** | **單一租用戶** (建議 - 請參閱下方的說明)              |
   | **建立類型**     | **建立新的 Microsoft App ID**                         |

> **淘汰公告：** 在 2025-07-31 之後，已停止建立新的多租用戶 Bot。新的 Bot 請使用 **單一租用戶**。

3. 按一下 **[審核 + 建立]** → **[建立]** (等待約 1-2 分鐘)

### 步驟 2：取得認證

1. 前往您的 Azure Bot 資源 → **[設定]**
2. 複製 **Microsoft App ID** → 這就是您的 `appId`
3. 按一下 **[管理密碼]** → 前往應用程式註冊
4. 在 **[憑證與祕密]** 下 → **[新增用戶端祕密]** → 複製 **[值]** → 這就是您的 `appPassword`
5. 前往 **概觀** → 複製 **目錄 (租用戶) ID** → 這就是您的 `tenantId`

### 步驟 3：設定傳訊端點

1. 在 Azure Bot → **組態** 中
2. 將 **傳訊端點** 設定為您的 webhook URL：
   - 正式環境：`https://your-domain.com/api/messages`
   - 本機開發：使用通道 (請參閱下方的 [本機開發](#local-development-tunneling))

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot → **頻道** 中
2. 點擊 **Microsoft Teams** → 組態 → 儲存
3. 接受服務條款

## 聯合驗證 (憑證 + 受控識別)

> 新增於 2026.3.24

對於正式環境部署，OpenClaw 支援 **聯合驗證**，作為用戶端密碼更安全的替代方案。有兩種方法可用：

### 選項 A：基於憑證的驗證

使用已在您的 Entra ID 應用程式註冊中註冊的 PEM 憑證。

**設定：**

1. 產生或取得憑證 (包含私鑰的 PEM 格式)。
2. 在 Entra ID → 應用程式註冊 → **憑證與祕密** → **憑證** → 上傳公開憑證。

**組態：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      certificatePath: "/path/to/cert.pem",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**環境變數：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### 選項 B：Azure 受控識別

使用 Azure 受控識別進行無密碼驗證。這非常適合部署在具備受控識別的 Azure 基礎設施 (AKS、App Service、Azure VM) 上。

**運作方式：**

1. Bot Pod/VM 具有受控識別 (系統指派或使用者指派)。
2. **聯合識別憑證** 會將受控識別連結到 Entra ID 應用程式註冊。
3. 執行時，OpenClaw 使用 `@azure/identity` 從 Azure IMDS 端點 (`169.254.169.254`) 取得權杖。
4. 權杖會傳遞給 Teams SDK 以進行 Bot 驗證。

**必要條件：**

- 已啟用受控識別的 Azure 基礎設施 (AKS 工作負載識別、App Service、VM)
- 已在 Entra ID 應用程式註冊上建立的聯合識別憑證
- Pod/VM 對 IMDS (`169.254.169.254:80`) 的網路存取

**組態 (系統指派的受控識別)：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**組態 (使用者指派的受控識別)：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      managedIdentityClientId: "<MI_CLIENT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**環境變數：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (僅限使用者指派)

### AKS 工作負載識別設定

針對使用工作負載身分識別的 AKS 部署：

1. 在您的 AKS 叢集上**啟用工作負載身分識別**。
2. 在 Entra ID 應用程式註冊上**建立聯合身分識別認證**：

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. 使用應用程式用戶端 ID 為 Kubernetes 服務帳戶**加註**：

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. 為工作負載身分識別插入**標籤 Pod**：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **確保網路存取** IMDS (`169.254.169.254`) — 如果使用 NetworkPolicy，請新增一個允許流量連線到 80 連接埠 `169.254.169.254/32` 的 Egress 規則。

### 驗證類型比較

| 方法             | 設定                                           | 優點                 | 缺點                     |
| ---------------- | ---------------------------------------------- | -------------------- | ------------------------ |
| **用戶端密碼**   | `appPassword`                                  | 設定簡單             | 需要輪替密碼，安全性較低 |
| **憑證**         | `authType: "federated"` + `certificatePath`    | 網路上無共用密碼     | 憑證管理額外負荷         |
| **受控身分識別** | `authType: "federated"` + `useManagedIdentity` | 無密碼，無需管理密碼 | 需要 Azure 基礎結構      |

**預設行為：** 當未設定 `authType` 時，OpenClaw 預設為用戶端密碼驗證。現有設定可繼續運作而無需變更。

## 本機開發

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

## Teams 開發人員入口網站

除了手動建立資訊清單 ZIP 檔案外，您也可以使用 [Teams 開發人員入口網站](https://dev.teams.microsoft.com/apps)：

1. 按一下 **+ 新增應用程式**
2. 填寫基本資訊 (名稱、描述、開發人員資訊)
3. 前往 **應用程式功能** → **Bot**
4. 選取 **手動輸入 Bot ID** 並貼上您的 Azure Bot 應用程式 ID
5. 勾選範圍：**個人**、**小組**、**群組聊天**
6. 按一下 **發佈** → **下載應用程式套件**
7. 在 Teams 中：**應用程式** → **管理您的應用程式** → **上傳自訂應用程式** → 選取 ZIP 檔案

這通常比手動編輯 JSON 資訊清單更容易。

## 測試 Bot

**選項 A：Azure Web Chat (先驗證 webhook)**

1. 在 Azure 入口網站 → 您的 Azure Bot 資源 → **在 Web Chat 中測試**
2. 傳送訊息 - 您應該會看到回應
3. 這會在 Teams 設定之前確認您的 webhook 端點正常運作

**選項 B：Teams (安裝應用程式後)**

1. 安裝 Teams 應用程式
2. 在 Teams 中尋找 Bot 並傳送私訊
3. 檢查傳入活動的閘道記錄

## 設定（僅文字的最低要求）

1. **確保 Microsoft Teams 外掛程式可用**
   - 目前的封裝版 OpenClaw 發行版本已經內建了它。
   - 較舊/自訂的安裝可以手動新增：
     - 從 npm：`openclaw plugins install @openclaw/msteams`
     - 從本地端 checkout：`openclaw plugins install ./path/to/local/msteams-plugin`

2. **Bot 註冊**
   - 建立 Azure Bot（見上文）並記下：
     - 應用程式 ID
     - 用戶端密碼（應用程式密碼）
     - 租用戶 ID（單一租用戶）

3. **Teams 應用程式資訊清單**
   - 包含一個帶有 `botId = <App ID>` 的 `bot` 項目。
   - 範圍：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（個人範圍檔案處理所需）。
   - 新增 RSC 權限（如下）。
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
   - `MSTEAMS_AUTH_TYPE`（選用：`"secret"` 或 `"federated"`）
   - `MSTEAMS_CERTIFICATE_PATH`（聯合 + 憑證）
   - `MSTEAMS_CERTIFICATE_THUMBPRINT`（選用，驗證不需要）
   - `MSTEAMS_USE_MANAGED_IDENTITY`（聯合 + 受控識別）
   - `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（僅限使用者指派的 MI）

5. **Bot 端點**
   - 將 Azure Bot 訊息端點設定為：
     - `https://<host>:3978/api/messages`（或您選擇的路徑/連接埠）。

6. **執行閘道**
   - 當內建或手動安裝的外掛程式可用且存在含有憑證的 `msteams` 設定時，Teams 頻道會自動啟動。

## 成員資訊動作

OpenClaw 為 Microsoft Teams 提供了一個由 Graph 支援的 `member-info` 動作，以便代理程式和自動化可以直接從 Microsoft Graph 解析頻道成員詳細資料（顯示名稱、電子郵件、角色）。

需求：

- `Member.Read.Group` RSC 權限（已包含在推薦的資訊清單中）
- 對於跨團隊查詢：需要具有管理員同意的 `User.Read.All` Graph 應用程式權限

此動作受 `channels.msteams.actions.memberInfo` 控制（預設值：當 Graph 憑證可用時啟用）。

## 歷程記錄內容

- `channels.msteams.historyLimit` 控制有多少最近的頻道/群組訊息被封裝到提示中。
- 會回退到 `messages.groupChat.historyLimit`。將 `0` 設定為以停用（預設為 50）。
- 擷取的執行緒歷程記錄會透過傳送者允許清單（`allowFrom` / `groupAllowFrom`）進行篩選，因此執行緒內容播種僅包含來自允許傳送者的訊息。
- 引用的附件內容（從 Teams 回覆 HTML 衍生的 `ReplyTo*`）目前會按接收到的狀態直接傳遞。
- 換句話說，允許清單控管誰可以觸發代理程式；目前僅有特定的補充內容路徑會被篩選。
- DM 歷程記錄可以使用 `channels.msteams.dmHistoryLimit`（使用者輪次）進行限制。每位使用者的覆寫設定：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限 (資訊清單)

這是我們 Teams 應用程式資訊清單中**現有的 resourceSpecific 權限**。它們僅適用於安裝應用程式的團隊/聊天內部。

**對於頻道 (團隊範圍)：**

- `ChannelMessage.Read.Group` (應用程式) - 接收所有頻道訊息而不需 @提及
- `ChannelMessage.Send.Group` (應用程式)
- `Member.Read.Group` (應用程式)
- `Owner.Read.Group` (應用程式)
- `ChannelSettings.Read.Group` (應用程式)
- `TeamMember.Read.Group` (應用程式)
- `TeamSettings.Read.Group` (應用程式)

**對於群組聊天：**

- `ChatMessage.Read.Chat` (應用程式) - 接收所有群組聊天訊息而不需 @提及

## Teams 資訊清單範例 (已編輯)

包含必要欄位的精簡有效範例。請替換 ID 和 URL。

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
- `bots[].scopes` 必須包含您計畫使用的介面（`personal`、`team`、`groupChat`）。
- 在個人範圍內處理檔案需要 `bots[].supportsFiles: true`。
- 如果您需要頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送權限。

### 更新現有應用程式

若要更新已安裝的 Teams 應用程式（例如，新增 RSC 權限）：

1. 使用新設定更新您的 `manifest.json`
2. **遞增 `version` 欄位**（例如，`1.0.0` → `1.1.0`）
3. **重新壓縮** 包含圖示的清單（`manifest.json`、`outline.png`、`color.png`）
4. 上傳新的 zip 檔案：
   - **選項 A (Teams 系統管理中心)：** Teams 系統管理中心 → Teams 應用程式 → 管理應用程式 → 尋找您的應用程式 → 上傳新版本
   - **選項 B (側載)：** 在 Teams 中 → 應用程式 → 管理您的應用程式 → 上傳自訂應用程式
5. **針對團隊頻道：** 在每個團隊中重新安裝應用程式，以讓新權限生效
6. **完全退出並重新啟動 Teams**（不只是關閉視窗），以清除快取的應用程式中繼資料

## 功能：僅限 RSC 與 Graph

### 使用 **僅限 Teams RSC**（已安裝應用程式，無 Graph API 權限）

可運作：

- 讀取頻道訊息 **文字** 內容。
- 傳送頻道訊息 **文字** 內容。
- 接收 **個人 (DM)** 檔案附件。

無法運作：

- 頻道/群組 **圖片或檔案內容**（載荷僅包含 HTML 存根）。
- 下載儲存在 SharePoint/OneDrive 中的附件。
- 讀取訊息記錄（即時 webhook 事件之外）。

### 使用 **Teams RSC + Microsoft Graph 應用程式權限**

新增功能：

- 下載託管內容（貼上訊息中的圖片）。
- 下載儲存在 SharePoint/OneDrive 中的檔案附件。
- 透過 Graph 讀取頻道/聊天訊息記錄。

### RSC 與 Graph API

| 功能           | RSC 權限           | Graph API                 |
| -------------- | ------------------ | ------------------------- |
| **即時訊息**   | 是（透過 webhook） | 否（僅輪詢）              |
| **歷史訊息**   | 否                 | 是（可以查詢記錄）        |
| **設定複雜度** | 僅限應用程式清單   | 需要管理員同意 + 權杖流程 |
| **離線運作**   | 否（必須執行中）   | 是（隨時查詢）            |

**重點：** RSC 用於即時監聽；Graph API 用於歷史存取。若要在離線時補上錯過的訊息，您需要具有 `ChannelMessage.Read.All` 的 Graph API（需要管理員同意）。

## 啟用圖形的媒體 + 歷史紀錄（頻道所需）

如果您需要在**頻道**中使用圖片/檔案或想要取得**訊息歷史紀錄**，您必須啟用 Microsoft Graph 權限並授與管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊**中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All` (頻道附件 + 歷史紀錄)
   - `Chat.Read.All` 或 `ChatMessage.Read.All` (群組聊天)
2. **授與租用戶管理員同意**。
3. 增加 Teams 應用程式的 **manifest 版本**，重新上傳，並**在 Teams 中重新安裝應用程式**。
4. **完全退出並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**使用者提及的額外權限：** 對於對話中的使用者，使用者 @提及功能開箱即用。但是，如果您想要動態搜尋並提及**不在目前對話中**的使用者，請新增 `User.Read.All` (應用程式) 權限並授與管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長（例如，LLM 回應緩慢），您可能會看到：

- 閘道逾時
- Teams 重試該訊息（導致重複）
- 回應遺失

OpenClaw 透過快速回傳並主動發送回應來處理此問題，但非常緩慢的回應仍可能導致問題。

### 格式

Teams markdown 比 Slack 或 Discord 更有限制：

- 基本格式有效：**粗體**、_斜體_、`code`、連結
- 複雜的 markdown（表格、巢狀清單）可能無法正確呈現
- 支援適用性卡 (Adaptive Cards) 用於投票和任意卡片發送（見下文）

## 設定

關鍵設定（請參閱 `/gateway/configuration` 以了解共用頻道模式）：

- `channels.msteams.enabled`：啟用/停用頻道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.webhook.port` (預設 `3978`)
- `channels.msteams.webhook.path` (預設 `/api/messages`)
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled` (預設：pairing)
- `channels.msteams.allowFrom`: DM 允許清單（建議使用 AAD 物件 ID）。當可使用 Graph 存取時，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`: 緊急開關，用以重新啟用可變更的 UPN/顯示名稱比對以及直接的團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`: 外寄文字區塊大小。
- `channels.msteams.chunkMode`: `length`（預設）或 `newline`，以在長度區塊分割之前依空白行（段落邊界）分割。
- `channels.msteams.mediaAllowHosts`: 內送附件主機的允許清單（預設為 Microsoft/Teams 網域）。
- `channels.msteams.mediaAuthAllowHosts`: 允許在媒體重試時附加 Authorization 標頭的允許清單（預設為 Graph + Bot Framework 主機）。
- `channels.msteams.requireMention`: 在頻道/群組中需要 @提及（預設為 true）。
- `channels.msteams.replyStyle`: `thread | top-level`（請參閱[回覆樣式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`: 針對每個團隊的覆寫。
- `channels.msteams.teams.<teamId>.requireMention`: 針對每個團隊的覆寫。
- `channels.msteams.teams.<teamId>.tools`: 預設的針對每個團隊的工具原則覆寫（`allow`/`deny`/`alsoAllow`），當缺少頻道覆寫時使用。
- `channels.msteams.teams.<teamId>.toolsBySender`: 預設的針對每個團隊及每個傳送者的工具原則覆寫（支援 `"*"` 萬用字元）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: 針對每個頻道的覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: 針對每個頻道的覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`: 針對每個頻道的工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`: 針對每個頻道及每個傳送者的工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 索引鍵應使用明確的前置詞：
  `id:`、`e164:`、`username:`、`name:`（舊版無前置詞的索引鍵仍僅對應至 `id:`）。
- `channels.msteams.actions.memberInfo`：啟用或停用以 Graph 為基礎的成員資訊動作（預設：當 Graph 憑證可用時已啟用）。
- `channels.msteams.authType`：驗證類型 — `"secret"`（預設）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 憑證檔案的路徑（聯合 + 憑證驗證）。
- `channels.msteams.certificateThumbprint`：憑證指紋（選用，驗證不需要）。
- `channels.msteams.useManagedIdentity`：啟用受控識別驗證（聯合模式）。
- `channels.msteams.managedIdentityClientId`：使用者指派受控識別的用戶端 ID。
- `channels.msteams.sharePointSiteId`：用於群組聊天/頻道中檔案上傳的 SharePoint 網站 ID（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與工作階段

- 工作階段金鑰遵循標準代理程式格式（請參閱 [/concepts/session](/zh-Hant/concepts/session))：
  - 直接訊息共用主要工作階段 (`agent:<agentId>:<mainKey>`)。
  - 頻道/群組訊息使用對話 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆樣式：串列與貼文

Teams 最近針對相同的底層資料模型引進了兩種頻道 UI 樣式：

| 樣式                 | 說明                             | 建議 `replyStyle` |
| -------------------- | -------------------------------- | ----------------- |
| **貼文**（經典）     | 訊息顯示為下方具有串列回覆的卡片 | `thread`（預設）  |
| **串列**（類 Slack） | 訊息線性流動，更像 Slack         | `top-level`       |

**問題所在：** Teams API 不會公開頻道使用的 UI 樣式。如果您使用了錯誤的 `replyStyle`：

- 在串列樣式頻道中使用 `thread` → 回覆會以尷尬的巢狀方式顯示
- 在貼文樣式頻道中使用 `top-level` → 回覆會顯示為獨立的頂層貼文，而非在串列內

**解決方案：** 根據頻道的設定方式，為每個頻道設定 `replyStyle`：

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

- **DM：** 圖片和檔案附件可透過 Teams Bot 檔案 API 運作。
- **頻道/群組：** 附件儲存在 M365 儲存空間（SharePoint/OneDrive）中。Webhook 載荷僅包含 HTML 存根，而非實際的檔案位元組。**需要 Graph API 權限** 才能下載頻道附件。
- 對於明確的「檔案優先」發送，請使用 `action=upload-file` 搭配 `media` / `filePath` / `path`；選用的 `message` 會成為隨附的文字/留言，而 `filename` 則會覆蓋上傳的名稱。

如果沒有 Graph 權限，包含圖片的頻道訊息將只會以文字形式接收（機器人無法存取圖片內容）。
預設情況下，OpenClaw 只會從 Microsoft/Teams 的主機名稱下載媒體。可以使用 `channels.msteams.mediaAllowHosts` 覆蓋（使用 `["*"]` 以允許任何主機）。
授權標頭僅會附加給 `channels.msteams.mediaAuthAllowHosts` 中的主機（預設為 Graph + Bot Framework 主機）。請嚴格維護此清單（避免多租用戶後綴）。

## 在群組聊天中傳送檔案

機器人可以使用 FileConsentCard 流程（內建）在私人訊息（DM）中傳送檔案。但是，**在群組聊天/頻道中傳送檔案** 需要額外設定：

| 內容                 | 檔案傳送方式                              | 所需設定                             |
| -------------------- | ----------------------------------------- | ------------------------------------ |
| **私人訊息 (DM)**    | FileConsentCard → 使用者接受 → 機器人上傳 | 開箱即用                             |
| **群組聊天/頻道**    | 上傳至 SharePoint → 分享連結              | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片（任何內容）** | Base64 編碼內嵌                           | 開箱即用                             |

### 為何群組聊天需要 SharePoint

機器人沒有個人 OneDrive 磁碟機（`/me/drive` Graph API 端點不適用於應用程式身分識別）。若要在群組聊天/頻道中傳送檔案，機器人會上傳至 **SharePoint 網站** 並建立分享連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中**新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (應用程式) - 上傳檔案至 SharePoint
   - `Chat.Read.All` (應用程式) - 選用，啟用個別使用者的分享連結

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

| 權限                                    | 分享行為                               |
| --------------------------------------- | -------------------------------------- |
| 僅 `Sites.ReadWrite.All`                | 全組織共用連結（組織內任何人皆可存取） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 個別使用者共用連結（僅聊天成員可存取） |

個別使用者共用更安全，因為只有聊天參與者可以存取檔案。如果缺少 `Chat.Read.All` 權限，Bot 會退回到全組織共用。

### 退回行為

| 場景                                        | 結果                                               |
| ------------------------------------------- | -------------------------------------------------- |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，傳送共用連結                    |
| 群組聊天 + 檔案 + 無 `sharePointSiteId`     | 嘗試上傳至 OneDrive（可能失敗），僅傳送文字        |
| 個人聊天 + 檔案                             | FileConsentCard 流程（不需要 SharePoint 即可運作） |
| 任何內容 + 圖片                             | Base64 編碼內嵌（不需要 SharePoint 即可運作）      |

### 檔案儲存位置

上傳的檔案會儲存在設定之 SharePoint 網站預設文件庫中的 `/OpenClawShared/` 資料夾內。

## 投票（適應性卡片）

OpenClaw 將 Teams 投票以適應性卡片方式傳送（沒有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票紀錄會由閘道記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道必須保持上線才能記錄投票。
- 投票尚未自動張貼結果摘要（如有需要請檢查存儲檔案）。

## 適應性卡片（任意）

使用 `message` 工具或 CLI 將任何適應性卡片 JSON 傳送給 Teams 使用者或對話。

`card` 參數接受適應性卡片 JSON 物件。當提供 `card` 時，訊息文字為選用。

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

參閱[適應性卡片文件](https://adaptivecards.io/)以了解卡片結構描述和範例。關於目標格式的詳細資訊，請參閱下方的[目標格式](#target-formats)。

## 目標格式

MSTeams 目標使用前綴來區分使用者和對話：

| 目標類型          | 格式                             | 範例                                             |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| 使用者（依 ID）   | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`      |
| 使用者（依名稱）  | `user:<display-name>`            | `user:John Smith`（需要 Graph API）              |
| 群組/頻道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`         |
| 群組/頻道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2` (如果包含 `@thread`) |

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

注意：如果沒有 `user:` 前綴，名稱預設為群組/團隊解析。當依顯示名稱鎖定人員時，請務必使用 `user:`。

## 主動訊息

- 只有在使用者互動**之後**才可能發送主動訊息，因為我們會在該時間點儲存對話參考。
- 請參閱 `/gateway/configuration` 以取得 `dmPolicy` 和允許清單閘道。

## 團隊和頻道 ID (常見陷阱)

Teams URL 中的 `groupId` 查詢參數**並非**用於設定的團隊 ID。請改從 URL 路徑擷取 ID：

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

**針對設定：**

- 團隊 ID = `/team/` 之後的路徑區段 (URL 解碼，例如 `19:Bk4j...@thread.tacv2`)
- 頻道 ID = `/channel/` 之後的路徑區段 (URL 解碼)
- **請忽略** `groupId` 查詢參數

## 私人頻道

Bot 在私人頻道中的支援有限：

| 功能               | 標準頻道 | 私人頻道         |
| ------------------ | -------- | ---------------- |
| Bot 安裝           | 是       | 有限             |
| 即時訊息 (webhook) | 是       | 可能無法運作     |
| RSC 權限           | 是       | 行為可能有所不同 |
| @mentions          | 是       | 如果可存取 bot   |
| Graph API 記錄     | 是       | 是 (需要權限)    |

**如果私人頻道無法運作的解決方法：**

1. 使用標準頻道進行 bot 互動
2. 使用 DM - 使用者隨時可以直接傳訊息給 bot
3. 使用 Graph API 取得歷史記錄存取權 (需要 `ChannelMessage.Read.All`)

## 疑難排解

### 常見問題

- **頻道中未顯示圖片：** 遺失 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全退出/重新開啟 Teams。
- **頻道中沒有回應：** 預設需要提及；請設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行設定。
- **版本不符 (Teams 仍顯示舊的資訊清單)：** 移除並重新新增應用程式，並完全退出 Teams 以重新整理。
- **來自 webhook 的 401 未授權：** 在沒有 Azure JWT 的情況下手動測試時為預期情況 - 表示端點可連線但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **"Icon file cannot be empty":** 資訊清單 參考的圖示檔案大小為 0 位元組。請建立有效的 PNG 圖示（`outline.png` 為 32x32，`color.png` 為 192x192）。
- **"webApplicationInfo.Id already in use":** 應用程式仍安裝在另一個團隊/聊天中。請先找到並將其解除安裝，或等待 5-10 分鐘以進行傳播。
- **上傳時出現 "Something went wrong"：** 請改透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發者工具 (F12) → Network 索引標籤，並檢查回應主體 以取得實際錯誤。
- **側載 失敗：** 請嘗試使用 "Upload an app to your org's app catalog" 而非 "Upload a custom app" - 這通常可以避開側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否與您的機器人 App ID 完全相符
2. 重新上傳應用程式並在團隊/聊天中重新安裝
3. 檢查您的組織管理員是否已封鎖 RSC 權限
4. 確認您使用的範圍 正確：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## 相關

- [Channels Overview](/zh-Hant/channels) — 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) — DM 驗證與配對流程
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為與提及閘道
- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [Security](/zh-Hant/gateway/security) — 存取模型與強化防護
