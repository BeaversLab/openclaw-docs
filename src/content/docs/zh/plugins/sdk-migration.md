---
summary: "从传统的向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

OpenClaw 已从一个广泛的向后兼容层转变为一个具有重点、文档化导入的现代插件架构。如果您的插件是在新架构之前构建的，本指南将帮助您进行迁移。

## 有什么变化

旧的插件系统提供了两个开放的面，允许插件从单个入口点导入它们需要的任何内容：

- **`openclaw/plugin-sdk/compat`** — 单个导入，重新导出了数十个辅助函数。它的引入是为了在构建新插件架构的同时，使较旧的基于 hook 的插件能够继续工作。
- **`openclaw/extension-api`** — 一座桥梁，允许插件直接访问主机端辅助函数，例如嵌入式代理运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** — 一个已删除的仅限 Pi 的捆绑扩展 hook，可以观察嵌入式运行器事件，例如 `tool_result`。

广泛的导入面现在已被**弃用**。它们在运行时仍然有效，但新插件绝不能使用它们，现有插件应在下一个主要版本将其删除之前进行迁移。仅限 Pi 的嵌入式扩展工厂注册 API 已被删除；请改用工具结果中间件。

OpenClaw 不会在引入替换项的同一更改中删除或重新解释已记录的插件行为。破坏性合约更改必须先通过兼容性适配器、诊断、文档和弃用期。这适用于 SDK 导入、manifest 字段、设置 API、hook 和运行时注册行为。

<Warning>向后兼容层将在未来的主要版本中被删除。 届时，仍从这些面导入内容的插件将会中断。 仅限 Pi 的嵌入式扩展工厂注册已经无法加载。</Warning>

## 更改原因

旧方法导致了以下问题：

- **启动缓慢** — 导入一个辅助函数会加载数十个不相关的模块
- **循环依赖** — 广泛的重新导出使得创建导入循环变得容易
- **不清的 API 表面** —— 无法区分哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这个问题：每个导入路径 (`openclaw/plugin-sdk/\<subpath\>`)
都是一个具有明确目的和文档化契约的小型、独立的模块。

用于捆绑渠道的旧版提供商便捷接口也已消失。
特定品牌的辅助接口是私有 mono-repo 快捷方式，并非稳定的
插件契约。请改用狭窄的通用 SDK 子路径。在捆绑的
插件工作区内，请将提供商拥有的辅助程序保留在该插件自己的 `api.ts` 或
`runtime-api.ts` 中。

当前捆绑的提供商示例：

- Anthropic 将 Claude 特定的流辅助程序保留在其自己的 `api.ts` /
  `contract-api.ts` 接口中
- OpenAI 将提供商构建器、默认模型辅助程序和实时提供商
  构建器保留在其自己的 `api.ts` 中
- OpenRouter 将提供商构建器和新手引导/配置辅助程序保留在其自己的
  `api.ts` 中

## 兼容性政策

对于外部插件，兼容性工作遵循以下顺序：

1. 添加新契约
2. 通过兼容适配器保持旧行为
3. 发出诊断或警告，指明旧路径和替换项
4. 在测试中覆盖这两种路径
5. 记录弃用和迁移路径
6. 仅在宣布的迁移窗口期之后移除，通常在主要版本中

如果仍接受某个清单字段，插件作者可以继续使用它，
直到文档和诊断另有说明。新代码应优先使用文档记录的
替换项，但现有插件不应在常规次要版本中中断。

## 如何迁移

<Steps>
  <Step title="Migrate runtime config load/write helpers">
    捆绑插件应停止直接调用
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。优先使用已传递到活动调用路径中的
    配置。需要当前进程快照的长期存活处理程序可以使用
    `api.runtime.config.current()`。长期存活的代理工具应在
    `execute` 内部使用工具上下文的
    `ctx.getRuntimeConfig()`，以便在配置写入之前创建的工具
    仍然能看到刷新后的运行时配置。

    配置写入必须通过事务辅助程序进行，并选择写入后策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当调用者知道更改需要完全重启网关时，请使用
    `afterWrite: { mode: "restart", reason: "..." }`；仅当调用者拥有后续操作
    并有意要抑制重新加载规划器时，才使用
    `afterWrite: { mode: "none", reason: "..." }`。变更结果包括用于测试和
    日志记录的类型化 `followUp` 摘要；
    网关仍负责应用或安排重启。`loadConfig`
    和 `writeConfigFile` 在迁移期间作为外部插件
    的已弃用兼容辅助程序保留，并会使用 `runtime-config-load-write`
    兼容性代码发出一次警告。捆绑插件和仓库运行时代码受到
    `pnpm check:deprecated-internal-config-api` 和
    `pnpm check:no-runtime-action-load-config` 中扫描器防护的保护：
    新的生产插件使用会完全失败，直接配置写入会失败，网关服务器方法必须使用请求运行时快照，运行时渠道发送/操作/客户端辅助程序必须从其边界接收配置，且长期存活的运行时模块不允许任何环境 `loadConfig()` 调用。

    新插件代码还应避免导入广泛的
    `openclaw/plugin-sdk/config-runtime` 兼容桶。使用与任务匹配的
    狭窄 SDK 子路径：

    | 需求 | 导入 |
    | --- | --- |
    | 配置类型，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | 已加载的配置断言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助程序 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 组策略运行时辅助程序 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密钥输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试针对广泛桶进行了扫描器防护，以便导入和模拟保持在其所需行为的本地。广泛桶仍出于外部兼容性而存在，但新代码不应依赖它。

  </Step>

  <Step title="将 Pi 工具结果扩展迁移到中间件">
    捆绑插件必须将仅限 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 工具结果处理程序替换为
    运行时无关的中间件。

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部插件无法注册工具结果中间件，因为它可以在模型看到之前重写高信任工具输出。

  </Step>

  <Step title="将审批原生处理程序迁移到 capability facts">
    具有审批功能的渠道插件现在通过
    `approvalCapability.nativeRuntime` 加上共享的运行时上下文注册表来公开原生审批行为。

    主要变更：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为
      `approvalCapability.nativeRuntime`
    - 将特定于审批的身份验证/传递从旧的 `plugin.auth` /
      `plugin.approvals` 连接移动到 `approvalCapability`
    - `ChannelPlugin.approvals` 已从公共渠道插件
      契约中移除；将传递/native/render 字段移动到 `approvalCapability`
    - `plugin.auth` 仅保留用于渠道登录/注销流程；核心不再读取那里的审批身份验证挂钩
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册渠道拥有的运行时对象，例如客户端、令牌或 Bolt
      应用
    - 不要从原生审批处理程序发送插件拥有的重路由通知；
      核心现在拥有来自实际传递结果的路由到别处的通知
    - 将 `channelRuntime` 传递到 `createChannelManager(...)` 时，提供一个
      真实的 `createPluginRuntime().channel` 表面。部分存根会被拒绝。

    请参阅 `/plugins/sdk-channel-plugins` 了解当前的审批能力
      布局。

  </Step>

  <Step title="审查 Windows 包装器回退行为">
    如果您的插件使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包装器现在将严格失败，除非您显式传递
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

  <Step title="查找已弃用的导入">
    在您的插件中搜索来自任一已弃用表面的导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为明确的导入">
    旧表面导出的每个内容都对应一个特定的现代导入路径：

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

    同样的模式也适用于其他遗留桥接辅助函数：

    | 旧导入 | 现代等效项 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | OpenRouter store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="构建并测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="常用导入路径表">
  | Import path | Purpose | Key exports | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 规范插件入口辅助函数 | `definePluginEntry` | | `plugin-sdk/core` | 用于渠道入口定义/构建器的旧版伞形重新导出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架构导出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 单提供商入口辅助函数 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 专注的渠道入口定义和构建器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共享设置向导辅助函数 | Allowlist 提示，设置状态构建器 | | `plugin-sdk/setup-runtime` | 设置时运行时辅助函数 |
  导入安全的设置修补适配器，查找笔记辅助函数，`promptResolvedAllowFrom`, `splitSetupEntries`, 委托设置代理 | | `plugin-sdk/setup-adapter-runtime` | 设置适配器辅助函数 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 设置工具辅助函数 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` |
  多账户辅助函数 | 账户列表/配置/操作门控辅助函数 | | `plugin-sdk/account-id` | 账户 ID 辅助函数 | `DEFAULT_ACCOUNT_ID`, 账户 ID 标准化 | | `plugin-sdk/account-resolution` | 账户查找辅助函数 | 账户查找 + 默认回退辅助函数 | | `plugin-sdk/account-helpers` | 窄范围账户辅助函数 | 账户列表/账户操作辅助函数 | | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`,
  `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，外加 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | 私信配对原语 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回复前缀 + 打字连线 | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` |
  配置适配器工厂 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 配置架构构建器 | 仅限共享渠道配置架构原语和通用构建器 | | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑配置架构 | 仅限捆绑兼容性；新插件必须定义插件本地架构 | | `plugin-sdk/telegram-command-config` | Telegram 命令配置辅助函数 | 命令名称标准化，描述修剪，重复/冲突验证 | |
  `plugin-sdk/channel-policy` | 群组/私信策略解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 账户状态和草稿流生命周期辅助函数 | `createAccountStatusSink`, 草稿预览完成辅助函数 | | `plugin-sdk/inbound-envelope` | 入站信封辅助函数 | 共享路由 + 信封构建器辅助函数 | | `plugin-sdk/inbound-reply-dispatch` | 入站回复辅助函数 | 共享记录和分发辅助函数 | |
  `plugin-sdk/messaging-targets` | 消息目标解析 | 目标解析/匹配辅助函数 | | `plugin-sdk/outbound-media` | 出站媒体辅助函数 | 共享出站媒体加载 | | `plugin-sdk/outbound-send-deps` | 出站发送依赖辅助函数 | 轻量级 `resolveOutboundSendDep` 查找，无需导入完整的出站运行时 | | `plugin-sdk/outbound-runtime` | 出站运行时辅助函数 | 出站投递，身份/发送委托，会话，格式化，和负载规划辅助函数 | |
  `plugin-sdk/thread-bindings-runtime` | 线程绑定辅助函数 | 线程绑定生命周期和适配器辅助函数 | | `plugin-sdk/agent-media-payload` | 旧版媒体负载辅助函数 | 用于旧版字段布局的 Agent 媒体负载构建器 | | `plugin-sdk/channel-runtime` | 已弃用的兼容性垫片 | 仅限旧版渠道运行时实用工具 | | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 | | `plugin-sdk/runtime-store` | 持久化插件存储 |
  `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 广泛运行时辅助函数 | 运行时/日志/备份/插件安装辅助函数 | | `plugin-sdk/runtime-env` | 窄范围运行时环境辅助函数 | 记录器/运行时环境，超时，重试，和退避辅助函数 | | `plugin-sdk/plugin-runtime` | 共享插件运行时辅助函数 | 插件命令/钩子/http/交互辅助函数 | | `plugin-sdk/hook-runtime` | 钩子管道辅助函数 | 共享 webhook/内部钩子管道辅助函数 | |
  `plugin-sdk/lazy-runtime` | 延迟运行时辅助函数 | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 进程辅助函数 | 共享 exec 辅助函数 | | `plugin-sdk/cli-runtime` | CLI 运行时辅助函数 | 命令格式化，等待，版本辅助函数 | | `plugin-sdk/gateway-runtime` | Gateway(网关)
  辅助函数 | Gateway(网关) 客户端和渠道状态修补辅助函数 | | `plugin-sdk/config-runtime` | 配置辅助函数 | 配置加载/写入辅助函数 | | `plugin-sdk/telegram-command-config` | Telegram 命令辅助函数 | 当捆绑的 Telegram 契约表面不可用时，回退稳定的 Telegram 命令验证辅助函数 | | `plugin-sdk/approval-runtime` | 审批提示辅助函数 |
  Exec/插件审批负载，审批能力/配置文件辅助函数，原生审批路由/运行时辅助函数，和结构化审批显示路径格式化 | | `plugin-sdk/approval-auth-runtime` | 审批身份验证辅助函数 | 审批者解析，同聊天操作授权 | | `plugin-sdk/approval-client-runtime` | 审批客户端辅助函数 | 原生 exec 审批配置文件/过滤器辅助函数 | | `plugin-sdk/approval-delivery-runtime` | 审批投递辅助函数 | 原生审批能力/投递适配器 | |
  `plugin-sdk/approval-gateway-runtime` | 审批网关辅助函数 | 共享审批网关解析辅助函数 | | `plugin-sdk/approval-handler-adapter-runtime` | 审批适配器辅助函数 | 用于热渠道入口点的轻量级原生审批适配器加载辅助函数 | | `plugin-sdk/approval-handler-runtime` | 审批处理程序辅助函数 | 更广泛的审批处理程序运行时辅助函数；当足够时，优先使用较窄的适配器/网关接口 | | `plugin-sdk/approval-native-runtime` |
  审批目标辅助函数 | 原生审批目标/账户绑定辅助函数 | | `plugin-sdk/approval-reply-runtime` | 审批回复辅助函数 | Exec/插件审批回复负载辅助函数 | | `plugin-sdk/channel-runtime-context` | 渠道运行时上下文辅助函数 | 通用渠道运行时上下文注册/获取/监视辅助函数 | | `plugin-sdk/security-runtime` | 安全辅助函数 | 共享信任，私信门控，外部内容，和密钥收集辅助函数 | | `plugin-sdk/ssrf-policy` | SSRF
  策略辅助函数 | 主机允许列表和私有网络策略辅助函数 | | `plugin-sdk/ssrf-runtime` | SSRF 运行时辅助函数 | 固定分发器，受保护的 fetch，SSRF 策略辅助函数 | | `plugin-sdk/collection-runtime` | 有界缓存辅助函数 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 诊断门控辅助函数 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 错误格式化辅助函数 |
  `formatUncaughtError`, `isApprovalNotFoundError`, 错误图辅助函数 | | `plugin-sdk/fetch-runtime` | 包装的 fetch/proxy 辅助函数 | `resolveFetch`, 代理辅助函数 | | `plugin-sdk/host-runtime` | 主机标准化辅助函数 | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重试辅助函数 | `RetryConfig`, `retryAsync`, 策略运行器 | | `plugin-sdk/allow-from` | 允许列表格式化 |
  `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允许列表输入映射 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 命令门控和命令表面辅助函数 | `resolveControlCommandGate`, 发送者授权辅助函数，命令注册表辅助函数，包括动态参数菜单格式化 | | `plugin-sdk/command-status` | 命令状态/帮助渲染器 | `buildCommandsMessage`, `buildCommandsMessagePaginated`,
  `buildHelpMessage` | | `plugin-sdk/secret-input` | 密钥输入解析 | 密钥输入辅助函数 | | `plugin-sdk/webhook-ingress` | Webhook 请求辅助函数 | Webhook 目标实用工具 | | `plugin-sdk/webhook-request-guards` | Webhook 主体守卫辅助函数 | 请求主体读取/限制辅助函数 | | `plugin-sdk/reply-runtime` | 共享回复运行时 | 入站分发，心跳，回复规划器，分块 | | `plugin-sdk/reply-dispatch-runtime` |
  窄范围回复分发辅助函数 | 完成，提供商分发，和对话标签辅助函数 | | `plugin-sdk/reply-history` | 回复历史辅助函数 | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回复分块辅助函数 | 文本/markdown 分块辅助函数 | |
  `plugin-sdk/session-store-runtime` | 会话存储辅助函数 | 存储路径 + 更新时间辅助函数 | | `plugin-sdk/state-paths` | 状态路径辅助函数 | 状态和 OAuth 目录辅助函数 | | `plugin-sdk/routing` | 路由/会话密钥辅助函数 | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, 会话密钥标准化辅助函数 | | `plugin-sdk/status-helpers` | 渠道状态辅助函数 |
  渠道/账户状态摘要构建器，运行时状态默认值，问题元数据辅助函数 | | `plugin-sdk/target-resolver-runtime` | 目标解析器辅助函数 | 共享目标解析器辅助函数 | | `plugin-sdk/string-normalization-runtime` | 字符串标准化辅助函数 | Slug/字符串标准化辅助函数 | | `plugin-sdk/request-url` | 请求 URL 辅助函数 | 从类似请求的输入中提取字符串 URL | | `plugin-sdk/run-command` | 计时命令辅助函数 | 带有标准化
  stdout/stderr 的计时命令运行器 | | `plugin-sdk/param-readers` | 参数读取器 | 常用工具/CLI 参数读取器 | | `plugin-sdk/tool-payload` | 工具负载提取 | 从工具结果对象中提取标准化的负载 | | `plugin-sdk/tool-send` | 工具发送提取 | 从工具参数中提取规范的发送目标字段 | | `plugin-sdk/temp-path` | 临时路径辅助函数 | 共享临时下载路径辅助函数 | | `plugin-sdk/logging-core` | 日志记录辅助函数 |
  子系统记录器和编辑辅助函数 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格辅助函数 | Markdown 表格模式辅助函数 | | `plugin-sdk/reply-payload` | 消息回复类型 | 回复负载类型 | | `plugin-sdk/provider-setup` | 策展的本地/自托管提供商设置辅助函数 | 自托管提供商发现/配置辅助函数 | | `plugin-sdk/self-hosted-provider-setup` | 专注的 OpenAI 兼容自托管提供商设置辅助函数 |
  相同的自托管提供商发现/配置辅助函数 | | `plugin-sdk/provider-auth-runtime` | 提供商运行时身份验证辅助函数 | 运行时 API 密钥解析辅助函数 | | `plugin-sdk/provider-auth-api-key` | 提供商 API 密钥设置辅助函数 | API 密钥新手引导/配置文件写入辅助函数 | | `plugin-sdk/provider-auth-result` | 提供商身份验证结果辅助函数 | 标准 OAuth 身份验证结果构建器 | | `plugin-sdk/provider-auth-login` |
  提供商交互式登录辅助函数 | 共享交互式登录辅助函数 | | `plugin-sdk/provider-selection-runtime` | 提供商选择辅助函数 | 配置或自动提供商选择和原始提供商配置合并 | | `plugin-sdk/provider-env-vars` | 提供商环境变量辅助函数 | 提供商身份验证环境变量查找辅助函数 | | `plugin-sdk/provider-model-shared` | 共享提供商模型/重放辅助函数 | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`,
  `normalizeModelCompat`, 共享重放策略构建器，提供商端点辅助函数，和模型 ID 标准化辅助函数 | | `plugin-sdk/provider-catalog-shared` | 共享提供商目录辅助函数 | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供商新手引导修补 | 新手引导配置辅助函数 | |
  `plugin-sdk/provider-http` | 提供商 HTTP 辅助函数 | 通用提供商 HTTP/端点能力辅助函数，包括音频转录多部分表单辅助函数 | | `plugin-sdk/provider-web-fetch` | 提供商 Web 抓取辅助函数 | Web 抓取提供商注册/缓存辅助函数 | | `plugin-sdk/provider-web-search-config-contract` | 提供商 Web 搜索配置辅助函数 | 用于不需要插件启用连线的提供商的窄范围 Web 搜索配置/凭据辅助函数 | |
  `plugin-sdk/provider-web-search-contract` | 提供商 Web 搜索契约辅助函数 | 窄范围 Web 搜索配置/凭据契约辅助函数，例如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, 和作用域凭据设置器/获取器 | | `plugin-sdk/provider-web-search` | 提供商 Web 搜索辅助函数 | Web 搜索提供商注册/缓存/运行时辅助函数 | | `plugin-sdk/provider-tools` |
  提供商工具/架构兼容辅助函数 | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini 架构清理 + 诊断，和 xAI 兼容辅助函数，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供商使用情况辅助函数 | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, 和其他提供商使用情况辅助函数 | | `plugin-sdk/provider-stream` |
  提供商流包装器辅助函数 | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 流包装器类型，和共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包装器辅助函数 | | `plugin-sdk/provider-transport-runtime` | 提供商传输辅助函数 | 原生提供商传输辅助函数，例如受保护的 fetch，传输消息转换，和可写传输事件流 | |
  `plugin-sdk/keyed-async-queue` | 有序异步队列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共享媒体辅助函数 | 媒体获取/转换/存储辅助函数以及媒体负载构建器 | | `plugin-sdk/media-generation-runtime` | 共享媒体生成辅助函数 | 共享故障转移辅助函数，候选选择，以及用于图像/视频/音乐生成的缺失模型消息传递 | | `plugin-sdk/media-understanding` | 媒体理解辅助函数 |
  媒体理解提供商类型以及提供商面向的图像/音频辅助函数导出 | | `plugin-sdk/text-runtime` | 共享文本辅助函数 | 助手可见文本剥离，markdown 渲染/分块/表格辅助函数，编辑辅助函数，指令标签辅助函数，安全文本实用工具，和相关文本/日志辅助函数 | | `plugin-sdk/text-chunking` | 文本分块辅助函数 | 出站文本分块辅助函数 | | `plugin-sdk/speech` | 语音辅助函数 |
  语音提供商类型以及提供商面向的指令，注册表，和验证辅助函数 | | `plugin-sdk/speech-core` | 共享语音核心 | 语音提供商类型，注册表，指令，标准化 | | `plugin-sdk/realtime-transcription` | 实时转录辅助函数 | 提供商类型，注册表辅助函数，和共享 WebSocket 会话辅助函数 | | `plugin-sdk/realtime-voice` | 实时语音辅助函数 | 提供商类型，注册表/解析辅助函数，和桥接会话辅助函数 | |
  `plugin-sdk/image-generation-core` | 共享图像生成核心 | 图像生成类型，故障转移，身份验证，和注册表辅助函数 | | `plugin-sdk/music-generation` | 音乐生成辅助函数 | 音乐生成提供商/请求/结果类型 | | `plugin-sdk/music-generation-core` | 共享音乐生成核心 | 音乐生成类型，故障转移辅助函数，提供商查找，和模型引用解析 | | `plugin-sdk/video-generation` | 视频生成辅助函数 | 视频生成提供商/请求/结果类型 | |
  `plugin-sdk/video-generation-core` | 共享视频生成核心 | 视频生成类型，故障转移辅助函数，提供商查找，和模型引用解析 | | `plugin-sdk/interactive-runtime` | 交互式回复辅助函数 | 交互式回复负载标准化/归约 | | `plugin-sdk/channel-config-primitives` | 渠道配置原语 | 窄范围渠道配置架构原语 | | `plugin-sdk/channel-config-writes` | 渠道配置写入辅助函数 | 渠道配置写入授权辅助函数 | |
  `plugin-sdk/channel-plugin-common` | 共享渠道前奏 | 共享渠道插件前奏导出 | | `plugin-sdk/channel-status` | 渠道状态辅助函数 | 共享渠道状态快照/摘要辅助函数 | | `plugin-sdk/allowlist-config-edit` | 允许列表配置辅助函数 | 允许列表配置编辑/读取辅助函数 | | `plugin-sdk/group-access` | 群组访问辅助函数 | 共享群组访问决策辅助函数 | | `plugin-sdk/direct-dm` | 直接私信辅助函数 |
  共享直接私信授权/守卫辅助函数 | | `plugin-sdk/extension-shared` | 共享扩展辅助函数 | 被动渠道/状态和环境代理辅助函数原语 | | `plugin-sdk/webhook-targets` | Webhook 目标辅助函数 | Webhook 目标注册表和路由安装辅助函数 | | `plugin-sdk/webhook-path` | Webhook 路径辅助函数 | Webhook 路径标准化辅助函数 | | `plugin-sdk/web-media` | 共享 Web 媒体辅助函数 | 远程/本地媒体加载辅助函数 | | `plugin-sdk/zod`
  | Zod 重新导出 | 为插件 SDK 使用者重新导出的 `zod` | | `plugin-sdk/memory-core` | 捆绑内存核心辅助函数 | 内存管理器/配置/文件/CLI 辅助函数表面 | | `plugin-sdk/memory-core-engine-runtime` | 内存引擎运行时外观 | 内存索引/搜索运行时外观 | | `plugin-sdk/memory-core-host-engine-foundation` | 内存主机基础引擎 | 内存主机基础引擎导出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 内存主机嵌入引擎
  | 内存嵌入契约，注册表访问，本地提供商，和通用批处理/远程辅助函数；具体的远程提供商位于其所属插件中 | | `plugin-sdk/memory-core-host-engine-qmd` | 内存主机 QMD 引擎 | 内存主机 QMD 引擎导出 | | `plugin-sdk/memory-core-host-engine-storage` | 内存主机存储引擎 | 内存主机存储引擎导出 | | `plugin-sdk/memory-core-host-multimodal` | 内存主机多模态辅助函数 | 内存主机多模态辅助函数 | |
  `plugin-sdk/memory-core-host-query` | 内存主机查询辅助函数 | 内存主机查询辅助函数 | | `plugin-sdk/memory-core-host-secret` | 内存主机密钥辅助函数 | 内存主机密钥辅助函数 | | `plugin-sdk/memory-core-host-events` | 内存主机事件日志辅助函数 | 内存主机事件日志辅助函数 | | `plugin-sdk/memory-core-host-status` | 内存主机状态辅助函数 | 内存主机状态辅助函数 | | `plugin-sdk/memory-core-host-runtime-cli` |
  内存主机 CLI 运行时 | 内存主机 CLI 运行时辅助函数 | | `plugin-sdk/memory-core-host-runtime-core` | 内存主机核心运行时 | 内存主机核心运行时辅助函数 | | `plugin-sdk/memory-core-host-runtime-files` | 内存主机文件/运行时辅助函数 | 内存主机文件/运行时辅助函数 | | `plugin-sdk/memory-host-core` | 内存主机核心运行时别名 | 内存主机核心运行时辅助函数的供应商中立别名 | | `plugin-sdk/memory-host-events` |
  内存主机事件日志别名 | 内存主机事件日志辅助函数的供应商中立别名 | | `plugin-sdk/memory-host-files` | 内存主机文件/运行时别名 | 内存主机文件/运行时辅助函数的供应商中立别名 | | `plugin-sdk/memory-host-markdown` | 托管 Markdown 辅助函数 | 用于内存相邻插件的共享托管 Markdown 辅助函数 | | `plugin-sdk/memory-host-search` | 主动内存搜索外观 | 延迟主动内存搜索管理器运行时外观 | |
  `plugin-sdk/memory-host-status` | 内存主机状态别名 | 内存主机状态辅助函数的供应商中立别名 | | `plugin-sdk/memory-lancedb` | 捆绑内存 LanceDB 辅助函数 | 内存 LanceDB 辅助函数表面 | | `plugin-sdk/testing` | 测试实用工具 | 测试辅助函数和模拟 |
</Accordion>

此表格特意列出了常用的迁移子集，而非完整的 SDK
接口。包含 200 多个入口点的完整列表位于
`scripts/lib/plugin-sdk-entrypoints.json`。

该列表仍包含一些捆绑插件辅助接口，例如
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。这些接口为了捆绑插件的维护和兼容性仍然保留导出，但被有意从通用迁移表中省略，并不是新插件代码的推荐目标。

同样的规则也适用于其他捆绑辅助系列，例如：

- 浏览器支持辅助：`plugin-sdk/browser-cdp`、`plugin-sdk/browser-config-runtime`、`plugin-sdk/browser-config-support`、`plugin-sdk/browser-control-auth`、`plugin-sdk/browser-node-runtime`、`plugin-sdk/browser-profiles`、`plugin-sdk/browser-security-runtime`、`plugin-sdk/browser-setup-tools`、`plugin-sdk/browser-support`
- Matrix：`plugin-sdk/matrix*`
- LINE：`plugin-sdk/line*`
- IRC：`plugin-sdk/irc*`
- 捆绑辅助/插件接口，例如 `plugin-sdk/googlechat`、
  `plugin-sdk/zalouser`、`plugin-sdk/bluebubbles*`、
  `plugin-sdk/mattermost*`、`plugin-sdk/msteams`、
  `plugin-sdk/nextcloud-talk`、`plugin-sdk/nostr`、`plugin-sdk/tlon`、
  `plugin-sdk/twitch`、
  `plugin-sdk/github-copilot-login`、`plugin-sdk/github-copilot-token`、
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diagnostics-prometheus`、
  `plugin-sdk/diffs`、`plugin-sdk/llm-task`、`plugin-sdk/thread-ownership`
  和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 当前暴露了狭窄的 token 辅助
接口 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

使用与任务匹配的最狭窄导入。如果您找不到导出，请查看 `src/plugin-sdk/` 处的源码或在 Discord 中询问。

## Active deprecations

适用于整个插件 SDK、提供商合约、运行时层和清单的更具体的弃用项。每一项目前仍然有效，但将在未来的主要版本中移除。每项下方的条目将旧的 API 映射到其规范替代项。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **旧 (`openclaw/plugin-sdk/command-auth`)**: `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **新 (`openclaw/plugin-sdk/command-status`)**: 相同的签名，相同的导出 —— 只是从更具体的子路径导入。`command-auth`
    将它们作为兼容性存根重新导出。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **旧**: 来自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的
    `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`.

    **新**: `resolveInboundMentionDecision({ facts, policy })` — 返回
    单个决策对象，而不是两次分离的调用。

    下游渠道插件（Slack、Discord、Matrix、MS Teams）已经
    完成切换。

  </Accordion>

  <Accordion title="Channel runtime shim and 渠道 actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是针对较旧
    渠道插件的兼容性填充层。不要在新代码中导入它；请使用
    `openclaw/plugin-sdk/channel-runtime-context` 来注册运行时
    对象。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 辅助函数与原始“actions”渠道导出一起被弃用。请通过语义化的 `presentation` 层来暴露功能 —— 渠道插件声明它们渲染的内容（卡片、按钮、选择器），而不是它们接受的原始操作名称。

  </Accordion>

  <Accordion title="Web search 提供商 工具() helper → createTool() on the plugin">
    **旧版**: 来自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` 工厂。

    **新版**: 直接在提供商插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 辅助函数来注册工具封装器。

  </Accordion>

  <Accordion title="Plaintext 渠道 envelopes → BodyForAgent">
    **旧版**: 使用 `formatInboundEnvelope(...)` (和
    `ChannelMessageForAgent.channelEnvelope`) 从入站渠道消息构建扁平的纯文本提示词信封。

    **新版**: 使用 `BodyForAgent` 加上结构化的用户上下文块。渠道插件将路由元数据（线程、主题、回复目标、反应）作为类型化字段附加，而不是将它们连接成提示词字符串。`formatAgentEnvelope(...)` 辅助函数仍支持面向助手的合成信封，但入站纯文本信封即将被弃用。

    受影响区域：`inbound_claim`、`message_received` 以及任何对 `channelEnvelope` 文本进行后处理的自定义渠道插件。

  </Accordion>

  <Accordion title="Provider discovery types → 提供商 catalog types">
    四个发现类型别名现在是目录时代类型的简单封装：

    | Old alias                 | New type                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外，还有旧版 `ProviderCapabilities` 静态包 — 提供商插件应通过提供商运行时合约附加功能事实，而不是使用静态对象。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **旧版**（`ProviderThinkingPolicy` 上的三个单独钩子）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：一个单一的 `resolveThinkingProfile(ctx)`，它返回一个
    `ProviderThinkingProfile`，其中包含规范的 `id`、可选的 `label` 和
    排名级别列表。OpenClaw 会根据配置文件
    排名自动降级过时的存储值。

    实现一个钩子而不是三个。旧版钩子在弃用期间仍然有效，但不会与配置文件结果组合。

  </Accordion>

  <Accordion title="External OAuth 提供商 fallback → contracts.externalAuthProviders">
    **旧版**：实现 `resolveExternalOAuthProfiles(...)` 但不
    在插件清单中声明提供商。

    **新版**：在插件清单中声明 `contracts.externalAuthProviders`
    **并**实现 `resolveExternalAuthProfiles(...)`。旧的“身份验证
    回退”路径在运行时会发出警告，并且将被移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **旧版**清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新版**：将相同的环境变量查找镜像到清单上的 `setup.providers[].envVars`
    中。这会将设置/状态环境元数据整合在一个
    地方，并避免仅为了回答环境变量
    查找而启动插件运行时。

    `providerAuthEnvVars` 在弃用窗口关闭前通过兼容性适配器
    保持支持。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **旧版**：三次单独调用 —
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **新版**：在 memory-state API 上进行一次调用 —
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    相同的插槽，单一的注册调用。附加的内存辅助工具
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) 不受影响。

  </Accordion>

  <Accordion title="Subagent 会话 messages types renamed">
    仍然从 `src/plugins/runtime/types.ts` 导出的两个旧版类型别名：

    | 旧版                           | 新版                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已被弃用，取而代之的是
    `getSessionMessages`。签名相同；旧方法内部调用新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.flows">
    **旧版**：`runtime.tasks.flow` (单数) 返回一个实时的任务流访问器。

    **新版**：`runtime.tasks.flows` (复数) 返回基于 DTO 的 TaskFlow 访问，
    这种方式导入安全，并且不需要加载完整的任务运行时。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow(ctx);
    // After
    const flows = api.runtime.tasks.flows(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent 工具-result middleware">详见上方的“如何迁移 → 将 Pi 工具结果扩展迁移到中间件”。为了完整性在此包含：已移除的仅限 Pi 的 `api.registerEmbeddedExtensionFactory(...)` 路径已被 `api.registerAgentToolResultMiddleware(...)` 取代，并在 `contracts.agentToolResultMiddleware` 中包含显式的运行时列表。</Accordion>

  <Accordion title="OpenClawSchemaType 别名 → OpenClawConfig">
    从 `openclaw/plugin-sdk` 重新导出的 `OpenClawSchemaType` 现在是
    `OpenClawConfig` 的单行别名。建议使用规范名称。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>扩展级别的弃用（在 `extensions/` 下的捆绑渠道/提供商插件内部） 在其自己的 `api.ts` 和 `runtime-api.ts` 桶中进行跟踪。它们不影响第三方插件契约，此处未列出。 如果您直接使用捆绑插件的本地桶，请在升级前阅读该桶中的弃用注释。</Note>

## 移除时间表

| 时间               | 发生情况                                     |
| ------------------ | -------------------------------------------- |
| **现在**           | 已弃用的接口会发出运行时警告                 |
| **下一个主要版本** | 已弃用的接口将被移除；仍使用它们的插件将失败 |

所有核心插件均已迁移。外部插件应在下一个主要版本之前迁移。

## 暂时抑制警告

在进行迁移工作时，请设置以下环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这是一个临时的应急手段，而非永久解决方案。

## 相关内容

- [入门指南](/zh/plugins/building-plugins) — 构建您的第一个插件
- [SDK 概述](/zh/plugins/sdk-overview) — 完整的子路径导入参考
- [渠道插件](/zh/plugins/sdk-channel-plugins) — 构建渠道插件
- [提供商插件](/zh/plugins/sdk-provider-plugins) — 构建提供商插件
- [插件内部机制](/zh/plugins/architecture) — 架构深度解析
- [插件清单](/zh/plugins/manifest) — 清单架构参考
