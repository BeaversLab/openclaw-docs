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

**不要**仅仅为了添加新的 LLM API 而注册 harness。对于普通的 HTTP 或 WebSocket 模型 API，请构建 [提供商插件](/en/plugins/sdk-provider-plugins)。

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

强制的插件 harness 故障会表现为运行故障。在 `auto` 模式下，当所选插件 harness 在一轮产生副作用之前失败时，OpenClaw 可能会回退到 PI。设置 `OPENCLAW_AGENT_HARNESS_FALLBACK=none` 或 `embeddedHarness.fallback: "none"` 以使该回退变为硬故障。

捆绑的 Codex 插件注册 `codex` 作为其 harness ID。Core 将其视为普通的插件 harness ID；Codex 特有的别名属于插件或操作员配置，而不属于共享的运行时选择器。

## 提供商与 harness 配对

大多数 harness 也应该注册一个提供商。提供商使模型引用、身份验证状态、模型元数据和 `/model` 选择对 OpenClaw 的其余部分可见。然后 harness 在 `supports(...)` 中声明该提供商。

捆绑的 Codex 插件遵循此模式：

- 提供商 ID：`codex`
- 用户模型引用：`codex/gpt-5.4`、`codex/gpt-5.2` 或 Codex 应用服务器返回的其他模型
- harness ID：`codex`
- 身份验证：合成提供商可用性，因为 Codex harness 拥有原生 Codex 登录/会话
- 应用服务器请求：OpenClaw 将原始模型 ID 发送给 Codex，并让 harness 与原生应用服务器协议通信

Codex 插件是累加的。纯 `openai/gpt-*` 引用仍然是 OpenAI 提供商引用，并继续使用正常的 OpenClaw 提供商路径。当您需要 Codex 管理的身份验证、Codex 模型发现、原生线程和 Codex 应用服务器执行时，请选择 `codex/gpt-*`。`/model` 可以在 Codex 应用服务器返回的 Codex 模型之间切换，而无需 OpenAI 提供商凭据。

有关操作员设置、模型前缀示例以及 Codex 专用配置，请参阅 [Codex Harness](/en/plugins/codex-harness)。

OpenClaw 需要 Codex 应用服务器 `0.118.0` 或更新版本。Codex 插件会检查应用服务器初始化握手，并阻止较旧或未版本化的服务器，以便 OpenClaw 仅针对已测试的协议表面运行。

### 原生 Codex harness 模式

捆绑的 `codex` harness 是嵌入式 OpenClaw 代理轮次的原生 Codex 模式。首先启用捆绑的 `codex` 插件，如果您的配置使用限制性允许列表，请在 `plugins.allow` 中包含 `codex`。它与 `openai-codex/*` 不同：

- `openai-codex/*` 通过正常的 OpenClaw 提供商路径使用 ChatGPT/Codex OAuth。
- `codex/*` 使用捆绑的 Codex 提供商，并将轮次通过 Codex 应用服务器进行路由。

当此模式运行时，Codex 拥有原生线程 ID、恢复行为、压缩和应用服务器执行。OpenClaw 仍然拥有聊天渠道、可见的转录镜像、工具策略、审批、媒体传递和会话选择。当您需要证明使用了 Codex 应用服务器路径，并且 PI 回退没有掩盖损坏的原生 harness 时，请将 `embeddedHarness.runtime: "codex"` 与 `embeddedHarness.fallback: "none"` 一起使用。

## 禁用 PI 回退

默认情况下，OpenClaw 运行嵌入式代理时将 `agents.defaults.embeddedHarness` 设置为 `{ runtime: "auto", fallback: "pi" }`。在 `auto` 模式下，注册的插件 harness 可以声明提供商/模型对。如果没有匹配项，或者自动选择的插件 harness 在产生输出之前失败，OpenClaw 将回退到 PI。

当您需要证明插件 harness 是唯一正在使用的运行时时，请设置 `fallback: "none"`。这将禁用自动 PI 回退；它不会阻止显式的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

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

如果您希望任何注册的插件 harness 声明匹配的模型，但不希望 OpenClaw 静默回退到 PI，请保留 `runtime: "auto"` 并禁用回退：

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

`OPENCLAW_AGENT_RUNTIME` 仍然会覆盖已配置的运行时。使用
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 来禁用来自环境的
PI 回退。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

禁用回退后，当请求的连接器未注册、不支持解析的提供商/模型，或在产生轮次副作用之前失败时，会话将提前失败。这对于仅 Codex 的部署以及必须证明 Codex 应用服务器路径确实正在使用的实时测试来说是有意为之。

此设置仅控制嵌入式代理连接器。它不会禁用图像、视频、音乐、TTS、PDF 或其他特定于提供商的模型路由。

## 原生会话和记录镜像

连接器可以保留原生会话 ID、线程 ID 或守护程序端的恢复令牌。
将该绑定显式地与 OpenClaw 会话相关联，并继续将用户可见的助手/工具输出镜像到 OpenClaw 记录中。

OpenClaw 记录仍然是以下内容的兼容层：

- 渠道可见的会话历史
- 记录搜索和索引
- 在后续轮次中切换回内置的 PI 连接器
- 通用的 `/new`、`/reset` 和会话删除行为

如果您的连接器存储了 sidecar 绑定，请实现 `reset(...)`，以便 OpenClaw 可以在所属 OpenClaw 会话重置时将其清除。

## 工具和媒体结果

核心构建 OpenClaw 工具列表并将其传递给准备好的尝试。当连接器执行动态工具调用时，通过连接器结果形状返回工具结果，而不是自己发送渠道媒体。

这使得文本、图像、视频、音乐、TTS、批准和消息传递工具的输出与 PI 支持的运行保持相同的交付路径。

## 当前限制

- 公共导入路径是通用的，但某些尝试/结果类型别名仍然
  带有 `Pi` 名称以保持兼容性。
- 第三方连接器安装是实验性的。优先选择提供商插件，
  直到您需要原生会话运行时。
- 支持跨轮次切换连接器。在原生工具、批准、助手文本或消息
  发送开始后的轮次中间，不要切换连接器。

## 相关

- [SDK 概述](/en/plugins/sdk-overview)
- [运行时助手](/en/plugins/sdk-runtime)
- [提供程序插件](/en/plugins/sdk-provider-plugins)
- [Codex 装置](/en/plugins/codex-harness)
- [模型提供程序](/en/concepts/model-providers)
