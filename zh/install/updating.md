---
summary: "安全更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - 更新 OpenClaw
  - 更新后出现问题
title: "Updating"
---

# 更新

OpenClaw 更新迭代很快（“1.0”之前）。请像对待基础设施发布一样对待更新：更新 → 运行检查 → 重启（或使用 `openclaw update`，它会重启）→ 验证。

## 推荐：重新运行网站安装程序（就地升级）

**首选**的更新路径是从网站重新运行安装程序。它会检测现有安装，就地升级，并在必要时运行 `openclaw doctor`。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

注意事项：

- 如果您不想再次运行新手引导，请添加 `--no-onboard`。
- 对于**源码安装**，请使用：

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  仅当仓库干净时，安装程序才会 `git pull --rebase`。

- 对于**全局安装**，该脚本底层使用 `npm install -g openclaw@latest`。
- 遗留说明：`clawdbot` 作为兼容性垫片仍然可用。

## 更新之前

- 了解您的安装方式：**全局**（npm/pnpm）还是**源码**（git clone）。
- 了解您的 Gateway(网关) 运行方式：**前台终端**还是**受监管服务**（launchd/systemd）。
- 备份您的配置：
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

对于 Bun 运行时，我们**不**推荐使用 Gateway(网关)（存在 WhatsApp/Telegram bug）。

切换更新渠道（git + npm 安装）：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

使用 `--tag <dist-tag|version|spec>` 进行一次性包目标覆盖。

要通过包管理器安装获取当前的 GitHub `main` 头部：

```bash
openclaw update --tag main
```

等效的手动操作：

```bash
npm i -g github:openclaw/openclaw#main
```

```bash
pnpm add -g github:openclaw/openclaw#main
```

您还可以将显式的包规范传递给 `--tag` 以进行一次性更新（例如 GitHub 引用或 tarball URL）。

有关渠道语义和发行说明，请参阅[开发渠道](/zh/install/development-channels)。

注意：在 npm 安装中，网关会在启动时记录更新提示（检查当前渠道标签）。可以通过 `update.checkOnStart: false` 禁用。

### 核心自动更新程序（可选）

自动更新程序**默认关闭**，是核心 Gateway(网关) 功能（不是插件）。

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

- `stable`：当检测到新版本时，OpenClaw 会等待 `stableDelayHours`，然后在 `stableJitterHours` 内应用确定性的每次安装抖动（分散推出）。
- `beta`：按 `betaCheckIntervalHours` 频率（默认：每小时）检查，并在有更新可用时应用。
- `dev`：不自动应用；请使用手动 `openclaw update`。

在启用自动化之前，请使用 `openclaw update --dry-run` 预览更新操作。

然后：

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

注意：

- 如果您的 Gateway(网关) 作为服务运行，建议优先使用 `openclaw gateway restart` 而不是直接终止 PID。
- 如果您固定在特定版本，请参阅下面的“回滚 / 固定版本”。

## 更新 (`openclaw update`)

对于 **源码安装**（git checkout），建议：

```bash
openclaw update
```

它会运行一个相对安全的更新流程：

- 需要一个干净的工作树。
- 切换到选定的渠道（标签或分支）。
- 获取并针对配置的上游（开发渠道）进行变基。
- 安装依赖、构建、构建控制 UI，并运行 `openclaw doctor`。
- 默认情况下重启网关（使用 `--no-restart` 跳过）。

如果您是通过 **npm/pnpm** 安装的（没有 git 元数据），`openclaw update` 将尝试通过您的包管理器进行更新。如果无法检测到安装，请改用“更新（全局安装）”。

## 更新（控制 UI / RPC）

控制 UI 具有 **更新并重启** 功能（RPC：`update.run`）。它将：

1. 运行与 `openclaw update` 相同的源码更新流程（仅限 git checkout）。
2. 写入一个包含结构化报告（stdout/stderr 尾部）的重启标记。
3. 重启网关，并将报告发送到最后一个活跃会话。

如果变基失败，网关将中止并重启而不应用更新。

## 更新（从源码）

从仓库检出目录中：

建议：

```bash
openclaw update
```

手动（大致等效）：

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

注意：

- `pnpm build` 在您运行打包的 `openclaw` 二进制文件 ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) 或使用 Node 运行 `dist/` 时很重要。
- 如果您在没有全局安装的情况下从仓库检出运行，请使用 `pnpm openclaw ...` 执行 CLI 命令。
- 如果您直接从 TypeScript (`pnpm openclaw ...`) 运行，通常不需要重新构建，但 **配置迁移仍然适用** → 运行 doctor。
- 在全局安装和 git 安装之间切换很容易：安装另一种版本，然后运行 `openclaw doctor`，以便将网关服务入口重写为当前安装。

## 始终运行：`openclaw doctor`

Doctor 是“安全更新”命令。它有意设计得很枯燥：修复 + 迁移 + 警告。

注意：如果您使用的是 **源码安装** (git checkout)，`openclaw doctor` 将会建议先运行 `openclaw update`。

它执行的典型操作：

- 迁移已弃用的配置键 / 旧版配置文件位置。
- 审核私信策略并对有风险的“开放”设置发出警告。
- 检查 Gateway(网关) 健康状况并可以建议重启。
- 检测并迁移较旧的网关服务 (launchd/systemd; legacy schtasks) 到当前的 OpenClaw 服务。
- 在 Linux 上，确保 systemd 用户驻留 (以便 Gateway(网关) 在注销后继续运行)。

详情：[Doctor](/zh/gateway/doctor)

## 启动 / 停止 / 重启 Gateway(网关)

CLI (适用于任何操作系统)：

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

如果您处于被监管模式：

- macOS launchd (应用捆绑的 LaunchAgent): `launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (使用 `ai.openclaw.<profile>`; 旧版 `com.openclaw.*` 仍然有效)
- Linux systemd 用户服务: `systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2): `systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` 仅在已安装服务时有效；否则运行 `openclaw gateway install`。

运行手册 + 确切的服务标签：[Gateway(网关) runbook](/zh/gateway)

## 回滚 / 固定版本 (当出现问题时)

### 固定版本 (全局安装)

安装一个已知良好的版本 (将 `<version>` 替换为上一个正常工作的版本)：

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

### 按日期固定版本 (源码)

从某个日期选择一个提交 (例如：“截至 2026-01-01 的 main 分支状态”)：

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

如果您稍后想回到最新版本：

```bash
git checkout main
git pull
```

## 如果您遇到问题

- 再次运行 `openclaw doctor` 并仔细阅读输出 (它通常会告诉您修复方法)。
- 检查：[故障排除](/zh/gateway/troubleshooting)
- 在 Discord 中询问：[https://discord.gg/clawd](https://discord.gg/clawd)

import en from "/components/footer/en.mdx";

<en />
