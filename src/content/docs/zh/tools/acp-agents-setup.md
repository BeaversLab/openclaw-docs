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

仅在您设置 ACP/acpx 路由时使用此页面。对于原生 Codex 应用服务器运行时配置，请使用 [Codex harness](/zh/plugins/codex-harnessOpenAIAPIOAuthOpenAI)。对于 OpenAI API 密钥或 Codex OAuth 模型提供商配置，请使用 [OpenAI](/zh/providers/openai)。

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
- `pi`
- `qwen`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则首选这些 OpenClaw`agentId` 值。
如果您的本地 Cursor 安装仍将 ACP 公开为 `agent acp`，请在您的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接的 acpx CLI 使用也可以通过 CLI`--agent <command>`CLIOpenClaw 针对任意适配器，但这种原始的逃生舱门是 acpx CLI 的一项功能（而非正常的 OpenClaw `agentId` 路径）。

模型控制取决于适配器的能力。Codex ACP 模型引用会在启动前由 OpenClaw 标准化。其他线束需要 ACP `models` 加上 `session/set_model` 支持；如果线束既不暴露该 ACP 能力也不暴露其自己的启动模型标志，OpenClaw/acpx 将无法强制进行模型选择。

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
        spawnSessions: true,
      },
    },
  },
}
```

如果线程绑定的 ACP 生成不起作用，请首先验证适配器功能标志：

- Discord: `channels.discord.threadBindings.spawnSessions=true`

当前对话绑定不需要创建子线程。它们需要活动的对话上下文和暴露 ACP 对话绑定的渠道适配器。

请参阅 [Configuration Reference](/zh/gateway/configuration-reference)。

## acpx 后端的插件设置

打包安装使用用于 ACP 的官方 `@openclaw/acpx` 运行时插件。
在使用 ACP 线束会话之前，请安装并启用它：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源码检出也可以在 `pnpm install` 之后使用本地工作区插件。

开始于：

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

默认情况下，`acpx`Gateway(网关) 插件在 Gateway(网关) 启动期间探测嵌入式 ACP 后端，并等待该探测完成后才发送网关 `ready` 信号。设置 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=0` 以跳过启动探测，改为延迟注册后端。运行 `/acp doctor` 进行显式的按需探测。

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

- `command`OpenClaw 接受绝对路径、相对路径（从 OpenClaw 工作区解析）或命令名称。
- `expectedVersion: "any"` 禁用严格版本匹配。
- 自定义 `command` 路径会禁用插件本地自动安装。

当路径或标志值应保持为一个 argv 标记时，使用结构化参数覆盖单个 ACP 代理命令：

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
- `agents.<id>.args`OpenClaw 是可选的。每个数组项在 OpenClaw 将其传递给当前的 acpx 命令字符串注册表之前都会进行 shell 引用。

请参阅 [Plugins](/zh/tools/plugin)。

### 自动依赖安装

当您使用 OpenClaw`npm install -g openclaw` 全局安装 OpenClaw 时，acpx 运行时依赖项（特定于平台的二进制文件）会通过 postinstall 钩子自动安装。如果自动安装失败，网关仍会正常启动，并通过 `openclaw acp doctor` 报告缺少的依赖项。

### 插件工具 MCP 桥接

默认情况下，ACPX 会话并**不会**将 OpenClaw 插件注册的工具暴露给
ACP harness。

如果您希望 ACP 代理（如 Codex 或 Claude Code）调用已安装的
OpenClaw 插件工具（例如记忆调用/存储），请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入 ACPX 会话引导中。
- 暴露已由已安装且已启用的 OpenClaw
  插件注册的插件工具。
- 保持该功能显式化且默认关闭。

安全性和信任说明：

- 这会扩展 ACP harness 的工具面。
- ACP 代理只能访问网关中已处于活动状态的插件工具。
- 应将此视为与允许这些插件在
  OpenClaw 本身中执行相同的信任边界。
- 启用此功能前，请检查已安装的插件。

自定义 `mcpServers` 仍然像以前一样工作。内置 plugin-tools 网桥是一个额外的可选便利功能，而不是通用 MCP 服务器配置的替代品。

### OpenClaw 工具 MCP 桥接

默认情况下，ACPX 会话也**不会**通过 MCP 公开内置的 OpenClaw 工具。
当 ACP 代理需要选定的内置工具（例如 OpenClaw`cron`）时，启用单独的 core-tools 网桥：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-tools` 的内置 MCP 服务器注入到 ACPX 会话
  启动过程中。
- 公开选定的内置 OpenClaw 工具。初始服务器公开 OpenClaw`cron`。
- 保持核心工具暴露显式化且默认关闭。

### 运行时超时配置

`acpx`CLI 插件默认将嵌入式运行时轮次超时设置为 120 秒。
这为较慢的 harness（例如 Gemini CLI）提供了足够的时间来完成
ACP 启动和初始化。如果您的主机需要不同的
运行时限制，请覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值后，请重启网关。

### 健康探测代理配置

当 `/acp doctor` 或启动探针检查后端时，捆绑的 `acpx`
插件会探查一个 harness 代理。如果设置了 `acp.allowedAgents`，它默认为
第一个允许的代理；否则默认为 `codex`。如果您的部署
需要不同的 ACP 代理进行健康检查，请显式设置探针代理：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

更改此值后，请重启网关。

## 权限配置

ACP 会话以非交互方式运行 —— 没有 TTY 来批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供了两个配置键来控制权限的处理方式：

这些 ACPX harness 权限与 OpenClaw 执行批准分开，也与 CLI 后端供应商绕过标志（例如 Claude CLI OpenClawCLICLI`--permission-mode bypassPermissions`）分开。ACPX `approve-all` 是 ACP 会话的 harness 级紧急开关。

### `permissionMode`

控制 Harness 代理可以在无提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当应显示权限提示但没有可用的交互式 TTY 时发生的情况（对于 ACP 会话，情况始终如此）。

| 值     | 行为                                          |
| ------ | --------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）** |
| `deny` | 静默拒绝权限并继续（优雅降级）。              |

### 配置

通过插件配置进行设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后，请重启网关。

<Warning>
OpenClaw 默认为 OpenClaw`permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能会因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。

如果您需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话优雅降级而不是崩溃。

</Warning>

## 相关

- [ACP 代理](/zh/tools/acp-agents) — 概述、操作员手册、概念
- [子代理](/zh/tools/subagents)
- [多代理路由](/zh/concepts/multi-agent)
