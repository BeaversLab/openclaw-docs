---
summary: "`openclaw update` 的 CLI 参考（相对安全的源代码更新 + 网关自动重启）"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 并在稳定/测试/开发通道之间切换。

如果您通过 **npm/pnpm/bun** 安装（全局安装，无 git 元数据），
更新会通过 [Updating](/zh/install/updating) 中的包管理器流程进行。

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
openclaw update --yes
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`：成功更新后跳过重启 Gateway(网关) 网关 服务。
- `--channel <stable|beta|dev>`：设置更新通道（git + npm；持久化保存到配置中）。
- `--tag <dist-tag|version|spec>`：仅针对本次更新覆盖软件包目标。对于软件包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划的更新操作（渠道/标签/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每步超时时间（默认为 1200s）。
- `--yes`：跳过确认提示（例如降级确认）

注意：降级需要确认，因为旧版本可能会破坏配置。

## `update status`

显示当前更新渠道 + git 标签/分支/SHA（针对源码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：打印机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时时间（默认为 3s）。

## `update wizard`

用于选择更新渠道并确认更新后是否重启 Gateway(网关)
的交互式流程（默认为重启）。如果您在没有 git 检出的情况下选择 `dev`，
它将提供创建一个检出的选项。

选项：

- `--timeout <seconds>`：每个更新步骤的超时时间（默认 `1200`）

## 功能说明

当您显式切换渠道（`--channel ...`）时，OpenClaw 也会保持
安装方法一致：

- `dev` → 确保进行 git 检出（默认：`~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新该检出，并从中安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm 分发标签 `beta`，但当 beta
  缺失或比当前稳定版本旧时，回退到 `latest`。

Gateway(网关) 核心自动更新程序（通过配置启用时）复用此相同的更新路径。

## Git 检出流程

渠道：

- `stable`：检出最新的非 beta 标签，然后构建 + 诊断。
- `beta`：优先使用最新的 `-beta` 标签，但当 beta
  缺失或较旧时，回退到最新的稳定标签。
- `dev`：检出 `main`，然后获取 + 变基。

概览：

1. 需要干净的工作树（无未提交的更改）。
2. 切换到选定的渠道（标签或分支）。
3. 获取上游代码（仅限 dev 渠道）。
4. 仅限 dev：在临时工作树中进行预检 lint + TypeScript 构建；如果 tip 失败，则向上回溯最多 10 个提交以找到最新的干净构建。
5. 变基到选定的提交（仅限 dev 渠道）。
6. 使用仓库包管理器安装依赖项。对于 pnpm 检出，更新程序按需引导 `pnpm`（首先通过 `corepack`，然后是临时的 `npm install pnpm@10` 回退），而不是在 pnpm 工作区内运行 `npm run build`。
7. 构建 + 构建 Control UI。
8. 运行 `openclaw doctor` 作为最终的“安全更新”检查。
9. 将插件同步到活动渠道（dev 使用捆绑扩展；stable/beta 使用 npm）并更新 npm 安装的插件。

如果 pnpm 引导仍然失败，更新程序现在会提前停止并显示特定于包管理器的错误，而不是尝试在检出目录内运行 `npm run build`。

## `--update` 简写

`openclaw --update` 重写为 `openclaw update`（适用于 shell 和启动器脚本）。

## 另请参阅

- `openclaw doctor`（在 git 检出上提供先运行更新）
- [开发渠道](/zh/install/development-channels)
- [更新](/zh/install/updating)
- [CLI 参考](/zh/cli)
