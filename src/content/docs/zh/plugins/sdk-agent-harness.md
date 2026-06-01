---
summary: "用于替换底层嵌入式代理执行器的插件的实验性 SDK 接口"
title: "代理插件插件"
sidebarTitle: "代理插件"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

**Agent harness** 是一个已准备的 OpenClaw agent 回合的低层执行器。它不是模型提供商，不是渠道，也不是工具注册表。有关面向用户的心智模型，请参阅 [Agent runtimes](/zh/concepts/agent-runtimes)。

请仅将此接口用于捆绑或受信任的原生插件。该合约仍处于实验阶段，因为参数类型有意反映了当前的嵌入式运行器。

## 何时使用插件

当模型系列拥有自己的原生会话运行时，并且常规的 OpenClaw 提供商传输是错误的抽象时，请注册一个代理插件。

示例：

- 拥有线程和压缩功能的原生编码代理服务器
- 必须流式传输原生计划/推理/工具事件的本地 CLI 或守护进程
- 除了 OpenClaw 会话记录外，还需要自己的恢复 ID 的模型运行时

**不要**仅仅为了添加新的 LLM API 而注册 harness。对于正常的 HTTP 或 WebSocket 模型 API，请构建 [提供商 plugin](/zh/plugins/sdk-provider-plugins)。

## 核心仍然拥有的内容

在选择插件之前，OpenClaw 已经解析了以下内容：

- 提供商和模型
- 运行时身份验证状态
- 思维级别和上下文预算
- OpenClaw 记录/会话文件
- 工作区、沙箱和工具策略
- 渠道回复回调和流式回调
- 模型回退和实时模型切换策略

这种划分是有意的。插件运行一个已准备的尝试；它不选择提供商，不替换渠道交付，也不静默切换模型。

准备好的尝试还包括 `params.runtimePlan`，这是一个属于 OpenClaw 的策略包，用于运行时决策，该策略包必须在 OpenClaw 和原生 harness 之间保持共享：

- `runtimePlan.tools.normalize(...)` 和
  `runtimePlan.tools.logDiagnostics(...)` 用于针对提供商感知的工具架构策略
- `runtimePlan.transcript.resolvePolicy(...)` 用于记录清理和
  工具调用修复策略
- `runtimePlan.delivery.isSilentPayload(...)` 用于共享 `NO_REPLY` 和媒体
  交付抑制
- `runtimePlan.outcome.classifyRunResult(...)` 用于模型回退分类
- `runtimePlan.observability` 用于已解析的提供商/模型/工具元数据

Harness 可以使用该计划来进行需要匹配 OpenClaw 行为的决策，但仍应将其视为主机拥有的尝试状态。不要更改它或使用它在一个回合内切换提供商/模型。

## 注册工具

**导入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider" ? { supported: true, priority: 100 } : { supported: false };
  },

  async runAttempt(params) {
    // Start or resume your native thread.
    // Use params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent, and the other prepared attempt fields.
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "Runs selected models through a native agent daemon.",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## 选择策略

OpenClaw 在解析提供商/模型后选择一个工具：

1. 模型范围的运行时策略优先。
2. 其次是提供商范围的运行时策略。
3. `auto` 会询问已注册的 harness 是否支持解析后的
   提供商/模型。
4. 如果没有注册的 harness 匹配，OpenClaw 将使用其嵌入式运行时。

Plugin harness 故障表现为运行故障。在 `auto` 模式下，仅当没有注册的 plugin harness 支持解析后的提供商/模型时，才使用嵌入式回退。一旦 plugin harness 接管了运行，OpenClaw 不会通过另一个运行时重放同一回合，因为这可能会更改身份验证/运行时语义或产生重复的副作用。

整个会话和整个代理的运行时固定（pin）会被选择忽略。这
包括过时的会话 `agentHarnessId` 值、`agents.defaults.agentRuntime`、
`agents.list[].agentRuntime` 和 `OPENCLAW_AGENT_RUNTIME`。`/status` 显示了
从提供商/模型路由中选择的实际运行时。
如果选择的 harness 出乎意料，请启用 `agents/harness` 调试日志并
检查网关的结构化 `agent harness selected` 记录。它包括
所选的 harness id、选择原因、运行时/回退策略，以及在
`auto` 模式下，每个插件候选者的支持结果。

捆绑的 Codex 插件将 `codex` 注册为其 harness id。Core 将其
视为普通的插件 harness id；特定于 Codex 的别名应位于插件
或操作员配置中，而不是共享的运行时选择器中。

## 提供商与 harness 配对

大多数 Harness 也应注册一个提供商。该提供商使模型引用、身份验证状态、模型元数据和 `/model`OpenClaw 选择对 OpenClaw 的其余部分可见。然后，Harness 会在 `supports(...)` 中声明该提供商。

捆绑的 Codex 插件遵循此模式：

- 首选用户模型引用：`openai/gpt-5.5`
- 兼容性引用：传统的 `codex/gpt-*` 引用仍然被接受，但新配置不应将它们用作常规提供商/模型引用
- harness id：`codex`
- 身份验证：综合提供商可用性，因为 Codex harness 拥有原生 Codex 登录/会话
- app-server 请求：OpenClaw 将裸模型 ID 发送给 Codex，并让 harness 与原生 app-server 协议通信

Codex 插件是增补性的。官方 OpenAI 提供商上普通的 `openai/gpt-*`OpenAI 代理引用默认选择 Codex harness。较旧的 `codex/gpt-*` 引用仍然选择 Codex 提供商和 harness 以保持兼容性。

有关操作员设置、模型前缀示例和仅 Codex 配置，请参阅 [Codex Harness](/zh/plugins/codex-harness)。

OpenClaw 需要 Codex app-server OpenClaw`0.125.0`OpenClaw 或更高版本。Codex 插件会检查 app-server 初始化握手，并阻止较旧的或无版本的服务器，以确保 OpenClaw 仅针对其已测试的协议表面运行。`0.125.0` 版本下限包含在 Codex `0.124.0`OpenClaw 中落地的原生 MCP hook payload 支持，同时将 OpenClaw 固定到较新的经过测试的稳定版本线。

### 工具结果中间件

当其清单在 `contracts.agentToolResultMiddleware` 中声明了目标运行时 ID 时，Bundled plugins 可以通过 `api.registerAgentToolResultMiddleware(...)` 附加与运行时无关的工具结果中间件。这个可信的接口用于必须在 OpenClaw 或 Codex 将工具输出反馈给模型之前运行的异步工具结果转换。

传统的 bundled plugins 仍然可以使用 `api.registerCodexAppServerExtensionFactory(...)` 来实现仅 Codex 应用服务器中间件，但新的结果转换应使用与运行时无关的 API。仅限嵌入式运行器的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被移除；嵌入式工具结果转换必须使用与运行时无关的中间件。

### 终端结果分类

拥有自己协议投影的 Native harness 可以在完成的轮次未产生
可见助手文本时，使用
`classifyAgentHarnessTerminalOutcome(...)` 中的
`openclaw/plugin-sdk/agent-harness-runtime`。该辅助函数返回 `empty`、`reasoning-only` 或
`planning-only`，以便 OpenClaw 的回退策略决定是否在不同的
模型上重试。它有意保留提示词错误、进行中的轮次和
有意的静默回复（如 `NO_REPLY`）不予分类。

### Native Codex harness 模式

捆绑的 `codex` harness 是嵌入式 OpenClaw
代理轮次的 Native Codex 模式。首先启用捆绑的 `codex` 插件，并且如果您的配置使用限制性白名单，请在
`plugins.allow` 中包含 `codex`。Native 应用服务器
配置应使用 `openai/gpt-*`；OpenAI 代理轮次默认选择 Codex harness。
传统的 `openai-codex/*` 路由应使用
`openclaw doctor --fix` 进行修复，且传统的 `codex/*` 模型引用仍作为 native harness 的
兼容性别名。

当此模式运行时，Codex 拥有原生线程 ID、恢复行为、压缩和应用服务器执行权。OpenClaw 仍然拥有聊天渠道、可见的脚本镜像、工具策略、审批、媒体传递和会话选择。当您需要证明只有 Codex 应用服务器路径可以声明运行时，请使用 提供商/模型 OpenClaw`agentRuntime.id: "codex"`。显式插件运行时默认失败；Codex 应用服务器选择失败和运行时失败不会通过其他运行时重试。

## 运行时严格性

默认情况下，OpenClaw 使用 OpenClaw`auto`OpenAIOpenAI 提供商/模型 运行时策略：已注册的插件 harness 可以声明 提供商/模型 对，而当没有匹配项时，嵌入式运行时处理该轮次。官方 OpenAI 提供商上的 OpenAI 代理引用默认为 Codex。当缺少 harness 选择应该失败而不是通过嵌入式运行时路由时，请使用显式 提供商/模型 插件运行时（例如 `agentRuntime.id: "codex"`）。所选插件 harness 失败总是彻底失败。这不会阻止显式 提供商/模型 `agentRuntime.id: "openclaw"`。

对于仅限 Codex 的嵌入式运行：

```json
{
  "models": {
    "providers": {
      "openai": {
        "agentRuntime": {
          "id": "codex"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5"
    }
  }
}
```

如果您想要一个用于规范模型（canonical 模型）的 CLI 后端，请将运行时放在该模型条目上：

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-8",
      "models": {
        "anthropic/claude-opus-4-8": {
          "agentRuntime": {
            "id": "claude-cli"
          }
        }
      }
    }
  }
}
```

每个代理的覆盖使用相同的模型范围形状：

```json
{
  "agents": {
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "models": {
          "openai/gpt-5.5": {
            "agentRuntime": { "id": "codex" }
          }
        }
      }
    ]
  }
}
```

像这样的旧版整体代理运行时示例会被忽略：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

使用显式插件运行时时，如果请求的 harness 未注册、不支持解析的 提供商/模型，或在产生轮次副作用之前失败，会话将提前失败。这对于仅限 Codex 的部署以及必须证明 Codex 应用服务器路径确实正在使用的实时测试是有意为之。

此设置仅控制嵌入式代理 harness。它不会禁用图像、视频、音乐、TTS、PDF 或其他特定于提供商的模型路由。

## 原生会话和记录镜像

Harness 可以保留原生会话 ID、线程 ID 或守护进程端的恢复令牌。请保持该绑定与 OpenClaw 会话显式关联，并继续将用户可见的助手/工具输出镜像到 OpenClaw 记录中。

OpenClaw 记录仍然是以下内容的兼容层：

- 渠道可见的会话历史
- 记录搜索和索引
- 在随后的轮次中切换回内置的 OpenClaw harness
- 通用的 `/new`、`/reset` 和会话删除行为

如果您的 harness 存储了 sidecar 绑定，请实现 `reset(...)`OpenClawOpenClaw，以便当 OpenClaw 会话所属的会话重置时，OpenClaw 可以将其清除。

## 工具和媒体结果

Core 构建 OpenClaw 工具列表并将其传递给准备好的尝试。当挽具执行动态工具调用时，请通过挽具结果形状返回工具结果，而不是自己发送渠道媒体。

这将使文本、图像、视频、音乐、TTS、审批和消息工具输出与 OpenClaw 支持的运行保持在相同的传递路径上。

## 当前限制

- 公共导入路径是通用的，但某些尝试/结果类型别名为了兼容性仍保留旧名称。
- 第三方挽具安装是实验性的。在您需要原生会话运行时之前，请优先使用提供商插件。
- 支持跨回合切换挽具。在原生工具、批准、助手文本或消息发送开始后，请勿在回合中间切换挽具。

## 相关

- [SDK 概述](/zh/plugins/sdk-overview)
- [运行时助手](/zh/plugins/sdk-runtime)
- [提供商插件](/zh/plugins/sdk-provider-plugins)
- [Codex Harness](/zh/plugins/codex-harness)
- [模型提供商](/zh/concepts/model-providers)
