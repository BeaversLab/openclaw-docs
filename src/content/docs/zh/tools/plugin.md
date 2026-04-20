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
  <Step title="See what is loaded">
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

  <Step title="重启 Gateway(网关)">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>
</Steps>

如果您更喜欢聊天原生控制，请启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安装路径使用与 CLI 相同的解析器：本地路径/归档、显式 `clawhub:<pkg>` 或裸包规范（首先是 ClawHub，然后是 npm 回退）。

如果配置无效，安装通常会失败并指向 `openclaw doctor --fix`。唯一的恢复例外是针对选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的一条狭窄的捆绑插件重新安装路径。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式                 | 工作原理                                             | 示例                                                   |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **Native（原生）**   | `openclaw.plugin.json` + 运行时模块；在进程中执行    | 官方插件、社区 npm 包                                  |
| **Bundle（捆绑包）** | Codex/Claude/Cursor 兼容的布局；映射到 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

两者都显示在 `openclaw plugins list` 下。有关捆绑包的详细信息，请参阅 [插件捆绑包](/zh/plugins/bundles)。

如果您正在编写原生插件，请从 [构建插件](/zh/plugins/building-plugins)
和 [插件 SDK 概述](/zh/plugins/sdk-overview) 开始。

## 官方插件

### 可安装 (npm)

| 插件            | 包                     | 文档                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh/channels/nostr)             |
| 语音通话        | `@openclaw/voice-call` | [语音通话](/zh/plugins/voice-call)      |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh/channels/zalo)               |
| Zalo 个人版     | `@openclaw/zalouser`   | [Zalo 个人版](/zh/plugins/zalouser)     |

### 核心 (随 OpenClaw 提供)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Memory plugins">- `memory-core` — 捆绑的记忆搜索（默认通过 `plugins.slots.memory`） - `memory-lancedb` — 按需安装的长期记忆，具有自动召回/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="Speech providers (enabled by default)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Other">
    - `browser` — 适用于浏览器工具、`openclaw browser` CLI、`browser.request` 网关方法、浏览器运行时和默认浏览器控制服务的捆绑浏览器插件（默认启用；替换前请禁用）
    - `copilot-proxy` — VS Code Copilot 代理桥（默认禁用）
  </Accordion>
</AccordionGroup>

寻找第三方插件？请参阅 [社区插件](/zh/plugins/community)。

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
| `slots`          | 独占槽位选择器（例如 `memory`, `contextEngine`） |
| `entries.\<id\>` | 各插件开关 + 配置                                |

配置更改**需要重启网关**。如果 Gateway(网关) 运行时启用了配置监视 + 进程内重启（默认 `openclaw gateway` 路径），则通常会在配置写入后片刻自动执行重启。

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled**: 插件存在但启用规则将其关闭。配置被保留。 - **Missing**: 配置引用了一个发现机制未找到的插件 ID。 - **Invalid**: 插件存在但其配置与声明的架构不匹配。</Accordion>

## 发现与优先级

OpenClaw 按以下顺序扫描插件（优先匹配先找到的）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 明确的文件或目录路径。
  </Step>

  <Step title="工作区扩展">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局扩展">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="捆绑插件">
    随 OpenClaw 一起提供。许多插件默认启用（模型提供商、语音）。
    其他插件需要显式启用。
  </Step>
</Steps>

### 启用规则

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 始终覆盖 allow
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件**默认禁用**（必须显式启用）
- 捆绑插件遵循内置的默认开启集，除非被覆盖
- 独占槽位可以为该槽位强制启用选定的插件

## 插件槽位（独占类别）

某些类别是独占的（一次只能有一个活动）：

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

| 槽位            | 控制对象       | 默认值           |
| --------------- | -------------- | ---------------- |
| `memory`        | 活动内存插件   | `memory-core`    |
| `contextEngine` | 活动上下文引擎 | `legacy`（内置） |

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

捆绑插件随 OpenClaw 一起提供。许多插件默认启用（例如
捆绑的模型提供商、捆绑的语音提供商以及捆绑的浏览器
插件）。其他捆绑插件仍需要 `openclaw plugins enable <id>`。

`--force` 就地覆盖现有的已安装插件或挂钩包。
不支持 `--link`，后者会重用源路径，而不是
复制到托管安装目标。

`--pin` 仅限 npm。不支持 `--marketplace`，因为
marketplace 安装会保留 marketplace 源元数据，而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的紧急覆盖选项。它允许插件安装和更新在出现内置 `critical` 发现结果时继续进行，但它仍然不能绕过插件 `before_install` 策略阻止或扫描失败阻止。

此 CLI 标志仅适用于插件安装/更新流程。由 Gateway(网关) 支持的技能依赖项安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍是独立的 ClawHub 技能下载/安装流程。

兼容的捆绑包参与相同的插件列表/检查/启用/禁用流程。当前的运行时支持包括捆绑包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex 挂钩目录。

`openclaw plugins inspect <id>` 还报告检测到的捆绑包功能，以及针对支持捆绑包的插件的受支持或不受支持的 MCP 和 LSP 服务器条目。

Marketplace 源可以是 `~/.claude/plugins/known_marketplaces.json` 中的 Claude 已知市场名称、本地市场根目录或 `marketplace.json` 路径、类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。对于远程市场，插件条目必须保留在克隆的市场仓库内，并且仅使用相对路径源。

有关完整详细信息，请参阅 [`openclaw plugins` CLI 参考](/zh/cli/plugins)。

## 插件 API 概述

原生插件导出一个暴露 `register(api)` 的入口对象。较旧的插件可能仍将 `activate(api)` 用作旧版别名，但新插件应使用 `register`。

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

OpenClaw 加载入口对象并在插件激活期间调用 `register(api)`。对于较旧的插件，加载器仍会回退到 `activate(api)`，但捆绑包插件和新的外部插件应将 `register` 视为公共合约。

常用注册方法：

| 方法                                    | 注册内容            |
| --------------------------------------- | ------------------- |
| `registerProvider`                      | 模型提供商 (LLM)    |
| `registerChannel`                       | 聊天渠道            |
| `registerTool`                          | 代理工具            |
| `registerHook` / `on(...)`              | 生命周期钩子        |
| `registerSpeechProvider`                | 文本转语音 / STT    |
| `registerRealtimeTranscriptionProvider` | 流式 STT            |
| `registerRealtimeVoiceProvider`         | 双工实时语音        |
| `registerMediaUnderstandingProvider`    | 图像/音频分析       |
| `registerImageGenerationProvider`       | 图像生成            |
| `registerMusicGenerationProvider`       | 音乐生成            |
| `registerVideoGenerationProvider`       | 视频生成            |
| `registerWebFetchProvider`              | 网页抓取/爬取提供商 |
| `registerWebSearchProvider`             | 网络搜索            |
| `registerHttpRoute`                     | HTTP 端点           |
| `registerCommand` / `registerCli`       | CLI 命令            |
| `registerContextEngine`                 | 上下文引擎          |
| `registerService`                       | 后台服务            |

类型化生命周期钩子的 Hook 守卫行为：

- `before_tool_call`: `{ block: true }` 是终端操作；跳过低优先级处理程序。
- `before_tool_call`: `{ block: false }` 是无操作，不会清除先前的阻止。
- `before_install`: `{ block: true }` 是终端操作；跳过低优先级处理程序。
- `before_install`: `{ block: false }` 是无操作，不会清除先前的阻止。
- `message_sending`: `{ cancel: true }` 是终端操作；跳过低优先级处理程序。
- `message_sending`: `{ cancel: false }` 是无操作，不会清除先前的取消。

有关完整的类型化 Hook 行为，请参阅 [SDK 概述](/zh/plugins/sdk-overview#hook-decision-semantics)。

## 相关

- [构建插件](/zh/plugins/building-plugins) — 创建您自己的插件
- [插件包](/zh/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/zh/plugins/manifest) — 清单架构
- [注册工具](/zh/plugins/building-plugins#registering-agent-tools) — 在插件中添加代理工具
- [Plugin Internals](/zh/plugins/architecture) — 能力模型和加载管道
- [Community Plugins](/zh/plugins/community) — 第三方列表
