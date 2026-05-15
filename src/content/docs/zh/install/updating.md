---
summary: "OpenClaw安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 为最新状态。

## 推荐：`openclaw update`

最快的更新方式。它会检测您的安装类型（npm 或 git），获取最新版本，运行 npm`openclaw doctor`，并重启网关。

```bash
openclaw update
```

要切换渠道或指定特定版本：

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag main
openclaw update --dry-run   # preview without applying
```

`openclaw update` 不接受 `--verbose`。要进行更新诊断，请使用
`--dry-run` 预览计划操作，使用 `--json` 获取结构化结果，或
使用 `openclaw update status --json` 检查渠道和可用性状态。
安装程序有其自己的 `--verbose` 标志，但该标志不属于
`openclaw update` 的一部分。

`--channel beta` 优先使用 beta，但当 beta 标签缺失或比最新的稳定版本旧时，
运行时会回退到 stable/latest。如果您想为一次性包更新获取原始的 npm beta dist-tag，
请使用 `--tag beta`npm。

有关渠道的语义，请参阅 [开发渠道](/zh/install/development-channels)。

## 在 npm 和 git 安装之间切换

当您想要更改安装类型时，请使用渠道。更新程序会将您的
状态、配置、凭据和工作区保留在 `~/.openclaw`OpenClawCLI 中；它仅更改
CLI 和网关使用的 OpenClaw 代码安装。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

首先运行 `--dry-run` 以预览确切的安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev`CLI 渠道确保进行 git 检出，构建它，并从该检出安装全局 CLI。
`stable` 和 `beta` 渠道使用包安装。如果
网关已安装，`openclaw update` 将刷新服务元数据
并重启它，除非您传递 `--no-restart`。

## 备选方案：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 以跳过新手引导。要通过安装程序强制指定特定的安装类型，请传递 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 包安装阶段后失败，请重新运行安装程序。安装程序不会调用旧的更新程序；它直接运行全局包安装，并且可以恢复部分更新的 npm 安装。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

要将恢复固定到特定版本或分发标签，请添加 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 替代方案：手动 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

对于受监督的安装，首选 `openclaw update`，因为它可以协调正在运行的 Gateway(网关) 服务进行包交换。如果在受管理的 Gateway(网关) 运行时手动更新，请在包管理器完成后立即重启 Gateway(网关)，以免旧进程继续从被替换的包文件中提供服务。

当 `openclaw update` 管理全局 npm 安装时，它首先将目标安装到临时的 npm 前缀中，验证打包的 `dist` 清单，然后将干净的包树交换到真实的全局前缀中。这避免了 npm 将新包覆盖到旧包的陈旧文件上。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次。这种重试有助于原生可选依赖项无法编译的主机，同时如果回退也失败，则保持原始失败可见。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 高级 npm 安装主题

<AccordionGroup>
  <Accordion title="Read-only package tree"OpenClawOpenClawnpmGateway(网关)OpenClawLinuxnpm>
    OpenClaw 在运行时将打包的全局安装视为只读，即使当前用户对全局包目录具有写入权限也是如此。插件包安装位于用户配置目录下 OpenClaw 拥有的 npm/git 根目录中，并且 Gateway(网关) 启动不会改变 OpenClaw 包树。

    某些 Linux npm 设置将全局包安装在 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`OpenClaw。OpenClaw 支持该布局，因为插件安装/更新命令在该全局包目录之外进行写入。

  </Accordion>
  <Accordion title="Hardened systemd units"OpenClaw>
    授予 OpenClaw 对其配置/状态根目录的写入权限，以便显式插件安装、插件更新和 doctor 清理可以持久化其更改：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Disk-space preflight"OpenClaw>
    在包更新和显式插件安装之前，OpenClaw 会尝试对目标卷进行尽力而为的磁盘空间检查。空间不足会生成包含已检查路径的警告，但不会阻止更新，因为文件系统配额、快照和网络卷可能会在检查后发生变化。实际的包管理器安装和安装后验证仍然具有权威性。
  </Accordion>
</AccordionGroup>

## 自动更新程序

自动更新程序默认处于关闭状态。在 `~/.openclaw/openclaw.json` 中启用它：

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

| 频道     | 行为                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `stable` | 等待 `stableDelayHours`，然后在 `stableJitterHours` 内应用确定性抖动（分阶段推出）。 |
| `beta`   | 每 `betaCheckIntervalHours` 检查一次（默认：每小时）并立即应用。                     |
| `dev`    | 不自动应用。手动使用 `openclaw update`。                                             |

Gateway(网关) 还会在启动时记录更新提示（使用 `update.checkOnStart: false` 禁用）。
为了降级或在事故后恢复，请在 Gateway(网关) 环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻止自动应用，即使配置了 `update.auto.enabled`。启动更新提示仍可能运行，除非 `update.checkOnStart` 也被禁用。

通过实时 Gateway(网关) 控制平面处理程序请求的包管理器更新
会在包交换后强制执行非延迟、无冷却的更新重启。这
可以避免旧的内存进程存活过久，从而从
已被替换的包树中延迟加载块。Shell Gateway(网关)`openclaw update`
仍然是受监管安装的首选路径，因为它可以
在更新周围停止并重启服务。

## 更新后

<Steps>

### 运行诊断

```bash
openclaw doctor
```

迁移配置，审计私信策略，并检查 Gateway(网关) 健康状况。详情：[Doctor](/zh/gateway/doctor)

### 重启 Gateway(网关)

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

<Tip>`npm view openclaw version` 显示当前发布的版本。</Tip>

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
- 对于源代码检出上的 `openclaw update --channel dev`，更新程序会在需要时自动引导 `pnpm`。如果您看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）并重新运行更新。
- 检查：[故障排除](/zh/gateway/troubleshooting)
- 在 Discord 中询问：[Discordhttps://discord.gg/clawd](https://discord.gg/clawd)

## 相关

- [安装概述](/zh/install)：所有安装方法。
- [Doctor](/zh/gateway/doctor)：更新后的健康检查。
- [迁移](/zh/install/migrating)：主要版本迁移指南。
