---
title: "代理插件"
sidebarTitle: "代理"
summary: "用于替换底层嵌入式代理执行器的实验性 SDK 接口"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

# 代理插件

**代理** 是准备好的 OpenClaw 代理回合的低级执行器。它不是模型提供商，不是渠道，也不是工具注册表。

仅将此接口用于捆绑或受信任的原生插件。该协议仍然是实验性的，因为参数类型有意镜像了当前的嵌入式运行器。

## 何时使用代理

当模型系列拥有自己的原生会话运行时，并且常规的 OpenClaw 提供商传输属于错误的抽象层时，请注册一个代理。

示例：

- 拥有线程和压缩功能的原生编码代理服务器
- 必须流式传输原生计划/推理/工具事件的本地 CLI 或守护进程
- 除 OpenClaw 会话记录外，还需要自己的恢复 ID 的模型运行时

不要仅仅为了添加新的 LLM API 而注册 harness。对于普通的 HTTP 或
WebSocket 模型 API，请构建 [提供商插件](/zh/plugins/sdk-provider-plugins)。

## 核心仍然拥有的部分

在选择代理之前，OpenClaw 已经解析了：

- 提供商和模型
- 运行时身份验证状态
- 思考级别和上下文预算
- OpenClaw 记录/会话文件
- 工作区、沙盒和工具策略
- 渠道回复回调和流式回调
- 模型回退和实时模型切换策略

这种划分是有意的。代理运行准备好的尝试；它不选择提供商，不替换渠道交付，也不静默切换模型。

## 注册代理

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

OpenClaw 在提供商/模型解析后选择代理：

1. `OPENCLAW_AGENT_RUNTIME=<id>` 强制使用具有该 ID 的已注册代理。
2. `OPENCLAW_AGENT_RUNTIME=pi` 强制使用内置的 PI 代理。
3. `OPENCLAW_AGENT_RUNTIME=auto` 询问已注册的代理是否支持已解析的
   提供商/模型。
4. 如果没有匹配的已注册代理，OpenClaw 将使用 PI，除非禁用了 PI 回退。

插件 harness 失败会表现为运行失败。在 `auto` 模式下，只有当没有注册的插件 harness 支持已解析的
提供商/模型时，才会使用 PI 回退。一旦插件 harness 接管了运行，OpenClaw 就不会
通过 PI 重放同一轮次，因为这可能会改变身份验证/运行时语义
或导致副作用重复。

内置的 Codex 插件将 `codex` 注册为其 harness id。Core 将其
视为普通的插件 harness id；Codex 特定的别名应属于插件
或 operator 配置，而不属于共享的运行时选择器。

## 提供商与 harness 配对

大多数插件还应该注册一个提供商。提供商使模型引用、身份验证状态、模型元数据和 `/model` 选择对 OpenClaw 的其余部分可见。然后，该插件会在 `supports(...)` 中声明该提供商。

捆绑的 Codex 插件遵循此模式：

- 提供商 ID：`codex`
- 用户模型引用：`codex/gpt-5.4`、`codex/gpt-5.2`，或 Codex 应用服务器返回的另一个模型
- 插件 ID：`codex`
- 身份验证：合成提供商可用性，因为 Codex harness 拥有原生 Codex 登录/会话
- 应用服务器请求：OpenClaw 将原始模型 ID 发送给 Codex，并让 harness 与原生应用服务器协议通信

Codex 插件是增量式的。普通的 `openai/gpt-*` 引用仍然是 OpenAI 提供商引用，并继续使用常规的 OpenClaw 提供商路径。当您需要 Codex 管理的身份验证、Codex 模型发现、原生线程和 Codex 应用服务器执行时，请选择 `codex/gpt-*`。`/model` 可以在 Codex 应用服务器返回的 Codex 模型之间切换，而无需 OpenAI 提供商凭据。

有关操作员设置、模型前缀示例和仅 Codex 配置，请参阅 [Codex Harness](/zh/plugins/codex-harness)。

OpenClaw 需要 Codex 应用服务器 `0.118.0` 或更新版本。Codex 插件会检查应用服务器初始化握手，并阻止较旧或未版本化的服务器，因此 OpenClaw 仅针对已测试过的协议表面运行。

### Codex 应用服务器工具结果中间件

打包的插件还可以在其清单声明 `contracts.embeddedExtensionFactories: ["codex-app-server"]` 时，通过 `api.registerCodexAppServerExtensionFactory(...)` 附加 Codex 应用服务器特定的 `tool_result` 中间件。这是受信任插件的接缝，用于在 OpenClaw 脚本中投射工具输出之前，需要在本地 Codex 挽具内运行的异步工具结果转换。

### 本地 Codex 挽具模式

打包的 `codex` 挽具是嵌入式 OpenClaw 代理轮次的本地 Codex 模式。首先启用打包的 `codex` 插件，如果你的配置使用限制性允许列表，请在 `plugins.allow` 中包含 `codex`。它与 `openai-codex/*` 不同：

- `openai-codex/*` 通过常规 OAuth 提供商路径使用 ChatGPT/Codex OpenClaw。
- `codex/*` 使用捆绑的 Codex 提供商并通过 Codex 应用服务器路由轮次。

当此模式运行时，Codex 拥有原生线程 ID、恢复行为、压缩和应用服务器执行。OpenClaw 仍然拥有聊天渠道、可见的脚本镜像、工具策略、审批、媒体交付和会话选择。当您需要证明只有 Codex 应用服务器路径可以声明该运行时，请将 `embeddedHarness.runtime: "codex"` 与 `embeddedHarness.fallback: "none"` 一起使用。该配置仅是一个选择守卫：Codex 应用服务器故障已经直接失败，而不是通过 PI 重试。

## 禁用 PI 回退

默认情况下，OpenClaw 运行嵌入式代理时将 `agents.defaults.embeddedHarness` 设置为 `{ runtime: "auto", fallback: "pi" }`。在 `auto` 模式下，注册的插件程序可以声明提供商/模型对。如果没有匹配项，OpenClaw 将回退到 PI。

当您需要缺失的插件挂接选择失败而不是使用 PI 时，请设置 `fallback: "none"`。选定的插件挂接失败已经会导致彻底失败。这不会阻止显式的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

对于仅限 Codex 的嵌入式运行：

```json
{
  "agents": {
    "defaults": {
      "model": "codex/gpt-5.4",
      "embeddedHarness": {
        "runtime": "codex",
        "fallback": "none"
      }
    }
  }
}
```

如果您希望任何已注册的插件挂接声明匹配的模型，但绝不希望 OpenClaw 无提示地回退到 PI，请保持 `runtime: "auto"` 并禁用回退：

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
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
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "codex/gpt-5.4",
        "embeddedHarness": {
          "runtime": "codex",
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

禁用回退后，当请求的 harness 未注册、不支持解析的提供商/模型，或在产生轮次副作用前失败时，会话会提前失败。这对于仅 Codex 部署以及必须证明确实在使用 Codex 应用服务器路径的实时测试是有意的。

此设置仅控制嵌入式代理 harness。它不会禁用图像、视频、音乐、TTS、PDF 或其他提供商特定的模型路由。

## 原生会话和记录镜像

Harness 可能会保留原生会话 ID、线程 ID 或守护进程端的恢复令牌。请保持该绑定与 OpenClaw 会话显式关联，并将用户可见的助手/工具输出继续镜像到 OpenClaw 记录中。

OpenClaw 记录仍然是以下内容的兼容层：

- 渠道可见的会话历史
- 记录搜索和索引
- 在后续轮次中切换回内置的 PI harness
- generic `/new`、`/reset` 和会话删除行为

如果您的插件存储附属绑定，请实现 `reset(...)`，以便在 OpenClaw 会话重置时清除它。

## 工具和媒体结果

核心构建 OpenClaw 工具列表并将其传递给准备好的尝试。当插件执行动态工具调用时，通过插件结果形状返回工具结果，而不是自己发送渠道媒体。

这使文本、图像、视频、音乐、TTS、批准和消息工具输出与基于 PI 的运行保持在相同的传送路径上。

## 当前限制

- 公共导入路径是通用的，但某些尝试/结果类型别名仍带有 `Pi` 名称以保持兼容性。
- 第三方插件安装仍处于实验阶段。在您需要原生会话运行时之前，请优先使用提供商插件。
- 支持在轮次之间切换 Harness。切勿在本机工具、审批、助手文本或消息发送开始后的轮次中间切换 Harness。

## 相关

- [SDK 概述](/zh/plugins/sdk-overview)
- [运行时帮助程序](/zh/plugins/sdk-runtime)
- [提供商插件](/zh/plugins/sdk-provider-plugins)
- [Codex Harness](/zh/plugins/codex-harness)
- [模型提供商](/zh/concepts/model-providers)
