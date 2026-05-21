---
summary: "Plugin SDK 子路径目录：各导入项位于何处，按区域分组"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路径"
---

插件 SDK 作为一组位于 `openclaw/plugin-sdk/` 下的狭义公共子路径暴露出来。本页面按用途分类列出了常用的子路径。生成的编译器入口清单位于 `scripts/lib/plugin-sdk-entrypoints.json`；包导出是在减去 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的仓库本地测试/内部子路径后的公共子集。维护者可以使用 `pnpm plugin-sdk:surface` 审计公共导出计数，并使用 `pnpm plugins:boundary-report:summary` 审计活动保留的助手子路径；未使用的保留助手导出会导致 CI 报告失败，而不是作为休眠的兼容性债务保留在公共 SDK 中。

有关插件创作指南，请参阅 [Plugin SDK overview](/zh/plugins/sdk-overview)。

## 插件入口

| 子路径                         | 主要导出                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`，`createChatChannelPlugin`，`createChannelPluginBase`，`defineSetupPluginEntry`，`buildChannelConfigSchema`，`buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/migration`         | 迁移提供商项目辅助工具，例如 `createMigrationItem`、原因常量、项目状态标记、编辑辅助工具以及 `summarizeMigrationItems`                                                 |
| `plugin-sdk/migration-runtime` | 运行时迁移辅助工具，例如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                                         |

### 已弃用的兼容性和测试辅助工具

这些子路径仍作为旧版插件和 OpenClaw 测试套件的包导出保留，但新代码不应从它们导入：`agent-runtime-test-contracts`、`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、`plugin-test-api`、`plugin-test-contracts`、`provider-http-test-mocks`、`provider-test-contracts`、`test-env`、`test-fixtures`、`test-node-mocks`、`testing`、`channel-runtime`、`compat`、`config-types`、`infra-runtime`、`text-runtime` 和 `zod`。在新插件代码中，请直接从 `zod` 导入 `zod`。`plugin-test-runtime` 仍是一个活跃的专用测试辅助子路径。

### 保留的捆绑插件辅助子路径

这些子路径是插件拥有的兼容性表面，保留给其所属的捆绑插件，而非通用的 SDK API：`plugin-sdk/codex-mcp-projection` 和 `plugin-sdk/codex-native-task-runtime`。跨所有者的扩展导入受到包合约防护措施的限制。

### 已弃用的未使用公共子路径

这些公共子路径已存在至少一个月，且目前没有捆绑扩展的生产导入。为了保持兼容性，它们仍然可以导入，但新的插件代码应改用专注的、活跃使用的 SDK 子路径：`agent-config-primitives`、`channel-config-schema-legacy`、`channel-reply-pipeline`、`channel-runtime`、`channel-secret-runtime`、`command-auth`、`compat`、`config-runtime`、`config-schema`、`discord`、`group-access`、`infra-runtime`、`matrix`、`mattermost`、`media-generation-runtime-shared`、`memory-core-engine-runtime`、`memory-core-host-multimodal`、`memory-core-host-query`、`music-generation-core`、`self-hosted-provider-setup`、`telegram-account`、`telegram-command-config` 和 `zalouser`。

### 已弃用的罕见公共子路径

目前仅被一两个捆绑插件所有者使用的公共子路径对新插件代码也已弃用。为了兼容性，它们仍作为包导出保留，但新代码应优先使用活跃共享的 SDK 接口或插件拥有的包 API。维护者在 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中跟踪确切集合，并使用 `pnpm plugin-sdk:surface` 跟踪当前预算。

### 已弃用的广泛汇总入口

这些广泛的重新导出桶（barrels）对于 OpenClaw 源代码和兼容性检查仍然可构建，但新代码应首选特定的 SDK 子路径：OpenClaw`agent-runtime`、`channel-lifecycle`、`channel-runtime`、`cli-runtime`、`compat`、`config-types`、`conversation-runtime`、`hook-runtime`、`infra-runtime`、`media-runtime`、`plugin-runtime`、`security-runtime` 和 `text-runtime`。`channel-runtime`、`compat`、`config-types`、`infra-runtime` 和 `text-runtime` 保留为包导出仅用于向后兼容；请改为使用特定的渠道/运行时子路径，即 `config-contracts`、`string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core`。

<AccordionGroup>
  <Accordion title="Channel 子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式导出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 用于插件自有模式的缓存 JSON Schema 验证辅助程序 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导辅助程序、设置翻译器、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已弃用的兼容性别名；请使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作闸辅助程序、默认账户回退辅助程序 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 ID 规范化辅助程序 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退辅助程序 |
    | `plugin-sdk/account-helpers` | 窄范围账户列表/账户操作辅助程序 |
    | `plugin-sdk/access-groups` | 访问组允许列表解析和脱敏组诊断辅助程序 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 旧版回复管道辅助程序。新的渠道回复管道代码应使用 `createChannelMessageReplyPipeline` 和 `resolveChannelMessageSourceReplyDeliveryMode`，两者来自 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema`TypeBox | 共享渠道配置模式原语，加上 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema`OpenClaw | 仅适用于受维护的捆绑插件的捆绑 OpenClaw 渠道配置模式 |
    | `plugin-sdk/channel-config-schema-legacy` | 捆绑渠道配置模式的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config`Telegram | 带有捆绑契约回退的 Telegram 自定义命令规范化/验证辅助程序 |
    | `plugin-sdk/command-gating` | 窄范围命令授权闸辅助程序 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已弃用的低级渠道入口兼容性外观。新的接收路径应使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime`API | 用于迁移的渠道接收路径的实验性高级渠道入口运行时解析器和路由事实构建器。优先使用它，而不是在每个插件中组装有效允许列表、命令允许列表和旧版投影。请参阅[渠道入口 API](/zh/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue` 和旧版草稿流生命周期辅助程序。新的预览完成代码应使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 廉价消息生命周期契约辅助程序，例如 `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`、持久最终能力推导、用于发送/接收/副作用功能的能力证明辅助程序、`MessageReceiveContext`、接收确认策略证明、`defineFinalizableLivePreviewAdapter`、`deliverWithFinalizableLivePreviewAdapter`、实时预览和实时终结器能力证明、持久恢复状态、`RenderedMessageBatch`API、消息接收类型和接收 ID 辅助程序。请参阅[渠道消息 API](/zh/plugins/sdk-channel-message)。旧版回复分发外观仅为兼容性而弃用。 |
    | `plugin-sdk/channel-message-runtime` | 可能加载出站交付的运行时交付辅助程序，包括 `deliverInboundReplyWithMessageSendContext`、`sendDurableMessageBatch` 和 `withDurableMessageSendContext`。已弃用的回复分发桥仍可导入，但仅限于兼容性分发器。请从监控/发送运行时模块使用，而不是热插件引导文件。 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器辅助程序 |
    | `plugin-sdk/inbound-reply-dispatch` | 旧版共享入站记录和分发辅助程序、可见/最终分发谓词，以及用于准备好的渠道分发器的已弃用 `deliverDurableInboundReplyPayload` 兼容性。新的渠道接收/分发代码应从 `plugin-sdk/channel-message-runtime` 导入运行时生命周期辅助程序。 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配辅助程序 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载辅助程序 |
    | `plugin-sdk/outbound-send-deps` | 用于渠道适配器的轻量级出站发送依赖项查找 |
    | `plugin-sdk/outbound-runtime` | 出站身份、发送委托、会话、格式化和负载计划辅助程序。诸如 `deliverOutboundPayloads` 之类的直接交付辅助程序是已弃用的兼容性基底；对于新的发送路径，请使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 窄范围投票规范化辅助程序 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器辅助程序 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 会话/线程绑定、配对和配置绑定辅助程序 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照辅助程序 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析辅助程序 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要辅助程序 |
    | `plugin-sdk/channel-config-primitives` | 窄范围渠道配置模式原语 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权辅助程序 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取辅助程序 |
    | `plugin-sdk/group-access` | 共享组访问决策辅助程序 |
    | `plugin-sdk/direct-dm` | 共享直接私信 认证/守护辅助程序 |
    | `plugin-sdk/discord`Discord | 已弃用的 Discord 兼容性外观，用于已发布的 `@openclaw/discord@2026.3.13` 和跟踪的所有者兼容性；新插件应使用通用渠道 SDK 子路径 |
    | `plugin-sdk/telegram-account`Telegram | 用于跟踪的所有者兼容性的已弃用 Telegram 账户解析兼容性外观；新插件应使用注入的运行时辅助程序或通用渠道 SDK 子路径 |
    | `plugin-sdk/zalouser`ZaloZalo | 用于仍然导入发送方命令授权的已发布 Lark/Zalo 包的已弃用 Zalo Personal 兼容性外观；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义消息呈现、交付和旧版交互式回复辅助程序。请参阅[消息呈现](/zh/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用于事件分类、上下文构建、防抖、提及匹配、提及策略和信封格式的共享入站辅助程序 |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围入站防抖辅助程序 |
    | `plugin-sdk/channel-mention-gating` | 不包含更广泛的入站运行时表面的窄范围提及策略、提及标记和提及文本辅助程序 |
    | `plugin-sdk/channel-envelope` | 窄范围入站信封格式化辅助程序 |
    | `plugin-sdk/channel-location` | 渠道位置上下文和格式化辅助程序 |
    | `plugin-sdk/channel-logging` | 用于入站丢弃和输入/确认失败的渠道日志记录辅助程序 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 渠道消息操作辅助程序，加上为插件兼容性而保留的已弃用原生模式辅助程序 |
    | `plugin-sdk/channel-route` | 共享路由规范化、解析器驱动的目标解析、线程 ID 字符串化、去重/压缩路由键、解析目标类型以及路由/目标比较辅助程序 |
    | `plugin-sdk/channel-targets` | 目标解析辅助程序；路由比较调用方应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 渠道契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连线 |
    | `plugin-sdk/channel-secret-runtime` | 窄范围秘密契约辅助程序，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和秘密目标类型 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支持 LM Studio 提供商门面，用于设置、目录发现和运行时模型准备 | | `plugin-sdk/lmstudio-runtime` | 支持 LM Studio 运行时门面，用于本地服务器默认值、模型发现、请求标头和已加载模型辅助工具 | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置辅助工具 | |
  `plugin-sdk/self-hosted-provider-setup` | 专注于 OpenAI 兼容的自托管提供商设置辅助工具 | | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析辅助工具 | | `plugin-sdk/provider-auth-api-key` | API 密钥新手引导/配置文件写入辅助工具，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 标准 OAuth
  认证结果构建器 | | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找辅助工具 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`，已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`，共享的重放策略构建器、提供商端点辅助工具和共享模型 ID 标准化辅助工具 | | `plugin-sdk/provider-catalog-runtime` | 提供商目录扩充运行时挂钩和用于合约测试的插件提供商注册连接点 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用提供商 HTTP/端点功能辅助工具、提供商 HTTP 错误以及音频转录多部分表单辅助工具 | | `plugin-sdk/provider-web-fetch-contract` | 狭窄的 Web 获取配置/选择合约辅助工具，例如
  `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web 获取提供商注册/缓存辅助工具 | | `plugin-sdk/provider-web-search-config-contract` | 针对不需要插件启用连线的提供商的狭窄 Web 搜索配置/凭据辅助工具 | | `plugin-sdk/provider-web-search-contract` | 狭窄的 Web 搜索配置/凭据合约辅助工具，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | Web 搜索提供商注册/缓存/运行时辅助工具 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek/Gemini/OpenAI 架构清理 + 诊断 | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` 及类似内容 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`，流包装器类型，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助工具 | | `plugin-sdk/provider-transport-runtime` |
  原生提供商传输辅助工具，例如受保护获取、传输消息转换和可写传输事件流 | | `plugin-sdk/provider-onboard` | 新手引导配置补丁辅助工具 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存辅助工具 | | `plugin-sdk/group-activation` | 狭窄的组激活模式和命令解析辅助工具 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册辅助工具，包括动态参数菜单格式化、发送者授权辅助工具 | | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 批准者解析和同频道操作授权辅助工具 | | `plugin-sdk/approval-client-runtime` |
  原生执行批准配置/筛选辅助工具 | | `plugin-sdk/approval-delivery-runtime` | 原生批准能力/交付适配器 | | `plugin-sdk/approval-gateway-runtime` | 共享批准网关解析辅助工具 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热频道入口点的轻量级原生批准适配器加载辅助工具 | | `plugin-sdk/approval-handler-runtime` | 更广泛的批准处理程序运行时辅助工具；当足够时，优先使用较窄的适配器/网关接口 | |
  `plugin-sdk/approval-native-runtime` | 原生批准目标 + 账户绑定辅助工具 | | `plugin-sdk/approval-reply-runtime` | 执行/插件批准回复有效负载辅助工具 | | `plugin-sdk/approval-runtime` | 执行/插件批准有效负载辅助工具、原生批准路由/运行时辅助工具，以及结构化批准显示辅助工具，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 窄入站回复去重重置辅助工具 | |
  `plugin-sdk/channel-contract-testing` | 不包含广泛测试桶的窄频道合约测试辅助工具 | | `plugin-sdk/command-auth-native` | 原生命令授权、动态参数菜单格式化和原生会话目标辅助工具 | | `plugin-sdk/command-detection` | 共享命令检测辅助工具 | | `plugin-sdk/command-primitives-runtime` | 用于热频道路径的轻量级命令文本谓词 | | `plugin-sdk/command-surface` | 命令主体规范化和命令表面辅助工具 | |
  `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用于频道/插件密钥表面的窄密钥合约集合辅助工具 | | `plugin-sdk/secret-ref-runtime` | 用于密钥合约/配置解析的窄 `coerceSecretRef` 和 SecretRef 类型辅助工具 | | `plugin-sdk/security-runtime` |
  共享信任、私信（私信）门控、根绑定文件/路径辅助工具，包括仅创建写入、同步/异步原子文件替换、同级临时写入、跨设备移动回退、私有文件存储辅助工具、符号链接父级保护、外部内容、敏感文本编辑、恒定时间密钥比较和密钥集合辅助工具 | | `plugin-sdk/ssrf-policy` | 主机允许列表和专用网络 SSRF 策略辅助工具 | | `plugin-sdk/ssrf-dispatcher` | 不包含广泛基础架构运行时表面的窄固定分发器辅助工具 | |
  `plugin-sdk/ssrf-runtime` | 固定分发器、SSRF 保护提取、SSRF 错误和 SSRF 策略辅助工具 | | `plugin-sdk/secret-input` | 密钥输入解析辅助工具 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标辅助工具和原始 websocket/主体强制转换 | | `plugin-sdk/webhook-request-guards` | 请求主体大小/超时辅助工具 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/插件安装辅助函数 | | `plugin-sdk/runtime-env` | 狭窄的运行时环境、日志记录器、超时、重试和退避辅助函数 | | `plugin-sdk/browser-config` | 用于规范化配置文件/默认值、CDP URL 解析和浏览器控制身份验证辅助函数的受支持的浏览器配置外观 | | `plugin-sdk/codex-mcp-projection` | 保留的捆绑 Codex 辅助函数，用于将用户的 MCP
  服务器配置投影到 Codex 线程配置中；不适用于第三方插件 | | `plugin-sdk/codex-native-task-runtime` | 保留的捆绑 Codex 辅助函数，用于原生任务镜像/运行时连接；不适用于第三方插件 | | `plugin-sdk/channel-runtime-context` | 通用渠道运行时上下文注册和查找辅助函数 | | `plugin-sdk/matrix` | 已弃用的 Matrix 兼容性外观，用于旧的第三方渠道包；新插件应直接导入 `plugin-sdk/run-command` | |
  `plugin-sdk/mattermost` | 已弃用的 Mattermost 兼容性外观，用于旧的第三方渠道包；新插件应直接导入通用 SDK 子路径 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享的插件命令/钩子/HTTP/交互辅助函数 | | `plugin-sdk/hook-runtime` | 共享的 webhook/内部钩子流水线辅助函数 | | `plugin-sdk/lazy-runtime` | 延迟运行时导入/绑定辅助函数，例如
  `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程执行辅助函数 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和延迟命令组辅助函数 | | `plugin-sdk/gateway-method-runtime` | 保留的 Gateway(网关) 方法分发辅助函数，用于声明 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由 | |
  `plugin-sdk/gateway-runtime` | Gateway(网关) 客户端、事件循环就绪的客户端启动辅助函数、gateway CLI RPC、gateway 协议错误和渠道状态修补辅助函数 | | `plugin-sdk/config-contracts` | 专注于仅类型的插件配置形状（如 `OpenClawConfig` 和渠道/提供商配置类型）的配置外观 | | `plugin-sdk/plugin-config-runtime` | 运行时插件配置查找辅助函数，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和
  `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 事务性配置变更辅助函数，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照辅助函数，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照设置器 | | `plugin-sdk/telegram-command-config` | Telegram 命令名称/描述规范化以及重复/冲突检查，即使捆绑的
  Telegram 合约表面不可用 | | `plugin-sdk/text-autolink-runtime` | 不使用广泛的文本桶的文件引用自动链接检测 | | `plugin-sdk/approval-runtime` | 执行/插件批准辅助函数、批准能力构建器、身份验证/配置文件辅助函数、原生路由/运行时辅助函数以及结构化批准显示路径格式化 | | `plugin-sdk/reply-runtime` | 共享的入站/回复运行时辅助函数、分块、分发、心跳、回复计划器 | | `plugin-sdk/reply-dispatch-runtime` |
  狭窄的回复分发/完成和对话标签辅助函数 | | `plugin-sdk/reply-history` | 共享的短窗口回复历史辅助函数。新的消息轮转代码应使用 `createChannelHistoryWindow`；较低级别的映射辅助函数仍保留为已弃用的兼容性导出 | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狭窄的文本/markdown 分块辅助函数 | | `plugin-sdk/session-store-runtime` |
  会话存储路径、会话密钥、更新时间和存储变更辅助函数 | | `plugin-sdk/cron-store-runtime` | Cron 存储路径/加载/保存辅助函数 | | `plugin-sdk/state-paths` | State/OAuth 目录路径辅助函数 | | `plugin-sdk/routing` | 路由/会话密钥/账户绑定辅助函数，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` |
  共享的渠道/账户状态摘要辅助函数、运行时状态默认值和问题元数据辅助函数 | | `plugin-sdk/target-resolver-runtime` | 共享的目标解析器辅助函数 | | `plugin-sdk/string-normalization-runtime` | Slug/字符串规范化辅助函数 | | `plugin-sdk/request-url` | 从类似 fetch/request 的输入中提取字符串 URL | | `plugin-sdk/run-command` | 具有规范化 stdout/stderr 结果的定时命令运行器 | | `plugin-sdk/param-readers` |
  通用工具/CLI 参数读取器 | | `plugin-sdk/tool-plugin` | 定义一个简单的类型化 agent-工具 插件，并公开静态元数据用于清单生成 | | `plugin-sdk/tool-payload` | 从工具结果对象中提取规范化载荷 | | `plugin-sdk/tool-send` | 从工具参数中提取规范发送目标字段 | | `plugin-sdk/temp-path` | 共享的临时下载路径辅助函数和私有安全临时工作区 | | `plugin-sdk/logging-core` | 子系统日志记录器和编辑辅助函数 | |
  `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和转换辅助函数 | | `plugin-sdk/model-session-runtime` | 模型/会话覆盖辅助函数，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供商配置解析辅助函数 | | `plugin-sdk/json-store` | 小型 JSON 状态读/写辅助函数 | | `plugin-sdk/file-lock` | 可重入文件锁辅助函数 | |
  `plugin-sdk/persistent-dedupe` | 支持磁盘的去重缓存辅助函数 | | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复分发辅助函数 | | `plugin-sdk/acp-runtime-backend` | 用于启动加载插件的轻量级 ACP 后端注册和回复分发辅助函数 | | `plugin-sdk/acp-binding-resolve-runtime` | 只读 ACP 绑定解析，无需生命周期启动导入 | | `plugin-sdk/agent-config-primitives` | 狭窄的 agent 运行时配置模式原语 | |
  `plugin-sdk/boolean-param` | 宽松的布尔参数读取器 | | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助函数 | | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌辅助函数 | | `plugin-sdk/extension-shared` | 共享的被动渠道、状态和环境代理辅助原语 | | `plugin-sdk/models-provider-runtime` | `/models` 命令/提供商回复辅助函数 | | `plugin-sdk/skill-commands-runtime` | Skill 命令列出辅助函数 |
  | `plugin-sdk/native-command-registry` | 原生命令注册表/构建/序列化辅助函数 | | `plugin-sdk/agent-harness` | 用于底层 agent 线束的实验性可信插件表面：线束类型、主动运行引导/中止辅助函数、OpenClaw 工具桥接辅助函数、运行时计划工具策略辅助函数、终端结果分类、工具进度格式化/详细辅助函数以及尝试结果实用程序 | | `plugin-sdk/provider-zai-endpoint` | 已弃用的 Z.AI 提供商拥有的端点检测外观；使用 Z.AI
  插件公共 API | | `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁辅助函数 | | `plugin-sdk/channel-activity-runtime` | 渠道活动遥测辅助函数 | | `plugin-sdk/concurrency-runtime` | 有界异步任务并发辅助函数 | | `plugin-sdk/dedupe-runtime` | 内存去重缓存辅助函数 | | `plugin-sdk/delivery-queue-runtime` | 出站待交付排出辅助函数 | | `plugin-sdk/file-access-runtime` |
  安全本地文件和媒体源路径辅助函数 | | `plugin-sdk/heartbeat-runtime` | 心跳唤醒、事件和可见性辅助函数 | | `plugin-sdk/number-runtime` | 数值强制转换辅助函数 | | `plugin-sdk/secure-random-runtime` | 安全令牌/UUID 辅助函数 | | `plugin-sdk/system-event-runtime` | 系统事件队列辅助函数 | | `plugin-sdk/transport-ready-runtime` | 传输就绪等待辅助函数 | | `plugin-sdk/infra-runtime` |
  已弃用的兼容性填充；使用上述专注的运行时子路径 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助函数 | | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和跟踪上下文辅助函数 | | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助函数、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 封装的 fetch、代理、EnvHttpProxyAgent 选项和固定查找辅助函数 | |
  `plugin-sdk/runtime-fetch` | 调度器感知的运行时 fetch，无需代理/受保护 fetch 导入 | | `plugin-sdk/response-limit-runtime` | 有界响应正文读取器，无需广泛的媒体运行时表面 | | `plugin-sdk/session-binding-runtime` | 当前对话绑定状态，无需配置的绑定路由或配对存储 | | `plugin-sdk/session-store-runtime` | 会话存储辅助函数，无需广泛的配置写入/维护导入 | | `plugin-sdk/context-visibility-runtime` |
  上下文可见性解析和补充上下文过滤，无需广泛的配置/安全导入 | | `plugin-sdk/string-coerce-runtime` | 狭窄的原语记录/字符串强制转换和规范化辅助函数，无需 markdown/日志导入 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化辅助函数 | | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助函数 | | `plugin-sdk/agent-runtime` | Agent 目录/身份/工作区辅助函数，包括
  `resolveAgentDir`、`resolveDefaultAgentDir` 和已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | | `plugin-sdk/directory-runtime` | 支持配置的目录查询/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="功能和测试子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒体获取/转换/存储辅助工具，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已弃用的 `fetchRemoteMedia`；当 URL 应变为 OpenClaw 媒体时，优先使用存储辅助工具而非缓冲区读取 | | `plugin-sdk/media-mime` | 窄域的 MIME 标准化、文件扩展名映射、MIME 检测和媒体类型辅助工具 | | `plugin-sdk/media-store` |
  窄域的媒体存储辅助工具，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共享的媒体生成故障转移辅助工具、候选选择以及缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解提供商类型以及面向提供商的图像/音频/结构化提取辅助工具导出 | | `plugin-sdk/text-chunking` | 文本和 Markdown 分块/渲染辅助工具、Markdown 表格转换、指令标签剥离和安全文本实用程序 |
  | `plugin-sdk/text-chunking` | 出站文本分块辅助工具 | | `plugin-sdk/speech` | 语音提供商类型以及面向提供商的指令、注册表、验证、OpenAI 兼容的 TTS 构建器和语音辅助工具导出 | | `plugin-sdk/speech-core` | 共享的语音提供商类型、注册表、指令、标准化和语音辅助工具导出 | | `plugin-sdk/realtime-transcription` | 实时转录提供商类型、注册表辅助工具和共享 WebSocket 会话辅助工具 | |
  `plugin-sdk/realtime-voice` | 实时语音提供商类型和注册表辅助工具 | | `plugin-sdk/image-generation` | 图像生成提供商类型以及图像资源/数据 URL 辅助工具和 OpenAI 兼容的图像提供商构建器 | | `plugin-sdk/image-generation-core` | 共享的图像生成类型、故障转移、身份验证和注册表辅助工具 | | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` |
  共享的音乐生成类型、故障转移辅助工具、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享的视频生成类型、故障转移辅助工具、提供商查找和模型引用解析 | | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装辅助工具 | | `plugin-sdk/webhook-path` | 已弃用的兼容性别名；请使用 `plugin-sdk/webhook-ingress` | |
  `plugin-sdk/web-media` | 共享的远程/本地媒体加载辅助工具 | | `plugin-sdk/zod` | 已弃用的兼容性重新导出；请直接从 `zod` 导入 `zod` | | `plugin-sdk/testing` | 仓库本地的已弃用兼容性汇总桶，用于旧版 OpenClaw 测试。新的仓库测试应改为导入集中的本地测试子路径，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或
  `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 仓库本地的最小化 `createTestPluginApi` 辅助工具，用于在不导入仓库测试辅助桥接的情况下进行直接插件注册单元测试 | | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地的原生代理运行时适配器契约固件，用于身份验证、交付、故障转移、工具钩子、提示覆盖、架构和转录投影测试 | | `plugin-sdk/channel-test-helpers` |
  仓库本地的面向渠道的测试辅助工具，用于通用操作/设置/状态契约、目录断言、帐户启动生命周期、发送配置线程、运行时模拟、状态问题、出站交付和钩子注册 | | `plugin-sdk/channel-target-testing` | 仓库本地的共享目标解析错误用例套件，用于渠道测试 | | `plugin-sdk/plugin-test-contracts` | 仓库本地的插件包、注册、公共工件、直接导入、运行时 API 和导入副作用契约辅助工具 | | `plugin-sdk/provider-test-contracts`
  | 仓库本地的提供商运行时、身份验证、发现、入门、目录、向导、媒体功能、重放策略、实时 STT 实时音频、网络搜索/获取和流契约辅助工具 | | `plugin-sdk/provider-http-test-mocks` | 仓库本地的可选 Vitest HTTP/身份验证模拟，用于执行 `plugin-sdk/provider-http` 的提供商测试 | | `plugin-sdk/test-fixtures` | 仓库本地的通用 CLI
  运行时捕获、沙箱上下文、技能编写器、代理消息、系统事件、模块重新加载、捆绑插件路径、终端文本、分块、身份验证令牌和类型化用例固件 | | `plugin-sdk/test-node-mocks` | 仓库本地的集中式 Node 内置模拟辅助工具，用于 Vitest `vi.mock("node:*")` 工厂内部 |
</Accordion>

<Accordion title="Memory subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/memory-core`CLI | 用于管理器/配置/文件/CLI 助手的捆绑式 memory-core 助手接口 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory
  主机嵌入合约、注册表访问、本地提供商以及通用批处理/远程助手 | | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory
  主机密钥助手 | | `plugin-sdk/memory-core-host-events` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | | `plugin-sdk/memory-core-host-runtime-cli`CLI | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory
  主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | Memory 主机核心运行时助手的供应商中立别名 | | `plugin-sdk/memory-host-events` | Memory 主机事件日志助手的供应商中立别名 | | `plugin-sdk/memory-host-files` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 用于 Memory 相邻插件的共享托管 Markdown 助手 | |
  `plugin-sdk/memory-host-search` | 用于搜索管理器访问的活动 Memory 运行时外观 | | `plugin-sdk/memory-host-status` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    保留的捆绑辅助 SDK 子路径是专用于捆绑插件代码的特定所有者的狭窄接口。它们在 SDK 清单中进行跟踪，以便包构建和别名保持确定性，但它们不是通用的插件编写 API。新的可重用主机契约应使用通用的 SDK 子路径，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

    | 子路径 | 所有者和用途 |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | 用于将用户 MCP 服务器配置投影到 Codex 应用服务器线程配置的捆绑 Codex 插件辅助程序 |
    | `plugin-sdk/codex-native-task-runtime`OpenClaw | 用于将 Codex 应用服务器原生子代理镜像到 OpenClaw 任务状态的捆绑 Codex 插件辅助程序 |

  </Accordion>
</AccordionGroup>

## 相关

- [Plugin SDK 概述](/zh/plugins/sdk-overview)
- [Plugin SDK 设置](/zh/plugins/sdk-setup)
- [构建插件](/zh/plugins/building-plugins)
