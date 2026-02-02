> [!NOTE]
> 本页正在翻译中。

---
summary: "OpenClaw 插件/扩展：发现、配置与安全"
read_when:
  - 添加或修改插件/扩展
  - 记录插件安装或加载规则
---
# 插件（扩展）

## 快速开始（首次使用插件？）

插件只是一个 **小型代码模块**，用于为 OpenClaw 增加额外功能（命令、工具、Gateway RPC）。

多数情况下，当你需要的功能尚未内置到 OpenClaw 核心中（或希望将可选功能与主安装隔离）时，就会使用插件。

快速路径：

1) 查看已加载的插件：

```bash
openclaw plugins list
```

2) 安装官方插件（示例：Voice Call）：

```bash
openclaw plugins install @openclaw/voice-call
```

3) 重启 Gateway，然后在 `plugins.entries.<id>.config` 下配置。

具体示例参见 [Voice Call](/zh/plugins/voice-call)。

## 可用插件（官方）

- Microsoft Teams 自 2026.1.15 起仅支持插件方式；使用 Teams 请安装 `@openclaw/msteams`。
- Memory (Core) — 内置的记忆搜索插件（默认通过 `plugins.slots.memory` 启用）
- Memory (LanceDB) — 内置长期记忆插件（自动召回/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [Voice Call](/zh/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth（provider auth）— 内置为 `google-antigravity-auth`（默认禁用）
- Gemini CLI OAuth（provider auth）— 内置为 `google-gemini-cli-auth`（默认禁用）
- Qwen OAuth（provider auth）— 内置为 `qwen-portal-auth`（默认禁用）
- Copilot Proxy（provider auth）— 本地 VS Code Copilot Proxy 桥接；不同于内置的 `github-copilot` 设备登录（内置，默认禁用）

OpenClaw 插件是通过 jiti 在运行时加载的 **TypeScript 模块**。**配置校验不会执行插件代码**；
它使用插件清单与 JSON Schema。参见 [Plugin manifest](/zh/plugins/manifest)。

插件可以注册：

- Gateway RPC 方法
- Gateway HTTP 处理器
- 代理工具
- CLI 命令
- 后台服务
- 可选的配置校验
- **Skills**（在插件清单中列出 `skills` 目录）
- **自动回复命令**（无需调用 AI 代理即可执行）

插件在 Gateway **进程内**运行，因此应视为可信代码。
工具编写指南：[Plugin agent tools](/zh/plugins/agent-tools)。

## 运行时助手

插件可通过 `api.runtime` 访问部分核心助手。以电话 TTS 为例：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

说明：
- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲区 + 采样率。插件需要为具体提供商做重采样/编码。
- 电话场景不支持 Edge TTS。

## 发现与优先级

OpenClaw 按顺序扫描：

1) 配置路径
- `plugins.load.paths`（文件或目录）

2) 工作区扩展
- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3) 全局扩展
- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4) 内置扩展（随 OpenClaw 发行，**默认禁用**）
- `<openclaw>/extensions/*`

内置插件必须显式启用：`plugins.entries.<id>.enabled` 或 `openclaw plugins enable <id>`。
已安装插件默认启用，也可用同样方式禁用。

每个插件根目录必须包含 `openclaw.plugin.json`。若路径指向单个文件，
插件根目录为该文件所在目录，并且必须包含清单。

如果多个插件解析为相同 id，则按上述顺序的**首个**生效，其余低优先级副本被忽略。

### Package packs

插件目录可以包含带 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

每个 entry 会变成一个插件。如果 pack 列出多个扩展，插件 id
将变为 `name/<fileBase>`。

如果插件引入 npm 依赖，请在该目录安装依赖，保证 `node_modules` 可用（`npm install` / `pnpm install`）。

### 频道目录元数据

频道插件可通过 `openclaw.channel` 宣告 onboarding 元数据，并通过 `openclaw.install`
提供安装提示，从而让核心目录保持无数据。

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

OpenClaw 也可以合并 **外部频道目录**（例如 MPM 注册表导出）。将 JSON 放在：
- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者设置 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（逗号/分号/`PATH` 分隔）。每个文件应包含
`{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 id：

- Package packs：`package.json` 的 `name`
- 独立文件：文件名基名（`~/.../voice-call.ts` → `voice-call`）

如果插件导出 `id`，OpenClaw 会使用它，但当它与配置的 id 不一致时会发出警告。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } }
    }
  }
}
```
