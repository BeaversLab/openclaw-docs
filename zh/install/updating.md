---
title: "更新中"
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现问题
---

# 更新

OpenClaw 更新很快（仍处于 1.0 之前）。像运维一样对待更新：更新 → 运行检查 → 重启（或使用会自动重启的 `openclaw update`）→ 验证。

## 推荐：重新运行官网安装器（原地升级）

**首选**更新路径是重新运行官网安装器。它会检测已有安装，原地升级，并在需要时运行 `openclaw doctor`。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

注意：

- 若不想再次运行 onboarding 向导，添加 `--no-onboard`。
- **源码安装**请使用：
  ```bash
  curl -fsSL https://openclaw.bot/install.sh | bash -s -- --install-method git --no-onboard
  ```
  安装器只会在仓库干净时执行 `git pull --rebase`。
- **全局安装**时，脚本内部会使用 `npm install -g openclaw@latest`。
- 旧版兼容：`clawdbot` 仍作为兼容 shim 提供。

## 更新前准备

- 确认你的安装方式：**全局**（npm/pnpm）vs **源码**（git clone）。
- 确认 Gateway 的运行方式：**前台终端** vs **受监督服务**（launchd/systemd）。
- 备份你的定制：
  - Config：`~/.openclaw/openclaw.json`
  - Credentials：`~/.openclaw/credentials/`
  - Workspace：`~/.openclaw/workspace`

## 更新（全局安装）

全局安装（任选其一）：

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

不推荐将 Bun 用作 Gateway 运行时（WhatsApp/Telegram 有 bug）。

切换更新通道（git + npm 安装通用）：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

使用 `--tag <dist-tag|version>` 做一次性安装 tag/版本。

通道语义与发布说明见 [开发环境 channels](/zh/install/development-channels)。

注意：在 npm 安装中，gateway 启动时会记录更新提示（检查当前通道 tag）。可通过 `update.checkOnStart: false` 关闭。

然后：

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

注意：

- 若 Gateway 以服务方式运行，优先使用 `openclaw gateway restart`，不要手动杀 PID。
- 若你固定在某个版本，请看下方“回滚 / 固定”。

## 更新（`openclaw update`）

对 **源码安装**（git checkout）推荐使用：

```bash
openclaw update
```

它会执行相对安全的更新流程：

- 需要干净的 worktree。
- 切换到所选通道（tag 或分支）。
- 获取并基于上游 rebase（dev 通道）。
- 安装依赖、构建、构建 Control UI，然后运行 `openclaw doctor`。
- 默认重启 gateway（用 `--no-restart` 跳过）。

如果你通过 **npm/pnpm** 安装（没有 git 元数据），`openclaw update` 会尝试走包管理器更新；若无法识别安装方式，改用上面的“全局安装更新”。

## 更新（Control UI / RPC）

Control UI 提供 **Update & Restart**（RPC：`update.run`）。它会：

1. 运行与 `openclaw update` 相同的源码更新流程（仅 git checkout）。
2. 写入一个包含结构化报告的重启哨兵（stdout/stderr tail）。
3. 重启 gateway，并将报告发送到最近的活跃会话。

如果 rebase 失败，gateway 会中止并重启，但不会应用更新。

## 更新（从源码）

在仓库 checkout 中：

推荐：

```bash
openclaw update
```

手动（大致等价）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

注意：

- 当你运行打包的 `openclaw` 二进制（[`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)）或用 Node 运行 `dist/` 时，`pnpm build` 很重要。
- 如果你在仓库中直接从 TypeScript 运行（`pnpm openclaw ...`），通常无需 rebuild，但**配置迁移仍然需要** → 运行 doctor。
- 全局与 git 安装之间切换很容易：安装另一种方式，然后运行 `openclaw doctor` 以重写 gateway 服务入口为当前安装方式。

## 始终运行：`openclaw doctor`

Doctor 是“安全更新”命令。它刻意保持无聊：修复 + 迁移 + 提示。

注意：如果你是 **源码安装**（git checkout），`openclaw doctor` 会先建议运行 `openclaw update`。

它通常会做：

- 迁移已废弃的配置键 / 旧的配置文件位置。
- 审核 DM 策略并对高风险 “open” 设置告警。
- 检查 Gateway 健康，必要时建议重启。
- 识别并迁移旧的 gateway 服务（launchd/systemd；旧 schtasks）到当前 OpenClaw 服务。
- 在 Linux 上确保 systemd user lingering（保证 Gateway 退出登录后仍存活）。

详情：[诊断](/zh/gateway/doctor)

## 启动 / 停止 / 重启 Gateway

CLI（跨 OS 通用）：

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

如果由监督服务管理：

- macOS launchd（app 内置 LaunchAgent）：`launchctl kickstart -k gui/$UID/bot.molt.gateway`（使用 `bot.molt.<profile>`；旧 `com.openclaw.*` 仍可用）
- Linux systemd 用户服务：`systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows（WSL2）：`systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 仅在服务已安装时有效；否则运行 `openclaw gateway install`。

Runbook + 精确服务标签见：[Gateway 运维手册](/zh/gateway)

## 回滚 / 固定版本（出问题时）

### 固定（全局安装）

安装一个已知良好的版本（把 `<version>` 替换为上一次正常版本）：

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

提示：查看当前已发布版本可运行 `npm view openclaw version`。

然后重启 + 重新运行 doctor：

```bash
openclaw doctor
openclaw gateway restart
```

### 固定（源码）按日期

从某天的提交中选一个（例："2026-01-01 时点的 main"）：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然后重装依赖 + 重启：

```bash
pnpm install
pnpm build
openclaw gateway restart
```

想回到最新：

```bash
git checkout main
git pull
```

## 如果卡住了

- 再次运行 `openclaw doctor` 并仔细阅读输出（经常会提示修复办法）。
- 查看：[故障排查](/zh/gateway/troubleshooting)
- 去 Discord 提问：https://channels.discord.gg/clawd
