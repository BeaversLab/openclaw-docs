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

- `--no-restart`Gateway(网关)Gateway(网关)：成功更新后跳过重启 Gateway 服务。包管理器更新中确实重启 Gateway 的，会在命令成功前验证重启后的服务报告了预期的更新版本。
- `--channel <stable|beta|dev>`npm：设置更新渠道（git + npm；持久化存储在配置中）。
- `--tag <dist-tag|version|spec>`：仅针对本次更新覆盖包目标。对于包安装，`main` 映射到 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划的更新操作（渠道/标签/目标/重启流程），而不写入配置、安装、同步插件或重启。
- `--json`：打印机器可读的 `UpdateRunResult` JSON，包括
  `postUpdate.plugins.warnings`，用于在核心更新成功后需要修复损坏或无法加载的托管插件时，
  当插件没有 beta 版本时的 beta 渠道插件回退详情，以及在更新后插件同步期间检测到 npm 插件产物漂移时的 `postUpdate.plugins.integrityDrifts`。
- `--timeout <seconds>`：每步超时时间（默认为 1800 秒）。
- `--yes`：跳过确认提示（例如降级确认）。

`openclaw update` 没有 `--verbose` 标志。使用 `--dry-run` 预览
计划的 渠道/标签/安装/重启 操作，使用 `--json` 获取机器可读
结果，以及当您只需要 渠道 和
可用性详情时使用 `openclaw update status --json`。如果您正在调试更新周围的 Gateway(网关) 日志，
控制台详细程度和文件日志级别是分开的：Gateway(网关) `--verbose` 影响
终端/WebSocket 输出，而文件日志需要配置中的 `logging.level: "debug"` 或
`"trace"`。请参阅 [Gateway(网关) 日志记录](/zh/gateway/logging)。

<Note>在 Nix 模式下 (`OPENCLAW_NIX_MODE=1`)，禁用了变更性的 `openclaw update` 运行。改为更新此安装的 Nix 源或 flake 输入；对于 nix-openclaw，请使用 agent-first [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。`openclaw update status` 和 `openclaw update --dry-run` 保持只读。</Note>

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

Gateway(网关) 核心自动更新程序（通过配置启用时）在活动的 CLI 请求处理程序之外启动 Gateway(网关) 更新路径。
控制平面 `update.run` 包管理器
更新也使用托管服务切换，而不是在活动的 Gateway(网关) 进程内替换包树。
Gateway(网关) 启动一个分离的帮助程序，退出，
然后该帮助程序从 CLI 进程树之外运行正常的 `openclaw update --yes --json` Gateway(网关) 路径。
如果该切换不可用，`update.run`
将返回一个结构化响应，其中包含要手动运行的安全 shell 命令。

对于包管理器安装，`openclaw update`npmOpenClawnpm 在调用包管理器之前会解析目标包版本。npm 全局安装使用分阶段安装：OpenClaw 将新包安装到临时的 npm 前缀中，在那里验证打包的 `dist`OpenClaw 清单，然后将该干净的包树交换到实际的全局前缀中。如果验证失败，更新后的诊断、插件同步和重启工作将不会从可疑树运行。即使已安装的版本已经匹配目标，该命令也会刷新全局包安装，然后运行插件同步、核心命令完成刷新和重启工作。这使得打包的 sidecar 和渠道拥有的插件记录与已安装的 OpenClaw 构建保持一致，同时将完整的插件命令完成重建留给显式的 `openclaw completion --write-state` 运行去处理。

当安装了本地管理的 Gateway(网关) 服务并启用了重启功能时，包管理器更新会在替换包树之前停止正在运行的服务，然后从更新的安装中刷新服务元数据，重启服务，并在报告 Gateway(网关)Gateway(网关)`Gateway: restarted and verified.`macOSOpenClaw 之前验证重启后的 Gateway(网关) 报告了预期的版本。在 macOS 上，更新后检查还会验证 LaunchAgent 是否为当前配置文件加载/运行，以及配置的环回端口是否健康。如果已安装 plist 但 launchd 未对其进行监督，OpenClaw 会自动重新引导 LaunchAgent，然后重新运行健康/版本/渠道就绪检查。全新的引导会直接加载 RunAtLoad 任务，因此更新恢复不会立即 `kickstart -k`Gateway(网关)Gateway(网关) 新生成的 Gateway(网关)。如果 Gateway(网关) 仍未恢复健康，该命令将以非零代码退出，并打印重启日志路径以及明确的重启、重新安装和包回滚说明。如果重启无法运行，该命令将打印 `Gateway: restart skipped (...)` 或 `Gateway: restart failed: ...` 并附带手动 `openclaw gateway restart` 提示。如果使用 `--no-restart`Gateway(网关)，包替换仍会运行，但托管服务不会停止或重启，因此正在运行的 Gateway(网关) 可能会保留旧代码，直到您手动重启它。

### 控制平面响应形状

当在包管理器安装中通过 Gateway(网关) 控制平面调用 `update.run`Gateway(网关)CLIGateway(网关) 时，处理程序会分别报告交接启动与 Gateway(网关) 退出后继续的 CLI 更新：

- `ok: true`、`result.status: "skipped"`、
  `result.reason: "managed-service-handoff-started"` 和
  `handoff.status: "started"`Gateway(网关) 表示 Gateway(网关) 创建了托管服务
  交接并安排了自身的重启，以便分离的辅助程序可以在实时服务进程之外运行
  `openclaw update --yes --json`。
- `ok: false`、`result.reason: "managed-service-handoff-unavailable"` 和
  `handoff.status: "unavailable"`OpenClaw 表示 OpenClaw 无法找到用于安全移交的监管
  服务边界。响应包含
  `handoff.command`Gateway(网关)，即从 Gateway(网关) 外部运行的 shell 命令。
- `ok: false`、`result.reason: "managed-service-handoff-failed"`Gateway(网关) 表示
  Gateway(网关) 尝试创建移交但无法生成分离的辅助程序。

在 Gateway(网关) 退出之前，仍然会写入 `sentinel`Gateway(网关)CLI 负载，并且在受管服务重启
运行状况检查完成后，CLI 移交会更新同一个重启哨兵。在移交期间，哨兵可以携带
`stats.reason: "restart-health-pending"`Gateway(网关)CLI 而没有成功延续；
重启后的 Gateway(网关) 会持续轮询它，仅在 CLI
验证了服务运行状况并用最终的 `ok`
结果重写哨兵后才触发延续。当该哨兵处于挂起或失败状态时，`openclaw status` 和 `openclaw status --all` 会显示 `Update restart`
行，而 `update.status` 则返回
最新的缓存哨兵。

## Git checkout 流程

### 渠道选择

- `stable`：检出最新的非 beta 标签，然后构建和检查。
- `beta`：首选最新的 `-beta` 标签，但在 beta 缺失或较旧时回退到最新的 stable 标签。
- `dev`：检出 `main`，然后获取和变基。

### 更新步骤

<Steps>
  <Step title="验证工作区干净">不允许有未提交的更改。</Step>
  <Step title="切换渠道">切换到选定的渠道（标签或分支）。</Step>
  <Step title="获取上游">仅限开发渠道。</Step>
  <Step title="预构建（仅限开发）">在临时工作树中运行 TypeScript 构建。如果最新提交失败，则最多回溯 10 个提交以找到最新的可构建提交。设置 `OPENCLAW_UPDATE_PREFLIGHT_LINT=1` 以在此预检期间也运行 lint；lint 以受限串行模式运行，因为用户更新主机通常比 CI 运行器更小。</Step>
  <Step title="变基">变基到选定的提交（仅限开发）。</Step>
  <Step title="安装依赖项">使用仓库包管理器。对于 pnpm 检出，更新器按需引导 `pnpm`（首先通过 `corepack`，然后是临时的 `npm install pnpm@11` 回退），而不是在 pnpm 工作区内运行 `npm run build`。</Step>
  <Step title="构建控制 UI">构建网关和控制 UI。</Step>
  <Step title="运行诊断">`openclaw doctor` 作为最终的安全更新检查运行。</Step>
  <Step title="同步插件">将插件同步到活动渠道。Dev 使用捆绑插件；stable 和 beta 使用 npm。更新跟踪的插件安装。</Step>
</Steps>

在 beta 更新渠道上，跟踪的 npm 和 ClawHub 插件安装如果遵循
默认/最新主线，会首先尝试插件 `@beta` 版本。如果插件没有
beta 版本，OpenClaw 将回退到记录的默认/最新规范并报告
警告。对于 npm 插件，当 beta
包存在但安装验证失败时，OpenClaw 也会回退。这些插件回退警告不会
导致核心更新失败。确切版本和显式标签不会被
重写。

<Warning>如果精确锁定的 npm 插件更新解析为某个构建产物，且该产物的完整性与存储的安装记录不同，npm`openclaw update` 将中止该插件构建产物的更新，而不是安装它。仅在你验证信任新构建产物后，才重新安装或显式更新该插件。</Warning>

<Note>
更新后的插件同步失败如果仅限于受管插件且同步路径可以绕过（例如，对于非必要插件无法访问的 npm 注册表），则在核心更新成功后会作为警告报告。JSON 结果保留顶层的更新 `status: "ok"`，并报告 `postUpdate.plugins.status: "warning"`，同时提供 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 指导。意外的更新程序或同步异常仍会导致更新结果失败。修复插件安装或更新错误，然后重新运行 `openclaw doctor --fix` 或 `openclaw update`。

在每个插件的同步步骤之后，`openclaw update` 在重启 Gateway 之前运行强制性的 **post-core convergence**（核心后收敛）过程：它会修复缺失的已配置插件有效负载，验证磁盘上每个 _活动_ 的跟踪安装记录，并静态验证其 `package.json` 是否可解析（以及任何显式声明的 `main` 是否存在）。此过程中的失败——以及无效的 OpenClaw 配置快照——将返回 `postUpdate.plugins.status: "error"` 并将顶层更新 `status` 翻转为 `"error"`，因此 `openclaw update` 以非零状态退出，并且 Gateway _不会_ 使用未经验证的插件集重新启动。错误包括结构化的 `postUpdate.plugins.warnings[].guidance` 行，指向 `openclaw doctor --fix` 和 `openclaw plugins inspect <id> --runtime --json` 以供跟进。此处跳过已禁用的插件条目和不是受信任源链接的官方同步目标的记录，这反映了缺失有效负载检查所使用的 `skipDisabledPlugins` 策略，因此过时的已禁用插件记录无法阻止其他有效的更新。

当更新后的 Gateway(网关) 启动时，插件加载仅为验证模式：启动过程不运行包管理器或更改依赖树。包管理器 `update.run` 重启将移交给 CLI 受管服务路径，因此包交换发生在旧的 Gateway(网关) 进程之外，并由服务健康检查决定是否可以将更新报告为完成。

如果 pnpm bootstrap 仍然失败，更新程序会提前停止，并返回特定于包管理器的错误，而不是在检出内部尝试 `npm run build`。

</Note>

## `--update` 简写

`openclaw --update` 重写为 `openclaw update` （适用于 shell 和启动器脚本）。

## 相关

- `openclaw doctor` （在 git 检出时提供先运行更新的选项）
- [开发频道](/zh/install/development-channels)
- [更新](/zh/install/updating)
- [CLI 参考](CLI/en/cli)
