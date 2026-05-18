---
summary: "Microsoft Teams 機器人支援狀態、功能和組態"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

狀態：支援文字 + 私訊附件；頻道/群組檔案傳送需要 `sharePointSiteId` + Graph 權限（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。投票是透過 Adaptive Cards 傳送的。訊息動作針對優先傳送檔案顯示明確的 `upload-file`。

## 隨附外掛程式

Microsoft Teams 在目前的 OpenClaw 版本中作為隨附外掛程式提供，因此在一般封裝版本中
無需額外安裝。

如果您使用的是較舊的版本，或是排除內建 Teams 的自訂安裝，請直接安裝 npm 套件：

```bash
openclaw plugins install @openclaw/msteams
```

使用 bare 套件以追蹤目前的正式發行標籤。僅在您需要可重現的安裝時，才鎖定確切版本。

本機簽出（當從 git repo 執行時）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 會在單一指令中處理機器人註冊、資訊清單建立及認證產生。

**1. 安裝並登入**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>Teams CLI 目前為預覽版。指令和旗標可能會在版本之間變更。</Note>

**2. 啟動通道** （Teams 無法連接 localhost）

如果您尚未安裝並驗證 devtunnel CLI，請先進行安裝（請參閱[入門指南](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>需要 `--allow-anonymous`，因為 Teams 無法透過 devtunnels 進行驗證。每個傳入的機器人請求仍會由 Teams SDK 自動驗證。</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978` （但這些可能會在每個工作階段中變更 URL）。

**3. 建立應用程式**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

這個單一指令：

- 建立 Entra ID (Azure AD) 應用程式
- 產生用戶端金鑰
- 建構並上傳 Teams 應用程式資訊清單（含圖示）
- 註冊機器人（預設由 Teams 管理 - 不需要 Azure 訂閱）

輸出將會顯示 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` 以及 **Teams App ID** —— 請記下這些內容以進行後續步驟。它也會提議直接在 Teams 中安裝應用程式。

**4. 設定 OpenClaw**，使用輸出中的憑證：

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<CLIENT_ID>",
      appPassword: "<CLIENT_SECRET>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

或直接使用環境變數：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

**5. 在 Teams 中安裝應用程式**

`teams app create` 會提示您安裝應用程式 - 選取「在 Teams 中安裝」。如果您跳過了這一步，您可以稍後取得連結：

```bash
teams app get <teamsAppId> --install-link
```

**6. 驗證一切正常運作**

```bash
teams app doctor <teamsAppId>
```

這會對 Bot 註冊、AAD 應用程式設定、資訊清單有效性和 SSO 設定執行診斷。

對於生產環境部署，建議考慮使用[聯合驗證](/zh-Hant/channels/msteams#federated-authentication-certificate-plus-managed-identity)（憑證或受控識別），而不是用戶端密碼。

<Note>群組聊天預設被封鎖 (`channels.msteams.groupPolicy: "allowlist"`)。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 以允許任何成員 (提及閘道)。</Note>

## 目標

- 透過 Teams 私訊 (DM)、群組聊天或頻道與 OpenClaw 對話。
- 保持路由確定性：回覆一律傳回至訊息送達的頻道。
- 預設採用安全的頻道行為 (除非另有設定，否則需要提及)。

## 設定寫入

預設情況下，允許 Microsoft Teams 寫入由 `/config set|unset` 觸發的設定更新 (需要 `commands.config: true`)。

停用方式：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 存取控制 (DM + 群組)

**DM 存取**

- 預設值：`channels.msteams.dmPolicy = "pairing"`。未知的發送者將被忽略，直到獲得核准為止。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID 或靜態發送者存取群組，例如 `accessGroup:core-team`。
- 請勿依賴 UPN/顯示名稱比對來建立允許清單 - 這些資料可能會變更。OpenClaw 預設會停用直接名稱比對；請使用 `channels.msteams.dangerouslyAllowNameMatching: true` 明確啟用。
- 當認證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取**

- 預設值：`channels.msteams.groupPolicy = "allowlist"` (除非您新增 `groupAllowFrom`，否則為封鎖狀態)。若未設定，請使用 `channels.defaults.groupPolicy` 覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些發送者或靜態發送者存取群組可以在群組聊天/頻道中觸發 (會回退至 `channels.msteams.allowFrom`)。
- 設定 `groupPolicy: "open"` 以允許任何成員 (預設仍需透過提及觸發)。
- 若要**不允許任何頻道**，請設定 `channels.msteams.groupPolicy: "disabled"`。

範例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000", "accessGroup:core-team"],
    },
  },
}
```

**Teams + 頻道允許清單**

- 透過在 `channels.msteams.teams` 下列出團隊和頻道，來限定群組/頻道回覆的範圍。
- 金鑰應使用 Teams 連結中穩定的 Teams 對話 ID，而非可變更的顯示名稱。
- 當存在 `groupPolicy="allowlist"` 且有 Teams 允許清單時，僅接受列出的團隊/頻道（提及限制）。
- 設定精靈接受 `Team/Channel` 項目並為您儲存它們。
- 啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）
  並記錄對應關係；未解析的團隊/頻道名稱會保持輸入狀態，但除非啟用 `channels.msteams.dangerouslyAllowNameMatching: true`，否則預設會在路由時被忽略。

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

<details>
<summary><strong>手動設定（不使用 Teams CLI）</strong></summary>

如果您無法使用 Teams CLI，您可以透過 Azure 入口網站手動設定 Bot。

### 運作方式

1. 確保 Microsoft Teams 外掛程式可用（內建於目前的版本中）。
2. 建立 **Azure Bot** (App ID + secret + tenant ID)。
3. 建置參照該 Bot 且包含下列 RSC 權限的 **Teams 應用程式套件**。
4. 將 Teams 應用程式上傳/安裝到團隊（或用於 DM 的個人範圍）。
5. 在 `~/.openclaw/openclaw.json`（或環境變數）中設定 `msteams` 並啟動閘道。
6. 閘道預設會在 `/api/messages` 上傾聽 Bot Framework webhook 流量。

### 步驟 1：建立 Azure Bot

1. 前往 [建立 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **基本** 分頁：

   | 欄位             | 值                                                 |
   | ---------------- | -------------------------------------------------- |
   | **Bot 代碼**     | 您的 Bot 名稱，例如 `openclaw-msteams`（必須唯一） |
   | **訂閱**         | 選取您的 Azure 訂閱                                |
   | **資源群組**     | 建立新的或使用現有的                               |
   | **定價層**       | 開發/測試使用 **免費**                             |
   | **應用程式類型** | **單一租用戶**（建議 - 請參閱下方的備註）          |
   | **建立類型**     | **建立新的 Microsoft App ID**                      |

<Warning>建立新的多租用戶 Bot 已於 2025-07-31 起淘汰。新 Bot 請使用 **單一租用戶**。</Warning>

3. 按一下 **檢閱 + 建立** → **建立**（等候約 1-2 分鐘）

### 步驟 2：取得認證

1. 前往您的 Azure Bot 資源 → **設定**
2. 複製 **Microsoft App ID** → 這是您的 `appId`
3. 按一下 **管理密碼** → 前往應用程式註冊
4. 在 **憑證與祕密** 下 → **新的用戶端祕密** → 複製 **值** → 這是您的 `appPassword`
5. 前往 **概觀** → 複製 **目錄 (租用戶) ID** → 這就是您的 `tenantId`

### 步驟 3：設定傳訊端點

1. 在 Azure Bot → **設定** 中
2. 將 **傳訊端點** 設定為您的 webhook URL：
   - 生產環境：`https://your-domain.com/api/messages`
   - 本機開發：使用通道（請參閱下方的 [本機開發](#local-development-tunneling)）

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot → **頻道** 中
2. 點擊 **Microsoft Teams** → 設定 → 儲存
3. 接受服務條款

### 步驟 5：建置 Teams 應用程式資訊清單

- 包含一個帶有 `botId = <App ID>` 的 `bot` 項目。
- 範圍：`personal`、`team`、`groupChat`。
- `supportsFiles: true` (個人範圍檔案處理所需)。
- 新增 RSC 權限（請參閱 [RSC 權限](#current-teams-rsc-permissions-manifest)）。
- 建立圖示：`outline.png` (32x32) 和 `color.png` (192x192)。
- 將這三個檔案壓縮在一起：`manifest.json`、`outline.png`、`color.png`。

### 步驟 6：設定 OpenClaw

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

環境變數：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

### 步驟 7：執行閘道

當外掛程式可用且存在含有憑證的 `msteams` 設定時，Teams 頻道會自動啟動。

</details>

## 聯合驗證 (憑證加上受控識別)

> 新增於 2026.4.11

對於生產環境部署，OpenClaw 支援 **聯合驗證**，作為用戶端密碼更安全的替代方案。提供兩種方法：

### 選項 A：基於憑證的驗證

使用已在您的 Entra ID 應用程式註冊中註冊的 PEM 憑證。

**設定：**

1. 產生或取得憑證 (PEM 格式，包含私密金鑰)。
2. 在 Entra ID → 應用程式註冊 → **憑證與祕密** → **憑證** → 上傳公開憑證。

**設定檔：**

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

使用 Azure 受控識別進行無密碼驗證。這非常適合部署在 Azure 基礎設施（AKS、App Service、Azure VM）上且有受控識別可用的環境。

**運作方式：**

1. Bot pod/VM 具有受控識別（系統指派或使用者指派）。
2. **聯合身分識別憑證**會將受控識別連結至 Entra ID 應用程式註冊。
3. 在執行時期，OpenClaw 使用 `@azure/identity` 從 Azure IMDS 端點（`169.254.169.254`）取得權杖。
4. 權杖會傳遞給 Teams SDK 以進行 Bot 驗證。

**必要條件：**

- 已啟用受控識別的 Azure 基礎設施（AKS workload identity、App Service、VM）
- 已在 Entra ID 應用程式註冊上建立聯合身分識別憑證
- 從 pod/VM 存取 IMDS（`169.254.169.254:80`）的網路存取權

**設定（系統指派的受控識別）：**

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

**設定（使用者指派的受控識別）：**

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` （僅適用於使用者指派）

### AKS Workload Identity 設定

對於使用 workload identity 的 AKS 部署：

1. 在您的 AKS 叢集上**啟用 workload identity**。
2. 在 Entra ID 應用程式註冊上**建立聯合身分識別憑證**：

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. 使用應用程式用戶端 ID **為 Kubernetes 服務帳戶加註**：

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. **為 Pod 加上標籤**以進行 workload identity 插入：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **確保網路存取權**可存取 IMDS（`169.254.169.254`）—— 如果使用 NetworkPolicy，請新增一個允許流量通往連接埠 80 上的 `169.254.169.254/32` 的 Egress 規則。

### 驗證類型比較

| 方法           | 設定                                           | 優點                 | 缺點                     |
| -------------- | ---------------------------------------------- | -------------------- | ------------------------ |
| **用戶端密碼** | `appPassword`                                  | 設定簡單             | 需要輪替密碼，安全性較低 |
| **憑證**       | `authType: "federated"` + `certificatePath`    | 網路上沒有共用的密碼 | 憑證管理負擔             |
| **受控識別**   | `authType: "federated"` + `useManagedIdentity` | 無密碼，無需管理密碼 | 需要 Azure 基礎設施      |

**預設行為：** 當未設定 `authType` 時，OpenClaw 預設為用戶端密碼驗證。現有設定可繼續運作而無需變更。

## 本機開發 (通道傳輸)

Teams 無法連接到 `localhost`。請使用永續的開發隧道，讓您的 URL 在不同工作階段中保持不變：

```bash
# One-time setup:
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
```

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（URL 可能會在每個工作階段變更）。

如果您的隧道 URL 變更，請更新端點：

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## 測試 Bot

**執行診斷：**

```bash
teams app doctor <teamsAppId>
```

一次性檢查 Bot 註冊、AAD 應用程式、資訊清單和 SSO 設定。

**傳送測試訊息：**

1. 安裝 Teams 應用程式（使用 `teams app get <id> --install-link` 中的安裝連結）
2. 在 Teams 中尋找 Bot 並傳送私人訊息
3. 檢查閘道日誌中的傳入活動

## 環境變數

所有設定金鑰都可以透過環境變數來設定：

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE`（選用：`"secret"` 或 `"federated"`）
- `MSTEAMS_CERTIFICATE_PATH`（聯合 + 憑證）
- `MSTEAMS_CERTIFICATE_THUMBPRINT`（選用，驗證不需要）
- `MSTEAMS_USE_MANAGED_IDENTITY`（聯合 + 受控識別）
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（僅限使用者指派的受控識別）

## 成員資訊動作

OpenClaw 為 Microsoft Teams 公開了由 Graph 支援的 `member-info` 動作，讓代理程式和自動化可以直接從 Microsoft Graph 解析頻道成員詳細資料（顯示名稱、電子郵件、角色）。

需求：

- `Member.Read.Group` RSC 權限（已在推薦的資訊清單中）
- 對於跨團隊查詢：具備管理員同意的 `User.Read.All` Graph 應用程式權限

此動作由 `channels.msteams.actions.memberInfo` 控管（預設：當有 Graph 憑證時啟用）。

## 歷程記錄內容

- `channels.msteams.historyLimit` 控制有多少最近的頻道/群組訊息會被包裝到提示中。
- 會回退到 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設為 50）。
- 擷取的執行緒歷程記錄會依據傳送者允許清單（`allowFrom` / `groupAllowFrom`）進行篩選，因此執行緒內容植入僅包含來自允許傳送者的訊息。
- 引用附件上下文（源自 Teams 回覆 HTML 的 `ReplyTo*`）目前按接收到的原樣傳遞。
- 換句話說，允許清單控制誰可以觸發代理；目前僅過濾特定的補充上下文路徑。
- 可以使用 `channels.msteams.dmHistoryLimit`（用戶輪次）限制 DM 歷史記錄。每個用戶的覆寫：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限

這些是我們 Teams 應用程式清單中**現有的 resourceSpecific 權限**。它們僅適用於安裝該應用程式的團隊/聊天內。

**對於頻道（團隊範圍）：**

- `ChannelMessage.Read.Group` (Application) - 接收所有頻道訊息而無需 @提及
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**對於群組聊天：**

- `ChatMessage.Read.Chat` (Application) - 接收所有群組聊天訊息而無需 @提及

若要透過 Teams CLI 新增 RSC 權限：

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

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

### 清單注意事項（必備欄位）

- `bots[].botId` **必須**與 Azure Bot 應用程式 ID 相符。
- `webApplicationInfo.id` **必須**與 Azure Bot 應用程式 ID 相符。
- `bots[].scopes` 必須包含您計畫使用的介面（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 是個人範圍內檔案處理所必需的。
- 如果您希望處理頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送權限。

### 更新現有應用程式

若要更新已安裝的 Teams 應用程式（例如，新增 RSC 權限）：

```bash
# Download, edit, and re-upload the manifest
teams app manifest download <teamsAppId> manifest.json
# Edit manifest.json locally...
teams app manifest upload manifest.json <teamsAppId>
# Version is auto-bumped if content changed
```

更新後，請在每個團隊中重新安裝應用程式以使新權限生效，並**完全退出並重新啟動 Teams**（不只是關閉視窗）以清除快取的應用程式中繼資料。

<details>
<summary>手動更新清單（不使用 CLI）</summary>

1. 使用新設定更新您的 `manifest.json`
2. **遞增 `version` 欄位**（例如，`1.0.0` → `1.1.0`）
3. **重新壓縮** 包含圖示的資訊清單（`manifest.json`、`outline.png`、`color.png`）
4. 上傳新的 zip 檔案：
   - **Teams 系統管理中心：** Teams 應用程式 → 管理應用程式 → 尋找您的應用程式 → 上傳新版本
   - **側載：** 在 Teams 中 → 應用程式 → 管理您的應用程式 → 上傳自訂應用程式

</details>

## 功能：僅 RSC 與 Graph 之比較

### 使用 **僅 Teams RSC**（已安裝應用程式，無 Graph API 權限）

可行項目：

- 讀取頻道訊息 **文字** 內容。
- 傳送頻道訊息 **文字** 內容。
- 接收 **個人 (DM)** 檔案附件。

無法執行：

- 頻道/群組 **圖片或檔案內容**（承載僅包含 HTML 存根）。
- 下載儲存在 SharePoint/OneDrive 中的附件。
- 讀取訊息歷史記錄（超出即時 webhook 事件的部分）。

### 使用 **Teams RSC + Microsoft Graph 應用程式權限**

新增功能：

- 下載託管的內容（貼上訊息中的圖片）。
- 下載儲存在 SharePoint/OneDrive 中的檔案附件。
- 透過 Graph 讀取頻道/聊天訊息歷史記錄。

### RSC 與 Graph API 比較

| 功能           | RSC 權限           | Graph API                 |
| -------------- | ------------------ | ------------------------- |
| **即時訊息**   | 是（透過 webhook） | 否（僅限輪詢）            |
| **歷史訊息**   | 否                 | 是（可查詢歷史記錄）      |
| **設定複雜度** | 僅應用程式資訊清單 | 需要管理員同意 + 權杖流程 |
| **可離線運作** | 否（必須執行中）   | 是（隨時可查詢）          |

**總結：** RSC 用於即時監聽；Graph API 用於歷史存取。若要在離線時追上錯過的訊息，您需要具備 `ChannelMessage.Read.All` 的 Graph API（需要管理員同意）。

## 已啟用 Graph 的媒體與歷史記錄（頻道所需）

如果您需要 **頻道** 中的圖片/檔案，或想要擷取 **訊息歷史記錄**，您必須啟用 Microsoft Graph 權限並授與管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊** 中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All`（頻道附件 + 歷史記錄）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群組聊天）
2. **授與租戶的管理員同意**。
3. 提升 Teams 應用程式的 **資訊清單版本**，重新上傳，並在 Teams 中 **重新安裝應用程式**。
4. **完全退出並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**提及使用者的額外權限：** 對於對話中的使用者，使用者 @提及功能可立即使用。然而，若您想要動態搜尋並提及**不在目前對話中**的使用者，請新增 `User.Read.All` (應用程式) 權限並授予管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長（例如：LLM 回應緩慢），您可能會看到：

- 閘道逾時
- Teams 重試傳送訊息（導致重複）
- 回應遺失

OpenClaw 透過快速回應並主動發送回覆來處理此問題，但非常緩慢的回應仍可能導致問題。

### 格式設定

Teams Markdown 的限制比 Slack 或 Discord 更多：

- 基本格式運作正常：**粗體**、_斜體_、`code`、連結
- 複雜的 Markdown（表格、巢狀清單）可能無法正確呈現
- 針對投票和語意呈現的發送，支援 Adaptive Cards（見下文）

## 組態

主要設定（請參閱 `/gateway/configuration` 以了解共用頻道模式）：

- `channels.msteams.enabled`：啟用/停用頻道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.webhook.port`（預設 `3978`）
- `channels.msteams.webhook.path`（預設 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）
- `channels.msteams.allowFrom`：DM 允許清單（建議使用 AAD 物件 ID）。當有 Graph 存取權時，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：緊急開關，用來重新啟用可變更的 UPN/顯示名稱比對以及直接的團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`：傳出文字區塊大小。
- `channels.msteams.chunkMode`：`length`（預設）或 `newline` 以在長度區塊分割之前，於空白行（段落邊界）進行分割。
- `channels.msteams.mediaAllowHosts`：傳入附件主機的允許清單（預設為 Microsoft/Teams 網域）。
- `channels.msteams.mediaAuthAllowHosts`：允許在媒體重試時附加 Authorization 標頭的允許列表（預設為 Graph + Bot Framework 主機）。
- `channels.msteams.requireMention`：在頻道/群組中需要 @提及（預設為 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（請參閱 [回覆樣式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：每個團隊的覆寫。
- `channels.msteams.teams.<teamId>.requireMention`：每個團隊的覆寫。
- `channels.msteams.teams.<teamId>.tools`：當缺少頻道覆寫時使用的預設每個團隊工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：預設的每個團隊每個發送者工具原則覆寫（支援 `"*"` 萬用字元）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：每個頻道的覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：每個頻道的覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：每個頻道工具原則覆寫（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：每個頻道每個發送者工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 金鑰應使用明確的前綴：
  `channel:`、`id:`、`e164:`、`username:`、`name:`（舊版無前綴的金鑰仍然僅對應至 `id:`）。
- `channels.msteams.actions.memberInfo`：啟用或停用以 Graph 為基礎的成員資訊動作（預設：當有 Graph 憑證時啟用）。
- `channels.msteams.authType`：驗證類型 - `"secret"`（預設）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 憑證檔案的路徑（聯合 + 憑證驗證）。
- `channels.msteams.certificateThumbprint`：憑證指紋（選用，驗證不需要）。
- `channels.msteams.useManagedIdentity`：啟用受控識別驗證（聯合模式）。
- `channels.msteams.managedIdentityClientId`：使用者指派受控識別的用戶端 ID。
- `channels.msteams.sharePointSiteId`：用於群組聊天/頻道中檔案上傳的 SharePoint 網站 ID（請參閱[在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與會話

- Session 鍵遵循標準代理程式格式（請參閱 [/concepts/session](/zh-Hant/concepts/session)）：
  - 直接訊息共用主要 Session (`agent:<agentId>:<mainKey>`)。
  - 頻道/群組訊息使用對話 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆樣式：串列與貼文

Teams 最近在相同的基礎資料模型上推出了兩種頻道 UI 樣式：

| 樣式                 | 描述                               | 推薦 `replyStyle` |
| -------------------- | ---------------------------------- | ----------------- |
| **貼文**（經典）     | 訊息以卡片形式顯示，下方有串列回覆 | `thread` (預設)   |
| **串列**（類 Slack） | 訊息線性流動，更像 Slack           | `top-level`       |

**問題：** Teams API 不會公開頻道使用哪種 UI 樣式。如果您使用錯誤的 `replyStyle`：

- 在執行緒樣式頻道中使用 `thread` → 回覆會顯示得笨拙地巢狀化
- 在貼文樣式頻道中使用 `top-level` → 回覆會顯示為獨立的頂層貼文，而不是在執行緒中

**解決方案：** 根據頻道的設定方式，針對每個頻道設定 `replyStyle`：

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

### 解析優先順序

當 Bot 傳送回覆到頻道時，`replyStyle` 會從最特定的覆寫向下解析到預設值。第一個非 `undefined` 值優先：

1. **每個頻道** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **每個團隊** — `channels.msteams.teams.<teamId>.replyStyle`
3. **全域** — `channels.msteams.replyStyle`
4. **隱含預設值** — 源自 `requireMention`：
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

如果您在沒有明確 `replyStyle` 的情況下全域設定 `requireMention: false`，即使輸入是執行緒回覆，貼文樣式頻道中的提及仍會顯示為頂層貼文。請在全域、團隊或頻道層級固定 `replyStyle: "thread"` 以避免意外情況。

### 執行緒內容保留

當 `replyStyle: "thread"` 生效且機器人在頻道執行緒中被 @提及 時，OpenClaw 會將原始執行緒根重新附加到外寄對話參考 (`19:…@thread.tacv2;messageid=<root>`)，以便回覆落在同一個執行緒內。這適用於即時（輪次內）發送以及在 Bot Framework 輪次上下文過期後進行的主動發送（例如，長時間執行的代理程式、透過 `mcp__openclaw__message` 排隊的工具呼叫回覆）。

執行緒根取自對話參考上儲存的 `threadId`。早於 `threadId` 的較舊儲存參考會回退到 `activityId`（最後植入該對話的任何傳入活動），因此現有部署無需重新植入即可繼續運作。

當 `replyStyle: "top-level"` 生效時，來自頻道執行緒的傳入訊息會刻意以新的頂層貼文回覆 — 不會附加執行緒後綴。這是「執行緒」風格頻道的正確行為；如果您在預期執行緒回覆的地方看到頂層貼文，則表示該頻道的 `replyStyle` 設定錯誤。

## 附件與圖片

**目前限制：**

- **DM：** 圖片和檔案附件可透過 Teams 機器人檔案 API 運作。
- **頻道/群組：** 附件存在於 M365 儲存空間 (SharePoint/OneDrive) 中。Webhook 承載僅包含 HTML 存根，而非實際檔案位元組。**下載頻道附件需要 Graph API 權限**。
- 若要進行明確的「優先發送檔案」，請將 `action=upload-file` 與 `media` / `filePath` / `path` 搭配使用；選用的 `message` 將成為隨附的文字/留言，而 `filename` 則會覆寫上傳的名稱。

若沒有 Graph 權限，包含圖片的頻道訊息將只會收到純文字（機器人無法存取圖片內容）。
根據預設，OpenClaw 只會從 Microsoft/Teams 主機名稱下載媒體。可以使用 `channels.msteams.mediaAllowHosts` 覆寫（使用 `["*"]` 以允許任何主機）。
授權標頭僅會附加到 `channels.msteams.mediaAuthAllowHosts` 中的主機（預設為 Graph + Bot Framework 主機）。請嚴格維護此列表（避免多租戶後綴）。

## 在群組聊天中傳送檔案

機器人可以使用 FileConsentCard 流程（內建）在私人訊息 (DM) 中傳送檔案。但是，**在群組聊天/頻道中傳送檔案**需要額外設定：

| 內容                | 檔案傳送方式                              | 所需設定                             |
| ------------------- | ----------------------------------------- | ------------------------------------ |
| **私人訊息 (DM)**   | FileConsentCard → 使用者接受 → 機器人上傳 | 開箱即用                             |
| **群組聊天/頻道**   | 上傳至 SharePoint → 分享連結              | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片 (任何內容)** | Base64 編碼內嵌                           | 開箱即用                             |

### 為什麼群組聊天需要 SharePoint

機器人沒有個人的 OneDrive 磁碟機（`/me/drive` Graph API 端點不適用於應用程式身分識別）。若要在群組聊天/頻道中傳送檔案，機器人會將檔案上傳到 **SharePoint 網站** 並建立分享連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中**新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (Application) - 將檔案上傳到 SharePoint
   - `Chat.Read.All` (Application) - 選用，啟用每位使用者的分享連結

2. **授予租用戶管理員同意**。

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

| 權限                                    | 分享行為                              |
| --------------------------------------- | ------------------------------------- |
| 僅限 `Sites.ReadWrite.All`              | 全組織分享連結 (組織內任何人皆可存取) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 個別使用者分享連結 (僅聊天成員可存取) |

每位使用者的分享更安全，因為只有聊天參與者可以存取檔案。如果缺少 `Chat.Read.All` 權限，機器人會改用全組織分享。

### 回退行為

| 情況                                        | 結果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，傳送分享連結                  |
| 群組聊天 + 檔案 + 沒有 `sharePointSiteId`   | 嘗試 OneDrive 上傳（可能會失敗），僅發送文字     |
| 個人聊天 + 檔案                             | FileConsentCard 流程（無需 SharePoint 即可運作） |
| 任何情境 + 圖片                             | Base64 編碼內嵌（無需 SharePoint 即可運作）      |

### 檔案儲存位置

上傳的檔案會儲存在已設定 SharePoint 網站之預設文件庫中的 `/OpenClawShared/` 資料夾內。

## 投票（Adaptive Cards）

OpenClaw 會將 Teams 投票以 Adaptive Cards 形式發送（沒有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票會由閘道記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道必須保持上線才能記錄投票。
- 投票尚不會自動張貼結果摘要（如有需要，請檢查 store 檔案）。

## 簡報卡片

使用 `message` 工具、CLI 或正常回覆傳遞，將語意呈現載荷傳送給 Teams 使用者或對話。OpenClaw 會根據通用呈現合約將其轉譯為 Teams Adaptive Cards。

`presentation` 參數接受語意區塊。當提供 `presentation` 時，訊息文字是可選的。按鈕會轉譯為 Adaptive Card 提交或 URL 動作。選單在 Teams 轉譯器中尚不支援，因此 OpenClaw 會在傳遞前將其降級為可讀文字。

**Agent 工具：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello!" }],
  },
}
```

**CLI：**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello!"}]}'
```

如需目標格式的詳細資訊，請參閱下方的 [目標格式](#target-formats)。

## 目標格式

MSTeams 目標使用前綴來區分使用者和對話：

| 目標類型          | 格式                             | 範例                                             |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| 使用者（依 ID）   | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`      |
| 使用者（依名稱）  | `user:<display-name>`            | `user:John Smith` (需要 Graph API)               |
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

# Send a presentation card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello"}]}'
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
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello" }],
  },
}
```

<Note>如果沒有 `user:` 前綴，名稱預設為解析為群組或團隊。當以顯示名稱指定人員時，請務必使用 `user:`。</Note>

## 主動訊息

- 只有在使用者互動**之後**才能傳送主動訊息，因為我們會在那個時候儲存對話參照。
- 請參閱 `/gateway/configuration` 以取得 `dmPolicy` 和允許清單閘道的資訊。

## 團隊與頻道 ID（常見陷阱）

Teams URL 中的 `groupId` 查詢參數**並非**組態中所使用的團隊 ID。請改為從 URL 路徑中擷取 ID：

**團隊 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**頻道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**用於設定：**

- 團隊金鑰 = `/team/` 之後的路徑區段 (經 URL 解碼，例如 `19:Bk4j...@thread.tacv2`；舊版租用戶可能會顯示 `@thread.skype`，這也是有效的)
- 頻道金鑰 = `/channel/` 之後的路徑區段 (經 URL 解碼)
- 針對 OpenClaw 路由，請**忽略** `groupId` 查詢參數。它是 Microsoft Entra 群組 ID，而非傳入 Teams 活動中使用的 Bot Framework 交談 ID。

## 私人頻道

Bot 在私人頻道中的支援有限：

| 功能               | 標準頻道 | 私人頻道         |
| ------------------ | -------- | ---------------- |
| Bot 安裝           | 是       | 有限             |
| 即時訊息 (webhook) | 是       | 可能無法運作     |
| RSC 權限           | 是       | 行為可能不同     |
| @提及              | 是       | 如果可存取 Bot   |
| Graph API 歷程記錄 | 是       | 是（需具備權限） |

**如果私人頻道無法運作的解決方法：**

1. 使用標準頻道進行 Bot 互動
2. 使用 DM - 使用者隨時可以直接傳訊息給 Bot
3. 使用 Graph API 進行歷程存取 (需要 `ChannelMessage.Read.All`)

## 疑難排解

### 常見問題

- **頻道中未顯示圖片：** 缺少 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全結束/重新開啟 Teams。
- **頻道中無回應：** 預設需要提及；請設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行組態。
- **版本不相符 (Teams 仍顯示舊的資訊清單)：** 移除並重新新增應用程式，並完全結束 Teams 以重新整理。
- **來自 webhook 的 401 未授權：** 在沒有 Azure JWT 的情況下手動測試時會出現此情況——這表示端點可連線但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **「Icon file cannot be empty」：** Manifest 參照的圖示檔案大小為 0 位元組。請建立有效的 PNG 圖示 (`outline.png` 為 32x32，`color.png` 為 192x192)。
- **「webApplicationInfo.Id 已在使用中」：** 應用程式仍安裝在另一個團隊/聊天中。請先尋找並將其解除安裝，或等待 5-10 分鐘以進行傳播。
- **上傳時顯示「Something went wrong」：** 請改透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發者工具 (F12) → Network 索引標籤，並檢查回應主體以取得實際錯誤。
- **側載失敗：** 請嘗試改用「上傳應用程式至您組織的應用程式目錄」，而非「上傳自訂應用程式」——這通常能避開側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否與您 Bot 的 App ID 完全相符
2. 重新上傳應用程式，並在團隊/聊天中重新安裝
3. 檢查您的組織管理員是否封鎖了 RSC 權限
4. 確認您使用的是正確的範圍：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [建立 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams 開發人員入口網站](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams 應用程式 Manifest 結構描述](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收頻道訊息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 權限參考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams Bot 檔案處理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [主動傳訊](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用於 Bot 管理的 Teams CLI

## 相關

- [頻道總覽](/zh-Hant/channels) - 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) - DM 驗證和配對流程
- [群組](/zh-Hant/channels/groups) - 群組聊天行為和提及控制
- [通道路由](/zh-Hant/channels/channel-routing) - 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) - 存取模型和強化防護
