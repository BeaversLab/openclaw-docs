---
summary: "Microsoft TeamsMicrosoft Teams bot 支持状态、功能和配置"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft TeamsMicrosoft Teams"
---

状态：支持文本和私信附件；渠道/群组文件发送需要 `sharePointSiteId` + Graph 权限（请参阅 [在群组聊天中发送文件](#sending-files-in-group-chats)）。投票通过 Adaptive Cards 发送。消息操作为优先发送文件提供了显式的 `upload-file`。

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

[`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) 通过单个命令处理机器人注册、清单创建和凭据生成。

**1. 安装并登录**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>The Teams CLI 目前处于预览阶段。命令和标志可能会在各个版本之间发生变化。</Note>

**2. 启动隧道**（Teams 无法访问 localhost）

如果尚未安装并验证 devtunnel CLI，请先安装并验证（[入门指南](CLIhttps://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)）。

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>需要 `--allow-anonymous`，因为 Teams 无法通过 devtunnels 进行身份验证。每个传入的机器人请求仍由 Teams SDK 自动验证。</Note>

替代方案：`ngrok http 3978` 或 `tailscale funnel 3978`（但这些可能会在每次会话中更改 URL）。

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

输出将显示 `CLIENT_ID`、`CLIENT_SECRET`、`TENANT_ID` 以及一个 **Teams App ID** - 请记下这些以便后续步骤使用。它还提供直接在 Teams 中安装应用的选项。

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

`teams app create` 将提示您安装应用 - 选择“Install in Teams”。如果您跳过了此步骤，可以稍后获取链接：

```bash
teams app get <teamsAppId> --install-link
```

**6. 验证一切是否正常工作**

```bash
teams app doctor <teamsAppId>
```

这将对机器人注册、AAD 应用配置、清单有效性和 SSO 设置运行诊断。

对于生产部署，建议使用 [联合身份验证](/zh/channels/msteams#federated-authentication-certificate-plus-managed-identity)（证书或托管标识）而不是客户端密钥。

<Note>群聊默认被阻止 (`channels.msteams.groupPolicy: "allowlist"`)。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 允许任何成员（提及门槛）。</Note>

## 目标

- 通过 Teams 私信、群组聊天或渠道与 OpenClaw 交谈。
- 保持路由确定性：回复始终返回到消息来源的渠道。
- 默认采用安全的渠道行为（除非另行配置，否则需要提及）。

## 配置写入

默认情况下，允许 Microsoft Teams 写入由 Microsoft Teams`/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方法如下：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私信 + 群组）

**私信访问**

- 默认值：`channels.msteams.dmPolicy = "pairing"`。未知发件人将被忽略，直至获得批准。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID 或静态发件人访问组（例如 `accessGroup:core-team`）。
- 请勿依赖 UPN/显示名称匹配来设置允许列表——因为这些内容可能会更改。OpenClaw 默认禁用直接名称匹配；若要显式选择加入，请使用 OpenClaw`channels.msteams.dangerouslyAllowNameMatching: true`。
- 当凭据允许时，向导可以通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认值：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则将被阻止）。在未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发件人或静态发件人访问组可以在群组聊天/渠道中触发（回退至 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 以允许任何成员（默认仍受提及限制）。
- 若要允许**无渠道**，请设置 `channels.msteams.groupPolicy: "disabled"`。

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

- 通过在 `channels.msteams.teams` 下列出团队和渠道来界定群组/渠道回复的范围。
- 键应使用 Teams 链接中稳定的 Teams 会话 ID，而不是可变的显示名称。
- 当存在 `groupPolicy="allowlist"` 且存在团队允许列表时，仅接受列出的团队/渠道（受提及限制）。
- 配置向导接受 `Team/Channel` 条目并为您存储它们。
- 启动时，OpenClaw 会将团队/渠道和用户允许列表名称解析为 ID（当 Graph 权限允许时），
  并记录映射；未解析的团队/渠道名称将保持输入状态，但默认在路由时被忽略，除非启用了 OpenClaw`channels.msteams.dangerouslyAllowNameMatching: true`。

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
6. 默认情况下，网关在 `/api/messages` 上侦听 Bot Framework Webhook 流量。

### 步骤 1：创建 Azure 机器人

1. 转到 [创建 Azure 机器人](https://portal.azure.com/#create/Microsoft.AzureBot)
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
2. 复制 **Microsoft 应用 ID** → 这是您的 `appId`
3. 点击 **Manage Password** → 进入应用注册 (App Registration)
4. 在 **证书和机密** 下 → **新客户端机密** → 复制 **值** → 这是您的 `appPassword`
5. 前往 **概述** → 复制 **目录（租户）ID** → 这是您的 `tenantId`

### 步骤 3：配置消息传送端点

1. 在 Azure Bot 中 → **Configuration**
2. 将 **Messaging endpoint** 设置为你的 webhook URL：
   - 生产环境：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（请参阅下方的 [本地开发](#local-development-tunneling)）

### 步骤 4：启用 Teams 渠道

1. 在 Azure Bot 中 → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

### 步骤 5：构建 Teams 应用清单

- 包含一个 `bot` 条目，其中包含 `botId = <App ID>`。
- 范围：`personal`、`team`、`groupChat`。
- `supportsFiles: true`（个人范围文件处理所必需）。
- 添加 RSC 权限（请参阅 [RSC 权限](#current-teams-rsc-permissions-manifest)）。
- 创建图标：`outline.png` (32x32) 和 `color.png` (192x192)。
- 将所有三个文件压缩在一起：`manifest.json`、`outline.png`、`color.png`。

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
- 从 Pod/VM 对 IMDS (`169.254.169.254:80`) 的网络访问

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（仅限用户分配的）

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

5. **确保网络访问** IMDS (`169.254.169.254`) - 如果使用 NetworkPolicy，请添加一条允许端口 80 上到 `169.254.169.254/32` 的流量的出口规则。

### 身份验证类型比较

| 方法           | 配置                                           | 优点                 | 缺点                     |
| -------------- | ---------------------------------------------- | -------------------- | ------------------------ |
| **客户端机密** | `appPassword`                                  | 设置简单             | 需要轮换机密，安全性较低 |
| **证书**       | `authType: "federated"` + `certificatePath`    | 网络上不共享机密     | 证书管理开销             |
| **托管标识**   | `authType: "federated"` + `useManagedIdentity` | 无密码，无需管理机密 | 需要 Azure 基础结构      |

**默认行为：** 当未设置 `authType`OpenClaw 时，OpenClaw 默认为客户端密钥身份验证。现有配置无需更改即可继续工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`。使用持久的开发隧道，以便您的 URL 在会话之间保持不变：

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

1. 安装 Teams 应用（使用 `teams app get <id> --install-link` 中的安装链接）
2. 在 Teams 中找到机器人并发送私信
3. 检查传入活动的网关日志

## 环境变量

所有配置键都可以通过环境变量设置：

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE`（可选：`"secret"` 或 `"federated"`）
- `MSTEAMS_CERTIFICATE_PATH`（联合 + 证书）
- `MSTEAMS_CERTIFICATE_THUMBPRINT`（可选，认证不需要）
- `MSTEAMS_USE_MANAGED_IDENTITY`（联合 + 托管标识）
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（仅限用户分配的 MI）

## 成员信息操作

OpenClaw 为 Microsoft Teams 提供了基于 Graph 的 OpenClaw`member-info`Microsoft Teams 操作，以便代理和自动化可以直接从 Microsoft Graph 解析渠道成员详细信息（显示名称、电子邮件、角色）。

要求：

- `Member.Read.Group` RSC 权限（已在推荐清单中）
- 对于跨团队查找：需要管理员同意的 `User.Read.All` Graph 应用程序权限

该操作由 `channels.msteams.actions.memberInfo` 控制（默认：当 Graph 凭据可用时启用）。

## 历史上下文

- `channels.msteams.historyLimit` 控制将多少条最近的渠道/群组消息包装到提示中。
- 回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用（默认为 50）。
- 获取的线程历史记录按发件人允许列表（`allowFrom` / `groupAllowFrom`）过滤，因此线程上下文种子仅包含来自允许发件人的消息。
- 引用附件上下文（从 Teams 回复 HTML 派生的 `ReplyTo*`）当前按接收原样传递。
- 换句话说，允许列表控制谁可以触发代理；目前只有特定的补充上下文路径会被过滤。
- 私信历史记录可以通过 `channels.msteams.dmHistoryLimit`（用户轮次）进行限制。每个用户的覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前的 Teams RSC 权限（manifest）

这些是 Teams 应用清单中的**现有 resourceSpecific 权限**。它们仅适用于安装了该应用的团队/聊天内部。

**对于渠道（团队范围）：**

- `ChannelMessage.Read.Group`（应用程序） - 接收所有渠道消息而不需要 @提及
- `ChannelMessage.Send.Group`（应用程序）
- `Member.Read.Group`（应用程序）
- `Owner.Read.Group`（应用程序）
- `ChannelSettings.Read.Group`（应用程序）
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
- `bots[].scopes` 必须包含您计划使用的 Surface (`personal`, `team`, `groupChat`)。
- 在个人范围内处理文件需要 `bots[].supportsFiles: true`。
- 如果您需要渠道流量，`authorization.permissions.resourceSpecific` 必须包含渠道读取/发送权限。

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
2. **递增 `version` 字段** (例如，`1.0.0` → `1.1.0`)
3. **重新打包** 包含图标的清单 (`manifest.json`, `outline.png`, `color.png`)
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

**底线：** RSC 用于实时监听；Graph API 用于历史访问。为了在离线时补看错过的消息，您需要带有 `ChannelMessage.Read.All` 的 Graph API (需要管理员同意)。

## 启用 Graph 的媒体 + 历史记录（渠道所需）

如果您需要在**渠道**中使用图片/文件或想要获取**消息历史记录**，则必须启用 Microsoft Graph 权限并授予管理员同意。

1. 在 Entra ID (Azure AD) **应用注册** 中，添加 Microsoft Graph **应用程序权限**：
   - `ChannelMessage.Read.All` (渠道附件 + 历史)
   - `Chat.Read.All` 或 `ChatMessage.Read.All` (群组聊天)
2. 为租户**授予管理员同意**。
3. 增加 Teams 应用程序**清单版本**，重新上传，并**在 Teams 中重新安装该应用程序**。
4. **完全退出并重新启动 Teams** 以清除缓存的应用程序元数据。

**用户提及的额外权限：** 对于对话中的用户，用户 @提及功能开箱即用。但是，如果您想动态搜索并提及**不在当前对话中**的用户，请添加 `User.Read.All` (Application) 权限并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 传递消息。如果处理时间过长（例如，LLM 响应缓慢），您可能会看到：

- Gateway(网关) 超时
- Teams 重试消息（导致重复）
- 回复丢失

OpenClaw 通过快速返回并主动发送回复来处理此问题，但非常缓慢的响应仍可能导致问题。

### Teams 云和服务 URL 支持

此 SDK 支持的 Teams 路径已针对 Microsoft Teams 公有云进行实时验证。

入站回复使用传入的 Teams SDK 轮次上下文。非上下文的主动操作 - 发送、编辑、删除、卡片、投票、文件同意消息和排队的长时间运行的回复 - 使用存储的对话引用 `serviceUrl`。公有云默认为 Teams SDK 公有云环境，并允许在公有 Teams 连接器主机上存储引用：`https://smba.trafficmanager.net/`。

公有云是默认选项。对于正常的公有云机器人，您无需设置 `channels.msteams.cloud` 或 `channels.msteams.serviceUrl`。

对于非公有 Teams 云，请设置 `cloud` 以及 Microsoft 发布的匹配的主动边界：

- `channels.msteams.cloud` 选择用于身份验证、JWT 验证、令牌服务和 Graph 范围的 Teams SDK 云预设。
- `channels.msteams.serviceUrl` 选择用于在主动发送、编辑、删除、卡片、投票、文件同意消息和排队的长时间运行的回复之前验证存储的对话引用的 Bot 连接器端点边界。这对于 USGov 和 DoD SDK 云是必需的。对于中国/世纪互联，OpenClaw 使用 SDK `China` 预设，并且仅接受 Azure 中国 Bot Framework 渠道主机上的存储/配置的服务 URL。

Microsoft 在 Teams 主动消息传递文档的 [创建对话](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages?tabs=dotnet#create-the-conversation) 部分发布了全局主动 Bot Connector 端点。如果可用，请使用传入活动的 `serviceUrl`；如果需要全局主动端点，请使用 Microsoft 的表格。

| Teams 环境    | OpenClaw 配置                                    | 主动 `serviceUrl`                                  |
| ------------- | ------------------------------------------------ | -------------------------------------------------- |
| 公有          | 无需云/serviceUrl 配置                           | `https://smba.trafficmanager.net/teams`            |
| GCC           | 设置 `serviceUrl`；不存在单独的 Teams SDK 云预设 | `https://smba.infra.gcc.teams.microsoft.com/teams` |
| GCC High      | `cloud: "USGov"` + `serviceUrl`                  | `https://smba.infra.gov.teams.microsoft.us/teams`  |
| DoD           | `cloud: "USGovDoD"` + `serviceUrl`               | `https://smba.infra.dod.teams.microsoft.us/teams`  |
| 中国/世纪互联 | `cloud: "China"`                                 | 使用传入活动的 `serviceUrl`                        |

GCC 的示例，其中 Microsoft 记录了单独的主动服务 URL，但 Teams SDK 未公开单独的 GCC 云预设：

```json
{
  "channels": {
    "msteams": {
      "serviceUrl": "https://smba.infra.gcc.teams.microsoft.com/teams"
    }
  }
}
```

GCC High 的示例：

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

`channels.msteams.serviceUrl`Microsoft TeamsOpenClaw 限制为受支持的 Microsoft Teams Bot Connector 主机。配置服务 URL 后，OpenClaw 会在执行主动发送、编辑、删除、卡片、投票或排队的长时间运行回复之前，检查存储的对话 `serviceUrl`OpenClaw 是否使用相同的主机。使用默认的公有云配置时，如果存储的对话指向公有 Teams Connector 主机之外，OpenClaw 将以失败关闭（fail closed）方式处理。更改云/服务 URL 设置后，请从对话接收一条新消息，以确保存储的对话引用是最新的。

在 Microsoft 的 Teams 主动端点表中，中国/世纪互联没有单独的全局主动 `smba` URL。配置 `cloud: "China"` 以便 Teams SDK 使用 Azure 中国的身份验证、令牌和 JWT 端点。然后，主动发送需要来自传入中国 Teams 活动的存储对话引用，或者在 Azure 中国 Bot Framework 渠道边界（`*.botframework.azure.cn`）上显式配置的服务 URL。在 OpenClaw 将 Graph 请求路由到 Azure 中国 Graph 端点之前，基于 Graph 的 Teams 辅助功能当前对于 `cloud: "China"`OpenClaw 被禁用。

### 格式设置

Teams markdown 比 Slack 或 Discord 更有限：

- 基本格式设置有效：**粗体**、_斜体_、`code`、链接
- 复杂的 markdown（表格、嵌套列表）可能无法正确呈现
- 支持将自适应卡片用于投票和语义呈现发送（见下文）

## 配置

关键设置（共享渠道模式请参见 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用渠道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：机器人凭据。
- `channels.msteams.cloud`: Teams SDK 云环境（`Public`、`USGov`、`USGovDoD` 或 `China`；默认为 `Public`）。对于 USGov/DoD SDK 云，请使用 `serviceUrl` 进行设置；中国使用 SDK 预设和存储的 Azure 中国机器人框架对话引用，并且直到实现 Azure 中国 Graph 路由之前，基于 Graph 的辅助功能处于禁用状态。
- `channels.msteams.serviceUrl`: SDK 主动操作的 Bot 连接器服务 URL 边界。公有云使用 SDK 默认值；为 GCC（`https://smba.infra.gcc.teams.microsoft.com/teams`）、GCC High 或 DoD 进行设置。当存储的对话引用来自由世纪互联运营的 Teams 时，中国接受 Azure 中国机器人框架渠道主机。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`: 私信允许列表（推荐使用 AAD 对象 ID）。当可用 Graph 访问权限时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`: 应急开关，用于重新启用可变的 UPN/显示名称匹配以及直接的团队/渠道名称路由。
- `channels.msteams.textChunkLimit`: 出站文本分块大小。
- `channels.msteams.chunkMode`: `length`（默认）或 `newline`，用于在长度分块之前按空行（段落边界）分割。
- `channels.msteams.mediaAllowHosts`: 入站附件主机的允许列表（默认为 Microsoft/Teams 域）。
- `channels.msteams.mediaAuthAllowHosts`: 用于在媒体重试时附加 Authorization 标头的允许列表（默认为 Graph + Bot Framework 主机）。
- `channels.msteams.requireMention`: 在渠道/群组中要求 @提及（默认为 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（请参阅 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`: 每个团队的覆盖设置。
- `channels.msteams.teams.<teamId>.requireMention`: 每个团队的覆盖设置。
- `channels.msteams.teams.<teamId>.tools`：当缺少渠道覆盖时使用的默认按团队工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认的按团队按发送者工具策略覆盖（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按渠道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按渠道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按渠道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：按渠道按发送者工具策略覆盖（支持 `"*"` 通配符）。
- `toolsBySender` 键应使用显式前缀：
  `channel:`、`id:`、`e164:`、`username:`、`name:`（旧版无前缀键仍仅映射到 `id:`）。
- `channels.msteams.actions.memberInfo`：启用或禁用基于 Graph 的成员信息操作（默认：当 Graph 凭据可用时启用）。
- `channels.msteams.authType`：身份验证类型 - `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件的路径（联合 + 证书身份验证）。
- `channels.msteams.certificateThumbprint`：证书指纹（可选，身份验证不需要）。
- `channels.msteams.useManagedIdentity`：启用托管标识身份验证（联合模式）。
- `channels.msteams.managedIdentityClientId`：用户分配的托管标识的客户端 ID。
- `channels.msteams.sharePointSiteId`：用于在群组聊天/渠道中上传文件的 SharePoint 网站 ID（请参阅 [在群组聊天中发送文件](#sending-files-in-group-chats)）。

## 路由和会话

- 会话密钥遵循标准代理格式（请参阅 [/concepts/会话](/zh/concepts/session)）：
  - 直接消息共享主会话（`agent:<agentId>:<mainKey>`）。
  - 渠道/群组消息使用对话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：主题与帖子

Teams 最近在同一基础数据模型之上引入了两种渠道 UI 样式：

| 样式                   | 描述                             | 推荐 `replyStyle` |
| ---------------------- | -------------------------------- | ----------------- |
| **帖子**（经典）       | 消息显示为卡片，下方带有线程回复 | `thread`（默认）  |
| **主题**（类似 Slack） | 消息线性流动，更像 Slack         | `top-level`       |

**问题：** Teams API 不公开渠道使用哪种 UI 样式。如果您使用了错误的 `replyStyle`：

- 在主题样式的渠道中使用 `thread` → 回复会尴尬地显示为嵌套状态
- 在帖子样式的渠道中使用 `top-level` → 回复会显示为单独的顶级帖子，而不是在线程内

**解决方案：** 根据渠道的设置方式，为每个渠道配置 `replyStyle`：

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

当机器人向渠道发送回复时，`replyStyle` 的解析顺序是从最具体的覆盖项向下到默认值。第一个非 `undefined` 值生效：

1. **每个渠道** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **每个团队** — `channels.msteams.teams.<teamId>.replyStyle`
3. **全局** — `channels.msteams.replyStyle`
4. **隐式默认值** — 源自 `requireMention`：
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

如果您在全局设置 `requireMention: false` 而没有显式设置 `replyStyle`，则即使在入站消息是线程回复的情况下，帖子样式渠道中的提及也会作为顶级帖子出现。请在全局、团队或渠道级别固定 `replyStyle: "thread"` 以避免意外情况。

### 线程上下文保留

当 `replyStyle: "thread"`OpenClaw 生效且机器人是在渠道线程中被 @提及 时，OpenClaw 会将原始线程根重新附加到出站对话引用 (`19:…@thread.tacv2;messageid=<root>`)，以便回复落在同一线程内。这适用于实时（轮次内）发送以及在 Bot Framework 轮次上下文过期后进行的主动发送（例如，长时间运行的代理、通过 `mcp__openclaw__message` 排队的工具调用回复）。

线程根取自对话引用上存储的 `threadId`。早于 `threadId` 的旧存储引用会回退到 `activityId`（即最后一次植入对话的入站活动），因此现有部署无需重新植入即可继续工作。

当 `replyStyle: "top-level"` 生效时，渠道线程入站消息会故意作为新的顶级帖子进行回复——不附加线程后缀。这是“线程”风格渠道的正确行为；如果您在期望线程回复的地方看到了顶级帖子，则说明您针对该渠道设置的 `replyStyle` 不正确。

## 附件和图片

**当前限制：**

- **私信：** 图片和文件附件通过 Teams 机器人文件 API 工作。
- **渠道/组：** 附件存储在 M365 存储 (SharePoint/OneDrive) 中。Webhook 有效载荷仅包含 HTML 存根，而不是实际文件字节。下载渠道附件**需要 Graph API 权限**。
- 对于显式的文件优先发送，请将 `action=upload-file` 与 `media` / `filePath` / `path` 结合使用；可选的 `message` 将变为随附的文本/评论，而 `filename` 将覆盖上传的名称。

如果没有 Graph 权限，包含图片的渠道消息将仅以文本形式接收（机器人无法访问图片内容）。
默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。使用 OpenClaw`channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任何主机）。
授权标头仅附加到 `channels.msteams.mediaAuthAllowHosts` 中的主机（默认为 Graph + Bot Framework 主机）。请保持此列表严格（避免多租户后缀）。

## 在群组聊天中发送文件

机器人可以使用 FileConsentCard 流程（内置）在私信中发送文件。但是，**在群组聊天/渠道中发送文件**需要额外设置：

| 上下文                 | 文件发送方式                            | 所需设置                             |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| **私信**               | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                             |
| **群组聊天/渠道**      | 上传到 SharePoint → 共享链接            | 需要 `sharePointSiteId` + Graph 权限 |
| **图片（任何上下文）** | Base64 编码内联                         | 开箱即用                             |

### 为何群组聊天需要 SharePoint

机器人没有个人的 OneDrive 驱动器（`/me/drive`API Graph API 端点不适用于应用程序标识）。为了在群组聊天/渠道中发送文件，机器人会上传到 **SharePoint 站点**并创建共享链接。

### 设置

1. 在 Entra ID (Azure AD) → 应用注册中**添加 Graph API 权限**：
   - `Sites.ReadWrite.All` (应用程序) - 将文件上传到 SharePoint
   - `Chat.Read.All` (应用程序) - 可选，启用每用户共享链接

2. **授予管理员同意** 租户。

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

| 权限                                    | 共享行为                                       |
| --------------------------------------- | ---------------------------------------------- |
| 仅 `Sites.ReadWrite.All`                | 组织范围的共享链接（组织内的任何人都可以访问） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每用户共享链接（仅聊天成员可以访问）           |

每用户共享更安全，因为只有聊天参与者可以访问文件。如果缺少 `Chat.Read.All` 权限，机器人将回退到组织范围的共享。

### 回退行为

| 场景                                        | 结果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 群组聊天 + 文件 + `sharePointSiteId` 已配置 | 上传到 SharePoint，发送共享链接                  |
| 群组聊天 + 文件 + 无 `sharePointSiteId`     | 尝试 OneDrive 上传（可能会失败），仅发送文本     |
| 个人聊天 + 文件                             | FileConsentCard 流程（无需 SharePoint 即可工作） |
| 任何上下文 + 图片                           | Base64 编码内联（无需 SharePoint 即可工作）      |

### 文件存储位置

上传的文件存储在配置的 SharePoint 网站默认文档库中的 `/OpenClawShared/` 文件夹内。

## 投票（Adaptive Cards）

OpenClaw 将 Teams 投票作为 Adaptive Cards 发送（没有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 网关会记录投票，数据存储在 OpenClaw 插件状态 SQLite 数据库的 OpenClaw`state/openclaw.sqlite` 下。
- MSTeams 插件启动时，现有的 `msteams-polls.json` 文件将被导入一次。
- 网关必须保持在线才能记录投票。
- 投票尚不会自动发布结果摘要，并且尚不支持投票结果 CLI。

## 演示卡片

使用 `message` 工具、CLI 或正常回复投递，向 Teams 用户或对话发送语义演示有效负载。OpenClaw 从通用演示合约将它们渲染为 Teams 自适应卡片。

`presentation` 参数接受语义块。当提供 `presentation` 时，消息文本是可选的。按钮呈现为自适应卡片提交或 URL 操作。选择菜单在 Teams 渲染器中尚不是原生的，因此 OpenClaw 会在投递之前将其降级为可读文本。

**Agent 工具:**

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

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello!"}]}'
```

有关目标格式的详细信息，请参阅下面的 [Target formats](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和对话：

| 目标类型          | 格式                             | 示例                                              |
| ----------------- | -------------------------------- | ------------------------------------------------- |
| 用户（按 ID）     | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`       |
| 用户（按名称）    | `user:<display-name>`            | `user:John Smith`（需要 Graph API）               |
| 群组/频道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`          |
| 群组/频道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2`（如果包含 `@thread`） |

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

**Agent 工具 示例：**

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

<Note>如果没有 `user:` 前缀，名称默认解析为群组或团队。通过显示名称定向到用户时，请始终使用 `user:`。</Note>

## 主动消息

- 只有在用户进行交互**之后**，才可能发送主动消息，因为我们在此时存储对话引用。
- 请参阅 `/gateway/configuration` 了解 `dmPolicy` 和允许列表限制。

## 团队和频道 ID（常见陷阱）

Teams URL 中的 `groupId` 查询参数**不是**用于配置的团队 ID。请改为从 URL 路径中提取 ID：

**团队 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**频道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**用于配置：**

- Team key = `/team/` 之后的路径段（URL 解码后，例如 `19:Bk4j...@thread.tacv2`；较早的租户可能显示 `@thread.skype`，这也是有效的）
- Channel key = `/channel/` 之后的路径段（URL 解码后）
- 在 OpenClaw 路由中，请**忽略** `groupId` 查询参数。它是 Microsoft Entra 组 ID，而不是传入 Teams 活动中使用的 Bot Framework 会话 ID。

## 私密渠道

机器人在私密渠道中的支持有限：

| 功能               | 标准渠道 | 私密渠道           |
| ------------------ | -------- | ------------------ |
| 机器人安装         | 是       | 有限               |
| 实时消息 (webhook) | 是       | 可能无法工作       |
| RSC 权限           | 是       | 可能会有不同的行为 |
| @提及              | 是       | 如果可访问机器人   |
| Graph API 历史     | 是       | 是（需要权限）     |

**如果私密渠道无法工作，请尝试以下变通方法：**

1. 使用标准渠道进行机器人交互
2. 使用私信 - 用户始终可以直接向机器人发送消息
3. 使用 Graph API 进行历史访问（需要 `ChannelMessage.Read.All`）

## 故障排除

### 常见问题

- **渠道中不显示图像：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用，并完全退出/重新打开 Teams。
- **渠道中无响应：** 默认情况下需要提及；设置 `channels.msteams.requireMention=false` 或按团队/渠道进行配置。
- **版本不匹配（Teams 仍显示旧清单）：** 移除并重新添加该应用，然后完全退出 Teams 以进行刷新。
- **来自 webhook 的 401 Unauthorized：** 在没有 Azure JWT 的情况下手动测试时会出现此情况 - 意味着端点可达但身份验证失败。请使用 Azure Web Chat 进行正确测试。

### 清单上传错误

- **“Icon file cannot be empty”：** 清单引用的图标文件大小为 0 字节。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **“webApplicationInfo.Id already in use”：** 该应用仍安装在另一个团队/聊天中。请先找到并卸载它，或者等待 5-10 分钟以供传播。
- **上传时出现“Something went wrong”：** 请改为通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发人员工具 (F12) → Network 选项卡，并检查响应正文以获取实际错误。
- **侧载失败：** 请尝试“将应用上传到组织的应用目录”，而不是“上传自定义应用”——这通常可以绕过侧载限制。

### RSC 权限无法正常工作

1. 验证 `webApplicationInfo.id` 是否与你的机器人应用 ID 完全匹配
2. 重新上传应用并在团队/聊天中重新安装
3. 检查你的组织管理员是否阻止了 RSC 权限
4. 确认你使用了正确的范围：团队使用 `ChannelMessage.Read.Group`，群组聊天使用 `ChatMessage.Read.Chat`

## 参考

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive 渠道 messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (渠道/群组需要 Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - 用于机器人管理的 Teams CLI

## 相关

- [Channels Overview](/zh/channels) - 所有支持的渠道
- [Pairing](/zh/channels/pairing) - 私信身份验证和配对流程
- [Groups](/zh/channels/groups) - 群组聊天行为和提及控制
- [Channel Routing](/zh/channels/channel-routing) - 消息的会话路由
- [Security](/zh/gateway/security) - 访问模型和加固
