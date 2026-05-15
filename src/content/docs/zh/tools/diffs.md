---
summary: "面向代理的只读差异查看器和文件渲染器（可选插件工具）"
title: "差异"
sidebarTitle: "差异"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` 是一个可选的插件工具，具有简短的内置系统指导和一个配套技能，可将更改内容转换为面向代理的只读差异文件。

它接受：

- `before` 和 `after` 文本
- 统一的 `patch`

它可以返回：

- 用于画布展示的网关查看器 URL
- 用于消息投递的渲染文件路径（PNG 或 PDF）
- 一次调用中的两种输出

启用后，该插件会将简明的使用指导添加到系统提示词空间，并公开详细的技能，以应对代理需要更完整指令的情况。

## 快速开始

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install diffs
    ```
  </Step>
  <Step title="启用插件">
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
  </Step>
  <Step title="选择模式">
    <Tabs>
      <Tab title="view"Canvas>
        Canvas 优先流程：代理调用 `diffs` 时使用 `mode: "view"`，并使用 `canvas present` 打开 `details.viewerUrl`。
      </Tab>
      <Tab title="file">
        聊天文件交付：代理调用 `diffs` 时使用 `mode: "file"`，并使用 `path` 或 `filePath` 发送带有 `message` 的 `details.filePath`。
      </Tab>
      <Tab title="both">
        组合模式：代理调用 `diffs` 时使用 `mode: "both"` 以在一次调用中获取两种文件。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## 禁用内置系统指导

如果您希望保持 `diffs` 工具启用但禁用其内置系统提示指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设置为 `false`：

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

这将阻止差异插件的 `before_prompt_build` 钩子，同时保持插件、工具和配套技能可用。

如果您想同时禁用指导和工具，请改为禁用该插件。

## 典型代理工作流

<Steps>
  <Step title="调用差异">代理使用输入调用 `diffs` 工具。</Step>
  <Step title="读取详情">Agent 从响应中读取 `details` 字段。</Step>
  <Step title="展示">Agent 使用 `canvas present` 打开 `details.viewerUrl`，使用 `path` 或 `filePath` 发送带有 `message` 的 `details.filePath`，或者两者都做。</Step>
</Steps>

## 输入示例

<Tabs>
  <Tab title="变更前后">
    ```json
    {
      "before": "# Hello\n\nOne",
      "after": "# Hello\n\nTwo",
      "path": "docs/example.md",
      "mode": "view"
    }
    ```
  </Tab>
  <Tab title="补丁">
    ```json
    {
      "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
      "mode": "both"
    }
    ```
  </Tab>
</Tabs>

## 工具输入参考

除非另有说明，否则所有字段都是可选的。

<ParamField path="before" type="string">
  原始文本。当省略 `patch` 时，与 `after` 一起必需。
</ParamField>
<ParamField path="after" type="string">
  更新后的文本。当省略 `patch` 时，与 `before` 一起必需。
</ParamField>
<ParamField path="patch" type="string">
  统一差异文本。与 `before` 和 `after` 互斥。
</ParamField>
<ParamField path="path" type="string">
  前后模式的显示文件名。
</ParamField>
<ParamField path="lang" type="string">
  前后模式的语言覆盖提示。未知值将回退到纯文本。
</ParamField>
<ParamField path="title" type="string">
  查看器标题覆盖。
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  输出模式。默认为插件默认值 `defaults.mode`。已弃用的别名：`"image"` 的行为类似于 `"file"`，为了向后兼容仍然接受。
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  查看器主题。默认为插件默认值 `defaults.theme`。
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  差异布局。默认为插件默认值 `defaults.layout`。
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  当完整上下文可用时展开未更改的部分。仅限单次调用选项（不是插件默认键）。
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  渲染的文件格式。默认为插件默认值 `defaults.fileFormat`。
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  PNG 或 PDF 渲染的质量预设。
</ParamField>
<ParamField path="fileScale" type="number">
  设备缩放覆盖（`1`-`4`）。
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  CSS 像素中的最大渲染宽度（`640`-`2400`）。
</ParamField>
<ParamField path="ttlSeconds" type="number"%%PH:JSX_ATTR:66:e15fae%% default="1800">
  查看器和独立文件输出的产物 TTL（秒）。最大 21600。
</ParamField>
<ParamField path="baseUrl" type="string">
  查看器 URL 源覆盖。覆盖插件 `viewerBaseUrl`。必须是 `http` 或 `https`，没有查询/哈希。
</ParamField>

<AccordionGroup>
  <Accordion title="Legacy input aliases">
    为保持向后兼容性，仍然接受以下输入：

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="Validation and limits">
    - `before` 和 `after` 各自最大 512 KiB。
    - `patch` 最大 2 MiB。
    - `path` 最大 2048 字节。
    - `lang` 最大 128 字节。
    - `title` 最大 1024 字节。
    - 补丁复杂性上限：最多 128 个文件和 120000 行总行数。
    - `patch` 与 `before` 或 `after` 同时存在将被拒绝。
    - 渲染文件安全限制（适用于 PNG 和 PDF）：
      - `fileQuality: "standard"`：最大 8 MP（8,000,000 个渲染像素）。
      - `fileQuality: "hq"`：最大 14 MP（14,000,000 个渲染像素）。
      - `fileQuality: "print"`：最大 24 MP（24,000,000 个渲染像素）。
      - PDF 还具有最多 50 页的限制。

  </Accordion>
</AccordionGroup>

## 输出详情合约

该工具在 `details` 下返回结构化元数据。

<AccordionGroup>
  <Accordion title="Viewer fields">
    用于创建查看器的模式的共享字段：

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context`（如有 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`）

  </Accordion>
  <Accordion title="File fields">
    文件字段（当渲染 PNG 或 PDF 时）：

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path`（值与 `filePath` 相同，用于消息工具兼容性）
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="Compatibility aliases">
    也会为现有调用方返回：

    - `format`（值与 `fileFormat` 相同）
    - `imagePath`（值与 `filePath` 相同）
    - `imageBytes`（值与 `fileBytes` 相同）
    - `imageQuality`（值与 `fileQuality` 相同）
    - `imageScale`（值与 `fileScale` 相同）
    - `imageMaxWidth`（值与 `fileMaxWidth` 相同）

  </Accordion>
</AccordionGroup>

模式行为摘要：

| 模式     | 返回内容                                                                                    |
| -------- | ------------------------------------------------------------------------------------------- |
| `"view"` | 仅查看器字段。                                                                              |
| `"file"` | 仅文件字段，无查看器产物。                                                                  |
| `"both"` | 查看器字段加上文件字段。如果文件渲染失败，查看器仍会返回 `fileError` 和 `imageError` 别名。 |

## 折叠未更改的部分

- 查看器可以显示像 `N unmodified lines` 这样的行。
- 这些行上的展开控件是有条件的，并不保证每种输入类型都有。
- 当渲染的差异具有可展开的上下文数据时，会出现展开控件，这在前后输入中很常见。
- 对于许多统一补丁输入，解析后的补丁块中缺少被省略的上下文主体，因此该行可能出现而没有展开控件。这是预期行为。
- `expandUnchanged` 仅在存在可展开的上下文时适用。

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
            ttlSeconds: 21600,
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
- `ttlSeconds`

显式工具参数会覆盖这些默认值。

### 持久化查看器 URL 配置

<ParamField path="viewerBaseUrl" type="string">
  当工具调用未传递 `baseUrl` 时，用于返回查看器链接的插件所有者回退值。必须是 `http` 或 `https`，不带查询/哈希。
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          viewerBaseUrl: "https://gateway.example.com/openclaw",
        },
      },
    },
  },
}
```

## 安全配置

<ParamField path="security.allowRemoteViewer" type="boolean" default="false">
  `false`：拒绝指向查看器路由的非回环请求。`true`：如果令牌化路径有效，则允许远程查看器。
</ParamField>

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
- 如果未指定，默认制品 TTL 为 30 分钟。
- 接受的最大查看器 TTL 为 6 小时。
- 清理任务会在制品创建后适时运行。
- 过期的制品会被删除。
- 当缺少元数据时，回退清理会删除超过 24 小时的陈旧文件夹。

## 查看器 URL 和网络行为

查看器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

查看器资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

查看器文档相对于查看器 URL 解析这些资源，因此可选的 `baseUrl` 路径前缀也会保留用于这两个资源请求。

URL 构建行为：

- 如果提供了工具调用 `baseUrl`，则在严格验证后使用它。
- 否则，如果配置了插件 `viewerBaseUrl`，则使用它。
- 如果没有上述任何覆盖，查看器 URL 默认为回环 `127.0.0.1`。
- 如果网关绑定模式为 `custom` 并且设置了 `gateway.customBindHost`，则使用该主机。

`baseUrl` 规则：

- 必须是 `http://` 或 `https://`。
- 查询和哈希会被拒绝。
- 允许源加上可选的基本路径。

## 安全模型

<AccordionGroup>
  <Accordion title="Viewer hardening">
    - 默认仅限环回访问。
    - 带有严格 ID 和令牌验证的令牌化查看器路径。
    - 查看器响应 CSP：
      - `default-src 'none'`
      - 脚本和资产仅来自自身
      - 无出站 `connect-src`
    - 启用远程访问时的远程未命中限流：
      - 60 秒内 40 次失败
      - 60 秒锁定 (`429 Too Many Requests`)

  </Accordion>
  <Accordion title="File rendering hardening">
    - 屏幕截图浏览器请求路由默认为拒绝。
    - 仅允许来自 `http://127.0.0.1/plugins/diffs/assets/*` 的本地查看器资产。
    - 外部网络请求被阻止。

  </Accordion>
</AccordionGroup>

## 文件模式的浏览器要求

`mode: "file"` 和 `mode: "both"` 需要兼容 Chromium 的浏览器。

解析顺序：

<Steps>
  <Step title="Config">
    `browser.executablePath` 在 OpenClaw 配置中。
  </Step>
  <Step title="Environment variables">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`</Step>

  </Step>
  <Step title="Platform fallback">
    平台命令/路径发现回退机制。
  </Step>
</Steps>

常见失败文本：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

请通过安装 Chrome、Chromium、Edge 或 Brave 来修复，或设置上述可执行路径选项之一。

## 故障排除

<AccordionGroup>
  <Accordion title="Input validation errors">
    - `Provide patch or both before and after text.` — 请同时包含 `before` 和 `after`，或提供 `patch`。
    - `Provide either patch or before/after input, not both.` — 请勿混合输入模式。
    - `Invalid baseUrl: ...` — 使用带有可选路径的 `http(s)` 源，不要查询/哈希。
    - `{field} exceeds maximum size (...)` — 请减小负载大小。
    - Large patch rejection — 请减少补丁文件数量或总行数。

  </Accordion>
  <Accordion title="Viewer accessibility">
    - 默认情况下，查看器 URL 解析为 `127.0.0.1`。
    - 对于远程访问场景，可以执行以下任一操作：
      - 设置插件 `viewerBaseUrl`，或
      - 在每次工具调用时传递 `baseUrl`，或
      - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
    - 如果 `gateway.trustedProxies`Tailscale 包含用于同主机代理的回环（例如 Tailscale Serve），则不带转发客户端 IP 标头的原始回环查看器请求将按设计失败关闭。
    - 对于该代理拓扑：
      - 如果您只需要附件，请优先使用 `mode: "file"` 或 `mode: "both"`，或
      - 当您需要可共享的查看器 URL 时，有意启用 `security.allowRemoteViewer` 并设置插件 `viewerBaseUrl` 或传递代理/公共 `baseUrl`
    - 仅当您打算进行外部查看器访问时，才启用 `security.allowRemoteViewer`。

  </Accordion>
  <Accordion title="Unmodified-lines row has no expand button">
    当补丁不包含可展开的上下文时，对于补丁输入可能会发生这种情况。这是预期行为，并不表示查看器失败。
  </Accordion>
  <Accordion title="Artifact not found">
    - 工件因 TTL 过期。
    - 令牌或路径已更改。
    - 清理操作删除了陈旧数据。

  </Accordion>
</AccordionGroup>

## 操作指南

- 对于画布中的本地交互式审查，请优先使用 `mode: "view"`。
- 对于需要附件的出站聊天渠道，请优先使用 `mode: "file"`。
- 除非您的部署需要远程查看器 URL，否则请保持 `allowRemoteViewer` 禁用状态。
- 为敏感差异设置明确的短 `ttlSeconds`。
- 如非必要，请避免在差异输入中发送机密信息。
- 如果您的渠道（例如 Telegram 或 WhatsApp）会激进地压缩图像，请优先使用 PDF 输出（TelegramWhatsApp`fileFormat: "pdf"`）。

<Note>差异渲染引擎由 [Diffs](https://diffs.com) 提供支持。</Note>

## 相关

- [浏览器](/zh/tools/browser)
- [插件](/zh/tools/plugin)
- [工具概述](/zh/tools)
