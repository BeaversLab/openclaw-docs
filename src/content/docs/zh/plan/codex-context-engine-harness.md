---
title: "Codex Harness 上下文引擎移植"
summary: "使捆绑的 Codex 应用服务器适配器遵守 OpenClaw 上下文引擎插件的规范"
read_when:
  - You are wiring context-engine lifecycle behavior into the Codex harness
  - You need lossless-claw or another context-engine plugin to work with codex/* embedded harness sessions
  - You are comparing embedded PI and Codex app-server context behavior
---

## 状态

实施规范草案。

## 目标

使捆绑的 Codex 应用服务器适配器遵守与嵌入式 PI 轮次相同的 OpenClaw 上下文引擎生命周期合约。

使用 `agents.defaults.embeddedHarness.runtime: "codex"` 或
`codex/*` 模型的会话仍应允许所选的上下文引擎插件（例如 `lossless-claw`）在 Codex 应用服务器边界允许的范围内，控制上下文组装、轮次后摄取、维护以及 OpenClaw 级别的压缩策略。

## 非目标

- 不要重新实现 Codex 应用服务器内部逻辑。
- 不要让 Codex 原生线程压缩生成 lossless-claw 摘要。
- 不要要求非 Codex 模型使用 Codex 适配器。
- 不要更改 ACP/acpx 会话行为。此规范仅适用于
  非 ACP 嵌入式代理适配器路径。
- 不要让第三方插件注册 Codex 应用服务器扩展工厂；
  现有的捆绑插件信任边界保持不变。

## 当前架构

嵌入式运行循环在选择具体的低级适配器之前，每次运行解析一次配置的上下文引擎：

- `src/agents/pi-embedded-runner/run.ts`
  - 初始化上下文引擎插件
  - 调用 `resolveContextEngine(params.config)`
  - 将 `contextEngine` 和 `contextTokenBudget` 传递到
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` 委托给所选的代理适配器：

- `src/agents/pi-embedded-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

Codex 应用服务器适配器由捆绑的 Codex 插件注册：

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

Codex 适配器实现接收与 PI 支持的尝试相同的 `EmbeddedRunAttemptParams`：

- `extensions/codex/src/app-server/run-attempt.ts`

这意味着所需的挂钩点位于 OpenClaw 控制的代码中。外部边界是 Codex 应用服务器协议本身：OpenClaw 可以控制发送给 `thread/start`、`thread/resume` 和 `turn/start` 的内容，并可以观察通知，但无法更改 Codex 的内部线程存储或原生压缩器。

## 当前差距

嵌入式 PI 尝试直接调用上下文引擎生命周期：

- 在尝试之前进行引导/维护
- 在模型调用之前进行组装
- 在尝试之后进行 afterTurn 或 ingest
- 在成功的轮次之后进行维护
- 针对拥有压缩权的引擎进行上下文引擎压缩

相关 PI 代码：

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Codex 应用服务器尝试目前运行通用 agent-harness 挂钩并镜像转录，但不调用 `params.contextEngine.bootstrap`、`params.contextEngine.assemble`、`params.contextEngine.afterTurn`、`params.contextEngine.ingestBatch`、`params.contextEngine.ingest` 或 `params.contextEngine.maintain`。

相关 Codex 代码：

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## 期望行为

对于 Codex harness 轮次，OpenClaw 应保留此生命周期：

1. 读取镜像的 OpenClaw 会话转录。
2. 当存在先前的会话文件时，引导活动的上下文引擎。
3. 在可用时运行引导维护。
4. 使用活动的上下文引擎组装上下文。
5. 将组装的上下文转换为 Codex 兼容的输入。
6. 使用包含任何上下文引擎 `systemPromptAddition` 的开发者指令启动或恢复 Codex 线程。
7. 使用组装的面向用户的提示启动 Codex 轮次。
8. 将 Codex 结果镜像回 OpenClaw 转录中。
9. 如果已实现，则调用 `afterTurn`，否则调用 `ingestBatch`/`ingest`，使用镜像的转录快照。
10. 在成功的非中止轮次后运行轮次维护。
11. 保留 Codex 原生压缩信号和 OpenClaw 压缩挂钩。

## 设计约束

### Codex 应用服务器仍然是原生线程状态的权威来源

Codex 拥有其原生线程及任何内部扩展历史。OpenClaw 不应尝试通过支持的协议调用之外的方式修改应用服务器的内部历史。

OpenClaw 的脚本镜像仍然是 OpenClaw 功能的来源：

- 聊天历史
- 搜索
- `/new` 和 `/reset` 记账
- 未来的模型或 切换
- context-engine 插件状态

### Context engine 组装必须投影到 Codex 输入中

Context-engine 接口返回 OpenClaw `AgentMessage[]`，而不是 Codex 线程补丁。Codex 应用服务器 `turn/start` 接受当前用户输入，而 `thread/start` 和 `thread/resume` 接受开发者指令。

因此实现需要一个投影层。安全的第一个版本应避免假装它可以替换 Codex 内部历史。它应该在当前轮次周围将组装的上下文作为确定性的 prompt/developer-instruction 材料注入。

### Prompt-cache 稳定性很重要

对于像 lossless-claw 这样的引擎，对于未更改的输入，组装的上下文应该是确定性的。不要向生成的上下文文本添加时间戳、随机 ID 或不确定性排序。

### 运行时选择语义不发生变化

选择保持原样：

- `runtime: "pi"` 强制使用 PI
- `runtime: "codex"` 选择已注册的 Codex
- `runtime: "auto"` 允许插件 声明支持的提供商
- 不匹配的 `auto` 运行使用 PI

这项工作改变了选择 Codex 之后发生的事情。

## 实施计划

### 1. 导出或重用可重用的 context-engine 尝试助手

目前，可重用的生命周期助手位于 PI 运行器下：

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

如果可以避免，Codex 不应从名称暗示 PI 的实现路径导入。

创建一个中立的模块，例如：

- `src/agents/harness/context-engine-lifecycle.ts`

移动或重新导出：

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- 围绕 `runContextEngineMaintenance` 的一个小包装器

通过从旧文件重新导出或在同一 PR 中更新 PI 调用点，保持 PI 导入正常工作。

中立的辅助程序名称不应提及 PI。

建议的名称：

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. 添加 Codex 上下文投影辅助程序

添加一个新模块：

- `extensions/codex/src/app-server/context-engine-projection.ts`

职责：

- 接受组装的 `AgentMessage[]`、原始镜像历史记录和当前提示。
- 确定哪些上下文属于开发人员指令与当前用户输入。
- 将当前用户提示保留为最终可执行的请求。
- 以稳定、显式的格式渲染先前的消息。
- 避免不稳定的元数据。

建议的 API：

```ts
export type CodexContextProjection = {
  developerInstructionAddition?: string;
  promptText: string;
  assembledMessages: AgentMessage[];
  prePromptMessageCount: number;
};

export function projectContextEngineAssemblyForCodex(params: { assembledMessages: AgentMessage[]; originalHistoryMessages: AgentMessage[]; prompt: string; systemPromptAddition?: string }): CodexContextProjection;
```

建议的首次投影：

- 将 `systemPromptAddition` 放入开发人员指令中。
- 将组装的对话上下文放在 `promptText` 中的当前提示之前。
- 将其清晰地标记为 OpenClaw 组装的上下文。
- 将当前提示保留在最后。
- 如果末尾已出现重复的当前用户提示，则将其排除。

示例提示结构：

```text
OpenClaw assembled context for this turn:

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

Current user request:
...
```

这不如原生 Codex 历史记录修改优雅，但它可以在 OpenClaw 内部实现，并保留上下文引擎语义。

未来的改进：如果 Codex app-server 公开了替换或补充线程历史记录的协议，请交换此投影层以使用该 API。

### 3. 在 Codex 线程启动之前连接引导程序

在 `extensions/codex/src/app-server/run-attempt.ts` 中：

- 像今天一样读取镜像的会话历史记录。
- 确定会话文件在此次运行之前是否存在。优先使用在镜像写入之前检查 `fs.stat(params.sessionFile)` 的辅助程序。
- 打开 `SessionManager` 或使用窄会话管理器适配器（如果辅助程序需要）。
- 当 `params.contextEngine` 存在时，调用中立的引导辅助程序。

伪流程：

```ts
const hadSessionFile = await fileExists(params.sessionFile);
const sessionManager = SessionManager.open(params.sessionFile);
const historyMessages = sessionManager.buildSessionContext().messages;

await bootstrapHarnessContextEngine({
  hadSessionFile,
  contextEngine: params.contextEngine,
  sessionId: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  sessionManager,
  runtimeContext: buildHarnessContextEngineRuntimeContext(...),
  runMaintenance: runHarnessContextEngineMaintenance,
  warn,
});
```

使用与 Codex 工具桥接和脚本镜像相同的 `sessionKey` 约定。目前，Codex 根据 `params.sessionKey` 或 `params.sessionId` 计算 `sandboxSessionKey`；除非有理由保留原始 `params.sessionKey`，否则请一致使用该约定。

### 4. 在 `thread/start` / `thread/resume` 和 `turn/start` 之前连接 assemble

在 `runCodexAppServerAttempt` 中：

1. 首先构建动态工具，以便上下文引擎能看到实际可用的
   工具名称。
2. 读取镜像的会话历史记录。
3. 当 `params.contextEngine` 存在时，运行上下文引擎 `assemble(...)`。
4. 将组装的结果投影到：
   - 开发者指令附加项
   - `turn/start` 的提示词文本

现有的钩子调用：

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

应变为具有上下文感知能力：

1. 使用 `buildDeveloperInstructions(params)` 计算基础开发者指令
2. 应用上下文引擎组装/投影
3. 使用投影后的提示词/开发者指令运行 `before_prompt_build`

此顺序让通用提示词钩子能够看到与 Codex 将接收的相同的提示词。如果我们
需要严格的 PI 对等性，请在钩子组合之前运行上下文引擎组装，
因为 PI 在其提示词管道之后将上下文引擎 `systemPromptAddition` 应用于最终系统
提示词。重要的不变性是，上下文引擎和钩子都具有确定性、有记录的顺序。

首次实现的推荐顺序：

1. `buildDeveloperInstructions(params)`
2. 上下文引擎 `assemble()`
3. 将 `systemPromptAddition` 附加/前置到开发者指令
4. 将组装的消息投影到提示词文本中
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. 将最终开发者指令传递给 `startOrResumeThread(...)`
7. 将最终提示词文本传递给 `buildTurnStartParams(...)`

规范应编码在测试中，以便未来的更改不会意外地对其进行重排序。

### 5. 保留提示词缓存稳定的格式

投影辅助函数必须为相同的输入生成字节稳定的输出：

- 稳定的消息顺序
- 稳定的角色标签
- 无生成的时间戳
- 无对象键顺序泄漏
- 无随机分隔符
- 无每次运行的 ID

使用固定的分隔符和显式的章节。

### 6. 在转录镜像之后连接轮次后处理

Codex 的 `CodexAppServerEventProjector` 为当前轮次构建一个本地 `messagesSnapshot`。`mirrorTranscriptBestEffort(...)` 将该快照写入 OpenClaw 转录镜像中。

无论镜像成功或失败，都使用可用的最佳消息快照调用上下文引擎终结器：

- 在写入后优先使用完整的镜像会话上下文，因为 `afterTurn` 期望的是会话快照，而不仅仅是当前轮次。
- 如果无法重新打开会话文件，则回退到 `historyMessages + result.messagesSnapshot`。

伪流程：

```ts
const prePromptMessageCount = historyMessages.length;
await mirrorTranscriptBestEffort(...);
const finalMessages = readMirroredSessionHistoryMessages(params.sessionFile)
  ?? [...historyMessages, ...result.messagesSnapshot];

await finalizeHarnessContextEngineTurn({
  contextEngine: params.contextEngine,
  promptError: Boolean(finalPromptError),
  aborted: finalAborted,
  yieldAborted,
  sessionIdUsed: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  messagesSnapshot: finalMessages,
  prePromptMessageCount,
  tokenBudget: params.contextTokenBudget,
  runtimeContext: buildHarnessContextEngineRuntimeContextFromUsage({
    attempt: params,
    workspaceDir: effectiveWorkspace,
    agentDir,
    tokenBudget: params.contextTokenBudget,
    lastCallUsage: result.attemptUsage,
    promptCache: result.promptCache,
  }),
  runMaintenance: runHarnessContextEngineMaintenance,
  sessionManager,
  warn,
});
```

如果镜像失败，仍然使用回退快照调用 `afterTurn`，但记录上下文引擎正在从回退轮次数据中摄取。

### 7. 规范化使用情况和提示缓存运行时上下文

Codex 结果在可用时包含来自应用服务器令牌通知的规范化使用情况。将该使用情况传递到上下文引擎运行时上下文中。

如果 Codex 应用服务器最终暴露缓存读/写详细信息，请将其映射到 `ContextEnginePromptCacheInfo` 中。在此之前，请省略 `promptCache`，而不是编造零值。

### 8. 压缩策略

有两个压缩系统：

1. OpenClaw 上下文引擎 `compact()`
2. Codex 应用服务器原生 `thread/compact/start`

不要在静默中将它们混淆。

#### `/compact` 和显式的 OpenClaw 压缩

当所选上下文引擎具有 `info.ownsCompaction === true` 时，显式的 OpenClaw 压缩应优先使用上下文引擎的 `compact()` 结果，用于 OpenClaw 转录镜像和插件状态。

当所选 Codex harness 具有原生线程绑定时，我们可能会额外请求 Codex 原生压缩以保持应用服务器线程健康，但这必须在详细信息中作为单独的后端操作进行报告。

推荐行为：

- 如果 `contextEngine.info.ownsCompaction === true`：
  - 首先调用上下文引擎 `compact()`
  - 然后当存在线程绑定时，尽力调用 Codex 原生压缩
  - 将上下文引擎结果作为主要结果返回
  - 在 `details.codexNativeCompaction` 中包含 Codex 原生压缩状态
- 如果活动的上下文引擎不拥有压缩：
  - 保留当前的 Codex 原生压缩行为

这可能需要更改 `extensions/codex/src/app-server/compact.ts` 或从通用压缩路径对其进行包装，具体取决于 `maybeCompactAgentHarnessSession(...)` 在何处调用。

#### 轮流进行的 Codex 原生 contextCompaction 事件

Codex 可能会在一个轮次中发出 `contextCompaction` 项目事件。在 `event-projector.ts` 中保留当前的压缩前/后钩子（hook）发送，但不要将其视为已完成的上下文引擎压缩。

对于拥有压缩的引擎，当 Codex 无论如何都执行原生压缩时，请发出显式诊断信息：

- 流/事件名称：现有的 `compaction` 流是可以接受的
- 详细信息：`{ backend: "codex-app-server", ownsCompaction: true }`

这使得这种分离可审计。

### 9. 会话重置和绑定行为

现有的 Codex harness `reset(...)` 会清除 OpenClaw 会话文件中的 Codex 应用服务器绑定。保留该行为。

此外，确保上下文引擎状态清理继续通过现有的 OpenClaw 会话生命周期路径进行。除非上下文引擎生命周期当前遗漏了所有 harness 的重置/删除事件，否则不要添加 Codex 特定的清理。

### 10. 错误处理

遵循 PI 语义：

- 引导失败时发出警告并继续
- 组装失败时发出警告并回退到未组装的管道消息/提示
- afterTurn/ingest 失败时发出警告并将轮次后最终化标记为不成功
- 维护仅在成功的、非中止的、非让步的轮次之后运行
- 压缩错误不应作为新提示重试

Codex 特定补充：

- 如果上下文投影失败，发出警告并回退到原始提示。
- 如果脚本镜像失败，仍尝试使用回退消息进行上下文引擎最终化。
- 如果上下文引擎压缩成功后 Codex 原生压缩失败，当上下文引擎为主引擎时，不要导致整个 OpenClaw 压缩失败。

## 测试计划

### 单元测试

在 `extensions/codex/src/app-server` 下添加测试：

1. `run-attempt.context-engine.test.ts`
   - 当会话文件存在时，Codex 调用 `bootstrap`。
   - Codex 使用镜像消息、token 预算、工具名称、引用模式、模型 ID 和提示词调用 `assemble`。
   - `systemPromptAddition` 包含在开发者指令中。
   - 组装的消息在当前请求之前被投射到提示词中。
   - 在记录镜像之后，Codex 调用 `afterTurn`。
   - 如果没有 `afterTurn`，Codex 调用 `ingestBatch` 或按消息调用 `ingest`。
   - 轮次维护在成功的轮次之后运行。
   - 轮次维护不会在提示词错误、中止或让步中止时运行。

2. `context-engine-projection.test.ts`
   - 对于相同的输入产生稳定的输出
   - 当组装的历史记录包含当前提示词时，不会重复
   - 处理空历史记录
   - 保持角色顺序
   - 仅在开发者指令中包含系统提示词添加

3. `compact.context-engine.test.ts`
   - 拥有上下文引擎主要结果胜出
   - 当同时也尝试了 Codex 原生压缩时，Codex 原生压缩状态会出现在详细信息中
   - Codex 原生失败不会导致拥有上下文引擎的压缩失败
   - 非拥有上下文引擎保留当前的原生压缩行为

### 需要更新的现有测试

- 如果存在 `extensions/codex/src/app-server/run-attempt.test.ts`，否则
  使用最近的 Codex 应用服务器运行测试。
- 仅当压缩
  事件详细信息发生变化时才更新 `extensions/codex/src/app-server/event-projector.test.ts`。
- 除非配置
  行为发生变化，否则 `src/agents/harness/selection.test.ts` 不应需要更改；它应保持稳定。
- PI 上下文引擎测试应该继续原样通过。

### 集成 / 实时测试

添加或扩展实时 Codex harness 冒烟测试：

- 将 `plugins.slots.contextEngine` 配置为测试引擎
- 将 `agents.defaults.model` 配置为 `codex/*` 模型
- 配置 `agents.defaults.embeddedHarness.runtime = "codex"`
- 断言测试引擎已观察到：
  - bootstrap
  - assemble
  - afterTurn 或 ingest
  - maintenance

避免在 OpenClaw 核心测试中要求 lossless-claw。使用一个小型的代码库内假
上下文引擎插件。

## 可观测性

在 Codex 上下文引擎生命周期调用周围添加调试日志：

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` 带有原因
- `codex native compaction completed alongside context-engine compaction`

避免记录完整的提示词或对话记录内容。

在有用处添加结构化字段：

- `sessionId`
- `sessionKey` 根据现有的日志记录实践进行编辑或省略
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## 迁移 / 兼容性

这应该是向后兼容的：

- 如果未配置上下文引擎，传统上下文引擎的行为应等同于
  当前 Codex harness 的行为。
- 如果上下文引擎 `assemble` 失败，Codex 应继续使用原始
  提示词路径。
- 现有的 Codex 线程绑定应保持有效。
- 动态工具指纹不应包含上下文引擎的输出；否则
  每次上下文更改都可能强制创建一个新的 Codex 线程。只有工具目录
  应该影响动态工具指纹。

## 未决问题

1. 组装的上下文应完全注入到用户提示词中，完全
   注入到开发者指令中，还是分开注入？

   建议：分开。将 `systemPromptAddition` 放在开发者指令中；
   将组装的对话记录上下文放在用户提示词包装器中。这最符合
   当前的 Codex 协议，且不会改变原生线程历史。

2. 当上下文引擎拥有压缩控制权时，是否应禁用 Codex 原生压缩？

   建议：不，暂不。Codex 原生压缩可能仍然
   是保持应用服务器线程存活所必需的。但它必须被报告为
   原生 Codex 压缩，而不是上下文引擎压缩。

3. `before_prompt_build` 应该在上下文引擎组装之前还是之后运行？

   建议：在 Codex 的上下文引擎投影之后，以便通用 harness
   钩子能够看到 Codex 将接收的实际提示词/开发者指令。如果 PI
   一致性需要相反的顺序，请在测试中编码所选顺序并在此处记录。

4. Codex 应用服务器能否接受未来的结构化上下文/历史记录覆盖？

   未知。如果可以，请用该协议替换文本投影层，并
   保持生命周期调用不变。

## 验收标准

- 一个 `codex/*` 嵌入式 harness 回合会调用所选上下文引擎的 assemble 生命周期。
- 上下文引擎 `systemPromptAddition` 会影响 Codex 开发者指令。
- 组装的上下文会以确定性的方式影响 Codex 回合输入。
- 成功的 Codex 回合会调用 `afterTurn` 或接收回退（ingest fallback）。
- 成功的 Codex 回合会运行上下文引擎的回合维护（turn maintenance）。
- 失败/中止/让步中止的回合不会运行回合维护。
- 上下文引擎拥有的压缩（compaction）对于 OpenClaw/插件状态仍然是主要的。
- Codex 原生压缩作为原生 Codex 行为仍然可审计。
- 现有的 PI 上下文引擎行为保持不变。
- 当未选择非旧版上下文引擎或组装失败时，现有的 Codex harness 行为保持不变。
