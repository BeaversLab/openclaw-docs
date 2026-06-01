---
summary: "Microsoft Teams Bot 支援狀態、功能和設定"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

狀態：支援文字 + DM 附件；頻道/群組檔案傳送需要 `sharePointSiteId` + Graph 權限（請參閱 [在群組聊天中傳送檔案](#sending-files-in-group-chats)）。投票是透過 Adaptive Cards 傳送的。訊息操作會針對檔案優先傳送公開明確的 `upload-file`。

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

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 會在單一指令中處理 Bot 註冊、資訊清單建立和認證產生。

**1. 安裝並登入**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>Teams CLI 目前為預覽版。指令和旗標可能會在版本之間變更。</Note>

**2. 啟動通道** （Teams 無法連接 localhost）

如果您尚未安裝並驗證 devtunnel CLI，請先安裝（[入門指南](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>需要 `--allow-anonymous`，因為 Teams 無法向 devtunnels 進行驗證。每個傳入的 Bot 要求仍會由 Teams SDK 自動驗證。</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（但這些在每個工作階段可能會變更 URL）。

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

輸出將會顯示 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID`，以及 **Teams App ID** - 請記下這些資訊以進行後續步驟。它也會提供直接在 Teams 中安裝應用程式的選項。

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

或者直接使用環境變數：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

**5. 在 Teams 中安裝應用程式**

`teams app create` 會提示您安裝應用程式 - 請選取「Install in Teams」。如果您跳過此步驟，您可以稍後取得連結：

```bash
teams app get <teamsAppId> --install-link
```

**6. 驗證一切正常運作**

```bash
teams app doctor <teamsAppId>
```

這會對 Bot 註冊、AAD 應用程式設定、資訊清單有效性和 SSO 設定執行診斷。

對於生產環境部署，建議使用 [聯合驗證](/zh-Hant/channels/msteams#federated-authentication-certificate-plus-managed-identity) (憑證或受控識別) 來代替用戶端密碼。

<Note>群組聊天預設被封鎖 (`channels.msteams.groupPolicy: "allowlist"`)。若要允許群組回覆，請設定 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 來允許任何成員（提及閘道）。</Note>

## 目標

- 透過 Teams 私訊 (DM)、群組聊天或頻道與 OpenClaw 對話。
- 保持路由確定性：回覆一律傳回至訊息送達的頻道。
- 預設採用安全的頻道行為 (除非另有設定，否則需要提及)。

## 設定寫入

根據預設，允許 Microsoft Teams 寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 存取控制 (DM + 群組)

**DM 存取**

- 預設值：`channels.msteams.dmPolicy = "pairing"`。未知的發送者將被忽略，直到經過核准。
- `channels.msteams.allowFrom` 應使用穩定的 AAD 物件 ID 或靜態發送者存取群組，例如 `accessGroup:core-team`。
- 不要依賴 UPN/顯示名稱比對來建立允許清單 - 它們可能會變更。OpenClaw 預設會停用直接名稱比對；請使用 `channels.msteams.dangerouslyAllowNameMatching: true` 明確選擇加入。
- 當認證允許時，精靈可以透過 Microsoft Graph 將名稱解析為 ID。

**群組存取**

- 預設值：`channels.msteams.groupPolicy = "allowlist"`（除非您新增 `groupAllowFrom`，否則為封鎖狀態）。若未設定，請使用 `channels.defaults.groupPolicy` 來覆寫預設值。
- `channels.msteams.groupAllowFrom` 控制哪些發送者或靜態發送者存取群組可以在群組聊天/頻道中觸發（會回退至 `channels.msteams.allowFrom`）。
- 設定 `groupPolicy: "open"` 以允許任何成員（預設仍受提及限制）。
- 若要不允許任何**頻道**，請設定 `channels.msteams.groupPolicy: "disabled"`。

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

- 透過在 `channels.msteams.teams` 下列出團隊和頻道，來範圍化群組/頻道回覆。
- 金鑰應使用 Teams 連結中穩定的 Teams 對話 ID，而非可變更的顯示名稱。
- 當設定 `groupPolicy="allowlist"` 且存在團隊允許清單時，僅接受列出的團隊/頻道（受提及限制）。
- 設定精靈接受 `Team/Channel` 項目並為您儲存它們。
- 啟動時，OpenClaw 會將團隊/頻道和使用者允許清單名稱解析為 ID（當 Graph 權限允許時）
  並記錄對應關係；未解析的團隊/頻道名稱將保留為輸入的樣子，但預設會在路由時被忽略，除非啟用了 `channels.msteams.dangerouslyAllowNameMatching: true`。

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
6. 閘道預設會在 `/api/messages` 上監聽 Bot Framework webhook 流量。

### 步驟 1：建立 Azure Bot

1. 前往 [建立 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填寫 **基本** 分頁：

   | 欄位             | 值                                                      |
   | ---------------- | ------------------------------------------------------- |
   | **Bot 代碼**     | 您的機器人名稱，例如 `openclaw-msteams`（必須是唯一的） |
   | **訂閱**         | 選取您的 Azure 訂閱                                     |
   | **資源群組**     | 建立新的或使用現有的                                    |
   | **定價層**       | 開發/測試使用 **免費**                                  |
   | **應用程式類型** | **單一租用戶**（建議 - 請參閱下方的備註）               |
   | **建立類型**     | **建立新的 Microsoft App ID**                           |

<Warning>建立新的多租用戶 Bot 已於 2025-07-31 起淘汰。新 Bot 請使用 **單一租用戶**。</Warning>

3. 按一下 **檢閱 + 建立** → **建立**（等候約 1-2 分鐘）

### 步驟 2：取得認證

1. 前往您的 Azure Bot 資源 → **設定**
2. 複製 **Microsoft App ID** → 這就是您的 `appId`
3. 按一下 **管理密碼** → 前往應用程式註冊
4. 在 **憑證與祕密** 下 → **新增用戶端祕密** → 複製 **值** → 這就是您的 `appPassword`
5. 前往 **概觀** → 複製 **目錄 (租用戶) ID** → 這就是您的 `tenantId`

### 步驟 3：設定傳訊端點

1. 在 Azure Bot → **設定** 中
2. 將 **傳訊端點** 設定為您的 webhook URL：
   - 生產環境：`https://your-domain.com/api/messages`
   - 本機開發：使用通道（請參閱下方的[本機開發](#local-development-tunneling)）

### 步驟 4：啟用 Teams 頻道

1. 在 Azure Bot → **頻道** 中
2. 點擊 **Microsoft Teams** → 設定 → 儲存
3. 接受服務條款

### 步驟 5：建置 Teams 應用程式資訊清單

- 包含一個帶有 `botId = <App ID>` 的 `bot` 條目。
- 範圍：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（個人範圍檔案處理所需）。
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

當外掛程式可用且存在具有憑證的 `msteams` 設定時，Teams 頻道會自動啟動。

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
3. 在執行時，OpenClaw 使用 `@azure/identity` 從 Azure IMDS 端點 (`169.254.169.254`) 取得權杖。
4. 權杖會傳遞給 Teams SDK 以進行 Bot 驗證。

**必要條件：**

- 已啟用受控識別的 Azure 基礎設施（AKS workload identity、App Service、VM）
- 已在 Entra ID 應用程式註冊上建立聯合身分識別憑證
- 從 Pod/VM 對 IMDS (`169.254.169.254:80`) 的網路存取

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（僅適用於使用者指派的）

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

5. **確保網路存取** IMDS (`169.254.169.254`) - 如果使用 NetworkPolicy，請新增一個允許通往 `169.254.169.254/32` 連接埠 80 流量的 Egress 規則。

### 驗證類型比較

| 方法           | 設定                                           | 優點                 | 缺點                     |
| -------------- | ---------------------------------------------- | -------------------- | ------------------------ |
| **用戶端密碼** | `appPassword`                                  | 設定簡單             | 需要輪替密碼，安全性較低 |
| **憑證**       | `authType: "federated"` + `certificatePath`    | 網路上沒有共用的密碼 | 憑證管理負擔             |
| **受控識別**   | `authType: "federated"` + `useManagedIdentity` | 無密碼，無需管理密碼 | 需要 Azure 基礎設施      |

**預設行為：** 當未設定 `authType` 時，OpenClaw 預設為用戶端金鑰驗證。現有設定繼續無需變更即可運作。

## 本機開發 (通道傳輸)

Teams 無法連線到 `localhost`。請使用永續的開發通道，讓您的 URL 在各工作階段之間保持相同：

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

1. 安裝 Teams 應用程式（使用來自 `teams app get <id> --install-link` 的安裝連結）
2. 在 Teams 中尋找 Bot 並傳送私人訊息
3. 檢查閘道日誌中的傳入活動

## 環境變數

所有設定金鑰都可以透過環境變數來設定：

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE`（選用：`"secret"` 或 `"federated"`）
- `MSTEAMS_CERTIFICATE_PATH`（聯合 + 憑證）
- `MSTEAMS_CERTIFICATE_THUMBPRINT`（選用，驗證時不需要）
- `MSTEAMS_USE_MANAGED_IDENTITY`（聯合 + 受控識別）
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（僅限使用者指派的 MI）

## 成員資訊動作

OpenClaw 針對 Microsoft Teams 提供了由 Graph 支援的 `member-info` 動作，讓代理程式和自動化功能可以直接從 Microsoft Graph 解析頻道成員詳細資料（顯示名稱、電子郵件、角色）。

需求：

- `Member.Read.Group` RSC 權限（已包含在建議的資訊清單中）
- 用於跨團隊查詢：具有管理員同意的 `User.Read.All` Graph 應用程式權限

此動作由 `channels.msteams.actions.memberInfo` 控制（預設：當提供 Graph 憑證時啟用）。

## 歷程記錄內容

- `channels.msteams.historyLimit` 控制有多少最近的頻道/群組訊息會被納入提示詞中。
- 會回退至 `messages.groupChat.historyLimit`。將 `0` 設定為停用（預設為 50）。
- 擷取的執行緒歷史記錄會依據傳送者允許清單（`allowFrom` / `groupAllowFrom`）進行篩選，因此執行緒內容植入僅包含來自允許傳送者的訊息。
- 引用的附件內容（從 Teams 回覆 HTML 衍生的 `ReplyTo*`）目前會按接收到的原樣傳遞。
- 換句話說，允許清單控制誰可以觸發代理；目前僅過濾特定的補充上下文路徑。
- DM 歷史記錄可以透過 `channels.msteams.dmHistoryLimit`（使用者輪次）進行限制。每位使用者的覆寫設定：`channels.msteams.dms["<user_id>"].historyLimit`。

## 目前的 Teams RSC 權限

這些是我們 Teams 應用程式清單中**現有的 resourceSpecific 權限**。它們僅適用於安裝該應用程式的團隊/聊天內。

**對於頻道（團隊範圍）：**

- `ChannelMessage.Read.Group` (應用程式) - 接收所有頻道訊息而不需 @提及
- `ChannelMessage.Send.Group` (應用程式)
- `Member.Read.Group` (應用程式)
- `Owner.Read.Group` (應用程式)
- `ChannelSettings.Read.Group` (應用程式)
- `TeamMember.Read.Group` (應用程式)
- `TeamSettings.Read.Group` (應用程式)

**對於群組聊天：**

- `ChatMessage.Read.Chat` (應用程式) - 接收所有群組聊天訊息而不需 @提及

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

- `bots[].botId` **必須**符合 Azure Bot 應用程式 ID。
- `webApplicationInfo.id` **必須**符合 Azure Bot 應用程式 ID。
- `bots[].scopes` 必須包含您計畫使用的介面 (`personal`、`team`、`groupChat`)。
- `bots[].supportsFiles: true` 是個人範圍中檔案處理所需。
- 如果您需要頻道流量，`authorization.permissions.resourceSpecific` 必須包含頻道讀取/傳送權限。

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
2. **增加 `version` 欄位的版本號** (例如 `1.0.0` → `1.1.0`)
3. **將資訊清單與圖示重新壓縮** (`manifest.json`、`outline.png`、`color.png`)
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

**總結：** RSC 用於即時監聽；Graph API 用於歷史存取。若要在離線時追蹤錯過的訊息，您需要具備 `ChannelMessage.Read.All` 的 Graph API (需要管理員同意)。

## 已啟用 Graph 的媒體與歷史記錄（頻道所需）

如果您需要 **頻道** 中的圖片/檔案，或想要擷取 **訊息歷史記錄**，您必須啟用 Microsoft Graph 權限並授與管理員同意。

1. 在 Entra ID (Azure AD) **應用程式註冊** 中，新增 Microsoft Graph **應用程式權限**：
   - `ChannelMessage.Read.All` (頻道附件 + 歷史記錄)
   - `Chat.Read.All` 或 `ChatMessage.Read.All` (群組聊天)
2. **授與租戶的管理員同意**。
3. 提升 Teams 應用程式的 **資訊清單版本**，重新上傳，並在 Teams 中 **重新安裝應用程式**。
4. **完全退出並重新啟動 Teams** 以清除快取的應用程式中繼資料。

**提及使用者的其他權限：** 對於交談中的使用者，使用者 @提及可立即運作。然而，如果您想要動態搜尋並提及 **不在目前交談中** 的使用者，請新增 `User.Read.All` (應用程式) 權限並授與管理員同意。

## 已知限制

### Webhook 逾時

Teams 透過 HTTP webhook 傳遞訊息。如果處理時間過長（例如：LLM 回應緩慢），您可能會看到：

- 閘道逾時
- Teams 重試傳送訊息（導致重複）
- 回應遺失

OpenClaw 透過快速回應並主動發送回覆來處理此問題，但非常緩慢的回應仍可能導致問題。

### Teams 雲端和服務 URL 支援

此 SDK 支援的 Teams 路徑已針對 Microsoft Teams 公有雲進行即時驗證。

傳入回覆使用傳入的 Teams SDK 週期內容。非內容的主動操作 - 傳送、編輯、刪除、卡片、投票、檔案同意訊息和佇列的長時間執行回覆 - 使用儲存的交談參照 `serviceUrl`。公有雲預設為 Teams SDK 公有雲環境，並允許在公有 Teams Connector 主機上儲存參照：`https://smba.trafficmanager.net/`。

公有雲為預設值。對於正常的公有雲機器人，您不需要設定 `channels.msteams.cloud` 或 `channels.msteams.serviceUrl`。

對於非公開的 Teams 雲端，請設定 `cloud` 以及 Microsoft 發佈時對應的主動通訊邊界：

- `channels.msteams.cloud` 選擇 Teams SDK 的雲端預設，用於驗證、JWT 驗證、權杖服務和 Graph 範圍。
- `channels.msteams.serviceUrl` 選擇 Bot Connector 端點邊界，用於在主動發送、編輯、刪除、卡片、投票、檔案同意訊息和排入佇列的長時間執行回覆之前驗證已儲存的交談參考。對於 USGov 和 DoD SDK 雲端，這是必需的。對於中國/21Vianet，OpenClaw 使用 SDK `China` 預設，並且僅接受來自 Azure China Bot Framework 頻道主機的已儲存/已設定服務 URL。

Microsoft 在 Teams 主動傳訊文件中的 [建立交談] (https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages?tabs=dotnet#create-the-conversation) 區段中發佈了全域主動 Bot Connector 端點。盡可能使用傳入活動的 `serviceUrl`；如果您需要全域主動端點，請使用 Microsoft 的表格。

| Teams 環境    | OpenClaw 設定                                      | 主動 `serviceUrl`                                  |
| ------------- | -------------------------------------------------- | -------------------------------------------------- |
| 公開          | 不需要雲端/serviceUrl 設定                         | `https://smba.trafficmanager.net/teams`            |
| GCC           | 設定 `serviceUrl`；不存在獨立的 Teams SDK 雲端預設 | `https://smba.infra.gcc.teams.microsoft.com/teams` |
| GCC High      | `cloud: "USGov"` + `serviceUrl`                    | `https://smba.infra.gov.teams.microsoft.us/teams`  |
| DoD           | `cloud: "USGovDoD"` + `serviceUrl`                 | `https://smba.infra.dod.teams.microsoft.us/teams`  |
| 中國/21Vianet | `cloud: "China"`                                   | 使用傳入活動的 `serviceUrl`                        |

GCC 的範例，其中 Microsoft 記錄了獨立的主動服務 URL，但 Teams SDK 並未公開獨立的 GCC 雲端預設：

```json
{
  "channels": {
    "msteams": {
      "serviceUrl": "https://smba.infra.gcc.teams.microsoft.com/teams"
    }
  }
}
```

GCC High 的範例：

```json
{
  "channels": {
    "msteams": {
      "cloud": "USGov",
      "serviceUrl": "https://smba.infra.gov.teams.microsoft.us/teams"
    }
  }
}
```

`channels.msteams.serviceUrl` 僅限於支援的 Microsoft Teams Bot Connector 主機。當設定了服務 URL 時，OpenClaw 會在主動傳送、編輯、刪除、卡片、投票或佇列中的長時間執行回覆執行前，檢查儲存的對話 `serviceUrl` 是否使用相同的主機。使用預設的公有雲設定時，如果儲存的對話指向公有 Teams Connector 主機之外，OpenClaw 將會以封閉式失敗處理。在變更雲端/服務 URL 設定後，請從該對話接收一則新訊息，以確保儲存的對話參照是最新的。

China/21Vianet 在 Microsoft 的 Teams 主動端點表中沒有獨立的全域主動 `smba` URL。請設定 `cloud: "China"`，讓 Teams SDK 使用 Azure China 的驗證、權杖和 JWT 端點。接著，主動傳送需要來自傳入 China Teams 活動的已儲存對話參照，或在 Azure China Bot Framework 通道邊界上明確設定的服務 URL (`*.botframework.azure.cn`)。在 OpenClaw 將 Graph 要求路由傳送至 Azure China Graph 端點之前，針對 `cloud: "China"`，目前會停用 Graph 支援的 Teams 協助程式。

### 格式設定

Teams markdown 比 Slack 或 Discord 更受限：

- 基本格式設定適用：**粗體**、_斜體_、`code`、連結
- 複雜的 markdown (表格、巢狀清單) 可能無法正確轉譯
- Adaptive Cards 支援用於投票和語意呈現傳送 (見下文)

## 設定

主要設定 (共用通道模式請參閱 `/gateway/configuration`)：

- `channels.msteams.enabled`：啟用/停用通道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：Bot 憑證。
- `channels.msteams.cloud`：Teams SDK 雲端環境（`Public`、`USGov`、`USGovDoD` 或 `China`；預設為 `Public`）。針對 USGov/DoD SDK 雲端，請使用 `serviceUrl` 設定；中國區使用 SDK 預設集並儲存 Azure中國 Bot Framework 對話參照，且在實作 Azure中國 Graph 路由前會停用 Graph 支援的輔助功能。
- `channels.msteams.serviceUrl`：SDK 主動作業的 Bot Connector 服務 URL 邊界。公有雲使用 SDK 預設值；請為 GCC (`https://smba.infra.gcc.teams.microsoft.com/teams`)、GCC High 或 DoD 設定此值。當儲存的對話參照來自 21Vianet 營運的 Teams 時，中國區接受 Azure中國 Bot Framework 頻道主機。
- `channels.msteams.webhook.port` (預設 `3978`)
- `channels.msteams.webhook.path` (預設 `/api/messages`)
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled` (預設：pairing)
- `channels.msteams.allowFrom`：DM 允許清單（建議使用 AAD 物件 ID）。當 Graph 存取可用時，精靈會在設定期間將名稱解析為 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：緊急開關，用來重新啟用可變動的 UPN/顯示名稱比對以及直接的團隊/頻道名稱路由。
- `channels.msteams.textChunkLimit`：輸出文字區塊大小。
- `channels.msteams.chunkMode`：`length` (預設) 或 `newline`，以便在長度區塊分割前依空行 (段落邊界) 分割。
- `channels.msteams.mediaAllowHosts`：輸入附件主機的允許清單 (預設為 Microsoft/Teams 網域)。
- `channels.msteams.mediaAuthAllowHosts`：允許在媒體重試時附加 Authorization 標頭的主機允許清單 (預設為 Graph + Bot Framework 主機)。
- `channels.msteams.requireMention`：在頻道/群組中要求 @提及 (預設為 true)。
- `channels.msteams.replyStyle`：`thread | top-level` (請參閱 [Reply Style](#reply-style-threads-vs-posts))。
- `channels.msteams.teams.<teamId>.replyStyle`：各團隊的覆寫設定。
- `channels.msteams.teams.<teamId>.requireMention`：各團隊的覆寫設定。
- `channels.msteams.teams.<teamId>.tools`：當缺少頻道覆寫時使用的預設小組工具原則覆寫 (`allow`/`deny`/`alsoAllow`)。
- `channels.msteams.teams.<teamId>.toolsBySender`：預設的小組級別每位傳送者工具原則覆寫（支援 `"*"` 萬用字元）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：個別頻道覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：個別頻道覆寫。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：個別頻道工具原則覆寫 (`allow`/`deny`/`alsoAllow`)。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：個別頻道的每位傳送者工具原則覆寫（支援 `"*"` 萬用字元）。
- `toolsBySender` 鍵應使用明確的前綴：
  `channel:`、`id:`、`e164:`、`username:`、`name:`（舊版無前綴鍵仍僅對應至 `id:`）。
- `channels.msteams.actions.memberInfo`：啟用或停用以 Graph 支援的成員資訊動作（預設值：當有 Graph 憑證時啟用）。
- `channels.msteams.authType`：驗證類型 - `"secret"`（預設值）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 憑證檔案的路徑（聯合 + 憑證驗證）。
- `channels.msteams.certificateThumbprint`：憑證指紋（選用，驗證時不需要）。
- `channels.msteams.useManagedIdentity`：啟用受控識別驗證（聯合模式）。
- `channels.msteams.managedIdentityClientId`：使用者指派受控識別的用戶端 ID。
- `channels.msteams.sharePointSiteId`：用於群組聊天/頻道中檔案上傳的 SharePoint 網站 ID（請參閱 [在群組聊天中傳送檔案](#sending-files-in-group-chats)）。

## 路由與會話

- 會話金鑰遵循標準代理程式格式（請參閱 [/concepts/session](/zh-Hant/concepts/session)）：
  - 直接訊息共用主會話 (`agent:<agentId>:<mainKey>`)。
  - 頻道/群組訊息使用對話 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回覆樣式：串還是貼文

Teams 最近在同一個基礎資料模型上推出了兩種頻道 UI 樣式：

| 樣式               | 描述                                 | 建議的 `replyStyle` |
| ------------------ | ------------------------------------ | ------------------- |
| **貼文**（經典）   | 訊息以卡片形式顯示，下方帶有串联回覆 | `thread`（預設）    |
| **串**（類 Slack） | 訊息線性流動，更像 Slack             | `top-level`         |

**問題：** Teams API 不會公開頻道使用的是哪種 UI 樣式。如果您使用了錯誤的 `replyStyle`：

- 在串樣式的頻道中使用 `thread` → 回覆會顯得尷尬地巢狀
- 在貼文樣式的頻道中使用 `top-level` → 回覆會顯示為獨立的頂層貼文，而不是在串內

**解決方案：** 根據頻道的設定方式，逐個頻道設定 `replyStyle`：

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

當機器人將回覆傳送到頻道時，`replyStyle` 會從最特定的覆寫往下解析到預設值。第一個非 `undefined` 的值優先：

1. **每個頻道** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **每個團隊** — `channels.msteams.teams.<teamId>.replyStyle`
3. **全域** — `channels.msteams.replyStyle`
4. **隱含預設** — 從 `requireMention` 推導：
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

如果您在沒有明確 `replyStyle` 的情況下全域設定 `requireMention: false`，即使在傳入訊息是串回覆時，貼文樣式頻道中的提及也會顯示為頂層貼文。請在全域、團隊或頻道層級固定 `replyStyle: "thread"` 以避免意外。

### 保留串脈絡

當 `replyStyle: "thread"` 生效且機器人在頻道執行緒中被 @提及 時，OpenClaw 會將原始執行緒根重新附加到傳出對話參考 (`19:…@thread.tacv2;messageid=<root>`)，以便回覆落入同一執行緒內。這適用於即時 (輪次內) 傳送以及在 Bot Framework 輪次上下文過期後進行的主動傳送（例如，長時間運行的代理程式、透過 `mcp__openclaw__message` 排隊的工具呼叫回覆）。

執行緒根取自對話參考上儲存的 `threadId`。早於 `threadId` 的舊儲存參考會回退到 `activityId`（無論是哪個傳入活動最後播種了該對話），因此現有部署無需重新播種即可繼續運作。

當 `replyStyle: "top-level"` 生效時，頻道執行緒傳入訊息會刻意以新的頂層貼文回覆——不會附加執行緒後綴。這是 Threads 樣式頻道的正確行為；如果您在預期有執行緒回覆的地方看到頂層貼文，表示您為該頻道設定的 `replyStyle` 不正確。

## 附件和圖片

**目前限制：**

- **DMs：** 圖片和檔案附件可透過 Teams 機器人檔案 API 運作。
- **頻道/群組：** 附件儲存在 M365 儲存空間 (SharePoint/OneDrive) 中。Webhook 承載僅包含 HTML 存根，而非實際檔案位元組。下載頻道附件**需要 Graph API 權限**。
- 若要進行明確的檔案優先傳送，請使用 `action=upload-file` 搭配 `media` / `filePath` / `path`；選用的 `message` 會成為隨附文字/註解，而 `filename` 則會覆寫上傳名稱。

如果沒有 Graph 權限，包含圖片的頻道訊息將只會以純文字形式接收（機器人無法存取圖片內容）。
預設情況下，OpenClaw 只會從 Microsoft/Teams 主機名稱下載媒體。可以使用 `channels.msteams.mediaAllowHosts` 覆蓋此設定（使用 `["*"]` 以允許任何主機）。
授權標頭僅會附加到 `channels.msteams.mediaAuthAllowHosts` 中的主機（預設為 Graph + Bot Framework 主機）。請嚴格控制此列表（避免多租戶後綴）。

## 在群組聊天中傳送檔案

機器人可以使用 FileConsentCard 流程（內建）在私訊（DM）中傳送檔案。然而，**在群組聊天/頻道中傳送檔案**需要額外的設定：

| 內容                 | 檔案傳送方式                              | 所需設定                             |
| -------------------- | ----------------------------------------- | ------------------------------------ |
| **私訊 (DMs)**       | FileConsentCard → 使用者接受 → 機器人上傳 | 開箱即用                             |
| **群組聊天/頻道**    | 上傳至 SharePoint → 分享連結              | 需要 `sharePointSiteId` + Graph 權限 |
| **圖片（任何情境）** | Base64 編碼內嵌                           | 開箱即用                             |

### 為何群組聊天需要 SharePoint

機器人沒有個人的 OneDrive 磁碟機（`/me/drive` Graph API 端點不適用於應用程式身分識別）。若要在群組聊天/頻道中傳送檔案，機器人會上傳至 **SharePoint 網站**並建立分享連結。

### 設定

1. 在 Entra ID (Azure AD) → 應用程式註冊中**新增 Graph API 權限**：
   - `Sites.ReadWrite.All` (應用程式) - 將檔案上傳至 SharePoint
   - `Chat.Read.All` (應用程式) - 選用，啟用每個使用者的分享連結

2. 為租用戶**授與管理員同意**。

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

| 權限                                    | 分享行為                                 |
| --------------------------------------- | ---------------------------------------- |
| 僅限 `Sites.ReadWrite.All`              | 全組織分享連結（組織內任何人皆可存取）   |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每位使用者的分享連結（僅聊天成員可存取） |

每位使用者的分享更為安全，因為只有聊天參與者可以存取該檔案。如果缺少 `Chat.Read.All` 權限，機器人會回退至全組織分享。

### 回退行為

| 情境                                        | 結果                                               |
| ------------------------------------------- | -------------------------------------------------- |
| 群組聊天 + 檔案 + 已設定 `sharePointSiteId` | 上傳至 SharePoint，傳送分享連結                    |
| 群組聊天 + 檔案 + 沒有 `sharePointSiteId`   | 嘗試上傳至 OneDrive（可能失敗），僅發送文字        |
| 個人聊天 + 檔案                             | FileConsentCard 流程（不需要 SharePoint 即可運作） |
| 任何情境 + 圖片                             | Base64 編碼內嵌（不需要 SharePoint 即可運作）      |

### 檔案儲存位置

上傳的檔案會儲存在已設定 SharePoint 網站預設文件庫的 `/OpenClawShared/` 資料夾中。

## 投票（Adaptive Cards）

OpenClaw 會將 Teams 投票以 Adaptive Cards 形式發送（沒有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票會由閘道記錄在 `~/.openclaw/msteams-polls.json` 中。
- 閘道必須保持上線才能記錄投票。
- 投票尚不會自動發布結果摘要（如需檢查，請查看儲存檔案）。

## 簡報卡片

使用 `message` 工具、CLI 或一般回覆傳送，將語意化簡報 Payload 發送給 Teams 使用者或對話。OpenClaw 會從通用簡報合約將其轉譯為 Teams Adaptive Cards。

`presentation` 參數接受語意區塊。當提供 `presentation` 時，訊息文字為選填。按鈕會轉譯為 Adaptive Card 提交或 URL 動作。選擇選單在 Teams 轉譯器中尚非原生支援，因此 OpenClaw 會在傳送前將其降級為可讀文字。

**代理程式工具：**

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

| 目標類型           | 格式                             | 範例                                            |
| ------------------ | -------------------------------- | ----------------------------------------------- |
| 使用者（透過 ID）  | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`     |
| 使用者（透過名稱） | `user:<display-name>`            | `user:John Smith`（需要 Graph API）             |
| 群組/頻道          | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`        |
| 群組/頻道（原始）  | `<conversation-id>`              | `19:abc123...@thread.tacv2`（若包含 `@thread`） |

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

**代理程式工具範例：**

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

<Note>如果沒有 `user:` 前綴，名稱預設會解析為群組或團隊。以顯示名稱為目標時，請務必使用 `user:`。</Note>

## 主動訊息

- 主動訊息僅在使用者互動**之後**才可能發生，因為我們會在該時間點儲存對話參考。
- 請參閱 `/gateway/configuration` 以取得 `dmPolicy` 和允許清單閘道資訊。

## 團隊和頻道 ID (常見陷阱)

Teams URL 中的 `groupId` 查詢參數**並非**設定中使用的團隊 ID。請改從 URL 路徑擷取 ID：

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

**適用於設定：**

- 團隊金鑰 = `/team/` 之後的路徑區段 (經過 URL 解碼，例如 `19:Bk4j...@thread.tacv2`；舊版租用戶可能會顯示 `@thread.skype`，這也是有效的)
- 頻道金鑰 = `/channel/` 之後的路徑區段 (經過 URL 解碼)
- 針對 OpenClaw 路由，請**忽略** `groupId` 查詢參數。它是 Microsoft Entra 群組 ID，而非傳入 Teams 活動中使用的 Bot Framework 對話 ID。

## 私人頻道

機器人在私人頻道中的支援有限：

| 功能               | 標準頻道 | 私人頻道         |
| ------------------ | -------- | ---------------- |
| 機器人安裝         | 是       | 有限             |
| 即時訊息 (webhook) | 是       | 可能無法運作     |
| RSC 權限           | 是       | 行為可能不同     |
| @mentions          | 是       | 如果可存取機器人 |
| Graph API 歷程記錄 | 是       | 是 (需具備權限)  |

**如果私人頻道無法運作的解決方法：**

1. 使用標準頻道進行機器人互動
2. 使用 DM - 使用者隨時可以直接傳訊息給機器人
3. 使用 Graph API 以取得歷史記錄存取權 (需要 `ChannelMessage.Read.All`)

## 疑難排解

### 常見問題

- **頻道中未顯示影像：** 缺少 Graph 權限或管理員同意。請重新安裝 Teams 應用程式，並完全退出/重新開啟 Teams。
- **頻道中無回應：** 預設需要提及；請設定 `channels.msteams.requireMention=false` 或針對每個團隊/頻道進行設定。
- **版本不符 (Teams 仍顯示舊資訊清單)：** 移除並重新新增應用程式，然後完全退出 Teams 以重新整理。
- **來自 Webhook 的 401 未授權：** 在沒有 Azure JWT 的情況下進行手動測試時會出現此情況 — 表示端點可達到但驗證失敗。請使用 Azure Web Chat 進行正確測試。

### 資訊清單上傳錯誤

- **「圖示檔案不能為空白」：** 資訊清單參照的圖示檔案為 0 位元組。請建立有效的 PNG 圖示 (`outline.png` 為 32x32，`color.png` 為 192x192)。
- **"webApplicationInfo.Id already in use":** 應用程式仍安裝在另一個團隊/聊天中。請先尋找並將其解除安裝，或等待 5-10 分鐘以供傳播。
- **「上傳時發生錯誤」：** 請改透過 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上傳，開啟瀏覽器開發者工具 (F12) → Network 分頁，並檢查回應主體以取得實際錯誤。
- **側載失敗：** 請嘗試使用「Upload an app to your org's app catalog」而非「Upload a custom app」——這通常能繞過側載限制。

### RSC 權限無法運作

1. 驗證 `webApplicationInfo.id` 是否完全符合您機器人的應用程式 ID
2. 重新上傳應用程式並在團隊/聊天中重新安裝
3. 檢查您的組織管理員是否已封鎖 RSC 權限
4. 確認您使用正確的範圍：團隊使用 `ChannelMessage.Read.Group`，群組聊天使用 `ChatMessage.Read.Chat`

## 參考資料

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 設定指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 建立/管理 Teams 應用程式
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (頻道/群組需要 Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用於機器人管理的 Teams CLI

## 相關

- [Channels Overview](/zh-Hant/channels) - 所有支援的頻道
- [Pairing](/zh-Hant/channels/pairing) - DM 認證與配對流程
- [Groups](/zh-Hant/channels/groups) - 群組聊天行為與提及閘道
- [Channel Routing](/zh-Hant/channels/channel-routing) - 訊息的會話路由
- [Security](/zh-Hant/gateway/security) - 存取模型與強化
