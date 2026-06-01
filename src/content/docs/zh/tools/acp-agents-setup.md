---
summary: "设置 ACP 代理：acpx harness 配置、插件设置、权限"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "ACP 代理 — 设置"
---

有关概述、操作员手册和概念，请参阅 [ACP agents](/zh/tools/acp-agents)。

以下章节涵盖 acpx harness 配置、MCP 网桥的插件设置以及权限配置。

仅在设置 ACP/acpx 路由时使用此页面。对于原生 Codex 应用服务器运行时配置，请使用 [Codex harness](/zh/plugins/codex-harness)。对于 OpenAI API 密钥或 Codex OAuth 模型提供商配置，请使用 [OpenAI](/zh/providers/openai)。

Codex 有两条 OpenClaw 路由：

| 路由                  | 配置/命令                                              | 设置页面                                   |
| --------------------- | ------------------------------------------------------ | ------------------------------------------ |
| 原生 Codex 应用服务器 | `/codex ...`, `openai/gpt-*` 代理引用                  | [Codex harness](/zh/plugins/codex-harness) |
| 显式 Codex ACP 适配器 | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | 本页面                                     |

除非您明确需要 ACP/acpx 行为，否则首选原生路由。

## acpx harness 支持（当前）

当前的 acpx 内置 harness 别名：

- `claude`
- `codex`
- `copilot`
- `cursor`CLI (Cursor CLI: `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `qwen`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则建议为 `agentId` 使用这些值。
如果您本地的 Cursor 安装仍将 ACP 公开为 `agent acp`，请在您的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 也可以通过 `--agent <command>` 定位任意适配器，但这种原始的应急方案是 acpx CLI 的功能（而非正常的 OpenClaw `agentId` 路径）。

模型控制取决于适配器功能。Codex ACP 模型引用在启动前由 OpenClaw 进行规范化。其他适配器需要 ACP `models` 加上 `session/set_model` 支持；如果适配器既未公开该 ACP 功能也未公开其自己的启动模型标志，OpenClaw/acpx 将无法强制选择模型。

## Required config

Core ACP baseline:

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "openclaw", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

Thread binding config is 渠道-adapter specific. Example for Discord:

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnSessions: true,
      },
    },
  },
}
```

If thread-bound ACP spawn does not work, verify the adapter feature flag first:

- Discord: `channels.discord.threadBindings.spawnSessions=true`

Current-conversation binds do not require child-thread creation. They require an active conversation context and a 渠道 adapter that exposes ACP conversation bindings.

See [Configuration Reference](/zh/gateway/configuration-reference).

## Plugin setup for acpx backend

打包安装使用官方的 `@openclaw/acpx` ACP 运行时插件。
在使用 ACP 驱动会话之前，请安装并启用它：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源代码检出版本也可以在 `pnpm install` 之后使用本地工作区插件。

从以下内容开始：

```text
/acp doctor
```

如果您禁用了 `acpx`，通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想要
切换回打包的插件，请使用显式的包路径：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间的本地工作区安装：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然后验证后端运行状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，`acpx` 插件在 Gateway(网关) 启动期间注册嵌入式 ACP 后端，
并在网关 `ready` 信号之前等待嵌入式运行时启动探测。
仅对于有意禁用启动探测的脚本或环境，才设置 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=0` 或
`OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1`。运行 `/acp doctor` 以进行显式的
按需探测。

在插件配置中覆盖命令或版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

- `command` 接受绝对路径、相对路径（从 OpenClaw 工作区解析）或命令名称。
- `expectedVersion: "any"` 禁用严格的版本匹配。
- 自定义 `command` 路径会禁用插件本地的自动安装。

当路径或标志值应保留为一个 argv 令牌时，使用结构化参数覆盖单个 ACP 代理命令：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "agents": {
            "claude": {
              "command": "node",
              "args": ["/path/to/custom adapter.mjs", "--verbose"]
            }
          }
        }
      }
    }
  }
}
```

- `agents.<id>.command` 是该 ACP 代理的可执行文件或现有命令字符串。
- `agents.<id>.args` 是可选的。每个数组项在 OpenClaw 将其传递到当前的 acpx 命令字符串注册表之前都会进行 shell 引用。

请参阅 [插件](/zh/tools/plugin)。

### 自动依赖项安装

当您使用 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx
运行时依赖项（特定平台的二进制文件）会通过 postinstall 钩子自动安装。
如果自动安装失败，网关仍会正常启动，并通过 `openclaw acp doctor` 报告缺少的依赖项。

### 插件工具 MCP 桥接

默认情况下，ACPX 会话 **不会** 将 OpenClaw 插件注册的工具暴露给
ACP 驱动。

如果您希望 ACP 代理（如 Codex 或 Claude Code）调用已安装的
OpenClaw 插件工具（如内存召回/存储），请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

功能说明：

- 将名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入到 ACPX 会话
  引导过程中。
- 暴露已由已安装且已启用的 OpenClaw
  插件注册的插件工具。
- 保持该功能显式且默认关闭。

安全与信任说明：

- 这会扩展 ACP 驱动工具 的工具表面。
- ACP 代理只能访问网关中已处于活跃状态的插件工具。
- 应将其视为与允许这些插件在 OpenClaw 本身中执行相同的信任边界。
- 在启用此功能之前，请检查已安装的插件。

自定义 `mcpServers` 仍像以前一样工作。内置的 plugin-tools 桥接是一个
额外的可选便利功能，并非通用 MCP 服务器配置的替代品。

### OpenClaw 工具 MCP 桥接

默认情况下，ACPX 会话也**不会**通过
MCP 暴露内置的 OpenClaw 工具。当 ACP 代理需要选定的
内置工具（如 `cron`）时，请启用单独的 core-tools 桥接：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

功能说明：

- 将名为 `openclaw-tools` 的内置 MCP 服务器注入到 ACPX 会话
  引导过程中。
- 暴露选定的内置 OpenClaw 工具。初始服务器暴露 `cron`。
- 保持核心工具 的暴露显式且默认关闭。

### 运行时操作超时配置

`acpx` 插件默认为嵌入式运行时启动和控制操作提供 120
秒的时间。这为较慢的驱动（如 Gemini CLI）提供了足够的
时间来完成 ACP 启动和初始化。如果您的主机需要不同的操作限制，请覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

运行时回合 使用 OpenClaw 代理/运行超时，包括 `/acp timeout` 和
`sessions_spawn.timeoutSeconds`。更改此值后，请重启网关。

### 运行状况检查代理配置

当 `/acp doctor` 或启动探针检查后端时，捆绑的 `acpx` 插件会探测一个 harness agent。如果设置了 `acp.allowedAgents`，则默认为第一个允许的 agent；否则默认为 `codex`。如果您的部署需要不同的 ACP agent 进行健康检查，请显式设置探针 agent：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

更改此值后请重启网关。

## 权限配置

ACP 会话非交互式运行 —— 没有终端 (TTY) 来批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供了两个配置键来控制权限的处理方式：

这些 ACPX harness 权限与 OpenClaw 执行审批是分开的，也与 CLI 后端供应商绕过标志（例如 Claude CLI `--permission-mode bypassPermissions`）分开。ACPX `approve-all` 是 ACP 会话的 harness 级紧急开关。

### `permissionMode`

控制 harness agent 可以在无需提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当将显示权限提示但没有可用的交互式终端 (TTY) 时会发生什么（对于 ACP 会话，情况总是如此）。

| 值     | 行为                                        |
| ------ | ------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**(默认)** |
| `deny` | 静默拒绝权限并继续（优雅降级）。            |

### 配置

通过插件配置进行设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后请重启网关。

<Warning>
OpenClaw 默认使用 OpenClaw`permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能会因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。

如果您需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话优雅地降级而不是崩溃。

</Warning>

## 相关

- [ACP 代理](/zh/tools/acp-agents) — 概述、操作员手册、概念
- [子代理](/zh/tools/subagents)
- [多代理路由](/zh/concepts/multi-agent)
