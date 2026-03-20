---
title: "Diffs"
summary: "面向代理的只读差异查看器和文件渲染器（可选插件工具）"
description: "使用可选的 Diffs 插件将更改前后的文本或统一补丁渲染为网关托管的差异视图、文件（PNG 或 PDF），或两者皆有。"
read_when:
  - 您希望代理以差异形式显示代码或 Markdown 编辑
  - 您需要一个适合画布呈现的查看器 URL 或已渲染的差异文件
  - 您需要具有安全默认值的受控临时差异产物
---

# Diffs

`diffs` 是一个可选插件工具，具有简短的内置系统指导，以及一个配套技能，可将更改内容转换为代理的只读差异产物。

它接受：

- `before` 和 `after` 文本
- 统一 `patch`

它可以返回：

- 用于画布呈现的网关查看器 URL
- 用于消息传递的已渲染文件路径（PNG 或 PDF）
- 一次调用中的两种输出

启用后，该插件会将简明的使用指导附加到系统提示空间，并在代理需要更完整指令时暴露详细的技能。

## 快速开始

1. 启用该插件。
2. 调用 `diffs` 并使用 `mode: "view"`，以实现优先画布流程。
3. 调用 `diffs` 并使用 `mode: "file"`，以实现聊天文件传递流程。
4. 当您需要两种产物时，调用 `diffs` 并使用 `mode: "both"`。

## 启用该插件

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
      },
    },
  },
}
```

## 禁用内置系统指导

如果您想保持 `diffs` 工具启用但禁用其内置系统提示指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设置为 `false`：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
      },
    },
  },
}
```

这会阻止 diffs 插件的 `before_prompt_build` 挂钩，同时保持插件、工具和配套技能可用。

如果您想同时禁用指导和工具，请改为禁用该插件。

## 典型代理工作流

1. 代理调用 `diffs`。
2. 代理读取 `details` 字段。
3. 代理可以：
   - 使用 `canvas present` 打开 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 发送附带 `message` 的 `details.filePath`
   - 两者都做

## 输入示例

之前和之后：

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

补丁：

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## 工具输入参考

除非另有说明，否则所有字段均为可选：

- `before` (`string`): 原始文本。当省略 `patch` 时，需要与 `after` 配合使用。
- `after` (`string`): 更新后的文本。当省略 `patch` 时，需要与 `before` 配合使用。
- `patch` (`string`): 统一差异文本。与 `before` 和 `after` 互斥。
- `path` (`string`): 之前和之后模式的显示文件名。
- `lang` (`string`): 之前和之后模式的语言覆盖提示。
- `title` (`string`): 查看器标题覆盖。
- `mode` (`"view" | "file" | "both"`): 输出模式。默认为插件默认值 `defaults.mode`。
- `theme` (`"light" | "dark"`): 查看器主题。默认为插件默认值 `defaults.theme`。
- `layout` (`"unified" | "split"`): 差异布局。默认为插件默认值 `defaults.layout`。
- `expandUnchanged` (`boolean`): 当完整上下文可用时展开未更改的部分。仅限单次调用选项（不是插件默认键）。
- `fileFormat` (`"png" | "pdf"`): 渲染的文件格式。默认为插件默认值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`): PNG 或 PDF 渲染的质量预设。
- `fileScale` (`number`): 设备缩放覆盖 (`1`-`4`)。
- `fileMaxWidth` (`number`): 最大渲染宽度，单位为 CSS 像素 (`640`-`2400`)。
- `ttlSeconds` (`number`): 查看器产物 TTL（秒）。默认 1800，最大 21600。
- `baseUrl` (`string`): 查看器 URL 源覆盖。必须是 `http` 或 `https`，不带查询/哈希。

验证和限制：

- `before` 和 `after` 每个最大 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 字节。
- `lang` 最大 128 字节。
- `title` 最大 1024 字节。
- 补丁复杂性上限：最多 128 个文件和 120000 行总计。
- `patch` 和 `before` 或 `after` 组合使用会被拒绝。
- 渲染文件安全限制（适用于 PNG 和 PDF）：
  - `fileQuality: "standard"`: 最大 8 MP (8,000,000 渲染像素)。
  - `fileQuality: "hq"`: 最大 14 MP (14,000,000 渲染像素)。
  - `fileQuality: "print"`: 最大 24 MP (24,000,000 渲染像素)。
  - PDF 也有最多 50 页的限制。

## 输出详情合约

该工具在 `details` 下返回结构化元数据。

创建查看器的模式的共享字段：

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`

渲染 PNG 或 PDF 时的文件字段：

- `filePath`
- `path` （与 `filePath` 值相同，用于消息工具兼容性）
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行为摘要：

- `mode: "view"`: 仅查看器字段。
- `mode: "file"`: 仅文件字段，无查看器产物。
- `mode: "both"`: 查看器字段加文件字段。如果文件渲染失败，查看器仍会返回，并带有 `fileError`。

## 折叠未更改的部分

- 查看器可以显示类似 `N unmodified lines` 的行。
- 这些行上的展开控件是有条件的，并不保证每种输入类型都有。
- 当渲染的差异包含可展开的上下文数据时，会出现展开控件，这对于“修改前”和“修改后”的输入来说是典型的。
- 对于许多统一补丁输入，解析后的补丁块中不包含被省略的上下文主体，因此该行可能会在没有展开控件的情况下出现。这是预期行为。
- `expandUnchanged` 仅在存在可展开上下文时适用。

## 插件默认设置

在 `~/.openclaw/openclaw.json` 中设置插件范围的默认值：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          defaults: {
            fontFamily: "Fira Code",
            fontSize: 15,
            lineSpacing: 1.6,
            layout: "unified",
            showLineNumbers: true,
            diffIndicators: "bars",
            wordWrap: true,
            background: true,
            theme: "dark",
            fileFormat: "png",
            fileQuality: "standard",
            fileScale: 2,
            fileMaxWidth: 960,
            mode: "both",
          },
        },
      },
    },
  },
}
```

支持的默认值：

- `fontFamily`
- `fontSize`
- `lineSpacing`
- `layout`
- `showLineNumbers`
- `diffIndicators`
- `wordWrap`
- `background`
- `theme`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`
- `mode`

显式工具参数会覆盖这些默认值。

## 安全配置

- `security.allowRemoteViewer` (`boolean`，默认为 `false`)
  - `false`：拒绝到查看器路由的非本地回环请求。
  - `true`：如果带令牌的路径有效，则允许远程查看器。

示例：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          security: {
            allowRemoteViewer: false,
          },
        },
      },
    },
  },
}
```

## 工件生命周期和存储

- 工件存储在 temp 子文件夹下：`$TMPDIR/openclaw-diffs`。
- 查看器工件元数据包含：
  - 随机工件 ID（20 个十六进制字符）
  - 随机令牌（48 个十六进制字符）
  - `createdAt` 和 `expiresAt`
  - 存储的 `viewer.html` 路径
- 未指定时，查看器的默认 TTL 为 30 分钟。
- 可接受的最大查看器 TTL 为 6 小时。
- 清理会在工件创建后适时运行。
- 过期的工件将被删除。
- 当元数据丢失时，备用清理会删除超过 24 小时的过期文件夹。

## 查看器 URL 和网络行为

查看器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

查看器资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 构建行为：

- 如果提供了 `baseUrl`，则会在严格验证后使用它。
- 如果没有 `baseUrl`，查看器 URL 默认为本地回环 `127.0.0.1`。
- 如果网关绑定模式为 `custom` 并且设置了 `gateway.customBindHost`，则使用该主机。

`baseUrl` 规则：

- 必须是 `http://` 或 `https://`。
- 查询字符串和哈希会被拒绝。
- 允许源加上可选的基础路径。

## 安全模型

查看器加固：

- 默认仅限本地回环。
- 经过令牌化的查看器路径，具有严格的 ID 和令牌验证。
- 查看器响应 CSP：
  - `default-src 'none'`
  - 脚本和资源仅来自 self
  - 没有出站 `connect-src`
- 启用远程访问时的远程未命中限流：
  - 60 秒内 40 次失败
  - 60 秒锁定 (`429 Too Many Requests`)

文件渲染加固：

- 屏幕截图浏览器请求路由默认为拒绝。
- 仅允许来自 `http://127.0.0.1/plugins/diffs/assets/*` 的本地查看器资源。
- 外部网络请求被阻止。

## 文件模式的浏览器要求

`mode: "file"` 和 `mode: "both"` 需要兼容 Chromium 的浏览器。

解析顺序：

1. OpenClaw 配置中的 `browser.executablePath`。
2. 环境变量：
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. 平台命令/路径发现回退机制。

常见失败文本：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

请通过安装 Chrome、Chromium、Edge 或 Brave 来修复，或设置上述可执行路径选项之一。

## 故障排除

输入验证错误：

- `Provide patch or both before and after text.`
  - 请同时包含 `before` 和 `after`，或提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 不要混合输入模式。
- `Invalid baseUrl: ...`
  - 使用 `http(s)` 源加上可选路径，不要查询/哈希。
- `{field} exceeds maximum size (...)`
  - 减小负载大小。
- 大型补丁拒绝
  - 减少补丁文件数量或总行数。

查看器可访问性问题：

- 查看器 URL 默认解析为 `127.0.0.1`。
- 对于远程访问场景，请：
  - 每次工具调用时传递 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 仅在您打算进行外部查看器访问时启用 `security.allowRemoteViewer`。

未修改的行没有展开按钮：

- 当补丁输入不包含可展开的上下文时，可能会发生这种情况。
- 这是预期行为，并不表示查看器出现故障。

找不到工件：

- 工件因 TTL 过期。
- 令牌或路径已更改。
- 清理操作已删除陈旧数据。

## 操作指南

- 对于在画布中进行本地交互式审查，首选 `mode: "view"`。
- 对于需要附件的出站聊天渠道，首选 `mode: "file"`。
- 除非您的部署需要远程查看器 URL，否则保持 `allowRemoteViewer` 禁用状态。
- 为敏感差异设置明确的简短 `ttlSeconds`。
- 避免在不需要时在差异输入中发送机密信息。
- 如果您的渠道过度压缩图像（例如 Telegram 或 WhatsApp），请首选 PDF 输出 (`fileFormat: "pdf"`)。

差异渲染引擎：

- 由 [Diffs](https://diffs.com) 提供支持。

## 相关文档

- [工具概述](/zh/tools)
- [插件](/zh/tools/plugin)
- [浏览器](/zh/tools/browser)

import en from "/components/footer/en.mdx";

<en />
