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

打包的 OpenClaw 安装不会主动安装每个捆绑插件的运行时依赖树。当通过插件配置、遗留渠道配置或默认启用的清单激活捆绑的 OpenClaw 拥有的插件时，启动过程仅会在导入该插件之前修复其声明的运行时依赖项。外部插件和自定义加载路径仍必须通过 `openclaw plugins install` 安装。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作原理                                             | 示例                                                   |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 运行时模块；在进程内执行    | 官方插件，社区 npm 包                                  |
| **捆绑包** | Codex/Claude/Cursor 兼容的布局；映射到 OpenClaw 功能 | `.codex-plugin/`，`.claude-plugin/`，`.cursor-plugin/` |

两者都显示在 `openclaw plugins list` 下。有关包的详细信息，请参阅 [Plugin Bundles](/zh/plugins/bundles)。

如果您正在编写原生插件，请从 [Building Plugins](/zh/plugins/building-plugins)
和 [Plugin SDK Overview](/zh/plugins/sdk-overview) 开始。

## 官方插件

### 可安装 (npm)

| 插件            | 包                     | 文档                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh/channels/nostr)             |
| 语音通话        | `@openclaw/voice-call` | [Voice Call](/zh/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh/channels/zalo)               |
| Zalo 个人版     | `@openclaw/zalouser`   | [Zalo Personal](/zh/plugins/zalouser)   |

### 核心（随 OpenClaw 附带）

<AccordionGroup>
  <Accordion title="模型提供商（默认启用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="记忆插件">- `memory-core` — 捆绑的记忆搜索（默认通过 `plugins.slots.memory`） - `memory-lancedb` — 按需安装的长期记忆，具有自动回忆/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="语音提供商（默认启用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` — 浏览器工具的捆绑浏览器插件，`openclaw browser` CLI，`browser.request` 网关方法，浏览器运行时和默认浏览器控制服务（默认启用；替换前请禁用它）
    - `copilot-proxy` — VS Code Copilot 代理网桥（默认禁用）
  </Accordion>
</AccordionGroup>

寻找第三方插件？请参阅 [Community Plugins](/zh/plugins/community)。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 字段             | 描述                                           |
| ---------------- | ---------------------------------------------- |
| `enabled`        | 主开关（默认：`true`）                         |
| `allow`          | 插件允许列表（可选）                           |
| `deny`           | 插件拒绝列表（可选；拒绝优先）                 |
| `load.paths`     | 额外的插件文件/目录                            |
| `slots`          | 独占槽选择器（例如 `memory`，`contextEngine`） |
| `entries.\<id\>` | 逐个插件开关 + 配置                            |

配置更改**需要重启 Gateway(网关)**。如果 Gateway(网关) 在启用配置监视 + 进程内重启（默认 `openclaw gateway` 路径）的情况下运行，通常在配置写入完成后会自动执行重启。

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled**：插件存在但启用规则将其关闭。配置被保留。 - **Missing**：配置引用了一个设备发现未找到的插件 ID。 - **Invalid**：插件存在但其配置与声明的架构不匹配。</Accordion>

## 设备发现和优先级

OpenClaw 按以下顺序扫描插件（找到第一个匹配项即停止）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — 显式的文件或目录路径。
  </Step>

  <Step title="工作区插件">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局插件">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    随 OpenClaw 一起提供。许多插件默认处于启用状态（模型提供商、语音）。
    其他插件则需要显式启用。
  </Step>
</Steps>

### 启用规则

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 总是优先于允许列表
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件**默认处于禁用状态**（必须显式启用）
- 打包插件遵循内置的默认开启集，除非被覆盖
- 独占槽可以强制启用该槽选定的插件

## 插件槽（独占类别）

某些类别是互斥的（一次只能激活一个）：

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

| 插槽            | 控制内容       | 默认值          |
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
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

捆绑插件随 OpenClaw 一起提供。许多插件默认处于启用状态（例如捆绑的模型提供商、捆绑的语音提供商以及捆绑的浏览器插件）。其他捆绑插件仍需 `openclaw plugins enable <id>`。

`--force` 会就地覆盖现有已安装的插件或挂钩包。请对已跟踪的 npm 插件的常规升级使用
`openclaw plugins update <id-or-npm-spec>`。它不支持 `--link`，后者会重用源路径，而不是复制到受管的安装目标。

`openclaw plugins update <id-or-npm-spec>` 适用于已跟踪的安装。传递带有 dist-tag 或确切版本的 npm 包规范会将包名解析回已跟踪的插件记录，并记录新规范以供将来更新。传递不带版本的包名会将确切固定的安装移回注册表的默认发布线。如果已安装的 npm 插件已匹配解析的版本和记录的构件标识，OpenClaw 将跳过更新，而无需下载、重新安装或重写配置。

`--pin` 仅限 npm。不支持与 `--marketplace` 结合使用，因为 marketplace 安装保留的是 marketplace 源元数据，而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的紧急覆盖选项。它允许插件安装和更新在遇到内置 `critical` 发现时继续进行，但它仍然不会绕过插件 `before_install` 策略阻止或扫描失败阻止。

此 CLI 标志仅适用于插件安装/更新流程。由 Gateway(网关) 支持的技能依赖项安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

兼容的包参与相同的插件列表/检查/启用/禁用流程。当前的运行时支持包括包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录。

`openclaw plugins inspect <id>` 还会报告检测到的包功能以及基于包的插件的受支持或不受支持的 MCP 和 LSP 服务器条目。

Marketplace sources 可以是来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude known-marketplace 名称、本地 marketplace 根目录或 `marketplace.json` 路径、类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL，或 git URL。对于远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库内，并且仅使用相对路径源。

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

OpenClaw 加载入口对象并在插件激活期间调用 `register(api)`。加载器仍然会对旧版插件回退到 `activate(api)`，但捆绑插件和新的外部插件应将 `register` 视为公共约定。

常用注册方法：

| 方法                                    | 注册内容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供商 (LLM)      |
| `registerChannel`                       | 聊天渠道              |
| `registerTool`                          | 代理工具              |
| `registerHook` / `on(...)`              | 生命周期钩子          |
| `registerSpeechProvider`                | 语音合成 / STT        |
| `registerRealtimeTranscriptionProvider` | 流式 STT              |
| `registerRealtimeVoiceProvider`         | 双工实时语音          |
| `registerMediaUnderstandingProvider`    | 图像/音频分析         |
| `registerImageGenerationProvider`       | 图像生成              |
| `registerMusicGenerationProvider`       | 音乐生成              |
| `registerVideoGenerationProvider`       | 视频生成              |
| `registerWebFetchProvider`              | Web 获取 / 抓取提供商 |
| `registerWebSearchProvider`             | Web 搜索              |
| `registerHttpRoute`                     | HTTP 端点             |
| `registerCommand` / `registerCli`       | CLI 命令              |
| `registerContextEngine`                 | 上下文引擎            |
| `registerService`                       | 后台服务              |

为类型化生命周期挂钩挂钩守卫行为：

- `before_tool_call`: `{ block: true }` 是终端的；较低优先级的处理程序将被跳过。
- `before_tool_call`: `{ block: false }` 是空操作，不会清除较早的阻止。
- `before_install`: `{ block: true }` 是终端的；较低优先级的处理程序将被跳过。
- `before_install`：`{ block: false }` 是空操作，不会清除之前的块。
- `message_sending`：`{ cancel: true }` 是终态的；较低优先级的处理程序将被跳过。
- `message_sending`：`{ cancel: false }` 是空操作，不会清除之前的取消操作。

有关完整的类型化 Hook 行为，请参阅 [SDK 概述](/zh/plugins/sdk-overview#hook-decision-semantics)。

## 相关

- [构建插件](/zh/plugins/building-plugins) — 创建您自己的插件
- [插件包](/zh/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/zh/plugins/manifest) — 清单架构
- [注册工具](/zh/plugins/building-plugins#registering-agent-tools) — 在插件中添加代理工具
- [插件内部机制](/zh/plugins/architecture) — 能力模型和加载流水线
- [社区插件](/zh/plugins/community) — 第三方列表
