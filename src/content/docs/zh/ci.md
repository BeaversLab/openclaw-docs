---
summary: "CI 作业图、作用域网关、发布总览和本地命令等效项"
title: "CI 流水线"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 OpenClaw`main` 和每个拉取请求时运行。`preflight` 作业会对差异进行分类，并且当仅更改了不相关区域时，会关闭开销较大的流水线。手动 `workflow_dispatch`Android 运行有意绕过智能作用域，并为发布候选版本和广泛验证展开完整图。Android 流道通过 `include_android` 保持选择性加入。仅限发布的插件覆盖范围位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且仅从 [`Full Release Validation`](#full-release-validation) 或显式的手动分派运行。

## 流水线概述

| 作业                             | 目的                                                                       | 运行时间                         |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| `preflight`                      | 检测仅文档的更改、更改的范围、更改的扩展，并构建 CI 清单                   | 在所有非草稿推送和 PR 上始终运行 |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审核                                     | 在所有非草稿推送和 PR 上始终运行 |
| `security-dependency-audit`      | 针对 npm 安全公告的无依赖生产 lockfile 审计                                | 在所有非草稿推送和 PR 上始终运行 |
| `security-fast`                  | 快速安全作业所需的聚合                                                     | 在所有非草稿推送和 PR 上始终运行 |
| `check-dependencies`             | 生产 Knip 仅依赖项传递以及未使用文件允许列表保护                           | Node 相关更改                    |
| `build-artifacts`                | 构建 `dist/`、控制 UI、构建产物检查和可复用的下游产物                      | Node 相关更改                    |
| `checks-fast-core`               | 快速 Linux 正确性通道，例如捆绑/插件契约/协议检查                          | Node 相关更改                    |
| `checks-fast-contracts-channels` | 分片渠道契约检查，具有稳定的聚合检查结果                                   | Node 相关更改                    |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括渠道、bundled、契约和扩展通道                    | Node 相关变更                    |
| `check`                          | 分片的主本地网关等效项：生产类型、lint、守卫、测试类型和严格冒烟测试       | Node 相关变更                    |
| `check-additional`               | 架构、分片边界/提示漂移、扩展守卫、包边界和网关监视                        | Node 相关变更                    |
| `build-smoke`                    | Built-CLI 冒烟测试和启动内存冒烟测试                                       | Node 相关变更                    |
| `checks`                         | 构建产物渠道测试的验证器                                                   | Node 相关变更                    |
| `checks-node-compat-node22`      | Node 22 兼容性构建和冒烟通道                                               | 发布的手动 CI 调度               |
| `check-docs`                     | 文档格式化、lint 和断链检查                                                | 文档已更改                       |
| `skills-python`                  | 用于支持 Python 的技能的 Ruff + pytest                                     | 与 Python 技能相关的变更         |
| `checks-windows`                 | Windows 特定的进程/路径测试以及共享运行时导入说明符回归测试                | Windows 相关变更                 |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试通道                               | macOS 相关变更                   |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                        | macOS 相关变更                   |
| `android`                        | 针对两种风格的 Android 单元测试以及一个调试 APK 构建                       | Android 相关变更                 |
| `test-performance-agent`         | 可信活动后的每日 Codex 慢速测试优化                                        | 主 CI 成功或手动调度             |
| `openclaw-performance`           | 每日/按需 Kova 运行时性能报告，包含模拟提供商、深度分析和 GPT 5.4 实时通道 | 计划和手动调度                   |

## 快速失败顺序

1. `preflight` 决定根本存在哪些流水线。`docs-scope` 和 `changed-scope` 逻辑是该作业内部的步骤，而非独立作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，而无需等待更繁重的构建产物和平台矩阵任务。
3. `build-artifacts` 与快速 Linux 通道重叠，以便下游使用者在共享构建准备好后能立即开始。
4. 在此之后，更繁重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当有新的推送提交到同一 PR 或 `main` 引用时，GitHub 可能会将被取代的任务标记为 `cancelled`。除非同一引用的最新运行也失败，否则请将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已被取代后不会排队。自动 CI 并发键是版本化的 (`CI-v7-*`)，因此旧队列组中 GitHub 端的僵尸进程无法无限期地阻塞较新的 main 运行。手动全套件运行使用 `CI-manual-v1-*`，并且不会取消正在进行的运行。

`ci-timings-summary` 任务会为每次非草稿 CI 运行上传一个紧凑的 `ci-timings-summary` 构建产物。它记录了当前运行的运行时间、排队时间、最慢的任务和失败的任务，因此 CI 健康检查无需重复抓取完整的 Actions 负载。

## 范围与路由

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动调度会跳过变更范围检测，并使预检清单表现得像所有范围区域都已变更一样。

- **CI workflow edits** 验证 Node CI 图以及 workflow linting，但不会单独强制 Windows、Android 或 macOS 的原生构建；这些平台 lane 仍限定于平台源代码的变更。
- **仅 CI 路由的编辑、选定的廉价核心测试固件编辑，以及狭窄的插件契约助手/测试路由编辑**使用快速的仅 Node 清单路径：`preflight`、安全性以及一个 `checks-fast-core` 任务。当变更仅限于该快速任务直接练习的路由或助手表面时，该路径会跳过构建产物、Node 22 兼容性、渠道契约、完整核心分片、捆绑插件分片以及额外的防护矩阵。
- **Windows Node checks** 限定于 Windows 特定的进程/路径包装器、npm/pnpm/UI 运行程序辅助工具、包管理器配置以及执行该 lane 的 CI workflow 表面；不相关的源代码、插件、install-smoke 和仅测试变更仍保留在 Linux Node lanes 上。

最慢的 Node 测试系列被拆分或负载均衡，以确保每个作业保持精简而不会过度预留运行器：渠道契约作为三个加权的 Blacksmith 支持的分片运行，并带有标准的 GitHub 运行器回退，核心单元快速/支持通道单独运行，核心运行时基础设施拆分在状态、进程/配置、Cron 和共享分片之间，自动回复作为负载均衡工作程序运行（且回复子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片），agentic gateway/server 配置分布在 chat/auth/模型/http-plugin/runtime/startup 通道中，而不是等待构建的产物。广泛的浏览器、QA、媒体和杂项插件测试使用其专用的 Vitest 配置，而不是共享的插件兜底配置。包含模式分片使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分完整配置和过滤后的分片。`check-additional` 将包边界的编译/金丝雀工作保持在一起，并将运行时拓扑架构与 Gateway(网关) watch 覆盖范围分开；边界守护列表分布在四个矩阵分片中，每个分片并发运行选定的独立守护并打印每次检查的计时。昂贵的 Codex 快乐路径提示快照漂移检查作为其自己的额外作业运行，仅用于手动 CI 和影响提示的更改，因此正常的不相关的 Node 更改不会在冷提示快照生成后等待，并且当提示漂移仍固定在导致它的 PR 上时，边界分片保持平衡；相同的标志跳过内置产物的核心支持边界分片内部的提示快照 Vitest 生成。Gateway(网关) watch、渠道测试和核心支持边界分片在 `build-artifacts` 内部并发运行，在 `dist/` 和 `dist-runtime/` 已经构建之后。

Android CI 同时运行 Android`testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`Android，然后构建 Play 调试版 APK。Third-party flavor 没有单独的源集或清单；其单元测试通道仍然会使用 SMS/通话日志 BuildConfig 标志编译该 flavor，同时在每次 Android 相关的推送中避免重复的调试版 APK 打包工作。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（一个固定到最新 Knip 版本的生产环境 Knip 仅依赖检查，并为 `dlx` 安装禁用了 pnpm 的最小发布年龄）和 `pnpm deadcode:unused-files`，后者将 Knip 的生产环境未使用文件发现结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。当 PR 添加了新的未经审查的未使用文件或保留了过时的允许列表条目时，未使用文件守护程序将失败，同时保留 Knip 无法静态解析的有意的动态插件、生成、构建、实时测试和包桥接表面。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub 是从 OpenClaw 存储库活动到 ClawSweeper 的目标端桥接器。它不会检出或执行不受信任的拉取请求代码。该工作流从 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建一个 GitHub App 令牌，然后将紧凑的 `repository_dispatch` 负载分派到 `openclaw/clawsweeper`。

该工作流有四个通道：

- `clawsweeper_item` 用于精确的问题和拉取请求审查请求；
- `clawsweeper_comment` 用于问题评论中的显式 ClawSweeper 命令；
- `clawsweeper_commit_review` 用于 `main` 推送上的提交级别审查请求；
- `github_activity`GitHub 用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 车道仅转发标准化元数据：事件类型、操作、执行者、仓库、项目编号、URL、标题、状态，以及评论或审查（如果存在）的简短摘录。它有意避免转发完整的 webhook 主体。`openclaw/clawsweeper` 中的接收工作流是 `.github/workflows/github-activity.yml`，它将标准化事件发布到 ClawSweeper 代理的 OpenClaw Gateway(网关) 挂钩。

常规活动是观察性的，而非默认交付。ClawSweeper 代理在其提示中接收 Discord 目标，并且仅当事件令人惊讶、可操作、具有风险或在运营上有用时，才应发布到 `#clawsweeper`。常规打开、编辑、机器人搅动、重复 webhook 噪音和正常的审查流量应导致 `NO_REPLY`。

在此路径中，应将 GitHub 标题、评论、正文、审查文本、分支名称和提交消息视为不受信任的数据。它们是用于汇总和分诊的输入，而不是工作流或代理运行时的指令。

## 手动调度

手动 CI 调度运行与正常 CI 相同的作业图，但强制启用所有非 Android 范围的车道：Linux Node 分片、捆绑插件分片、渠道合约、Node 22 兼容性、`check`、`check-additional`、构建冒烟测试、文档检查、Python 技能、Windows、macOS 和 Control UI i18n。独立的手动 CI 调度仅使用 `include_android=true` 运行 Android；完整的发布范围通过传递 `include_android=true` 启用 Android。插件预发布静态检查、仅限发布的 `agentic-plugins` 分片、完整扩展批次扫描以及插件预发布 Docker 车道将从 CI 中排除。Docker 预发布套件仅在 `Full Release Validation` 调度单独的 `Plugin Prerelease` 工作流并启用 release-validation 门控时运行。

手动运行使用唯一的并发组，以免同一引用上的其他推送或 PR 运行取消发布候选版本的完整套件。可选的 `target_ref` 输入允许受信任的调用者在分支、标签或完整提交 SHA 上运行该图，同时使用所选调度引用中的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| 运行器                           | 作业                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`，快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`），快速协议/合约/捆绑检查，分片渠道合约检查，除 lint 之外的 `check` 分片，`check-additional` 聚合，Node 测试聚合验证器，文档检查，Python 技能，workflow-sanity，labeler，auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`，较低权重的扩展分片，`checks-fast-core`、`checks-node-compat-node22`、`check-prod-types` 和 `check-test-types`                                                                                                                                                                                                                                   |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke、Linux Node 测试分片、捆绑插件测试分片、`check-additional` 分片、`android`                                                                                                                                                                                                                                                                                     |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（对 CPU 足够敏感，以至于 8 vCPU 的成本超过了它们节省的成本）；install-smoke Docker 构建（32 vCPU 排队时间成本超过了其节省的成本）                                                                                                                                                                                                          |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 在 `openclaw/openclaw` 上；派生回退到 `macos-latest`                                                                                                                                                                                                                                                                                                          |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 在 `openclaw/openclaw` 上；派生回退到 `macos-latest`                                                                                                                                                                                                                                                                                                         |

Canonical-repo CI 将 Blacksmith 保持为默认运行器路径。在 `preflight` 期间，`scripts/ci-runner-labels.mjs` 检查最近排队和进行中的 Actions 运行中是否有排队的 Blacksmith 作业。如果特定的 Blacksmith 标签已有排队的作业，则使用该确切标签的下游作业将仅在该次运行中回退到匹配的 GitHub 托管运行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。同一 OS 系列中的其他 Blacksmith 规格保留在其主要标签上。如果 API 探测失败，则不应用回退。

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
pnpm build                                    # build dist when CI artifact/build-smoke lanes matter
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

`OpenClaw Performance` 是产品/运行时性能工作流。它每天在 `main` 上运行，也可以手动触发：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动触发通常对工作流引用进行基准测试。设置 `target_ref` 可以使用当前工作流实现对发布标签或其他分支进行基准测试。发布的报告路径和最新指针以被测引用为键，每个 `index.md` 记录被测引用/SHA、工作流引用/SHA、Kova 引用、配置文件、通道授权模式、模型、重复计数和场景过滤器。

该工作流从固定版本安装 OCM，并从 `openclaw/Kova` 在固定的 `kova_ref` 输入处安装 Kova，然后运行三个通道：

- `mock-provider`：针对本地构建运行时的 Kova 诊断场景，具有确定性的伪造 OpenAI 兼容身份验证。
- `mock-deep-profile`：针对启动、网关和代理轮热点的 CPU/堆/跟踪分析。
- `live-gpt54`：真实的 OpenAI `openai/gpt-5.4` 代理轮，当 `OPENAI_API_KEY` 不可用时跳过。

mock-提供商 通道还在 Kova 通过后运行 OpenClaw 原生源探测：包括默认、hook 和 50 插件启动情况下的网关启动时间和内存；重复的 mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI hello 循环；以及针对已启动网关的 CLI 启动命令。源探测的 Markdown 摘要位于报告包中的 `source/index.md`，旁边是原始 JSON。

每个通道都会上传 GitHub 构件。当配置了 GitHub`CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、bundles、`index.md` 和源探测构件提交到 `openclaw/clawgrit-reports` 下的 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 中。当前测试引用指针被写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是“发布前运行所有内容”的手动总控工作流。它接受分支、标签或完整提交 SHA，向该目标调度手动 `CI` 工作流，调度 `Plugin Prerelease` 进行仅限发布的插件/包/静态/Docker 验证，并调度 `OpenClaw Release Checks` 进行安装冒烟测试、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 通道。稳定/默认运行将详尽的实时/E2E 和 Docker 发布路径覆盖保留在 `run_release_soak=true` 之后；`release_profile=full` 强制启用该 soak 覆盖，以确保广泛的建议性验证保持广泛。配合 `rerun_group=all` 和 `release_profile=full`，它还会针对发布检查中的 `release-package-under-test` 构件运行 `NPM Telegram Beta E2E`。发布后，传递 `release_package_spec` 可在发布检查、包验收、npm、跨操作系统和 Docker 之间复用已发布的 Telegram 包，而无需重新构建。仅当 Telegram 必须验证不同的包时，才使用 `npm_telegram_package_spec`。

有关阶段矩阵、确切的工作流作业名称、配置文件差异、构件和重点重新运行句柄，请参阅[完整发布验证](/zh/reference/full-release-validation)。

`OpenClaw Release Publish` 是手动进行变更的发布工作流。在发布标签存在且 OpenClaw npm 预检成功后，请从 `release/YYYY.M.D` 或 `main` 调度它。它会验证 `pnpm plugins:sync:check`，为所有可发布的插件包调度 `Plugin NPM Release`，为同一发布 SHA 调度 `Plugin ClawHub Release`，然后才使用保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

对于快速变动分支上的固定提交证明，请使用辅助工具，而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub 工作流调度引用必须是分支或标签，而不是原始提交 SHA。辅助工具会在目标 SHA 处推送一个临时的 `release-ci/<sha>-...` 分支，从该固定引用调度 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，并在运行完成后删除临时分支。如果任何子工作流在不同的 SHA 上运行，伞形验证器也会失败。

`release_profile` 控制传递给发布检查的实时/提供商广度。手动发布工作流默认为 `stable`；仅当您有意需要广泛的顾问提供商/媒体矩阵时，才使用 `full`。`run_release_soak` 控制稳定/默认发布检查是否运行详尽的实时/E2E 和 Docker 发布路径 soak；`full` 强制开启 soak。

- `minimum` 保留最快的 OpenAI/核心发布关键通道。
- `stable` 添加稳定的提供商/后端集。
- `full` 运行广泛的顾问提供商/媒体矩阵。

umbrella 会记录已分发的子运行 ID，最终的 `Verify full validation` 作业会重新检查当前子运行的结论，并为每个子运行附加最慢作业表。如果子工作流被重新运行并通过（变绿），只需重新运行父验证器作业以刷新 umbrella 结果和计时摘要。

为了恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对发布候选版本使用 `all`，对仅普通完整 CI 子项使用 `ci`，对仅插件预发布子项使用 `plugin-prerelease`，对每个发布子项使用 `release-checks`，或者在 umbrella 上使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这使得针对特定修复后的失败发布盒子的重新运行范围受限。对于单个失败的跨操作系统通道，请将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合使用，例如 `windows/packaged-upgrade`；长跨操作系统命令会发出心跳行，包升级摘要包括各阶段计时。QA 发布检查通道是建议性的，因此仅 QA 失败会发出警告，但不会阻止发布检查验证器。

`OpenClaw Release Checks` 使用受信任的工作流引用将选定的引用一次性解析为 `release-package-under-test`Docker tarball，然后将该工件传递给跨操作系统检查和包验收，以及浸泡覆盖运行时的实时/E2E 发布路径 Docker 工作流。这使得发布盒子之间的包字节保持一致，并避免在多个子作业中重新打包相同的候选版本。

为 `ref=main` 和 `rerun_group=all` 重复运行 `Full Release Validation` 会取代旧的统管任务。当父任务被取消时，父监视器会取消它已调度的任何子工作流，因此较新的 main 验证不会卡在过时的两小时 release-check 运行之后。Release 分支/Tag 验证和集中式重跑组保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

Release live/E2E 子任务保留了广泛的 Native `pnpm test:live` 覆盖率，但它是通过 `scripts/test-live-shard.mjs` 作为命名分片运行的，而不是作为一个串行任务：

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
- 拆分的媒体音频/视频分片和提供商过滤的音乐分片

这保持了相同的文件覆盖率，同时使缓慢的 Live 提供商故障更容易重新运行和诊断。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称对于手动单次重新运行仍然有效。

Native Live 媒体分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，该镜像由 `Live Media Runner Image` 工作流构建。该镜像预装了 `ffmpeg` 和 `ffprobe`；媒体任务仅在进行设置之前验证二进制文件。请将基于 Docker 的 Live 套件保留在普通的 Blacksmith 运行器上 —— 容器任务不是启动嵌套 Docker 测试的正确场所。

基于 Docker 的实时模型/后端分片针对每个选定的提交使用一个单独的共享 Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI 镜像。实时发布工作流会构建并推送该镜像一次，然后 Docker 实时模型、提供商分片的 Gateway、CLI 后端、ACP 绑定和 Codex 工具分片使用 `OPENCLAW_SKIP_DOCKER_BUILD=1`Gateway(网关)Docker 运行。Gateway Docker 分片在工作流作业超时之前设置了明确的脚本级别 `timeout`Docker 上限，以便卡住的容器或清理路径能够快速失败，而不是消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，则说明发布运行配置错误，并且会在重复的镜像构建上浪费实际时间。

## 包验收

当问题是“这个可安装的 OpenClaw 包是否能作为产品正常工作？”时，请使用 `Package Acceptance`OpenClawDocker。这与普通的 CI 不同：普通 CI 验证源代码树，而包验收通过用户在安装或更新后使用的相同 Docker E2E 测试工具来验证单个 tarball。

### 作业

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test`GitHub 构件上传，并在 GitHub 步骤摘要中打印源码、工作流引用、包引用、版本、SHA-256 和配置文件。
2. `docker_acceptance` 调用 `openclaw-live-and-e2e-checks-reusable.yml` 时附带 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`。可重用的 workflow 会下载该产物，验证 tarball 清单，根据需要准备 package-digest Docker 镜像，并对该包运行选定的 Docker lanes，而不是打包 workflow checkout。当配置文件选择了多个针对特定 `docker_lanes` 时，可重用的 workflow 会准备一次包和共享镜像，然后将这些 lanes 作为带有唯一产物的并行针对特定 Docker 任务分发出去。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。它在 `telegram_mode` 不是 `none` 时运行，并且当 Package Acceptance 解析了一个 `package-under-test` 产物时安装该产物；独立的 Telegram dispatch 仍然可以安装已发布的 npm spec。
4. 如果包解析、Docker 验收或可选的 Telegram 渠道失败，`summary`DockerTelegram 将使工作流失败。

### 候选来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest`OpenClaw 或确切的 OpenClaw 发布版本（如 `openclaw@2026.4.27-beta.2`）。将其用于已发布的预发布/稳定版验收。
- `source=ref` 打包受信任的 `package_ref`OpenClaw 分支、标签或完整提交 SHA。解析器获取 OpenClaw 分支/标签，验证所选提交可从仓库分支历史或发布标签到达，在分离的工作树中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url` 下载 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享的制品应提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的可信工作流/测试线束代码。`package_ref` 是当 `source=ref` 时被打包的源提交。这使得当前的测试线束可以验证旧的可信源提交，而无需运行旧的工作流逻辑。

### Suite 配置文件

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` 加上 `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 发布路径块
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时需要

`package` 配置文件使用离线插件覆盖率，因此已发布包的验证不依赖于实时的 ClawHub 可用性。可选的 Telegram 跑道在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 制品，并为独立调度保留已发布的 npm 规范路径。

有关专门的更新和插件测试策略，包括本地命令、Docker 通道、包验收输入、发布默认值和故障分类，请参阅[测试更新和插件](/zh/help/testing-updates-plugins)。

发布检查通过 `source=artifact`、准备好的发布包构件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai` 调用包验收（Package Acceptance）。这使得包迁移、更新、在线 ClawHub 技能安装、过期插件依赖清理、已配置插件安装修复、离线插件、插件更新以及 Telegram 验证都在同一个解析出的包压缩包上进行。在发布 Beta 版本后，在完整发布验证（Full Release Validation）或 OpenClaw 发布检查上设置 `release_package_spec`，以便在不重新构建的情况下针对已发布的 npm 包运行相同的矩阵；仅当包验收需要与发布验证其余部分不同的包时，才设置 `package_acceptance_package_spec`。跨操作系统发布检查仍涵盖特定于操作系统的引导、安装程序和平台行为；包/更新产品验证应从包验收开始。`published-upgrade-survivor` Docker 通道在阻塞发布路径中每次运行验证一个已发布的包基线。在包验收中，解析出的 `package-under-test` 压缩包始终是候选项，而 `published_upgrade_survivor_baseline` 选择回退的已发布基线，默认为 `openclaw@latest`；失败通道的重新运行命令会保留该基线。带有 `run_release_soak=true` 或 `release_profile=full` 的完整发布验证会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以扩展到最新的四个稳定 npm 版本，加上固定的插件兼容性边界版本以及针对飞书配置、保留的引导/角色文件、已配置的 OpenClaw 插件安装、波浪号日志路径和过时的遗留插件依赖根目录的特定问题装置。多基线已发布升级幸存者选择按基线分片到单独的定向 Docker 运行器作业。当问题是详尽的已发布更新清理（而非正常的完整发布 CI 广度）时，单独的 `Update Migration` 工作流会使用带有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker 通道。本地聚合运行可以通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递确切的包规范，通过 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`（例如 `openclaw@2026.4.15`）保留单个通道，或者为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已发布通道使用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 RPC 启动后探测 `/healthz`、`/readyz`Gateway(网关) 以及 RPC 状态。Windows 打包和安装程序全新通道还验证已安装的包是否可以从原始绝对 Windows 路径导入浏览器控制覆盖。OpenAI 跨操作系统代理回合冒烟测试在设置时默认为 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则为 `openai/gpt-5.4`，因此安装和网关验证保留在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容性窗口

包验收对已发布的包有有限的旧版兼容性窗口。截止到 `2026.4.25` 的包，包括 `2026.4.25-beta.*`，可以使用兼容性路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可能指向 tarball 中省略的文件；
- 当包未暴露该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子案例；
- `update-channel-switch` 可以从 tarball 衍生的假 git fixture 中修剪缺失的 pnpm `patchedDependencies`，并可以记录缺失的持久化 `update.channel`；
- 插件冒烟测试可能会读取旧版安装记录位置或接受缺失的 marketplace 安装记录持久化；
- `plugin-update` 可能允许配置元数据迁移，同时仍要求安装记录和无重新安装行为保持不变。

已发布的 `2026.4.26` 包也可能会针对已发布的本地构建元数据标记文件发出警告。后续包必须满足现代合约；相同的情况将导致失败而不是警告或跳过。

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

调试失败的包验收运行时，请从 `resolve_package` 摘要开始，以确认包源、版本和 SHA-256。然后检查 `docker_acceptance`Docker 子运行及其 Docker 制品：`.artifacts/docker-tests/**/summary.json`、`failures.json`Docker、通道日志、阶段计时和重新运行命令。最好重新运行失败的包配置文件或精确的 Docker 通道，而不是重新运行完整的发布验证。

## 安装冒烟测试

单独的 `Install Smoke` 工作流通过其自己的 `preflight` 作业重用相同的作用域脚本。它将冒烟测试覆盖范围拆分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **快速路径** 针对涉及 Docker/package 表面、捆绑插件 package/manifest 更改，或 Docker 冒烟作业所演练的核心插件/渠道/gateway/Plugin SDK 表面的拉取请求运行。仅限源码的捆绑插件更改、仅限测试的编辑和仅限文档的编辑不会保留 Docker 工作线程。快速路径构建一次根 Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI 冒烟，运行容器 gateway-network e2e，验证捆绑扩展构建参数，并在 240 秒的聚合命令超时下运行有界的捆绑插件 Docker 配置文件（每个场景的 Docker 运行分别设置上限）。
- **完整路径** 为夜间计划运行、手动调度、工作流调用发布检查以及真正涉及 installer/package/Docker 表面的拉取请求保留 QR package install 和 installer Docker/update 覆盖范围。在完整模式下，install-smoke 准备或重用一个目标 SHA 的 GHCR 根 Dockerfile 冒烟镜像，然后作为单独的作业运行 QR package install、根 Dockerfile/gateway 冒烟、installer/update 冒烟以及快速捆绑插件 Docker E2E，以便安装程序工作不会在根镜像冒烟之后等待。

`main`Docker 推送（包括合并提交）不会强制执行完整路径；当更改范围逻辑在推送时请求完整覆盖时，工作流将保留快速的 Docker 冒烟测试，并将完整安装冒烟测试留给夜间或发布验证。

缓慢的 Bun 全局安装镜像提供商烟雾测试由 `run_bun_global_install_smoke` 单独控制。它按计划在 nightly 运行，并从发布检查工作流运行，手动 `Install Smoke` 调度可以选择加入，但拉取请求和 `main` 推送不会。QR 和安装程序 Docker 测试保留自己的以安装为中心的 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all` 预构建一个共享的实时测试镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个用于安装程序/更新/插件依赖通道的裸 Node/Git 运行器；
- 一个功能镜像，将相同的 tarball 安装到 `/app` 中，用于正常功能通道。

Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，而运行器仅执行所选计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。

### 可调参数

| 变量                                   | 默认值  | 用途                                                                       |
| -------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 正常通道的主池插槽数。                                                     |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 提供程序敏感的尾池插槽数。                                                 |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发实时通道上限，以免提供程序进行限流。                                   |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm 安装通道上限。                                                    |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务通道上限。                                                       |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 在通道开始之间错开以避免 Docker 守护进程创建风暴；设置 `0` 则不错开。      |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个通道的回退超时时间（120 分钟）；选定的实时/尾通道使用更严格的上限。    |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置  | `1` 打印调度器计划而不运行通道。                                           |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置  | 逗号分隔的确切通道列表；跳过清理冒烟测试，以便代理可以重现一个失败的通道。 |

一个超过其有效上限的通道仍然可以从空池启动，然后单独运行直到释放容量。本地聚合会预检 Docker，移除陈旧的 OpenClaw E2E 容器，发出活动通道状态，持久化通道计时以进行最长优先排序，并且在默认情况下，首次失败后停止调度新的池化通道。

### 可重用的实时/E2E 工作流

可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个包、镜像类型、live 镜像、通道以及凭证覆盖范围。`scripts/docker-e2e.mjs` 然后将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的包构件，要么从 `package_artifact_run_id` 下载包构件；验证 tarball 清单；当计划需要已安装包的通道时，通过 Blacksmith 的 Docker 层缓存构建并推送带有包摘要标签的裸机/功能 GHCR Docker E2E 镜像；并复用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像，而不是重新构建。Docker 镜像拉取会重试，每次尝试有 180 秒的边界超时，因此卡住的注册表/缓存流会快速重试，而不是消耗大部分 CI 关键路径。

### Release-path 分块

Release Docker 覆盖范围通过 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行较小的分块作业，因此每个块仅拉取其所需的镜像类型，并通过同一个加权调度器执行多个通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前的 release Docker 分块包括 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 和 `plugins-runtime-install-a`，直到 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合插件/运行时别名。`install-e2e` 通道别名仍然是提供商安装程序通道的聚合手动重新运行别名。

当完整发布路径覆盖请求时，OpenWebUI 会合并到 `plugins-runtime-services` 中，并且仅针对 OpenWebUI 专用调度保留一个独立的 `openwebui` 块。捆绑渠道更新路径会针对临时的 npm 网络故障重试一次。

每个块都会上传带有通道日志、计时、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢速通道表以及每个通道重试命令的 `.artifacts/docker-tests/`。工作流 `docker_lanes` 输入会根据准备好的镜像而不是块作业来运行选定的通道，这将失败通道的调试范围限制在一个定向的 Docker 作业中，并为该运行准备、下载或复用包产物；如果选定的通道是实时 Docker 通道，定向作业会在本地为该重试构建实时测试镜像。生成的每个通道 GitHub 重试命令包含 `package_artifact_run_id`、`package_artifact_name` 和准备好的镜像输入（当这些值存在时），以便失败的通道可以复用失败运行中的确切包和镜像。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

计划的实时/E2E 工作流每天运行完整的发布路径 Docker 套件。

## 插件预发布

`Plugin Prerelease` 是成本更高的产品/包覆盖范围，因此它是由 `Full Release Validation` 或显式操作员调度的独立工作流。普通的拉取请求、`main` 推送和独立的手动 CI 调度都会禁用该套件。它在八个扩展工作线程之间平衡捆绑插件测试；这些扩展分片作业一次运行最多两个插件配置组，每组一个 Vitest 工作线程，并使用更大的 Node 堆，以免导入量大的插件批次产生额外的 CI 作业。仅限发布的 Docker 预发布路径将定向的 Docker 通道分小批处理，以避免为一到三分钟的作业保留数十个运行程序。该工作流还会从 `@openclaw/plugin-inspector` 上传一个信息性的 `plugin-inspector-advisory` 产物；检查器发现结果是分诊输入，不会更改阻塞的插件预发布关卡。

## QA 实验室

QA Lab 在主智能限定工作流之外拥有专用的 CI 通道。Agentic parity 嵌套在广泛的 QA 和 release harnesses 下，而不是独立的 PR 工作流。当 parity 应随广泛验证运行时，请结合使用 `Full Release Validation` 和 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流每晚在 `main`MatrixTelegramDiscord 上运行，并支持手动调度；它会展开 mock parity 通道、live Matrix 通道以及 live Telegram 和 Discord 通道，作为并行作业。Live 作业使用 `qa-live-shared`TelegramDiscord 环境，而 Telegram/Discord 使用 Convex 租约。

Release checks 运行 Matrix 和 Telegram live 传输通道，并使用确定性 mock 提供商和 mock-qualified 模型（MatrixTelegram`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`Docker），从而将渠道契约与 live 模型延迟及正常的 提供商-plugin 启动隔离开来。Live 传输网关禁用内存搜索，因为 QA parity 单独覆盖内存行为；提供商 连接性由独立的 live 模型、native 提供商 和 Docker 提供商 套件覆盖。

Matrix 在计划发布和 release gates 中使用 Matrix`--profile fast`，仅当检出的 CLI 支持时才添加 `--fail-fast`CLICLI。CLI 默认值和手动工作流输入保持为 `all`；手动 `matrix_profile=all`Matrix 调度始终将完整的 Matrix 覆盖范围拆分为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。

`OpenClaw Release Checks` 还会在发布批准之前运行对发布至关重要的 QA Lab 通道；其 QA parity gate 将 candidate 和 baseline 包作为并行通道作业运行，然后将这两个构件下载到一个小型报告作业中进行最终的 parity 比较。

对于正常的 PR，请遵循范围限定的 CI/检查证据，而不要将同等性视为必需状态。

## CodeQL

`CodeQL` 工作流被有意设计为一个窄范围的初步安全扫描器，而非对整个仓库的全面扫描。每日运行、手动运行和非草稿拉取请求的守护运行会扫描 Actions 工作流代码以及最高风险的 JavaScript/TypeScript 表面，并使用经过筛选的高置信度安全查询来过滤出高严重性和严重 `security-severity`。

拉取请求守护保持轻量：它仅在 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的更改时启动，并且它运行与计划工作流相同的高置信度安全矩阵。Android 和 macOS 的 CodeQL 默认不包含在 PR 运行中。

### 安全类别

| 类别                                              | 表面                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基线                                  |
| `/codeql-security-high/channel-runtime-boundary`  | 核心渠道实现合约以及渠道插件运行时、gateway、Plugin SDK、secrets、审计接触点  |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络防护、web-fetch 以及插件 SDK SSRF 策略面              |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行助手、出站交付以及代理工具执行门控                        |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、清单、注册表、包管理器安装、源加载以及插件 SDK 包契约信任面 |

### 特定平台的安全分片

- `CodeQL Android Critical Security` — 计划的 Android 安全分片。在工作流合理性检查所接受的最小 Blacksmith Android 运行器上，为 CodeQL 手动构建 Linux 应用。上传到 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security` — 每周/手动 macOS 安全分片。在 Blacksmith macOS 上为 CodeQL 手动构建 macOS 应用，从上传的 SARIF 中过滤掉依赖项构建结果，并上传到 `/codeql-critical-security/macos`。排除在日常默认运行之外，因为即使在干净的情况下，macOS 构建也会占据大量运行时间。

### 关键质量类别

`CodeQL Critical Quality` 是匹配的非安全分片。它在较小的 Blacksmith Linux 运行器上，针对狭窄的高价值表面，仅运行错误严重性的非安全 JavaScript/TypeScript 质量查询。其拉取请求守护程序有意比计划概要文件更小：非草稿 PR 仅运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片，针对代理命令// 执行和回复分发代码、配置模式/迁移/IO 代码、身份验证/机密/沙箱/安全代码、核心渠道和捆绑渠道插件运行时、网关协议/服务器方法、内存运行时/SDK 粘合层、MCP/进程/出站交付、提供商运行时/ 目录、会话诊断/交付队列、插件加载器、Plugin SDK/包契约，或 Plugin SDK 回复运行时更改。CodeQL 配置和质量工作流更改会运行所有十二个 PR 质量分片。

手动分发接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狭窄配置文件是用于隔离运行单个质量分片的教学/迭代钩子。

| 类别                                                    | 表面                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 身份验证、机密、沙盒、cron 和 Gateway 安全边界代码                                                       |
| `/codeql-critical-quality/config-boundary`              | 配置架构、迁移、规范化和 IO 契约                                                                         |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Gateway 协议架构和服务器方法契约                                                                         |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心渠道和捆绑渠道插件实现契约                                                                           |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/提供商调度、自动回复调度和队列，以及 ACP 控制平面运行时契约                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接、进程监督辅助程序，以及出站交付契约                                                 |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory 主机 SDK、Memory 运行时外观、Memory 插件 SDK 别名、Memory 运行时激活粘合层以及 Memory 诊断命令    |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部结构、会话交付队列、出站会话绑定/交付辅助程序、诊断事件/日志包表面以及会话诊断 CLI 契约      |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | 插件 SDK 入站回复调度、回复负载/分块/运行时辅助程序、渠道回复选项、交付队列以及会话/线程绑定辅助程序     |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、提供商身份验证和发现、提供商运行时注册、提供商默认值/目录，以及 Web/搜索/获取/嵌入注册表 |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 引导、本地持久化、网关控制流以及任务控制平面运行时契约                                           |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 Web 获取/搜索、媒体 IO、媒体理解、图像生成以及媒体生成运行时契约                                    |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、注册表、公共表面以及插件 SDK 入口点契约                                                          |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布的包端插件 SDK 源代码和插件包契约辅助程序                                                          |

质量与安全保持分离，以便可以安排、衡量、禁用或扩展质量发现，而不会掩盖安全信号。Swift、Python 和捆绑插件 CodeQL 扩展应作为范围限定或分片的后续工作重新添加，仅限于在狭义配置文件具有稳定的运行时和信号之后。

## 维护工作流

### Docs Agent

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于确保现有文档与最近的更改保持一致。它没有纯粹的固定计划：`main` 上成功的非机器人推送 CI 运行可以触发它，并且可以通过手动调度直接运行它。当 `main` 已经更新，或者在过去一小时内创建了另一个未跳过的 Docs Agent 运行时，工作流运行调用将会跳过。当它运行时，它会审查从上一次未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次每小时运行可以覆盖自上次文档传递以来累积的所有主要更改。

### Test Performance Agent

`Test Performance Agent` 工作流是一个事件驱动的 Codex 维护通道，用于运行慢速测试。它没有纯粹的固定计划：`main` 上成功的非机器人推送 CI 运行可以触发它，但如果另一个工作流运行调用在该 UTC 日已经运行或正在运行，则会跳过。手动调度会绕过该每日活动门控。该通道构建全套分组的 Vitest 性能报告，允许 Codex 仅进行小幅保持覆盖率的测试性能修复，而不是广泛的重构，然后重新运行全套报告并拒绝减少通过基线测试计数的更改。如果基线有失败的测试，Codex 可能只修复明显的失败，并且在提交任何内容之前，代理后的全套报告必须通过。当 `main` 在机器人推送落地之前推进时，该通道会变基验证过的补丁，重新运行 `pnpm check:changed`，并重试推送；冲突的过时补丁将被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的 drop-sudo 安全姿态。

### Duplicate PRs After Merge

`Duplicate PRs After Merge` 工作流是一个手动维护者工作流，用于合并后的重复项清理。它默认为空运行，并且仅在 `apply=true` 时关闭明确列出的 PR。在修改 GitHub 之前，它会验证已落地的 PR 是否已合并，以及每个重复项是否具有共享的引用问题或重叠的更改块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Local check gates and changed routing

Local changed-lane logic lives in `scripts/changed-lanes.mjs` and is executed by `scripts/check-changed.mjs`. That local check gate is stricter about architecture boundaries than the broad CI platform scope:

- 核心生产变更会运行核心 prod（生产）和核心 test typecheck（类型检查）以及核心 lint/guards（代码检查/防护）；
- 核心仅测试变更仅运行核心 test typecheck（类型检查）以及核心 lint（代码检查）；
- 扩展生产变更会运行扩展 prod（生产）和扩展 test typecheck（类型检查）以及扩展 lint（代码检查）；
- 扩展仅测试变更运行扩展 test typecheck（类型检查）以及扩展 lint（代码检查）；
- 公共 Plugin SDK 或 plugin-contract（插件合约）变更会扩展至扩展 typecheck（类型检查），因为扩展依赖于这些核心合约（Vitest 扩展扫描保持为显式测试工作）；
- 仅发布元数据的版本升级会运行针对性的 version/config/root-dependency（版本/配置/根依赖）检查；
- 未知的 root/config（根/配置）变更会自动失效保护至所有检查通道。

Local changed-test routing lives in `scripts/test-projects.test-support.mjs` and is intentionally cheaper than `check:changed`: direct test edits run themselves, source edits prefer explicit mappings, then sibling tests and import-graph dependents. Shared group-room delivery config is one of the explicit mappings: changes to the group visible-reply config, source reply delivery mode, or the message-工具 system prompt route through the core reply tests plus Discord and Slack delivery regressions so a shared default change fails before the first PR push. Use `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` only when the change is harness-wide enough that the cheap mapped set is not a trustworthy proxy.

## Testbox 验证

Crabbox is the repo-owned remote-box wrapper for maintainer Linux proof. Use it
from the repo root when a check is too broad for a local edit loop, when CI
parity matters, or when the proof needs secrets, Docker, package lanes,
reusable boxes, or remote logs. The normal OpenClaw backend is
`blacksmith-testbox`; owned AWS/Hetzner capacity is a fallback for Blacksmith
outages, quota issues, or explicit owned-capacity testing.

Crabbox-backed Blacksmith runs warm, claim, sync, run, report, and clean up
one-shot Testboxes. The built-in sync sanity check fails fast when required
root files such as `pnpm-lock.yaml` disappear or when `git status --short`
shows at least 200 tracked deletions. For intentional large-deletion PRs, set
`OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` for the remote command.

Crabbox also terminates a local Blacksmith CLI invocation that stays in the
sync phase for more than five minutes without post-sync output. Set
`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` to disable that guard, or use a larger
millisecond value for unusually large local diffs.

Before a first run, check the wrapper from the repo root:

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库包装器会拒绝未声明 `blacksmith-testbox` 的过时 Crabbox 二进制文件。即使 `.crabbox.yaml` 具有自有云默认设置，也请显式传递提供商。

变更门控：

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

聚焦测试重跑：

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

全量套件：

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

阅读最终的 JSON 摘要。有用的字段包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性由 Blacksmith 支持的 Crabbox 运行应自动停止 Testbox；如果运行被中断或不清楚清理情况，请检查实时测试框并仅停止您创建的测试框：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

仅当您有意在同一已水合的测试框上执行多个命令时才使用重用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障层但 Blacksmith 本身正常工作，请仅将直接 Blacksmith 用于 `list`、`status` 和清理等诊断。在将直接 Blacksmith 运行视为维护者证明之前，请先修复 Crabbox 路径。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 正常工作，但新的预热在几分钟后仍 `queued` 且没有 IP 或 Actions 运行 URL，请将其视为 Blacksmith 提供商、队列、计费或组织限制压力。停止您创建的排队 ID，避免启动更多 Testbox，并在有人检查 Blacksmith 仪表板、计费和组织限制时，将证明转移到下面的自有 Crabbox 容量路径。

仅当 Blacksmith 停机、配额受限、缺少所需环境或明确以自有容量为目标时，才升级到自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 压力下，除非任务确实需要 48xlarge 级别的 CPU，否则避免使用 `class=beast`。一个 `beast` 请求始于 192 个 vCPU，这是触发区域 EC2 Spot 或按需标准配额的最简单方式。仓库拥有的 `.crabbox.yaml` 默认为 `standard`、多容量区域和 `capacity.hints: true`，因此经中介的 AWS 租赁会打印所选区域/市场、配额压力、Spot 回退以及高压类别警告。请将 `fast` 用于较重的广泛检查，仅在标准/快速检查不够时使用 `large`，并仅针对异常的 CPU 密集型通道（如全套件或所有插件 Docker 矩阵、显式发布/阻断验证或多核性能分析）使用 `beast`。不要将 `beast` 用于 `pnpm check:changed`、聚焦测试、仅文档工作、常规 lint/typecheck、小型 E2E 复现或 Blacksmith 中断分类。请使用 `--market on-demand` 进行容量诊断，以免 Spot 市场波动混入信号中。

`.crabbox.yaml` 拥有自有云通道的提供商、同步和 GitHub Actions 水合默认值。它排除了本地 `.git`，因此水合后的 Actions 检出会保留其自己的远程 Git 元数据，而不是同步维护者本地的远程和对象存储；它还排除了永远不应传输的本地运行时/构建产物。`.github/workflows/crabbox-hydrate.yml` 拥有检出、Node/pnpm 设置、`origin/main` 获取以及自有云 `crabbox run --id <cbx_id>` 命令的非机密环境交接。

## 相关

- [安装概述](/zh/install)
- [开发渠道](/zh/install/development-channels)
