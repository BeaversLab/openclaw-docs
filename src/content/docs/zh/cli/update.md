---
summary: "用于 `openclaw update` 的 CLI 参考（相对安全的源码更新 + Gateway 自动重启）"
read_when:
  - You want to update a source checkout safely
  - You need to understand `--update` shorthand behavior
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 并在稳定/测试/开发通道之间切换。

如果您是通过 **npm/pnpm/bun** 安装的（全局安装，无 git 元数据），
更新将通过 [更新](/zh/install/updating) 中的包管理器流程进行。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`：成功更新后跳过重启 Gateway 服务。那些确实重启了 Gateway 的包管理器更新会在命令成功前验证重启后的服务报告了预期的更新版本。
- `--channel <stable|beta|dev>`：设置更新渠道（git + npm；持久化在配置中）。
- `--tag <dist-tag|version|spec>`：仅针对此次更新覆盖包目标。对于包安装，`main` 映射为 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划的更新操作（渠道/tag/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON，包括
  当更新后插件同步期间检测到 npm 插件构建产物漂移时的
  `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步超时时间（默认为 1800s）。
- `--yes`：跳过确认提示（例如降级确认）。

<Warning>降级需要确认，因为旧版本可能会破坏配置。</Warning>

## `update status`

显示当前更新渠道 + git 标签/分支/SHA（针对源码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：打印机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时时间（默认为 3s）。

## `update wizard`

用于选择更新渠道并确认更新后是否重启 Gateway
的交互式流程（默认为重启）。如果您在没有 git 检出的情况下选择 `dev`，
它将提议创建一个。

选项：

- `--timeout <seconds>`：每个更新步骤的超时时间（默认为 `1800`）

## 功能说明

当您显式切换渠道 (`--channel ...`) 时，OpenClaw 还会保持安装方式一致：

- `dev` → 确保进行 git checkout（默认为 `~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该 checkout 安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm dist-tag `beta`，但当 beta 缺失或
  比当前稳定版本旧时，则回退到 `latest`。

Gateway(网关) 核心自动更新程序（通过配置启用时）复用此相同的更新路径。

对于包管理器安装，`openclaw update` 在调用包管理器之前先解析目标包
版本。npm 全局安装使用分阶段安装：OpenClaw 将新包安装到临时的 npm 前缀中，在
那里验证打包的 `dist` 清单，然后将该干净的包树交换到
真正的全局前缀中。如果验证失败，更新后诊断、插件同步和
重启工作将不会从可疑树运行。即使安装的版本
已与目标匹配，该命令也会刷新全局包安装，
然后运行插件同步、核心命令完成刷新和重启工作。这
使打包的 sidecar 和渠道拥有的插件记录与
已安装的 OpenClaw 构建保持一致，同时将完整的插件命令完成重建留给
显式的 `openclaw completion --write-state` 运行。

## Git checkout 流程

### 渠道选择

- `stable`：检出最新的非 beta 标签，然后构建和诊断。
- `beta`：优先使用最新的 `-beta` 标签，但当 beta 缺失或较旧时回退到最新的稳定标签。
- `dev`：检出 `main`，然后获取和变基。

### 更新步骤

<Steps>
  <Step title="验证干净的工作树">不允许有未提交的更改。</Step>
  <Step title="切换渠道">切换到选定的渠道（标签或分支）。</Step>
  <Step title="获取上游">仅限开发模式。</Step>
  <Step title="飞前构建（仅限 dev）">在临时工作树中运行 lint 和 TypeScript 构建。如果最新提交失败，则最多回溯 10 个提交以查找最新的干净构建。</Step>
  <Step title="变基">变基到所选提交（仅限 dev）。</Step>
  <Step title="安装依赖">使用仓库包管理器。对于 pnpm 检出，更新器按需引导 `pnpm`（首先通过 `corepack`，然后是临时的 `npm install pnpm@10` 回退），而不是在 pnpm 工作区内运行 `npm run build`。</Step>
  <Step title="构建控制 UI">构建网关和控制 UI。</Step>
  <Step title="运行医生">`openclaw doctor` 作为最终的安全更新检查运行。</Step>
  <Step title="同步插件">将插件同步到活动渠道。Dev 使用捆绑插件；stable 和 beta 使用 npm。更新 npm 安装的插件。</Step>
</Steps>

<Warning>如果精确固定的 npm 插件更新解析为一个其完整性不同于存储的安装记录的工件，`openclaw update` 将中止该插件工件更新而不是安装它。仅在验证您信任新工件后，显式重新安装或更新插件。</Warning>

<Note>
更新后的插件同步失败会导致更新结果失败，并停止后续的重启工作。修复插件安装或更新错误，然后重新运行 `openclaw update`。

当更新后的 Gateway(网关) 启动时，启用的捆绑插件运行时依赖项会在插件激活之前暂存。更新触发的重启会在关闭 Gateway(网关) 之前排空任何活动的运行时依赖项暂存，因此 service-manager 重启不会中断正在进行的 npm 安装。

如果 pnpm bootstrap 仍然失败，更新器会提前停止并显示特定于包管理器的错误，而不是在检出中尝试 `npm run build`。

</Note>

## `--update` 简写

`openclaw --update` 重写为 `openclaw update`（适用于 shell 和启动器脚本）。

## 相关

- `openclaw doctor`（在 git 检出时提供先运行更新）
- [开发频道](/zh/install/development-channels)
- [更新](/zh/install/updating)
- [CLI 参考](/zh/cli)
