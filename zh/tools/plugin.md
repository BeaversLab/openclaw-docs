---
summary: "OpenClaw 插件/扩展：发现、配置和安全"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
title: "插件"
---

# 插件（扩展）

## 快速入门（插件新手？）

插件只是一个**小型代码模块**，它为 OpenClaw 扩展了额外
的功能（命令、工具和 Gateway 网关 RPC）。

大多数情况下，当你想要一个尚未内置在核心 OpenClaw 中的功能（或者你想将可选功能保留在主安装之外）时，你会使用插件。

快速路径：

1. 查看已加载的内容：

```bash
openclaw plugins list
```

2. 安装官方插件（示例：语音通话）：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 规范是 **仅限注册表** 的（包名称 + 可选的 **精确版本** 或 **分发标签**）。不接受 Git/URL/文件规范和语义化版本范围。

简洁规范和 `@latest` 保持在稳定版本轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求您通过预发布标签（如 `@beta`/`@rc`）或精确的预发布版本来明确选择加入。

3. 重启网关 (Gateway 网关)，然后在 `plugins.entries.<id>.config` 下进行配置。

有关具体插件示例，请参阅 [Voice Call](/zh/plugins/voice-call)。正在寻找第三方列表？请参阅 [Community plugins](/zh/plugins/community)。

## 架构

OpenClaw 的插件系统包含四个层级：

1. **清单 + 设备发现**
   OpenClaw 会从配置的路径、工作区根目录、全局扩展根目录和捆绑扩展中查找候选插件。设备发现首先读取
   `openclaw.plugin.json` 以及包元数据。
2. **启用 + 验证**
   核心代码决定发现的插件是处于启用、禁用、阻止状态，还是被选中用于内存等独占插槽。
3. **运行时加载**
   启用的插件通过 jiti 在进程内加载，并将功能注册到中央注册表中。
4. **Surface consumption**
   OpenClaw 的其余部分读取注册表以公开工具、频道、提供商
   设置、钩子、HTTP 路由、CLI 命令和服务。

重要的设计边界：

- 设备发现 + 配置验证应基于 **清单/架构元数据** 进行，而无需执行插件代码
- 运行时行为来自插件模块的 `register(api)` 路径

这种分离使 OpenClaw 能够验证配置、解释缺失/禁用的插件，并在完整运行时激活之前构建 UI/架构提示。

## 执行模型

插件与 Gateway 网关 **在进程中** 运行。它们不是沙箱隔离的。已加载
的插件具有与核心代码相同的进程级信任边界。

影响：

- 插件可以注册工具、网络处理程序、钩子和服务
- 插件错误可能会导致网关崩溃或不稳定
- 恶意插件等同于在 OpenClaw 进程内执行任意代码

对非捆绑插件使用允许列表和显式安装/加载路径。将工作区插件视为开发时代码，而不是生产默认设置。

重要信任说明：

- `plugins.allow` 信任的是**插件 ID**，而非来源出处。
- 当启用或允许列表中包含与捆绑插件具有相同 ID 的工作区插件时，该工作区插件会故意遮蔽捆绑副本。
- 这对于本地开发、补丁测试和热修复来说是正常且有用的。

## 可用插件（官方）

- 截至 2026.1.15，Microsoft Teams 仅支持插件；如果您使用 Teams，请安装 `@openclaw/msteams`。
- Memory (Core) — 捆绑的内存搜索插件（默认通过 `plugins.slots.memory` 启用）
- Memory (LanceDB) — 捆绑的长期记忆插件（自动召回/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [Voice Call](/zh/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth（提供商身份验证）— 捆绑为 `google-antigravity-auth`（默认禁用）
- Gemini CLI OAuth（提供商身份验证）— 捆绑为 `google-gemini-cli-auth`（默认禁用）
- Qwen OAuth（提供商身份验证）— 捆绑为 `qwen-portal-auth`（默认禁用）
- Copilot Proxy（提供商身份验证）— 本地 VS Code Copilot Proxy 网桥；与内置 `github-copilot` 设备登录不同（已捆绑，默认禁用）

OpenClaw 插件是通过 jiti 在运行时加载的 **TypeScript 模块**。**配置
验证不会执行插件代码**；它使用插件清单和 JSON
Schema 代替。请参阅 [Plugin manifest](/zh/plugins/manifest)。

插件可以注册：

- Gateway(网关) RPC 方法
- Gateway(网关) HTTP 路由
- Agent 工具
- CLI 命令
- 后台服务
- 上下文引擎
- 可选配置验证
- **Skills**（通过在插件清单中列出 `skills` 目录）
- **自动回复命令**（执行时不调用 AI 代理）

插件与 Gateway(网关) **在进程中** 运行，因此请将它们视为可信代码。
工具编写指南：[Plugin agent tools](/zh/plugins/agent-tools)。

## 加载管道

启动时，OpenClaw 大致执行以下操作：

1. 发现候选插件根目录
2. 读取 `openclaw.plugin.json` 和包元数据
3. 拒绝不安全的候选
4. 标准化插件配置（`plugins.enabled`、`allow`、`deny`、`entries`、
   `slots`、`load.paths`）
5. 决定每个候选的启用状态
6. 通过 jiti 加载已启用的模块
7. 调用 `register(api)` 并将注册信息收集到插件注册表中
8. 将注册表暴露给命令/运行时界面

安全检查发生在运行时执行 **之前**。当入口点超出插件根目录、路径可被全局写入，
或者对于非打包插件路径所有权看起来可疑时，候选将被阻止。

### 清单优先行为

清单是控制平面的唯一真实来源。OpenClaw 使用它来：

- 识别插件
- 发现已声明的通道/skills/配置架构
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 显示安装/目录元数据

运行时模块是数据平面部分。它注册实际行为，例如
hooks、工具、命令或提供商流。

### 加载器缓存的内容

OpenClaw 为以下内容保留了简短的进程内缓存：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存减少了突发启动和重复命令的开销。可以安全地将它们视为短期性能缓存，而不是持久化存储。

## 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于电话 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

注意：

- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- 电话不支持 Edge TTS。

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

- 使用核心媒体理解音频配置（`tools.media.audio`）和提供商回退顺序。
- 当未产生转录输出（例如跳过/不支持的输入）时，返回 `{ text: undefined }`。

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
- `replaceExisting`：可选。允许同一插件替换其自己现有的路由注册。
- `handler`：当路由处理了请求时，返回 `true`。

注意：

- `api.registerHttpHandler(...)` 已过时。请使用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非 `replaceExisting: true`，否则会拒绝确切的 `path + match` 冲突，并且一个插件不能替换另一个插件的路由。
- 将拒绝具有不同 `auth` 级别的重叠路由。请将 `exact`/`prefix` 传递链仅保留在同一身份验证级别上。

## Plugin SDK 导入路径

在编写插件时，使用 SDK 子路径而不是单一的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/core` 用于通用插件 API、提供商身份验证类型和共享辅助工具。
- `openclaw/plugin-sdk/compat` 用于需要比 `core` 更广泛的共享运行时辅助工具的捆绑/内部插件代码。
- `openclaw/plugin-sdk/telegram` 用于 Telegram 渠道插件。
- `openclaw/plugin-sdk/discord` 用于 Discord 渠道插件。
- `openclaw/plugin-sdk/slack` 用于 Slack 渠道插件。
- `openclaw/plugin-sdk/signal` 用于 Signal 渠道插件。
- `openclaw/plugin-sdk/imessage` 用于 iMessage 渠道插件。
- `openclaw/plugin-sdk/whatsapp` 用于 WhatsApp 渠道插件。
- `openclaw/plugin-sdk/line` 用于 LINE 渠道插件。
- `openclaw/plugin-sdk/msteams` 用于捆绑的 Microsoft Teams 插件表面。
- 也可以使用特定于捆绑扩展的子路径：
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`,
  `openclaw/plugin-sdk/google-gemini-cli-auth`, `openclaw/plugin-sdk/googlechat`,
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

兼容性说明：

- `openclaw/plugin-sdk` 仍支持现有的外部插件。
- 新迁移的捆绑插件应使用渠道或扩展特定的子路径；通用界面使用 `core`，仅在需要更广泛的共享助手时使用 `compat`。

## 只读渠道检查

如果您的插件注册了渠道，建议在 `resolveAccount(...)` 旁边实现 `plugin.config.inspectAccount(cfg, accountId)`。

原因：

- `resolveAccount(...)` 是运行时路径。它允许假定凭据已完全具体化，并在缺少所需机密时快速失败。
- 只读命令路径，如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 以及 doctor/config 修复流程，不应为了描述配置而具体化运行时凭据。

建议的 `inspectAccount(...)` 行为：

- 仅返回描述性帐户状态。
- 保留 `enabled` 和 `configured`。
- 在适当时包含凭据源/状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 您不需要为了报告只读可用性而返回原始令牌值。返回 `tokenStatus: "available"`（以及匹配的源字段）对于状态式命令已足够。
- 当凭据通过 SecretRef 配置但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这允许只读命令报告“已配置但在当前命令路径中不可用”，而不是崩溃或将帐户错误报告为未配置。

性能提示：

- 插件发现和清单元数据使用简短的进程内缓存来减少
  突发的启动/重新加载工作。
- 设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 以禁用这些缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 发现与优先级

OpenClaw 按顺序扫描：

1. 配置路径

- `plugins.load.paths` (文件或目录)

2. 工作区扩展

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全局扩展

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 内置扩展 (随 OpenClaw 附带，默认情况下大多禁用)

- `<openclaw>/extensions/*`

大多数内置插件必须通过
`plugins.entries.<id>.enabled` 或 `openclaw plugins enable <id>` 显式启用。

默认启用的内置插件例外：

- `device-pair`
- `phone-control`
- `talk-voice`
- 活动内存槽插件 (默认槽位: `memory-core`)

已安装的插件默认启用，但也可以用同样的方式禁用。

工作区插件**默认禁用**，除非您显式启用它们
或将它们加入允许列表。这是故意的：检出的代码库不应静默
成为生产网关代码。

加固说明：

- 如果 `plugins.allow` 为空且可发现非内置插件，OpenClaw 会记录包含插件 ID 和来源的启动警告。
- 候选路径在进入发现流程前会进行安全检查。OpenClaw 会在以下情况下阻止候选路径：
  - 扩展入口解析到插件根目录之外 (包括符号链接/路径遍历逃逸)，
  - 插件根目录/源路径可被全局写入，
  - 对于非内置插件，路径所有权可疑 (POSIX 所有者既不是当前 uid 也不是 root)。
- 加载的没有安装/加载路径来源的非内置插件会发出警告，以便您固定信任 (`plugins.allow`) 或安装跟踪 (`plugins.installs`)。

每个插件必须在其根目录中包含一个 `openclaw.plugin.json` 文件。如果路径指向一个文件，则插件根目录为该文件的目录，并且必须包含清单文件。

如果有多个插件解析为同一个 id，则上述顺序中的第一个匹配项胜出，优先级较低的副本将被忽略。

这意味着：

- 工作区插件有意屏蔽具有相同 id 的捆绑插件
- `plugins.allow: ["foo"]` 通过 id 授权活动的 `foo` 插件，即使活动副本来自工作区而不是捆绑扩展根目录
- 如果您需要更严格的来源控制，请使用显式的安装/加载路径，并在启用之前检查解析的插件来源

### 启用规则

启用在发现之后解析：

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 总是获胜
- `plugins.entries.<id>.enabled: false` 禁用该插件
- 工作区来源的插件默认处于禁用状态
- 当 `plugins.allow` 非空时，允许列表会限制活动集
- 允许列表是**基于 id 的**，而不是基于来源的
- 捆绑插件默认处于禁用状态，除非：
  - 捆绑的 id 位于内置的默认开启集中，或
  - 您显式启用了它，或
  - 渠道配置隐式启用了捆绑的渠道插件
- 独占槽可以强制启用该槽的选定插件

在当前核心中，捆绑的默认开启 id 包括 local/提供商 辅助工具，如 `ollama`、`sglang`、`vllm`，以及 `device-pair`、`phone-control` 和 `talk-voice`。

### 包集合

插件目录可以包含一个带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

每个条目都会成为一个插件。如果集合列出了多个扩展，插件 id 将变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖，请在该目录中安装它们，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

安全防护：每个 `openclaw.extensions` 条目在解析符号链接后必须保留在插件
directory 内。逃逸出 package 目录的条目将被拒绝。

安全提示：`openclaw plugins install` 使用 `npm install --ignore-scripts` 安装插件依赖
（无生命周期脚本）。保持插件依赖树为“纯 JS/TS”，并避免需要 `postinstall` 构建的包。

### Channel catalog 元数据

Channel 插件可以通过 `openclaw.channel` 宣传新手引导元数据，并通过
`openclaw.install` 宣传安装提示。这使核心目录保持无数据。

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

OpenClaw 也可以合并**外部渠道目录**（例如，MPN
registry 导出文件）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 id：

- Package packs: `package.json` `name`
- 独立文件：文件基本名称（`~/.../voice-call.ts` → `voice-call`）

如果插件导出 `id`，OpenClaw 将使用它，但在它与配置的 id
不匹配时发出警告。

## 注册表模型

已加载的插件不会直接改变随机的核心全局变量。它们注册到一个
central plugin registry 中。

注册表跟踪：

- 插件记录（标识、来源、起源、状态、诊断）
- 工具
- 旧版钩子和类型化钩子
- 渠道
- 提供者
- gateway RPC 处理程序
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能随后从该注册表读取，而不是直接与插件模块通信。这使得加载过程保持单向：

- plugin module -> registry registration
- core runtime -> registry consumption

这种分离对于可维护性至关重要。这意味着大多数核心表面只需要一个集成点：“读取注册表”，而不是“对每个插件模块进行特殊处理”。

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
- `slots`：独占槽位选择器，例如 `memory` 和 `contextEngine`
- `entries.<id>`：每个插件的开关和配置

配置更改**需要重启网关**。

验证规则（严格）：

- `entries`、`allow`、`deny` 或 `slots` 中未知的插件 ID 是**错误**。
- 未知的 `channels.<id>` 键是**错误**，除非插件清单声明了渠道 ID。
- 插件配置使用嵌入在 `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 进行验证。
- 如果插件被禁用，其配置将被保留，并发出**警告**。

### 已禁用 vs 缺失 vs 无效

这些状态是有意区分的：

- **已禁用**：插件存在，但启用规则将其关闭
- **缺失**：配置引用了一个发现未找到的插件 ID
- **无效**：插件存在，但其配置与声明的架构不匹配

OpenClaw 会保留已禁用插件的配置，以便重新启用它们时不会造成破坏。

## 插件槽位（独占类别）

某些插件类别是**独占的**（一次只能有一个处于活动状态）。使用 `plugins.slots` 来选择哪个插件拥有该槽位：

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

支持的独占槽位：

- `memory`：激活的内存插件（`"none"` 禁用内存插件）
- `contextEngine`：激活的上下文引擎插件（`"legacy"` 是内置默认值）

如果有多个插件声明 `kind: "memory"` 或 `kind: "context-engine"`，则该槽位仅加载选定的插件。其他插件将被禁用并输出诊断信息。

### 上下文引擎插件

上下文引擎插件拥有用于摄取、组装和压缩的会话上下文编排功能。通过 `api.registerContextEngine(id, factory)` 从你的插件注册它们，然后使用 `plugins.slots.contextEngine` 选择激活的引擎。

当你的插件需要替换或扩展示有的默认上下文管道，而不仅仅是添加内存搜索或钩子时，请使用此功能。

## 控制 UI（schema + 标签）

控制 UI 使用 `config.schema`（JSON Schema + `uiHints`）来呈现更好的表单。

OpenClaw 根据发现的插件在运行时增强 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加针对每个插件的标签
- 在 `plugins.entries.<id>.config.<field>` 下合并可选的插件提供的配置字段提示：

如果你希望插件配置字段显示良好的标签/占位符（并将机密标记为敏感），请在插件清单中与 JSON Schema 一起提供 `uiHints`。

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

`plugins update` 仅适用于在 `plugins.installs` 下跟踪的 npm 安装。如果在更新之间存储的完整性元数据发生变化，OpenClaw 会警告并要求确认（使用全局 `--yes` 绕过提示）。

插件还可以注册自己的顶级命令（例如：`openclaw voicecall`）。

## 插件 API（概览）

插件导出以下任一内容：

- 一个函数：`(api) => { ... }`
- 一个对象：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是插件附加行为的地方。常见的注册包括：

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

插件可以在运行时注册钩子。这允许插件捆绑事件驱动的自动化，而无需单独安装钩子包。

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
- 插件管理的钩子会以 `plugin:<id>` 显示在 `openclaw hooks list` 中。
- 您无法通过 `openclaw hooks` 启用/禁用插件管理的钩子；请改为启用/禁用插件。

### 代理生命周期钩子（`api.on`）

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

- `before_model_resolve`：在会话加载之前运行（`messages` 不可用）。使用它可以确定性地覆盖 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`：在会话加载之后运行（`messages` 可用）。使用它可以塑造提示输入。
- `before_agent_start`：旧版兼容性钩子。优先使用上述两个显式钩子。

核心强制执行的钩子策略：

- 操作员可以通过 `plugins.entries.<id>.hooks.allowPromptInjection: false` 针对每个插件禁用提示变更钩子。
- 当被禁用时，OpenClaw 会阻止 `before_prompt_build` 并忽略从旧版 `before_agent_start` 返回的提示修改字段，同时保留旧版 `modelOverride` 和 `providerOverride`。

`before_prompt_build` 结果字段：

- `prependContext`：将文本前置到本次运行的用户提示词之前。最适用于特定轮次或动态内容。
- `systemPrompt`：完全覆盖系统提示词。
- `prependSystemContext`：将文本前置到当前系统提示词。
- `appendSystemContext`：将文本附加到当前系统提示词。

嵌入运行时中的提示词构建顺序：

1. 将 `prependContext` 应用于用户提示词。
2. 如果提供了 `systemPrompt`，则应用覆盖。
3. 应用 `prependSystemContext + current system prompt + appendSystemContext`。

合并与优先级说明：

- Hook 处理程序按优先级运行（优先级高的先运行）。
- 对于合并的上下文字段，值将按执行顺序连接。
- `before_prompt_build` 值在旧版 `before_agent_start` 后备值之前应用。

迁移指南：

- 将静态引导从 `prependContext` 移至 `prependSystemContext`（或 `appendSystemContext`），以便提供商可以缓存稳定的系统前缀内容。
- 保留 `prependContext` 用于应与用户消息保持关联的每轮动态上下文。

## 提供商插件（模型认证）

插件可以注册 **模型提供商**，以便用户可以在 OAuth 内运行 API 或 OpenClaw 密钥设置，在新手引导/模型选择器中展示提供商设置，并贡献隐式提供商发现。

提供商插件是模型提供商设置的模块化扩展接口。它们不再仅仅是“OAuth 辅助工具”。

### 提供商插件生命周期

提供商插件可以参与五个不同的阶段：

1. **身份验证**
   `auth[].run(ctx)` 执行 OAuth、API 密钥捕获、设备代码或自定义
   设置，并返回身份验证配置文件以及可选的配置补丁。
2. **非交互式设置**
   `auth[].runNonInteractive(ctx)` 处理 `openclaw onboard --non-interactive`
   而无需提示。当提供商需要除内置简单 API 密钥路径之外的自定义无头设置时，请使用此功能。
3. **向导集成**
   `wizard.onboarding` 向 `openclaw onboard` 添加一个条目。
   `wizard.modelPicker` 向模型选择器添加一个设置条目。
4. **隐式发现**
   `discovery.run(ctx)` 可以在模型解析/列出期间自动贡献提供商配置。
5. **选择后跟进**
   `onModelSelected(ctx)` 在选择模型后运行。将此用于提供商
   特定的工作，例如下载本地模型。

这是推荐的拆分方式，因为这些阶段具有不同的生命周期
要求：

- auth 是交互式的，并写入凭证/配置
- 非交互式设置由标志/环境变量驱动，绝不能提示
- 向导元数据是静态的且面向 UI
- 发现应该是安全的、快速的且能容忍故障
- 选择后钩子是与所选模型绑定的副作用

### 提供商身份验证契约

`auth[].run(ctx)` 返回：

- `profiles`：要写入的身份验证配置文件
- `configPatch`：可选的 `openclaw.json` 更改
- `defaultModel`：可选的 `provider/model` 引用
- `notes`：可选的用户说明

核心随后：

1. 写入返回的身份验证配置文件
2. 应用身份验证配置文件配置布线
3. 合并配置补丁
4. 有选择地应用默认模型
5. 在适当时运行提供商的 `onModelSelected` 钩子

这意味着提供商插件拥有特定于提供商的设置逻辑，而核心
拥有通用持久化和配置合并路径。

### 提供商非交互式契约

`auth[].runNonInteractive(ctx)` 是可选的。当提供商需要进行无法通过内置通用 API 密钥流程表达的无头设置时，请实现它。

非交互式上下文包括：

- 当前和基础配置
- 已解析的新手引导 CLI 选项
- 运行时日志记录/错误辅助工具
- 代理/工作区目录
- `resolveApiKey(...)` 用于从标志、环境变量或现有的身份验证配置文件中读取提供商密钥，同时遵守 `--secret-input-mode`
- `toApiKeyCredential(...)` 用于将解析出的密钥转换为具有正确明文与机密引用存储方式的身份验证配置文件凭据

请将此界面用于以下提供商：

- 需要 `--custom-base-url` + `--custom-model-id` 的自托管 OpenAI 兼容运行时
- 特定于提供商的非交互式验证或配置合成

不要从 `runNonInteractive` 进行提示。相反，请使用可操作的错误拒绝缺失的输入。

### 提供商向导元数据

`wizard.onboarding` 控制提供商在分组新手引导中的显示方式：

- `choiceId`：身份验证选择值
- `choiceLabel`：选项标签
- `choiceHint`：简短提示
- `groupId`：分组存储桶 id
- `groupLabel`：分组标签
- `groupHint`：分组提示
- `methodId`：要运行的身份验证方法

`wizard.modelPicker` 控制提供商在模型选择中作为“立即设置”条目的显示方式：

- `label`
- `hint`
- `methodId`

当提供商具有多种身份验证方法时，向导可以指向一个显式方法，也可以让 OpenClaw 合成每种方法的选择。

当插件注册时，OpenClaw 会验证提供商向导元数据：

- 重复或空白的身份验证方法 id 会被拒绝
- 当提供商没有身份验证方法时，将忽略向导元数据
- 无效的 `methodId` 绑定将被降级为警告，并回退到
  提供商剩余的认证方法

### 提供商发现合约

`discovery.run(ctx)` 返回以下内容之一：

- `{ provider }`
- `{ providers }`
- `null`

对于插件拥有单一提供商 ID 的常见情况，请使用 `{ provider }`。
当插件发现多个提供商条目时，请使用 `{ providers }`。

发现上下文包括：

- 当前配置
- 代理/工作区目录
- 进程环境变量
- 用于解析提供商 API 密钥的辅助器以及一个发现安全的 API 密钥值

发现应当是：

- 快速的
- 尽力而为的
- 在失败时可以安全跳过
- 注意副作用

它不应依赖于提示或长时间运行的设置。

### 发现顺序

提供商发现按顺序阶段运行：

- `simple`
- `profile`
- `paired`
- `late`

使用：

- `simple` 用于仅限环境的低成本发现
- 当发现依赖于认证配置文件时，使用 `profile`
- `paired` 用于需要与另一个发现步骤协调的提供商
- `late` 用于高成本或本地网络探测

大多数自托管提供商应使用 `late`。

### 良好的提供商插件边界

适合提供商插件的情况：

- 具有自定义设置流程的本地/自托管提供商
- 提供商特定的 OAuth/设备代码登录
- 本地模型服务器的隐式发现
- 选择后的副作用，例如模型拉取

不太适合的情况：

- 仅通过环境变量、基础 URL 和一个默认模型区分的简单 API 密钥提供商

这些仍然可以成为插件，但主要的模块化收益来自于
先提取行为丰富的提供商。

通过 `api.registerProvider(...)` 注册提供商。每个提供商暴露一个或多个身份验证方法（OAuth、API 密钥、设备代码等）。这些方法可以为以下功能提供支持：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- 模型选择器“自定义提供商”设置条目
- 在模型解析/列表期间隐式发现提供商

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

注：

- `run` 接收一个包含 `prompter`、`runtime`、
  `openUrl` 和 `oauth.createVpsAwareHandlers` 帮助程序的 `ProviderAuthContext`。
- `runNonInteractive` 接收一个包含 `opts`、`resolveApiKey` 和
  `toApiKeyCredential` 帮助程序的 `ProviderAuthMethodNonInteractiveContext`，用于无头新手引导。
- 当您需要添加默认模型或提供商配置时，返回 `configPatch`。
- 返回 `defaultModel` 以便 `--set-default` 可以更新代理默认值。
- `wizard.onboarding` 向 `openclaw onboard` 添加提供商选择。
- `wizard.modelPicker` 向模型选择器添加“设置此提供商”条目。
- `discovery.run` 针对插件自己的提供商 ID 返回 `{ provider }`，
  或针对多提供商发现返回 `{ providers }`。
- `discovery.order` 控制提供商相对于内置发现阶段的运行时机：`simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是用于提供商特定后续工作（例如拉取本地模型）的后选择挂钩。

### 注册消息渠道

插件可以注册行为类似于内置渠道（WhatsApp、Telegram 等）的**渠道插件**。渠道配置位于 `channels.<id>` 下，并
由您的渠道插件代码进行验证。

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

注：

- 将配置放在 `channels.<id>` 下（而不是 `plugins.entries`）。
- `meta.label` 用于 CLI/UI 列表中的标签。
- `meta.aliases` 添加用于规范化和 CLI 输入的备用 ID。
- `meta.preferOver` 列出在两者都配置时跳过自动启用的渠道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 允许 UI 显示更丰富的渠道标签/图标。

### 渠道新手引导钩子

渠道插件可以在 `plugin.onboarding` 上定义可选的新手引导钩子：

- `configure(ctx)` 是基准设置流程。
- `configureInteractive(ctx)` 可以完全拥有已配置和未配置状态的交互式设置。
- `configureWhenConfigured(ctx)` 可以仅覆盖已配置渠道的行为。

向导中的钩子优先级：

1. `configureInteractive`（如果存在）
2. `configureWhenConfigured`（仅当渠道状态已配置时）
3. 回退到 `configure`

上下文详细信息：

- `configureInteractive` 和 `configureWhenConfigured` 接收：
  - `configured`（`true` 或 `false`）
  - `label`（提示使用的面向用户的渠道名称）
  - 加上共享的 config/runtime/prompter/options 字段
- 返回 `"skip"` 保持选择和帐户跟踪不变。
- 返回 `{ cfg, accountId? }` 应用配置更新并记录帐户选择。

### 编写新的消息渠道（分步）

当您想要一个**新的聊天界面**（“消息渠道”）而不是模型提供商时，请使用此选项。
模型提供商文档位于 `/providers/*` 下。

1. 选择一个 ID + 配置形状

- 所有渠道配置都位于 `channels.<id>` 下。
- 对于多帐户设置，首选 `channels.<id>.accounts.<accountId>`。

2. 定义渠道元数据

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 应指向文档页面，如 `/channels/<id>`。
- `meta.preferOver` 允许插件替换另一个渠道（自动启用时优先选择它）。
- `meta.detailLabel` 和 `meta.systemImage` 供 UI 用于详情文本/图标。

3. 实现必需的适配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天类型、媒体、线程等）
- `outbound.deliveryMode` + `outbound.sendText`（用于基本发送）

4. 根据需要添加可选适配器

- `setup`（向导）、`security`（私信策略）、`status`（健康/诊断）
- `gateway`（启动/停止/登录）、`mentions`、`threading`、`streaming`
- `actions`（消息操作）、`commands`（原生命令行为）

5. 在插件中注册渠道

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
然后在配置中配置 `channels.<id>`。

### Agent 工具

请参阅专用指南：[Plugin agent tools](/zh/plugins/agent-tools)。

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
AI agent**。这对于切换命令、状态检查或不需要
LLM 处理的快速操作非常有用。

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

- `senderId`：发送者 ID（如果可用）
- `channel`：发送命令的渠道
- `isAuthorizedSender`: 发送者是否为授权用户
- `args`: 命令后传递的参数（如果 `acceptsArgs: true`）
- `commandBody`: 完整的命令文本
- `config`: 当前的 OpenClaw 配置

命令选项：

- `name`: 命令名称（不带前导 `/`）
- `nativeNames`: 斜杠/菜单界面的可选原生命令别名。对所有原生提供商使用 `default`，或提供商特定的键，如 `discord`
- `description`: 命令列表中显示的帮助文本
- `acceptsArgs`: 命令是否接受参数（默认：false）。如果为 false 且提供了参数，命令将不会匹配，消息将传递给其他处理程序
- `requireAuth`: 是否要求授权发送者（默认：true）
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

注意事项：

- 插件命令在内置命令和 AI 智能体**之前**处理
- 命令是全局注册的，并在所有频道中工作
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

- Gateway 方法：`pluginId.action`（例如：`voicecall.status`）
- 工具：`snake_case`（例如：`voice_call`）
- CLI 命令：使用 kebab-case 或 camelCase，但避免与核心命令冲突

## Skills

插件可以在代码仓库中附带一个 skill (`skills/<name>/SKILL.md`)。
使用 `plugins.entries.<id>.enabled`（或其他配置开关）启用它，并确保
它存在于您的工作区/托管的 skills 位置中。

## 分发 (npm)

推荐的打包方式：

- 主包：`openclaw`（此仓库）
- 插件：位于 `@openclaw/*` 下的独立 npm 包（例如：`@openclaw/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `openclaw.extensions`，其中含有一个或多个入口文件。
- 入口文件可以是 `.js` 或 `.ts`（jiti 会在运行时加载 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，将其提取到 `~/.openclaw/extensions/<id>/`，并在配置中启用它。
- 配置键的稳定性：作用域包在 `plugins.entries.*` 中会被规范化为 **无作用域** 的 id。

## 示例插件：语音通话

此仓库包含一个语音通话插件（Twilio 或日志回退）：

- 源码：`extensions/voice-call`
- Skill：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`、`voicecall.status`
- 配置 (twilio)：`provider: "twilio"` + `twilio.accountSid/authToken/from`（可选 `statusCallbackUrl`、`twimlUrl`）
- 配置 (dev)：`provider: "log"`（无网络）

有关设置和使用，请参阅 [语音通话](/zh/plugins/voice-call) 和 `extensions/voice-call/README.md`。

## 安全说明

插件与 Gateway 在同一进程中运行。请将它们视为可信代码：

- 仅安装您信任的插件。
- 首选 `plugins.allow` 白名单。
- 请记住 `plugins.allow` 是基于 id 的，因此已启用的工作区插件可以
  有意地覆盖具有相同 id 的内置插件。
- 更改后重启 Gateway(网关)。

## 测试插件

插件可以（并且应该）附带测试：

- 仓库内的插件可以将 Vitest 测试保留在 `src/**` 下（例如：`src/plugins/voice-call.plugin.test.ts`）。
- 单独发布的插件应该运行自己的 CI（lint/build/test）并验证 `openclaw.extensions` 指向构建的入口点（`dist/index.js`）。

import zh from '/components/footer/zh.mdx';

<zh />
