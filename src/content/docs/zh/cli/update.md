---
summary: "用于 `openclaw update` 的 CLI 参考（相对安全的源码更新 + Gateway 自动重启）"
read_when:
  - You want to update a source checkout safely
  - You are debugging `openclaw update` output or options
  - You need to understand `--update` shorthand behavior
title: "更新"
---

# `openclaw update`

安全地更新 OpenClaw 并在稳定/测试/开发通道之间切换。

如果您是通过 **npm/pnpm/bun** 安装的（全局安装，无 git 元数据），
更新会通过 [Updating](npm/en/install/updating) 中的包管理器流程进行。

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

- `--no-restart`Gateway(网关)Gateway(网关)：成功更新后跳过重启 Gateway 服务。包管理器更新中确实重启 Gateway 的，会在命令成功前验证重启后的服务报告了预期的更新版本。
- `--channel <stable|beta|dev>`npm：设置更新渠道（git + npm；持久化存储在配置中）。
- `--tag <dist-tag|version|spec>`：仅针对本次更新覆盖包目标。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划的更新操作（渠道/标签/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON，包括
  `postUpdate.plugins.warnings` 当核心更新成功后损坏或无法加载的受管插件需要
  修复时，以及 `postUpdate.plugins.integrityDrifts`npm
  当在更新后插件同步期间检测到 npm 插件构件偏差时。
- `--timeout <seconds>`：每步超时时间（默认为 1800 秒）。
- `--yes`：跳过确认提示（例如降级确认）。

`openclaw update` 没有 `--verbose` 标志。使用 `--dry-run` 预览计划的渠道/标签/安装/重启操作，使用 `--json` 获取机器可读的结果，以及当您只需要渠道和可用性详细信息时使用 `openclaw update status --json`Gateway(网关)Gateway(网关)。如果您正在调试更新周围的 Gateway(网关) 日志，控制台详细程度和文件日志级别是分开的：Gateway(网关) `--verbose` 影响终端/WebSocket 输出，而文件日志需要在配置中使用 `logging.level: "debug"` 或 `"trace"`Gateway(网关)。请参阅 [Gateway(网关) 日志记录](/zh/gateway/logging)。

<Note>在 Nix 模式 (Nix`OPENCLAW_NIX_MODE=1`) 下，禁用了变异的 `openclaw update`Nix 运行。请改为更新此安装的 Nix 源或 flake 输入；对于 nix-openclaw，请使用以代理优先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 保持只读。</Note>

<Warning>降级需要确认，因为旧版本可能会破坏配置。</Warning>

## `update status`

显示活动的更新渠道 + git 标签/分支/SHA（对于源代码检出），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：打印机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时（默认为 3s）。

## `update wizard`

交互式流程，用于选择更新渠道并确认更新后是否重启 Gateway(网关)（默认为重启）。如果您在没有 git 检出的情况下选择 Gateway(网关)`dev`，它将提议创建一个。

选项：

- `--timeout <seconds>`：每个更新步骤的超时时间（默认 `1800`）

## 它的作用

当您明确切换渠道 (`--channel ...`OpenClaw) 时，OpenClaw 还会保持安装方法一致：

- `dev` → 确保存在 git 检出（默认：`~/openclaw`，可通过 `OPENCLAW_GIT_DIR`CLI 覆盖），
  更新它，并从该检出安装全局 CLI。
- `stable`npm → 使用 `latest` 从 npm 安装。
- `beta`npm → 优先使用 npm dist-tag `beta`，但当 beta 缺失
  或比当前的稳定版本旧时，回退到 `latest`。

Gateway 核心自动更新程序（通过配置启用时）在活动的 Gateway 请求处理程序之外
启动 CLI 更新路径。控制平面 Gateway(网关)CLIGateway(网关)`update.run`Gateway(网关) 包管理器更新
会在包交换后强制执行非延迟、无冷却的更新重启，因为旧的 Gateway
进程可能仍持有指向被新包删除的文件的内存块。

对于包管理器安装，`openclaw update`npmOpenClawnpm 会在调用包管理器之前解析目标包
版本。npm 全局安装使用分阶段安装：OpenClaw 将新包安装到临时的 npm 前缀中，
在那里验证打包的 `dist`OpenClaw 清单，然后将该干净的包树交换到
真正的全局前缀中。如果验证失败，更新后检查、插件同步和
重启工作不会从可疑的树运行。即使已安装的版本
已匹配目标，该命令也会刷新全局包安装，
然后运行插件同步、核心命令完成刷新和重启工作。这
保持打包的 sidecar 和渠道拥有的插件记录与
已安装的 OpenClaw 构建一致，同时将完整的插件命令完成重建留给
显式的 `openclaw completion --write-state` 运行。

当安装了本地托管的 Gateway(网关) 服务并启用重启时，包管理器更新会在替换包树之前停止运行中的服务，然后从更新的安装中刷新服务元数据，重启服务，并在报告成功之前验证重启的 Gateway(网关) 报告的版本是否符合预期。在 macOS 上，更新后检查还会验证 LaunchAgent 是否已为活动配置文件加载/运行，以及配置的回环端口是否健康。如果 plist 已安装但 launchd 未对其进行监管，OpenClaw 会自动重新引导 LaunchAgent，然后重新运行健康/版本/渠道就绪检查。全新的引导会直接加载 RunAtLoad 任务，因此更新恢复不会立即 Gateway(网关)Gateway(网关)macOSOpenClaw`kickstart -k`Gateway(网关)Gateway(网关) 新生成的 Gateway(网关)。如果 Gateway(网关) 仍未恢复健康，该命令将以非零状态退出，并打印重启日志路径以及明确的重启、重新安装和包回滚说明。使用 `--no-restart`Gateway(网关) 时，包替换仍然运行，但托管服务不会停止或重启，因此运行中的 Gateway(网关) 可能会保留旧代码，直到您手动重启它。

## Git 检出流程

### 渠道选择

- `stable`：检出最新的非 beta 标签，然后构建并检查。
- `beta`：首选最新的 `-beta` 标签，但在 beta 缺失或较旧时回退到最新的稳定标签。
- `dev`：检出 `main`，然后获取并变基。

### 更新步骤

<Steps>
  <Step title="验证干净的工作树">要求没有未提交的更改。</Step>
  <Step title="切换渠道">切换到选定的渠道（标签或分支）。</Step>
  <Step title="获取上游">仅限开发模式。</Step>
  <Step title="预检构建（仅限开发）">在临时工作树中运行 TypeScript 构建。如果 tip 失败，则最多回溯 10 个提交以找到最新的可构建提交。设置 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 以在此预检期间也运行 lint；lint 以受限串行模式运行，因为用户更新主机通常比 CI 运行器更小。</Step>
  <Step title="变基">变基到选定的提交（仅限开发）。</Step>
  <Step title="安装依赖">使用仓库包管理器。对于 pnpm 检出，更新程序按需引导 `pnpm`（首先通过 `corepack`，然后是临时的 `npm install pnpm@10` 回退），而不是在 pnpm 工作区内运行 `npm run build`。</Step>
  <Step title="构建 Control UI">构建网关和 Control UI。</Step>
  <Step title="运行 doctor">`openclaw doctor` 作为最终的安全更新检查运行。</Step>
  <Step title="同步插件">将插件同步到活动渠道。Dev 使用捆绑插件；stable 和 beta 使用 npm。更新已跟踪的插件安装。</Step>
</Steps>

在 beta 更新渠道上，遵循 default/latest 行的已跟踪 npm 和 ClawHub 插件安装会首先尝试插件的 `@beta` 版本。如果插件没有 beta 版本，OpenClaw 将回退到记录的 default/latest 规范。对于 npm 插件，当 beta 包存在但安装验证失败时，OpenClaw 也会回退。精确版本和显式标记不会被重写。

<Warning>如果精确固定的 npm 插件更新解析为某个构件，且其完整性与存储的安装记录不同，npm`openclaw update` 将中止该插件构件的更新，而不是安装它。仅在确认您信任新构件后，才重新安装或显式更新该插件。</Warning>

<Note>
更新后局限于受管插件的插件同步失败会在核心更新成功后作为警告报告。JSON 结果保留顶级更新 `status: "ok"` 并报告带有 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 指导的 `postUpdate.plugins.status: "warning"`。意外的更新器或同步异常仍会导致更新结果失败。修复插件安装或更新错误，然后重新运行 `openclaw doctor --fix` 或 `openclaw update`Gateway(网关)。

当更新后的 Gateway(网关) 启动时，插件加载仅为验证模式：启动不运行包管理器或更改依赖树。包管理器 `update.run` 重启会在包树交换后绕过正常的空闲延迟和重启冷却，因此旧进程无法继续延迟加载已删除的代码块。

如果 pnpm 引导仍然失败，更新器将提前停止并显示特定于包管理器的错误，而不是尝试在检出中运行 `npm run build`。

</Note>

## `--update` 简写

`openclaw --update` 重写为 `openclaw update` （适用于 Shell 和启动器脚本）。

## 相关

- `openclaw doctor` （在 git 检出时提供先运行更新）
- [开发通道](/zh/install/development-channels)
- [更新](/zh/install/updating)
- [CLI 参考](CLI/en/cli)
