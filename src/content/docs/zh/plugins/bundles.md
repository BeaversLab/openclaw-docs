---
summary: "安装并使用 Codex、Claude 和 Cursor 插件包作为 OpenClaw 插件"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "插件包"
---

OpenClaw 可以从三个外部生态系统安装插件：**Codex**、**Claude**
和 **Cursor**。这些被称为 **包 (bundles)** —— 内容和元数据包，
OpenClaw 将其映射到原生功能，如技能、钩子和 MCP 工具。

<Info>包与原生 OpenClaw 插件 **不** 相同。原生插件在 进程内运行，可以注册任何功能。包是内容包，具有 选择性功能映射和更窄的信任边界。</Info>

## 为什么存在包

许多有用的插件以 Codex、Claude 或 Cursor 格式发布。无需
要求作者将其重写为原生 OpenClaw 插件，OpenClaw
会检测这些格式并将其支持的内容映射到原生功能
集。这意味着您可以安装 Claude 命令包或 Codex 技能包
并立即使用它。

## 安装包

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

    插件包显示为 `Format: bundle`，子类型为 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    映射的功能（技能、钩子、MCP 工具、LSP 默认值）将在下一次会话中可用。

  </Step>
</Steps>

## OpenClaw 从插件包映射的内容

目前并非所有插件包功能都能在 OpenClaw 中运行。以下是有效功能以及已检测但尚未连接的功能。

### 目前支持

| 功能       | 映射方式                                                                                      | 适用范围       |
| ---------- | --------------------------------------------------------------------------------------------- | -------------- |
| 技能内容   | 插件包技能根目录作为普通 OpenClaw 技能加载                                                    | 所有格式       |
| 命令       | `commands/` 和 `.cursor/commands/` 被视为技能根目录                                           | Claude、Cursor |
| 钩子包     | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                                                 | Codex          |
| MCP 工具   | Bundle MCP 配置已合并到嵌入式 OpenClaw 设置中；支持的 stdio 和 HTTP 服务器已加载              | 所有格式       |
| LSP 服务器 | Claude `.lsp.json` 和清单中声明的 `lspServers`OpenClaw 已合并到嵌入式 OpenClaw LSP 默认设置中 | Claude         |
| 设置       | Claude `settings.json`OpenClaw 已作为嵌入式 OpenClaw 默认设置导入                             | Claude         |

#### 技能内容

- bundle 技能根目录作为普通的 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为额外的技能根目录
- Cursor `.cursor/commands` 根目录被视为额外的技能根目录

这意味着 Claude markdown 命令文件可以通过普通的 OpenClaw 技能
加载器工作。Cursor 命令 markdown 也通过同一路径工作。

#### 钩子包

- bundle 钩子根目录**仅**在使用普通的 OpenClaw 钩子包
  布局时才有效。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### MCP 用于嵌入式 OpenClaw

- 已启用的 bundle 可以提供 MCP 服务器配置
- OpenClaw 将 bundle MCP 配置合并到有效的嵌入式 OpenClaw 设置中，作为
  OpenClawOpenClaw`mcpServers`
- OpenClaw 在嵌入式 OpenClaw 代理轮次期间，通过启动 stdio 服务器或连接到 HTTP 服务器来暴露受支持的 bundle MCP 工具
- `coding` 和 `messaging` 工具配置文件默认
  包含包 MCP 工具；使用 `tools.deny: ["bundle-mcp"]` 为代理或网关选择退出
- 项目本地的嵌入式代理设置在 bundle 默认设置之后仍然适用，因此工作区
  设置可以在需要时覆盖 bundle MCP 条目
- 包 MCP 工具目录在注册前经过确定性排序，因此
  上游 `listTools()` 顺序的更改不会破坏提示缓存工具块

##### 传输方式

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

- `transport` 可以设置为 `"streamable-http"` 或 `"sse"`；如果省略，OpenClaw 使用 `sse`
- `type: "http"` 是 CLI 原生下游形状；在 OpenClaw 配置中使用 `transport: "streamable-http"`。`openclaw mcp set` 和 `openclaw doctor --fix` 规范化通用别名。
- 仅允许 `http:` 和 `https:` URL 方案
- `headers` 值支持 `${ENV_VAR}` 插值
- 同时具有 `command` 和 `url` 的服务器条目将被拒绝
- URL 凭据（用户信息和查询参数）会从工具描述和日志中删除
- `connectionTimeoutMs` 覆盖了 stdio 和 HTTP 传输的默认 30 秒连接超时

##### 工具命名

OpenClaw 会以提供商安全名称的形式注册捆绑包 MCP OpenClaw，格式为 `serverName__toolName`。例如，键为 `"vigil-harbor"` 且公开 `memory_search` OpenClaw 的服务器会注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符会被替换为 `-`
- 以非字母开头的片段会获得一个字母前缀，因此数字服务器键（如 `12306`）会成为对提供商安全的工具前缀
- 服务器前缀限制为 30 个字符
- 完整的工具名称限制为 64 个字符
- 空的服务器名称会回退到 `mcp`
- 冲突的清理后名称将通过数字后缀进行消歧
- 最终暴露的工具顺序按安全名称确定，以保持重复的嵌入式代理
  轮次缓存稳定
- 配置文件过滤会将来自同一个 bundle MCP 服务器的所有工具视为由 `bundle-mcp` 拥有的插件，因此配置文件的允许列表和拒绝列表可以包含单独暴露的工具名称或 `bundle-mcp` 插件键

#### 嵌入式 OpenClaw 设置

- 当 bundle 启用时，Claude `settings.json`OpenClaw 将作为默认的嵌入式 OpenClaw 设置导入
- OpenClaw 在应用 shell 覆盖键之前会对其进行清理

清理后的键：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 OpenClaw LSP

- 启用的 Claude bundles 可以提供 LSP 服务器配置
- OpenClaw 会加载 OpenClaw`.lsp.json` 以及任何清单声明的 `lspServers` 路径
- bundle LSP 配置已合并到有效的嵌入式 OpenClaw LSP 默认设置中
- 目前只有受支持的 stdio 支持的 LSP 服务器可以运行；不支持的传输方式仍会显示在 `openclaw plugins inspect <id>` 中

### 已检测但未执行

这些内容会被识别并显示在诊断信息中，但 OpenClaw 不会运行它们：

- Claude `agents`、`hooks.json` 自动化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- 除能力报告之外的 Codex 内联/应用元数据

## Bundle 格式

<AccordionGroup>
  <Accordion title="Codex 包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 包使用技能根目录和 OpenClaw 风格的
    hook-pack 目录（`HOOK.md` + `handler.ts`）时，最适配 OpenClaw。

  </Accordion>

  <Accordion title="Claude bundles">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特有行为：

    - `commands/` 被视为技能内容
    - `settings.json` 被导入到嵌入式 OpenClaw 设置中（Shell 覆盖键会被清理）
    - `.mcp.json` 向嵌入式 OpenClaw 暴露支持的 stdio 工具
    - `.lsp.json` 加上清单中声明的 `lspServers` 路径会加载到嵌入式 OpenClaw LSP 默认值中
    - `hooks/hooks.json` 会被检测但不会被执行
    - 清单中的自定义组件路径是累加的（它们会扩展默认值，而不是替换它们）

  </Accordion>

  <Accordion title="Cursor 包">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被视为技能内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅用于检测

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 会首先检查原生插件格式：

1. `openclaw.plugin.json` 或带有 `openclaw.extensions` 的有效 `package.json` — 被视为 **原生插件**
2. Bundle 标记（`.codex-plugin/`、`.claude-plugin/` 或默认的 Claude/Cursor 布局）— 被视为 **bundle**

如果目录同时包含两者，OpenClaw 将使用原生路径。这可以防止双格式包被部分作为 bundle 安装。

## 运行时依赖与清理

- 第三方兼容的 bundle 不会获得启动时 `npm install` 修复。它们应该通过 `openclaw plugins install` 安装，并在已安装的插件目录中包含所需的一切。
- OpenClaw 拥有的捆绑插件要么在核心中轻量级提供，要么可通过插件安装程序下载。Gateway(网关) 启动永远不会为它们运行包管理器。
- `openclaw doctor --fix` 会删除旧的临时依赖目录，并且可以在配置引用时恢复本地插件索引中缺少的可下载插件。

## 安全性

Bundles 比原生插件具有更窄的信任边界：

- OpenClaw **不会** 在进程中加载任意的 bundle 运行时模块
- Skills 和 hook-pack 路径必须保留在插件根目录内（经过边界检查）
- 设置文件读取时会进行相同的边界检查
- 支持的 stdio MCP 服务器可以作为子进程启动

这使得 bundles 默认情况下更安全，但对于它们确实暴露的功能，您仍应将第三方 bundles 视为受信任的内容。

## 故障排除

<AccordionGroup>
  <Accordion title="Bundle 已检测到但功能未运行">
    运行 `openclaw plugins inspect <id>`。如果列出了某个功能但标记为
    未连接，则这是产品限制 — 而不是安装损坏。
  </Accordion>

<Accordion title="Claude 命令文件未出现">确保 bundle 已启用，且 markdown 文件位于检测到的 `commands/` 或 `skills/` 根目录内。</Accordion>

<Accordion title="Claude settings do not apply">仅支持来自 `settings.json` 的嵌入式 OpenClaw 设置。OpenClaw 不会将 bundle 设置视为原始配置补丁。</Accordion>

  <Accordion title="Claude 钩子不执行">
    `hooks/hooks.json`OpenClaw 仅用于检测。如果您需要可运行的钩子，请使用
    OpenClaw hook-pack 布局或提供原生插件。
  </Accordion>
</AccordionGroup>

## 相关

- [安装和配置插件](/zh/tools/plugin)
- [构建插件](/zh/plugins/building-plugins) — 创建原生插件
- [插件清单](/zh/plugins/manifest) — 原生清单架构
