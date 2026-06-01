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
| `plugin-sdk/health`            | 适用于打包健康消费者的 Doctor 健康检查注册、检测、修复、选择、严重性以及查找类型                                                                                       |

### 已弃用的兼容性和测试辅助工具

已弃用的子路径会保留导出以供旧插件使用，但新代码应使用下面专用的 SDK 子路径。维护列表为
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json`；CI 会拒绝从中进行的打包生产导入。`compat`、`config-types`、
`infra-runtime`、`text-runtime` 和 `zod` 等宽泛的汇总仅用于兼容。请直接从 `zod` 导入 `zod`。

OpenClaw 基于 Vitest 的测试辅助子路径仅限仓库本地使用，不再是包导出：OpenClaw`agent-runtime-test-contracts`、
`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、
`plugin-test-api`、`plugin-test-contracts`、`plugin-test-runtime`、
`provider-http-test-mocks`、`provider-test-contracts`、`test-env`、
`test-fixtures`、`test-node-mocks` 和 `testing`。

### 保留的打包插件辅助子路径

这些子路径是其所属打包插件的插件自有兼容性接口，而非通用 SDK API：`plugin-sdk/codex-mcp-projection` 和
`plugin-sdk/codex-native-task-runtime`。跨所有者扩展导入受包合约保护措施的阻止。

<AccordionGroup>
  <Accordion title="渠道子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式导出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 用于插件自有模式的缓存 JSON Schema 验证辅助工具 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导辅助工具、设置翻译器、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已弃用的兼容性别名；请使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门控辅助工具、默认账户回退辅助工具 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、账户 ID 规范化辅助工具 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退辅助工具 |
    | `plugin-sdk/account-helpers` | 狭义的账户列表/账户操作辅助工具 |
    | `plugin-sdk/access-groups` | 访问组允许列表解析和修订组诊断辅助工具 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema`TypeBox | 共享渠道配置模式原语以及 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema`OpenClaw | 仅适用于维护的捆绑插件的捆绑 OpenClaw 渠道配置模式 |
    | `plugin-sdk/channel-config-schema-legacy` | 用于捆绑渠道配置模式的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config`Telegram | 带有捆绑契约回退的 Telegram 自定义命令规范化/验证辅助工具 |
    | `plugin-sdk/command-gating` | 狭义的命令授权门控辅助工具 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已弃用的低级渠道入口兼容性外观。新的接收路径应使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime`API | 用于已迁移渠道接收路径的实验性高级渠道入口运行时解析器和路由事实构建器。相比在每个插件中组装有效允许列表、命令允许列表和旧版投影，优先使用此方法。请参阅[渠道入口 API](/zh/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-outbound`API | 消息生命周期契约以及回复管道选项、回执、实时预览/流式传输、生命周期辅助工具、出站身份、有效负载规划、持久发送和消息发送上下文辅助工具。请参阅[渠道出站 API](/zh/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/channel-message` | `plugin-sdk/channel-outbound` 加上旧版回复调度外观的已弃用兼容性别名。 |
    | `plugin-sdk/channel-message-runtime` | `plugin-sdk/channel-outbound` 加上旧版回复调度外观的已弃用兼容性别名。 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器辅助工具 |
    | `plugin-sdk/inbound-reply-dispatch` | 已弃用的兼容性外观。对于入站运行器和调度谓词，请使用 `plugin-sdk/channel-inbound`；对于消息传递辅助工具，请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/messaging-targets` | 已弃用的目标解析别名；请使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载辅助工具 |
    | `plugin-sdk/outbound-send-deps` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/outbound-runtime` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/poll-runtime` | 狭义的投票规范化辅助工具 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器辅助工具 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体有效负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和配置绑定辅助工具 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照辅助工具 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析辅助工具 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要辅助工具 |
    | `plugin-sdk/channel-config-primitives` | 狭义的渠道配置模式原语 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权辅助工具 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件序言导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取辅助工具 |
    | `plugin-sdk/group-access` | 共享组访问决策辅助工具 |
    | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-inbound`。 |
    | `plugin-sdk/direct-dm-guard-policy` | 狭义的直接私信加密前守卫策略辅助工具 |
    | `plugin-sdk/discord`Discord | 已弃用的 Discord 兼容性外观，用于已发布的 `@openclaw/discord@2026.3.13` 和跟踪的所有者兼容性；新插件应使用通用渠道 SDK 子路径 |
    | `plugin-sdk/telegram-account`Telegram | 已弃用的 Telegram 账户解析兼容性外观，用于跟踪的所有者兼容性；新插件应使用注入的运行时辅助工具或通用渠道 SDK 子路径 |
    | `plugin-sdk/zalouser`ZaloZalo | 已弃用的 Zalo Personal 兼容性外观，用于仍然导入发送者命令授权的已发布 Lark/Zalo 包；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义消息展示、传递和旧版交互式回复辅助工具。请参阅[消息展示](/zh/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用于事件分类、上下文构建、格式化、根、去抖动、提及匹配、提及策略和入站日志记录的共享入站辅助工具 |
    | `plugin-sdk/channel-inbound-debounce` | 狭义的入站去抖动辅助工具 |
    | `plugin-sdk/channel-mention-gating` | 狭义的提及策略、提及标记和提及文本辅助工具，不包含更广泛的入站运行时表面 |
    | `plugin-sdk/channel-envelope`, `plugin-sdk/channel-inbound-roots`, `plugin-sdk/channel-location`, `plugin-sdk/channel-logging` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-inbound` 或 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-pairing-paths` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-pairing`。 |
    | `plugin-sdk/channel-reply-options-runtime` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-streaming` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 渠道消息操作辅助工具，以及为插件兼容性而保留的已弃用原生模式辅助工具 |
    | `plugin-sdk/channel-route` | 共享路由规范化、解析器驱动的目标解析、线程 ID 字符串化、去重/压缩路由键、解析目标类型以及路由/目标比较辅助工具 |
    | `plugin-sdk/channel-targets` | 目标解析辅助工具；路由比较调用者应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 渠道契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连线 |
    | `plugin-sdk/channel-secret-runtime` | 狭义的机密契约辅助工具，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 以及机密目标类型 |
  </Accordion>

已弃用的渠道辅助函数系列仅为了发布插件的兼容性而保留。移除计划如下：在外部插件迁移窗口期内保留它们，保持仓库/捆绑插件使用 `channel-inbound` 和 `channel-outbound`，然后在下一次主要的 SDK 清理中移除这些兼容性子路径。这适用于旧的渠道消息/运行时、渠道流式传输、直接私信访问、入站辅助函数碎片、回复选项和配对路径系列。

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支持的 LM Studio 提供商外观，用于设置、目录发现和运行时模型准备 | | `plugin-sdk/lmstudio-runtime` | 支持的 LM Studio 运行时外观，用于本地服务器默认值、模型发现、请求标头和加载模型辅助程序 | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置辅助程序 | |
  `plugin-sdk/self-hosted-provider-setup`OpenAI | 专注于 OpenAI 兼容的自托管提供商设置辅助程序 | | `plugin-sdk/cli-backend`CLI | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime`API | 用于提供商插件的运行时 API 密钥解析辅助程序 | | `plugin-sdk/provider-auth-api-key`API | API 密钥新手引导/配置文件写入辅助程序，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result`OAuth |
  标准 OAuth 认证结果构建器 | | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找辅助程序 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`，已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重放策略构建器、提供商端点辅助程序和共享模型 ID 标准化辅助程序 | | `plugin-sdk/provider-catalog-runtime` | 用于合约测试的提供商目录扩充运行时钩子和插件提供商注册接缝 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用提供商 HTTP/端点功能辅助程序、提供商 HTTP 错误和音频转录多部分表单辅助程序 | | `plugin-sdk/provider-web-fetch-contract` | 精简的 Web 获取配置/选择合约辅助程序，例如
  `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web 获取提供商注册/缓存辅助程序 | | `plugin-sdk/provider-web-search-config-contract` | 精简的 Web 搜索配置/凭据辅助程序，适用于不需要插件启用连接的提供商 | | `plugin-sdk/provider-web-search-contract` | 精简的 Web 搜索配置/凭据合约辅助程序，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | Web 搜索提供商注册/缓存/运行时辅助程序 | | `plugin-sdk/embedding-providers` | 通用嵌入提供商类型和读取辅助程序，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；插件通过
  `api.registerEmbeddingProvider(...)` 注册提供商，以便强制执行清单所有权 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`OpenAI 以及 DeepSeek/Gemini/OpenAI 架构清理 + 诊断 | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及类似内容 | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`AnthropicMoonshotOpenAIOpenRouterMiniMax、流包装器类型、纯文本工具调用兼容性以及共享的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助程序 | | `plugin-sdk/provider-stream-shared` | 公共共享提供商流包装器辅助程序，包括
  `composeProviderStreamWrappers`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper`AnthropicOpenAI 以及 Anthropic/DeepSeek/OpenAI 兼容的流实用程序 | | `plugin-sdk/provider-transport-runtime` | 原生提供商传输辅助程序，例如受保护的获取、传输消息转换和可写传输事件流 | | `plugin-sdk/provider-onboard` | 新手引导配置修补辅助程序 | |
  `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存辅助程序 | | `plugin-sdk/group-activation` | 精简的组激活模式和命令解析辅助程序 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，包括动态参数菜单格式化和发送方授权辅助函数在内的命令注册辅助函数 | | `plugin-sdk/command-status` | 命令/帮助消息构建器，如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 批准者解析和同会话操作授权辅助函数 | | `plugin-sdk/approval-client-runtime` |
  原生执行批准配置文件/过滤器辅助函数 | | `plugin-sdk/approval-delivery-runtime` | 原生批准能力/交付适配器 | | `plugin-sdk/approval-gateway-runtime` | 共享批准网关解析辅助函数 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热渠道入口点的轻量级原生批准适配器加载辅助函数 | | `plugin-sdk/approval-handler-runtime` | 更广泛的批准处理程序运行时辅助函数；当足够时，首选更窄的适配器/网关接口 | |
  `plugin-sdk/approval-native-runtime` | 原生批准目标 + 账户绑定辅助函数和本地原生执行提示抑制 | | `plugin-sdk/approval-reaction-runtime` | 硬编码批准反应绑定、反应提示负载、反应目标存储以及本地原生执行提示抑制的兼容性导出 | | `plugin-sdk/approval-reply-runtime` | 执行/插件批准回复负载辅助函数 | | `plugin-sdk/approval-runtime` |
  执行/插件批准负载辅助函数、原生批准路由/运行时辅助函数以及结构化批准显示辅助函数（如 `formatApprovalDisplayPath`）| | `plugin-sdk/reply-dedupe` | 窄入站回复去重重置辅助函数 | | `plugin-sdk/channel-contract-testing` | 窄渠道合约测试辅助函数，不包含广泛的测试桶 | | `plugin-sdk/command-auth-native` | 原生命令授权、动态参数菜单格式化和原生会话目标辅助函数 | | `plugin-sdk/command-detection` |
  共享命令检测辅助函数 | | `plugin-sdk/command-primitives-runtime` | 用于热渠道路径的轻量级命令文本谓词 | | `plugin-sdk/command-surface` | 命令主体规范化和命令表面辅助函数 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用于渠道/插件机密表面的窄机密合约收集辅助函数 | | `plugin-sdk/secret-ref-runtime` | 用于机密合约/配置解析的窄 `coerceSecretRef`
  和 SecretRef 类型辅助函数 | | `plugin-sdk/security-runtime` | 共享信任、私信 闸控、根边界文件/路径辅助函数，包括仅创建写入、同步/异步原子文件替换、同级临时写入、跨设备移动回退、私有文件存储辅助函数、符号链接父级守卫、外部内容、敏感文本编辑、恒定时间机密比较和机密收集辅助函数 | | `plugin-sdk/ssrf-policy` | 主机允许列表和专用网络 SSRF 策略辅助函数 | | `plugin-sdk/ssrf-dispatcher` |
  窄固定调度器辅助函数，不包含广泛的基础设施运行时表面 | | `plugin-sdk/ssrf-runtime` | 固定调度器、SSRF 保护提取、SSRF 错误和 SSRF 策略辅助函数 | | `plugin-sdk/secret-input` | 机密输入解析辅助函数 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标辅助函数和原始 websocket/主体强制转换 | | `plugin-sdk/webhook-request-guards` | 请求主体大小/超时辅助函数 |
</Accordion>

<Accordion title="运行时和存储子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/插件安装辅助工具 | | `plugin-sdk/runtime-env` | 窄范围的运行时环境、日志记录器、超时、重试和退避辅助工具 | | `plugin-sdk/browser-config` | 支持的浏览器配置外观，用于规范化配置文件/默认值、CDP URL 解析和浏览器控制身份验证辅助工具 | | `plugin-sdk/agent-harness-task-runtime` |
  通用任务生命周期和完成交付辅助工具，适用于使用主机发出的任务范围的支持工具的代理 | | `plugin-sdk/codex-mcp-projection` | 预留的捆绑 Codex 辅助工具，用于将用户 MCP 服务器配置投影到 Codex 线程配置中；不适用于第三方插件 | | `plugin-sdk/codex-native-task-runtime` | 私有的捆绑 Codex 辅助工具，用于本地任务镜像/运行时连接；不适用于第三方插件 | | `plugin-sdk/channel-runtime-context` |
  通用渠道运行时上下文注册和查找辅助工具 | | `plugin-sdk/matrix` | 已弃用的 Matrix 兼容性外观，用于较旧的第三方渠道包；新插件应直接导入 `plugin-sdk/run-command` | | `plugin-sdk/mattermost` | 已弃用的 Mattermost 兼容性外观，用于较旧的第三方渠道包；新插件应直接导入通用 SDK 子路径 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` |
  共享插件命令/钩子/http/交互辅助工具 | | `plugin-sdk/hook-runtime` | 共享 webhook/内部钩子管道辅助工具 | | `plugin-sdk/lazy-runtime` | 延迟运行时导入/绑定辅助工具，如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程执行辅助工具 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和延迟命令组辅助工具 | |
  `plugin-sdk/gateway-method-runtime` | 预留的 Gateway(网关) 方法调度辅助工具，用于声明 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由 | | `plugin-sdk/gateway-runtime` | Gateway(网关) 客户端、事件循环就绪的客户端启动辅助工具、网关 CLI RPC、网关协议错误和渠道状态修补辅助工具 | | `plugin-sdk/config-contracts` | 专注于仅限类型的配置表面，用于插件配置形状（如
  `OpenClawConfig`）和渠道/提供商配置类型 | | `plugin-sdk/plugin-config-runtime` | 运行时插件配置查找辅助工具，如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 事务性配置变更辅助工具，如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照辅助工具，如
  `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照设置器 | | `plugin-sdk/telegram-command-config` | Telegram 命令名称/描述规范化和重复/冲突检查，即使捆绑的 Telegram 合约表面不可用 | | `plugin-sdk/text-autolink-runtime` | 文件引用自动链接检测，不包含广泛的文本存储桶 | | `plugin-sdk/approval-reaction-runtime` |
  硬编码批准反应绑定、反应提示有效载荷、反应目标存储以及用于本地本机执行提示抑制的兼容性导出 | | `plugin-sdk/approval-runtime` | 执行/插件批准辅助工具、批准功能构建器、身份验证/配置文件辅助工具、本机路由/运行时辅助工具以及结构化批准显示路径格式化 | | `plugin-sdk/reply-runtime` | 共享传入/回复运行时辅助工具、分块、调度、心跳、回复规划器 | | `plugin-sdk/reply-dispatch-runtime` |
  窄范围回复调度/完成和对话标签辅助工具 | | `plugin-sdk/reply-history` | 共享短窗口回复历史辅助工具。新消息轮次代码应使用 `createChannelHistoryWindow`；较低级别的映射辅助工具仍仅为已弃用的兼容性导出 | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 窄范围文本/markdown 分块辅助工具 | | `plugin-sdk/session-store-runtime` |
  会话工作流辅助工具（`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`）、旧版会话存储路径/会话密钥辅助工具、更新时间读取和已弃用的整个存储变更辅助工具 | | `plugin-sdk/cron-store-runtime` | Cron 存储路径/加载/保存辅助工具 | | `plugin-sdk/state-paths` | 状态/OAuth 目录路径辅助工具 | | `plugin-sdk/plugin-state-runtime` | 插件 sidecar SQLite 键控状态类型 | |
  `plugin-sdk/routing` | 路由/会话密钥/账户绑定辅助工具，如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共享渠道/账户状态摘要辅助工具、运行时状态默认值和问题元数据辅助工具 | | `plugin-sdk/target-resolver-runtime` | 共享目标解析器辅助工具 | | `plugin-sdk/string-normalization-runtime` | Slug/字符串规范化辅助工具 | |
  `plugin-sdk/request-url` | 从类似 fetch/request 的输入中提取字符串 URL | | `plugin-sdk/run-command` | 带有规范化 stdout/stderr 结果的定时命令运行器 | | `plugin-sdk/param-readers` | 通用工具/CLI 参数读取器 | | `plugin-sdk/tool-plugin` | 定义一个简单的类型化代理工具插件并公开用于清单生成的静态元数据 | | `plugin-sdk/tool-payload` | 从工具结果对象中提取规范化有效载荷 | | `plugin-sdk/tool-send` |
  从工具参数中提取规范发送目标字段 | | `plugin-sdk/sandbox` | 沙箱后端类型和 SSH/OpenShell 命令辅助工具，包括快速失败的执行命令预检 | | `plugin-sdk/temp-path` | 共享临时下载路径辅助工具和私有安全临时工作区 | | `plugin-sdk/logging-core` | 子系统日志记录器和编辑辅助工具 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和转换辅助工具 | | `plugin-sdk/model-session-runtime` |
  模型/会话覆盖辅助工具，如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供商配置解析辅助工具 | | `plugin-sdk/json-store` | 小型 JSON 状态读/写辅助工具 | | `plugin-sdk/json-unsafe-integers` | 将不安全的整数文字保留为字符串的 JSON 解析辅助工具 | | `plugin-sdk/file-lock` | 可重入文件锁定辅助工具 | | `plugin-sdk/persistent-dedupe` |
  磁盘支持的去重缓存辅助工具 | | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复调度辅助工具 | | `plugin-sdk/acp-runtime-backend` | 用于启动加载插件的轻量级 ACP 后端注册和回复调度辅助工具 | | `plugin-sdk/acp-binding-resolve-runtime` | 只读 ACP 绑定解析，无需生命周期启动导入 | | `plugin-sdk/agent-config-primitives` | 窄范围代理运行时配置模式原语 | | `plugin-sdk/boolean-param` | 宽松布尔参数读取器
  | | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助工具 | | `plugin-sdk/device-bootstrap` | 设备引导和配对令牌辅助工具 | | `plugin-sdk/extension-shared` | 共享被动渠道、状态和环境代理助手原语 | | `plugin-sdk/models-provider-runtime` | `/models` 命令/提供商回复辅助工具 | | `plugin-sdk/skill-commands-runtime` | 技能命令列表辅助工具 | | `plugin-sdk/native-command-registry` |
  本机命令注册表/构建/序列化辅助工具 | | `plugin-sdk/agent-harness` | 用于底层代理工具的实验性可信插件表面：工具类型、活动运行引导/中止辅助工具、OpenClaw 工具桥接辅助工具、运行时计划工具策略辅助工具、终端结果分类、工具进度格式化/详细辅助工具以及尝试结果实用工具 | | `plugin-sdk/provider-zai-endpoint` | 已弃用的 Z.AI 提供商拥有的端点检测外观；请使用 Z.AI 插件公共 API | |
  `plugin-sdk/async-lock-runtime` | 用于小型运行时状态文件的进程本地异步锁定辅助工具 | | `plugin-sdk/channel-activity-runtime` | 渠道活动遥测辅助工具 | | `plugin-sdk/concurrency-runtime` | 有界异步任务并发辅助工具 | | `plugin-sdk/dedupe-runtime` | 内存中去重缓存辅助工具 | | `plugin-sdk/delivery-queue-runtime` | 出站待交付排空辅助工具 | | `plugin-sdk/file-access-runtime` |
  安全本地文件和媒体源路径辅助工具 | | `plugin-sdk/heartbeat-runtime` | 心跳唤醒、事件和可见性辅助工具 | | `plugin-sdk/number-runtime` | 数值强制辅助工具 | | `plugin-sdk/secure-random-runtime` | 安全令牌/UUID 辅助工具 | | `plugin-sdk/system-event-runtime` | 系统事件队列辅助工具 | | `plugin-sdk/transport-ready-runtime` | 传输就绪等待辅助工具 | | `plugin-sdk/exec-approvals-runtime` |
  执行批准策略文件辅助工具，不包含广泛的基础架构运行时存储桶 | | `plugin-sdk/infra-runtime` | 已弃用的兼容性垫片；请使用上述专注的运行时子路径 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 | | `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和跟踪上下文辅助工具 | | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助工具、`isApprovalNotFoundError` | |
  `plugin-sdk/fetch-runtime` | 包装的 fetch、代理、EnvHttpProxyAgent 选项和固定查找辅助工具 | | `plugin-sdk/runtime-fetch` | 调度程序感知的运行时获取，无需代理/受保护的 fetch 导入 | | `plugin-sdk/response-limit-runtime` | 有界响应正文读取器，不包含广泛的媒体运行时表面 | | `plugin-sdk/session-binding-runtime` | 当前对话绑定状态，无需配置的绑定路由或配对存储 | | `plugin-sdk/session-store-runtime` |
  会话存储辅助工具，无需广泛的配置写入/维护导入 | | `plugin-sdk/context-visibility-runtime` | 上下文可见性解析和补充上下文筛选，无需广泛的配置/安全性导入 | | `plugin-sdk/string-coerce-runtime` | 窄范围原语记录/字符串强制和规范化辅助工具，无需 markdown/日志记录导入 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机规范化辅助工具 | | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助工具 | |
  `plugin-sdk/agent-runtime` | 代理目录/身份/工作区辅助工具，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | | `plugin-sdk/directory-runtime` | 由配置支持的目录查询/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="功能和测试子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒体获取/转换/存储辅助工具，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已弃用的 `fetchRemoteMedia`OpenClaw；当 URL 应变为 OpenClaw 媒体时，相比缓冲区读取，优先使用存储辅助工具 | | `plugin-sdk/media-mime` | 狭义的 MIME 规范化、文件扩展名映射、MIME 检测和媒体类型辅助工具 | |
  `plugin-sdk/media-store` | 狭义的媒体存储辅助工具，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共享的媒体生成故障转移辅助工具、候选选择以及缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解提供程序类型以及面向提供程序的图像/音频/结构化提取辅助工具导出 | | `plugin-sdk/text-chunking` | 文本和 Markdown 分块/渲染辅助工具、Markdown
  表格转换、指令标签剥离和安全文本实用程序 | | `plugin-sdk/text-chunking` | 出站文本分块辅助工具 | | `plugin-sdk/speech`OpenAI | 语音提供程序类型以及面向提供程序的指令、注册表、验证、OpenAI 兼容的 TTS 构建器和语音辅助工具导出 | | `plugin-sdk/speech-core` | 共享的语音提供程序类型、注册表、指令、规范化和语音辅助工具导出 | | `plugin-sdk/realtime-transcription` |
  实时转录提供程序类型、注册表辅助工具和共享 WebSocket 会话辅助工具 | | `plugin-sdk/realtime-bootstrap-context` | 用于有界的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 上下文注入的实时配置文件引导辅助工具 | | `plugin-sdk/realtime-voice` | 实时语音提供程序类型、注册表辅助工具和共享的实时语音行为辅助工具，包括输出活动跟踪 | | `plugin-sdk/image-generation`OpenAI | 图像生成提供程序类型以及图像资产/数据 URL
  辅助工具和 OpenAI 兼容的图像提供程序构建器 | | `plugin-sdk/image-generation-core` | 共享的图像生成类型、故障转移、身份验证和注册表辅助工具 | | `plugin-sdk/music-generation` | 音乐生成提供程序/请求/结果类型 | | `plugin-sdk/music-generation-core` | 共享的音乐生成类型、故障转移辅助工具、提供程序查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供程序/请求/结果类型 | |
  `plugin-sdk/video-generation-core` | 共享的视频生成类型、故障转移辅助工具、提供程序查找和模型引用解析 | | `plugin-sdk/transcripts` | 共享的转录源提供程序类型、注册表辅助工具、会话描述符和话语元数据 | | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装辅助工具 | | `plugin-sdk/webhook-path` | 已弃用的兼容性别名；请使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` |
  共享的远程/本地媒体加载辅助工具 | | `plugin-sdk/zod` | 已弃用的兼容性重新导出；请直接从 `zod` 导入 `zod` | | `plugin-sdk/testing`OpenClaw | 仓库本地的已弃用兼容性聚合文件，用于旧版 OpenClaw 测试。新的仓库测试应改为导入集中的本地测试子路径，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或
  `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 仓库本地的最小化 `createTestPluginApi` 辅助工具，用于直接插件注册单元测试，无需导入仓库测试辅助工具桥接器 | | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地的原生 agent-runtime 适配器合约固定装置，用于身份验证、传递、故障转移、工具挂钩、提示覆盖、架构和转录投影测试 | | `plugin-sdk/channel-test-helpers` |
  仓库本地的面向渠道的测试辅助工具，用于通用操作/设置/状态合约、目录断言、帐户启动生命周期、发送配置线程、运行时模拟、状态问题、出站传递和挂钩注册 | | `plugin-sdk/channel-target-testing` | 仓库本地的共享目标解析错误案例套件，用于渠道测试 | | `plugin-sdk/plugin-test-contracts`API | 仓库本地的插件包、注册、公共工件、直接导入、运行时 API 和导入副作用合约辅助工具 | |
  `plugin-sdk/provider-test-contracts` | 仓库本地的提供程序运行时、身份验证、发现、入门、目录、向导、媒体能力、重放策略、实时 STT 实时音频、Web 搜索/获取和流合约辅助工具 | | `plugin-sdk/provider-http-test-mocks` | 仓库本地的可选 Vitest HTTP/身份验证模拟，用于执行 `plugin-sdk/provider-http` 的提供程序测试 | | `plugin-sdk/test-fixtures`CLI | 仓库本地的通用 CLI
  运行时捕获、沙盒上下文、技能编写器、代理消息、系统事件、模块重新加载、捆绑插件路径、终端文本、分块、身份验证令牌和类型化案例固定装置 | | `plugin-sdk/test-node-mocks` | 仓库本地的集中式 Node 内置模拟辅助工具，用于 Vitest `vi.mock("node:*")` 工厂内部 |
</Accordion>

<Accordion title="Memory 子路径">
  | 子路径 | 关键导出 | | --- | --- | | `plugin-sdk/memory-core`CLI | 用于 manager/config/file/CLI 助手的捆绑 memory-core 助手表面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory
  主机嵌入合约、注册表访问、本地提供商和通用批处理/远程助手。此表面上的 `registerMemoryEmbeddingProvider`API 已弃用；对于新的提供商，请使用通用嵌入提供商 API。 | | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | |
  `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机密钥助手 | | `plugin-sdk/memory-core-host-events` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | | `plugin-sdk/memory-core-host-runtime-cli`CLI | Memory 主机 CLI 运行时助手 | |
  `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | Memory 主机核心运行时助手的供应商中立别名 | | `plugin-sdk/memory-host-events` | Memory 主机事件日志助手的供应商中立别名 | | `plugin-sdk/memory-host-files` | 已弃用的兼容性别名；请使用
  `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 用于 Memory 相邻插件的共享托管 Markdown 助手 | | `plugin-sdk/memory-host-search` | 用于搜索管理器访问的活动 Memory 运行时外观 | | `plugin-sdk/memory-host-status` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    保留的捆绑辅助 SDK 子路径是针对捆绑插件代码的特定于所有者的狭窄表面。它们在 SDK 清单中进行跟踪，以便包构建和别名保持确定性，但它们不是通用的插件编写 API。新的可重用主机契约应使用通用 SDK 子路径，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

    | Subpath | Owner and purpose |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | 用于将用户 MCP 服务器配置投影到 Codex 应用服务器线程配置的捆绑 Codex 插件辅助工具 |
    | `plugin-sdk/codex-native-task-runtime` | 用于将 Codex 应用服务器原生子代理镜像到 OpenClaw 任务状态的捆绑 Codex 插件辅助工具 |

  </Accordion>
</AccordionGroup>

## 相关

- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件 SDK 设置](/zh/plugins/sdk-setup)
- [构建插件](/zh/plugins/building-plugins)
