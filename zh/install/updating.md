---
summary: "安全地更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

# 更新

保持 OpenClaw 为最新版本。

## 推荐：`openclaw update`

最快更新的方法。它会检测您的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

```bash
openclaw update
```

要切换渠道或定位到特定版本：

```bash
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

有关渠道的语义，请参阅 [开发渠道](/zh/install/development-channels)。

## 备选方案：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 以跳过新手引导。对于源码安装，请传递 `--install-method git --no-onboard`。

## 备选方案：手动 npm 或 pnpm

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

## 自动更新

自动更新功能默认关闭。在 `~/.openclaw/openclaw.json` 中启用：

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

| 渠道     | 行为                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后对 `stableJitterHours` 应用确定性抖动（分阶段推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 检查一次（默认：每小时）并立即应用。                 |
| `dev`    | 不自动应用。手动使用 `openclaw update`。                                           |

网关还会在启动时记录更新提示（使用 `update.checkOnStart: false` 禁用）。

## 更新后

<Steps>

### 运行医生

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

## 如果您遇到了问题

- 再次运行 `openclaw doctor` 并仔细阅读输出。
- 检查：[故障排除](/zh/gateway/troubleshooting)
- 在 Discord 中询问：[https://discord.gg/clawd](https://discord.gg/clawd)

import zh from "/components/footer/zh.mdx";

<zh />
