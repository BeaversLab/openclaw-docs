---
summary: "CI 作业图、范围门控、发布伞以及本地命令等效项"
title: "CI 流水线"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 OpenClaw`main` 和每个拉取请求时运行。`preflight` 作业会对差异进行分类，并在仅更改了不相关区域时关闭昂贵的通道。手动 `workflow_dispatch`Android 运行会故意绕过智能范围界定，并为发布候选版本和广泛验证展开完整图谱。Android 通道通过 `include_android` 保持选择性加入。仅限发布的插件覆盖范围位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且仅从 [`Full Release Validation`](#full-release-validation) 或显式手动分派运行。

## 流水线概述

| 作业                             | 目的                                                                         | 运行时机                     |
| -------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                      | 检测仅文档更改、更改的范围、更改的扩展，并构建 CI 清单                       | 在非草稿推送和 PR 上始终运行 |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                       | 在非草稿推送和 PR 上始终运行 |
| `security-dependency-audit`      | 针对 npm 建议的无依赖生产 lockfile 审计                                      | 在非草稿推送和 PR 上始终运行 |
| `security-fast`                  | 快速安全作业所需的聚合                                                       | 在非草稿推送和 PR 上始终运行 |
| `check-dependencies`             | 生产 Knip 仅依赖传递以及未使用文件允许列表守卫                               | Node 相关更改                |
| `build-artifacts`                | 构建 `dist/`、Control UI、构建产物检查以及可重用的下游产物                   | Node 相关更改                |
| `checks-fast-core`               | 快速 Linux 正确性通道，例如捆绑/插件合同/协议检查                            | Node 相关更改                |
| `checks-fast-contracts-channels` | 具有稳定聚合检查结果的分片渠道合同检查                                       | Node 相关更改                |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括渠道、捆绑、合约和扩展流水线                       | Node 相关更改                |
| `check`                          | 分片式主本地网关等效项：prod 类型、lint、guards、test 类型和严格的冒烟测试   | Node 相关更改                |
| `check-additional`               | 架构、分片边界/提示漂移、扩展 guards、包边界和网关监视                       | Node 相关更改                |
| `build-smoke`                    | 构建 CLI 冒烟测试和启动内存冒烟测试                                          | Node 相关更改                |
| `checks`                         | 构建产物渠道测试的验证程序                                                   | Node 相关更改                |
| `checks-node-compat-node22`      | Node 22 兼容性构建和冒烟流水线                                               | 发布的手动 CI 调度           |
| `check-docs`                     | 文档格式化、lint 和失效链接检查                                              | 文档已更改                   |
| `skills-python`                  | 用于 Python 支持的技能的 Ruff + pytest                                       | Python 技能相关更改          |
| `checks-windows`                 | Windows 特定的进程/路径测试以及共享运行时导入说明符回归                      | Windows 相关更改             |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试流水线                               | macOS 相关更改               |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                          | macOS 相关更改               |
| `android`                        | 两种配置的 Android 单元测试以及一次调试 APK 构建                             | Android 相关更改             |
| `test-performance-agent`         | 受信任活动后的每日 Codex 慢速测试优化                                        | 主 CI 成功或手动调度         |
| `openclaw-performance`           | 每日/按需 Kova 运行时性能报告，包含模拟提供商、深度分析和 GPT 5.4 实时流水线 | 计划和手动调度               |

## 快速失败顺序

1. `preflight` 决定存在哪些流水线。`docs-scope` 和 `changed-scope` 逻辑是该作业内部的步骤，而不是独立作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，无需等待较重的构建产物和平台矩阵作业。
3. `build-artifacts` 与快速的 Linux 通道重叠，以便下游使用者在共享构建准备好后能立即开始。
4. 在那之后，更重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当有新的推送到同一 PR 或 `main` 引用时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非该引用的最新运行也失败了，否则请将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍会报告正常的分片失败，但在整个工作流已被取代后不会排队。自动 CI 并发键是版本化的（`CI-v7-*`），因此旧队列组中的 GitHub 端僵尸作业无法无限期阻塞较新的主分支运行。手动全套运行使用 `CI-manual-v1-*`，且不会取消正在进行的运行。

`ci-timings-summary` 作业会为每次非草稿 CI 运行上传一个紧凑的 `ci-timings-summary` 构建产物。它记录了当前运行的运行时间、排队时间、最慢作业和失败作业，因此 CI 健康检查无需重复抓取完整的 Actions 负载。

## 范围和路由

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动调度会跳过变更范围检测，并使飞行前清单（preflight manifest）表现得像所有范围区域都发生了变更一样。

- **CI workflow edits** 验证 Node CI 图和工作流 linting，但不会自行强制 Windows、Android 或 macOS 原生构建；这些平台通道范围仍限于平台源代码更改。
- **CI routing-only edits, selected cheap core-test fixture edits, and narrow plugin contract helper/test-routing edits** 使用仅限 Node 的快速清单路径：`preflight`、安全性和单个 `checks-fast-core` 任务。当更改仅限于快速任务直接练习的路由或辅助界面时，该路径会跳过构建产物、Node 22 兼容性、渠道 contracts、完整核心分片、捆绑插件分片和其他防护矩阵。
- **Windows Node checks** 范围限于 Windows 特定的进程/路径包装器、npm/pnpm/UI 运行器辅助工具、包管理器配置以及执行该通道的 CI 工作流界面；不相关的源代码、插件、install-smoke 和仅测试更改仍保留在 Linux Node 通道上。

最慢的 Node 测试系列被拆分或平衡，以便每个作业保持较小而不会过度预留运行器：渠道合约作为三个加权的 Blacksmith 支持的分片运行，并带有标准的 GitHub 运行器后备方案，核心单元快速/支持通道单独运行，核心运行时基础设施在状态、进程/配置、定时任务和共享分片之间拆分，自动回复作为平衡的工作程序运行（并将回复子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片），而 agent gateway/server 配置在 chat/auth/模型/http-plugin/runtime/startup 通道之间拆分，而不是等待构建的产物。广泛的浏览器、QA、媒体和杂项插件测试使用其专用的 Vitest 配置，而不是共享的插件通用配置。Include-pattern 分片使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置和过滤后的分片。`check-additional` 将包边界 compile/canary 工作保持在一起，并将运行时拓扑架构与 Gateway(网关) watch 覆盖范围分开；边界守护列表分布在四个矩阵分片上，每个分片并发运行选定的独立守护并打印每次检查的计时。昂贵的 Codex happy-path 提示快照漂移检查作为其自己的额外作业运行，仅用于手动 CI 和提示影响更改，因此正常的不相关 Node 更改不会在冷提示快照生成后等待，并且当提示漂移仍固定在导致它的 PR 时，边界分片保持平衡；同一标志跳过构建产物核心支持边界分片内部的提示快照 Vitest 生成。Gateway(网关) watch、渠道测试和核心支持边界分片在 `dist/` 和 `dist-runtime/` 已构建之后，在 `build-artifacts` 内部并发运行。

Android CI 同时运行 Android`testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`Android，然后构建 Play 调试 APK。第三方 flavor 没有单独的源集或清单；其单元测试通道仍然使用 SMS/通话记录 BuildConfig 标志编译该 flavor，同时在每次与 Android 相关的推送中避免重复的调试 APK 打包任务。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（一个固定到最新 Knip 版本的生产环境 Knip 仅依赖检查，并在 `dlx` 安装时禁用了 pnpm 的最低发布年龄限制）和 `pnpm deadcode:unused-files`，后者将 Knip 的生产环境未使用文件发现与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。当 PR 添加了新的未经审查的未使用文件或保留了过时的允许列表条目时，未使用文件保护将失败，同时保留 Knip 无法静态解析的有意的动态插件、生成、构建、实时测试和包桥接表面。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub 是从 OpenClaw 存储库活动到 ClawSweeper 的目标端桥接。它不会检出或执行不受信任的拉取请求代码。该工作流从 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建 GitHub App 令牌，然后将紧凑的 `repository_dispatch` 负载分发给 `openclaw/clawsweeper`。

该工作流有四个通道：

- `clawsweeper_item` 用于精确的问题和拉取请求审查请求；
- `clawsweeper_comment` 用于问题评论中的明确 ClawSweeper 命令；
- `clawsweeper_commit_review` 用于 `main` 推送上的提交级审查请求；
- `github_activity`GitHub 用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 流道仅转发标准化元数据：事件类型、操作、参与者、仓库、项目编号、URL、标题、状态，以及评论或审查的简短摘录（如果存在）。它有意避免转发完整的 webhook 正文。`openclaw/clawsweeper` 中的接收工作流是 `.github/workflows/github-activity.yml`OpenClawGateway(网关)，它将标准化事件发布到 ClawSweeper 代理的 OpenClaw Gateway(网关) hook。

一般活动属于观察性质，而非默认投递。ClawSweeper 代理在其提示词中接收 Discord 目标，并且仅当事件令人惊讶、可执行、具有风险或具有运营效用时，才应发布到 Discord`#clawsweeper`。常规的开启、编辑、机器人搅动、重复 webhook 噪音和正常的审查流量应导致 `NO_REPLY`。

在此路径中，应将 GitHub 标题、评论、正文、审查文本、分支名称和提交消息视为不受信任的数据。它们是用于汇总和分类的输入，而不是工作流或代理运行时的指令。

## 手动调度

手动 CI 调度运行与正常 CI 相同的作业图，但强制开启所有非 Android 范围的流道：Linux Node 分片、捆绑插件分片、渠道合约、Node 22 兼容性、AndroidLinux`check`、`check-additional`WindowsmacOSAndroid、构建冒烟测试、文档检查、Python 技能、Windows、macOS 和 Control UI i18n。独立的手动 CI 调度仅使用 `include_android=true`Android 运行 Android；完整的发布保护伞通过传递 `include_android=true` 来启用 Android。插件预发布静态检查、仅限发布的 `agentic-plugins`DockerDocker 分片、完整扩展批次扫描和插件预发布 Docker 流道从 CI 中排除。Docker 预发布套件仅当 `Full Release Validation` 调度单独的 `Plugin Prerelease` 工作流并启用 release-validation 门限时运行。

手动运行使用唯一的并发组，以便同一引用上的其他推送或 PR 运行不会取消发布候选版本的完整套件。可选的 `target_ref` 输入允许受信任的调用者针对分支、标签或完整提交 SHA 运行该图，同时使用所选调度引用中的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| 运行器                           | 任务                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`，快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`），快速协议/合约/捆绑检查，分片渠道合约检查，除 lint 外的 `check` 分片，`check-additional` 聚合，Node 测试聚合验证器，文档检查，Python 技能，工作流健全性，标记器，自动响应；install-smoke 预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`，权重较低的扩展分片，`checks-fast-core`，`checks-node-compat-node22`，`check-prod-types` 和 `check-test-types`                                                                                                                                                                                                                        |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke，Linux Node 测试分片，捆绑插件测试分片，`check-additional` 分片，`android`                                                                                                                                                                                                                                                                          |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`，`check-lint`（对 CPU 足够敏感，以至于 8 vCPU 的成本超过了它们节省的成本）；install-smoke Docker 构建（32-vCPU 队列时间成本超过了它节省的成本）                                                                                                                                                                                               |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 在 `openclaw/openclaw` 上；分叉回退到 `macos-latest`                                                                                                                                                                                                                                                                                               |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 在 `openclaw/openclaw` 上；分叉回退到 `macos-latest`                                                                                                                                                                                                                                                                                              |

Canonical-repo CI 保持 Blacksmith 为默认运行器路径。在 `preflight` 期间，`scripts/ci-runner-labels.mjs`GitHub 会检查最近排队和正在进行的 Actions 运行中是否有排队的 Blacksmith 作业。如果特定的 Blacksmith 标签已有排队的作业，将使用该确切标签的下游作业将仅针对该运行回退到匹配的 GitHub 托管运行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`API）。同一操作系统系列中的其他 Blacksmith 规格仍保留在其主要标签上。如果 API 探测失败，则不应用回退。

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

手动触发通常会对工作流引用进行基准测试。设置 `target_ref` 可以使用当前工作流实现对发布标签或其他分支进行基准测试。发布的报告路径和最新指针以被测试的引用为键，每个 `index.md` 都会记录被测试的引用/SHA、工作流引用/SHA、Kova 引用、配置文件、通道授权模式、模型、重复计数和场景过滤器。

该工作流从固定的发布版本安装 OCM，并从 `openclaw/Kova` 在固定的 `kova_ref` 输入处安装 Kova，然后运行三个通道：

- `mock-provider`OpenAI：针对本地构建运行时的 Kova 诊断场景，具有确定性的假 OpenAI 兼容身份验证。
- `mock-deep-profile`：针对启动、网关和代理轮热点的 CPU/堆/跟踪分析。
- `live-gpt54`OpenAI：真实的 OpenAI `openai/gpt-5.4` 代理轮，当 `OPENAI_API_KEY` 不可用时跳过。

模拟提供商通道还在 Kova 通过后运行 OpenClaw 原生源探针：默认、hook 和 50 插件启动情况下的网关启动时间和内存；针对已启动网关的重复模拟 OpenAI OpenClawOpenAI`channel-chat-baseline`CLI hello 循环；以及 CLI 启动命令。源探针 Markdown 摘要位于报告包中的 `source/index.md`，旁边是原始 JSON。

每个通道都会上传 GitHub 构件。当配置了 GitHub`CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、包、`index.md` 和源探针构件提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。当前测试引用指针被写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是“发布前运行所有内容”的手动总括工作流。它接受分支、标签或完整的提交 SHA，使用该目标调度手动 `CI` 工作流，调度 `Plugin Prerelease` 以进行仅限发布的插件/包/静态/Docker 验证，并调度 `OpenClaw Release Checks` 以进行安装冒烟测试、包验收、跨操作系统包检查、QA 实验室对等性、Matrix 和 Telegram 通道。稳定/默认运行会将详尽的实时/E2E 和 Docker 发布路径覆盖范围保留在 `run_release_soak=true` 之后；`release_profile=full` 强制开启该 soak 覆盖范围，以确保广泛的咨询性验证保持广泛。结合 `rerun_group=all` 和 `release_profile=full`，它还会针对发布检查中的 `release-package-under-test` 构件运行 `NPM Telegram Beta E2E`。发布后，传递 `release_package_spec` 以在发布检查、包验收、npm、跨操作系统和 Docker 中重复使用已发布的 Telegram 包，而无需重新构建。仅当 Telegram 必须验证不同的包时，才使用 `npm_telegram_package_spec`。

有关阶段矩阵、确切的工作流作业名称、配置文件差异、构件和专注的重新运行句柄，请参阅[完整发布验证](/zh/reference/full-release-validation)。

`OpenClaw Release Publish` 是手动变更发布工作流。在发布标签存在且 OpenClaw npm 预检成功后，从 `release/YYYY.M.D` 或 `main` 调度它。它验证 `pnpm plugins:sync:check`，为所有可发布的插件包调度 `Plugin NPM Release`，为相同的发布 SHA 调度 `Plugin ClawHub Release`，然后才使用保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

要在快速移动的分支上进行固定提交验证，请使用辅助工具，而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch 引用必须是分支或标签，而不是原始提交 SHA。辅助工具在目标 SHA 处推送一个临时的 GitHub`release-ci/<sha>-...` 分支，从该固定引用调度 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，并在运行完成后删除临时分支。如果任何子工作流在不同的 SHA 上运行，umbrella 验证器也会失败。

`release_profile` 控制传递给发布检查的 live/提供商 范围。手动发布工作流默认为 `stable`；仅当您有意需要广泛的 advisory 提供商/media 矩阵时才使用 `full`。`run_release_soak`Docker 控制稳定/默认发布检查是否运行详尽的 live/E2E 和 Docker 发布路径 soak；`full` 强制开启 soak。

- `minimum`OpenAI 保留最快的 OpenAI/core 发布关键通道。
- `stable` 添加稳定的提供商/backend 集合。
- `full` 运行广泛的 advisory 提供商/media 矩阵。

umbrella 会记录已调度的子运行 ID，最后的 `Verify full validation` 作业会重新检查当前子运行的结论，并为每个子运行附加最慢作业表。如果子工作流被重新运行并通过（变绿），则仅重新运行父验证器作业以刷新 umbrella 结果和计时摘要。

为了进行恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对发布候选版本使用 `all`，对仅常规完整 CI 子任务使用 `ci`，对仅插件预发布子任务使用 `plugin-prerelease`，对每个发布子任务使用 `release-checks`，或者在总括任务上使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这在针对性修复后，使失败的发布框重新运行保持在范围内。对于一个失败的跨 OS 通道，将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合，例如 `windows/packaged-upgrade`；长跨 OS 命令会发出心跳行，并且打包升级摘要包含各阶段的时间。QA 发布检查通道是建议性的，因此仅 QA 的失败会发出警告，但不会阻止发布检查验证器。

`OpenClaw Release Checks` 使用受信任的工作流引用将选定的引用一次性解析为 `release-package-under-test`Docker tarball，然后将该构件传递给跨 OS 检查和包验收，以及在运行 soak 覆盖时的 live/E2E 发布路径 Docker 工作流。这使包字节在发布框之间保持一致，并避免在多个子作业中重新打包相同的候选版本。

针对 `ref=main` 和 `rerun_group=all` 的重复 `Full Release Validation` 运行将取代较旧的总括任务。当父任务被取消时，父监视器会取消它已调度的任何子工作流，因此较新的 main 验证不会被陈旧的两小时发布检查运行所阻塞。发布分支/标记验证和针对性的重新运行组保持 `cancel-in-progress: false`。

## Live 和 E2E 分片

发布 live/E2E 子任务保持广泛的原生 `pnpm test:live` 覆盖，但它通过 `scripts/test-live-shard.mjs` 作为命名分片运行，而不是作为一个串行作业：

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

这样做在保持相同文件覆盖范围的同时，使缓慢的实时提供商故障更易于重新运行和诊断。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称对于手动一次性重新运行仍然有效。

原生实时媒体分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，该镜像由 `Live Media Runner Image` 工作流构建。该镜像预安装了 `ffmpeg` 和 `ffprobe`；媒体任务在设置之前只需验证二进制文件。请将 Docker 支持的实时套件保留在普通的 Blacksmith 运行器上 —— 容器任务不是启动嵌套 Docker 测试的正确场所。

Docker 支持的实时模型/后端分片对每个选定的提交使用单独的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 镜像。实时发布工作流构建并推送该镜像一次，然后 Docker 实时模型、提供商分片的 Gateway、CLI 后端、ACP 绑定和 Codess hardness 分片使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行。Gateway(网关) Docker 分片在工作流作业超时之下携带显式的脚本级 `timeout` 上限，以便卡住的容器或清理路径快速失败，而不是消耗整个发布检查预算。如果这些分片独立地重建完整的源 Docker 目标，则发布运行配置错误，并将在重复的镜像构建上浪费时钟时间。

## 软件包验收

当问题是“这个可安装的 OpenClaw 包是否作为产品正常工作？”时，请使用 `Package Acceptance`OpenClawDocker。这与常规 CI 不同：常规 CI 验证源码树，而包验收则通过用户在安装或更新后使用的同一 Docker E2E 框架来验证单个 tarball。

### 作业

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选版本，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test`GitHub 构建产物上传，并在 GitHub 步骤摘要中打印源码、workflow 引用、包引用、版本、SHA-256 和配置文件。
2. `docker_acceptance` 调用 `openclaw-live-and-e2e-checks-reusable.yml` 时使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`DockerDocker。该可重用工作流下载该构建产物，验证 tarball 清单，在需要时准备 package-digest Docker 镜像，并针对该包运行选定的 Docker 通道，而不是打包工作流检出内容。当配置文件选择了多个特定的 `docker_lanes`Docker 时，可重用工作流会准备一次包和共享镜像，然后将这些通道作为具有唯一构建产物的并行特定 Docker 作业分发出去。
3. `package_telegram` 可选地调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不为 `none` 且包验收解析了一个候选版本时，它会安装相同的 `package-under-test`Telegramnpm 构建产物；独立的 Telegram 调度仍然可以安装已发布的 npm 规范。
4. 如果包解析、Docker 验收或可选 Telegram 通道失败，`summary`DockerTelegram 将使工作流失败。

### 候选来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest`OpenClaw 或确切的 OpenClaw 发布版本（例如 `openclaw@2026.4.27-beta.2`）。将其用于已发布的预发布版/稳定版的验收。
- `source=ref` 打包受信任的 `package_ref`OpenClaw 分支、标签或完整提交 SHA。解析器获取 OpenClaw 分支/标签，验证所选提交可从仓库分支历史或发布标签访问，在独立工作树中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url` 下载 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享的产物应提供。

保持 `workflow_ref` 和 `package_ref` 分离。`workflow_ref` 是运行测试的受信任工作流/测试框架代码。`package_ref` 是执行 `source=ref` 时被打包的源提交。这允许当前测试框架验证较旧的受信任源提交，而无需运行旧的工作流逻辑。

### 套件配置文件

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 发布路径分块
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时必需

`package` 配置文件使用离线插件覆盖，因此已发布包的验证不受实时 ClawHub 可用性限制。可选的 Telegram 通道在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 构建产物，并保留已发布的 npm 规范路径用于独立调度。

有关专门的更新和插件测试策略，包括本地命令、
Docker 通道、包验收输入、发布默认值和故障分类，
请参阅 [Testing updates and plugins](/zh/help/testing-updates-plugins)。

发布检查使用 `source=artifact`、准备好的发布包工件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai`ClawHubTelegram 调用 Package Acceptance。这将包迁移、更新、实时 ClawHub 技能安装、过时插件依赖清理、已配置插件安装修复、离线插件、插件更新和 Telegram 验证保持在同一个已解析的包 tarball 上。在发布 beta 版本后，在 Full Release Validation 或 OpenClaw Release Checks 上设置 `release_package_spec`OpenClawnpm，以便在不重新构建的情况下针对已发布的 npm 包运行相同的矩阵；仅当 Package Acceptance 需要与发布验证的其余部分不同的包时，才设置 `package_acceptance_package_spec`。跨操作系统发布检查仍涵盖特定于操作系统的 新手引导、安装程序和平台行为；包/更新产品验证应从 Package Acceptance 开始。`published-upgrade-survivor`Docker Docker 通道在阻塞发布路径中每次运行验证一个已发布的包基线。在 Package Acceptance 中，已解析的 `package-under-test` tarball 始终是候选者，而 `published_upgrade_survivor_baseline` 选择回退已发布的基线，默认为 `openclaw@latest`；失败通道重新运行命令会保留该基线。带有 `run_release_soak=true` 或 `release_profile=full` 的完整发布验证会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`npmOpenClawDocker，以扩展到最新的四个稳定 npm 版本以及固定的插件兼容性边界版本，以及针对飞书配置、保留的 bootstrap/persona 文件、已配置的 OpenClaw 插件安装、波浪号日志路径和过时的旧插件依赖根目录的特定问题装置。多基线已发布升级幸存者选择按基线分片到单独的定向 Docker 运行器作业。当问题是详尽的已发布更新清理，而不是正常的完整发布 CI 范围时，单独的 `Update Migration` 工作流使用带有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration`Docker Docker 通道。本地聚合运行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递确切的包规范，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保留单个通道（例如 `openclaw@2026.4.15`），或者为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已发布通道使用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 Gateway 启动后探测 `/healthz`、`/readyz`RPCGateway(网关)WindowsWindowsOpenAI 以及 RPC 状态。Windows 打包和安装程序全新通道还验证已安装的包是否可以从原始绝对 Windows 路径导入浏览器控制覆盖。OpenAI 跨操作系统代理轮次冒烟测试在设置时默认为 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则为 `openai/gpt-5.4`，因此安装和网关验证保持在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容性窗口

包验收 对已发布的包有有限的旧版兼容性窗口。通过 `2026.4.25` 的包，包括 `2026.4.25-beta.*`，可以使用兼容性路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可能指向压缩包中省略的文件；
- 当包未公开该标志时，`doctor-switch` 可以跳过 `gateway install --wrapper` 持久化子案例；
- `update-channel-switch` 可以从压缩包衍生的假 git fixture 中修剪缺失的 pnpm `patchedDependencies`，并可以记录缺失的持久化 `update.channel`；
- 插件冒烟测试可能会读取旧版安装记录位置，或接受缺失的 marketplace 安装记录持久化；
- `plugin-update` 可能允许配置元数据迁移，同时仍然要求安装记录和无重装行为保持不变。

已发布的 `2026.4.26` 包也可能对已发布的本地构建元数据标记文件发出警告。后续包必须满足现代契约；相同的情况将失败而不是警告或跳过。

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

调试失败的包验收运行时，请从 `resolve_package` 摘要开始，以确认包源、版本和 SHA-256。然后检查 `docker_acceptance`Docker 子运行及其 Docker 制品：`.artifacts/docker-tests/**/summary.json`、`failures.json`Docker、通道日志、阶段计时和重运行命令。最好重新运行失败的包配置文件或精确的 Docker 通道，而不是重新运行完整的发布验证。

## 安装冒烟测试

单独的 `Install Smoke` 工作流通过其自己的 `preflight` 作业重用相同的作用域脚本。它将冒烟测试覆盖范围分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **快速通道** 针对涉及 Docker/包表面、捆绑插件包/清单更改，或 Docker 冒烟测试所演练的核心插件/渠道/网关/Plugin SDK 表面的拉取请求运行。仅源代码的捆绑插件更改、仅测试的编辑和仅文档的编辑不预留 Docker 工作器。快速通道会构建一次根 Dockerfile 镜像，检查 CLI，运行代理删除共享工作区 CLI 冒烟测试，运行容器网关网络端到端测试，验证捆绑扩展构建参数，并在 240 秒的聚合命令超时下运行有界的捆绑插件 Docker 配置文件（每个场景的 Docker 运行分别设限）。
- **完整路径** 保留 QR 包安装和安装程序 Docker/更新覆盖范围，适用于夜间计划运行、手动分发、工作流调用发布检查，以及真正触及安装程序/包/Docker 表面的拉取请求。在完整模式下，安装冒烟测试会准备或复用一个目标 SHA 的 GHCR 根 Dockerfile 冒烟测试镜像，然后作为独立作业运行 QR 包安装、根 Dockerfile/网关冒烟测试、安装程序/更新冒烟测试以及快速捆绑插件 Docker E2E，以便安装程序工作无需等待根镜像冒烟测试。

`main`Docker 推送（包括合并提交）不会强制执行完整路径；当更改范围逻辑在推送时请求完整覆盖时，工作流会保留快速 Docker 冒烟测试，并将完整安装冒烟测试留给夜间或发布验证。

缓慢的 Bun 全局安装镜像提供商冒烟测试由 Bun`run_bun_global_install_smoke` 单独控制。它按夜间计划运行，并来自发布检查工作流，手动 `Install Smoke` 分发可以选择加入，但拉取请求和 `main`Docker 推送则不行。QR 和安装程序 Docker 测试保留其各自专注于安装的 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all` 预构建一个共享的实时测试镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个用于安装程序/更新/插件依赖通道的 bare Node/Git 运行器；
- 一个功能镜像，将相同的 tarball 安装到 `/app` 中，用于常规功能通道。

Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，运行器仅执行所选计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。

### 可调参数

| 变量                                   | 默认值  | 用途                                                                            |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 常规通道的主池槽数量。                                                          |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 提供商敏感的尾池槽数量。                                                        |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发实时通道上限，以防止提供商进行限流。                                        |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm install 通道上限。                                                     |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务通道上限。                                                            |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道启动之间的交错时间，以避免 Docker 守护进程创建风暴；设置为 `0` 表示无交错。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每通道回退超时时间（120 分钟）；选定的实时/尾通道使用更严格的限制。             |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置  | `1` 打印调度器计划而不运行通道。                                                |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置  | 逗号分隔的确切通道列表；跳过清理冒烟测试，以便代理可以重现一个失败的通道。      |

一个重于其有效上限的通道仍可以从空池启动，然后单独运行直到释放容量。本地聚合预检查 Docker，移除过时的 OpenClaw E2E 容器，发出活动通道状态，持久化通道计时以用于最长优先排序，并且在默认情况下，在第一次失败后停止调度新的池化通道。

### 可重用的实时/E2E 工作流

可重用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪个包、镜像类型、实时镜像、通道以及凭证覆盖范围。`scripts/docker-e2e.mjs` 随后将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的包构件，要么从 `package_artifact_run_id` 下载包构件；验证 tarball 清单；当计划需要已安装包的通道时，通过 Blacksmith 的 Docker 层缓存构建并推送带有包摘要标签的 bare/functional GHCR Docker E2E 镜像；并重用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像，而不是重新构建。Docker 镜像拉取会重试，每次尝试有 180 秒的有界超时，以便卡住的注册表/缓存流快速重试，而不是消耗大部分 CI 关键路径。

### Release-path chunks

Release Docker 覆盖范围使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行较小的分块作业，因此每个块仅拉取其所需的镜像类型，并通过同一个加权调度器执行多个通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前 release Docker 块为 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 和 `plugins-runtime-install-a`，通过 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合的插件/运行时别名。`install-e2e` 通道别名仍然是两个提供商安装程序通道的聚合手动重新运行别名。

当完整的发布路径覆盖请求时，OpenWebUI 会被合并到 `plugins-runtime-services` 中，并且仅在 OpenWebUI 专属的分发时保留独立的 `openwebui`npm 块。捆绑渠道更新通道针对临时的 npm 网络故障会重试一次。

每个块都会上传包含通道日志、计时、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢速通道表以及每个通道重试命令的 `.artifacts/docker-tests/`。工作流 `docker_lanes`DockerDockerGitHub 输入会针对准备好的镜像而不是块作业来运行选定的通道，这将失败通道的调试限制在一个有针对性的 Docker 作业内，并为该运行准备、下载或复用包构件；如果选定的通道是实时 Docker 通道，目标作业会在本地为该重试构建实时测试镜像。生成的每个通道的 GitHub 重试命令包括 `package_artifact_run_id`、`package_artifact_name` 以及准备好的镜像输入（当这些值存在时），以便失败的通道可以复用失败运行中的确切包和镜像。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

定时的实时/E2E 工作流每天运行完整的发布路径 Docker 套件。

## 插件预发布

`Plugin Prerelease` 是开销更大的产品/包覆盖范围，因此它是一个由 `Full Release Validation` 或显式操作员调度的独立工作流。普通的拉取请求、`main`DockerDocker 推送和独立的手动 CI 调度都会关闭该套件。它在八个扩展工作器之间平衡捆绑插件测试；那些扩展分片作业一次运行最多两个插件配置组，每组一个 Vitest 工作器，并使用更大的 Node 堆，这样导入繁重的插件批处理就不会产生额外的 CI 作业。仅限发布的 Docker 预发布路径将目标 Docker 通道分批处理为小组，以避免为一到三分钟的作业保留数十个运行器。该工作流还会从 `@openclaw/plugin-inspector` 上传信息性的 `plugin-inspector-advisory` 构件；检查器的发现是分类输入，不会更改阻止性的插件预发布关卡。

## QA Lab

QA Lab 在主要的智能范围限定工作流之外拥有专用的 CI 通道。代理对等性嵌套在广泛的 QA 和发布工具下，而不是独立的 PR 工作流。当对等性应伴随广泛的验证运行时，请将 `Full Release Validation` 与 `rerun_group=qa-parity` 结合使用。

- `QA-Lab - All Lanes` 工作流每晚在 `main`MatrixTelegramDiscord 上运行，并在手动调度时运行；它将模拟对等性通道、实时 Matrix 通道以及实时 Telegram 和 Discord 通道作为并行作业展开。实时作业使用 `qa-live-shared`TelegramDiscord 环境，而 Telegram/Discord 使用 Convex 租约。

发布检查运行 Matrix 和 Telegram 实时传输通道，使用确定性的模拟提供商和模拟合格的模型（MatrixTelegram`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`Docker），以便将渠道合同与实时模型延迟和正常的提供商-插件启动隔离开来。实时传输网关禁用内存搜索，因为 QA 对等性单独覆盖内存行为；提供商连接由单独的实时模型、原生提供商和 Docker 提供商套件覆盖。

Matrix 对计划和发布关卡使用 Matrix`--profile fast`，仅在检出的 CLI 支持时才添加 `--fail-fast`。CLI 默认值和手动工作流输入保持为 `all`；手动 `matrix_profile=all`Matrix 调度始终将完整的 Matrix 覆盖范围拆分为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。

`OpenClaw Release Checks` 还会在发布批准之前运行对发布至关重要的 QA Lab 通道；其 QA 一致性关卡将候选版本和基准版本作为并行通道作业运行，然后将这两个构件下载到一个小型报告作业中以进行最终的一致性比较。

对于正常的 PR，请遵循范围限定的 CI/check 证据，而不要将一致性视为必需状态。

## CodeQL

`CodeQL` 工作流程有意设计为狭窄的首轮安全扫描器，而不是完整的仓库扫描。每日、手动和非草稿 PR 守护运行扫描 Actions 工作流程代码以及最高风险的 JavaScript/TypeScript 表面，使用筛选为高/严重 `security-severity` 的高置信度安全查询。

PR 守护保持轻量级：它仅针对 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的更改启动，并且它运行与计划工作流程相同的高置信度安全矩阵。Android 和 macOS CodeQL 不包含在 PR 默认设置中。

### 安全类别

| 类别                                              | 表面                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基线                                  |
| `/codeql-security-high/channel-runtime-boundary`  | 核心渠道实现合约以及渠道插件运行时、gateway、Plugin SDK、secrets、审计接触点  |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络守护、web-fetch 和 Plugin SDK SSRF 策略表面           |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行助手、出站交付以及代理 工具执行门控                       |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、清单、注册表、包管理器安装、源加载以及插件 SDK 包合约信任面 |

### 特定平台的安全分片

- `CodeQL Android Critical Security`AndroidAndroidLinux — 定时 Android 安全分片。在工作流健全性允许的最小 Blacksmith Linux 运行器上，为 CodeQL 手动构建 Android 应用。结果上传至 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security`macOSmacOSmacOS — 每周/手动 macOS 安全分片。在 Blacksmith macOS 上为 CodeQL 手动构建 macOS 应用，从上传的 SARIF 中过滤掉依赖项构建结果，并上传至 `/codeql-critical-security/macos`macOS。之所以排除在每日默认值之外，是因为即使在干净的情况下，macOS 构建也会占据大部分运行时间。

### 关键质量类别

`CodeQL Critical Quality`Linux 是匹配的非安全分片。它在较小的 Blacksmith Linux 运行器上，仅针对狭窄的高价值表面运行错误严重级别的非安全 JavaScript/TypeScript 质量查询。其拉取请求保护措施有意比定时配置文件更小：非草稿 PR 仅运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片，针对 agent command/模型/工具 执行和回复分发代码、配置 schema/migration/IO 代码、auth/secrets/sandbox/security 代码、核心渠道和捆绑渠道插件运行时、gateway protocol/server-method、内存运行时/SDK 胶水代码、MCP/process/outbound delivery、提供商 runtime/模型 catalog、会话 diagnostics/delivery queues、插件加载器、Plugin SDK/package-contract 或 Plugin SDK reply runtime 的更改。CodeQL 配置和质量工作流更改会运行所有十二个 PR 质量分片。

手动分发接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狭窄配置文件是用于隔离运行单个质量分片的教学/迭代钩子。

| 类别                                                    | 表面                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Auth、secrets、sandbox、cron 和 gateway 安全边界代码                                                    |
| `/codeql-critical-quality/config-boundary`              | 配置 schema、迁移、规范化和 IO 契约                                                                     |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Gateway 协议 schema 和服务器方法契约                                                                    |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心渠道和捆绑渠道插件实现契约                                                                          |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/提供商分发、自动回复分发和队列，以及 ACP 控制平面运行时契约                              |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接器、进程监督助手以及出站分发契约                                                    |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory 主机 SDK、Memory 运行时外观、Memory 插件 SDK 别名、Memory 运行时激活粘合代码以及 Memory 诊断命令 |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部结构、会话传递队列、出站会话绑定/传递辅助程序、诊断事件/日志包表面以及会话诊断 CLI 契约     |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | 插件 SDK 入站回复调度、回复负载/分块/运行时辅助程序、渠道回复选项、传递队列以及会话/线程绑定辅助程序    |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、提供商身份验证和发现、提供商运行时注册、提供商默认值/目录以及 Web/搜索/获取/嵌入注册表  |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 引导程序、本地持久化、网关控制流以及任务控制平面运行时契约                                      |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 Web 获取/搜索、媒体 IO、媒体理解、图像生成以及媒体生成运行时契约                                   |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、注册表、公共表面以及插件 SDK 入口点契约                                                         |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布的包端插件 SDK 源代码和插件包契约辅助程序                                                         |

质量与安全保持分离，以便对质量发现进行调度、衡量、禁用或扩展，而不会模糊安全信号。Swift、Python 和捆绑插件的 CodeQL 扩展应仅在窄型配置文件具有稳定的运行时间和信号后，作为有作用域或分片的后续工作添加回来。

## 维护工作流

### Docs Agent

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于使现有文档与最近落地的更改保持一致。它没有纯粹的计划：`main` 上成功的非机器人推送 CI 运行可以触发它，手动调度也可以直接运行它。当 `main` 已更新或在过去一小时内创建了另一个未跳过的 Docs Agent 运行时，工作流运行调用将被跳过。当它运行时，它会审查从上一个未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此每小时运行一次可以覆盖自上次文档传递以来累积的所有主要更改。

### 测试性能代理

`Test Performance Agent` 工作流是一个事件驱动的 Codex 维护通道，用于处理慢速测试。它没有纯粹的计划：在 `main` 上成功的非机器人推送 CI 运行可以触发它，但如果另一个工作流运行调用已经在当天 UTC 运行或正在运行，它会跳过。手动调度会绕过该每日活动门控。该通道构建完整套件分组的 Vitest 性能报告，允许 Codex 仅进行保持覆盖率的小型测试性能修复，而不是广泛的重构，然后重新运行完整套件报告并拒绝减少通过基线测试计数的更改。如果基线有失败的测试，Codex 可能只会修复明显的失败，并且在代理后的完整套件报告通过之前，不得提交任何内容。当 `main` 在机器人推送落地之前前进了，该通道会对经过验证的补丁进行变基，重新运行 `pnpm check:changed`，并重试推送；冲突的过时补丁会被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的 drop-sudo 安全姿态。

### 合并后的重复 PR

`Duplicate PRs After Merge` 工作流是一个手动维护者工作流，用于落地后的重复清理。它默认为空运行，并且仅在 `apply=true` 时关闭明确列出的 PR。在更改 GitHub 之前，它会验证已落地的 PR 是否已合并，以及每个重复项是否有共享的引用问题或重叠的更改块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地检查门控和更改路由

本地更改通道逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。该本地检查门控在架构边界方面比广泛的 CI 平台范围更严格：

- 核心生产更改运行核心生产、核心测试类型检查以及核心 Lint/守卫；
- 核心仅测试更改仅运行核心测试类型检查以及核心 Lint；
- 扩展生产更改运行扩展生产和扩展测试类型检查以及扩展 Lint；
- 扩展仅测试更改运行扩展测试类型检查以及扩展 Lint；
- 公共 Plugin SDK 或 plugin-contract 更改扩展到扩展类型检查，因为扩展依赖于这些核心合约（Vitest 扩展扫描仍保持为显式测试工作）；
- 仅元数据的版本更新运行定向的 version/config/root-dependency 检查；
- 未知的 root/config 更改会安全地失败，并回退到所有检查通道。

本地更改测试的路由存在于 `scripts/test-projects.test-support.mjs` 中，且有意设计得比 `check:changed`DiscordSlack 更便宜：直接测试编辑运行自身，源代码编辑优先显式映射，然后是同级测试和依赖导入图的测试。共享群组房间投递配置是显式映射之一：对群组可见回复配置、源回复投递模式或消息工具系统提示的更改，会路由到核心回复测试加上 Discord 和 Slack 投递回归检查，以便在首次 PR 推送前捕获共享默认设置的更改。仅当更改范围足够广泛，使得廉价的映射集不再是可信的代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是仓库拥有的用于维护者 Linux 验证的远程框包装器。当检查对于本地编辑循环来说过于宽泛、当 CI 一致性很重要，或者当验证需要机密、Docker、包通道、可重用框或远程日志时，请从仓库根目录使用它。正常的 OpenClaw 后端是 LinuxDockerOpenClaw`blacksmith-testbox`Hetzner；拥有的 AWS/Hetzner 容量是 Blacksmith 故障、配额问题或显式拥有容量测试时的后备方案。

由 Crabbox 支持的 Blacksmith 会运行预热、认领、同步、运行、报告和清理一次性 Testboxes。当必需的根文件（如 `pnpm-lock.yaml`）消失或当 `git status --short` 显示至少 200 个跟踪的删除项时，内置的同步健全性检查会快速失败。对于有意进行大量删除的 PR，请为远程命令设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 还会终止在同步阶段停留超过五分钟且没有同步后输出的本地 Blacksmith CLI 调用。设置 CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以禁用该保护，或者对于异常大的本地差异，使用更大的毫秒值。

首次运行前，请从仓库根目录检查该包装器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库封装器拒绝使用未声明 `blacksmith-testbox` 的过时 Crabbox 二进制文件。即使 `.crabbox.yaml` 拥有自有云默认值，也请显式传递提供商。在 Codex 工作树或链接/稀疏检出中，请避免使用本地 `pnpm crabbox:run` 脚本，因为 pnpm 可能在 Crabbox 启动之前协调依赖；请改为直接调用 node 封装器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

更改门控：

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

阅读最终的 JSON 摘要。有用的字段包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性 Blacksmith 支持的 Crabbox 运行应自动停止 Testbox；如果运行被中断或清理情况不明，请检查实时测试框并仅停止您创建的测试框：

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

如果 Crabbox 是损坏的层但 Blacksmith 本身工作正常，请将直接 Blacksmith 仅用于 `list`、`status` 和清理等诊断。在将直接 Blacksmith 运行视为维护者证明之前，请修复 Crabbox 路径。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 工作正常，但新的预热在几分钟后仍 `queued` 且没有 IP 或 Actions 运行 URL，请将其视为 Blacksmith 提供商、队列、计费或组织限额的压力。停止您创建的排队 ID，避免启动更多 Testbox，并让某人检查 Blacksmith 仪表板、计费和组织限额，同时将证明转移到下方的自有 Crabbox 容量路径。

仅当 Blacksmith 停机、配额受限、缺少所需环境或明确以自有容量为目标时，才升级到自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 压力下，除非任务真正需要 48xlarge 级别的 CPU，否则避免使用 `class=beast`。`beast` 请求从 192 个 vCPU 开始，是触发区域性 EC2 Spot 或按需标准配额的最简单方式。仓库拥有的 `.crabbox.yaml` 默认设置为 `standard`、多容量区域和 `capacity.hints: true`，因此经纪的 AWS 租赁会打印选定的区域/市场、配额压力、Spot 回退以及高压类别警告。对较重的广泛检查使用 `fast`，仅在标准/快速检查不足时使用 `large`，并且仅对异常的 CPU 密集型通道使用 `beast`Docker，例如全套件或所有插件 Docker 矩阵、显式的发布/阻止验证或高核心性能分析。不要对 `pnpm check:changed`、专注测试、仅文档工作、普通 lint/typecheck、小型 E2E 复现或 Blacksmith 中断分类使用 `beast`。使用 `--market on-demand` 进行容量诊断，以免 Spot 市场波动混入信号中。

`.crabbox.yaml` 拥有自有云通道的提供商、同步和 GitHub Actions 水合默认值。它排除本地 `.git`，以便水合的 Actions 检出保留自己的远程 Git 元数据，而不是同步维护者本地的远程和对象存储，并且它排除永远不应传输的本地运行时/构建产物。`.github/workflows/crabbox-hydrate.yml` 拥有检出、Node/pnpm 设置、`origin/main` 获取以及自有云 `crabbox run --id <cbx_id>` 命令的非机密环境交接。

## 相关

- [安装概述](/zh/install)
- [开发渠道](/zh/install/development-channels)
