---
summary: "CLICLI reference for `openclaw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "代理"
---

# `openclaw agents`

管理隔离的代理（工作区 + 认证 + 路由）。

相关：

- [多代理路由](/zh/concepts/multi-agent)
- [代理工作区](/zh/concepts/agent-workspace)
- [Skills config](/zh/tools/skills-config)：技能可见性配置。

## 示例

```bash
openclaw agents list
openclaw agents list --bindings
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:*
openclaw agents add ops --workspace ~/.openclaw/workspace-ops --bind telegram:ops --non-interactive
openclaw agents bindings
openclaw agents bind --agent work --bind telegram:ops
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## 路由绑定

使用路由绑定将入站渠道流量固定到特定智能体。

如果您还希望每个代理拥有不同的可见技能，请在 `openclaw.json` 中配置 `agents.defaults.skills` 和 `agents.list[].skills`。请参阅 [Skills config](/zh/tools/skills-config) 和 [配置参考](/zh/gateway/config-agents#agents-defaults-skills)。

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

您还可以在创建代理时添加绑定：

```bash
openclaw agents add work --workspace ~/.openclaw/workspace-work --bind telegram:* --bind discord:*
```

如果您省略 `accountId` (`--bind <channel>`OpenClaw)，OpenClaw 将从插件设置挂钩、强制账户绑定或渠道配置的账户计数中解析它。

如果您为 `bind` 或 `unbind`OpenClaw 省略 `--agent`，OpenClaw 将以当前的默认代理为目标。

### `--bind` 格式

| 格式                         | 含义                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `--bind <channel>:*`         | 匹配渠道上的所有账户。                                      |
| `--bind <channel>:<account>` | 匹配一个账户。                                              |
| `--bind <channel>`           | 仅匹配默认账户，除非 CLI 可以安全解析特定于插件的账户范围。 |

### 绑定范围行为

- 没有 `accountId` 的存储绑定仅匹配渠道默认账户。
- `accountId: "*"` 是渠道范围的回退（所有账户），其具体性低于显式账户绑定。
- 如果同一代理已经具有不带 `accountId` 的匹配渠道绑定，并且您稍后使用显式或解析的 `accountId`OpenClaw 进行绑定，OpenClaw 将就地升级该现有绑定，而不是添加重复项。

示例：

```bash
# match all accounts on the channel
openclaw agents bind --agent work --bind telegram:*

# match a specific account
openclaw agents bind --agent work --bind telegram:ops

# initial channel-only binding
openclaw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
openclaw agents bind --agent work --bind telegram:alerts
```

升级后，该绑定的路由范围限定为 `telegram:alerts`。如果您还需要默认账户路由，请显式添加它（例如 `--bind telegram:default`）。

移除绑定：

```bash
openclaw agents unbind --agent work --bind telegram:ops
openclaw agents unbind --agent work --all
```

`unbind` 接受 `--all` 或一个或多个 `--bind` 值，但不能同时接受两者。

## 命令界面

### `agents`

运行不带子命令的 `openclaw agents` 等同于 `openclaw agents list`。

### `agents list`

选项：

- `--json`
- `--bindings`：包含完整的路由规则，而不仅仅是每个代理的计数/摘要

### `agents add [name]`

选项：

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>`（可重复）
- `--non-interactive`
- `--json`

注意：

- 传递任何显式添加标志会将命令切换到非交互路径。
- 非交互模式需要同时提供代理名称和 `--workspace`。
- `main` 是保留的，不能用作新代理 ID。
- 在交互模式下，认证种子复制仅复制可移植的静态配置文件
  （默认为 `api_key` 和静态 `token`）。OAuth 刷新令牌配置文件
  仅能通过从真实的 `main` 代理存储进行读取继承来使用。
  如果配置的默认代理不是 `main`，请为新代理上的 OAuth
  配置文件单独登录。

### `agents bindings`

选项：

- `--agent <id>`
- `--json`

### `agents bind`

选项：

- `--agent <id>`（默认为当前默认代理）
- `--bind <channel[:accountId]>`（可重复）
- `--json`

### `agents unbind`

选项：

- `--agent <id>`（默认为当前默认代理）
- `--bind <channel[:accountId]>`（可重复）
- `--all`
- `--json`

### `agents delete <id>`

选项：

- `--force`
- `--json`

备注：

- `main` 无法被删除。
- 如果没有 `--force`，则需要交互式确认。
- 工作区、代理状态和会话记录目录将被移至回收站，而非永久删除。
- 当 Gateway(网关) 可达时，删除操作通过 Gateway(网关) 发送，以便配置和会话存储的清理与运行时流量共享同一个写入器。如果无法访问 Gateway(网关)，CLI 将回退到离线本地路径。
- 如果另一个代理的工作区是同一路径、在此工作区内或包含此工作区，
  该工作区将被保留，并且 `--json` 将报告 `workspaceRetained`、
  `workspaceRetainedReason` 和 `workspaceSharedWith`。

## 身份文件

每个代理工作区可以在工作区根目录中包含一个 `IDENTITY.md`：

- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录（或显式的 `--identity-file`）读取

头像路径是相对于工作区根目录解析的。

## 设置身份

`set-identity` 将字段写入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar`（相对于工作区的路径、http(s) URL 或 data URI）

选项：

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

备注：

- 可以使用 `--agent` 或 `--workspace` 来选择目标代理。
- 如果你依赖 `--workspace` 且有多个代理共享该工作区，命令将失败并要求你传递 `--agent`。
- 当未提供显式身份字段时，该命令从 `IDENTITY.md` 读取身份数据。

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

## 相关内容

- [CLI 参考](CLI/en/cli)
- [多代理路由](/zh/concepts/multi-agent)
- [代理工作区](/zh/concepts/agent-workspace)
