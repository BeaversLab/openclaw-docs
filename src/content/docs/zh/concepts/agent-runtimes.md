---
summary: "OpenClaw 如何区分模型提供商、模型、渠道和 Agent 运行时"
title: "Agent 运行时"
read_when:
  - You are choosing between PI, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

**Agent 运行时**是拥有一个已准备模型循环的组件：它接收提示，驱动模型输出，处理原生工具调用，并将完成的回合返回给 OpenClaw。

运行时很容易与提供商混淆，因为两者都出现在模型配置附近。它们是不同的层级：

| 层级         | 示例                                  | 含义                                                  |
| ------------ | ------------------------------------- | ----------------------------------------------------- |
| 提供商       | `openai`, `anthropic`, `openai-codex` | OpenClaw 如何进行身份验证、发现模型以及命名模型引用。 |
| 模型         | `gpt-5.5`, `claude-opus-4-6`          | 为 Agent 回合选择的模型。                             |
| Agent 运行时 | `pi`, `codex`, `claude-cli`           | 执行已准备回合的低级循环或后端。                      |
| 渠道         | Telegram, Discord, Slack, WhatsApp    | 消息进出 OpenClaw 的地方。                            |

您还将在代码中看到 **harness** 一词。Harness 是提供 Agent 运行时的实现。例如，内置的 Codex harness 实现了 `codex` 运行时。公共配置使用 `agentRuntime.id`；`openclaw
doctor --fix` 会将较旧的 runtime-policy 键重写为该格式。

有两个运行时系列：

- **嵌入式 harness** 在 OpenClaw 的已准备 Agent 循环内运行。目前，这是内置的 `pi` 运行时加上已注册的插件 harness，如 `codex`。
- **CLI 后端** 在保持模型引用规范的同时运行本地 CLI 进程。例如，`anthropic/claude-opus-4-7` 配合 `agentRuntime.id: "claude-cli"` 意味着“选择 Anthropic 模型，通过 Claude CLI 执行”。`claude-cli` 不是嵌入式 harness ID，不得传递给 AgentHarness 选择。

## 三个名为 Codex 的事物

大多数混淆源于三个不同的表面共享 Codex 这一名称：

| 表面                                             | OpenClaw 名称/配置                   | 作用                                                                                |
| ------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------- |
| Codex OAuth 提供商路由                           | `openai-codex/*` 模型引用            | 通过正常的 OAuth PI 运行器使用 ChatGPT/Codex 订阅 OpenClaw。                        |
| 原生 Codex 应用服务器运行时                      | `agentRuntime.id: "codex"`           | 通过捆绑的 Codex 应用服务器工具运行嵌入式代理轮次。                                 |
| Codex ACP 适配器                                 | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求使用 ACP/acpx 时使用。            |
| 原生 Codex 聊天控制命令集                        | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止和检查 Codex 应用服务器线程。                         |
| 适用于 GPT/Codex 风格模型的 OpenAI 平台 API 路由 | `openai/*` 模型引用                  | 使用 OpenAI API 密钥身份验证，除非运行时覆盖（例如 `runtime: "codex"`）运行该轮次。 |

这些表面是有意独立的。启用 `codex` 插件使
原生应用服务器功能可用；它不会将
`openai-codex/*` 重写为 `openai/*`，不会更改现有会话，也不会
使 ACP 成为 Codex 的默认设置。选择 `openai-codex/*` 意味着“使用 Codex
OAuth 提供商路由”，除非您单独强制指定运行时。

常见的 Codex 设置使用 `openai` 提供商搭配 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

这意味着 OpenClaw 选择一个 OpenAI 模型引用，然后请求 Codex 应用服务器
运行时来运行嵌入式代理轮次。这并不意味着渠道、模型
提供商目录或 OpenClaw 会话存储变成了 Codex。

当启用捆绑的 `codex` 插件时，自然语言 Codex 控制
应使用原生 `/codex` 命令表面（`/codex bind`、`/codex threads`、
`/codex resume`、`/codex steer`、`/codex stop`）而不是 ACP。仅当用户明确要求 ACP/acpx 或正在测试 ACP
适配器路径时，才对 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 和类似的外部
工具仍使用 ACP。

这是面向代理的决策树：

1. 如果用户要求 **Codex bind/control/thread/resume/steer/stop**，请在启用捆绑的 `codex` 插件时使用原生 `/codex` 命令界面。
2. 如果用户要求 **Codex 作为嵌入式运行时**，请使用 `openai/<model>` 配合 `agentRuntime.id: "codex"`。
3. 如果用户要求在常规 OpenClaw 运行器上进行 **Codex OAuth/subscription 认证**，请使用 `openai-codex/<model>` 并将运行时保留为 PI。
4. 如果用户明确提及 **ACP**、**acpx** 或 **Codex ACP 适配器**，请使用 ACP 配合 `runtime: "acp"` 和 `agentId: "codex"`。
5. 如果请求是针对 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或
   其他外部工具**，请使用 ACP/acpx，而不是原生子代理运行时。

| 您的意思是...                    | 使用...                              |
| -------------------------------- | ------------------------------------ |
| Codex 应用服务器聊天/线程控制    | 来自捆绑 `codex` 插件的 `/codex ...` |
| Codex 应用服务器嵌入式代理运行时 | `agentRuntime.id: "codex"`           |
| PI 运行器上的 OpenAI Codex OAuth | `openai-codex/*` 模型引用            |
| Claude Code 或其他外部工具       | ACP/acpx                             |

关于 OpenAI 系列前缀的拆分，请参阅 [OpenAI](/zh/providers/openai) 和
[模型提供商](/zh/concepts/model-providers)。关于 Codex 运行时支持
契约，请参阅 [Codex 工具](/zh/plugins/codex-harness#v1-support-contract)。

## 运行时所有权

不同的运行时拥有循环的不同部分。

| 界面                  | OpenClaw PI 嵌入式              | Codex 应用服务器                             |
| --------------------- | ------------------------------- | -------------------------------------------- |
| 模型循环所有者        | 通过 PI 嵌入式运行器的 OpenClaw | Codex 应用服务器                             |
| 规范线程状态          | OpenClaw 副本                   | Codex 线程，以及 OpenClaw 副本镜像           |
| OpenClaw 动态工具     | 原生 OpenClaw 工具循环          | 通过 Codex 适配器桥接                        |
| 原生 Shell 和文件工具 | PI/OpenClaw 路径                | Codex 原生工具，在支持的地方通过原生挂钩桥接 |
| 上下文引擎            | 原生 OpenClaw 上下文组装        | OpenClaw 项目将组装的上下文放入 Codex 轮次中 |
| 压缩                  | OpenClaw 或选定的上下文引擎     | Codex 原生压缩，包含 OpenClaw 通知和镜像维护 |
| 通道交付              | OpenClaw                        | OpenClaw                                     |

这种所有权划分是主要的设计原则：

- 如果 OpenClaw 拥有表面，OpenClaw 可以提供正常的插件挂钩行为。
- 如果原生运行时拥有表面，OpenClaw 需要运行时事件或原生挂钩。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像并投射上下文，而不是重写不支持的内部结构。

## 运行时选择

OpenClaw 在提供商和模型解析之后选择一个嵌入式运行时：

1. 会话记录的运行时优先。配置更改不会将现有的记录文稿热切换
   到不同的原生线程系统。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 强制新的或重置的会话使用该运行时。
3. `agents.defaults.agentRuntime.id` 或 `agents.list[].agentRuntime.id` 可以设置
   `auto`、`pi`、注册的嵌入式线束 id（例如 `codex`）或
   支持的 CLI 后端别名（例如 `claude-cli`）。
4. 在 `auto` 模式下，注册的插件运行时可以声明支持的提供商/模型
   对。
5. 如果在 `auto` 模式下没有运行时声明轮次并且设置了 `fallback: "pi"`
   （默认），OpenClaw 使用 PI 作为兼容性回退。设置
   `fallback: "none"` 以使不匹配的 `auto` 模式选择失败。

显式插件运行时默认失败即关闭。例如，
`runtime: "codex"` 意味着 Codex 或明确的选择错误，除非您在同一覆盖范围内设置
`fallback: "pi"`。运行时覆盖不会继承
更广泛的回退设置，因此代理级别的 `runtime: "codex"` 不会仅仅因为默认值使用了 `fallback: "pi"` 而被静默
路由回 PI。

CLI 后端别名与嵌入式线束 id 不同。首选
的 Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      agentRuntime: { id: "claude-cli" },
    },
  },
}
```

诸如 `claude-cli/claude-opus-4-7` 之类的旧版引用仍然受支持
以保持兼容性，但新配置应保持提供商/模型的规范化，并将
执行后端放在 `agentRuntime.id` 中。

`auto` 模式是故意保守的。插件运行时可以声明它们理解的提供商/模型对，但 Codex 插件不会在 `auto` 模式下声明 `openai-codex` 提供商。这保持了 `openai-codex/*` 作为明确的 PI Codex OAuth 路由，并避免将订阅认证配置静默转移到原生应用服务器程序包。

如果 `openclaw doctor` 警告在 `openai-codex/*` 仍通过 PI 路由时启用了 `codex` 插件，请将其视为诊断信息，而不是迁移。如果这正是您想要的 PI Codex OAuth，请保持配置不变。仅当您需要原生 Codex 应用服务器执行时，才切换到 `openai/<model>` 加 `agentRuntime.id: "codex"`。

## 兼容性契约

当运行时不是 PI 时，它应该记录支持哪些 OpenClaw 接口。使用此格式编写运行时文档：

| 问题                         | 为何重要                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 谁拥有模型循环？             | 决定重试、工具延续和最终答案决策发生在何处。                                          |
| 谁拥有标准线程历史？         | 决定 OpenClaw 是可以编辑历史还是只能镜像历史。                                        |
| OpenClaw 动态工具是否有效？  | 消息传递、会话、cron 和 OpenClaw 拥有的工具依赖于此。                                 |
| 动态工具挂钩是否有效？       | 插件期望 `before_tool_call`、`after_tool_call` 以及围绕 OpenClaw 拥有的工具的中间件。 |
| 原生工具挂钩是否有效？       | Shell、补丁和运行时拥有的工具需要原生挂钩支持以进行策略和观察。                       |
| 上下文引擎生命周期是否运行？ | 内存和上下文插件依赖于组装、摄取、轮次后和压缩生命周期。                              |
| 暴露了哪些压缩数据？         | 某些插件只需要通知，而其他插件则需要保留/丢弃的元数据。                               |
| 什么是有意不支持的？         | 用户不应假设与 PI 等效，特别是在原生运行时拥有更多状态的情况下。                      |

Codex 运行时支持契约记录在 [Codex harness](/zh/plugins/codex-harness#v1-support-contract) 中。

## 状态标签

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而不是提供商名称。

- 模型引用（如 `openai/gpt-5.5`）会告知您选定的提供商/模型。
- 运行时 ID（如 `codex`）会告知您哪个循环正在执行当前回合。
- 渠道标签（如 Telegram 或 Discord）会告知您对话发生的位置。

如果在更改运行时配置后会话仍显示 PI，请使用 `/new` 开始新会话或使用 `/reset` 清除当前会话。现有会话会保留其记录的运行时，因此不会通过两个不兼容的原生会话系统重新播放对话记录。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [OpenAI](/zh/providers/openai)
- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [Agent loop](/zh/concepts/agent-loop)
- [Models](/zh/concepts/models)
- [Status](/zh/cli/status)
