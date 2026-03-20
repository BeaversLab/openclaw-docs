---
title: 沙箱 CLI
summary: "Manage sandbox runtimes and inspect effective sandbox policy"
read_when: "You are managing sandbox runtimes or debugging sandbox/工具-policy behavior."
status: active
---

# 沙箱CLI

管理用于隔离代理执行的沙箱运行时。

## 概述

OpenClaw 可以在隔离的沙箱运行时中运行代理以确保安全。`sandbox` 命令可帮助您在更新或配置更改后检查并重新创建这些运行时。

目前这通常意味着：

- Docker 沙箱容器
- 当 `agents.defaults.sandbox.backend = "ssh"` 时的 SSH 沙箱运行时
- 当 `agents.defaults.sandbox.backend = "openshell"` 时的 OpenShell 沙箱运行时

对于 `ssh` 和 OpenShell `remote`，重新创建的重要性比 Docker 更高：

- 远程工作区在初始种子之后具有权威性
- `openclaw sandbox recreate` 会删除所选范围的那个权威远程工作区
- 下次使用时会从当前本地工作区再次对其进行种子化

## 命令

### `openclaw sandbox explain`

检查**有效**沙箱模式/范围/工作区访问权限、沙箱工具策略以及提升的门控（包含修复配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱运行时及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**输出包括：**

- 运行时名称和状态
- 后端（`docker`、`openshell` 等）
- 配置标签以及是否匹配当前配置
- 运行时长（自创建以来的时间）
- 空闲时间（自上次使用以来的时间）
- 关联的会话/代理

### `openclaw sandbox recreate`

移除沙箱运行时以强制使用更新后的配置重新创建。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**选项：**

- `--all`：重新创建所有沙箱容器
- `--session <key>`：为特定会话重新创建容器
- `--agent <id>`：为特定代理重新创建容器
- `--browser`：仅重新创建浏览器容器
- `--force`：跳过确认提示

**重要提示：** 当下次使用代理时，运行时会自动重新创建。

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

### 更改 SSH 目标或 SSH 认证材料后

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

对于核心 `ssh` 后端，recreate 会删除 SSH 目标上针对每个作用域的远程工作区根目录。下次运行时会从本地工作区重新对其进行种子化。

### 更改 OpenShell 源、策略或模式之后

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

对于 OpenShell `remote` 模式，recreate 会删除该作用域的规范远程工作区。下次运行时会从本地工作区重新对其进行种子化。

### 更改 setupCommand 之后

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### 仅针对特定 Agent

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## 为什么需要这样做？

**问题：** 当您更新沙箱配置时：

- 现有的运行时会继续使用旧设置运行
- 运行时仅在闲置 24 小时后才会被清理
- 定期使用的 Agent 会无限期地保持旧运行时的活跃状态

**解决方案：** 使用 `openclaw sandbox recreate` 强制删除旧的运行时。当下次需要时，它们将使用当前设置自动重新创建。

提示：优先使用 `openclaw sandbox recreate` 而非手动后端特定的清理操作。
它使用 Gateway(网关) 的运行时注册表，并避免在作用域/会话密钥更改时出现不匹配。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 下的 `agents.defaults.sandbox` 中（针对每个 Agent 的覆盖设置位于 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, ssh, openshell
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

- [沙箱文档](/zh/gateway/sandboxing)
- [Agent 配置](/zh/concepts/agent-workspace)
- [Doctor 命令](/zh/gateway/doctor) - 检查沙箱设置

import en from "/components/footer/en.mdx";

<en />
