---
summary: "CI 作业图、范围门控、发布伞以及本地命令等效项"
title: "CI 流水线"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 OpenClaw`main` 和每个拉取请求时运行。`preflight` 作业会对差异进行分类，并当仅更改了不相关区域时关闭昂贵的通道。手动 `workflow_dispatch`Android 运行会故意绕过智能范围限定，并为发布候选版本和广泛验证展开全图。Android 通道通过 `include_android` 保持可选加入。仅限发布的插件覆盖率位于单独的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且仅从 [`Full Release Validation`](#full-release-validation) 或显式的手动调度运行。

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

## 实际行为证明

外部贡献者的 PR 会从
`.github/workflows/real-behavior-proof.yml` 运行一个 `Real behavior proof` 门控。该工作流检出受信任的
基础提交并仅评估 PR 正文；它不会执行
来自贡献者分支的代码。

该门控适用于非仓库所有者、成员、
协作者或机器人的 PR 作者。当 PR 正文包含一个
`Real behavior proof` 部分并为以下内容填写了值时，它将通过：

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

证据必须显示补丁在真实 OpenClaw
环境中更改后的行为。屏幕截图、录像、终端捕获、控制台输出、复制的实时
输出、编辑过的运行时日志和链接的构件均算数。单元测试、模拟、
快照、Lint、类型检查和 CI 结果是有用的支持性验证，
但它们本身并不能满足此门控要求。

当检查失败时，请更新 PR 正文而不是推送另一个代码提交。
只有当证明门控不适用于该 PR 时，维护者才能应用 `proof: override`。

## 范围和路由

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动调度会跳过更改范围检测，并使预检清单的行为就像每个范围区域都已更改一样。

- **CI workflow edits** 验证 Node CI 图和工作流 lint，但不会单独强制进行 Windows、Android 或 macOS 原生构建；这些平台通道仍然仅限于平台源代码变更。
- **Docs on `main` pushes** 由独立的 `Docs` 工作流检查，使用与 CI 相同的 ClawHub 文档镜像，因此代码和文档混合推送不会排队等待 CI `check-docs` 分片。当文档发生更改时，Pull request 和手动 CI 仍从 CI 运行 `check-docs`。
- **TUI PTY** 是针对 TUI 更改的专项工作流。它在 Linux Node 24 上为 `src/tui/**`、watch 工具、package 脚本、lockfile 和工作流编辑运行 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`。必选通道使用确定性的 `TuiBackend` fixture；较慢的 `tui --local` smoke 测试是可选的，需使用 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1`，并且仅模拟外部模型端点。
- **CI routing-only edits, selected cheap core-test fixture edits, and narrow plugin contract helper/test-routing edits** 使用仅限 Node 的快速清单路径：`preflight`、安全性和单个 `checks-fast-core` 任务。当更改仅限于快速任务直接演练的路由或 helper 表面时，该路径会跳过构建产物、Node 22 兼容性、渠道合约、完整核心分片、打包插件分片以及其他 guard 矩阵。
- **Windows Node checks** 的范围限定于 Windows 特定的进程/路径包装器、npm/pnpm/UI runner helper、包管理器配置以及执行该通道的 CI 工作流表面；不相关的源代码、插件、安装 smoke 和仅测试更改保留在 Linux Node 通道上。

最慢的 Node 测试系列被拆分或平衡，以确保每个任务保持较小规模且不会过度预留运行器：插件合约和渠道合约各自作为两个加权的、由 Blacksmith 支持的分片运行，并附带标准的 GitHub 运行器回退机制，核心单元快速/支持通道单独运行，核心运行时基础设施拆分为状态、进程/配置、共享以及三个 cron 域分片，自动回复作为平衡工作器运行（将回复子树拆分为 agent-runner、dispatch 以及 commands/state-routing 分片），且代理式 gateway/server 配置拆分到 chat/auth/模型/http-plugin/runtime/startup 通道，而不是等待构建产物。广泛的浏览器、QA、媒体和杂项插件测试使用其专用的 Vitest 配置，而不是共享的插件全能捕获配置。Include-pattern 分片使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分完整配置和过滤后的分片。`check-additional-*` 将包边界编译/金丝雀工作保持在一起，并将运行时拓扑架构与 Gateway(网关) 监视范围分离开来；边界守护列表被分割为一个提示密集型分片和一个包含剩余守护条带的组合分片，每个分片并发运行选定的独立守护并打印每次检查的计时。昂贵的 Codex 快乐路径提示快照漂移检查作为其自己的额外任务运行，仅用于手动 CI 和影响提示的更改，因此正常的、无关的 Node 更改不会等待冷提示快照的生成，且当提示漂移仍固定在导致它的 PR 上时，边界分片保持平衡；同一标志也会跳过构建产物核心支持边界分片内部的提示快照 Vitest 生成。Gateway(网关) 监视、渠道测试和核心支持边界分片在 `build-artifacts` 内部并发运行，前提是 `dist/` 和 `dist-runtime/` 已经构建完成。

Android CI 同时运行 Android`testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`Android，然后构建 Play 调试版 APK。第三方 flavor 没有单独的源集或清单；其单元测试通道仍然使用 SMS/call-log BuildConfig 标志编译该 flavor，同时在每次与 Android 相关的推送中避免重复的调试版 APK 打包任务。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（一个固定到最新 Knip 版本的生产环境 Knip 仅依赖扫描，针对 `dlx` 安装禁用了 pnpm 的最低发布年龄要求）和 `pnpm deadcode:unused-files`，后者将 Knip 的生产环境未使用文件发现结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。当 PR 添加新的未经审查的未使用文件或保留过时的允许列表条目时，未使用文件守护程序将失败，同时保留 Knip 无法静态解析的有意的动态插件、生成、构建、实时测试和包桥接面。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub 是从 OpenClaw 仓库活动到 ClawSweeper 的目标侧桥接。它不会检出或执行不受信任的拉取请求代码。该工作流从 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建 GitHub App 令牌，然后将紧凑的 `repository_dispatch` 负载分发到 `openclaw/clawsweeper`。

该工作流有四个通道：

- `clawsweeper_item` 用于精确的 issue 和拉取请求审核请求；
- `clawsweeper_comment` 用于 issue 评论中的显式 ClawSweeper 命令；
- `clawsweeper_commit_review` 用于 `main` 推送上的提交级审核请求；
- `github_activity`GitHub 用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 通道仅转发标准化的元数据：事件类型、操作、行动者、仓库、项目编号、URL、标题、状态，以及评论或审查（如果存在）的简短摘录。它有意避免转发完整的 webhook 主体。`openclaw/clawsweeper` 中的接收工作流是 `.github/workflows/github-activity.yml`，它将标准化事件发布到 ClawSweeper 代理的 OpenClaw Gateway(网关) 挂钩。

一般活动是观察，而非默认投递。ClawSweeper 代理在其提示中接收 Discord 目标，并且仅当事件令人惊讶、可执行、有风险或具有操作用途时才应发布到 `#clawsweeper`。常规打开、编辑、机器人变动、重复 webhook 噪音以及正常的审查流量应导致 `NO_REPLY`。

在此路径中，应始终将 GitHub 标题、评论、正文、审查文本、分支名称和提交消息视为不受信任的数据。它们是用于汇总和分类的输入，而不是工作流或代理运行时的指令。

## 手动调度

手动 CI 调度运行与正常 CI 相同的作业图，但强制开启所有非 Android 范围的通道：Linux Node 分片、捆绑插件分片、插件和渠道合约分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟检查、文档检查、Python 技能、Windows、macOS 和 Control UI i18n。独立的手动 CI 调度仅使用 `include_android=true` 运行 Android；完整的发布范围通过传递 `include_android=true` 启用 Android。插件预发布静态检查、仅限发布的 `agentic-plugins` 分片、完整的扩展批次扫描以及插件预发布 Docker 通道从 CI 中排除。Docker 预发布套件仅在 `Full Release Validation` 调度启用 release-validation 门的单独 `Plugin Prerelease` 工作流时运行。

手动运行使用唯一的并发组，因此同一引用上的其他推送或 PR 运行不会取消候选版本的完整套件运行。可选的 `target_ref` 输入允许受信任的调用者在使用所选调度引用中的工作流文件的同时，针对分支、标签或完整提交 SHA 运行该图。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| 运行器                           | 任务                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、文档检查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队                                 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`security-fast`、权重较低的扩展分片、`checks-fast-core`、插件/渠道契约分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 和 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux 节点测试分片、捆绑插件测试分片、`check-additional-*` 分片、`android`                                                                                                                   |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（对 CPU 足够敏感，以至于 8 个 vCPU 的成本超过了其节省的成本）；install-smoke Docker 构建（32-vCPU 排队时间的成本超过了其节省的成本）                         |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 位于 `openclaw/openclaw`；Fork 回退到 `macos-latest`                                                                                                                            |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 位于 `openclaw/openclaw`；Fork 回退到 `macos-latest`                                                                                                                           |

Canonical-repo CI 将 Blacksmith 保留为默认的运行器路径。在 `preflight` 期间，`scripts/ci-runner-labels.mjs` 会检查最近排队和正在进行的 Actions 运行中是否有排队的 Blacksmith 作业。如果特定的 Blacksmith 标签已有排队的作业，那么将使用该确切标签的下游作业将仅针对该运行回退到匹配的 GitHub 托管的运行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。同一操作系统系列中的其他 Blacksmith 大小保留在其主要标签上。如果 API 探测失败，则不应用回退。

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
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
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

`OpenClaw Performance` 是产品/运行时性能工作流。它在 `main` 上每天运行，并且可以手动调度：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动调度通常对工作流 ref 进行基准测试。设置 `target_ref` 以使用当前工作流实现对发布标签或其他分支进行基准测试。已发布的报告路径和最新指针以被测 ref 为键，每个 `index.md` 都会记录被测 ref/SHA、工作流 ref/SHA、Kova ref、配置文件、通道认证模式、模型、重复计数和场景筛选器。

该工作流从固定的发布版本安装 OCM，并在固定的 `kova_ref` 输入处从 `openclaw/Kova` 安装 Kova，然后运行三个通道：

- `mock-provider`：针对本地构建运行时的 Kova 诊断场景，具有确定性的虚假 OpenAI 兼容认证。
- `mock-deep-profile`：针对启动、网关和代理回合热点的 CPU/堆/跟踪分析。
- `live-openai-candidate`：一个真实的 OpenAI `openai/gpt-5.5` 代理回合，当 `OPENAI_API_KEY` 不可用时跳过。

在 Kova 通过后，mock-提供商 车道还会运行 OpenClaw 原生源探测：包括默认、hook 和 50 插件启动场景下的网关启动时间和内存；重复的 mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI hello 循环；以及针对已启动网关的 CLI 启动命令。源探测的 Markdown 摘要位于报告包中的 `source/index.md`，旁边是原始 JSON。

每个车道都会上传 GitHub 制品。当配置了 GitHub`CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、包、`index.md` 和源探测制品提交到 `openclaw/clawgrit-reports` 下的 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 中。当前测试的引用指针被写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是“发布前运行所有内容”的手动总括工作流。它接受分支、标签或完整的提交 SHA，使用该目标调度手动 `CI` 工作流，调度 `Plugin Prerelease`Docker 以进行仅限发布的插件/包/静态/Docker 验证，并调度 `OpenClaw Release Checks`MatrixTelegramDocker 以进行安装冒烟测试、包验收、跨操作系统包检查、QA Lab 对等性、Matrix 和 Telegram 通道。稳定/默认运行将详尽的实时/E2E 和 Docker 发布路径覆盖保留在 `run_release_soak=true` 之后；`release_profile=full` 强制执行该覆盖，以便广泛的建议性验证保持广泛。使用 `rerun_group=all` 和 `release_profile=full`，它还会针对发布检查中的 `release-package-under-test` 构建产物运行 `NPM Telegram Beta E2E`。发布后，传递 `release_package_spec`npmDockerTelegram 以跨发布检查、包验收、Docker、跨操作系统和 Telegram 重复使用已发布的 npm 包，而无需重新构建。仅当 Telegram 必须验证不同的包时才使用 `npm_telegram_package_spec`Telegram。Codex 插件实时包通道默认使用相同的选定状态：已发布的 `release_package_spec=openclaw@<tag>` 派生 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/构建产物运行则从选定引用打包 `extensions/codex`。为自定义插件源（如 `npm:`、`npm-pack:` 或 `git:` 规范）显式设置 `codex_plugin_spec`。

有关阶段矩阵、确切的工作流作业名称、配置文件差异、构建产物和
重点重新运行句柄，请参阅[完整发布验证](/zh/reference/full-release-validation)。

`OpenClaw Release Publish` 是手动变更的发布工作流。在发布标签存在且 OpenClaw npm 预检成功后，从 `release/YYYY.M.D` 或 `main`OpenClawnpm 分派它。它会验证 `pnpm plugins:sync:check`，为所有可发布的插件包分派 `Plugin NPM Release`，为同一发布 SHA 分派 `Plugin ClawHub Release`，然后仅在此之后，使用保存的 `preflight_run_id` 分派 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

对于快速移动分支上的固定提交证明，请使用辅助工具，而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub 工作流分派引用必须是分支或标签，而不是原始提交 SHA。辅助工具会在目标 SHA 处推送临时的 GitHub`release-ci/<sha>-...` 分支，从该固定引用分派 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，并在运行完成时删除临时分支。如果任何子工作流在不同的 SHA 上运行，总体验证程序也会失败。

`release_profile` 控制传递给发布检查的 live/提供商 广度。手动发布工作流默认为 `stable`；仅当您有意需要广泛的 advisory 提供商/media 矩阵时才使用 `full`。`run_release_soak`Docker 控制稳定/默认发布检查是否运行详尽的 live/E2E 和 Docker 发布路径浸泡测试；`full` 强制开启浸泡测试。

- `minimum`OpenAI 保留了最快的 OpenAI/core 发布关键通道。
- `stable` 添加了稳定的 提供商/backend 集。
- `full` 运行广泛的 advisory 提供商/media 矩阵。

总体验证程序会记录已分派的子运行 ID，最终的 `Verify full validation` 作业会重新检查当前子运行结论，并为每个子运行附加最慢作业表。如果子工作流被重新运行并变为通过（绿色），请仅重新运行父验证程序作业，以刷新总体验证结果和时间摘要。

为了恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对发布候选版本使用 `all`，对仅正常完整 CI 子项使用 `ci`，对仅插件预发布子项使用 `plugin-prerelease`，对每个发布子项使用 `release-checks`，或者在总括项上使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这在针对性的修复后，将失败的发布框重新运行保持在一定范围内。对于单个失败的跨操作系统车道，将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合使用，例如 `windows/packaged-upgrade`OpenClaw；长跨操作系统命令会输出心跳行，打包升级摘要包含每个阶段的时间安排。QA 发布检查车道是建议性的，标准运行时工具覆盖范围门除外，当所需的 OpenClaw 动态工具从标准层级摘要中漂移或消失时，它会阻止发布。

`OpenClaw Release Checks` 使用受信任的工作流引用将所选引用一次性解析为 `release-package-under-test`Dockernpm tarball，然后将该工件传递给跨操作系统检查和包验收，以及在浸泡覆盖范围运行时传递给实时/E2E 发布路径 Docker 工作流。这使发布框之间的包字节保持一致，并避免在多个子作业中重新打包相同的候选版本。对于 Codex npm-plugin 实时车道，发布检查要么传递从 `release_package_spec` 派生的匹配已发布插件规范，要么传递操作员提供的 `codex_plugin_spec`Docker，要么将输入留空，以便 Docker 脚本打包所选检出内容的 Codex 插件。

`Full Release Validation` 的重复运行（针对 `ref=main` 和 `rerun_group=all`）会取代旧的 umbrella。父级监视器会在父级被取消时取消它已调度的任何子级工作流，因此较新的 main 验证不会因为过时的两小时 release-check 运行而被阻塞。Release 分支/tag 验证和 focused rerun 组保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

release live/E2E 子级保持广泛的 native `pnpm test:live` 覆盖率，但它通过 `scripts/test-live-shard.mjs` 以命名分片的形式运行，而不是作为一个串行作业：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 提供商-filtered `native-live-src-gateway-profiles` 作业
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 拆分的媒体 audio/video 分片和 提供商-filtered 音乐分片

这在保持相同文件覆盖率的同时，使缓慢的 live 提供商 失败更易于重新运行和诊断。聚合的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称对于手动单次重新运行仍然有效。

native live media 分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，该环境由 `Live Media Runner Image` 工作流构建。该镜像预装了 `ffmpeg` 和 `ffprobe`；media 作业在设置前仅验证二进制文件。请将 Docker 支持的 live 套件保留在普通的 Blacksmith 运行器上 — 容器作业不是启动嵌套 Docker 测试的正确场所。

基于Docker的实时模型/后端分片为每个选定的提交使用一个单独的共享 Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI 镜像。实时发布工作流构建并推送该镜像一次，然后 Docker 实时模型、提供商分片的 Gateway、CLI 后端、ACP 绑定和 Codex 驾驭分片将使用 `OPENCLAW_SKIP_DOCKER_BUILD=1`Gateway(网关)Docker 运行。Gateway Docker 分片在工作流作业超时之前设定了明确的脚本级 `timeout`Docker 上限，以便卡住的容器或清理路径能够快速失败，而不是消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，则说明发布运行配置错误，并将因重复构建镜像而浪费时间。

## 包验收

当问题是“这个可安装的 OpenClaw 包作为产品是否能正常工作？”时，请使用 `Package Acceptance`OpenClawDocker。它与常规 CI 不同：常规 CI 验证源代码树，而包验收通过用户在安装或更新后使用的同一 Docker E2E 驾驭来验证单个 tarball。

### 作业

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选项，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test`GitHub 构件上传，并在 GitHub 步骤摘要中打印源、workflow ref、package ref、版本、SHA-256 和配置文件。
2. `docker_acceptance` 调用 `openclaw-live-and-e2e-checks-reusable.yml` 并传入 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`。可重用工作流会下载该构建产物，验证 tarball 清单，在需要时准备 package-digest Docker 镜像，并针对该包运行选定的 Docker 通道，而不是打包工作流检出的内容。当配置文件选择了多个目标 `docker_lanes` 时，可重用工作流会准备一次包和共享镜像，然后将这些通道作为具有唯一构建产物的并行目标 Docker 作业分发出去。
3. `package_telegram` 可选择调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不为 `none` 时运行，并在包验收解析出构建产物时安装相同的 `package-under-test` 构建产物；独立的 Telegram 分发仍然可以安装已发布的 npm 规范。
4. 如果包解析、Docker 验收或可选的 Telegram 通道失败，`summary` 将导致工作流失败。

### 候选来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest` 或确切的 OpenClaw 发布版本（例如 `openclaw@2026.4.27-beta.2`）。将其用于已发布的预发布/稳定版验收。
- `source=ref` 打包受信任的 `package_ref` 分支、标签或完整提交 SHA。解析器会获取 OpenClaw 分支/标签，验证所选提交是否可从仓库分支历史或发布标签访问，在独立工作树中安装依赖项，并使用 `scripts/package-openclaw-for-docker.mjs` 对其进行打包。
- `source=url` 下载公共 HTTPS `.tgz`；需要 `package_sha256`。此路径拒绝 URL 凭据、非默认 HTTPS 端口、私有/内部/专用主机名或解析的 IP，以及重定向到相同公共安全策略之外的情况。
- `source=trusted-url` 从 `.github/package-trusted-sources.json` 中的指定受信任源策略下载一个 HTTPS `.tgz`；需要 `package_sha256` 和 `trusted_source_id`。请仅将此用于维护者拥有的企业镜像或需要配置主机、端口、路径前缀、重定向主机或专用网络解析的私有软件包仓库。如果策略声明了 bearer auth，工作流将使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥；嵌入 URL 的凭据仍会被拒绝。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享的构件应提供此项。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/测试工具代码。`package_ref` 是 `source=ref` 时被打包的源提交。这使得当前的测试工具可以验证较旧的受信任源提交，而无需运行旧的工作流逻辑。

### Suite profiles

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 带 OpenWebUI 的完整 Docker 发布路径块
- `custom` — 精确的 `docker_lanes`；`suite_profile=custom` 时必需

`package` 配置文件使用离线插件覆盖，因此已发布包的验证不依赖于 ClawHub 的可用性。可选的 Telegram 通道在 `NPM Telegram Beta E2E` 中重用 `package-under-test` 构建产物，并为独立分派保留已发布的 npm 规范路径。

有关专门的更新和插件测试策略，包括本地命令、Docker 通道、Package Acceptance 输入、发布默认设置和故障分类，请参阅[测试更新和插件](/zh/help/testing-updates-plugins)。

Release checks 使用 `source=artifact`、准备好的发布包工件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai`ClawHubTelegram 调用 Package Acceptance。这确保了包迁移、更新、在线 ClawHub 技能安装、过期插件依赖清理、已配置插件安装修复、离线插件、插件更新和 Telegram 验证都在同一个解析出的包 tarball 上进行。在发布 beta 版本后，在 Full Release Validation 或 OpenClaw Release Checks 上设置 `release_package_spec`OpenClawnpm，以便在不重新构建的情况下针对已发布的 npm 包运行相同的矩阵；仅当 Package Acceptance 需要与其余发布验证不同的包时，才设置 `package_acceptance_package_spec`。跨操作系统的发布检查仍然涵盖特定于操作系统的入门引导、安装程序和平台行为；包/更新产品验证应从 Package Acceptance 开始。`published-upgrade-survivor`Docker Docker 通道在阻塞发布路径中每次运行验证一个已发布的包基线。在 Package Acceptance 中，解析出的 `package-under-test` tarball 始终是候选版本，而 `published_upgrade_survivor_baseline` 选择回退的已发布基线，默认为 `openclaw@latest`；通道失败重新运行的命令会保留该基线。带有 `run_release_soak=true` 或 `release_profile=full` 的完整发布验证会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`npmOpenClawDocker，以扩展到四个最新的稳定 npm 版本，加上固定的插件兼容性边界版本，以及针对飞书配置、保留的引导/角色文件、已配置的 OpenClaw 插件安装、波浪号日志路径和过时的遗留插件依赖根目录的 issue 形状的测试装置。多基线已发布升级幸存者选择会按基线分片到单独的定向 Docker 运行器作业中。当问题是对已发布更新的全面清理，而不是正常的完整发布 CI 范围时，单独的 `Update Migration` 工作流会使用带有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration`Docker Docker 通道。本地聚合运行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递确切的包规范，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`（例如 `openclaw@2026.4.15`）保留单个通道，或者为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已发布通道使用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 Gateway 启动后探测 `/healthz`、`/readyz`RPCGateway(网关)WindowsWindowsOpenAI 以及 RPC 状态。Windows 打包和安装程序全新通道还验证已安装的包是否可以从原始绝对 Windows 路径导入浏览器控制覆盖。OpenAI 跨操作系统 agent-turn 冒烟测试在设置时默认为 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则为 `openai/gpt-5.5`，因此安装和网关验证保持在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容性窗口

包验收 对已发布的包设有有限的旧版兼容性窗口。`2026.4.25`（包括 `2026.4.25-beta.*`）之前的包可以使用兼容性路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可能指向已从 tarball 中省略的文件；
- 当包未公开该标志时，`doctor-switch` 可能会跳过 `gateway install --wrapper` 持久化子案例；
- `update-channel-switch` 可能会从 tarball 衍生的伪 git fixture 中修剪缺失的 pnpm `patchedDependencies`，并可能记录缺失的持久化 `update.channel`；
- 插件冒烟测试可能会读取旧版安装记录位置，或接受缺失的 marketplace 安装记录持久化；
- `plugin-update` 可能允许配置元数据迁移，同时仍要求安装记录和无重新安装行为保持不变。

已发布的 `2026.4.26` 包也可能针对已随附的本地构建元数据戳记文件发出警告。后续包必须满足现代合约；相同条件下将失败而不是警告或跳过。

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

# Validate a tarball from a named trusted private mirror policy.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
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

调试失败的包验收运行时，请从 `resolve_package` 摘要开始，以确认包源、版本和 SHA-256。然后检查 `docker_acceptance` 子运行及其 Docker 构件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、通道日志、阶段计时和重新运行命令。优先重新运行失败的包配置文件或确切的 Docker 通道，而不是重新运行完整的发布验证。

## 安装冒烟测试

独立的 `Install Smoke` 工作流通过其自己的 `preflight` 作业重用相同的作用域 脚本。它将冒烟测试覆盖范围分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **快速通道**针对涉及 Docker/包表面、捆绑插件包/清单变更，或 Docker 冒烟作业所演练的核心插件/渠道/网关/Plugin SDK 表面的拉取请求运行。仅源代码的捆绑插件变更、仅测试的编辑和仅文档的编辑不保留 Docker 工作线程。快速通道仅构建一次根 Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI 冒烟，运行容器 gateway-network e2e，验证捆绑扩展构建参数，并在 240 秒的聚合命令超时下运行有界的捆绑插件 Docker 配置文件（每个场景的 Docker 运行分别设有上限）。
- **完整路径**为夜间计划运行、手动分发、工作流调用发布检查，以及确实触及安装程序/包/Docker 表面的拉取请求保留 QR 包安装和安装程序 Docker/更新覆盖率。在完整模式下，install-smoke 准备或复用一个目标 SHA 的 GHCR 根 Dockerfile 冒烟镜像，然后将 QR 包安装、根 Dockerfile/网关冒烟、安装程序/更新冒烟以及快速捆绑插件 Docker E2E 作为单独的作业运行，以便安装程序工作无需等待根镜像冒烟。

`main`Docker 推送（包括合并提交）不会强制执行完整路径；当变更范围逻辑在推送时请求完全覆盖时，工作流保留快速 Docker 冒烟，并将完整安装冒烟留给夜间或发布验证。

缓慢的 Bun 全局安装镜像提供商冒烟由 Bun`run_bun_global_install_smoke` 单独控制。它在夜间计划中以及从发布检查工作流运行，手动 `Install Smoke` 分发可以选择加入，但拉取请求和 `main`Docker 推送则不会。QR 和安装程序 Docker 测试保留其自己专注于安装的 Dockerfile。

## 本地 Docker E2E

`pnpm test:docker:all`OpenClawnpm 预构建一个共享的实时测试镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个用于安装程序/更新/插件依赖通道的裸 Node/Git 运行器；
- 一个将相同的 tarball 安装到 `/app` 中的功能镜像，用于常规功能通道。

Docker 通道定义位于 Docker`scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，而运行器仅执行选定的计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。

### 可调参数

| 变量                                   | 默认值  | 用途                                                                                |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 常规通道的主池插槽数。                                                              |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 对提供商敏感的尾部池插槽数。                                                        |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发实时通道上限，以免提供商进行限流。                                              |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm 安装通道上限。                                                             |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务通道上限。                                                                |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道启动之间的交错时间，以避免 Docker 守护进程创建风暴；设置为 Docker`0` 则不交错。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个通道的回退超时时间（120 分钟）；选定的实时/尾部通道使用更严格的上限。           |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | unset   | `1` 打印调度器计划而不运行通道。                                                    |
| `OPENCLAW_DOCKER_ALL_LANES`            | unset   | 逗号分隔的精确通道列表；跳过清理冒烟测试，以便代理可以重现一个失败的通道。          |

权重大于其有效上限的通道仍然可以从空池启动，然后单独运行直到释放容量。本地聚合预检 Docker，移除陈旧的 OpenClaw E2E 容器，发出活动通道状态，持久化通道计时以进行最长优先排序，并默认在首次失败后停止调度新的池化通道。

### 可重用的实时/E2E 工作流

可重用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪些包、镜像类型、live 镜像、通道和凭证覆盖。`scripts/docker-e2e.mjs` 随后将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的包构件，要么从 `package_artifact_run_id` 下载包构件；验证 tarball 清单；当计划需要已安装包的通道时，通过 Blacksmith 的 Docker 层缓存构建并推送带有包摘要标签的 bare/functional GHCR Docker E2E 镜像；并复用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像，而不是重新构建。Docker 镜像拉取会重试，每次尝试有 180 秒的界限超时，以便卡住的注册表/缓存流快速重试，而不是消耗 CI 关键路径的大部分时间。

### 发布路径区块

发布 Docker 覆盖范围使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行较小的分块作业，因此每个区块仅拉取其所需的镜像类型，并通过同一个加权调度程序执行多个通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前发布的 Docker 分块包括 Docker`core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及从 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`package-update-openai`OpenClaw 包含实时 Codex 插件包通道，它会安装候选的 OpenClaw 包，从 `codex_plugin_spec`CLICLIOpenClawOpenAI 安装 Codex 插件或通过明确的 Codex CLI 安装批准来安装同引用 tarball，运行 Codex CLI 预检查，然后针对 OpenAI 运行多个同会话 OpenClaw 代理回合。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合插件/运行时别名。`install-e2e` 通道别名仍然是两个提供商安装通道的聚合手动重新运行别名。

当完整发布路径覆盖请求时，OpenWebUI 会并入 `plugins-runtime-services`，并仅为仅 OpenWebUI 分发保留独立的 `openwebui`npm 分块。捆绑渠道更新通道会针对瞬态 npm 网络故障重试一次。

每个块上传 `.artifacts/docker-tests/`，其中包含通道日志、计时、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢速通道表以及按通道重新运行的命令。工作流 `docker_lanes` 输入针对准备好的镜像而非块作业运行选定的通道，这使得失败通道的调试范围仅限于一个有针对性的 Docker 作业，并为该运行准备、下载或复用包构件；如果选定的通道是实时 Docker 通道，则有针对性的作业会在本地为该重新运行构建实时测试镜像。生成的按通道 GitHub 重新运行命令包含 `package_artifact_run_id`、`package_artifact_name` 以及准备好的镜像输入（当这些值存在时），以便失败的通道能够复用失败运行中的确切包和镜像。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

计划的实时/E2E 工作流每天运行完整的发布路径 Docker 套件。

## 插件预发布

`Plugin Prerelease` 是成本更高的产品/包覆盖率，因此它是由 `Full Release Validation` 或显式操作员调度的独立工作流。普通的拉取请求、`main` 推送和独立的手动 CI 调度都会关闭该套件。它在八个扩展工作器之间平衡捆绑的插件测试；这些扩展分片作业每次最多运行两个插件配置组，每组一个 Vitest 工作器，并使用更大的 Node 堆，这样导入繁重的插件批次就不会产生额外的 CI 作业。仅限发布的 Docker 预发布路径将目标 Docker 通道分批到小组中，以避免为一到三分钟的作业保留数十个运行器。工作流还从 `@openclaw/plugin-inspector` 上传信息性的 `plugin-inspector-advisory` 构件；检查器发现结果是分类输入，不会更改阻塞性插件预发布关卡。

## QA 实验室

QA Lab 在主要的智能限定工作流之外拥有专用的 CI 通道。Agent 一致性嵌套在广泛的 QA 和发布工具下，而非独立的 PR 工作流。当一致性应随广泛验证运行时，请将 `Full Release Validation` 与 `rerun_group=qa-parity` 结合使用。

- `QA-Lab - All Lanes` 工作流每晚在 `main`MatrixTelegramDiscord 上运行，并支持手动调度；它将模拟一致性通道、实时 Matrix 通道以及实时 Telegram 和 Discord 通道作为并行作业展开。实时作业使用 `qa-live-shared`TelegramDiscord 环境，而 Telegram/Discord 使用 Convex 租约。

发布检查运行 Matrix 和 Telegram 实时传输通道，使用确定性模拟提供商和模拟限定模型（MatrixTelegram`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`Docker），以便将渠道协议与实时模型延迟以及正常的提供商插件启动隔离开来。实时传输网关禁用内存搜索，因为 QA 一致性单独覆盖内存行为；提供商连接性由单独的实时模型、原生提供商和 Docker 提供商套件覆盖。

Matrix 针对计划内和发布关卡使用 Matrix`--profile fast`，仅当检出的 CLI 支持时才添加 `--fail-fast`CLICLI。CLI 默认值和手动工作流输入仍为 `all`；手动 `matrix_profile=all`Matrix 调度始终将完整的 Matrix 覆盖范围分片为 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业。

`OpenClaw Release Checks` 也在发布批准之前运行对发布至关重要的 QA Lab 通道；其 QA 一致性关卡将候选包和基准包作为并行通道作业运行，然后将两个构建产物下载到一个小型报告作业中进行最终的一致性比较。

对于普通的 PR，请遵循范围内的 CI/检查证据，而不是将对等性视为必需状态。

## CodeQL

`CodeQL` 工作流是有意设计为一个狭窄的首轮安全扫描器，而不是完整的仓库扫描。每日、手动和非草稿 PR 的守护运行会扫描 Actions 工作流代码以及最高风险的 JavaScript/TypeScript 表面，使用过滤到高/严重 `security-severity` 的高置信度安全查询。

Pull request 守护保持轻量：它仅针对 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的更改启动，并且它运行与计划工作流相同的高置信度安全矩阵。Android 和 macOS CodeQL 不包含在 PR 默认设置中。

### 安全类别

| 类别                                              | 表面                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 身份验证、密钥、沙箱、定时任务和网关基线                                          |
| `/codeql-security-high/channel-runtime-boundary`  | 核心渠道实现合约以及渠道插件运行时、网关、插件 SDK、密钥和审计接触点              |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、网络守卫、web-fetch 和插件 SDK SSRF 策略表面                  |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行助手、出站交付和代理工具执行网关                              |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、清单、注册表、包管理器安装、源代码加载和插件 SDK 包合约信任表面 |

### 特定平台的安全分片

- `CodeQL Android Critical Security` — 计划的 Android 安全分片。在符合工作流合理性要求的最小 Blacksmith Android 运行器上为 CodeQL 手动构建 Linux 应用程序。上传到 `/codeql-critical-security/android` 下。
- `CodeQL macOS Critical Security`macOSmacOSmacOS — 每周/手动 macOS 安全分片。在 Blacksmith macOS 上手动构建 macOS 应用以进行 CodeQL 分析，从上传的 SARIF 中过滤掉依赖构建结果，并在 `/codeql-critical-security/macos`macOS 下上传。之所以不包含在每日默认项目中，是因为即使是在干净构建的情况下，macOS 构建也会占用大部分运行时间。

### 关键质量类别

`CodeQL Critical Quality`Linux 是匹配的非安全分片。它在较小的 Blacksmith Linux 运行器上，针对狭窄的高价值表面，仅运行错误严重级别且非安全的 JavaScript/TypeScript 质量查询。其拉取请求守卫有意设置为小于计划配置文件：非草稿 PR 仅运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片，用于 agent 命令/模型/工具执行和回复调度代码、配置 schema/迁移/IO 代码、身份验证/机密/沙盒/安全代码、核心渠道和捆绑渠道插件运行时、网关协议/服务器方法、内存运行时/SDK 粘合代码、MCP/进程/出站传递、提供商运行时/模型目录、会话诊断/传递队列、插件加载器、插件 SDK/包契约或插件 SDK 回复运行时更改。CodeQL 配置和质量工作流更改会运行所有十二个 PR 质量分片。

手动调度接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

这些简略配置文件是用于在隔离状态下运行单个质量分片的教学/迭代钩子。

| 类别                                                    | 表面                                                                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 身份验证、机密、沙盒、cron 和网关安全边界代码                                                                                                            |
| `/codeql-critical-quality/config-boundary`              | 配置 schema、迁移、规范化和 IO 契约                                                                                                                      |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Gateway(网关) 协议 schema 和服务器方法契约                                                                                                               |
| `/codeql-critical-quality/channel-runtime-boundary`     | Core 渠道 and bundled 渠道 plugin implementation contracts                                                                                               |
| `/codeql-critical-quality/agent-runtime-boundary`       | Command execution, 模型/提供商 dispatch, auto-reply dispatch and queues, and ACP control-plane runtime contracts                                         |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP servers and 工具 bridges, process supervision helpers, and outbound delivery contracts                                                               |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory host SDK, memory runtime facades, memory Plugin SDK aliases, memory runtime activation glue, and memory doctor commands                           |
| `/codeql-critical-quality/session-diagnostics-boundary` | Reply queue internals, 会话 delivery queues, outbound 会话 binding/delivery helpers, diagnostic event/log bundle surfaces, and 会话 doctor CLI contracts |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK inbound reply dispatch, reply payload/chunking/runtime helpers, 渠道 reply options, delivery queues, and 会话/thread binding helpers          |
| `/codeql-critical-quality/provider-runtime-boundary`    | Model catalog normalization, 提供商 auth and discovery, 提供商 runtime registration, 提供商 defaults/catalogs, and web/search/fetch/embedding registries |
| `/codeql-critical-quality/ui-control-plane`             | Control UI bootstrap, local persistence, gateway control flows, and task control-plane runtime contracts                                                 |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Core web fetch/search, media IO, media understanding, image-generation, and media-generation runtime contracts                                           |
| `/codeql-critical-quality/plugin-boundary`              | Loader, registry, public-surface, and Plugin SDK entrypoint contracts                                                                                    |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Published package-side Plugin SDK source and plugin package contract helpers                                                                             |

Quality stays separate from security so quality findings can be scheduled, measured, disabled, or expanded without obscuring security signal. Swift, Python, and bundled-plugin CodeQL expansion should be added back as scoped or sharded follow-up work only after the narrow profiles have stable runtime and signal.

## Maintenance workflows

### Docs Agent

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于使现有文档与最近合并的更改保持一致。它没有纯粹的定期计划：`main` 上成功的非机器人推送 CI 运行可以触发它，并且手动调度可以直接运行它。当 `main` 已经向前推进，或者在过去一小时内创建了另一个未跳过的 Docs Agent 运行时，工作流运行调用将会跳过。当它运行时，它会审查从上一次未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次每小时运行可以涵盖自上次文档传递以来积累的所有主分支更改。

### Test Performance Agent

`Test Performance Agent` 工作流是一个用于慢速测试的事件驱动 Codex 维护通道。它没有纯粹的定期计划：`main` 上成功的非机器人推送 CI 运行可以触发它，但如果另一个工作流运行调用在同一天（UTC）已经运行或正在运行，它将跳过。手动调度会绕过此每日活动限制。该通道构建完整的套件分组 Vitest 性能报告，允许 Codex 仅进行保持覆盖范围的小型测试性能修复，而不是广泛的重构，然后重新运行完整套件报告并拒绝减少通过基线测试数量的更改。如果基线中有失败的测试，Codex 可能只会修复明显的失败，并且在提交任何内容之前，代理后的完整套件报告必须通过。当 `main` 在机器人推送落地之前推进时，该通道会对验证后的补丁进行变基，重新运行 `pnpm check:changed`，并重试推送；冲突的过时补丁将被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的 drop-sudo 安全姿态。

### 合并后的重复 PR

`Duplicate PRs After Merge` 工作流是一个用于合并后重复清理的手动维护者工作流。它默认为试运行，并且仅在 `apply=true` 时关闭明确列出的 PR。在修改 GitHub 之前，它会验证已合并的 PR 已合并，并且每个重复项都有一个共享的引用 issue 或重叠的代码块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Local check gates and changed routing

本地变更通道逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。该本地检查门控在架构边界方面比广泛的 CI 平台范围更为严格：

- 核心生产环境的变更会运行 core prod、core test typecheck 以及 core lint/guards；
- 核心仅测试的变更仅运行 core test typecheck 和 core lint；
- 扩展生产环境的变更会运行 extension prod、extension test typecheck 以及 extension lint；
- 扩展仅测试的变更运行 extension test typecheck 和 extension lint；
- 公共 Plugin SDK 或 plugin-contract 的变更会扩展到 extension typecheck，因为扩展依赖于这些核心合约（Vitest extension sweeps 仍然保留为显式测试工作）；
- 仅发布元数据的版本变更会运行针对性的 version/config/root-dependency 检查；
- 未知的 root/config 变更会安全地失效到所有检查通道。

本地变更测试路由位于 `scripts/test-projects.test-support.mjs` 中，并且有意设计得比 `check:changed`DiscordSlack 更便宜：直接测试编辑会运行自身，源代码编辑优先使用显式映射，然后是同级测试和导入图依赖项。共享群组房间投递配置是显式映射之一：对群组可见回复配置、源回复投递模式或消息工具系统提示的更改，会通过 core 回复测试以及 Discord 和 Slack 投递回归，因此共享默认值的更改会在首次 PR 推送之前失败。仅当更改范围足够广泛，导致廉价的映射集不是可信赖的代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是仓库拥有的远程盒包装器，用于维护者 Linux 验证。当检查对于本地编辑循环来说过于广泛、当 CI 一致性很重要，或者当验证需要密钥、Docker、包通道、可重用盒或远程日志时，请从仓库根目录使用它。正常的 OpenClaw 后端是 LinuxDockerOpenClaw`blacksmith-testbox`Hetzner；拥有的 AWS/Hetzner 容量是 Blacksmith 故障、配额问题或显式拥有容量测试时的后备方案。

由 Crabbox 支持的 Blacksmith 运行预热、认领、同步、运行、报告以及清理一次性 Testbox。当必需的根文件（如 `pnpm-lock.yaml`）消失或 `git status --short` 显示至少 200 个跟踪的删除项时，内置的同步完整性检查会快速失败。对于有意进行大量删除的 PR，请为远程命令设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

如果本地的 Blacksmith CLI 调用处于同步阶段超过五分钟且没有同步后输出，Crabbox 也会将其终止。设置 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可禁用该保护，或者对于异常大的本地差异，使用更大的毫秒值。

在首次运行之前，请从仓库根目录检查包装脚本：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

如果 Crabbox 二进制文件未声明 `blacksmith-testbox`，仓库包装脚本将拒绝使用它。即使 `.crabbox.yaml` 拥有自有云的默认值，也请显式传递提供商。在 Codex 工作树或链接/稀疏检出中，请避免使用本地的 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动之前协调依赖项；请改为直接调用 node 包装脚本：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

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

阅读最终的 JSON 摘要。有用的字段包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。由 Blacksmith 支持的一次性 Crabbox 运行应自动停止 Testbox；如果运行被中断或清理情况不明，请检查正在运行的 box 并仅停止您创建的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

仅当您有意需要在同一个已水合的 box 上运行多个命令时，才使用重用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障层但 Blacksmith 本身工作正常，则直接使用 Blacksmith 仅进行 `list`、`status` 和清理等诊断。在将直接运行的 Blacksmith 视为维护者证明之前，请修复 Crabbox 路径。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 正常工作，但新的
warmups 在几分钟后仍处于 `queued` 状态且没有 IP 或 Actions 运行 URL，
请将其视为 Blacksmith 提供商、队列、计费或组织限制的压力。停止
你创建的已排队 ID，避免启动更多 Testbox，并在有人检查 Blacksmith 仪表板、
计费和组织限制的同时，将验证移至下面拥有的 Crabbox 容量路径。

仅当 Blacksmith 宕机、配额受限、缺少所需环境或明确目标是拥有容量时，才升级到拥有的 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 压力下，除非任务确实需要 48xlarge 级别的 CPU，否则避免使用 `class=beast`。`beast` 请求从 192 个 vCPU 开始，并且是触发区域 EC2 Spot 或按需标准配额的最简单方式。仓库拥有的 `.crabbox.yaml` 默认为 `standard`、多个容量区域和 `capacity.hints: true`，因此代理的 AWS 租赁会打印选定的区域/市场、配额压力、Spot 回退以及高压力类警告。对更繁重的广泛检查使用 `fast`，仅在标准/快速不够用时使用 `large`，并且仅对异常的 CPU 密集型通道（如全套件或所有插件 Docker 矩阵、明确的发布/阻止程序验证或高核心性能分析）使用 `beast`。不要对 `pnpm check:changed`、专注测试、仅文档工作、普通 lint/typecheck、小型 E2E 复现或 Blacksmith 故障排除使用 `beast`。使用 `--market on-demand` 进行容量诊断，以免 Spot 市场波动混入信号。

`.crabbox.yaml`GitHub 拥有 owned-cloud 路道的提供商、同步和 GitHub Actions 补水默认配置。它排除本地 `.git`，以便补水的 Actions 检出保留其自己的远程 Git 元数据，而不是同步维护者本地的远程仓库和对象存储；它还排除绝不应传输的本地运行时/构建产物。`.github/workflows/crabbox-hydrate.yml` 拥有检出、Node/pnpm 设置、`origin/main` 获取以及用于 owned-cloud `crabbox run --id <cbx_id>` 命令的非机密环境交接。

## 相关

- [安装概述](/zh/install)
- [开发频道](/zh/install/development-channels)
