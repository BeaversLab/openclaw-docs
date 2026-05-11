---
summary: "设置 ACP 代理：acpx harness 配置、插件设置、权限"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "ACP 代理 — 设置"
---

有关概述、操作员手册和概念，请参阅 [ACP 代理](/zh/tools/acp-agents)。

以下章节涵盖 acpx harness 配置、MCP 网桥的插件设置以及权限配置。

仅在设置 ACP/acpx 路由时使用此页面。对于原生 Codex
应用服务器运行时配置，请使用 [Codex harness](/zh/plugins/codex-harness)。对于
OpenAI API 密钥或 Codex OAuth 模型提供商配置，请使用
[OpenAI](/zh/providers/openai)。

Codex 有两条 OpenClaw 路由：

| 路由                  | 配置/命令                                              | 设置页面                                   |
| --------------------- | ------------------------------------------------------ | ------------------------------------------ |
| 原生 Codex 应用服务器 | `/codex ...`, `agentRuntime.id: "codex"`               | [Codex harness](/zh/plugins/codex-harness) |
| 显式 Codex ACP 适配器 | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | 本页面                                     |

除非您明确需要 ACP/acpx 行为，否则首选原生路由。

## acpx harness 支持（当前）

当前的 acpx 内置 harness 别名：

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI: `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则首选这些 `agentId` 值。
如果您的本地 Cursor 安装仍然将 ACP 公开为 `agent acp`，请在您的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接的 acpx CLI 使用也可以通过 `--agent <command>` 针对任意适配器，但该原始逃生舱门是 acpx CLI 功能（不是正常的 OpenClaw `agentId` 路径）。

模型控制取决于适配器功能。Codex ACP 模型引用在启动前由 OpenClaw 标准化。其他工具需要 ACP `models` 加上 `session/set_model` 支持；如果工具既不暴露该 ACP 功能也不暴露其自身的启动模型标志，OpenClaw/acpx 将无法强制选择模型。

## 必需配置

ACP 核心基线：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
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

线程绑定配置特定于渠道适配器。Discord 示例：

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
        spawnAcpSessions: true,
      },
    },
  },
}
```

如果线程绑定的 ACP 生成不起作用，请首先验证适配器功能标志：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

当前对话绑定不需要创建子线程。它们需要活动的对话上下文和暴露 ACP 对话绑定的渠道适配器。

请参阅 [配置参考](/zh/gateway/configuration-reference)。

## acpx 后端的插件设置

全新安装默认启用捆绑的 `acpx` 运行时插件，因此 ACP 通常无需手动安装插件即可工作。

从以下内容开始：

```text
/acp doctor
```

如果您禁用了 `acpx`，通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想要切换到本地开发检出版本，请使用显式插件路径：

```bash
openclaw plugins install acpx
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

默认情况下，捆绑的 `acpx` 插件注册嵌入式 ACP 后端，而不会在 Gateway 启动期间生成 ACP 代理。运行 `/acp doctor` 进行显式实时探测。仅当您需要 Gateway 在启动时探测配置的代理时，才设置 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1`。

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
- `expectedVersion: "any"` 禁用严格版本匹配。
- 自定义 `command` 路径将禁用插件本地自动安装。

请参阅 [插件](/zh/tools/plugin)。

### 自动依赖安装

当您使用 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx
运行时依赖项（特定于平台的二进制文件）会通过 postinstall 钩子
自动安装。如果自动安装失败，网关仍会正常启动，
并通过 `openclaw acp doctor` 报告缺少的依赖项。

### 插件工具 MCP 桥接

默认情况下，ACPX 会话**不会**将通过 OpenClaw 插件注册的工具暴露给
ACP harness。

如果您希望 ACP 代理（如 Codex 或 Claude Code）调用已安装的
OpenClaw 插件工具（例如内存回忆/存储），请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入到 ACPX 会话
  引导过程中。
- 暴露已由已安装并启用的 OpenClaw
  插件注册的插件工具。
- 保持该功能的显性并默认关闭。

安全性和信任说明：

- 这会扩展 ACP harness 的工具表面。
- ACP 代理只能访问网关中已处于活动状态的插件工具。
- 请将其视为与允许这些插件在 OpenClaw 本身中执行
  相同的信任边界。
- 在启用之前，请检查已安装的插件。

自定义 `mcpServers` 仍像以前一样工作。内置的 plugin-tools 桥接是
一个额外的可选便利功能，并非通用 MCP 服务器配置的替代品。

### OpenClaw 工具 MCP 桥接

默认情况下，ACPX 会话也**不会**通过 MCP 暴露内置的 OpenClaw 工具。
当 ACP 代理需要选定的内置工具（例如 `cron`）时，请启用独立的 core-tools 桥接：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-tools` 的内置 MCP 服务器注入到 ACPX 会话
  引导过程中。
- 暴露选定的内置 OpenClaw 工具。初始服务器暴露 `cron`。
- 保持核心工具暴露的显性并默认关闭。

### 运行时超时配置

随附的 `acpx` 插件将嵌入式运行时默认设置为 120 秒
超时。这为较慢的 harness（如 Gemini CLI）提供了足够的时间来完成
ACP 启动和初始化。如果您的主机需要不同的
运行时限制，请覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值后重启网关。

### 健康探测代理配置

当 `/acp doctor` 或可选的启动探针检查后端时，捆绑的 `acpx` 插件会探测一个 Harness 代理。如果设置了 `acp.allowedAgents`，则默认为第一个允许的代理；否则默认为 `codex`。如果您的部署需要不同的 ACP 代理来进行健康检查，请显式设置探针代理：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

更改此值后请重启网关。

## 权限配置

ACP 会话以非交互方式运行 — 没有 TTY 来批准或拒绝文件写入和 Shell 执行权限提示。acpx 插件提供了两个配置键来控制权限的处理方式：

这些 ACPX Harness 权限独立于 OpenClaw exec 批准，也独立于 CLI 后端供应商绕过标志（如 Claude CLI `--permission-mode bypassPermissions`）。ACPX `approve-all` 是 ACP 会话的 Harness 级别应急开关。

### `permissionMode`

控制 Harness 代理可以在不提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 Shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当显示权限提示但没有可用的交互式 TTY 时（对于 ACP 会话总是如此）发生的情况。

| 值     | 行为                                          |
| ------ | --------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）** |
| `deny` | 静默拒绝权限并继续（优雅降级）。              |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后请重启网关。

<Warning>
OpenClaw 默认为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能会因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。

如果您需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话优雅降级而不是崩溃。

</Warning>

## 相关

- [ACP 代理](/zh/tools/acp-agents) — 概述、操作员手册、概念
- [子代理](/zh/tools/subagents)
- [多代理路由](/zh/concepts/multi-agent)
