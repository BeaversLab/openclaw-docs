---
summary: "Plugin SDK 子路径目录：各导入项位于何处，按区域分组"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路径"
---

插件 SDK 作为一组位于 `openclaw/plugin-sdk/` 下的狭义公共子路径暴露出来。本页面按用途分类列出了常用的子路径。生成的编译器入口清单位于 `scripts/lib/plugin-sdk-entrypoints.json`；包导出是在减去 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的仓库本地测试/内部子路径后的公共子集。维护者可以使用 `pnpm plugin-sdk:surface` 审计公共导出计数，并使用 `pnpm plugins:boundary-report:summary` 审计活动保留的助手子路径；未使用的保留助手导出会导致 CI 报告失败，而不是作为休眠的兼容性债务保留在公共 SDK 中。

有关插件编写指南，请参阅 [Plugin SDK overview](/zh/plugins/sdk-overview)。

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
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`，`defineSetupPluginEntry`，`createChatChannelPlugin`，`createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 导出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 用于插件自有 schema 的缓存 JSON Schema 验证辅助函数 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`，`createOptionalChannelSetupAdapter`，`createOptionalChannelSetupWizard`，外加 `DEFAULT_ACCOUNT_ID`，`createTopLevelChannelDmPolicy`，`setSetupChannelEnabled`，`splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导辅助函数、设置翻译器、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`，`createPatchedAccountSetupAdapter`，`createEnvPatchedAccountSetupAdapter`，`createSetupInputPresenceValidator`，`noteChannelLookupFailure`，`noteChannelLookupSummary`，`promptResolvedAllowFrom`，`splitSetupEntries`，`createAllowlistSetupWizardProxy`，`createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已弃用的兼容性别名；请使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`，`detectBinary`，`extractArchive`，`resolveBrewExecutable`，`formatDocsLink`，`CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作网关辅助函数、默认账户回退辅助函数 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`，账户 ID 规范化辅助函数 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退辅助函数 |
    | `plugin-sdk/account-helpers` | 窄范围账户列表/账户操作辅助函数 |
    | `plugin-sdk/access-groups` | 访问组允许列表解析和已编辑组诊断辅助函数 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`，`resolveChannelDmAccess`，`resolveChannelDmAllowFrom`，`resolveChannelDmPolicy`，`normalizeChannelDmPolicy`，`normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享渠道配置 schema 基元以及 Zod 和直接 JSON/TypeBox 构建器 |
    | `plugin-sdk/bundled-channel-config-schema` | 捆绑的 OpenClaw 渠道配置 schema，仅适用于受维护的捆绑插件 |
    | `plugin-sdk/chat-channel-ids` | `BUNDLED_CHAT_CHANNEL_IDS`，`BUNDLED_CHAT_CHANNEL_ENVELOPE_PREFIXES`，`ChatChannelId`。规范化的捆绑/官方聊天渠道 ID，以及格式化标签/别名，供需要识别带信封前缀文本且无需硬编码自己的表格的插件使用。 |
    | `plugin-sdk/channel-config-schema-legacy` | 捆绑渠道配置 schema 的已弃用兼容性别名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自定义命令规范化/验证辅助函数，带有捆绑契约回退 |
    | `plugin-sdk/command-gating` | 窄范围命令授权网关辅助函数 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已弃用的低级渠道入口兼容性外观。新的接收路径应使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 用于迁移渠道接收路径的实验性高级渠道入口运行时解析器和路由事实构建器。相比在每个插件中组装有效允许列表、命令允许列表和旧版投影，推荐使用此功能。请参阅[渠道入口 API](/zh/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-outbound` | 消息生命周期契约以及回复管道选项、回执、实时预览/流式传输、生命周期辅助函数、出站身份、负载规划、持久发送和消息发送上下文辅助函数。请参阅[渠道出站 API](/zh/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/channel-message` | `plugin-sdk/channel-outbound` 的已弃用兼容性别名，外加旧版回复调度外观。 |
    | `plugin-sdk/channel-message-runtime` | `plugin-sdk/channel-outbound` 的已弃用兼容性别名，外加旧版回复调度外观。 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器辅助函数 |
    | `plugin-sdk/inbound-reply-dispatch` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-inbound` 进行入站运行器和调度谓词处理，并使用 `plugin-sdk/channel-outbound` 进行消息传递辅助处理。 |
    | `plugin-sdk/messaging-targets` | 已弃用的目标解析别名；请使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载辅助函数 |
    | `plugin-sdk/outbound-send-deps` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/outbound-runtime` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/poll-runtime` | 窄范围投票规范化辅助函数 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器辅助函数 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 会话/线程绑定、配对和配置绑定辅助函数 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照辅助函数 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析辅助函数 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要辅助函数 |
    | `plugin-sdk/channel-config-primitives` | 窄范围渠道配置 schema 基元 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权辅助函数 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取辅助函数 |
    | `plugin-sdk/group-access` | 共享组访问决策辅助函数 |
    | `plugin-sdk/direct-dm`，`plugin-sdk/direct-dm-access` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-inbound`。 |
    | `plugin-sdk/direct-dm-guard-policy` | 窄范围直接私信 (私信) 预加密守卫策略辅助函数 |
    | `plugin-sdk/discord` | 针对已发布的 `@openclaw/discord@2026.3.13` 和跟踪的所有者兼容性的已弃用 Discord 兼容性外观；新插件应使用通用渠道 SDK 子路径 |
    | `plugin-sdk/telegram-account` | 针对跟踪的所有者兼容性的已弃用 Telegram 账户解析兼容性外观；新插件应使用注入的运行时辅助函数或通用渠道 SDK 子路径 |
    | `plugin-sdk/zalouser` | 针对仍然导入发送者命令授权的已发布 Lark/Zalo 包的已弃用 Zalo 个人版兼容性外观；新插件应使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 语义消息呈现、传递和旧版交互式回复辅助函数。请参阅[消息呈现](/zh/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用于事件分类、上下文构建、格式化、根节点、防抖、提及匹配、提及策略和入站日志记录的共享入站辅助函数 |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围入站防抖辅助函数 |
    | `plugin-sdk/channel-mention-gating` | 不包含更广泛入站运行时表面的窄范围提及策略、提及标记和提及文本辅助函数 |
    | `plugin-sdk/channel-envelope`，`plugin-sdk/channel-inbound-roots`，`plugin-sdk/channel-location`，`plugin-sdk/channel-logging` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-inbound` 或 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-pairing-paths` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-pairing`。 |
    | `plugin-sdk/channel-reply-options-runtime` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-streaming` | 已弃用的兼容性外观。请使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 渠道消息操作辅助函数，外加为插件兼容性而保留的已弃用原生 schema 辅助函数 |
    | `plugin-sdk/channel-route` | 共享路由规范化、解析器驱动的目标解析、线程 ID 字符串化、去重/压缩路由键、已解析目标类型以及路由/目标比较辅助函数 |
    | `plugin-sdk/channel-targets` | 目标解析辅助函数；路由比较调用者应使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 渠道契约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连接 |
    | `plugin-sdk/channel-secret-runtime` | 窄范围秘密契约辅助函数，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和秘密目标类型 |
  </Accordion>

已弃用的渠道辅助函数系列仅为了发布插件的兼容性而保留。移除计划如下：在外部插件迁移期间保留它们，保持仓库/捆绑插件使用 `channel-inbound` 和 `channel-outbound`，然后在下一次主要的 SDK 清理中移除这些兼容性子路径。这适用于旧的渠道消息/运行时、渠道流式传输、直接私信访问、入站辅助函数拆分、回复选项和配对路径系列。

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支持设置、目录发现和运行时模型准备的 LM Studio 提供商外观 | | `plugin-sdk/lmstudio-runtime` | 支持本地服务器默认值、模型发现、请求标头和已加载模型助手工具的 LM Studio 运行时外观 | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置助手工具 | |
  `plugin-sdk/self-hosted-provider-setup` | 专用于 OpenAI 兼容的自托管提供商设置助手工具 | | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析助手工具 | | `plugin-sdk/provider-oauth-runtime` | 通用提供商 OAuth 回调类型、回调页面渲染、PKCE/状态助手工具、授权输入解析、令牌过期助手工具和中止助手工具 | |
  `plugin-sdk/provider-auth-api-key` | API 密钥新手引导/配置文件写入助手工具，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 标准 OAuth 身份验证结果构建器 | | `plugin-sdk/provider-env-vars` | 提供商身份验证环境变量查找助手工具 | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、OpenAI Codex 身份验证导入助手工具、已弃用的 `resolveOpenClawAgentDir` 兼容性导出 | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重放策略构建器、提供商端点助手工具和共享模型 ID
  规范化助手工具 | | `plugin-sdk/provider-catalog-runtime` | 用于合同测试的提供商目录扩充运行时钩子和插件提供商注册表接缝 | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用提供商
  HTTP/端点能力助手工具、提供商 HTTP 错误和音频转录多部分表单助手工具 | | `plugin-sdk/provider-web-fetch-contract` | 精简的 Web 获取配置/选择合同助手工具，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web 获取提供商注册/缓存助手工具 | | `plugin-sdk/provider-web-search-config-contract` | 适用于不需要插件启用接线的提供商的精简 Web 搜索配置/凭据助手工具
  | | `plugin-sdk/provider-web-search-contract` | 精简的 Web 搜索配置/凭据合同助手工具，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | Web 搜索提供商注册/缓存/运行时助手工具 | | `plugin-sdk/embedding-providers` | 通用嵌入提供商类型和读取助手工具，包括
  `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；插件通过 `api.registerEmbeddingProvider(...)` 注册提供商，以便强制执行清单所有权 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 以及 DeepSeek/Gemini/OpenAI 架构清理 + 诊断 | | `plugin-sdk/provider-usage` |
  提供商使用快照类型、共享使用获取助手工具以及提供商获取器，例如 `fetchClaudeUsage` | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型、纯文本工具调用兼容性以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器助手工具 | |
  `plugin-sdk/provider-stream-shared` | 公共共享提供商流包装器助手工具，包括 `composeProviderStreamWrappers`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper` 以及 Anthropic/DeepSeek/OpenAI 兼容的流实用工具 | | `plugin-sdk/provider-transport-runtime` | 原生提供商传输助手工具，例如受保护的获取、传输消息转换和可写传输事件流 | |
  `plugin-sdk/provider-onboard` | 新手引导配置修补助手工具 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存助手工具 | | `plugin-sdk/group-activation` | 精简的组激活模式和命令解析助手工具 |
</Accordion>

Provider 使用情况快照通常会报告一个或多个配额 `windows`，每个配额都带有标签、已使用百分比和可选的重置时间。如果 Provider 暴露的是余额或账户状态文本，而不是可重置的配额窗口，则应返回 `summary` 并带有空的 `windows` 数组，而不是伪造百分比。OpenClaw 在状态输出中显示该摘要文本；仅当使用端点失败或未返回可用的使用数据时，才使用 `error`。

<Accordion title="身份与安全子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册助手，包括动态参数菜单格式化、发送方授权助手 | | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 审批者解析和同会话操作授权助手 | | `plugin-sdk/approval-client-runtime` |
  原生执行审批配置/过滤器助手 | | `plugin-sdk/approval-delivery-runtime` | 原生审批能力/交付适配器 | | `plugin-sdk/approval-gateway-runtime` | 共享审批网关解析助手 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热渠道入口点的轻量级原生审批适配器加载助手 | | `plugin-sdk/approval-handler-runtime` | 更广泛的审批处理程序运行时助手；当它们足够时，请优先使用更窄的适配器/网关接口 | |
  `plugin-sdk/approval-native-runtime` | 原生审批目标、帐户绑定、路由门控、转发回退以及本地原生执行提示抑制助手 | | `plugin-sdk/approval-reaction-runtime` | 硬编码审批反应绑定、反应提示载荷、反应目标存储，以及用于本地原生执行提示抑制的兼容性导出 | | `plugin-sdk/approval-reply-runtime` | 执行/插件审批回复载荷助手 | | `plugin-sdk/approval-runtime` |
  执行/插件审批载荷助手、原生审批路由/运行时助手，以及结构化审批显示助手（如 `formatApprovalDisplayPath`）| | `plugin-sdk/reply-dedupe` | 窄入站回复去重重置助手 | | `plugin-sdk/channel-contract-testing` | 不包含广泛测试桶的窄渠道契约测试助手 | | `plugin-sdk/command-auth-native` | 原生命令授权、动态参数菜单格式化和原生会话目标助手 | | `plugin-sdk/command-detection` | 共享命令检测助手 | |
  `plugin-sdk/command-primitives-runtime` | 用于热渠道路径的轻量级命令文本谓词 | | `plugin-sdk/command-surface` | 命令主体规范化和命令表面助手 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用于渠道/插件机密表面的窄机密契约收集助手 | | `plugin-sdk/secret-ref-runtime` | 用于机密契约/配置解析的窄 `coerceSecretRef` 和 SecretRef 类型助手 | |
  `plugin-sdk/secret-provider-integration` | 仅类型的 SecretRef 提供商集成清单和预设契约，适用于发布外部机密提供商预设的插件 | | `plugin-sdk/security-runtime` | 共享信任、私信门控、根绑定文件/路径助手，包括仅创建写入、同步/异步原子文件替换、同级临时写入、跨设备移动回退、私有文件存储助手、符号链接父级保护、外部内容、敏感文本编辑、恒定时间机密比较和机密收集助手 | | `plugin-sdk/ssrf-policy` |
  主机允许列表和专用网络 SSRF 策略助手 | | `plugin-sdk/ssrf-dispatcher` | 不包含广泛基础架构运行时表面的窄固定分发器助手 | | `plugin-sdk/ssrf-runtime` | 固定分发器、SSRF 保护获取、SSRF 错误和 SSRF 策略助手 | | `plugin-sdk/secret-input` | 机密输入解析助手 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标助手和原始 websocket/主体强制转换 | | `plugin-sdk/webhook-request-guards` |
  请求主体大小/超时助手 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Broad runtime/logging/backup/plugin-install helpers | | `plugin-sdk/runtime-env` | Narrow runtime env, logger, timeout, retry, and backoff helpers | | `plugin-sdk/browser-config` | Supported browser config facade for normalized profile/defaults, CDP URL parsing, and browser-control auth helpers | |
  `plugin-sdk/agent-harness-task-runtime` | Generic task lifecycle and completion delivery helpers for harness-backed agents using a host-issued task scope | | `plugin-sdk/codex-mcp-projection` | Reserved bundled Codex helper for projecting user MCP server config into Codex thread config; not for third-party plugins | | `plugin-sdk/codex-native-task-runtime` | Private bundled Codex helper for
  native task mirror/runtime wiring; not for third-party plugins | | `plugin-sdk/channel-runtime-context` | Generic 渠道 runtime-context registration and lookup helpers | | `plugin-sdk/matrix` | Deprecated Matrix compatibility facade for older third-party 渠道 packages; new plugins should import `plugin-sdk/run-command` directly | | `plugin-sdk/mattermost` | Deprecated Mattermost compatibility
  facade for older third-party 渠道 packages; new plugins should import generic SDK subpaths directly | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Shared plugin command/hook/http/interactive helpers | | `plugin-sdk/hook-runtime` | Shared webhook/internal hook pipeline helpers | | `plugin-sdk/lazy-runtime` | Lazy runtime import/binding helpers such
  as `createLazyRuntimeModule`, `createLazyRuntimeMethod`, and `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec helpers | | `plugin-sdk/cli-runtime` | CLI formatting, wait, version, argument-invocation, and lazy command-group helpers | | `plugin-sdk/qa-live-transport-scenarios` | Shared live transport QA scenario ids, baseline coverage helpers, and scenario-selection
  helper | | `plugin-sdk/gateway-method-runtime` | Reserved Gateway(网关) method dispatch helper for plugin HTTP routes that declare `contracts.gatewayMethodDispatch: ["authenticated-request"]` | | `plugin-sdk/gateway-runtime` | Gateway(网关) client, event-loop-ready client start helper, gateway CLI RPC, gateway protocol errors, and 渠道-status patch helpers | | `plugin-sdk/config-contracts` |
  Focused type-only config surface for plugin config shapes such as `OpenClawConfig` and 渠道/提供商 config types | | `plugin-sdk/plugin-config-runtime` | Runtime plugin-config lookup helpers such as `requireRuntimeConfig`, `resolvePluginConfigObject`, and `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Transactional config mutation helpers such as `mutateConfigFile`,
  `replaceConfigFile`, and `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | Current process config snapshot helpers such as `getRuntimeConfig`, `getRuntimeConfigSnapshot`, and test snapshot setters | | `plugin-sdk/telegram-command-config` | Telegram command-name/description normalization and duplicate/conflict checks, even when the bundled Telegram contract surface is unavailable | |
  `plugin-sdk/text-autolink-runtime` | File-reference autolink detection without the broad text barrel | | `plugin-sdk/approval-reaction-runtime` | Hardcoded approval reaction bindings, reaction prompt payloads, reaction target stores, and compatibility export for local native exec prompt suppression | | `plugin-sdk/approval-runtime` | Exec/plugin approval helpers, approval-capability builders,
  auth/profile helpers, native routing/runtime helpers, and structured approval display path formatting | | `plugin-sdk/reply-runtime` | Shared inbound/reply runtime helpers, chunking, dispatch, heartbeat, reply planner | | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch/finalize and conversation-label helpers | | `plugin-sdk/reply-history` | Shared short-window reply-history helpers.
  New message-turn code should use `createChannelHistoryWindow`; lower-level map helpers remain deprecated compatibility exports only | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Narrow text/markdown chunking helpers | | `plugin-sdk/session-store-runtime` | Session workflow helpers (`getSessionEntry`, `listSessionEntries`, `patchSessionEntry`,
  `upsertSessionEntry`), legacy 会话 store path/会话-key helpers, updated-at reads, and deprecated whole-store mutation helpers | | `plugin-sdk/cron-store-runtime` | Cron store path/load/save helpers | | `plugin-sdk/state-paths` | State/OAuth dir path helpers | | `plugin-sdk/plugin-state-runtime` | Plugin sidecar SQLite keyed-state types | | `plugin-sdk/routing` | Route/会话-key/account binding
  helpers such as `resolveAgentRoute`, `buildAgentSessionKey`, and `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Shared 渠道/account status summary helpers, runtime-state defaults, and issue metadata helpers | | `plugin-sdk/target-resolver-runtime` | Shared target resolver helpers | | `plugin-sdk/string-normalization-runtime` | Slug/string normalization helpers | |
  `plugin-sdk/request-url` | Extract string URLs from fetch/request-like inputs | | `plugin-sdk/run-command` | Timed command runner with normalized stdout/stderr results | | `plugin-sdk/param-readers` | Common 工具/CLI param readers | | `plugin-sdk/tool-plugin` | Define a simple typed agent-工具 plugin and expose static metadata for manifest generation | | `plugin-sdk/tool-payload` | Extract
  normalized payloads from 工具 result objects | | `plugin-sdk/tool-send` | Extract canonical send target fields from 工具 args | | `plugin-sdk/sandbox` | 沙箱 backend types and SSH/OpenShell command helpers, including fail-fast exec command preflight | | `plugin-sdk/temp-path` | Shared temp-download path helpers and private secure temp workspaces | | `plugin-sdk/logging-core` | Subsystem logger
  and redaction helpers | | `plugin-sdk/markdown-table-runtime` | Markdown table mode and conversion helpers | | `plugin-sdk/model-session-runtime` | Model/会话 override helpers such as `applyModelOverrideToSessionEntry` and `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供商 config resolution helpers | | `plugin-sdk/json-store` | Small JSON state read/write helpers | |
  `plugin-sdk/json-unsafe-integers` | JSON parsing helpers that preserve unsafe integer literals as strings | | `plugin-sdk/file-lock` | Re-entrant file-lock helpers | | `plugin-sdk/persistent-dedupe` | Disk-backed dedupe cache helpers | | `plugin-sdk/acp-runtime` | ACP runtime/会话 and reply-dispatch helpers | | `plugin-sdk/acp-runtime-backend` | Lightweight ACP backend registration and
  reply-dispatch helpers for startup-loaded plugins | | `plugin-sdk/acp-binding-resolve-runtime` | Read-only ACP binding resolution without lifecycle startup imports | | `plugin-sdk/agent-config-primitives` | Narrow agent runtime config-schema primitives | | `plugin-sdk/boolean-param` | Loose boolean param reader | | `plugin-sdk/dangerous-name-runtime` | Dangerous-name matching resolution helpers
  | | `plugin-sdk/device-bootstrap` | Device bootstrap and pairing token helpers | | `plugin-sdk/extension-shared` | Shared passive-渠道, status, and ambient proxy helper primitives | | `plugin-sdk/models-provider-runtime` | `/models` command/提供商 reply helpers | | `plugin-sdk/skill-commands-runtime` | Skill command listing helpers | | `plugin-sdk/native-command-registry` | Native command
  registry/build/serialize helpers | | `plugin-sdk/agent-harness` | Experimental trusted-plugin surface for low-level agent harnesses: harness types, active-run steer/abort helpers, OpenClaw 工具 bridge helpers, runtime-plan 工具 policy helpers, terminal outcome classification, 工具 progress formatting/detail helpers, and attempt result utilities | | `plugin-sdk/provider-zai-endpoint` | Deprecated
  Z.AI 提供商-owned endpoint detection facade; use the Z.AI plugin public API | | `plugin-sdk/async-lock-runtime` | Process-local async lock helper for small runtime state files | | `plugin-sdk/channel-activity-runtime` | Channel activity telemetry helper | | `plugin-sdk/concurrency-runtime` | Bounded async task concurrency helper | | `plugin-sdk/dedupe-runtime` | In-memory dedupe cache helpers |
  | `plugin-sdk/delivery-queue-runtime` | Outbound pending-delivery drain helper | | `plugin-sdk/file-access-runtime` | Safe local-file and media-source path helpers | | `plugin-sdk/heartbeat-runtime` | Heartbeat wake, event, and visibility helpers | | `plugin-sdk/number-runtime` | Numeric coercion helper | | `plugin-sdk/secure-random-runtime` | Secure token/UUID helpers | |
  `plugin-sdk/system-event-runtime` | System event queue helpers | | `plugin-sdk/transport-ready-runtime` | Transport readiness wait helper | | `plugin-sdk/exec-approvals-runtime` | Exec approval policy file helpers without the broad infra-runtime barrel | | `plugin-sdk/infra-runtime` | Deprecated compatibility shim; use the focused runtime subpaths above | | `plugin-sdk/collection-runtime` |
  Small bounded cache helpers | | `plugin-sdk/diagnostic-runtime` | Diagnostic flag, event, and trace-context helpers | | `plugin-sdk/error-runtime` | Error graph, formatting, shared error classification helpers, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Wrapped fetch, proxy, EnvHttpProxyAgent option, and pinned lookup helpers | | `plugin-sdk/runtime-fetch` | Dispatcher-aware
  runtime fetch without proxy/guarded-fetch imports | | `plugin-sdk/inline-image-data-url-runtime` | Inline image data URL sanitizer and signature sniffing helpers without the broad media runtime surface | | `plugin-sdk/response-limit-runtime` | Bounded response-body reader without the broad media runtime surface | | `plugin-sdk/session-binding-runtime` | Current conversation binding state without
  configured binding routing or pairing stores | | `plugin-sdk/session-store-runtime` | Session-store helpers without broad config writes/maintenance imports | | `plugin-sdk/context-visibility-runtime` | Context visibility resolution and supplemental context filtering without broad config/security imports | | `plugin-sdk/string-coerce-runtime` | Narrow primitive record/string coercion and
  normalization helpers without markdown/logging imports | | `plugin-sdk/host-runtime` | Hostname and SCP host normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers, including `resolveAgentDir`, `resolveDefaultAgentDir`, and deprecated `resolveOpenClawAgentDir` compatibility export | |
  `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒体获取/转换/存储辅助函数，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已弃用的 `fetchRemoteMedia`OpenClaw；当 URL 应变成 OpenClaw 媒体时，优先使用存储辅助函数而非缓冲区读取 | | `plugin-sdk/media-mime` | 狭义的 MIME 标准化、文件扩展名映射、MIME 检测和媒体类型辅助函数 | |
  `plugin-sdk/media-store` | 狭义的媒体存储辅助函数，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共享的媒体生成故障转移辅助函数、候选选择和缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解提供商类型以及面向提供商的图像/音频/结构化提取辅助函数导出 | | `plugin-sdk/text-chunking` | 文本和 Markdown 分块/渲染辅助函数、Markdown
  表格转换、指令标签剥离和安全文本实用程序 | | `plugin-sdk/text-chunking` | 出站文本分块辅助函数 | | `plugin-sdk/speech`OpenAI | 语音提供商类型以及面向提供商的指令、注册表、验证、OpenAI 兼容的 TTS 构建器和语音辅助函数导出 | | `plugin-sdk/speech-core` | 共享的语音提供商类型、注册表、指令、标准化和语音辅助函数导出 | | `plugin-sdk/realtime-transcription` | 实时转录提供商类型、注册表辅助函数和共享的
  WebSocket 会话辅助函数 | | `plugin-sdk/realtime-bootstrap-context` | 实时配置引导辅助函数，用于有界的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 上下文注入 | | `plugin-sdk/realtime-voice` | 实时语音提供商类型、注册表辅助函数和共享的实时语音行为辅助函数，包括输出活动跟踪 | | `plugin-sdk/image-generation`OpenAI | 图像生成提供商类型以及图像资产/数据 URL 辅助函数和 OpenAI 兼容的图像提供商构建器 | |
  `plugin-sdk/image-generation-core` | 共享的图像生成类型、故障转移、身份验证和注册表辅助函数 | | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` | 共享的音乐生成类型、故障转移辅助函数、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` |
  共享的视频生成类型、故障转移辅助函数、提供商查找和模型引用解析 | | `plugin-sdk/transcripts` | 共享的转录源提供商类型、注册表辅助函数、会话描述符和话语元数据 | | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装辅助函数 | | `plugin-sdk/webhook-path` | 已弃用的兼容性别名；请使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共享的远程/本地媒体加载辅助函数 | | `plugin-sdk/zod`
  | 已弃用的兼容性重新导出；请直接从 `zod` 导入 `zod` | | `plugin-sdk/testing`OpenClaw | 仓库本地的已弃用兼容性容器，用于旧版 OpenClaw 测试。新的仓库测试应改为导入聚焦的本地测试子路径，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` |
  仓库本地的最小化 `createTestPluginApi` 辅助函数，用于在不导入仓库测试辅助函数桥接的情况下进行直接插件注册单元测试 | | `plugin-sdk/agent-runtime-test-contracts` | 仓库本地的原生 agent-runtime 适配器合约装置，用于身份验证、交付、故障转移、工具挂钩、提示覆盖、架构和转录投影测试 | | `plugin-sdk/channel-test-helpers` |
  仓库本地的面向渠道的测试辅助函数，用于通用操作/设置/状态合约、目录断言、帐户启动生命周期、发送配置线程、运行时模拟、状态问题、出站交付和挂钩注册 | | `plugin-sdk/channel-target-testing` | 仓库本地的共享目标解析错误情况套件，用于渠道测试 | | `plugin-sdk/plugin-test-contracts`API | 仓库本地的插件包、注册、公共构件、直接导入、运行时 API 和导入副作用合约辅助函数 | |
  `plugin-sdk/provider-test-contracts` | 仓库本地的提供商运行时、身份验证、发现、载入、目录、向导、媒体能力、重放策略、实时 STT 实时音频、Web 搜索/获取和流合约辅助函数 | | `plugin-sdk/provider-http-test-mocks` | 仓库本地的可选 Vitest HTTP/身份验证模拟，用于执行 `plugin-sdk/provider-http` 的提供商测试 | | `plugin-sdk/test-fixtures`CLI | 仓库本地的通用 CLI
  运行时捕获、沙箱上下文、技能写入器、代理消息、系统事件、模块重新加载、捆绑插件路径、终端文本、分块、身份验证令牌和类型化案例装置 | | `plugin-sdk/test-node-mocks` | 仓库本地的聚焦 Node 内置模拟辅助函数，用于在 Vitest `vi.mock("node:*")` 工厂内部使用 |
</Accordion>

<Accordion title="Memory 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/memory-core` | 用于 manager/config/file/CLI 助手的打包 memory-core 助手表面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-embedding-registry` | 轻量级 memory embedding API 注册助手 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主机 embedding 契约、注册访问、本地提供商以及通用批处理/远程助手。此表面上的 `registerMemoryEmbeddingProvider` 已弃用；对于新提供商，请使用通用 embedding CLI API。 | | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | |
  `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机密钥助手 | | `plugin-sdk/memory-core-host-events` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | |
  `plugin-sdk/memory-core-host-runtime-cli` | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | Memory 主机核心运行时助手的供应商中立别名 | | `plugin-sdk/memory-host-events` | Memory 主机事件日志助手的供应商中立别名 | |
  `plugin-sdk/memory-host-files` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 用于 memory 相邻插件的共享托管 Markdown 助手 | | `plugin-sdk/memory-host-search` | 用于搜索管理器访问的活动 memory 运行时外观 | | `plugin-sdk/memory-host-status` | 已弃用的兼容性别名；请使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    保留的捆绑助手 SDK 子路径是捆绑插件代码的特定所有者窄接口。它们在 SDK 清单中跟踪，以便包构建和别名保持确定性，但它们不是通用的插件编写 API。新的可重用主机协定应使用通用 SDK 子路径，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

    | 子路径 | 所有者和用途 |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | 捆绑的 Codex 插件助手，用于将用户 MCP 服务器配置投射到 Codex 应用服务器线程配置 |
    | `plugin-sdk/codex-native-task-runtime` | 捆绑的 Codex 插件助手，用于将 Codex 应用服务器原生子代理镜像到 OpenClaw 任务状态 |

  </Accordion>
</AccordionGroup>

## 相关

- [Plugin SDK 概述](/zh/plugins/sdk-overview)
- [Plugin SDK 设置](/zh/plugins/sdk-setup)
- [构建插件](/zh/plugins/building-plugins)
