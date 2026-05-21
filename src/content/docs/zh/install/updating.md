---
summary: "安全更新 OpenClaw（全局安装或源码），以及回滚策略"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "更新"
---

保持 OpenClaw 为最新状态。

## 推荐：`openclaw update`

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

`openclaw update` 不接受 `--verbose`。如需更新诊断，请使用
`--dry-run` 预览计划操作，使用 `--json` 获取结构化结果，或
使用 `openclaw update status --json` 检查渠道和可用性状态。
安装程序有自己的 `--verbose` 标志，但该标志不是
`openclaw update` 的一部分。

`--channel beta` 优先选择 beta，但当 beta 标签缺失或比最新的稳定版本旧时，运行时会回退到 stable/latest。如果您希望针对一次性包更新获取原始的 npm beta dist-tag，请使用 `--tag beta`。

对于托管插件，Beta 渠道回退是一个警告：核心更新仍然可能成功，因为插件会使用其记录的默认/最新发布版本，因为没有可用的插件 Beta 版本。

有关渠道语义，请参阅 [开发渠道](/zh/install/development-channels)。

## 在 npm 和 git 安装之间切换

当您想要更改安装类型时，请使用渠道。更新程序会将您的
状态、配置、凭据和工作区保留在 `~/.openclaw` 中；它只会更改
OpenClaw 和网关所使用的 CLI 代码安装。

```bash
# npm package install -> editable git checkout
openclaw update --channel dev

# git checkout -> npm package install
openclaw update --channel stable
```

请先运行 `--dry-run` 以预览确切的安装模式切换：

```bash
openclaw update --channel dev --dry-run
openclaw update --channel stable --dry-run
```

`dev` 渠道确保进行 git checkout，构建它，并从该检出安装全局 CLI。
`stable` 和 `beta` 渠道使用包安装。如果
网关已安装，`openclaw update` 将刷新服务元数据
并重启它，除非您传递 `--no-restart`。

对于具有托管 Gateway(网关) 服务的软件包安装，Gateway(网关)`openclaw update` 以该服务使用的软件包根目录为目标。如果 Shell `openclaw` 命令来自不同的安装，更新程序将打印两个根目录和托管服务 Node 路径。软件包更新使用拥有该服务根目录的软件包管理器，并在替换软件包之前根据目标发布引擎检查托管服务 Node。

## 备选方案：重新运行安装程序

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

添加 `--no-onboard` 以跳过新手引导。要强制通过安装程序使用特定的安装类型，请传递 `--install-method git --no-onboard` 或 `--install-method npm --no-onboard`。

如果 `openclaw update`npmnpm 在 npm 软件包安装阶段后失败，请重新运行安装程序。安装程序不会调用旧的更新程序；它直接运行全局软件包安装，并且可以恢复部分更新的 npm 安装。

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
```

要将恢复固定到特定版本或分发标签，请添加 `--version`：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm --version <version-or-dist-tag>
```

## 备选方案：手动 npm、pnpm 或 bun

```bash
npm i -g openclaw@latest
```

对于受监管的安装，首选 `openclaw update`Gateway(网关)Gateway(网关)Gateway(网关)Gateway(网关)，因为它可以协调正在运行的 Gateway(网关) 服务进行软件包交换。如果您在受监管的安装上手动更新，请在软件包管理器启动之前停止托管的 Gateway(网关)。软件包管理器会就地替换文件，否则正在运行的 Gateway(网关) 可能会在软件包树临时半交换的情况下尝试加载核心或插件文件。在软件包管理器完成后重启 Gateway(网关)，以便服务获取新安装。

对于 root 拥有的 Linux 系统级安装，如果 Linux`openclaw update` 失败并提示
`EACCES`npm，且您使用系统 npm 进行恢复，请在手动更换软件包期间保持 Gateway(网关) 处于停止状态。请使用您通常为该 Gateway(网关) 使用的相同 `openclaw` 配置文件标志或环境
。请将 `/usr/bin/npm`npm 替换为您主机上拥有 root 拥有的全局前缀的系统 npm：

```bash
openclaw gateway stop
sudo /usr/bin/npm i -g openclaw@latest
openclaw gateway install --force
openclaw gateway restart
```

然后验证服务：

```bash
openclaw --version
curl -fsS http://127.0.0.1:18789/readyz
openclaw plugins list --json
openclaw gateway status --deep --json
openclaw doctor --lint --json
```

当 `openclaw update` 管理全局 npm 安装时，它会先将目标安装到
临时的 npm 前缀中，验证打包的 `dist` 清单，然后将
干净的软件包树交换到真实的全局前缀中。这避免了 npm 将新软件包
叠加到旧软件包的陈旧文件上。如果安装命令失败，
OpenClaw 会使用 `--omit=optional` 重试一次。该重试有助于原生可选依赖项
无法编译的主机，同时如果回退也失败，则保持原始失败可见。

OpenClaw 管理的 npm update 和 plugin-update 命令还会清除子 npm 进程的 npm
`min-release-age` 隔离。npm 可能会将该策略报告为派生的 `before` 截止时间；两者都对通用
供应链隔离策略有用，但显式的 OpenClaw 更新意味着“立即安装选定的
OpenClaw 版本”。

```bash
pnpm add -g openclaw@latest
```

```bash
bun add -g openclaw@latest
```

### 高级 npm 安装主题

<AccordionGroup>
  <Accordion title="Read-only package tree"OpenClawOpenClawnpmGateway(网关)OpenClawLinuxnpm>
    OpenClaw 在运行时将打包的全局安装视为只读，即使当前用户对全局包目录具有写权限也是如此。插件包安装位于用户配置目录下 OpenClaw 拥有的 npm/git 根目录中，且 Gateway 启动不会修改 OpenClaw 包树。

    某些 Linux npm 设置会在 root 所拥有的目录（例如 `/usr/lib/node_modules/openclaw`OpenClaw）下安装全局包。OpenClaw 支持该布局，因为插件安装/更新命令会在该全局包目录之外进行写入操作。

  </Accordion>
  <Accordion title="Hardened systemd units"OpenClaw>
    授予 OpenClaw 对其配置/状态根目录的写入权限，以便显式插件安装、插件更新和 doctor 清理可以保留其更改：

    ```ini
    ReadWritePaths=/var/lib/openclaw /home/openclaw/.openclaw /tmp
    ```

  </Accordion>
  <Accordion title="Disk-space preflight"OpenClaw>
    在包更新和显式插件安装之前，OpenClaw 会尝试对目标卷进行尽力而为的磁盘空间检查。如果空间不足，会产生包含检查路径的警告，但不会阻止更新，因为文件系统配额、快照和网络卷可能会在检查后发生变化。实际的包管理器安装和安装后验证仍然具有权威性。
  </Accordion>
</AccordionGroup>

## 自动更新程序

自动更新程序默认处于关闭状态。请在 `~/.openclaw/openclaw.json` 中启用它：

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

| 频道     | 行为                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| `stable` | 等待 `stableDelayHours`，然后在 `stableJitterHours` 范围内应用确定性抖动（分布式推出）。 |
| `beta`   | 每隔 `betaCheckIntervalHours` 检查一次（默认：每小时）并立即应用。                       |
| `dev`    | 不自动应用。请手动使用 `openclaw update`。                                               |

Gateway(网关) 还会在启动时记录更新提示（可使用 `update.checkOnStart: false` 禁用）。
对于降级或故障恢复，请在 Gateway(网关) 环境中设置 `OPENCLAW_NO_AUTO_UPDATE=1` 以阻止自动应用，即使配置了 `update.auto.enabled`。除非同时也禁用了 `update.checkOnStart`，否则启动时更新提示仍可运行。

通过实时 Gateway(网关) 控制平面处理程序请求的包管理器更新
不会替换正在运行的 Gateway(网关) 进程内的包树。在受管
服务安装中，Gateway(网关) 会启动一个分离的交接，退出，并让
正常的 Gateway(网关)Gateway(网关)Gateway(网关)`openclaw update --yes --json`CLIGateway(网关)macOSGateway(网关) CLI 路径停止服务，替换
包，刷新服务元数据，重启，验证 Gateway(网关) 版本
和可达性，并在可能时恢复已安装但未加载的 macOS LaunchAgent。
如果 Gateway(网关) 无法安全地进行该交接，`update.run` 将报告
一个安全的 Shell 命令，而不是在进程中运行包管理器。

## 更新后

<Steps>

### 运行检查程序

```bash
openclaw doctor
```

迁移配置，审核私信 策略，并检查 Gateway(网关) 运行状况。详情：[Doctor](/zh/gateway/doctor)

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
- 对于源代码检出上的 `openclaw update --channel dev`，更新程序会在需要时自动引导 `pnpm`。如果看到 pnpm/corepack 引导错误，请手动安装 `pnpm`（或重新启用 `corepack`）并重新运行更新。
- 检查：[故障排除](/zh/gateway/troubleshooting)
- 在 Discord 中询问：[Discordhttps://discord.gg/clawd](https://discord.gg/clawd)

## 相关

- [安装概述](/zh/install)：所有安装方法。
- [Doctor](/zh/gateway/doctor)：更新后的运行状况检查。
- [迁移](/zh/install/migrating)：主要版本迁移指南。
