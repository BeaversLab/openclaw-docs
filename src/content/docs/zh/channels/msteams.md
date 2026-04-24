---
summary: "Microsoft Teams 机器人支持状态、功能和配置"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> "进入此地者，放弃一切希望。"

状态：支持文本 + 私信附件；渠道/组文件发送需要 `sharePointSiteId` + Graph 权限（请参阅 [在群组聊天中发送文件](#sending-files-in-group-chats)）。投票通过自适应卡片发送。消息操作为文件优先发送显式公开了 `upload-file`。

## 捆绑插件

Microsoft Teams 作为捆绑插件包含在当前的 Microsoft Teams 版本中，因此在常规打包版本中无需单独安装。

如果您使用的是较旧的版本或排除了捆绑 Teams 的自定义安装，请手动安装：

```bash
openclaw plugins install @openclaw/msteams
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

详情：[插件](/zh/tools/plugin)

## 快速设置（初学者）

1. 确保 Microsoft Teams 插件可用。
   - 当前的 OpenClaw 打包版本已包含它。
   - 较旧的/自定义安装可以使用上述命令手动添加它。
2. 创建一个 **Azure Bot**（应用 ID + 客户端密钥 + 租户 ID）。
3. 使用这些凭据配置 OpenClaw。
4. 通过公共 URL 或隧道暴露 `/api/messages`（默认端口 3978）。
5. 安装 Teams 应用包并启动网关。

最小配置（客户端密钥）：

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

对于生产部署，请考虑使用[联合身份验证](#federated-authentication-certificate--managed-identity)（证书或托管标识）来代替客户端密钥。

注意：群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群回复，请设置 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 以允许任何成员，需提及触发）。

## 目标

- 通过 Teams 私信、群聊或渠道与 OpenClaw 交谈。
- 保持路由确定性：回复始终回到消息到达的渠道。
- 默认为安全的渠道行为（除非另有配置，否则需要提及）。

## 配置写入

默认情况下，允许 Microsoft Teams 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方法：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私信 + 群组）

**私信访问**

- 默认值：`channels.msteams.dmPolicy = "pairing"`。在批准之前，未知发件人将被忽略。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID。
- UPN/显示名称是可变的；默认情况下禁用直接匹配，仅在设置 `channels.msteams.dangerouslyAllowNameMatching: true` 时启用。
- 当凭据允许时，向导可以通过 Microsoft Graph 将名称解析为 ID。

**群组访问**

- 默认值：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则被阻止）。当未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者可以在群组聊天/渠道中触发（默认回退到 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 以允许任何成员（默认仍需提及才可触发）。
- 要禁止**所有渠道**，请设置 `channels.msteams.groupPolicy: "disabled"`。

示例：

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

**Teams + 渠道白名单**

- 通过在 `channels.msteams.teams` 下列出团队和渠道，来限定群组/渠道回复的范围。
- 键应使用稳定的团队 ID 和渠道对话 ID。
- 当 `groupPolicy="allowlist"` 且存在 Teams 白名单时，仅接受列出的团队/渠道（需提及触发）。
- 配置向导接受 `Team/Channel` 条目并为您存储它们。
- 在启动时，OpenClaw 会将团队/渠道和用户白名单名称解析为 ID（当 Graph 权限允许时），
  并记录映射关系；无法解析的团队/渠道名称将保持原样输入，但在默认情况下会被忽略，除非启用了 `channels.msteams.dangerouslyAllowNameMatching: true`。

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

## 工作原理

1. 确保 Microsoft Teams 插件可用。
   - 当前的打包 OpenClaw 版本已包含该插件。
   - 较旧的或自定义安装可以使用上述命令手动添加。
2. 创建一个 **Azure Bot**（应用 ID + 密钥 + 租户 ID）。
3. 构建一个引用该机器人并包含以下 RSC 权限的 **Teams 应用包**。
4. 将 Teams 应用上传/安装到团队中（或用于私信的个人范围）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams` 并启动网关。
6. 网关默认在 `/api/messages` 上监听 Bot Framework Webhook 流量。

## Azure Bot 设置（先决条件）

在配置 OpenClaw 之前，您需要创建一个 Azure Bot 资源。

### 步骤 1：创建 Azure Bot

1. 前往 [创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **“基本信息”** 标签页：

   | 字段           | 值                                                  |
   | -------------- | --------------------------------------------------- |
   | **Bot handle** | 您的机器人名称，例如 `openclaw-msteams`（必须唯一） |
   | **订阅**       | 选择您的 Azure 订阅                                 |
   | **资源组**     | 新建或使用现有的                                    |
   | **定价层**     | **免费**，用于开发/测试                             |
   | **应用类型**   | **单租户**（推荐 - 请参阅下面的说明）               |
   | **创建类型**   | **新建 Microsoft 应用 ID**                          |

> **弃用通知：** 2025-07-31 之后已弃用新建多租户机器人。新机器人请使用 **单租户**。

3. 点击 **Review + create**（审阅 + 创建） → **Create**（创建）（等待约 1-2 分钟）

### 步骤 2：获取凭据

1. 转到您的 Azure 机器人资源 → **Configuration**（配置）
2. 复制 **Microsoft App ID**（Microsoft 应用 ID） → 这是您的 `appId`
3. 点击 **Manage Password**（管理密码） → 转到应用注册
4. 在 **Certificates & secrets**（证书和密钥）下 → **New client secret**（新建客户端密钥） → 复制 **Value**（值） → 这是您的 `appPassword`
5. 转到 **Overview**（概览） → 复制 **Directory (tenant) ID**（目录（租户）ID） → 这是您的 `tenantId`

### 步骤 3：配置消息传送终结点

1. 在 Azure 机器人中 → **Configuration**（配置）
2. 将 **Messaging endpoint**（消息传送终结点）设置为您的 webhook URL：
   - 生产环境： `https://your-domain.com/api/messages`
   - 本地开发：使用隧道（请参阅下面的 [Local Development](#local-development-tunneling)（本地开发））

### 步骤 4：启用 Teams 频道

1. 在 Azure 机器人中 → **Channels**（频道）
2. 点击 **Microsoft Teams** → Configure（配置） → Save（保存）
3. 接受服务条款

<a id="federated-authentication-certificate--managed-identity"></a>

## 联合身份验证（证书 + 托管标识）

> 添加于 2026.3.24

对于生产部署，OpenClaw 支持 **联合身份验证**，作为比客户端机密更安全的替代方案。提供两种方法：

### 选项 A：基于证书的身份验证

使用在 Entra ID 应用注册中注册的 PEM 证书。

**设置：**

1. 生成或获取证书（包含私钥的 PEM 格式）。
2. 在 Entra ID → 应用注册 → **证书和机密** → **证书** → 上传公钥证书。

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

使用 Azure 托管标识进行无密码身份验证。这非常适合在具有可用托管标识的 Azure 基础结构（AKS、应用服务、Azure 虚拟机）上进行部署。

**工作原理：**

1. Bot pod/虚拟机具有托管标识（系统分配或用户分配）。
2. **联合标识凭据** 将托管标识链接到 Entra ID 应用注册。
3. 运行时，OpenClaw 使用 `@azure/identity` 从 Azure IMDS 终结点 (`169.254.169.254`) 获取令牌。
4. 令牌被传递给 Teams SDK 以进行 Bot 身份验证。

**先决条件：**

- 已启用托管标识的 Azure 基础结构（AKS 工作负载标识、应用服务、虚拟机）
- 在 Entra ID 应用注册上创建的联合标识凭据
- 从 Pod/VM 对 IMDS (`169.254.169.254:80`) 的网络访问权限

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

1. 在你的 AKS 群集上**启用工作负载标识**。
2. 在 Entra ID 应用注册上**创建联合标识凭据**：

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

4. **为 Pod 打上标签**以进行工作负载标识注入：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **确保网络访问** IMDS (`169.254.169.254`) — 如果使用 NetworkPolicy，请添加一条允许端口 80 上通往 `169.254.169.254/32` 的流量的出口规则。

### 身份验证类型比较

| 方法           | 配置                                           | 优点                 | 缺点                     |
| -------------- | ---------------------------------------------- | -------------------- | ------------------------ |
| **客户端机密** | `appPassword`                                  | 设置简单             | 需要轮换机密，安全性较低 |
| **证书**       | `authType: "federated"` + `certificatePath`    | 网络上不存在共享机密 | 证书管理开销             |
| **托管标识**   | `authType: "federated"` + `useManagedIdentity` | 无密码，无需管理机密 | 需要 Azure 基础设施      |

**默认行为：** 当未设置 `authType` 时，OpenClaw 默认使用客户端密钥身份验证。现有配置无需更改即可继续工作。

## 本地开发（隧道）

Teams 无法访问 `localhost`。请使用隧道进行本地开发：

**选项 A：ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**选项 B：Tailscale Funnel**

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Teams 开发者门户（替代方案）

您可以无需手动创建清单 ZIP 文件，而是使用 [Teams 开发者门户](https://dev.teams.microsoft.com/apps)：

1. 点击 **+ 新建应用**
2. 填写基本信息（名称、描述、开发者信息）
3. 转到 **应用功能** → **机器人**
4. 选择 **手动输入机器人 ID** 并粘贴你的 Azure 机器人应用 ID
5. 检查范围：**个人**、**团队**、**群组聊天**
6. 点击 **分发** → **下载应用包**
7. 在 Teams 中：**应用** → **管理你的应用** → **上传自定义应用** → 选择该 ZIP 文件

这通常比手动编辑 JSON 清单更容易。

## 测试机器人

**选项 A：Azure Web Chat（先验证 Webhook）**

1. 在 Azure 门户 → 你的 Azure 机器人资源 → **在 Web 聊天中测试**
2. 发送一条消息 —— 你应该会看到回复
3. 这会在 Teams 设置之前确认你的 Webhook 终结点工作正常

**选项 B：Teams（应用安装后）**

1. 安装 Teams 应用（侧载或组织目录）
2. 在 Teams 中找到该机器人并发送私信
3. 检查网关日志以查看传入的活动

## 设置（仅限最低文本要求）

1. **确保 Microsoft Teams 插件可用**
   - 当前的 OpenClaw 打包版本已包含该插件。
   - 较旧或自定义的安装可以手动添加：
     - 从 npm 获取： `openclaw plugins install @openclaw/msteams`
     - 从本地检出获取： `openclaw plugins install ./path/to/local/msteams-plugin`

2. **机器人注册**
   - 创建一个 Azure 机器人（见上文）并记录以下信息：
     - 应用 ID (App ID)
     - 客户端机密（应用密码）
     - 租户 ID (Tenant ID)（单租户）

3. **Teams 应用清单**
   - 包含一个带有 `botId = <App ID>` 的 `bot` 条目。
   - 范围： `personal`、`team`、`groupChat`。
   - `supportsFiles: true`（处理个人范围文件所必需）。
   - 添加 RSC 权限（见下文）。
   - 创建图标： `outline.png` (32x32) 和 `color.png` (192x192)。
   - 将所有三个文件打包在一起： `manifest.json`、`outline.png`、`color.png`。

4. **配置 OpenClaw**

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

   您也可以使用环境变量代替配置键：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`
   - `MSTEAMS_AUTH_TYPE`（可选： `"secret"` 或 `"federated"`）
   - `MSTEAMS_CERTIFICATE_PATH`（联合身份 + 证书）
   - `MSTEAMS_CERTIFICATE_THUMBPRINT`（可选，身份验证不需要）
   - `MSTEAMS_USE_MANAGED_IDENTITY`（联合身份 + 托管标识）
   - `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID`（仅限用户分配的 MI）

5. **机器人终结点**
   - 将 Azure 机器人消息传递终结点设置为：
     - `https://<host>:3978/api/messages`（或您选择的路径/端口）。

6. **运行网关**
   - 当捆绑或手动安装的插件可用，且存在包含凭据的 `msteams` 配置时，Teams 渠道会自动启动。

## 成员信息操作

OpenClaw 为 Microsoft Teams 提供了一个由 Graph 支持的 `member-info` 操作，以便代理和自动化可以直接从 Microsoft Graph 解析渠道成员详细信息（显示名称、电子邮件、角色）。

要求：

- `Member.Read.Group` RSC 权限（已在推荐清单中）
- 对于跨团队查找：具有管理员同意的 `User.Read.All` Graph 应用程序权限

该操作受 `channels.msteams.actions.memberInfo` 控制（默认：当 Graph 凭据可用时启用）。

## 历史上下文

- `channels.msteams.historyLimit` 控制有多少条最近的渠道/群组消息被包装到提示词中。
- 回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用（默认为 50）。
- 获取的线程历史会根据发送者允许列表（`allowFrom` / `groupAllowFrom`）进行过滤，因此线程上下文填充仅包含来自允许发送者的消息。
- 引用的附件上下文（从 Teams 回复 HTML 派生的 `ReplyTo*`）目前按原样传递。
- 换句话说，允许列表控制谁能触发智能体；目前只有特定的补充上下文路径会被过滤。
- 私信历史可以通过 `channels.msteams.dmHistoryLimit`（用户轮次）进行限制。每个用户的覆盖设置：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前的 Teams RSC 权限（清单）

这些是我们 Teams 应用清单中的 **现有 resourceSpecific 权限**。它们仅应用于安装了该应用的团队/聊天内部。

**对于频道（团队范围）：**

- `ChannelMessage.Read.Group` (Application) - 接收所有渠道消息而无需 @提及
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**对于群聊：**

- `ChatMessage.Read.Chat` (Application) - 接收所有群组聊天消息而无需 @提及

## Teams 清单示例（已编辑）

包含必填字段的最小化有效示例。请替换 ID 和 URL。

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
- `bots[].scopes` 必须包含您计划使用的界面（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 是在个人范围内处理文件所必需的。
- 如果您需要渠道流量，`authorization.permissions.resourceSpecific` 必须包含渠道读取/发送权限。

### 更新现有应用

要更新已安装的 Teams 应用（例如，添加 RSC 权限）：

1. 使用新设置更新您的 `manifest.json`
2. **增加 `version` 字段**（例如，`1.0.0` → `1.1.0`）
3. **重新打包** 包含图标的清单（`manifest.json`、`outline.png`、`color.png`）
4. 上传新的 zip 包：
   - **选项 A（Teams 管理中心）：** Teams 管理中心 → Teams 应用 → 管理应用 → 找到您的应用 → 上传新版本
   - **选项 B（侧载）：** 在 Teams 中 → 应用 → 管理您的应用 → 上传自定义应用
5. **对于团队渠道：** 在每个团队中重新安装应用以使新权限生效
6. **完全退出并重新启动 Teams**（不仅仅是关闭窗口）以清除缓存的应用元数据

## 功能：仅 RSC 与 Graph

### 使用 **仅 Teams RSC**（已安装应用，无 Graph API 权限）

有效：

- 读取渠道消息的 **文本** 内容。
- 发送渠道消息的 **文本** 内容。
- 接收 **个人（私信）** 文件附件。

无效：

- 渠道/组 **图片或文件内容**（负载仅包含 HTML 存根）。
- 下载存储在 SharePoint/OneDrive 中的附件。
- 读取消息历史记录（超出实时 webhook 事件范围）。

### 使用 **Teams RSC + Microsoft Graph 应用程序权限**

增加：

- 下载托管的内容（粘贴到消息中的图片）。
- 下载存储在 SharePoint/OneDrive 中的文件附件。
- 通过 Graph 读取渠道/聊天消息历史记录。

### RSC 与 Graph API

| 功能           | RSC 权限           | Graph API               |
| -------------- | ------------------ | ----------------------- |
| **实时消息**   | 是（通过 webhook） | 否（仅轮询）            |
| **历史消息**   | 否                 | 是（可查询历史）        |
| **设置复杂度** | 仅需应用清单       | 需要管理员同意 + 令牌流 |
| **离线工作**   | 否（必须运行中）   | 是（随时查询）          |

**结论：** RSC 用于实时监听；Graph API 用于历史访问。为了在离线时追赶错过的消息，您需要具有 `ChannelMessage.Read.All` 的 Graph API（需要管理员同意）。

## 启用 Graph 的媒体 + 历史（渠道必需）

如果您需要在**渠道**中使用图片/文件或想要获取**消息历史记录**，必须启用 Microsoft Graph 权限并授予管理员同意。

1. 在 Entra ID (Azure AD) **应用注册** 中，添加 Microsoft Graph **应用程序权限**：
   - `ChannelMessage.Read.All` （渠道附件 + 历史）
   - `Chat.Read.All` 或 `ChatMessage.Read.All` （群组聊天）
2. 为租户**授予管理员同意**。
3. 增加 Teams 应用**清单版本**，重新上传，并**在 Teams 中重新安装应用**。
4. **完全退出并重新启动 Teams** 以清除缓存的应用元数据。

**用户提及的额外权限：** 对于对话中的用户，User @mentions 开箱即用。但是，如果您想动态搜索并提及**不在当前对话中**的用户，请添加 `User.Read.All` （应用程序）权限并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 传递消息。如果处理时间过长（例如，LLM 响应缓慢），您可能会看到：

- Gateway(网关) 超时
- Teams 重试消息（导致重复）
- 丢弃回复

OpenClaw 通过快速返回并主动发送回复来处理此问题，但非常缓慢的响应仍可能导致问题。

### 格式

Teams markdown 比 Slack 或 Discord 限制更多：

- 基本格式有效：**粗体**，_斜体_，`code`，链接
- 复杂的 markdown（表格、嵌套列表）可能无法正确渲染
- 自适应卡片 支持用于投票和语义演示发送（见下文）

## 配置

关键设置（共享渠道模式请参阅 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用该渠道。
- `channels.msteams.appId`，`channels.msteams.appPassword`，`channels.msteams.tenantId`：机器人凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`：私信允许列表（推荐使用 AAD 对象 ID）。当 Graph 访问可用时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：应急开关，用于重新启用可变的 UPN/显示名称匹配以及直接团队/渠道名称路由。
- `channels.msteams.textChunkLimit`：出站文本分块大小。
- `channels.msteams.chunkMode`：`length`（默认）或 `newline`，以在长度分块之前按空行（段落边界）拆分。
- `channels.msteams.mediaAllowHosts`：入站附件主机的允许列表（默认为 Microsoft/Teams 域）。
- `channels.msteams.mediaAuthAllowHosts`：允许在媒体重试时附加授权标头的主机允许列表（默认为 Graph + Bot Framework 主机）。
- `channels.msteams.requireMention`：在渠道/群组中需要 @提及（默认为 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（参见 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：每个团队的覆盖设置。
- `channels.msteams.teams.<teamId>.requireMention`：针对每个团队的覆盖设置。
- `channels.msteams.teams.<teamId>.tools`：当缺少渠道覆盖设置时使用的默认针对每个团队的工具策略覆盖 (`allow`/`deny`/`alsoAllow`)。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认针对每个团队每个发送者的工具策略覆盖（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：针对每个渠道的覆盖设置。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：针对每个渠道的覆盖设置。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：针对每个渠道的工具策略覆盖 (`allow`/`deny`/`alsoAllow`)。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：针对每个渠道每个发送者的工具策略覆盖（支持 `"*"` 通配符）。
- `toolsBySender` 键应使用显式前缀：
  `id:`、`e164:`、`username:`、`name:`（旧的不带前缀的键仍仅映射到 `id:`）。
- `channels.msteams.actions.memberInfo`：启用或禁用基于 Graph 的成员信息操作（默认：当 Graph 凭据可用时启用）。
- `channels.msteams.authType`：身份验证类型 — `"secret"`（默认）或 `"federated"`。
- `channels.msteams.certificatePath`：PEM 证书文件的路径（联合身份验证 + 证书身份验证）。
- `channels.msteams.certificateThumbprint`：证书指纹（可选，身份验证不需要）。
- `channels.msteams.useManagedIdentity`：启用托管身份身份验证（联合模式）。
- `channels.msteams.managedIdentityClientId`：用户分配的托管身份的客户端 ID。
- `channels.msteams.sharePointSiteId`：用于在群组聊天/渠道中上传文件的 SharePoint 网站 ID（请参阅 [在群组聊天中发送文件](#sending-files-in-group-chats)）。

## 路由与会话

- 会话键遵循标准代理格式（请参阅 [/concepts/会话](/zh/concepts/session)）：
  - 直接消息共享主会话 (`agent:<agentId>:<mainKey>`)。
  - 渠道/群组消息使用会话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：主题串 vs 帖子

Teams 最近基于相同的数据模型引入了两种渠道 UI 样式：

| 样式                     | 描述                               | 推荐 `replyStyle` |
| ------------------------ | ---------------------------------- | ----------------- |
| **帖子**（经典）         | 消息以卡片形式显示，下方有线程回复 | `thread`（默认）  |
| **主题串**（类似 Slack） | 消息线性流动，更像 Slack           | `top-level`       |

**问题：** Teams API 不公开渠道使用的 UI 样式。如果您使用了错误的 `replyStyle`：

- 在线程式渠道中使用 `thread` → 回复会以尴尬的嵌套方式显示
- 在帖子式渠道中使用 `top-level` → 回复显示为单独的顶级帖子，而不是在帖子内部

**解决方案：** 根据渠道的设置，按渠道配置 `replyStyle`：

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

## 附件与图片

**当前限制：**

- **私信：** 图片和文件附件通过 Teams 机器人文件 API 工作。
- **渠道/群组：** 附件存储在 M365 存储（SharePoint/OneDrive）中。Webhook 载荷仅包含 HTML 存根，而不包含实际文件字节。下载渠道附件**需要 Graph API 权限**。
- 对于显式的文件优先发送，请将 `action=upload-file` 与 `media` / `filePath` / `path` 结合使用；可选的 `message` 将成为随附文本/评论，而 `filename` 将覆盖上传的名称。

如果没有 Graph 权限，包含图片的渠道消息将仅作为文本接收（机器人无法访问图片内容）。
默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。使用 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任何主机）。
授权标头仅附加到 `channels.msteams.mediaAuthAllowHosts` 中的主机（默认为 Graph + Bot Framework 主机）。请保持此列表严格（避免多租户后缀）。

## 在群聊中发送文件

机器人可以使用 FileConsentCard 流程（内置）在私信中发送文件。但是，**在群聊/渠道中发送文件**需要额外的设置：

| 上下文                 | 发送文件的方式                          | 所需设置                             |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| **私信**               | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                             |
| **群聊/渠道**          | 上传至 SharePoint → 共享链接            | 需要 `sharePointSiteId` + Graph 权限 |
| **图片（任何上下文）** | Base64 内联编码                         | 开箱即用                             |

### 为何群聊需要 SharePoint

机器人没有个人的 OneDrive 驱动器（`/me/drive` Graph API 端点不适用于应用程序标识）。要在群组聊天/渠道中发送文件，机器人会上传到 **SharePoint 网站** 并创建共享链接。

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

| 权限                                    | 共享行为                                         |
| --------------------------------------- | ------------------------------------------------ |
| 仅 `Sites.ReadWrite.All`                | 组织范围内的共享链接（组织内的任何人都可以访问） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每用户共享链接（仅聊天成员可以访问）             |

每用户共享更安全，因为只有聊天参与者可以访问该文件。如果缺少 `Chat.Read.All` 权限，机器人将回退到组织范围内的共享。

### 回退行为

| 场景                                        | 结果                                             |
| ------------------------------------------- | ------------------------------------------------ |
| 群组聊天 + 文件 + 已配置 `sharePointSiteId` | 上传到 SharePoint，发送共享链接                  |
| 群组聊天 + 文件 + 无 `sharePointSiteId`     | 尝试上传到 OneDrive（可能会失败），仅发送文本    |
| 个人聊天 + 文件                             | FileConsentCard 流程（无需 SharePoint 即可工作） |
| 任何上下文 + 图片                           | Base64 编码内联（无需 SharePoint 即可工作）      |

### 文件存储位置

上传的文件存储在配置的 SharePoint 站点的默认文档库中的 `/OpenClawShared/` 文件夹中。

## 投票（自适应卡片）

OpenClaw 将 Teams 投票作为自适应卡片发送（没有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票由网关记录在 `~/.openclaw/msteams-polls.json` 中。
- 网关必须保持在线才能记录投票。
- 投票尚不会自动发布结果摘要（如果需要，请检查存储文件）。

## 演示文稿卡片

使用 `message` 工具或 CLI 向 Teams 用户或对话发送语义化演示文稿负载。OpenClaw 将它们从通用演示合约渲染为 Teams 自适应卡片。

`presentation` 参数接受语义块。当提供 `presentation` 时，消息文本是可选的。

**代理工具：**

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

有关目标格式的详细信息，请参阅下面的 [目标格式](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和对话：

| 目标类型          | 格式                             | 示例                                              |
| ----------------- | -------------------------------- | ------------------------------------------------- |
| 用户（按 ID）     | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`       |
| 用户（按名称）    | `user:<display-name>`            | `user:John Smith`（需要 Graph API）               |
| 群组/渠道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`          |
| 群组/渠道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2`（如果包含 `@thread`） |

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

注意：如果没有 `user:` 前缀，名称默认为组/团队解析。当通过显示名称定位人员时，请始终使用 `user:`。

## 主动消息

- 主动消息仅在用户进行交互**后**才可能实现，因为我们在此时存储对话引用。
- 请参阅 `/gateway/configuration` 以了解 `dmPolicy` 和允许列表控制。

## 团队和渠道 ID（常见陷阱）

Teams URL 中的 `groupId` 查询参数**不是**用于配置的团队 ID。请从 URL 路径中提取 ID：

**团队 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**渠道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**用于配置：**

- 团队 ID = `/team/` 之后的路径段（URL 解码，例如 `19:Bk4j...@thread.tacv2`）
- 渠道 ID = `/channel/` 之后的路径段（URL 解码）
- **忽略** `groupId` 查询参数

## 私密渠道

Bot 在私密渠道中的支持有限：

| 功能               | 标准渠道 | 私密渠道         |
| ------------------ | -------- | ---------------- |
| Bot 安装           | 是       | 有限             |
| 实时消息           | 是       | 可能无法工作     |
| RSC 权限           | 是       | 行为可能有所不同 |
| @提及              | 是       | 如果 bot 可访问  |
| Graph API 历史记录 | 是       | 是（需要权限）   |

**如果私密渠道无法工作，可采用以下变通方法：**

1. 使用标准渠道进行 bot 交互
2. 使用私信 - 用户始终可以直接向 bot 发送消息
3. 使用 Graph API 进行历史访问（需要 `ChannelMessage.Read.All`）

## 故障排除

### 常见问题

- **渠道中图像不显示：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用并完全退出/重新打开 Teams。
- **渠道中无响应：** 默认需要提及；设置 `channels.msteams.requireMention=false` 或按团队/渠道配置。
- **版本不匹配（Teams 仍显示旧清单）：** 移除并重新添加应用，然后完全退出 Teams 以进行刷新。
- **来自 webhook 的 401 Unauthorized：** 在没有 Azure JWT 的情况下进行手动测试时会出现此错误 - 意味着端点可达但身份验证失败。请使用 Azure Web Chat 进行正确的测试。

### 清单上传错误

- **“图标文件不能为空”：** 清单引用了大小为 0 字节的图标文件。创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **"webApplicationInfo.Id already in use"：** 该应用仍安装在另一个团队/聊天中。请先找到并卸载它，或者等待 5-10 分钟以供传播。
- **上传时出现 "Something went wrong"：** 请改为通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发人员工具 (F12) → Network 选项卡，并检查响应正文以获取实际错误。
- **侧载失败：** 请尝试 "Upload an app to your org's app catalog" 而不是 "Upload a custom app" - 这通常可以绕过侧载限制。

### RSC 权限不起作用

1. 验证 `webApplicationInfo.id` 与您的机器人的 App ID 完全匹配
2. 重新上传应用并在团队/聊天中重新安装
3. 检查您的组织管理员是否已阻止 RSC 权限
4. 确认您使用了正确的范围：团队使用 `ChannelMessage.Read.Group`，群组聊天使用 `ChatMessage.Read.Chat`

## 参考

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure 机器人设置指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive 渠道 messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (渠道/群组需要 Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## 相关

- [频道概述](/zh/channels) — 所有支持的频道
- [配对](/zh/channels/pairing) — 私信身份验证和配对流程
- [群组](/zh/channels/groups) — 群组聊天行为和提及限制
- [频道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全性](/zh/gateway/security) — 访问模型和加固
