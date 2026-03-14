---
title: "Diffs"
summary: "面向智能体的只读差异查看器和文件渲染器（可选插件工具）"
description: "使用可选的 Diffs 插件将修改前后的文本或统一补丁渲染为网关托管的差异视图、文件（PNG 或 PDF），或两者兼有。"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# 差异

`diffs` 是一个可选的插件工具，具有简短的内置系统指导和一个配套技能，可将更改内容转换为供智能体使用的只读差异工件。

它接受：

- `before` 和 `after` 文本
- 统一 `patch`

它可以返回：

- 用于画布演示的网关查看器 URL
- 用于消息传递的渲染文件路径（PNG 或 PDF）
- 一次调用中的两种输出

启用后，该插件会将简明的使用指导添加到系统提示空间，并公开详细的技能，以供代理需要更全面指导时使用。

## 快速入门

1. 启用插件。
2. 对于优先使用画布的流程，请使用 `mode: "view"` 调用 `diffs`。
3. 对于聊天文件交付流程，请使用 `mode: "file"` 调用 `diffs`。
4. 当您需要这两种工件时，请使用 `mode: "both"` 调用 `diffs`。

## 启用插件

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

如果您想保持 `diffs` 工具启用但禁用其内置的系统提示指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设置为 `false`：

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

如果您想同时禁用指导和工具，请改为禁用插件。

## 典型代理工作流程

1. 智能体调用 `diffs`。
2. 智能体读取 `details` 字段。
3. 代理可以：
   - 使用 `canvas present` 打开 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 发送带有 `message` 的 `details.filePath`
   - 两者都做

## 输入示例

变更前和变更后：

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

除非另有说明，所有字段都是可选的：

- `before` (`string`)：原始文本。当省略 `patch` 时，与 `after` 一起使用时是必需的。
- `after` (`string`)：更新后的文本。当省略 `patch` 时，与 `before` 一起使用时是必需的。
- `patch` (`string`)：统一差异文本。与 `before` 和 `after` 互斥。
- `path` (`string`)：变更前和变更后模式的显示文件名。
- `lang` (`string`)：变更前和变更后模式的语言覆盖提示。
- `title` (`string`)：查看器标题覆盖。
- `mode` (`"view" | "file" | "both"`)：输出模式。默认为插件默认值 `defaults.mode`。
- `theme` (`"light" | "dark"`)：查看器主题。默认为插件默认值 `defaults.theme`。
- `layout` (`"unified" | "split"`)：差异布局。默认为插件默认值 `defaults.layout`。
- `expandUnchanged` (`boolean`)：当提供完整上下文时展开未更改的部分。仅限单次调用的选项（不是插件默认键）。
- `fileFormat` (`"png" | "pdf"`)：渲染文件格式。默认为插件默认值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`)：PNG 或 PDF 渲染的质量预设。
- `fileScale` (`number`)：设备缩放覆盖 (`1`-`4`)。
- `fileMaxWidth` (`number`)：CSS 像素中的最大渲染宽度 (`640`-`2400`)。
- `ttlSeconds` (`number`)：查看器产物生存时间（秒）。默认 1800，最大 21600。
- `baseUrl` (`string`)：查看器 URL 源覆盖。必须是 `http` 或 `https`，不带查询/哈希。

验证和限制：

- `before` 和 `after` 各自最大 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 字节。
- `lang` 最大 128 字节。
- `title` 最大 1024 字节。
- 补丁复杂性上限：最多 128 个文件和 120000 行总行数。
- `patch` 和 `before` 或 `after` 同时存在会被拒绝。
- 渲染文件安全限制（适用于 PNG 和 PDF）：
  - `fileQuality: "standard"`：最大 8 MP（8,000,000 个渲染像素）。
  - `fileQuality: "hq"`：最大 14 MP（14,000,000 个渲染像素）。
  - `fileQuality: "print"`：最大 24 MP（24,000,000 个渲染像素）。
  - PDF 最多还有 50 页的限制。

## 输出详情约定

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
- `path` （值与 `filePath` 相同，用于消息工具兼容性）
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行为摘要：

- `mode: "view"`：仅限查看器字段。
- `mode: "file"`：仅限文件字段，无查看器工件。
- `mode: "both"`：查看器字段加文件字段。如果文件渲染失败，查看器仍会返回 `fileError`。

## 折叠未更改的部分

- 查看器可以显示像 `N unmodified lines` 这样的行。
- 这些行上的展开控件是条件性的，并不保证每种输入类型都有。
- 当渲染的差异具有可展开的上下文数据时，会出现展开控件，这在前后输入中很常见。
- 对于许多统一补丁输入，解析后的补丁块中无法获得省略的上下文正文，因此该行可能会在没有展开控件的情况下出现。这是预期行为。
- `expandUnchanged` 仅在存在可展开上下文时适用。

## 插件默认值

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

- `security.allowRemoteViewer` （`boolean`，默认 `false`）
  - `false`：拒绝指向查看器路由的非环回请求。
  - `true`：如果令牌化路径有效，则允许远程查看器。

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
- 未指定时，默认查看器 TTL 为 30 分钟。
- 接受的最大查看器 TTL 为 6 小时。
- 清理会在工件创建后适时运行。
- 过期的工件将被删除。
- 当元数据缺失时，回退清理会移除超过 24 小时的陈旧文件夹。

## 查看器 URL 和网络行为

查看器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

查看器资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 构建行为：

- 如果提供了 `baseUrl`，则会在严格验证后使用它。
- 如果没有 `baseUrl`，查看器 URL 默认为回环地址 `127.0.0.1`。
- 如果网关绑定模式为 `custom` 且设置了 `gateway.customBindHost`，则使用该主机。

`baseUrl` 规则：

- 必须是 `http://` 或 `https://`。
- 查询和哈希会被拒绝。
- 允许源加上可选的基本路径。

## 安全模型

查看器加固：

- 默认仅限回环。
- 使用严格的 ID 和令牌验证的令牌化查看器路径。
- 查看器响应 CSP：
  - `default-src 'none'`
  - 脚本和资源仅允许来自自身
  - 没有出站 `connect-src`
- 启用远程访问时的远程未命中限制：
  - 60 秒内 40 次失败
  - 60 秒锁定（`429 Too Many Requests`）

文件渲染加固：

- 屏幕截图浏览器请求路由默认拒绝。
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

通过安装 Chrome、Chromium、Edge 或 Brave，或设置上述可执行路径选项之一来修复。

## 故障排除

输入验证错误：

- `Provide patch or both before and after text.`
  - 请同时包含 `before` 和 `after`，或提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 请勿混用输入模式。
- `Invalid baseUrl: ...`
  - 使用带有可选路径的 `http(s)` 源，不要包含查询/哈希。
- `{field} exceeds maximum size (...)`
  - 减小负载大小。
- 大型补丁拒绝
  - 减少补丁文件数量或总行数。

查看器可访问性问题：

- 查看器 URL 默认解析为 `127.0.0.1`。
- 对于远程访问场景，请：
  - 每次工具调用时传递 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 仅当您打算进行外部查看器访问时，才启用 `security.allowRemoteViewer`。

未修改行没有展开按钮：

- 当补丁不包含可展开的上下文时，补丁输入可能会发生这种情况。
- 这是预期的，并不表示查看器故障。

找不到工件：

- 工件因 TTL 过期。
- 令牌或路径已更改。
- 清理操作已删除过时数据。

## 操作指南

- 对于画布中的本地交互式审查，首选 `mode: "view"`。
- 对于需要附件的出站聊天频道，首选 `mode: "file"`。
- 保持 `allowRemoteViewer` 禁用，除非您的部署需要远程查看器 URL。
- 为敏感的差异设置明确的短期 `ttlSeconds`。
- 如无必要，请避免在 diff 输入中发送机密信息。
- 如果您的渠道激进地压缩图片（例如 Telegram 或 WhatsApp），请首选 PDF 输出（`fileFormat: "pdf"`）。

Diff 渲染引擎：

- 由 [Diffs](https://diffs.com) 提供支持。

## 相关文档

- [工具概览](/zh/tools)
- [插件](/zh/tools/plugin)
- [浏览器](/zh/tools/browser)

import zh from '/components/footer/zh.mdx';

<zh />
