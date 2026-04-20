---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
sidebarTitle: "安装和配置"
---

# 插件

插件通过新功能扩展 OpenClaw：频道、模型提供商、工具、技能、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网页获取、网页搜索等。一些插件是 **核心** 插件（随 OpenClaw 一起提供），另一些是 **外部** 插件（由社区发布到 npm）。

## 快速开始

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重启 Gateway">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>
</Steps>

如果您更偏好聊天原生控制，请启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安装路径使用与 CLI 相同的解析器：本地路径/归档、显式
`clawhub:<pkg>`，或裸包规范（优先 ClawHub，然后是 npm 回退）。

如果配置无效，安装通常会失败并关闭，并指向您
`openclaw doctor --fix`。唯一的恢复例外是针对选择加入
`openclaw.install.allowInvalidConfigRecovery` 的插件的狭窄捆绑插件重新安装路径。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作原理                                           | 示例                                                   |
| ---------- | -------------------------------------------------- | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 运行时模块；在进程中执行  | 官方插件，社区 npm 包                                  |
| **Bundle** | Codex/Claude/Cursor 兼容布局；映射到 OpenClaw 功能 | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

两者都显示在 `openclaw plugins list` 下。有关 bundle 的详细信息，请参阅 [Plugin Bundles](/zh/plugins/bundles)。

如果您正在编写原生插件，请从 [Building Plugins](/zh/plugins/building-plugins)
和 [Plugin SDK Overview](/zh/plugins/sdk-overview) 开始。

## 官方插件

### 可安装

| 插件            | 包                     | 文档                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh/channels/nostr)             |
| 语音通话        | `@openclaw/voice-call` | [Voice Call](/zh/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh/channels/zalo)               |
| Zalo 个人版     | `@openclaw/zalouser`   | [Zalo Personal](/zh/plugins/zalouser)   |

### 核心（随 OpenClaw 一起提供）

<AccordionGroup>
  <Accordion title="模型提供商（默认启用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="记忆插件">- `memory-core` — 捆绑的内存搜索（默认通过 `plugins.slots.memory`） - `memory-lancedb` — 按需安装的长期记忆，具有自动回忆/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="语音提供商（默认启用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` — 面向浏览器工具的捆绑浏览器插件，`openclaw browser` CLI，`browser.request` 网关方法、浏览器运行时以及默认的浏览器控制服务（默认启用；替换前请禁用）
    - `copilot-proxy` — VS Code Copilot 代理桥接（默认禁用）
  </Accordion>
</AccordionGroup>

正在寻找第三方插件？请参阅 [社区插件](/zh/plugins/community)。

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

| 字段             | 描述                                             |
| ---------------- | ------------------------------------------------ |
| `enabled`        | 主开关（默认：`true`）                           |
| `allow`          | 插件允许列表（可选）                             |
| `deny`           | 插件拒绝列表（可选；拒绝优先）                   |
| `load.paths`     | 额外的插件文件/目录                              |
| `slots`          | 独占槽位选择器（例如 `memory`，`contextEngine`） |
| `entries.\<id\>` | 各插件开关 + 配置                                |

配置更改**需要重启网关**。如果 Gateway(网关) 正在运行配置监视 + 进程内重启（默认 `openclaw gateway` 路径），该重启通常会在配置写入完成后自动进行。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">- **Disabled（已禁用）**：插件存在，但启用规则将其关闭。配置被保留。 - **Missing（缺失）**：配置引用了设备发现未找到的插件 ID。 - **Invalid（无效）**：插件存在，但其配置与声明的架构不匹配。</Accordion>

## 设备发现与优先级

OpenClaw 按以下顺序扫描插件（第一个匹配项获胜）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 显式的文件或目录路径。
  </Step>

  <Step title="工作区扩展">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局扩展">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="打包插件">
    随 OpenClaw 一起提供。许多插件默认启用（模型提供商、语音）。
    其他插件需要显式启用。
  </Step>
</Steps>

### 启用规则

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 始终优先于允许列表
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件**默认处于禁用状态**（必须显式启用）
- 打包插件遵循内置的默认启用集，除非被覆盖
- 独占插槽可以强制启用该插槽的选定插件

## 插件插槽（独占类别）

某些类别是独占的（一次只能有一个处于活动状态）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| 插槽            | 控制内容       | 默认            |
| --------------- | -------------- | --------------- |
| `memory`        | 活动内存插件   | `memory-core`   |
| `contextEngine` | 活动上下文引擎 | `legacy` (内置) |

## CLI 参考

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only loaded plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id>             # update one plugin
openclaw plugins update <id> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

捆绑插件随 OpenClaw 一起提供。许多插件默认处于启用状态（例如
捆绑模型提供商、捆绑语音提供商和捆绑浏览器
插件）。其他捆绑插件仍需要 `openclaw plugins enable <id>`。

`--force` 会就地覆盖现有的已安装插件或挂钩包。
它不支持 `--link`，后者会重用源路径，而不是
复制到受管的安装目标。

`--pin` 仅限 npm。它不支持 `--marketplace`，因为
市场安装会保留市场源元数据，而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器
误报的应急覆盖选项。它允许插件安装
和插件更新继续进行，忽略内置 `critical` 发现，但它仍然
不会绕过插件 `before_install` 策略阻止或扫描失败阻止。

此 CLI 标志仅适用于插件安装/更新流程。Gateway(网关) 支持的技能
依赖项安装改为使用匹配的 `dangerouslyForceUnsafeInstall` 请求
覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub
技能下载/安装流程。

兼容的捆绑包参与相同的插件列表/检查/启用/禁用
流程。当前的运行时支持包括捆绑包技能、Claude 命令技能、
Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的
`lspServers` 默认值、Cursor 命令技能以及兼容的 Codex 挂钩
目录。

`openclaw plugins inspect <id>` 还会报告检测到的捆绑包功能，以及
捆绑插件支持或不支持的 MCP 和 LSP 服务器条目。

Marketplace sources can be a Claude known-marketplace name from
`~/.claude/plugins/known_marketplaces.json`, a local marketplace root or
`marketplace.json` path, a GitHub shorthand like `owner/repo`, a GitHub repo
URL, or a git URL. For remote marketplaces, plugin entries must stay inside the
cloned marketplace repo and use relative path sources only.

See [`openclaw plugins` CLI reference](/zh/cli/plugins) for full details.

## 插件 API 概览

Native plugins export an entry object that exposes `register(api)`. Older
plugins may still use `activate(api)` as a legacy alias, but new plugins should
use `register`.

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw loads the entry object and calls `register(api)` during plugin
activation. The loader still falls back to `activate(api)` for older plugins,
but bundled plugins and new external plugins should treat `register` as the
public contract.

常用注册方法：

| 方法                                    | 注册内容                  |
| --------------------------------------- | ------------------------- |
| `registerProvider`                      | Model 提供商 (LLM)        |
| `registerChannel`                       | Chat 渠道                 |
| `registerTool`                          | Agent 工具                |
| `registerHook` / `on(...)`              | 生命周期钩子              |
| `registerSpeechProvider`                | Text-to-speech / STT      |
| `registerRealtimeTranscriptionProvider` | Streaming STT             |
| `registerRealtimeVoiceProvider`         | Duplex realtime voice     |
| `registerMediaUnderstandingProvider`    | Image/audio analysis      |
| `registerImageGenerationProvider`       | Image generation          |
| `registerMusicGenerationProvider`       | Music generation          |
| `registerVideoGenerationProvider`       | Video generation          |
| `registerWebFetchProvider`              | Web fetch / scrape 提供商 |
| `registerWebSearchProvider`             | Web search                |
| `registerHttpRoute`                     | HTTP endpoint             |
| `registerCommand` / `registerCli`       | CLI commands              |
| `registerContextEngine`                 | Context engine            |
| `registerService`                       | Background service        |

Hook guard behavior for typed lifecycle hooks:

- `before_tool_call`: `{ block: true }` is terminal; lower-priority handlers are skipped.
- `before_tool_call`： `{ block: false }` 是空操作，不会清除之前的块。
- `before_install`： `{ block: true }` 是终止性的；较低优先级的处理程序将被跳过。
- `before_install`： `{ block: false }` 是空操作，不会清除之前的块。
- `message_sending`： `{ cancel: true }` 是终止性的；较低优先级的处理程序将被跳过。
- `message_sending`： `{ cancel: false }` 是空操作，不会清除之前的取消操作。

有关完整的类型化 hook 行为，请参阅 [SDK Overview](/zh/plugins/sdk-overview#hook-decision-semantics)。

## 相关

- [构建插件](/zh/plugins/building-plugins) — 创建您自己的插件
- [插件包](/zh/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/zh/plugins/manifest) — 清单架构
- [注册工具](/zh/plugins/building-plugins#registering-agent-tools) — 在插件中添加 agent 工具
- [插件内部原理](/zh/plugins/architecture) — 能力模型和加载管道
- [社区插件](/zh/plugins/community) — 第三方列表
