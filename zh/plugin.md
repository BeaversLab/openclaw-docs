---
summary: "OpenClaw 插件/扩展：发现、配置与安全性"
read_when:
  - 添加或修改插件/扩展
  - 记录插件安装或加载规则
title: "插件"
---

# 插件（扩展）

## 快速开始（插件新手？）

插件只是一个**小型代码模块**，它通过额外功能（命令、工具和 Gateway RPC）来扩展 OpenClaw。

大多数情况下，当你想要 OpenClaw 核心尚未内置的功能（或者你想将可选功能排除在主安装之外）时，就会使用插件。

快速路径：

1. 查看已加载的内容：

```bash
openclaw plugins list
```

2. 安装官方插件（例如：语音通话）：

```bash
openclaw plugins install @openclaw/voice-call
```

3. 重启 Gateway(网关)，然后在 `plugins.entries.<id>.config` 下进行配置。

有关具体的插件示例，请参阅 [语音通话](/zh/plugins/voice-call)。

## 可用插件（官方）

- Microsoft Teams 自 2026.1.15 起仅作为插件提供；如果你使用 Teams，请安装 `@openclaw/msteams`。
- Memory (Core) — 捆绑的内存搜索插件（通过 `plugins.slots.memory` 默认启用）
- Memory (LanceDB) — 捆绑的长期记忆插件（自动回忆/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [语音通话](/zh/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo 个人版](/zh/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth（提供商认证） — 捆绑为 `google-antigravity-auth`（默认禁用）
- Gemini CLI OAuth（提供商认证） — 捆绑为 `google-gemini-cli-auth`（默认禁用）
- Qwen OAuth（提供商认证） — 捆绑为 `qwen-portal-auth`（默认禁用）
- Copilot Proxy（提供商认证） — 本地 VS Code Copilot Proxy 网桥；与内置的 `github-copilot` 设备登录不同（捆绑，默认禁用）

OpenClaw 插件是通过 jiti 在运行时加载的 **TypeScript 模块**。**配置验证不会执行插件代码**；它使用插件清单和 JSON Schema 来代替。请参阅 [插件清单](/zh/plugins/manifest)。

插件可以注册：

- Gateway(网关) RPC 方法
- Gateway(网关) HTTP 处理程序
- Agent 工具
- CLI 命令
- 后台服务
- 可选配置验证
- **Skills**（通过在插件清单中列出 `skills` 目录）
- **自动回复命令**（执行而不调用 AI agent）

插件与 Gateway(网关) **在进程中 (in‑process)** 运行，因此请将它们视为受信任的代码。工具编写指南：[插件 agent 工具](/zh/plugins/agent-tools)。

## 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于电话 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

说明：

- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲区 + 采样率。插件必须为提供商重新采样/编码。
- Edge TTS 不支持电话。

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

4. 捆绑扩展（随 OpenClaw 附带，**默认禁用**）

- `<openclaw>/extensions/*`

捆绑插件必须通过 `plugins.entries.<id>.enabled` 或 `openclaw plugins enable <id>` 显式启用。已安装的插件默认启用，但也可以通过相同方式禁用。

每个插件必须在其根目录中包含一个 `openclaw.plugin.json` 文件。如果路径指向文件，则插件根目录是该文件的目录，并且必须包含清单。

如果多个插件解析为相同的 ID，则上述顺序中的第一个匹配项获胜，并忽略优先级较低的副本。

### 软件包

插件目录可以包含带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

每个条目成为一个插件。如果软件包列出了多个扩展，插件 ID 将变为 `name/<fileBase>`。

如果您的插件导入了 npm 依赖项，请在该目录中安装它们，以便
`node_modules` 可用（`npm install` / `pnpm install`）。

### 渠道目录元数据

渠道插件可以通过 `openclaw.channel` 宣传 OpenClaw 元数据，并通过
`openclaw.install` 提供安装提示。这使核心目录不包含数据。

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

OpenClaw 还可以合并**外部渠道目录**（例如，MPM
注册表导出）。将 JSON 文件放置在以下位置之一：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者将 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向
一个或多个 JSON 文件（以逗号/分号/`PATH` 分隔）。每个文件应
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 ID：

- 包打包： `package.json` `name`
- 独立文件：文件基本名称（`~/.../voice-call.ts` → `voice-call`）

如果插件导出 `id`，OpenClaw 会使用它，但在它与
配置的 ID 不匹配时发出警告。

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

- `enabled`：主开关（默认值：true）
- `allow`：允许列表（可选）
- `deny`：拒绝列表（可选；拒绝优先）
- `load.paths`：额外的插件文件/目录
- `entries.<id>`：每个插件的开关 + 配置

配置更改**需要重启网关**。

验证规则（严格）：

- `entries`、`allow`、`deny` 或 `slots` 中未知的插件 ID 是**错误**。
- 未知的 `channels.<id>` 键是**错误**，除非插件清单声明了
  渠道 ID。
- 使用嵌入在
  `openclaw.plugin.json`（`configSchema`）中的 JSON Schema 验证插件配置。
- 如果插件被禁用，其配置将被保留，并发出**警告**。

## 插件插槽（互斥类别）

某些插件类别是**排他的**（一次只能激活一个）。使用
`plugins.slots` 来选择哪个插件拥有该插槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
    },
  },
}
```

如果多个插件声明了 `kind: "memory"`，则仅加载选中的那个。其他
插件将被禁用并输出诊断信息。

## 控制 UI（架构 + 标签）

控制 UI 使用 `config.schema`（JSON 架构 + `uiHints`）来渲染更好的表单。

OpenClaw 在运行时根据发现的插件增强 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加每个插件的标签
- 在以下位置合并可选的插件提供的配置字段提示：
  `plugins.entries.<id>.config.<field>`

如果您希望插件配置字段显示良好的标签/占位符（并将机密标记为敏感），
请在插件清单中随 JSON 架构一起提供 `uiHints`。

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
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` 仅适用于在 `plugins.installs` 下跟踪的 npm 安装。

插件也可以注册自己的顶级命令（例如：`openclaw voicecall`）。

## 插件 API（概述）

插件导出以下任一内容：

- 一个函数：`(api) => { ... }`
- 一个对象：`{ id, name, configSchema, register(api) { ... } }`

## 插件挂钩

插件可以附带挂钩并在运行时注册它们。这允许插件捆绑
事件驱动的自动化，而无需单独安装挂钩包。

### 示例

```
import { registerPluginHooksFromDir } from "openclaw/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

注：

- 挂钩目录遵循正常的挂钩结构（`HOOK.md` + `handler.ts`）。
- 挂钩资格规则仍然适用（操作系统/二进制文件/环境/配置要求）。
- 插件管理的挂钩会显示在 `openclaw hooks list` 中，并带有 `plugin:<id>`。
- 您无法通过 `openclaw hooks` 启用/禁用插件管理的挂钩；请改为启用/禁用插件。

## 提供商插件（模型身份验证）

插件可以注册**模型提供商身份验证**流程，以便用户可以在 OAuth 内运行 API 或
OpenClaw 密钥设置（无需外部脚本）。

通过 `api.registerProvider(...)` 注册提供商。每个提供商公开一个
或多个身份验证方法（OAuth、API 密钥、设备代码等）。这些方法支持：

- `openclaw models auth login --provider <id> [--method <id>]`

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
});
```

注：

- `run` 接收一个带有 `prompter`、`runtime`、
  `openUrl` 和 `oauth.createVpsAwareHandlers` 助手的 `ProviderAuthContext`。
- 当您需要添加默认模型或提供商配置时，返回 `configPatch`。
- 返回 `defaultModel`，以便 `--set-default` 可以更新代理默认值。

### 注册消息渠道

插件可以注册表现得像内置渠道（WhatsApp、Telegram 等）的**渠道插件**。渠道配置位于 `channels.<id>` 下，并由您的渠道插件代码进行验证。

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

- 将配置放在 `channels.<id>` 下（而不是 `plugins.entries`）。
- `meta.label` 用于 CLI/UI 列表中的标签。
- `meta.aliases` 添加用于规范化处理和 CLI 输入的备用 ID。
- `meta.preferOver` 列出了在两者都配置完毕时需要跳过自动启用的渠道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 让 UI 能够显示更丰富的渠道标签/图标。

### 编写新的消息渠道（分步指南）

当您想要一个**新的聊天界面**（一个“消息渠道”）而不是模型提供商时，请使用此选项。
模型提供商文档位于 `/providers/*` 下。

1. 选择 ID + 配置结构

- 所有渠道配置都位于 `channels.<id>` 下。
- 对于多账户设置，首选 `channels.<id>.accounts.<accountId>`。

2. 定义渠道元数据

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 应指向一个类似于 `/channels/<id>` 的文档页面。
- `meta.preferOver` 允许插件替换另一个渠道（自动启用优先选择它）。
- `meta.detailLabel` 和 `meta.systemImage` 被 UI 用于显示详情文本/图标。

3. 实现所需的适配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities`（聊天类型、媒体、线程等）
- `outbound.deliveryMode` + `outbound.sendText` (用于基本发送)

4. 根据需要添加可选适配器

- `setup` (向导)、`security` (私信策略)、`status` (健康/诊断)
- `gateway` (启动/停止/登录)、`mentions`、`threading`、`streaming`
- `actions` (消息操作)、`commands` (原生命令行为)

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

插件可以注册自定义斜杠命令，这些命令在执行时**无需调用 AI 代理**。这对于切换命令、状态检查或不需要 LLM 处理的快速操作非常有用。

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

- `senderId`：发送者的 ID（如果可用）
- `channel`：发送命令的渠道
- `isAuthorizedSender`：发送者是否为授权用户
- `args`：命令后传递的参数（如果 `acceptsArgs: true`）
- `commandBody`：完整的命令文本
- `config`：当前的 OpenClaw 配置

命令选项：

- `name`：命令名称（不带前导 `/`）
- `description`：在命令列表中显示的帮助文本
- `acceptsArgs`：命令是否接受参数（默认：false）。如果为 false 且提供了参数，则命令不会匹配，消息将传递给其他处理程序
- `requireAuth`：是否要求授权的发送者（默认：true）
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

注意事项：

- 插件命令在内置命令和 AI 代理**之前**处理
- 命令是全局注册的，并在所有频道中工作
- 命令名称不区分大小写（`/MyStatus` 匹配 `/mystatus`）
- 命令名称必须以字母开头，且仅包含字母、数字、连字符和下划线
- 保留的命令名称（如 `help`、`status`、`reset` 等）不能被插件覆盖
- 跨插件重复注册命令将会失败，并返回诊断错误

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
- CLI 命令：kebab 或 camel，但避免与核心命令冲突

## Skills

插件可以在代码仓库中包含一个技能 (`skills/<name>/SKILL.md`)。
使用 `plugins.entries.<id>.enabled`（或其他配置开关）启用它，并确保
它位于您的工作区/托管技能位置中。

## 分发 (npm)

推荐的打包方式：

- 主包：`openclaw`（此代码仓库）
- 插件：在 `@openclaw/*` 下的独立 npm 包（示例：`@openclaw/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `openclaw.extensions`，其中包含一个或多个入口文件。
- 入口文件可以是 `.js` 或 `.ts`（jiti 在运行时加载 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，解压到 `~/.openclaw/extensions/<id>/` 中，并在配置中启用它。
- 配置键稳定性：作用域包对于 `plugins.entries.*` 被规范化为 **无作用域** 的 id。

## 示例插件：语音通话

此仓库包含一个语音通话插件（Twilio 或日志回退）：

- 源码：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI: `openclaw voicecall start|status`
- 工具: `voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- 配置 (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (可选 `statusCallbackUrl`, `twimlUrl`)
- 配置 (开发环境): `provider: "log"` (无网络)

参阅 [Voice Call](/zh/plugins/voice-call) 和 `extensions/voice-call/README.md` 了解设置和用法。

## 安全注意事项

插件在 Gateway 进程内运行。请将其视为受信任的代码：

- 仅安装您信任的插件。
- 首选 `plugins.allow` 允许列表。
- 更改后重启 Gateway。

## 测试插件

插件可以（且应该）附带测试：

- 仓库内的插件可以将 Vitest 测试保留在 `src/**` 下（例如：`src/plugins/voice-call.plugin.test.ts`）。
- 单独发布的插件应运行自己的 CI（检查/构建/测试），并验证 `openclaw.extensions` 指向构建的入口点（`dist/index.js`）。

import en from "/components/footer/en.mdx";

<en />
