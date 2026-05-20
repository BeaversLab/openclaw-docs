---
summary: "CI 作业图、范围门控、发布伞以及本地命令等效项"
title: "CI 流水线"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 OpenClaw`main` 和每个拉取请求时运行。`preflight` 作业会对差异进行分类，并在仅更改了不相关区域时关闭开销较大的通道。针对发布候选版本和广泛验证的手动 `workflow_dispatch`Android 运行会故意绕过智能范围设定，并展开完整图谱。Android 通道通过 `include_android` 保持可选加入。仅发布版本的插件覆盖率位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且仅从 [`Full Release Validation`](#full-release-validation) 或显式手动调度运行。

## 流水线概述

| 作业                               | 目的                                                                          | 运行时机                     |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                        | 检测仅文档更改、更改的范围、更改的扩展，并构建 CI 清单                        | 在非草稿推送和 PR 上始终运行 |
| `security-fast`                    | 私钥检测、通过 `zizmor` 进行的工作流审核以及生产环境 lockfile 审核            | 在非草稿推送和 PR 上始终运行 |
| `check-dependencies`               | 生产环境 Knip 仅依赖项通道以及未使用文件白名单守卫                            | 与 Node 相关的变更           |
| `build-artifacts`                  | 构建 `dist/`CLI、控制 UI、内置 CLI 冒烟测试、嵌入式构建产物检查以及可复用产物 | 与 Node 相关的变更           |
| `checks-fast-core`                 | 快速的 Linux 正确性通道，例如捆绑、协议和 CI 路由检查                         | Node 相关更改                |
| `checks-fast-contracts-plugins-*`  | 两个分片的插件契约检查                                                        | Node 相关更改                |
| `checks-fast-contracts-channels-*` | 两个分片的渠道契约检查                                                        | Node 相关更改                |
| `checks-node-core-*`               | 核心 Node 测试分片，不包括渠道、捆绑、契约和扩展通道                          | Node 相关更改                |
| `check-*`                          | 分片的主要本地守卫等价项：生产类型、lint、守卫、测试类型和严格冒烟测试        | Node 相关更改                |
| `check-additional-*`               | 架构、分片边界/提示偏差、扩展守卫、包边界和运行时拓扑                         | Node 相关更改                |
| `checks-node-compat-node22`        | Node 22 兼容性构建和冒烟测试通道                                              | 用于发布的手动 CI 调度       |
| `check-docs`                       | 文档格式化、lint 和损坏链接检查                                               | 文档已更改                   |
| `skills-python`                    | 用于 Python 支持技能的 Ruff + pytest                                          | 与 Python 技能相关的变更     |
| `checks-windows`                   | Windows 特定的进程/路径测试以及共享运行时导入说明符回归                       | Windows 相关更改             |
| `macos-node`                       | 使用共享构建产物的 macOS TypeScript 测试通道                                  | macOS 相关更改               |
| `macos-swift`                      | macOS 应用的 Swift Lint、构建和测试                                           | macOS 相关更改               |
| `android`                          | 针对两种配置的 Android 单元测试以及一次调试版 APK 构建                        | Android 相关更改             |
| `test-performance-agent`           | 受信活动后的每日 Codex 慢速测试优化                                           | 主 CI 成功或手动触发         |
| `openclaw-performance`             | 每日/按需 Kova 运行时性能报告，包含模拟提供商、深度分析和 GPT 5.5 实时通道    | 计划触发和手动触发           |

## 快速失败顺序

1. `preflight` 决定了哪些通道存在。`docs-scope` 和 `changed-scope` 逻辑是该作业内的步骤，而非独立作业。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 会快速失败，而无需等待更繁重的产物和平台矩阵作业。
3. `build-artifacts`Linux 与快速 Linux 通道重叠，以便下游使用者在共享构建准备好后能立即开始。
4. 之后更繁重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-core-*`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当较新的推送到达同一 PR 或 `main` 引用时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非该引用的最新运行也失败了，否则请将其视为 CI 干扰。Matrix 作业使用 `fail-fast: false`，并且 `build-artifacts` 会直接报告嵌入式渠道、核心支持边界和网关监视的失败，而不是排队微小的验证作业。自动 CI 并发键是版本化的 (`CI-v7-*`)，因此 GitHub 端旧队列组中的僵尸作业不会无限期阻塞较新的 main 运行。手动全套运行使用 `CI-manual-v1-*` 并且不会取消正在进行的运行。

`ci-timings-summary` 作业会为每个非草稿 CI 运行上传一个紧凑的 `ci-timings-summary` 构件。它记录当前运行的运行时间、排队时间、最慢的作业和失败的作业，因此 CI 运行状况检查无需重复抓取完整的 Actions 负载。

## 范围和路由

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动分发会跳过更改范围检测，并使预检清单表现得好像每个范围区域都已更改。

- **CI 工作流编辑** 会验证 Node CI 图和工作流 Lint，但不会自行强制 Windows、Android 或 macOS 原生构建；这些平台通道的范围仍限于平台源代码的更改。
- **`main` 推送上的文档** 由独立的 `Docs` 工作流检查，该工作流使用与 CI 相同的 ClawHub 文档镜像，因此混合代码和文档的推送不会再次排队 CI `check-docs` 分片。当文档发生更改时，Pull 请求和手动 CI 仍会从 CI 运行 `check-docs`。
- **仅 CI 路由的编辑、选定的低成本核心测试夹具编辑以及窄范围的插件契约辅助/测试路由编辑**使用快速的仅 Node 清单路径：`preflight`、security 和单个 `checks-fast-core` 任务。当更改仅限于该快速任务直接练习的路由或辅助界面时，该路径会跳过构建产物、Node 22 兼容性、渠道契约、完整核心分片、捆绑插件分片以及额外的保护矩阵。
- **Windows Node 检查**范围仅限于 Windows 特定的进程/路径包装器、npm/pnpm/UI 运行器辅助、包管理器配置以及执行该通道的 CI 工作流界面；不相关的源码、插件、安装冒烟和仅测试更改保持在 Linux Node 通道上。

最慢的 Node 测试系列会被拆分或平衡，以确保每个任务保持轻量而不会过度预留运行器：插件合约和渠道合约各自作为两个加权的 Blacksmith 支持的分片运行，并带有标准的 GitHub 运行器回退，核心单元 fast/support 车道单独运行，核心运行时基础架构拆分在 state、process/config、shared 和三个 cron domain 分片之间，auto-reply 作为平衡的 worker 运行（回复子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片），而 agentic gateway/server 配置拆分到 chat/auth/模型/http-plugin/runtime/startup 车道，而不是等待构建的产物。广泛的浏览器、QA、媒体和杂项插件测试使用其专用的 Vitest 配置，而不是共享的插件 catch-all。Include-pattern 分片使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置和过滤后的分片。`check-additional-*` 将包边界 compile/canary 工作保持在一起，并将运行时拓扑架构与 Gateway(网关) watch 覆盖范围分开；边界守卫列表被划分为一个提示密集型分片和一个包含剩余守卫条纹的组合分片，每个分片并发运行选定的独立守卫并打印每个检查的计时。昂贵的 Codex happy-path 提示快照漂移检查作为一个额外的单独任务运行，仅适用于手动 CI 和影响提示的更改，因此正常的非相关 Node 更改不会等待冷提示快照生成，并且当提示漂移仍然固定在导致它的 PR 上时，边界分片保持平衡；同一标志会跳过构建产物核心支持边界分片内部的提示快照 Vitest 生成。Gateway(网关) watch、渠道测试和核心支持边界分片在 `dist/` 和 `dist-runtime/` 已经构建后，在 `build-artifacts` 内部并发运行。

Android CI 同时运行 Android`testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`Android，然后构建 Play 调试版 APK。第三方变种没有单独的源集或清单；其单元测试通道仍然使用短信/通话日志 BuildConfig 标志编译该变种，同时在每次与 Android 相关的推送时避免重复的调试版 APK 打包任务。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（这是一个固定到最新 Knip 版本的仅生产依赖 Knip 检查，针对 `dlx` 安装禁用了 pnpm 的最小发布年限）和 `pnpm deadcode:unused-files`，后者将 Knip 的生产未使用文件发现结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。当 PR 添加新的未经审查的未使用文件或遗留过时的允许列表条目时，未使用文件保护会失败，同时保留 Knip 无法静态解析的有意动态插件、生成、构建、实时测试和包桥接表面。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub 是从 OpenClaw 仓库活动到 ClawSweeper 的目标端桥接。它不会检出或执行不受信任的拉取请求代码。该工作流从 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建 GitHub App 令牌，然后将紧凑的 `repository_dispatch` 有效负载分发给 `openclaw/clawsweeper`。

该工作流有四个通道：

- `clawsweeper_item` 用于确切的 issue 和拉取请求审查请求；
- `clawsweeper_comment` 用于 issue 评论中的显式 ClawSweeper 命令；
- `clawsweeper_commit_review` 用于 `main` 推送上的提交级审查请求；
- `github_activity`GitHub 用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 流道仅转发标准化元数据：事件类型、操作、执行者、仓库、项目编号、URL、标题、状态，以及评论或审核（如存在）的简短摘录。它有意避免转发完整的 webhook 正文。`openclaw/clawsweeper` 中的接收工作流是 `.github/workflows/github-activity.yml`OpenClawGateway(网关)，它将标准化事件发布到 ClawSweeper 代理的 OpenClaw Gateway(网关) hook。

一般活动属于观察性质，而非默认传递。ClawSweeper 代理在其提示中接收 Discord 目标，并应仅当事件出人意料、可执行、有风险或具有操作实用性时才发布到 Discord`#clawsweeper`。常规的打开、编辑、机器人搅动、重复 webhook 噪声以及正常的审核流量应导致 `NO_REPLY`。

在此路径中，应始终将 GitHub 标题、评论、正文、审核文本、分支名称和提交消息视为不受信任的数据。它们是用于汇总和分类的输入，而不是工作流或代理运行时的指令。

## 手动调度

手动 CI 调度运行与正常 CI 相同的作业图，但强制开启所有非 Android 作用域的流道：Linux Node 分片、捆绑插件分片、插件和渠道契约分片、Node 22 兼容性、AndroidLinux`check-*`、`check-additional-*`WindowsmacOSAndroid、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS 和 Control UI 国际化。独立的手动 CI 调度仅使用 `include_android=true`Android 运行 Android；完整的发布版本伞通过传递 `include_android=true` 启用 Android。插件预发布静态检查、仅限发布版本的 `agentic-plugins`DockerDocker 分片、完整扩展批量扫描以及插件预发布 Docker 流道从 CI 中排除。Docker 预发布套件仅在 `Full Release Validation` 调度单独的 `Plugin Prerelease` 工作流并启用发布验证门限时运行。

手动运行使用唯一的并发组，以免同一引用上的其他推送或 PR 运行取消发布候选版本的完整套件运行。可选的 `target_ref` 输入允许受信任的调用者在针对分支、标签或完整提交 SHA 运行该图时，从所选的调度引用中使用工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| 运行器                           | 作业                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`GitHub、文档检查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队                           |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`security-fast`、较低权重的扩展分片、`checks-fast-core`、插件/渠道合约分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 和 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux 节点测试分片、捆绑插件测试分片、Linux`check-additional-*` 分片、`android`                                                                                                              |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`Docker（对 CPU 敏感程度高，以至于 8 vCPU 的成本超过了其节省的成本）；install-smoke Docker 构建（32 vCPU 排队时间的成本超过了其节省的成本）                    |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-latest`  | `openclaw/openclaw` 上的 `macos-node`；fork 回退到 `macos-latest`                                                                                                                            |
| `blacksmith-12vcpu-macos-latest` | `openclaw/openclaw` 上的 `macos-swift`；fork 回退到 `macos-latest`                                                                                                                           |

Canonical-repo CI 将 Blacksmith 保留为默认运行器路径。在 `preflight` 期间，`scripts/ci-runner-labels.mjs` 会检查最近的排队和进行中的 Actions 运行，以查找排队的 Blacksmith 作业。如果特定的 Blacksmith 标签已有排队的作业，那么将使用该确切标签的下游作业将仅针对该运行回退到匹配的 GitHub 托管运行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。同一操作系统系列中的其他 Blacksmith 规格保持在其主要标签上。如果 API 探测失败，则不应用回退。

## 本地等效项

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check                                    # fast local gate: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/smoke checks matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 性能

`OpenClaw Performance` 是产品/运行时性能工作流。它每天在 `main` 上运行，并且可以手动触发：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动触发通常会对工作流引用进行基准测试。设置 `target_ref` 可以使用当前工作流实现对发布标签或其他分支进行基准测试。发布的报告路径和最新指针以测试的引用为键，每个 `index.md` 记录测试的引用/SHA、工作流引用/SHA、Kova 引用、配置文件、通道授权模式、模型、重复计数和场景过滤器。

该工作流从固定的发布版本安装 OCM，并在固定的 `kova_ref` 输入处从 `openclaw/Kova` 安装 Kova，然后运行三个通道：

- `mock-provider`：针对本地构建运行时的 Kova 诊断场景，具有确定性的伪造 OpenAI 兼容身份验证。
- `mock-deep-profile`：针对启动、网关和代理轮热点的 CPU/堆/跟踪分析。
- `live-openai-candidate`：一个真实的 OpenAI `openai/gpt-5.5` 代理轮，当 `OPENAI_API_KEY` 不可用时跳过。

模拟提供商（mock-提供商）通道还在 Kova 通过后运行 OpenClaw 原生源探针：包括默认、钩子（hook）和 50 插件启动情况下的网关启动计时和内存；重复的模拟 OpenAI OpenClawOpenAI`channel-chat-baseline`CLI hello 循环；以及针对已启动网关的 CLI 启动命令。源探针 Markdown 摘要位于报告包中的 `source/index.md`，旁边是原始 JSON。

每个通道都会上传 GitHub 工件。当配置了 GitHub`CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、包、`index.md` 和源探针工件提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。当前测试引用（tested-ref）指针被写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是用于“发布前运行所有内容”的手动总管工作流。它接受分支、标签或完整的提交 SHA，使用该目标调度手动 `CI` 工作流，为仅限发布的插件/包/静态/Docker 验证调度 `Plugin Prerelease`Docker，并为安装冒烟测试、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 通道调度 `OpenClaw Release Checks`MatrixTelegramDocker。稳定/默认运行将详尽的 Live/E2E 和 Docker 发布路径覆盖范围保留在 `run_release_soak=true` 之后；`release_profile=full` 强制执行该 soak 覆盖范围，以确保广泛的咨询验证保持广泛。配合 `rerun_group=all` 和 `release_profile=full`，它还会针对发布检查中的 `release-package-under-test` 构件运行 `NPM Telegram Beta E2E`。发布后，传递 `release_package_spec`npmDockerTelegram 以在发布检查、包验收、Docker、跨操作系统和 Telegram 之间重用已发布的 npm 包，而无需重新构建。仅当 Telegram 必须验证不同的包时才使用 `npm_telegram_package_spec`Telegram。

有关阶段 Matrix、确切的工作流作业名称、配置文件差异、构件和集中的重新运行句柄，请参阅 [Full release validation](/zh/reference/full-release-validation)。

`OpenClaw Release Publish` 是手动变更发布的发布工作流。在发布标签存在且 OpenClaw npm 预检成功后，从 `release/YYYY.M.D` 或 `main`OpenClawnpm 调度它。它会验证 `pnpm plugins:sync:check`，为所有可发布的插件包调度 `Plugin NPM Release`，为相同的发布 SHA 调度 `Plugin ClawHub Release`，然后才使用保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要在快速移动的分支上进行固定提交验证，请使用 helper 而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch 引用必须是分支或标签，而不是原始提交 SHA。辅助工具会在目标 SHA 处推送一个临时的 `release-ci/<sha>-...` 分支，从该固定引用调度 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，并在运行完成后删除临时分支。如果任何子工作流在不同的 SHA 上运行，总体验证器也会失败。

`release_profile` 控制传递到发布检查的实时/提供商范围。手动发布工作流默认为 `stable`；仅当您有意需要广泛的咨询提供商/媒体矩阵时才使用 `full`。`run_release_soak` 控制稳定/默认发布检查是否运行详尽的实时/E2E 和 Docker 发布路径 soak；`full` 强制开启 soak。

- `minimum` 保留最快的 OpenAI/核心发布关键通道。
- `stable` 添加稳定提供商/后端集。
- `full` 运行广泛的咨询提供商/媒体矩阵。

总体验证器记录已调度的子运行 ID，最终的 `Verify full validation` 作业会重新检查当前子运行结论，并为每个子运行附加最慢作业表。如果子工作流被重新运行并通过（变绿），则仅重新运行父验证器作业以刷新总体结果和计时摘要。

为了恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。使用 `all` 针对发布候选版本，使用 `ci` 仅针对常规完整 CI 子任务，使用 `plugin-prerelease` 仅针对插件预发布子任务，使用 `release-checks` 针对每个发布子任务，或者在总管上使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这可以在针对性修复后限制失败的发布盒的重跑范围。对于单个失败的跨 OS 通道，将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合使用，例如 `windows/packaged-upgrade`OpenClaw；长时间的跨 OS 命令会输出心跳行，包升级摘要包含各阶段的时间。QA 发布检查通道是建议性的，除了标准运行时工具覆盖率门禁外，当所需的 OpenClaw 动态工具从标准层级摘要中漂移或消失时，它会阻塞。

`OpenClaw Release Checks` 使用受信任的工作流引用将所选引用一次性解析为 `release-package-under-test`Docker tarball，然后将该工件传递给跨 OS 检查和包验收，以及在浸泡覆盖运行时传递给实时/E2E 发布路径 Docker 工作流。这可以保持发布盒之间的包字节一致，并避免在多个子作业中重新打包相同的候选版本。

针对 `ref=main` 和 `rerun_group=all` 的重复 `Full Release Validation` 运行会取代旧的总管。当父任务被取消时，父监视器会取消它已经分发的任何子工作流，因此较新的主验证不会滞留在过时的两小时发布检查运行之后。发布分支/标签验证和重点重跑组保留 `cancel-in-progress: false`。

## 实时和 E2E 分片

发布 live/E2E 子任务保持了广泛的本地 `pnpm test:live` 覆盖率，但它通过 `scripts/test-live-shard.mjs` 将其作为命名分片运行，而不是作为一个串行任务：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 提供商过滤的 `native-live-src-gateway-profiles` 任务
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 拆分媒体音频/视频分片和提供商过滤的音乐分片

这保持了相同的文件覆盖率，同时使缓慢的实时提供商失败更容易重新运行和诊断。汇总的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称对于手动一次性重新运行仍然有效。

本地实时媒体分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，由 `Live Media Runner Image` 工作流构建。该镜像预安装了 `ffmpeg` 和 `ffprobe`；媒体任务在设置前仅验证二进制文件。请将 Docker 支持的实时套件保留在普通的 Blacksmith 运行器上 —— 容器任务是启动嵌套 Docker 测试的错误场所。

Docker 支持的实时模型/后端分片对每个选定的提交使用单独的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像。实时发布工作流构建并推送该镜像一次，然后 Docker 实时模型、提供商分片网关、CLI 后端、ACP 绑定和 Codex 绑定分片使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行。Gateway(网关) Docker 分片在工作流作业超时以下携带明确的脚本级 `timeout` 上限，以便卡住的容器或清理路径快速失败，而不是消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，则发布运行配置错误，并且会在重复的镜像构建上浪费墙钟时间。

## 包验收

当问题是“这个可安装的 OpenClaw 包是否作为产品工作？”时，请使用 `Package Acceptance`OpenClawDocker。这与普通的 CI 不同：普通的 CI 验证源代码树，而包验收通过用户在安装或更新后使用的同一 Docker E2E 测试工具来验证单个 tarball。

### 任务

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选项，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test`GitHub 构件上传，并在 GitHub 步骤摘要中打印源代码、工作流引用、包引用、版本、SHA-256 和配置文件。
2. `docker_acceptance` 使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`DockerDocker 调用 `openclaw-live-and-e2e-checks-reusable.yml`。可重用工作流下载该构件，验证 tarball 清单，在需要时准备基于包摘要的 Docker 镜像，并针对该包运行选定的 Docker 通道，而不是打包工作流检出。当配置文件选择了多个定向 `docker_lanes`Docker 时，可重用工作流会准备一次包和共享镜像，然后将这些通道作为具有唯一构件的并行定向 Docker 任务分发出去。
3. `package_telegram` 可选择性地调用 `NPM Telegram Beta E2E`。它在 `telegram_mode` 不是 `none` 时运行，并在包验收解析到一个时安装相同的 `package-under-test`Telegramnpm 构件；独立的 Telegram 调度仍然可以安装已发布的 npm 规范。
4. 如果包解析、Docker 验收或可选的 Telegram 通道失败，`summary`DockerTelegram 会使工作流失败。

### 候选项来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest`OpenClaw 或确切的 OpenClaw 发布版本（如 `openclaw@2026.4.27-beta.2`）。将其用于已发布的预发布/稳定版验收。
- `source=ref` 打包受信任的 `package_ref`OpenClaw 分支、标签或完整提交 SHA。解析器获取 OpenClaw 分支/标签，验证所选提交是否可从仓库分支历史或发布标签访问，在独立工作树中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url` 下载 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享的制品应提供。

保持 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/工具代码。`package_ref` 是当 `source=ref` 时被打包的源提交。这允许当前的测试工具验证旧的受信任源提交，而无需运行旧的工作流逻辑。

### 测试套件配置文件

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 发布路径分块
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时为必需项

`package` 配置文件使用离线插件覆盖率，因此已发布包的验证不受实时 ClawHub 可用性的限制。可选的 Telegram 车道在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 构件，并为独立分发保留已发布的 npm 规范路径。

有关专门的更新和插件测试策略，包括本地命令、Docker 车道、包验收输入、发布默认值和故障分类，请参阅[测试更新和插件](/zh/help/testing-updates-plugins)。

发布检查使用 `source=artifact`、准备好的发布包工件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai` 调用 Package Acceptance。这可以将包迁移、更新、实时 ClawHub 技能安装、过时插件依赖清理、已配置插件安装修复、离线插件、插件更新以及 Telegram 验证保持在同一解析的包压缩包上进行。在发布 Beta 后，在 Full Release Validation 或 OpenClaw Release Checks 上设置 `release_package_spec`，以便在不重新构建的情况下针对已发布的 npm 包运行相同的矩阵；仅当 Package Acceptance 需要与其余发布验证不同的包时，才设置 `package_acceptance_package_spec`。跨操作系统发布检查仍涵盖特定于操作系统的入门引导、安装程序和平台行为；包/更新产品验证应从 Package Acceptance 开始。`published-upgrade-survivor` Docker 通道在阻塞的发布路径中每次运行验证一个已发布的包基线。在 Package Acceptance 中，解析的 `package-under-test` 压缩包始终是候选项，而 `published_upgrade_survivor_baseline` 选择回退的已发布基线，默认为 `openclaw@latest`；失败通道的重新运行命令会保留该基线。带有 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以扩展到四个最新的稳定 npm 版本，外加固定的插件兼容性边界版本以及针对飞书配置、保留的 bootstrap/persona 文件、已配置的 OpenClaw 插件安装、波浪号日志路径和过时的旧版插件依赖根目录的问题形状的装置。多基线已发布升级幸存者选择按基线分片到单独的定向 Docker 运行器作业。当问题是详尽的已发布更新清理，而不是正常的 Full Release CI 广度时，单独的 `Update Migration` 工作流会使用带有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker 通道。本地聚合运行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递精确的包规范，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`（例如 `openclaw@2026.4.15`）保留单个通道，或者为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已发布通道使用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 RPC 启动后探测 `/healthz`、`/readyz` 以及 Gateway(网关) 状态。Windows 打包和安装程序全新通道还验证已安装的包是否可以从原始绝对 Windows 路径导入浏览器控制覆盖。OpenAI 跨操作系统代理回合冒烟测试在设置时默认为 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则为 `openai/gpt-5.5`，因此安装和网关验证保持在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容性窗口

Package Acceptance 对已发布的软件包有有限的旧版兼容性窗口。通过 `2026.4.25` 的软件包，包括 `2026.4.25-beta.*`，可以使用兼容性路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可能指向压缩包中省略的文件；
- 当软件包未公开该标志时，`doctor-switch` 可能会跳过 `gateway install --wrapper` 持久化子情况；
- `update-channel-switch` 可能会从压缩包衍生的虚假 git fixture 中修剪缺失的 pnpm `patchedDependencies`，并可能会记录缺失的持久化 `update.channel`；
- 插件冒烟测试可能会读取旧版安装记录位置或接受缺失的 marketplace 安装记录持久化；
- `plugin-update` 可能允许配置元数据迁移，同时仍要求安装记录和无重新安装行为保持不变。

已发布的 `2026.4.26` 软件包也可能会针对已发布的本地构建元数据标记文件发出警告。后续软件包必须满足现代合约；相同的情况将失败而不是警告或跳过。

### 示例

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

在调试失败的软件包验收运行时，请从 `resolve_package` 摘要开始，以确认软件包来源、版本和 SHA-256。然后检查 `docker_acceptance`Docker 子运行及其 Docker 构件：`.artifacts/docker-tests/**/summary.json`、`failures.json`Docker、lane 日志、阶段计时和重新运行命令。最好重新运行失败的软件包配置文件或确切的 Docker lane，而不是重新运行完整的发布验证。

## 安装冒烟测试

单独的 `Install Smoke` 工作流通过其自己的 `preflight` 作业重用相同的作用域脚本。它将冒烟测试覆盖范围划分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- 针对涉及 Docker/包表面、捆绑插件包/清单变更，或 Docker 冒烟作业所演练的核心插件/渠道/网关/Plugin SDK 表面的拉取请求，执行**快速通道**运行。仅限源码的捆绑插件变更、仅限测试的编辑以及仅限文档的编辑不会预留 Docker 工作器。快速通道构建一次根 Dockerfile 镜像，检查 CLI，运行代理删除共享工作区 CLI 冒烟，运行容器网关网络 e2e，验证捆绑扩展构建参数，并在 240 秒聚合命令超时下运行有界的捆绑插件 Docker 配置文件（每个场景的 Docker 运行分别设置上限）。
- **完整通道**为夜间计划运行、手动调度、工作流调用发布检查，以及真正触及安装程序/包/Docker 表面的拉取请求保留 QR 包安装和安装程序 Docker/更新覆盖范围。在完整模式下，install-smoke 准备或复用一个目标 SHA GHCR 根 Dockerfile 冒烟镜像，然后将 QR 包安装、根 Dockerfile/网关冒烟、安装程序/更新冒烟以及快速捆绑插件 Docker E2E 作为单独的作业运行，以便安装程序工作不会等待根镜像冒烟。

`main`Docker 推送（包括合并提交）不会强制完整路径；当变更范围逻辑在推送时请求完整覆盖时，工作流保留快速 Docker 冒烟，并将完整的安装冒烟留给夜间或发布验证。

缓慢的 Bun 全局安装镜像提供商冒烟由 Bun`run_bun_global_install_smoke` 单独控制。它在夜间计划和时间从发布检查工作流运行，手动 `Install Smoke` 调度可以选择加入，但拉取请求和 `main`Docker 推送则不会。QR 和安装程序 Docker 测试保留它们自己专注于安装的 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all`OpenClawnpm 预构建一个共享的实时测试镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个用于安装程序/更新/插件依赖通道的裸 Node/Git 运行器；
- 一个将相同的 tarball 安装到 `/app` 的功能镜像，用于常规功能通道。

Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，运行器仅执行选定的计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。

### 可调参数

| 变量                                   | 默认值  | 用途                                                                        |
| -------------------------------------- | ------- | --------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 常规通道的主池插槽数。                                                      |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 提供商敏感的尾池插槽数。                                                    |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发实时通道上限，以免提供商进行限流。                                      |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm 安装通道上限。                                                     |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务通道上限。                                                        |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道启动之间的交错时间，以避免 Docker 守护进程创建风暴；设置 `0` 则不交错。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个通道的回退超时时间（120 分钟）；选定的实时/尾通道使用更严格的限制。     |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置  | `1` 打印调度器计划而不运行通道。                                            |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置  | 逗号分隔的精确通道列表；跳过清理冒烟测试，以便代理可以重现一个失败的通道。  |

一个超过其有效上限的通道仍然可以从空池启动，然后单独运行直到它释放容量。本地聚合预检 Docker，移除过时的 OpenClaw E2E 容器，发出活动通道状态，持久化通道计时以进行最长优先排序，并且默认在第一次失败后停止调度新的池化通道。

### 可复用的实时/E2E 工作流

可重用的实时/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪些包、镜像类型、实时镜像、车道和凭证覆盖范围。`scripts/docker-e2e.mjs` 然后将该计划转换为 GitHub 输出和摘要。它通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，下载当前运行的包构建产物，或者从 `package_artifact_run_id` 下载包构建产物；验证 tarball 清单；当计划需要已安装包的车道时，通过 Blacksmith 的 Docker 层缓存构建并推送带有包摘要标签的 bare/functional GHCR Docker E2E 镜像；并重用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像，而不是重新构建。Docker 镜像拉取会重试，每次尝试有 180 秒的受限超时，因此卡住的注册表/缓存流会快速重试，而不是消耗 CI 关键路径的大部分时间。

### 发布路径块

发布 Docker 覆盖范围使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行较小的分块作业，因此每个块仅拉取其所需的镜像类型，并通过同一个加权调度程序执行多个车道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前发布 Docker 块包括通过 `plugins-runtime-install-h` 的 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 和 `plugins-runtime-install-a`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合插件/运行时别名。`install-e2e` 车道别名仍然是两个提供商安装车道的聚合手动重新运行别名。

当完整的发布路径覆盖范围请求时，OpenWebUI 会被合并到 `plugins-runtime-services` 中，并且仅为 OpenWebUI 专属的调度保留一个独立的 `openwebui`npm 块。捆绑渠道更新通道针对临时的 npm 网络故障会重试一次。

每个块会上传包含通道日志、计时信息、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢速通道表以及每个通道重试命令的 `.artifacts/docker-tests/`。工作流 `docker_lanes`DockerDockerGitHub 输入会针对准备好的镜像（而不是块任务）运行选定的通道，这使得失败通道的调试范围仅限于一个定向的 Docker 任务，并为该运行准备、下载或复用软件包产物；如果选定的通道是实时 Docker 通道，定向任务会在本地为该重试构建实时测试镜像。生成的每个通道 GitHub 重试命令包括 `package_artifact_run_id`、`package_artifact_name` 以及准备好的镜像输入（当这些值存在时），以便失败的通道可以复用失败运行中确切的软件包和镜像。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

定时的实时/E2E 工作流每天运行完整的发布路径 Docker 套件。

## 插件预发布

`Plugin Prerelease` 是成本更高的产品/包覆盖范围，因此它是由 `Full Release Validation` 或显式操作员调度的独立工作流。普通的拉取请求、`main` 推送和独立的手动 CI 调度都不会启用该套件。它将捆绑的插件测试分配给八个扩展工作线程；这些扩展分片作业每次最多运行两个插件配置组，每组一个 Vitest 工作线程，并使用更大的 Node 堆，这样导入繁重的插件批次就不会产生额外的 CI 作业。仅限发布的 Docker 预发布路径将目标 Docker 通道分批成小组，以避免为一到三分钟的作业保留数十个运行器。该工作流还会从 `@openclaw/plugin-inspector` 上传一个信息性的 `plugin-inspector-advisory` 制件；检查器的发现是分类输入，不会更改阻塞的插件预发布关卡。

## QA Lab

QA Lab 在主智能限定工作流之外拥有专用的 CI 通道。代理一致性嵌套在广泛的 QA 和发布工具下，而不是独立的 PR 工作流。当一致性应伴随广泛验证运行时，请使用带有 `rerun_group=qa-parity` 的 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流每晚在 `main` 上运行并在手动调度时运行；它将模拟一致性通道、实时 Matrix 通道以及实时 Telegram 和 Discord 通道作为并行作业展开。实时作业使用 `qa-live-shared` 环境，而 Telegram/Discord 使用 Convex 租约。

发布检查运行 Matrix 和 Telegram 实时传输通道，并使用确定性模拟提供商和模拟限定模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`），以便渠道合同与实时模型延迟和正常提供商-插件启动隔离开来。实时传输网关禁用内存搜索，因为 QA 一致性单独覆盖内存行为；提供商连接性由单独的实时模型、原生提供商和 Docker 提供商套件覆盖。

Matrix 使用 Matrix`--profile fast` 进行预定和发布检查，仅当检出的 CLI 支持时才添加 `--fail-fast`CLICLI。CLI 默认值和手动工作流输入仍为 `all`；手动 `matrix_profile=all`Matrix 调度始终将完整的 Matrix 覆盖范围分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。

`OpenClaw Release Checks` 也在发布批准之前运行发布关键的 QA Lab 流道；其 QA 奇偶校验门将候选包和基线包作为并行流道作业运行，然后将两个构件下载到一个小型报告作业中，以进行最终的奇偶校验比较。

对于普通的 PR，请遵循限定范围的 CI/check 证据，而不是将奇偶校验视为必需状态。

## CodeQL

`CodeQL` 工作流故意设计为窄范围的第一遍安全扫描器，而不是完整的代码库扫描。每日、手动和非草稿 PR 保护运行扫描 Actions 工作流代码以及最高风险的 JavaScript/TypeScript 表面，并使用筛选为高/严重 `security-severity` 的高置信度安全查询。

PR 保护保持轻量：它仅在 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src`AndroidmacOS 下的更改时启动，并且它运行与预定工作流相同的高置信度安全矩阵。Android 和 macOS CodeQL 不属于 PR 默认设置。

### 安全类别

| 类别                                              | 表面                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基线                                      |
| `/codeql-security-high/channel-runtime-boundary`  | 核心渠道实现合约加上渠道插件运行时、gateway、Plugin SDK、secrets、审计接触点      |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络守卫、web-fetch 和 Plugin SDK SSRF 策略表面               |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行助手、出站交付以及代理工具执行门控                            |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、清单、注册表、包管理器安装、源代码加载以及插件 SDK 包合约信任面 |

### 平台特定的安全分片

- `CodeQL Android Critical Security`AndroidAndroidLinux — 定时 Android 安全分片。在工作流健全性允许的最小 Blacksmith Linux 运行器上为 CodeQL 手动构建 Android 应用。在 `/codeql-critical-security/android` 下上传。
- `CodeQL macOS Critical Security`macOSmacOSmacOS — 每周/手动 macOS 安全分片。在 Blacksmith macOS 上为 CodeQL 手动构建 macOS 应用，从上传的 SARIF 中过滤掉依赖构建结果，并在 `/codeql-critical-security/macos`macOS 下上传。保留在每日默认值之外，因为即使在干净状态下，macOS 构建也会占据主导运行时间。

### 关键质量类别

`CodeQL Critical Quality` 是匹配的非安全分片。它在较小的 Blacksmith Linux 运行器上，仅针对狭窄的高价值表面运行错误严重性、非安全的 JavaScript/TypeScript 质量查询。其拉取请求保护 intentionally 小于计划配置文件：非草稿 PR 仅运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片，用于代理命令/模型/工具执行和回复分发代码、配置架构/迁移/IO 代码、auth/secrets/sandbox/security 代码、核心渠道和捆绑渠道插件运行时、gateway 协议/服务器方法、内存运行时/SDK 粘合剂、MCP/进程/出站交付、提供商 运行时/模型目录、会话诊断/交付队列、插件加载器、Plugin SDK/包契约或 Plugin SDK 回复运行时更改。CodeQL 配置和质量工作流更改会运行所有十二个 PR 质量分片。

手动分派接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

窄配置文件是用于隔离运行一个质量分片的教学/迭代钩子。

| 类别                                                    | 表面                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/codeql-critical-quality/core-auth-secrets`            | Auth、secrets、sandbox、cron 和 gateway 安全边界代码                                                   |
| `/codeql-critical-quality/config-boundary`              | 配置架构、迁移、规范化和 IO 契约                                                                       |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Gateway(网关) 协议架构和服务器方法契约                                                                 |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心渠道和捆绑渠道插件实现契约                                                                         |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/提供商分发、自动回复分发和队列，以及 ACP 控制平面运行时契约                             |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接器、进程监督助手，以及出站交付契约                                                 |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory 主机 SDK、内存运行时外观、内存插件 SDK 别名、内存运行时激活胶水代码以及内存诊断器命令           |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部机制、会话传递队列、出站会话绑定/传递助手、诊断事件/日志包表面以及会话诊断器 CLI 契约      |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | 插件 SDK 入站回复分发、回复负载/分块/运行时助手、渠道回复选项、传递队列以及会话/线程绑定助手           |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、提供商身份验证和发现、提供商运行时注册、提供商默认值/目录以及 Web/搜索/获取/嵌入注册表 |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 引导程序、本地持久化、网关控制流以及任务控制平面运行时契约                                     |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 Web 获取/搜索、媒体 IO、媒体理解、图像生成以及媒体生成运行时契约                                  |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、注册表、公共表面以及插件 SDK 入口点契约                                                        |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布的包端插件 SDK 源代码和插件包契约助手                                                            |

质量与安全保持分离，以便在不掩盖安全信号的情况下对质量发现进行调度、衡量、禁用或扩展。仅当狭窄的配置文件具有稳定的运行时间和信号后，才应将 Swift、Python 和捆绑插件 CodeQL 扩展作为范围限定或分片的后续工作添加回来。

## 维护工作流

### Docs Agent

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于使现有文档与最近落地的更改保持一致。它没有纯粹的日程安排：在 `main` 上成功的非机器人推送 CI 运行可以触发它，手动调度也可以直接运行它。当 `main` 已继续推进，或者在一小时内创建了另一个未跳过的 Docs Agent 运行时，工作流运行调用将被跳过。当它运行时，它会审查从上一个未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次每小时运行可以覆盖自上次文档传递以来累积的所有主要更改。

### 测试性能代理

`Test Performance Agent` 工作流是一个针对慢速测试的事件驱动 Codex 维护通道。它没有纯粹的调度：在 `main` 上成功的非机器人推送 CI 运行可以触发它，但如果在该 UTC 日的另一个工作流运行调用已经运行或正在运行，它将跳过。手动调度会绕过该每日活动门控。该通道构建全套分组的 Vitest 性能报告，允许 Codex 仅进行保持覆盖率的小幅测试性能修复，而不是广泛的重构，然后重新运行全套报告并拒绝减少通过基准测试数量的更改。如果基准中有失败的测试，Codex 可能只修复明显的失败，并且在提交任何内容之前，代理后的全套报告必须通过。当 `main` 在机器人推送落地之前推进时，该通道会对已验证的补丁进行变基，重新运行 `pnpm check:changed`，并重试推送；冲突的过时补丁将被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的 drop-sudo 安全姿态。

### 合并后的重复 PR

`Duplicate PRs After Merge` 工作流是一个用于合并后重复项清理的手动维护者工作流。它默认为空运行，仅在 `apply=true` 时关闭明确列出的 PR。在更改 GitHub 之前，它会验证已落地的 PR 已合并，并且每个重复项都有一个共享的引用问题或重叠的更改块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地检查门控和更改路由

本地更改通道逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。该本地检查门控在架构边界方面比广泛的 CI 平台范围更严格：

- 核心生产更改运行核心 prod、核心 test typecheck 以及核心 lint/guards；
- 核心仅测试更改仅运行核心 test typecheck 以及核心 lint；
- 扩展生产更改运行扩展 prod、扩展 test typecheck 以及扩展 lint；
- 扩展仅测试更改运行扩展 test typecheck 以及扩展 lint；
- 公共 Plugin SDK 或插件契约更改会扩展到扩展 typecheck，因为扩展依赖于这些核心契约（Vitest 扩展扫描保持为显式测试工作）；
- 仅发布元数据的版本升级运行针对性的版本/配置/根依赖检查；
- 未知的根/配置更改会安全地失败并运行所有检查通道。

本地变更测试的路由位于 `scripts/test-projects.test-support.mjs` 中，且有意设计得比 `check:changed`DiscordSlack 更廉价：直接编辑的测试运行自身，源码编辑优先使用显式映射，然后是同级测试和导入图依赖项。共享群组房间交付配置是显式映射之一：对群组可见回复配置、源回复交付模式或消息工具系统提示的更改会通过核心回复测试以及 Discord 和 Slack 交付回归测试进行路由，以便在第一次 PR 推送之前使共享默认更改失败。仅当更改足够广泛以至于廉价的映射集不是可信的代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是仓库拥有的用于维护者 Linux 验证的远程盒子封装。当检查对于本地编辑循环来说过于宽泛、当 CI 一致性很重要，或者当验证需要密钥、Docker、包通道、可重用盒子或远程日志时，请从仓库根目录使用它。正常的 OpenClaw 后端是 LinuxDockerOpenClaw`blacksmith-testbox`Hetzner；拥有的 AWS/Hetzner 容量是 Blacksmith 中断、配额问题或显式拥有的容量测试的后备。

Crabbox 支持的 Blacksmith 运行预热、声明、同步、运行、报告和清理一次性 Testbox。当所需的根文件（如 `pnpm-lock.yaml`）消失或 `git status --short` 显示至少 200 个跟踪删除时，内置同步健全性检查会快速失败。对于有意进行大量删除的 PR，请为远程命令设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 还会终止在同步阶段停留超过五分钟且没有同步后输出的本地 Blacksmith CLI 调用。设置 CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以禁用该保护，或者为异常大的本地差异使用更大的毫秒值。

在首次运行之前，请从仓库根目录检查封装：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库包装器拒绝不声明 `blacksmith-testbox` 的陈旧 Crabbox 二进制文件。即使 `.crabbox.yaml` 具有自有云（owned-cloud）默认值，也请显式传递提供商。在 Codex 工作树或链接/稀疏检出中，请避免使用本地 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动之前协调依赖项；请改为直接调用 node 包装器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

变更的入口：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

聚焦的测试重跑：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
```

完整套件：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

阅读最终的 JSON 摘要。有用的字段包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。由 Blacksmith 支持的一次性 Crabbox 运行应自动停止 Testbox；如果运行中断或清理不明确，请检查实时测试框并仅停止您创建的测试框：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

仅当您有意在同一个已配置的测试框上执行多个命令时才使用重用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障层但 Blacksmith 本身工作正常，请仅将直接 Blacksmith 用于 `list`、`status` 和清理等诊断。在将直接 Blacksmith 运行视为维护者证明之前，请修复 Crabbox 路径。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 正常工作，但新的预热在几分钟后仍 `queued` 且没有 IP 或 Actions 运行 URL，则将其视为 Blacksmith 提供商、队列、计费或组织限制的压力。停止您创建的排队 ID，避免启动更多 Testbox，并在有人检查 Blacksmith 仪表板、计费和组织限制的同时，将证明移至下文所述的自有 Crabbox 容量路径。

仅当 Blacksmith 停机、受配额限制、缺少所需环境或明确以自有容量为目标时，才升级到自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 压力下，除非任务确实需要 48xlarge 级别的 CPU，否则请避免使用 `class=beast`。`beast` 请求从 192 个 vCPU 开始，这是触发区域级 EC2 Spot 或按需标准配额的最简单方式。仓库拥有的 `.crabbox.yaml` 默认设置为 `standard`、多个容量区域和 `capacity.hints: true`，因此代理的 AWS 租赁会打印所选区域/市场、配额压力、Spot 回退以及高压类别警告。对于较重的广泛检查，请使用 `fast`；仅在标准/快速检查不足时使用 `large`；仅针对异常的 CPU 密集型通道（如全套件或所有插件 Docker 矩阵、明确的发布/阻断程序验证或高核心性能分析）使用 `beast`。不要为 `pnpm check:changed`、专注测试、仅文档工作、常规 lint/typecheck、小型 E2E 复现或 Blacksmith 中断排查使用 `beast`。使用 `--market on-demand` 进行容量诊断，以免 Spot 市场波动混入信号中。

`.crabbox.yaml` 拥有自有云通道的提供商、同步和 GitHub Actions 水合默认设置。它排除本地 `.git`，以便水合后的 Actions checkout 保留其自己的远程 Git 元数据，而不是同步维护者本地远程和对象存储；它还排除绝不应传输的本地运行时/构建产物。`.github/workflows/crabbox-hydrate.yml` 拥有自有云 `crabbox run --id <cbx_id>` 命令的 checkout、Node/pnpm 设置、`origin/main` 获取和非机密环境交接。

## 相关

- [安装概述](/zh/install)
- [开发渠道](/zh/install/development-channels)
