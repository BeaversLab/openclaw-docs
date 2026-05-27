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
则通过 [Updating](/zh/install/updating) 中的包管理器流程进行更新。

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
- `--tag <dist-tag|version|spec>`：仅针对此次更新覆盖包目标。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`；GitHub/git 源规格会在分阶段的全局 npm 安装之前被打包到临时 tarball 中。
- `--dry-run`：预览计划的更新操作（渠道/标签/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON，包括
  `postUpdate.plugins.warnings`，用于在核心更新成功后需要修复损坏或无法加载的托管插件时，
  当插件没有 beta 版本时的 beta 渠道插件回退详情，以及在更新后插件同步期间检测到 npm 插件产物漂移时的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步超时时间（默认为 1800 秒）。
- `--yes`：跳过确认提示（例如降级确认）。

`openclaw update` 没有 `--verbose` 标志。使用 `--dry-run` 预览
计划的渠道/标签/安装/重启操作，使用 `--json` 获取机器可读
结果，以及当您只需要渠道和
可用性详细信息时使用 `openclaw update status --json`。如果您正在调试更新周围的 Gateway(网关) 日志，
控制台详细程度和文件日志级别是分开的：Gateway(网关) `--verbose` 影响
终端/WebSocket 输出，而文件日志需要配置中的 `logging.level: "debug"` 或
`"trace"`。请参阅 [Gateway(网关) logging](/zh/gateway/logging)。

<Note>在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，变更 `openclaw update` 运行是被禁用的。请改为更新此安装的 Nix 源或 flake 输入；对于 nix-openclaw，请使用代理优先的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 保持只读。</Note>

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

- `dev` → 确保存在 git checkout（默认：`~/openclaw`，或者当设置了
  `OPENCLAW_HOME` 时为 `$OPENCLAW_HOME/openclaw`；可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该 checkout 安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm dist-tag `beta`，但当 beta
  缺失或比当前稳定版旧时，会回退到 `latest`。

当通过配置启用时，Gateway(网关) 核心自动更新器会在实时 CLI 请求处理程序之外启动 Gateway(网关) 更新路径。
控制平面 `update.run` 包管理器更新也使用托管服务移交，而不是替换实时 Gateway(网关) 进程内的包树。
Gateway(网关) 启动一个分离的辅助程序，退出，然后该辅助程序从 CLI 进程树之外运行正常的 `openclaw update --yes --json` Gateway(网关) 路径。
如果该移交不可用，`update.run` 会返回一个结构化响应，其中包含可手动运行的安全 shell 命令。

对于包管理器安装，`openclaw update` 在调用包管理器之前会解析目标包版本。
npm 全局安装使用分阶段安装：OpenClaw 将新包安装到临时的 npm 前缀中，在那里验证打包的 `dist` 清单，然后将该干净的包树交换到实际的全局前缀中。
如果验证失败，则更新后的诊断、插件同步和重启工作不会从可疑树运行。
即使安装的版本已匹配目标，该命令也会刷新全局包安装，然后运行插件同步、核心命令完成刷新和重启工作。
这使打包的 sidecar 和渠道拥有的插件记录与已安装的 OpenClaw 构建保持一致，同时将完整的插件命令完成重建留给显式 `openclaw completion --write-state` 运行。

当安装了本地托管的 Gateway(网关) 服务并启用重启时，
包管理器更新会在替换包树之前停止运行中的服务，
然后从更新后的安装中刷新服务元数据，重启该服务，
并在报告 Gateway(网关)Gateway(网关)`Gateway: restarted and verified.`macOSOpenClaw 之前验证重启后的 Gateway(网关) 报告了预期的版本。
在 macOS 上，更新后检查还会验证 LaunchAgent 是否为活动配置文件加载/运行，
以及配置的环回端口是否健康。如果 plist 已安装但 launchd 未对其进行监管，
OpenClaw 会自动重新引导 LaunchAgent，然后重新运行健康/版本/渠道就绪检查。
全新的引导会直接加载 RunAtLoad 作业，因此更新恢复不会立即 `kickstart -k`Gateway(网关)Gateway(网关)
新生成的 Gateway(网关)。如果 Gateway(网关) 仍未恢复正常，
该命令将以非零代码退出，并打印重启日志路径以及明确的重启、
重新安装和包回滚说明。如果重启无法运行，该命令会
打印 `Gateway: restart skipped (...)` 或 `Gateway: restart failed: ...` 并附带手动
`openclaw gateway restart` 提示。使用 `--no-restart`Gateway(网关) 时，
包替换仍然会运行，但托管服务不会停止或重启，
因此运行中的 Gateway(网关) 可能会保留旧代码，直到您手动重启它。

### 控制平面响应形状

当通过 Gateway(网关) 控制平面在包管理器安装上调用
`update.run`Gateway(网关)CLIGateway(网关) 时，处理程序会分别报告移交启动和
Gateway(网关) 退出后继续的 CLI 更新：

- `ok: true`、`result.status: "skipped"`、
  `result.reason: "managed-service-handoff-started"` 和
  `handoff.status: "started"`Gateway(网关) 意味着 Gateway(网关) 创建了托管服务
  移交并安排了自己的重启，以便分离的助手可以在
  实时服务进程之外运行 `openclaw update --yes --json`。
- `ok: false`、`result.reason: "managed-service-handoff-unavailable"` 和
  `handoff.status: "unavailable"`OpenClaw 表示 OpenClaw 无法找到用于安全移交的
  监管服务边界。响应中包含
  `handoff.command`Gateway(网关)，即从 Gateway 外部运行的 shell 命令。
- `ok: false`、`result.reason: "managed-service-handoff-failed"`Gateway(网关) 表示
  Gateway 尝试创建移交但无法生成分离的辅助进程。

在 Gateway 退出之前，仍然会写入 `sentinel`Gateway(网关)CLI 负载，并且在托管服务重启
健康检查完成后，CLI 移交会更新相同的重启哨兵。在移交期间，哨兵可以携带
没有成功后续操作的 `stats.reason: "restart-health-pending"`Gateway(网关)CLI；重启后的
Gateway 会持续轮询它，仅在 CLI 验证服务健康并用最终的 `ok`
结果重写哨兵后，才会触发后续操作。当该哨兵处于挂起或失败状态时，
`openclaw status` 和 `openclaw status --all` 会显示 `Update restart`
行，而 `update.status` 会返回
最新的缓存哨兵。

## Git checkout 流程

### 渠道选择

- `stable`：检出最新的非 beta 标签，然后构建并检查。
- `beta`：首选最新的 `-beta` 标签，但当 beta 缺失或较旧时，回退到最新的稳定标签。
- `dev`：检出 `main`，然后获取并变基。

### 更新步骤

<Steps>
  <Step title="验证工作区干净">不允许有未提交的更改。</Step>
  <Step title="切换渠道">切换到选定的渠道（标签或分支）。</Step>
  <Step title="获取上游">仅限开发渠道。</Step>
  <Step title="预检构建（仅限开发）">在临时工作树中运行 TypeScript 构建。如果尖端提交失败，则最多回溯 10 个提交以找到最新的可构建提交。设置 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 可在此预检期间也运行 lint；lint 在受限串行模式下运行，因为用户的更新主机通常小于 CI 运行器。</Step>
  <Step title="变基">变基到选定的提交（仅限开发）。</Step>
  <Step title="安装依赖">使用仓库包管理器。对于 pnpm 检出，更新程序会按需引导 `pnpm`（首先通过 `corepack`，然后是临时的 `npm install pnpm@11` 回退），而不是在 pnpm 工作区内运行 `npm run build`。</Step>
  <Step title="构建控制 UI">构建网关和控制 UI。</Step>
  <Step title="运行 doctor">`openclaw doctor` 作为最终的安全更新检查运行。</Step>
  <Step title="同步插件">将插件同步到活动渠道。Dev 使用捆绑插件；stable 和 beta 使用 npm。更新跟踪的插件安装。</Step>
</Steps>

在 beta 更新渠道上，跟踪的 npm 和 ClawHub 插件安装（如果遵循默认/最新行）会首先尝试插件的 `@beta` 版本。如果插件没有 beta 版本，OpenClaw 将回退到记录的默认/最新规范并将其报告为警告。对于 npm 插件，如果 beta 包存在但安装验证失败，OpenClaw 也会回退。这些插件回退警告不会导致核心更新失败。确切版本和显式标记不会被重写。

<Warning>如果精确固定的 npm 插件更新解析为一个完整性不同于存储的安装记录的构建产物，`openclaw update` 将中止该插件构建产物的更新而不是安装它。仅在验证您信任新构建产物后，才显式重新安装或更新插件。</Warning>

<Note>
如果更新后的插件同步失败仅限于受管插件，并且同步路径可以绕过（例如，对于非必要插件，npm 注册表不可达），则会在核心更新成功后报告为警告。JSON 结果将保留顶级更新 npm`status: "ok"`，并报告 `postUpdate.plugins.status: "warning"`，同时提供 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 指导。意外的更新程序或同步异常仍会导致更新结果失败。修复插件安装或更新错误，然后重新运行 `openclaw doctor --fix` 或 `openclaw update`。

在每个插件的同步步骤之后，`openclaw update` 会在网关重启之前运行一个强制的 **核心后收敛** 传递：它会修复缺失的已配置插件有效载荷，验证磁盘上的每个 _活动_ 跟踪安装记录，并静态验证其 `package.json` 是否可解析（以及任何显式声明的 `main`OpenClaw 是否存在）。此传递中的失败——以及无效的 OpenClaw 配置快照——将返回 `postUpdate.plugins.status: "error"` 并将顶级更新 `status` 翻转为 `"error"`，因此 `openclaw update` 将以非零状态退出，并且网关 _不会_ 使用未验证的插件集重启。错误包括结构化的 `postUpdate.plugins.warnings[].guidance` 行，指向 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 以供后续跟进。此处跳过已禁用的插件条目以及非可信源链接的官方同步目标记录，这与缺失有效载荷检查所使用的 `skipDisabledPlugins`Gateway(网关) 策略相镜像，因此过时的已禁用插件记录不会阻止其他有效的更新。

当更新的 Gateway(网关) 启动时，插件加载仅为验证模式：启动过程不运行包管理器或更改依赖项树。包管理器 `update.run`CLIGateway(网关) 重启将移交给 CLI 的托管服务路径，因此包交换发生在旧 Gateway(网关) 进程之外，并且服务健康检查决定更新是否可以报告为完成。

如果 pnpm 引导仍然失败，更新程序将提前停止并返回特定于包管理器的错误，而不是尝试在检出内部执行 `npm run build`。

</Note>

## `--update` 简写

`openclaw --update` 重写为 `openclaw update`（适用于 Shell 和启动脚本）。

## 相关

- `openclaw doctor`（在 git checkout 时提示先运行 update）
- [开发频道](/zh/install/development-channels)
- [更新](/zh/install/updating)
- [CLI 参考](/zh/cli)
