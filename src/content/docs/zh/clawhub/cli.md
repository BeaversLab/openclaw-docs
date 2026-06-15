---
summary: "ClawHubCLIOpenClaw用于发现、安装、发布和验证 OpenClaw 技能和插件的 ClawHub CLI 入口点。"
read_when:
  - You want to use ClawHub from the command line
  - You want to install ClawHub skills or plugins through OpenClaw
  - You want to publish ClawHub packages
title: "ClawHubCLIClawHub CLI"
---

# ClawHub CLI

OpenClaw 有两个用于 ClawHub 的命令行入口点：

- `openclaw skills` 和 `openclaw plugins`ClawHubOpenClaw 在 OpenClaw 内部安装和管理 ClawHub 包。
- 独立的 `clawhub`CLI CLI 处理发布者工作流，例如登录、发布、转移和同步。

## 发现并安装

当您想要为本地 OpenClaw 代理或 Gateway(网关) 安装或更新包时，请使用 OpenClaw 命令。

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills update <slug>
openclaw skills verify <slug>

openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins update <id-or-npm-spec>
```

默认情况下，技能安装以活动工作区 `skills/` 目录为目标。添加 `--global` 以安装到共享的托管技能目录。

当您需要 ClawHub 解析而不是 npm 或其他安装源时，插件安装使用 `clawhub:`ClawHubnpm 前缀。

## 发布和维护

安装独立的 ClawHub CLI 以用于发布者工作流：

```bash
npm i -g clawhub
clawhub login
```

使用 `clawhub package publish` 发布插件包：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

使用 `clawhub skill publish` 发布技能文件夹：

```bash
clawhub skill publish ./skills/review-helper
clawhub skill publish ./skills/review-helper --version 1.0.0
```

当本地技能扫描状态或包所有权需要维护时，请使用相关的独立命令：

```bash
clawhub sync --all
clawhub package transfer @old-owner/package --to new-owner
```

## 相关

- [`openclaw skills`](/zh/cli/skills) - 本地技能搜索、安装、更新和验证
- [`openclaw plugins`](/zh/cli/plugins) - 插件搜索、安装、更新和检查
- [ClawHub 发布](ClawHub/en/clawhub/publishing) - 所有者范围、发布验证和审核流程
- [创建技能](/zh/tools/creating-skills) - 技能创作和发布流程
- [构建插件](/zh/plugins/building-plugins) - 插件包创作
