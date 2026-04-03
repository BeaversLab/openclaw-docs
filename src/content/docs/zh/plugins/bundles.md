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
  <Step title="Install from a directory, archive, or marketplace">
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

    插件包显示为 `Format: bundle`，子类型为 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    映射的功能（技能、钩子、MCP 工具）将在下次会话中可用。

  </Step>
</Steps>

## OpenClaw 从插件包映射的内容

目前并非所有插件包功能都能在 OpenClaw 中运行。以下是有效功能以及已检测但尚未连接的功能。

### 目前支持

| 功能     | 映射方式                                                                   | 适用范围       |
| -------- | -------------------------------------------------------------------------- | -------------- |
| 技能内容 | 插件包技能根目录作为普通 OpenClaw 技能加载                                 | 所有格式       |
| 命令     | `commands/` 和 `.cursor/commands/` 被视为技能根目录                        | Claude、Cursor |
| 钩子包   | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                              | Codex          |
| MCP 工具 | 插件包 MCP 配置合并到嵌入式 Pi 设置中；受支持的 stdio 和 HTTP 服务器已加载 | 所有格式       |
| 设置     | Claude `settings.json` 作为嵌入式 Pi 默认值导入                            | Claude         |

#### 技能内容

- 插件包技能根目录作为普通 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为附加技能根目录
- Cursor `.cursor/commands` 根目录被视为附加技能根目录

这意味着 Claude markdown 命令文件通过普通的 OpenClaw 技能加载器工作。Cursor 命令 markdown 通过相同路径工作。

#### 钩子包

- 插件包钩子根目录 **仅** 在它们使用普通 OpenClaw 钩子包布局时才工作。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### MCP for Pi

- 已启用的插件包可以提供 MCP 服务器配置
- OpenClaw 将插件包 MCP 配置合并为有效的嵌入式 Pi 设置，作为 `mcpServers`
- OpenClaw 在嵌入式 Pi 代理回合期间通过启动 stdio 服务器或连接到 HTTP 服务器来公开受支持的插件包 MCP 工具
- 项目本地 Pi 设置在插件包默认值之后仍然应用，因此工作区设置可以在需要时覆盖插件包 MCP 条目

##### 传输方式

MCP 服务器可以使用 stdio 或 HTTP 传输方式：

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
- 包含 `command` 和 `url` 两者 的服务器条目将被拒绝
- URL 凭证（用户信息和查询参数）会从工具描述和日志中编辑掉
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输默认的 30 秒连接超时

##### 工具命名

OpenClaw 以 `serverName__toolName` 的形式注册提供商安全名称的 bundle MCP 工具。例如，键为 `"vigil-harbor"` 且暴露 `memory_search` 工具的服务器注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符将被替换为 `-`
- 服务器前缀限制为 30 个字符
- 完整工具名称限制为 64 个字符
- 空服务器名称将回退到 `mcp`
- 冲突的清理名称通过数字后缀进行消歧

#### 嵌入式 Pi 设置

- 当 bundle 被启用时，Claude `settings.json` 被导入为默认的嵌入式 Pi 设置
- OpenClaw 在应用 shell 覆盖键之前会对其进行清理

已清理的键：

- `shellPath`
- `shellCommandPrefix`

### 已检测但未执行

这些内容会被识别并显示在诊断信息中，但 OpenClaw 不会运行它们：

- Claude `agents`，`hooks.json` 自动化，`lspServers`，`outputStyles`
- Cursor `.cursor/agents`，`.cursor/hooks.json`，`.cursor/rules`
- 超出能力报告的 Codex 内联/应用元数据

## Bundle 格式

<AccordionGroup>
  <Accordion title="Codex bundles">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 包使用技能根目录和 OpenClaw 风格的
    hook-pack 目录（`HOOK.md` + `handler.ts`）时，最适合 OpenClaw。

  </Accordion>

  <Accordion title="Claude bundles">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 被视为技能内容
    - `settings.json` 被导入到嵌入式 Pi 设置中（Shell 覆盖键会被清理）
    - `.mcp.json` 将支持的 stdio 工具暴露给嵌入式 Pi
    - `hooks/hooks.json` 被检测到但不会被执行
    - 清单中的自定义组件路径是累加的（它们扩展默认值，而不是替换它们）

  </Accordion>

  <Accordion title="Cursor bundles">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被视为技能内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅用于检测

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 首先检查原生插件格式：

1. `openclaw.plugin.json` 或包含 `openclaw.extensions` 的有效 `package.json` — 视为 **原生插件**
2. Bundle 标记（`.codex-plugin/`、`.claude-plugin/` 或默认 Claude/Cursor 布局）— 视为 **包 (bundle)**

如果目录同时包含两者，OpenClaw 将使用原生路径。这可以防止双格式包被部分安装为 Bundle。

## 安全性

Bundle 的信任边界比原生插件更窄：

- OpenClaw **不会**在进程中加载任意的 Bundle 运行时模块
- Skills 和 hook-pack 的路径必须保持在插件根目录内（经过边界检查）
- 读取设置文件时会进行相同的边界检查
- 支持的 stdio MCP 服务器可能会作为子进程启动

这使得 Bundle 默认情况下更安全，但对于第三方 Bundle 暴露的功能，您仍应将其视为受信任的内容。

## 故障排除

<AccordionGroup>
  <Accordion title="检测到 Bundle 但功能未运行">
    运行 `openclaw plugins inspect <id>`。如果列出了某个功能但标记为
    未连接（not wired），则是产品限制——而不是安装损坏。
  </Accordion>

<Accordion title="未显示 Claude 命令文件">请确保 Bundle 已启用，且 markdown 文件位于检测到的 `commands/` 或 `skills/` 根目录内。</Accordion>

<Accordion title="Claude 设置未生效">仅支持来自 `settings.json` 的嵌入式 Pi 设置。OpenClaw 不会 将 Bundle 设置视为原始配置补丁。</Accordion>

  <Accordion title="Claude 钩子未执行">
    `hooks/hooks.json` 仅用于检测。如果您需要可运行的钩子，请使用
    OpenClaw hook-pack 布局或打包一个原生插件。
  </Accordion>
</AccordionGroup>

## 相关

- [安装和配置插件](/en/tools/plugin)
- [构建插件](/en/plugins/building-plugins) — 创建一个原生插件
- [插件清单](/en/plugins/manifest) — 原生清单架构
