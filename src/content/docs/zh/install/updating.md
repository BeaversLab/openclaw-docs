---
summary: "安全更新 OpenClaw（全局安装或源码安装），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 为最新版本。

## 推荐：`openclaw update`

最快的方法是更新。它会检测您的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

```bash
openclaw update
```

要切换渠道或定位到特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` 优先使用 beta，但当 beta 标签缺失或比最新的稳定版本旧时，运行时会回退到 stable/latest。如果您想要原始的 npm beta dist-tag 进行一次性软件包更新，请使用 `--tag beta`。

有关渠道的语义，请参阅 [开发渠道](/zh/install/development-channels)。

## 备选方案：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 以跳过新手引导。对于源码安装，请传递 `--install-method git --no-onboard`。

## 备选方案：手动 npm, pnpm, 或 bun

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### Root 拥有的全局 npm 安装

某些 Linux npm 设置会在 root 拥有的目录（例如
`/usr/lib/node_modules/openclaw`）下安装全局包。OpenClaw 支持该布局：安装的
包在运行时被视为只读，打包的插件运行时
依赖会被暂存到可写的运行时目录中，而不是改变
包树。

对于加固的 systemd 单元，请设置一个包含在
`ReadWritePaths` 中的可写暂存目录：

```ini
Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
```

如果未设置 `OPENCLAW_PLUGIN_STAGE_DIR`，当
systemd 提供时，OpenClaw 将使用 `$STATE_DIRECTORY`，否则回退到 `~/.openclaw/plugin-runtime-deps`。

## 自动更新器

自动更新器默认处于关闭状态。在 `~/.openclaw/openclaw.json` 中启用它：

```json5
{
  update: {
    channel: "stable",
    auto: {
      enabled: true,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

| 频道     | 行为                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后在 `stableJitterHours` 内应用确定性抖动（分批推出）。 |
| `beta`   | 每 `betaCheckIntervalHours` 检查一次（默认：每小时）并立即应用。                   |
| `dev`    | 不自动应用。请手动使用 `openclaw update`。                                         |

网关还会在启动时记录更新提示（可通过 `update.checkOnStart: false` 禁用）。

## 更新后

<Steps>

### 运行诊断

```bash
openclaw doctor
```

迁移配置，审核私信策略，并检查网关健康状况。详情：[Doctor](/zh/gateway/doctor)

### 重启网关

```bash
openclaw gateway restart
```

### 验证

```bash
openclaw health
```

</Steps>

## 回滚

### 固定版本 (npm)

```bash
npm i -g openclaw@<version>
openclaw doctor
openclaw gateway restart
```

提示：`npm view openclaw version` 显示当前发布的版本。

### 固定提交 (源码)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

## 如果遇到困难

- 再次运行 `openclaw doctor` 并仔细阅读输出。
- 对于源码检出（source checkouts）上的 `openclaw update --channel dev`，更新程序会在需要时自动引导 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）并重新运行更新。
- 检查：[故障排除](/zh/gateway/troubleshooting)
- 在 Discord 中询问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关

- [安装概述](/zh/install) — 所有安装方法
- [Doctor](/zh/gateway/doctor) — 更新后的健康检查
- [迁移](/zh/install/migrating) — 主要版本迁移指南
