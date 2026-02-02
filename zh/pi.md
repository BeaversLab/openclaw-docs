---
title: "Pi Integration Architecture"
---

# Pi 集成架构

本文档描述了 OpenClaw 如何与 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其兄弟包（`pi-ai`、`pi-agent-core`、`pi-tui`）集成，为其 AI agent 功能提供支持。

## 概述

OpenClaw 使用 pi SDK 将 AI 编码 agent 嵌入到其消息网关架构中。OpenClaw 不是将 pi 作为子进程生成或使用 RPC 模式，而是通过 `createAgentSession()` 直接导入和实例化 pi 的 `AgentSession`。这种嵌入式方法提供了：

- 完全控制会话生命周期和事件处理
- 自定义工具注入（消息传递、沙盒、特定频道的操作）
- 每个频道/上下文的系统提示定制
- 支持分支/压缩的会话持久化
- 具有故障转移功能的多帐户身份配置轮换
- 与提供程序无关的模型切换

## 包依赖

```json
{
  "@mariozechner/pi-agent-core": "0.49.3",
  "@mariozechner/pi-ai": "0.49.3",
  "@mariozechner/pi-coding-agent": "0.49.3",
  "@mariozechner/pi-tui": "0.49.3"
}
```

| 包               | 用途                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `pi-ai`           | 核心 LLM 抽象：`Model`、`streamSimple`、消息类型、提供程序 API                              |
| `pi-agent-core`   | Agent 循环、工具执行、`AgentMessage` 类型                                                       |
| `pi-coding-agent` | 高级 SDK：`createAgentSession`、`SessionManager`、`AuthStorage`、`ModelRegistry`、内置工具 |
| `pi-tui`          | 终端 UI 组件（在 OpenClaw 的本地 TUI 模式中使用）                                                |

## 文件结构

```
src/agents/
├── pi-embedded-runner.ts          # 从 pi-embedded-runner/ 重新导出
├── pi-embedded-runner/
│   ├── run.ts                     # 主入口：runEmbeddedPiAgent()
│   ├── run/
│   │   ├── attempt.ts             # 单次尝试逻辑，包含会话设置
│   │   ├── params.ts              # RunEmbeddedPiAgentParams 类型
│   │   ├── payloads.ts            # 从运行结果构建响应负载
│   │   ├── images.ts              # 视觉模型图像注入
│   │   └── types.ts               # EmbeddedRunAttemptResult
│   ├── abort.ts                   # 中止错误检测
│   ├── cache-ttl.ts               # 用于上下文修剪的缓存 TTL 跟踪
│   ├── compact.ts                 # 手动/自动压缩逻辑
│   ├── extensions.ts              # 为嵌入式运行加载 pi 扩展
│   ├── extra-params.ts            # 提供程序特定的流参数
│   ├── google.ts                  # Google/Gemini 轮次排序修复
│   ├── history.ts                 # 历史限制（DM vs 群组）
│   ├── lanes.ts                   # 会话/全局命令通道
│   ├── logger.ts                  # 子系统记录器
│   ├── model.ts                   # 通过 ModelRegistry 解析模型
│   ├── runs.ts                    # 活动运行跟踪、中止、队列
│   ├── sandbox-info.ts            # 系统提示的沙盒信息
│   ├── session-manager-cache.ts   # SessionManager 实例缓存
│   ├── session-manager-init.ts    # 会话文件初始化
│   ├── system-prompt.ts           # 系统提示构建器
│   ├── tool-split.ts              # 将工具分为内置和自定义
│   ├── types.ts                   # EmbeddedPiAgentMeta、EmbeddedPiRunResult
│   └── utils.ts                   # ThinkLevel 映射、错误描述
├── pi-embedded-subscribe.ts       # 会话事件订阅/分发
├── pi-embedded-subscribe.types.ts # SubscribeEmbeddedPiSessionParams
├── pi-embedded-subscribe.handlers.ts # 事件处理器工厂
├── pi-embedded-subscribe.handlers.lifecycle.ts
├── pi-embedded-subscribe.handlers.types.ts
├── pi-embedded-block-chunker.ts   # 流块回复分块
├── pi-embedded-messaging.ts       # 消息工具发送跟踪
├── pi-embedded-helpers.ts         # 错误分类、轮次验证
├── pi-embedded-helpers/           # 辅助模块
├── pi-embedded-utils.ts           # 格式化工具
├── pi-tools.ts                    # createOpenClawCodingTools()
├── pi-tools.abort.ts              # 工具的 AbortSignal 包装
├── pi-tools.policy.ts             # 工具允许列表/拒绝列表策略
├── pi-tools.read.ts               # 读取工具自定义
├── pi-tools.schema.ts             # 工具架构标准化
├── pi-tools.types.ts              # AnyAgentTool 类型别名
├── pi-tool-definition-adapter.ts  # AgentTool -> ToolDefinition 适配器
├── pi-settings.ts                 # 设置覆盖
├── pi-extensions/                 # 自定义 pi 扩展
│   ├── compaction-safeguard.ts    # 保障扩展
│   ├── compaction-safeguard-runtime.ts
│   ├── context-pruning.ts         # Cache-TTL 上下文修剪扩展
│   └── context-pruning/
├── model-auth.ts                  # 身份配置解析
├── auth-profiles.ts               # 配置存储、冷却、故障转移
├── model-selection.ts             # 默认模型解析
├── models-config.ts               # models.json 生成
├── model-catalog.ts               # 模型目录缓存
├── context-window-guard.ts        # 上下文窗口验证
├── failover-error.ts              # FailoverError 类
├── defaults.ts                    # DEFAULT_PROVIDER、DEFAULT_MODEL
├── system-prompt.ts               # buildAgentSystemPrompt()
├── system-prompt-params.ts        # 系统提示参数解析
├── system-prompt-report.ts        # 调试报告生成
├── tool-summaries.ts              # 工具描述摘要
├── tool-policy.ts                 # 工具策略解析
├── transcript-policy.ts           # 副本验证策略
├── skills.ts                      # 技能快照/提示构建
├── skills/                        # 技能子系统
├── sandbox.ts                     # 沙盒上下文解析
├── sandbox/                       # 沙盒子系统
├── channel-tools.ts               # 特定频道的工具注入
├── openclaw-tools.ts              # OpenClaw 特定工具
├── bash-tools.ts                  # exec/process 工具
├── apply-patch.ts                 # apply_patch 工具 (OpenAI)
├── tools/                         # 单个工具实现
│   ├── browser-tool.ts
│   ├── canvas-tool.ts
│   ├── cron-tool.ts
│   ├── discord-actions*.ts
│   ├── gateway-tool.ts
│   ├── image-tool.ts
│   ├── message-tool.ts
│   ├── nodes-tool.ts
│   ├── session*.ts
│   ├── slack-actions.ts
│   ├── telegram-actions.ts
│   ├── web-*.ts
│   └── whatsapp-actions.ts
└── ...
```

## 核心集成流程

### 1. 运行嵌入式 Agent

主入口是 `pi-embedded-runner/run.ts` 中的 `runEmbeddedPiAgent()`：

```typescript
import { runEmbeddedPiAgent } from "./agents/pi-embedded-runner.js";

const result = await runEmbeddedPiAgent({
  sessionId: "user-123",
  sessionKey: "main:whatsapp:+1234567890",
  sessionFile: "/path/to/session.jsonl",
  workspaceDir: "/path/to/workspace",
  config: openclawConfig,
  prompt: "Hello, how are you?",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  timeoutMs: 120_000,
  runId: "run-abc",
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
});
```

### 2. 会话创建

在 `runEmbeddedAttempt()` 中（由 `runEmbeddedPiAgent()` 调用），使用 pi SDK：

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";

const resourceLoader = new DefaultResourceLoader({
  cwd: resolvedWorkspace,
  agentDir,
  settingsManager,
  additionalExtensionPaths,
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  cwd: resolvedWorkspace,
  agentDir,
  authStorage: params.authStorage,
  modelRegistry: params.modelRegistry,
  model: params.model,
  thinkingLevel: mapThinkingLevel(params.thinkLevel),
  tools: builtInTools,
  customTools: allCustomTools,
  sessionManager,
  settingsManager,
  resourceLoader,
});

applySystemPromptOverrideToSession(session, systemPromptOverride);
```

### 3. 事件订阅

`subscribeEmbeddedPiSession()` 订阅 pi 的 `AgentSession` 事件：

```typescript
const subscription = subscribeEmbeddedPiSession({
  session: activeSession,
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
  onToolCall: async (toolCall) => {
    await broadcastToolCall(toolCall);
  },
  onToolResult: async (toolResult) => {
    await broadcastToolResult(toolResult);
  },
  onAgentMessage: async (msg) => {
    await logAgentMessage(msg);
  },
  onBlobBytes: async (blobBytes) => {
    await handleBlobBytes(blobBytes);
  },
  onComplete: async (result) => {
    await handleCompletion(result);
  },
  onError: async (error) => {
    await handleError(error);
  },
});
```

### 4. 运行管理

`pi-embedded-runner/runs.ts` 管理活动运行：

- **跟踪**：`activeRuns` 映射从 `runId` 到 `AbortController`
- **中止**：调用 `abortRun(runId)` 会中止底层运行并清理
- **队列**：同一会话的并发运行排队以避免状态损坏

### 5. 工具集成

OpenClaw 通过以下方式注入自定义工具：

```typescript
const builtInTools = await createOpenClawCodingTools(params);
const customTools = [
  ...openclawSpecificTools,
  ...channelSpecificTools,
  ...sandboxTools,
];
```

**内置工具**（来自 pi）：

- `read`、`write`、`edit`（文件操作）
- `exec`、`process`（命令执行）
- `browser`、`web_search`、`web_fetch`（网络访问）

**OpenClaw 特定工具**：

- `message`（发送到消息频道）
- `nodes`（节点控制）
- `canvas`（节点 UI 控制）
- `cron`（调度任务）

**频道工具**（例如，用于 Discord）：

- `discord-actions`（反应、删除、编辑）

### 6. 系统提示构建

`buildAgentSystemPrompt()` 构建动态提示：

```typescript
const systemPrompt = buildAgentSystemPrompt({
  channel,
  context,
  sandbox,
  skills,
  toolSummaries,
  config,
});
```

组件：

- **基础提示**：`AGENTS.md`（从配置加载）
- **频道上下文**：频道类型、功能
- **沙盒信息**：是否启用、挂载点
- **技能快照**：启用的技能及其描述
- **工具摘要**：所有可用工具的简短描述

### 7. 会话持久化

会话以 [jsonl 格式](https://github.com/badlogic/pi-mono/blob/main/packages/agent-core/src/session.ts) 存储：

```
{"type":"user","content":[{"type":"text","text":"Hello"}]}
{"type":"assistant","content":[{"type":"text","text":"Hi there!"}]}
```

OpenClaw 使用 `SessionManager` 进行：

- **加载**：从磁盘读取会话
- **追加**：将新消息写入会话
- **压缩**：删除旧消息以适应上下文窗口
- **分支**：为实验创建分支会话

### 8. 身份配置轮换

OpenClaw 支持每个提供程序的多个身份配置：

```typescript
const authProfiles = [
  { name: "profile1", apiKey: "sk-...", cooldownUntil: 0 },
  { name: "profile2", apiKey: "sk-...", cooldownUntil: 0 },
];
```

**轮换策略**：

- 选择身份配置时跳过冷却中的配置
- 失败时将身份配置标记为冷却（速率限制、配额）
- 故障转移到下一个可用的身份配置

### 9. 模型目录

`model-catalog.ts` 缓存模型信息：

- **默认模型**：每个提供程序的默认模型
- **功能**：是否支持视觉、工具调用、流式传输
- **限制**：上下文窗口大小、速率限制

## 扩展

OpenClaw 使用自定义 pi 扩展来增强行为：

### 压缩保障

(`pi-extensions/compaction-safeguard.ts`)

- **目的**：防止过度压缩
- **行为**：在压缩前检查会话大小，如果太小则中止

### 上下文修剪

(`pi-extensions/context-pruning.ts`)

- **目的**：通过删除旧消息减少上下文使用
- **行为**：跟踪每条消息的 TTL，修剪过期消息

## 故障转移

OpenClaw 在多个级别处理故障：

### 模型级别

- **提供程序切换**：Anthropic → OpenAI → Google
- **模型降级**：claude-sonnet-4 → claude-3.5-sonnet

### 身份配置级别

- **轮换**：尝试下一个可用的身份配置
- **冷却**：将失败的身份配置标记为不可用一段时间

### 运行级别

- **重试**：使用不同的模型/身份配置重试运行
- **中止**：如果所有选项都耗尽，则中止运行

## 调试

### 系统提示报告

```bash
openclaw agent --message "test" --system-prompt-report
```

生成包含以下内容的报告：

- 完整的系统提示
- 工具摘要
- 技能快照
- 沙盒信息

### 日志记录

`pi-embedded-runner/logger.ts` 提供子系统记录器：

```typescript
logger.debug("Session created", { sessionId, sessionKey });
logger.info("Model resolved", { model, provider });
logger.error("Run failed", { error, runId });
```

## 差异：Pi CLI vs OpenClaw Embedded

| 方面             | Pi CLI                  | OpenClaw 嵌入式                                                                              |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| 调用             | `pi` 命令 / RPC       | 通过 `createAgentSession()` 的 SDK                                                          |
| 工具             | 默认编码工具            | 自定义 OpenClaw 工具套                                                                       |
| 系统提示         | AGENTS.md + 提示        | 每个频道/上下文的动态提示                                                                   |
| 会话存储         | `~/.pi/agent/sessions/` | `~/.openclaw/agents/<agentId>/sessions/`（或 `/agents/<agentId>/sessions/`） |
| 身份验证         | 单一凭据                | 支持轮换的多配置                                                                             |
| 扩展             | 从磁盘加载              | 编程 + 磁盘路径                                                                             |
| 事件处理         | TUI 渲染                | 基于回调（onBlockReply 等）                                                                 |

## 未来考虑

潜在重新设计的领域：

1. **工具签名对齐**：当前在 pi-agent-core 和 pi-coding-agent 签名之间进行适配
2. **会话管理器包装**：`guardSessionManager` 增加了安全性，但增加了复杂性
3. **扩展加载**：可以直接使用 pi 的 `ResourceLoader`
4. **流处理程序复杂性**：`subscribeEmbeddedPiSession` 已经变得很大
5. **提供程序怪癖**：许多提供程序特定的代码路径，pi 可能会处理

## 测试

所有涵盖 pi 集成及其扩展的现有测试：

- `src/agents/pi-embedded-block-chunker.test.ts`
- `src/agents/pi-embedded-helpers.buildbootstrapcontextfiles.test.ts`
- `src/agents/pi-embedded-helpers.classifyfailoverreason.test.ts`
- `src/agents/pi-embedded-helpers.downgradeopenai-reasoning.test.ts`
- `src/agents/pi-embedded-helpers.formatassistanterrortext.test.ts`
- `src/agents/pi-embedded-helpers.formatrawassistanterrorforui.test.ts`
- `src/agents/pi-embedded-helpers.image-dimension-error.test.ts`
- `src/agents/pi-embedded-helpers.image-size-error.test.ts`
- `src/agents/pi-embedded-helpers.isautherrormessage.test.ts`
- `src/agents/pi-embedded-helpers.isbillingerrormessage.test.ts`
- `src/agents/pi-embedded-helpers.iscloudcodeassistformaterror.test.ts`
- `src/agents/pi-embedded-helpers.iscompactionfailureerror.test.ts`
- `src/agents/pi-embedded-helpers.iscontextoverflowerror.test.ts`
- `src/agents/pi-embedded-helpers.isfailovererrormessage.test.ts`
- `src/agents/pi-embedded-helpers.islikelycontextoverflowerror.test.ts`
- `src/agents/pi-embedded-helpers.ismessagingtoolduplicate.test.ts`
- `src/agents/pi-embedded-helpers.messaging-duplicate.test.ts`
- `src/agents/pi-embedded-helpers.normalizetextforcomparison.test.ts`
- `src/agents/pi-embedded-helpers.resolvebootstrapmaxchars.test.ts`
- `src/agents/pi-embedded-helpers.sanitize-session-messages-images.keeps-tool-call-tool-result-ids-unchanged.test.ts`
- `src/agents/pi-embedded-helpers.sanitize-session-messages-images.removes-empty-assistant-text-blocks-but-preserves.test.ts`
- `src/agents/pi-embedded-helpers.sanitizegoogleturnordering.test.ts`
- `src/agents/pi-embedded-helpers.sanitizesessionmessagesimages-thought-signature-stripping.test.ts`
- `src/agents/pi-embedded-helpers.sanitizetoolcallid.test.ts`
- `src/agents/pi-embedded-helpers.sanitizeuserfacingtext.test.ts`
- `src/agents/pi-embedded-runner.run.attempt.test.ts`
- `src/agents/pi-embedded-runner.run.attempt.aborting-cancels-inflight-tools.test.ts`
- `src/agents/pi-embedded-runner.run.attempt.aborting-returns-early.test.ts`
- `src/agents/pi-embedded-runner.run.attempt.session-messages.test.ts`
- `src/agents/pi-embedded-runner.run.attempt.thinking-level.test.ts`
- `src/agents/pi-embedded-runner.run.test.ts`
- `src/agents/pi-tools-policy.test.ts`
- `src/agents/pi-tools.read.test.ts`
- `src/agents/pi-tools.schema.test.ts`
- `src/agents/model-auth.test.ts`
- `src/agents/model-selection.test.ts`
- `src/agents/model-catalog.test.ts`
- `src/agents/context-window-guard.test.ts`
- `src/agents/skills.test.ts`
- `src/agents/sandbox.test.ts`
