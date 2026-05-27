---
summary: "OpenClaw将 Codex、Claude 和 Cursor 兼容的包作为 OpenClaw 插件安装"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to know which bundle features OpenClaw executes
  - You are debugging bundle detection, MCP tools, LSP defaults, or missing capabilities
title: "插件包"
doc-schema-version: 1
---

插件包让 OpenClaw 能够复用兼容的 Codex、Claude 和 Cursor 插件布局，而无需将它们作为原生 OpenClaw 运行时模块加载。当您已有现有包并需要安装它、验证 OpenClaw 如何对其进行分类，以及了解哪些部分会成为 OpenClaw 技能、钩子、MCP 工具、设置或诊断信息时，请使用此页面。

<Info>包不是原生 OpenClaw 插件。原生插件在进程中运行，并且可以直接注册 OpenClaw 功能。包是内容和数据包，OpenClaw 会选择性地将其映射到支持的界面中。</Info>

## 选择正确的插件格式

当您已经拥有 Codex、Claude 或 Cursor 兼容的包，并希望 OpenClaw 将其受支持的内容映射为技能、钩子包、MCP 工具、设置或 LSP 默认值，而无需将其重写为原生插件时，请使用包。当集成必须注册渠道、提供商、服务、HTTP 路由、Gateway 方法、插件拥有的 CLI 命令或其他运行时功能时，请构建原生 OpenClaw 插件。

| 需要                                                             | 使用     |
| ---------------------------------------------------------------- | -------- |
| 从兼容的生态系统中复用技能、命令 markdown、MCP 配置或 LSP 默认值 | 包       |
| 在 OpenClaw 中执行任意插件运行时代码                             | 原生插件 |
| 发布完整的 OpenClaw 功能                                         | 原生插件 |
| 移植现有的 Claude 或 Cursor 命令包                               | 包       |

关于原生插件创作，请参阅[构建插件](/zh/plugins/building-plugins)；关于主要安装工作流，请参阅[插件](/zh/tools/plugin)。

## 安装并验证包

<Steps>
  <Step title="安装该包">
    从本地目录、存档或受支持的市场源进行安装：

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

  <Step title="检查检测">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    兼容的捆绑包将显示 `Format: bundle` 和 `codex`、`claude`
    或 `cursor` 子类型。

  </Step>

  <Step title="Gateway(网关)重启 Gateway">
    ```bash
    openclaw gateway restart
    ```Gateway(网关)

    安装或更新插件代码需要重启 Gateway。

  </Step>
</Steps>

## OpenClaw 从捆绑包映射的内容

目前并非所有捆绑包功能都在 OpenClaw 中运行。OpenClaw 将支持的内容映射到原生界面，并在插件诊断中报告仅检测到的内容。

### 目前支持

| 功能       | 映射方式                                                                    | 适用对象       |
| ---------- | --------------------------------------------------------------------------- | -------------- |
| 技能内容   | 捆绑包技能根目录作为普通 OpenClaw 技能加载                                  | 所有格式       |
| 命令       | `commands/` 和 `.cursor/commands/` 被视为技能根目录                         | Claude, Cursor |
| Hook 包    | OpenClaw 风格的 OpenClaw`HOOK.md` 和 `handler.ts` 或 `handler.js` 布局      | 主要是 Codex   |
| MCP 工具   | 捆绑包 MCP 配置合并到嵌入式 Pi 设置中；支持的 stdio 和 HTTP 服务器会加载    | 所有格式       |
| LSP 服务器 | Claude `.lsp.json` 和清单中声明的 `lspServers` 合并到嵌入式 Pi LSP 默认值中 | Claude         |
| 设置       | 移除 shell 覆盖键后，Claude `settings.json` 作为嵌入式 Pi 默认值导入        | Claude         |

### 技能内容

捆绑包技能根目录作为普通 OpenClaw 技能根目录加载。Claude OpenClaw`commands/` 和
Cursor `.cursor/commands/` 通过相同的路径加载。

### Hook 包

捆绑包 hook 根目录**仅**在使用普通 OpenClaw hook-pack 布局时运行：
OpenClaw`HOOK.md` 包含 `handler.ts` 或 `handler.js`。目前这主要是
Codex 兼容的情况。

### MCP 工具

已启用的插件包可以将 MCP 服务器配置作为 `mcpServers` 贡献给嵌入式 Pi。
支持的 stdio 和 HTTP 服务器可以在嵌入式 Pi 轮次期间暴露工具。`coding` 和 `messaging` 工具配置文件默认包含插件包 MCP 工具；使用 `tools.deny: ["bundle-mcp"]`Gateway(网关) 可以为某个代理或 Gateway(网关)选择退出。

### 嵌入式 Pi 设置

当插件包启用时，Claude `settings.json`OpenClaw 会作为默认的嵌入式 Pi 设置导入。OpenClaw 会在应用它们之前移除 shell 覆盖键。

### 嵌入式 Pi LSP

Claude `.lsp.json` 和清单中声明的 `lspServers` 会合并到嵌入式 Pi LSP 默认设置中。支持的 stdio 支持的 LSP 服务器可以运行。

### 已检测但未执行

OpenClaw 会在诊断中报告这些内容，但不会运行它们：

- Claude `agents`、`hooks/hooks.json`、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 应用或内联元数据

## 插件包格式和检测

OpenClaw 会先检查原生插件标记，然后再检查插件包标记。包含 OpenClaw`openclaw.plugin.json` 或有效的 `package.json` `openclaw.extensions` 条目的目录会被视为原生插件，即使它也包含插件包文件。这可以防止双格式包通过插件包路径被部分加载。

完成原生检测后，OpenClaw 会识别以下插件包布局：

<AccordionGroup>
  <Accordion title="Codex bundles">
    标记：`.codex-plugin/plugin.json`

    支持的映射内容：`skills/`、`hooks/`、`.mcp.json` 和 `.app.json`OpenClawOpenClaw
    能力报告。

    当 Codex 插件包使用技能根目录和 OpenClaw 风格的 hook-pack 目录时，最适配 OpenClaw。

  </Accordion>

  <Accordion title="Claude bundles">
    检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局，包含 `skills/`、`commands/`、
      `agents/`、`hooks/hooks.json`、`.mcp.json`、`.lsp.json` 或
      `settings.json`

    支持的映射内容：`skills/`、`commands/`、`settings.json`、
    `.mcp.json`、`.lsp.json`、清单声明的 `mcpServers` 和
    清单声明的 `lspServers`。

    仅检测内容：`agents`、`hooks/hooks.json` 和 `outputStyles`。

  </Accordion>

  <Accordion title="Cursor bundles">
    标记：`.cursor-plugin/plugin.json`

    支持的映射内容：`skills/`、`.cursor/commands/` 和 `.mcp.json`。

    仅检测内容：`.cursor/agents`、`.cursor/hooks.json` 和
    `.cursor/rules`。

  </Accordion>
</AccordionGroup>

Claude 清单组件路径是累加的。声明自定义路径会扩展包中现有的默认路径，而不是替换它们。

## MCP 配置参考

Bundle MCP 工具使用合成插件键 `bundle-mcp` 进行配置文件过滤。
要为代理或 Gateway(网关) 选择退出，请拒绝该键：

```json5
{
  tools: {
    deny: ["bundle-mcp"],
  },
}
```

项目本地嵌入式 Pi 设置仍然在 Bundle 默认设置之后应用，因此工作区设置可以在需要时覆盖 Bundle MCP 条目。

### MCP 配置结构

Bundle MCP 文件可以使用 `mcpServers`、`servers` 或顶层服务器映射。
Stdio 服务器会启动子进程：

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "PORT": "3000" }
    }
  }
}
```

HTTP 服务器默认通过 `sse` 连接，或在请求时通过 `streamable-http` 连接：

```json
{
  "mcpServers": {
    "my-server": {
      "url": "http://localhost:3100/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer local-dev-token"
      },
      "connectionTimeoutMs": 30000
    }
  }
}
```

规则：

- `transport` 可以是 `"sse"` 或 `"streamable-http"`OpenClaw。如果省略，OpenClaw
  将使用 `sse`。
- `type: "http"`CLI 是一个 CLI 原生的下游别名。在捆绑包配置中首选
  `transport: "streamable-http"`；`openclaw mcp set` 和
  `openclaw doctor --fix` 会对该别名进行规范化。
- 仅支持 `http:` 和 `https:` URL。
- `headers` 必须是一个具有字符串兼容值的 JSON 对象。
- 带有 `command` 的服务器条目被视为 stdio。带有 `url`
  且没有命令的服务器条目被视为 HTTP。
- URL 凭证（包括用户信息和查询参数）会从工具
  描述和日志中编辑掉。
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输默认的 30 秒连接超时。

为了 stdio 启动安全，不支持的环境变量条目将被忽略，
并生成诊断信息，而不是盲目传递。

### MCP 路径和工具名称

基于文件的 MCP 配置是相对于声明它的捆绑包文件进行解析的。
显式相对 `command`、`args`、`cwd` 和 `workingDirectory` 值
会根据该文件的目录进行扩展。Claude 捆绑包配置也可以使用
`${CLAUDE_PLUGIN_ROOT}` 来引用捆绑包根目录。

OpenClaw 使用对提供商安全的名称注册捆绑包 MCP 工具：

```text
serverName__toolName
```

命名规则：

- `A-Za-z0-9_-` 之外的字符将变为 `-`。
- 服务器前缀必须以字母开头；数字服务器键将获得 `mcp-`
  前缀。
- 空的服务器名称将回退到 `mcp`。
- 服务器前缀最多为 30 个字符。
- 完整的工具名称最多为 64 个字符。
- 冲突的规范化名称将获得数字后缀。
- 公开的工具按安全名称确定性地排序，以便重复的 Pi 轮次
  保持稳定的工具块。
- Profile 允许列表和拒绝列表可以命名单个公开的工具或
  `bundle-mcp` 插件键。

## 嵌入式 Pi 设置和 LSP 默认值

已启用的 Claude 包可以为嵌入式
Pi 运行时提供 `settings.json` 默认值。OpenClaw 会在应用项目本地设置之前应用这些设置，然后
清理 shell 覆盖键，以便包或工作区设置无法更改
shell 执行行为。

已清理的键：

- `shellPath`
- `shellCommandPrefix`

已启用的 Claude 包还可以通过 `.lsp.json`
或清单中声明的 `lspServers` 提供 LSP 服务器配置。OpenClaw 会将这些条目合并到嵌入式
Pi LSP 默认值中。受支持的 stdio 后端 LSP 服务器可以运行；不受支持的
服务器条目仍会出现在 `openclaw plugins inspect <id>` 诊断中。

## 运行时依赖和清理

第三方兼容包不会获得启动 `npm install` 修复。请使用
`openclaw plugins install` 安装它们，并将其运行所需的每个运行时文件
打包在已安装的插件目录中。

OpenClaw 拥有的打包插件要么作为轻量级组件包含在核心中，
要么可通过插件安装程序下载。Gateway(网关) 启动时不会为它们
运行包管理器。`openclaw doctor --fix` 可以删除旧版暂存
依赖目录，并恢复配置引用但本地插件索引中
丢失的可下载插件。

## 安全边界

包的运行时边界比原生插件更窄：

- OpenClaw 不会在进程中加载任意包运行时模块。
- 读取技能根目录、hook pack 路径、设置文件、MCP 文件和 LSP 文件时
  会进行插件根目录边界检查。
- OpenClaw 风格的 hook pack 必须保留在插件根目录内。
- 受支持的 stdio MCP 服务器仍然可以启动子进程。

应将第三方包视为其公开的映射功能的受信任内容，
尤其是 MCP 服务器和 hook pack。

## 故障排除

| 症状                          | 检查                                                          | 修复                                                                       |
| ----------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 功能已列出但未运行            | 运行 `openclaw plugins inspect <id>` 并检查其是否标记为未连接 | 这是当前产品的限制，而非安装损坏                                           |
| Claude 命令文件未显示为技能   | 检查 markdown 文件是否位于 `commands/` 或声明的命令路径内     | 将文件移动到检测到的 `commands/` 或 `skills/` 根目录下，启用该包，然后重启 |
| Claude `settings.json` 未生效 | 检查该包是否已启用并检查诊断信息                              | 仅导入嵌入式 Pi 设置；shell 覆盖键将被移除                                 |
| Claude 钩子未执行             | 检查该包是否只有 `hooks/hooks.json`                           | 使用 OpenClaw hook-pack 布局或提供原生插件                                 |

## 相关

- [插件](/zh/tools/plugin) - 安装、配置和排查插件问题
- [管理插件](/zh/plugins/manage-plugins) - 常用插件 CLI 示例
- [插件清单](/zh/plugins/plugin-inventory) - 生成的内置和外部插件列表
- [插件清单](/zh/plugins/manifest) - 原生插件清单架构
- [构建插件](/zh/plugins/building-plugins) - 创建原生插件
