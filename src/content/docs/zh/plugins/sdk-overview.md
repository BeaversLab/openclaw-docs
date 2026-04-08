---
title: "插件 SDK 概览"
sidebarTitle: "SDK 概览"
summary: "导入映射、注册 API 参考以及 SDK 架构"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# 插件 SDK 概述

插件 SDK 是插件与核心之间的类型化契约。本页面是关于**导入内容**和**可注册内容**的参考。

<Tip>**正在寻找操作指南？** - 第一个插件？从 [入门指南](/en/plugins/building-plugins) 开始 - 渠道插件？请参阅 [渠道插件](/en/plugins/sdk-channel-plugins) - 提供商插件？请参阅 [提供商插件](/en/plugins/sdk-provider-plugins)</Tip>

## 导入约定

请始终从特定的子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径都是一个小型的、自包含的模块。这可以加快启动速度并防止循环依赖问题。对于特定于渠道的入口/构建辅助程序，首选 `openclaw/plugin-sdk/channel-core`；保留 `openclaw/plugin-sdk/core` 用于更广泛的通用界面和共享辅助程序，例如 `buildChannelConfigSchema`。

不要添加或依赖以提供商命名的便捷接口，例如 `openclaw/plugin-sdk/slack`、`openclaw/plugin-sdk/discord`、`openclaw/plugin-sdk/signal`、`openclaw/plugin-sdk/whatsapp` 或品牌化的渠道辅助接口。捆绑插件应在其自己的 `api.ts` 或 `runtime-api.ts` 桶内组合通用的 SDK 子路径，而核心应使用这些插件本地的桶，或者在需求确实跨渠道时添加一个狭窄的通用 SDK 契约。

生成的导出映射仍然包含一小部分捆绑插件辅助接口，例如 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。这些子路径仅用于捆绑插件的维护和兼容性；它们有意从下方的通用表中省略，并不是新的第三方插件的推荐导入路径。

## 子路径参考

最常用的子路径，按用途分组。包含 200 多个子路径的生成的完整列表位于 `scripts/lib/plugin-sdk-entrypoints.json` 中。

保留的捆绑插件辅助子路径仍会出现在该生成的列表中。除非文档页面明确将其提升为公开内容，否则请将它们视为实现细节/兼容性界面。

### 插件入口

| 子路径                      | 主要导出                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`   | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`           | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema` |
| `plugin-sdk/config-schema`  | `OpenClawSchema`                                                                                                                       |
| `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry`                                                                                                      |

<AccordionGroup>
  <Accordion title="渠道子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式导出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导助手、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门控助手、默认账户回退助手 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 ID 规范化助手 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退助手 |
    | `plugin-sdk/account-helpers` | 精简账户列表/账户操作助手 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 渠道配置模式类型 |
    | `plugin-sdk/telegram-command-config` | Telegram 自定义命令规范化/验证助手，带有捆绑合约回退 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器助手 |
    | `plugin-sdk/inbound-reply-dispatch` | 共享入站记录和分发助手 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载助手 |
    | `plugin-sdk/outbound-runtime` | 出站身份/发送委托助手 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器助手 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和配置绑定助手 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照助手 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析助手 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要助手 |
    | `plugin-sdk/channel-config-primitives` | 精简渠道配置模式原语 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权助手 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取助手 |
    | `plugin-sdk/group-access` | 共享组访问决策助手 |
    | `plugin-sdk/direct-dm` | 共享直接私信身份验证/守护助手 |
    | `plugin-sdk/interactive-runtime` | 交互式回复负载规范化/归约助手 |
    | `plugin-sdk/channel-inbound` | 防抖、提及匹配、信封助手 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/channel-contract` | 渠道合约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连线 |
  </Accordion>

<Accordion title="Provider 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置辅助函数 | | `plugin-sdk/self-hosted-provider-setup` | 专注于 OpenAI 兼容的自托管提供商设置辅助函数 | | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析辅助函数 | | `plugin-sdk/provider-auth-api-key` | API
  密钥新手引导/配置文件写入辅助函数 | | `plugin-sdk/provider-auth-result` | 标准 OAuth 认证结果构建器 | | `plugin-sdk/provider-auth-login` | 用于提供商插件的共享交互式登录辅助函数 | | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找辅助函数 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile` | |
  `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享的重放策略构建器、提供商端点辅助函数，以及模型 ID 标准化辅助函数（如 `normalizeNativeXaiModelId`） | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用提供商 HTTP/端点能力辅助函数 | | `plugin-sdk/provider-web-fetch` | Web 抓取提供商注册/缓存辅助函数 | | `plugin-sdk/provider-web-search` | Web 搜索提供商注册/缓存/配置辅助函数 | | `plugin-sdk/provider-tools` |
  `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 架构清理与诊断，以及 xAI 兼容性辅助函数（如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat`） | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及类似内容 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型，以及共享的
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助函数 | | `plugin-sdk/provider-onboard` | 新手引导配置补丁辅助函数 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存辅助函数 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册助手，发送者授权助手 | | `plugin-sdk/approval-auth-runtime` | 批准者解析和同聊天操作授权助手 | | `plugin-sdk/approval-client-runtime` | 原生执行批准配置文件/过滤器助手 | | `plugin-sdk/approval-delivery-runtime` | 原生批准能力/传递适配器 | | `plugin-sdk/approval-native-runtime` | 原生批准目标 +
  账户绑定助手 | | `plugin-sdk/approval-reply-runtime` | 执行/插件批准响应负载助手 | | `plugin-sdk/command-auth-native` | 原生命令授权 + 原生会话目标助手 | | `plugin-sdk/command-detection` | 共享命令检测助手 | | `plugin-sdk/command-surface` | 命令主体规范化和命令界面助手 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/security-runtime` |
  共享信任、私信限制、外部内容和密钥收集助手 | | `plugin-sdk/ssrf-policy` | 主机允许列表和专用网络 SSRF 策略助手 | | `plugin-sdk/ssrf-runtime` | 固定调度器、SSRF 保护提取和 SSRF 策略助手 | | `plugin-sdk/secret-input` | 密钥输入解析助手 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标助手 | | `plugin-sdk/webhook-request-guards` | 请求主体大小/超时助手 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Broad runtime/logging/backup/plugin-install helpers | | `plugin-sdk/runtime-env` | Narrow runtime env, logger, timeout, retry, and backoff helpers | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Shared plugin command/hook/http/interactive helpers | | `plugin-sdk/hook-runtime` | Shared
  webhook/internal hook pipeline helpers | | `plugin-sdk/lazy-runtime` | Lazy runtime import/binding helpers such as `createLazyRuntimeModule`, `createLazyRuntimeMethod`, and `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec helpers | | `plugin-sdk/cli-runtime` | CLI formatting, wait, and version helpers | | `plugin-sdk/gateway-runtime` | Gateway(网关) client and
  渠道-status patch helpers | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/telegram-command-config` | Telegram command-name/description normalization and duplicate/conflict checks, even when the bundled Telegram contract surface is unavailable | | `plugin-sdk/approval-runtime` | Exec/plugin approval helpers, approval-capability builders, auth/profile helpers, native
  routing/runtime helpers | | `plugin-sdk/reply-runtime` | Shared inbound/reply runtime helpers, chunking, dispatch, heartbeat, reply planner | | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch/finalize helpers | | `plugin-sdk/reply-history` | Shared short-window reply-history helpers such as `buildHistoryContext`, `recordPendingHistoryEntry`, and `clearHistoryEntriesIfEnabled` | |
  `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Narrow text/markdown chunking helpers | | `plugin-sdk/session-store-runtime` | Session store path + updated-at helpers | | `plugin-sdk/state-paths` | State/OAuth dir path helpers | | `plugin-sdk/routing` | Route/会话-key/account binding helpers such as `resolveAgentRoute`, `buildAgentSessionKey`, and
  `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Shared 渠道/account status summary helpers, runtime-state defaults, and issue metadata helpers | | `plugin-sdk/target-resolver-runtime` | Shared target resolver helpers | | `plugin-sdk/string-normalization-runtime` | Slug/string normalization helpers | | `plugin-sdk/request-url` | Extract string URLs from fetch/request-like
  inputs | | `plugin-sdk/run-command` | Timed command runner with normalized stdout/stderr results | | `plugin-sdk/param-readers` | Common 工具/CLI param readers | | `plugin-sdk/tool-send` | Extract canonical send target fields from 工具 args | | `plugin-sdk/temp-path` | Shared temp-download path helpers | | `plugin-sdk/logging-core` | Subsystem logger and redaction helpers | |
  `plugin-sdk/markdown-table-runtime` | Markdown table mode helpers | | `plugin-sdk/json-store` | Small JSON state read/write helpers | | `plugin-sdk/file-lock` | Re-entrant file-lock helpers | | `plugin-sdk/persistent-dedupe` | Disk-backed dedupe cache helpers | | `plugin-sdk/acp-runtime` | ACP runtime/会话 and reply-dispatch helpers | | `plugin-sdk/agent-config-primitives` | Narrow agent runtime
  config-schema primitives | | `plugin-sdk/boolean-param` | Loose boolean param reader | | `plugin-sdk/dangerous-name-runtime` | Dangerous-name matching resolution helpers | | `plugin-sdk/device-bootstrap` | Device bootstrap and pairing token helpers | | `plugin-sdk/extension-shared` | Shared passive-渠道 and status helper primitives | | `plugin-sdk/models-provider-runtime` | `/models`
  command/提供商 reply helpers | | `plugin-sdk/skill-commands-runtime` | Skill command listing helpers | | `plugin-sdk/native-command-registry` | Native command registry/build/serialize helpers | | `plugin-sdk/provider-zai-endpoint` | Z.AI endpoint detection helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | | `plugin-sdk/collection-runtime` | Small bounded cache helpers | |
  `plugin-sdk/diagnostic-runtime` | Diagnostic flag and event helpers | | `plugin-sdk/error-runtime` | Error graph, formatting, shared error classification helpers, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Wrapped fetch, proxy, and pinned lookup helpers | | `plugin-sdk/host-runtime` | Hostname and SCP host normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and
  retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="功能和测试子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒体获取/转换/存储助手以及媒体负载构建器 | | `plugin-sdk/media-understanding` | 媒体理解提供商类型以及面向提供商的图像/音频助手导出 | | `plugin-sdk/text-runtime` | 共享的文本/markdown/日志助手，例如助手可见文本剥离、markdown 渲染/分块/表格助手、编辑助手、指令标签助手以及安全文本实用程序 | | `plugin-sdk/text-chunking` |
  出站文本分块助手 | | `plugin-sdk/speech` | 语音提供商类型以及面向提供商的指令、注册和验证助手 | | `plugin-sdk/speech-core` | 共享的语音提供商类型、注册、指令和标准化助手 | | `plugin-sdk/realtime-transcription` | 实时转录提供商类型和注册助手 | | `plugin-sdk/realtime-voice` | 实时语音提供商类型和注册助手 | | `plugin-sdk/image-generation` | 图像生成提供商类型 | | `plugin-sdk/image-generation-core`
  | 共享的图像生成类型、故障转移、身份验证和注册助手 | | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` | 共享的音乐生成类型、故障转移助手、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享的视频生成类型、故障转移助手、提供商查找和模型引用解析 | |
  `plugin-sdk/webhook-targets` | Webhook 目标注册和路由安装助手 | | `plugin-sdk/webhook-path` | Webhook 路径标准化助手 | | `plugin-sdk/web-media` | 共享的远程/本地媒体加载助手 | | `plugin-sdk/zod` | 为插件 SDK 使用者重新导出的 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`，`shouldAckReaction` |
</Accordion>

<Accordion title="Memory 子路径">
  | Subpath | 主要导出 | | --- | --- | | `plugin-sdk/memory-core` | 管理器/配置/文件/CLI 助手的捆绑 memory-core 辅助界面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主机嵌入引擎导出 | | `plugin-sdk/memory-core-host-engine-qmd` |
  Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机密钥助手 | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | |
  `plugin-sdk/memory-core-host-runtime-cli` | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-lancedb` | 捆绑的 memory-lancedb 辅助界面 |
</Accordion>

  <Accordion title="保留的捆绑辅助子路径">
    | 系列 | 当前子路径 | 预期用途 |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆绑的浏览器插件支持辅助程序（`browser-support` 仍然是兼容性桶） |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆绑的 Matrix 辅助/运行时表面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆绑的 LINE 辅助/运行时表面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆绑的 IRC 辅助表面 |
    | 渠道特定的辅助程序 | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 捆绑的渠道兼容/辅助接口 |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆绑的功能/插件辅助接口；`plugin-sdk/github-copilot-token` 当前导出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 注册 API

`register(api)` 回调接收一个包含以下方法的 `OpenClawPluginApi` 对象：

### 能力注册

| 方法                                             | 注册内容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文本推理 (LLM)        |
| `api.registerChannel(...)`                       | 消息渠道              |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录          |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话      |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析    |
| `api.registerImageGenerationProvider(...)`       | 图像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成              |
| `api.registerVideoGenerationProvider(...)`       | 视频生成              |
| `api.registerWebFetchProvider(...)`              | Web 获取 / 抓取提供商 |
| `api.registerWebSearchProvider(...)`             | Web 搜索              |

### 工具和命令

| 方法                            | 注册内容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                  |

### 基础设施

| 方法                                           | 注册内容                |
| ---------------------------------------------- | ----------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                |
| `api.registerHttpRoute(params)`                | Gateway(网关) HTTP 端点 |
| `api.registerGatewayMethod(name, handler)`     | Gateway(网关) RPC 方法  |
| `api.registerCli(registrar, opts?)`            | CLI 子命令              |
| `api.registerService(service)`                 | 后台服务                |
| `api.registerInteractiveHandler(registration)` | 交互式处理器            |

保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始终保持 `operator.admin`，即使插件尝试分配
更窄的网关方法作用域。对于
插件拥有的方法，建议使用插件特定的前缀。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两类顶级元数据：

- `commands`：由注册者拥有的显式命令根目录
- `descriptors`：用于根 CLI 帮助、
  路由和延迟插件 CLI 注册的解析时命令描述符

如果您希望插件命令在常规根 CLI 路径中保持延迟加载，请提供 `descriptors`，涵盖该注册器暴露的每个顶级命令根。

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅当您不需要延迟根 CLI 注册时，才单独使用 `commands`。该急切兼容性路径仍受支持，但它不会安装基于描述符的占位符以用于解析时延迟加载。

### 独占插槽

| 方法                                       | 注册内容                   |
| ------------------------------------------ | -------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个） |
| `api.registerMemoryPromptSection(builder)` | Memory 提示部分构建器      |
| `api.registerMemoryFlushPlan(resolver)`    | Memory 刷新计划解析器      |
| `api.registerMemoryRuntime(runtime)`       | Memory 运行时适配器        |

### Memory 嵌入适配器

| 方法                                           | 注册内容                         |
| ---------------------------------------------- | -------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 用于活动插件的 Memory 嵌入适配器 |

- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是 Memory 插件专用的。
- `registerMemoryEmbeddingProvider` 允许活动的 Memory 插件注册一个
  或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义
  插件定义的 ID）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）将针对这些已注册
  的适配器 ID 进行解析。

### 事件和生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子 |
| `api.onConversationBindingResolved(handler)` | 对话绑定回调       |

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 是终止性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终止性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_install`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 即终止。一旦任何处理程序声明了分发，较低优先级的处理程序和默认模型分发路径将被跳过。
- `message_sending`：返回 `{ cancel: true }` 即终止。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为未做决定（与省略 `cancel` 相同），而非覆盖。

### API 对象字段

| 字段                     | 类型                      | 描述                                                              |
| ------------------------ | ------------------------- | ----------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                           |
| `api.name`               | `string`                  | 显示名称                                                          |
| `api.version`            | `string?`                 | 插件版本（可选）                                                  |
| `api.description`        | `string?`                 | 插件描述（可选）                                                  |
| `api.source`             | `string`                  | 插件源路径                                                        |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活跃的内存中运行时快照）                    |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                 |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助工具](/en/plugins/sdk-runtime)                         |
| `api.logger`             | `PluginLogger`            | 作用域记录器（`debug`、`info`、`warn`、`error`）                  |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是轻量级的完全入口启动/设置前窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                        |

## 内部模块约定

在您的插件内部，请使用本地桶文件（barrel files）进行内部导入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入您自己的插件。请通过 `./api.ts` 或
  `./runtime-api.ts` 路由内部导入。SDK 路径仅作为外部契约。
</Warning>

Facade 加载的打包插件公共表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和类似的公共入口文件）现在在 OpenClaw 已运行时优先使用活动运行时配置快照。如果运行时快照尚不存在，它们将回退到磁盘上已解析的配置文件。

当辅助函数有意特定于提供商且尚不属于通用 SDK 子路径时，提供商插件也可以公开狭窄的插件本地契约桶。当前的打包示例：Anthropic 提供商将其 Claude
流辅助函数保留在其自己的公共 `api.ts` / `contract-api.ts` 接缝中，而不是将 Anthropic beta 标头和 `service_tier` 逻辑提升到通用
`plugin-sdk/*` 契约中。

其他当前的打包示例：

- `@openclaw/openai-provider`：`api.ts` 导出提供商构建器、
  默认模型辅助函数和实时提供商构建器
- `@openclaw/openrouter-provider`：`api.ts` 导出提供商构建器以及
  新手引导/配置辅助函数

<Warning>
  扩展生产代码也应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果辅助函数确实被共享，请将其提升到中立的 SDK 子路径，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向功能的表面，而不是将两个插件耦合在一起。
</Warning>

## 相关内容

- [入口点](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 选项
- [运行时辅助函数](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空间参考
- [设置和配置](/en/plugins/sdk-setup) — 打包、清单、配置架构
- [测试](/en/plugins/sdk-testing) — 测试实用程序和 Lint 规则
- [SDK 迁移](/en/plugins/sdk-migration) — 从已弃用的表面进行迁移
- [插件内部](/en/plugins/architecture) — 深度架构和能力模型
