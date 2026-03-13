---
summary: "Microsoft Teams 机器人支持状态、功能和配置"
read_when:
  - Working on MS Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams（插件）

> "进入此地者，放弃希望吧。"

更新日期：2026-01-21

状态：支持文本 + 私信附件；频道/群组文件发送需要 `sharePointSiteId` + Graph 权限（请参阅[在群组聊天中发送文件](#sending-files-in-group-chats)）。投票通过自适应卡片发送。

## 所需插件

Microsoft Teams 作为插件提供，不包含在核心安装中。

**重大变更 (2026.1.15)：** MS Teams 已从核心中移出。如果您使用它，则必须安装该插件。

原因说明：保持核心安装更轻量，并允许 MS Teams 依赖项独立更新。

通过 CLI（npm 注册表）安装：

```bash
openclaw plugins install @openclaw/msteams
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/msteams
```

如果您在配置/入职期间选择了 Teams 并且检测到 git 检出，
OpenClaw 将自动提供本地安装路径。

详情：[插件](/zh/en/tools/plugin)

## 快速设置（初学者）

1. 安装 Microsoft Teams 插件。
2. 创建一个 **Azure Bot**（App ID + client secret + tenant ID）。
3. 使用这些凭据配置 OpenClaw。
4. 通过公共 URL 或隧道暴露 `/api/messages`（默认端口 3978）。
5. 安装 Teams 应用包并启动网关。

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

注意：群组聊天默认被阻止 (`channels.msteams.groupPolicy: "allowlist"`)。要允许群组回复，请设置 `channels.msteams.groupAllowFrom`（或使用 `groupPolicy: "open"` 允许任何成员，通过提及进行限制）。

## 目标

- 通过 Teams 私信、群组聊天或频道与 OpenClaw 对话。
- 保持路由确定性：回复始终返回到它们到达的频道。
- 默认采用安全的频道行为（除非另有配置，否则需要提及）。

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

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发送者将被忽略，直到获得批准。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID。
- UPN/显示名称是可变的；默认情况下禁用直接匹配，仅在启用 `channels.msteams.dangerouslyAllowNameMatching: true` 时才启用。
- 当凭据允许时，向导可以通过 Microsoft Graph 将名称解析为 ID。

**群组访问权限**

- 默认值：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则被阻止）。当未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者可以在群组聊天/频道中触发（回退到 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 以允许任何成员（默认情况下仍需提及）。
- 若要允许**无频道**，请设置 `channels.msteams.groupPolicy: "disabled"`。

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

**Teams + 频道允许列表**

- 通过在 `channels.msteams.teams` 下列出团队和频道来限制群组/频道回复的范围。
- 键应使用稳定的团队 ID 和频道对话 ID。
- 当存在 `groupPolicy="allowlist"` 和团队允许列表时，仅接受列出的团队/频道（需要提及）。
- 配置向导接受 `Team/Channel` 条目并为您存储它们。
- 启动时，OpenClaw 会将团队/频道和用户允许列表名称解析为 ID（当 Graph 权限允许时）
  并记录映射；未解析的团队/频道名称将保持原样输入，但除非启用了 `channels.msteams.dangerouslyAllowNameMatching: true`，否则默认在路由时被忽略。

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

1. 安装 Microsoft Teams 插件。
2. 创建一个 **Azure Bot**（应用 ID + 密钥 + 租户 ID）。
3. 构建一个引用该机器人并包含以下 RSC 权限的 **Teams 应用包**。
4. 将 Teams 应用上传/安装到团队中（或用于私信的个人范围）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams` 并启动网关。
6. 网关默认在 `/api/messages` 上侦听 Bot Framework webhook 流量。

## Azure Bot 设置（先决条件）

在配置 OpenClaw 之前，您需要创建一个 Azure Bot 资源。

### 步骤 1：创建 Azure Bot

1. 前往 [创建 Azure 机器人](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 ** Basics**（基本信息）选项卡：

   | 字段              | 值                                                    |
   | ------------------ | -------------------------------------------------------- |
   | **Bot handle**     | 您的机器人名称，例如 `openclaw-msteams` （必须唯一） |
   | **Subscription**   | 选择您的 Azure 订阅                           |
   | **Resource group** | 新建或使用现有的                               |
   | **Pricing tier**   | **Free** 用于开发/测试                                 |
   | **Type of App**    | **Single Tenant** （推荐 - 请参阅下文注释）         |
   | **Creation type**  | **Create new Microsoft App ID**                          |

> **弃用通知：** 2025-07-31 之后已弃用新建多租户机器人。新机器人请使用 **Single Tenant**。

3. 点击 **Review + create** → **Create**（等待约 1-2 分钟）

### 步骤 2：获取凭据

1. 转到您的 Azure Bot 资源 → **Configuration**
2. 复制 **Microsoft App ID** → 这是您的 `appId`
3. 点击 **Manage Password** → 进入 App Registration
4. 在 **Certificates & secrets** 下 → **New client secret** → 复制 **Value** → 这是您的 `appPassword`
5. 前往 **Overview** → 复制 **Directory (tenant) ID** → 这是您的 `tenantId`

### 步骤 3：配置消息传送终结点

1. 在 Azure Bot 中 → **Configuration**
2. 将 **Messaging endpoint** 设置为您的 webhook URL：
   - 生产环境： `https://your-domain.com/api/messages`
   - 本地开发：使用隧道（请参阅下面的 [Local Development](#local-development-tunneling)）

### 步骤 4：启用 Teams 频道

1. 在 Azure Bot 中 → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

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

## Teams 开发人员门户（替代方法）

您可以使用 [Teams Developer Portal](https://dev.teams.microsoft.com/apps) 来代替手动创建清单 ZIP：

1. 点击 **+ New app**
2. 填写基本信息（名称、描述、开发者信息）
3. 转到 **App features** → **Bot**
4. 选择 **Enter a bot ID manually** 并粘贴您的 Azure Bot App ID
5. 检查范围：**Personal**、**Team**、**Group Chat**
6. 点击 **Distribute** → **Download app package**
7. 在 Teams 中：**Apps** → **Manage your apps** → **Upload a custom app** → 选择 ZIP 文件

这通常比手动编辑 JSON 清单要容易。

## 测试 Bot

**选项 A：Azure Web Chat（先验证 webhook）**

1. 在 Azure Portal → 您的 Azure Bot 资源 → **Test in Web Chat**
2. 发送消息 - 您应该能看到回复
3. 这确认了您的 webhook 端点在 Teams 设置之前工作正常

**选项 B：Teams（应用安装后）**

1. 安装 Teams 应用（侧载或组织目录）
2. 在 Teams 中找到该 bot 并发送私信
3. 检查传入活动的网关日志

## 设置（纯文本最少配置）

1. **安装 Microsoft Teams 插件**
   - 来自 npm： `openclaw plugins install @openclaw/msteams`
   - 来自本地检出： `openclaw plugins install ./extensions/msteams`

2. **Bot 注册**
   - 创建一个 Azure Bot（见上文）并记下：
     - App ID
     - Client secret (App password)
     - Tenant ID (single-tenant)

3. **Teams 应用清单**
   - 包含一个带有 `botId = <App ID>` 的 `bot` 条目。
   - 范围：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（个人范围文件处理所必需）。
   - 添加 RSC 权限（如下）。
   - 创建图标：`outline.png` (32x32) 和 `color.png` (192x192)。
   - 将所有三个文件打包在一起：`manifest.json`、`outline.png`、`color.png`。

4. **配置 OpenClaw**

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

   您也可以使用环境变量代替配置键：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Bot 端点**
   - 将 Azure Bot 消息端点设置为：
     - `https://<host>:3978/api/messages`（或您选择的路径/端口）。

6. **运行网关**
   - 安装插件且存在包含凭据的 `msteams` 配置时，Teams 频道会自动启动。

## 历史记录上下文

- `channels.msteams.historyLimit` 控制将多少条最近的频道/群组消息打包到提示中。
- 回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用（默认为 50）。
- 私信历史记录可以通过 `channels.msteams.dmHistoryLimit`（用户轮次）进行限制。每用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前的 Teams RSC 权限（清单）

这些是我们 Teams 应用清单中**现有的 resourceSpecific 权限**。它们仅在安装了应用的团队/聊天中生效。

**对于频道（团队范围）：**

- `ChannelMessage.Read.Group` (Application) - 接收所有频道消息而无需 @提及
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**对于群组聊天：**

- `ChatMessage.Read.Chat` (Application) - 接收所有群聊消息而无需 @提及

## Teams 清单示例（已编辑）

包含必填字段的最小有效示例。请替换 ID 和 URL。

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

### 清单注意事项（必填字段）

- `bots[].botId` **必须**与 Azure Bot 应用 ID 匹配。
- `webApplicationInfo.id` **必须**与 Azure Bot 应用 ID 匹配。
- `bots[].scopes` 必须包含您计划使用的表面（`personal`、`team`、`groupChat`）。
- 个人范围内的文件处理需要 `bots[].supportsFiles: true`。
- 如果您希望接收频道流量，`authorization.permissions.resourceSpecific` 必须包含频道读取/发送权限。

### 更新现有应用

要更新已安装的 Teams 应用（例如，添加 RSC 权限）：

1. 使用新设置更新您的 `manifest.json`
2. **增加 `version` 字段的值**（例如，`1.0.0` → `1.1.0`）
3. **重新压缩**包含图标的清单 (`manifest.json`, `outline.png`, `color.png`)
4. 上传新的 zip 文件：
   - **选项 A (Teams 管理中心)：** Teams 管理中心 → Teams 应用 → 管理应用 → 找到您的应用 → 上传新版本
   - **选项 B (侧载)：** 在 Teams 中 → 应用 → 管理您的应用 → 上传自定义应用
5. **对于团队频道：** 在每个团队中重新安装应用，以使新权限生效
6. **完全退出并重新启动 Teams**（不仅仅是关闭窗口），以清除缓存的应用元数据

## 功能：仅 RSC 与 Graph 的对比

### 使用 **仅 Teams RSC**（已安装应用，无 Graph API 权限）

可行：

- 读取频道消息**文本**内容。
- 发送频道消息**文本**内容。
- 接收**个人 (DM)** 文件附件。

不可行：

- 频道/群组**图片或文件内容**（负载仅包含 HTML 存根）。
- 下载存储在 SharePoint/OneDrive 中的附件。
- 读取消息历史记录（实时 Webhook 事件之外）。

### 使用 **Teams RSC + Microsoft Graph 应用程序权限**

新增：

- 下载托管内容（粘贴到消息中的图片）。
- 下载存储在 SharePoint/OneDrive 中的文件附件。
- 通过 Graph 读取频道/聊天消息历史记录。

### RSC 与 Graph API 的对比

| 功能              | RSC 权限      | Graph API                           |
| ----------------------- | -------------------- | ----------------------------------- |
| **实时消息**  | 是 (通过 webhook)    | 否 (仅轮询)                   |
| **历史消息** | 否                   | 是 (可查询历史)             |
| **设置复杂度**    | 仅应用清单    | 需要管理员同意 + 令牌流 |
| **离线工作**       | 否 (必须运行) | 是 (随时查询)                 |

**总结：** RSC 用于实时监听；Graph API 用于历史访问。若要在离线时查看错过的消息，您需要具备 `ChannelMessage.Read.All` 的 Graph API（需要管理员同意）。

## Graph 启用的媒体和历史记录（频道所必需）

如果您需要**频道**中的图片/文件，或者想要获取**消息历史记录**，则必须启用 Microsoft Graph 权限并授予管理员同意。

1. 在 Entra ID (Azure AD) **应用注册** 中，添加 Microsoft Graph **应用程序权限**：
   - `ChannelMessage.Read.All`（频道附件 + 历史记录）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群组聊天）
2. 为租户 **授予管理员同意**。
3. 增加 Teams 应用 **清单版本**，重新上传，并在 Teams 中 **重新安装应用**。
4. **完全退出并重新启动 Teams** 以清除缓存的应用元数据。

**用户提及的额外权限：** 对于对话中的用户，用户 @提及 可直接使用。但是，如果您想要动态搜索并提及**不在当前对话中**的用户，请添加 `User.Read.All`（应用程序）权限并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 传递消息。如果处理时间过长（例如，LLM 响应缓慢），您可能会看到：

- 网关超时
- Teams 重试消息（导致重复）
- 回复丢失

OpenClaw 通过快速返回并主动发送回复来处理此问题，但非常慢的响应仍可能导致问题。

### 格式

Teams 的 Markdown 比 Slack 或 Discord 更受限：

- 基本格式有效：**粗体**，_斜体_，`code`，链接
- 复杂的 Markdown（表格、嵌套列表）可能无法正确呈现
- 支持用于投票和任意卡片发送的自适应卡片（见下文）

## 配置

关键设置（共享频道模式请参见 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用频道。
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`：机器人凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：配对）
- `channels.msteams.allowFrom`：私信允许列表（推荐使用 AAD 对象 ID）。当拥有 Graph 访问权限时，向导会在设置期间将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`：应急开关，用于重新启用可变的 UPN/显示名称匹配以及直接的团队/频道名称路由。
- `channels.msteams.textChunkLimit`：出站文本块大小。
- `channels.msteams.chunkMode`：在按长度分块之前，`length`（默认）或 `newline` 按空行（段落边界）分割。
- `channels.msteams.mediaAllowHosts`：入站附件主机的允许列表（默认为 Microsoft/Teams 域）。
- `channels.msteams.mediaAuthAllowHosts`：允许在媒体重试时附加 Authorization 标头的允许列表（默认为 Graph + Bot Framework 主机）。
- `channels.msteams.requireMention`：在频道/群组中要求 @提及（默认为 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（参见 [回复样式](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：每个团队的覆盖设置。
- `channels.msteams.teams.<teamId>.requireMention`：每个团队的覆盖设置。
- `channels.msteams.teams.<teamId>.tools`：默认的每个团队工具策略覆盖设置（`allow`/`deny`/`alsoAllow`），在缺少频道覆盖设置时使用。
- `channels.msteams.teams.<teamId>.toolsBySender`：默认的每个团队每个发送者工具策略覆盖设置（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：每个频道的覆盖设置。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：每个频道的覆盖设置。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：每个频道的工具策略覆盖设置（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：每个频道每个发送者的工具策略覆盖设置（支持 `"*"` 通配符）。
- `toolsBySender` 键应使用显式前缀：
  `id:`，`e164:`，`username:`，`name:`（旧的无前缀键仍然仅映射到 `id:`）。
- `channels.msteams.sharePointSiteId`：用于群组聊天/频道中文件上传的 SharePoint 站点 ID（请参阅[在群组聊天中发送文件](#sending-files-in-group-chats)）。

## 路由和会话

- 会话键遵循标准代理格式（参见 [/concepts/session](/zh/en/concepts/session)）：
  - 直接消息共享主会话（`agent:<agentId>:<mainKey>`）。
  - 频道/群组消息使用会话 ID：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：主题与帖子

Teams 最近在同一底层数据模型上引入了两种频道 UI 样式：

| 样式                    | 描述                                               | 推荐的 `replyStyle` |
| ------------------------ | --------------------------------------------------------- | ------------------------ |
| **Posts** (经典)      | 消息显示为带有下方主题回复的卡片 | `thread` (默认)       |
| **Threads** (类似 Slack) | 消息线性流动，更像 Slack                   | `top-level`              |

**问题：** Teams API 不公开频道使用的 UI 样式。如果您使用了错误的 `replyStyle`：

- 在 Threads 样式频道中使用 `thread` → 回复会显得嵌套别扭
- 在 Posts 样式频道中使用 `top-level` → 回复显示为单独的顶级帖子，而不是在主题内

**解决方案：** 根据频道的设置方式，按频道配置 `replyStyle`：

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

## 附件与图片

**当前限制：**

- **私信：** 图片和文件附件通过 Teams bot 文件 API 工作。
- **频道/群组：** 附件存储在 M365 存储 (SharePoint/OneDrive) 中。Webhook 负载仅包含 HTML 存根，而不包含实际的文件字节。**需要 Graph API 权限** 才能下载频道附件。

如果没有 Graph 权限，带有图像的频道消息将仅作为文本接收（机器人无法访问图像内容）。
默认情况下，OpenClaw 仅从 Microsoft/Teams 主机名下载媒体。使用 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任何主机）。
授权标头仅附加到 `channels.msteams.mediaAuthAllowHosts` 中的主机（默认为 Graph + Bot Framework 主机）。请保持此列表严格（避免多租户后缀）。

## 在群组聊天中发送文件

Bot 可以使用 FileConsentCard 流程（内置）在私信中发送文件。但是，**在群组聊天/频道中发送文件** 需要额外设置：

| 上下文                  | 文件发送方式                           | 所需设置                                    |
| ------------------------ | -------------------------------------------- | ----------------------------------------------- |
| **私信**                  | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                            |
| **群组聊天/频道** | 上传到 SharePoint → 分享链接            | 需要 `sharePointSiteId` + Graph 权限 |
| **图像（任何上下文）** | Base64 编码内联                        | 开箱即用                            |

### 为什么群聊需要 SharePoint

机器人没有个人 OneDrive 驱动器（`/me/drive` Graph API 端点不适用于应用程序身份）。为了在群组聊天/频道中发送文件，机器人会上传到 **SharePoint 站点** 并创建共享链接。

### 设置

1. 在 Entra ID (Azure AD) → 应用注册中 **添加 Graph API 权限**：
   - `Sites.ReadWrite.All` (Application) - 将文件上传到 SharePoint
   - `Chat.Read.All` (Application) - 可选，启用每用户共享链接

2. **授予管理员同意** (Grant admin consent) 于租户。

3. **获取您的 SharePoint 站点 ID**：

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **配置 OpenClaw**：

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

| 权限                              | 共享行为                                          |
| --------------------------------------- | --------------------------------------------------------- |
| 仅 `Sites.ReadWrite.All`              | 组织范围内共享链接（组织内的任何人都可以访问） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 每用户共享链接（仅聊天成员可以访问）      |

按用户共享更安全，因为只有聊天参与者可以访问该文件。如果缺少 `Chat.Read.All` 权限，机器人将回退到全组织共享。

### 回退行为

| 场景                                          | 结果                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| 群组聊天 + 文件 + 已配置 `sharePointSiteId`            | 上传到 SharePoint，发送共享链接            |
| 群组聊天 + 文件 + 无 `sharePointSiteId`         | 尝试 OneDrive 上传（可能会失败），仅发送文本 |
| 个人聊天 + 文件                              | FileConsentCard 流程（无需 SharePoint 即可工作）    |
| 任何上下文 + 图片                               | Base64 编码内联（无需 SharePoint 即可工作）   |

### 文件存储位置

上传的文件存储在配置的 SharePoint 站点的默认文档库中的 `/OpenClawShared/` 文件夹内。

## 投票

OpenClaw 将 Teams 投票作为自适应卡片发送（没有原生的 Teams 投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票由网关记录在 `~/.openclaw/msteams-polls.json` 中。
- 网关必须保持在线才能记录投票。
- 投票尚不会自动发布结果摘要（如需要，请检查存储文件）。

## 自适应卡片（任意）

使用 `message` 工具或 CLI 将任何自适应卡片 JSON 发送到 Teams 用户或对话。

`card` 参数接受一个自适应卡片 JSON 对象。当提供 `card` 时，消息文本是可选的。

**代理工具：**

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

有关卡片架构和示例，请参阅 [自适应卡片文档](https://adaptivecards.io/)。有关目标格式的详细信息，请参阅下面的 [目标格式](#target-formats)。

## 目标格式

MSTeams 目标使用前缀来区分用户和对话：

| 目标类型         | 格式                           | 示例                                             |
| ------------------- | -------------------------------- | --------------------------------------------------- |
| 用户（按 ID）        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| 用户（按名称）      | `user:<display-name>`            | `user:John Smith` (需要 Graph API)              |
| 群组/频道       | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| 群组/频道 (原始) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (如果包含 `@thread`) |

**CLI 示例：**

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

**Agent 工具示例：**

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

注意：如果没有 `user:` 前缀，名称默认解析为群组/团队。当通过显示名称指定目标人员时，请始终使用 `user:`。

## 主动消息

- 只有在用户交互**之后**，主动消息才可能发送，因为我们在那时存储对话引用。
- 关于 `dmPolicy` 和允许列表控制，请参阅 `/gateway/configuration`。

## 团队和频道 ID（常见陷阱）

Teams URL 中的 `groupId` 查询参数**不是**配置所用的团队 ID。请改为从 URL 路径中提取 ID：

**团队 URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**频道 URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**用于配置：**

- 团队 ID = `/team/` 之后的路径段（URL 解码后，例如 `19:Bk4j...@thread.tacv2`）
- 频道 ID = `/channel/` 之后的路径段（URL 解码后）
- **忽略** `groupId` 查询参数

## 私人频道

Bot 在私人频道中的支持有限：

| 功能                      | 标准频道 | 私有频道               |
| ---------------------------- | ----------------- | ---------------------- |
| Bot 安装             | 是               | 受限                |
| 实时消息 (webhook) | 是               | 可能无法工作           |
| RSC 权限              | 是               | 行为可能不同 |
| @提及                    | 是               | 如果 bot 可访问   |
| Graph API 历史            | 是               | 是 (需要权限) |

**如果私有频道无法工作，请尝试以下变通方法：**

1. 使用标准频道进行 bot 交互
2. 使用私信 - 用户始终可以直接向 bot 发送消息
3. 使用 Graph API 进行历史访问（需要 `ChannelMessage.Read.All`）

## 故障排除

### 常见问题

- **频道中不显示图片：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用，并完全退出/重新打开 Teams。
- **频道中无响应：** 默认需要提及；请设置 `channels.msteams.requireMention=false` 或按团队/频道进行配置。
- **版本不匹配 (Teams 仍显示旧清单)：** 移除并重新添加应用，然后完全退出 Teams 以刷新。
- **来自 webhook 的 401 Unauthorized (未经授权)：** 在没有 Azure JWT 的情况下手动测试时会出现这种情况 - 表示端点可达但身份验证失败。请使用 Azure Web Chat 进行正确测试。

### 清单上传错误

- **“Icon file cannot be empty”：** 清单引用的图标文件大小为 0 字节。请创建有效的 PNG 图标（`outline.png` 为 32x32，`color.png` 为 192x192）。
- **“webApplicationInfo.Id already in use” (webApplicationInfo.Id 已被使用)：** 该应用仍安装在其他团队/聊天中。先找到并卸载它，或者等待 5-10 分钟以完成传播。
- **上传时出现“Something went wrong”：** 请改通过 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发人员工具 (F12) → Network 选项卡，并检查响应正文以获取实际错误。
- **侧载失败：** 尝试“Upload an app to your org's app catalog” (将应用上传到组织的应用目录)，而不是“Upload a custom app” (上传自定义应用) - 这通常可以绕过侧载限制。

### RSC 权限不起作用

1. 验证 `webApplicationInfo.id` 是否与机器人的应用 ID 完全匹配
2. 重新上传应用并在团队/聊天中重新安装
3. 检查您的组织管理员是否阻止了 RSC 权限
4. 确认您使用的是正确的范围：团队使用 `ChannelMessage.Read.Group`，群组聊天使用 `ChatMessage.Read.Chat`

## 参考

- [创建 Azure 机器人](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure 机器人设置指南
- [Teams 开发者门户](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams 应用清单架构](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [使用 RSC 接收频道消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 机器人文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群组需要 Graph）
- [主动消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

import zh from '/components/footer/zh.mdx';

<zh />
