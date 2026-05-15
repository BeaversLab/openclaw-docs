---
summary: "SlackGitHubCLIMantis Slack 桌面版 QA 的操作员运行手册：GitHub 分发、本地 CLI、热 VNC 租约、水合模式、计时解读、工件和故障处理。"
read_when:
  - Running Mantis Slack desktop QA from GitHub or locally
  - Debugging slow Mantis Slack desktop runs
  - Choosing source, prehydrated, or warm-lease mode
  - Posting screenshot and video evidence to a PR
title: "SlackMantis Slack 桌面版运行手册"
---

Mantis Slack 桌面版 QA 是针对需要 Linux 桌面、VNC 救援、Slack Web、真实的 OpenClaw 网关、屏幕截图、视频和 PR 证据评论的 Slack 级别 Bug 的真实 UI 通道。

当单元测试或无头 Slack 实时通道无法证明该 Bug 时，请使用它。

## 存储模型

Mantis 使用三个不同的存储层：

- 提供商映像：由 Crabbox 拥有并存储在云提供商账户中。它包含机器功能，例如 Chrome/Chromium、ffmpeg、scrot、Node/corepack/pnpm、原生构建工具和空缓存目录。
- 热租约状态：由当前操作员会话拥有。当租约处于活动状态时，它可以包含已登录的浏览器配置文件、`/var/cache/crabbox/pnpm` 和准备好的源代码检出。
- Mantis 工件：由 OpenClaw 运行拥有。它们位于 OpenClaw`.artifacts/qa-e2e/mantis/...`GitHubGitHub 下，然后 GitHub Actions 会上传它们，Mantis GitHub App 会在 PR 上评论内联证据。

切勿将机密、浏览器 Cookie、Slack 登录状态、仓库检出、Slack`node_modules` 或 `dist/` 放入预制的提供商映像中。

## GitHub 分发

从 `main` 运行工作流：

```bash
gh workflow run mantis-slack-desktop-smoke.yml \
  --ref main \
  -f candidate_ref=<trusted-ref-or-sha> \
  -f pr_number=<pr-number> \
  -f scenario_id=slack-canary \
  -f crabbox_provider=aws \
  -f keep_vm=false \
  -f hydrate_mode=source
```

允许的 `candidate_ref` 值被有意限制得很窄，因为工作流使用实时凭证：当前的 `main` 祖先、发布标签或来自 `openclaw/openclaw` 的开放 PR 头部。

该工作流会写入：

- 上传的工件：`mantis-slack-desktop-smoke-<run-id>-<attempt>`；
- 来自 Mantis GitHub App 的内联 PR 评论；
- `slack-desktop-smoke.png`；
- `slack-desktop-smoke.mp4`;
- `slack-desktop-smoke-preview.gif`;
- `slack-desktop-smoke-change.mp4`;
- `mantis-slack-desktop-smoke-summary.json`;
- `mantis-slack-desktop-smoke-report.md`;
- 远程日志，例如 `slack-desktop-command.log`、`openclaw-gateway.log`、
  `chrome.log` 和 `ffmpeg.log`。

PR 评论通过隐藏的
`<!-- mantis-slack-desktop-smoke -->` 标记原位更新。

## 本地 CLI

冷源证明：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --credential-source convex \
  --credential-role maintainer \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --scenario slack-canary \
  --hydrate-mode source
```

保留 VM 以进行 VNC 救援：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

打开 VNC：

```bash
crabbox vnc --provider aws --id <cbx_id> --open
```

复用热租约：

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --lease-id <cbx_id-or-slug> \
  --gateway-setup \
  --scenario slack-canary \
  --hydrate-mode source
```

仅当复用的远程工作空间已经
拥有 `node_modules` 和已构建的 `dist/` 时，才使用 `--hydrate-mode prehydrated`。如果缺少这些，Mantis 将失败关闭。

## Hydrate 模式

| 模式          | 使用时机                 | 远程行为                                                                       | 权衡                               |
| ------------- | ------------------------ | ------------------------------------------------------------------------------ | ---------------------------------- |
| `source`      | 正常 PR 证明、冷机器、CI | 在 VM 内运行 `pnpm install --frozen-lockfile --prefer-offline` 和 `pnpm build` | 最慢，最强的源检出证明             |
| `prehydrated` | 您有意准备了复用的租约   | 需要现有的 `node_modules` 和 `dist/`；跳过安装/构建                            | 快速，但仅对操作员控制的热租约有效 |

GitHub Actions 始终在 VM 运行之前准备候选检出。其
pnpm 存储按操作系统、Node 版本和锁定文件进行缓存。VM 源运行
在存在时也会使用 `/var/cache/crabbox/pnpm`。

## 时序解释

`mantis-slack-desktop-smoke-report.md` 包含阶段时序：

- `crabbox.warmup`：云提供商启动、桌面/浏览器就绪状态和 SSH。
- `crabbox.inspect`：租约元数据查找。
- `credentials.prepare`：Convex 凭证租约获取。
- `crabbox.remote_run`：同步、浏览器启动、OpenClaw 安装/构建或
  hydrate 验证、网关启动、屏幕截图和视频捕获。
- `artifacts.copy`：从 VM rsync 回传。

当 Crabbox 返回非零远程状态，且 Mantis 已复制证明 OpenClaw 网关存活且设置完成的元数据后，`crabbox.remote_run` 可被标记为 `accepted`。将 `accepted` 视为带有说明的通过，而非失败的方案。

如果运行缓慢：

- warmup 占主导：预烘焙或提升更好的 Crabbox 提供商镜像；
- `source` 中的 remote_run 占主导：使用温租用（warm lease），改善 pnpm 存储复用，或将机器先决条件移入提供商镜像；
- `prehydrated` 中的 remote_run 占主导：远程工作空间实际上未就绪，或者网关/浏览器/Slack 设置缓慢；
- artifact copy 占主导：检查视频大小和 artifact 目录内容。

## 证据检查清单

一个优秀的 PR 评论应显示：

- scenario id 和 candidate SHA；
- GitHub Actions 运行 URL；
- artifact URL；
- 内联截图；
- 可用时的内联动画预览；
- 完整 MP4 和裁剪后的 MP4 链接；
- pass/fail 状态；
- 附件报告中的计时摘要。

不要将截图或视频提交到仓库中。将它们保存在 GitHub Actions 工件或 PR 评论中。

## 故障处理

如果工作流在 VM 运行之前失败，请首先检查 Actions 作业。典型原因是不受信任的 `candidate_ref`、缺少环境机密，或 candidate 安装/构建失败。

如果 VM 运行失败但已复制回截图，请检查：

```bash
cat mantis-slack-desktop-smoke-report.md
cat mantis-slack-desktop-smoke-summary.json
cat slack-desktop-command.log
cat openclaw-gateway.log
cat chrome.log
cat ffmpeg.log
```

如果运行保留了租用，请使用报告中的 `crabbox vnc ...` 命令打开 VNC。完成后停止租用：

```bash
crabbox stop --provider aws <cbx_id-or-slug>
```

如果 Slack 登录过期，请在保留的租用上通过 VNC 修复它，并使用 `--lease-id` 重新运行。不要将该浏览器配置文件烘焙到提供商镜像中。

## 相关

- [QA 概述](/zh/concepts/qa-e2e-automation)
- [Slack 渠道](/zh/channels/slack)
- [测试](/zh/help/testing)
