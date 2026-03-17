---
summary: "OpenClaw 插件/扩展：发现、配置和安全"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
---

# 插件（扩展）

## 快速开始（插件新手？）

插件分为以下两种：

- 原生 **OpenClaw 插件** (`openclaw.plugin.json` + 运行时模块)，或者
- 兼容的 **bundle** (`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`)

两者都会显示在 `openclaw plugins` 下，但只有原生 OpenClaw 插件会在进程中
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

Bare specs 和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 将停止并要求您使用预发布标签（例如 `@beta`/`@rc`）
或确切的预发布版本来明确选择加入。

3. 重启 Gateway(网关)，然后在 `plugins.entries.<id>.config` 下进行配置。

有关具体的插件示例，请参阅 [Voice Call](/zh/plugins/voice-call)。
正在寻找第三方列表？请参阅 [Community plugins](/zh/plugins/community)。
需要捆绑包兼容性详细信息？请参阅 [Plugin bundles](/zh/plugins/bundles)。

对于兼容的包，从本地目录或归档文件安装：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

对于 Claude marketplace 安装，请先列出 marketplace，然后按
marketplace 条目名称进行安装：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 从 `~/.claude/plugins/known_marketplaces.json` 解析已知的 Claude marketplace 名称。
您还可以使用 `--marketplace` 传递显式的
marketplace 源。

## 架构

OpenClaw 的插件系统包含四个层级：

1. **清单 + 设备发现**
   OpenClaw 从配置的路径、工作区根目录、
   全局扩展根目录和捆绑扩展中查找候选插件。设备发现首先读取原生
   `openclaw.plugin.json` 清单以及支持的捆绑包清单。
2. **启用 + 验证**
   Core 决定已发现的插件是被启用、禁用、阻止，还是被选入诸如内存之类的独占槽位。
3. **运行时加载**
   原生 OpenClaw 插件通过 jiti 在进程内加载，并将功能注册到中央注册表中。兼容的包被规范化为注册表记录，而无需导入运行时代码。
4. **Surface 消耗**
   OpenClaw 的其余部分读取注册表以暴露工具、通道、提供商设置、钩子、HTTP 路由、CLI 命令和服务。

重要的设计边界：

- 发现 + 配置验证应仅通过 **manifest/schema 元数据** 工作，
  而无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种拆分使得 OpenClaw 能够在完整运行时激活之前验证配置、解释缺失/禁用的插件，并构建 UI/schema 提示。

## 兼容的包

OpenClaw 也识别两种兼容的外部捆绑包布局：

- Codex 风格的捆绑包：`.codex-plugin/plugin.json`
- Claude 风格的捆绑包：`.claude-plugin/plugin.json` 或默认的 Claude
  组件布局（不包含清单文件）
- Cursor 风格的捆绑包：`.cursor-plugin/plugin.json`

Claude 市场条目可以指向这些兼容的捆绑包中的任何一种，或者指向
原生 OpenClaw 插件源。OpenClaw 首先解析市场条目，
然后为解析的源运行正常的安装路径。

它们在插件列表中显示为 `format=bundle`，并在详细/信息输出中
具有 `codex` 或 `claude` 的子类型。

有关确切的检测规则、映射
行为和当前支持矩阵，请参阅 [Plugin bundles](/zh/plugins/bundles)。

目前，OpenClaw 将这些视为 **功能包 (capability packs)**，而不是原生运行时
插件：

- 目前支持：捆绑 `skills`
- 目前支持：Claude `commands/` markdown 根目录，映射到普通 OpenClaw
  技能加载器
- 目前支持：Claude 捆绑包 `settings.json` 默认值，用于嵌入式 Pi 代理
  设置（已清理 shell 覆盖键）
- 目前支持：Cursor `.cursor/commands/*.md` 根目录，映射到普通
  OpenClaw 技能加载器
- 目前支持：使用 OpenClaw hook-pack 布局（`HOOK.md` + `handler.ts`/`handler.js`）的 Codex 捆绑包 hook 目录
- 已检测但尚未连接：其他声明的捆绑包功能，例如
  代理、Claude hook 自动化、Cursor 规则/hooks/MCP 元数据、MCP/app/LSP
  元数据、输出样式

这意味着 bundle 的安装/发现/列表/信息/启用均能正常工作，且当 bundle 启用时，bundle 技能、Claude 命令技能、Claude bundle 设置默认值以及兼容的 Codex hook 目录都会加载，但 bundle 运行时代码不会在进程内执行。

Bundle hook 支持仅限于标准的 OpenClaw hook 目录格式（在声明的 hook 根目录下的 `HOOK.md` 加上 `handler.ts`/`handler.js`）。特定于供应商的 shell/JSON hook 运行时（包括 Claude `hooks.json`）目前仅能被检测到，而不会直接执行。

## 执行模型

原生 OpenClaw 插件与 Gateway(网关) 在同一进程中运行。它们不是沙箱隔离的。已加载的原生插件具有与核心代码相同的进程级信任边界。

影响：

- 原生插件可以注册工具、网络处理程序、钩子和服务
- 原生插件错误可能会导致网关崩溃或不稳定
- 恶意的原生插件相当于在 OpenClaw 进程内执行任意代码

兼容捆绑包默认更安全，因为 OpenClaw 目前将其视为元数据/内容包。在当前版本中，这主要指捆绑的技能。

对非捆绑插件使用允许列表和明确的安装/加载路径。将工作区插件视为开发时代码，而非生产环境默认值。

重要信任提示：

- `plugins.allow` 信任的是**插件 ID**，而非来源出处。
- 当启用或允许列表中包含与捆绑插件 ID 相同的工作区插件时，该工作区插件会故意覆盖（遮蔽）捆绑副本。
- 这对于本地开发、补丁测试和热修复来说是正常且有用的。

## 可用插件（官方）

- Microsoft Teams 自 2026.1.15 起仅支持插件；如果您使用 Teams，请安装 `@openclaw/msteams`。
- Memory (Core) — 捆绑的内存搜索插件（默认通过 `plugins.slots.memory` 启用）
- Memory (LanceDB) — 捆绑的长期内存插件（自动回忆/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [Voice Call](/zh/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh/channels/msteams) — `@openclaw/msteams`
- Anthropic 提供商运行时 — 打包为 `anthropic` （默认启用）
- BytePlus 提供商目录 — 打包为 `byteplus` （默认启用）
- Cloudflare AI Gateway(网关) 提供商目录 — 打包为 `cloudflare-ai-gateway` （默认启用）
- Google 网页搜索 + Gemini CLI OAuth — 打包为 `google` （网页搜索会自动加载它；提供商身份验证保持可选加入）
- GitHub Copilot 提供商运行时 — 打包为 `github-copilot` （默认启用）
- Hugging Face 提供商目录 — 打包为 `huggingface` （默认启用）
- Kilo Gateway(网关) 提供商运行时 — 打包为 `kilocode` （默认启用）
- Kimi Coding 提供商目录 — 打包为 `kimi-coding` （默认启用）
- MiniMax 提供商目录 + 用法 + OAuth — 捆绑为 `minimax`（默认启用；拥有 `minimax` 和 `minimax-portal`）
- Mistral 提供商功能 — 捆绑为 `mistral`（默认启用）
- Model Studio 提供商目录 — 捆绑为 `modelstudio`（默认启用）
- Moonshot 提供商运行时 — 捆绑为 `moonshot`（默认启用）
- NVIDIA 提供商目录 — 捆绑为 `nvidia`（默认启用）
- OpenAI 提供商运行时 — 捆绑为 `openai`（默认启用；同时拥有 `openai` 和 `openai-codex`）
- OpenCode Go 提供商功能 — 捆绑为 `opencode-go`（默认启用）
- OpenCode Zen 提供商功能 — 捆绑为 `opencode`（默认启用）
- OpenRouter 运行时 — 捆绑为 `openrouter`（默认启用）
- Qianfan 提供商目录 — 捆绑为 `qianfan`（默认启用）
- Qwen OAuth (提供商认证 + 目录) — 打包为 `qwen-portal-auth` (默认启用)
- 合成提供商目录 — 捆绑为 `synthetic`（默认启用）
- Together 提供商目录 — 捆绑为 `together`（默认启用）
- Venice 提供商目录 — 捆绑为 `venice` （默认启用）
- Vercel AI Gateway(网关) 提供商目录 — 捆绑为 `vercel-ai-gateway` （默认启用）
- Volcengine 提供商目录 — 作为 `volcengine` 打包（默认启用）
- Xiaomi 提供商目录 + 用法 — 作为 `xiaomi` 捆绑（默认启用）
- Z.AI 提供商运行时 — 打包为 `zai`（默认启用）
- Copilot Proxy（提供商身份验证） — 本地 VS Code Copilot Proxy 网桥；与内置的 `github-copilot` 设备登录不同（已打包，默认禁用）

原生 OpenClaw 插件是通过 jiti 在运行时加载的 **TypeScript 模块**。
**配置验证不执行插件代码**；它使用插件清单
和 JSON Schema 代替。请参阅 [插件清单](/zh/plugins/manifest)。

原生 OpenClaw 插件可以注册：

- Gateway(网关) RPC 方法
- Gateway(网关) HTTP 路由
- Agent 工具
- CLI 命令
- 后台服务
- 上下文引擎
- 提供商身份验证流和模型目录
- Provider 运行时钩子，用于动态模型 ID、传输标准化、功能元数据、流封装、缓存 TTL 策略、缺失身份验证提示、内置模型抑制、目录增强、运行时身份验证交换以及使用/计费身份验证 + 快照解析
- 可选配置验证
- **Skills**（通过在插件清单中列出 `skills` 目录）
- **自动回复命令**（执行而不调用 AI 代理）

原生 OpenClaw 插件与 Gateway(网关) **进程内（in‑process）** 运行，因此请将其视为受信任的代码。
工具编写指南：[Plugin agent tools](/zh/plugins/agent-tools)。

## Provider 运行时钩子

Provider 插件现在有两个层级：

- 清单元数据：`providerAuthEnvVars` 用于在运行时加载之前进行廉价的环境身份验证查找，
  加上 `providerAuthChoices` 用于在运行时加载之前进行廉价的新手引导/身份验证选择
  标签和 CLI 标志元数据
- 配置时钩子： `catalog` / 旧版 `discovery`
- 运行时钩子： `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw 仍然拥有通用代理循环、故障转移、记录处理和工具策略。这些钩子是特定于提供商的行为的接口，而无需完整的自定义推理传输。

当提供商拥有基于环境的凭据时，使用 manifest `providerAuthEnvVars`，以便通用的 auth/status/模型-picker 路径在不加载插件运行时的情况下可以看到它们。当新手引导/身份验证选择的 CLI 界面需要知道提供商的选项 ID、组标签和简单的单标志身份验证连接，而无需加载提供商运行时时，请使用 manifest `providerAuthChoices`。保留提供商运行时 `envVars` 用于面向操作员的提示，例如新手引导标签或 OAuth client-id/client-secret 设置变量。

### 钩子顺序

对于模型/提供商插件，OpenClaw 大致按以下顺序使用钩子：

1. `catalog`
   在 `models.json`
   生成期间，将提供商配置发布到 `models.providers` 中。
2. 内置/发现的模型查找
   OpenClaw 首先尝试正常的注册表/目录路径。
3. `resolveDynamicModel`
   针对本地注册表中尚未包含的提供商拥有的模型 ID 的同步回退。
4. `prepareDynamicModel`
   仅在异步模型解析路径上进行异步预热，然后
   `resolveDynamicModel` 再次运行。
5. `normalizeResolvedModel`
   嵌入式运行程序使用解析出的模型之前的最终重写。
6. `capabilities`
   共享核心逻辑使用的提供商拥有的转录/工具元数据。
7. `prepareExtraParams`
   通用流选项包装器之前的提供商拥有的请求参数规范化。
8. `wrapStreamFn`
   在应用通用包装器之后，提供商拥有的流包装器。
9. `formatApiKey`
   当存储的身份验证配置文件需要转换为运行时 `apiKey` 字符串时，使用的提供商拥有的身份验证配置文件格式化程序。
10. `refreshOAuth`
    提供商拥有的 OAuth 刷新覆盖，用于自定义刷新端点或刷新失败策略。
11. `buildAuthDoctorHint`
    当 OAuth 刷新失败时附加的提供商拥有的修复提示。
12. `isCacheTtlEligible`
    用于代理/回传提供商的提供商拥有的提示缓存策略。
13. `buildMissingAuthMessage`
    提供商拥有的通用缺少身份验证恢复消息的替代内容。
14. `suppressBuiltInModel`
    提供商拥有的过时上游模型抑制，以及可选的用户可见错误提示。
15. `augmentModelCatalog`
    提供者拥有的在发现后附加的合成/最终编目行。
16. `isBinaryThinking`
    提供者拥有的用于二元思维提供者的开/关推理切换。
17. `supportsXHighThinking`
    提供者拥有为所选模型提供的 `xhigh` 推理支持。
18. `resolveDefaultThinkingLevel`
    提供者拥有的针对特定模型系列的默认 `/think` 级别。
19. `isModernModelRef`
    提供者拥有的由实时配置文件过滤器和冒烟选择使用的现代模型匹配器。
20. `prepareRuntimeAuth`
    在推理之前，将配置的凭据交换为实际的运行时令牌/密钥。
21. `resolveUsageAuth`
    解析 `/usage` 和相关状态界面的使用/计费凭据。
22. `fetchUsageSnapshot`
    在身份验证解决后，获取并规范化特定于提供商的使用/配额快照。

### 使用哪个 Hook

- `catalog`：将提供商配置和模型目录发布到 `models.providers`
- `resolveDynamicModel`：处理本地注册表中尚不存在的透传或向前兼容的模型 ID
- `prepareDynamicModel`：在重试动态解析之前进行异步预热（例如刷新提供商元数据缓存）
- `normalizeResolvedModel`：在推理之前重写已解析模型的传输/基本 URL/兼容性
- `capabilities`：发布提供商系列和转录/工具怪癖，而无需在核心中硬编码提供商 ID
- `prepareExtraParams`：在通用流包装之前设置提供商默认值或规范化特定于提供商的每个模型参数
- `wrapStreamFn`：添加特定于提供商的标头/负载/模型兼容性补丁，同时仍使用正常的 `pi-ai` 执行路径
- `formatApiKey`：将存储的身份验证配置文件转换为运行时 `apiKey` 字符串，而无需在核心中硬编码提供商令牌块
- `refreshOAuth`：为不适合共享 `pi-ai` 刷新器的提供商自行处理 OAuth 刷新
- `buildAuthDoctorHint`：当刷新失败时，追加提供商拥有的身份验证修复指导
- `isCacheTtlEligible`：决定提供商/模型对是否应使用缓存 TTL 元数据
- `buildMissingAuthMessage`：用特定于提供商的恢复提示替换通用的身份验证存储错误
- `suppressBuiltInModel`：隐藏过时的上游行，并可选择返回提供商拥有的错误以应对直接解析失败
- `augmentModelCatalog`：在发现和配置合并后追加合成/最终目录行
- `isBinaryThinking`：暴露二进制开/关推理 UX，而无需在 `/think` 中硬编码提供商 ID
- `supportsXHighThinking`：将特定模型选择加入 `xhigh` 推理级别
- `resolveDefaultThinkingLevel`：将提供商/模型默认推理策略保留在核心之外
- `isModernModelRef`：将实时/冒烟模型族包含规则保留在提供商处
- `prepareRuntimeAuth`：将配置的凭据交换为用于请求的实际短期运行时令牌/密钥
- `resolveUsageAuth`：解析提供商拥有的凭据以用于使用/计费端点，而无需在核心中硬编码令牌解析
- `fetchUsageSnapshot`：拥有特定于提供商的使用端点获取/解析，而核心保留汇总扇出和格式化

经验法则：

- 提供商拥有目录或基础 URL 默认值：使用 `catalog`
- 提供商接受任意上游模型 ID：使用 `resolveDynamicModel`
- 提供商需要在解析未知 ID 之前获取网络元数据：添加 `prepareDynamicModel`
- 提供商需要传输重写但仍使用核心传输：使用 `normalizeResolvedModel`
- 提供商需要转录/提供商家族的特殊处理：使用 `capabilities`
- 提供商需要默认请求参数或按提供商的参数清理：使用 `prepareExtraParams`
- 提供商需要请求标头/正文/模型兼容层但不需要自定义传输：使用 `wrapStreamFn`
- 提供商在身份验证配置文件中存储额外元数据并需要自定义运行时令牌形状：使用 `formatApiKey`
- 提供商需要自定义 OAuth 刷新端点或刷新失败策略：使用 `refreshOAuth`
- 提供商需要在刷新失败后拥有提供商拥有的身份验证修复指南：使用 `buildAuthDoctorHint`
- 提供商需要特定于代理的缓存 TTL 门控：使用 `isCacheTtlEligible`
- 提供商需要特定于提供商的缺少身份验证恢复提示：使用 `buildMissingAuthMessage`
- 提供商需要隐藏过时的上游行或将其替换为供应商提示：使用 `suppressBuiltInModel`
- 提供商需要在 `models list` 和选择器中提供合成的向前兼容行：使用 `augmentModelCatalog`
- 提供商仅公开二进制的思维开/关：使用 `isBinaryThinking`
- 提供商希望在部分模型上使用 `xhigh`：使用 `supportsXHighThinking`
- 提供商拥有模型系列的默认 `/think` 策略：使用 `resolveDefaultThinkingLevel`
- 提供商拥有实时/冒烟测试的首选模型匹配：使用 `isModernModelRef`
- 提供商需要进行令牌交换或短期请求凭证：使用 `prepareRuntimeAuth`
- 提供商需要自定义的使用/配额令牌解析或不同的使用凭证：使用 `resolveUsageAuth`
- 提供商需要特定的提供商使用端点或负载解析器：使用 `fetchUsageSnapshot`

如果提供商需要完全自定义的线路协议或自定义请求执行程序，
那是另一类扩展。这些钩子用于仍运行在 OpenClaw 正常推理循环中的提供商行为。

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

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`buildAuthDoctorHint`、
  `resolveUsageAuth`、`fetchUsageSnapshot`、`isCacheTtlEligible`、
  `resolveDefaultThinkingLevel` 和 `isModernModelRef`，因为它拥有 Claude
  4.6 向前兼容性、提供商系列提示、身份验证修复指导、使用
  端点集成、提示缓存资格以及 Claude 默认/自适应
  思维策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，加上 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`
  因为它拥有 GPT-5.4 向前兼容性、直接的 OpenAI
  `openai-completions` -> `openai-responses` 标准化、Codex 感知身份验证
  提示、Spark 抑制、合成 OpenAI 列表行，以及 GPT-5 思维 /
  实时模型策略。
- OpenRouter 使用 `catalog`，加上 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为该提供商是透传的，并且可能在 OpenClaw 的静态目录更新之前公开新的
  模型 ID。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和 `capabilities`，外加 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它需要提供商拥有的设备登录、模型回退行为、Claude 转录怪癖、GitHub 令牌 -> Copilot 令牌交换，以及提供商拥有的使用端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，以及
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它
  仍然运行在核心 OpenAI 传输上，但拥有其传输/基本 URL
  标准化、OAuth 刷新回退策略、默认传输选择、
  合成 Codex 目录行以及 ChatGPT 使用端点集成。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和
  `isModernModelRef`，因为它们拥有 Gemini 3.1 向前兼容回退和
  现代CLI匹配；Gemini OAuth OAuth 还使用 `formatApiKey`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot` 进行令牌格式化、令牌
  解析和配额端点连线。
- OpenRouter 使用 `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`
  以将提供商特定的请求标头、路由元数据、推理
  补丁和提示缓存策略排除在核心之外。
- Moonshot 使用 `catalog` 加上 `wrapStreamFn`，因为它仍使用共享
  的 OpenAI 传输，但需要提供商拥有的思考负载标准化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要提供商拥有的请求头、
  推理负载标准化、Gemini 对话记录提示以及 Anthropic
  缓存 TTL 闸控。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 回退、
  `tool_stream` 默认值、二元思维 UX、现代模型匹配，以及
  使用鉴权和配额获取。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities`，以便将
  对话记录/工具相关的怪癖排除在核心之外。
- 仅限目录的捆绑提供商（如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`）仅使用
  `catalog`。
- Qwen 门户使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和 Xiaomi 使用 `catalog` 加上使用钩子，因为尽管推理仍通过共享
  传输运行，但它们的 `/usage`
  行为归插件所有。

## 加载管道

启动时，OpenClaw 大致执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的包清单和包元数据
3. 拒绝不安全的候选插件
4. 规范化插件配置 (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. 确定每个候选插件的启用状态
6. 通过 jiti 加载已启用的原生模块
7. 调用原生 `register(api)` 钩子并将注册信息收集到插件注册表中
8. 向命令/运行时表面公开注册表

安全检查发生在运行时执行**之前**。当入口点超出插件根目录、路径可被全局写入，或者对于非打包插件，路径所有权看起来可疑时，候选插件将被阻止。

### 清单优先行为

清单是控制平面的单一事实来源。OpenClaw 使用它来：

- 识别插件
- 发现已声明的频道/技能/配置架构或 bundle 能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据

对于原生插件，运行时模块是数据平面部分。它注册
实际行为，例如钩子、工具、命令或提供商流程。

### 加载器缓存的内容

OpenClaw 为以下内容保留简短的进程内缓存：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存减少了突发启动和重复命令的开销。可以安全地
将它们视为短期性能缓存，而非持久化存储。

## 运行时助手

插件可以通过 `api.runtime` 访问选定的核心助手。对于电话 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

备注：

- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- Edge TTS 不支持电话功能。

对于 STT/转录，插件可以调用：

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意：

- 使用核心 media-understanding 音频配置（`tools.media.audio`）和提供商回退顺序。
- 当未产生转录输出时（例如跳过/不支持的输入），返回 `{ text: undefined }`。

## Gateway(网关) HTTP 路由

插件可以使用 `api.registerHttpRoute(...)` 公开 HTTP 端点。

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
- `auth`：必需。使用 `"gateway"` 要求正常的网关身份验证，或使用 `"plugin"` 进行插件管理的身份验证/webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其现有的路由注册。
- `handler`：当路由处理了请求时返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已过时。请使用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 确切的 `path + match` 冲突会被拒绝，除非 `replaceExisting: true`，并且一个插件不能替换另一个插件的路由。
- 拒绝不同 `auth` 级别之间的重叠路由。请将 `exact`/`prefix` 透传链保持在同一身份验证级别内。

## Plugin SDK 导入路径

编写插件时，请使用 SDK 子路径而非单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/core` 用于通用插件 API、提供商身份验证类型以及路由/会话实用程序和基于记录器的运行时等共享助手。
- `openclaw/plugin-sdk/compat` 用于需要比 `core` 更广泛共享运行时助手的捆绑/内部插件代码。
- `openclaw/plugin-sdk/telegram` 用于 Telegram 渠道插件类型和面向渠道的共享助手。内置 Telegram 实现内部细节对捆绑扩展保持私有。
- `openclaw/plugin-sdk/discord` 用于 Discord 渠道插件类型和共享的面向渠道的助手。内置的 Discord 实现内部细节对打包的扩展保持私有。
- `openclaw/plugin-sdk/slack` 用于 Slack 渠道插件类型和共享的面向渠道的助手。内置的 Slack 实现内部细节对打包的扩展保持私有。
- `openclaw/plugin-sdk/signal` 用于 Signal 渠道插件类型和共享的面向渠道的助手。内置的 Signal 实现内部细节对打包的扩展保持私有。
- `openclaw/plugin-sdk/imessage` 用于 iMessage 渠道插件类型和共享的面向渠道的助手。内置的 iMessage 实现内部细节对打包的扩展保持私有。
- `openclaw/plugin-sdk/whatsapp` 用于 WhatsApp 渠道插件类型和共享面向渠道的辅助程序。内置 WhatsApp 实现的内部细节对打包的扩展保持私有。
- `openclaw/plugin-sdk/line` 用于 LINE 渠道插件。
- `openclaw/plugin-sdk/msteams` 用于打包的 Microsoft Teams 插件表面。
- 捆绑的扩展特定子路径也可用：
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
  `openclaw/plugin-sdk/zalo` 和 `openclaw/plugin-sdk/zalouser`。

## 提供商目录

提供商插件可以定义用于通过
`registerProvider({ catalog: { run(...) { ... } } })` 进行推理的模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入
`models.providers` 的相同的形状：

- `{ provider }` 用于单个提供商条目
- `{ providers }` 用于多个提供商条目

当插件拥有提供商特定的模型 ID、默认基础 URL
或需要身份验证的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件的目录相对于 OpenClaw
的内置隐式提供商的合并时机：

- `simple`：普通的 API 密钥或由环境变量驱动的提供商
- `profile`：当存在身份验证配置文件时出现的提供商
- `paired`：综合多个相关提供商条目的提供商
- `late`：最后一遍，在其他隐式提供商之后

后面的提供商在键冲突时获胜，因此插件可以通过使用相同的提供商 ID 故意覆盖内置提供商条目。

兼容性：

- `discovery` 仍作为旧版别名工作
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 将使用 `catalog`

兼容性说明：

- `openclaw/plugin-sdk` 仍然受到对现有外部插件的支持。
- 新的和迁移的捆绑插件应使用渠道或扩展特定的子路径；仅在需要更广泛的共享助手时，对通用表面使用 `core`，对 `compat` 使用。

## 只读渠道检查

如果您的插件注册了渠道，最好与 `resolveAccount(...)` 一起实现
`plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它被允许假定凭据
  已完全实例化，并且在缺少所需机密时可以快速失败。
- 只读命令路径（如 `openclaw status`、`openclaw status --all`、
  `openclaw channels status`、`openclaw channels resolve` 以及 doctor/config
  修复流程）不应仅为了描述配置而实例化运行时凭据。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性的账户状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭据源/状态字段，例如：
  - `tokenSource`， `tokenStatus`
  - `botTokenSource`， `botTokenStatus`
  - `appTokenSource`， `appTokenStatus`
  - `signingSecretSource`， `signingSecretStatus`
- 仅为了报告只读可用性，您无需返回原始令牌值。返回 `tokenStatus: "available"`（以及匹配的 source 字段）对于状态式命令来说就足够了。
- 当凭据通过 SecretRef 配置但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这使得只读命令可以报告“已配置但在当前命令路径中不可用”，而不是崩溃或将账户错误地报告为未配置。

性能提示：

- 插件发现和清单元数据使用简短的进程内缓存来减少突发的启动/重新加载工作。
- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 设备发现 & 优先级

OpenClaw 按顺序扫描：

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

许多捆绑的提供商插件默认已启用，因此模型目录/运行时钩子无需额外设置即可保持可用。其他插件仍需通过 `plugins.entries.<id>.enabled` 或
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
- `minimax`
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

已安装的插件默认启用，但也可以通过相同方式禁用。

工作区插件默认**处于禁用状态**，除非您明确启用它们
或将其加入允许列表。这是有意为之：检出的代码仓库不应静默
成为生产网关代码。

加固说明：

- 如果 `plugins.allow` 为空且可发现非打包插件，OpenClaw 会记录一条包含插件 ID 和来源的启动警告。
- 候选路径在发现准入前会进行安全检查。OpenClaw 会在以下情况阻止候选路径：
  - 扩展入口解析到插件根目录之外（包括符号链接/路径遍历逃逸），
  - 插件根目录/源路径可被全局写入，
  - 对于非打包插件，路径所有权可疑（POSIX 所有者既不是当前 uid 也不是 root）。
- 加载的未打包插件如果没有安装/加载路径的来源信息，会发出警告，以便您可以固定信任（`plugins.allow`）或安装跟踪（`plugins.installs`）。

每个原生 OpenClaw 插件必须在其根目录中包含一个 `openclaw.plugin.json` 文件。如果路径指向文件，则插件根目录为该文件所在的目录，并且必须包含清单。

兼容的捆绑包可以改为提供以下之一：

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

捆绑包目录从与原生插件相同的根目录中发现。

如果多个插件解析为同一个 ID，则上述顺序中的第一个匹配项获胜，并忽略优先级较低的副本。

这意味着：

- 工作区插件会故意遮蔽具有相同 ID 的捆绑插件
- `plugins.allow: ["foo"]` 按 ID 授权活动的 `foo` 插件，即使活动副本来自工作区而不是打包的扩展根目录
- 如果您需要更严格的来源控制，请使用显式的安装/加载路径，并在启用插件之前检查已解析的插件源

### 启用规则

在发现之后解析启用状态：

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 始终优先
- `plugins.entries.<id>.enabled: false` 禁用该插件
- 工作区来源的插件默认被禁用
- 当 `plugins.allow` 非空时，允许列表限制活动集
- 允许列表是**基于 ID 的**，而不是基于源的
- 打包的插件默认被禁用，除非：
  - 打包的 ID 在内置的默认启用集中，或者
  - 您明确启用了它，或者
  - 渠道配置隐式启用了捆绑的渠道插件
- 独占槽位可以强制启用该槽位选定的插件

在当前核心中，捆绑的默认启用 ID 包括上述 local/提供商 助手以及活动的内存槽位插件。

### 软件包集合

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

每个条目都会成为一个插件。如果集合列出了多个扩展，插件 ID 将变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖项，请将其安装在该目录中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全防护措施：解析符号链接后，每个 `openclaw.extensions` 条目必须保留在插件目录内。转义出软件包目录的条目将被拒绝。

安全提示：`openclaw plugins install` 使用 `npm install --ignore-scripts`（无生命周期脚本）安装插件依赖。保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级的仅设置模块。当 OpenClaw 需要为已禁用的渠道插件获取设置界面时，或者当渠道插件已启用但尚未配置时，它会加载 `setupEntry` 而不是完整的插件入口。当你的主插件入口还连接了工具、钩子或其他仅运行时代码时，这会使启动和设置更加轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以使渠道插件在网关的预监听启动阶段选择进入相同的 `setupEntry` 路径，即使该渠道已配置也是如此。

仅当 `setupEntry` 完全覆盖了网关开始监听之前必须存在的启动表面时，才使用此选项。实际上，这意味着设置条目必须注册启动所依赖的每个渠道拥有的功能，例如：

- 渠道注册本身
- 在网关开始监听之前必须可用的任何 HTTP 路由
- 在同一窗口期间必须存在的任何网关方法、工具或服务

如果您的完整条目仍然拥有任何必需的启动功能，请勿启用此标志。保持插件处于默认行为，并让 OpenClaw 在启动期间加载完整条目。

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

渠道插件可以通过 `openclaw.channel` 宣传设置/发现元数据，并通过 `openclaw.install` 宣传安装提示。这使核心目录保持无数据状态。

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

OpenClaw 还可以合并 **外部渠道目录**（例如，MPM 注册表导出）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 ID：

- 包包：`package.json` `name`
- 独立文件：文件基本名称（`~/.../voice-call.ts` → `voice-call`）

如果插件导出 `id`，OpenClaw 将使用它，但在其与配置的 ID 不匹配时会发出警告。

## 注册表模型

已加载的插件不会直接修改随机的核心全局变量。它们会注册到一个中央插件注册表中。

注册表跟踪：

- 插件记录（身份、来源、起源、状态、诊断）
- 工具
- 传统钩子和类型化钩子
- 通道
- 提供者
- 网关 RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

然后，核心功能从该注册表读取，而不是直接与插件模块通信。这使得加载保持单向：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对于可维护性很重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“为每个插件模块进行特殊处理”。

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
- `deny`: denylist (可选；拒绝优先)
- `load.paths`: 额外的插件文件/目录
- `slots`: 独占槽位选择器，例如 `memory` 和 `contextEngine`
- `entries.<id>`: 每个插件的开关 + 配置

配置更改**需要重启网关**。

验证规则（严格）：

- `entries`、`allow`、`deny` 或 `slots` 中未知的插件 ID 是**错误**。
- 未知的 `channels.<id>` 键是**错误**，除非插件清单声明了该渠道 ID。
- 原生插件配置使用嵌入在 `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 进行验证。
- 兼容的捆绑包目前不公开原生 OpenClaw 配置架构。
- 如果插件被禁用，其配置将被保留，并且会发出**警告**。

### 已禁用、缺失与无效

这些状态是有意区分的：

- **已禁用**：插件存在，但启用规则将其关闭
- **缺失**：配置引用了一个发现机制未找到的插件 ID
- **无效**：插件存在，但其配置与声明的架构不匹配

OpenClaw 会保留已禁用插件的配置，因此重新启用它们不会造成破坏。

## 插件插槽（独占类别）

某些插件类别是**独占的**（一次只能激活一个）。使用
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

支持的独占插槽：

- `memory`：活动内存插件（`"none"` 禁用内存插件）
- `contextEngine`：活动上下文引擎插件（`"legacy"` 是内置默认值）

如果多个插件声明 `kind: "memory"` 或 `kind: "context-engine"`，则仅
为该插槽加载选定的插件。其他插件将被禁用并显示诊断信息。

### 上下文引擎插件

上下文引擎插件拥有用于摄取、组装
和压缩的会话上下文编排。请从插件中使用
`api.registerContextEngine(id, factory)` 注册它们，然后使用
`plugins.slots.contextEngine` 选择活动引擎。

当您的插件需要替换或扩展默认上下文
管道而不仅仅是添加内存搜索或钩子时，请使用此功能。

## 控制 UI（架构 + 标签）

控制 UI 使用 `config.schema`（JSON 架构 + `uiHints`）来呈现更好的表单。

OpenClaw 根据发现的插件在运行时增强 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加每个插件的标签
- 在以下位置合并可选的插件提供的配置字段提示：
  `plugins.entries.<id>.config.<field>`

如果您希望您的插件配置字段显示良好的标签/占位符（并将机密标记为敏感），请在插件清单中与 JSON Schema 一起提供 `uiHints`。

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

`openclaw plugins list` 将顶级格式显示为 `openclaw` 或 `bundle`。
详细的列表/信息输出还会显示包子类型（`codex` 或 `claude`）以及检测到的包功能。

`plugins update` 仅适用于在 `plugins.installs` 下跟踪的 npm 安装。
如果存储的完整性元数据在更新之间发生变化，OpenClaw 会发出警告并要求确认（使用全局 `--yes` 以绕过提示）。

插件也可以注册自己的顶层命令（例如：`openclaw voicecall`）。

## 插件 API （概述）

插件导出以下之一：

- 一个函数：`(api) => { ... }`
- 一个对象：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是插件附加行为的地方。常见的注册包括：

- `registerTool`
- `registerHook`
- `on(...)` 用于类型化生命周期挂钩
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

插件可以在运行时注册钩子。这使得插件可以打包事件驱动的自动化，而无需单独安装钩子包。

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

注意事项：

- 通过 `api.registerHook(...)` 显式注册钩子。
- 钩子适用性规则仍然适用（操作系统/二进制文件/环境/配置要求）。
- 插件管理的钩子会出现在 `openclaw hooks list` 中，并带有 `plugin:<id>`。
- 您无法通过 `openclaw hooks` 启用/禁用插件管理的钩子；请改为启用/禁用插件。

### Agent 生命周期钩子 (`api.on`)

对于类型化的运行时生命周期钩子，请使用 `api.on(...)`：

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

用于提示词构造的重要钩子：

- `before_model_resolve`：在会话加载之前运行（`messages` 不可用）。使用它来确定性地覆盖 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`：在会话加载之后运行（`messages` 可用）。使用它来塑造提示词输入。
- `before_agent_start`：旧版兼容性钩子。首选上述两个明确的钩子。

核心强制执行的钩子策略：

- 操作员可以通过 `plugins.entries.<id>.hooks.allowPromptInjection: false` 为每个插件禁用提示词变更钩子。
- 禁用时，OpenClaw 会阻止 `before_prompt_build` 并忽略从旧版 `before_agent_start` 返回的提示词变更字段，同时保留旧版 `modelOverride` 和 `providerOverride`。

`before_prompt_build` 结果字段：

- `prependContext`：在此运行的用户提示词前追加文本。最适用于特定轮次或动态内容。
- `systemPrompt`：完全覆盖系统提示词。
- `prependSystemContext`：在当前系统提示词前追加文本。
- `appendSystemContext`：在当前系统提示词后追加文本。

嵌入式运行时中的提示词构建顺序：

1. 将 `prependContext` 应用于用户提示词。
2. 如果提供了 `systemPrompt` 覆盖值，则应用该覆盖值。
3. 应用 `prependSystemContext + current system prompt + appendSystemContext`。

合并与优先级说明：

- Hook 处理程序按优先级运行（优先级高的先运行）。
- 对于合并的上下文字段，值将按执行顺序拼接。
- `before_prompt_build` 值在旧版 `before_agent_start` 后备值之前应用。

迁移指南：

- 将静态指导从 `prependContext` 移至 `prependSystemContext`（或 `appendSystemContext`），以便提供商可以缓存稳定的系统前缀内容。
- 将 `prependContext` 用于应与用户消息保持关联的每一轮动态上下文。

## 提供商插件（模型身份验证）

插件可以注册**模型提供商**，以便用户可以在 OAuth 内运行 API 或 OpenClaw 密钥设置，在 新手引导/模型选择器中显示提供商设置，并有助于隐式提供商发现。

提供商插件是模型提供商设置的模块化扩展连接点。它们不再仅仅是“OAuth 助手”。

### 提供商插件生命周期

提供商插件可以参与五个不同的阶段：

1. **身份验证 (Auth)**
   `auth[].run(ctx)` 执行 OAuth、API 密钥捕获、设备代码或自定义设置，并返回身份验证配置文件以及可选的配置补丁。
2. **非交互式设置**
   `auth[].runNonInteractive(ctx)` 无需提示即可处理 `openclaw onboard --non-interactive`。
   当提供商需要超出内置简单 API 密钥路径的自定义无头设置时，请使用此方法。
3. **向导集成**
   `wizard.setup` 向 `openclaw onboard` 添加一个条目。
   `wizard.modelPicker` 向模型选择器添加一个设置条目。
4. **隐式发现**
   `discovery.run(ctx)` 可以在模型解析/列出期间自动贡献提供商配置。
5. **选择后跟进**
   `onModelSelected(ctx)` 在选择模型后运行。将其用于特定于提供商的工作，例如下载本地模型。

这是推荐的拆分方式，因为这些阶段具有不同的生命周期要求：

- 身份验证是交互式的，并写入凭据/配置
- 非交互式设置由标志/环境变量驱动，绝不能提示
- 向导元数据是静态的且面向 UI
- 发现过程应当是安全的、快速的且容错的
- 后选择钩子是与所选模型绑定的副作用

### 提供商认证约定

`auth[].run(ctx)` 返回：

- `profiles`：要写入的认证配置文件
- `configPatch`：可选的 `openclaw.json` 更改
- `defaultModel`：可选的 `provider/model` 引用
- `notes`：可选的用户说明

核心然后：

1. 写入返回的认证配置文件
2. 应用认证配置文件连接
3. 合并配置补丁
4. 可选地应用默认模型
5. 在适当的时候运行提供商的 `onModelSelected` 钩子

这意味着提供商插件拥有特定于提供商的设置逻辑，而核心
拥有通用的持久化和配置合并路径。

### 提供商非交互式契约

`auth[].runNonInteractive(ctx)` 是可选的。当提供商需要无法通过内置通用 API 密钥流程表达的无头设置时，请实现它。

非交互式上下文包括：

- 当前和基础配置
- 已解析的 CLI 选项
- 运行时日志记录/错误助手
- 代理/工作区目录，以便提供商可以将身份验证持久化到与 CLI 其余部分使用的相同作用域存储中
- `resolveApiKey(...)` 用于从标志、环境变量或现有身份验证配置文件中读取提供商密钥，同时遵守 `--secret-input-mode`
- `toApiKeyCredential(...)` 用于将解析的密钥转换为具有正确纯文本与密钥引用存储的身份验证配置文件凭据

将此界面用于以下提供商：

- 需要 `--custom-base-url` + `--custom-model-id` 的自托管 OpenAI 兼容运行时
- 特定于提供商的非交互式验证或配置综合

请勿从 `runNonInteractive` 进行提示。对于缺失的输入，请拒绝并返回可操作的错误。

### 提供商向导元数据

提供商身份验证/新手引导元数据可以存在于两个层级：

- manifest `providerAuthChoices`：廉价的标签、分组、`--auth-choice`
  ID，以及在运行时加载之前可用的简单 CLI 标志元数据
- runtime `wizard.setup` / `auth[].wizard`：依赖于已加载提供商代码的更丰富的行为

对静态标签/标志使用清单元数据。当设置依赖于动态身份验证方法、方法回退或运行时验证时，使用运行时向导元数据。

`wizard.setup` 控制提供商在分组新手引导中的显示方式：

- `choiceId`：auth-choice 值
- `choiceLabel`: 选项标签
- `choiceHint`: 简短提示
- `groupId`: 分组存储桶 ID
- `groupLabel`: 分组标签
- `groupHint`: 分组提示
- `methodId`: 要运行的认证方法
- `modelAllowlist`: 可选的认证后允许列表策略 (`allowedKeys`, `initialSelections`, `message`)

`wizard.modelPicker` 控制提供商在模型选择中作为“立即设置”条目的显示方式：

- `label`
- `hint`
- `methodId`

当提供商有多种认证方法时，向导可以指向一个显式方法，也可以让 OpenClaw 综合生成每种方法的选择。

当插件注册时，OpenClaw 会验证提供商向导元数据：

- 重复或空白的认证方法 ID 会被拒绝
- 当提供商没有认证方法时，向导元数据会被忽略
- 无效的 `methodId` 绑定会被降级为警告，并回退到提供商剩余的认证方法

### 提供商发现合约

`discovery.run(ctx)` 返回以下之一：

- `{ provider }`
- `{ providers }`
- `null`

在插件拥有一个提供商 ID 的常见情况下，请使用 `{ provider }`。当插件发现多个提供商条目时，请使用 `{ providers }`。

发现上下文包括：

- 当前配置
- 代理/工作区目录
- 进程环境变量
- 一个用于解析提供商 API 密钥的助手和一个对发现安全的 API 密钥值

发现过程应该是：

- 快速
- 尽力而为
- 失败时可安全跳过
- 注意副作用

它不应依赖于提示或长时间运行的设置。

### 设备发现顺序

提供商发现按顺序分阶段运行：

- `simple`
- `profile`
- `paired`
- `late`

使用：

- `simple` 用于廉价的仅环境发现
- `profile` 当发现依赖于身份验证配置文件时
- `paired` 用于需要与另一个发现步骤协调的提供商
- `late` 用于昂贵或本地网络探测

大多数自托管提供商应使用 `late`。

### 良好的提供商插件边界

适合提供商插件的情况：

- 具有自定义设置流程的本地/自托管提供商
- 特定于提供商的 OAuth/设备代码登录
- 本地模型服务器的隐式发现
- 选择后的副作用，例如模型拉取

不太合适的场景：

- 仅通过 API 密钥且仅因环境变量、基础 URL 和一个默认模型而有所区别的简单提供商

这些仍然可以成为插件，但主要的模块化收益来自于首先提取行为丰富的提供商。

通过 `api.registerProvider(...)` 注册提供商。每个提供商公开一种或多种身份验证方法（OAuth、API 密钥、设备代码等）。这些方法可用于：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- 模型选择器“自定义提供商”设置条目
- 模型解析/列出期间的隐式提供商发现

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
    setup: {
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

注意事项：

- `run` 接收一个包含 `prompter`、`runtime`、
  `openUrl`、`oauth.createVpsAwareHandlers`、`secretInputMode` 和
  `allowSecretRefPrompt` helpers/state 的 `ProviderAuthContext`。新手引导/配置流程可以使用
  这些来遵守 `--secret-input-mode` 或提供 env/file/exec secret-ref
  捕获，而 `openclaw models auth` 则保持更紧凑的提示词表面。
- `runNonInteractive` 接收一个 `ProviderAuthMethodNonInteractiveContext`，
  其中包含用于无头新手引导的 `opts`、`agentDir`、`resolveApiKey` 和 `toApiKeyCredential` helpers。
- 当需要添加默认模型或提供商配置时，返回 `configPatch`。
- 返回 `defaultModel` 以便 `--set-default` 可以更新代理默认值。
- `wizard.setup` 向 `openclaw onboard` / `openclaw setup --wizard` 等新手引导界面添加提供商选项。
- `wizard.setup.modelAllowlist` 允许提供商在新手引导/配置期间缩小后续模型允许列表提示的范围。
- `wizard.modelPicker` 向模型选择器添加一个“设置此提供商”条目。
- `deprecatedProfileIds` 允许提供商负责 `openclaw doctor` 针对已退役身份配置文件 ID 的清理工作。
- `discovery.run` 针对插件自己的提供商 ID 返回 `{ provider }`，或者针对多提供商发现返回 `{ providers }`。
- `discovery.order` 控制提供商相对于内置发现阶段的运行时机：`simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是用于特定于提供商的后续工作的后置挂钩，例如拉取本地模型。

### 注册消息渠道

插件可以注册行为类似内置渠道（WhatsApp、Telegram 等）的**渠道插件**。渠道配置位于 `channels.<id>` 下，并由您的渠道插件代码进行验证。

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

注意：

- 将配置放在 `channels.<id>` 下（而非 `plugins.entries`）。
- `meta.label` 用于 CLI/UI 列表中的标签。
- `meta.aliases` 添加用于规范化和 CLI 输入的备用 ID。
- `meta.preferOver` 列出了在两者都配置好时要跳过自动启用的渠道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 允许 UI 显示更丰富的渠道标签/图标。

### 渠道设置挂钩

首选设置拆分：

- `plugin.setup` 负责账户 ID 规范化、验证和配置写入。
- `plugin.setupWizard` 允许主机运行通用向导流程，而渠道仅提供状态、凭据、私信白名单和渠道访问描述符。

`plugin.setupWizard` 最适合符合共享模式的渠道：

- 由 `plugin.config.listAccountIds` 驱动的一个账户选择器
- 在提示之前的可选预检/准备步骤（例如安装程序/引导工作）
- 针对捆绑凭据集的可选 env-shortcut 提示（例如配对的机器人/应用令牌）
- 一个或多个凭证提示，其中每个步骤通过 `plugin.setup.applyAccountConfig` 写入或通过渠道拥有的部分补丁写入
- 可选的非机密文本提示（例如 CLI 路径、基础 URL、帐户 ID）
- 由主机解析的可选渠道/组访问允许列表提示
- 可选的私信允许列表解析（例如 `@username` -> 数字 ID）
- 设置完成后的可选完成说明

### 编写新的消息渠道（分步指南）

当您想要一个新的聊天界面（“消息渠道”），而不是模型提供商时，请使用此选项。
模型提供商文档位于 `/providers/*` 下。

1. 选择 ID + 配置结构

- 所有渠道配置都位于 `channels.<id>` 下。
- 对于多帐户设置，首选 `channels.<id>.accounts.<accountId>`。

2. 定义渠道元数据

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 应指向类似 `/channels/<id>` 的文档页面。
- `meta.preferOver` 允许插件替换另一个渠道（自动启用会优先选择它）。
- `meta.detailLabel` 和 `meta.systemImage` 供 UI 用于详情文本/图标。

3. 实现所需的适配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天类型、媒体、线程等）
- `outbound.deliveryMode` + `outbound.sendText`（用于基本发送）

4. 根据需要添加可选适配器

- `setup` (validation + config writes), `setupWizard` (host-owned wizard), `security` (私信 policy), `status` (health/diagnostics)
- `gateway` (start/stop/login), `mentions`, `threading`, `streaming`
- `actions` (message actions), `commands` (native command behavior)

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

最小渠道插件（仅限出站）：

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

加载插件（extensions 目录或 `plugins.load.paths`），重启网关，
然后在你的配置中配置 `channels.<id>`。

### Agent 工具

请参阅专门指南：[Plugin agent tools](/zh/plugins/agent-tools)。

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

插件可以注册自定义斜杠命令，这些命令的执行**无需调用 AI 代理**。这对于切换命令、状态检查或不需要 LLM 处理的快速操作非常有用。

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

命令处理器上下文：

- `senderId`：发送者的 ID（如果有）
- `channel`：发送命令的渠道
- `isAuthorizedSender`：发送者是否为授权用户
- `args`：命令之后传递的参数（如果有 `acceptsArgs: true`）
- `commandBody`：完整的命令文本
- `config`：当前的 OpenClaw 配置

命令选项：

- `name`：命令名称（不带前缀 `/`）
- `nativeNames`：用于斜杠/菜单界面的可选原生命令别名。对所有原生提供商使用 `default`，或使用提供商特定的键（如 `discord`）
- `description`：在命令列表中显示的帮助文本
- `acceptsArgs`：命令是否接受参数（默认：false）。如果为 false 且提供了参数，则命令不会匹配，消息将传递给其他处理程序
- `requireAuth`：是否需要授权的发件人（默认：true）
- `handler`：返回 `{ text: string }` 的函数（可以是异步的）

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

- 插件命令在内置命令和 AI 代理**之前**进行处理
- 命令是全局注册的，并且在所有频道中工作
- 命令名称不区分大小写（`/MyStatus` 匹配 `/mystatus`）
- 命令名称必须以字母开头，并且仅包含字母、数字、连字符和下划线
- 保留的命令名称（如 `help`、`status`、`reset` 等）不能被插件覆盖
- 跨插件重复注册命令将失败，并显示诊断错误

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

- Gateway(网关) 方法：`pluginId.action`（示例：`voicecall.status`）
- 工具：`snake_case`（示例：`voice_call`）
- CLI 命令：kebab 或 camel 格式，但避免与核心命令冲突

## Skills

插件可以在代码库中附带一个 skill (`skills/<name>/SKILL.md`)。
使用 `plugins.entries.<id>.enabled`（或其他配置开关）启用它，并确保
它存在于您的工作区/托管 skills 位置。

## 分发 (npm)

推荐打包方式：

- 主包：`openclaw` (此仓库)
- 插件：`@openclaw/*` 下的独立 npm 包（示例：`@openclaw/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `openclaw.extensions`，其中包含一个或多个入口文件。
- 可选：`openclaw.setupEntry` 可以指向一个轻量级的仅设置入口，用于已禁用或尚未配置的渠道设置。
- 可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` 可以让渠道插件在 pre-listen 网关启动期间选择使用 `setupEntry`，但前提是该设置条目完全覆盖了插件的启动关键范围。
- 入口文件可以是 `.js` 或 `.ts`（jiti 会在运行时加载 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，解压到 `~/.openclaw/extensions/<id>/`，并在配置中启用它。
- 配置键的稳定性：作用域包（scoped packages）会被规范化为用于 `plugins.entries.*` 的 **无作用域** ID。

## 示例插件：语音通话

此仓库包含一个语音通话插件（Twilio 或日志回退）：

- 源码：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- Config (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (可选 `statusCallbackUrl`, `twimlUrl`)
- Config (dev): `provider: "log"` (无网络)

请参阅 [Voice Call](/zh/plugins/voice-call) 和 `extensions/voice-call/README.md` 了解设置和用法。

## 安全说明

插件与 Gateway(网关) 在同一进程中运行。请将它们视为受信任的代码：

- 仅安装您信任的插件。
- 首选 `plugins.allow` 允许列表。
- 请记住，`plugins.allow` 是基于 ID 的，因此启用的工作区插件可以
  故意覆盖具有相同 ID 的捆绑插件。
- 更改后重启 Gateway(网关)。

## 测试插件

插件可以（并且应该）附带测试：

- 仓库内的插件可以将 Vitest 测试放在 `src/**` 下（例如：`src/plugins/voice-call.plugin.test.ts`）。
- 单独发布的插件应运行自己的 CI（lint/build/test），并验证 `openclaw.extensions` 指向构建后的入口点（`dist/index.js`）。

import zh from "/components/footer/zh.mdx";

<zh />
