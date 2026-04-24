---
summary: "安装并使用 Codex、Claude 和 Cursor 插件包作为 OpenClaw 插件"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "插件包"
---

# 插件包

OpenClaw 可以从三个外部生态系统安装插件：**Codex**、**Claude** 和 **Cursor**。这些被称为 **插件包（bundles）**——即 OpenClaw 映射到技能、钩子和 MCP 工具等原生功能的内容和元数据包。

<Info>**插件包**与原生 OpenClaw 插件**并不**相同。原生插件在进程内运行，可以注册任何功能。插件包是内容包，具有选择性功能映射和更窄的信任边界。</Info>

## 为什么存在插件包

许多有用的插件以 Codex、Claude 或 Cursor 格式发布。OpenClaw 检测这些格式并将其支持的内容映射到原生功能集中，而无需作者将其重写为原生 OpenClaw 插件。这意味着您可以安装 Claude 命令包或 Codex 技能包并立即使用。

## 安装插件包

<Steps>
  <Step title="从目录、归档文件或市场安装">
    ```bash
    # Local directory
    openclaw plugins install ./my-bundle

    # Archive
    openclaw plugins install ./my-bundle.tgz

    # Claude marketplace
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="验证检测">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    包显示为 `Format: bundle`，其子类型为 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    映射的功能（技能、钩子、MCP 工具、LSP 默认值）在下次会话中可用。

  </Step>
</Steps>

## OpenClaw 从包中映射的内容

目前并非每个包的功能都能在 OpenClaw 中运行。以下是有效的内容以及已检测但尚未连接的内容。

### 目前支持

| 功能       | 映射方式                                                                    | 适用于         |
| ---------- | --------------------------------------------------------------------------- | -------------- |
| 技能内容   | 包技能根目录作为普通 OpenClaw 技能加载                                      | 所有格式       |
| 命令       | `commands/` 和 `.cursor/commands/` 被视为技能根目录                         | Claude, Cursor |
| 钩子包     | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                               | Codex          |
| MCP 工具   | 包 MCP 配置合并到嵌入式 Pi 设置中；支持的 stdio 和 HTTP 服务器已加载        | 所有格式       |
| LSP 服务器 | Claude `.lsp.json` 和清单中声明的 `lspServers` 合并到嵌入式 Pi LSP 默认值中 | Claude         |
| 设置       | Claude `settings.json` 作为嵌入式 Pi 默认值导入                             | Claude         |

#### 技能内容

- 包技能根目录作为普通 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为附加技能根目录
- Cursor `.cursor/commands` 根目录被视为附加技能根目录

这意味着 Claude markdown 命令文件通过普通 OpenClaw 技能
加载器工作。Cursor 命令 markdown 通过同一路径工作。

#### 钩子包

- 包钩子根目录**仅**在使用普通 OpenClaw 钩子包
  布局时有效。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 用于 Pi 的 MCP

- 已启用的包可以提供 MCP 服务器配置
- OpenClaw 将 MCP 插件包配置合并到有效的嵌入式 Pi 设置中，作为
  `mcpServers`
- OpenClaw 在嵌入式 Pi 代理轮次期间，通过启动 stdio 服务器或连接到 HTTP 服务器，暴露支持的插件包 MCP 工具
- `coding` 和 `messaging` 工具配置文件默认包含 bundle MCP 工具；对代理或网关使用 `tools.deny: ["bundle-mcp"]` 以选择退出
- 项目本地的 Pi 设置在 bundle 默认值之后仍然适用，因此工作区设置可以在需要时覆盖 bundle MCP 条目
- bundle MCP 工具目录在注册前会进行确定性排序，因此上游 `listTools()` 顺序的更改不会影响提示缓存工具块

##### 传输

MCP 服务器可以使用 stdio 或 HTTP 传输：

**Stdio** 启动子进程：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "PORT": "3000" }
      }
    }
  }
}
```

**HTTP** 默认通过 `sse` 连接到正在运行的 MCP 服务器，或者在请求时通过 `streamable-http` 连接：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "http://localhost:3100/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${MY_SECRET_TOKEN}"
        },
        "connectionTimeoutMs": 30000
      }
    }
  }
}
```

- `transport` 可以设置为 `"streamable-http"` 或 `"sse"`；如果省略，OpenClaw 将使用 `sse`
- 仅允许 `http:` 和 `https:` URL 方案
- `headers` 值支持 `${ENV_VAR}` 插值
- 同时包含 `command` 和 `url` 的服务器条目将被拒绝
- URL 凭据（用户信息和查询参数）会从工具描述和日志中删除
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输默认的 30 秒连接超时时间

##### 工具命名

OpenClaw 使用提供商安全名称的形式注册 bundle MCP 工具
`serverName__toolName`。例如，一个键为 `"vigil-harbor"` 并公开
`memory_search` 工具的服务器会注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符将被替换为 `-`
- 服务器前缀上限为 30 个字符
- 完整工具名称上限为 64 个字符
- 空服务器名称将回退到 `mcp`
- 冲突的清理名称将通过数字后缀进行消除歧义
- 最终公开的工具顺序按安全名称确定，以保持重复的 Pi
  轮次缓存稳定
- profile filtering treats all tools from one bundle MCP server as plugin-owned
  by `bundle-mcp`, so profile allowlists and deny lists can include either
  individual exposed 工具 names or the `bundle-mcp` plugin key

#### Embedded Pi settings

- Claude `settings.json` is imported as default embedded Pi settings when the
  bundle is enabled
- OpenClaw sanitizes shell override keys before applying them

Sanitized keys:

- `shellPath`
- `shellCommandPrefix`

#### Embedded Pi LSP

- enabled Claude bundles can contribute LSP server config
- OpenClaw loads `.lsp.json` plus any manifest-declared `lspServers` paths
- bundle LSP config is merged into the effective embedded Pi LSP defaults
- 目前仅支持基于 stdio 的 LSP 服务器运行；不支持的传输方式仍会显示在 `openclaw plugins inspect <id>` 中

### 已检测但未执行

这些项目会被识别并显示在诊断信息中，但 OpenClaw 不会运行它们：

- Claude `agents`、`hooks.json` 自动化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- 能力报告之外的 Codex 内联/应用元数据

## Bundle 格式

<AccordionGroup>
  <Accordion title="Codex 插件包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 插件包使用技能根目录和 OpenClaw 风格的
    hook-pack 目录（`HOOK.md` + `handler.ts`）时，最适合 OpenClaw。

  </Accordion>

  <Accordion title="Claude bundles">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 被视为技能内容
    - `settings.json` 被导入到嵌入式 Pi 设置中（shell 覆盖键会被清理）
    - `.mcp.json` 向嵌入式 Pi 公受支持的 stdio 工具
    - `.lsp.json` 加上清单中声明的 `lspServers` 路径会加载到嵌入式 Pi LSP 默认值中
    - `hooks/hooks.json` 会被检测但不会被执行
    - 清单中的自定义组件路径是累加的（它们扩展默认值，而不是替换它们）

  </Accordion>

  <Accordion title="Cursor bundles">
    标记: `.cursor-plugin/plugin.json`

    可选内容: `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` 被视为技能内容
    - `.cursor/rules/`, `.cursor/agents/` 和 `.cursor/hooks.json` 仅用于检测

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 会首先检查原生插件格式：

1. `openclaw.plugin.json` 或带有 `openclaw.extensions` 的有效 `package.json` — 视为 **原生插件**
2. Bundle 标记（`.codex-plugin/`、`.claude-plugin/` 或默认的 Claude/Cursor 布局）——被视为 **bundle**

如果一个目录同时包含两者，OpenClaw 将使用本机路径。这可以防止双格式包被部分安装为 bundle。

## 安全性

Bundle 具有比本机插件更窄的信任边界：

- OpenClaw **不会**在进程内加载任意 bundle 运行时模块
- Skills 和 hook 包路径必须保持在插件根目录内（经过边界检查）
- 读取设置文件时会进行相同的边界检查
- 支持的 stdio MCP 服务器可以作为子进程启动

这使得 bundle 默认情况下更安全，但对于它们确实公开的功能，您仍应将第三方 bundle 视为受信任的内容。

## 故障排除

<AccordionGroup>
  <Accordion title="检测到 Bundle 但功能未运行">
    运行 `openclaw plugins inspect <id>`。如果列出了某个功能但标记为
    未连接，那是产品限制——并非安装损坏。
  </Accordion>

<Accordion title="未出现 Claude 命令文件">请确保 Bundle 已启用，且 markdown 文件位于检测到的 `commands/` 或 `skills/` 根目录内。</Accordion>

<Accordion title="Claude 设置未生效">仅支持来自 `settings.json` 的嵌入式 Pi 设置。OpenClaw 不会 将 Bundle 设置视为原始配置补丁。</Accordion>

  <Accordion title="Claude hooks do not execute">
    `hooks/hooks.json` 仅用于检测。如果你需要可运行的 hooks，请使用
    OpenClaw hook-pack 布局或提供一个原生插件。
  </Accordion>
</AccordionGroup>

## 相关

- [安装和配置插件](/zh/tools/plugin)
- [构建插件](/zh/plugins/building-plugins) — 创建一个原生插件
- [插件清单](/zh/plugins/manifest) — 原生清单模式
