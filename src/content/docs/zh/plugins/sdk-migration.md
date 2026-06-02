---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

OpenClaw 已从一个广泛的向后兼容层转变为一个具有重点、文档化导入的现代插件架构。如果您的插件是在新架构之前构建的，本指南将帮助您进行迁移。

## 有什么变化

旧的插件系统提供了两个开放的面，允许插件从单个入口点导入它们需要的任何内容：

- **`openclaw/plugin-sdk/compat`** - 一个单一导入，重新导出了数十个
  辅助函数。引入它是为了在构建
  新插件架构时保持旧的基于 Hook 的插件继续工作。
- **`openclaw/plugin-sdk/infra-runtime`** - 一个广泛的运行时辅助函数集合，
  混合了系统事件、心跳状态、传递队列、获取/代理辅助函数、
  文件辅助函数、审批类型和不相关的实用工具。
- **`openclaw/plugin-sdk/config-runtime`** - 一个广泛的配置兼容性集合，
  在迁移窗口期内仍然包含已弃用的直接加载/写入
  辅助函数。
- **`openclaw/extension-api`** - 一座桥梁，赋予插件对
  主机端辅助函数（如嵌入式代理运行器）的直接访问权限。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一个已移除的仅限嵌入式运行器的捆绑
  扩展 Hook，可以观察嵌入式运行器事件，例如
  `tool_result`。

这些广泛的导入接口现已**弃用**。它们在运行时仍然有效，但新插件不得使用它们，现有插件应在下一个主要版本移除它们之前完成迁移。仅限嵌入式运行器的扩展工厂注册 API 已被移除；请改用工具结果中间件。

OpenClaw 不会在引入替换项的同一更改中移除或重新解释已记录的插件行为。破坏性的合同变更必须先经过兼容性适配器、诊断、文档和弃用窗口。这适用于 SDK 导入、清单字段、设置 API、hook 和运行时注册行为。

<Warning>向后兼容层将在未来的主要版本中移除。 届时，仍从这些接口导入的插件将会中断。 旧的嵌入式扩展工厂注册已经无法加载。</Warning>

## 更改原因

旧方法导致了以下问题：

- **启动缓慢** - 导入一个辅助函数会加载数十个不相关的模块
- **循环依赖** - 宽泛的重新导出使得创建导入循环变得容易
- **不清晰的 API 表面** - 无法区分哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这个问题：每个导入路径 (`openclaw/plugin-sdk/\<subpath\>`)
都是一个具有明确目的和文档化契约的小型、自包含模块。

用于捆绑频道的旧版提供商便捷接口也已消失。
频道品牌的辅助接口是私有 monorepo 的快捷方式，而非稳定的
插件契约。请改用窄范围的通用 SDK 子路径。在捆绑
插件工作区内，请将提供商拥有的辅助函数保留在该插件自己的 `api.ts` 或
`runtime-api.ts` 中。

当前的捆绑提供商示例：

- Anthropic 将 Claude 特定的流辅助函数保留在其自己的 `api.ts` /
  `contract-api.ts` 接口中
- OpenAI 将提供商构建器、默认模型辅助函数和实时提供商
  构建器保留在其自己的 `api.ts` 中
- OpenRouter 将提供商构建器和新手引导/配置辅助函数保留在其自己的
  `api.ts` 中

## Talk 和实时语音迁移计划

实时语音、电话、会议和浏览器 Talk 代码正从本地轮次记录迁移到由 `openclaw/plugin-sdk/realtime-voice` 导出的共享 Talk 会话控制器。新控制器拥有通用的 Talk 事件信封、活动轮次状态、采集状态、输出音频状态、最近事件历史记录以及过时轮次拒绝功能。提供商插件应继续拥有特定于供应商的实时会话；表面插件应继续拥有采集、播放、电话和会议的特殊行为。

此 Talk 迁移是有意彻底破坏性的：

1. 将共享控制器/运行时原语保留在 `plugin-sdk/realtime-voice` 中。
2. 将捆绑的表面迁移到共享控制器上：浏览器中继、
   托管房间切换、语音通话实时、语音通话流式 STT、Google
   Meet 实时和原生按键通话。
3. 使用最终的 RPC`talk.session.*` 和 `talk.client.*`API API 替换旧的 Talk RPC 系列。
4. 在 Gateway Gateway(网关)`hello-ok.features.events` 中发布一个实时 Talk 事件渠道：`talk.event`。
5. 删除旧的实时 HTTP 端点和任何请求时指令
   覆盖路径。

除非正在实现底层适配器或测试装置，否则新代码不应直接调用 `createTalkEventSequencer(...)`。优先使用共享控制器，这样没有轮次 id 就无法发出轮次范围的事件，过时的 `turnEnd` / `turnCancel` 调用无法清除较新的活动轮次，并且输出音频生命周期事件在电话、会议、浏览器中继、托管房间切换和原生 Talk 客户端之间保持一致。

目标公共 API 形状为：

```typescript
// Gateway-owned Talk session API.
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
await gateway.request("talk.session.cancelOutput", { sessionId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// Client-owned provider session API.
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
```

浏览器拥有的 WebRTC/提供商 Websocket 会话使用 `talk.client.create`Gateway(网关)，因为浏览器拥有提供商协商和媒体传输，而 Gateway 拥有凭据、指令和工具策略。`talk.session.*`Gateway(网关) 是网关中继实时、网关中继转录和托管房间原生 STT/TTS 会话的通用 Gateway 管理表面。

将实时选择器放置在 `talk.provider` / `talk.providers` 旁边的旧配置应使用 `openclaw doctor --fix` 进行修复；运行时 Talk 不会将语音/TTS 提供商配置重新解释为实时提供商配置。

支持的 `talk.session.create` 组合有意设置得很小：

| 模式            | 传输            | 大脑            | 所有者          | 备注                                                                             |
| --------------- | --------------- | --------------- | --------------- | -------------------------------------------------------------------------------- |
| `realtime`      | `gateway-relay` | `agent-consult` | Gateway(网关)   | 通过 Gateway(网关) 桥接的全双工提供商音频；工具调用通过 agent-consult 工具路由。 |
| `transcription` | `gateway-relay` | `none`          | Gateway(网关)   | 仅限流式 STT；调用者发送输入音频并接收转录事件。                                 |
| `stt-tts`       | `managed-room`  | `agent-consult` | 原生/客户端房间 | 按住通话和对讲机式房间，由客户端拥有采集/回放，由Gateway(网关)拥有轮次状态。     |
| `stt-tts`       | `managed-room`  | `direct-tools`  | 原生/客户端房间 | 仅限管理员房间模式，适用于直接执行Gateway(网关)工具操作的可信第一方界面。        |

已移除的方法映射：

| 旧                               | 新                                                       |
| -------------------------------- | -------------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                     |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                                   |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                               |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput` 或 `talk.session.cancelTurn` |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                          |
| `talk.realtime.relayStop`        | `talk.session.close`                                     |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`         |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                               |
| `talk.transcription.relayCancel` | `talk.session.cancelTurn`                                |
| `talk.transcription.relayStop`   | `talk.session.close`                                     |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })`     |
| `talk.handoff.join`              | `talk.session.join`                                      |
| `talk.handoff.revoke`            | `talk.session.close`                                     |

统一控制词汇表也特意设计得很窄：

| 方法                            | 适用于                                                  | 约定                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`，`transcription/gateway-relay` | 将 base64 PCM 音频块追加到属于同一Gateway(网关)连接的提供商会话。                                                                                        |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 开始托管房间的用户轮次。                                                                                                                                 |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在过期轮次验证后结束当前轮次。                                                                                                                           |
| `talk.session.cancelTurn`       | 所有Gateway(网关)拥有的会话                             | 取消某个轮次的活跃采集/提供商/代理/TTS工作。                                                                                                             |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助手音频输出，而不必结束用户轮次。                                                                                                                   |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成中继发出的提供商工具调用；传递 `options.willContinue` 以用于临时输出，或传递 `options.suppressResponse` 以在不产生另一个助手响应的情况下满足该调用。 |
| `talk.session.steer`            | 由 Agent 支持的 Talk 会话                               | 将口头 `status`、`steer`、`cancel` 或 `followup` 控制发送到从 Talk 会话解析的活动的嵌入式运行。                                                          |
| `talk.session.close`            | 所有统一会话                                            | 停止中继会话或撤销托管房间状态，然后丢弃统一会话 ID。                                                                                                    |

不要在核心中引入提供商或平台特殊情况以实现此功能。
核心拥有 Talk 会话语义。提供商插件拥有供应商会话设置。
Voice-call 和 Google Meet 拥有电话会议/会议适配器。浏览器和原生
应用拥有设备采集/播放 UX。

## 兼容性政策

对于外部插件，兼容性工作遵循以下顺序：

1. 添加新契约
2. 通过兼容性适配器保持旧行为的连线
3. 发出诊断或警告，指明旧路径和替换路径
4. 在测试中覆盖两条路径
5. 记录弃用和迁移路径
6. 仅在宣布的迁移窗口之后移除，通常是在主要版本中

维护者可以使用 `pnpm plugins:boundary-report` 审核当前的迁移队列。使用 `pnpm plugins:boundary-report:summary` 获取紧凑计数，使用 `--owner <id>` 针对单个插件或兼容性负责人，并在 CI 门控因过期的兼容性记录、跨负责人保留的 SDK 导入或未使用的保留 SDK 子路径而应失败时使用 `pnpm plugins:boundary-report:ci`。该报告按移除日期对已弃用的兼容性记录进行分组，统计本地代码/文档引用，展示跨负责人保留的 SDK 导入，并汇总私有的内存宿主 SDK 桥接，从而使兼容性清理保持明确，而不依赖临时搜索。保留的 SDK 子路径必须具有跟踪的负责人使用情况；未使用的保留辅助导出应从公共 SDK 中移除。

如果仍接受清单字段，插件作者可以继续使用它，直到
文档和诊断另有说明。新代码应优先使用记录的
替换项，但在常规次要版本中，现有插件不应中断。

## 如何迁移

<Steps>
  <Step title="迁移运行时配置加载/写入辅助函数">
    捆绑插件应停止直接调用
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。应优先使用已经传入活动调用路径的配置。需要当前进程快照的长期存在的处理程序可以使用 `api.runtime.config.current()`。长期存在的代理工具应该在 `execute` 中使用工具上下文的 `ctx.getRuntimeConfig()`，以便在配置写入之前创建的工具仍然可以看到刷新后的运行时配置。

    配置写入必须通过事务性辅助函数进行，并选择写入后策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当调用者知道更改需要完全重启网关时，请使用 `afterWrite: { mode: "restart", reason: "..." }`，并且仅当调用者拥有后续操作并有意想要抑制重新加载计划程序时才使用 `afterWrite: { mode: "none", reason: "..." }`。
    变异结果包含一个类型化的 `followUp` 摘要，用于测试和日志记录；网关仍然负责应用或调度重启。
    `loadConfig` 和 `writeConfigFile` 在迁移期间仍作为已弃用的兼容性辅助函数供外部插件使用，并会使用 `runtime-config-load-write` 兼容性代码警告一次。捆绑插件和仓库运行时代码受 `pnpm check:deprecated-api-usage` 和 `pnpm check:no-runtime-action-load-config` 中的扫描器护栏保护：新的生产插件使用将直接失败，直接配置写入将失败，网关服务器方法必须使用请求运行时快照，运行时渠道发送/操作/客户端辅助函数必须从其边界接收配置，并且长期存在的运行时模块允许零环境 `loadConfig()` 调用。

    新的插件代码还应避免导入广泛的 `openclaw/plugin-sdk/config-runtime` 兼容性桶文件。使用与任务匹配的狭窄 SDK 子路径：

    | 需求 | 导入 |
    | --- | --- |
    | 配置类型，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | 已加载的配置断言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助函数 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 组策略运行时辅助函数 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密钥输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试受到针对广泛桶文件的扫描器保护，因此导入和模拟保持在其所需行为本地。广泛桶文件仍然存在于外部兼容性中，但新代码不应依赖它。

  </Step>

  <Step title="将嵌入式工具结果扩展迁移到中间件">
    捆绑插件必须用运行时无关的中间件替换
    仅用于嵌入式运行器的 `api.registerEmbeddedExtensionFactory(...)` 工具结果处理器。

    ```typescript
    // OpenClaw and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["openclaw", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["openclaw", "codex"]
      }
    }
    ```

    外部插件无法注册工具结果中间件，因为它可以在模型看到之前重写高信任工具输出。

  </Step>

  <Step title="将原生审批处理程序迁移到能力事实">
    具备审批功能的渠道插件现在通过
    `approvalCapability.nativeRuntime` 以及共享的运行时上下文注册表来公开原生审批行为。

    主要变更：

    - 用 `approvalCapability.nativeRuntime` 替换 `approvalCapability.handler.loadRuntime(...)`
    - 将审批特定的身份验证/投递从旧版 `plugin.auth` /
      `plugin.approvals` 线路迁移到 `approvalCapability`
    - `ChannelPlugin.approvals` 已从公共渠道插件契约中移除；将投递/原生/渲染字段移至 `approvalCapability`
    - `plugin.auth`Bolt 仅保留用于渠道登录/登出流程；核心不再读取那里的审批身份验证挂钩
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册渠道拥有的运行时对象，如客户端、令牌或 Bolt 应用
    - 请勿从原生审批处理程序发送插件拥有的重定向通知；核心现在拥有来自实际投递结果的路由到其他位置的通知
    - 将 `channelRuntime` 传入 `createChannelManager(...)` 时，请提供
      真正的 `createPluginRuntime().channel` 表面。部分存根会被拒绝。

    请参阅 `/plugins/sdk-channel-plugins` 了解当前的审批能力布局。

  </Step>

  <Step title="Windows审核 Windows 封装器回退行为">
    如果您的插件使用了 `openclaw/plugin-sdk/windows-spawn`Windows，除非您显式传递
    `allowShellFallback: true`，否则未解析的 Windows
    `.cmd`/`.bat` 封装器现在将以失败关闭（fail closed）的方式处理。

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    如果您的调用方并非有意依赖 shell 回退，请不要设置
    `allowShellFallback`，而是处理抛出的错误。

  </Step>

  <Step title="查找已弃用的导入">
    在您的插件中搜索来自任一已弃用接口的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为专门的导入">
    旧接口中的每个导出都映射到一个特定的现代导入路径：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    对于宿主端辅助函数，请使用注入的插件运行时，而不是直接导入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
    ```

    相同的模式适用于其他遗留桥接辅助函数：

    | 旧导入 | 现代等效项 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | 会话 store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="替换广泛的 infra-runtime 导入">
    `openclaw/plugin-sdk/infra-runtime` 仍然存在以保持外部兼容性，但新代码应导入它实际需要的特定的辅助接口：

    | 需求 | 导入 |
    | --- | --- |
    | 系统事件队列辅助工具 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳唤醒、事件和可见性辅助工具 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待发送队列排空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 频道活动遥测 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 内存去重缓存 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全本地文件/媒体路径辅助工具 | `openclaw/plugin-sdk/file-access-runtime` |
    | 分发器感知获取 (Dispatcher-aware fetch) | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和受保护获取辅助工具 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 分发器策略类型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 审批请求/解决类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复负载和命令辅助工具 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 错误格式化辅助工具 | `openclaw/plugin-sdk/error-runtime` |
    | 传输就绪等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全令牌辅助工具 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界异步任务并发 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 数值强制转换 | `openclaw/plugin-sdk/number-runtime` |
    | 进程本地异步锁 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 文件锁 | `openclaw/plugin-sdk/file-lock` |

    捆绑插件受到扫描器保护，防止使用 `infra-runtime`，因此仓库代码无法回退到使用那个大杂烩式的导出。

  </Step>

  <Step title="迁移渠道路由助手">
    新的渠道路由代码应该使用 `openclaw/plugin-sdk/channel-route`。
    较旧的路由键（route-key）和可比较目标（comparable-target）名称在迁移窗口期间作为兼容性别名保留，但新插件应该使用直接描述行为路由名称：

    | 旧的助手 | 现代助手 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    现代路由助手在原生审批、回复抑制、入站去重、定时交付和会话路由之间一致地规范化 `{ channel, to, accountId, threadId }`。

    请勿新增使用 `ChannelMessagingAdapter.parseExplicitTarget` 或
    基于解析器的加载路由助手（`parseExplicitTargetForLoadedChannel`
    或 `resolveRouteTargetForLoadedChannel`）或
    来自 `plugin-sdk/channel-route` 的 `resolveChannelRouteTargetWithParser(...)`。
    这些钩子已被弃用，仅在迁移期间为旧插件保留。新的渠道插件应该使用
    `messaging.targetResolver.resolveTarget(...)` 进行目标 ID 规范化
    和目录未命中回退，当核心需要早期对等类型时使用 `messaging.inferTargetChatType(...)`，并使用 `messaging.resolveOutboundSessionRoute(...)`
    获取提供商原生的会话和线程身份。

  </Step>

  <Step title="构建并测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="通用导入路径表">
  | 导入路径 | 用途 | 主要导出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 规范化插件入口助手 | `definePluginEntry` | | `plugin-sdk/core` | 用于渠道入口定义/构建器的遗留统一重新导出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置 Schema 导出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 单提供商入口助手 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 专注的渠道入口定义和构建器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共享设置向导助手 | 设置转换器、允许列表提示、设置状态构建器 | | `plugin-sdk/setup-runtime` | 设置时运行时助手 | `createSetupTranslator`,
  导入安全的设置补丁适配器、查找备注助手、`promptResolvedAllowFrom`, `splitSetupEntries`, 委托设置代理 | | `plugin-sdk/setup-adapter-runtime` | 已弃用的设置适配器别名 | 使用 `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | 设置工具助手 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | 多账户助手
  | 账户列表/配置/操作门控助手 | | `plugin-sdk/account-id` | 账户 ID 助手 | `DEFAULT_ACCOUNT_ID`, 账户 ID 标准化 | | `plugin-sdk/account-resolution` | 账户查找助手 | 账户查找 + 默认回退助手 | | `plugin-sdk/account-helpers` | 窄范围账户助手 | 账户列表/账户操作助手 | | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,
  `createOptionalChannelSetupWizard`, 以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | 私信配对原语 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回复前缀、输入状态和源传递连接 | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` | |
  `plugin-sdk/channel-config-helpers` | 配置适配器工厂和私信访问助手 | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | 配置 Schema 构建器 | 共享渠道配置 Schema 原语以及通用构建器 | | `plugin-sdk/bundled-channel-config-schema` |
  捆绑配置 Schemas | 仅限 OpenClaw 维护的捆绑插件；新插件必须定义插件本地 Schemas | | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑配置 Schemas | 仅兼容性别名；对于维护的捆绑插件，请使用 `plugin-sdk/bundled-channel-config-schema` | | `plugin-sdk/telegram-command-config` | Telegram 命令配置助手 | 命令名称标准化、描述修剪、重复/冲突验证 | | `plugin-sdk/channel-policy` | 群组/私信策略解析
  | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 已弃用的兼容性外观 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/inbound-envelope` | 入站信封助手 | 共享路由 + 信封构建器助手 | | `plugin-sdk/channel-inbound` | 入站接收助手 | 上下文构建、格式化、根、运行器、准备好的回复调度和调度谓词 | | `plugin-sdk/messaging-targets` | 已弃用的目标解析导入路径 | 使用
  `plugin-sdk/channel-targets` 进行通用目标解析助手，使用 `plugin-sdk/channel-route` 进行路由比较，以及使用插件拥有的 `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` 进行特定于提供商的目标解析 | | `plugin-sdk/outbound-media` | 出站媒体助手 | 共享出站媒体加载 | | `plugin-sdk/outbound-send-deps` | 已弃用的兼容性外观 | 使用 `plugin-sdk/channel-outbound` | |
  `plugin-sdk/channel-outbound` | 出站消息生命周期助手 | 消息适配器、回执、持久发送助手、实时预览/流式传输助手、回复选项、生命周期助手、出站身份和负载规划 | | `plugin-sdk/channel-streaming` | 已弃用的兼容性外观 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/outbound-runtime` | 已弃用的兼容性外观 | 使用 `plugin-sdk/channel-outbound` | | `plugin-sdk/thread-bindings-runtime` | 线程绑定助手 |
  线程绑定生命周期和适配器助手 | | `plugin-sdk/agent-media-payload` | 遗留媒体负载助手 | 用于遗留字段布局的代理媒体负载构建器 | | `plugin-sdk/channel-runtime` | 已弃用的兼容性填充 | 仅限遗留渠道运行时实用程序 | | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 | | `plugin-sdk/runtime-store` | 持久化插件存储 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 广泛的运行时助手 |
  运行时/日志/备份/插件安装助手 | | `plugin-sdk/runtime-env` | 窄范围运行时环境助手 | 日志记录器/运行时环境、超时、重试和退避助手 | | `plugin-sdk/plugin-runtime` | 共享插件运行时助手 | 插件命令/钩子/HTTP/交互助手 | | `plugin-sdk/hook-runtime` | 钩子管道助手 | 共享 Webhook/内部钩子管道助手 | | `plugin-sdk/lazy-runtime` | 延迟运行时助手 | `createLazyRuntimeModule`, `createLazyRuntimeMethod`,
  `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程助手 | 共享执行助手 | | `plugin-sdk/cli-runtime` | CLI 运行时助手 | 命令格式化、等待、版本助手 | | `plugin-sdk/gateway-runtime` | Gateway(网关) 助手 | Gateway(网关) 客户端、事件循环就绪启动助手和渠道状态补丁助手 | | `plugin-sdk/config-runtime` |
  已弃用的配置兼容性填充 | 优先使用 `config-contracts`, `plugin-config-runtime`, `runtime-config-snapshot` 和 `config-mutation` | | `plugin-sdk/telegram-command-config` | Telegram 命令助手 | 当捆绑的 Telegram 命令合约表面不可用时，提供回退稳定的 Telegram 命令验证助手 | | `plugin-sdk/approval-runtime` | 审批提示助手 |
  执行/插件审批负载、审批能力/配置文件助手、本地审批路由/运行时助手以及结构化审批显示路径格式化 | | `plugin-sdk/approval-auth-runtime` | 审批身份验证助手 | 审批者解析、同聊天操作身份验证 | | `plugin-sdk/approval-client-runtime` | 审批客户端助手 | 本地执行审批配置文件/过滤器助手 | | `plugin-sdk/approval-delivery-runtime` | 审批传递助手 | 本地审批能力/传递适配器 | |
  `plugin-sdk/approval-gateway-runtime` | 审批网关助手 | 共享审批网关解析助手 | | `plugin-sdk/approval-handler-adapter-runtime` | 审批适配器助手 | 用于热渠道入口点的轻量级本地审批适配器加载助手 | | `plugin-sdk/approval-handler-runtime` | 审批处理程序助手 | 更广泛的审批处理程序运行时助手；当适配器/网关接口足够时，请优先使用更窄的接口 | | `plugin-sdk/approval-native-runtime` | 审批目标助手 |
  本地审批目标/账户绑定助手 | | `plugin-sdk/approval-reply-runtime` | 审批回复助手 | 执行/插件审批回复负载助手 | | `plugin-sdk/channel-runtime-context` | 渠道运行时上下文助手 | 通用渠道运行时上下文注册/获取/监视助手 | | `plugin-sdk/security-runtime` | 安全助手 | 共享信任、私信门控、根边界文件/路径助手、外部内容和密钥收集助手 | | `plugin-sdk/ssrf-policy` | SSRF 策略助手 |
  主机允许列表和专用网络策略助手 | | `plugin-sdk/ssrf-runtime` | SSRF 运行时助手 | 固定调度器、受保护的获取、SSRF 策略助手 | | `plugin-sdk/system-event-runtime` | 系统事件助手 | `enqueueSystemEvent`, `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | 心跳助手 | 心跳唤醒、事件和可见性助手 | | `plugin-sdk/delivery-queue-runtime` | 传递队列助手 | `drainPendingDeliveries` | |
  `plugin-sdk/channel-activity-runtime` | 渠道活动助手 | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | 去重助手 | 内存去重缓存 | | `plugin-sdk/file-access-runtime` | 文件访问助手 | 安全的本地文件/媒体路径助手 | | `plugin-sdk/transport-ready-runtime` | 传输就绪助手 | `waitForTransportReady` | | `plugin-sdk/exec-approvals-runtime` | 执行审批策略助手 | `loadExecApprovals`,
  `resolveExecApprovalsFromFile`, `ExecApprovalsFile` | | `plugin-sdk/collection-runtime` | 有界缓存助手 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 诊断门控助手 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 错误格式化助手 | `formatUncaughtError`, `isApprovalNotFoundError`, 错误图助手 | | `plugin-sdk/fetch-runtime` | 包装的获取/代理助手 |
  `resolveFetch`, 代理助手, EnvHttpProxyAgent 选项助手 | | `plugin-sdk/host-runtime` | 主机标准化助手 | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重试助手 | `RetryConfig`, `retryAsync`, 策略运行器 | | `plugin-sdk/allow-from` | 允许列表格式化和输入映射 | `formatAllowFromLowercase`, `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` |
  命令门控和命令表面助手 | `resolveControlCommandGate`, 发送者授权助手, 命令注册表助手（包括动态参数菜单格式化） | | `plugin-sdk/command-status` | 命令状态/帮助渲染器 | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | 密钥输入解析 | 密钥输入助手 | | `plugin-sdk/webhook-ingress` | Webhook 请求助手 | Webhook 目标实用程序 | |
  `plugin-sdk/webhook-request-guards` | Webhook 正文保护助手 | 请求正文读取/限制助手 | | `plugin-sdk/reply-runtime` | 共享回复运行时 | 入站调度、心跳、回复规划器、分块 | | `plugin-sdk/reply-dispatch-runtime` | 窄范围回复调度助手 | 完成、提供商调度和对话标签助手 | | `plugin-sdk/reply-history` | 回复历史记录助手 | `createChannelHistoryWindow`; 已弃用的映射助手兼容性导出，如
  `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回复分块助手 | 文本/Markdown 分块助手 | | `plugin-sdk/session-store-runtime` | 会话存储助手 | 存储路径 + 更新时间助手 | | `plugin-sdk/state-paths` | 状态路径助手 | 状态和 OAuth 目录助手
  | | `plugin-sdk/routing` | 路由/会话键助手 | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, 会话键标准化助手 | | `plugin-sdk/status-helpers` | 渠道状态助手 | 渠道/账户状态摘要构建器、运行时状态默认值、问题元数据助手 | | `plugin-sdk/target-resolver-runtime` | 目标解析器助手 | 共享目标解析器助手 | | `plugin-sdk/string-normalization-runtime` | 字符串标准化助手 |
  Slug/字符串标准化助手 | | `plugin-sdk/request-url` | 请求 URL 助手 | 从类请求输入中提取字符串 URL | | `plugin-sdk/run-command` | 定时命令助手 | 带有标准化 stdout/stderr 的定时命令运行器 | | `plugin-sdk/param-readers` | 参数读取器 | 通用工具/CLI 参数读取器 | | `plugin-sdk/tool-payload` | 工具负载提取 | 从工具结果对象中提取标准化负载 | | `plugin-sdk/tool-send` | 工具发送提取 |
  从工具参数中提取规范发送目标字段 | | `plugin-sdk/temp-path` | 临时路径助手 | 共享临时下载路径助手 | | `plugin-sdk/logging-core` | 日志记录助手 | 子系统日志记录器和编辑助手 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格助手 | Markdown 表格模式助手 | | `plugin-sdk/reply-payload` | 消息回复类型 | 回复负载类型 | | `plugin-sdk/provider-setup` | 策展的本地/自托管提供商设置助手 |
  自托管提供商发现/配置助手 | | `plugin-sdk/self-hosted-provider-setup` | 专注的 OpenAI 兼容自托管提供商设置助手 | 相同的自托管提供商发现/配置助手 | | `plugin-sdk/provider-auth-runtime` | 提供商运行时身份验证助手 | 运行时 API 密钥解析助手 | | `plugin-sdk/provider-auth-api-key` | 提供商 API 密钥设置助手 | API 密钥新手引导/配置文件写入助手 | | `plugin-sdk/provider-auth-result` |
  提供商身份验证结果助手 | 标准 OAuth 身份验证结果构建器 | | `plugin-sdk/provider-selection-runtime` | 提供商选择助手 | 已配置或自动提供商选择和原始提供商配置合并 | | `plugin-sdk/provider-env-vars` | 提供商环境变量助手 | 提供商身份验证环境变量查找助手 | | `plugin-sdk/provider-model-shared` | 共享提供商模型/重播助手 | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`,
  共享重播策略构建器、提供商端点助手和模型 ID 标准化助手 | | `plugin-sdk/provider-catalog-shared` | 共享提供商目录助手 | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供商新手引导补丁 | 新手引导配置助手 | | `plugin-sdk/provider-http`
  | 提供商 HTTP 助手 | 通用提供商 HTTP/端点功能助手，包括音频转录多部分表单助手 | | `plugin-sdk/provider-web-fetch` | 提供商 Web 获取助手 | Web 获取提供商注册/缓存助手 | | `plugin-sdk/provider-web-search-config-contract` | 提供商 Web 搜索配置助手 | 不需要插件启用连线的提供商的窄范围 Web 搜索配置/凭证助手 | | `plugin-sdk/provider-web-search-contract` | 提供商 Web 搜索合约助手 | 窄范围 Web
  搜索配置/凭证合约助手，如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` 和作用域凭证设置器/获取器 | | `plugin-sdk/provider-web-search` | 提供商 Web 搜索助手 | Web 搜索提供商注册/缓存/运行时助手 | | `plugin-sdk/provider-tools` | 提供商工具/Schema 兼容助手 | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, 以及
  DeepSeek/Gemini/OpenAI Schema 清理 + 诊断 | | `plugin-sdk/provider-usage` | 提供商使用助手 | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` 和其他提供商使用助手 | | `plugin-sdk/provider-stream` | 提供商流包装器助手 | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 流包装器类型，以及共享 Anthropic/Bedrock/DeepSeek
  V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器助手 | | `plugin-sdk/provider-transport-runtime` | 提供商传输助手 | 本地提供商传输助手，如受保护的获取、传输消息转换和可写传输事件流 | | `plugin-sdk/keyed-async-queue` | 有序异步队列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共享媒体助手 | 媒体获取/转换/存储助手、ffprobe 支持的视频尺寸探测和媒体负载构建器 | |
  `plugin-sdk/media-generation-runtime` | 共享媒体生成助手 | 共享故障转移助手、候选选择以及用于图像/视频/音乐生成的缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解助手 | 媒体理解提供商类型以及面向提供商的图像/音频助手导出 | | `plugin-sdk/text-runtime` | 已弃用的广泛文本兼容性导出 | 使用 `string-coerce-runtime`, `text-chunking`, `text-utility-runtime` 和 `logging-core` | |
  `plugin-sdk/text-chunking` | 文本分块助手 | 出站文本分块助手 | | `plugin-sdk/speech` | 语音助手 | 语音提供商类型以及面向提供商的指令、注册表、验证助手和 OpenAI 兼容的 TTS 构建器 | | `plugin-sdk/speech-core` | 共享语音核心 | 语音提供商类型、注册表、指令、标准化 | | `plugin-sdk/realtime-transcription` | 实时转录助手 | 提供商类型、注册表助手和共享 WebSocket 会话助手 | | `plugin-sdk/realtime-voice`
  | 实时语音助手 | 提供商类型、注册表/解析助手、网桥会话助手、共享代理对话队列、活动运行语音控制、转录/事件运行状况、回声抑制、咨询问题匹配、强制咨询协调、轮次上下文跟踪、输出活动跟踪和快速上下文咨询助手 | | `plugin-sdk/image-generation` | 图像生成助手 | 图像生成提供商类型以及图像资产/数据 URL 助手和 OpenAI 兼容的图像提供商构建器 | | `plugin-sdk/image-generation-core` | 共享图像生成核心 |
  图像生成类型、故障转移、身份验证和注册表助手 | | `plugin-sdk/music-generation` | 音乐生成助手 | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` | 共享音乐生成核心 | 音乐生成类型、故障转移助手、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成助手 | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享视频生成核心 |
  视频生成类型、故障转移助手、提供商查找和模型引用解析 | | `plugin-sdk/interactive-runtime` | 交互式回复助手 | 交互式回复负载标准化/简化 | | `plugin-sdk/channel-config-primitives` | 渠道配置原语 | 窄范围渠道配置 Schema 原语 | | `plugin-sdk/channel-config-writes` | 渠道配置写入助手 | 渠道配置写入授权助手 | | `plugin-sdk/channel-plugin-common` | 共享渠道前奏 | 共享渠道插件前奏导出 | |
  `plugin-sdk/channel-status` | 渠道状态助手 | 共享渠道状态快照/摘要助手 | | `plugin-sdk/allowlist-config-edit` | 允许列表配置助手 | 允许列表配置编辑/读取助手 | | `plugin-sdk/group-access` | 群组访问助手 | 共享群组访问决策助手 | | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | 已弃用的兼容性外观 | 使用 `plugin-sdk/channel-inbound` | | `plugin-sdk/direct-dm-guard-policy` | 直接私信保护助手
  | 窄范围预加密保护策略助手 | | `plugin-sdk/extension-shared` | 共享扩展助手 | 被动渠道/状态和环境代理助手原语 | | `plugin-sdk/webhook-targets` | Webhook 目标助手 | Webhook 目标注册表和路由安装助手 | | `plugin-sdk/webhook-path` | 已弃用的 Webhook 路径别名 | 使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共享 Web 媒体助手 | 远程/本地媒体加载助手 | | `plugin-sdk/zod` | 已弃用的 Zod
  兼容性重新导出 | 直接从 `zod` 导入 `zod` | | `plugin-sdk/memory-core` | 捆绑的内存核心助手 | 内存管理器/配置/文件/CLI 助手表面 | | `plugin-sdk/memory-core-engine-runtime` | 内存引擎运行时外观 | 内存索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | 内存主机基础引擎 | 内存主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 内存主机嵌入引擎 |
  内存嵌入合约、注册表访问、本地提供商和通用批处理/远程助手；具体的远程提供商位于其所属插件中 | | `plugin-sdk/memory-core-host-engine-qmd` | 内存主机 QMD 引擎 | 内存主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | 内存主机存储引擎 | 内存主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | 内存主机多模态助手 | 内存主机多模态助手 | | `plugin-sdk/memory-core-host-query`
  | 内存主机查询助手 | 内存主机查询助手 | | `plugin-sdk/memory-core-host-secret` | 内存主机密钥助手 | 内存主机密钥助手 | | `plugin-sdk/memory-core-host-events` | 已弃用的内存事件别名 | 使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 内存主机状态助手 | 内存主机状态助手 | | `plugin-sdk/memory-core-host-runtime-cli` | 内存主机 CLI 运行时 | 内存主机 CLI 运行时助手 | |
  `plugin-sdk/memory-core-host-runtime-core` | 内存主机核心运行时 | 内存主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | 内存主机文件/运行时助手 | 内存主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | 内存主机核心运行时别名 | 内存主机核心运行时助手的供应商中立别名 | | `plugin-sdk/memory-host-events` | 内存主机事件日志别名 | 内存主机事件日志助手的供应商中立别名 | |
  `plugin-sdk/memory-host-files` | 已弃用的内存文件/运行时别名 | 使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 托管 Markdown 助手 | 用于内存相关插件的共享托管 Markdown 助手 | | `plugin-sdk/memory-host-search` | 活动内存搜索外观 | 延迟活动内存搜索管理器运行时外观 | | `plugin-sdk/memory-host-status` | 已弃用的内存主机状态别名 | 使用
  `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | 测试实用程序 | 仓库本地已弃用的兼容性桶；使用专注的仓库本地测试子路径，如 `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

此表格特意列出了通用的迁移子集，而非完整的 SDK
表面。编译器入口点清单位于
`scripts/lib/plugin-sdk-entrypoints.json` 中；包导出是根据
公共子集生成的。

保留的捆绑插件辅助接缝已从公共 SDK
导出映射中移除，显式记录的兼容性外观除外，例如为已发布的
`@openclaw/discord@2026.3.13` 包保留的已弃用的 `plugin-sdk/discord` 垫片。所有者特定的辅助函数位于拥有者插件包内部；共享的主机行为应通过通用的 SDK
协定（如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime`
和 `plugin-sdk/plugin-config-runtime`）进行传递。

使用与任务匹配的最窄导入。如果您找不到导出内容，
请查看 `src/plugin-sdk/` 处的源代码，或询问维护者应由哪个通用协定
拥有它。

## 活跃的弃用项

适用于插件 SDK、提供商契约、
运行时表面和清单的更具体的弃用项。每一项目前仍可使用，但将在
未来的主要版本中移除。每个项目下方的条目会将旧的 API 映射到其
规范替代项。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **旧版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的签名，相同的
    导出 - 只是从更窄的子路径导入。`command-auth`
    将它们作为兼容存根重新导出。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **旧版**：来自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的 `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新版**：`resolveInboundMentionDecision({ facts, policy })` - 返回
    单个决策对象，而不是两次分离的调用。

    下游渠道插件（Slack、Discord、Matrix、MS Teams）已经
    完成了切换。

  </Accordion>

  <Accordion title="渠道运行时填充程序和渠道操作辅助程序">
    `openclaw/plugin-sdk/channel-runtime` 是旧版
    渠道插件的兼容性填充程序。请勿在新代码中导入它；请使用
    `openclaw/plugin-sdk/channel-runtime-context` 来注册运行时
    对象。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 辅助程序
    与原始“actions”渠道导出一起被弃用。请改为通过语义 `presentation` 表面公开功能 - 渠道插件
    声明它们渲染的内容（卡片、按钮、选择器），而不是它们接受的原始
    操作名称。

  </Accordion>

  <Accordion title="Web search 提供商 工具() helper → 插件上的 createTool()">
    **旧版**：来自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` 工厂。

    **新版**：直接在提供商插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 辅助程序来注册工具封装器。

  </Accordion>

  <Accordion title="纯文本渠道信封 → BodyForAgent">
    **旧版**：`formatInboundEnvelope(...)`（和
    `ChannelMessageForAgent.channelEnvelope`）用于从入站渠道消息构建扁平的纯文本提示
    信封。

    **新版**：`BodyForAgent` 加上结构化用户上下文块。渠道
    插件将路由元数据（线程、话题、回复、反应）作为
    类型化字段附加，而不是将其连接到提示字符串中。
    `formatAgentEnvelope(...)` 辅助程序仍支持用于合成的
    面向助手的信封，但入站纯文本信封即将
    淘汰。

    受影响的区域：`inbound_claim`、`message_received` 以及任何后处理 `channelEnvelope` 文本的
    自定义渠道插件。

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **旧版**: `api.on("deactivate", handler)`.

    **新版**: `api.on("gateway_stop", handler)`. 事件和上下文是
    相同的关闭清理约定；仅钩子名称发生变化。

    ```typescript
    // Before
    api.on("deactivate", async (event, ctx) => {
      await stopPluginService(ctx);
    });

    // After
    api.on("gateway_stop", async (event, ctx) => {
      await stopPluginService(ctx);
    });
    ```

    `deactivate` 在
    2026-08-16 之后仍保留为已弃用的兼容别名。

  </Accordion>

  <Accordion title="subagent_spawning hook → core thread binding">
    **旧版**: `api.on("subagent_spawning", handler)` 返回
    `threadBindingReady` 或 `deliveryOrigin`.

    **新版**: 让核心通过
    渠道 会话绑定适配器准备 `thread: true` 子代理绑定。`api.on("subagent_spawned", handler)`
    应仅用于启动后观察。

    ```typescript
    // Before
    api.on("subagent_spawning", async () => ({
      status: "ok",
      threadBindingReady: true,
      deliveryOrigin: { channel: "discord", to: "channel:123", threadId: "456" },
    }));

    // After
    api.on("subagent_spawned", async (event) => {
      await observeSubagentLaunch(event);
    });
    ```

    `subagent_spawning`、`PluginHookSubagentSpawningEvent`、
    `PluginHookSubagentSpawningResult` 和
    `SubagentLifecycleHookRunner.runSubagentSpawning(...)` 仅作为
    已弃用的兼容层保留，供外部插件迁移使用。

  </Accordion>

  <Accordion title="Provider discovery types → 提供商 catalog types">
    四个发现类型别名现在是目录时代类型的
    轻量级封装：

    | 旧别名                 | 新类型                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外，还有旧版 `ProviderCapabilities` 静态包 - 提供商 插件
    应使用显式的提供商钩子，如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是静态对象。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **旧版**（`ProviderThinkingPolicy` 上的三个独立的钩子）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：单个 `resolveThinkingProfile(ctx)`，返回一个包含规范 `id`、可选 `label` 和
    排序级别列表的 `ProviderThinkingProfile`。OpenClaw 会根据配置文件
    排名自动降级过时的存储值。

    上下文包括 `provider`、`modelId`、可选的合并 `reasoning`
    以及可选的合并模型 `compat` 事实。提供商插件可以使用这些
    目录事实，仅在配置的请求合约支持时暴露特定模型的配置文件。

    实现一个钩子而不是三个。旧版钩子在弃用期内继续工作，但不会与配置文件结果组合。

  </Accordion>

  <Accordion title="External auth providers → contracts.externalAuthProviders">
    **旧版**：在不于插件清单中声明提供商的情况下实现外部身份验证钩子。

    **新版**：在插件清单中声明 `contracts.externalAuthProviders`
    **并**实现 `resolveExternalAuthProfiles(...)`。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **旧版** 清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新版**：将相同的环境变量查找镜像到清单上的 `setup.providers[].envVars`
    中。这将设置/状态环境元数据整合在一个
    地方，并避免了仅为了回答环境变量
    查找而启动插件运行时。

    `providerAuthEnvVars` 在弃用窗口结束前
    仍通过兼容适配器获得支持。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **旧**：三次单独调用 -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`API。

    **新**：在 memory-state API 上调用一次 -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的插槽，单次注册调用。辅助提示和语料库助手
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`)
    不受影响。

  </Accordion>

  <Accordion title="APIMemory embedding 提供商 API">
    **旧**：`api.registerMemoryEmbeddingProvider(...)` 加上
    `contracts.memoryEmbeddingProviders`。

    **新**：`api.registerEmbeddingProvider(...)` 加上
    `contracts.embeddingProviders`API。

    通用 embedding 提供商 合约可在 memory 外部重用，并且是
    新 提供商 的推荐路径。特定于 memory 的注册 API
    在现有 提供商 迁移期间保留为已弃用的兼容性接口。
    插件检查会将非捆绑使用报告为兼容性债务。

  </Accordion>

  <Accordion title="Subagent 会话 messages types renamed">
    仍从 `src/plugins/runtime/types.ts` 导出的两个旧版类型别名：

    | Old                           | New                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已弃用，请改用
    `getSessionMessages`。签名相同；旧方法会调用
    新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **旧版**：`runtime.tasks.flow`（单数）返回一个实时的任务流访问器。

    **新版**：`runtime.tasks.managedFlows` 保留了受管的 TaskFlow 变更
    运行时，用于从流中创建、更新、取消或运行子任务的插件。当插件仅需要基于 DTO 的读取时，请使用 `runtime.tasks.flows`。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent 工具-result middleware">
  这在上述的“How to migrate → Migrate embedded 工具-result extensions to middleware”中已有涵盖。为了完整性在此列出：仅限嵌入式运行器的已移除 `api.registerEmbeddedExtensionFactory(...)` 路径已被 `api.registerAgentToolResultMiddleware(...)` 取代，后者在 `contracts.agentToolResultMiddleware` 中包含一个显式的运行时列表。
</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    从 `openclaw/plugin-sdk` 重新导出的 `OpenClawSchemaType` 现在是
    `OpenClawConfig` 的单行别名。建议使用规范名称。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>扩展级别的弃用项（位于 `extensions/` 下的捆绑渠道/提供商插件内部） 会在其自己的 `api.ts` 和 `runtime-api.ts` 桶中跟踪。它们不影响第三方插件契约，因此未在此处列出。 如果您直接使用捆绑插件的本地桶，请在升级前阅读该桶中的弃用注释。</Note>

## 移除时间表

| 时间               | 发生什么                                         |
| ------------------ | ------------------------------------------------ |
| **现在**           | 已弃用的表面会发出运行时警告                     |
| **下一个主要版本** | 已弃用的表面将被移除；仍在使用它们的插件将会失败 |

所有核心插件均已完成迁移。外部插件应在下一个主要版本发布前完成迁移。

## 暂时抑制警告

在进行迁移工作时，请设置以下环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时的应急措施，并非永久解决方案。

## 相关

- [入门指南](/zh/plugins/building-plugins) - 构建您的第一个插件
- [SDK 概述](/zh/plugins/sdk-overview) - 完整的子路径导入参考
- [渠道插件](/zh/plugins/sdk-channel-plugins) - 构建渠道插件
- [提供商插件](/zh/plugins/sdk-provider-plugins) - 构建提供商插件
- [插件内部机制](/zh/plugins/architecture) - 架构深度解析
- [插件清单](/zh/plugins/manifest) - 清单架构参考
