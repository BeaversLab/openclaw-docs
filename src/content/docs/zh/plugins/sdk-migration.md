---
title: "Plugin SDK 迁移"
sidebarTitle: "迁移到 SDK"
summary: "从旧版向后兼容层迁移到现代插件 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Plugin SDK 迁移

OpenClaw 已从广泛的向后兼容层转变为现代插件架构，具有专注且有文档记录的导入。如果您的插件是在新架构之前构建的，本指南将帮助您进行迁移。

## 有什么变化

旧的插件系统提供了两个完全开放的接口，允许插件从单个入口点导入它们需要的任何内容：

- **`openclaw/plugin-sdk/compat`** — 重新导出了数十个辅助函数的单一导入项。引入它是为了在构建新插件架构的同时，让基于旧版 hook 的插件继续工作。
- **`openclaw/extension-api`** — 一座桥梁，让插件可以直接访问主机端的辅助函数，例如嵌入式代理运行器。

这两个接口现在都已**弃用**。它们在运行时仍然有效，但新插件绝不能使用它们，现有插件应在下一个主要版本删除它们之前进行迁移。

<Warning>向后兼容层将在未来的主要版本中移除。 届时，仍从这些接口导入的插件将会中断。</Warning>

## 为什么要进行此更改

旧的方法导致了以下问题：

- **启动缓慢** — 导入一个辅助函数会加载数十个不相关的模块
- **循环依赖** — 广泛的重新导出使得很容易创建导入循环
- API 表面不清晰 — 无法区分哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这个问题：每个导入路径 (`openclaw/plugin-sdk/\<subpath\>`) 都是一个小型、独立的模块，具有明确的用途和有文档记录的契约。

针对捆绑渠道的旧版提供商便捷连接层也已消失。诸如 `openclaw/plugin-sdk/slack`、`openclaw/plugin-sdk/discord`、`openclaw/plugin-sdk/signal`、`openclaw/plugin-sdk/whatsapp`、渠道品牌的辅助连接层以及 `openclaw/plugin-sdk/telegram-core` 等导入项都是私有 mono-repo 的快捷方式，并非稳定的插件契约。请改用狭窄的通用 SDK 子路径。在捆绑的插件工作区内，请将提供商拥有的辅助函数保留在该插件自己的 `api.ts` 或 `runtime-api.ts` 中。

当前捆绑提供商示例：

- Anthropic 将 Claude 特定的流辅助函数保留在其自己的 `api.ts` / `contract-api.ts` 连接层中
- OpenAI 将提供商构建器、默认模型辅助函数和实时提供商构建器保留在其自己的 `api.ts` 中
- OpenRouter 将提供商构建器以及新手引导/配置辅助函数保留在其自己的 `api.ts` 中

## 如何迁移

<Steps>
  <Step title="Migrate approval-native handlers to capability facts">
    支持审批功能的渠道插件现在通过 `approvalCapability.nativeRuntime` 以及共享的运行时上下文注册表来公开原生审批行为。

    主要变更：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为
      `approvalCapability.nativeRuntime`
    - 将审批特定的身份验证/交付功能从传统的 `plugin.auth` /
      `plugin.approvals` 连接转移到 `approvalCapability` 上
    - `ChannelPlugin.approvals` 已从公共渠道插件约定中移除；将 delivery/native/render 字段移至 `approvalCapability`
    - `plugin.auth` 仅保留用于渠道登录/注销流程；核心不再读取其中的审批身份验证钩子
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册渠道拥有的运行时对象，例如客户端、令牌或 Bolt 应用
    - 不要从原生审批处理程序发送插件拥有的重定向通知；核心现在拥有来自实际交付结果的路由到别处的通知
    - 将 `channelRuntime` 传递到 `createChannelManager(...)` 时，请提供
      真实的 `createPluginRuntime().channel` surface。部分 stub 会被拒绝。

    请参阅 `/plugins/sdk-channel-plugins` 了解当前的审批能力
      布局。

  </Step>

  <Step title="Audit Windows wrapper fallback behavior">
    如果您的插件使用了 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包装器现在将默认失败（fail closed），除非您显式传递
    `allowShellFallback: true`。

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

  <Step title="Find deprecated imports">
    在您的插件中搜索来自任一已弃用接口的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为集中导入">
    旧接口中的每个导出都对应一个特定的现代导入路径：

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

    对于主机端辅助程序，请使用注入的插件运行时，而不是直接导入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    同样的模式适用于其他遗留桥接辅助程序：

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

  <Step title="构建和测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="通用导入路径表">
  | Import path | Purpose | Key exports | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 规范插件入口辅助函数 | `definePluginEntry` | | `plugin-sdk/core` | 用于渠道入口定义/构建器的旧版通用重新导出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架构导出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 单提供商入口辅助函数 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 专注的渠道入口定义和构建器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共享设置向导辅助函数 | Allowlist prompts, setup status builders | | `plugin-sdk/setup-runtime` | 设置时运行时辅助函数 | Import-safe setup patch adapters, lookup-note
  helpers, `promptResolvedAllowFrom`, `splitSetupEntries`, delegated setup proxies | | `plugin-sdk/setup-adapter-runtime` | 设置适配器辅助函数 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 设置工具辅助函数 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | 多账户辅助函数 | Account
  list/config/action-gate helpers | | `plugin-sdk/account-id` | 账户 ID 辅助函数 | `DEFAULT_ACCOUNT_ID`, account-id normalization | | `plugin-sdk/account-resolution` | 账户查找辅助函数 | Account lookup + default-fallback helpers | | `plugin-sdk/account-helpers` | 窄账户辅助函数 | Account list/account-action helpers | | `plugin-sdk/channel-setup` | 设置向导适配器 |
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | 私信 配对原语 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回复前缀 + 正在输入连线 | `createChannelReplyPipeline` |
  | `plugin-sdk/channel-config-helpers` | 配置适配器工厂 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 配置架构构建器 | Channel config schema types | | `plugin-sdk/telegram-command-config` | Telegram 命令配置辅助函数 | Command-name normalization, description trimming, duplicate/conflict validation | | `plugin-sdk/channel-policy` | 群组/私信 策略解析 |
  `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 账户状态跟踪 | `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | 入站信封辅助函数 | Shared route + envelope builder helpers | | `plugin-sdk/inbound-reply-dispatch` | 入站回复辅助函数 | Shared record-and-dispatch helpers | | `plugin-sdk/messaging-targets` | 消息目标解析 | Target parsing/matching helpers | |
  `plugin-sdk/outbound-media` | 出站媒体辅助函数 | Shared outbound media loading | | `plugin-sdk/outbound-runtime` | 出站运行时辅助函数 | Outbound identity/send delegate helpers | | `plugin-sdk/thread-bindings-runtime` | 线程绑定辅助函数 | Thread-binding lifecycle and adapter helpers | | `plugin-sdk/agent-media-payload` | 旧版媒体负载辅助函数 | Agent media payload builder for legacy field layouts
  | | `plugin-sdk/channel-runtime` | 已弃用的兼容性垫片 | Legacy 渠道 runtime utilities only | | `plugin-sdk/channel-send-result` | 发送结果类型 | Reply result types | | `plugin-sdk/runtime-store` | 持久化插件存储 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 广泛运行时辅助函数 | Runtime/logging/backup/plugin-install helpers | | `plugin-sdk/runtime-env` | 窄运行时环境辅助函数 |
  Logger/runtime env, timeout, retry, and backoff helpers | | `plugin-sdk/plugin-runtime` | 共享插件运行时辅助函数 | Plugin commands/hooks/http/interactive helpers | | `plugin-sdk/hook-runtime` | Hook 管道辅助函数 | Shared webhook/internal hook pipeline helpers | | `plugin-sdk/lazy-runtime` | 延迟运行时辅助函数 | `createLazyRuntimeModule`, `createLazyRuntimeMethod`,
  `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程辅助函数 | Shared exec helpers | | `plugin-sdk/cli-runtime` | CLI 运行时辅助函数 | Command formatting, waits, version helpers | | `plugin-sdk/gateway-runtime` | Gateway(网关) 辅助函数 | Gateway(网关) 客户端和渠道状态修补辅助函数 | | `plugin-sdk/config-runtime` |
  配置辅助函数 | Config load/write helpers | | `plugin-sdk/telegram-command-config` | Telegram 命令辅助函数 | 当捆绑的 Telegram 契约表面不可用时，提供回退稳定的 Telegram 命令验证辅助函数 | | `plugin-sdk/approval-runtime` | 批准提示辅助函数 | Exec/plugin approval payload, approval capability/profile helpers, native approval routing/runtime helpers | | `plugin-sdk/approval-auth-runtime` |
  批准身份验证辅助函数 | Approver resolution, same-chat action auth | | `plugin-sdk/approval-client-runtime` | 批准客户端辅助函数 | Native exec approval profile/filter helpers | | `plugin-sdk/approval-delivery-runtime` | 批准传递辅助函数 | Native approval capability/delivery adapters | | `plugin-sdk/approval-gateway-runtime` | 批准 Gateway(网关) 辅助函数 | Shared approval gateway-resolution helper
  | | `plugin-sdk/approval-handler-adapter-runtime` | 批准适配器辅助函数 | 用于热渠道入口点的轻量级本机批准适配器加载辅助函数 | | `plugin-sdk/approval-handler-runtime` | 批准处理程序辅助函数 | 更广泛的批准处理程序运行时辅助函数；当它们足够时，优先使用较窄的适配器/Gateway(网关) 接缝 | | `plugin-sdk/approval-native-runtime` | 批准目标辅助函数 | Native approval target/account binding helpers | |
  `plugin-sdk/approval-reply-runtime` | 批准回复辅助函数 | Exec/plugin approval reply payload helpers | | `plugin-sdk/channel-runtime-context` | 渠道运行时上下文辅助函数 | Generic 渠道 runtime-context register/get/watch helpers | | `plugin-sdk/security-runtime` | 安全辅助函数 | Shared trust, 私信 gating, external-content, and secret-collection helpers | | `plugin-sdk/ssrf-policy` | SSRF
  策略辅助函数 | Host allowlist and private-network policy helpers | | `plugin-sdk/ssrf-runtime` | SSRF 运行时辅助函数 | Pinned-dispatcher, guarded fetch, SSRF policy helpers | | `plugin-sdk/collection-runtime` | 有界缓存辅助函数 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 诊断门控辅助函数 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` |
  错误格式化辅助函数 | `formatUncaughtError`, `isApprovalNotFoundError`, error graph helpers | | `plugin-sdk/fetch-runtime` | 封装的获取/代理辅助函数 | `resolveFetch`, proxy helpers | | `plugin-sdk/host-runtime` | 主机规范化辅助函数 | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重试辅助函数 | `RetryConfig`, `retryAsync`, policy runners | | `plugin-sdk/allow-from`
  | Allowlist 格式化 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Allowlist 输入映射 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 命令门控和命令表面辅助函数 | `resolveControlCommandGate`, sender-authorization helpers, command registry helpers | | `plugin-sdk/secret-input` | 密钥输入解析 | Secret input helpers | | `plugin-sdk/webhook-ingress` | Webhook
  请求辅助函数 | Webhook target utilities | | `plugin-sdk/webhook-request-guards` | Webhook 正文保护辅助函数 | Request body read/limit helpers | | `plugin-sdk/reply-runtime` | 共享回复运行时 | Inbound dispatch, heartbeat, reply planner, chunking | | `plugin-sdk/reply-dispatch-runtime` | 窄回复分发辅助函数 | Finalize + 提供商 dispatch helpers | | `plugin-sdk/reply-history` | 回复历史辅助函数 |
  `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回复分块辅助函数 | Text/markdown chunking helpers | | `plugin-sdk/session-store-runtime` | 会话存储辅助函数 | Store path + updated-at helpers | |
  `plugin-sdk/state-paths` | 状态路径辅助函数 | 状态和 OAuth 目录辅助函数 | | `plugin-sdk/routing` | 路由/会话密钥辅助函数 | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, 会话-key normalization helpers | | `plugin-sdk/status-helpers` | 渠道状态辅助函数 | Channel/account status summary builders, runtime-state defaults, issue metadata helpers | |
  `plugin-sdk/target-resolver-runtime` | 目标解析器辅助函数 | Shared target resolver helpers | | `plugin-sdk/string-normalization-runtime` | 字符串规范化辅助函数 | Slug/string normalization helpers | | `plugin-sdk/request-url` | 请求 URL 辅助函数 | Extract string URLs from request-like inputs | | `plugin-sdk/run-command` | 定时命令辅助函数 | Timed command runner with normalized stdout/stderr | |
  `plugin-sdk/param-readers` | 参数读取器 | Common 工具/CLI param readers | | `plugin-sdk/tool-send` | 工具发送提取 | Extract canonical send target fields from 工具 args | | `plugin-sdk/temp-path` | 临时路径辅助函数 | Shared temp-download path helpers | | `plugin-sdk/logging-core` | 日志记录辅助函数 | Subsystem logger and redaction helpers | | `plugin-sdk/markdown-table-runtime` | Markdown
  表格辅助函数 | Markdown table mode helpers | | `plugin-sdk/reply-payload` | 消息回复类型 | Reply payload types | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置辅助函数 | Self-hosted 提供商 discovery/config helpers | | `plugin-sdk/self-hosted-provider-setup` | 专注的 OpenAI 兼容自托管提供商设置辅助函数 | Same self-hosted 提供商 discovery/config helpers | |
  `plugin-sdk/provider-auth-runtime` | 提供商运行时身份验证辅助函数 | Runtime API 密钥解析辅助函数 | | `plugin-sdk/provider-auth-api-key` | 提供商 API 密钥设置辅助函数 | API 密钥新手引导/配置文件写入辅助函数 | | `plugin-sdk/provider-auth-result` | 提供商身份验证结果辅助函数 | Standard OAuth auth-result builder | | `plugin-sdk/provider-auth-login` | 提供商交互式登录辅助函数 | Shared interactive
  login helpers | | `plugin-sdk/provider-env-vars` | 提供商环境变量辅助函数 | Provider auth env-var lookup helpers | | `plugin-sdk/provider-model-shared` | 共享提供商模型/重播辅助函数 | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, shared replay-policy builders, 提供商-endpoint helpers, and 模型-id normalization helpers | | `plugin-sdk/provider-catalog-shared` |
  共享提供商目录辅助函数 | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供商新手引导补丁 | 新手引导 config helpers | | `plugin-sdk/provider-http` | 提供商 HTTP 辅助函数 | Generic 提供商 HTTP/endpoint capability helpers | | `plugin-sdk/provider-web-fetch` | 提供商 Web
  获取辅助函数 | Web-fetch 提供商 registration/cache helpers | | `plugin-sdk/provider-web-search-contract` | 提供商 Web 搜索契约辅助函数 | Narrow web-search config/credential contract helpers such as `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, and scoped credential setters/getters | | `plugin-sdk/provider-web-search` | 提供商 Web 搜索辅助函数 | Web-search 提供商
  registration/cache/runtime helpers | | `plugin-sdk/provider-tools` | 提供商工具/架构兼容性辅助函数 | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini schema cleanup + diagnostics, and xAI compat helpers such as `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供商使用辅助函数 | `fetchClaudeUsage`, `fetchGeminiUsage`,
  `fetchGithubCopilotUsage`, and other 提供商 usage helpers | | `plugin-sdk/provider-stream` | 提供商流包装器辅助函数 | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, stream wrapper types, and shared Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper helpers | | `plugin-sdk/keyed-async-queue` | 有序异步队列 |
  `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共享媒体辅助函数 | Media fetch/transform/store helpers plus media payload builders | | `plugin-sdk/media-generation-runtime` | 共享媒体生成辅助函数 | Shared failover helpers, candidate selection, and missing-模型 messaging for image/video/music generation | | `plugin-sdk/media-understanding` | 媒体理解辅助函数 | Media understanding 提供商 types
  plus 提供商-facing image/audio helper exports | | `plugin-sdk/text-runtime` | 共享文本辅助函数 | Assistant-visible-text stripping, markdown render/chunking/table helpers, redaction helpers, directive-tag helpers, safe-text utilities, and related text/logging helpers | | `plugin-sdk/text-chunking` | 文本分块辅助函数 | Outbound text chunking helper | | `plugin-sdk/speech` | 语音辅助函数 | Speech
  提供商 types plus 提供商-facing directive, registry, and validation helpers | | `plugin-sdk/speech-core` | 共享语音核心 | Speech 提供商 types, registry, directives, normalization | | `plugin-sdk/realtime-transcription` | 实时转录辅助函数 | Provider types and registry helpers | | `plugin-sdk/realtime-voice` | 实时语音辅助函数 | Provider types and registry helpers | |
  `plugin-sdk/image-generation-core` | 共享图像生成核心 | Image-generation types, failover, auth, and registry helpers | | `plugin-sdk/music-generation` | 音乐生成辅助函数 | Music-generation 提供商/request/result types | | `plugin-sdk/music-generation-core` | 共享音乐生成核心 | Music-generation types, failover helpers, 提供商 lookup, and 模型-ref parsing | | `plugin-sdk/video-generation` |
  视频生成辅助函数 | Video-generation 提供商/request/result types | | `plugin-sdk/video-generation-core` | 共享视频生成核心 | Video-generation types, failover helpers, 提供商 lookup, and 模型-ref parsing | | `plugin-sdk/interactive-runtime` | 交互式回复辅助函数 | Interactive reply payload normalization/reduction | | `plugin-sdk/channel-config-primitives` | 渠道配置原语 | Narrow 渠道 config-schema
  primitives | | `plugin-sdk/channel-config-writes` | 渠道配置写入辅助函数 | Channel config-write authorization helpers | | `plugin-sdk/channel-plugin-common` | 共享渠道前奏 | Shared 渠道 plugin prelude exports | | `plugin-sdk/channel-status` | 渠道状态辅助函数 | Shared 渠道 status snapshot/summary helpers | | `plugin-sdk/allowlist-config-edit` | Allowlist 配置辅助函数 | Allowlist config edit/read
  helpers | | `plugin-sdk/group-access` | 群组访问辅助函数 | Shared group-access decision helpers | | `plugin-sdk/direct-dm` | 直接 私信 辅助函数 | Shared direct-私信 auth/guard helpers | | `plugin-sdk/extension-shared` | 共享扩展辅助函数 | Passive-渠道/status and ambient proxy helper primitives | | `plugin-sdk/webhook-targets` | Webhook 目标辅助函数 | Webhook target registry and route-install
  helpers | | `plugin-sdk/webhook-path` | Webhook 路径辅助函数 | Webhook path normalization helpers | | `plugin-sdk/web-media` | 共享 Web 媒体辅助函数 | Remote/local media loading helpers | | `plugin-sdk/zod` | Zod 重新导出 | Re-exported `zod` for plugin SDK consumers | | `plugin-sdk/memory-core` | 捆绑内存核心辅助函数 | Memory manager/config/file/CLI helper surface | |
  `plugin-sdk/memory-core-engine-runtime` | 内存引擎运行时外观 | Memory index/search runtime facade | | `plugin-sdk/memory-core-host-engine-foundation` | 内存主机基础引擎 | Memory host foundation engine exports | | `plugin-sdk/memory-core-host-engine-embeddings` | 内存主机嵌入引擎 | Memory host embedding engine exports | | `plugin-sdk/memory-core-host-engine-qmd` | 内存主机 QMD 引擎 | Memory host
  QMD engine exports | | `plugin-sdk/memory-core-host-engine-storage` | 内存主机存储引擎 | Memory host storage engine exports | | `plugin-sdk/memory-core-host-multimodal` | 内存主机多模态辅助函数 | Memory host multimodal helpers | | `plugin-sdk/memory-core-host-query` | 内存主机查询辅助函数 | Memory host query helpers | | `plugin-sdk/memory-core-host-secret` | 内存主机密钥辅助函数 | Memory host
  secret helpers | | `plugin-sdk/memory-core-host-events` | 内存主机事件日志辅助函数 | Memory host event journal helpers | | `plugin-sdk/memory-core-host-status` | 内存主机状态辅助函数 | Memory host status helpers | | `plugin-sdk/memory-core-host-runtime-cli` | 内存主机 CLI 运行时 | Memory host CLI runtime helpers | | `plugin-sdk/memory-core-host-runtime-core` | 内存主机核心运行时 | Memory host
  core runtime helpers | | `plugin-sdk/memory-core-host-runtime-files` | 内存主机文件/运行时辅助函数 | Memory host file/runtime helpers | | `plugin-sdk/memory-host-core` | 内存主机核心运行时别名 | Vendor-neutral alias for memory host core runtime helpers | | `plugin-sdk/memory-host-events` | 内存主机事件日志别名 | Vendor-neutral alias for memory host event journal helpers | |
  `plugin-sdk/memory-host-files` | 内存主机文件/运行时别名 | Vendor-neutral alias for memory host file/runtime helpers | | `plugin-sdk/memory-host-markdown` | 托管 Markdown 辅助函数 | Shared managed-markdown helpers for memory-adjacent plugins | | `plugin-sdk/memory-host-search` | 主动内存搜索外观 | Lazy active-memory search-manager runtime facade | | `plugin-sdk/memory-host-status` |
  内存主机状态别名 | Vendor-neutral alias for memory host status helpers | | `plugin-sdk/memory-lancedb` | 捆绑内存 LanceDB 辅助函数 | Memory-lancedb helper surface | | `plugin-sdk/testing` | 测试工具 | Test helpers and mocks |
</Accordion>

此表特意列出了常用的迁移子集，而非完整的 SDK
表面。包含 200 多个入口点的完整列表位于
`scripts/lib/plugin-sdk-entrypoints.json`。

该列表仍包含一些捆绑插件辅助接缝，例如
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。这些保留导出是
为了捆绑插件的维护和兼容性，但它们被故意
从常用迁移表中省略，且不是
新插件代码的推荐目标。

同样的规则适用于其他捆绑辅助家族，例如：

- 浏览器支持辅助程序：`plugin-sdk/browser-cdp`、`plugin-sdk/browser-config-runtime`、`plugin-sdk/browser-config-support`、`plugin-sdk/browser-control-auth`、`plugin-sdk/browser-node-runtime`、`plugin-sdk/browser-profiles`、`plugin-sdk/browser-security-runtime`、`plugin-sdk/browser-setup-tools`、`plugin-sdk/browser-support`
- Matrix：`plugin-sdk/matrix*`
- LINE：`plugin-sdk/line*`
- IRC：`plugin-sdk/irc*`
- 捆绑辅助程序/插件表面，例如 `plugin-sdk/googlechat`、
  `plugin-sdk/zalouser`、`plugin-sdk/bluebubbles*`、
  `plugin-sdk/mattermost*`、`plugin-sdk/msteams`、
  `plugin-sdk/nextcloud-talk`、`plugin-sdk/nostr`、`plugin-sdk/tlon`、
  `plugin-sdk/twitch`、
  `plugin-sdk/github-copilot-login`、`plugin-sdk/github-copilot-token`、
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diffs`、`plugin-sdk/llm-task`、
  `plugin-sdk/thread-ownership` 和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 当前暴露了狭窄的令牌辅助
表面 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

使用与任务匹配的最窄的导入。如果您找不到导出，
请检查 `src/plugin-sdk/` 处的源代码或在 Discord 中询问。

## 移除时间表

| 时间               | 发生的事情                                       |
| ------------------ | ------------------------------------------------ |
| **现在**           | 已弃用的表面会发出运行时警告                     |
| **下一个主要版本** | 已弃用的接口将被移除；仍在使用它们的插件将会失效 |

所有核心插件已经完成迁移。外部插件应在下一次主要版本发布前完成迁移。

## 暂时抑制警告

在进行迁移工作时，请设置这些环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时的逃生手段，而非永久解决方案。

## 相关内容

- [入门指南](/en/plugins/building-plugins) — 构建你的第一个插件
- [SDK 概述](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [渠道插件](/en/plugins/sdk-channel-plugins) — 构建渠道插件
- [提供商插件](/en/plugins/sdk-provider-plugins) — 构建提供商插件
- [插件内部原理](/en/plugins/architecture) — 深入探讨架构
- [插件清单](/en/plugins/manifest) — 清单架构参考
