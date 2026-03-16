---
summary: "OpenClaw 插件/扩展：设备发现、配置和安全"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
---

# 插件（扩展）

## 快速开始（插件新手？）

插件分为以下两种：

- 原生 **OpenClaw 插件**（`openclaw.plugin.json` + 运行时模块），或者
- 兼容的 **包**（`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`）

两者都会显示在 `openclaw plugins` 下，但只有原生 OpenClaw 插件会在进程内
执行运行时代码。

大多数情况下，当你想要核心 OpenClaw 尚未内置的功能（或者你想
将可选功能排除在主安装之外）时，你会使用插件。

快速路径：

1. 查看已加载的内容：

```bash
openclaw plugins list
```

2. 安装官方插件（例如：语音通话）：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 规范仅限于 **registry-only**（包名称 + 可选的 **确切版本** 或
**dist-tag**）。拒绝 Git/URL/文件规范和 semver 范围。

裸规范和 `@latest` 会保持在稳定轨道上。如果 npm 将其中任一
解析为预发布版本，OpenClaw 将停止并要求你使用预发布标签（如 `@beta`/`@rc`）
或确切的预发布版本显式选择加入。

3. 重启 Gateway(网关)，然后在 `plugins.entries.<id>.config` 下进行配置。

有关具体的插件示例，请参阅 [语音通话](/zh/plugins/voice-call)。
寻找第三方列表？请参阅 [社区插件](/zh/plugins/community)。
需要包兼容性详细信息？请参阅 [插件包](/zh/plugins/bundles)。

对于兼容的包，从本地目录或归档文件安装：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

## 架构

OpenClaw 的插件系统有四个层级：

1. **清单 + 设备发现**
   OpenClaw 从配置的路径、工作区根目录、
   全局扩展根目录和打包扩展中查找候选插件。设备发现首先读取原生
   `openclaw.plugin.json` 清单以及支持的包清单。
2. **启用 + 验证**
   核心决定发现的插件是启用、禁用、阻止，还是
   为独占插槽（例如内存）选择。
3. **运行时加载**
   原生 OpenClaw 插件通过 jiti 在进程内加载，并将功能注册到中央注册表中。兼容的插件包被规范化为注册表记录，而无需导入运行时代码。
4. **Surface consumption**
   OpenClaw 的其余部分读取注册表以暴露工具、渠道、提供商设置、钩子、HTTP 路由、CLI 命令和服务。

重要的设计边界：

- 发现 + 配置验证应基于 **manifest/schema 元数据** 工作，
  而无需执行插件代码
- 原生运行时行为源自插件模块的 `register(api)` 路径

这种分离让 OpenClaw 能够在完整运行时激活之前验证配置、解释缺失/禁用的插件，
并构建 UI/schema 提示。

## 兼容的插件包

OpenClaw 还识别两种兼容的外部插件包布局：

- Codex 风格的插件包：`.codex-plugin/plugin.json`
- Claude 风格的插件包：`.claude-plugin/plugin.json` 或没有 manifest 的默认 Claude
  组件布局
- Cursor 风格的插件包：`.cursor-plugin/plugin.json`

它们在插件列表中显示为 `format=bundle`，并在详细/信息输出中具有
`codex` 或 `claude` 的子类型。

有关确切的检测规则、映射行为和当前支持矩阵，请参阅 [插件包](/zh/plugins/bundles)。

目前，OpenClaw 将这些视为 **capability packs**（功能包），而不是原生运行时
插件：

- 目前支持：打包的 `skills`
- 目前支持：Claude `commands/` markdown 根目录，映射到常规
  OpenClaw 技能加载器
- 目前支持：用于嵌入式 Pi 代理设置的 Claude 插件包 `settings.json` 默认值
  （已清理 shell 覆盖键）
- 目前支持：映射到常规
  OpenClaw 技能加载器的 Cursor `.cursor/commands/*.md` 根目录
- 目前支持：使用 OpenClaw hook-pack 布局的 Codex 插件包 hook 目录
  （`HOOK.md` + `handler.ts`/`handler.js`）
- 已检测但尚未连接：其他声明的插件包功能，例如
  代理、Claude hook 自动化、Cursor 规则/hooks/MCP 元数据、MCP/app/LSP
  元数据、输出样式

这意味着 bundle 的安装/发现/列表/信息/启用都能正常工作，并且当 bundle 启用时，bundle 技能、Claude 命令技能、Claude bundle 设置默认值以及兼容的 Codex hook 目录都会加载，但 bundle 运行时代码不会在进程内执行。

Bundle hook 支持仅限于常规的 OpenClaw hook 目录格式（在声明的 hook 根目录下的 `HOOK.md` 加上 `handler.ts`/`handler.js`）。特定于供应商的 shell/JSON hook 运行时，包括 Claude `hooks.json`，目前仅被检测到，不会直接执行。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) 在同一进程内运行。它们不是沙箱隔离的。已加载的原生插件具有与核心代码相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、hooks 和服务
- 原生插件中的 bug 可能会导致网关崩溃或不稳定
- 恶意原生插件等同于在 OpenClaw 进程内执行任意代码

兼容的 bundle 默认更安全，因为 OpenClaw 目前将它们视为元数据/内容包。在当前版本中，这主要指捆绑的技能。

对非捆绑插件使用允许列表和明确的安装/加载路径。将工作区插件视为开发时代码，而非生产环境默认设置。

重要信任提示：

- `plugins.allow` 信任的是**插件 ID**，而非来源出处。
- 当启用或加入允许列表时，与捆绑插件具有相同 ID 的工作区插件会有意覆盖该捆绑副本。
- 这是正常且有用的，适用于本地开发、补丁测试和热修复。

## 可用插件（官方）

- 截至 2026.1.15，Microsoft Teams 仅作为插件提供；如果您使用 Teams，请安装 `@openclaw/msteams`。
- Memory (Core) — 捆绑的内存搜索插件（通过 `plugins.slots.memory` 默认启用）
- Memory (LanceDB) — 捆绑的长期记忆插件（自动回忆/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [语音通话](/zh/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo 个人版](/zh/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh/channels/msteams) — `@openclaw/msteams`
- Anthropic 提供商运行时 — 打包为 `anthropic` （默认启用）
- BytePlus 提供商目录 — 打包为 `byteplus` （默认启用）
- Cloudflare AI Gateway(网关) 提供商目录 — 打包为 `cloudflare-ai-gateway` （默认启用）
- Google 网络搜索 + Gemini CLI OAuth — 打包为 `google` （网络搜索会自动加载；提供商身份验证保持可选）
- GitHub Copilot 提供商运行时 — 打包为 `github-copilot` （默认启用）
- Hugging Face 提供商目录 — 打包为 `huggingface` （默认启用）
- Kilo Gateway(网关) 提供商运行时 — 打包为 `kilocode` （默认启用）
- Kimi Coding 提供商目录 — 打包为 `kimi-coding` （默认启用）
- MiniMax 提供商目录 + 用量 — 打包为 `minimax` （默认启用）
- MiniMax OAuth（提供商身份验证 + 目录）— 打包为 `minimax-portal-auth` （默认启用）
- Mistral 提供商能力 — 打包为 `mistral` （默认启用）
- Model Studio 提供商目录 — 打包为 `modelstudio` （默认启用）
- Moonshot 提供商运行时 — 打包为 `moonshot` （默认启用）
- NVIDIA 提供商目录 — 打包为 `nvidia` （默认启用）
- OpenAI 提供商运行时 — 打包为 `openai` （默认启用；拥有 `openai` 和 `openai-codex`）
- OpenCode Go 提供商能力 — 打包为 `opencode-go` （默认启用）
- OpenCode Zen 提供商能力 — 打包为 `opencode` （默认启用）
- OpenRouter 提供商运行时 — 打包为 `openrouter` （默认启用）
- Qianfan 提供商目录 — 打包为 `qianfan`（默认启用）
- Qwen OAuth (提供商身份验证 + 目录) — 作为 `qwen-portal-auth` 打包 (默认启用)
- Synthetic 提供商目录 — 打包为 `synthetic`（默认启用）
- Together 提供商目录 — 打包为 `together`（默认启用）
- Venice 提供商目录 — 作为 `venice` 打包 (默认启用)
- Vercel AI Gateway(网关) 提供商目录 — 作为 `vercel-ai-gateway` 打包 (默认启用)
- Volcengine 提供商目录 — 打包为 `volcengine`（默认启用）
- Xiaomi 提供商目录 + 使用情况 — 作为 `xiaomi` 打包 (默认启用)
- Z.AI 提供商运行时 — 打包为 `zai`（默认启用）
- Copilot Proxy（提供商身份验证） — 本地 VS Code Copilot Proxy 网桥；区别于内置的 `github-copilot` 设备登录（已打包，默认禁用）

原生 OpenClaw 插件是通过 jiti 在运行时加载的 **TypeScript 模块**。
**配置验证不会执行插件代码**；它使用插件清单
和 JSON Schema 来代替。请参阅 [插件清单](/zh/plugins/manifest)。

原生 OpenClaw 插件可以注册：

- Gateway RPC 方法
- Gateway HTTP 路由
- Agent 工具
- CLI 命令
- 后台服务
- 上下文引擎
- 提供商身份验证流程和模型目录
- 提供商运行时钩子，用于动态模型 ID、传输规范化、功能元数据、流封装、缓存 TTL 策略、缺失身份验证提示、内置模型抑制、目录增强、运行时身份验证交换，以及用量/计费身份验证 + 快照解析
- 可选的配置验证
- **Skills**（通过在插件清单中列出 `skills` 目录）
- **自动回复命令**（执行时不调用 AI agent）

原生 OpenClaw 插件与 Gateway **进程内** 运行，因此请将其视为可信代码。
工具编写指南：[插件 Agent 工具](/zh/plugins/agent-tools)。

## 提供商运行时钩子

提供商插件现在有两层：

- 配置时钩子：`catalog` / 旧版 `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍然拥有通用代理循环、故障转移、转录处理和工具策略。这些挂钩是提供商特定行为的接缝，而无需完整的自定义推理传输。

### 挂钩顺序

对于模型/提供商插件，OpenClaw 按大致顺序使用挂钩：

1. `catalog`
   在 `models.json` 生成期间将提供商配置发布到 `models.providers`。
2. 内置/已发现的模型查找
   OpenClaw 首先尝试正常的注册表/目录路径。
3. `resolveDynamicModel`
   对于本地注册表中尚未存在的提供商拥有的模型 ID，进行同步回退。
4. `prepareDynamicModel`
   仅在异步模型解析路径上进行异步预热，然后 `resolveDynamicModel` 再次运行。
5. `normalizeResolvedModel`
   在嵌入式运行程序使用解析的模型之前的最终重写。
6. `capabilities`
   共享核心逻辑使用的提供商拥有的转录/工具元数据。
7. `prepareExtraParams`
   在通用流选项包装器之前的提供商拥有的请求参数规范化。
8. `wrapStreamFn`
   在应用通用包装器之后的提供商拥有的流包装器。
9. `isCacheTtlEligible`
   用于代理/回程提供商的提供商拥有的提示缓存策略。
10. `buildMissingAuthMessage`
    提供商拥有的替换，用于通用缺少身份验证的恢复消息。
11. `suppressBuiltInModel`
    提供商拥有的过时上游模型抑制以及可选的用户可见错误提示。
12. `augmentModelCatalog`
    提供商拥有的在发现之后附加的合成/最终目录行。
13. `prepareRuntimeAuth`
    在推理之前将配置的凭证交换为实际的运行时令牌/密钥。
14. `resolveUsageAuth`
    解析 `/usage` 的使用/计费凭证以及相关的状态
    表面。
15. `fetchUsageSnapshot`
    在解析认证后，获取并规范化提供商特定的使用/配额快照。

### 使用哪个钩子

- `catalog`：将提供商配置和模型目录发布到 `models.providers`
- `resolveDynamicModel`：处理本地注册表中尚未存在的透传或向前兼容的模型 ID
- `prepareDynamicModel`：在重试动态解析之前进行异步预热（例如刷新提供商元数据缓存）
- `normalizeResolvedModel`：在推理之前重写已解析模型的传输/基础 URL/兼容性
- `capabilities`：发布提供商系列和转录/工具的特性，而无需在核心代码中硬编码提供商 ID
- `prepareExtraParams`：在通用流封装之前设置提供商默认值或规范化提供商特定的每个模型参数
- `wrapStreamFn`：在仍使用正常 `pi-ai` 执行路径的同时，添加提供商特定的标头/负载/模型兼容性补丁
- `isCacheTtlEligible`：决定提供商/模型对是否应使用缓存 TTL 元数据
- `buildMissingAuthMessage`：将通用的认证存储错误替换为提供商特定的恢复提示
- `suppressBuiltInModel`：隐藏过时的上游行，并可选择返回提供商拥有的错误以用于直接解析失败
- `augmentModelCatalog`：在发现和配置合并之后附加合成/最终目录行
- `prepareRuntimeAuth`：将配置的凭证交换为用于请求的实际短期运行时令牌/密钥
- `resolveUsageAuth`：解析用于使用/计费端点的提供商拥有的凭证，而无需在核心代码中硬编码令牌解析
- `fetchUsageSnapshot`：负责提供商特定的使用端点获取/解析，而核心代码负责汇总分发和格式化

经验法则：

- 提供商拥有目录或基础 URL 默认值：使用 `catalog`
- 提供商接受任意上游模型 ID：使用 `resolveDynamicModel`
- 提供商需要在解析未知 ID 之前获取网络元数据：添加 `prepareDynamicModel`
- 提供商需要传输重写但仍使用核心传输：使用 `normalizeResolvedModel`
- 提供商需要处理传输记录/提供商系列的特性：使用 `capabilities`
- 提供商需要默认请求参数或按提供商清理参数：使用 `prepareExtraParams`
- 提供商需要请求头/正文/模型兼容性封装而不使用自定义传输：使用 `wrapStreamFn`
- 提供商需要特定于代理的缓存 TTL 控制逻辑：使用 `isCacheTtlEligible`
- 提供商需要特定于提供商的缺失身份验证恢复提示：使用 `buildMissingAuthMessage`
- 提供商需要隐藏陈旧的上游数据行或将其替换为供应商提示：使用 `suppressBuiltInModel`
- 提供商需要在 `models list` 和选择器中添加合成的向前兼容行：使用 `augmentModelCatalog`
- 提供商需要令牌交换或短期请求凭证：使用 `prepareRuntimeAuth`
- 提供商需要自定义使用/配额令牌解析或不同的使用凭证：使用 `resolveUsageAuth`
- 提供商需要特定于提供商的使用端点或负载解析器：使用 `fetchUsageSnapshot`

如果提供商需要完全自定义的线路协议或自定义请求执行器，
那是另一类扩展。这些钩子用于仍然运行在 OpenClaw 正常推理循环中的提供商行为。

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

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`resolveUsageAuth`、
  `fetchUsageSnapshot` 和 `isCacheTtlEligible`，因为它拥有 Claude 4.6
  向前兼容性、提供商系列提示、使用端点集成以及
  提示缓存资格。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities` 加上 `buildMissingAuthMessage`、`suppressBuiltInModel` 和
  `augmentModelCatalog`，因为它拥有 GPT-5.4 前向兼容、直接的
  OpenAI `openai-completions` -> `openai-responses` 规范化、感知 Codex 的
  身份验证提示、Spark 抑制以及合成 OpenAI 列表行。
- OpenRouter 使用 `catalog` 加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为提供商是透传的，并且可能会在 OpenClaw 静态目录更新之前
  暴露新的模型 ID。
- GitHub Copilot 使用 `catalog`、`resolveDynamicModel` 和
  `capabilities` 加上 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它
  需要模型回退行为、Claude 转录怪癖、GitHub 令牌到
  Copilot 令牌的交换，以及提供商拥有的使用端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel` 和 `augmentModelCatalog` 加上
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它
  仍在核心 OpenAI 传输上运行，但拥有其传输/基础 URL
  规范化、默认传输选择、合成 Codex 目录行以及
  ChatGPT 使用端点集成。
- Gemini CLI OAuth 使用 `resolveDynamicModel`、`resolveUsageAuth` 和
  `fetchUsageSnapshot`，因为它拥有 Gemini 3.1 前向兼容回退以及
  `/usage` 所需的令牌解析和配额端点连接。
- OpenRouter 使用 `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`
  以将提供商特定的请求头、路由元数据、推理
  补丁和提示缓存策略保留在核心之外。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因为它仍使用共享
  OpenAI 传输，但需要提供商拥有的思维负载规范化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要提供商拥有的请求头、
  推理负载标准化、Gemini 逐字记录提示以及 Anthropic
  缓存 TTL 门控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它
  拥有 GLM-5 回退、`tool_stream` 默认值，以及使用身份验证和配额
  获取。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities`，以便将
  逐字记录/工具怪癖排除在核心之外。
- 仅限目录的捆绑提供商（例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`minimax-portal`、`modelstudio`、`nvidia`、
  `qianfan`、`qwen-portal`、`synthetic`、`together`、`venice`、
  `vercel-ai-gateway` 和 `volcengine`）仅使用 `catalog`。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用钩子，因为即使推理仍然通过共享
  传输运行，它们的 `/usage`
  行为由插件拥有。

## 加载流程

启动时，OpenClaw 大致执行以下操作：

1. 发现候选插件根目录
2. 读取本机或兼容捆绑包清单和包元数据
3. 拒绝不安全的候选
4. 标准化插件配置 (`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`)
5. 确定每个候选的启用状态
6. 通过 jiti 加载启用的本机模块
7. 调用本机 `register(api)` 钩子并将注册收集到插件注册表中
8. 向命令/运行时公开注册表

安全检查在运行时执行**之前**进行。当条目逃离插件根目录、路径全局可写，或对于非打包插件而言路径所有权看起来可疑时，候选对象将被阻止。

### 清单优先行为

清单是控制平面的事实来源。OpenClaw 使用它来：

- 识别插件
- 发现声明的通道/技能/配置架构或打包能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据

对于原生插件，运行时模块是数据平面部分。它注册实际行为，例如钩子、工具、命令或提供商流。

### 加载器缓存的内容

OpenClaw 为以下内容维护简短的进程内缓存：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存可以减少突发启动和重复命令的开销。可以安全地将其视为短期性能缓存，而非持久化存储。

## 运行时辅助程序

插件可以通过 `api.runtime` 访问选定的核心辅助程序。对于电话 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

说明：

- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- 不支持电话的 Edge TTS。

对于 STT/转录，插件可以调用：

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

说明：

- 使用核心媒体理解音频配置（`tools.media.audio`）和提供商回退顺序。
- 当未产生转录输出时（例如跳过/不支持的输入），返回 `{ text: undefined }`。

## Gateway(网关) HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

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
- `auth`：必填。使用 `"gateway"` 要求正常的网关身份验证，或使用 `"plugin"` 进行插件管理的身份验证/Webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其自己的现有路由注册。
- `handler`: 当路由处理请求时返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已过时。请使用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非 `replaceExisting: true`，否则完全相同的 `path + match` 冲突会被拒绝，且一个插件不能替换另一个插件的路由。
- 具有不同 `auth` 级别的重叠路由会被拒绝。请将 `exact`/`prefix` 透传链保持在同一认证级别上。

## Plugin SDK 导入路径

在编写插件时，请使用 SDK 子路径，而不是单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/core` 用于通用插件 API、提供商认证类型和共享辅助函数。
- `openclaw/plugin-sdk/compat` 用于需要比 `core` 更广泛的共享运行时辅助函数的捆绑/内部插件代码。
- `openclaw/plugin-sdk/telegram` 用于 Telegram 渠道插件。
- `openclaw/plugin-sdk/discord` 用于 Discord 渠道插件。
- `openclaw/plugin-sdk/slack` 用于 Slack 渠道插件。
- `openclaw/plugin-sdk/signal` 用于 Signal 渠道插件。
- `openclaw/plugin-sdk/imessage` 用于 iMessage 渠道插件。
- `openclaw/plugin-sdk/whatsapp` 用于 WhatsApp 渠道插件。
- `openclaw/plugin-sdk/line` 用于 LINE 渠道插件。
- `openclaw/plugin-sdk/msteams` 用于捆绑的 Microsoft Teams 插件表面。
- 也可以使用捆绑的扩展特定子路径：
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/llm-task`,
  `openclaw/plugin-sdk/lobster`, `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/memory-lancedb`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/open-prose`, `openclaw/plugin-sdk/phone-control`,
  `openclaw/plugin-sdk/qwen-portal-auth`, `openclaw/plugin-sdk/synology-chat`,
  `openclaw/plugin-sdk/talk-voice`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/thread-ownership`, `openclaw/plugin-sdk/tlon`,
  `openclaw/plugin-sdk/twitch`, `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo`, 和 `openclaw/plugin-sdk/zalouser`。

## 提供商目录

提供商插件可以定义用于推理的模型目录，通过
`registerProvider({ catalog: { run(...) { ... } } })`。

`catalog.run(...)` 返回与 OpenClaw 写入
`models.providers` 相同的形状：

- 用于一个提供商条目的 `{ provider }`
- 用于多个提供商条目的 `{ providers }`

当插件拥有特定于提供商的模型 ID、基础 URL 默认值或受身份验证保护的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件的目录相对于 OpenClaw 内置隐式提供商的合并时机：

- `simple`: 纯 API 密钥或环境驱动的提供商
- `profile`: 身份验证配置文件存在时出现的提供商
- `paired`: 综合多个相关提供商条目的提供商
- `late`: 最后一轮，在其他隐式提供商之后

在键冲突的情况下，后面的提供商会胜出，因此插件可以使用相同的提供商 ID 有意覆盖内置提供商条目。

兼容性：

- `discovery` 仍作为旧版别名有效
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`

兼容性说明：

- `openclaw/plugin-sdk` 仍受现有外部插件支持。
- 新建和迁移的打包插件应使用渠道或扩展特定的子路径；仅在需要更广泛的共享辅助功能时，才将 `core` 用于通用表面并使用 `compat`。

## 只读渠道检查

如果您的插件注册了渠道，建议在实现 `resolveAccount(...)` 的同时实现
`plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它被允许假定凭据
  已完全物化，并在缺少所需机密时快速失败。
- 诸如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及诊断/配置
  修复流之类的只读命令路径，不应仅为了描述配置而物化运行时凭据。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性账户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭据源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要仅为了报告只读可用性而返回原始令牌值。对于状态类命令，返回 `tokenStatus: "available"`（以及匹配的源字段）就足够了。
- 当凭据通过 SecretRef 配置但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这允许只读命令报告“已配置但在当前命令路径中不可用”，而不是崩溃或错误地将账户报告为未配置。

性能说明：

- 插件发现和清单元数据使用短时的进程内缓存来减少
  突发的启动/重新加载工作。
- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 设备发现与优先级

OpenClaw 按以下顺序扫描：

1. 配置路径

- `plugins.load.paths`（文件或目录）

2. 工作区扩展

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全局扩展

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 捆绑扩展（随 OpenClaw 附带；混合了默认开启/默认关闭）

- `<openclaw>/extensions/*`

许多捆绑的提供商插件默认处于启用状态，以便模型目录/运行时
钩子在无需额外设置的情况下保持可用。其他插件仍需通过 `plugins.entries.<id>.enabled` 或
`openclaw plugins enable <id>` 显式启用。

默认开启的捆绑插件示例：

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax-portal-auth`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- 活动内存槽插件（默认槽：`memory-core`）

已安装的插件默认处于启用状态，但也可以通过相同的方式禁用。

工作区插件**默认禁用**，除非您显式启用它们
或将它们加入允许列表。这是有意为之：检出的代码库不应静默
变为生产网关代码。

加固说明：

- 如果 `plugins.allow` 为空且可发现非打包插件，OpenClaw 会记录一条包含插件 ID 和源的启动警告。
- 候选路径在发现准入之前会进行安全检查。OpenClaw 会在以下情况阻止候选：
  - 扩展入口解析到插件根目录之外（包括符号链接/路径遍历逃逸），
  - 插件根/源路径是全局可写的，
  - 对于非打包插件，路径所有权可疑（POSIX 所有者既不是当前 uid 也不是 root）。
- 加载的没有安装/加载路径证明的非打包插件会发出警告，以便您可以固定信任 (`plugins.allow`) 或安装跟踪 (`plugins.installs`)。

每个原生 OpenClaw 插件必须在其根目录中包含一个 `openclaw.plugin.json` 文件。如果路径指向文件，则插件根目录是该文件的目录，并且
必须包含清单。

兼容的包可以改为提供以下之一：

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

包目录从与原生插件相同的根目录中发现。

如果多个插件解析为同一个 ID，则上述顺序中的第一个匹配项
获胜，并忽略较低优先级的副本。

这意味着：

- 工作区插件有意遮蔽具有相同 ID 的打包插件
- `plugins.allow: ["foo"]` 按 ID 授权活动的 `foo` 插件，即使
  活动副本来自工作区而不是打包的扩展根目录
- 如果您需要更严格的来源控制，请使用显式的安装/加载路径并
  在启用之前检查解析的插件源

### 启用规则

启用在发现之后解析：

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 总是获胜
- `plugins.entries.<id>.enabled: false` 禁用该插件
- 工作区源插件默认禁用
- 当 `plugins.allow` 非空时，允许列表限制活动集
- 允许列表是**基于 ID 的**，而不是基于源的
- 打包插件默认禁用，除非：
  - 打包的 id 位于内置的默认启用集中，或者
  - 您显式启用了它，或者
  - 渠道配置隐式启用了打包的渠道插件
- 互斥插槽可以强制启用该插槽的选定插件

在当前核心中，打包的默认启用 id 包括上述的 local/提供商 辅助工具
以及活动的内存插槽插件。

### 包

插件目录可以包含一个带有 `package.json` 的 `openclaw.extensions`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

每个条目都会成为一个插件。如果包列出了多个扩展，插件 id
将变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖项，请在该目录中安装它们，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：每个 `openclaw.extensions` 条目在解析符号链接后必须保持在插件
目录内。转义包目录的条目
将被拒绝。

安全提示：`openclaw plugins install` 使用
`npm install --ignore-scripts` 安装插件依赖项（无生命周期脚本）。保持插件依赖
树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个仅用于设置的轻量级模块。
当 OpenClaw 需要为已禁用的渠道插件提供新手引导/设置界面时，它
会加载 `setupEntry` 而不是完整的插件条目。当您的主插件条目还连接了工具、挂钩或
其他仅运行时代码时，这可以使启动和
新手引导更加轻量。

### 渠道目录元数据

渠道插件可以通过 `openclaw.channel` 宣传新手引导元数据，并通过
`openclaw.install` 宣传安装提示。这使核心目录保持无数据状态。

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
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw 还可以合并 **外部渠道目录**（例如，MPM
注册表导出）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 ID：

- 包打包：`package.json` `name`
- 独立文件：文件基名 (`~/.../voice-call.ts` → `voice-call`)

如果插件导出 `id`，OpenClaw 会使用它，但在它与配置的 ID 不匹配时会发出警告。

## 注册表模型

已加载的插件不会直接更改随机的核心全局变量。它们注册到一个中央插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、起点、状态、诊断信息）
- 工具
- 旧版 Hook 和类型化 Hook
- 渠道
- 提供者
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能随后从该注册表读取，而不是直接与插件模块通信。这使得加载过程保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表使用

这种分离对可维护性很重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“对每个插件模块进行特殊处理”。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

字段：

- `enabled`：主开关（默认：true）
- `allow`：允许列表（可选）
- `deny`：拒绝列表（可选；拒绝优先）
- `load.paths`：额外的插件文件/目录
- `slots`：独占槽选择器，例如 `memory` 和 `contextEngine`
- `entries.<id>`：针对每个插件的开关 + 配置

配置更改**需要重启网关**。

验证规则（严格）：

- `entries`、`allow`、`deny` 或 `slots` 中的未知插件 ID 为**错误**。
- 未知的 `channels.<id>` 键为**错误**，除非插件清单声明了渠道 ID。
- 使用嵌入在 `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 验证原生插件配置。
- 兼容的捆绑包目前不公开原生 OpenClaw 配置架构。
- 如果插件被禁用，其配置会被保留并发出**警告**。

### 已禁用、缺失与无效

这些状态是有意区分的：

- **已禁用（disabled）**：插件存在，但启用规则将其关闭
- **缺失（missing）**：配置引用了一个发现机制未找到的插件 ID
- **无效（invalid）**：插件存在，但其配置与声明的架构不匹配

OpenClaw 会保留已禁用插件的配置，因此重新启用它们不会破坏数据。

## 插件插槽（互斥类别）

某些插件类别是**互斥（exclusive）**的（同一时间只能有一个处于活动状态）。使用
`plugins.slots` 来选择哪个插件拥有该插槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

支持的互斥插槽：

- `memory`：活动内存插件（`"none"` 会禁用内存插件）
- `contextEngine`：活动上下文引擎插件（`"legacy"` 是内置默认值）

如果有多个插件声明了 `kind: "memory"` 或 `kind: "context-engine"`，则只有
选定的插件会为该插槽加载。其他插件将被禁用并输出诊断信息。

### 上下文引擎插件

上下文引擎插件拥有用于摄取、组装
和压缩的会话上下文编排权。在您的插件中使用
`api.registerContextEngine(id, factory)` 注册它们，然后使用
`plugins.slots.contextEngine` 选择活动引擎。

当您的插件需要替换或扩展默认上下文管道，而不仅仅是添加内存搜索或钩子（hooks）时，请使用此功能。

## 控制 UI（架构 + 标签）

控制 UI 使用 `config.schema`（JSON 架构 + `uiHints`）来渲染更好的表单。

OpenClaw 在运行时根据发现的插件增强 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加每个插件的标签
- 在 `plugins.entries.<id>.config.<field>` 下合并可选的插件提供的配置字段提示：

如果您希望插件配置字段显示良好的标签/占位符（并将机密标记为敏感），
请在插件清单中与您的 JSON 架构一起提供 `uiHints`。

示例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`openclaw plugins list` 显示的顶层格式为 `openclaw` 或 `bundle`。
详细的列表/信息输出还会显示包子类型 (`codex` 或 `claude`) 以及
检测到的包功能。

`plugins update` 仅适用于在 `plugins.installs` 下跟踪的 npm 安装。
如果存储的完整性元数据在更新之间发生变化，OpenClaw 会发出警告并请求确认（使用全局 `--yes` 可绕过提示）。

插件也可以注册自己的顶层命令（例如：`openclaw voicecall`）。

## 插件 API （概述）

插件导出以下两者之一：

- 一个函数：`(api) => { ... }`
- 一个对象：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是插件附加行为的地方。常见的注册项包括：

- `registerTool`
- `registerHook`
- 用于类型化生命周期钩子的 `on(...)`
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

上下文引擎插件还可以注册一个运行时拥有的上下文管理器：

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

然后在配置中启用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## 插件钩子

插件可以在运行时注册钩子。这允许插件包包含事件驱动的
自动化，而无需单独安装钩子包。

### 示例

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

注意：

- 通过 `api.registerHook(...)` 显式注册钩子。
- 钩子资格规则仍然适用（操作系统/二进制文件/环境/配置要求）。
- 插件管理的钩子会带有 `plugin:<id>` 显示在 `openclaw hooks list` 中。
- 您不能通过 `openclaw hooks` 启用/禁用插件管理的钩子；请改为启用/禁用插件。

### 代理生命周期钩子 (`api.on`)

对于类型化运行时生命周期钩子，请使用 `api.on(...)`：

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

用于提示构建的重要钩子：

- `before_model_resolve`: 在会话加载之前运行（`messages` 不可用）。使用它来确定性地覆盖 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`: 在会话加载之后运行（`messages` 可用）。使用它来塑造提示词输入。
- `before_agent_start`: 遗留兼容性钩子。首选上述两个显式钩子。

核心强制执行的钩子策略：

- 操作员可以通过 `plugins.entries.<id>.hooks.allowPromptInjection: false` 为每个插件禁用提示词变更钩子。
- 禁用时，OpenClaw 会阻止 `before_prompt_build` 并忽略从遗留 `before_agent_start` 返回的提示词变更字段，同时保留遗留的 `modelOverride` 和 `providerOverride`。

`before_prompt_build` 结果字段：

- `prependContext`: 在本次运行的用户提示词之前添加文本。最适用于特定轮次或动态内容。
- `systemPrompt`: 完全覆盖系统提示词。
- `prependSystemContext`: 在当前系统提示词之前添加文本。
- `appendSystemContext`: 在当前系统提示词之后添加文本。

嵌入式运行时中的提示词构建顺序：

1. 将 `prependContext` 应用于用户提示词。
2. 提供 `systemPrompt` 覆盖时应用该覆盖。
3. 应用 `prependSystemContext + current system prompt + appendSystemContext`。

合并和优先级说明：

- 钩子处理程序按优先级运行（优先级高的先运行）。
- 对于合并的上下文字段，值按执行顺序连接。
- `before_prompt_build` 值在遗留 `before_agent_start` 回退值之前应用。

迁移指南：

- 将静态指导从 `prependContext` 移至 `prependSystemContext`（或 `appendSystemContext`），以便提供商可以缓存稳定的系统前缀内容。
- 保留 `prependContext` 用于应与用户消息保持关联的每轮动态上下文。

## 提供商插件（模型身份验证）

插件可以注册 **模型提供商**，以便用户可以在 OpenClaw 内运行 OAuth 或 API 密钥设置，在 新手引导/模型-pickers 中展示提供商设置，并贡献隐式提供商发现。

提供商插件是模型提供商设置的模块化扩展接缝。它们不再仅仅是“OAuth 助手”。

### 提供商插件生命周期

提供商插件可以参与五个不同的阶段：

1. **Auth (认证)**
   `auth[].run(ctx)` 执行 OAuth、API 密钥捕获、设备代码或自定义
   设置，并返回认证配置文件以及可选的配置补丁。
2. **Non-interactive setup (非交互式设置)**
   `auth[].runNonInteractive(ctx)` 处理 `openclaw onboard --non-interactive`
   且不带提示。当提供商需要超出内置简单 API 密钥路径的自定义无头设置时，请使用此功能。
3. **Wizard integration (向导集成)**
   `wizard.onboarding` 向 `openclaw onboard` 添加一个条目。
   `wizard.modelPicker` 向模型选择器添加一个设置条目。
4. **Implicit discovery (隐式发现)**
   `discovery.run(ctx)` 可以在模型解析/列表期间自动贡献提供商配置。
5. **Post-selection follow-up (选择后跟进)**
   `onModelSelected(ctx)` 在选择模型后运行。将此用于提供商
   特定的工作，例如下载本地模型。

这是推荐的划分方式，因为这些阶段具有不同的生命周期要求：

- auth (认证) 是交互式的，并写入凭据/配置
- non-interactive setup (非交互式设置) 由标志/环境变量驱动，且绝不能提示
- wizard metadata (向导元数据) 是静态的且面向 UI
- discovery (发现) 应当是安全的、快速的且容错的
- post-select hooks (选择后钩子) 是与所选模型相关的副作用

### 提供商认证契约

`auth[].run(ctx)` 返回：

- `profiles`：要写入的认证配置文件
- `configPatch`：可选的 `openclaw.json` 更改
- `defaultModel`：可选的 `provider/model` 引用
- `notes`：可选的用户提示

核心然后：

1. 写入返回的认证配置文件
2. 应用认证配置文件配置连线
3. 合并配置补丁
4. 可选地应用默认模型
5. 适当时运行提供商的 `onModelSelected` 钩子

这意味着提供商插件拥有特定于提供商的设置逻辑，而核心拥有通用的持久化和配置合并路径。

### 提供商非交互式合约

`auth[].runNonInteractive(ctx)` 是可选的。当提供商需要无法通过内置通用 API 密钥流表达的无头设置时，请实现它。

非交互式上下文包括：

- 当前和基础配置
- 解析的新手引导 CLI 选项
- 运行时日志记录/错误帮助器
- 代理/工作区目录
- `resolveApiKey(...)` 用于从标志、环境变量或现有身份验证配置文件读取提供商密钥，同时遵守 `--secret-input-mode`
- `toApiKeyCredential(...)` 用于将解析的密钥转换为具有正确纯文本与密钥引用存储的身份验证配置文件凭据

将此界面用于以下提供商：

- 需要 `--custom-base-url` + `--custom-model-id` 的自托管 OpenAI 兼容运行时
- 特定于提供商的非交互式验证或配置合成

不要从 `runNonInteractive` 进行提示。相反，请使用可操作的错误拒绝缺失的输入。

### 提供商向导元数据

`wizard.onboarding` 控制提供商在分组新手引导中的显示方式：

- `choiceId`：身份验证选择值
- `choiceLabel`：选项标签
- `choiceHint`：简短提示
- `groupId`：分组存储桶 ID
- `groupLabel`：分组标签
- `groupHint`：分组提示
- `methodId`：要运行的身份验证方法

`wizard.modelPicker` 控制提供商在模型选择中作为“立即设置”条目的显示方式：

- `label`
- `hint`
- `methodId`

当提供商有多种身份验证方法时，向导可以指向一种显式方法，也可以让 OpenClaw 合成每种方法的选择。

当插件注册时，OpenClaw 会验证提供商向导元数据：

- 重复或空白的身份验证方法 ID 会被拒绝
- 当提供商没有身份验证方法时，向导元数据会被忽略
- 无效的 `methodId` 绑定将被降级为警告，并回退到提供商剩余的身份验证方法

### 提供商发现约定

`discovery.run(ctx)` 返回以下之一：

- `{ provider }`
- `{ providers }`
- `null`

对于插件拥有一个提供商 ID 的常见情况，请使用 `{ provider }`。
当插件发现多个提供商条目时，请使用 `{ providers }`。

发现上下文包括：

- 当前配置
- 代理/工作区目录
- 进程环境
- 用于解析提供商 API 密钥以及发现安全的 API 密钥值的辅助程序

发现应当：

- 快速
- 尽力而为
- 失败时可以安全跳过
- 注意副作用

它不应依赖提示或长时间运行的设置。

### 发现顺序

提供商发现按有序阶段运行：

- `simple`
- `profile`
- `paired`
- `late`

使用：

- `simple` 用于廉价的环境仅限发现
- `profile` 当发现依赖于身份验证配置文件时
- `paired` 用于需要与另一个发现步骤协调的提供商
- `late` 用于昂贵或本地网络探测

大多数自托管提供商应使用 `late`。

### 良好的提供商-插件边界

适合提供商插件的情况：

- 具有自定义设置流程的本地/自托管提供商
- 特定于提供商的 OAuth/设备代码登录
- 本地模型服务器的隐式发现
- 选择后的副作用，例如模型拉取

不太适合的情况：

- 琐碎的仅 API 密钥的提供商，它们仅在环境变量、基本 URL 和一个默认模型上有所不同

这些仍然可以成为插件，但主要的模块化回报来自于首先提取行为丰富的提供商。

通过 `api.registerProvider(...)` 注册提供商。每个提供商公开一种或多种身份验证方法（OAuth、API 密钥、设备代码等）。这些方法可以支持：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- 模型选择器“自定义提供商”设置条目
- 模型解析/列表期间的隐式提供商发现

示例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    onboarding: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

说明：

- `run` 接收一个带有 `prompter`、`runtime`、
  `openUrl` 和 `oauth.createVpsAwareHandlers` 助手函数的 `ProviderAuthContext`。
- `runNonInteractive` 接收一个带有 `opts`、`resolveApiKey` 和
  `toApiKeyCredential` 助手函数的 `ProviderAuthMethodNonInteractiveContext`，用于无头新手引导。
- 当需要添加默认模型或提供商配置时，返回 `configPatch`。
- 返回 `defaultModel`，以便 `--set-default` 可以更新代理默认值。
- `wizard.onboarding` 向 `openclaw onboard` 添加一个提供商选项。
- `wizard.modelPicker` 向模型选择器添加一个“设置此提供商”条目。
- `discovery.run` 返回 `{ provider }`（针对插件自己的提供商 ID）
  或 `{ providers }`（用于多提供商发现）。
- `discovery.order` 控制提供商相对于内置发现阶段的运行时机：
  `simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是用于特定提供商后续工作（例如拉取本地模型）的后置选择挂钩。

### 注册消息渠道

插件可以注册行为类似内置渠道（WhatsApp、Telegram 等）的**渠道插件**。
渠道配置位于 `channels.<id>` 下，并由您的渠道插件代码验证。

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

说明：

- 将配置放在 `channels.<id>` 下（而非 `plugins.entries`）。
- `meta.label` 用于 CLI/UI 列表中的标签。
- `meta.aliases` 添加用于规范化和 CLI 输入的备用 ID。
- `meta.preferOver` 列出当两者均已配置时跳过自动启用的渠道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 允许 UI 显示更丰富的渠道标签/图标。

### 渠道设置挂钩

首选设置划分：

- `plugin.setup` 负责账户 ID 的规范化、验证和配置写入。
- `plugin.setupWizard` 允许主机运行通用向导流程，而渠道仅提供状态、凭据、私信 许可列表和渠道访问描述符。

`plugin.setupWizard` 最适合符合共享模式的渠道：

- 一个由 `plugin.config.listAccountIds` 驱动的账户选择器
- 提示之前的可选预检/准备步骤（例如安装程序/引导工作）
- 针对捆绑凭据集的可选 env-shortcut 提示（例如配对的机器人/应用程序令牌）
- 一个或多个凭据提示，每个步骤通过 `plugin.setup.applyAccountConfig` 写入或由渠道拥有的部分补丁
- 可选的非机密文本提示（例如 CLI 路径、基本 URL、账户 ID）
- 由主机解析的可选渠道/组访问许可列表提示
- 可选的 私信 许可列表解析（例如 `@username` -> 数字 ID）
- 设置完成后显示的可选完成说明

### 编写新的消息传递渠道（分步）

当您想要一个新的聊天表面（“消息传递渠道”）而不是模型提供商时，请使用此选项。
模型提供商文档位于 `/providers/*` 下。

1. 选择一个 ID + 配置形状

- 所有渠道配置都位于 `channels.<id>` 下。
- 对于多账户设置，首选 `channels.<id>.accounts.<accountId>`。

2. 定义渠道元数据

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 应指向类似于 `/channels/<id>` 的文档页面。
- `meta.preferOver` 允许插件替换另一个渠道（自动启用优先选择它）。
- UI 使用 `meta.detailLabel` 和 `meta.systemImage` 来显示详细文本/图标。

3. 实现所需的适配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天类型、媒体、线程等）
- `outbound.deliveryMode` + `outbound.sendText`（用于基本发送）

4. 根据需要添加可选适配器

- `setup` (验证 + 配置写入), `setupWizard` (宿主拥有的向导), `security` (私信策略), `status` (健康/诊断)
- `gateway` (启动/停止/登录), `mentions`, `threading`, `streaming`
- `actions` (消息操作), `commands` (原生命令行为)

5. 在你的插件中注册渠道

- `api.registerChannel({ plugin })`

最小配置示例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

最小渠道插件（仅出站）：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

加载插件（扩展目录或 `plugins.load.paths`），重启网关，
然后在你的配置中配置 `channels.<id>`。

### 代理工具

请参阅专用指南：[插件代理工具](/zh/plugins/agent-tools)。

### 注册网关 RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 注册 CLI 命令

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### 注册自动回复命令

插件可以注册自定义斜杠命令，这些命令在执行时**无需调用
AI 代理**。这对于切换命令、状态检查或不需要 LLM 处理的
快速操作非常有用。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

命令处理程序上下文：

- `senderId`：发送者的 ID（如果有）
- `channel`：发送命令的渠道
- `isAuthorizedSender`：发送者是否为授权用户
- `args`：命令后传递的参数（如果 `acceptsArgs: true`）
- `commandBody`：完整的命令文本
- `config`：当前的 OpenClaw 配置

命令选项：

- `name`：命令名称（不带前导 `/`）
- `nativeNames`：用于斜杠/菜单界面的可选原生命令别名。为所有原生提供商使用 `default`，或使用特定于提供商的键，如 `discord`
- `description`：命令列表中显示的帮助文本
- `acceptsArgs`: 命令是否接受参数（默认为 false）。如果为 false 且提供了参数，则该命令将不匹配，消息将传递给其他处理程序
- `requireAuth`: 是否需要授权发送者（默认为 true）
- `handler`: 返回 `{ text: string }` 的函数（可以是异步的）

包含授权和参数的示例：

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

注意：

- 插件命令在内置命令和 AI 代理**之前**处理
- 命令是全局注册的，并在所有渠道中工作
- 命令名称不区分大小写（`/MyStatus` 匹配 `/mystatus`）
- 命令名称必须以字母开头，且只能包含字母、数字、连字符和下划线
- 保留的命令名称（如 `help`、`status`、`reset` 等）不能被插件覆盖
- 跨插件的重复命令注册将失败，并显示诊断错误

### 注册后台服务

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## 命名约定

- Gateway(网关) 方法：`pluginId.action`（例如：`voicecall.status`）
- 工具：`snake_case`（例如：`voice_call`）
- CLI 命令：kebab 或 camel，但避免与核心命令冲突

## Skills

插件可以在代码库中附带一个 skill (`skills/<name>/SKILL.md`)。
使用 `plugins.entries.<id>.enabled`（或其他配置选项）启用它，并确保
它存在于您的工作区/受管 skills 位置。

## 分发 (npm)

推荐的打包方式：

- 主包：`openclaw`（此代码库）
- 插件：位于 `@openclaw/*` 下的独立 npm 包（例如：`@openclaw/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `openclaw.extensions`，其中包含一个或多个入口文件。
- 可选：`openclaw.setupEntry` 可以指向用于禁用的渠道新手引导/设置的仅设置入口。
- 入口文件可以是 `.js` 或 `.ts`（jiti 在运行时加载 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，解压到 `~/.openclaw/extensions/<id>/`，并在配置中启用它。
- Config 键稳定性：对于 `plugins.entries.*`，作用域包会被规范化为 **不带作用域** 的 id。

## 示例插件：语音通话

此仓库包含一个语音通话插件（Twilio 或日志回退）：

- 源码：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`，`voicecall.status`
- 配置：`provider: "twilio"` + `twilio.accountSid/authToken/from`（可选 `statusCallbackUrl`，`twimlUrl`）
- 配置：`provider: "log"`（无网络）

有关设置和用法，请参阅 [语音通话](/zh/plugins/voice-call) 和 `extensions/voice-call/README.md`。

## 安全说明

插件与 Gateway(网关) 在同一进程中运行。请将它们视为受信任的代码：

- 仅安装您信任的插件。
- 首选 `plugins.allow` 允许列表。
- 请记住，`plugins.allow` 是基于 ID 的，因此启用的工作区插件可以故意覆盖具有相同 ID 的捆绑插件。
- 更改后重启 Gateway(网关)。

## 测试插件

插件可以（并且应该）附带测试：

- 仓库内的插件可以将 Vitest 测试保留在 `src/**` 下（示例：`src/plugins/voice-call.plugin.test.ts`）。
- 单独发布的插件应运行自己的 CI（lint/build/test）并验证 `openclaw.extensions` 指向构建的入口点（`dist/index.js`）。

import zh from "/components/footer/zh.mdx";

<zh />
