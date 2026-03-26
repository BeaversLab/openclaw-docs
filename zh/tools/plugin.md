---
summary: "OpenClaw 插件/扩展：发现、配置和安全"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
---

# 插件（扩展）

## 快速开始

插件分为以下两种：

- 一个原生的 **OpenClaw 插件**（`openclaw.plugin.json` + 运行时模块），或者
- 一个兼容的 **包**（`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`）

两者都会显示在 `openclaw plugins` 下，但只有原生的 OpenClaw 插件会在进程内
执行运行时代码。

1. 查看已加载的内容：

```bash
openclaw plugins list
```

2. 安装一个官方插件（例如：语音通话）：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 规范仅限于注册表。有关
固定版本、预发布限制和受支持规范格式的详细信息，请参阅[安装规则](/zh/cli/plugins#install)。

3. 重启 Gateway(网关)，然后在 `plugins.entries.<id>.config` 下进行配置。

有关具体插件示例，请参阅 [语音通话](/zh/plugins/voice-call)。
正在寻找第三方列表？请参阅[社区插件](/zh/plugins/community)。
需要包兼容性详细信息？请参阅[插件包](/zh/plugins/bundles)。

对于兼容的包，从本地目录或归档文件安装：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

对于 Claude 市场安装，先列出市场，然后按
市场条目名称进行安装：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 从 `~/.claude/plugins/known_marketplaces.json` 解析已知的 Claude 市场名称。
您也可以使用 `--marketplace` 传递显式的
市场来源。

## 可用插件（官方）

### 可安装的插件

这些发布到了 npm 并使用 `openclaw plugins install` 安装：

| 插件            | 包                     | 文档                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh/channels/nostr)             |
| 语音通话        | `@openclaw/voice-call` | [语音通话](/zh/plugins/voice-call)      |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/zh/plugins/zalouser)   |

截至 2026.1.15，Microsoft Teams 仅作为插件提供。

打包安装还附带按需安装的元数据，用于重量级的官方插件。目前包括 WhatsApp 和 `memory-lancedb`：新手引导（新手引导）、`openclaw channels add`、`openclaw channels login --channel whatsapp` 以及其他渠道设置流程会在首次使用时提示安装它们，而不是将其完整的运行时树包含在主要的 WhatsApp tarball 中。

### 捆绑插件

这些插件随 OpenClaw 一起提供，并且除非另有说明，否则默认启用。

**Memory：**

- `memory-core` -- 捆绑的内存搜索（默认通过 `plugins.slots.memory`）
- `memory-lancedb` -- 按需安装的长期记忆，具有自动召回/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）

**模型提供商**（均默认启用）：

`anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`, `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`, `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`, `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`, `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`

**语音提供商**（默认启用）：

`elevenlabs`, `microsoft`

**其他捆绑插件：**

- `copilot-proxy` -- VS Code Copilot Proxy 代理（默认禁用）

## 兼容的插件包

OpenClaw 还能识别兼容的外部插件包布局：

- Codex 风格的插件包：`.codex-plugin/plugin.json`
- Claude 风格的插件包：`.claude-plugin/plugin.json` 或没有清单文件的默认 Claude
  组件布局
- Cursor 风格的插件包：`.cursor-plugin/plugin.json`

它们在插件列表中显示为 `format=bundle`，其子类型为
`codex`、`claude` 或 `cursor`（在详细/检查输出中）。

有关确切的检测规则、映射行为和当前支持矩阵，请参阅 [Plugin bundles](/zh/plugins/bundles)。

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

配置更改**需要重启网关**。有关完整的配置架构，请参阅
[Configuration reference](/zh/configuration)。

验证规则（严格）：

- 在 `entries`、`allow`、`deny` 或 `slots` 中出现的未知插件 ID 为**错误**。
- 未知的 `channels.<id>` 键为**错误**，除非插件清单声明了
  渠道 ID。
- 使用嵌入在 `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 验证
  原生插件配置。
- 兼容的捆绑包目前不公开原生 OpenClaw 配置架构。
- 如果插件被禁用，其配置将被保留，并发出**警告**。

### 已禁用 vs 缺失 vs 无效

这些状态是有意区分的：

- **已禁用**：插件存在，但启用规则将其关闭
- **缺失**：配置引用了设备发现未找到的插件 ID
- **无效**：插件存在，但其配置与声明的架构不匹配

OpenClaw 保留已禁用插件的配置，因此重新启用它们不会
造成破坏。

## 设备发现与优先级

OpenClaw 按顺序扫描：

1. 配置路径

- `plugins.load.paths`（文件或目录）

2. 工作区扩展

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全局扩展

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 捆绑扩展（随 OpenClaw 一起提供；混合了默认开启/默认关闭）

- 打包安装中的 `<openclaw>/dist/extensions/*`
- 本地构建检出中的 `<workspace>/dist-runtime/extensions/*`
- 源码/Vitest 工作流中的 `<workspace>/extensions/*`

许多捆绑的提供商插件默认处于启用状态，以便模型目录/运行时钩子无需额外设置即可保持可用。其他插件仍需通过 `plugins.entries.<id>.enabled` 或
`openclaw plugins enable <id>` 显式启用。

捆绑插件运行时依赖项由每个插件包拥有。打包构建将已选择加入的捆绑依赖项放置在 `dist/extensions/<id>/node_modules` 下，而不是在根包中要求镜像副本。非常大的官方插件可以作为仅元数据的捆绑条目提供，并按需安装其运行时包。npm 制品提供构建好的 `dist/extensions/*` 树；源码 `extensions/*` 目录仅保留在源码检出中。

已安装的插件默认处于启用状态，但可以用相同的方式禁用。

工作区插件**默认处于禁用状态**，除非您显式启用它们或将它们列入允许列表。这是有意为之：检出的代码库不应静默成为生产网关代码。

如果多个插件解析为同一个 id，则上述顺序中的第一个匹配项获胜，并忽略优先级较低的副本。

### 启用规则

启用在发现之后解析：

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 始终获胜
- `plugins.entries.<id>.enabled: false` 禁用该插件
- 工作区来源的插件默认处于禁用状态
- 当 `plugins.allow` 非空时，允许列表会限制活动集
- 允许列表是**基于 id 的**，而不是基于来源的
- 捆绑插件默认处于禁用状态，除非：
  - 捆绑的 id 处于内置默认开启集合中，或
  - 您显式启用了它，或
  - 渠道配置隐式启用了捆绑的渠道插件
- 排他性插槽可以强制启用该插槽的选定插件

## 插件插槽（排他性类别）

某些插件类别是**排他性**的（一次只能有一个处于活动状态）。使用
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

支持的排他性插槽：

- `memory`：活动内存插件（`"none"` 禁用内存插件）
- `contextEngine`：活动上下文引擎插件（`"legacy"` 是内置默认值）

如果多个插件声明 `kind: "memory"` 或 `kind: "context-engine"`，则只有
选定的插件会为该插槽加载。其他插件将被禁用并生成诊断信息。
在您的[插件清单](/zh/plugins/manifest)中声明 `kind`。

## 插件 ID

默认插件 ID：

- 软件包打包：`package.json` `name`
- 独立文件：文件基本名称（`~/.../voice-call.ts` -> `voice-call`）

如果插件导出 `id`，OpenClaw 会使用它，但在其与配置的 ID 不匹配时会发出警告。

## 检查

```bash
openclaw plugins inspect openai        # deep detail on one plugin
openclaw plugins inspect openai --json # machine-readable
openclaw plugins list                  # compact inventory
openclaw plugins status                # operational summary
openclaw plugins doctor                # issue-focused diagnostics
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

有关每个命令的完整详细信息（安装规则、检查输出、市场安装、卸载），请参阅 [`openclaw plugins` CLI 参考](/zh/cli/plugins)。

插件还可以注册自己的顶级命令（例如：
`openclaw voicecall`）。

## 插件 API（概览）

插件导出以下任一内容：

- 一个函数：`(api) => { ... }`
- 一个对象：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是插件附加行为的地方。常见的注册包括：

- `registerTool`
- `registerHook`
- `on(...)` 用于类型化生命周期钩子
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

有关清单文件格式，请参阅 [插件清单](/zh/plugins/manifest)。

## 延伸阅读

- [插件架构和内部机制](/zh/plugins/architecture) -- 能力模型、
  所有权模型、合约、加载管道、运行时助手和开发者 API
  参考
- [构建扩展](/zh/plugins/building-extensions)
- [插件包](/zh/plugins/bundles)
- [插件清单](/zh/plugins/manifest)
- [插件代理工具](/zh/plugins/agent-tools)
- [功能手册](/zh/tools/capability-cookbook)
- [社区插件](/zh/plugins/community)

import zh from "/components/footer/zh.mdx";

<zh />
