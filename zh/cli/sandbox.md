---
title: "Sandbox CLI"
summary: "管理 sandbox 容器并检查生效的 sandbox 策略"
read_when: "你在管理 sandbox 容器或排查 sandbox/tool-policy 行为。"
status: active
---

# Sandbox CLI

管理基于 Docker 的 sandbox 容器，用于隔离 agent 执行。

## 概览

OpenClaw 可以在隔离的 Docker 容器中运行 agent 以提升安全性。`sandbox` 命令帮助你管理这些容器，尤其是在更新或配置变更后。

## 命令

### `openclaw sandbox explain`

查看 **生效** 的 sandbox 模式/作用域/工作区访问、sandbox 工具策略以及提升权限的关卡（包含可修复的配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有 sandbox 容器的状态与配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # 仅列出浏览器容器
openclaw sandbox list --json     # JSON 输出
```

**输出包含：**

- 容器名称与状态（运行/停止）
- Docker 镜像以及是否与配置匹配
- Age（创建时间）
- Idle time（上次使用时间）
- 关联的 session/agent

### `openclaw sandbox recreate`

删除 sandbox 容器以强制用更新后的镜像/配置重新创建。

```bash
openclaw sandbox recreate --all                # 重建所有容器
openclaw sandbox recreate --session main       # 指定 session
openclaw sandbox recreate --agent mybot        # 指定 agent
openclaw sandbox recreate --browser            # 仅浏览器容器
openclaw sandbox recreate --all --force        # 跳过确认
```

**选项：**

- `--all`：重建所有 sandbox 容器
- `--session <key>`：重建指定 session 的容器
- `--agent <id>`：重建指定 agent 的容器
- `--browser`：仅重建浏览器容器
- `--force`：跳过确认提示

**重要：** 容器会在下次使用 agent 时自动重建。

## Use Cases

### 更新 Docker 镜像后

```bash
# 拉取新镜像
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# 更新配置以使用新镜像
# 编辑配置：agents.defaults.sandbox.docker.image（或 agents.list[].sandbox.docker.image）

# 重建容器
openclaw sandbox recreate --all
```

### 修改 sandbox 配置后

```bash
# 编辑配置：agents.defaults.sandbox.*（或 agents.list[].sandbox.*）

# 重建以应用新配置
openclaw sandbox recreate --all
```

### 修改 setupCommand 后

```bash
openclaw sandbox recreate --all
# 或仅重建一个 agent：
openclaw sandbox recreate --agent family
```

### 仅针对某个 agent

```bash
# 仅更新一个 agent 的容器
openclaw sandbox recreate --agent alfred
```

## 为什么需要这样做？

**问题：** 当你更新 sandbox Docker 镜像或配置时：

- 已有容器仍使用旧设置运行
- 容器只有在 24 小时空闲后才会被清理
- 频繁使用的 agent 会一直复用旧容器

**解决方案：** 使用 `openclaw sandbox recreate` 强制删除旧容器。它们会在下次需要时按当前设置自动重建。

提示：优先使用 `openclaw sandbox recreate` 而不是手动 `docker rm`。
它会使用 Gateway 的容器命名，并避免 scope/session key 变更导致的错配。

## 配置

Sandbox 配置位于 `~/.openclaw/openclaw.json` 的 `agents.defaults.sandbox` 下（每个 agent 的覆盖在 `agents.list[].sandbox`）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... 更多 Docker 选项
        },
        "prune": {
          "idleHours": 24, // 空闲 24h 自动清理
          "maxAgeDays": 7, // 最长保留 7 天
        },
      },
    },
  },
}
```

## 另请参阅

- [Sandbox 文档](/zh/gateway/sandboxing)
- [Agent 配置](/zh/concepts/agent-workspace)
- [Doctor 命令](/zh/gateway/doctor) - 检查 sandbox 设置
