---
summary: "Plugin SDK 子路径目录：各导入项位于何处，按区域分组"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路径"
---

插件 SDK 以 `openclaw/plugin-sdk/` 下的一组狭窄子路径的形式公开。本页面按用途分类列出了常用的子路径。生成的包含 200 多个子路径的完整列表位于 `scripts/lib/plugin-sdk-entrypoints.json`；保留的捆绑插件辅助子路径也会出现在那里，但除非文档页面明确推广它们，否则它们属于实现细节。维护者可以使用 `pnpm plugins:boundary-report:summary` 审核活动的保留辅助子路径；未使用的保留辅助导出将导致 CI 报告失败，而不是作为休眠的兼容性债务保留在公共 SDK 中。

有关插件创作指南，请参阅 [Plugin SDK overview](/zh/plugins/sdk-overview)。

## 插件入口

| 子路径                                    | 主要导出                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`                 | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`                         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`                | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`               | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/testing`                      | 用于遗留插件测试的广泛兼容性集合；对于新的扩展测试，首选专门的测试子路径                                                                                               |
| `plugin-sdk/plugin-test-api`              | 用于直接插件注册单元测试的最小化 `OpenClawPluginApi` 模拟构建器                                                                                                        |
| `plugin-sdk/agent-runtime-test-contracts` | 用于身份验证配置文件、发送抑制、回退分类、工具钩子、提示覆盖、架构和记录修复的本地代理运行时适配器契约固定装置                                                         |
| `plugin-sdk/channel-test-helpers`         | 渠道帐户生命周期、目录、发送配置、运行时模拟、钩子、捆绑渠道条目、信封时间戳、配对回复和通用渠道契约测试助手                                                           |
| `plugin-sdk/channel-target-testing`       | 共享渠道目标解析错误情况测试套件                                                                                                                                       |
| `plugin-sdk/plugin-test-contracts`        | 插件注册、包清单、公共工件、运行时 API、导入副作用和直接导入契约助手                                                                                                   |
| `plugin-sdk/plugin-test-runtime`          | 用于测试的插件运行时、注册表、提供商注册、设置向导和运行时任务流固定装置                                                                                               |
| `plugin-sdk/provider-test-contracts`      | 提供商运行时、身份验证、发现、入职、目录、媒体能力、重放策略、实时 STT 实时音频、网络搜索/获取以及向导契约助手                                                         |
| `plugin-sdk/provider-http-test-mocks`     | 用于执行 `plugin-sdk/provider-http` 的提供商测试的可选 Vitest HTTP/身份验证模拟                                                                                        |
| `plugin-sdk/test-env`                     | 测试环境、获取/网络、一次性 HTTP 服务器、传入请求、实时测试、临时文件系统和时间控制装置                                                                                |
| `plugin-sdk/test-fixtures`                | 通用 CLI、沙盒、技能、代理消息、系统事件、模块重载、捆绑插件路径、终端、分块、身份验证令牌和类型化案例测试装置                                                         |
| `plugin-sdk/test-node-mocks`              | 用于 Vitest `vi.mock("node:*")` 工厂内部的专用 Node 内置模拟助手                                                                                                       |
| `plugin-sdk/migration`                    | 迁移提供商项目助手，例如 `createMigrationItem`、原因常量、项目状态标记、编辑助手和 `summarizeMigrationItems`                                                           |
| `plugin-sdk/migration-runtime`            | 运行时迁移助手，例如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                                             |

<AccordionGroup>
  <Accordion title="渠道子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式导出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 用于插件自有模式的缓存 JSON Schema 验证辅助函数 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导辅助函数、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门控辅助函数、默认账户回退辅助函数 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 ID 规范化辅助函数 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退辅助函数 |
    | `plugin-sdk/account-helpers` | 狭义的账户列表/账户操作辅助函数 |
    | `plugin-sdk/access-groups` | 访问组允许列表解析和脱敏组诊断辅助函数 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 旧版回复管道辅助函数。新的渠道回复管道代码应使用 `plugin-sdk/channel-message` 中的 `createChannelMessageReplyPipeline` 和 `resolveChannelMessageSourceReplyDeliveryMode`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享渠道配置模式原语，以及 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 捆绑的 OpenClaw 渠道配置模式，仅适用于已维护的捆绑插件 |
    | `plugin-sdk/channel-config-schema-legacy` | 捆绑渠道配置模式的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config` | 带有捆绑契约回退的 Telegram 自定义命令规范化/验证辅助函数 |
    | `plugin-sdk/command-gating` | 狭义的命令授权门控辅助函数 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已弃用的低级渠道入口兼容性外观。新的接收路径应使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 用于已迁移渠道接收路径的实验性高级渠道入口运行时解析器和路由事实构建器。优先使用此方式，而不是在每个插件中组装有效允许列表、命令允许列表和旧版投影。请参阅 [渠道入口 API](/zh/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue` 和旧版草稿流生命周期辅助函数。新的预览最终确定代码应使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 廉价的消息生命周期契约辅助函数，例如 `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`、持久最终能力推导、用于发送/接收/副作用能力的 capability 证明辅助函数、`MessageReceiveContext`、接收确认策略证明、`defineFinalizableLivePreviewAdapter`, `deliverWithFinalizableLivePreviewAdapter`、实时预览和实时终结器 capability 证明、持久恢复状态、`RenderedMessageBatch`、消息接收类型和接收 ID 辅助函数。请参阅 [渠道消息 API](/zh/plugins/sdk-channel-message)。旧版回复分发外观仅为已弃用的兼容性功能。 |
    | `plugin-sdk/channel-message-runtime` | 可能会加载出站交付的运行时交付辅助函数，包括 `deliverInboundReplyWithMessageSendContext`, `sendDurableMessageBatch` 和 `withDurableMessageSendContext`。已弃用的回复分发桥接器仍然可以导入，但仅适用于兼容性分发器。请从监控/发送运行时模块使用，而不是热插件引导文件。 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器辅助函数 |
    | `plugin-sdk/inbound-reply-dispatch` | 旧版共享入站记录和分发辅助函数、可见/最终分发谓词，以及为准备好的渠道分发器提供的已弃用 `deliverDurableInboundReplyPayload` 兼容性。新的渠道接收/分发代码应从 `plugin-sdk/channel-message-runtime` 导入运行时生命周期辅助函数。 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配辅助函数 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载辅助函数 |
    | `plugin-sdk/outbound-send-deps` | 用于渠道适配器的轻量级出站发送依赖项查找 |
    | `plugin-sdk/outbound-runtime` | 出站身份、发送委托、会话、格式化和负载规划辅助函数。诸如 `deliverOutboundPayloads` 之类的直接交付辅助函数是已弃用的兼容性基底；新的发送路径应使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 狭义的投票规范化辅助函数 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器辅助函数 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和配置绑定辅助函数 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照辅助函数 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析辅助函数 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要辅助函数 |
    | `plugin-sdk/channel-config-primitives` | 狭义的渠道配置模式原语 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权辅助函数 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取辅助函数 |
    | `plugin-sdk/group-access` | 共享组访问决策辅助函数 |
    | `plugin-sdk/direct-dm` | 共享直接私信 (私信) 认证/保护辅助函数 |
    | `plugin-sdk/discord` | 用于已发布的 `@openclaw/discord@2026.3.13` 和跟踪的所有者兼容性的已弃用 Discord 兼容性外观；新插件应使用通用渠道 SDK 子路径 |
    | `plugin-sdk/telegram-account` | 用于跟踪的所有者兼容性的已弃用 Telegram 账户解析兼容性外观；新插件应使用注入的运行时辅助函数或通用渠道 SDK 子路径 |
    | `plugin-sdk/zalouser` | 用于仍然导入发送者命令授权的已发布 Lark/Zalo 包的已弃用 Zalo Personal 兼容性外观；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义化消息展示、传递和旧版交互式回复辅助函数。请参阅 [消息展示](/zh/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用于入站去抖动、提及匹配、提及策略辅助函数和信封辅助函数的兼容性桶 |
    | `plugin-sdk/channel-inbound-debounce` | 狭义的入站去抖动辅助函数 |
    | `plugin-sdk/channel-mention-gating` | 狭义的提及策略、提及标记和提及文本辅助函数，不包含更广泛的入站运行时表面 |
    | `plugin-sdk/channel-envelope` | 狭义的入站信封格式化辅助函数 |
    | `plugin-sdk/channel-location` | 渠道位置上下文和格式化辅助函数 |
    | `plugin-sdk/channel-logging` | 用于入站丢弃和输入/确认失败的渠道日志记录辅助函数 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 渠道消息操作辅助函数，以及为插件兼容性而保留的已弃用本机模式辅助函数 |
    | `plugin-sdk/channel-route` | 共享路由规范化、解析器驱动的目标解析、线程 ID 字符串化、去重/压缩路由键、已解析目标类型以及路由/目标比较辅助函数 |
    | `plugin-sdk/channel-targets` | 目标解析辅助函数；路由比较调用者应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 渠道契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连接 |
    | `plugin-sdk/channel-secret-runtime` | 狭义的秘密契约辅助函数，例如 `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` 和秘密目标类型 |
  </Accordion>

<Accordion title="Provider 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支持的 LM Studio 提供商 外观，用于设置、目录发现和运行时模型准备 | | `plugin-sdk/lmstudio-runtime` | 支持的 LM Studio 运行时外观，用于本地服务器默认值、模型发现、请求头和已加载模型辅助工具 | | `plugin-sdk/provider-setup` | 精选的本地/自托管 提供商 设置辅助工具 | |
  `plugin-sdk/self-hosted-provider-setup` | 专注于 OpenAI 兼容的自托管 提供商 设置辅助工具 | | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime` | 用于 提供商 插件的运行时 API 密钥解析辅助工具 | | `plugin-sdk/provider-auth-api-key` | API 密钥新手引导/配置文件写入辅助工具，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 标准 OAuth
  认证结果构建器 | | `plugin-sdk/provider-auth-login` | 用于 提供商 插件的共享交互式登录辅助工具 | | `plugin-sdk/provider-env-vars` | Provider 认证环境变量查找辅助工具 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials`, 已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | |
  `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, 共享重放策略构建器、提供商 端点辅助工具以及模型 ID 标准化辅助工具，例如 `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-runtime` | Provider 目录增强运行时挂钩和用于契约测试的插件-提供商 注册接缝 | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 提供商 HTTP/端点能力辅助工具、提供商 HTTP 错误和音频转录多部分表单辅助工具 | | `plugin-sdk/provider-web-fetch-contract` | 窄范围的 web-fetch 配置/选择契约辅助工具，例如 `enablePluginInConfig` 和
  `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch 提供商 注册/缓存辅助工具 | | `plugin-sdk/provider-web-search-config-contract` | 针对不需要插件启用连线的 提供商 的窄范围 web-search 配置/凭据辅助工具 | | `plugin-sdk/provider-web-search-contract` | 窄范围 web-search 配置/凭据契约辅助工具，例如 `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig`，以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | Web-search 提供商 注册/缓存/运行时辅助工具 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini 模式清理 + 诊断，以及 xAI 兼容性辅助工具，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` 及类似内容 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 流包装器类型，以及共享的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助工具 | | `plugin-sdk/provider-transport-runtime` | 原生 提供商 传输辅助工具，例如受保护的
  fetch、传输消息转换和可写传输事件流 | | `plugin-sdk/provider-onboard` | 新手引导配置补丁辅助工具 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存辅助工具 | | `plugin-sdk/group-activation` | 窄范围组激活模式和命令解析辅助工具 |
</Accordion>

<Accordion title="身份验证与安全子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册表辅助工具，包括动态参数菜单格式化、发送方授权辅助工具 | | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 批准者解析和同频道操作授权辅助工具 | | `plugin-sdk/approval-client-runtime` |
  原生执行批准配置文件/筛选器辅助工具 | | `plugin-sdk/approval-delivery-runtime` | 原生批准能力/交付适配器 | | `plugin-sdk/approval-gateway-runtime` | 共享批准网关解析辅助工具 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热频道路径的轻量级原生批准适配器加载辅助工具 | | `plugin-sdk/approval-handler-runtime` | 更广泛的批准处理程序运行时辅助工具；当足够时，首选更窄的适配器/网关接口 | |
  `plugin-sdk/approval-native-runtime` | 原生批准目标 + 账户绑定辅助工具 | | `plugin-sdk/approval-reply-runtime` | 执行/插件批准回复负载辅助工具 | | `plugin-sdk/approval-runtime` | 执行/插件批准负载辅助工具、原生批准路由/运行时辅助工具以及结构化批准显示辅助工具，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 窄入站回复去重重置辅助工具 | | `plugin-sdk/channel-contract-testing` |
  窄频道合约测试辅助工具，不包含广泛的测试桶 | | `plugin-sdk/command-auth-native` | 原生命令授权、动态参数菜单格式化和原生会话目标辅助工具 | | `plugin-sdk/command-detection` | 共享命令检测辅助工具 | | `plugin-sdk/command-primitives-runtime` | 用于热频道路径的轻量级命令文本谓词 | | `plugin-sdk/command-surface` | 命令主体规范化和命令表面辅助工具 | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用于频道/插件机密表面的窄机密合约集合辅助工具 | | `plugin-sdk/secret-ref-runtime` | 用于机密合约/配置解析的窄 `coerceSecretRef` 和 SecretRef 类型辅助工具 | | `plugin-sdk/security-runtime` | 共享信任、私信
  限制、根边界文件/路径辅助工具，包括仅创建写入、同步/异步原子文件替换、同级临时写入、跨设备移动回退、私有文件存储辅助工具、符号链接父级保护、外部内容、敏感文本编辑、恒定时间机密比较和机密集合辅助工具 | | `plugin-sdk/ssrf-policy` | 主机允许列表和专用网络 SSRF 策略辅助工具 | | `plugin-sdk/ssrf-dispatcher` | 窄固定调度程序辅助工具，不包含广泛的基础架构运行时表面 | | `plugin-sdk/ssrf-runtime` |
  固定调度程序、SSRF 保护获取、SSRF 错误和 SSRF 策略辅助工具 | | `plugin-sdk/secret-input` | 机密输入解析辅助工具 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标辅助工具和原始 websocket/主体强制转换 | | `plugin-sdk/webhook-request-guards` | 请求主体大小/超时辅助工具 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/插件安装辅助工具 | | `plugin-sdk/runtime-env` | 窄范围的运行时环境、日志记录器、超时、重试和退避辅助工具 | | `plugin-sdk/browser-config` | 支持的浏览器配置外观，用于标准化配置文件/默认值、CDP URL 解析和浏览器控制身份验证辅助工具 | | `plugin-sdk/channel-runtime-context` | 通用渠道运行时上下文注册和查找辅助工具
  | | `plugin-sdk/matrix`Matrix | 已弃用的 Matrix 兼容性外观，用于旧的第三方渠道包；新插件应直接导入 `plugin-sdk/run-command` | | `plugin-sdk/mattermost`Mattermost | 已弃用的 Mattermost 兼容性外观，用于旧的第三方渠道包；新插件应直接导入通用 SDK 子路径 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享插件命令/钩子/http/交互辅助工具 | |
  `plugin-sdk/hook-runtime` | 共享 webhook/内部钩子管道辅助工具 | | `plugin-sdk/lazy-runtime` | 懒加载运行时导入/绑定辅助工具，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程执行辅助工具 | | `plugin-sdk/cli-runtime`CLI | CLI 格式化、等待、版本、参数调用和懒加载命令组辅助工具 | |
  `plugin-sdk/gateway-runtime`Gateway(网关)CLIRPC | Gateway(网关) 客户端、事件循环就绪的客户端启动辅助工具、网关 CLI RPC、网关协议错误和渠道状态修补辅助工具 | | `plugin-sdk/config-types` | 仅类型配置表面，用于插件配置形状（如 `OpenClawConfig`）和渠道/提供商配置类型 | | `plugin-sdk/plugin-config-runtime` | 运行时插件配置查找辅助工具，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和
  `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 事务性配置变更辅助工具，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照辅助工具，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照设置器 | | `plugin-sdk/telegram-command-config`TelegramTelegram | Telegram
  命令名称/描述标准化以及重复/冲突检查，即使捆绑的 Telegram 合约表面不可用 | | `plugin-sdk/text-autolink-runtime` | 文件引用自动链接检测，无需广泛的文本运行时桶 | | `plugin-sdk/approval-runtime` | Exec/插件批准辅助工具、批准能力构建器、身份验证/配置文件辅助工具、原生路由/运行时辅助工具以及结构化批准显示路径格式化 | | `plugin-sdk/reply-runtime` |
  共享入站/回复运行时辅助工具、分块、分发、心跳、回复规划器 | | `plugin-sdk/reply-dispatch-runtime` | 窄范围的回复分发/完成和对话标签辅助工具 | | `plugin-sdk/reply-history` | 共享短窗口回复历史记录辅助工具和标记，例如 `buildHistoryContext`、`HISTORY_CONTEXT_MARKER`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | |
  `plugin-sdk/reply-chunking` | 窄范围的文本/Markdown 分块辅助工具 | | `plugin-sdk/session-store-runtime` | 会话存储路径、会话密钥、更新时间和存储变更辅助工具 | | `plugin-sdk/cron-store-runtime` | Cron 存储路径/加载/保存辅助工具 | | `plugin-sdk/state-paths`OAuth | 状态/OAuth 目录路径辅助工具 | | `plugin-sdk/routing` | 路由/会话密钥/帐户绑定辅助工具，例如 `resolveAgentRoute`、`buildAgentSessionKey`
  和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共享渠道/帐户状态摘要辅助工具、运行时状态默认值和问题元数据辅助工具 | | `plugin-sdk/target-resolver-runtime` | 共享目标解析器辅助工具 | | `plugin-sdk/string-normalization-runtime` | Slug/字符串标准化辅助工具 | | `plugin-sdk/request-url` | 从 fetch/request 类输入中提取字符串 URL | | `plugin-sdk/run-command` | 带有标准化
  stdout/stderr 结果的定时命令运行器 | | `plugin-sdk/param-readers`CLI | 通用工具/CLI 参数读取器 | | `plugin-sdk/tool-payload` | 从工具结果对象中提取标准化负载 | | `plugin-sdk/tool-send` | 从工具参数中提取规范发送目标字段 | | `plugin-sdk/temp-path` | 共享临时下载路径辅助工具和私有安全临时工作区 | | `plugin-sdk/logging-core` | 子系统日志记录器和编辑辅助工具 | | `plugin-sdk/markdown-table-runtime` |
  Markdown 表格模式和转换辅助工具 | | `plugin-sdk/model-session-runtime` | 模型/会话覆盖辅助工具，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供商配置解析辅助工具 | | `plugin-sdk/json-store` | 小型 JSON 状态读/写辅助工具 | | `plugin-sdk/file-lock` | 可重入文件锁定辅助工具 | | `plugin-sdk/persistent-dedupe` |
  磁盘支持的重复数据删除缓存辅助工具 | | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复分发辅助工具 | | `plugin-sdk/acp-runtime-backend` | 用于启动时加载插件的轻量级 ACP 后端注册和回复分发辅助工具 | | `plugin-sdk/acp-binding-resolve-runtime` | 只读 ACP 绑定解析，无需生命周期启动导入 | | `plugin-sdk/agent-config-primitives` | 窄范围的代理运行时配置模式原语 | | `plugin-sdk/boolean-param` |
  宽松布尔参数读取器 | | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助工具 | | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌辅助工具 | | `plugin-sdk/extension-shared` | 共享被动渠道、状态和环境代理辅助工具原语 | | `plugin-sdk/models-provider-runtime` | `/models` 命令/提供商回复辅助工具 | | `plugin-sdk/skill-commands-runtime` | 技能命令列出辅助工具 | |
  `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化辅助工具 | | `plugin-sdk/agent-harness`OpenClaw | 用于底层代理工具链的实验性可信插件表面：工具链类型、活动运行引导/中止辅助工具、OpenClaw 工具桥接辅助工具、运行时计划工具策略辅助工具、终端结果分类、工具进度格式化/详细辅助工具以及尝试结果实用程序 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端点检测辅助工具 | |
  `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁辅助工具 | | `plugin-sdk/channel-activity-runtime` | 渠道活动遥测辅助工具 | | `plugin-sdk/concurrency-runtime` | 有界异步任务并发辅助工具 | | `plugin-sdk/dedupe-runtime` | 内存中重复数据删除缓存辅助工具 | | `plugin-sdk/delivery-queue-runtime` | 出站待处理交付排空辅助工具 | | `plugin-sdk/file-access-runtime` |
  安全本地文件和媒体源路径辅助工具 | | `plugin-sdk/heartbeat-runtime` | 心跳唤醒、事件和可见性辅助工具 | | `plugin-sdk/number-runtime` | 数字强制辅助工具 | | `plugin-sdk/secure-random-runtime` | 安全令牌/UUID 辅助工具 | | `plugin-sdk/system-event-runtime` | 系统事件队列辅助工具 | | `plugin-sdk/transport-ready-runtime` | 传输就绪等待辅助工具 | | `plugin-sdk/infra-runtime` |
  已弃用的兼容性垫片；请使用上述专注的运行时子路径 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 | | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和跟踪上下文辅助工具 | | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助工具，`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包装的 fetch、代理、EnvHttpProxyAgent 选项和固定查找辅助工具 | |
  `plugin-sdk/runtime-fetch` | 调度程序感知的运行时获取，无需代理/受保护获取导入 | | `plugin-sdk/response-limit-runtime` | 有界响应正文读取器，无需广泛的媒体运行时表面 | | `plugin-sdk/session-binding-runtime` | 当前对话绑定状态，无需配置的绑定路由或配对存储 | | `plugin-sdk/session-store-runtime` | 会话存储辅助工具，无需广泛的配置写入/维护导入 | | `plugin-sdk/context-visibility-runtime` |
  上下文可见性解析和补充上下文过滤，无需广泛的配置/安全导入 | | `plugin-sdk/string-coerce-runtime` | 窄范围的原语记录/字符串强制和标准化辅助工具，无需 Markdown/日志导入 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机标准化辅助工具 | | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助工具 | | `plugin-sdk/agent-runtime` | 代理目录/身份/工作区辅助工具，包括
  `resolveAgentDir`、`resolveDefaultAgentDir` 和已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | | `plugin-sdk/directory-runtime` | 配置支持的目录查询/重复数据删除 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | Shared media fetch/transform/store helpers, ffprobe-backed video dimension probing, and media payload builders | | `plugin-sdk/media-mime` | Narrow MIME normalization, file-extension mapping, MIME detection, and media-kind helpers | | `plugin-sdk/media-store` | Narrow media store helpers such as `saveMediaBuffer` | |
  `plugin-sdk/media-generation-runtime` | Shared media-generation failover helpers, candidate selection, and missing-模型 messaging | | `plugin-sdk/media-understanding` | Media understanding 提供商 types plus 提供商-facing image/audio helper exports | | `plugin-sdk/text-runtime` | Shared text/markdown/logging helpers such as assistant-visible-text stripping, markdown render/chunking/table helpers,
  redaction helpers, directive-tag helpers, and safe-text utilities | | `plugin-sdk/text-chunking` | Outbound text chunking helper | | `plugin-sdk/speech` | Speech 提供商 types plus 提供商-facing directive, registry, validation, OpenAI-compatible TTS builder, and speech helper exports | | `plugin-sdk/speech-core` | Shared speech 提供商 types, registry, directive, normalization, and speech helper
  exports | | `plugin-sdk/realtime-transcription` | Realtime transcription 提供商 types, registry helpers, and shared WebSocket 会话 helper | | `plugin-sdk/realtime-voice` | Realtime voice 提供商 types and registry helpers | | `plugin-sdk/image-generation` | Image generation 提供商 types plus image asset/data URL helpers and the OpenAI-compatible image 提供商 builder | |
  `plugin-sdk/image-generation-core` | Shared image-generation types, failover, auth, and registry helpers | | `plugin-sdk/music-generation` | Music generation 提供商/request/result types | | `plugin-sdk/music-generation-core` | Shared music-generation types, failover helpers, 提供商 lookup, and 模型-ref parsing | | `plugin-sdk/video-generation` | Video generation 提供商/request/result types | |
  `plugin-sdk/video-generation-core` | Shared video-generation types, failover helpers, 提供商 lookup, and 模型-ref parsing | | `plugin-sdk/webhook-targets` | Webhook target registry and route-install helpers | | `plugin-sdk/webhook-path` | Webhook path normalization helpers | | `plugin-sdk/web-media` | Shared remote/local media loading helpers | | `plugin-sdk/zod` | Re-exported `zod` for plugin
  SDK consumers | | `plugin-sdk/testing` | Broad compatibility barrel for legacy plugin tests. New extension tests should import focused SDK subpaths such as `plugin-sdk/agent-runtime-test-contracts`, `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/test-env`, or `plugin-sdk/test-fixtures` instead | | `plugin-sdk/plugin-test-api` | Minimal `createTestPluginApi`
  helper for direct plugin registration unit tests without importing repo test helper bridges | | `plugin-sdk/agent-runtime-test-contracts` | Native agent-runtime adapter contract fixtures for auth, delivery, fallback, 工具-hook, prompt-overlay, schema, and transcript projection tests | | `plugin-sdk/channel-test-helpers` | Channel-oriented test helpers for generic actions/setup/status contracts,
  directory assertions, account startup lifecycle, send-config threading, runtime mocks, status issues, outbound delivery, and hook registration | | `plugin-sdk/channel-target-testing` | Shared target-resolution error-case suite for 渠道 tests | | `plugin-sdk/plugin-test-contracts` | Plugin package, registration, public artifact, direct import, runtime API, and import side-effect contract helpers
  | | `plugin-sdk/provider-test-contracts` | Provider runtime, auth, discovery, onboard, catalog, wizard, media capability, replay policy, realtime STT live-audio, web-search/fetch, and stream contract helpers | | `plugin-sdk/provider-http-test-mocks` | Opt-in Vitest HTTP/auth mocks for 提供商 tests that exercise `plugin-sdk/provider-http` | | `plugin-sdk/test-fixtures` | Generic CLI runtime
  capture, sandbox context, skill writer, agent-message, system-event, module reload, bundled plugin path, terminal-text, chunking, auth-token, and typed-case fixtures | | `plugin-sdk/test-node-mocks` | Focused Node builtin mock helpers for use inside Vitest `vi.mock("node:*")` factories |
</Accordion>

<Accordion title="Memory 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/memory-core`CLI | 用于 manager/config/file/CLI 助手的捆绑 memory-core 助手接口 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主机嵌入契约、注册表访问、本地提供商以及通用批量/远程助手
  | | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机密钥助手 | | `plugin-sdk/memory-core-host-events` | Memory
  主机事件日志助手 | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | | `plugin-sdk/memory-core-host-runtime-cli`CLI | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | Memory 主机核心运行时助手的供应商中立别名 | |
  `plugin-sdk/memory-host-events` | Memory 主机事件日志助手的供应商中立别名 | | `plugin-sdk/memory-host-files` | Memory 主机文件/运行时助手的供应商中立别名 | | `plugin-sdk/memory-host-markdown` | 用于 memory 相邻插件的共享 managed-markdown 助手 | | `plugin-sdk/memory-host-search` | 用于 search-manager 访问的活动 memory 运行时外观 | | `plugin-sdk/memory-host-status` | Memory
  主机状态助手的供应商中立别名 |
</Accordion>

  <Accordion title="保留的捆绑助手子路径">
    目前没有保留的捆绑助手 SDK 子路径。特定于所有者的助手位于所有者插件包内部，而可重用的主机契约则使用通用 SDK 子路径，例如 `plugin-sdk/gateway-runtime`、
    `plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。
  </Accordion>
</AccordionGroup>

## 相关

- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件 SDK 设置](/zh/plugins/sdk-setup)
- [构建插件](/zh/plugins/building-plugins)
