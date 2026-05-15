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

在代码中，您还会看到 **harness**（适配器）这个词。Harness 是提供代理运行时的实现。例如，捆绑的 Codex 适配器实现了 `codex` 运行时。公共配置在提供商或模型条目上使用 `agentRuntime.id`；整个代理的运行时键已过时并被忽略。`openclaw doctor --fix` 会移除旧的整个代理运行时固定配置，并将遗留的运行时模型引用重写为规范的提供商/模型引用，并在需要时添加模型范围的运行时策略。

有两个运行时系列：

- **嵌入式适配器** 在 OpenClaw 的准备好的代理循环内运行。目前这是内置的 `pi` 运行时以及已注册的插件适配器，例如 `codex`。
- **CLI 后端** 在保持模型引用规范的同时运行本地 CLI 进程。例如，带有模型范围 `agentRuntime.id: "claude-cli"` 的 `anthropic/claude-opus-4-7` 意味着“选择 Anthropic 模型，通过 Claude CLI 执行。” `claude-cli` 不是嵌入式适配器 ID，绝不能传递给 AgentHarness 选择。

## Codex 表面

大多数困惑源于几个不同的表面共享 Codex 这个名称：

| 表面                                  | OpenClaw 名称/配置                   | 作用                                                                                 |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| 原生 Codex 应用服务器运行时           | `openai/*` 模型引用                  | 通过 Codex 应用服务器运行 OpenAI 嵌入式代理轮次。这是通常的 ChatGPT/Codex 订阅设置。 |
| Codex OAuth 身份验证配置文件          | `openai-codex` 身份验证提供商        | 存储 Codex 应用服务器适配器使用的 ChatGPT/Codex 订阅身份验证信息。                   |
| Codex ACP 适配器                      | `runtime: "acp"`，`agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求使用 ACP/acpx 时使用。             |
| 原生 Codex 聊天控制命令集             | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止和检查 Codex 应用服务器线程。                          |
| 用于非代理表面的 OpenAI 平台 API 路由 | `openai/*` 加上 API 密钥身份验证     | 用于直接的 OpenAI API，例如图像、嵌入、语音和实时功能。                              |

这些表面在意图上是独立的。启用 `codex` 插件会使
原生应用服务器功能可用；`openclaw doctor --fix` 拥有遗留
`openai-codex/*` 路由修复和过时会话 pin 清理功能。为
代理模型选择 `openai/*` 现在意味着“通过 Codex 运行”，除非正在使用
非代理 OpenAI API 表面。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行身份验证，但将
模型引用保留为 `openai/*` 并选择 `codex` 运行时：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

这意味着 OpenClaw 选择一个 OpenAI 模型引用，然后要求 Codex 应用服务器
运行时运行嵌入式代理轮次。这并不意味着“使用 API 计费”，
也不意味着渠道、模型提供商目录或 OpenClaw 会话存储
变成了 Codex。

当启用捆绑的 `codex` 插件时，自然语言 Codex 控制
应使用原生 `/codex` 命令表面（`/codex bind`、`/codex threads`、
`/codex resume`、`/codex steer`、`/codex stop`）而不是 ACP。仅当用户明确要求 ACP/acpx 或正在测试 ACP
适配器路径时，才对 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 和类似的外部
工具仍使用 ACP。

这是面向代理的决策树：

1. 如果用户要求 **Codex bind/control/thread/resume/steer/stop**，请在启用捆绑的 `codex` 插件时使用原生 `/codex` 命令界面。
2. 如果用户要求 **Codex 作为嵌入式运行时** 或想要
   正常的由订阅支持的 Codex 代理体验，请使用 `openai/<model>`。
3. 如果用户明确为 OpenAI 模型选择 **PI**，请保持模型引用
   为 `openai/<model>` 并将提供商/模型运行时策略设置为
   `agentRuntime.id: "pi"`。选定的 `openai-codex` 身份验证配置文件将通过
   PI 的遗留 Codex-auth 传输进行内部路由。
4. 如果遗留配置仍包含 **`openai-codex/*` 模型引用**，请将其修复为
   `openai/<model>` 并配合 `openclaw doctor --fix` 使用。
5. 如果用户明确提到 **ACP**、**acpx** 或 **Codex ACP 适配器**，请
   配合 `runtime: "acp"` 和 `agentId: "codex"` 使用 ACP。
6. 如果请求是针对 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或
   其他外部工具**，请使用 ACP/acpx，而不是原生子代理运行时。

| 您的意思是...                    | 使用...                                |
| -------------------------------- | -------------------------------------- |
| Codex 应用服务器聊天/线程控制    | 来自捆绑的 `codex` 插件的 `/codex ...` |
| Codex 应用服务器嵌入式代理运行时 | `openai/*` 代理模型引用                |
| OpenAI Codex OAuth               | `openai-codex` 认证配置文件            |
| Claude Code 或其他外部适配器     | ACP/acpx                               |

有关 OpenAI 系列前缀的拆分，请参阅 [OpenAI](OpenAIOpenAI/en/providers/openai) 和
[模型提供商](/zh/concepts/model-providers)。有关 Codex 运行时支持
契约，请参阅 [Codex 适配器运行时](/zh/plugins/codex-harness-runtime#v1-support-contract)。

## 运行时所有权

不同的运行时拥有循环中不同部分的所有权。

| 界面                  | OpenClaw PI 嵌入式            | Codex 应用服务器                               |
| --------------------- | ----------------------------- | ---------------------------------------------- |
| 模型循环所有者        | OpenClaw 通过 PI 嵌入式运行器 | Codex 应用服务器                               |
| 规范线程状态          | OpenClaw 记录                 | Codex 线程，加上 OpenClaw 记录镜像             |
| OpenClaw 动态工具     | 原生 OpenClaw 工具循环        | 通过 Codex 适配器桥接                          |
| 原生 Shell 和文件工具 | PI/OpenClaw 路径              | Codex 原生工具，在支持的情况下通过原生钩子桥接 |
| 上下文引擎            | 原生 OpenClaw 上下文组装      | OpenClaw 项目将组装的上下文放入 Codex 轮次中   |
| 压缩                  | OpenClaw 或选定的上下文引擎   | Codex 原生压缩，带有 OpenClaw 通知和镜像维护   |
| 通道投递              | OpenClaw                      | OpenClaw                                       |

这种所有权划分是主要的设计规则：

- 如果 OpenClaw 拥有界面，OpenClaw 可以提供正常的插件钩子行为。
- 如果原生运行时拥有界面，OpenClaw 需要运行时事件或原生钩子。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像并投影上下文，而不是重写不支持的内部结构。

## 运行时选择

OpenClaw 在提供商和模型解析之后选择一个嵌入式运行时：

1. 模型范围的运行时策略优先。这可以位于配置的提供商
   模型条目中，也可以位于 `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime` 中。
2. 接下来是 `models.providers.<provider>.agentRuntime` 处的提供商范围运行时策略。
3. 在 `auto` 模式下，注册的插件运行时可以声明支持的提供商/模型
   对。
4. 如果没有运行时在 `auto` 模式下认领一个轮次，OpenClaw 将使用 PI 作为兼容性运行时。当运行必须严格时，请使用显式的运行时 id。

整个会话和整个代理的运行时固定配置将被忽略。这包括 `OPENCLAW_AGENT_RUNTIME`、会话 `agentHarnessId`/`agentRuntimeOverride` 状态、`agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。运行 `openclaw doctor --fix` 以删除过时的整个代理运行时配置，并在 OpenClaw 可以保留意图的地方转换旧版运行时模型引用。

显式的提供商/模型插件运行时将失败关闭。例如，提供商或模型上的 `agentRuntime.id: "codex"` 意味着使用 Codex 或出现明确的运行时选择/错误；它永远不会被静默地路由回 PI。

CLI 后端别名与嵌入式 harness id 不同。首选的 Claude CLI 形式是：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-7",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

为了兼容性，仍然支持诸如 `claude-cli/claude-opus-4-7` 之类的旧版引用，但新配置应保持提供商/模型的规范性，并将执行后端放在提供商/模型运行时策略中。

对于大多数提供商，`auto` 模式是有意保守的。OpenAI 代理模型是例外：未设置的运行时和 `auto` 都会解析为 Codex harness。显式的 PI 运行时配置仍然是 `openai/*` 代理轮次的可选兼容性路径；当与选定的 `openai-codex` 身份验证配置文件配对时，OpenClaw 会通过旧版 Codex-auth 传输在内部路由 PI，同时将公共模型引用保持为 `openai/*`。过时的 OpenAI PI 会话固定配置会被运行时选择忽略，并可以使用 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 警告在 `openai-codex/*` 仍保留在配置中时启用了 `codex` 插件，请将其视为旧路由状态。运行 `openclaw doctor --fix` 将其重写为使用 Codex 运行时的 `openai/*`。

## 兼容性约定

当运行时不是 PI 时，它应该记录其支持的 OpenClaw 表面。对运行时文档使用此结构：

| 问题                            | 为何重要                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| 谁拥有模型循环？                | 确定重试、工具延续和最终答案决策发生的位置。                                          |
| 谁拥有规范线程历史记录？        | 确定 OpenClaw 是可以编辑历史记录还是只能镜像它。                                      |
| OpenClaw 动态工具是否有效？     | 消息传递、会话、cron 和 OpenClaw 拥有的工具依赖于此。                                 |
| 动态工具钩子（hooks）是否有效？ | 插件期望在 OpenClaw 拥有的工具周围有 `before_tool_call`、`after_tool_call` 和中间件。 |
| 原生工具钩子是否有效？          | Shell、补丁和运行时拥有的工具需要原生钩子支持以进行策略和观察。                       |
| 上下文引擎生命周期是否运行？    | 内存和上下文插件依赖于组装、摄取、轮次后和压缩生命周期。                              |
| 暴露了哪些压缩数据？            | 某些插件只需要通知，而其他插件需要保留/丢弃的元数据。                                 |
| 有哪些故意不支持的功能？        | 用户不应假设与 PI 等效，尤其是在原生运行时拥有更多状态的情况下。                      |

Codex 运行时支持约定记录在
[Codex harness runtime](/zh/plugins/codex-harness-runtime#v1-support-contract) 中。

## 状态标签

状态输出可能会同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而不是提供商名称。

- 模型引用（如 `openai/gpt-5.5`）会告诉您所选的提供商/模型。
- 运行时 ID（如 `codex`）会告诉您哪个循环正在执行该轮次。
- 渠道标签（如 Telegram 或 Discord）会告诉您对话发生的位置。

如果运行仍显示意外的运行时，请首先检查所选提供商/模型运行时策略。旧的会话运行时固定不再决定路由。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [OpenAI](OpenAI/en/providers/openai)
- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [Agent loop](/zh/concepts/agent-loop)
- [Models](/zh/concepts/models)
- [Status](/zh/cli/status)
