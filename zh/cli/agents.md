---
summary: "CLI 参考 for `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - 您需要多个隔离的代理（工作区 + 路由 + 身份验证）
title: "agents"
---

# `openclaw agents`

管理隔离的代理（工作区 + 认证 + 路由）。

相关：

- 多代理路由：[多代理路由](/zh/concepts/multi-agent)
- 代理工作区：[代理工作区](/zh/concepts/agent-workspace)

## 示例

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由绑定

使用路由绑定将入站通道流量固定到特定代理。

列出绑定：

```bash
openclaw agents bindings
openclaw agents bindings --agent work
openclaw agents bindings --json
```

添加绑定：

```bash
openclaw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

如果省略 `accountId` (`--bind <channel>`)，OpenClaw 会在可用时从渠道默认值和插件设置钩子中解析它。

### 绑定范围行为

- 没有 `accountId` 的绑定仅匹配渠道默认账户。
- `accountId: "*"` 是渠道范围的回退（所有账户），并且比显式账户绑定的具体性低。
- 如果同一代理已经有一个没有 `accountId` 的匹配渠道绑定，并且您稍后使用显式或解析出的 `accountId` 进行绑定，OpenClaw 将就地升级该现有绑定，而不是添加重复项。

示例：

```bash
# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:ops
```

升级后，该绑定的路由将限定于 `telegram:ops`。如果您还需要默认账户路由，请显式添加它（例如 `--bind telegram:default`）。

移除绑定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

## 身份文件

每个代理工作区可以在工作区根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录（或显式的 `--identity-file`）读取

头像路径相对于工作区根目录解析。

## 设置身份

`set-identity` 将字段写入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar` (工作区相对路径、http(s) URL 或数据 URI)

从 `IDENTITY.md` 加载：

```bash
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
```

显式覆盖字段：

```bash
openclaw agents set-identity --agent main --name "OpenClaw" --emoji "🦞" --avatar avatars/openclaw.png
```

配置示例：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "OpenClaw",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/openclaw.png",
        },
      },
    ],
  },
}
```

import zh from "/components/footer/zh.mdx";

<zh />
