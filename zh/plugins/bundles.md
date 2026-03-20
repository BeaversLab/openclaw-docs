---
summary: "OpenClaw 中 Codex、Claude 和 Cursor 包的统一包格式指南"
read_when:
  - 您想要安装或调试 Codex、Claude 或 Cursor 兼容的包
  - 您需要了解 OpenClaw 如何将包内容映射到原生功能
  - 您正在记录包兼容性或当前支持限制
title: "Plugin Bundles"
---

# Plugin bundles

OpenClaw 支持一类共享的外部插件包：**bundle
plugins**。

如今这意味着三个紧密相关的生态系统：

- Codex bundles
- Claude bundles
- Cursor bundles

OpenClaw 在 `openclaw plugins list` 中将它们全部显示为 `Format: bundle`。
详细输出和 `openclaw plugins inspect <id>` 也会显示子类型
(`codex`、`claude` 或 `cursor`)。

相关：

- 插件系统概述：[Plugins](/zh/tools/plugin)
- CLI 安装/列表流程：[plugins](/zh/cli/plugins)
- Native manifest schema: [Plugin manifest](/zh/plugins/manifest)

## What a bundle is

包是一个 **内容/元数据包**，而不是原生的进程内 OpenClaw
插件。

目前，OpenClaw 并 **不** 在进程内执行包运行时代码。相反，
它会检测已知的包文件，读取元数据，并将支持的包
内容映射到原生的 OpenClaw 界面，例如技能、hook 包、MCP 配置
和嵌入式 Pi 设置。

这是主要的信任边界：

- 原生 OpenClaw 插件：运行时模块在进程内执行
- 包：元数据/内容包，具有选择性功能映射

## Shared bundle 模型

Codex、Claude 和 Cursor 包非常相似，OpenClaw 将它们
视为一个标准化模型。

Shared idea:

- 一个小型的清单文件，或默认的目录布局
- 一个或多个内容根目录，例如 `skills/` 或 `commands/`
- 可选的工具/运行时元数据，例如 MCP、hooks、agents 或 LSP
- 作为目录或归档文件安装，然后在常规插件列表中启用

Common OpenClaw behavior:

- 检测包子类型
- 将其标准化为一个内部包记录
- 将支持的部分映射到原生 OpenClaw 功能
- 将不支持的部分报告为已检测但未连接的功能

实际上，大多数用户首先不需要考虑特定于供应商的格式。更有用的问题是：OpenClaw 目前映射哪些 bundle 界面？

## 检测顺序

OpenClaw 在处理 bundle 之前优先考虑原生 OpenClaw 插件/包布局。

实际效果：

- `openclaw.plugin.json` 优先于 bundle 检测
- 包含有效 `package.json` + `openclaw.extensions` 的包安装使用
  原生安装路径
- 如果一个目录同时包含原生和 bundle 元数据，OpenClaw 会将其
  优先视为原生

这避免了将双格式包部分安装为 bundle，然后
  随后作为原生插件加载它。

## 目前支持的功能

OpenClaw 将 bundle 元数据标准化为一个内部 bundle 记录，然后将
  支持的界面映射到现有的原生行为。

### 目前已支持

#### 技能内容

- bundle 技能根目录作为普通 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为附加的技能根目录
- Cursor `.cursor/commands` 根目录被视为附加的技能根目录

这意味着 Claude markdown 命令文件通过普通 OpenClaw 技能
  加载器工作。Cursor 命令 markdown 通过相同路径工作。

#### Hook 包

- bundle hook 根目录**仅**在使用普通 OpenClaw hook-pack
  布局时才工作。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 适用于 Pi 的 MCP

- 启用的 bundle 可以贡献 MCP 服务器配置
- OpenClaw 将 bundle MCP 配置合并到有效的嵌入式 Pi 设置中，作为
  `mcpServers`
- OpenClaw 还通过将支持的 stdio MCP 服务器作为子进程启动，在嵌入式 Pi 代理
  轮次期间暴露支持的 bundle MCP 工具
- 项目本地 Pi 设置仍然在 bundle 默认设置之后应用，因此工作区
  设置可以在需要时覆盖 bundle MCP 条目

#### 嵌入式 Pi 设置

- 当 bundle 启用时，Claude `settings.json` 被导入为默认嵌入式 Pi 设置
- OpenClaw 在应用 shell 覆盖键之前会对其进行清理

已清理的键：

- `shellPath`
- `shellCommandPrefix`

### 已检测到但未执行

这些表面会被检测到，显示在 bundle 功能中，并可能出现在
诊断/信息输出中，但 OpenClaw 尚未运行它们：

- Claude `agents`
- Claude `hooks.json` 自动化
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- 除功能报告外的 Codex 内联/应用元数据

## 功能报告

`openclaw plugins inspect <id>` 显示来自规范化 bundle 记录的
bundle 功能。

支持的功能会被静默加载。不支持的功能会生成
如下警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

当前的例外：

- Claude `commands` 被视为已支持，因为它映射到技能
- Claude `settings` 被视为已支持，因为它映射到嵌入式 Pi 设置
- Cursor `commands` 被视为已支持，因为它映射到技能
- bundle MCP 被视为已支持，因为它映射到嵌入式 Pi 设置
  并将支持的 stdio 工具暴露给嵌入式 Pi
- Codex `hooks` 仅针对 OpenClaw hook-pack 布局被视为支持

## 格式差异

这些格式很接近，但并非逐字节完全相同。这些是对 OpenClaw 
至关重要的实际差异。

### Codex

典型标记：

- `.codex-plugin/plugin.json`
- 可选 `skills/`
- 可选 `hooks/`
- 可选 `.mcp.json`
- 可选 `.app.json`

当 Codex bundle 使用技能根目录和 OpenClaw 风格的
hook-pack 目录时，最适合 OpenClaw。

### Claude

OpenClaw 支持两者：

- 基于清单的 Claude bundle：`.claude-plugin/plugin.json`
- 使用默认 Claude 布局的无清单 Claude bundle

OpenClaw 可识别的默认 Claude 布局标记：

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Claude 特定说明：

- `commands/` 被视为技能内容
- `settings.json` 被导入到嵌入式 Pi 设置中
- `.mcp.json` 和清单 `mcpServers` 可以向嵌入式 Pi 公支持的 stdio 工具
- `hooks/hooks.json` 被检测到，但不作为 Claude 自动化执行

### Cursor

典型标记：

- `.cursor-plugin/plugin.json`
- 可选 `skills/`
- 可选 `.cursor/commands/`
- 可选 `.cursor/agents/`
- 可选 `.cursor/rules/`
- 可选 `.cursor/hooks.json`
- 可选 `.mcp.json`

Cursor 特定说明：

- `.cursor/commands/` 被视为技能内容
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前仅用于检测

## Claude 自定义路径

Claude 包清单可以声明自定义组件路径。OpenClaw 将这些路径视为**附加项**，而不替换默认值。

当前识别的自定义路径键：

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

示例：

- 默认 `commands/` 加上清单 `commands: "extra-commands"` => OpenClaw 扫描两者
- 默认 `skills/` 加上清单 `skills: ["team-skills"]` => OpenClaw 扫描两者

## 安全模型

包支持有意比原生插件支持更窄。

当前行为：

- 包发现通过边界检查读取插件根目录内的文件
- 技能和 hook 包路径必须保留在插件根目录内
- 包设置文件使用相同的边界检查进行读取
- 支持的 stdio 包 MCP 服务器可以作为子进程启动，用于嵌入式 Pi 工具调用
- OpenClaw 不会在进程内加载任意的包运行时模块

这使得包支持默认情况下比原生插件模块更安全，但您仍应将第三方包视为针对其公开功能的受信任内容。

## 安装示例

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins inspect my-bundle
```

如果该目录是原生 OpenClaw 插件/包，则原生安装路径
仍然优先。

对于 Claude marketplace 名称，OpenClaw 会读取本地的 Claude known-marketplace
注册表，位于 `~/.claude/plugins/known_marketplaces.json`。Marketplace 条目
可以解析为与 bundle 兼容的目录/归档文件或原生插件
源；解析完成后，常规安装规则仍然适用。

## 故障排除

### Bundle 已检测到但功能未运行

请检查 `openclaw plugins inspect <id>`。

如果列出了该功能但 OpenClaw 显示尚未连接（wired），则这是一个
真实的产品限制，而非安装损坏。

### Claude 命令文件未出现

请确保 bundle 已启用，且 markdown 文件位于检测到的
`commands` 根目录或 `skills` 根目录内。

### Claude 设置未生效

当前的支持仅限于来自 `settings.json` 的嵌入式 Pi 设置。
OpenClaw 不会将 bundle 设置视为原始 OpenClaw 配置补丁。

### Claude 钩子未执行

`hooks/hooks.json` 目前仅会被检测到。

如果您今天需要可运行的 bundle 钩子，请通过受支持的 Codex hook root 使用常规 OpenClaw hook-pack
布局，或者提供原生的 OpenClaw 插件。

import en from "/components/footer/en.mdx";

<en />
