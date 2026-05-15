---
summary: "Twitch 聊天机器人配置和设置"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
sidebarTitle: "Twitch"
---

通过 IRC 连接支持 Twitch 聊天。OpenClaw 作为 Twitch 用户（机器人账户）连接，以在频道中接收和发送消息。

## 捆绑插件

<Note>Twitch 作为内置插件包含在当前的 OpenClaw 版本中，因此正常的打包版本无需单独安装。</Note>

如果您使用的是不包含 Twitch 的旧版本构建或自定义安装，请直接安装 npm 软件包：

<Tabs>
  <Tab title="npm registry">```bash openclaw plugins install @openclaw/twitch ```</Tab>
  <Tab title="Local checkout">```bash openclaw plugins install ./path/to/local/twitch-plugin ```</Tab>
</Tabs>

使用 bare 软件包以遵循当前的官方发布标签。仅当您需要可重现的安装时，才固定确切的版本。

详情：[插件](/zh/tools/plugin)

## 快速设置（初学者）

<Steps>
  <Step title="确保插件可用">
    当前打包的 OpenClaw 版本已将其捆绑在内。旧版本/自定义安装可以使用上述命令手动添加。
  </Step>
  <Step title="创建 Twitch 机器人账号">
    为机器人创建一个专用的 Twitch 账号（或使用现有账号）。
  </Step>
  <Step title="生成凭据">
    使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

    - 选择 **Bot Token**
    - 验证已选择作用域 `chat:read` 和 `chat:write`
    - 复制 **Client ID** 和 **Access Token**

  </Step>
  <Step title="查找您的 Twitch 用户 ID">
    使用 [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) 将用户名转换为 Twitch 用户 ID。
  </Step>
  <Step title="配置令牌">
    - Env: `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (仅限默认账户)
    - Or config: `channels.twitch.accessToken`

    如果两者均已设置，配置优先（env 回退仅适用于默认账户）。

  </Step>
  <Step title="启动网关">
    使用已配置的渠道启动网关。
  </Step>
</Steps>

<Warning>添加访问控制（`allowFrom` 或 `allowedRoles`）以防止未经授权的用户触发机器人。`requireMention` 默认为 `true`。</Warning>

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

## 它是什么

- 由 Twitch 拥有的 Gateway(网关) 渠道。
- 确定性路由：回复总是返回到 Twitch。
- 每个帐户映射到一个隔离的会话密钥 `agent:<agentId>:twitch:<accountName>`。
- `username` 是机器人的帐户（进行身份验证的人），`channel` 是要加入的聊天室。

## 设置（详细）

### 生成凭证

使用 [Twitch Token Generator](https://twitchtokengenerator.com/)：

- 选择 **Bot Token**
- 验证已选择作用域 `chat:read` 和 `chat:write`
- 复制 **Client ID** 和 **Access Token**

<Note>无需手动注册应用。Token 会在几小时后过期。</Note>

### 配置机器人

<Tabs>
  <Tab title="Env var (default account only)">
    ```bash
    OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
    ```
  </Tab>
  <Tab title="Config">
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
  </Tab>
</Tabs>

如果同时设置了环境变量和配置，则配置优先。

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

对于严格的允许列表，首选 `allowFrom`。如果您想要基于角色的访问，请改用 `allowedRoles`。

**可用角色：** `"moderator"`、`"owner"`、`"vip"`、`"subscriber"`、`"all"`。

<Note>
**为什么使用用户 ID？** 用户名可以更改，从而允许冒充。用户 ID 是永久的。

查找您的 Twitch 用户 ID：[https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)（将您的 Twitch 用户名转换为 ID）

</Note>

## Token 刷新（可选）

来自 [Twitch Token Generator](https://twitchtokengenerator.com/) 的 Token 无法自动刷新 - 过期时重新生成。

对于自动 Token 刷新，请在 [Twitch Developer Console](https://dev.twitch.tv/console) 创建您自己的 Twitch 应用程序并添加到配置：

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

机器人会在过期前自动刷新 Token 并记录刷新事件。

## 多帐户支持

使用带有每个帐户 Token 的 `channels.twitch.accounts`。有关共享模式，请参阅 [Configuration](/zh/gateway/configuration)。

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

<Note>每个账号需要自己的令牌（每个渠道一个令牌）。</Note>

## 访问控制

<Tabs>
  <Tab title="用户 ID 白名单（最安全）">
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
  </Tab>
  <Tab title="基于角色">
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

    `allowFrom` 是一个硬白名单。设置后，仅允许这些用户 ID。如果您希望基于角色的访问控制，请将 `allowFrom` 留空并配置 `allowedRoles`。

  </Tab>
  <Tab title="禁用 @提及 要求">
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

  </Tab>
</Tabs>

## 故障排除

首先，运行诊断命令：

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="Bot 不响应消息">
    - **检查访问控制：** 确保您的用户 ID 在 `allowFrom` 中，或者暂时移除 `allowFrom` 并设置 `allowedRoles: ["all"]` 以进行测试。
    - **检查 Bot 是否在渠道中：** Bot 必须加入 `channel` 中指定的渠道。

  </Accordion>
  <Accordion title="令牌问题">
    “连接失败”或身份验证错误：

    - 验证 `accessToken` 是 OAuth 访问令牌值（通常以 `oauth:` 前缀开头）
    - 检查令牌是否具有 `chat:read` 和 `chat:write` 作用域
    - 如果使用令牌刷新，请验证 `clientSecret` 和 `refreshToken` 已设置

  </Accordion>
  <Accordion title="令牌刷新不工作">
    检查日志中的刷新事件：

    ```
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    如果您看到“令牌刷新已禁用（无刷新令牌）”：

    - 确保提供了 `clientSecret`
    - 确保提供了 `refreshToken`

  </Accordion>
</AccordionGroup>

## 配置

### 账号配置

<ParamField path="username" type="string">
  Bot 用户名。
</ParamField>
<ParamField path="accessToken" type="string">
  OAuth 访问令牌，具有 `chat:read` 和 `chat:write`。
</ParamField>
<ParamField path="clientId" type="string">
  Twitch 客户端 ID（来自令牌生成器或您的应用）。
</ParamField>
<ParamField path="channel" type="string" required>
  要加入的渠道。
</ParamField>
<ParamField path="enabled" type="boolean" default="true">
  启用此账户。
</ParamField>
<ParamField path="clientSecret" type="string">
  可选：用于自动刷新令牌。
</ParamField>
<ParamField path="refreshToken" type="string">
  可选：用于自动刷新令牌。
</ParamField>
<ParamField path="expiresIn" type="number">
  令牌过期时间（秒）。
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  获取令牌的时间戳。
</ParamField>
<ParamField path="allowFrom" type="string[]">
  用户 ID 允许列表。
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  基于角色的访问控制。
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  需要 @提及。
</ParamField>

### 提供程序选项

- `channels.twitch.enabled` - 启用/禁用渠道启动
- `channels.twitch.username` - Bot 用户名（简化的单账户配置）
- `channels.twitch.accessToken` - OAuth 访问令牌（简化的单账户配置）
- `channels.twitch.clientId` - Twitch 客户端 ID（简化的单账户配置）
- `channels.twitch.channel` - 要加入的渠道（简化的单账户配置）
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

- `send` - 向渠道发送消息

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

- **像对待密码一样对待令牌** — 永远不要将令牌提交到 git。
- 对于长时间运行的机器人，**使用自动令牌刷新**。
- **使用用户 ID 白名单** 而不是用户名进行访问控制。
- **监控日志** 以查看令牌刷新事件和连接状态。
- **最小化令牌范围** — 仅请求 `chat:read` 和 `chat:write`。
- **如果卡住**：在确认没有其他进程拥有该会话后，重启网关。

## 限制

- 每条消息 **500 个字符**（在单词边界自动分块）。
- Markdown 会在分块前被剥离。
- 无速率限制（使用 Twitch 的内置速率限制）。

## 相关内容

- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [渠道概述](/zh/channels) — 所有支持的渠道
- [组](/zh/channels/groups) — 群聊行为和提及限制
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [安全](/zh/gateway/security) — 访问模型和加固
