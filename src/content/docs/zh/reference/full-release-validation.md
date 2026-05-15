---
summary: "完整发布验证阶段、子工作流、发布配置文件、重新运行句柄以及证据"
title: "完整发布验证"
read_when:
  - Running or rerunning Full Release Validation
  - Comparing stable and full release validation profiles
  - Debugging release validation stage failures
---

`Full Release Validation` 是发布的总入口。它是发布前验证的唯一手动入口点，但大部分工作在子工作流中进行，因此可以在不重启整个发布的情况下重新运行失败的框。

从受信任的工作流引用运行它，通常是 `main`，并将发布分支、标记或完整提交 SHA 作为 `ref` 传递：

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

子工作流使用受信任的工作流引用作为框架，并使用输入的 `ref` 作为被测候选对象。这确保在验证旧发布分支或标记时可以使用新的验证逻辑。

默认情况下，`release_profile=stable` 运行发布阻塞通道并跳过详尽的实时/Docker soak。在稳定运行中传递 `run_release_soak=true` 以包含 soak 通道。`release_profile=full` 始终启用 soak 通道，因此广泛的顾问配置文件不会静默地降低覆盖率。

软件包验收通常从解析的 `ref` 构建候选压缩包，包括通过 `pnpm ci:full-release` 分发的完整 SHA 运行。发布后，传递 `package_acceptance_package_spec=openclaw@YYYY.M.D`（或 `openclaw@beta`/`openclaw@latest`）以针对已发布的 npm 软件包运行相同的软件包/更新矩阵。

## 顶级阶段

| 阶段             | 详情                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标解析         | **作业：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标记或完整提交 SHA 并记录选定的输入。<br />**重新运行：** 如果失败，请重新运行总入口。                                                                                                                                                                                                                   |
| Vitest 和正常 CI | **任务：** `Run normal full CI`<br />**子工作流：** `CI`<br />**证明内容：** 针对目标引用的手动完整 CI 图，包括 Linux Node 车道、捆绑的插件分片、渠道契约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS、Control UI i18n 以及通过总管（umbrella）进行的 Android。<br />**重新运行：** `rerun_group=ci`。                                  |
| 插件预发布       | **任务：** `Run plugin prerelease validation`<br />**子工作流：** `Plugin Prerelease`<br />**证明内容：** 仅限发布的插件静态检查、代理式插件覆盖、完整扩展批次分片以及插件预发布 Docker 车道。<br />**重新运行：** `rerun_group=plugin-prerelease`。                                                                                                                                          |
| 发布检查         | **任务：** `Run release/live/Docker/QA validation`<br />**子工作流：** `OpenClaw Release Checks`<br />**证明内容：** 安装冒烟测试、跨操作系统包检查、包验收、QA Lab 对等性、实时 Matrix 和实时 Telegram。使用 `run_release_soak=true` 或 `release_profile=full` 时，还会运行详尽的实时/E2E 套件和 Docker 发布路径块。<br />**重新运行：** `rerun_group=release-checks` 或更窄的发布检查句柄。 |
| 包构建产物       | **任务：** `Prepare release package artifact`<br />**子工作流：** 无<br />**证明内容：** 足够早地创建父级 `release-package-under-test` tarball，以便那些不需要等待 `OpenClaw Release Checks` 的面向包的检查使用。<br />**重新运行：** 重新运行总管或为 `rerun_group=npm-telegram` 提供 `npm_telegram_package_spec`。                                                                          |
| 包 Telegram      | **作业：** `Run package Telegram E2E`<br />**子工作流：** `NPM Telegram Beta E2E`<br />**证明：** 针对带有 `release_profile=full` 的 `rerun_group=all`，证明由父构建产物支持的 Telegram 软件包；当设置了 `npm_telegram_package_spec` 时，则证明已发布软件包的 Telegram。<br />**重跑：** 使用 `npm_telegram_package_spec` 进行 `rerun_group=npm-telegram`。                                   |
| 总验证器         | **作业：** `Verify full validation`<br />**子工作流：** 无<br />**证明：** 重新检查已记录的子运行结论，并追加来自子工作流的最慢作业表。<br />**重跑：** 在重跑失败的子作业以恢复正常后，仅重跑此作业。                                                                                                                                                                                        |

对于 `ref=main` 和 `rerun_group=all`，较新的总验证器会取代较旧的。当父级被取消时，其监控器会取消它已经调度的任何子工作流。默认情况下，发布分支和标记验证运行不会互相取消。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它解析一次目标，并在软件包或 Docker 相关阶段需要时准备共享的 `release-package-under-test` 构建产物。

| 阶段             | 详情                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布目标         | **作业：** `Resolve target ref`<br />**支持工作流：** 无<br />**测试：** 选定的引用、可选的预期 SHA、配置文件、重跑组以及聚焦的实时套件过滤器。<br />**重跑：** `rerun_group=release-checks`。                                                                                                                                                                                                                                                                            |
| 软件包构建产物   | **作业：** `Prepare release package artifact`<br />**支持工作流：** 无<br />**测试：** 打包或解析一个候选 tarball 并上传 `release-package-under-test` 以供下游软件包相关检查使用。<br />**重跑：** 受影响的软件包、跨操作系统或实时/E2E 组。                                                                                                                                                                                                                              |
| 安装冒烟测试     | **Job:** `Run install smoke`<br />**Backing workflow:** `Install Smoke`<br />**Tests:** 完整的安装路径，包括根 Dockerfile 冒烟镜像重用、QR 包安装、根和网关 Docker 冒烟、安装程序 Docker 测试、Bun 全局安装 image-提供商 冒烟，以及快速捆绑插件安装/卸载 E2E。<br />**Rerun:** `rerun_group=install-smoke`。                                                                                                                                                              |
| 跨操作系统       | **Job:** `cross_os_release_checks`<br />**Backing workflow:** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Tests:** 在 Linux、Windows 和 macOS 上针对所选提供商和模式进行全新安装和升级通道测试，使用候选压缩包和基准包。<br />**Rerun:** `rerun_group=cross-os`。                                                                                                                                                                                                |
| 仓库和实时 E2E   | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** 仓库 E2E、实时缓存、OpenAI WebSocket 流式传输、原生实时提供商和插件分片，以及由 `release_profile` 选择的 Docker 支持的实时模型/后端/网关测试工具。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或聚焦 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`，可选择附带 `live_suite_filter`。                   |
| Docker 发布路径  | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests:** 针对共享包制品的发布路径 Docker 块。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或聚焦 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`。                                                                                                                                                           |
| 包验收           | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`<br />**Tests:** offline plugin package fixtures, plugin update, mock-OpenAI Telegram package acceptance, and published-upgrade survivor checks against the same tarball. Blocking release checks use the default latest published baseline; soak checks expand to every stable npm release at or after `2026.4.23` plus reported-issue fixtures.<br />**Rerun:** `rerun_group=package`. |
| QA parity        | **Job:** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**Backing workflow:** direct jobs<br />**Tests:** candidate and baseline agentic parity packs, then the parity report.<br />**Rerun:** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                                 |
| QA live Matrix   | **Job:** `Run QA Lab live Matrix lane`<br />**Backing workflow:** direct job<br />**Tests:** `qa-live-shared` 环境中的 fast live Matrix QA profile。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                          |
| QA live Telegram | **Job:** `Run QA Lab live Telegram lane`<br />**Backing workflow:** direct job<br />**Tests:** live Telegram QA with Convex CI credential leases。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                            |
| Release verifier | **Job:** `Verify release checks`<br />**Backing workflow:** none<br />**Tests:** required release-check jobs for the selected rerun group。<br />**Rerun:** rerun after focused child jobs pass。                                                                                                                                                                                                                                                                         |

## Docker release-path chunks

当 `live_suite_filter` 为空时，Docker release-path stage 运行以下 chunks：

| Chunk                                                      | Coverage                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `core`                                                     | Core Docker release-path smoke lanes。                                      |
| `package-update-openai`                                    | OpenAI package install/update behavior, including Codex on-demand install。 |
| `package-update-anthropic`                                 | Anthropic 包安装和更新行为。                                                |
| `package-update-core`                                      | 提供商无关的包和更新行为。                                                  |
| `plugins-runtime-plugins`                                  | 演练插件行为的插件运行时通道。                                              |
| `plugins-runtime-services`                                 | 服务支持的和实时插件运行时通道；根据需要包括 OpenWebUI。                    |
| `plugins-runtime-install-a` 至 `plugins-runtime-install-h` | 插件安装/运行时批次，已拆分以进行并行发布验证。                             |

当仅有一个 Docker 通道失败时，对可重用的实时/E2E 工作流使用定向 `docker_lanes=<lane[,lane]>`Docker。发布工件包含每个通道的重跑命令，并在可用时包含包工件和镜像复用输入。

## 发布配置文件

`release_profile` 主要控制发布检查中的实时/提供商范围。它不会移除常规的完整 CI、插件预发布、安装冒烟测试、包验收或 QA 实验室。对于 `stable`Docker，详尽的仓库/实时 E2E 和 Docker 发布路径块是 soak 覆盖范围，并在 `run_release_soak=true` 时运行。`full`Telegram 强制开启 soak 覆盖范围，并使总管工作流在 `rerun_group=all`Telegram 时针对父发布包工件运行包 Telegram E2E，这样完整的发布前候选版本不会静默跳过该 Telegram 包通道。

| 配置文件  | 预期用途                 | 包含的实时/提供商覆盖范围                                                                                                                                                                                |
| --------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的发布关键冒烟测试。 | OpenAI/核心实时路径、OpenAI 的 Docker 实时模型、原生网关核心、原生 OpenAI 网关配置文件、原生 OpenAI 插件和 Docker 实时网关 OpenAI。                                                                      |
| `stable`  | 默认发布批准配置文件。   | `minimum`AnthropicMiniMaxDockerCLIDockerDocker 加上 Anthropic 冒烟测试、Google、MiniMax、后端、原生实时测试工具、Docker 实时 CLI 后端、Docker ACP 绑定、Docker Codex 工具以及 OpenCode Go 冒烟测试分片。 |
| `full`    | 广泛的顾问扫描。         | `stable` 加上顾问提供商、插件实时分片和媒体实时分片。                                                                                                                                                    |

## 仅限完整的补充

这些测试套件被 `stable` 跳过，而被 `full` 包含：

| 区域               | 仅限完整的覆盖                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Docker 实时模型    | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                       |
| Docker 实时网关    | 顾问提供商拆分为 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                                          |
| 原生网关提供商配置 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生插件实时分片   | 插件 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                              |
| 原生媒体实时分片   | 音频、Google 音乐、MiniMax 音乐和视频组 A-D。                                                                           |

`stable` 包括 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full`Anthropic 改用更广泛的
Anthropic 和 OpenCode Go 模型分片。聚焦式重运行仍可使用
聚合的 `native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 句柄。

## 聚焦式重运行

使用 `rerun_group` 以避免重复不相关的发布框：

| 句柄                | 范围                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `all`               | 所有完整发布验证阶段。                                            |
| `ci`                | 仅限手动完整 CI 子项。                                            |
| `plugin-prerelease` | 仅限插件预发布子项。                                              |
| `release-checks`    | 所有 OpenClaw 发布检查阶段。                                      |
| `install-smoke`     | 通过发布检查进行安装冒烟测试。                                    |
| `cross-os`          | 跨操作系统发布检查。                                              |
| `live-e2e`          | 仓库/实时 E2E 和 Docker 发布路径验证。                            |
| `package`           | 包验收。                                                          |
| `qa`                | QA 奇偶校验以及 QA 实时通道。                                     |
| `qa-parity`         | QA 奇偶校验通道，仅报告。                                         |
| `qa-live`           | 仅 QA 实时 Matrix 和 Telegram。                                   |
| `npm-telegram`      | 已发布包 Telegram E2E；需要 Telegram`npm_telegram_package_spec`。 |

当一个实时套件失败时，请使用带有 `rerun_group=live-e2e` 的 `live_suite_filter`。
有效的过滤器 ID 在可重用的实时/E2E 工作流中定义，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker` 和
`live-codex-harness-docker`。

`live-gateway-advisory-docker`Docker 句柄是其三个提供商分片的聚合重新运行句柄，因此它仍然会分派到所有顾问 Docker 网关作业。

当一个跨操作系统通道失败时，请使用带有 `rerun_group=cross-os` 的 `cross_os_suite_filter`。过滤器接受操作系统 ID、套件 ID 或操作系统/套件对，
例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`Windows。跨操作系统
摘要包括打包升级通道的各阶段计时，并且长时间运行的
命令会打印心跳行，以便在作业超时前看到卡住的 Windows 更新。

QA 发布检查通道是顾问性质的。仅 QA 失败将作为警告报告
并且不会阻止发布检查验证器；当您需要新的 QA 证据时，请重新运行 `rerun_group=qa`、
`qa-parity` 或 `qa-live`。

## 要保留的证据

将 `Full Release Validation` 摘要保留为发布级别索引。它链接子运行 ID 并包含最慢作业表。如果失败，请先检查子工作流，然后重新运行上方匹配的最小句柄。

有用构件：

- 来自完整发布验证父级的 `release-package-under-test` 和 `OpenClaw Release Checks`
- Docker 发布路径构件位于 `.artifacts/docker-tests/` 下
- 包验收 `package-under-test` 和 Docker 验收构件
- 每个操作系统和套件的跨操作系统发布检查构件
- QA 奇偶校验、Matrix 和 Telegram 构件

## 工作流文件

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
