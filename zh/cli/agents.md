---
summary: "`openclaw agents` 的 CLI 参考（list/add/delete/set identity）"
read_when:
  - 你需要多个隔离 agent（工作区 + 路由 + 授权）
---

# `openclaw agents`

管理隔离 agent（工作区 + 授权 + 路由）。

相关：
- 多 agent 路由：[Multi-Agent Routing](/zh/concepts/multi-agent)
- Agent 工作区：[Agent workspace](/zh/concepts/agent-workspace)

## 示例

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work
openclaw agents set-identity --workspace ~/.openclaw/workspace --from-identity
openclaw agents set-identity --agent main --avatar avatars/openclaw.png
openclaw agents delete work
```

## Identity 文件

每个 agent 工作区根目录可包含 `IDENTITY.md`：
- 示例路径：`~/.openclaw/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录读取（或指定 `--identity-file`）

Avatar 路径相对工作区根目录解析。

## 设置 identity

`set-identity` 会写入 `agents.list[].identity`：
- `name`
- `theme`
- `emoji`
- `avatar`（工作区相对路径、http(s) URL 或 data URI）

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
          avatar: "avatars/openclaw.png"
        }
      }
    ]
  }
}
```
