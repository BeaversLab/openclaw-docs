---
summary: "Plugin SDK 子路径目录：各导入项位于何处，按区域分组"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路径"
---

插件 SDK 作为 `openclaw/plugin-sdk/` 下的一组窄子路径公开。
本页按用途分类列出了常用的子路径。生成的包含 200 多个子路径的完整列表位于 `scripts/lib/plugin-sdk-entrypoints.json`；
保留的捆绑插件辅助子路径也出现在那里，但除非文档页面明确推荐，否则它们是实现细节。

有关插件创作指南，请参阅 [Plugin SDK overview](/zh/plugins/sdk-overview)。

## 插件入口

| 子路径                         | 主要导出                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema` |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                      |
| `plugin-sdk/migration`         | 迁移提供商项目辅助工具（如 `createMigrationItem`）、原因常量、项目状态标记、编辑辅助工具以及 `summarizeMigrationItems`                 |
| `plugin-sdk/migration-runtime` | 运行时迁移辅助工具，例如 `copyMigrationFileItem` 和 `writeMigrationReport`                                                             |

<AccordionGroup>
  <Accordion title="渠道子路径">
    | 子路径 | 主要导出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 模式导出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享设置向导辅助函数、允许列表提示、设置状态构建器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多账户配置/操作门控辅助函数，默认账户回退辅助函数 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`，账户 ID 规范化辅助函数 |
    | `plugin-sdk/account-resolution` | 账户查找 + 默认回退辅助函数 |
    | `plugin-sdk/account-helpers` | 窄范围账户列表/账户操作辅助函数 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 共享渠道配置模式原语和通用构建器 |
    | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑渠道配置模式（仅用于捆绑兼容性） |
    | `plugin-sdk/telegram-command-config` | Telegram 自定义命令规范化/验证辅助函数，带有捆绑合约回退 |
    | `plugin-sdk/command-gating` | 窄范围命令授权门控辅助函数 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`，草稿流生命周期/终止辅助函数 |
    | `plugin-sdk/inbound-envelope` | 共享入站路由 + 信封构建器辅助函数 |
    | `plugin-sdk/inbound-reply-dispatch` | 共享入站记录和分发辅助函数 |
    | `plugin-sdk/messaging-targets` | 目标解析/匹配辅助函数 |
    | `plugin-sdk/outbound-media` | 共享出站媒体加载辅助函数 |
    | `plugin-sdk/outbound-send-deps` | 用于渠道适配器的轻量级出站发送依赖项查找 |
    | `plugin-sdk/outbound-runtime` | 出站传递、身份、发送委托、会话、格式化和负载规划辅助函数 |
    | `plugin-sdk/poll-runtime` | 窄范围投票规范化辅助函数 |
    | `plugin-sdk/thread-bindings-runtime` | 线程绑定生命周期和适配器辅助函数 |
    | `plugin-sdk/agent-media-payload` | 旧版代理媒体负载构建器 |
    | `plugin-sdk/conversation-runtime` | 对话/线程绑定、配对和配置绑定辅助函数 |
    | `plugin-sdk/runtime-config-snapshot` | 运行时配置快照辅助函数 |
    | `plugin-sdk/runtime-group-policy` | 运行时组策略解析辅助函数 |
    | `plugin-sdk/channel-status` | 共享渠道状态快照/摘要辅助函数 |
    | `plugin-sdk/channel-config-primitives` | 窄范围渠道配置模式原语 |
    | `plugin-sdk/channel-config-writes` | 渠道配置写入授权辅助函数 |
    | `plugin-sdk/channel-plugin-common` | 共享渠道插件前奏导出 |
    | `plugin-sdk/allowlist-config-edit` | 允许列表配置编辑/读取辅助函数 |
    | `plugin-sdk/group-access` | 共享组访问决策辅助函数 |
    | `plugin-sdk/direct-dm` | 共享直接私信 (私信) 身份验证/守卫辅助函数 |
    | `plugin-sdk/interactive-runtime` | 语义化消息呈现、传递和旧版交互式回复辅助函数。请参阅 [消息呈现](/zh/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用于入站去抖、提及匹配、提及策略辅助函数和信封辅助函数的兼容性汇总包 |
    | `plugin-sdk/channel-inbound-debounce` | 窄范围入站去抖辅助函数 |
    | `plugin-sdk/channel-mention-gating` | 窄范围提及策略和提及文本辅助函数，不包括更广泛的入站运行时表面 |
    | `plugin-sdk/channel-envelope` | 窄范围入站信封格式化辅助函数 |
    | `plugin-sdk/channel-location` | 渠道位置上下文和格式化辅助函数 |
    | `plugin-sdk/channel-logging` | 用于入站丢弃和输入/确认失败的渠道日志记录辅助函数 |
    | `plugin-sdk/channel-send-result` | 回复结果类型 |
    | `plugin-sdk/channel-actions` | 渠道消息操作辅助函数，以及为保持插件兼容性而保留的已弃用原生模式辅助函数 |
    | `plugin-sdk/channel-targets` | 目标解析/匹配辅助函数 |
    | `plugin-sdk/channel-contract` | 渠道合约类型 |
    | `plugin-sdk/channel-feedback` | 反馈/反应连接 |
    | `plugin-sdk/channel-secret-runtime` | 窄范围密钥合约辅助函数，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和密钥目标类型 |
  </Accordion>

<Accordion title="提供商子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 受支持的 LM Studio 提供商外观，用于设置、目录发现和运行时模型准备 | | `plugin-sdk/lmstudio-runtime` | 受支持的 LM Studio 运行时外观，用于本地服务器默认值、模型发现、请求标头和已加载模型辅助工具 | | `plugin-sdk/provider-setup` | 精选的本地/自托管提供商设置辅助工具 | |
  `plugin-sdk/self-hosted-provider-setup` | 专注于 OpenAI 兼容的自托管提供商设置辅助工具 | | `plugin-sdk/cli-backend` | CLI 后端默认值 + 看门狗常量 | | `plugin-sdk/provider-auth-runtime` | 用于提供商插件的运行时 API 密钥解析辅助工具 | | `plugin-sdk/provider-auth-api-key` | API 密钥新手引导/配置文件写入辅助工具，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 标准 OAuth
  认证结果构建器 | | `plugin-sdk/provider-auth-login` | 用于提供商插件的共享交互式登录辅助工具 | | `plugin-sdk/provider-env-vars` | 提供商认证环境变量查找辅助工具 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享的重放策略构建器、提供商端点辅助工具以及模型 ID 标准化辅助工具，例如 `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` |
  通用提供商 HTTP/端点能力辅助工具、提供商 HTTP 错误和音频转录多部分表单辅助工具 | | `plugin-sdk/provider-web-fetch-contract` | 细分的 web-fetch 配置/选择合约辅助工具，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch 提供商注册/缓存辅助工具 | | `plugin-sdk/provider-web-search-config-contract` |
  针对不需要插件启用连线的提供商的细分网络搜索配置/凭据辅助工具 | | `plugin-sdk/provider-web-search-contract` | 细分的网络搜索配置/凭据合约辅助工具，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 以及作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | 网络搜索提供商注册/缓存/运行时辅助工具 | | `plugin-sdk/provider-tools` |
  `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 架构清理 + 诊断，以及 xAI 兼容性辅助工具，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及类似工具 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、流包装器类型，以及共享的
  Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助工具 | | `plugin-sdk/provider-transport-runtime` | 原生提供商传输辅助工具，例如受保护的 fetch、传输消息转换和可写传输事件流 | | `plugin-sdk/provider-onboard` | 新手引导配置补丁辅助工具 | | `plugin-sdk/global-singleton` | 进程本地单例/映射/缓存辅助工具 | | `plugin-sdk/group-activation` |
  细分的组激活模式和命令解析辅助工具 |
</Accordion>

<Accordion title="身份验证和安全子路径">
  | 子路径 | 主要导出内容 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，命令注册帮助程序，包括动态参数菜单格式化、发送者授权帮助程序 | | `plugin-sdk/command-status` | 命令/帮助消息构建器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 批准者解析和相同聊天操作授权帮助程序 | | `plugin-sdk/approval-client-runtime` |
  原生执行批准配置文件/过滤器帮助程序 | | `plugin-sdk/approval-delivery-runtime` | 原生批准功能/传递适配器 | | `plugin-sdk/approval-gateway-runtime` | 共享批准网关解析帮助程序 | | `plugin-sdk/approval-handler-adapter-runtime` | 用于热渠道入口点的轻量级原生批准适配器加载帮助程序 | | `plugin-sdk/approval-handler-runtime` | 更广泛的批准处理程序运行时帮助程序；当适配器/网关接口足够时，优先使用它们 | |
  `plugin-sdk/approval-native-runtime` | 原生批准目标 + 账户绑定帮助程序 | | `plugin-sdk/approval-reply-runtime` | 执行/插件批准回复负载帮助程序 | | `plugin-sdk/approval-runtime` | 执行/插件批准负载帮助程序、原生批准路由/运行时帮助程序以及结构化批准显示帮助程序，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 窄范围入站回复去重重置帮助程序 | | `plugin-sdk/channel-contract-testing`
  | 窄范围渠道契约测试帮助程序，不含广泛的测试桶 | | `plugin-sdk/command-auth-native` | 原生命令授权、动态参数菜单格式化和原生会话目标帮助程序 | | `plugin-sdk/command-detection` | 共享命令检测帮助程序 | | `plugin-sdk/command-primitives-runtime` | 用于热渠道路径的轻量级命令文本谓词 | | `plugin-sdk/command-surface` | 命令主体规范化和命令表面帮助程序 | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用于渠道/插件密钥表面的窄范围密钥契约收集帮助程序 | | `plugin-sdk/secret-ref-runtime` | 用于密钥契约/配置解析的窄范围 `coerceSecretRef` 和 SecretRef 类型帮助程序 | | `plugin-sdk/security-runtime` | 共享信任、私信拦截、外部内容、敏感文本编辑、恒定时间密钥比较和密钥收集帮助程序 | | `plugin-sdk/ssrf-policy` |
  主机允许列表和专用网络 SSRF 策略帮助程序 | | `plugin-sdk/ssrf-dispatcher` | 窄范围固定调度程序帮助程序，不含广泛的 infra 运行时表面 | | `plugin-sdk/ssrf-runtime` | 固定调度程序、SSRF 防护获取、SSRF 错误和 SSRF 策略帮助程序 | | `plugin-sdk/secret-input` | 密钥输入解析帮助程序 | | `plugin-sdk/webhook-ingress` | Webhook 请求/目标帮助程序以及原始 websocket/主体强制转换 | |
  `plugin-sdk/webhook-request-guards` | 请求主体大小/超时帮助程序 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/runtime` | 广泛的运行时/日志/备份/插件安装辅助工具 | | `plugin-sdk/runtime-env` | 狭窄的运行时环境、日志记录器、超时、重试和退避辅助工具 | | `plugin-sdk/browser-config` | 用于标准化配置文件/默认值、CDD URL 解析和浏览器控制身份验证辅助工具的受支持的浏览器配置外观 | | `plugin-sdk/channel-runtime-context` | 通用渠道运行时上下文注册和查找辅助工具 | |
  `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享的插件命令/钩子/HTTP/交互辅助工具 | | `plugin-sdk/hook-runtime` | 共享的 Webhook/内部钩子管道辅助工具 | | `plugin-sdk/lazy-runtime` | 延迟运行时导入/绑定辅助工具，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程执行辅助工具 |
  | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、参数调用和延迟命令组辅助工具 | | `plugin-sdk/gateway-runtime` | Gateway(网关) 客户端、Gateway CLI RPC、Gateway 协议错误和渠道状态修补辅助工具 | | `plugin-sdk/config-types` | 仅限类型的配置表面，用于插件配置形状，例如 `OpenClawConfig` 和渠道/提供商配置类型 | | `plugin-sdk/plugin-config-runtime` | 运行时插件配置查找辅助工具，例如
  `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 事务性配置变更辅助工具，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 当前进程配置快照辅助工具，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和测试快照设置器 | | `plugin-sdk/telegram-command-config` |
  Telegram 命令名称/描述标准化和重复/冲突检查，即使捆绑的 Telegram 协约表面不可用 | | `plugin-sdk/text-autolink-runtime` | 文件引用自动链接检测，无需广泛的文本运行时桶 | | `plugin-sdk/approval-runtime` | 执行/插件批准辅助工具、批准能力构建器、身份验证/配置文件辅助工具、本机路由/运行时辅助工具以及结构化批准显示路径格式化 | | `plugin-sdk/reply-runtime` |
  共享的入站/回复运行时辅助工具、分块、调度、心跳、回复计划器 | | `plugin-sdk/reply-dispatch-runtime` | 狭窄的回复调度/完成和对话标签辅助工具 | | `plugin-sdk/reply-history` | 共享的短窗口回复历史辅助工具，例如 `buildHistoryContext`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` |
  狭窄的文本/Markdown 分块辅助工具 | | `plugin-sdk/session-store-runtime` | 会话存储路径、会话密钥、更新时间和存储变更辅助工具 | | `plugin-sdk/cron-store-runtime` | Cron 存储路径/加载/保存辅助工具 | | `plugin-sdk/state-paths` | 状态/OAuth 目录路径辅助工具 | | `plugin-sdk/routing` | 路由/会话密钥/账户绑定辅助工具，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和
  `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共享的渠道/账户状态摘要辅助工具、运行时状态默认值和问题元数据辅助工具 | | `plugin-sdk/target-resolver-runtime` | 共享的目标解析器辅助工具 | | `plugin-sdk/string-normalization-runtime` | Slug/字符串标准化辅助工具 | | `plugin-sdk/request-url` | 从获取/请求类输入中提取字符串 URL | | `plugin-sdk/run-command` |
  带有标准化标准输出/标准错误结果的定时命令运行器 | | `plugin-sdk/param-readers` | 通用工具/CLI 参数读取器 | | `plugin-sdk/tool-payload` | 从工具结果对象中提取标准化有效载荷 | | `plugin-sdk/tool-send` | 从工具参数中提取规范发送目标字段 | | `plugin-sdk/temp-path` | 共享的临时下载路径辅助工具 | | `plugin-sdk/logging-core` | 子系统日志记录器和编辑辅助工具 | | `plugin-sdk/markdown-table-runtime` |
  Markdown 表格模式和转换辅助工具 | | `plugin-sdk/model-session-runtime` | 模型/会话覆盖辅助工具，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供商配置解析辅助工具 | | `plugin-sdk/json-store` | 小型 JSON 状态读/写辅助工具 | | `plugin-sdk/file-lock` | 可重入文件锁定辅助工具 | | `plugin-sdk/persistent-dedupe` |
  磁盘支持的去重缓存辅助工具 | | `plugin-sdk/acp-runtime` | ACP 运行时/会话和回复调度辅助工具 | | `plugin-sdk/acp-binding-resolve-runtime` | 只读 ACP 绑定解析，无需生命周期启动导入 | | `plugin-sdk/agent-config-primitives` | 狭窄的代理运行时配置架构基元 | | `plugin-sdk/boolean-param` | 宽松的布尔参数读取器 | | `plugin-sdk/dangerous-name-runtime` | 危险名称匹配解析辅助工具 | |
  `plugin-sdk/device-bootstrap` | 设备引导和配对令牌辅助工具 | | `plugin-sdk/extension-shared` | 共享的被动渠道、状态和环境代理辅助基元 | | `plugin-sdk/models-provider-runtime` | `/models` 命令/提供商回复辅助工具 | | `plugin-sdk/skill-commands-runtime` | 技能命令列表辅助工具 | | `plugin-sdk/native-command-registry` | 本机命令注册表/构建/序列化辅助工具 | | `plugin-sdk/agent-harness` |
  用于底层代理工具架的实验性可信插件表面：工具架类型、活动运行引导/中止辅助工具、OpenClaw 工具桥辅助工具、运行时计划工具策略辅助工具、终端结果分类、工具进度格式化/详细辅助工具以及尝试结果实用程序 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端点检测辅助工具 | | `plugin-sdk/infra-runtime` | 系统事件/心跳辅助工具 | | `plugin-sdk/collection-runtime` | 小型有界缓存辅助工具 | |
  `plugin-sdk/diagnostic-runtime` | 诊断标志、事件和跟踪上下文辅助工具 | | `plugin-sdk/error-runtime` | 错误图、格式化、共享错误分类辅助工具、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 封装的获取、代理和固定查找辅助工具 | | `plugin-sdk/runtime-fetch` | 调度程序感知的运行时获取，无需代理/受保护获取导入 | | `plugin-sdk/response-limit-runtime` |
  有界响应体读取器，无需广泛的媒体运行时表面 | | `plugin-sdk/session-binding-runtime` | 当前对话绑定状态，无需配置的绑定路由或配对存储 | | `plugin-sdk/session-store-runtime` | 会话存储辅助工具，无需广泛的配置写入/维护导入 | | `plugin-sdk/context-visibility-runtime` | 上下文可见性解析和补充上下文过滤，无需广泛的配置/安全导入 | | `plugin-sdk/string-coerce-runtime` |
  狭窄的基元记录/字符串强制转换和标准化辅助工具，无需 Markdown/日志导入 | | `plugin-sdk/host-runtime` | 主机名和 SCP 主机标准化辅助工具 | | `plugin-sdk/retry-runtime` | 重试配置和重试运行器辅助工具 | | `plugin-sdk/agent-runtime` | 代理目录/身份/工作区辅助工具 | | `plugin-sdk/directory-runtime` | 配置支持的目录查询/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="能力和测试子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒体获取/转换/存储辅助函数以及媒体负载构建器 | | `plugin-sdk/media-store` | 精简的媒体存储辅助函数，例如 `saveMediaBuffer` | | `plugin-sdk/media-generation-runtime` | 共享的媒体生成故障转移辅助函数、候选选择以及缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解提供商类型以及面向提供商的图像/音频辅助导出 | |
  `plugin-sdk/text-runtime` | 共享的文本/Markdown/日志辅助函数，例如助手可见文本剥离、Markdown 渲染/分块/表格辅助函数、编辑辅助函数、指令标签辅助函数和安全文本工具 | | `plugin-sdk/text-chunking` | 出站文本分块辅助函数 | | `plugin-sdk/speech` | 语音提供商类型以及面向提供商的指令、注册表、验证和语音辅助导出 | | `plugin-sdk/speech-core` | 共享的语音提供商类型、注册表、指令、规范化和语音辅助导出 | |
  `plugin-sdk/realtime-transcription` | 实时转录提供商类型、注册表辅助函数和共享 WebSocket 会话辅助函数 | | `plugin-sdk/realtime-voice` | 实时语音提供商类型和注册表辅助函数 | | `plugin-sdk/image-generation` | 图像生成提供商类型 | | `plugin-sdk/image-generation-core` | 共享的图像生成类型、故障转移、身份验证和注册表辅助函数 | | `plugin-sdk/music-generation` | 音乐生成提供商/请求/结果类型 | |
  `plugin-sdk/music-generation-core` | 共享的音乐生成类型、故障转移辅助函数、提供商查找和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成提供商/请求/结果类型 | | `plugin-sdk/video-generation-core` | 共享的视频生成类型、故障转移辅助函数、提供商查找和模型引用解析 | | `plugin-sdk/webhook-targets` | Webhook 目标注册表和路由安装辅助函数 | | `plugin-sdk/webhook-path` | Webhook
  路径规范化辅助函数 | | `plugin-sdk/web-media` | 共享的远程/本地媒体加载辅助函数 | | `plugin-sdk/zod` | 为插件 SDK 使用者重新导出的 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`、`shouldAckReaction` |
</Accordion>

<Accordion title="Memory 子路径">
  | 子路径 | 主要导出 | | --- | --- | | `plugin-sdk/memory-core` | 用于 manager/config/file/CLI 助手的捆绑 memory-core 助手表面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主机嵌入合约、注册表访问、本地提供商以及通用批处理/远程助手
  | | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主机多模态助手 | | `plugin-sdk/memory-core-host-query` | Memory 主机查询助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主机密钥助手 | | `plugin-sdk/memory-core-host-events` | Memory
  主机事件日志助手 | | `plugin-sdk/memory-core-host-status` | Memory 主机状态助手 | | `plugin-sdk/memory-core-host-runtime-cli` | Memory 主机 CLI 运行时助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主机核心运行时助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主机文件/运行时助手 | | `plugin-sdk/memory-host-core` | Memory 主机核心运行时助手的供应商无关别名 | |
  `plugin-sdk/memory-host-events` | Memory 主机事件日志助手的供应商无关别名 | | `plugin-sdk/memory-host-files` | Memory 主机文件/运行时助手的供应商无关别名 | | `plugin-sdk/memory-host-markdown` | 用于 Memory 相邻插件的共享 managed-markdown 助手 | | `plugin-sdk/memory-host-search` | 用于 search-manager 访问的活动 Memory 运行时外观 | | `plugin-sdk/memory-host-status` | Memory
  主机状态助手的供应商无关别名 | | `plugin-sdk/memory-lancedb` | 捆绑 memory-lancedb 助手表面 |
</Accordion>

  <Accordion title="保留的捆绑辅助子路径">
    | Family | Current subpaths | Intended use |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆绑的浏览器插件支持辅助程序。`browser-profiles` 导出 `resolveBrowserConfig`、`resolveProfile`、`ResolvedBrowserConfig`、`ResolvedBrowserProfile` 和 `ResolvedBrowserTabCleanupConfig`，用于标准化的 `browser.tabCleanup` 形状。`browser-support` 仍然保留为兼容性桶。 |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆绑的 Matrix 辅助/运行时表面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆绑的 LINE 辅助/运行时表面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆绑的 IRC 辅助表面 |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/googlechat-runtime-shared`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu`, `plugin-sdk/feishu-conversation`, `plugin-sdk/feishu-setup`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/telegram-command-ui`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` | 已弃用的捆绑渠道兼容性/辅助接缝。新插件应导入通用 SDK 子路径或插件本地桶。 |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/memory-core`, `plugin-sdk/memory-lancedb`, `plugin-sdk/opencode`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆绑的功能/插件辅助接缝；`plugin-sdk/github-copilot-token` 目前导出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 相关

- [插件 SDK 概述](/zh/plugins/sdk-overview)
- [插件 SDK 设置](/zh/plugins/sdk-setup)
- [构建插件](/zh/plugins/building-plugins)
