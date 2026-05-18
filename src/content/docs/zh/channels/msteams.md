---
summary: "Microsoft Teams 机器人支持状态、功能和配置"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

状态：支持文本 + 私信附件；发送渠道/群组文件需要 `sharePointSiteId` + Graph 权限（请参阅 [在群组聊天中发送文件](#sending-files-in-group-chats)）。投票通过自适应卡片发送。消息操作为文件优先发送显式公开 `upload-file`。

## 捆绑插件

Microsoft Teams 作为当前 OpenClaw 版本中的捆绑插件提供，因此在正常的打包构建中无需单独安装。

如果您使用的是旧版本构建，或排除了捆绑 Teams 的自定义安装，请直接安装 npm 包：

```bash
openclaw plugins install @openclaw/msteams
```

使用裸包以跟随当前的正式发布标签。仅当您需要可重现的安装时，才固定确切的版本。

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

详细信息：[插件](/zh/tools/plugin)

## 快速设置

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 可在一个命令中处理机器人注册、清单创建和凭据生成。

**1. 安装并登录**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>The Teams CLI 目前处于预览阶段。命令和标志可能会在各个版本之间发生变化。</Note>

**2. 启动隧道**（Teams 无法访问 localhost）

如果尚未安装并认证 devtunnel CLI，请先安装（[入门指南](CLIhttps://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>需要 `--allow-anonymous`，因为 Teams 无法通过 devtunnels 进行身份验证。每个传入的机器人请求仍会由 Teams SDK 自动验证。</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（但这些可能会在每个会话中更改 URL）。

**3. 创建应用**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

这单个命令：

- 创建一个 Entra ID (Azure AD) 应用程序
- 生成客户端密钥
- 构建并上传 Teams 应用清单（包含图标）
- 注册机器人（默认由 Teams 托管 - 无需 Azure 订阅）

输出将显示 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` 以及一个 **Teams App ID** - 请记下这些信息以备后续步骤使用。它还提供直接在 Teams 中安装该应用的选项。

**4. 配置 OpenClaw**，使用输出中的凭据：

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

或者直接使用环境变量：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

**5. 在 Teams 中安装应用**

`teams app create` 将提示您安装应用 - 选择“在 Teams 中安装”。如果您跳过了此步骤，可以稍后获取链接：

```bash
teams app get <teamsAppId> --install-link
```

**6. 验证一切是否正常工作**

```bash
teams app doctor <teamsAppId>
```

这将对机器人注册、AAD 应用配置、清单有效性和 SSO 设置运行诊断。

对于生产部署，请考虑使用 [联合身份验证](/zh/channels/msteams#federated-authentication-certificate-plus-managed-identity)（证书或托管标识），而不是客户端密码。

<Note>群组聊天默认被阻止 (`channels.msteams.groupPolicy: "allowlist"`)。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 以允许任何成员（通过提及控制）。</Note>

## 目标

- 通过 Teams 私信、群组聊天或渠道与 OpenClaw 交谈。
- 保持路由确定性：回复始终返回到消息来源的渠道。
- 默认采用安全的渠道行为（除非另行配置，否则需要提及）。

## 配置写入

默认情况下，允许 Microsoft Teams 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方法如下：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私信 + 群组）

**私信访问**

- 默认值：`channels.msteams.dmPolicy = "pairing"`。未知发送者将被忽略，直到获得批准。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID 或静态发送者访问组，例如 `accessGroup:core-team`。
- 不要依赖 UPN/显示名匹配来设置允许列表 - 它们可能会更改。OpenClaw 默认禁用直接名称匹配；请通过 `channels.msteams.dangerouslyAllowNameMatching: true` 显式选择启用。
- 当凭据允许时，向导可以通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认值：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则被阻止）。如果未设置，请使用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者或静态发送者访问组可以在群组聊天/渠道中触发消息（回退到 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 以允许任何成员（默认仍需通过提及控制）。
- 要**不允许任何渠道**，请设置 `channels.msteams.groupPolicy: "disabled"`。

示例：

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

**Teams + 渠道允许列表**

- 通过在 `channels.msteams.teams` 下列出团队和渠道来限定群组/渠道回复范围。
- 键应使用 Teams 链接中稳定的 Teams 会话 ID，而不是可变的显示名称。
- 当存在 `groupPolicy="allowlist"` 和 Teams 允许列表时，仅接受列出的团队/渠道（提及限制）。
- 配置向导接受 `Team/Channel` 条目并为您存储它们。
- 启动时，如果 Graph 权限允许，OpenClaw 会将团队/渠道和用户允许列表名称解析为 ID，并记录映射关系；未解析的团队/渠道名称将保持原样，但除非启用了 `channels.msteams.dangerouslyAllowNameMatching: true`，否则在路由时默认会被忽略。

示例：

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
<summary><strong>手动设置（不使用 Teams CLI）</strong></summary>

如果您无法使用 Teams CLI，则可以通过 Azure 门户手动设置机器人。

### 工作原理

1. 确保 Microsoft Teams 插件可用（在当前版本中已捆绑）。
2. 创建一个 **Azure 机器人**（App ID + 密钥 + 租户 ID）。
3. 构建一个引用该机器人并包含以下 RSC 权限的 **Teams 应用包**。
4. 将 Teams 应用上传/安装到团队中（或安装到个人范围以使用私信）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams` 并启动网关。
6. 默认情况下，网关会在 `/api/messages` 上侦听 Bot Framework Webhook 流量。

### 步骤 1：创建 Azure 机器人

1. 前往[创建 Azure 机器人](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **“基本信息” (Basics)** 选项卡：

   | 字段           | 值                                                         |
   | -------------- | ---------------------------------------------------------- |
   | **机器人句柄** | 您的机器人名称，例如 `openclaw-msteams`（必须唯一）        |
   | **订阅**       | 选择您的 Azure 订阅                                        |
   | **资源组**     | 新建或使用现有的                                           |
   | **定价层**     | 开发/测试使用 **“免费” (Free)**                            |
   | **应用类型**   | **“单租户” (Single Tenant)**（推荐 - 请参阅下面的说明）    |
   | **创建类型**   | **“新建 Microsoft 应用 ID” (Create new Microsoft App ID)** |

<Warning>2025-07-31 之后，已弃用新建多租户机器人。新机器人请使用 **“单租户” (Single Tenant)**。</Warning>

3. 点击 **“查看 + 创建” (Review + create)** → **“创建” (Create)**（等待约 1-2 分钟）

### 步骤 2：获取凭据

1. 转到您的 Azure 机器人资源 → **“配置” (Configuration)**
2. 复制 **Microsoft App ID** → 这是你的 `appId`
3. 点击 **Manage Password** → 进入应用注册 (App Registration)
4. 在 **Certificates & secrets** 下 → **New client secret** → 复制 **Value** → 这是你的 `appPassword`
5. 前往 **Overview** → 复制 **Directory (tenant) ID** → 这是你的 `tenantId`

### 步骤 3：配置消息传送端点

1. 在 Azure Bot 中 → **Configuration**
2. 将 **Messaging endpoint** 设置为你的 webhook URL：
   - 生产环境：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（见下方的[本地开发](#local-development-tunneling)）

### 步骤 4：启用 Teams 渠道

1. 在 Azure Bot 中 → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

### 步骤 5：构建 Teams 应用清单

- 包含一个带有 `botId = <App ID>` 的 `bot` 条目。
- 范围：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（个人范围文件处理所必需）。
- 添加 RSC 权限（参见 [RSC 权限](#current-teams-rsc-permissions-manifest)）。
- 创建图标：`outline.png` (32x32) 和 `color.png` (192x192)。
- 将所有三个文件打包在一起：`manifest.json`、`outline.png`、`color.png`。

### 步骤 6：配置 OpenClaw

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

环境变量：`MSTEAMS_APP_ID`、`MSTEAMS_APP_PASSWORD`、`MSTEAMS_TENANT_ID`。

### 步骤 7：运行 Gateway(网关)

当插件可用且存在带有凭据的 `msteams` 配置时，Teams 渠道会自动启动。

</details>

## 联合身份验证（证书 + 托管标识）

> 添加于 2026.4.11

对于生产部署，OpenClaw 支持 **联合身份验证** 作为比客户端机密更安全的替代方案。有两种方法可用：

### 选项 A：基于证书的身份验证

使用已在你的 Entra ID 应用注册中注册的 PEM 证书。

**设置：**

1. 生成或获取一个证书（PEM 格式，包含私钥）。
2. 在 Entra ID → 应用注册 → **证书 & 机密** → **证书** → 上传公钥证书。

**配置：**

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

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### 选项 B：Azure 托管标识

使用 Azure 托管标识进行无密码身份验证。这非常适合部署在具有可用托管标识的 Azure 基础设施（AKS、App Service、Azure VM）上。

**工作原理：**

1. Bot pod/VM 具有托管标识（系统分配或用户分配）。
2. **联合身份凭据**将托管标识链接到 Entra ID 应用注册。
3. 在运行时，OpenClaw 使用 OpenClaw`@azure/identity` 从 Azure IMDS 端点 (`169.254.169.254`) 获取令牌。
4. 该令牌被传递给 Teams SDK 以进行 Bot 身份验证。

**先决条件：**

- 已启用托管标识的 Azure 基础设施（AKS 工作负载标识、App Service、VM）
- 在 Entra ID 应用注册上创建了联合身份凭据
- 从 pod/VM 到 IMDS (`169.254.169.254:80`) 的网络访问权限

**配置（系统分配的托管标识）：**

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

**配置（用户分配的托管标识）：**

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

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（仅限用户分配）

### AKS 工作负载标识设置

对于使用工作负载标识的 AKS 部署：

1. 在你的 AKS 集群上**启用工作负载标识**。
2. 在 Entra ID 应用注册上**创建联合身份凭据**：

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. 使用应用客户端 ID **为 Kubernetes 服务帐户添加注解**：

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. **为 Pod 打上标签**以便注入工作负载标识：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **确保网络访问** IMDS (`169.254.169.254`) - 如果使用 NetworkPolicy，请添加一条出站规则，允许端口 80 上到 `169.254.169.254/32` 的流量。

### 身份验证类型比较

| 方法           | 配置                                           | 优点                 | 缺点                     |
| -------------- | ---------------------------------------------- | -------------------- | ------------------------ |
| **客户端机密** | `appPassword`                                  | 设置简单             | 需要轮换机密，安全性较低 |
| **证书**       | `authType: "federated"` + `certificatePath`    | 网络上不共享机密     | 证书管理开销             |
| **托管标识**   | `authType: "federated"` + `useManagedIdentity` | 无密码，无需管理机密 | 需要 Azure 基础结构      |

**默认行为：** 当未设置 `authType` 时，OpenClaw 默认使用客户端机密身份验证。现有配置无需更改即可继续工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`。请使用持久开发隧道，以便您的 URL 在各会话中保持不变：

```bash
# One-time setup:
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
```

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（URL 可能会在每次会话中更改）。

如果您的隧道 URL 发生更改，请更新端点：

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## 测试机器人

**运行诊断：**

```bash
teams app doctor <teamsAppId>
```

一次性检查机器人注册、AAD 应用、清单和 SSO 配置。

**发送测试消息：**

1. 安装 Teams 应用（使用来自 `teams app get <id> --install-link` 的安装链接）
2. 在 Teams 中找到机器人并发送私信
3. 检查传入活动的网关日志

## 环境变量

所有配置键都可以通过环境变量设置：

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE`（可选：`"secret"` 或 `"federated"`）
- `MSTEAMS_CERTIFICATE_PATH`（联合身份 + 证书）
- `MSTEAMS_CERTIFICATE_THUMBPRINT`（可选，身份验证不需要）
- `MSTEAMS_USE_MANAGED_IDENTITY`（联合身份 + 托管标识）
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（仅限用户分配的 MI）

## 成员信息操作

OpenClaw 为 Microsoft Teams 公开了一个基于 Graph 支持的 `member-info` 操作，以便代理和自动化可以直接从 Microsoft Graph 解析渠道成员详细信息（显示名称、电子邮件、角色）。

要求：

- `Member.Read.Group` RSC 权限（已在推荐的清单中）
- 对于跨团队查找：需要管理员同意的 `User.Read.All` Graph 应用程序权限

该操作受 `channels.msteams.actions.memberInfo` 限制（默认：当有 Graph 凭据时启用）。

## 历史上下文

- `channels.msteams.historyLimit` 控制将多少条最近的渠道/组消息封装到提示中。
- 回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用（默认为 50）。
- 获取的线程历史记录会通过发件人允许列表（`allowFrom` / `groupAllowFrom`）进行过滤，因此线程上下文种子仅包含来自允许发件人的消息。
- 引用的附件上下文（从 Teams 回复 HTML 派生的 `ReplyTo*`）目前按接收到的原样传递。
- 换句话说，允许列表控制谁可以触发代理；目前只有特定的补充上下文路径会被过滤。
- 私信历史记录可以用 `channels.msteams.dmHistoryLimit`（用户轮次）进行限制。每用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前的 Teams RSC 权限（manifest）

这些是 Teams 应用清单中的**现有 resourceSpecific 权限**。它们仅适用于安装了该应用的团队/聊天内部。

**对于渠道（团队范围）：**

- `ChannelMessage.Read.Group` (Application) - 接收所有渠道消息而无需 @提及
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**对于群组聊天：**

- `ChatMessage.Read.Chat` (Application) - 接收所有群组聊天消息而无需 @提及

要通过 Teams CLI 添加 RSC 权限：

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## Teams 清单示例（已编辑）

包含必填字段的最小有效示例。请替换 ID 和 URL。

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

### 清单注意事项（必填字段）

- `bots[].botId` **必须**与 Azure Bot App ID 匹配。
- `webApplicationInfo.id` **必须**与 Azure Bot App ID 匹配。
- `bots[].scopes` 必须包含您计划使用的表面（`personal`、`team`、`groupChat`）。
- 在个人范围内处理文件需要 `bots[].supportsFiles: true`。
- 如果您希望处理渠道流量，`authorization.permissions.resourceSpecific` 必须包含渠道读取/发送权限。

### 更新现有应用

要更新已安装的 Teams 应用（例如，添加 RSC 权限）：

```bash
# Download, edit, and re-upload the manifest
teams app manifest download <teamsAppId> manifest.json
# Edit manifest.json locally...
teams app manifest upload manifest.json <teamsAppId>
# Version is auto-bumped if content changed
```

更新后，请在每个团队中重新安装应用以使新权限生效，并**完全退出并重新启动 Teams**（不仅仅是关闭窗口）以清除缓存的应用元数据。

<details>
<summary>手动更新清单（不使用 CLI）</summary>

1. 使用新设置更新您的 `manifest.json`
2. **递增 `version` 字段**（例如，`1.0.0` → `1.1.0`）
3. **重新压缩**包含图标的清单（`manifest.json`、`outline.png`、`color.png`）
4. 上传新的 zip 包：
   - **Teams 管理中心：** Teams 应用 → 管理应用 → 查找您的应用 → 上传新版本
   - **侧载：** 在 Teams 中 → 应用 → 管理您的应用 → 上传自定义应用

</details>

## 功能：仅 RSC 与 Graph

### 使用 **仅 Teams RSC**（已安装应用，无 Graph API 权限）

有效：

- 读取渠道消息的**文本**内容。
- 发送渠道消息的**文本**内容。
- 接收**个人（私信）**文件附件。

无效：

- 渠道/群组**图像或文件内容**（有效载荷仅包含 HTML 存根）。
- 下载存储在 SharePoint/OneDrive 中的附件。
- 阅读消息历史记录（超出实时 Webhook 事件范围）。

### 使用 **Teams RSC + Microsoft Graph 应用程序权限**

新增：

- 下载托管的内容（粘贴到消息中的图像）。
- 下载存储在 SharePoint/OneDrive 中的文件附件。
- 通过 Graph 读取渠道/聊天消息历史记录。

### RSC 与 Graph API

| 功能           | RSC 权限           | Graph API               |
| -------------- | ------------------ | ----------------------- |
| **实时消息**   | 是（通过 webhook） | 否（仅轮询）            |
| **历史消息**   | 否                 | 是（可以查询历史记录）  |
| **设置复杂度** | 仅需应用清单       | 需要管理员同意 + 令牌流 |
| **离线工作**   | 否（必须正在运行） | 是（随时查询）          |

**底线：** RSC 用于实时监听；Graph API 用于历史访问。若要在离线时追漏错过的消息，您需要 Graph API 并配合 `ChannelMessage.Read.All`（需要管理员同意）。

## 启用 Graph 的媒体 + 历史记录（渠道所需）

如果您需要在**渠道**中使用图片/文件或想要获取**消息历史记录**，则必须启用 Microsoft Graph 权限并授予管理员同意。

1. 在 Entra ID (Azure AD) **应用注册** 中，添加 Microsoft Graph **应用程序权限**：
   - `ChannelMessage.Read.All`（渠道附件 + 历史记录）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群组聊天）
2. 为租户**授予管理员同意**。
3. 增加 Teams 应用程序**清单版本**，重新上传，并**在 Teams 中重新安装该应用程序**。
4. **完全退出并重新启动 Teams** 以清除缓存的应用程序元数据。

**用户提及的额外权限：** 对于对话中的用户，用户 @提及开箱即用。但是，如果您想动态搜索并提及**不在当前对话中**的用户，请添加 `User.Read.All`（应用程序）权限并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 传递消息。如果处理时间过长（例如，LLM 响应缓慢），您可能会看到：

- Gateway(网关) 超时
- Teams 重试消息（导致重复）
- 回复丢失

OpenClaw 通过快速返回并主动发送回复来处理此问题，但非常缓慢的响应仍可能导致问题。

### 格式设置

Teams markdown 比 Slack 或 Discord 更受限制：

- 基本格式设置有效：**粗体**，_斜体_，`code`，链接
- 复杂的 markdown（表格、嵌套列表）可能无法正确呈现
- 支持使用自适应卡片进行投票和语义演示发送（见下文）

## 配置

关键设置（有关共享渠道模式，请参阅 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用该渠道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：bot 凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`：私信允许列表（推荐使用 AAD 对象 ID）。当有 Graph 访问权限时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：紧急情况开关，用于重新启用可变的 UPN/显示名称匹配以及直接的团队/渠道名称路由。
- `channels.msteams.textChunkLimit`：出站文本块大小。
- `channels.msteams.chunkMode`：`length`（默认）或 `newline`，以便在按长度分块之前按空行（段落边界）拆分。
- `channels.msteams.mediaAllowHosts`：入站附件主机的允许列表（默认为 Microsoft/Teams 域）。
- `channels.msteams.mediaAuthAllowHosts`：允许在媒体重试时附加 Authorization 标头的允许列表（默认为 Graph + Bot Framework 主机）。
- `channels.msteams.requireMention`：在渠道/组中需要 @提及（默认为 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（参见 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按团队覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按团队覆盖。
- `channels.msteams.teams.<teamId>.tools`：当缺少渠道覆盖时使用的默认按团队工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认的按团队按发件人工具策略覆盖（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按渠道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按渠道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按渠道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：按渠道按发件人工具策略覆盖（支持 `"*"` 通配符）。
- `toolsBySender` 键应使用显式前缀：
  `channel:`、`id:`、`e164:`、`username:`、`name:`（旧的无前缀键仍仅映射到 `id:`）。
- `channels.msteams.actions.memberInfo`：启用或禁用基于 Graph 的成员信息操作（默认：当 Graph 凭据可用时启用）。
- `channels.msteams.authType`：身份验证类型 - `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件的路径（联合 + 证书身份验证）。
- `channels.msteams.certificateThumbprint`：证书指纹（可选，身份验证不需要）。
- `channels.msteams.useManagedIdentity`：启用托管标识身份验证（联合模式）。
- `channels.msteams.managedIdentityClientId`：用户分配的托管标识的客户端 ID。
- `channels.msteams.sharePointSiteId`：用于在群聊/频道中上传文件的 SharePoint 网站 ID（请参阅 [在群聊中发送文件](#sending-files-in-group-chats)）。

## 路由和会话

- 会话密钥遵循标准代理格式（请参阅 [/concepts/会话](/zh/concepts/session)）：
  - 直接消息共享主会话（`agent:<agentId>:<mainKey>`）。
  - 渠道/群组消息使用对话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：线程与帖子

Teams 最近基于相同的基础数据模型引入了两种渠道 UI 样式：

| 样式                   | 描述                               | 推荐 `replyStyle` |
| ---------------------- | ---------------------------------- | ----------------- |
| **帖子**（经典）       | 消息显示为卡片，下方带有线程化回复 | `thread` (默认)   |
| **线程**（类似 Slack） | 消息线性流动，更像 Slack           | `top-level`       |

**问题所在：** Teams API 不会公开渠道使用的 UI 样式。如果您使用了错误的 `replyStyle`：

- 在线程式渠道中使用 `thread` → 回复会以尴尬的嵌套方式显示
- 在帖子式渠道中使用 `top-level` → 回复显示为单独的顶级帖子，而不是线程内的回复

**解决方案：** 根据渠道的设置方式，逐个渠道配置 `replyStyle`：

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

### 解析优先级

当机器人向渠道发送回复时，`replyStyle` 会从最具体的覆盖项向下解析到默认值。第一个非 `undefined` 值获胜：

1. **逐渠道** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **按团队** — `channels.msteams.teams.<teamId>.replyStyle`
3. **全局** — `channels.msteams.replyStyle`
4. **隐式默认** — 源自 `requireMention`：
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

如果您在没有显式 `replyStyle` 的情况下全局设置 `requireMention: false`，则“帖子”风格渠道中的提及将作为顶级帖子出现，即使入站消息是线程回复。请在全局、团队或渠道级别固定 `replyStyle: "thread"` 以避免意外情况。

### 线程上下文保留

当 `replyStyle: "thread"` 生效且机器人在渠道线程中被 @提及 时，OpenClaw 会将原始线程根节点重新附加到出站对话引用（`19:…@thread.tacv2;messageid=<root>`），以便回复落入同一线程中。这适用于实时（轮流）发送以及在 Bot Framework 轮次上下文过期后进行的主动发送（例如，长时间运行的代理、通过 `mcp__openclaw__message` 排队的工具调用回复）。

线程根节点取自对话引用上存储的 `threadId`。早于 `threadId` 的较旧存储引用会回退到 `activityId`（即最后一次为对话提供种子的入站活动），因此现有部署无需重新播种即可继续工作。

当 `replyStyle: "top-level"` 生效时，渠道帖子入站消息会被刻意回复为新的顶级帖子——不会附加线程后缀。这是线程式渠道的正确行为；如果你看到顶级帖子出现在你期望得到线程回复的地方，说明你针对该渠道设置的 `replyStyle` 不正确。

## 附件和图像

**当前限制：**

- **私信：** 图像和文件附件通过 Teams 机器人文件 API 工作。
- **渠道/组：** 附件存储在 M365 存储中（SharePoint/OneDrive）。Webhook 负载仅包含 HTML 存根，而不包含实际的文件字节。**需要 Graph API 权限**才能下载渠道附件。
- 对于显式的文件优先发送，请将 `action=upload-file` 与 `media` / `filePath` / `path` 一起使用；可选的 `message` 将成为附带的文本/评论，而 `filename` 将覆盖上传的名称。

如果没有 Graph 权限，包含图片的渠道消息将仅作为文本接收（机器人无法访问图片内容）。
默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。使用 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任何主机）。
授权标头仅附加到 `channels.msteams.mediaAuthAllowHosts` 中的主机（默认为 Graph + Bot Framework 主机）。请保持此列表严格（避免多租户后缀）。

## 在群组聊天中发送文件

机器人可以使用 FileConsentCard 流程（内置）在私信中发送文件。但是，**在群组聊天/渠道中发送文件**需要额外的设置：

| 上下文                 | 文件发送方式                            | 所需设置                             |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| **私信**               | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                             |
| **群组聊天/渠道**      | 上传到 SharePoint → 共享链接            | 需要 `sharePointSiteId` + Graph 权限 |
| **图片（任何上下文）** | Base64 编码内联                         | 开箱即用                             |

### 为什么群组聊天需要 SharePoint

机器人没有个人的 OneDrive 驱动器（`/me/drive` Graph API 端点不适用于应用程序身份）。要在群聊/渠道中发送文件，机器人会上传到 **SharePoint 站点** 并创建共享链接。

### 设置

1. 在 Entra ID (Azure AD) → 应用注册中**添加 Graph API 权限**：
   - `Sites.ReadWrite.All`（应用程序）- 将文件上传到 SharePoint
   - `Chat.Read.All`（应用程序）- 可选，启用每用户共享链接

2. **授予租户管理员同意**。

3. **获取您的 SharePoint 站点 ID：**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **配置 OpenClaw：**

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

### 共享行为

| 权限                                    | 共享行为                                     |
| --------------------------------------- | -------------------------------------------- |
| 仅 `Sites.ReadWrite.All`                | 组织范围的共享链接（组织内的任何人均可访问） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每用户共享链接（仅聊天成员可访问）           |

每用户共享更安全，因为只有聊天参与者可以访问该文件。如果缺少 `Chat.Read.All` 权限，机器人将回退到全组织范围的共享。

### 回退行为

| 场景                                        | 结果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 群组聊天 + 文件 + 已配置 `sharePointSiteId` | 上传到 SharePoint，发送共享链接                  |
| 群组聊天 + 文件 + 无 `sharePointSiteId`     | 尝试 OneDrive 上传（可能失败），仅发送文本       |
| 个人聊天 + 文件                             | FileConsentCard 流程（无需 SharePoint 即可工作） |
| 任何上下文 + 图片                           | Base64 编码内联（无需 SharePoint 即可工作）      |

### 文件存储位置

上传的文件存储在已配置 SharePoint 站点的默认文档库中的 `/OpenClawShared/` 文件夹中。

## 投票（Adaptive Cards）

OpenClaw 将 Teams 投票作为 Adaptive Cards 发送（没有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票由网关记录在 `~/.openclaw/msteams-polls.json` 中。
- 网关必须保持在线才能记录投票。
- 投票尚不会自动发布结果摘要（如需要，请检查存储文件）。

## 展示卡片

使用 `message`CLIOpenClaw 工具、CLI 或正常回复交付，将语义展示负载发送给 Teams 用户或对话。OpenClaw 将它们从通用展示合约渲染为 Teams 自适应卡片。

`presentation` 参数接受语义块。当提供 `presentation`OpenClaw 时，消息文本是可选的。按钮呈现为自适应卡片提交或 URL 操作。选择菜单在 Teams 渲染器中尚不原生，因此 OpenClaw 会在交付前将其降级为可读文本。

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

有关目标格式的详细信息，请参阅下方的 [Target formats](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和对话：

| 目标类型          | 格式                             | 示例                                             |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| 用户（按 ID）     | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`      |
| 用户（按名称）    | `user:<display-name>`            | `user:John Smith` (需要 Graph API)               |
| 群组/渠道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`         |
| 群组/渠道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2` (如果包含 `@thread`) |

**CLI 示例：**

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

**Agent 工具示例：**

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

<Note>如果没有 `user:` 前缀，名称默认解析为群组或团队。通过显示名称定位人员时，请始终使用 `user:`。</Note>

## 主动消息

- 主动消息仅在用户交互**之后**才可能发送，因为我们在此时存储会话引用。
- 请参阅 `/gateway/configuration` 以了解 `dmPolicy` 和允许列表控制。

## 团队和渠道 ID（常见陷阱）

Teams URL 中的 `groupId` 查询参数**不是**用于配置的团队 ID。请改为从 URL 路径中提取 ID：

**团队 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**渠道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**用于配置：**

- 团队键 = `/team/` 之后的路径段（URL 解码后，例如 `19:Bk4j...@thread.tacv2`；较旧的租户可能会显示 `@thread.skype`，这也是有效的）
- 频道键 = `/channel/` 之后的路径段（URL 解码后）
- **忽略** 用于 OpenClaw 路由的 `groupId` 查询参数。它是 Microsoft Entra 组 ID，而非传入 Teams 活动中使用的 Bot Framework 会话 ID。

## 私有渠道

机器人在私有渠道中的支持有限：

| 功能                | 标准渠道 | 私有渠道         |
| ------------------- | -------- | ---------------- |
| 机器人安装          | 是       | 有限             |
| 实时消息（webhook） | 是       | 可能无法工作     |
| RSC 权限            | 是       | 行为可能有所不同 |
| @提及               | 是       | 如果机器人可访问 |
| Graph API 历史记录  | 是       | 是（需要权限）   |

**如果私有渠道无法工作，请尝试以下变通方法：**

1. 使用标准渠道进行机器人交互
2. 使用私信 - 用户始终可以直接向机器人发送消息
3. 使用 Graph API 进行历史记录访问（需要 `ChannelMessage.Read.All`）

## 故障排除

### 常见问题

- **渠道中不显示图片：** 缺少 Graph 权限或管理员同意。请重新安装 Teams 应用，并完全退出/重新打开 Teams。
- **渠道内无响应：** 默认情况下需要提及；请设置 `channels.msteams.requireMention=false` 或按团队/渠道进行配置。
- **版本不匹配（Teams 仍显示旧清单）：** 移除并重新添加应用，然后完全退出 Teams 以刷新。
- **来自 webhook 的 401 Unauthorized：** 在没有 Azure JWT 的情况下手动测试时会出现此情况——这意味着端点可达但身份验证失败。请使用 Azure Web Chat 进行正确测试。

### 清单上传错误

- **"Icon file cannot be empty"：** 清单引用的图标文件大小为 0 字节。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **“webApplicationInfo.Id already in use”：** 该应用仍安装在另一个团队/聊天中。请先找到并卸载它，或等待 5-10 分钟以完成传播。
- **上传时出现 "Something went wrong"：** 请改为通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发人员工具 (F12) → Network 选项卡，并检查响应正文以获取实际错误。
- **侧载失败：** 尝试“Upload an app to your org's app catalog”而不是“Upload a custom app”——这通常可以绕过侧载限制。

### RSC 权限不起作用

1. 验证 `webApplicationInfo.id` 与你的机器人的 App ID 完全匹配
2. 重新上传应用并在团队/聊天中重新安装
3. 检查您的组织管理员是否阻止了 RSC 权限
4. 确认你使用的是正确的范围：团队使用 `ChannelMessage.Read.Group`，群组聊天使用 `ChatMessage.Read.Chat`

## 参考

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive 渠道 messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (渠道/group requires Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用于机器人管理的 Teams CLI

## 相关

- [频道概览](/zh/channels) - 所有支持的频道
- [配对](/zh/channels/pairing) - 私信身份验证和配对流程
- [群组](/zh/channels/groups) - 群聊行为和提及控制
- [频道路由](/zh/channels/channel-routing) - 消息的会话路由
- [安全性](/zh/gateway/security) - 访问模型和加固
