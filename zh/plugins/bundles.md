---
summary: "OpenClaw 中 Codex、Claude 和 Cursor 包的统一包格式指南"
read_when:
  - You want to install or debug a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are documenting bundle compatibility or current support limits
title: "插件包"
---

# 插件包

OpenClaw 支持一类共享的外部插件包：**bundle plugins**。

目前这意味着三个密切相关的生态系统：

- Codex bundles
- Claude bundles
- Cursor bundles

OpenClaw 在 `openclaw plugins list` 中将它们全部显示为 `Format: bundle`。
详细输出和 `openclaw plugins info <id>` 也会显示子类型
(`codex`、`claude` 或 `cursor`)。

相关：

- 插件系统概述：[Plugins](/zh/tools/plugin)
- CLI 安装/列表流程：[plugins](/zh/cli/plugins)
- 原生清单架构：[Plugin manifest](/zh/plugins/manifest)

## 什么是 bundle

Bundle 是一个 **内容/元数据包**，而不是 OpenClaw 的原生进程内插件。

目前，OpenClaw **不会**在进程内执行 bundle 运行时代码。相反，它会检测已知的 bundle 文件，读取元数据，并将受支持的 bundle 内容映射到原生 OpenClaw 表面（如技能、hook 包、MCP 配置和嵌入式 Pi 设置）。

这是主要的信任边界：

- 原生 OpenClaw 插件：运行时模块在进程内执行
- bundle：元数据/内容包，具有选择性功能映射

## 共享 bundle 模型

Codex、Claude 和 Cursor bundles 足够相似，OpenClaw 将它们视为一个标准化的模型。

共享理念：

- 一个小型清单文件，或默认目录布局
- 一个或多个内容根目录，例如 `skills/` 或 `commands/`
- 可选的工具/运行时元数据，如 MCP、hooks、agents 或 LSP
- 作为目录或归档文件安装，然后在普通插件列表中启用

常见的 OpenClaw 行为：

- 检测 bundle 子类型
- 将其规范化为一个内部 bundle 记录
- 将受支持的部分映射到原生 OpenClaw 功能
- 将不受支持的部分报告为已检测但未连接的功能

实际上，大多数用户不需要首先考虑特定供应商的格式。更有用的问题是：OpenClaw 目前映射哪些 bundle 表面？

## 检测顺序

OpenClaw 在处理捆绑包之前，优先使用原生的 OpenClaw 插件/包布局。

实际效果：

- `openclaw.plugin.json` 优先于捆绑包检测
- 包含有效 `package.json` + `openclaw.extensions` 的包安装使用
  原生安装路径
- 如果一个目录同时包含原生和捆绑包元数据，OpenClaw 会
  优先将其视为原生

这避免了将双格式包部分安装为捆绑包，然后
稍后又作为原生插件加载它。

## 目前支持的功能

OpenClaw 将捆绑包元数据规范化为一个内部捆绑包记录，然后将
支持的界面映射到现有的原生行为。

### 目前已支持

#### 技能内容

- 捆绑包技能根目录作为普通 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为额外的技能根目录
- Cursor `.cursor/commands` 根目录被视为额外的技能根目录

这意味着 Claude markdown 命令文件通过普通的 OpenClaw 技能
加载器工作。Cursor 命令 markdown 也通过相同的路径工作。

#### Hook 包

- 捆绑包 hook 根目录**仅**在使用普通 OpenClaw hook-pack
  布局时有效。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 用于 CLI 后端的 MCP

- 启用的捆绑包可以提供 MCP 服务器配置
- 当前的运行时连线由 `claude-cli` 后端使用
- OpenClaw 将捆绑包 MCP 配置合并到后端 `--mcp-config` 文件中

#### 嵌入式 Pi 设置

- 当捆绑包被启用时，Claude `settings.json` 被作为默认嵌入式 Pi 设置导入
- OpenClaw 在应用 shell 覆盖键之前会对其进行清理

已清理的键：

- `shellPath`
- `shellCommandPrefix`

### 已检测但未执行

这些界面会被检测到，显示在捆绑包功能中，并可能出现在
诊断/信息输出中，但 OpenClaw 尚未运行它们：

- Claude `agents`
- Claude `hooks.json` 自动化
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- 当前映射的运行时路径之外的 Cursor `mcpServers`
- 超越能力报告的 Codex 内联/应用元数据

## 能力报告

`openclaw plugins info <id>` 显示来自规范化 bundle 记录的 bundle 能力。

支持的能力会被静默加载。不支持的能力会产生如下警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

当前的例外情况：

- Claude `commands` 被视为受支持，因为它映射到了技能
- Claude `settings` 被视为受支持，因为它映射到了嵌入式 Pi 设置
- Cursor `commands` 被视为受支持，因为它映射到了技能
- 在 OpenClaw 实际导入它的地方，bundle MCP 被视为受支持
- Codex `hooks` 仅对于 OpenClaw hook-pack 布局被视为受支持

## 格式差异

这些格式很接近，但并非逐字节完全相同。这些是在 OpenClaw 中重要的实际差异。

### Codex

典型标记：

- `.codex-plugin/plugin.json`
- 可选 `skills/`
- 可选 `hooks/`
- 可选 `.mcp.json`
- 可选 `.app.json`

当 Codex bundle 使用技能根目录和 OpenClaw 风格的 hook-pack 目录时，最适合 OpenClaw。

### Claude

OpenClaw 支持两者：

- 基于清单的 Claude bundle：`.claude-plugin/plugin.json`
- 使用默认 Claude 布局的非清单 Claude bundle

OpenClaw 可识别的默认 Claude 布局标记：

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Claude 特定说明：

- `commands/` 被视为技能内容处理
- `settings.json` 被导入到嵌入式 Pi 设置中
- `hooks/hooks.json` 会被检测到，但不会作为 Claude 自动化执行

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
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前
  仅用于检测

## Claude 自定义路径

Claude bundle 清单可以声明自定义组件路径。OpenClaw 将
这些路径视为**附加**，而不是替换默认值。

当前识别的自定义路径键：

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

示例：

- 默认 `commands/` 加上清单 `commands: "extra-commands"` =>
  OpenClaw 扫描两者
- 默认 `skills/` 加上清单 `skills: ["team-skills"]` =>
  OpenClaw 扫描两者

## 安全模型

Bundle 支持的范围有意比原生插件支持更窄。

当前行为：

- bundle 发现过程会读取插件根目录内的文件并进行边界检查
- skills 和 hook-pack 路径必须保留在插件根目录内
- bundle 设置文件会通过相同的边界检查进行读取
- OpenClaw 不会在进程内执行任意的 bundle 运行时代码

这使得默认情况下 bundle 支持比原生插件模块更安全，但对于它们
确实公开的功能，您仍应将第三方 bundle 视为受信任的内容。

## 安装示例

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins info my-bundle
```

如果目录是原生 OpenClaw 插件/包，则原生安装路径
仍然优先。

对于 Claude marketplace 名称，OpenClaw 会读取位于 `~/.claude/plugins/known_marketplaces.json` 的本地 Claude 已知 marketplace
注册表。Marketplace 条目可以解析为与 bundle 兼容的目录/存档或原生插件
源；解析后，常规安装规则仍然适用。

## 故障排除

### 检测到 bundle 但功能未运行

检查 `openclaw plugins info <id>`。

如果列出了该功能，但 OpenClaw 表示尚未连接，则这是
产品的实际限制，而不是安装错误。

### Claude 命令文件未出现

确保已启用该插件包，并且 markdown 文件位于已检测到的
`commands` 根目录或 `skills` 根目录中。

### Claude 设置不生效

目前的支持仅限于来自 `settings.json` 的嵌入式 Pi 设置。
OpenClaw 不会将插件包设置视为原始 OpenClaw 配置补丁。

### Claude 钩子未执行

`hooks/hooks.json` 目前仅支持检测。

如果您今天需要可运行的插件包钩子，请通过受支持的 Codex 钩子根目录使用标准的 OpenClaw 钩子包
布局，或者发布原生 OpenClaw 插件。

import zh from "/components/footer/zh.mdx";

<zh />
