---
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 为最新版本。

## 推荐：`openclaw update`

最快的更新方式。它会检测您的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

```bash
openclaw update
```

要切换渠道或定位到特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`--channel beta` 优先使用 beta 版本，但当 beta 标签缺失或比最新的稳定版本旧时，运行时会回退到 stable/latest。如果您想对单次包更新使用原始的 npm beta dist-tag，请使用 `--tag beta`。

有关渠道语义，请参阅 [开发渠道](/en/install/development-channels)。

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

## 自动更新器

自动更新器默认关闭。在 `~/.openclaw/openclaw.json` 中启用：

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

| 渠道     | 行为                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后应用确定的抖动于 `stableJitterHours`（分阶段推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours`（默认：每小时）检查一次并立即应用。                 |
| `dev`    | 不自动应用。请手动使用 `openclaw update`。                                        |

网关还会在启动时记录更新提示（使用 `update.checkOnStart: false` 禁用）。

## 更新后

<Steps>

### 运行 doctor

```bash
openclaw doctor
```

迁移配置，审核私信策略，并检查网关运行状况。详情：[Doctor](/en/gateway/doctor)

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

提示：`npm view openclaw version` 显示当前已发布的版本。

### 固定提交 (源码)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

## 如果遇到问题

- 再次运行 `openclaw doctor` 并仔细阅读输出。
- 对于源码检出上的 `openclaw update --channel dev`，更新程序会在需要时自动引导 `pnpm`。如果你看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）并重新运行更新。
- 查看：[故障排除](/en/gateway/troubleshooting)
- 在 Discord 中提问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关

- [安装概述](/en/install) — 所有安装方法
- [医生](/en/gateway/doctor) — 更新后的健康检查
- [迁移](/en/install/migrating) — 主要版本迁移指南
