---
summary: "用于替换底层嵌入式代理执行器的插件的实验性 SDK 接口"
title: "代理插件插件"
sidebarTitle: "代理插件"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

**代理插件** 是一个已准备的 OpenClaw 代理轮次的底层执行器。它不是模型提供商，不是渠道，也不是工具注册表。有关面向用户的心智模型，请参阅 [代理运行时](/zh/concepts/agent-runtimes)。

请仅将此接口用于捆绑或受信任的原生插件。该合约仍处于实验阶段，因为参数类型有意反映了当前的嵌入式运行器。

## 何时使用插件

当模型系列拥有自己的原生会话运行时，并且常规的 OpenClaw 提供商传输是错误的抽象时，请注册一个代理插件。

示例：

- 拥有线程和压缩功能的原生编码代理服务器
- 必须流式传输原生计划/推理/工具事件的本地 CLI 或守护进程
- 除了 OpenClaw 会话记录外，还需要自己的恢复 ID 的模型运行时

请**勿**仅为了添加新的 LLM API 而注册插件。对于普通的 HTTP 或 WebSocket 模型 API，请构建 [提供商插件](/zh/plugins/sdk-provider-plugins)。

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

已准备的尝试还包括 `params.runtimePlan`，这是一个 OpenClaw 拥有的策略包，用于必须在 PI 和原生插件之间保持共享的运行时决策：

- `runtimePlan.tools.normalize(...)` 和
  `runtimePlan.tools.logDiagnostics(...)` 用于针对提供商感知的工具架构策略
- `runtimePlan.transcript.resolvePolicy(...)` 用于记录清理和
  工具调用修复策略
- `runtimePlan.delivery.isSilentPayload(...)` 用于共享 `NO_REPLY` 和媒体
  交付抑制
- `runtimePlan.outcome.classifyRunResult(...)` 用于模型回退分类
- `runtimePlan.observability` 用于已解析的提供商/模型/工具元数据

工具可以使用该计划来做出需要匹配 PI 行为的决策，但仍应将其视为宿主拥有的尝试状态。不要更改它，也不要使用它在一次回合内切换提供商/模型。

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

1. 现有会话记录的工具 ID 优先，因此配置/环境更改不会将该对话热切换到另一个运行时。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 强制为尚未固定的会话使用具有该 ID 的已注册工具。
3. `OPENCLAW_AGENT_RUNTIME=pi` 强制使用内置 PI 工具。
4. `OPENCLAW_AGENT_RUNTIME=auto` 询问已注册的工具是否支持已解析的提供商/模型。
5. 如果没有匹配的已注册工具，OpenClaw 将使用 PI，除非禁用了 PI 回退。

插件工具故障表现为运行故障。在 `auto` 模式下，仅当没有已注册的插件工具支持已解析的提供商/模型时才使用 PI 回退。一旦插件工具声明了运行，OpenClaw 就不会通过 PI 重放同一回合，因为这可能会更改身份验证/运行时语义或导致副作用重复。

选定的工具 ID 会在嵌入式运行后与会话 ID 一起持久化。在工具固定之前创建的旧会话一旦具有对话历史，就会被视为 PI 固定。在 PI 和本机插件工具之间切换时，请使用新的/重置的会话。`/status` 在 `Fast` 旁边显示非默认工具 ID（如 `codex`）；PI 保持隐藏，因为它是默认兼容路径。如果选定的工具令人惊讶，请启用 `agents/harness` 调试日志并检查网关的结构化 `agent harness selected` 记录。它包括选定的工具 ID、选择原因、运行时/回退策略，以及在 `auto` 模式下，每个插件候选者的支持结果。

捆绑的 Codex 插件将 `codex` 注册为其 harness id。Core 将其视为普通的插件 harness id；Codex 特定的别名应属于插件或 operator 配置，而不属于共享的 runtime selector。

## 提供商与 harness 配对

大多数 harness 也应注册一个提供商。提供商使模型引用、身份验证状态、模型元数据和 `/model` 选择对 OpenClaw 的其余部分可见。然后 harness 在 `supports(...)` 中声明该提供商。

捆绑的 Codex 插件遵循此模式：

- 首选用户模型引用：`openai/gpt-5.5` 加上
  `agentRuntime.id: "codex"`
- 兼容性引用：遗留的 `codex/gpt-*` 引用仍然被接受，但新的
  配置不应将其用作普通的提供商/模型引用
- harness id：`codex`
- 身份验证：综合提供商可用性，因为 Codex harness 拥有
  原生 Codex 登录/会话
- 应用服务器请求：OpenClaw 将原始模型 id 发送给 Codex 并让
  harness 与原生应用服务器协议通信

Codex 插件是增补性的。除非您使用 `agentRuntime.id: "codex"` 强制使用 Codex harness，否则普通的 `openai/gpt-*` 引用继续使用
普通的 OpenClaw 提供商路径。较旧的 `codex/gpt-*` 引用仍然选择
Codex 提供商和 harness 以实现兼容性。

有关 operator 设置、模型前缀示例和仅 Codex 配置，请参阅
[Codex Harness](/zh/plugins/codex-harness)。

OpenClaw 需要 Codex 应用服务器 `0.125.0` 或更新版本。Codex 插件检查
应用服务器初始化握手并阻止较旧或未版本化的服务器，以便
OpenClaw 仅针对其已测试过的协议界面运行。
`0.125.0` 版本下限包括 Codex `0.124.0` 中引入的原生 MCP hook 负载支持，同时将 OpenClaw 固定到较新的已测试稳定版本。

### 工具结果中间件

当插件清单在 `contracts.agentToolResultMiddleware` 中声明了目标运行时 ID 时，打包插件可以通过 `api.registerAgentToolResultMiddleware(...)` 附带与运行时无关的工具结果中间件。这个受信任的接口专用于必须在 Pi 或 Codex 将工具输出反馈给模型之前运行的异步工具结果转换。

旧的打包插件仍然可以使用 `api.registerCodexAppServerExtensionFactory(...)` 来实现仅限 Codex 应用服务器的中间件，但新的结果转换应使用与运行时无关的 API。仅限 Pi 的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被移除；Pi 工具结果转换必须使用与运行时无关的中间件。

### 终端结果分类

拥有自己的协议投影的原生工具可以使用 `classifyAgentHarnessTerminalOutcome(...)` 中的 `openclaw/plugin-sdk/agent-harness-runtime`，当完成的回合未产生可见的助手文本时。该辅助程序返回 `empty`、`reasoning-only` 或 `planning-only`，以便 OpenClaw 的回退策略决定是否在不同的模型上重试。它有意地将提示错误、进行中的回合以及 `NO_REPLY` 等有意的静默回复保留为未分类状态。

### 原生 Codex 工具模式

打包的 `codex` 工具是嵌入式 OpenClaw 代理回合的原生 Codex 模式。首先启用打包的 `codex` 插件，如果您的配置使用限制性允许列表，请在 `plugins.allow` 中包含 `codex`。原生应用服务器配置应将 `openai/gpt-*` 与 `agentRuntime.id: "codex"` 一起使用。请改用 `openai-codex/*` 通过 Pi 进行 Codex OAuth。旧的 `codex/*` 模型引用仍然是原生工具的兼容性别名。

当此模式运行时，Codex 拥有本机线程 ID、恢复行为、压缩和应用服务器执行的所有权。OpenClaw 仍然拥有聊天渠道、可见的脚本镜像、工具策略、审批、媒体传递和会话选择。当您需要证明只有 Codex 应用服务器路径可以声明运行时，请使用 `agentRuntime.id: "codex"` 而不带 `fallback` 覆盖。显式插件运行时在默认情况下已经是 fail closed。仅当您有意希望 PI 处理缺少 harness 选择时才设置 `fallback: "pi"`。Codex 应用服务器失败时已经是直接失败，而不是通过 PI 重试。

## 禁用 PI 回退

默认情况下，OpenClaw 运行嵌入的代理时，`agents.defaults.agentRuntime` 设置为 `{ id: "auto", fallback: "pi" }`。在 `auto` 模式下，已注册的插件 harness 可以声明提供商/模型对。如果没有匹配项，OpenClaw 将回退到 PI。

在 `auto` 模式下，当您需要缺少插件 harness 选择时失败而不是使用 PI，请设置 `fallback: "none"`。诸如 `runtime: "codex"` 之类的显式插件运行时在默认情况下已经是 fail closed，除非在同一配置或环境覆盖范围内设置了 `fallback: "pi"`。所选插件 harness 失败总是会导致彻底失败。这不会阻止显式的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

对于仅限 Codex 的嵌入式运行：

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

如果您希望任何已注册的插件 harness 声明匹配的模型，但从不希望 OpenClaw 无声地回退到 PI，请保留 `runtime: "auto"` 并禁用回退：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "none"
      }
    }
  }
}
```

每个代理的覆盖使用相同的形状：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "agentRuntime": {
          "id": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` 仍然会覆盖配置的运行时。使用 `OPENCLAW_AGENT_HARNESS_FALLBACK=none` 从环境禁用 PI 回退。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

禁用回退后，当请求的 harness 未注册、不支持解析的提供商/模型或在产生轮次副作用之前失败时，会话将提前失败。这对于仅限 Codex 的部署以及必须证明实际正在使用 Codex 应用服务器路径的实时测试是有意的。

此设置仅控制嵌入式代理 harness。它不会禁用图像、视频、音乐、TTS、PDF 或其他特定于提供商的模型路由。

## 原生会话和记录镜像

Harness 可以保留原生会话 ID、线程 ID 或守护进程端的恢复令牌。
请保持该绑定与 OpenClaw 会话明确关联，并继续将用户可见的助手/工具输出镜像到 OpenClaw 记录中。

OpenClaw 记录仍然是以下内容的兼容层：

- 渠道可见的会话历史
- 记录搜索和索引
- 在后续轮次中切回内置的 PI harness
- 通用的 `/new`、`/reset` 和会话删除行为

如果您的 harness 存储了附属绑定，请实现 `reset(...)`，以便 OpenClaw 在所属 OpenClaw 会话重置时清除它。

## 工具和媒体结果

Core 构建 OpenClaw 工具列表并将其传递给准备好的尝试。
当 harness 执行动态工具调用时，请通过 harness 结果形状返回工具结果，而不是自行发送渠道媒体。

这使文本、图像、视频、音乐、TTS、批准和消息传递工具输出
与 PI 支持的运行保持在相同的传递路径上。

## 当前限制

- 公共导入路径是通用的，但某些尝试/结果类型别名仍然
  携带 `Pi` 名称以保持兼容性。
- 第三方 harness 安装是实验性的。在您需要原生会话运行时之前，请优先选择提供商插件。
- 支持跨轮次切换 harness。不要在轮次中途切换 harness，
  尤其是在原生工具、批准、助手文本或消息发送开始之后。

## 相关

- [SDK 概述](/zh/plugins/sdk-overview)
- [运行时帮助程序](/zh/plugins/sdk-runtime)
- [提供商插件](/zh/plugins/sdk-provider-plugins)
- [Codex Harness](/zh/plugins/codex-harness)
- [模型提供商](/zh/concepts/model-providers)
