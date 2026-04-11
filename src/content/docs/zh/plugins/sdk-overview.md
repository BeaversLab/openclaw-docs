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

<Tip>**正在寻找操作指南？** - 第一个插件？从 [入门指南](/en/plugins/building-plugins) 开始 - 频道插件？请参阅 [频道插件](/en/plugins/sdk-channel-plugins) - 提供者插件？请参阅 [提供者插件](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导助手、白名单提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门控助手，默认账户回退助手 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`，账户 ID 规范化助手 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退助手 |
    | `plugin-sdk/account-helpers` | 精简账户列表/账户操作助手 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 渠道配置模式类型 |
    | `plugin-sdk/telegram-command-config` | Telegram 自定义命令规范化/验证助手，附带捆绑契约回退 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器助手 |
    | `plugin-sdk/inbound-reply-dispatch` | 共享入站记录和分发助手 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载助手 |
    | `plugin-sdk/outbound-runtime` | 出站身份/发送委托助手 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器助手 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和已配置绑定助手 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照助手 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析助手 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要助手 |
    | `plugin-sdk/channel-config-primitives` | 精简渠道配置模式基元 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权助手 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 白名单配置编辑/读取助手 |
    | `plugin-sdk/group-access` | 共享组访问决策助手 |
    | `plugin-sdk/direct-dm` | 共享直接私信身份验证/守卫助手 |
    | `plugin-sdk/interactive-runtime` | 交互式回复负载规范化/缩减助手 |
    | `plugin-sdk/channel-inbound` | 入站防抖、提及匹配、提及策略助手和信封助手 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目标解析/匹配助手 |
    | `plugin-sdk/channel-contract` | 渠道契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连接 |
    | `plugin-sdk/channel-secret-runtime` | 精简秘密契约助手，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 以及秘密目标类型 |
  </Accordion>

<Accordion title="提供商子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置助手 | | `plugin-sdk/self-hosted-provider-setup` | 专注于 OpenAI 兼容的自托管提供商设置助手 | | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析助手 | |
  `plugin-sdk/provider-auth-api-key` | API 密钥新手引导/配置写入助手，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 标准 OAuth 认证结果构建器 | | `plugin-sdk/provider-auth-login` | 用于提供商插件的共享交互式登录助手 | | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找助手 | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重放策略构建器、提供商端点助手以及模型 ID 标准化助手（如 `normalizeNativeXaiModelId`） | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用提供商 HTTP/端点能力助手 | | `plugin-sdk/provider-web-fetch-contract` | 狭义的网络获取配置/选择合约助手，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` |
  网络获取提供商注册/缓存助手 | | `plugin-sdk/provider-web-search-contract` | 狭义的网络搜索配置/凭据合约助手，例如 `enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | 网络搜索提供商注册/缓存/运行时助手 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 模式清理 +
  诊断，以及 xAI 兼容助手（如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat`） | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及类似项 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型，以及共享的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器助手 | |
  `plugin-sdk/provider-onboard` | 新手引导配置修补助手 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存助手 |
</Accordion>

<Accordion title="身份与安全子路径">
  | 子路径 | 关键导出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、命令注册辅助函数、发送者授权辅助函数 | | `plugin-sdk/approval-auth-runtime` | 审批者解析和同聊天操作授权辅助函数 | | `plugin-sdk/approval-client-runtime` | 原生执行审批配置文件/过滤器辅助函数 | | `plugin-sdk/approval-delivery-runtime` | 原生审批能力/交付适配器 | | `plugin-sdk/approval-gateway-runtime`
  | 共享审批网关解析辅助函数 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热渠道入口点的轻量级原生审批适配器加载辅助函数 | | `plugin-sdk/approval-handler-runtime` | 更广泛的审批处理程序运行时辅助函数；如果足够，优先使用较窄的适配器/网关接口 | | `plugin-sdk/approval-native-runtime` | 原生审批目标 + 账户绑定辅助函数 | | `plugin-sdk/approval-reply-runtime` | 执行/插件审批回复负载辅助函数 |
  | `plugin-sdk/command-auth-native` | 原生命令授权 + 原生会话目标辅助函数 | | `plugin-sdk/command-detection` | 共享命令检测辅助函数 | | `plugin-sdk/command-surface` | 命令正文规范化和命令界面辅助函数 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用于渠道/插件密钥界面的窄密钥协定集合辅助函数 | | `plugin-sdk/secret-ref-runtime` |
  用于密钥协定/配置解析的窄 `coerceSecretRef` 和 SecretRef 类型辅助函数 | | `plugin-sdk/security-runtime` | 共享信任、私信 (私信) 限制、外部内容和密钥集合辅助函数 | | `plugin-sdk/ssrf-policy` | 主机允许列表和专用网络 SSRF 策略辅助函数 | | `plugin-sdk/ssrf-runtime` | 固定调度器、SSRF 防护获取和 SSRF 策略辅助函数 | | `plugin-sdk/secret-input` | 密钥输入解析辅助函数 | | `plugin-sdk/webhook-ingress` |
  Webhook 请求/目标辅助函数 | | `plugin-sdk/webhook-request-guards` | 请求正文大小/超时辅助函数 |
</Accordion>

<Accordion title="运行时和存储子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/runtime` | 通用的运行时/日志/备份/插件安装辅助函数 | | `plugin-sdk/runtime-env` | 狭义的运行时环境、日志、超时、重试和退避辅助函数 | | `plugin-sdk/channel-runtime-context` | 通用的渠道运行时上下文注册和查找辅助函数 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享的插件命令/钩子/HTTP/交互辅助函数 |
  | `plugin-sdk/hook-runtime` | 共享的 Webhook/内部钩子流水线辅助函数 | | `plugin-sdk/lazy-runtime` | 延迟运行时导入/绑定辅助函数，如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程执行辅助函数 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待和版本辅助函数 | | `plugin-sdk/gateway-runtime` | Gateway(网关)
  客户端和渠道状态补丁辅助函数 | | `plugin-sdk/config-runtime` | 配置加载/写入辅助函数 | | `plugin-sdk/telegram-command-config` | Telegram 命令名称/描述标准化以及重复/冲突检查辅助函数，即使捆绑的 Telegram 契约表面不可用 | | `plugin-sdk/approval-runtime` | Exec/插件审批辅助函数、审批能力构建器、认证/配置文件辅助函数、原生路由/运行时辅助函数 | | `plugin-sdk/reply-runtime` |
  共享的入站/回复运行时辅助函数、分块、调度、心跳、回复规划器 | | `plugin-sdk/reply-dispatch-runtime` | 狭义的回复调度/完成辅助函数 | | `plugin-sdk/reply-history` | 共享的短窗口回复历史记录辅助函数，如 `buildHistoryContext`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` |
  狭义的文本/Markdown 分块辅助函数 | | `plugin-sdk/session-store-runtime` | 会话存储路径 + 更新时间辅助函数 | | `plugin-sdk/state-paths` | 状态/OAuth 目录路径辅助函数 | | `plugin-sdk/routing` | 路由/会话密钥/账号绑定辅助函数，如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` |
  共享的渠道/账号状态摘要辅助函数、运行时状态默认值和问题元数据辅助函数 | | `plugin-sdk/target-resolver-runtime` | 共享的目标解析器辅助函数 | | `plugin-sdk/string-normalization-runtime` | Slug/字符串标准化辅助函数 | | `plugin-sdk/request-url` | 从类似 fetch/request 的输入中提取字符串 URL | | `plugin-sdk/run-command` | 带有标准化 stdout/stderr 结果的定时命令运行器 | | `plugin-sdk/param-readers` |
  通用的工具/CLI 参数读取器 | | `plugin-sdk/tool-send` | 从工具参数中提取规范化的发送目标字段 | | `plugin-sdk/temp-path` | 共享的临时下载路径辅助函数 | | `plugin-sdk/logging-core` | 子系统日志和编辑辅助函数 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式辅助函数 | | `plugin-sdk/json-store` | 小型 JSON 状态读/写辅助函数 | | `plugin-sdk/file-lock` | 可重入的文件锁定辅助函数 | |
  `plugin-sdk/persistent-dedupe` | 磁盘支持的去重缓存辅助函数 | | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复调度辅助函数 | | `plugin-sdk/agent-config-primitives` | 狭义的代理运行时配置架构原语 | | `plugin-sdk/boolean-param` | 宽松的布尔参数读取器 | | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助函数 | | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌辅助函数 | |
  `plugin-sdk/extension-shared` | 共享的被动渠道、状态和环境代理辅助原语 | | `plugin-sdk/models-provider-runtime` | `/models` 命令/提供商回复辅助函数 | | `plugin-sdk/skill-commands-runtime` | 技能命令列表辅助函数 | | `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化辅助函数 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端点检测辅助函数 | | `plugin-sdk/infra-runtime` |
  系统事件/心跳辅助函数 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助函数 | | `plugin-sdk/diagnostic-runtime` | 诊断标志和事件辅助函数 | | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助函数，`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 封装的 fetch、代理和固定查找辅助函数 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机标准化辅助函数 | |
  `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助函数 | | `plugin-sdk/agent-runtime` | 代理目录/标识/工作区辅助函数 | | `plugin-sdk/directory-runtime` | 配置支持的目录查询/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="功能和测试子路径">
  | 子路径 | 主要导出内容 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒体获取/转换/存储辅助工具以及媒体负载构建器 | | `plugin-sdk/media-generation-runtime` | 共享的媒体生成故障转移辅助工具、候选选择以及缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解提供商类型以及面向提供商的图像/音频辅助导出 | | `plugin-sdk/text-runtime` |
  共享的文本/markdown/日志辅助工具，例如助手可见文本剥离、markdown 渲染/分块/表格辅助工具、编辑辅助工具、指令标签辅助工具以及安全文本实用程序 | | `plugin-sdk/text-chunking` | 出站文本分块辅助工具 | | `plugin-sdk/speech` | 语音提供商类型以及面向提供商的指令、注册表和验证辅助工具 | | `plugin-sdk/speech-core` | 共享的语音提供商类型、注册表、指令和规范化辅助工具 | | `plugin-sdk/realtime-transcription`
  | 实时转录提供商类型和注册表辅助工具 | | `plugin-sdk/realtime-voice` | 实时语音提供商类型和注册表辅助工具 | | `plugin-sdk/image-generation` | 图像生成提供商类型 | | `plugin-sdk/image-generation-core` | 共享的图像生成类型、故障转移、身份验证和注册表辅助工具 | | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` |
  共享的音乐生成类型、故障转移辅助工具、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享的视频生成类型、故障转移辅助工具、提供商查找和模型引用解析 | | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装辅助工具 | | `plugin-sdk/webhook-path` | Webhook 路径规范化辅助工具 | | `plugin-sdk/web-media` |
  共享的远程/本地媒体加载辅助工具 | | `plugin-sdk/zod` | 为插件 SDK 使用者重新导出的 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`，`shouldAckReaction` |
</Accordion>

<Accordion title="Memory 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/memory-core` | 用于管理器/配置/文件/CLI 助手的捆绑 memory-core 助手界面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主机嵌入引擎导出 | | `plugin-sdk/memory-core-host-engine-qmd` |
  Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机密钥助手 | | `plugin-sdk/memory-core-host-events` | Memory 主机事件日志助手 | |
  `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | | `plugin-sdk/memory-core-host-runtime-cli` | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | Memory 主机核心运行时助手的供应商无关别名 | |
  `plugin-sdk/memory-host-events` | Memory 主机事件日志助手的供应商无关别名 | | `plugin-sdk/memory-host-files` | Memory 主机文件/运行时助手的供应商无关别名 | | `plugin-sdk/memory-host-markdown` | 用于 memory 相邻插件的共享托管 markdown 助手 | | `plugin-sdk/memory-host-search` | 用于搜索管理器访问的活动 memory 运行时外观 | | `plugin-sdk/memory-host-status` | Memory 主机状态助手的供应商无关别名 | |
  `plugin-sdk/memory-lancedb` | 捆绑的 memory-lancedb 助手界面 |
</Accordion>

  <Accordion title="保留的捆绑辅助子路径">
    | 系列 | 当前子路径 | 预期用途 |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆绑的浏览器插件支持辅助工具（`browser-support` 仍为兼容性入口） |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆绑的 Matrix 辅助工具/运行时表面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆绑的 LINE 辅助工具/运行时表面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆绑的 IRC 辅助工具表面 |
    | 渠道特定辅助工具 | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 捆绑的渠道兼容性/辅助工具接缝 |
    | Auth/插件特定辅助工具 | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆绑的功能/插件辅助工具接缝；`plugin-sdk/github-copilot-token` 目前导出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 注册 API

`register(api)` 回调接收一个包含这些方法的 `OpenClawPluginApi` 对象：

### 能力注册

| 方法                                             | 注册内容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文本推理 (LLM)        |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端     |
| `api.registerChannel(...)`                       | 消息渠道              |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录          |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话      |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析    |
| `api.registerImageGenerationProvider(...)`       | 图像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成              |
| `api.registerVideoGenerationProvider(...)`       | 视频生成              |
| `api.registerWebFetchProvider(...)`              | Web 抓取 / 爬取提供商 |
| `api.registerWebSearchProvider(...)`             | Web 搜索              |

### 工具和命令

| 方法                            | 注册内容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                  |

### 基础设施

| 方法                                           | 注册内容                  |
| ---------------------------------------------- | ------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                  |
| `api.registerHttpRoute(params)`                | Gateway(网关) HTTP 端点   |
| `api.registerGatewayMethod(name, handler)`     | Gateway(网关) RPC 方法    |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                |
| `api.registerService(service)`                 | 后台服务                  |
| `api.registerInteractiveHandler(registration)` | 交互式处理程序            |
| `api.registerMemoryPromptSupplement(builder)`  | 附加的内存相邻提示词部分  |
| `api.registerMemoryCorpusSupplement(adapter)`  | 附加的内存搜索/读取语料库 |

保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始终保持 `operator.admin`，即使插件尝试分配
更窄的网关方法作用域。对于插件拥有的方法，建议使用
特定于插件的前缀。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种顶级元数据：

- `commands`：注册者拥有的显式命令根
- `descriptors`：用于根 CLI 帮助、
  路由和延迟插件 CLI 注册的解析时命令描述符

如果您希望插件命令在正常的根 CLI 路径中保持延迟加载，请提供 `descriptors`，覆盖该注册器暴露的每个顶级命令根。

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

仅当您不需要延迟根 CLI 注册时，才单独使用 `commands`。该急切兼容路径仍受支持，但它不会安装用于解析时延迟加载的描述符支持的占位符。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（例如 `codex-cli`）的默认配置。

- 后端 `id` 成为模型引用（如 `codex-cli/gpt-5`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。在运行 CLI 之前，OpenClaw 会将 `agents.defaults.cliBackends.<id>` 合并到插件默认配置之上。
- 当后端在合并后需要兼容性重写（例如标准化旧标志形状）时，请使用 `normalizeConfig`。

### 互斥插槽

| 方法                                       | 注册内容                   |
| ------------------------------------------ | -------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个） |
| `api.registerMemoryCapability(capability)` | 统一内存能力               |
| `api.registerMemoryPromptSection(builder)` | 内存提示部分构建器         |
| `api.registerMemoryFlushPlan(resolver)`    | 内存刷新计划解析器         |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器           |

### 内存嵌入适配器

| 方法                                           | 注册内容                 |
| ---------------------------------------------- | ------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 活动插件的内存嵌入适配器 |

- `registerMemoryCapability` 是首选的互斥内存插件 API。
- `registerMemoryCapability` 也可以公开 `publicArtifacts.listArtifacts(...)`，以便配套插件可以通过 `openclaw/plugin-sdk/memory-host-core` 使用导出的内存工件，而不需要深入特定内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和 `registerMemoryRuntime` 是与旧版本兼容的互斥内存插件 API。
- `registerMemoryEmbeddingProvider` 允许活动的内存插件注册一个或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义插件定义的 ID）。
- 用户配置（例如 `agents.defaults.memorySearch.provider` 和 `agents.defaults.memorySearch.fallback`）将针对这些已注册的适配器 ID 进行解析。

### 事件和生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期挂钩 |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调       |

### 挂钩决策语义

- `before_tool_call`：返回 `{ block: true }` 是终结性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为无决策（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终结性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_install`：返回 `{ block: false }` 被视为无决策（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终结性的。一旦任何处理程序声明了调度，较低优先级的处理程序和默认模型调度路径将被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终结性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为无决策（与省略 `cancel` 相同），而不是覆盖。

### API 对象字段

| 字段                     | 类型                      | 描述                                                                      |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                                   |
| `api.name`               | `string`                  | 显示名称                                                                  |
| `api.version`            | `string?`                 | 插件版本（可选）                                                          |
| `api.description`        | `string?`                 | 插件描述（可选）                                                          |
| `api.source`             | `string`                  | 插件源路径                                                                |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                        |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活动的内存运行时快照）                              |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                         |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助工具](/en/plugins/sdk-runtime)                                 |
| `api.logger`             | `PluginLogger`            | 作用域日志记录器（`debug`、`info`、`warn`、`error`）                      |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是完整的入口启动/设置窗口之前的轻量级阶段 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                                |

## 内部模块约定

在插件内部，请使用本地桶文件（barrel files）进行内部导入：

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
  `./runtime-api.ts` 路由内部导入。SDK 路径仅用于外部契约。
</Warning>

Facade 加载的打包插件公共表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和类似的公共入口文件）现在在 OpenClaw 正在运行时优先使用活动的运行时配置快照。如果尚不存在运行时快照，则回退到磁盘上已解析的配置文件。

提供商插件还可以在某个辅助工具专门针对提供商且尚不属于通用 SDK 子路径时，暴露一个狭义的插件本地约定容器。当前打包的示例：Anthropic 提供商将其 Claude 流式辅助工具保留在其自己的公共 `api.ts` / `contract-api.ts` 接缝中，而不是将 Anthropic beta-header 和 `service_tier` 逻辑提升到通用的 `plugin-sdk/*` 约定中。

其他当前打包的示例：

- `@openclaw/openai-provider`：`api.ts` 导出提供商构建器、默认模型辅助工具和实时提供商构建器
- `@openclaw/openrouter-provider`：`api.ts` 导出提供商构建器以及新手引导/配置辅助工具

<Warning>
  扩展生产代码还应避免 `openclaw/plugin-sdk/<other-plugin>` 导入。如果辅助工具确实共享，请将其提升到中立的 SDK 子路径（例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他面向功能的表面），而不是将两个插件耦合在一起。
</Warning>

## 相关

- [入口点](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 选项
- [运行时辅助工具](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空间参考
- [设置和配置](/en/plugins/sdk-setup) — 打包、清单、配置模式
- [测试](/en/plugins/sdk-testing) — 测试工具和 Lint 规则
- [SDK 迁移](/en/plugins/sdk-migration) — 从已弃用的表面迁移
- [插件内部](/en/plugins/architecture) — 深度架构和功能模型
