---
summary: "Twitch 聊天机器人配置与设置"
read_when:
  - 为 OpenClaw 设置 Twitch 聊天集成
title: "Twitch"
---
# Twitch（插件）

通过 IRC 连接支持 Twitch 聊天。OpenClaw 以 Twitch 用户（bot 账号）身份连接到频道，收发消息。

## 需要插件

Twitch 为插件形式，未随核心安装打包。

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/twitch
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/twitch
```

详情：[Plugins](/zh/plugin)

## 快速设置（新手）

1. 为 bot 创建一个专用 Twitch 账号（或使用已有账号）。
2. 生成凭据：[Twitch Token Generator](https://twitchtokengenerator.com/)
   - 选择 **Bot Token**
   - 确认勾选 `chat:read` 和 `chat:write` scopes
   - 复制 **Client ID** 和 **Access Token**
3. 查找你的 Twitch 用户 ID： https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
4. 配置 token：
   - 环境变量：`OPENCLAW_TWITCH_ACCESS_TOKEN=...`（仅默认账号）
   - 或配置：`channels.twitch.accessToken`
   - 两者都设置时以配置优先（环境变量仅用于默认账号回退）。
5. 启动 gateway。

**⚠️ 重要：** 添加访问控制（`allowFrom` 或 `allowedRoles`）以防止未授权用户触发 bot。`requireMention` 默认是 `true`。

最小配置：

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",              // Bot 的 Twitch 账号
      accessToken: "oauth:abc123...",    // OAuth Access Token（或用 OPENCLAW_TWITCH_ACCESS_TOKEN 环境变量）
      clientId: "xyz789...",             // Token Generator 提供的 Client ID
      channel: "vevisk",                 // 要加入的 Twitch 频道（必填）
      allowFrom: ["123456789"]           // （推荐）仅你的 Twitch 用户 ID
    }
  }
}
```

## 这是什么

- 由 Gateway 持有的 Twitch 渠道。
- 路由确定性：回复始终回到 Twitch。
- 每个账号映射到独立会话 key：`agent:<agentId>:twitch:<accountName>`。
- `username` 是 bot 账号（用于认证），`channel` 是要加入的聊天频道。

## 设置（详细）

### 生成凭据

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：
- 选择 **Bot Token**
- 确认勾选 `chat:read` 与 `chat:write`
- 复制 **Client ID** 与 **Access Token**

无需手动注册应用。Token 几小时后过期。

### 配置 bot

**环境变量（仅默认账号）：**
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
      channel: "vevisk"
    }
  }
}
```

同时设置 env 与配置时，以配置优先。

### 访问控制（推荐）

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"],       // （推荐）仅你的 Twitch 用户 ID
      allowedRoles: ["moderator"]     // 或限制为角色
    }
  }
}
```

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

**为什么用用户 ID？** 用户名可变，容易被冒名；用户 ID 是永久的。

查找你的 Twitch 用户 ID：
https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/ （将 Twitch 用户名转换为 ID）

## Token 刷新（可选）

通过 [Twitch Token Generator](https://twitchtokengenerator.com/) 获取的 token 无法自动刷新 — 过期后需重新生成。

若需自动刷新，请在 [Twitch Developer Console](https://dev.twitch.tv/console) 创建应用，并添加到配置：

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token"
    }
  }
}
```

bot 会在过期前自动刷新 token，并记录刷新事件。

## 多账号支持

使用 `channels.twitch.accounts` 配置各账号 token。通用模式见 [`gateway/configuration`](/zh/gateway/configuration)。

示例（一个 bot 账号加入两个频道）：

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk"
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel"
        }
      }
    }
  }
}
```

**注意：** 每个账号需要各自的 token（每个频道一个 token）。

## 访问控制

### 角色限制

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator", "vip"]
        }
      }
    }
  }
}
```

### 按用户 ID allowlist（最安全）

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789", "987654321"]
        }
      }
    }
  }
}
```

### allowlist + roles 组合

`allowFrom` 中的用户会跳过角色检查：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789"],
          allowedRoles: ["moderator"]
        }
      }
    }
  }
}
```

### 禁用 @mention 要求

默认 `requireMention` 为 `true`。若要对所有消息回复：

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          requireMention: false
        }
      }
    }
  }
}
```

## 故障排查

先运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

### Bot 不回复消息

**检查访问控制：** 临时设置 `allowedRoles: ["all"]` 测试。

**确认 bot 在频道中：** bot 必须加入 `channel` 指定的频道。

### Token 问题

**"Failed to connect" 或鉴权错误：**
- 确认 `accessToken` 为 OAuth access token（通常带 `oauth:` 前缀）
- 确认 token 具备 `chat:read` 与 `chat:write` scopes
- 若使用刷新，确认 `clientSecret` 与 `refreshToken` 已设置

### Token 刷新不工作

**检查日志中的刷新事件：**
```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

若看到 "token refresh disabled (no refresh token)":
- 确认已设置 `clientSecret`
- 确认已设置 `refreshToken`

## 配置

**账号配置：**
- `username` - Bot 用户名
- `accessToken` - 具备 `chat:read` 与 `chat:write` 的 OAuth access token
- `clientId` - Twitch Client ID（来自 Token Generator 或自建应用）
- `channel` - 要加入的频道（必填）
- `enabled` - 启用该账号（默认：`true`）
- `clientSecret` - 可选：自动刷新所需
- `refreshToken` - 可选：自动刷新所需
- `expiresIn` - token 过期秒数
- `obtainmentTimestamp` - token 获取时间戳
- `allowFrom` - 用户 ID allowlist
- `allowedRoles` - 角色访问控制（`"moderator" | "owner" | "vip" | "subscriber" | "all"`）
- `requireMention` - 要求 @mention（默认：`true`）

**Provider 选项：**
- `channels.twitch.enabled` - 启用/禁用渠道启动
- `channels.twitch.username` - Bot 用户名（单账号简化配置）
- `channels.twitch.accessToken` - OAuth access token（单账号简化配置）
- `channels.twitch.clientId` - Twitch Client ID（单账号简化配置）
- `channels.twitch.channel` - 要加入的频道（单账号简化配置）
- `channels.twitch.accounts.<accountName>` - 多账号配置（包含上述账号字段）

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
          allowedRoles: ["moderator"]
        }
      }
    }
  }
}
```

## 工具动作

agent 可调用 `twitch` 动作：
- `send` - 向频道发送消息

示例：

```json5
{
  "action": "twitch",
  "params": {
    "message": "Hello Twitch!",
    "to": "#mychannel"
  }
}
```

## 安全与运维

- **将 token 视作密码** — 不要提交到 git
- **使用自动刷新** 适配长时间运行的 bot
- **使用用户 ID allowlist** 代替用户名进行访问控制
- **监控日志** 关注 token 刷新与连接状态
- **最小化 scopes** — 仅请求 `chat:read` 与 `chat:write`
- **若卡住**：确认无其他进程占用会话后重启 gateway

## 限制

- 每条消息**500 字符**（按单词边界自动分块）
- 分块前会移除 Markdown
- 不提供额外限流（使用 Twitch 内置速率限制）
