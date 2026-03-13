---
title: Sandbox CLI
summary: "管理沙盒容器并检查有效的沙盒策略"
read_when: "您正在管理沙盒容器或调试沙盒/工具策略行为。"
status: active
---

# Sandbox CLI

管理基于 Docker 的沙箱容器以隔离代理执行。

## 概述

OpenClaw 可以在隔离的 Docker 容器中运行代理以确保安全。`sandbox` 命令可帮助您管理这些容器，特别是在更新或配置更改之后。

## 命令

### `openclaw sandbox explain`

检查**有效**的沙箱模式/范围/工作区访问权限、沙箱工具策略以及提升门限（包含修复配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱容器及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**输出包括：**

- 容器名称和状态（运行中/已停止）
- Docker 镜像以及是否与配置匹配
- 存在时间（创建后的时间）
- 空闲时间（上次使用后的时间）
- 关联的会话/代理

### `openclaw sandbox recreate`

移除沙箱容器以强制使用更新的镜像/配置重新创建。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**选项：**

- `--all`：重新创建所有沙盒容器
- `--session <key>`：重新创建特定会话的容器
- `--agent <id>`：重新创建特定代理的容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

**重要：** 当下次使用代理时，容器会自动重新创建。

## 用例

### 更新 Docker 镜像后

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### 更改沙箱配置后

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### 更改 setupCommand 后

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### 仅针对特定代理

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## 为什么需要这样做？

**问题：** 当您更新沙箱 Docker 镜像或配置时：

- 现有容器继续使用旧设置运行
- 容器仅在闲置 24 小时后被清理
- 定期使用的代理会使旧容器无限期运行

**解决方案：** 使用 `openclaw sandbox recreate` 强制删除旧容器。下次需要时，它们将使用当前设置自动重新创建。

提示：优先使用 `openclaw sandbox recreate` 而非手动 `docker rm`。它使用 Gateway 的容器命名，并在范围/会话密钥更改时避免不匹配。

## 配置

沙盒设置位于 `~/.openclaw/openclaw.json` 下的 `agents.defaults.sandbox` 中（每个代理的覆盖设置位于 `agents.list[].sandbox` 中）：

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
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## 另请参阅

- [Sandbox 文档](/en/gateway/sandboxing)
- [代理配置](/en/concepts/agent-workspace)
- [Doctor 命令](/en/gateway/doctor) - 检查 Sandbox 设置

import zh from '/components/footer/zh.mdx';

<zh />
