---
summary: "安全地更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

OpenClaw 发展迅速（“1.0”之前）。请将更新视为发布基础架构：更新 → 运行检查 → 重启（或使用 `openclaw update`，它会重启）→ 验证。

## 推荐：重新运行网站安装程序（就地升级）

**首选**的更新路径是从网站重新运行安装程序。它会检测现有的安装，就地升级，并在需要时运行 `openclaw doctor`。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

注意：

- 如果您不想再次运行入门向导，请添加 `--no-onboard`。
- 对于**源码安装**，请使用：

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  安装程序 `git pull --rebase` **仅**在仓库干净时执行。

- 对于**全局安装**，该脚本在底层使用 `npm install -g openclaw@latest`。
- 旧版说明：`clawdbot` 作为兼容性垫片仍然可用。

## 在更新之前

- 了解您的安装方式：**全局**（npm/pnpm）还是 **源码**（git clone）。
- 了解您的 Gateway 网关 运行方式：**前台终端**还是 **受监管的服务**（launchd/systemd）。
- 快照您的定制配置：
  - 配置：`~/.openclaw/openclaw.json`
  - 凭证：`~/.openclaw/credentials/`
  - 工作区：`~/.openclaw/workspace`

## 更新（全局安装）

全局安装（任选其一）：

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

我们 **不** 推荐在 Gateway(网关) 运行时使用 Bun (存在 WhatsApp/Telegram Bug)。

要切换更新渠道（git + npm 安装）：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

使用 `--tag <dist-tag|version>` 进行一次性安装的标签/版本指定。

关于渠道语义和发行说明，请参阅 [开发渠道](/en/install/development-channels)。

注意：在 npm 安装中，gateway 会在启动时记录更新提示（检查当前渠道标签）。可通过 `update.checkOnStart: false` 禁用。

### 核心自动更新程序（可选）

自动更新器默认处于**关闭状态**，这是核心 Gateway(网关) 的一项功能（不是插件）。

```json
{
  "update": {
    "channel": "stable",
    "auto": {
      "enabled": true,
      "stableDelayHours": 6,
      "stableJitterHours": 12,
      "betaCheckIntervalHours": 1
    }
  }
}
```

行为：

- `stable`：当发现新版本时，OpenClaw 会等待 `stableDelayHours`，然后在 `stableJitterHours` 内应用确定性的每个安装抖动（分散推出）。
- `beta`：按 `betaCheckIntervalHours` 周期检查（默认：每小时）并在有更新时应用。
- `dev`：不自动应用；使用手动 `openclaw update`。

使用 `openclaw update --dry-run` 可在启用自动化之前预览更新操作。

然后：

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

注意：

- 如果您的 Gateway(网关) 作为服务运行，建议使用 `openclaw gateway restart`，而不是直接终止 PID。
- 如果您固定在特定版本，请参阅下方的“回滚 / 固定版本”。

## 更新（`openclaw update`）

对于 **源码安装**（git checkout），建议使用：

```bash
openclaw update
```

它运行一个相对安全的更新流程：

- 要求干净的工作树。
- 切换到选定的渠道（标签或分支）。
- 针对配置的上游（开发渠道）获取 + 变基。
- 安装依赖、构建、构建 Control UI 并运行 `openclaw doctor`。
- 默认重启网关（使用 `--no-restart` 跳过）。

如果您是通过 **npm/pnpm** 安装的（无 git 元数据），`openclaw update` 将尝试通过您的包管理器进行更新。如果无法检测到安装，请改用“Update (global install)”方法。

## 更新（控制 UI / RPC）

控制 UI 具有 **更新并重启** 功能（RPC：`update.run`）。它：

1. 运行与 `openclaw update` 相同的源更新流程（仅限 git checkout）。
2. 写入一个包含结构化报告（stdout/stderr 尾部）的重启标记。
3. 重启 Gateway 网关，并将报告发送给最后一个活跃会话。

如果 rebase 失败，Gateway 网关将中止并在不应用更新的情况下重启。

## Update (from source)

从代码库检出：

推荐：

```bash
openclaw update
```

手动操作（大致等效）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

注意事项：

- 当您运行打包的 `openclaw` 二进制文件 ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) 或使用 Node 运行 `dist/` 时，`pnpm build` 很重要。
- 如果您从仓库检出运行且没有全局安装，请使用 `pnpm openclaw ...` 执行 CLI 命令。
- 如果您直接从 TypeScript 运行（`pnpm openclaw ...`），通常不需要重新构建，但**配置迁移仍然适用** → 请运行 doctor。
- 在全局安装和 git 安装之间切换很容易：安装另一种版本，然后运行 `openclaw doctor`，以便将 Gateway 网关服务入口点重写为当前安装。

## Always Run: `openclaw doctor`

Doctor 是“安全更新”命令。它故意设计得很简单：修复 + 迁移 + 警告。

注意：如果您使用的是**源安装**（git checkout），`openclaw doctor` 将会建议先运行 `openclaw update`。

它的典型操作包括：

- 迁移已弃用的配置键 / 旧版配置文件位置。
- 审核 私信 策略并对有风险的“开放”设置发出警告。
- 检查 Gateway 网关 健康状况，并可提供重启服务。
- 检测并迁移较旧的 Gateway 网关服务（launchd/systemd；旧版 schtasks）到当前的 OpenClaw 服务。
- 在 Linux 上，确保启用了 systemd 用户 linger（以便 Gateway(网关) 在注销后继续运行）。

详情：[Doctor](/en/gateway/doctor)

## 启动 / 停止 / 重启 Gateway(网关)

CLI（适用于任何操作系统）：

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

如果您使用的是受监督模式：

- macOS launchd（应用捆绑的 LaunchAgent）：`launchctl kickstart -k gui/$UID/ai.openclaw.gateway`（使用 `ai.openclaw.<profile>`；旧版 `com.openclaw.*` 仍然有效）
- Linux systemd 用户服务：`systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2)：`systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 仅在安装了服务时有效；否则运行 `openclaw gateway install`。

Runbook + 精确的服务标签：[Gateway 网关 runbook](/en/gateway)

## 回滚 / 固定版本（当出现问题时）

### 固定版本（全局安装）

安装一个已知正常的版本（将 `<version>` 替换为上一个可用的版本）：

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

提示：要查看当前发布的版本，请运行 `npm view openclaw version`。

然后重启 + 重新运行 doctor：

```bash
openclaw doctor
openclaw gateway restart
```

### 按日期固定版本（源码安装）

从某个日期选择一个提交（例如：“截至 2026-01-01 的 main 分支状态”）：

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

然后重新安装依赖 + 重启：

```bash
pnpm install
pnpm build
openclaw gateway restart
```

如果您想稍后恢复到最新版本：

```bash
git checkout main
git pull
```

## 如果您遇到了困难

- 再次运行 `openclaw doctor` 并仔细阅读输出（它通常会告诉您修复方法）。
- 检查：[故障排除](/en/gateway/troubleshooting)
- 在 Discord 中提问：[https://discord.gg/clawd](https://discord.gg/clawd)

import zh from "/components/footer/zh.mdx";

<zh />
