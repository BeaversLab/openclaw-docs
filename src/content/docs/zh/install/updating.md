---
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 为最新状态。

## 推荐： `openclaw update`

最快的更新方式。它会检测您的安装类型（npm 或 git），获取最新版本，运行 `openclaw doctor`，并重启网关。

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

`--channel beta` 优先使用 beta，但当 beta 标签缺失或比最新的稳定版本旧时，运行时会回退到 stable/latest。如果您想要原始的 npm beta dist-tag 进行一次性包更新，请使用 `--tag beta`。

有关渠道的语义，请参阅 [开发渠道](/zh/install/development-channels)。

## 在 npm 和 git 安装之间切换

当您想更改安装类型时，请使用渠道。更新程序会将您的状态、配置、凭据和工作区保留在 `~/.openclaw` 中；它只会更改 OpenClaw 和网关使用的 CLI 代码安装。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

首先使用 `--dry-run` 运行以预览确切的安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 渠道确保进行 git 检出、构建，并从该检出安装全局 CLI。`stable` 和 `beta` 渠道使用包安装。如果网关已安装，`openclaw update` 会刷新服务元数据并重启它，除非您传递 `--no-restart`。

## 备选方案：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 以跳过新手引导。要通过安装程序强制特定的安装类型，请传递 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 `openclaw update` 在 npm 包安装阶段后失败，请重新运行安装程序。安装程序不会调用旧的更新程序；它直接运行全局包安装，并且可以恢复部分更新的 npm 安装。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

要将恢复固定到特定版本或 dist-tag，请添加 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 备选方案：手动 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

当 `openclaw update` 管理全局 npm 安装时，它会先将目标安装到一个临时的 npm 前缀中，验证打包的 `dist` 清单，然后将干净的包树交换到真正的全局前缀中。这避免了 npm 将新包覆盖在旧包的过时文件上。如果安装命令失败，OpenClaw 会使用 `--omit=optional` 重试一次。如果回退也失败，该重试有助于处理原生可选依赖无法编译的主机，同时保持原始失败可见。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 高级 npm 安装主题

<AccordionGroup>
  <Accordion title="Read-only package tree">
    OpenClaw 在运行时将打包的全局安装视为只读，即使当前用户对全局包目录具有写入权限。打包的插件运行时依赖项被暂存到可写入的运行时目录中，而不是修改包树。这可以防止 `openclaw update` 与正在运行的网关或本地代理在同一安装期间修复插件依赖时发生竞争。

    一些 Linux npm 设置将全局包安装在 root 拥有的目录下，例如 `/usr/lib/node_modules/openclaw`。OpenClaw 通过相同的外部暂存路径支持该布局。

  </Accordion>
  <Accordion title="Hardened systemd units">
    设置一个包含在 `ReadWritePaths` 中的可写入暂存目录：

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    `OPENCLAW_PLUGIN_STAGE_DIR` 也接受路径列表。OpenClaw 从左到右解析列出的根目录中的打包插件运行时依赖项，将较早的根目录视为只读的预安装层，并且仅安装或修复到最后的可写入根目录中：

    ```ini
    Environment=OPENCLAW_PLUGIN_STAGE_DIR=/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

    如果未设置 `OPENCLAW_PLUGIN_STAGE_DIR`，则当 systemd 提供时，OpenClaw 使用 `$STATE_DIRECTORY`，否则回退到 `~/.openclaw/plugin-runtime-deps`。修复步骤将该暂存目录视为 OpenClaw 拥有的本地包根目录，并忽略用户 npm 前缀和全局设置，因此全局安装 npm 配置不会将打包的插件依赖项重定向到 `~/node_modules` 或全局包树中。

  </Accordion>
  <Accordion title="Disk-space preflight">
    在包更新和捆绑的运行时依赖项修复之前，OpenClaw 会尝试对目标卷进行尽力而为的磁盘空间检查。如果空间不足，会显示包含已检查路径的警告，但不会阻止更新，因为文件系统配额、快照和网络卷在检查后可能会发生变化。实际的 npm 安装、复制和安装后验证仍然具有决定性。
  </Accordion>
  <Accordion title="Bundled plugin runtime dependencies">
    打包安装会将捆绑的插件运行时依赖项保留在只读包树之外。在启动和 `openclaw doctor --fix` 期间，OpenClaw 仅修复在配置中处于活动状态、通过旧版渠道配置处于活动状态或由其捆绑清单默认启用的捆绑插件的运行时依赖项。仅持久的渠道认证状态不会触发 Gateway 启动时的运行时依赖项修复。

    显式禁用优先。即使禁用的插件或渠道存在于包中，也不会修复其运行时依赖项。外部插件和自定义加载路径仍使用 `openclaw plugins install` 或 `openclaw plugins update`。

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

| 渠道     | 行为                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后跨越 `stableJitterHours` 以确定性抖动应用（分阶段推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 检查一次（默认：每小时）并立即应用。                     |
| `dev`    | 不自动应用。手动使用 `openclaw update`。                                               |

网关还会在启动时记录更新提示（使用 `update.checkOnStart: false` 禁用）。
对于降级或事件恢复，请在网关环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻止自动应用，即使配置了 `update.auto.enabled`。除非也禁用了 `update.checkOnStart`，否则启动更新提示仍可以运行。

## 更新后

<Steps>

### 运行诊断程序

```bash
openclaw doctor
```

迁移配置，审核私信政策，并检查网关健康状况。详情：[Doctor](/zh/gateway/doctor)

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

<Tip>`npm view openclaw version` 显示当前已发布的版本。</Tip>

### 固定提交 (源代码)

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
pnpm install && pnpm build
openclaw gateway restart
```

要返回最新版本：`git checkout main && git pull`。

## 如果遇到困难

- 再次运行 `openclaw doctor` 并仔细阅读输出。
- 对于源代码检出上的 `openclaw update --channel dev`，更新程序会在需要时自动引导安装 `pnpm`。如果看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）并重新运行更新。
- 检查：[故障排除](/zh/gateway/troubleshooting)
- 在 Discord 中询问：[https://discord.gg/clawd](https://discord.gg/clawd)

## 相关

- [安装概述](/zh/install)：所有安装方法。
- [Doctor](/zh/gateway/doctor)：更新后的健康检查。
- [迁移](/zh/install/migrating)：主要版本迁移指南。
