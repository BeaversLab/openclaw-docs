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

- **`openclaw/plugin-sdk/compat`** — 一个重新导出数十个辅助函数的单一导入项。引入它的目的是在构建新插件架构的同时，使旧的基于 hook 的插件能够继续工作。
- **`openclaw/extension-api`** — 一座桥梁，赋予插件对宿主端辅助函数（如嵌入式代理运行器）的直接访问权限。

这两个接口现在都已**弃用**。它们在运行时仍然有效，但新插件绝不能使用它们，现有插件应在下一个主要版本删除它们之前进行迁移。

<Warning>向后兼容层将在未来的主要版本中移除。 届时，仍从这些接口导入的插件将会中断。</Warning>

## 为什么要进行此更改

旧的方法导致了以下问题：

- **启动缓慢** — 导入一个辅助函数会加载数十个不相关的模块
- **循环依赖** — 广泛的重新导出使得很容易创建导入循环
- API 表面不清晰 — 无法区分哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这个问题：每个导入路径 (`openclaw/plugin-sdk/\<subpath\>`) 都是一个小型的、自包含的模块，具有明确的目的和记录在案的合约。

用于捆绑渠道的旧版提供商便捷接口也已消失。诸如 `openclaw/plugin-sdk/slack`、`openclaw/plugin-sdk/discord`、
`openclaw/plugin-sdk/signal`、`openclaw/plugin-sdk/whatsapp`、
渠道品牌的辅助接口以及
`openclaw/plugin-sdk/telegram-core` 等导入项都是私有的 monorepo 快捷方式，而非稳定的插件合约。请改用狭窄的通用 SDK 子路径。在捆绑插件工作区内，请将提供商拥有的辅助函数保留在该插件自己的
`api.ts` 或 `runtime-api.ts` 中。

当前捆绑提供商示例：

- Anthropic 将 Claude 特定的流辅助函数保留在其自己的 `api.ts` /
  `contract-api.ts` 接口中
- OpenAI 将提供商构建器、默认模型辅助函数和实时提供商构建器保留在其自己的 `api.ts` 中
- OpenRouter 将提供商构建器和新手引导/配置辅助函数保留在其自己的
  `api.ts` 中

## 如何迁移

<Steps>
  <Step title="审核 Windows 封装器回退行为">
    如果您的插件使用了 `openclaw/plugin-sdk/windows-spawn`，除非您显式传递
    `allowShellFallback: true`，否则未解析的 Windows
    `.cmd`/`.bat` 封装器现在将直接失败。

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
    在您的插件中搜索来自任一已弃用表面的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为集中式导入">
    旧表面导出的每个内容都映射到特定的现代导入路径：

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

    对于主机端辅助函数，请使用注入的插件运行时，而不是直接导入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    同样的模式适用于其他遗留桥接辅助函数：

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

  <Step title="构建并测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="通用导入路径表">
  | 导入路径 | 用途 | 主要导出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 规范化插件入口助手 | `definePluginEntry` | | `plugin-sdk/core` | 渠道入口定义/构建器的旧版通用重新导出 | `defineChannelPluginEntry`，`createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架构导出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 单提供商入口助手 | `defineSingleProviderPluginEntry` | |
  `plugin-sdk/channel-core` | 专注的渠道入口定义和构建器 | `defineChannelPluginEntry`，`defineSetupPluginEntry`，`createChatChannelPlugin`，`createChannelPluginBase` | | `plugin-sdk/setup` | 共享设置向导助手 | Allowlist 提示，设置状态构建器 | | `plugin-sdk/setup-runtime` | 设置时运行时助手 | 导入安全的设置修补适配器，查找注释助手，`promptResolvedAllowFrom`，`splitSetupEntries`，委托设置代理 | |
  `plugin-sdk/setup-adapter-runtime` | 设置适配器助手 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 设置工具助手 | `formatCliCommand`，`detectBinary`，`extractArchive`，`resolveBrewExecutable`，`formatDocsLink`，`CONFIG_DIR` | | `plugin-sdk/account-core` | 多账户助手 | 账户列表/配置/操作网关助手 | | `plugin-sdk/account-id` | 账户 ID 助手 | `DEFAULT_ACCOUNT_ID`，账户 ID
  标准化 | | `plugin-sdk/account-resolution` | 账户查找助手 | 账户查找 + 默认回退助手 | | `plugin-sdk/account-helpers` | 窄范围账户助手 | 账户列表/账户操作助手 | | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`，`createOptionalChannelSetupAdapter`，`createOptionalChannelSetupWizard`，以及
  `DEFAULT_ACCOUNT_ID`，`createTopLevelChannelDmPolicy`，`setSetupChannelEnabled`，`splitSetupEntries` | | `plugin-sdk/channel-pairing` | 私信配对原语 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回复前缀 + 输入状态连接 | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | 配置适配器工厂 | `createHybridChannelConfigAdapter` | |
  `plugin-sdk/channel-config-schema` | 配置架构构建器 | 渠道配置架构类型 | | `plugin-sdk/telegram-command-config` | Telegram 命令配置助手 | 命令名称标准化，描述修剪，重复/冲突验证 | | `plugin-sdk/channel-policy` | 群组/私信策略解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 账户状态跟踪 | `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | 入站信封助手 |
  共享路由 + 信封构建器助手 | | `plugin-sdk/inbound-reply-dispatch` | 入站回复助手 | 共享记录和分发助手 | | `plugin-sdk/messaging-targets` | 消息目标解析 | 目标解析/匹配助手 | | `plugin-sdk/outbound-media` | 出站媒体助手 | 共享出站媒体加载 | | `plugin-sdk/outbound-runtime` | 出站运行时助手 | 出站身份/发送委托助手 | | `plugin-sdk/thread-bindings-runtime` | 线程绑定助手 |
  线程绑定生命周期和适配器助手 | | `plugin-sdk/agent-media-payload` | 旧版媒体负载助手 | 用于旧版字段布局的 Agent 媒体负载构建器 | | `plugin-sdk/channel-runtime` | 已弃用的兼容性垫片 | 仅限旧版渠道运行时实用工具 | | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 | | `plugin-sdk/runtime-store` | 持久化插件存储 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 广泛的运行时助手
  | 运行时/日志/备份/插件安装助手 | | `plugin-sdk/runtime-env` | 窄范围的运行时环境助手 | 记录器/运行时环境，超时，重试和退避助手 | | `plugin-sdk/plugin-runtime` | 共享插件运行时助手 | 插件命令/钩子/HTTP/交互助手 | | `plugin-sdk/hook-runtime` | 钩子管道助手 | 共享 Webhook/内部钩子管道助手 | | `plugin-sdk/lazy-runtime` | 延迟运行时助手 |
  `createLazyRuntimeModule`，`createLazyRuntimeMethod`，`createLazyRuntimeMethodBinder`，`createLazyRuntimeNamedExport`，`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程助手 | 共享执行助手 | | `plugin-sdk/cli-runtime` | CLI 运行时助手 | 命令格式化，等待，版本助手 | | `plugin-sdk/gateway-runtime` | Gateway(网关) 助手 | Gateway(网关) 客户端和渠道状态修补助手 | |
  `plugin-sdk/config-runtime` | 配置助手 | 配置加载/写入助手 | | `plugin-sdk/telegram-command-config` | Telegram 命令助手 | 当捆绑的 Telegram 协议表面不可用时，回退稳定的 Telegram 命令验证助手 | | `plugin-sdk/approval-runtime` | 审批提示助手 | 执行/插件审批负载，审批能力/配置文件助手，原生审批路由/运行时助手 | | `plugin-sdk/approval-auth-runtime` | 审批身份验证助手 | 审批者解析，同会话操作身份验证
  | | `plugin-sdk/approval-client-runtime` | 审批客户端助手 | 原生执行审批配置文件/筛选器助手 | | `plugin-sdk/approval-delivery-runtime` | 审批交付助手 | 原生审批能力/交付适配器 | | `plugin-sdk/approval-native-runtime` | 审批目标助手 | 原生审批目标/账户绑定助手 | | `plugin-sdk/approval-reply-runtime` | 审批回复助手 | 执行/插件审批回复负载助手 | | `plugin-sdk/security-runtime` | 安全助手 |
  共享信任，私信拦截，外部内容和秘密收集助手 | | `plugin-sdk/ssrf-policy` | SSRF 策略助手 | 主机允许列表和私有网络策略助手 | | `plugin-sdk/ssrf-runtime` | SSRF 运行时助手 | 固定分发器，受保护的获取，SSRF 策略助手 | | `plugin-sdk/collection-runtime` | 有界缓存助手 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 诊断拦截助手 | `isDiagnosticFlagEnabled`，`isDiagnosticsEnabled` | |
  `plugin-sdk/error-runtime` | 错误格式化助手 | `formatUncaughtError`，`isApprovalNotFoundError`，错误图助手 | | `plugin-sdk/fetch-runtime` | 包装的获取/代理助手 | `resolveFetch`，代理助手 | | `plugin-sdk/host-runtime` | 主机标准化助手 | `normalizeHostname`，`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重试助手 | `RetryConfig`，`retryAsync`，策略运行器 | | `plugin-sdk/allow-from` |
  Allowlist 格式化 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Allowlist 输入映射 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 命令拦截和命令表面助手 | `resolveControlCommandGate`，发送者身份验证助手，命令注册助手 | | `plugin-sdk/secret-input` | 秘密输入解析 | 秘密输入助手 | | `plugin-sdk/webhook-ingress` | Webhook 请求助手 | Webhook 目标实用工具 | |
  `plugin-sdk/webhook-request-guards` | Webhook 请求体保护助手 | 请求体读取/限制助手 | | `plugin-sdk/reply-runtime` | 共享回复运行时 | 入站分发，心跳，回复规划器，分块 | | `plugin-sdk/reply-dispatch-runtime` | 窄范围回复分发助手 | 完成 + 提供商分发助手 | | `plugin-sdk/reply-history` | 回复历史助手 |
  `buildHistoryContext`，`buildPendingHistoryContextFromMap`，`recordPendingHistoryEntry`，`clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回复分块助手 | 文本/Markdown 分块助手 | | `plugin-sdk/session-store-runtime` | 会话存储助手 | 存储路径 + 更新时间助手 | | `plugin-sdk/state-paths` | 状态路径助手 |
  状态和 OAuth 目录助手 | | `plugin-sdk/routing` | 路由/会话密钥助手 | `resolveAgentRoute`，`buildAgentSessionKey`，`resolveDefaultAgentBoundAccountId`，会话密钥标准化助手 | | `plugin-sdk/status-helpers` | 渠道状态助手 | 渠道/账户状态摘要构建器，运行时状态默认值，问题元数据助手 | | `plugin-sdk/target-resolver-runtime` | 目标解析器助手 | 共享目标解析器助手 | |
  `plugin-sdk/string-normalization-runtime` | 字符串标准化助手 | Slug/字符串标准化助手 | | `plugin-sdk/request-url` | 请求 URL 助手 | 从类似请求的输入中提取字符串 URL | | `plugin-sdk/run-command` | 计时命令助手 | 带有标准化 stdout/stderr 的计时命令运行器 | | `plugin-sdk/param-readers` | 参数读取器 | 通用工具/CLI 参数读取器 | | `plugin-sdk/tool-send` | 工具发送提取 |
  从工具参数中提取规范的发送目标字段 | | `plugin-sdk/temp-path` | 临时路径助手 | 共享临时下载路径助手 | | `plugin-sdk/logging-core` | 日志记录助手 | 子系统记录器和编辑助手 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格助手 | Markdown 表格模式助手 | | `plugin-sdk/reply-payload` | 消息回复类型 | 回复负载类型 | | `plugin-sdk/provider-setup` | 精选本地/自托管提供商设置助手 |
  自托管提供商发现/配置助手 | | `plugin-sdk/self-hosted-provider-setup` | 专注的 OpenAI 兼容自托管提供商设置助手 | 相同的自托管提供商发现/配置助手 | | `plugin-sdk/provider-auth-runtime` | 提供商运行时身份验证助手 | 运行时 API 密钥解析助手 | | `plugin-sdk/provider-auth-api-key` | 提供商 API 密钥设置助手 | API 密钥新手引导/配置文件写入助手 | | `plugin-sdk/provider-auth-result` |
  提供商身份验证结果助手 | 标准 OAuth 身份验证结果构建器 | | `plugin-sdk/provider-auth-login` | 提供商交互式登录助手 | 共享交互式登录助手 | | `plugin-sdk/provider-env-vars` | 提供商环境变量助手 | 提供商身份验证环境变量查找助手 | | `plugin-sdk/provider-model-shared` | 共享提供商模型/重播助手 |
  `ProviderReplayFamily`，`buildProviderReplayFamilyHooks`，`normalizeModelCompat`，共享重播策略构建器，提供商端点助手和模型 ID 标准化助手 | | `plugin-sdk/provider-catalog-shared` | 共享提供商目录助手 | `findCatalogTemplate`，`buildSingleProviderApiKeyCatalog`，`supportsNativeStreamingUsageCompat`，`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供商新手引导修补 |
  新手引导配置助手 | | `plugin-sdk/provider-http` | 提供商 HTTP 助手 | 通用提供商 HTTP/端点能力助手 | | `plugin-sdk/provider-web-fetch` | 提供商 Web 获取助手 | Web 获取提供商注册/缓存助手 | | `plugin-sdk/provider-web-search` | 提供商 Web 搜索助手 | Web 搜索提供商注册/缓存/配置助手 | | `plugin-sdk/provider-tools` | 提供商工具/架构兼容性助手 |
  `ProviderToolCompatFamily`，`buildProviderToolCompatFamilyHooks`，Gemini 架构清理 + 诊断以及 xAI 兼容性助手，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供商使用助手 | `fetchClaudeUsage`，`fetchGeminiUsage`，`fetchGithubCopilotUsage` 以及其他提供商使用助手 | | `plugin-sdk/provider-stream` | 提供商流包装器助手 |
  `ProviderStreamFamily`，`buildProviderStreamFamilyHooks`，`composeProviderStreamWrappers`，流包装器类型以及共享的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器助手 | | `plugin-sdk/keyed-async-queue` | 有序异步队列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共享媒体助手 | 媒体获取/转换/存储助手以及媒体负载构建器 | |
  `plugin-sdk/media-understanding` | 媒体理解助手 | 媒体理解提供商类型以及面向提供商的图像/音频助手导出 | | `plugin-sdk/text-runtime` | 共享文本助手 | 助手可见文本剥离，Markdown 渲染/分块/表格助手，编辑助手，指令标记助手，安全文本实用工具以及相关文本/日志助手 | | `plugin-sdk/text-chunking` | 文本分块助手 | 出站文本分块助手 | | `plugin-sdk/speech` | 语音助手 |
  语音提供商类型以及面向提供商的指令，注册和验证助手 | | `plugin-sdk/speech-core` | 共享语音核心 | 语音提供商类型，注册，指令，标准化 | | `plugin-sdk/realtime-transcription` | 实时转录助手 | 提供商类型和注册助手 | | `plugin-sdk/realtime-voice` | 实时语音助手 | 提供商类型和注册助手 | | `plugin-sdk/image-generation-core` | 共享图像生成核心 | 图像生成类型，故障转移，身份验证和注册助手 | |
  `plugin-sdk/music-generation` | 音乐生成助手 | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` | 共享音乐生成核心 | 音乐生成类型，故障转移助手，提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成助手 | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享视频生成核心 | 视频生成类型，故障转移助手，提供商查找和模型引用解析 | |
  `plugin-sdk/interactive-runtime` | 交互式回复助手 | 交互式回复负载标准化/简化 | | `plugin-sdk/channel-config-primitives` | 渠道配置原语 | 窄范围渠道配置架构原语 | | `plugin-sdk/channel-config-writes` | 渠道配置写入助手 | 渠道配置写入身份验证助手 | | `plugin-sdk/channel-plugin-common` | 共享渠道前奏 | 共享渠道插件前奏导出 | | `plugin-sdk/channel-status` | 渠道状态助手 | 共享渠道状态快照/摘要助手
  | | `plugin-sdk/allowlist-config-edit` | Allowlist 配置助手 | Allowlist 配置编辑/读取助手 | | `plugin-sdk/group-access` | 群组访问助手 | 共享群组访问决策助手 | | `plugin-sdk/direct-dm` | 直接私信助手 | 共享直接私信身份验证/保护助手 | | `plugin-sdk/extension-shared` | 共享扩展助手 | 被动渠道/状态助手原语 | | `plugin-sdk/webhook-targets` | Webhook 目标助手 | Webhook 目标注册和路由安装助手 | |
  `plugin-sdk/webhook-path` | Webhook 路径助手 | Webhook 路径标准化助手 | | `plugin-sdk/web-media` | 共享 Web 媒体助手 | 远程/本地媒体加载助手 | | `plugin-sdk/zod` | Zod 重新导出 | 为插件 SDK 使用者重新导出的 `zod` | | `plugin-sdk/memory-core` | 捆绑的 memory-core 助手 | Memory 管理器/配置/文件/CLI 助手表面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 引擎运行时门面 | Memory
  索引/搜索运行时门面 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎 | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主机嵌入引擎 | Memory 主机嵌入引擎导出 | | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主机 QMD 引擎 | Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎 | Memory
  主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机秘密助手 | Memory 主机秘密助手 | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | Memory 主机状态助手 | |
  `plugin-sdk/memory-core-host-runtime-cli` | Memory 主机 CLI 运行时 | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时 | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-lancedb` | 捆绑的 memory-lancedb 助手 | Memory-lancedb 助手表面 | |
  `plugin-sdk/testing` | 测试实用工具 | 测试助手和模拟 |
</Accordion>

此表格特意列出了通用的迁移子集，而非完整的 SDK
表面。包含 200 多个入口点的完整列表位于
`scripts/lib/plugin-sdk-entrypoints.json`。

该列表仍包含一些捆绑插件辅助接口，例如
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。这些接口继续导出以
用于捆绑插件的维护和兼容性，但它们被有意
从通用迁移表中省略，并且不是新插件代码
的推荐目标。

同样的规则适用于其他捆绑辅助系列，例如：

- 浏览器支持辅助工具：`plugin-sdk/browser-cdp`、`plugin-sdk/browser-config-runtime`、`plugin-sdk/browser-config-support`、`plugin-sdk/browser-control-auth`、`plugin-sdk/browser-node-runtime`、`plugin-sdk/browser-profiles`、`plugin-sdk/browser-security-runtime`、`plugin-sdk/browser-setup-tools`、`plugin-sdk/browser-support`
- Matrix：`plugin-sdk/matrix*`
- LINE：`plugin-sdk/line*`
- IRC：`plugin-sdk/irc*`
- 捆绑辅助工具/插件表面，例如 `plugin-sdk/googlechat`、
  `plugin-sdk/zalouser`、`plugin-sdk/bluebubbles*`、
  `plugin-sdk/mattermost*`、`plugin-sdk/msteams`、
  `plugin-sdk/nextcloud-talk`、`plugin-sdk/nostr`、`plugin-sdk/tlon`、
  `plugin-sdk/twitch`、
  `plugin-sdk/github-copilot-login`、`plugin-sdk/github-copilot-token`、
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diffs`、`plugin-sdk/llm-task`、
  `plugin-sdk/thread-ownership` 和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 目前暴露了特定的令牌辅助
表面 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

使用与任务匹配的最窄导入。如果您找不到导出，
请查看 `src/plugin-sdk/` 的源代码或在 Discord 上询问。

## 移除时间表

| 时间               | 发生什么                                           |
| ------------------ | -------------------------------------------------- |
| **现在**           | 已弃用的表面会发出运行时警告                       |
| **下一个主要版本** | 已弃用的接口将被移除；仍在使用它们的插件将无法运行 |

所有核心插件已完成迁移。外部插件应在下一次主要版本发布前完成迁移。

## 暂时抑制警告

在进行迁移工作时，请设置以下环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时的应急方案，并非永久解决方案。

## 相关内容

- [入门指南](/en/plugins/building-plugins) — 构建你的第一个插件
- [SDK 概述](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [渠道插件](/en/plugins/sdk-channel-plugins) — 构建渠道插件
- [提供商插件](/en/plugins/sdk-provider-plugins) — 构建提供商插件
- [插件内部机制](/en/plugins/architecture) — 架构深度解析
- [插件清单](/en/plugins/manifest) — 清单架构参考
