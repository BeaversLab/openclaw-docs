---
title: "Diffs"
summary: "面向智能体的只读差异查看器和文件渲染器（可选插件工具）"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# 差异

`diffs` 是一个可选的插件工具，具有简短的内置系统指导和一个配套技能，可将更改内容转换为供代理使用的只读差异产物。

它接受：

- `before` 和 `after` 文本
- 统一的 `patch`

它可以返回：

- 用于画布展示的网关查看器 URL
- 用于消息投递的渲染文件路径（PNG 或 PDF）
- 一次调用中的两种输出

启用后，该插件会将简明的使用指导添加到系统提示词空间，并公开详细的技能，以应对代理需要更完整指令的情况。

## 快速开始

1. 启用插件。
2. 对于画布优先的流程，使用 `mode: "view"` 调用 `diffs`。
3. 对于聊天文件投递流程，使用 `mode: "file"` 调用 `diffs`。
4. 当您需要两种产物时，使用 `mode: "both"` 调用 `diffs`。

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

如果您想保持 `diffs` 工具启用但禁用其内置的系统提示词指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设置为 `false`：

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

这会阻止差异插件的 `before_prompt_build` 钩子，同时保持插件、工具和配套技能可用。

如果您想同时禁用指导和工具，请改为禁用该插件。

## 典型的代理工作流

1. 代理调用 `diffs`。
2. 代理读取 `details` 字段。
3. 代理执行以下操作之一：
   - 使用 `canvas present` 打开 `details.viewerUrl`
   - 使用 `path` 或 `filePath` 发送带有 `message` 的 `details.filePath`
   - 两者都做

## 输入示例

修改前和修改后：

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

除非另有说明，否则所有字段都是可选的：

- `before` (`string`)：原始文本。当省略 `patch` 时，与 `after` 一起使用时是必需的。
- `after` (`string`): 更新后的文本。当省略 `patch` 时，与 `before` 一起使用时是必需的。
- `patch` (`string`): 统一差异文本。与 `before` 和 `after` 互斥。
- `path` (`string`): 前后模式的显示文件名。
- `lang` (`string`): 前后模式的语言覆盖提示。
- `title` (`string`): 查看器标题覆盖。
- `mode` (`"view" | "file" | "both"`): 输出模式。默认为插件默认值 `defaults.mode`。
  已弃用的别名：`"image"` 的行为类似于 `"file"`，为了向后兼容仍然接受。
- `theme` (`"light" | "dark"`): 查看器主题。默认为插件默认值 `defaults.theme`。
- `layout` (`"unified" | "split"`): 差异布局。默认为插件默认值 `defaults.layout`。
- `expandUnchanged` (`boolean`): 当提供完整上下文时展开未更改的部分。仅限单次调用选项（不是插件默认键）。
- `fileFormat` (`"png" | "pdf"`): 渲染文件格式。默认为插件默认值 `defaults.fileFormat`。
- `fileQuality` (`"standard" | "hq" | "print"`): PNG 或 PDF 渲染的质量预设。
- `fileScale` (`number`): 设备缩放覆盖 (`1`-`4`)。
- `fileMaxWidth` (`number`): CSS 像素中的最大渲染宽度 (`640`-`2400`)。
- `ttlSeconds` (`number`): 查看器工件生存时间（秒）。默认 1800，最大 21600。
- `baseUrl` (`string`): 查看器 URL 源覆盖。必须是 `http` 或 `https`，无查询/哈希。

验证和限制：

- `before` 和 `after` 每个最大 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 字节。
- `lang` 最大 128 字节。
- `title` 最大 1024 字节。
- 补丁复杂性上限：最多 128 个文件和 120000 行总计。
- `patch` 和 `before` 或 `after` 组合在一起会被拒绝。
- 渲染文件安全限制（适用于 PNG 和 PDF）：
  - `fileQuality: "standard"`: 最大 8 MP (8,000,000 个渲染像素)。
  - `fileQuality: "hq"`: 最大 14 MP (14,000,000 个渲染像素)。
  - `fileQuality: "print"`: 最大 24 MP (24,000,000 个渲染像素)。
  - PDF 也最多 50 页。

## 输出详情合约

该工具在 `details` 下返回结构化元数据。

创建查看器的模式共享字段：

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`
- `context` (可用时为 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`)

渲染 PNG 或 PDF 时的文件字段：

- `artifactId`
- `expiresAt`
- `filePath`
- `path` (与 `filePath` 的值相同，用于消息工具兼容性)
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行为摘要：

- `mode: "view"`: 仅查看器字段。
- `mode: "file"`: 仅文件字段，无查看器构件。
- `mode: "both"`：查看器字段加上文件字段。如果文件渲染失败，查看器仍会返回 `fileError`。

## 折叠未更改部分

- 查看器可以显示像 `N unmodified lines` 这样的行。
- 这些行上的展开控件是有条件的，并不保证对每种输入类型都可用。
- 当渲染的差异具有可扩展的上下文数据时，会出现展开控件，这对于前后输入来说很典型。
- 对于许多统一补丁输入，解析后的补丁块中没有可用的省略上下文主体，因此该行可能会在没有展开控件的情况下出现。这是预期行为。
- `expandUnchanged` 仅在存在可扩展上下文时适用。

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

显式的工具参数会覆盖这些默认值。

## 安全配置

- `security.allowRemoteViewer` (`boolean`，默认 `false`)
  - `false`：拒绝非环回请求访问查看器路由。
  - `true`：如果标记化路径有效，则允许远程查看器。

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

## 制品生命周期和存储

- 制品存储在 temp 子文件夹下：`$TMPDIR/openclaw-diffs`。
- 查看器制品元数据包含：
  - 随机制品 ID（20 个十六进制字符）
  - 随机令牌（48 个十六进制字符）
  - `createdAt` 和 `expiresAt`
  - 已存储的 `viewer.html` 路径
- 如果未指定，默认查看器 TTL 为 30 分钟。
- 接受的最大查看器 TTL 为 6 小时。
- 清理会在制品创建后适时运行。
- 过期的制品会被删除。
- 当元数据缺失时，备用清理会删除超过 24 小时的旧文件夹。

## 查看器 URL 和网络行为

查看器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

查看器资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 构建行为：

- 如果提供了 `baseUrl`，则在进行严格验证后使用它。
- 如果没有 `baseUrl`，查看器 URL 默认为本地回环 `127.0.0.1`。
- 如果网关绑定模式是 `custom` 并且设置了 `gateway.customBindHost`，则使用该主机。

`baseUrl` 规则：

- 必须是 `http://` 或 `https://`。
- 查询和哈希会被拒绝。
- 允许源加上可选的基本路径。

## 安全模型

查看器加固：

- 默认仅限本地回环。
- 带有严格 ID 和令牌验证的令牌化查看器路径。
- 查看器响应 CSP：
  - `default-src 'none'`
  - 脚本和资源仅来自自身
  - 没有出站 `connect-src`
- 启用远程访问时的远程未命中限制：
  - 60 秒内 40 次失败
  - 60 秒锁定 (`429 Too Many Requests`)

文件渲染加固：

- 截图浏览器请求路由默认为拒绝。
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
3. 平台命令/路径发现回退。

常见失败文本：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

修复方法：安装 Chrome、Chromium、Edge 或 Brave，或设置上述可执行路径选项之一。

## 故障排除

输入验证错误：

- `Provide patch or both before and after text.`
  - 同时包含 `before` 和 `after`，或提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 不要混合输入模式。
- `Invalid baseUrl: ...`
  - 使用 `http(s)` 源（可选路径），无查询/哈希。
- `{field} exceeds maximum size (...)`
  - 减少负载大小。
- 大型补丁拒绝
  - 减少补丁文件数量或总行数。

查看器可访问性问题：

- 查看器 URL 默认解析为 `127.0.0.1`。
- 对于远程访问场景，请：
  - 每次工具调用传递 `baseUrl`，或
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
- 仅当您打算允许外部查看器访问时，才启用 `security.allowRemoteViewer`。

未修改行没有展开按钮：

- 当补丁不包含可展开的上下文时，补丁输入可能会发生这种情况。
- 这是预期行为，并不表示查看器失败。

未找到工件：

- 工件因 TTL（生存时间）到期而过期。
- Token 或路径已更改。
- 清理操作删除了陈旧数据。

## 操作指南

- 对于画布中的本地交互式审查，请优先使用 `mode: "view"`。
- 对于需要附件的出站聊天渠道，请优先使用 `mode: "file"`。
- 除非您的部署需要远程查看器 URL，否则请保持 `allowRemoteViewer` 禁用状态。
- 为敏感差异设置明确的简短 `ttlSeconds`。
- 在不必要时，避免在差异输入中发送机密信息。
- 如果您的渠道（例如 Telegram 或 WhatsApp）会激进地压缩图像，请首选 PDF 输出 (`fileFormat: "pdf"`)。

差异渲染引擎：

- 由 [Diffs](https://diffs.com) 提供支持。

## 相关文档

- [工具概述](/zh/tools)
- [插件](/zh/tools/plugin)
- [浏览器](/zh/tools/browser)
