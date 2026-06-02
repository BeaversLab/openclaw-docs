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
| 提供商       | `openai`，`anthropic`，`github-copilot`         | OpenClaw 如何进行身份验证、发现模型以及命名模型引用。 |
| 模型         | `gpt-5.5`， `claude-opus-4-6`                   | 为 Agent 回合选择的模型。                             |
| Agent 运行时 | `openclaw`， `codex`， `copilot`， `claude-cli` | 执行已准备回合的低级循环或后端。                      |
| 渠道         | Telegram, Discord, Slack, WhatsApp              | 消息进出 OpenClaw 的地方。                            |

在代码中，您还会看到 **harness** 一词。Harness 是提供代理运行时的实现。例如，捆绑的 Codex harness 实现了 `codex` 运行时。公共配置在提供商或模型条目上使用 `agentRuntime.id`；全代理运行时键已过时并被忽略。`openclaw doctor --fix` 会移除旧的全代理运行时固定，并将旧版运行时模型引用重写为规范提供商/模型引用，以及在需要时添加模型范围的运行时策略。

有两个运行时系列：

- **嵌入式 harnesses** 在 OpenClaw 准备好的代理循环中运行。目前，这包括内置的 OpenClaw`openclaw` 运行时以及已注册的插件 harnesses，例如 `codex` 和 `copilot`。
- **CLI 后端** 在保持模型引用规范的同时运行本地 CLI 进程。例如，带有模型范围 `agentRuntime.id: "claude-cli"`CLICLI 的 AnthropicCLI`anthropic/claude-opus-4-8` 意味着“选择 Anthropic 模型，通过 Claude CLI 执行”。`claude-cli` 不是嵌入式 harness ID，不得传递给 AgentHarness 选择。

`copilot`GitHubCLIGitHub 配线架是一个独立的、可选的外部插件配线架，用于 GitHub Copilot CLI；有关 PI、Codex 和 GitHub Copilot agent 运行时之间的面向用户的决策，请参阅 [GitHub Copilot agent 运行时](/zh/plugins/copilotGitHub)。

## Codex 表面

大多数混淆源于几个不同的表面共享 Codex 名称：

| 表面                                  | OpenClaw 名称/配置                   | 其作用                                                                               |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Codex 原生应用服务器运行时            | `openai/*` 模型引用                  | 通过 Codex 应用服务器运行 OpenAI 嵌入式代理轮次。这是常见的 ChatGPT/Codex 订阅设置。 |
| Codex OAuth 身份验证配置文件          | `openai`OAuth OAuth 配置文件         | 存储 Codex 应用服务器适配器使用的 ChatGPT/Codex 订阅身份验证。                       |
| Codex ACP 适配器                      | `runtime: "acp"`, `agentId: "codex"` | 通过外部 ACP/acpx 控制平面运行 Codex。仅在明确要求使用 ACP/acpx 时使用。             |
| Codex 原生聊天控制命令集              | `/codex ...`                         | 从聊天中绑定、恢复、引导、停止和检查 Codex 应用服务器线程。                          |
| 用于非代理界面的 OpenAI 平台 API 路由 | `openai/*` 加上 API 密钥身份验证     | 用于直接调用 OpenAI API，例如图像、嵌入、语音和实时。                                |

这些表面是有意独立的。启用 `codex` 插件即可使用原生应用服务器功能；`openclaw doctor --fix` 负责传统的遗留 Codex 路由修复和过期会话固定清理。现在，为代理模型选择 `openai/*`OpenAIAPI 意味着“通过 Codex 运行此模型”，除非使用的是非代理 OpenAI API 表面。

常见的 ChatGPT/Codex 订阅设置使用 Codex OAuth 进行身份验证，但将模型引用保留为 OAuth`openai/*` 并选择 `codex` 运行时：

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

当启用捆绑的 `codex` 插件时，自然语言 Codex 控制应使用原生 `/codex` 命令表面（`/codex bind`，`/codex threads`，`/codex resume`，`/codex steer`，`/codex stop`CLI）而不是 ACP。仅当用户明确要求 ACP/acpx 或正在测试 ACP 适配器路径时，才对 Codex 使用 ACP。Claude Code、Gemini CLI、OpenCode、Cursor 和类似的外部配线架仍使用 ACP。

这是面向代理的决策树：

1. 如果用户要求 **Codex bind/control/thread/resume/steer/stop**，请在启用捆绑的 `codex` 插件时使用原生 `/codex` 命令表面。
2. 如果用户要求 **Codex 作为嵌入式运行时** 或希望获得正常的订阅支持的 Codex 代理体验，请使用 `openai/<model>`。
3. 如果用户明确选择 **OpenClaw 用于 OpenAI 模型**，请将模型引用
   保持为 OpenClawOpenAI`openai/<model>`，并将提供商/模型运行时策略设置为
   `agentRuntime.id: "openclaw"`。选定的 `openai`OAuthOpenClaw OAuth 配置文件通过
   OpenClaw 的 Codex-auth 传输在内部进行路由。
4. 如果旧版配置仍包含 **旧版 Codex 模型引用**，请将其修复为
   `openai/<model>` 并使用 `openclaw doctor --fix`；doctor 会通过添加提供商/模型范围的 `agentRuntime.id: "codex"` 来保留 Codex 认证
   路由，其中
   旧模型引用隐含了这一点。
   旧版 **`codex-cli/*` 模型引用** 会修复到相同的 `openai/<model>`OpenClawCLI Codex
   应用服务器路由；OpenClaw 不再保留捆绑的 Codex CLI 后端。
5. 如果用户明确说 **ACP**、**acpx** 或 **Codex ACP 适配器**，请使用
   带有 `runtime: "acp"` 和 `agentId: "codex"` 的 ACP。
6. 如果请求是针对 **Claude Code、Gemini CLI、OpenCode、Cursor、Droid 或
   另一个外部工具**，请使用 ACP/acpx，而不是原生子代理运行时。

| 您的意思是...                    | 使用...                              |
| -------------------------------- | ------------------------------------ |
| Codex 应用服务器聊天/会话控制    | 来自捆绑 `codex` 插件的 `/codex ...` |
| Codex 应用服务器嵌入式代理运行时 | `openai/*` 代理模型引用              |
| OpenAI Codex OAuth               | `openai`OAuth OAuth 配置文件         |
| Claude Code 或其他外部线束       | ACP/acpx                             |

有关 OpenAI 系列前缀的拆分，请参阅 [OpenAI](OpenAIOpenAI/en/providers/openai) 和
[模型提供商](/zh/concepts/model-providers)。有关 Codex 运行时支持
协议，请参阅 [Codex harness 运行时](/zh/plugins/codex-harness-runtime#v1-support-contract)。

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

1. 模型范围的运行时策略优先。这可以位于已配置的提供商
   模型条目中或位于 `agents.defaults.models["provider/model"].agentRuntime` /
   `agents.list[].models["provider/model"].agentRuntime` 中。提供商通配符
   （例如 `agents.defaults.models["vllm/*"].agentRuntime`）在精确
   模型策略之后应用，因此动态发现的提供商模型可以共享一个
   运行时，而无需覆盖精确的每个模型异常。
2. 提供商范围的运行时策略接下来在
   `models.providers.<provider>.agentRuntime` 处生效。
3. 在 `auto` 模式下，注册的插件运行时可以声明支持的提供商/模型
   对。
4. 如果没有任何运行时在 `auto`OpenClaw 模式下认领一个轮次，OpenClaw 将使用 `openclaw` 作为
   兼容性运行时。当运行必须严格时，请使用显式的运行时 ID。

整个会话和整个代理的运行时固定配置将被忽略。这包括
`OPENCLAW_AGENT_RUNTIME`、会话 `agentHarnessId`/`agentRuntimeOverride` 状态、
`agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。运行
`openclaw doctor --fix`OpenClaw 以清除过时的整个代理运行时配置，并在 OpenClaw 可以保留意图的地方转换
旧版运行时模型引用。

显式的提供商/模型插件运行时将以失败告终（fail closed）。例如，
提供商或模型上的 `agentRuntime.id: "codex"`OpenClaw 意味着 Codex 或明确的
选择/运行时错误；它永远不会被静默回退到 OpenClaw。

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

诸如 `claude-cli/claude-opus-4-7` 之类的旧版引用仍然受到支持以
保持兼容性，但新配置应保持提供商/模型的规范性，并将
执行后端置于提供商/模型运行时策略中。

旧版 `codex-cli/*` 引用有所不同：doctor 会将其迁移到 `openai/*`CLI，以便
它们通过 Codex 应用服务器工具包运行，而不是保留 Codex CLI
后端。

对于大多数提供商而言，`auto`OpenAI 模式是有意保守的。OpenAI 代理
模型是例外：未设置的运行时和 `auto`OpenClaw 都解析为 Codex
工具包。显式的 OpenClaw 运行时配置仍然是
`openai/*` 代理轮次的可选兼容性路径；当与选定的 `openai`OAuthOpenClaw OAuth 配置文件
配对时，OpenClaw 通过 Codex-auth 传输在内部路由该路径，同时
将公共模型引用保持为 `openai/*`OpenAI。过时的 OpenAI 运行时会话固定配置
被运行时选择忽略，并且可以使用 `openclaw doctor --fix` 清除。

如果 `openclaw doctor` 警告在配置中保留了旧版 Codex 模型引用时启用了 `codex` 插件，请将其视为旧路由状态。运行 `openclaw doctor --fix` 将其重写为使用 Codex 运行时的 `openai/*`。

## GitHub Copilot 代理运行时

外部 `@openclaw/copilot` 插件注册了一个可选的 `copilot` 运行时，该运行时由 GitHub Copilot CLI (`@github/copilot-sdk`) 支持。它声明了规范的订阅 `github-copilot` 提供商，并且 **从不** 被 `auto` 选中。通过 `agentRuntime.id` 针对每个模型或每个提供商进行选择：

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

该适配器在 `extensions/copilot/doctor-contract-api.ts` 中声明其提供商、运行时、CLI 会话密钥和身份验证配置文件前缀，`openclaw doctor` 会自动加载这些内容。有关配置、身份验证、记录镜像、压缩、doctor 探测表面以及更广泛的 PI vs Codex vs Copilot SDK 决策，请参阅 [GitHub Copilot agent runtime](/zh/plugins/copilot)。

## 兼容性约定

当运行时不是 OpenClaw 时，它应该记录其支持哪些 OpenClaw 表面。使用此形状作为运行时文档：

| 问题                         | 为什么重要                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 谁拥有模型循环？             | 决定重试、工具延续和最终答案决策的发生位置。                                          |
| 谁拥有标准的会话记录？       | 决定 OpenClaw 是可以编辑记录还是只能镜像记录。                                        |
| OpenClaw 动态工具是否有效？  | 消息传递、会话、cron 和 OpenClaw 拥有的工具依赖于此。                                 |
| 动态工具钩子是否有效？       | 插件期望 `before_tool_call`、`after_tool_call` 以及围绕 OpenClaw 拥有的工具的中间件。 |
| 原生工具钩子是否有效？       | Shell、补丁和运行时拥有的工具需要原生钩子支持以实现策略和观察。                       |
| 上下文引擎生命周期是否运行？ | 内存和上下文插件依赖于组装、摄取、轮次后和压缩生命周期。                              |
| 暴露了哪些压缩数据？         | 某些插件只需要通知，而其他插件则需要保留/丢弃的元数据。                               |
| 有哪些故意不支持的功能？     | 用户不应假设 OpenClaw 等效，特别是在原生运行时拥有更多状态的情况下。                  |

Codex 运行时支持合同记录在
[Codex harness runtime](/zh/plugins/codex-harness-runtime#v1-support-contract) 中。

## 状态标签

状态输出可能同时显示 `Execution` 和 `Runtime` 标签。请将它们视为诊断信息，而非提供商名称。

- 诸如 `openai/gpt-5.5` 之类的模型引用会告诉你所选的提供商/模型。
- 诸如 `codex` 之类的运行时 ID 会告诉你哪个循环正在执行该轮对话。
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
