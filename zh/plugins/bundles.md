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

<Info>
  插件包与原生 OpenClaw
  插件**不同**。原生插件在进程中运行，并且可以注册任何功能。插件包是具有选择性功能映射和更窄信任边界的内容包。
</Info>

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

    映射的功能（技能、钩子、MCP 工具）将在下一次会话中可用。

  </Step>
</Steps>

## OpenClaw 从插件包映射的内容

目前并非所有插件包功能都能在 OpenClaw 中运行。以下是有效功能以及已检测但尚未连接的功能。

### 目前支持

| 功能     | 映射方式                                                                 | 适用范围       |
| -------- | ------------------------------------------------------------------------ | -------------- |
| 技能内容 | 插件包技能根目录作为普通 OpenClaw 技能加载                               | 所有格式       |
| 命令     | `commands/` 和 `.cursor/commands/` 被视为技能根目录                      | Claude、Cursor |
| 钩子包   | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                            | Codex          |
| MCP 工具 | 插件包 MCP 配置合并到嵌入式 Pi 设置中；支持的 stdio 服务器作为子进程启动 | 所有格式       |
| 设置     | Claude `settings.json` 作为嵌入式 Pi 默认值导入                          | Claude         |

### 已检测但未执行

这些会被识别并显示在诊断信息中，但 OpenClaw 不会运行它们：

- Claude `agents`，`hooks.json` 自动化，`lspServers`，`outputStyles`
- Cursor `.cursor/agents`，`.cursor/hooks.json`，`.cursor/rules`
- Codex 内联/应用程序元数据（超出能力报告范围）

## 插件包格式

<AccordionGroup>
  <Accordion title="Codex 插件包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`，`hooks/`，`.mcp.json`，`.app.json`

    当 Codex 插件包使用技能根目录和 OpenClaw 风格的挂钩包目录（`HOOK.md` + `handler.ts`）时，最适合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 插件包">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`，`commands/`，`agents/`，`hooks/`，`.mcp.json`，`settings.json`）

    Claude 特有行为：

    - `commands/` 被视为技能内容
    - `settings.json` 被导入到嵌入式 Pi 设置中（Shell 覆盖键会被清理）
    - `.mcp.json` 向嵌入式 Pi 暴露支持的 stdio 工具
    - `hooks/hooks.json` 被检测到但不会被执行
    - 清单中的自定义组件路径是累加的（它们扩展默认值，而不是替换它们）

  </Accordion>

  <Accordion title="Cursor 包">
    标记: `.cursor-plugin/plugin.json`

    可选内容: `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` 被视为 skill 内容
    - `.cursor/rules/`, `.cursor/agents/`, 和 `.cursor/hooks.json` 仅用于检测

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 首先检查原生插件格式：

1. `openclaw.plugin.json` 或包含 `openclaw.extensions` 的有效 `package.json` — 视为 **原生插件**
2. Bundle 标记 (`.codex-plugin/`, `.claude-plugin/`, 或默认 Claude/Cursor 布局) — 视为 **bundle**

如果一个目录同时包含两者，OpenClaw 将使用原生路径。这可以防止
双格式包被部分安装为 bundle。

## 安全性

Bundle 的信任边界比原生插件更窄：

- OpenClaw **不会** 在进程内加载任意的 bundle 运行时模块
- Skills 和 hook-pack 路径必须保持在插件根目录内 (边界检查)
- 读取设置文件时使用相同的边界检查
- 支持的 stdio MCP 服务器可能会作为子进程启动

这使得 bundle 默认更安全，但您仍应将第三方
bundle 视为其暴露功能的受信任内容。

## 故障排除

<AccordionGroup>
  <Accordion title="检测到 Bundle 但功能未运行">
    运行 `openclaw plugins inspect <id>`。如果列出了某个功能但标记为
    未连接，则这是产品限制 — 而不是安装损坏。
  </Accordion>

<Accordion title="Claude 命令文件未显示">
  确保 bundle 已启用，且 markdown 文件位于检测到的 `commands/` 或 `skills/` 根目录内。
</Accordion>

<Accordion title="Claude 设置不适用">
  仅支持来自 `settings.json` 的嵌入式 Pi 设置。OpenClaw 不会将 bundle 设置视为原始配置补丁。
</Accordion>

  <Accordion title="Claude 钩子不执行">
    `hooks/hooks.json` 仅用于检测。如果您需要可运行的钩子，请使用 OpenClaw hook-pack 布局或打包原生插件。
  </Accordion>
</AccordionGroup>

## 相关

- [安装和配置插件](/zh/tools/plugin)
- [构建插件](/zh/plugins/building-plugins) — 创建原生插件
- [插件清单](/zh/plugins/manifest) — 原生清单架构

import zh from "/components/footer/zh.mdx";

<zh />
