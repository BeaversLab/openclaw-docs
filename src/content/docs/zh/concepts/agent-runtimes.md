---
summary: "OpenClawOpenClaw 如何区分模型提供商、模型、通道和代理运行时"
title: "代理运行时"
read_when:
  - You are choosing between OpenClaw, Codex, ACP, or another native agent runtime
  - You are confused by provider/model/runtime labels in status or config
  - You are documenting support parity for a native harness
---

**Agent 运行时**是拥有一个已准备模型循环的组件：它接收提示，驱动模型输出，处理原生工具调用，并将完成的回合返回给 OpenClaw。

运行时很容易与提供商混淆，因为两者都出现在模型配置附近。它们是不同的层级：

| 层级         | 示例                                            | 含义                                                  |
| ------------ | ----------------------------------------------- | ----------------------------------------------------- |
| 提供商       | `openai`， `anthropic`， `openai-codex`         | OpenClaw 如何进行身份验证、发现模型以及命名模型引用。 |
| 模型         | `gpt-5.5`， `claude-opus-4-6`                   | 为 Agent 回合选择的模型。                             |
| Agent 运行时 | `openclaw`， `codex`， `copilot`， `claude-cli` | 执行已准备回合的低级循环或后端。                      |
| 渠道         | Telegram, Discord, Slack, WhatsApp              | 消息进出 OpenClaw 的地方。                            |

在代码中，您还会看到 **harness** 一词。Harness 是提供代理运行时的实现。例如，捆绑的 Codex harness 实现了 `codex` 运行时。公共配置在提供商或模型条目上使用 `agentRuntime.id`；全代理运行时键已过时并被忽略。`openclaw doctor --fix` 会移除旧的全代理运行时固定，并将旧版运行时模型引用重写为规范提供商/模型引用，以及在需要时添加模型范围的运行时策略。

有两个运行时系列：

- **嵌入式 harnesses** 在 OpenClaw 准备好的代理循环中运行。目前，这包括内置的 OpenClaw`openclaw` 运行时以及已注册的插件 harnesses，例如 `codex` 和 `copilot`。
- **CLI 后端** 在保持模型引用规范的同时运行本地 CLI 进程。例如，带有模型范围 `agentRuntime.id: "claude-cli"`CLICLI 的 AnthropicCLI`anthropic/claude-opus-4-8` 意味着“选择 Anthropic 模型，通过 Claude CLI 执行”。`claude-cli` 不是嵌入式 harness ID，不得传递给 AgentHarness 选择。

`copilot`GitHubCLIGitHub harness 是用于 GitHub Copilot CLI 的一个独立的可选插件 harness；关于 PI、Codex 和 GitHub Copilot agent runtime 之间面向用户的选择，请参阅 [GitHub Copilot agent runtime](/zh/plugins/copilotGitHub)。

## Codex 表面

大多数混淆源于几个不同的表面共享 Codex 名称：

| 表面                                  | OpenClaw 名称/配置                   | 其作用                                                                               |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Codex 原生应用服务器运行时            | `openai/*` 模型引用                  | 通过 Codex 应用服务器运行 OpenAI 嵌入式代理轮次。这是常见的 ChatGPT/Codex 订阅设置。 |
| Codex OAuth 身份验证配置文件          | `openai-codex` 身份验证提供商        | 存储 Codex 应用服务器适配器使用的 ChatGPT/Codex 订阅身份验证。                       |
| Codex ACP 适配器                      | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求使用 ACP/acpx 时使用。             |
| Codex 原生聊天控制命令集              | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止和检查 Codex 应用服务器线程。                          |
| 用于非代理界面的 OpenAI 平台 API 路由 | `openai/*` 加上 API 密钥身份验证     | 用于直接调用 OpenAI API，例如图像、嵌入、语音和实时。                                |

这些界面是有意独立的。启用 `codex` 插件可使
原生应用服务器功能可用；`openclaw doctor --fix` 负责遗留
`openai-codex/*` 路由修复和陈旧会话 Pin 清理。为
代理模型选择 `openai/*` 现在意味着“通过 Codex 运行此操作”，除非正在使用
非代理 OpenAI API 界面。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行身份验证，但保持
模型引用为 `openai/*` 并选择 `codex` 运行时：

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
运行嵌入式代理轮次。这并不意味着“使用 API 计费”，也
并不意味着渠道、模型提供商目录或 OpenClaw 会话存储
变成了 Codex。

当启用捆绑的 `codex` 插件时，自然语言 Codex 控制
应使用原生 `/codex` 命令界面 (`/codex bind`、`/codex threads`、
`/codex resume`、`/codex steer`、`/codex stop`CLI) 而非 ACP。仅当用户明确请求 ACP/acpx 或正在测试 ACP
适配器路径时，才对 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 和类似外部
工具仍使用 ACP。

这是面向代理的决策树：

1. 如果用户请求 **Codex bind/control/thread/resume/steer/stop**，请在启用捆绑的 `codex` 插件时
   使用原生 `/codex` 命令界面。
2. 如果用户请求 **Codex 作为嵌入式运行时** 或希望获得正常的
   订阅支持的 Codex 代理体验，请使用 `openai/<model>`。
3. 如果用户明确选择 **OpenClaw 用于 OpenAI 模型**，请将模型引用
   保留为 OpenClawOpenAI`openai/<model>` 并将提供商/模型运行时策略设置为
   `agentRuntime.id: "openclaw"`。所选的 `openai-codex`OpenClaw 身份验证配置文件将在
   内部通过 OpenClaw 的 Codex-auth 传输进行路由。
4. 如果旧版配置仍包含 **`openai-codex/*` 模型引用**，请使用 `openclaw doctor --fix` 将其修复为
   `openai/<model>`；doctor 会通过在
   旧模型引用隐含的位置添加提供商/模型范围的 `agentRuntime.id: "codex"` 来保留 Codex 身份验证
   路由。
   旧版 **`codex-cli/*` 模型引用** 会修复为同一条 `openai/<model>`OpenClawCLI Codex
   应用服务器路由；OpenClaw 不再保留捆绑的 Codex CLI 后端。
5. 如果用户明确说 **ACP**、**acpx** 或 **Codex ACP adapter**，请
   结合 `runtime: "acp"` 和 `agentId: "codex"` 使用 ACP。
6. 如果请求是针对 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或
   另一个外部工具**，请使用 ACP/acpx，而不是原生子代理运行时。

| 您的意思是...                    | 使用...                                |
| -------------------------------- | -------------------------------------- |
| Codex 应用服务器聊天/会话控制    | 来自捆绑的 `codex` 插件的 `/codex ...` |
| Codex 应用服务器嵌入式代理运行时 | `openai/*` 代理模型引用                |
| OpenAI Codex OAuth               | `openai-codex` 身份验证配置文件        |
| Claude Code 或其他外部线束       | ACP/acpx                               |

有关 OpenAI 系列前缀拆分的信息，请参阅 [OpenAI](/zh/providers/openai) 和
[模型提供商](/zh/concepts/model-providers)。有关 Codex 运行时支持
合同，请参阅 [Codex 线程运行时](/zh/plugins/codex-harness-runtime#v1-support-contract)。

## 运行时所有权

不同的运行时拥有循环的不同部分。

| 界面                  | OpenClaw 嵌入式                       | Codex 应用服务器                             |
| --------------------- | ------------------------------------- | -------------------------------------------- |
| 模型循环所有者        | 通过 OpenClaw 嵌入式运行器的 OpenClaw | Codex 应用服务器                             |
| 规范线程状态          | OpenClaw 转录                         | Codex 线程，加上 OpenClaw 转录镜像           |
| OpenClaw 动态工具     | 原生 OpenClaw 工具循环                | 通过 Codex 适配器桥接                        |
| 原生 Shell 和文件工具 | OpenClaw 路径                         | Codex 原生工具，在支持的地方通过原生钩子桥接 |
| 上下文引擎            | 原生 OpenClaw 上下文组装              | OpenClaw 项目将组装的上下文放入 Codex 轮次中 |
| 压缩                  | OpenClaw 或选定的上下文引擎           | Codex 原生压缩，包含 OpenClaw 通知和镜像维护 |
| 渠道交付              | OpenClaw                              | OpenClaw                                     |

这种所有权划分是主要的设计规则：

- 如果 OpenClaw 拥有界面，OpenClaw 可以提供正常的插件钩子行为。
- 如果原生运行时拥有界面，OpenClaw 需要运行时事件或原生钩子。
- 如果原生运行时拥有规范线程状态，OpenClaw 应该镜像并投射上下文，而不是重写不支持的内部内容。

## 运行时选择

OpenClaw 在提供商和模型解析之后选择一个嵌入式运行时：

1. 模型范围的运行时策略优先。这可以存在于配置的提供商模型条目中，或者位于 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` 中。诸如 `agents.defaults.models["vllm/*"].agentRuntime` 之类的提供商通配符在精确模型策略之后应用，因此动态发现的提供商模型可以共享一个运行时，而不会覆盖精确的特定模型例外。
2. 接下来是提供商范围的运行时策略，位于 `models.providers.<provider>.agentRuntime`。
3. 在 `auto` 模式下，已注册的插件运行时可以声明支持的提供商/模型对。
4. 如果在 `auto` 模式下没有运行时声明轮次，OpenClaw 将使用 `openclaw` 作为兼容运行时。当运行必须严格时，请使用显式的运行时 ID。

整个会话和整个代理的运行时固定会被忽略。这包括 `OPENCLAW_AGENT_RUNTIME`、会话 `agentHarnessId`/`agentRuntimeOverride` 状态、`agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。运行 `openclaw doctor --fix` 以删除过时的整个代理运行时配置，并转换旧版运行时模型引用，以便 OpenClaw 可以保留其意图。

显式的提供商/模型插件运行时失败时会封闭。例如，提供商或模型上的 `agentRuntime.id: "codex"` 意味着使用 Codex 或出现明确的选择/运行时错误；它绝不会被静默路由回 OpenClaw。

CLI 后端别名与嵌入式工具 ID 不同。首选的 Claude CLI 格式为：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-8",
      models: {
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

诸如 `claude-cli/claude-opus-4-7` 之类的旧版引用仍然受支持以保持兼容性，但新配置应保持提供商/模型的规范性，并将执行后端置于提供商/模型运行时策略中。

旧版 `codex-cli/*` 引用有所不同：doctor 会将它们迁移到 `openai/*`，以便它们通过 Codex 应用服务器工具运行，而不是保留 Codex CLI 后端。

对于大多数提供商来说，`auto`OpenAI 模式是有意保守的。OpenAI 代理模型是例外：未设置的运行时和 `auto`OpenClaw 都解析为 Codex 驱动程序。显式的 OpenClaw 运行时配置仍然是 `openai/*` 代理轮次的可选兼容性路径；当与选定的 `openai-codex`OpenClaw 认证配置文件配对时，OpenClaw 在内部通过 Codex-auth 传输路由该路径，同时将公共模型引用保留为 `openai/*`OpenAI。过时的 OpenAI 运行时会话固定会被运行时选择忽略，并可以使用 `openclaw doctor --fix` 清理。

如果 `openclaw doctor` 警告启用了 `codex` 插件，而 `openai-codex/*` 仍保留在配置中，请将其视为旧路由状态。运行 `openclaw doctor --fix` 将其重写为带有 Codex 运行时的 `openai/*`。

## GitHub Copilot 代理运行时

捆绑的 `copilot` 扩展注册了一个可选的 `copilot`GitHubCLI 运行时，该运行时由 GitHub Copilot CLI (`@github/copilot-sdk`) 提供支持。它声明了规范订阅 `github-copilot` 提供商，并且 **绝不会** 由 `auto` 选中。通过 `agentRuntime.id` 按模型或按提供商选择加入：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

驱动程序在 CLI`extensions/copilot/doctor-contract-api.ts` 中声明了其提供商、运行时、CLI 会话密钥和身份验证配置文件前缀，`openclaw doctor`GitHub 会自动加载这些内容。有关配置、身份验证、脚本镜像、压缩、doctor probe 表面以及更广泛的 PI 与 Codex 与 Copilot SDK 决策，请参阅 [GitHub Copilot agent runtime](/zh/plugins/copilot)。

## 兼容性约定

当运行时不是 OpenClaw 时，它应该记录其支持哪些 OpenClaw 表面。使用此形状作为运行时文档：

| 问题                         | 为什么重要                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 谁拥有模型循环？             | 决定重试、工具延续和最终答案决策的发生位置。                                          |
| 谁拥有标准的会话记录？       | 决定 OpenClaw 是可以编辑记录还是只能镜像记录。                                        |
| OpenClaw 动态工具是否有效？  | 消息传递、会话、cron 和 OpenClaw 拥有的工具依赖于此。                                 |
| 动态工具钩子是否有效？       | 插件期望在 OpenClaw 拥有的工具周围有 `before_tool_call`、`after_tool_call` 和中间件。 |
| 原生工具钩子是否有效？       | Shell、补丁和运行时拥有的工具需要原生钩子支持以实现策略和观察。                       |
| 上下文引擎生命周期是否运行？ | 内存和上下文插件依赖于组装、摄取、轮次后和压缩生命周期。                              |
| 暴露了哪些压缩数据？         | 某些插件只需要通知，而其他插件则需要保留/丢弃的元数据。                               |
| 有哪些故意不支持的功能？     | 用户不应假设 OpenClaw 等效，特别是在原生运行时拥有更多状态的情况下。                  |

Codex 运行时支持合约记录在
[Codex harness runtime](/zh/plugins/codex-harness-runtime#v1-support-contract) 中。

## 状态标签

状态输出可能会同时显示 `Execution` 和 `Runtime` 标签。请将它们视为
诊断信息，而非提供商名称。

- 模型引用（如 `openai/gpt-5.5`）会告诉您所选的提供商/模型。
- 运行时 ID（如 `codex`）会告诉您哪个循环正在执行当前轮次。
- 渠道标签（如 Telegram 或 Discord）会告诉您对话发生的地点。

如果运行仍显示意外的运行时，请首先检查所选的提供商/模型
运行时策略。传统的会话运行时固定不再决定路由。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness runtime](/zh/plugins/codex-harness-runtime)
- [GitHub Copilot agent runtime](/zh/plugins/copilot)
- [OpenAI](/zh/providers/openai)
- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [Agent loop](/zh/concepts/agent-loop)
- [Models](/zh/concepts/models)
- [状态](/zh/cli/status)
