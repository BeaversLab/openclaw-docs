---
summary: "Twitch 聊天机器人配置和设置"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
---

# Twitch

通过 IRC 连接支持 Twitch 聊天。OpenClaw 作为 Twitch 用户（机器人账户）连接，以在频道中接收和发送消息。

## 捆绑插件

在当前的 Twitch 版本中，OpenClaw 作为捆绑插件提供，因此常规的打包构建不需要单独安装。

如果您使用的是旧版本构建或排除了 Twitch 的自定义安装，请手动安装：

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/twitch
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/twitch-plugin
```

详情：[插件](/zh/tools/plugin)

## 快速设置（初学者）

1. 确保 Twitch 插件可用。
   - 当前的 OpenClaw 打包版本已经包含了它。
   - 较旧的/自定义安装可以使用上述命令手动添加。
2. 为机器人创建一个专用的 Twitch 账户（或使用现有账户）。
3. 生成凭据：[Twitch 令牌生成器](https://twitchtokengenerator.com/)
   - 选择 **Bot Token**
   - 验证已选择作用域 `chat:read` 和 `chat:write`
   - 复制 **Client ID** 和 **Access Token**
4. 查找您的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
5. 配置令牌：
   - 环境变量：`OPENCLAW_TWITCH_ACCESS_TOKEN=...`（仅限默认账户）
   - 或配置：`channels.twitch.accessToken`
   - 如果两者都设置了，配置优先（环境变量回退仅适用于默认账户）。
6. 启动网关。

**⚠️ 重要：** 添加访问控制（`allowFrom` 或 `allowedRoles`）以防止未经授权的用户触发机器人。`requireMention` 默认为 `true`。

最小配置：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // Bot's Twitch account
      accessToken: "oauth:abc123...", // OAuth Access Token (or use OPENCLAW_TWITCH_ACCESS_TOKEN env var)
      clientId: "xyz789...", // Client ID from Token Generator
      channel: "vevisk", // Which Twitch channel's chat to join (required)
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only - get it from https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
    },
  },
}
```

## 是什么

- 由 Twitch 拥有的 Gateway(网关) 渠道。
- 确定性路由：回复始终发回 Twitch。
- 每个账户映射到一个独立的会话密钥 `agent:<agentId>:twitch:<accountName>`。
- `username` 是机器人的账户（进行身份验证的人），`channel` 是要加入的聊天室。

## 设置（详细）

### 生成凭据

使用 [Twitch 令牌生成器](https://twitchtokengenerator.com/)：

- 选择 **Bot Token**
- 验证已选择作用域 `chat:read` 和 `chat:write`
- 复制 **Client ID** 和 **Access Token**

无需手动注册应用程序。令牌会在几个小时后过期。

### 配置机器人

**环境变量（仅限默认账户）：**

```bash
OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
```

**或配置：**

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
    },
  },
}
```

如果同时设置了环境变量和配置，配置优先。

### 访问控制（推荐）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

对于严格的允许列表，首选 `allowFrom`。如果您希望基于角色的访问，请改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

**为什么使用用户 ID？** 用户名可能会更改，从而允许冒充。用户 ID 是永久的。

查找您的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)（将您的 Twitch 用户名转换为 ID）

## 令牌刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的令牌无法自动刷新 - 过期后请重新生成。

要自动刷新令牌，请在 [Twitch Developer Console](https://dev.twitch.tv/console) 创建您自己的 Twitch 应用程序并将其添加到配置中：

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

机器人会在令牌过期前自动刷新令牌，并记录刷新事件。

## 多账号支持

将 `channels.twitch.accounts` 与每账号令牌一起使用。有关共享模式，请参阅 [`gateway/configuration`](/zh/gateway/configuration)。

示例（一个机器人账号在两个渠道中）：

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}
```

**注意：** 每个账号需要自己的令牌（每个渠道一个令牌）。

## 访问控制

### 基于角色的限制

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator", "vip"],
        },
      },
    },
  },
}
```

### 按用户 ID 列入允许列表（最安全）

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789", "987654321"],
        },
      },
    },
  },
}
```

### 基于角色的访问（备选）

`allowFrom` 是一个严格的允许列表。设置后，仅允许这些用户 ID。
如果您希望基于角色的访问，请不要设置 `allowFrom`，而是配置 `allowedRoles`：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

### 禁用 @提及 要求

默认情况下，`requireMention` 为 `true`。要禁用并响应所有消息：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          requireMention: false,
        },
      },
    },
  },
}
```

## 故障排除

首先，运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

### 机器人不响应消息

**检查访问控制：** 确保您的用户 ID 在 `allowFrom` 中，或者临时移除
`allowFrom` 并设置 `allowedRoles: ["all"]` 进行测试。

**检查机器人是否在渠道中：** 机器人必须加入 `channel` 中指定的渠道。

### 令牌问题

**“连接失败”或身份验证错误：**

- 验证 `accessToken` 是 OAuth 访问令牌值（通常以 `oauth:` 前缀开头）
- 检查令牌是否具有 `chat:read` 和 `chat:write` 作用域
- 如果使用令牌刷新，请验证 `clientSecret` 和 `refreshToken` 已设置

### 令牌刷新无法工作

**检查日志中的刷新事件：**

```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

如果您看到“token refresh disabled (no refresh token)”（令牌刷新已禁用（无刷新令牌））：

- 确保提供了 `clientSecret`
- 确保提供了 `refreshToken`

## 配置

**账户配置：**

- `username` - 机器人用户名
- `accessToken` - 具有 `chat:read` 和 `chat:write` 的 OAuth 访问令牌
- `clientId` - Twitch 客户端 ID（来自令牌生成器或您的应用）
- `channel` - 要加入的频道（必填）
- `enabled` - 启用此账户（默认：`true`）
- `clientSecret` - 可选：用于自动令牌刷新
- `refreshToken` - 可选：用于自动令牌刷新
- `expiresIn` - 令牌过期时间（秒）
- `obtainmentTimestamp` - 获取令牌的时间戳
- `allowFrom` - 用户 ID 白名单
- `allowedRoles` - 基于角色的访问控制 (`"moderator" | "owner" | "vip" | "subscriber" | "all"`)
- `requireMention` - 需要@提及（默认：`true`）

**提供者选项：**

- `channels.twitch.enabled` - 启用/禁用频道启动
- `channels.twitch.username` - 机器人用户名（简化的单账户配置）
- `channels.twitch.accessToken` - OAuth 访问令牌（简化的单账户配置）
- `channels.twitch.clientId` - Twitch 客户端 ID（简化的单账户配置）
- `channels.twitch.channel` - 要加入的频道（简化的单账户配置）
- `channels.twitch.accounts.<accountName>` - 多账户配置（上述所有账户字段）

完整示例：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## 工具操作

代理可以使用以下操作调用 `twitch`：

- `send` - 向频道发送消息

示例：

```json5
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}
```

## 安全与运维

- **像对待密码一样对待令牌** - 切勿将令牌提交到 git
- **使用自动令牌刷新** 用于长期运行的机器人
- **使用用户 ID 白名单** 而不是用户名来进行访问控制
- **监控日志** 以查看令牌刷新事件和连接状态
- **最小化令牌范围** - 仅请求 `chat:read` 和 `chat:write`
- **如果卡住**：在确认没有其他进程拥有会话后，重启网关

## 限制

- **每条消息 500 个字符**（在单词边界自动分块）
- 在分块之前会去除 Markdown
- 无速率限制（使用 Twitch 的内置速率限制）

## 相关

- [Channels Overview](/zh/channels) — 所有支持的频道
- [Pairing](/zh/channels/pairing) — 私信认证和配对流程
- [Groups](/zh/channels/groups) — 群聊行为和提及控制
- [Channel Routing](/zh/channels/channel-routing) — 消息的会话路由
- [Security](/zh/gateway/security) — 访问模型和加固
