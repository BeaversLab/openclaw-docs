---
summary: "插件架构内部机制：加载流水线、注册表、运行时钩子、HTTP 路由和参考表"
read_when:
  - Implementing provider runtime hooks, channel lifecycle, or package packs
  - Debugging plugin load order or registry state
  - Adding a new plugin capability or context engine plugin
title: "插件架构内部机制"
---

有关公共能力模型、插件形态以及所有权/执行合约，请参阅 [插件架构](</en/plugins/architectureGateway(网关)>)。 本页面是内部机制的参考：加载流程、注册表、运行时钩子、Gateway(网关) HTTP 路由、导入路径和架构表。

## 加载流水线

启动时，OpenClaw大致执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的捆绑包清单和包元数据
3. 拒绝不安全的候选者
4. 规范化插件配置 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 决定每个候选者的启用状态
6. 加载启用的原生模块：构建的打包模块使用原生加载器；
   第三方本地源 TypeScript 使用紧急 Jiti 回退
7. 调用原生 `register(api)` 钩子并将注册信息收集到插件注册表中
8. 将注册表暴露给命令/运行时表面

<Note>`activate` 是 `register` 的旧别名 — 加载器会解析存在的那个 (`def.register ?? def.activate`) 并在同一时刻调用它。所有捆绑插件都使用 `register`；对于新插件，首选 `register`。</Note>

安全检查发生在运行时执行**之前**。当入口点逃逸插件根目录、路径全局可写，或者对于非捆绑插件，路径所有权看起来可疑时，候选者将被阻止。

被阻止的候选项在诊断时仍与其插件 id 绑定。如果配置
仍引用该 id，验证将报告插件存在但被阻止，
并指向路径安全警告，而不是将配置条目
视为过时。

### Manifest-first behavior

清单是控制平面的单一事实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的渠道/技能/配置架构或打包能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据
- 保留廉价的激活和设置描述符，而无需加载插件运行时

对于原生插件，运行时模块是数据平面部分。它注册
实际行为，例如钩子、工具、命令或提供商流。

可选的清单 `activation` 和 `setup` 块保留在控制平面上。
它们是仅用于激活规划和设置发现的元数据描述符；
它们不取代运行时注册、`register(...)` 或 `setupEntry`。
首批实时激活消费者现在使用清单命令、渠道和提供商提示
在更广泛的注册表具体化之前缩小插件加载范围：

- CLI 加载缩小到拥有请求的主要命令的插件
- 渠道设置/插件解析缩小到拥有请求的
  渠道 id 的插件
- 显式提供商设置/运行时解析缩小到拥有
  请求的提供商 id 的插件
- Gateway(网关) 启动规划使用 Gateway(网关)`activation.onStartup` 进行显式启动
  导入和启动退出；没有启动元数据的插件仅
  通过更窄的激活触发器加载

请求时运行时预加载如果请求广泛的 `all`OpenClaw 作用域，仍然会从配置、启动规划、配置的通道、插槽和自动启用规则中得出明确的有效插件 ID 集。如果得出的集为空，OpenClaw 将加载一个空的运行时注册表，而不是扩展到每个可发现的插件。

激活规划器为现有调用者公开了仅 ID 的 API，并为新诊断公开了计划 API。计划条目报告选择插件的原因，将显式 `activation.*` 规划器提示与清单所有权回退（例如 `providers`、`channels`、`commandAliases`、`setup.providers`、`contracts.tools` 和钩子）分离开来。这种原因分离是兼容性边界：现有的插件元数据继续工作，而新代码可以在不更改运行时加载语义的情况下检测广泛提示或回退行为。

设置发现现在优先使用描述符拥有的 ID（如 `setup.providers` 和 `setup.cliBackends`）来缩小候选插件范围，然后才回退到 `setup-api` 以用于仍然需要设置时运行时钩子的插件。提供商设置列表使用清单 `providerAuthChoices`、派生自描述符的设置选项和安装目录元数据，而无需加载提供商运行时。显式 `setup.requiresRuntime: false` 是仅描述符的截止点；省略 `requiresRuntime` 则保留传统的 setup-api 回退以实现兼容性。如果有多个已发现的插件声明同一个规范化设置提供商或 CLI 后端 ID，设置查找将拒绝模棱两可的所有者，而不是依赖发现顺序。当设置运行时确实执行时，注册表诊断会报告 `setup.providers` / `setup.cliBackends` 与由 setup-api 注册的提供商或 CLI 后端之间的差异，而不会阻止传统插件。

### 插件缓存边界

OpenClaw 不会在挂钟时间窗口内缓存插件发现结果或直接清单注册表数据。安装、清单编辑和加载路径更改必须在下一次显式元数据读取或快照重建时可见。清单文件解析器可能会保留一个有界的文件签名缓存，以打开的清单路径、inode、大小和时间戳为键；该缓存仅用于避免重新解析未更改的字节，绝不能缓存发现、注册表、所有者或策略答案。

安全的元数据快速路径是显式的对象所有权，而不是隐藏的缓存。Gateway(网关) 启动热路径应该传递当前的 `PluginMetadataSnapshot`、派生的 `PluginLookUpTable` 或显式的清单注册表通过调用链。配置验证、启动自动启用、插件引导和提供商选择可以重用这些对象，只要它们代表当前配置和插件清单。设置查找仍然按需重建清单元数据，除非特定的设置路径接收到显式的清单注册表；将其保留为冷路径回退，而不是添加隐藏的查找缓存。当输入更改时，重建并替换快照，而不是对其进行突变或保留历史副本。对活动插件注册表和捆绑渠道引导助手的视图应该从当前注册表/根目录重新计算。短生命周期的映射在一次调用中去重工作或防止重入是可以的；它们绝不能成为进程元数据缓存。

对于插件加载，持久化缓存层是运行时加载。当实际加载代码或安装的工件时，它可能会重用加载器状态，例如：

- `PluginLoaderCacheState` 和兼容的活动运行时注册表
- jiti/module 缓存和 public-surface 加载器缓存，用于避免重复导入相同的运行时表面
- 已安装插件工件的文件系统缓存
- 用于路径规范化或重复解析的短期每次调用映射

这些缓存是数据平面的实现细节。它们绝不能回答控制平面问题，例如“哪个插件拥有此提供商？”，除非调用者明确要求运行时加载。

不要为以下内容添加持久化或挂钟缓存：

- 发现结果
- 直接清单注册表
- 从已安装插件索引重建的清单注册表
- 提供商所有者查找、模型抑制、提供商策略或公共工件元数据
- 任何其他从清单衍生的答案，其中更改的清单、已安装索引或加载路径应在下一次元数据读取时可见

从持久化的已安装插件索引重建清单元数据的调用者会按需重建该注册表。已安装索引是持久的源端状态；它不是隐藏的进程内元数据缓存。

## 注册表模型

已加载的插件不会直接改变随机的核心全局变量。它们注册到一个中央插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、起点、状态、诊断）
- 工具
- 旧版钩子和类型化钩子
- 通道
- 提供商
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能随后从该注册表读取，而不是直接与插件模块通信。这使加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对于可维护性很重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“为每个插件模块进行特殊处理”。

## 对话绑定回调

绑定对话的插件可以在审批被解决时做出反应。

使用 `api.onConversationBindingResolved(...)` 在绑定请求被批准或拒绝后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调负载字段：

- `status`: `"approved"` 或 `"denied"`
- `decision`: `"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`: 已批准请求的解析绑定
- `request`: 原始请求摘要、分离提示、发送者 ID 和对话元数据

此回调仅用于通知。它不会改变谁被允许绑定对话，并且它在核心审批处理完成后运行。

## 提供商运行时钩子

提供商插件有三个层：

- **Manifest 元数据**，用于廉价的运行前查找：
  `setup.providers[].envVars`、已弃用的兼容性 `providerAuthEnvVars`、
  `providerAuthAliases`、`providerAuthChoices` 和 `channelEnvVars`。
- **Config-time hooks**：`catalog`（旧版 `discovery`）以及
  `applyConfigDefaults`。
- **运行时钩子**：40 多个可选钩子，涵盖身份验证、模型解析、流封装、思考级别、重放策略和使用端点。请参阅 [Hook order and usage](#hook-order-and-usage) 下的完整列表。

OpenClaw 仍然拥有通用代理循环、故障转移、转录处理和
工具策略。这些 hooks 是提供商特定行为的扩展表面，
而不需要完整的自定义推理传输。

当提供商具有基于环境的凭据，且通用身份验证/状态/模型选择器路径应在
不加载插件运行时的情况下看到这些凭据时，请使用 manifest `setup.providers[].envVars`。已弃用的 `providerAuthEnvVars` 在弃用期内仍会被兼容性适配器读取，
使用它的非捆绑插件会收到一个 manifest 诊断信息。当一个提供商 ID 应重用另一个提供商 ID 的环境变量、身份验证配置文件、
配置支持的身份验证和 API 密钥新手引导选择时，请使用 manifest `providerAuthAliases`。
当新手引导/身份验证选择 CLI 表面应知道提供商的选择 ID、组标签和简单的单标志身份验证接线，而无需
加载提供商运行时时，请使用 manifest
`providerAuthChoices`。请保留提供商运行时
`envVars` 用于面向操作员的提示，例如新手引导标签或 OAuth
client-id/client-secret 设置变量。

当渠道具有环境驱动的身份验证或设置，且通用 shell-env 回退、配置/状态检查或设置提示应在
不加载渠道运行时的情况下看到这些信息时，请使用 manifest `channelEnvVars`。

### Hook 顺序和用法

对于模型/提供商插件，OpenClaw 大致按此顺序调用钩子。
“何时使用”列是快速决策指南。
OpenClaw 不再调用的仅兼容性提供商字段，例如
OpenClawOpenClaw`ProviderPlugin.capabilities` 和 `suppressBuiltInModel`，特意未
在此列出。

| #   | 钩子                              | 作用                                                                                                   | 何时使用                                                                                           |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | 在生成 `models.json` 期间，将提供商配置发布到 `models.providers`                                       | 提供商拥有目录或基础 URL 默认值                                                                    |
| 2   | `applyConfigDefaults`             | 在配置具体化期间应用提供商拥有的全局配置默认值                                                         | 默认值取决于身份验证模式、环境或提供商模型系列语义                                                 |
| --  | （内置模型查找）                  | OpenClaw 首先尝试正常的注册表/目录路径                                                                 | （非插件钩子）                                                                                     |
| 3   | `normalizeModelId`                | 在查找之前规范化旧版或预览版模型 ID 别名                                                               | 提供商在规范模型解析之前拥有别名清理权                                                             |
| 4   | `normalizeTransport`              | 在通用模型组装之前规范化提供商系列 `api` / `baseUrl`                                                   | 提供商负责清理同一传输系列中自定义提供商 ID 的传输信息                                             |
| 5   | `normalizeConfig`                 | 在运行时/提供商解析之前规范化 `models.providers.<id>`                                                  | 提供商需要应驻留在插件中的配置清理；捆绑的 Google 系列助手也为支持的 Google 配置条目提供兜底       |
| 6   | `applyNativeStreamingUsageCompat` | 对配置提供商应用原生流使用兼容性重写                                                                   | 提供商需要端点驱动的原生流使用元数据修复                                                           |
| 7   | `resolveConfigApiKey`             | 在运行时身份验证加载之前，为配置提供商解析环境标记身份验证                                             | 提供商公开其自己的 env-marker API 密钥解析挂钩                                                     |
| 8   | `resolveSyntheticAuth`            | 公开本地/自托管或配置支持的身份验证，而不持久化明文                                                    | 提供商可以使用合成/本地凭据标记进行操作                                                            |
| 9   | `resolveExternalAuthProfiles`     | 覆盖提供商拥有的外部身份验证配置文件；默认 `persistence` 为 CLI/应用拥有的凭据设置为 `runtime-only`CLI | 提供商重用外部身份验证凭据而不持久化复制的刷新令牌；在清单中声明 `contracts.externalAuthProviders` |
| 10  | `shouldDeferSyntheticProfileAuth` | 降低存储的合成配置文件占位符在环境/配置支持的身份验证中的优先级                                        | 提供商存储不应获得优先权的合成占位符配置文件                                                       |
| 11  | `resolveDynamicModel`             | 针对本地注册表中尚未有的提供商拥有的模型 ID 的同步回退                                                 | 提供商接受任意上游模型 ID                                                                          |
| 12  | `prepareDynamicModel`             | 异步预热，然后 `resolveDynamicModel` 再次运行                                                          | 提供商在解析未知 ID 之前需要网络元数据                                                             |
| 13  | `normalizeResolvedModel`          | 在嵌入式运行程序使用已解析的模型之前的最终重写                                                         | 提供商需要传输重写，但仍使用核心传输                                                               |
| 14  | `normalizeToolSchemas`            | 在嵌入式运行程序看到工具架构之前对其进行规范化                                                         | 提供商需要传输族架构清理                                                                           |
| 15  | `inspectToolSchemas`              | 在规范化之后显示提供商拥有的架构诊断信息                                                               | 提供商希望在无需教授核心提供商特定规则的情况下获得关键字警告                                       |
| 16  | `resolveReasoningOutputMode`      | 选择原生与标记的推理输出契约                                                                           | 提供商需要标记的推理/最终输出，而不是原生字段                                                      |
| 17  | `prepareExtraParams`              | 在通用流选项包装器之前规范化请求参数                                                                   | 提供商需要默认请求参数或按提供商清理参数                                                           |
| 18  | `createStreamFn`                  | 使用自定义传输完全替换正常的流路径                                                                     | 提供商需要自定义线路协议，而不仅仅是包装器                                                         |
| 20  | `wrapStreamFn`                    | 应用通用包装器后的流包装器                                                                             | 提供商需要请求头/正文/模型兼容性包装器，但无需自定义传输                                           |
| 21  | `resolveTransportTurnState`       | 附加原生每轮传输头或元数据                                                                             | 提供商希望通用传输发送提供商原生的轮标识                                                           |
| 22  | `resolveWebSocketSessionPolicy`   | 附加原生 WebSocket 头或会话冷却策略                                                                    | 提供商希望通用 WS 传输调整会话头或回退策略                                                         |
| 23  | `formatApiKey`                    | 身份验证配置文件格式化程序：存储的配置文件变为运行时 `apiKey` 字符串                                   | 提供商存储额外的认证元数据，并且需要自定义运行时令牌形状                                           |
| 24  | `refreshOAuth`                    | OAuth 刷新覆盖，用于自定义刷新端点或刷新失败策略                                                       | 提供商不适合共享的 OpenClaw 刷新器                                                                 |
| 25  | `buildAuthDoctorHint`             | 当 OAuth 刷新失败时附加的修复提示                                                                      | 提供商在刷新失败后需要提供商拥有的身份验证修复指导                                                 |
| 26  | `matchesContextOverflowError`     | 提供商拥有的上下文窗口溢出匹配器                                                                       | 提供商具有通用启发式算法会遗漏的原始溢出错误                                                       |
| 27  | `classifyFailoverReason`          | 提供商拥有的故障转移原因分类                                                                           | 提供商可以将原始 API/传输错误映射到速率限制/过载/等                                                |
| 28  | `isCacheTtlEligible`              | 代理/回传提供商的提示缓存策略                                                                          | 提供商需要特定于代理的缓存 TTL 闸控                                                                |
| 29  | `buildMissingAuthMessage`         | 通用缺少身份验证恢复消息的替代品                                                                       | 提供商需要特定于提供商的缺少身份验证恢复提示                                                       |
| 30  | `augmentModelCatalog`             | 发现后附加的合成/最终目录行                                                                            | 提供商需要 `models list` 和选择器中的合成向前兼容行                                                |
| 31  | `resolveThinkingProfile`          | 模型特定的 `/think` 级别设定、显示标签和默认值                                                         | 提供商为选定的模型公开自定义的思维阶梯或二进制标签                                                 |
| 32  | `isBinaryThinking`                | 开/关推理切换兼容性挂钩                                                                                | 提供商仅公开二进制思维开/关                                                                        |
| 33  | `supportsXHighThinking`           | `xhigh` 推理支持兼容性挂钩                                                                             | 提供商希望仅对模型子集启用 `xhigh`                                                                 |
| 34  | `resolveDefaultThinkingLevel`     | 默认 `/think` 级别兼容性挂钩                                                                           | 提供商拥有模型系列的默认 `/think` 策略                                                             |
| 35  | `isModernModelRef`                | 用于实时配置文件过滤和烟雾测试选择的现代模型匹配器                                                     | 提供商拥有实时/烟雾测试首选模型匹配                                                                |
| 36  | `prepareRuntimeAuth`              | 在推理之前将配置的凭据交换为实际的运行时令牌/密钥                                                      | 提供商需要令牌交换或短期请求凭据                                                                   |
| 37  | `resolveUsageAuth`                | 解析 `/usage` 的使用/计费凭据及相关状态表面                                                            | 提供商需要自定义使用/配额令牌解析或不同的使用凭据                                                  |
| 38  | `fetchUsageSnapshot`              | 解析身份验证后获取并规范化提供商特定的使用/配额快照                                                    | 提供商需要提供商特定的使用端点或负载解析器                                                         |
| 39  | `createEmbeddingProvider`         | 为内存/搜索构建提供商拥有的嵌入适配器                                                                  | 内存嵌入行为属于提供商插件                                                                         |
| 40  | `buildReplayPolicy`               | 返回控制提供商转录处理的重放策略                                                                       | 提供商需要自定义转录策略（例如，思维块剥离）                                                       |
| 41  | `sanitizeReplayHistory`           | 在通用转录清理之后重写重放历史                                                                         | 提供商需要超出共享压缩助手之外的提供商特定重写重写                                                 |
| 42  | `validateReplayTurns`             | 在嵌入式运行器之前进行最终重放轮次验证或重塑                                                           | 提供商传输在通用清理后需要更严格的轮次验证                                                         |
| 43  | `onModelSelected`                 | 运行提供商拥有的选择后副作用                                                                           | 当模型变为活动状态时，提供商需要遥测数据或提供商拥有的状态                                         |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 首先检查匹配的提供商插件，然后回退到其他支持钩子的提供商插件，直到其中一个实际上更改了模型 ID 或传输/配置。这使得别名/兼容性提供商填充层能够正常工作，而无需调用者知道哪个捆绑插件拥有重写逻辑。如果没有提供商钩子重写受支持的 Google 系列配置条目，捆绑的 Google 配置规范化器仍然会应用该兼容性清理。

如果提供商需要完全自定义的线协议或自定义请求执行器，那是不同类别的扩展。这些钩子适用于仍在 OpenClaw 正常推理循环上运行的提供商行为。

`resolveUsageAuth`OpenClaw 决定 OpenClaw 是应该调用 `fetchUsageSnapshot` 还是回退到通用的凭据解析以用于使用/状态表面。当提供商拥有使用凭据时返回 `{ token, accountId? }`；当提供商拥有的使用身份验证已处理请求并且必须抑制通用的 API-key/OAuth 回退时，返回 `{ handled: true }`APIOAuth；当提供商未处理使用身份验证时，返回 `null` 或 `undefined`。

### 提供商示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 内置示例

捆绑的提供商插件结合了上述钩子，以适应每个供应商的目录、身份验证、思考、重放和使用需求。权威的钩子集合位于每个插件的 `extensions/` 下；本页面展示的是形状而不是镜像列表。

<AccordionGroup>
  <Accordion title="Pass-through catalog providers" OpenRouter>
    OpenRouter、Kilocode、Z.AI、xAI 注册 `catalog` 加上 `resolveDynamicModel` / `prepareDynamicModel`OpenClaw，以便它们可以在 OpenClaw 的静态目录之前展示上游 模型 ID。
  </Accordion>
  <Accordion title="OAuthOAuth 和使用端点提供商" GitHubCLIMiniMaxXiaomi>
    GitHub Copilot、Gemini CLI、ChatGPT Codex、MiniMax、Xiaomi、z.ai pair `prepareRuntimeAuth` 或 `formatApiKey` 配合 `resolveUsageAuth` + `fetchUsageSnapshot` 以自主进行令牌交换和 `/usage` 集成。
  </Accordion>
  <Accordion title="重放和转录清理系列">共享命名系列（`google-gemini`、`passthrough-gemini`、 `anthropic-by-model`、`hybrid-anthropic-openai`）允许提供商通过 `buildReplayPolicy` 选择加入转录策略，而无需每个插件 重新实现清理逻辑。</Accordion>
  <Accordion title="仅目录提供商">`byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`nvidia`、 `qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine` 仅注册 `catalog` 并使用共享推理循环。</Accordion>
  <Accordion title="AnthropicAnthropic 专用流辅助工具">Beta 头部、`/fast` / `serviceTier` 和 `context1m`Anthropic 位于 Anthropic 插件的公共 `api.ts` / `contract-api.ts` 接缝 （`wrapAnthropicProviderStream`、`resolveAnthropicBetas`、 `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`）内部，而非 在通用 SDK 中。</Accordion>
</AccordionGroup>

## 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

注意：

- `textToSpeech` 返回文件/语音便面的正常核心 TTS 输出负载。
- 使用核心 `messages.tts` 配置和提供商选择。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商进行重采样/编码。
- `listVoices` 对于每个提供商是可选的。将其用于供应商拥有的语音选择器或设置流程。
- 语音列表可以包含更丰富的元数据，例如区域设置、性别和个性标签，供支持提供商感知的选择器使用。
- OpenAI 和 ElevenLabs 目前支持电话功能。Microsoft 不支持。

插件也可以通过 `api.registerSpeechProvider(...)` 注册语音提供商。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

注意：

- 将 TTS 策略、回退和回复交付保留在核心中。
- 使用语音提供商处理供应商拥有的合成行为。
- 旧版 Microsoft `edge` 输入被标准化为 `microsoft` 提供商 ID。
- 首选的所有权模型是以公司为导向的：一个供应商插件可以拥有文本、语音、图像和未来的媒体提供商，因为 OpenClaw 添加了这些功能合约。

对于图像/音频/视频理解，插件注册一个类型化的媒体理解提供商，而不是通用的键/值包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

注意：

- 将编排、回退、配置和渠道布线保留在核心中。
- 将供应商行为保留在提供商插件中。
- 增量扩展应保持类型化：新的可选方法、新的可选结果字段、新的可选功能。
- 视频生成已经遵循相同的模式：
  - 核心拥有功能合约和运行时辅助程序
  - 供应商插件注册 `api.registerVideoGenerationProvider(...)`
  - 功能/渠道插件使用 `api.runtime.videoGeneration.*`

对于媒体理解运行时辅助程序，插件可以调用：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});

const extraction = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
  provider: "codex",
  model: "gpt-5.5",
  input: [
    {
      type: "image",
      buffer: receiptImageBuffer,
      fileName: "receipt.png",
      mime: "image/png",
    },
    { type: "text", text: "Use the printed fields as the source of truth." },
  ],
  instructions: "Return entities and searchable tags.",
  schemaName: "example.evidence",
  jsonSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
  },
  cfg: api.config,
});
```

对于音频转录，插件可以使用媒体理解运行时或较旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意：

- `api.runtime.mediaUnderstanding.*` 是图像/音频/视频理解的首选共享表面。
- `extractStructuredWithModel(...)` 是插件层的有界接口，用于以提供商拥有的图像优先提取。至少包含一个图像输入；文本输入是补充上下文。产品插件拥有其路由和架构，而 OpenClaw 拥有提供商/运行时边界。
- 使用核心媒体理解音频配置 (`tools.media.audio`) 和提供商回退顺序。
- 当未生成转录输出时（例如跳过/不支持的输入），返回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 保留为兼容性别名。

插件还可以通过 `api.runtime.subagent` 启动后台子代理运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

注意：

- `provider` 和 `model` 是每次运行的可选覆盖项，而非持久的会话更改。
- OpenClaw 仅对可信调用者遵守这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须使用 `plugins.entries.<id>.subagent.allowModelOverride: true` 选择加入。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将可信插件限制为特定的规范 `provider/model` 目标，或使用 `"*"` 显式允许任何目标。
- 不受信任的插件子代理运行仍然有效，但覆盖请求将被拒绝，而不是静默回退。
- 插件创建的子代理会话使用创建插件 ID 进行标记。回退 `api.runtime.subagent.deleteSession(...)` 只能删除那些拥有的会话；任意会话删除仍然需要管理员范围的 Gateway(网关) 请求。

对于网络搜索，插件可以使用共享运行时助手，而不是深入到代理工具连线中：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

插件还可以通过 `api.registerWebSearchProvider(...)` 注册网络搜索提供商。

注意：

- 将提供商选择、凭据解析和共享请求语义保留在核心中。
- 使用网络搜索提供商进行供应商特定的搜索传输。
- `api.runtime.webSearch.*` 是需要搜索行为但不依赖代理工具包装器的功能/渠道插件的首选共享接口。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用配置的图像生成提供商链生成图像。
- `listProviders(...)`：列出可用的图像生成提供商及其功能。

## Gateway(网关) HTTP 路由

插件可以通过 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`：网关 HTTP 服务器下的路由路径。
- `auth`：必填。使用 `"gateway"` 要求标准的网关身份验证，或使用 `"plugin"` 进行插件管理的身份验证/Webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其现有的路由注册。
- `handler`：当路由处理了请求时，返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已被移除，将导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 完全相同的 `path + match` 冲突将被拒绝，除非设置了 `replaceExisting: true`，并且一个插件不能替换另一个插件的路由。
- 具有不同 `auth` 级别的重叠路由将被拒绝。请将 `exact`/`prefix` 透传链保持在同一身份验证级别。
- `auth: "plugin"`Gateway(网关) 路由**不会**自动接收操作员运行时作用域。它们用于插件管理的 Webhook/签名验证，而非特权 Gateway(网关) 辅助调用。
- `auth: "gateway"`Gateway(网关) 路由在 Gateway(网关) 请求运行时作用域内运行，但该作用域是有意保持保守的：
  - 共享密钥承载者身份验证（`gateway.auth.mode = "token"` / `"password"`）将插件路由运行时作用域固定为 `operator.write`，即使调用者发送 `x-openclaw-scopes`
  - 可信的承载身份的 HTTP 模式（例如专用入口上的 `trusted-proxy` 或 `gateway.auth.mode = "none"`）仅在标头明确存在时才遵守 `x-openclaw-scopes`
  - 如果那些承载身份的插件路由请求中缺少 `x-openclaw-scopes`，运行时作用域将回退到 `operator.write`
- 实用规则：不要假设网关认证插件路由是隐式的管理界面。如果您的路由需要仅限管理员的操作，请要求使用承载身份的认证模式，并在文档中明确说明 `x-openclaw-scopes` 标头约定。

## Plugin SDK 导入路径

在编写新插件时，使用狭窄的 SDK 子路径，而不是单一的 `openclaw/plugin-sdk` 根桶。核心子路径：

| 子路径                              | 用途                                           |
| ----------------------------------- | ---------------------------------------------- |
| `openclaw/plugin-sdk/plugin-entry`  | 插件注册原语                                   |
| `openclaw/plugin-sdk/channel-core`  | 通道入口/构建辅助程序                          |
| `openclaw/plugin-sdk/core`          | 通用共享辅助程序和总体约定                     |
| `openclaw/plugin-sdk/config-schema` | 根 `openclaw.json` Zod 架构 (`OpenClawSchema`) |

通道插件从一系列狭窄的接缝中选择—— `channel-setup`、
`setup-runtime`、`setup-tools`、`channel-pairing`、
`channel-contract`、`channel-feedback`、`channel-inbound`、`channel-outbound`、
`command-auth`、`secret-input`、`webhook-ingress`、
`channel-targets` 和 `channel-actions`。审批行为应整合
到一个 `approvalCapability` 约定中，而不是混合在不相关的
插件字段中。请参阅 [通道插件](/zh/plugins/sdk-channel-plugins)。

运行时和配置辅助程序位于匹配的专用 `*-runtime` 子路径下
(`approval-runtime`, `agent-runtime`, `lazy-runtime`, `directory-runtime`,
`text-runtime`, `runtime-store`, `system-event-runtime`, `heartbeat-runtime`,
`channel-activity-runtime` 等)。请优先使用 `config-contracts`、
`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation`
而不是宽泛的 `config-runtime` 兼容层。

<Info>`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/channel-lifecycle`、 小型渠道辅助外观、`openclaw/plugin-sdk/outbound-runtime`、 `openclaw/plugin-sdk/outbound-send-deps`、`openclaw/plugin-sdk/config-runtime` 和 `openclaw/plugin-sdk/infra-runtime` 是针对较旧插件的已弃用兼容垫片。新代码应改为导入更窄的通用基元。</Info>

仓库内部入口点（每个打包的插件包根目录）：

- `index.js` — 打包插件入口
- `api.js` — 辅助程序/类型层
- `runtime-api.js` — 仅运行时层
- `setup-entry.js` — 设置插件入口

外部插件应仅导入 `openclaw/plugin-sdk/*` 子路径。切勿
从核心或其他插件导入另一个插件包的 `src/*`。外观加载的入口点在存在时优先使用活动运行时配置快照，然后回退到磁盘上解析的配置文件。

特定功能的子路径（如 `image-generation`、`media-understanding`
和 `speech`）之所以存在，是因为打包插件目前正在使用它们。它们并
非自动长期冻结的外部合约 —— 依赖它们时请查看相关的 SDK
参考页面。

## 消息工具架构

插件应拥有特定于渠道的 `describeMessageTool(...)` 架构贡献，用于非消息原语，如回应、已读和投票。共享的发送呈现应使用通用的 `MessagePresentation` 契约，而不是提供商原生的按钮、组件、块或卡片字段。有关契约、回退规则、提供商映射和插件作者检查清单，请参阅 [消息呈现](/zh/plugins/message-presentation)。

具备发送能力的插件通过消息功能声明它们可以呈现的内容：

- `presentation` 用于语义呈现块（`text`、`context`、`divider`、`buttons`、`select`）
- `delivery-pin` 用于固定投递请求

Core 决定是原生呈现呈现形式还是将其降级为文本。不要从通用消息工具中暴露提供商原生的 UI 逃生口。用于遗留原生架构的已弃用 SDK 助手仍然为现有的第三方插件导出，但新插件不应使用它们。

## 渠道目标解析

渠道插件应拥有特定于渠道的目标语义。保持共享出站主机通用，并使用消息适配器表面来处理提供商规则：

- `messaging.inferTargetChatType({ to })` 决定在目录查找之前，是否应将标准化目标视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉 core 输入是否应直接跳过到类似 ID 的解析，而不是目录搜索。
- `messaging.targetResolver.resolveTarget(...)` 是插件回退，当 core 在标准化或目录未命中后需要最终的提供商拥有的解析时。
- `messaging.resolveOutboundSessionRoute(...)` 拥有提供商特定的会话路由构造，一旦目标被解析。

推荐的划分：

- 使用 `inferTargetChatType` 进行应该在搜索对等/组之前发生的类别决策。
- 使用 `looksLikeId` 进行“将其视为显式/原生目标 ID”的检查。
- 使用 `resolveTarget` 进行特定于提供商的规范化后备，而不是用于
  广泛的目录搜索。
- 将聊天 ID、线程 ID、JID、句柄和房间 ID 等提供商原生 ID 保留在
  `target` 值或提供商特定的参数中，而不是在通用 SDK
  字段中。

## 基于配置的目录

从配置派生目录条目的插件应将该逻辑保留在插件中，并重复使用来自
`openclaw/plugin-sdk/directory-runtime` 的共享辅助程序。

当渠道需要基于配置的对等方/组时使用此功能，例如：

- 由允许列表驱动的私信对等方
- 已配置的渠道/组映射
- 账户范围的静态目录后备

`directory-runtime` 中的共享辅助程序仅处理通用操作：

- 查询过滤
- 限制应用
- 去重/规范化辅助程序
- 构建 `ChannelDirectoryEntry[]`

特定于渠道的账户检查和 ID 规范化应保留在插件实现中。

## 提供商目录

提供商插件可以使用 `registerProvider({ catalog: { run(...) { ... } } })` 定义用于推理的模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入
`models.providers` 的形状相同的形状：

- `{ provider }` 用于单个提供商条目
- `{ providers }` 用于多个提供商条目

当插件拥有特定于提供商的模型 ID、基础 URL
默认值或身份验证受控的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件目录相对于 OpenClaw
内置隐式提供商的合并时机：

- `simple`：纯 API 密钥或环境驱动的提供商
- `profile`：当存在身份验证配置文件时出现的提供商
- `paired`：综合多个相关提供商条目的提供商
- `late`：最后一遍，在其他隐式提供商之后

后面的提供商在键冲突时获胜，因此插件可以使用相同的提供商 ID 故意覆盖
内置提供商条目。

插件也可以通过 `api.registerModelCatalogProvider({ 提供商, kinds, staticCatalog, liveCatalog
})` 发布只读模型行。这是列表/帮助/选择器界面的正向路径，支持 `text`、`image_generation`、`video_generation` 和 `music_generation` 行。
提供商插件仍然拥有实时端点调用、令牌交换和供应商响应映射的所有权；核心拥有通用行形状、源标签和媒体工具帮助格式的所有权。媒体生成提供商注册会自动从 `defaultModel`、`models` 和 `capabilities` 合成静态目录行。

兼容性：

- `discovery` 仍作为旧版别名工作，但会发出弃用警告
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`
- `augmentModelCatalog` 已被弃用；捆绑提供商应通过 `registerModelCatalogProvider` 发布补充行

## 只读渠道检查

如果您的插件注册了渠道，建议在 `resolveAccount(...)` 旁边实现 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它被允许假设凭证已完全具体化，并且当缺少所需的密钥时可以快速失败。
- 诸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及医生/配置
  修复流程之类的只读命令路径，不应该仅仅为了描述配置而具体化运行时凭证。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性帐户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭证源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- 您不需要返回原始令牌值仅为了报告只读可用性。返回 `tokenStatus: "available"`（以及匹配的源字段）对于状态类命令来说就足够了。
- 当凭证通过 SecretRef 配置但在当前命令路径中不可用时，使用 `configured_unavailable`。

这使得只读命令能够报告“已配置但在当前命令路径中不可用”，而不是崩溃或将账户错误地报告为未配置。

## 软件包包

插件目录可能包含一个带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都成为一个插件。如果该包列出了多个扩展，插件 ID 将变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖，请在该目录中安装它们，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：解析符号链接后，每个 `openclaw.extensions` 条目必须保留在插件目录内。转义出包目录的条目将被拒绝。

安全提示：`openclaw plugins install` 使用项目本地的 `npm install --omit=dev --ignore-scripts` 安装插件依赖（无生命周期脚本，运行时无开发依赖），忽略继承的全局 npm 安装设置。保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的软件包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅设置模块。当 OpenClaw 需要为已禁用的渠道插件提供设置界面，或者当渠道插件已启用但尚未配置时，它会加载 `setupEntry` 而不是完整的插件入口。这可以在您的主插件入口同时连接工具、钩子或其他仅运行时代码时，使启动和设置更加轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以在网关的预监听启动阶段期间，使渠道插件选择使用相同的 `setupEntry` 路径，即使该渠道已配置也是如此。

仅当 `setupEntry` 完全覆盖网关开始监听之前必须存在的启动表面时，才使用此选项。实际上，这意味着 setup 入口必须注册启动所依赖的每个渠道拥有的能力，例如：

- 渠道注册本身
- 网关开始监听之前必须可用的任何 HTTP 路由
- 在同一窗口期间必须存在的任何网关方法、工具或服务

如果您的完整入口仍然拥有任何必需的启动能力，请不要启用此标志。保持插件的默认行为，并让 OpenClaw 在启动期间加载完整入口。

捆绑渠道还可以发布仅限设置的契约表面辅助程序，核心可以在加载完整的渠道运行时之前查阅这些辅助程序。当前的设置提升表面包括：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

当核心需要将传统的单账户渠道配置提升为 `channels.<id>.accounts.*` 而不加载完整的插件入口时，会使用该表面。Matrix 是当前的捆绑示例：当命名帐户已存在时，它仅将 auth/bootstrap 密钥移动到命名提升帐户，并且它可以保留配置的非规范 default-account 密钥，而不是始终创建 `accounts.default`。

这些设置修补适配器使捆绑契约表面的发现保持惰性。导入时间保持轻量；提升表面仅在首次使用时加载，而不是在模块导入时重新进入捆绑渠道启动。

当这些启动表面包含网关 RPC 方法时，请将它们保留在插件特定的前缀上。核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保留并始终解析为 `operator.admin`，即使插件请求更窄的范围也是如此。

示例：

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### 渠道目录元数据

渠道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，并通过 `openclaw.install` 宣传安装提示。这使得核心目录不包含数据。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

除最小示例外，还有其他有用的 `openclaw.channel` 字段：

- `detailLabel`：用于更丰富的目录/状态界面的次要标签
- `docsLabel`：覆盖文档链接的链接文本
- `preferOver`：此目录条目应超越的较低优先级的插件/渠道 ID
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：选择界面复制控件
- `markdownCapable`：将渠道标记为支持 Markdown，用于出站格式化决策
- `exposure.configured`：当设置为 `false` 时，在已配置渠道列表界面中隐藏该渠道
- `exposure.setup`：当设置为 `false` 时，在交互式设置/配置选择器中隐藏该渠道
- `exposure.docs`：在文档导航界面中将渠道标记为内部/私有
- `showConfigured` / `showInSetup`：为了兼容性仍接受的旧别名；建议使用 `exposure`
- `quickstartAllowFrom`：使渠道加入标准快速启动 `allowFrom` 流程
- `forceAccountBinding`：即使仅存在一个账户，也需要显式账户绑定
- `preferSessionLookupForAnnounceTarget`：在解析通知目标时优先查找会话

OpenClaw 还可以合并**外部渠道目录**（例如 MPM 注册表导出）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器还接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧别名。

生成的渠道目录条目和提供商安装目录条目在原始 `openclaw.install`npmnpm 块旁边公开了规范化的安装源事实。规范化的事实标识 npm 规范是确切版本还是浮动选择器，是否存在预期的完整性元数据，以及本地源路径是否可用。当目录/包身份已知时，如果解析出的 npm 包名称偏离该身份，规范化的事实会发出警告。当 `defaultChoice`npmnpm 无效或指向不可用的源，以及存在 npm 完整性元数据但没有有效的 npm 源时，它们也会发出警告。使用者应将 `installSource` 视为一个附加的可选字段，因此手动构建的条目和目录垫片不必合成它。这使得新手引导和诊断可以在不导入插件运行时的情况下解释源平面状态。

官方外部 npm 条目应首选确切的 npm`npmSpec` 加上 `expectedIntegrity`。裸包名称和分发标签（dist-tags）仍然为了兼容性而工作，但它们会显示源平面警告，以便目录可以在不破坏现有插件的情况下转向固定的、经过完整性检查的安装。当从本地目录路径进行新手引导安装时，它会记录一个托管插件插件索引条目，其中包含 `source: "path"` 和可能的相对于工作区的 `sourcePath`。绝对操作加载路径保留在 `plugins.load.paths` 中；安装记录避免了将本地工作站路径重复到长期存在的配置中。这使得本地开发安装对源平面诊断可见，而无需添加第二个原始文件系统路径披露面。持久化的 `installed_plugin_index` SQLite 行是安装的真实来源，可以在不加载插件运行时模块的情况下刷新。它的 `installRecords` 映射即使在插件清单丢失或无效时也是持久的；它的 `plugins` 有效负载是一个可重建的清单视图。

## 上下文引擎插件

上下文引擎插件拥有会话上下文的编排，包括摄取、组装和压缩。使用 `api.registerContextEngine(id, factory)` 从你的插件中注册它们，然后使用 `plugins.slots.contextEngine` 选择活动引擎。

当你的插件需要替换或扩展默认的上下文管线，而不仅仅是添加内存搜索或钩子时，请使用此功能。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

工厂 `ctx` 暴露了可选的 `config`、`agentDir` 和 `workspaceDir` 值，用于构造时的初始化。

当活动的线束具有持久化的后端线程时，`assemble()` 可能会返回 `contextProjection`。对于传统的按轮次投影，请忽略它。当组装的上下文应该注入一次到后端线程并重复使用直到时期更改变，请返回 `{ mode: "thread_bootstrap", epoch }`。在引擎的语义上下文更改之后更改时期，例如在引擎拥有的压缩遍之后。主机可能会在线程引导投影中保留工具调用元数据、输入形状和编辑过的工具结果，以便新的后端线程保持工具连续性，而无需复制原始的承载秘密的载荷。

如果你的引擎**不**拥有压缩算法，请保持 `compact()` 已实现并显式地委托它：

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## 添加新功能

当插件需要不符合当前 API 的行为时，不要使用私有方式绕过插件系统。请添加缺失的功能。

推荐顺序：

1. 定义核心契约
   决定核心应该拥有哪些共享行为：策略、回退、配置合并、生命周期、面向渠道的语义和运行时辅助器形状。
2. 添加类型化插件注册/运行时表面
   使用最小有用的类型化功能表面扩展 `OpenClawPluginApi` 和/或 `api.runtime`。
3. 连接核心 + 渠道/功能消费者
   渠道和功能插件应该通过核心来使用新功能，而不是直接导入供应商的实现。
4. 注册供应商实现
   然后供应商插件针对该功能注册其后端。
5. 添加契约覆盖
   添加测试，以便所有权和注册形状随着时间的推移保持明确。

这就是 OpenClaw 在不硬编码于某一提供商世界观的情况下保持其设计理念的方式。有关具体的文件清单和实际示例，请参阅 [Capability Cookbook](/zh/tools/capability-cookbook)。

### 能力检查清单

当你添加一个新能力时，实现通常应该同时涉及以下这些层面：

- `src/<capability>/types.ts` 中的核心契约类型
- `src/<capability>/runtime.ts` 中的核心运行器/运行时辅助程序
- `src/plugins/types.ts` 中的插件 API 注册表面
- `src/plugins/registry.ts` 中的插件注册表连接
- 当功能/渠道插件需要使用该能力时，在 `src/plugins/runtime/*` 中的插件运行时暴露
- `src/test-utils/plugin-registration.ts` 中的捕获/测试辅助程序
- `src/plugins/contracts/registry.ts` 中的所有权/契约断言
- `docs/` 中的操作员/插件文档

如果缺少其中一个层面，这通常表明该能力尚未完全集成。

### 能力模板

最小模式：

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

契约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

这使规则保持简单：

- 核心拥有能力契约和编排
- 供应商插件拥有供应商实现
- 功能/渠道插件使用运行时辅助程序
- 契约测试保持所有权明确

## 相关

- [Plugin architecture](/zh/plugins/architecture) — 公共能力模型和形状
- [Plugin SDK subpaths](/zh/plugins/sdk-subpaths)
- [Plugin SDK setup](/zh/plugins/sdk-setup)
- [Building plugins](/zh/plugins/building-plugins)
