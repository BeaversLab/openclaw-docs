---
summary: "`openclaw update` 的 CLI 参考（相对安全的源代码更新 + 网关自动重启）"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 并在稳定/测试/开发通道之间切换。

如果您通过 **npm/pnpm** 安装（全局安装，无 git 元数据），更新会通过 [更新](/en/install/updating) 中的包管理器流程进行。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`：成功更新后跳过重启 Gateway 网关 服务。
- `--channel <stable|beta|dev>`：设置更新通道（git + npm；持久化保存到配置中）。
- `--tag <dist-tag|version|spec>`：仅为此次更新覆盖软件包目标。对于软件包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划的更新操作（渠道/tag/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每步超时（默认为 1200s）。

注意：降级需要确认，因为旧版本可能会破坏配置。

## `update status`

显示当前更新通道 + git tag/branch/SHA（对于源代码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：打印机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时（默认为 3s）。

## `update wizard`

交互式流程以选择更新渠道并确认更新后是否重启 Gateway(网关)（默认为重启）。如果您在没有 git checkout 的情况下选择 `dev`，它会提议创建一个。

## 它的作用

当您显式切换渠道（`--channel ...`）时，OpenClaw 还会保持安装方法一致：

- `dev` → 确保有 git checkout（默认：`~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），更新它，并从该 checkout 安装全局 CLI。
- `stable`/`beta` → 使用匹配的 dist-tag 从 npm 安装。

当通过配置启用时，Gateway(网关) 核心自动更新程序复用此相同的更新路径。

## Git checkout 流程

渠道：

- `stable`：检出最新的非 beta tag，然后构建 + doctor。
- `beta`：检出最新的 `-beta` tag，然后构建 + doctor。
- `dev`：检出 `main`，然后 fetch + rebase。

高级概览：

1. 需要干净的工作树（没有未提交的更改）。
2. 切换到选定的渠道（标签或分支）。
3. 获取上游更新（仅限 dev）。
4. 仅限 dev：在临时工作树中进行预检 lint + TypeScript 构建；如果 tip 失败，则向上回溯最多 10 次提交以查找最新的干净构建。
5. 变基到选定的提交（仅限 dev）。
6. 安装依赖项（首选 pnpm；回退到 npm）。
7. 构建 + 构建 Control UI。
8. 运行 `openclaw doctor` 作为最终的“安全更新”检查。
9. 将插件同步到活动渠道（dev 使用捆绑扩展；stable/beta 使用 npm）并更新 npm 安装的插件。

## `--update` 简写

`openclaw --update` 重写为 `openclaw update`（适用于 shell 和启动器脚本）。

## 参见

- `openclaw doctor`（提议在 git checkouts 上先运行更新）
- [开发渠道](/en/install/development-channels)
- [更新](/en/install/updating)
- [CLI 参考](/en/cli)

import zh from "/components/footer/zh.mdx";

<zh />
