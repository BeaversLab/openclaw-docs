---
summary: "`openclaw update` 的 CLI 参考（相对安全的源码更新 + gateway 自动重启）"
read_when:
  - 需要安全更新源码检出
  - 需要理解 `--update` 简写行为
title: "update"
---

# `openclaw update`

安全更新 OpenClaw，并在 stable/beta/dev 渠道间切换。

如果你通过 **npm/pnpm** 安装（全局安装，无 git 元数据），更新将通过
[更新](/zh/install/updating) 中的包管理器流程完成。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --no-restart
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`：成功更新后跳过重启 Gateway 服务。
- `--channel <stable|beta|dev>`：设置更新渠道（git + npm；写入配置）。
- `--tag <dist-tag|version>`：仅本次更新覆盖 npm dist-tag 或版本。
- `--json`：输出机器可读的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每步超时时间（默认 1200s）。

说明：降级需要确认，因为旧版本可能破坏配置。

## `update status`

显示当前更新渠道 + git tag/branch/SHA（源码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：输出机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时（默认 3s）。

## `update wizard`

交互式流程，选择更新渠道并确认更新后是否重启 Gateway（默认重启）。
如果选择 `dev` 但没有 git 检出，会提示创建。

## 做了什么

当你显式切换渠道（`--channel ...`），OpenClaw 也会保持安装方式一致：

- `dev` → 确保存在 git 检出（默认 `~/openclaw`，可用 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable`/`beta` → 使用对应 dist-tag 从 npm 安装。

## Git 检出流程

渠道：

- `stable`：检出最新非 beta tag，然后 build + doctor。
- `beta`：检出最新 `-beta` tag，然后 build + doctor。
- `dev`：检出 `main`，然后 fetch + rebase。

高层步骤：

1. 需要干净的工作树（无未提交更改）。
2. 切换到选定渠道（tag 或分支）。
3. 拉取上游（仅 dev）。
4. 仅 dev：在临时 worktree 中预检 lint + TypeScript build；若 tip 失败，则最多回退 10 个提交找到最新可构建版本。
5. 仅 dev：rebase 到所选提交。
6. 安装依赖（优先 pnpm；npm 兜底）。
7. 构建 + 构建 Control UI。
8. 运行 `openclaw doctor` 作为最终的“安全更新”检查。
9. 将插件同步到当前渠道（dev 使用内置扩展；stable/beta 使用 npm）并更新 npm 安装的插件。

## `--update` 简写

`openclaw --update` 会重写为 `openclaw update`（便于 shell 与启动脚本）。

## 另请参阅

- `openclaw doctor`（在 git 检出时会建议先运行 update）
- [开发环境 channels](/zh/install/development-channels)
- [更新](/zh/install/updating)
- [CLI reference](/zh/cli)
