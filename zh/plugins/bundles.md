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

- Codex 包
- Claude 包
- Cursor 包

OpenClaw 在 `openclaw plugins list` 中将它们全部显示为 `Format: bundle`。
详细输出和 `openclaw plugins info <id>` 也会显示子类型
(`codex`、`claude` 或 `cursor`)。

相关：

- 插件系统概述：[Plugins](/en/tools/plugin)
- CLI 安装/列表流程：[plugins](/en/cli/plugins)
- Native 清单架构：[Plugin manifest](/en/plugins/manifest)

## 什么是包

包是一个 **内容/元数据包**，而不是原生的进程内 OpenClaw
插件。

目前，OpenClaw **不**在进程内执行包运行时代码。相反，
它会检测已知的包文件，读取元数据，并将支持的包
内容映射到原生的 OpenClaw 界面，例如 skills、hook packs、MCP 配置
和嵌入式 Pi 设置。

这是主要的信任边界：

- 原生 OpenClaw 插件：运行时模块在进程内执行
- 包：元数据/内容包，具有选择性功能映射

## 共享包模型

Codex、Claude 和 Cursor 包足够相似，OpenClaw 将它们
视为一种标准化的模型。

共享理念：

- 一个小的清单文件，或默认的目录布局
- 一个或多个内容根，例如 `skills/` 或 `commands/`
- 可选的 工具/runtime 元数据，例如 MCP、hooks、agents 或 LSP
- 作为目录或存档安装，然后在普通插件列表中启用

通用 OpenClaw 行为：

- 检测包子类型
- 将其标准化为一个内部包记录
- 将支持的部分映射到原生 OpenClaw 功能
- 将不支持的部分报告为已检测但未连接的功能

实际上，大多数用户不需要首先考虑特定供应商的格式。
更有用的问题是：OpenClaw 目前映射哪些包界面？

## 检测顺序

OpenClaw 优先使用原生 OpenClaw 插件/包布局，然后再处理包。

实际效果：

- `openclaw.plugin.json` 优先于包检测
- 具有有效 `package.json` + `openclaw.extensions` 的包安装使用
  原生安装路径
- 如果一个目录同时包含原生和包元数据，OpenClaw 会首先将其
  视为原生

这避免了将双格式包作为包部分安装，随后又作为原生
插件加载的情况。

## 目前支持的功能

OpenClaw 将包元数据标准化为一个内部包记录，然后将受支持的
表面映射到现有的原生行为。

### 当前支持

#### 技能内容

- 包技能根目录作为普通 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为额外的技能根目录
- Cursor `.cursor/commands` 根目录被视为额外的技能根目录

这意味着 Claude markdown 命令文件通过普通 OpenClaw 技能
加载器工作。Cursor 命令 markdown 通过相同路径工作。

#### Hook 包

- 包 hook 根目录**仅**在它们使用普通 OpenClaw hook-pack
  布局时才有效。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### CLI 后端的 MCP

- 已启用的包可以提供 MCP 服务器配置
- `claude-cli` 后端使用当前运行时线路
- OpenClaw 将包 MCP 配置合并到后端 `--mcp-config` 文件中

#### 嵌入式 Pi 设置

- 当包被启用时，Claude `settings.json` 被作为默认嵌入式
  Pi 设置导入
- OpenClaw 在应用 shell 覆盖键之前会对其进行清理

已清理的键：

- `shellPath`
- `shellCommandPrefix`

### 已检测但未执行

这些表面会被检测到，显示在包功能中，并可能出现在
诊断/信息输出中，但 OpenClaw 尚不运行它们：

- Claude `agents`
- Claude `hooks.json` 自动化
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- 当前映射运行时路径之外的 Cursor `mcpServers`
- 能力报告之外的 Codex 内联/应用元数据

## 能力报告

`openclaw plugins info <id>` 显示来自标准化包记录的包功能。

支持的功能会静默加载。不支持的功能会生成如下警告：

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

当前例外情况：

- Claude `commands` 被视为支持，因为它映射到技能
- Claude `settings` 被视为支持，因为它映射到嵌入式 Pi 设置
- Cursor `commands` 被视为支持，因为它映射到技能
- 在 OpenClaw 实际导入它的地方，包 MCP 被视为支持
- Codex `hooks` 仅针对 OpenClaw hook-pack 布局被视为支持

## 格式差异

这些格式很接近，但并非逐字节完全相同。这些是在 OpenClaw 中重要的实际差异。

### Codex

典型标记：

- `.codex-plugin/plugin.json`
- 可选 `skills/`
- 可选 `hooks/`
- 可选 `.mcp.json`
- 可选 `.app.json`

当 Codex 包使用技能根目录和 OpenClaw 风格的 hook-pack 目录时，最适合 OpenClaw。

### Claude

OpenClaw 支持以下两者：

- 基于清单的 Claude 包：`.claude-plugin/plugin.json`
- 使用默认 Claude 布局的非清单 Claude 包

OpenClaw 识别的默认 Claude 布局标记：

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
- `hooks/hooks.json` 被检测到，但不作为 Claude 自动化执行

### Cursor

典型标记：

- `.cursor-plugin/plugin.json`
- 可选 `skills/`
- 可选 `.cursor/commands/`
- 可选 `.cursor/agents/`
- 可选的 `.cursor/rules/`
- 可选的 `.cursor/hooks.json`
- 可选的 `.mcp.json`

Cursor 特定说明：

- `.cursor/commands/` 被视为技能内容
- `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 目前
  仅用于检测

## Claude 自定义路径

Claude 包清单可以声明自定义组件路径。OpenClaw 将
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

包支持有意比原生插件支持更狭窄。

当前行为：

- 包发现通过边界检查读取插件根目录内的文件
- 技能和 hook 包路径必须位于插件根目录内
- 包设置文件通过相同的边界检查读取
- OpenClaw 不会在进程中执行任意的包运行时代码

这使得包支持默认情况下比原生插件模块更安全，但对于它们
确实暴露的功能，您仍应将第三方包视为受信任的内容。

## 安装示例

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins info my-bundle
```

如果该目录是原生 OpenClaw 插件/包，则原生安装路径
仍然优先。

## 故障排除

### 检测到包但功能未运行

检查 `openclaw plugins info <id>`。

如果列出了该功能但 OpenClaw 表示尚未连接，这是一个
真正的产品限制，而不是安装损坏。

### Claude 命令文件未出现

确保包已启用，并且 markdown 文件位于检测到的
`commands` 根目录或 `skills` 根目录内。

### Claude 设置未应用

当前支持仅限于来自 `settings.json` 的嵌入式 Pi 设置。
OpenClaw 不会将包设置视为原始 OpenClaw 配置补丁。

### Claude 钩子不会执行

`hooks/hooks.json` 目前只能被检测到。

如果您现在需要可运行的 bundle 钩子，请通过支持的 Codex 钩子根目录使用正常的 OpenClaw hook-pack
布局，或者打包一个原生的 OpenClaw 插件。

import zh from "/components/footer/zh.mdx";

<zh />
