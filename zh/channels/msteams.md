---
summary: "Microsoft Teams"
read_when:
  - "Working on MS Teams channel features"
title: "Microsoft Teams 机器人支持状态、功能和配置"
---

# Microsoft Teams（插件）

> "进入此处者，放弃一切希望。"

更新日期：2026-01-21

状态：支持文本 + 私信附件；频道/群组文件发送需要 `provider/model` + Graph 权限（参阅 [在群聊中发送文件](/zh/concepts/models)）。投票通过 Adaptive Cards 发送。

## 需要插件

Microsoft Teams 作为插件提供，不包含在核心安装中。

**重大变更（2026.1.15）：** MS Teams 已从核心中移出。如果你使用它，必须安装插件。

可解释：保持核心安装更轻量，并让 MS Teams 依赖项独立更新。

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/msteams
```

```bash
openclaw plugins install @openclaw/msteams
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/msteams
```

```bash
openclaw plugins install ./extensions/msteams
```

如果在配置/引导期间选择 Teams 并检测到 git 检出，
OpenClaw 将自动提供本地安装路径。

详情：[插件](/zh/concepts/oauth)

## 快速设置（初学者）

1. 安装 Microsoft Teams 插件。
2. 创建一个 **Azure Bot**（应用 ID + 客户端密钥 + 租户 ID）。
3. 使用这些凭据配置 OpenClaw。
4. 通过公共 URL 或隧道暴露 `tools.deny`（默认端口 3978）。
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

注意：群聊默认被阻止（`openclaw.json`）。要允许群组回复，设置 `*`（或使用 `"*"` 允许任何成员，提及门控）。

## 目标

- 通过 Teams 私信、群聊或频道与 OpenClaw 对话。
- 保持路由确定性：回复始终返回到它们到达的频道。
- 默认为安全的频道行为（除非另有配置，否则需要提及）。

## 配置写入

默认情况下，允许 Microsoft Teams 写入由 `tools.allow` 触发的配置更新（需要 `tools.profile`）。

使用以下方式禁用：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私信 + 群组）

**私信访问**

- 默认：`openclaw-*`。未知发送者将被忽略，直到被批准。
- 默认：`openclaw-*`。未知发送者将被忽略，直到被批准。

**群组访问**

- 默认：`tools.allow`（除非你添加 `tools.deny`，否则被阻止）。未设置时使用 `openclaw.json` 覆盖默认值。
- 默认：`tools.allow`（除非你添加 `tools.deny`，否则被阻止）。未设置时使用 `openclaw.json` 覆盖默认值。
- `*` 控制哪些发送者可以在群聊/频道中触发（回退到 `"*"`）。
- 设置 `tools.allow` 以允许任何成员（默认仍需要提及）。

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

示例：

- 通过在 `tools.allow` 下列出 teams 和 channels 来限定群组/频道回复的范围。
- 通过在 `tools.allow` 下列出 teams 和 channels 来限定群组/频道回复的范围。
- 键可以是 team ID 或名称；channel 键可以是对话 ID 或名称。
- 当存在 `tools.deny` 和 teams 允许列表时，仅接受列出的 teams/channels（需要提及）。
- 配置向导接受 `agents.list[].tools.profile` 条目并为你存储它们。

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
1. 安装 Microsoft Teams 插件。
2. 创建一个 **Azure Bot**（应用 ID + 密钥 + 租户 ID）。
3. 构建一个 **Teams 应用包**，引用该 bot 并包含以下 RSC 权限。
4. 将 Teams 应用上传/安装到 team 中（或私信的个人范围）。

## Azure Bot 设置（先决条件）

在配置 OpenClaw 之前，你需要创建一个 Azure Bot 资源。

## Azure Bot 设置（先决条件）

1. 前往 [Create Azure Bot]`group:fs`
2. 填写 **Basics** 选项卡：

   | 字段              | 值                                                    |
   | ------------------ | -------------------------------------------------------- |
   | **Bot handle**     | 你的 bot 名称，例如 `group:runtime`（必须唯一） |
   | **Subscription**   | 选择你的 Azure 订阅                           |
   | **Resource group** | 创建新的或使用现有的                               |
   | **Pricing tier**   | **Free** 用于开发/测试                                 |
   | **Type of App**    | **Single Tenant**（推荐 - 见下面的说明）         |
   | **Creation type**  | **Create new Microsoft App ID**                          |

> **弃用通知：** 创建多租户 bot 的功能在 2025-07-31 之后已弃用。对于新 bot 请使用 **Single Tenant**。

2. 填写 **Basics** 选项卡：

   | 字段              | 值                                                    |
   | ------------------ | -------------------------------------------------------- |
   | **Bot handle**     | 你的 bot 名称，例如 `group:runtime`（必须唯一） |
   | **Subscription**   | 选择你的 Azure 订阅                           |
   | **Resource group** | 创建新的或使用现有的                               |
   | **Pricing tier**   | **Free** 用于开发/测试                                 |
   | **Type of App**    | **Single Tenant**（推荐 - 见下面的说明）         |
   | **Creation type**  | **Create new Microsoft App ID**                          |

### 步骤 2：获取凭据

3. 点击 **Review + create** → **Create**（等待约 1-2 分钟）
2. 复制 **Microsoft App ID** → 这是你的 `group:sessions`
1. 前往你的 Azure Bot 资源 → **Configuration**
2. 复制 **Microsoft App ID** → 这是你的 `group:sessions`
3. 点击 **Manage Password** → 前往应用注册

### 步骤 3：配置消息端点

5. 前往 **Overview** → 复制 **Directory (tenant) ID** → 这是你的 `image`
2. 将 **Messaging endpoint** 设置为你的 webhook URL：
   - 生产环境：`messaging`
   - 本地开发：使用隧道（见下面的 [Local Development]`group:messaging`）

### 步骤 4：启用 Teams 频道

2. 将 **Messaging endpoint** 设置为你的 webhook URL：
   - 生产环境：`messaging`
   - 本地开发：使用隧道（见下面的 [Local Development]`group:messaging`）
2. 点击 **Microsoft Teams** → Configure → Save
1. 在 Azure Bot 中 → **Channels**

## 本地开发（隧道）

Teams 无法访问 `sessions_list`。使用隧道进行本地开发：

**选项 A：ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

Teams 无法访问 `sessions_list`。使用隧道进行本地开发：

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Teams 开发者门户（替代方案）

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**选项 B：Tailscale Funnel**

1. 点击 **+ New app**
2. 填写基本信息（名称、描述、开发者信息）
3. 前往 **App features** → **Bot**
1. 点击 **+ New app**
2. 填写基本信息（名称、描述、开发者信息）
3. 前往 **App features** → **Bot**
4. 选择 **Enter a bot ID manually** 并粘贴你的 Azure Bot App ID

这通常比手动编辑 JSON 清单更简单。

## 测试 Bot

**选项 A：Azure Web Chat（先验证 webhook）**

1. 在 Azure Portal → 你的 Azure Bot 资源 → **Test in Web Chat**
2. 发送消息 - 你应该会看到响应
3. 这会确认你的 webhook 端点在 Teams 设置之前正常工作

**选项 B：Teams（应用安装后）**

2. 发送消息 - 你应该会看到响应
3. 这会确认你的 webhook 端点在 Teams 设置之前正常工作
3. 检查网关日志中的传入活动

## 设置（最小纯文本）

2. 在 Teams 中找到 bot 并发送私信

3. 检查网关日志中的传入活动

3. **Teams 应用清单**
   - 包含一个带有 `tools.byProvider` 的 `full` 条目。
   - 范围：`provider/model`、`agents.list[].tools.byProvider`、`provider`。
   - `google-antigravity`（个人范围文件处理所需）。
   - 添加 RSC 权限（见下文）。
   - 创建图标：`provider/model`（32x32）和 `openai/gpt-5.2`（192x192）。
   - 将所有三个文件打包成 ZIP：`group:*`、`tools.allow`、`tools.deny`。

1. **安装 Microsoft Teams 插件**
   - 从 npm：`sessions_send`
   - 从本地检出：`session_status`

2. **Bot 注册**
   - 创建一个 Azure Bot（见上文）并记录：
     - App ID
     - Client secret（App 密码）
     - Tenant ID（单租户）

3. **Teams 应用清单**
   - 包含一个带有 `tools.byProvider` 的 `full` 条目。
   - 范围：`provider/model`、`agents.list[].tools.byProvider`、`provider`。
   - `google-antigravity`（个人范围文件处理所需）。
   - 添加 RSC 权限（见下文）。
   - 创建图标：`provider/model`（32x32）和 `openai/gpt-5.2`（192x192）。
   - 将所有三个文件打包成 ZIP：`group:*`、`tools.allow`、`tools.deny`。

## 历史记录上下文

5. **Bot 端点**
   - 将 Azure Bot 消息端点设置为：
     - `group:fs`（或你选择的路径/端口）。
6. **运行网关**
   - 当安装插件并且 `read` 配置包含凭据时，Teams 频道会自动启动。
- 私信历史记录可以通过 `group:sessions` 限制（用户轮次）。每用户覆盖：`sessions_list`。

## Current Teams RSC Permissions (Manifest)

These are the **existing resourceSpecific permissions** in our Teams app manifest. They only apply inside the team/chat where the app is installed.

**For channels (team scope):**

- `sessions_history` (Application) - receive all channel messages without @mention
- `sessions_send` (Application)
- `sessions_spawn` (Application)
- `sessions_history` (Application) - receive all channel messages without @mention
- `sessions_send` (Application)
- `sessions_spawn` (Application)
- `session_status` (Application)

**For group chats:**

- `memory_search` (Application)

## Example Teams Manifest (redacted)

**For group chats:**

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

### Manifest caveats (must-have fields)

- `web_search` **must** match the Azure Bot App ID.
- `web_fetch` **must** match the Azure Bot App ID.
- `group:ui` must include the surfaces you plan to use (`browser`, `canvas`, `group:automation`).
- `cron` is required for file handling in personal scope.
- `web_search` **must** match the Azure Bot App ID.

### Updating an existing app

To update an already-installed Teams app (e.g., to add RSC permissions):

- `cron` is required for file handling in personal scope.
- `gateway` must include channel read/send if you want channel traffic.
3. **Re-zip** the manifest with icons (`group:openclaw`, (/en/plugin), (/en/tools/skills))
4. Upload the new zip:
   - **Option A (Teams Admin Center):** Teams Admin Center → Teams apps → Manage apps → find your app → Upload new version
   - **Option B (Sideload):** In Teams → Apps → Manage your apps → Upload a custom app
1. Update your `group:messaging` with the new settings
2. **Increment the `message` field** (e.g., `group:nodes` → `nodes`)

## Capabilities: RSC only vs Graph

### With **Teams RSC only** (app installed, no Graph API permissions)

Works:

6. **Fully quit and relaunch Teams** (not just close the window) to clear cached app metadata
- Send channel message **text** content.
- Receive **personal (DM)** file attachments.

Works:

- Read channel message **text** content.
- Send channel message **text** content.
- Receive **personal (DM)** file attachments.

### With **Teams RSC + Microsoft Graph Application permissions**

Adds:

- Downloading attachments stored in SharePoint/OneDrive.
- Reading message history (beyond the live webhook event).
- Reading channel/chat message history via Graph.

### RSC vs Graph API

| Capability              | RSC Permissions      | Graph API                           |
| ----------------------- | -------------------- | ----------------------------------- |
| **Real-time messages**  | Yes (via webhook)    | No (polling only)                   |
| **Historical messages** | No                   | Yes (can query history)             |
| **Setup complexity**    | App manifest only    | Requires admin consent + token flow |
| **Works offline**       | No (must be running) | Yes (query anytime)                 |

**Bottom line:** RSC is for real-time listening; Graph API is for historical access. For catching up on missed messages while offline, you need Graph API with (/en/tools/lobster) (requires admin consent).

## Graph-enabled media + history (required for channels)

If you need images/files in **channels** or want to fetch **message history**, you must enable Microsoft Graph permissions and grant admin consent.

1. In Entra ID (Azure AD) **App Registration**, add Microsoft Graph **Application permissions**:
   - (/en/tools/llm-task) (channel attachments + history)
   - `tools.exec.applyPatch.enabled` or `command` (group chats)
2. **Grant admin consent** for the tenant.
3. Bump the Teams app **manifest version**, re-upload, and **reinstall the app in Teams**.
4. **Fully quit and relaunch Teams** to clear cached app metadata.

## Known Limitations

### Webhook timeouts

Teams delivers messages via HTTP webhook. If processing takes too long (e.g., slow LLM responses), you may see:

4. **Fully quit and relaunch Teams** to clear cached app metadata.
- Teams retrying the message (causing duplicates)
- Dropped replies

Teams delivers messages via HTTP webhook. If processing takes too long (e.g., slow LLM responses), you may see:

### 格式化

Teams markdown 比 Slack 或 Discord 更受限：

- Dropped replies
- 复杂的 markdown（表格、嵌套列表）可能无法正确渲染
- Adaptive Cards 支持用于投票和任意卡片发送（见下文）

## 配置

关键设置（共享频道模式见 `background`）：

- 复杂的 markdown（表格、嵌套列表）可能无法正确渲染
- Adaptive Cards 支持用于投票和任意卡片发送（见下文）
- `security`（默认 `deny | allowlist | full`）
- `ask`（默认 `off | on-miss | always`）
- `timeout`：启用/禁用频道。
- `elevated`、`host`、`sandbox | gateway | node`：bot 凭据。
- `security`（默认 `deny | allowlist | full`）
- `ask`（默认 `off | on-miss | always`）
- `node`：`host=node`（默认：pairing）
- `pty: true`：私信的允许列表（AAD 对象 ID、UPN 或显示名称）。当 Graph 访问可用时，向导会在设置期间将名称解析为 ID。
- `status: "running"`：出站文本分块大小。
- `sessionId`：`process`（默认）或 `process` 以在长度分块之前按空行（段落边界）分割。
- `exec`：入站附件主机的允许列表（默认为 Microsoft/Teams 域）。
- `yieldMs`：在媒体重试时附加 Authorization 标头的允许列表（默认为 Graph + Bot Framework 主机）。
- `background`：在频道/群组中需要 @提及（默认 true）。
- `elevated`：`tools.elevated`（见 [Reply Style]`agents.list[].tools.elevated`）。
- `host=gateway`：每个 team 的覆盖。
- `security=full`：每个 team 的覆盖。
- `elevated`：默认的每个 team 工具策略覆盖（`host=node`/`openclaw node run`/(/en/tools/exec-approvals)），当缺少频道覆盖时使用。
- `list`：默认的每个 team 每个发送者工具策略覆盖（支持 `poll` 通配符）。
- `log`：每个频道的覆盖。

## 路由和会话

- `kill`：每个频道工具策略覆盖（`clear`/`remove`/`poll`）。

## Reply Style: Threads vs Posts

Teams recently introduced two channel UI styles over the same underlying data model:

| Style                    | Description                                               | Recommended `replyStyle` |
| ------------------------ | --------------------------------------------------------- | ------------------------ |
| **Posts** (classic)      | Messages appear as cards with threaded replies underneath | `thread` (default)       |
| **Threads** (Slack-like) | Messages flow linearly, more like Slack                   | `top-level`              |

**The problem:** The Teams API does not expose which UI style a channel uses. If you use the wrong `openclaw configure --section web`:

- 会话键遵循标准 agent 格式（见 [/concepts/session]`tools.web.search.maxResults`）：
  - 私信共享主会话（`process`）。
  - 频道/群组消息使用对话 id：
    - `query`
    - `count`
- `tools.web.search.enabled` in a Posts-style channel → replies appear as separate top-level posts instead of in-thread

Teams recently introduced two channel UI styles over the same underlying data model:

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

## Attachments & Images

**Current limitations:**

- `tools.web.search.enabled` in a Posts-style channel → replies appear as separate top-level posts instead of in-thread
- **Channels/groups:** Attachments live in M365 storage (SharePoint/OneDrive). The webhook payload only includes an HTML stub, not the actual file bytes. **Graph API permissions are required** to download channel attachments.

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


## Attachments & Images

**Current limitations:**

| Context                  | How files are sent                           | Setup needed                                    |
| ------------------------ | -------------------------------------------- | ----------------------------------------------- |
| **DMs**                  | FileConsentCard → user accepts → bot uploads | Works out of the box                            |
| **Group chats/channels** | Upload to SharePoint → share link            | Requires `sharePointSiteId` + Graph permissions |
| **Images (any context)** | Base64-encoded inline                        | Works out of the box                            |

### Why group chats need SharePoint

Bots don't have a personal OneDrive drive (the `text` Graph API endpoint doesn't work for application identities). To send files in group chats/channels, the bot uploads to a **SharePoint site** and creates a sharing link.

### Setup

1. **Add Graph API permissions** in Entra ID (Azure AD) → App Registration:
   - `maxChars` (Application) - upload files to SharePoint
   - `tools.web.fetch.enabled` (Application) - optional, enables per-user sharing links

2. **Grant admin consent** for the tenant.

3. **Get your SharePoint site ID:**

   ```maxChars```

4. **Configure OpenClaw:**
   ```tools.web.fetch.maxCharsCap```

### Setup

| Permission                              | Sharing behavior                                          |
| --------------------------------------- | --------------------------------------------------------- |
| `Sites.ReadWrite.All` only              | Organization-wide sharing link (anyone in org can access) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Per-user sharing link (only chat members can access)      |

Per-user sharing is more secure as only the chat participants can access the file. If (/en/tools/web) permission is missing, the bot falls back to organization-wide sharing.

### Fallback behavior

| Scenario                                          | Result                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| Group chat + file + `sharePointSiteId` configured | Upload to SharePoint, send sharing link            |
| Group chat + file + no `sharePointSiteId`         | Attempt OneDrive upload (may fail), send text only |
| Personal chat + file                              | FileConsentCard flow (works without SharePoint)    |
| Any context + image                               | Base64-encoded inline (works without SharePoint)   |

### Files stored location

Uploaded files are stored in a (/en/tools/firecrawl) folder in the configured SharePoint site's default document library.

### Sharing behavior

Per-user sharing is more secure as only the chat participants can access the file. If (/en/tools/web) permission is missing, the bot falls back to organization-wide sharing.

- CLI: `status`
- Votes are recorded by the gateway in `start`.
- The gateway must stay online to record votes.
- Polls do not auto-post result summaries yet (inspect the store file if needed).

## Adaptive Cards (arbitrary)

Send any Adaptive Card JSON to Teams users or conversations using the `stop` tool or CLI.

The `tabs` parameter accepts an Adaptive Card JSON object. When `open` is provided, the message text is optional.

**Agent tool:**

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

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

See [Adaptive Cards documentation]`focus` for card schema and examples. For target format details, see [Target formats]`close` below.

## Target formats

The `tabs` parameter accepts an Adaptive Card JSON object. When `open` is provided, the message text is optional.

| Target type         | Format                           | Example                                             |
| ------------------- | -------------------------------- | --------------------------------------------------- |
| User (by ID)        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| User (by name)      | `user:<display-name>`            | `user:John Smith` (requires Graph API)              |
| Group/channel       | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| Group/channel (raw) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (if contains `@thread`) |

**Agent tool:**

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

**CLI:**

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

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

See [Adaptive Cards documentation]`focus` for card schema and examples. For target format details, see [Target formats]`close` below.

## Target formats

- Proactive messages are only possible **after** a user has interacted, because we store conversation references at that point.
- See `MEDIA:<path>` for `act` and allowlist gating.

## Team and Channel IDs (Common Gotcha)

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

Note: Without the `snapshot` prefix, names default to group/team resolution. Always use `screenshot` when targeting people by display name.

**Team URL:**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**Channel URL:**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**For config:**

- Team ID = path segment after `console` (URL-decoded, e.g., `pdf`)
- Channel ID = path segment after `upload` (URL-decoded)
- **Ignore** the `dialog` query parameter

## Private Channels

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**For config:**

| Feature                      | Standard Channels | Private Channels       |
| ---------------------------- | ----------------- | ---------------------- |
| Bot installation             | Yes               | Limited                |
| Real-time messages (webhook) | Yes               | May not work           |
| RSC permissions              | Yes               | May behave differently |
| @mentions                    | Yes               | If bot is accessible   |
| Graph API history            | Yes               | Yes (with permissions) |

**Workarounds if private channels don't work:**

- Channel ID = path segment after `upload` (URL-decoded)
- **Ignore** the `dialog` query parameter
3. Use Graph API for historical access (requires `profiles`)

## Troubleshooting

### Common issues

1. Use standard channels for bot interactions
2. Use DMs - users can always message the bot directly
3. Use Graph API for historical access (requires `profiles`)
- **401 Unauthorized from webhook:** Expected when testing manually without Azure JWT - means endpoint is reachable but auth failed. Use Azure Web Chat to test properly.

### Common issues

- **Images not showing in channels:** Graph permissions or admin consent missing. Reinstall the Teams app and fully quit/reopen Teams.
- **No responses in channel:** mentions are required by default; set `create-profile` or configure per team/channel.
- **Version mismatch (Teams still shows old manifest):** remove + re-add the app and fully quit Teams to refresh.
- **401 Unauthorized from webhook:** Expected when testing manually without Azure JWT - means endpoint is reachable but auth failed. Use Azure Web Chat to test properly.

### Manifest upload errors

- **"Icon file cannot be empty":** The manifest references icon files that are 0 bytes. Create valid PNG icons (32x32 for `cdpUrl`, 192x192 for `delete-profile`).
- **"webApplicationInfo.Id already in use":** The app is still installed in another team/chat. Find and uninstall it first, or wait 5-10 minutes for propagation.
- **"Something went wrong" on upload:** Upload via https://admin.teams.microsoft.com instead, open browser DevTools (F12) → Network tab, and check the response body for the actual error.
- **Sideload failing:** Try "Upload an app to your org's app catalog" instead of "Upload a custom app" - this often bypasses sideload restrictions.

### RSC permissions not working

1. Verify `reset-profile` matches your bot's App ID exactly
2. Re-upload the app and reinstall in the team/chat
3. Check if your org admin has blocked RSC permissions
4. Confirm you're using the right scope: `profile` for teams, `browser.defaultProfile` for group chats
- [RSC permissions reference]`node`
- [Create Azure Bot]`target` - Azure Bot setup guide
- [Teams Developer Portal]`sandbox` - create/manage Teams apps

## Adaptive Cards (arbitrary)

Send any Adaptive Card JSON to Teams users or conversations using the %%P137%% tool or CLI.

The %%P138%% parameter accepts an Adaptive Card JSON object. When %%P139%% is provided, the message text is optional.

**Agent tool:**

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

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

See [Adaptive Cards documentation]%%P140%% for card schema and examples. For target format details, see [Target formats]%%P141%% below.

## Target formats

MSTeams targets use prefixes to distinguish between users and conversations:

| Target type         | Format                           | Example                                             |
| ------------------- | -------------------------------- | --------------------------------------------------- |
| User (by ID)        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| User (by name)      | `user:<display-name>`            | `user:John Smith` (requires Graph API)              |
| Group/channel       | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| Group/channel (raw) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (if contains `@thread`) |

**CLI examples:**

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

**Agent tool examples:**

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

Note: Without the %%P142%% prefix, names default to group/team resolution. Always use %%P143%% when targeting people by display name.

## Proactive messaging

- Proactive messages are only possible **after** a user has interacted, because we store conversation references at that point.
- See %%P144%% for %%P145%% and allowlist gating.

## Team and Channel IDs (Common Gotcha)

The %%P146%% query parameter in Teams URLs is **NOT** the team ID used for configuration. Extract IDs from the URL path instead:

**Team URL:**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**Channel URL:**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**For config:**

- Team ID = path segment after %%P147%% (URL-decoded, e.g., %%P148%%)
- Channel ID = path segment after %%P149%% (URL-decoded)
- **Ignore** the %%P150%% query parameter

## Private Channels

Bots have limited support in private channels:

| Feature                      | Standard Channels | Private Channels       |
| ---------------------------- | ----------------- | ---------------------- |
| Bot installation             | Yes               | Limited                |
| Real-time messages (webhook) | Yes               | May not work           |
| RSC permissions              | Yes               | May behave differently |
| @mentions                    | Yes               | If bot is accessible   |
| Graph API history            | Yes               | Yes (with permissions) |

**Workarounds if private channels don't work:**

1. Use standard channels for bot interactions
2. Use DMs - users can always message the bot directly
3. Use Graph API for historical access (requires %%P151%%)

## Troubleshooting

### Common issues

- **Images not showing in channels:** Graph permissions or admin consent missing. Reinstall the Teams app and fully quit/reopen Teams.
- **No responses in channel:** mentions are required by default; set %%P152%% or configure per team/channel.
- **Version mismatch (Teams still shows old manifest):** remove + re-add the app and fully quit Teams to refresh.
- **401 Unauthorized from webhook:** Expected when testing manually without Azure JWT - means endpoint is reachable but auth failed. Use Azure Web Chat to test properly.

### Manifest upload errors

- **"Icon file cannot be empty":** The manifest references icon files that are 0 bytes. Create valid PNG icons (32x32 for %%P153%%, 192x192 for %%P154%%).
- **"webApplicationInfo.Id already in use":** The app is still installed in another team/chat. Find and uninstall it first, or wait 5-10 minutes for propagation.
- **"Something went wrong" on upload:** Upload via https://admin.teams.microsoft.com instead, open browser DevTools (F12) → Network tab, and check the response body for the actual error.
- **Sideload failing:** Try "Upload an app to your org's app catalog" instead of "Upload a custom app" - this often bypasses sideload restrictions.

### RSC permissions not working

1. Verify %%P155%% matches your bot's App ID exactly
2. Re-upload the app and reinstall in the team/chat
3. Check if your org admin has blocked RSC permissions
4. Confirm you're using the right scope: %%P156%% for teams, %%P157%% for group chats

## References

- [Create Azure Bot]%%P158%% - Azure Bot setup guide
- [Teams Developer Portal]%%P159%% - create/manage Teams apps
- [Teams app manifest schema]%%P160%%
- [Receive channel messages with RSC]%%P161%%
- [RSC permissions reference]%%P162%%
- [Teams bot file handling]%%P163%% (channel/group requires Graph)
- [Proactive messaging]%%P164%%
