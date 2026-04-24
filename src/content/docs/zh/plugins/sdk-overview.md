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

<Tip>**正在寻找操作指南？** - 第一个插件？从 [入门指南](/zh/plugins/building-plugins) 开始 - 频道插件？请参阅 [频道插件](/zh/plugins/sdk-channel-plugins) - 提供商插件？请参阅 [提供商插件](/zh/plugins/sdk-provider-plugins)</Tip>

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
    | 子路径 | 关键导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 架构导出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导助手、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作闸助手、默认账户回退助手 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 ID 标准化助手 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退助手 |
    | `plugin-sdk/account-helpers` | 狭义账户列表/账户操作助手 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 渠道配置架构类型 |
    | `plugin-sdk/telegram-command-config` | Telegram 自定义命令标准化/验证助手，附带捆绑合约回退 |
    | `plugin-sdk/command-gating` | 狭义命令授权闸助手 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`、草稿流生命周期/完成助手 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器助手 |
    | `plugin-sdk/inbound-reply-dispatch` | 共享入站记录和分发助手 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载助手 |
    | `plugin-sdk/outbound-runtime` | 出站身份、发送委托和负载规划助手 |
    | `plugin-sdk/poll-runtime` | 狭义投票标准化助手 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器助手 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和配置绑定助手 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照助手 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析助手 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要助手 |
    | `plugin-sdk/channel-config-primitives` | 狭义渠道配置架构基元 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权助手 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取助手 |
    | `plugin-sdk/group-access` | 共享群组访问决策助手 |
    | `plugin-sdk/direct-dm` | 共享直接私信验证/保护助手 |
    | `plugin-sdk/interactive-runtime` | 语义化消息展示、传递和旧版交互回复助手。参见 [消息展示](/zh/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 入站防抖、提及匹配、提及策略助手和信封助手的兼容性桶 |
    | `plugin-sdk/channel-mention-gating` | 狭义提及策略助手，不包含更广泛的入站运行时接口 |
    | `plugin-sdk/channel-location` | 渠道位置上下文和格式化助手 |
    | `plugin-sdk/channel-logging` | 用于入站丢弃和输入/确认失败的渠道记录助手 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 渠道消息操作助手，加上为插件兼容性保留的已弃用原生架构助手 |
    | `plugin-sdk/channel-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/channel-contract` | 渠道合约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连线 |
    | `plugin-sdk/channel-secret-runtime` | 狭义秘密合约助手，例如 `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` 和秘密目标类型 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置助手 | | `plugin-sdk/self-hosted-provider-setup` | 专注于 OpenAI 兼容的自托管提供商设置助手 | | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析助手
  | | `plugin-sdk/provider-auth-api-key` | API 密钥新手引导/配置文件写入助手，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 标准 OAuth 认证结果构建器 | | `plugin-sdk/provider-auth-login` | 用于提供商插件的共享交互式登录助手 | | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找助手 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`,
  `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, 共享的重放策略构建器、提供商端点助手以及模型 ID 标准化助手，例如 `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用提供商 HTTP/端点能力助手，包括音频转录多部分表单助手 | | `plugin-sdk/provider-web-fetch-contract` | 狭义的 Web 获取配置/选择契约助手，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web
  获取提供商注册/缓存助手 | | `plugin-sdk/provider-web-search-config-contract` | 用于不需要插件启用布线的提供商的狭义 Web 搜索配置/凭据助手 | | `plugin-sdk/provider-web-search-contract` | 狭义的 Web 搜索配置/凭据契约助手，例如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, 以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` |
  Web 搜索提供商注册/缓存/运行时助手 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini 架构清理 + 诊断，以及 xAI 兼容助手，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及类似内容 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`,
  `composeProviderStreamWrappers`, 流包装器类型，以及共享的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器助手 | | `plugin-sdk/provider-transport-runtime` | 原生提供商传输助手，例如受保护的获取、传输消息转换和可写传输事件流 | | `plugin-sdk/provider-onboard` | 新手引导配置补丁助手 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存助手 |
</Accordion>

<Accordion title="身份验证与安全子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册助手，发送者授权助手 | | `plugin-sdk/command-status` | 命令/帮助消息构建器，如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 审批者解析和同聊操作授权助手 | | `plugin-sdk/approval-client-runtime` | 原生执行审批配置文件/过滤器助手 | |
  `plugin-sdk/approval-delivery-runtime` | 原生审批能力/交付适配器 | | `plugin-sdk/approval-gateway-runtime` | 共享审批网关解析助手 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热渠道入口点的轻量级原生审批适配器加载助手 | | `plugin-sdk/approval-handler-runtime` | 更广泛的审批处理程序运行时助手；在足够的情况下，优先使用较窄的适配器/网关接口 | | `plugin-sdk/approval-native-runtime` |
  原生审批目标 + 账户绑定助手 | | `plugin-sdk/approval-reply-runtime` | 执行/插件审批回复负载助手 | | `plugin-sdk/command-auth-native` | 原生命令授权 + 原生会话目标助手 | | `plugin-sdk/command-detection` | 共享命令检测助手 | | `plugin-sdk/command-surface` | 命令主体规范化和命令界面助手 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` |
  用于渠道/插件秘密界面的窄范围秘密契约收集助手 | | `plugin-sdk/secret-ref-runtime` | 用于秘密契约/配置解析的窄范围 `coerceSecretRef` 和 SecretRef 类型助手 | | `plugin-sdk/security-runtime` | 共享信任、私信 (私信) 限制、外部内容和秘密收集助手 | | `plugin-sdk/ssrf-policy` | 主机白名单和专用网络 SSRF 策略助手 | | `plugin-sdk/ssrf-dispatcher` | 窄范围固定调度助手，不包含广泛的基础设施运行时界面 | |
  `plugin-sdk/ssrf-runtime` | 固定调度、SSRF 防护获取和 SSRF 策略助手 | | `plugin-sdk/secret-input` | 秘密输入解析助手 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标助手 | | `plugin-sdk/webhook-request-guards` | 请求主体大小/超时助手 |
</Accordion>

<Accordion title="运行时和存储子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/插件安装辅助工具 | | `plugin-sdk/runtime-env` | 窄范围运行时环境、日志记录器、超时、重试和退避辅助工具 | | `plugin-sdk/channel-runtime-context` | 通用渠道运行时上下文注册和查找辅助工具 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享插件命令/钩子/http/交互辅助工具
  | | `plugin-sdk/hook-runtime` | 共享 webhook/内部钩子管道辅助工具 | | `plugin-sdk/lazy-runtime` | 延迟运行时导入/绑定辅助工具，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程执行辅助工具 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待和版本辅助工具 | | `plugin-sdk/gateway-runtime` | Gateway(网关)
  客户端和渠道状态修补辅助工具 | | `plugin-sdk/config-runtime` | 配置加载/写入辅助工具和插件配置查找辅助工具 | | `plugin-sdk/telegram-command-config` | Telegram 命令名称/描述规范化以及重复/冲突检查，即使捆绑的 Telegram 协议表面不可用 | | `plugin-sdk/text-autolink-runtime` | 文件引用自动链接检测，不依赖广泛的文本运行时桶 | | `plugin-sdk/approval-runtime` |
  执行/插件批准辅助工具、批准能力构建器、身份验证/配置文件辅助工具、本地路由/运行时辅助工具 | | `plugin-sdk/reply-runtime` | 共享入站/回复运行时辅助工具、分块、分发、心跳、回复规划器 | | `plugin-sdk/reply-dispatch-runtime` | 窄范围回复分发/完成辅助工具 | | `plugin-sdk/reply-history` | 共享短窗口回复历史辅助工具，例如 `buildHistoryContext`、`recordPendingHistoryEntry` 和
  `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 窄范围文本/markdown 分块辅助工具 | | `plugin-sdk/session-store-runtime` | 会话存储路径 + 更新时间辅助工具 | | `plugin-sdk/state-paths` | 状态/OAuth 目录路径辅助工具 | | `plugin-sdk/routing` | 路由/会话密钥/帐户绑定辅助工具，例如
  `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共享渠道/帐户状态摘要辅助工具、运行时状态默认值和问题元数据辅助工具 | | `plugin-sdk/target-resolver-runtime` | 共享目标解析器辅助工具 | | `plugin-sdk/string-normalization-runtime` | Slug/字符串规范化辅助工具 | | `plugin-sdk/request-url` | 从 fetch/request-like 输入中提取字符串 URL
  | | `plugin-sdk/run-command` | 带有规范化 stdout/stderr 结果的定时命令运行器 | | `plugin-sdk/param-readers` | 通用工具/CLI 参数读取器 | | `plugin-sdk/tool-payload` | 从工具结果对象中提取规范化负载 | | `plugin-sdk/tool-send` | 从工具参数中提取规范发送目标字段 | | `plugin-sdk/temp-path` | 共享临时下载路径辅助工具 | | `plugin-sdk/logging-core` | 子系统日志记录器和编辑辅助工具 | |
  `plugin-sdk/markdown-table-runtime` | Markdown 表格模式辅助工具 | | `plugin-sdk/json-store` | 小型 JSON 状态读/写辅助工具 | | `plugin-sdk/file-lock` | 可重入文件锁定辅助工具 | | `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存辅助工具 | | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复分发辅助工具 | | `plugin-sdk/acp-binding-resolve-runtime` | 只读 ACP 绑定解析，无需生命周期启动导入 | |
  `plugin-sdk/agent-config-primitives` | 窄范围代理运行时配置架构基元 | | `plugin-sdk/boolean-param` | 宽松布尔参数读取器 | | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助工具 | | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌辅助工具 | | `plugin-sdk/extension-shared` | 共享被动渠道、状态和环境代理辅助工具基元 | | `plugin-sdk/models-provider-runtime` | `/models`
  命令/提供商回复辅助工具 | | `plugin-sdk/skill-commands-runtime` | 技能命令列表辅助工具 | | `plugin-sdk/native-command-registry` | 本地命令注册表/构建/序列化辅助工具 | | `plugin-sdk/agent-harness` | 用于低级代理工具的实验性受信任插件表面：工具类型、主动运行转向/中止辅助工具、OpenClaw 工具桥辅助工具以及尝试结果实用程序 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端点检测辅助工具 | |
  `plugin-sdk/infra-runtime` | 系统事件/心跳辅助工具 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 | | `plugin-sdk/diagnostic-runtime` | 诊断标志和事件辅助工具 | | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助工具、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包装的 fetch、代理和固定查找辅助工具 | | `plugin-sdk/runtime-fetch` |
  分发器感知的运行时获取，无需代理/受保护获取导入 | | `plugin-sdk/response-limit-runtime` | 有界响应正文读取器，无需广泛的媒体运行时表面 | | `plugin-sdk/session-binding-runtime` | 当前对话绑定状态，无需配置的绑定路由或配对存储 | | `plugin-sdk/session-store-runtime` | 会话存储读取辅助工具，无需广泛的配置写入/维护导入 | | `plugin-sdk/context-visibility-runtime` |
  上下文可见性解析和补充上下文过滤，无需广泛的配置/安全导入 | | `plugin-sdk/string-coerce-runtime` | 窄范围基元记录/字符串强制转换和规范化辅助工具，无需 markdown/logging 导入 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化辅助工具 | | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助工具 | | `plugin-sdk/agent-runtime` | 代理目录/身份/工作区辅助工具 | | `plugin-sdk/directory-runtime` |
  配置支持的目录查询/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共享媒体获取/转换/存储辅助工具以及媒体负载构建器 | | `plugin-sdk/media-generation-runtime` | 共享媒体生成故障转移辅助工具、候选选择以及缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解提供商类型以及面向提供商的图像/音频辅助导出 | | `plugin-sdk/text-runtime` |
  共享文本/markdown/日志记录辅助工具，例如助手可见文本剥离、markdown 渲染/分块/表格辅助工具、编辑辅助工具、指令标签辅助工具和安全文本实用程序 | | `plugin-sdk/text-chunking` | 出站文本分块辅助工具 | | `plugin-sdk/speech` | 语音提供商类型以及面向提供商的指令、注册表和验证辅助工具 | | `plugin-sdk/speech-core` | 共享语音提供商类型、注册表、指令和规范化辅助工具 | | `plugin-sdk/realtime-transcription` |
  实时转录提供商类型、注册表辅助工具和共享 WebSocket 会话辅助工具 | | `plugin-sdk/realtime-voice` | 实时语音提供商类型和注册表辅助工具 | | `plugin-sdk/image-generation` | 图像生成提供商类型 | | `plugin-sdk/image-generation-core` | 共享图像生成类型、故障转移、身份验证和注册表辅助工具 | | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` |
  共享音乐生成类型、故障转移辅助工具、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享视频生成类型、故障转移辅助工具、提供商查找和模型引用解析 | | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装辅助工具 | | `plugin-sdk/webhook-path` | Webhook 路径规范化辅助工具 | | `plugin-sdk/web-media` |
  共享远程/本地媒体加载辅助工具 | | `plugin-sdk/zod` | 为插件 SDK 使用者重新导出的 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`，`shouldAckReaction` |
</Accordion>

<Accordion title="Memory 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/memory-core` | 捆绑的 memory-core 辅助接口，用于 manager/config/file/CLI 辅助程序 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory host 基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host
  嵌入合约、注册表访问、本地提供商以及通用批处理/远程辅助程序 | | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory host 存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory host 多模态辅助程序 | | `plugin-sdk/memory-core-host-query` | Memory host 查询辅助程序 | | `plugin-sdk/memory-core-host-secret` | Memory
  host 机密辅助程序 | | `plugin-sdk/memory-core-host-events` | Memory host 事件日志辅助程序 | | `plugin-sdk/memory-core-host-status` | Memory host 状态辅助程序 | | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI 运行时辅助程序 | | `plugin-sdk/memory-core-host-runtime-core` | Memory host 核心运行时辅助程序 | | `plugin-sdk/memory-core-host-runtime-files` | Memory host 文件/运行时辅助程序
  | | `plugin-sdk/memory-host-core` | Memory host 核心运行时辅助程序的中立供应商别名 | | `plugin-sdk/memory-host-events` | Memory host 事件日志辅助程序的中立供应商别名 | | `plugin-sdk/memory-host-files` | Memory host 文件/运行时辅助程序的中立供应商别名 | | `plugin-sdk/memory-host-markdown` | 用于 Memory 相邻插件的共享托管 markdown 辅助程序 | | `plugin-sdk/memory-host-search` | 用于 search-manager
  访问的活动 Memory 运行时外观 | | `plugin-sdk/memory-host-status` | Memory host 状态辅助程序的中立供应商别名 | | `plugin-sdk/memory-lancedb` | 捆绑的 memory-lancedb 辅助接口 |
</Accordion>

  <Accordion title="保留的捆绑辅助子路径">
    | 系列 | 当前子路径 | 预期用途 |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆绑的浏览器插件支持辅助程序 (`browser-support` 仍然保留为兼容性通配桶) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆绑的 Matrix 辅助程序/运行时表层 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆绑的 LINE 辅助程序/运行时表层 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆绑的 IRC 辅助程序表层 |
    | 渠道特定辅助程序 | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 捆绑的渠道兼容性/辅助程序接缝 |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆绑的功能/插件辅助程序接缝；`plugin-sdk/github-copilot-token` 目前导出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 注册 API

`register(api)` 回调接收一个包含这些方法的 `OpenClawPluginApi` 对象：

### 能力注册

| 方法                                             | 注册内容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文本推理 (LLM)        |
| `api.registerAgentHarness(...)`                  | 实验性底层代理执行器  |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端     |
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

| 方法                                            | 注册内容                  |
| ----------------------------------------------- | ------------------------- |
| `api.registerHook(events, handler, opts?)`      | 事件钩子                  |
| `api.registerHttpRoute(params)`                 | Gateway(网关) HTTP 端点   |
| `api.registerGatewayMethod(name, handler)`      | Gateway(网关) RPC 方法    |
| `api.registerCli(registrar, opts?)`             | CLI 子命令                |
| `api.registerService(service)`                  | 后台服务                  |
| `api.registerInteractiveHandler(registration)`  | 交互式处理程序            |
| `api.registerEmbeddedExtensionFactory(factory)` | Pi 嵌入式运行器扩展工厂   |
| `api.registerMemoryPromptSupplement(builder)`   | 附加的内存邻近提示部分    |
| `api.registerMemoryCorpusSupplement(adapter)`   | 附加的内存搜索/读取语料库 |

保留的核心管理员命名空间 (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) 始终保持 `operator.admin` 状态，即使插件尝试分配
更窄的网关方法范围。对于插件拥有的方法，建议使用特定于插件的前缀。

当插件在 OpenClaw 嵌入运行期间需要 Pi 原生事件计时（例如在发出最终 OpenClaw 结果消息之前必须发生的异步 `tool_result` 重写）时，请使用 `api.registerEmbeddedExtensionFactory(...)`。这是一个捆绑插件接口：目前只有捆绑插件可以注册一个，并且它们必须在 `openclaw.plugin.json` 中声明 `contracts.embeddedExtensionFactories: ["pi"]`。对于不需要该底层接口的所有内容，请保留正常的 OpenClaw 插件钩子。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种顶级元数据：

- `commands`：由注册者拥有的显式命令根
- `descriptors`：用于根 CLI 帮助、路由和延迟插件 CLI 注册的解析时命令描述符

如果您希望插件命令在普通的根 CLI 路径中保持延迟加载，请提供 `descriptors`，覆盖该注册器暴露的每个顶层命令根。

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

仅当您不需要根 CLI 延迟注册时，才单独使用 `commands`。该急切兼容性路径仍受支持，但它不会安装用于解析时延迟加载的描述符支持的占位符。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（例如 `codex-cli`）的默认配置。

- 后端 `id` 成为模型引用（如 `codex-cli/gpt-5`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的结构。
- 用户配置仍然优先。OpenClaw 会在运行 CLI 之前将 `agents.defaults.cliBackends.<id>` 合并到插件默认值之上。
- 当后端在合并后需要兼容性重写（例如标准化旧的标志形状）时，请使用 `normalizeConfig`。

### 独占槽位

| 方法                                       | 注册内容                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个）。`assemble()` 回调接收 `availableTools` 和 `citationsMode`，以便引擎可以定制提示词添加内容。 |
| `api.registerMemoryCapability(capability)` | 统一记忆能力                                                                                                            |
| `api.registerMemoryPromptSection(builder)` | 记忆提示词部分构建器                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | 记忆清除计划解析器                                                                                                      |
| `api.registerMemoryRuntime(runtime)`       | 记忆运行时适配器                                                                                                        |

### 记忆嵌入适配器

| 方法                                           | 注册内容                 |
| ---------------------------------------------- | ------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 活动插件的内存嵌入适配器 |

- `registerMemoryCapability` 是首选的专用内存插件 API。
- `registerMemoryCapability` 可能还会公开 `publicArtifacts.listArtifacts(...)`
  以便配套插件可以通过 `openclaw/plugin-sdk/memory-host-core` 使用导出的内存构件，而无需深入
  特定内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是兼容旧版本的专用内存插件 API。
- `registerMemoryEmbeddingProvider` 允许活动内存插件注册一个
  或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义
  插件定义的 ID）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）会根据这些已注册的
  适配器 ID 进行解析。

### 事件和生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子 |
| `api.onConversationBindingResolved(handler)` | 对话绑定回调       |

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 即为终局。一旦任何处理程序设置了该值，优先级较低的处理程序将被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为未做决策（与省略 `block` 相同），而不视为覆盖。
- `before_install`：返回 `{ block: true }` 即为终局。一旦任何处理程序设置了该值，优先级较低的处理程序将被跳过。
- `before_install`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而非覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终局性的。一旦任何处理程序声明了分发，较低优先级的处理程序和默认模型分发路径将被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终局性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为未做决定（与省略 `cancel` 相同），而非覆盖。
- `message_received`: 当需要入站线程/主题路由时，请使用类型化的 `threadId` 字段。请保留 `metadata` 用于渠道特定的附加项。
- `message_sending`: 在回退到渠道特定的 `metadata` 之前，使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`: 使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 来表示网关拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。

### API 对象字段

| 字段                     | 类型                      | 描述                                                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                             |
| `api.name`               | `string`                  | 显示名称                                                            |
| `api.version`            | `string?`                 | 插件版本（可选）                                                    |
| `api.description`        | `string?`                 | 插件描述（可选）                                                    |
| `api.source`             | `string`                  | 插件源路径                                                          |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                  |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时的活动内存运行时快照）                          |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                   |
| `api.runtime`            | `PluginRuntime`           | [运行时助手](/zh/plugins/sdk-runtime)                               |
| `api.logger`             | `PluginLogger`            | 作用域日志记录器 (`debug`, `info`, `warn`, `error`)                 |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是完整入口启动/设置之前的轻量级窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                          |

## 内部模块约定

在您的插件中，使用本地桶文件（barrel files）进行内部导入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入您自己的插件。
  请通过 `./api.ts` 或
  `./runtime-api.ts` 路由内部导入。SDK 路径仅作为外部契约。
</Warning>

Facade 加载的捆绑插件公共表面（`api.ts`、`runtime-api.ts`、`index.ts`、`setup-entry.ts` 和类似的公共入口文件）现在在 OpenClaw 已经运行时优先使用活动的运行时配置快照。如果尚不存在运行时快照，它们将回退到磁盘上解析的配置文件。

提供商插件还可以暴露一个狭窄的插件本地约定桶，当某个辅助程序有意针对特定提供商且尚不属于通用 SDK 子路径时。当前的捆绑示例：Anthropic 提供商将其 Claude 流辅助程序保留在其自己的公共 `api.ts` / `contract-api.ts` 接缝中，而不是将 Anthropic beta-header 和 `service_tier` 逻辑提升到通用的 `plugin-sdk/*` 约定中。

其他当前的捆绑示例：

- `@openclaw/openai-provider`: `api.ts` 导出提供商构建器、
  default-模型 助手和实时提供商构建器
- `@openclaw/openrouter-provider`: `api.ts` 导出提供商构建器以及
  新手引导/config 助手

<Warning>
  扩展生产代码还应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果某个助手确实是共享的，请将其提升到中立的 SDK 子路径
  （例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或另一个
  面向功能的接口），而不是将两个插件耦合在一起。
</Warning>

## 相关

- [入口点](/zh/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 选项
- [运行时助手](/zh/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空间参考
- [Setup and Config](/zh/plugins/sdk-setup) —— 打包、清单、配置架构
- [Testing](/zh/plugins/sdk-testing) —— 测试工具和 Lint 规则
- [SDK Migration](/zh/plugins/sdk-migration) —— 从已弃用的接口迁移
- [Plugin Internals](/zh/plugins/architecture) —— 深度架构和功能模型
