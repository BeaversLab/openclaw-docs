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

插件为 OpenClaw 扩展了新功能：渠道、模型提供商、工具、技能、语音、图像生成等。有些插件是**核心**插件（随 OpenClaw 附带），其他是**外部**插件（由社区发布在 npm 上）。

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

## 插件类型

OpenClaw 识别两种插件格式：

| 格式     | 工作原理                                           | 示例                                                   |
| -------- | -------------------------------------------------- | ------------------------------------------------------ |
| **原生** | `openclaw.plugin.json` + 运行时模块；在进程中执行  | 官方插件，社区 npm 包                                  |
| **包**   | Codex/Claude/Cursor 兼容布局；映射到 OpenClaw 功能 | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

两者都显示在 `openclaw plugins list` 下。有关捆绑包的详细信息，请参阅 [Plugin Bundles](/en/plugins/bundles)。

如果您正在编写原生插件，请从 [Building Plugins](/en/plugins/building-plugins)
和 [Plugin SDK Overview](/en/plugins/sdk-overview) 开始。

## 官方插件

### 可安装 (npm)

| 插件            | 包                     | 文档                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/en/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/en/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/en/channels/nostr)             |
| 语音通话        | `@openclaw/voice-call` | [Voice Call](/en/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/en/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/en/plugins/zalouser)   |

### 核心（随 OpenClaw 附带）

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Memory plugins">- `memory-core` — 捆绑的内存搜索（默认通过 `plugins.slots.memory`） - `memory-lancedb` — 按需安装的长期内存，具有自动回忆/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="Speech providers (enabled by default)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Other">
    - `browser` — 用于浏览器工具的捆绑浏览器插件，`openclaw browser` CLI，`browser.request` 网关方法、浏览器运行时和默认浏览器控制服务（默认启用；在替换前禁用它）
    - `copilot-proxy` — VS Code Copilot 代理桥（默认禁用）
  </Accordion>
</AccordionGroup>

正在寻找第三方插件？请参阅 [Community Plugins](/en/plugins/community)。

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
| `slots`          | 独占槽位选择器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 单个插件开关 + 配置                              |

配置更改**需要重启 Gateway(网关)**。如果 Gateway(网关) 正在运行并启用了配置监视 + 进程内重启（默认 `openclaw gateway` 路径），则该重启通常会在配置写入后的一小会儿自动执行。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">- **Disabled（已禁用）**：插件存在但启用规则将其关闭。配置被保留。 - **Missing（缺失）**：配置引用了一个发现机制未找到的插件 ID。 - **Invalid（无效）**：插件存在但其配置与声明的架构不匹配。</Accordion>

## 设备发现和优先级

OpenClaw 按以下顺序扫描插件（第一个匹配项获胜）：

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
    随 OpenClaw 一起提供。许多默认启用（模型提供商，语音）。
    其他则需要显式启用。
  </Step>
</Steps>

### 启用规则

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 总是优先于 allow
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件**默认禁用**（必须显式启用）
- 捆绑插件遵循内置的默认开启集，除非被覆盖
- 独占插槽可以强制启用该插槽选定的插件

## 插件插槽（独占类别）

某些类别是独占的（一次只能激活一个）：

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

| 插槽            | 控制内容       | 默认值            |
| --------------- | -------------- | ----------------- |
| `memory`        | 活动内存插件   | `memory-core`     |
| `contextEngine` | 活动上下文引擎 | `legacy` （内置） |

## CLI 参考

```bash
openclaw plugins list                    # compact inventory
openclaw plugins inspect <id>            # deep detail
openclaw plugins inspect <id> --json     # machine-readable
openclaw plugins status                  # operational summary
openclaw plugins doctor                  # diagnostics

openclaw plugins install <package>        # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>   # install from ClawHub only
openclaw plugins install <path>          # install from local path
openclaw plugins install -l <path>       # link (no copy) for dev
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id>             # update one plugin
openclaw plugins update --all            # update all

openclaw plugins enable <id>
openclaw plugins disable <id>
```

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的紧急覆盖开关。它允许安装
绕过内置 `critical` 发现结果继续进行，但仍然无法绕过插件
`before_install` 策略阻止或扫描失败阻止。

此 CLI 标志仅适用于插件安装。基于 Gateway(网关) 的技能依赖项
安装改为使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，
而 `openclaw skills install` 仍然是单独的 ClawHub 技能
下载/安装流程。

有关完整详细信息，请参阅 [`openclaw plugins` CLI 参考](/en/cli/plugins)。

## 插件 API 概述

插件导出一个函数或一个带有 `register(api)` 的对象：

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

常用注册方法：

| 方法                                 | 注册内容         |
| ------------------------------------ | ---------------- |
| `registerProvider`                   | 模型提供商 (LLM) |
| `registerChannel`                    | 聊天渠道         |
| `registerTool`                       | 代理工具         |
| `registerHook` / `on(...)`           | 生命周期钩子     |
| `registerSpeechProvider`             | 文本转语音 / STT |
| `registerMediaUnderstandingProvider` | 图像/音频分析    |
| `registerImageGenerationProvider`    | 图像生成         |
| `registerWebSearchProvider`          | 网络搜索         |
| `registerHttpRoute`                  | HTTP 端点        |
| `registerCommand` / `registerCli`    | CLI 命令         |
| `registerContextEngine`              | 上下文引擎       |
| `registerService`                    | 后台服务         |

类型化生命周期钩子的守卫钩子行为：

- `before_tool_call`: `{ block: true }` 是终态；较低优先级的处理程序将被跳过。
- `before_tool_call`: `{ block: false }` 是空操作，不会清除先前的阻止。
- `before_install`: `{ block: true }` 是终态；较低优先级的处理程序将被跳过。
- `before_install`: `{ block: false }` 是空操作，不会清除先前的阻止。
- `message_sending`: `{ cancel: true }` 是终态；较低优先级的处理程序将被跳过。
- `message_sending`: `{ cancel: false }` 是空操作，不会清除先前的取消。

有关完整的类型化钩子行为，请参阅 [SDK 概述](/en/plugins/sdk-overview#hook-decision-semantics)。

## 相关

- [构建插件](/en/plugins/building-plugins) — 创建你自己的插件
- [插件包](/en/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/en/plugins/manifest) — 清单架构
- [注册工具](/en/plugins/building-plugins#registering-agent-tools) — 在插件中添加代理工具
- [插件内部机制](/en/plugins/architecture) — 能力模型和加载管道
- [社区插件](/en/plugins/community) — 第三方列表
