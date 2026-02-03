---
summary: "Microsoft Teams bot 支持状态、能力与配置"
read_when:
  - 开发 MS Teams 渠道功能
title: "Microsoft Teams"
---

# Microsoft Teams（插件）

> "Abandon all hope, ye who enter here."

更新：2026-01-21

状态：支持文本 + DM 附件；频道/群聊发送文件需要 `sharePointSiteId` + Graph 权限（见 [群聊发送文件](#群聊发送文件)）。投票通过 Adaptive Cards 发送。

## 需要插件

Microsoft Teams 为插件形式，未随核心安装打包。

**破坏性变更（2026.1.15）：** MS Teams 已移出 core。如需使用，必须安装插件。

原因：减轻 core 安装体积，并让 MS Teams 依赖独立更新。

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/msteams
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/msteams
```

若在配置/上手流程中选择 Teams 且检测到 git 检出，OpenClaw 会自动提供本地安装路径。

详情：[Plugins](/zh/plugin)

## 快速设置（新手）

1. 安装 Microsoft Teams 插件。
2. 创建 **Azure Bot**（App ID + client secret + tenant ID）。
3. 使用这些凭据配置 OpenClaw。
4. 通过公网 URL 或隧道暴露 `/api/messages`（默认端口 3978）。
5. 安装 Teams 应用包并启动 gateway。

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

注意：群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。要允许群聊回复，请设置 `channels.msteams.groupAllowFrom`（或用 `groupPolicy: "open"` 允许所有成员，仍默认提及门控）。

## 目标

- 通过 Teams 私聊、群聊或频道与 OpenClaw 对话。
- 保持路由确定性：回复始终回到消息来源频道。
- 默认使用安全的频道行为（除非配置，否则需要提及）。

## 配置写入

默认允许 Microsoft Teams 触发 `/config set|unset` 写入配置（需 `commands.config: true`）。

禁用：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私聊 + 群聊）

**私聊访问**

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发送者未批准前会被忽略。
- `channels.msteams.allowFrom` 接受 AAD 对象 ID、UPN 或显示名。向导在 Graph 权限允许时会将名称解析为 ID。

**群聊访问**

- 默认：`channels.msteams.groupPolicy = "allowlist"`（除非设置 `groupAllowFrom` 否则阻止）。未设置时可用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制群聊/频道中哪些发送者可触发（回退到 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 允许任何成员（默认仍为提及门控）。
- 若要**禁止所有频道**，设置 `channels.msteams.groupPolicy: "disabled"`。

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

**Teams + 频道 allowlist**

- 使用 `channels.msteams.teams` 列出团队与频道范围。
- 键可为 team ID 或名称；频道键可为 conversation ID 或名称。
- 当 `groupPolicy="allowlist"` 且存在 teams allowlist 时，仅允许列出的团队/频道（提及门控）。
- 配置向导接受 `Team/Channel`，并为你保存。
- 启动时，OpenClaw 会在 Graph 权限允许时将团队/频道与用户 allowlist 名称解析为 ID 并记录映射；无法解析的条目保留原样。

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
2. 创建 **Azure Bot**（App ID + secret + tenant ID）。
3. 构建**Teams 应用包**，引用该 bot，并包含下面的 RSC 权限。
4. 将 Teams 应用上传/安装到团队（或个人范围用于私聊）。
5. 在 `~/.openclaw/openclaw.json` 中配置 `msteams`（或使用环境变量），并启动 gateway。
6. gateway 默认监听 `/api/messages` 的 Bot Framework webhook 流量。

## Azure Bot 设置（前置条件）

在配置 OpenClaw 之前，你需要创建 Azure Bot 资源。

### 步骤 1：创建 Azure Bot

1. 前往 [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **Basics** 选项卡：

   | 字段               | 值                                               |
   | ------------------ | ------------------------------------------------ |
   | **Bot handle**     | 你的 bot 名称，如 `openclaw-msteams`（必须唯一） |
   | **Subscription**   | 选择 Azure 订阅                                  |
   | **Resource group** | 新建或使用已有                                   |
   | **Pricing tier**   | **Free**（dev/testing）                          |
   | **Type of App**    | **Single Tenant**（推荐，见下面说明）            |
   | **Creation type**  | **Create new Microsoft App ID**                  |

> **弃用提示：** 2025-07-31 后已弃用新建多租户 bot。新 bot 请使用 **Single Tenant**。

3. 点击 **Review + create** → **Create**（等待约 1-2 分钟）

### 步骤 2：获取凭据

1. 进入 Azure Bot 资源 → **Configuration**
2. 复制 **Microsoft App ID** → 即 `appId`
3. 点击 **Manage Password** → 跳转到 App Registration
4. 在 **Certificates & secrets** → **New client secret** → 复制 **Value** → 即 `appPassword`
5. 进入 **Overview** → 复制 **Directory (tenant) ID** → 即 `tenantId`

### 步骤 3：配置 Messaging Endpoint

1. 在 Azure Bot → **Configuration**
2. 设置 **Messaging endpoint** 为你的 webhook URL：
   - 生产：`https://your-domain.com/api/messages`
   - 本地开发：使用隧道（见下文 [本地开发](#本地开发隧道)）

### 步骤 4：启用 Teams 渠道

1. Azure Bot → **Channels**
2. 点击 **Microsoft Teams** → Configure → Save
3. 接受服务条款

## 本地开发（隧道）

Teams 无法访问 `localhost`。本地开发需使用隧道：

**选项 A：ngrok**

```bash
ngrok http 3978
# 复制 https URL，例如 https://abc123.ngrok.io
# 将 messaging endpoint 设为：https://abc123.ngrok.io/api/messages
```

**选项 B：Tailscale Funnel**

```bash
tailscale funnel 3978
# 使用你的 Tailscale funnel URL 作为 messaging endpoint
```

## Teams Developer Portal（替代方案）

你也可以使用 [Teams Developer Portal](https://dev.teams.microsoft.com/apps) 而不是手动创建 manifest ZIP：

1. 点击 **+ New app**
2. 填写基本信息（名称、描述、开发者信息）
3. 进入 **App features** → **Bot**
4. 选择 **Enter a bot ID manually** 并粘贴你的 Azure Bot App ID
5. 勾选 scopes：**Personal**、**Team**、**Group Chat**
6. 点击 **Distribute** → **Download app package**
7. 在 Teams：**Apps** → **Manage your apps** → **Upload a custom app** → 选择 ZIP

这通常比手动编辑 JSON manifest 更简单。

## 测试 bot

**选项 A：Azure Web Chat（先验证 webhook）**

1. Azure Portal → 你的 Azure Bot 资源 → **Test in Web Chat**
2. 发送消息，应收到响应
3. 这能在 Teams 设置前确认 webhook 端点可用

**选项 B：Teams（安装应用后）**

1. 安装 Teams 应用（侧载或组织目录）
2. 在 Teams 找到 bot 并发送 DM
3. 查看 gateway 日志中的入站 activity

## 设置（最小文本版）

1. **安装 Microsoft Teams 插件**
   - npm：`openclaw plugins install @openclaw/msteams`
   - 本地检出：`openclaw plugins install ./extensions/msteams`

2. **Bot 注册**
   - 创建 Azure Bot（见上文），并记录：
     - App ID
     - Client secret（App password）
     - Tenant ID（single-tenant）

3. **Teams 应用 manifest**
   - 包含 `bot` 条目，`botId = <App ID>`。
   - Scopes：`personal`、`team`、`groupChat`。
   - `supportsFiles: true`（个人范围文件处理所需）。
   - 添加 RSC 权限（见下文）。
   - 创建图标：`outline.png`（32x32）与 `color.png`（192x192）。
   - 将三者打包为 ZIP：`manifest.json`、`outline.png`、`color.png`。

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

   也可以使用环境变量：
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Bot endpoint**
   - 将 Azure Bot Messaging Endpoint 设置为：
     - `https://<host>:3978/api/messages`（或你选择的路径/端口）。

6. **运行 gateway**
   - 安装插件且 `msteams` 配置包含凭据时，Teams 渠道会自动启动。

## 历史上下文

- `channels.msteams.historyLimit` 控制将多少最近频道/群消息包装进提示。
- 回退到 `messages.groupChat.historyLimit`。设为 `0` 关闭（默认 50）。
- 私聊历史可用 `channels.msteams.dmHistoryLimit` 限制（用户 turn）。每用户覆盖：`channels.msteams.dms["<user_id>"].historyLimit`。

## 当前 Teams RSC 权限（Manifest）

这是 Teams 应用 manifest 中**已有**的 resourceSpecific 权限，仅在安装的 team/chat 内生效。

**频道（team scope）：**

- `ChannelMessage.Read.Group`（Application）- 无需 @mention 即接收所有频道消息
- `ChannelMessage.Send.Group`（Application）
- `Member.Read.Group`（Application）
- `Owner.Read.Group`（Application）
- `ChannelSettings.Read.Group`（Application）
- `TeamMember.Read.Group`（Application）
- `TeamSettings.Read.Group`（Application）

**群聊：**

- `ChatMessage.Read.Chat`（Application）- 无需 @mention 即接收所有群聊消息

## 示例 Teams Manifest（已脱敏）

最小可用示例，包含必需字段。替换 ID 与 URL。

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

### Manifest 注意事项（必填字段）

- `bots[].botId` **必须**与 Azure Bot App ID 一致。
- `webApplicationInfo.id` **必须**与 Azure Bot App ID 一致。
- `bots[].scopes` 必须包含要使用的范围（`personal`、`team`、`groupChat`）。
- `bots[].supportsFiles: true` 为个人范围文件处理所需。
- `authorization.permissions.resourceSpecific` 必须包含频道读/写权限（若需频道流量）。

### 更新已有应用

若要更新已安装的 Teams 应用（例如新增 RSC 权限）：

1. 更新 `manifest.json`
2. **递增 `version` 字段**（如 `1.0.0` → `1.1.0`）
3. **重新打包** manifest 与图标（`manifest.json`、`outline.png`、`color.png`）
4. 上传新 zip：
   - **选项 A（Teams Admin Center）：** Teams Admin Center → Teams apps → Manage apps → 找到应用 → Upload new version
   - **选项 B（侧载）：** Teams → Apps → Manage your apps → Upload a custom app
5. **团队频道：** 在每个 team 中重新安装应用以使新权限生效
6. **彻底退出并重启 Teams**（不仅仅是关闭窗口）以清除缓存的应用元数据

## 能力：仅 RSC vs Graph

### 仅 **Teams RSC**（安装应用，无 Graph API 权限）

可用：

- 读取频道消息**文本**。
- 发送频道消息**文本**。
- 接收**个人（DM）**文件附件。

不可用：

- 频道/群聊**图片或文件内容**（payload 仅包含 HTML stub）。
- 下载存储在 SharePoint/OneDrive 的附件。
- 读取历史消息（仅实时 webhook）。

### **Teams RSC + Microsoft Graph 应用权限**

增加：

- 下载托管内容（消息中粘贴的图片）。
- 下载存储在 SharePoint/OneDrive 的文件附件。
- 通过 Graph 读取频道/聊天历史。

### RSC vs Graph API

| 能力           | RSC 权限         | Graph API                   |
| -------------- | ---------------- | --------------------------- |
| **实时消息**   | Yes（webhook）   | No（仅轮询）                |
| **历史消息**   | No               | Yes（可查询历史）           |
| **设置复杂度** | 仅应用 manifest  | 需要管理员同意 + token 流程 |
| **离线可用**   | No（必须运行中） | Yes（随时查询）             |

**结论：** RSC 适合实时监听；Graph API 适合历史访问。若需要离线补拉消息，必须使用 Graph API 并授予 `ChannelMessage.Read.All`（需管理员同意）。

## Graph 启用的媒体 + 历史（频道必需）

若需在**频道**中获取图片/文件或拉取**历史消息**，必须启用 Microsoft Graph 权限并获得管理员同意。

1. 在 Entra ID（Azure AD）**App Registration** 中添加 Microsoft Graph **Application permissions**：
   - `ChannelMessage.Read.All`（频道附件 + 历史）
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群聊）
2. **授予管理员同意**。
3. 提升 Teams 应用 **manifest 版本**，重新上传，并**在 Teams 中重新安装应用**。
4. **彻底退出并重启 Teams** 以清除缓存的应用元数据。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 投递消息。若处理过慢（如 LLM 过慢），你可能看到：

- Gateway 超时
- Teams 重试消息（导致重复）
- 回复丢失

OpenClaw 会快速返回并主动发送回复，但响应过慢仍可能导致问题。

### 格式

Teams 的 Markdown 支持比 Slack/Discord 更有限：

- 基础格式可用：**bold**、_italic_、`code`、链接
- 复杂 Markdown（表格、嵌套列表）可能无法正确渲染
- Adaptive Cards 支持用于投票与任意卡片发送（见下文）

## 配置

关键设置（共享模式见 `/gateway/configuration`）：

- `channels.msteams.enabled`：启用/禁用渠道。
- `channels.msteams.appId`、`channels.msteams.appPassword`、`channels.msteams.tenantId`：bot 凭据。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`：DM allowlist（AAD 对象 ID、UPN 或显示名）。向导在 Graph 可用时解析名称为 ID。
- `channels.msteams.textChunkLimit`：出站文本分块大小。
- `channels.msteams.chunkMode`：`length`（默认）或 `newline`（按空行分段再分块）。
- `channels.msteams.mediaAllowHosts`：入站附件主机 allowlist（默认微软/Teams 域名）。
- `channels.msteams.requireMention`：频道/群聊要求 @mention（默认 true）。
- `channels.msteams.replyStyle`：`thread | top-level`（见 [Reply Style](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`：按 team 覆盖。
- `channels.msteams.teams.<teamId>.requireMention`：按 team 覆盖。
- `channels.msteams.teams.<teamId>.tools`：按 team 的默认工具策略覆盖（`allow`/`deny`/`alsoAllow`），在缺少频道覆盖时生效。
- `channels.msteams.teams.<teamId>.toolsBySender`：按 team 的发送者工具策略覆盖（支持 `"*"` 通配）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`：按频道覆盖。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`：按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`：按频道发送者工具策略覆盖（支持 `"*"` 通配）。
- `channels.msteams.sharePointSiteId`：群聊/频道文件上传的 SharePoint site ID（见 [群聊发送文件](#群聊发送文件)）。

## 路由与会话

- 会话 key 遵循标准 agent 格式（见 [/concepts/session](/zh/concepts/session)）：
  - 私聊共享主会话（`agent:<agentId>:<mainKey>`）。
  - 频道/群聊使用 conversation id：
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复样式：Threads vs Posts

Teams 最近在同一数据模型上引入两种频道 UI 样式：

| 样式                    | 描述                               | 推荐 `replyStyle` |
| ----------------------- | ---------------------------------- | ----------------- |
| **Posts**（经典）       | 消息以卡片呈现，回复以线程形式显示 | `thread`（默认）  |
| **Threads**（类 Slack） | 消息线性流式显示，类似 Slack       | `top-level`       |

**问题：** Teams API 不暴露频道使用的 UI 样式。若 `replyStyle` 设置错误：

- 线程式频道用 `thread` → 回复会尴尬地嵌套
- Posts 频道用 `top-level` → 回复会成为新的顶层贴文

**解决方案：** 根据频道实际样式按频道配置 `replyStyle`：

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

- **DMs：** 通过 Teams bot 文件 API 支持图片与文件附件。
- **频道/群聊：** 附件存储在 M365（SharePoint/OneDrive）。Webhook payload 仅包含 HTML stub，不含文件字节。**需 Graph API 权限** 才能下载频道附件。

没有 Graph 权限时，带图片的频道消息会以纯文本形式接收（bot 无法获取图片内容）。
默认仅下载来自 Microsoft/Teams 域名的媒体。可用 `channels.msteams.mediaAllowHosts` 覆盖（`["*"]` 允许任意主机）。

## 群聊发送文件

Bot 可通过内置 FileConsentCard 流程在 DMs 发送文件。但**群聊/频道发送文件**需要额外配置：

| 场景                 | 文件发送方式                          | 所需设置                             |
| -------------------- | ------------------------------------- | ------------------------------------ |
| **DMs**              | FileConsentCard → 用户接受 → bot 上传 | 开箱即用                             |
| **群聊/频道**        | 上传到 SharePoint → 发送分享链接      | 需要 `sharePointSiteId` + Graph 权限 |
| **图片（任意场景）** | Base64 内嵌                           | 开箱即用                             |

### 为什么群聊需要 SharePoint

Bot 没有个人 OneDrive（`/me/drive` Graph API 对应用身份不可用）。因此在群聊/频道发送文件时，bot 会上传到 **SharePoint site** 并生成分享链接。

### 设置

1. 在 Entra ID（Azure AD）→ App Registration 添加 Graph **Application permissions**：
   - `Sites.ReadWrite.All`（Application）- 上传到 SharePoint
   - `Chat.Read.All`（Application）- 可选，启用按用户分享链接

2. **授予管理员同意**。

3. **获取 SharePoint site ID：**

   ```bash
   # 通过 Graph Explorer 或 curl（需有效 token）：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：站点 "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应包含："id": "contoso.sharepoint.com,guid1,guid2"
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

### 分享行为

| 权限                                    | 分享行为                               |
| --------------------------------------- | -------------------------------------- |
| 仅 `Sites.ReadWrite.All`                | 组织范围分享链接（组织内任何人可访问） |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 按用户分享链接（仅聊天成员可访问）     |

按用户分享更安全，因为只有聊天参与者可访问文件。若缺少 `Chat.Read.All`，bot 会回退到组织范围分享。

### 回退行为

| 场景                                    | 结果                                       |
| --------------------------------------- | ------------------------------------------ |
| 群聊 + 文件 + 配置 `sharePointSiteId`   | 上传到 SharePoint，发送分享链接            |
| 群聊 + 文件 + 未配置 `sharePointSiteId` | 尝试 OneDrive 上传（可能失败），仅发送文本 |
| 私聊 + 文件                             | FileConsentCard 流程（无需 SharePoint）    |
| 任意场景 + 图片                         | Base64 内嵌（无需 SharePoint）             |

### 文件存储位置

上传的文件存放在配置的 SharePoint 站点默认文档库的 `/OpenClawShared/` 文件夹中。

## 投票（Adaptive Cards）

OpenClaw 通过 Adaptive Cards 发送 Teams 投票（Teams 无原生投票 API）。

- CLI：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票记录由 gateway 写入 `~/.openclaw/msteams-polls.json`。
- gateway 需保持在线才能记录投票。
- 投票结果尚不会自动汇总（可查看存储文件）。

## Adaptive Cards（自定义）

使用 `message` 工具或 CLI 向 Teams 用户/会话发送任意 Adaptive Card JSON。

`card` 参数接受 Adaptive Card JSON 对象。提供 `card` 时，文本可选。

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

Adaptive Card 规范与示例见 [Adaptive Cards documentation](https://adaptivecards.io/)。目标格式详情见下文 [Target formats](#target-formats)。

## Target formats

MSTeams 目标使用前缀区分用户与会话：

| 目标类型          | 格式                             | 示例                                             |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| 用户（ID）        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`      |
| 用户（名称）      | `user:<display-name>`            | `user:John Smith`（需要 Graph API）              |
| 群聊/频道         | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`         |
| 群聊/频道（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2`（包含 `@thread` 时） |

**CLI 示例：**

```bash
# 发送到用户（ID）
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# 发送到用户（名称，触发 Graph API 查找）
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# 发送到群聊或频道
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# 向会话发送 Adaptive Card
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

注意：不带 `user:` 前缀时，名称会默认走群组/团队解析。对显示名投递请始终使用 `user:`。

## 主动消息

- 只有在用户先交互后才可**主动**发送，因为我们会在那时存储会话引用。
- `dmPolicy` 与 allowlist 门控见 `/gateway/configuration`。

## Team 与 Channel IDs（常见坑）

Teams URL 中的 `groupId` 查询参数**不是**用于配置的 team ID。应从 URL 路径提取 ID：

**Team URL：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID（URL 解码）
```

**Channel URL：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID（URL 解码）
```

**用于配置：**

- Team ID = `/team/` 之后的路径段（URL 解码，如 `19:Bk4j...@thread.tacv2`）
- Channel ID = `/channel/` 之后的路径段（URL 解码）
- **忽略** `groupId` 查询参数

## 私有频道

私有频道对 bot 的支持有限：

| 功能                | 标准频道 | 私有频道        |
| ------------------- | -------- | --------------- |
| Bot 安装            | Yes      | Limited         |
| 实时消息（webhook） | Yes      | 可能不可用      |
| RSC 权限            | Yes      | 可能行为不同    |
| @mentions           | Yes      | 若 bot 可访问   |
| Graph API 历史      | Yes      | Yes（有权限时） |

**私有频道不可用的替代方案：**

1. 在标准频道与 bot 交互
2. 使用 DM（用户始终可私聊 bot）
3. 通过 Graph API 访问历史（需 `ChannelMessage.Read.All`）

## 故障排查

### 常见问题

- **频道中图片不显示：** 缺少 Graph 权限或管理员同意。重新安装 Teams 应用并彻底退出/重开 Teams。
- **频道无响应：** 默认需要提及；设 `channels.msteams.requireMention=false` 或按 team/channel 配置。
- **版本不匹配（Teams 仍显示旧 manifest）：** 移除并重新添加应用，彻底退出 Teams 以刷新。
- **Webhook 返回 401 Unauthorized：** 手动测试未携带 Azure JWT 时的正常表现，说明端点可达但鉴权失败。使用 Azure Web Chat 正确测试。

### Manifest 上传错误

- **"Icon file cannot be empty":** manifest 引用的 icon 文件为 0 字节。请创建有效 PNG（`outline.png` 32x32，`color.png` 192x192）。
- **"webApplicationInfo.Id already in use":** 应用仍安装在其他 team/chat。先卸载，或等待 5-10 分钟传播完成。
- **"Something went wrong" 上传失败：** 改用 https://admin.teams.microsoft.com 上传，打开浏览器 DevTools（F12）→ Network，查看响应体的具体错误。
- **Sideload failing：** 试试“Upload an app to your org's app catalog”，通常可绕过侧载限制。

### RSC 权限不生效

1. 确认 `webApplicationInfo.id` 与 bot App ID 完全一致
2. 重新上传应用并在 team/chat 中重新安装
3. 检查组织管理员是否禁用了 RSC 权限
4. 确认 scope 是否正确：团队用 `ChannelMessage.Read.Group`，群聊用 `ChatMessage.Read.Chat`

## 参考

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Azure Bot 设置指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - 创建/管理 Teams 应用
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群聊需 Graph）
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
