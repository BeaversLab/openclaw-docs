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

Package Acceptance 通常根据解析出的 `ref` 构建候选 tarball，包括使用 `pnpm ci:full-release` 调度的完整 SHA 运行。在 beta 发布后，传递 `release_package_spec=openclaw@YYYY.M.D-beta.N`npmDockerTelegram 以在发布检查、Package Acceptance、跨操作系统、release-path Docker 和 package Telegram 中重用已发布的 npm 包。仅当 Package Acceptance 需要特意验证不同的包时，才使用 `package_acceptance_package_spec`。Codex 插件实时包通道遵循相同的状态：已发布的 `release_package_spec` 值衍生自 `codex_plugin_spec=npm:@openclaw/codex@<version>`；SHA/构件运行从所选 ref 打包 `extensions/codex`；操作员可以直接为 `npm:`、`npm-pack:` 或 `git:`CLICLIOpenAI 插件源设置 `codex_plugin_spec`。该通道授予该插件所需的明确 Codex CLI 安装批准，然后运行 Codex CLI 预检和同会话 OpenAI 代理轮次。

## 顶级阶段

| 阶段             | 详情                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 目标解析         | **Job：** `Resolve target ref`<br />**子工作流：** 无<br />**证明：** 解析发布分支、标记或完整提交 SHA，并记录所选输入。<br />**重新运行：** 如果此项失败，请重新运行总控工作流。                                                                                                                                                                                                                                                                                  |
| Vitest 和正常 CI | **Job：** `Run normal full CI`<br />**子工作流：** `CI`Linux<br />**证明：** 针对目标 ref 的手动完整 CI 图，包括 Linux Node 通道、捆绑插件分片、插件和渠道契约分片、Node 22 兼容性、`check-*`、`check-additional-*`WindowsmacOSAndroid、构建构件冒烟测试、文档检查、Python 技能、Windows、macOS、Control UI i18n，以及通过总控工作流运行的 Android。<br />**重新运行：** `rerun_group=ci`。                                                                        |
| 插件预发布       | **Job:** `Run plugin prerelease validation`<br />**Child workflow:** `Plugin Prerelease`Docker<br />**Proves:** release-only plugin static checks, agentic plugin coverage, full extension batch shards, plugin prerelease Docker lanes, and a non-blocking `plugin-inspector-advisory` artifact for compatibility triage.<br />**Rerun:** `rerun_group=plugin-prerelease`.                                                                                        |
| 发布检查         | **Job:** `Run release/live/Docker/QA validation`<br />**Child workflow:** `OpenClaw Release Checks`MatrixTelegram<br />**Proves:** install smoke, cross-OS package checks, Package Acceptance, QA Lab parity, live Matrix, and live Telegram. With `run_release_soak=true` or `release_profile=full`Docker, also runs exhaustive live/E2E suites and Docker release-path chunks.<br />**Rerun:** `rerun_group=release-checks` or a narrower release-checks handle. |
| 包构建产物       | **Job:** `Prepare release package artifact`<br />**Child workflow:** none<br />**Proves:** creates the parent `release-package-under-test` tarball early enough for package-facing checks that do not need to wait for `OpenClaw Release Checks`.<br />**Rerun:** rerun the umbrella or provide `release_package_spec` for published-package reruns.                                                                                                               |
| 包 Telegram      | **Job:** `Run package Telegram E2E`<br />**Child workflow:** `NPM Telegram Beta E2E`Telegram<br />**Proves:** parent-artifact-backed Telegram package proof for `rerun_group=all` with `release_profile=full`Telegram, or published-package Telegram proof when `release_package_spec` or `npm_telegram_package_spec` is set.<br />**Rerun:** `rerun_group=npm-telegram` with `release_package_spec` or `npm_telegram_package_spec`.                               |
| 总验证器         | **Job:** `Verify full validation`<br />**Child workflow:** none<br />**Proves:** re-checks recorded child run conclusions and appends slowest-job tables from child workflows.<br />**Rerun:** rerun only this job after rerunning a failed child to green.                                                                                                                                                                                                        |

对于 `ref=main` 和 `rerun_group=all`，较新的伞式工作流会取代较旧的。当父工作流被取消时，其监视器会取消它已经调度的任何子工作流。发布分支和标签验证运行默认情况下不会相互取消。

## 发布检查阶段

`OpenClaw Release Checks` 是最大的子工作流。它解析一次目标，并在面向包或 Docker 的阶段需要时准备一个共享的 `release-package-under-test`Docker 构建产物。

| 阶段             | 详情                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布目标         | **作业：** `Resolve target ref`<br />**支持工作流：** 无<br />**测试：** 选定的 ref、可选的预期 SHA、配置文件、重新运行组和聚焦的实时套件过滤器。<br />**重新运行：** `rerun_group=release-checks`。                                                                                                                                                                                                                                                              |
| 软件包构建产物   | **作业：** `Prepare release package artifact`<br />**支持工作流：** 无<br />**测试：** 打包或解析一个候选 tarball 并上传 `release-package-under-test` 以供下游面向包的检查使用。<br />**重新运行：** 受影响的包、跨操作系统或实时/E2E 组。                                                                                                                                                                                                                        |
| 安装冒烟测试     | **作业：** `Run install smoke`<br />**支持工作流：** `Install Smoke`DockerDockerBun<br />**测试：** 完整的安装路径，包括重用根 Dockerfile 镜像冒烟测试、QR 包安装、根和网关 Docker 冒烟测试、安装程序 Docker 测试、Bun 全局安装镜像提供商冒烟测试，以及快速的捆绑插件安装/卸载 E2E。<br />**重新运行：** `rerun_group=install-smoke`。                                                                                                                            |
| 跨操作系统       | **作业：** `cross_os_release_checks`<br />**支持工作流：** `OpenClaw Cross-OS Release Checks (Reusable)`LinuxWindowsmacOS<br />**测试：** 在 Linux、Windows 和 macOS 上针对所选提供商和模式的全新和升级通道，使用候选 tarball 加上基线包。<br />**重新运行：** `rerun_group=cross-os`。                                                                                                                                                                           |
| 仓库和实时 E2E   | **Job:** `Run repo/live E2E validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`OpenAIDocker<br />**Tests:** 仓库 E2E、实时缓存、OpenAI WebSocket 流式传输、原生实时提供商和插件分片，以及由 `release_profile` 选择的 Docker 支持的实时模型/后端/网关工具。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或聚焦的 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`，可选择带有 `live_suite_filter`。 |
| Docker 发布路径  | **Job:** `Run Docker release-path validation`<br />**Backing workflow:** `OpenClaw Live And E2E Checks (Reusable)`Docker<br />**Tests:** 针对共享软件包产物的发布路径 Docker 块。<br />**Runs:** `run_release_soak=true`、`release_profile=full` 或聚焦的 `rerun_group=live-e2e`。<br />**Rerun:** `rerun_group=live-e2e`。                                                                                                                                       |
| 包验收           | **Job:** `Run package acceptance`<br />**Backing workflow:** `Package Acceptance`OpenAITelegramnpm<br />**Tests:** 针对同一 tarball 的离线插件包固件、插件更新、mock-OpenAI Telegram 包验收以及已发布升级幸存者检查。阻断性发布检查使用默认的已发布最新基线； soak 检查扩展到 `2026.4.23` 之后（含该版本）的每个稳定 npm 版本加上报告的问题固件。<br />**Rerun:** `rerun_group=package`。                                                                         |
| QA parity        | **Job:** `Run QA Lab parity lane` 和 `Run QA Lab parity report`<br />**Backing workflow:** 直接作业<br />**Tests:** 候选版本和基线版本的代理奇偶校验包，然后是奇偶校验报告。<br />**Rerun:** `rerun_group=qa-parity` 或 `rerun_group=qa`。                                                                                                                                                                                                                        |
| QA live Matrix   | **Job:** `Run QA Lab live Matrix lane`Matrix<br />**Backing workflow:** 直接作业<br />**Tests:** `qa-live-shared` 环境中的快速实时 Matrix QA 配置文件。<br />**Rerun:** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                               |
| QA live Telegram | **Job：** `Run QA Lab live Telegram lane`<br />**Backing workflow：** 直接作业<br />**Tests：** 使用 Convex CI 凭证租约的实时 Telegram QA。<br />**Rerun：** `rerun_group=qa-live` 或 `rerun_group=qa`。                                                                                                                                                                                                                                                          |
| Release verifier | **Job：** `Verify release checks`<br />**Backing workflow：** 无<br />**Tests：** 所选重跑组所需的发布检查作业。<br />**Rerun：** 在聚焦的子作业通过后重跑。                                                                                                                                                                                                                                                                                                      |

## Docker release-path chunks

当 `live_suite_filter` 为空时，Docker 发布路径阶段将运行这些块：

| Chunk                                                      | Coverage                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `core`                                                     | Core Docker release-path smoke lanes。                                                       |
| `package-update-openai`                                    | OpenAI 包安装/更新行为，Codex 按需安装，Codex 插件实时轮换，以及 Chat Completions 工具调用。 |
| `package-update-anthropic`                                 | Anthropic 包安装和更新行为。                                                                 |
| `package-update-core`                                      | 提供商无关的包和更新行为。                                                                   |
| `plugins-runtime-plugins`                                  | 演练插件行为的插件运行时通道。                                                               |
| `plugins-runtime-services`                                 | 服务支持的和实时插件运行时通道；根据需要包括 OpenWebUI。                                     |
| `plugins-runtime-install-a` 到 `plugins-runtime-install-h` | 插件安装/运行时批次，已拆分以进行并行发布验证。                                              |

当只有一个 Docker 通道失败时，在可复用的实时/E2E 工作流上使用针对性的 `docker_lanes=<lane[,lane]>`。发布工件包含带有包工件和镜像重用输入的各通道重跑命令（如果可用）。

## 发布配置文件

`release_profile` 主要控制发布检查中的实时/提供商 覆盖范围。它不会移除常规的完整 CI、插件预发布、安装冒烟测试、包验收测试或 QA Lab。对于 `stable`，详尽的仓库/实时 E2E 和 Docker
发布路径块属于 soak 覆盖范围，并在 `run_release_soak=true` 时运行。
`full` 强制开启 soak 覆盖范围，并使总伞工作流在 `rerun_group=all` 时针对父发布包工件运行包 Telegram
E2E，以便完整的发布前候选者不会静默跳过该 Telegram 包通道。

| 配置文件  | 预期用途                 | 包含的实时/提供商覆盖范围                                                                                                                                                 |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | 最快的发布关键冒烟测试。 | OpenAI/核心实时路径、OpenAI 的 Docker 实时模型、原生网关核心、原生 OpenAI 网关配置文件、原生 OpenAI 插件和 Docker 实时网关 OpenAI。                                       |
| `stable`  | 默认发布批准配置文件。   | `minimum` 加上 Anthropic 冒烟测试、Google、MiniMax、后端、原生实时测试工具、Docker 实时 CLI 后端、Docker ACP 绑定、Docker Codex 工具，以及一个 OpenCode Go 冒烟测试分片。 |
| `full`    | 广泛的顾问扫描。         | `stable` 加上顾问提供者、插件实时分片和媒体实时分片。                                                                                                                     |

## 仅限完整的补充

这些测试套件被 `stable` 跳过，并被 `full` 包含：

| 区域               | 仅限完整的覆盖                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Docker 实时模型    | OpenCode Go、OpenRouter、xAI、Z.ai 和 Fireworks。                                                                       |
| Docker 实时网关    | 顾问提供商拆分为 DeepSeek/Fireworks、OpenCode Go/OpenRouter 和 xAI/Z.ai 分片。                                          |
| 原生网关提供商配置 | 完整的 Anthropic Opus 和 Sonnet/Haiku 分片、Fireworks、DeepSeek、完整的 OpenCode Go 模型分片、OpenRouter、xAI 和 Z.ai。 |
| 原生插件实时分片   | 插件 A-K、L-N、O-Z 其他、Moonshot 和 xAI。                                                                              |
| 原生媒体实时分片   | 音频、Google 音乐、MiniMax 音乐和视频组 A-D。                                                                           |

`stable` 包含 `native-live-src-gateway-profiles-anthropic-smoke` 和
`native-live-src-gateway-profiles-opencode-go-smoke`；`full` 改用更广泛的
Anthropic 和 OpenCode Go 模型分片。聚焦重新运行仍可使用
聚合 `native-live-src-gateway-profiles-anthropic` 或
`native-live-src-gateway-profiles-opencode-go` 句柄。

## 聚焦式重运行

使用 `rerun_group` 以避免重复无关的发布框：

| 句柄                | 范围                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| `all`               | 所有完整发布验证阶段。                                                              |
| `ci`                | 仅限手动完整 CI 子项。                                                              |
| `plugin-prerelease` | 仅限插件预发布子项。                                                                |
| `release-checks`    | 所有 OpenClaw 发布检查阶段。                                                        |
| `install-smoke`     | 通过发布检查进行安装冒烟测试。                                                      |
| `cross-os`          | 跨操作系统发布检查。                                                                |
| `live-e2e`          | 仓库/实时 E2E 和 Docker 发布路径验证。                                              |
| `package`           | 包验收。                                                                            |
| `qa`                | QA 奇偶校验以及 QA 实时通道。                                                       |
| `qa-parity`         | QA 奇偶校验通道，仅报告。                                                           |
| `qa-live`           | 仅 QA 实时 Matrix 和 Telegram。                                                     |
| `npm-telegram`      | 已发布包 Telegram E2E；需要 `release_package_spec` 或 `npm_telegram_package_spec`。 |

当一个实时测试套件失败时，请将 `live_suite_filter` 与 `rerun_group=live-e2e` 结合使用。
有效的过滤器 ID 在可重用的 live/E2E 工作流中定义，包括
`docker-live-models`、`live-gateway-docker`、
`live-gateway-anthropic-docker`、`live-gateway-google-docker`、
`live-gateway-minimax-docker`、`live-gateway-advisory-docker`、
`live-cli-backend-docker`、`live-acp-bind-docker` 和
`live-codex-harness-docker`。

`live-gateway-advisory-docker` 句柄是其三个提供商分片的聚合重新运行句柄，因此它仍会分发到所有建议的 Docker 网关作业。

当某个跨操作系统通道失败时，请将 `cross_os_suite_filter` 与 `rerun_group=cross-os` 一起使用。该筛选器接受操作系统 ID、套件 ID 或操作系统/套件对，例如 `windows/packaged-upgrade`、`windows` 或 `packaged-fresh`。跨操作系统摘要包含打包升级通道的每个阶段的时间，长时间运行的命令会打印心跳行，以便在作业超时之前看到卡住的 Windows 更新。

QA 发布检查通道是建议性的，标准运行时 覆盖范围关卡除外。标准层级中所需的 OpenClaw 动态工具漂移会阻止发布检查验证程序；其他仅 QA 的故障将作为警告报告。当您需要新的 QA 证据时，请重新运行 `rerun_group=qa`、`qa-parity` 或 `qa-live`。

## 要保留的证据

将 `Full Release Validation` 摘要保持为发布级别索引。它链接子运行 ID 并包含最慢作业表。对于故障，请先检查子工作流，然后重新运行上面匹配的最小句柄。

有用构件：

- 来自完整发布验证父级的 `release-package-under-test` 和 `OpenClaw Release Checks`
- `.artifacts/docker-tests/` 下的 Docker 发布路径产物
- 软件包验收 `package-under-test` 和 Docker 验收产物
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
