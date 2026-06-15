---
summary: "CI 作业图、作用域门控、发布覆盖范围以及本地命令等效项"
title: "CI 流水线"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 OpenClaw`main` 和每次拉取请求时运行。`preflight` 作业会对差异进行分类，并在仅更改了不相关区域时关闭昂贵的通道。手动 `workflow_dispatch`Android 运行会故意绕过智能作用域，并为发布候选版本和广泛验证展开全图。Android 通道通过 `include_android` 保持选择性加入。仅限发布的插件覆盖范围位于独立的 [`Plugin Prerelease`](#plugin-prerelease) 工作流中，并且仅从 [`Full Release Validation`](#full-release-validation) 或显式手动调度运行。

## 流水线概述

| 作业                               | 目的                                                                          | 运行时机                     |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                        | 检测仅文档更改、更改的范围、更改的扩展，并构建 CI 清单                        | 在非草稿推送和 PR 上始终运行 |
| `security-fast`                    | 私钥检测、通过 `zizmor` 进行的工作流更改审计以及生产环境锁定文件审计          | 在非草稿推送和 PR 上始终运行 |
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

1. `preflight` 决定哪些通道存在。`docs-scope` 和 `changed-scope` 逻辑是该作业内部的步骤，而非独立作业。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 会快速失败，无需等待更繁重的工件和平台 Matrix 作业。
3. `build-artifacts` 与快速的 Linux 通道重叠，以便下游使用者在共享构建准备就绪后立即开始。
4. 在此之后，更繁重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-core-*`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

当新的推送到达同一 PR 或 `main` 引用时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一引用的最新运行也失败了，否则请将其视为 CI 噪音。Matrix 作业使用 `fail-fast: false`，而 `build-artifacts` 会直接报告嵌入式渠道、核心支持边界和网关监视失败，而不是排队微小的验证作业。自动 CI 并发键已版本化（`CI-v7-*`），因此 GitHub 端的旧队列组中的僵尸程序无法无限期阻塞较新的 main 运行。手动全套件运行使用 `CI-manual-v1-*` 并且不会取消正在进行的运行。

使用 `pnpm ci:timings`、`pnpm ci:timings:recent` 或 `node scripts/ci-run-timings.mjs <run-id>` 来总结 GitHub Actions 的挂钟时间、排队时间、最慢作业、失败情况和 `pnpm-store-warmup` 展开屏障。CI 还会将相同的运行摘要作为 `ci-timings-summary` 工件上传。对于构建计时，请检查 `build-artifacts` 作业的 `Build dist` 步骤：`pnpm build:ci-artifacts` 打印 `[build-all] phase timings:` 并包含 `ui:build`；该作业还会上传 `startup-memory` 工件。

对于拉取请求运行，终端 timing-summary 任务会在将 `GH_TOKEN` 传递给 `gh run view` 之前，从受信任的基础版本运行辅助程序。这样可以确保带令牌的查询不包含在分支控制的代码中，同时仍能汇总拉取请求的当前 CI 运行情况。

## 实际行为证明

外部贡献者的 PR 会从 `.github/workflows/real-behavior-proof.yml` 运行 `Real behavior proof` 门控。该工作流检出受信任的基础提交并仅评估 PR 主体；它不执行来自贡献者分支的代码。

此门控适用于非仓库所有者、成员、协作者或机器人的 PR 作者。当 PR 主体包含填写了以下值的 `Real behavior proof` 部分时，该检查通过：

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

证据必须显示补丁在真实 OpenClaw 设置中更改后的行为。屏幕截图、录制、终端捕获、控制台输出、复制的实时输出、编辑过的运行时日志以及链接的工件都算作证据。单元测试、模拟、快照、Lint、类型检查和 CI 结果是有用的辅助验证，但它们本身不能满足此关卡的要求。

检查失败时，请更新 PR 主体，而不是推送另一个代码提交。仅当证明门控不应适用于该 PR 时，维护者才可以应用 `proof: override`。

## 范围和路由

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。手动分发跳过变更作用域检测，并使预检清单表现得就像每个作用域区域都发生了更改一样。

- **CI 工作流编辑** 验证 Node CI 图和工作流 Lint，但不会单独强制 Windows、Android 或 macOS 原生构建；这些平台通道的范围仍限于平台源代码更改。
- **Workflow Sanity** 对所有工作流 YAML 文件运行 `actionlint`、`zizmor`、复合操作插值守卫和冲突标记守卫。PR 作用域的 `security-fast` 任务还会对变更的工作流文件运行 `zizmor`，以便工作流安全发现能够在主 CI 图中尽早失败。
- **针对 `main` 推送的文档** 由独立的 `Docs`ClawHub 工作流进行检查，该工作流使用与 CI 相同的 ClawHub 文档镜像，因此混合的代码+文档推送不会排队 CI `check-docs` 分片。当文档发生更改时，拉取请求和手动 CI 仍会从 CI 运行 `check-docs`。
- **TUI PTY** 是一个专注于 TUI 更改的工作流。它在 Linux Node 24 上运行 TUITUI`node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`Linux，用于 `src/tui/**`、监视工具、package 脚本、lockfile 和工作流编辑。必选 lane 使用确定性的 `TuiBackend` fixture；较慢的 `tui --local` smoke 是通过 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 选入的，并且仅模拟外部模型端点。
- **CI 仅路由编辑、选定的低成本 core-test fixture 编辑以及窄插件契约 helper/test-routing 编辑** 使用仅 Node 的快速清单路径：`preflight`、安全性以及单个 `checks-fast-core` 任务。当更改仅限于 fast task 直接练习的路由或 helper surface 时，该路径会跳过构建产物、Node 22 兼容性、渠道契约、完整 core 分片、bundled-plugin 分片以及额外的 guard 矩阵。
- **Windows Node 检查** 的范围限定于 Windows 特定的进程/路径包装器、npm/pnpm/UI runner helper、包管理器配置以及执行该 lane 的 CI workflow surface；不相关的源码、插件、install-smoke 和仅测试更改仍保留在 Linux Node lane 上。

最慢的 Node 测试套件被拆分或平衡，以便每个作业保持较小规模而不过度预留运行器：插件合约和渠道合约各自作为两个加权的 Blacksmith 支持的分片运行，并带有标准的 GitHub 运行器后备方案，核心单元快速/支持通道单独运行，核心运行时基础架构在状态、进程/配置、共享和三个 cron 域分片之间拆分，自动回复作为平衡的工作程序运行（将回复子树拆分为 agent-runner、dispatch 和 commands/state-routing 分片），代理 gateway/server 配置拆分到 chat/auth/模型/http-plugin/runtime/startup 通道中，而不是等待构建产物。广泛的浏览器、QA、媒体和其他插件测试使用其专用的 Vitest 配置，而不是共享的插件通用配置。Include-pattern 分片使用 CI 分片名称记录计时条目，因此 `.artifacts/vitest-shard-timings.json` 可以区分整个配置和过滤后的分片。`check-additional-*` 将包边界编译/金丝雀工作保持在一起，并将运行时拓扑架构与 gateway 监视覆盖范围分开；边界守护列表被划分为一个侧重提示的分片和一个合并剩余守护条带的分片，每个分片并发运行选定的独立守护并打印每次检查的计时。昂贵的 Codex 快乐路径提示快照偏差检查作为单独的额外作业运行，仅针对手动 CI 和影响提示的更改，因此正常的不相关 Node 更改不会在冷提示快照生成后等待，边界分片保持平衡，同时提示偏差仍然固定导致它的 PR；相同的标志跳过构建产物核心支持边界分片内部的提示快照 Vitest 生成。Gateway(网关) 监视、渠道测试和核心支持边界分片在 `build-artifacts` 内部并发运行，前提是 `dist/` 和 `dist-runtime/` 已经构建。

Android CI 同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play 调试版 APK。第三方 flavor 没有单独的源代码集或清单文件；其单元测试通道仍然使用 SMS/通话日志 BuildConfig 标志编译该 flavor，同时在每次与 Android 相关的推送时避免重复的调试版 APK 打包任务。

`check-dependencies` 分片运行 `pnpm deadcode:dependencies`（这是一个固定到最新 Knip 版本的生产环境 Knip 仅依赖检查，并在 `dlx` 安装时禁用了 pnpm 的最低发布年龄限制）和 `pnpm deadcode:unused-files`，后者将 Knip 的生产环境未使用文件检查结果与 `scripts/deadcode-unused-files.allowlist.mjs` 进行比较。当 PR 添加了新的未经审查的未使用文件或保留了过时的允许列表条目时，未使用文件守卫将失败，同时保留 Knip 无法静态解析的有意的动态插件、生成代码、构建、实时测试和包桥接层。

## ClawSweeper 活动转发

`.github/workflows/clawsweeper-dispatch.yml` 是从 OpenClaw 仓库活动到 ClawSweeper 的目标端桥接。它不会检出或执行不受信任的拉取请求代码。该工作流从 `CLAWSWEEPER_APP_PRIVATE_KEY` 创建一个 GitHub App 令牌，然后将紧凑的 `repository_dispatch` 负载分发给 `openclaw/clawsweeper`。

该工作流有四个通道：

- `clawsweeper_item` 用于精确的 issue 和拉取请求审查请求；
- `clawsweeper_comment` 用于 issue 评论中的显式 ClawSweeper 命令；
- `clawsweeper_commit_review` 用于 `main` 推送上的提交级审查请求；
- `github_activity` 用于 ClawSweeper 代理可能检查的一般 GitHub 活动。

`github_activity` 通道仅转发标准化元数据：事件类型、操作、执行者、仓库、项目编号、URL、标题、状态，以及（如果存在）评论或审核的简短摘录。它有意避免转发完整的 webhook 主体。`openclaw/clawsweeper` 中的接收工作流是 `.github/workflows/github-activity.yml`，它会将标准化事件发布到 OpenClaw Gateway(网关) hook，供 ClawSweeper 代理使用。

常规活动属于观察，而非默认投递。ClawSweeper 代理在其提示中接收 Discord 目标，仅当事件令人惊讶、可执行、有风险或具有运营效用时，才应发布到 `#clawsweeper`。常规的打开、编辑、机器人轮替、重复 webhook 噪音以及正常的审核流量应导致 `NO_REPLY`。

在此路径的整个过程中，应将 GitHub 标题、评论、正文、审核文本、分支名称和提交消息视为不受信任的数据。它们是用于总结和分类的输入，而非工作流或代理运行时的指令。

## 手动调度

手动 CI 调度运行与正常 CI 相同的作业图，但会强制启用每个非 Android 范围的通道：Linux Node 分片、bundled-plugin 分片、plugin 和 渠道 contract 分片、Node 22 兼容性、`check-*`、`check-additional-*`、构建产物冒烟测试、文档检查、Python 技能、Windows、macOS 以及 Control UI i18n。独立的手动 CI 调度仅使用 `include_android=true` 运行 Android；完整的发布保护伞通过传递 `include_android=true` 启用 Android。插件预发布静态检查、仅限发布的 `agentic-plugins` 分片、完整的扩展批次扫描以及插件预发布 Docker 通道不包括在 CI 中。Docker 预发布套件仅在 `Full Release Validation` 调度启用 release-validation 门的独立 `Plugin Prerelease` 工作流时运行。

手动运行使用唯一的并发组，以便同一引用上的另一次推送或 PR 运行不会取消发布候选项的全套测试。可选的 `target_ref` 输入允许受信任的调用者针对分支、标签或完整提交 SHA 运行该图，同时使用所选调度引用中的工作流文件。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 运行器

| 运行器                           | 作业                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | 手动 CI 调度和非规范仓库回退、workflow-sanity、labeler、自动响应、CI 之外的文档工作流，以及 install-smoke 预检，以便 Blacksmith 矩阵可以更早排队                                                          |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`preflight`、`security-fast`、较低权重的扩展分片、`checks-fast-core`、插件/渠道合约分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 和 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux Node 测试分片、捆绑插件测试分片、`check-additional-*` 分片、`check-dependencies` 和 `android`                                                                                                       |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（对 CPU 足够敏感，以至于 8 vCPU 的成本超过了它们节省的成本）；install-smoke Docker 构建（32 vCPU 排队时间成本超过了它节省的成本）                                         |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                          |
| `blacksmith-6vcpu-macos-15`      | `openclaw/openclaw` 上的 `macos-node`；fork 回退到 `macos-15`                                                                                                                                             |
| `blacksmith-12vcpu-macos-26`     | `openclaw/openclaw` 上的 `macos-swift`；fork 回退到 `macos-26`                                                                                                                                            |

规范仓库 CI 在正常的推送和拉取请求运行中将 Blacksmith 保持为默认运行器路径。`workflow_dispatch` 和非规范仓库运行使用 GitHub 托管的运行器，但正常的规范运行目前不会探测 Blacksmith 队列健康状况，也不会在 Blacksmith 不可用时自动回退到 GitHub 托管的标签。

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
pnpm test:startup:memory
pnpm test:extensions:memory -- --json .artifacts/openclaw-performance/source/mock-provider/extension-memory.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 性能

`OpenClaw Performance` 是产品/运行时性能工作流。它每天在 `main` 上运行，并且可以手动调度：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手动调度通常对工作流引用进行基准测试。设置 `target_ref` 可以使用当前工作流实现对发布标记或其他分支进行基准测试。已发布的报告路径和最新指针由被测引用键控，并且每个 `index.md` 都会记录被测引用/SHA、工作流引用/SHA、Kova 引用、配置文件、通道授权模式、模型、重复计数和场景过滤器。

该工作流从固定发布版本安装 OCM，并从 `openclaw/Kova` 安装 Kova，位于固定的 `kova_ref` 输入处，然后运行三个通道：

- `mock-provider`：针对本地构建运行时的 Kova 诊断场景，具有确定性的虚假 OpenAI 兼容身份验证。
- `mock-deep-profile`：针对启动、网关和代理轮次热点的 CPU/堆/跟踪分析。
- `live-openai-candidate`：一次真实的 OpenAI `openai/gpt-5.5` 代理轮次，当 `OPENAI_API_KEY` 不可用时跳过。

模拟提供商通道还在 Kova 通过后运行 OpenClaw 原生源探测器：默认、hook 和 50 插件启动情况下的网关启动时间和内存；捆绑插件导入 RSS，针对已启动网关的重复模拟 OpenAI `channel-chat-baseline` hello 循环，以及 CLI 启动命令。当被测引用有先前发布的模拟提供商源报告可用时，源摘要会将当前 RSS 和堆值与该基线进行比较，并将 RSS 的大幅增加标记为 `watch`。源探测器 Markdown 摘要位于报告包中的 `source/index.md`，旁边有原始 JSON。

每个流水线上传 GitHub 构件。当配置了 GitHub`CLAWGRIT_REPORTS_TOKEN` 时，工作流还会将 `report.json`、`report.md`、bundles、`index.md` 和 source-probe 构件提交到 `openclaw/clawgrit-reports` 下的 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 中。当前测试的 ref 指针被写入为 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整发布验证

`Full Release Validation` 是“发布前运行所有内容”的手动总控工作流。它接受分支、标签或完整的提交 SHA，使用该目标调度手动 `CI` 工作流，为仅发布插件/包/静态/Docker 验证调度 `Plugin Prerelease`Docker，并为安装冒烟测试、包验收、跨操作系统包检查、QA Lab 一致性、Matrix 和 Telegram 通道调度 `OpenClaw Release Checks`MatrixTelegramDocker。稳定/默认运行将详尽的实时/E2E 和 Docker 发布路径覆盖保留在 `run_release_soak=true` 之后；`release_profile=full` 强制执行该 soak 覆盖，以便广泛的建议性验证保持广泛。通过 `rerun_group=all` 和 `release_profile=full`，它还会针对发布检查中的 `release-package-under-test` 构建产物运行 `NPM Telegram Beta E2E`。发布后，传递 `release_package_spec`npmDockerTelegram 以跨发布检查、包验收、Docker、跨操作系统和 Telegram 重复使用已发布的 npm 包，而无需重新构建。仅当 Telegram 必须验证不同的包时才使用 `npm_telegram_package_spec`Telegram。Codex 插件实时包通道默认使用相同的选定状态：已发布的 `release_package_spec=openclaw@<tag>` 派生 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/构建产物运行则从选定的引用打包 `extensions/codex`。对于自定义插件源（例如 `npm:`、`npm-pack:` 或 `git:` 规范），请显式设置 `codex_plugin_spec`。

有关阶段矩阵、确切的工作流作业名称、配置文件差异、构建产物和重点重新运行句柄，请参阅[完整发布验证](/zh/reference/full-release-validation)。

`OpenClaw Release Publish` 是手动变基发布工作流。在发布标签存在且 OpenClaw npm 预检成功后，从 `release/YYYY.M.D` 或 `main` 调度它。它会验证 `pnpm plugins:sync:check`，为所有可发布的插件包调度 `Plugin NPM Release`，为同一发布 SHA 调度 `Plugin ClawHub Release`，然后才使用保存的 `preflight_run_id` 调度 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

对于快速移动分支上的固定提交证明，请使用该辅助工具，而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub 工作流调度引用必须是分支或标签，而不是原始提交 SHA。该辅助工具会在目标 SHA 处推送一个临时的 `release-ci/<sha>-...` 分支，从该固定引用调度 `Full Release Validation`，验证每个子工作流 `headSha` 是否与目标匹配，并在运行完成时删除临时分支。如果任何子工作流在不同的 SHA 上运行，总体验证器也会失败。

`release_profile` 控制传递给发布检查的实时/提供商范围。手动发布工作流默认为 `stable`；仅当您有意需要广泛的 advisory 提供商/media 矩阵时才使用 `full`。`run_release_soak` 控制稳定/默认发布检查是否运行详尽的实时/E2E 和 Docker 发布路径 soak；`full` 强制开启 soak。

- `minimum` 仅保留最快的 OpenAI/core 发布关键通道。
- `stable` 添加稳定的 提供商/backend 集合。
- `full` 运行广泛的 advisory 提供商/media 矩阵。

总体验证器会记录已调度的子运行 ID，最终的 `Verify full validation` 作业会重新检查当前子运行结论，并为每个子运行附加最慢作业表。如果子工作流被重新运行并变为通过（绿色），请仅重新运行父验证器作业以刷新总体验证结果和时间摘要。

为了恢复，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。对于发布候选版本，请使用 `all`；对于仅限常规完整 CI 子项，使用 `ci`；对于仅限插件预发布子项，使用 `plugin-prerelease`；对于所有发布子项，使用 `release-checks`；或者在汇总上使用更窄的组：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。这确保了在进行针对性修复后，失败的发布框重新运行的范围是有限的。对于单个失败的跨操作系统通道，请将 `rerun_group=cross-os` 与 `cross_os_suite_filter` 结合使用，例如 `windows/packaged-upgrade`OpenClaw；长跨操作系统命令会发出心跳行，并且打包升级摘要包含分阶段计时。QA 发布检查通道是建议性的，但标准运行时工具覆盖率门控除外，当必需的 OpenClaw 动态工具从标准层级摘要中漂移或消失时，该门控会阻塞。

`OpenClaw Release Checks` 使用受信任的工作流引用将选定的引用一次解析为 `release-package-under-test`Dockernpm 压缩包，然后将该构件传递给跨操作系统检查和包验收，以及在运行浸泡覆盖时的实时/E2E 发布路径 Docker 工作流。这确保了发布框之间的包字节一致，并避免了在多个子作业中重新打包相同的候选版本。对于 Codex npm-plugin 实时通道，发布检查要么传递源自 `release_package_spec` 的匹配已发布插件规范，要么传递操作员提供的 `codex_plugin_spec`Docker，要么将输入留空，以便 Docker 脚本打包所选检出内容的 Codex 插件。

针对 `ref=main` 和 `rerun_group=all` 的重复 `Full Release Validation` 运行会取代旧的整体运行。当父级被取消时，父级监视器会取消它已调度的任何子工作流，因此较新的 main 验证不会排在过时的两小时 release-check 运行之后。Release 分支/tag 验证和 focused rerun 组保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

release live/E2E 子级保持广泛的 native `pnpm test:live` 覆盖率，但它通过 `scripts/test-live-shard.mjs` 作为命名分片运行，而不是作为一个串行作业：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 提供商过滤的 `native-live-src-gateway-profiles` 作业
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 拆分媒体音频/视频分片和提供商过滤的音乐分片

在保持相同文件覆盖率的同时，这使得缓慢的 live 提供商故障更容易重新运行和诊断。汇总的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名称对于手动单次重新运行仍然有效。

Native live media 分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中运行，由 `Live Media Runner Image` 工作流构建。该镜像预装了 `ffmpeg` 和 `ffprobe`DockerDocker；媒体作业仅在设置前验证二进制文件。将 Docker 支持的 live 套件保留在普通的 Blacksmith 运行器上 —— 容器作业不是启动嵌套 Docker 测试的正确场所。

Docker 支持的实时模型/后端分片针对每个选定的提交使用一个单独的共享 Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI 镜像。实时发布工作流构建并推送该镜像一次，然后 Docker 实时模型、提供商分片的 Gateway、CLI 后端、ACP 绑定和 Codex 工具分片使用 `OPENCLAW_SKIP_DOCKER_BUILD=1`Gateway(网关)Docker 运行。Gateway Docker 分片在工作流作业超时之前设置了明确的脚本级别 `timeout`Docker 上限，以便卡住的容器或清理路径能够快速失败，而不是消耗整个发布检查预算。如果这些分片独立重建完整的源 Docker 目标，则表示发布运行配置错误，并将因重复的镜像构建而浪费实际时间。

## 包验收

当问题是“这个可安装的 OpenClaw 包是否作为产品正常工作？”时，请使用 `Package Acceptance`OpenClawDocker。这与常规 CI 不同：常规 CI 验证源代码树，而包验收通过用户在安装或更新后使用的同一 Docker E2E 工具来验证单个 tarball。

### 作业

1. `resolve_package` 检出 `workflow_ref`，解析一个包候选项，写入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，写入 `.artifacts/docker-e2e-package/package-candidate.json`，将两者作为 `package-under-test`GitHub 构件上传，并在 GitHub 步骤摘要中打印源代码、工作流引用、包引用、版本、SHA-256 和配置文件。
2. `docker_acceptance` 使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`DockerDocker 调用 `openclaw-live-and-e2e-checks-reusable.yml`。可复用工作流会下载该产物，验证 tarball 清单，在需要时准备 package-digest Docker 镜像，并针对该包运行选定的 Docker 通道，而不是打包工作流检出内容。当配置文件选择了多个目标 `docker_lanes`Docker 时，可复用工作流会准备一次包和共享镜像，然后将这些通道作为并行的目标 Docker 作业分发出去，并附带唯一的产物。
3. `package_telegram` 可选择调用 `NPM Telegram Beta E2E`。当 `telegram_mode` 不为 `none` 时运行，并且在包验收解析出一个时安装相同的 `package-under-test`Telegramnpm 产物；独立的 Telegram 调度仍可安装已发布的 npm 规范。
4. 如果包解析、Docker 验收或可选的 Telegram 通道失败，`summary`DockerTelegram 将使工作流失败。

### 候选来源

- `source=npm` 仅接受 `openclaw@beta`、`openclaw@latest`OpenClaw 或确切的 OpenClaw 发布版本（例如 `openclaw@2026.4.27-beta.2`）。将其用于已发布的预发布/稳定版验收。
- `source=ref` 打包受信任的 `package_ref`OpenClaw 分支、标签或完整提交 SHA。解析器会获取 OpenClaw 分支/标签，验证所选提交可从仓库分支历史或发布标签访问，在独立工作树中安装依赖，并使用 `scripts/package-openclaw-for-docker.mjs` 进行打包。
- `source=url` 下载公共 HTTPS `.tgz`；需要 `package_sha256`。此路径拒绝 URL 凭据、非默认 HTTPS 端口、私有/内部/专用主机名或解析的 IP，以及超出同一公共安全策略的重定向。
- `source=trusted-url` 从 `.github/package-trusted-sources.json` 中命名受信任源策略下载一个 HTTPS `.tgz`；`package_sha256` 和 `trusted_source_id` 是必需的。请仅将此用于维护者拥有的企业镜像或需要配置主机、端口、路径前缀、重定向主机或专用网络解析的私有包存储库。如果策略声明了 bearer auth，工作流将使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密钥；仍然拒绝 URL 中嵌入的凭据。
- `source=artifact` 从 `artifact_run_id` 和 `artifact_name` 下载一个 `.tgz`；`package_sha256` 是可选的，但对于外部共享的制品应该提供。

请将 `workflow_ref` 和 `package_ref` 分开。`workflow_ref` 是运行测试的受信任工作流/测试框架代码。`package_ref` 是当 `source=ref` 时被打包的源提交。这允许当前的测试框架验证较旧的受信任源提交，而无需运行旧的工作流逻辑。

### 套件配置

- `smoke` — `npm-onboard-channel-agent`，`gateway-network`，`config-reload`
- `package` — `npm-onboard-channel-agent`，`doctor-switch`，`update-channel-switch`，`skill-install`，`update-corrupt-plugin`，`upgrade-survivor`，`published-upgrade-survivor`，`update-restart-auth`，`plugins-offline`，`plugin-update`
- `product` — `package` 加上 `mcp-channels`，`cron-mcp-cleanup`，`openai-web-search-minimal`，`openwebui`
- `full`Docker — 包含 OpenWebUI 的完整 Docker 发布路径块
- `custom` — 精确的 `docker_lanes`；当 `suite_profile=custom` 时是必需的

`package` 配置文件使用离线插件覆盖率，因此已发布包的验证不依赖于在线 ClawHub 的可用性。可选的 Telegram 通道在 `NPM Telegram Beta E2E` 中复用 `package-under-test` 构件，并保留已发布的 npm 规范路径用于独立分发。

有关专门的更新和插件测试策略，包括本地命令、Docker 通道、Package Acceptance 输入、发布默认设置和故障分类，请参阅 [Testing updates and plugins](/zh/help/testing-updates-plugins)。

发布检查使用 `source=artifact`、准备好的发布包工件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai`ClawHubTelegram 调用 Package Acceptance。这将确保包迁移、更新、实时 ClawHub 技能安装、过期插件依赖清理、配置插件安装修复、离线插件、插件更新以及 Telegram 验证都在同一个已解析的包 tarball 上进行。在发布 beta 版本后，在 Full Release Validation 或 OpenClaw Release Checks 上设置 `release_package_spec`OpenClawnpm，以便在不重新构建的情况下，针对已发布的 npm 包运行相同的矩阵；仅当 Package Acceptance 需要与发布验证的其余部分不同的包时，才设置 `package_acceptance_package_spec`。跨操作系统发布检查仍然涵盖特定于操作系统的 新手引导（新手引导）、安装程序和平台行为；包/更新产品验证应从 Package Acceptance 开始。`published-upgrade-survivor`Docker Docker 通道在阻塞发布路径中每次运行验证一个已发布的包基线。在 Package Acceptance 中，已解析的 `package-under-test` tarball 始终是候选者，而 `published_upgrade_survivor_baseline` 选择回退已发布基线，默认为 `openclaw@latest`；失败通道重新运行命令会保留该基线。带有 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 会设置 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`npmOpenClawDocker，以扩展到最新的四个稳定 npm 发布版本，加上固定的插件兼容性边界版本，以及针对飞书配置、保留的 bootstrap/persona 文件、配置的 OpenClaw 插件安装、波浪号日志路径和陈旧的传统插件依赖根目录的基于问题的固定装置。多基线已发布升级幸存者选择会按基线分片到单独的定向 Docker 运行器作业中。单独的 `Update Migration` 工作流使用 `update-migration`Docker Docker 通道，配合 `all-since-2026.4.23` 和 `plugin-deps-cleanup`，当问题是详尽的已发布更新清理，而不是正常的 Full Release CI 范围时。本地聚合运行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 传递确切的包规范，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保留单个通道（例如 `openclaw@2026.4.15`），或者为场景矩阵设置 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已发布通道使用内置的 `openclaw config set` 命令配方配置基线，在 `summary.json` 中记录配方步骤，并在 Gateway(网关) 启动后探测 `/healthz`、`/readyz`RPCGateway(网关)WindowsWindowsOpenAI 以及 RPC 状态。Windows 打包和安装程序全新通道还验证已安装的包是否可以从原始绝对 Windows 路径导入浏览器控制覆盖。OpenAI 跨操作系统代理轮次烟雾测试在设置时默认为 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否则为 `openai/gpt-5.5`，因此安装和网关验证保持在 GPT-5 测试模型上，同时避免 GPT-4.x 默认值。

### 旧版兼容性窗口

Package Acceptance 对已发布的软件包具有有限的旧版兼容性窗口。截止到 `2026.4.25` 的软件包，包括 `2026.4.25-beta.*`，可能会使用兼容性路径：

- `dist/postinstall-inventory.json` 中已知的私有 QA 条目可能会指向已从 tarball 中省略的文件；
- 当软件包未公开该标志时，`doctor-switch` 可能会跳过 `gateway install --wrapper` 持久化子情况；
- `update-channel-switch` 可能会从源自 tarball 的假 git fixture 中修剪缺失的 pnpm `patchedDependencies`，并可能会记录缺失的持久化 `update.channel`；
- 插件冒烟测试可能会读取旧版安装记录位置，或接受缺失的 marketplace 安装记录持久化；
- `plugin-update` 可能允许配置元数据迁移，同时仍要求安装记录和 no-reinstall 行为保持不变。

已发布的 `2026.4.26` 软件包也可能会对已附带的本地构建元数据标记文件发出警告。后续的软件包必须满足现代约定；相同条件将失败而不是警告或跳过。

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

调试失败的软件包验收运行时，请从 `resolve_package` 摘要开始，以确认软件包源、版本和 SHA-256。然后检查 `docker_acceptance`Docker 子运行及其 Docker 制品：`.artifacts/docker-tests/**/summary.json`、`failures.json`Docker、lane 日志、阶段计时和重新运行命令。最好重新运行失败的软件包配置文件或确切的 Docker lane，而不是重新运行完整的发布验证。

## 安装冒烟测试

单独的 `Install Smoke` 工作流通过其自己的 `preflight` 作业重用相同的范围脚本。它将冒烟测试覆盖范围分为 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- 针对涉及 Docker/package 表面、捆绑插件 package/manifest 更改，或 Docker smoke job 测试的核心插件/渠道/gateway/Plugin SDK 表面的拉取请求，运行“快速路径”。仅限源代码的捆绑插件更改、仅测试编辑和仅文档编辑不预留 Docker worker。快速路径构建一次根 Dockerfile 镜像，检查 CLI，运行 agents delete shared-workspace CLI smoke，运行 container gateway-network e2e，验证捆绑的扩展 build arg，并在 240 秒的聚合命令超时下运行有界的捆绑插件 Docker 配置文件（每个场景的 Docker run 单独设置上限）。
- **完整路径** 为夜间计划运行、手动分发、workflow-call release 检查以及真正触及 installer/package/Docker 表面的拉取请求保留 QR package install 和 installer Docker/update 覆盖率。在完整模式下，install-smoke 准备或重用一个 target-SHA GHCR root Dockerfile smoke 镜像，然后作为单独的作业运行 QR package install、root Dockerfile/gateway smokes、installer/update smokes 和快速捆绑插件 Docker E2E，以便 installer 工作不必等待 root image smokes。

`main` 推送（包括合并提交）不会强制执行完整路径；当 changed-scope 逻辑在推送时请求完整覆盖时，工作流保留快速 Docker smoke 并将完整的 install smoke 留给夜间或 release validation。

缓慢的 Bun global install image-提供商 smoke 由 `run_bun_global_install_smoke` 单独控制。它在夜间计划中以及从 release checks 工作流运行，并且手动 `Install Smoke` 分发可以选择加入，但拉取请求和 `main` 推送不会。正常的 PR CI 仍然会针对 Node 相关的更改运行快速 Bun launcher 回归通道。QR 和 installer Docker 测试保留自己专注于安装的 Dockerfiles。

## 本地 Docker E2E

`pnpm test:docker:all` 预构建一个共享的实时测试镜像，将 OpenClaw 打包一次为 npm tarball，并构建两个共享的 `scripts/e2e/Dockerfile` 镜像：

- 一个用于安装程序/更新/插件依赖通道的基础 Node/Git 运行器；
- 一个将相同的 tarball 安装到 `/app` 中的功能性镜像，用于正常功能通道。

Docker 通道定义位于 `scripts/lib/docker-e2e-scenarios.mjs`，规划器逻辑位于 `scripts/lib/docker-e2e-plan.mjs`，而运行器仅执行选定的计划。调度器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 为每个通道选择镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行通道。

### 可调参数

| 变量                                   | 默认值  | 用途                                                                         |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 正常通道的主池插槽数。                                                       |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 对提供商敏感的尾部池插槽数。                                                 |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 并发实时通道上限，以防止提供商进行限流。                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 并发 npm install 通道上限。                                                  |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 并发多服务通道上限。                                                         |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道启动之间的交错时间，以避免 Docker 守护进程创建风暴；设置 `0` 以无交错。  |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每个通道的回退超时时间（120 分钟）；选定的实时/尾部通道使用更严格的限制。    |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未设置  | `1` 打印调度器计划而不运行通道。                                             |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未设置  | 逗号分隔的确切通道列表；跳过清理冒烟测试以便代理程序可以重现一个失败的通道。 |

一条超过其有效上限的通道仍然可以从空闲池启动，然后单独运行，直到释放容量。本地聚合会预检 Docker，移除陈旧的 OpenClaw E2E 容器，发出活动通道状态，持久化通道计时以进行最长优先排序，并在默认情况下在首次失败后停止调度新的池化通道。

### 可复用的 live/E2E 工作流

可复用的 live/E2E 工作流会询问 `scripts/test-docker-all.mjs --plan-json` 需要哪些包、镜像类型、live 镜像、通道和凭证覆盖范围。`scripts/docker-e2e.mjs` 然后将该计划转换为 GitHub 输出和摘要。它要么通过 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw，要么下载当前运行的包构件，要么从 `package_artifact_run_id` 下载包构件；验证 tarball 清单；当计划需要已安装包的通道时，通过 Blacksmith 的 Docker 层缓存构建并推送带有包摘要标记的裸机/功能型 GHCR Docker E2E 镜像；并复用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 输入或现有的包摘要镜像，而不是重新构建。Docker 镜像拉取会以每次尝试 180 秒的受限超时进行重试，以便卡住的注册表/缓存流能够快速重试，而不是消耗 CI 关键路径的大部分时间。

### 发布路径分块

发布 Docker 覆盖范围使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行较小的分块作业，因此每个分块仅拉取其所需的镜像类型，并通过同一个加权调度器执行多个通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

当前发布 Docker 块包括 Docker`core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`package-update-openai`OpenClaw 包含实时 Codex 插件包通道，它安装候选 OpenClaw 包，从 `codex_plugin_spec`CLICLIOpenClawOpenAI 或具有明确 Codex CLI 安装批准的同引用 tarball 安装 Codex 插件，运行 Codex CLI 预检，然后针对 OpenAI 运行多次同会话 OpenClaw 代理轮次。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍然是聚合插件/运行时别名。`install-e2e` 通道别名仍然是两个提供商安装通道的聚合手动重新运行别名。

当完整发布路径覆盖请求时，OpenWebUI 会被合并到 `plugins-runtime-services` 中，并且仅针对仅 OpenWebUI 调度保留独立的 `openwebui`npm 块。捆绑渠道更新通道针对瞬态 npm 网络故障重试一次。

每个块会上传 `.artifacts/docker-tests/`，其中包含通道日志、计时信息、`summary.json`、`failures.json`、阶段计时、调度器计划 JSON、慢速通道表以及每个通道的重新运行命令。工作流的 `docker_lanes`DockerDockerGitHub 输入会针对准备好的镜像而不是块作业来运行选定的通道，这将失败通道的调试限制在一个定向的 Docker 作业内，并为该运行准备、下载或复用包构件；如果选定的通道是实时 Docker 通道，定向作业会为该次重新运行在本地构建实时测试镜像。生成的每个通道的 GitHub 重新运行命令包括 `package_artifact_run_id`、`package_artifact_name` 以及准备好的镜像输入（当这些值存在时），以便失败的通道能够复用失败运行中的确切包和镜像。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

计划的实时/E2E 工作流每天运行完整的发布路径 Docker 套件。

## 插件预发布

`Plugin Prerelease` 是成本更高的产品/包覆盖范围，因此它是由 `Full Release Validation` 或显式操作员调度的独立工作流。普通的拉取请求、`main`DockerDocker 推送和独立的手动 CI 调度都会使该套件保持关闭状态。它在八个扩展工作器之间平衡捆绑的插件测试；这些扩展分片作业每次最多运行两个插件配置组，每组一个 Vitest 工作器，并使用更大的 Node 堆，以免导入繁重的插件批次产生额外的 CI 作业。仅限发布的 Docker 预发布路径将定向的 Docker 通道分批成小组，以避免为一到三分钟的作业保留数十个运行器。该工作流还会从 `@openclaw/plugin-inspector` 上传信息性的 `plugin-inspector-advisory` 构件；检查器发现是分类输入，不会更改阻止的插件预发布门控。

## QA 实验室

QA Lab 在主要的智能范围工作流之外拥有专用的 CI 通道。Agentic parity 嵌套在广泛的 QA 和发布工具下，而不是独立的 PR 工作流。当 parity 应随广泛的验证运行时，请将 `Full Release Validation` 与 `rerun_group=qa-parity` 一起使用。

- `QA-Lab - All Lanes` 工作流每晚在 `main` 上运行，并在手动调度时运行；它将 mock parity 通道、实时 Matrix 通道以及实时 Telegram 和 Discord 通道作为并行作业分发。实时作业使用 `qa-live-shared` 环境，而 Telegram/Discord 使用 Convex 租约。

发布检查运行 Matrix 和 Telegram 实时传输通道，使用确定性的 mock 提供商和合格的 mock 模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`），从而将渠道合同与实时模型延迟和正常的提供商-插件启动隔离开来。实时传输网关会禁用内存搜索，因为 QA parity 单独覆盖内存行为；提供商连接性由单独的实时模型、原生提供商和 Docker 提供商套件覆盖。

Matrix 使用 `--profile fast` 进行计划和发布门控，仅在检出的 CLI 支持时才添加 `--fail-fast`。CLI 默认值和手动工作流输入保持 `all`；手动 `matrix_profile=all` 调度总是将完整的 Matrix 覆盖范围分片到 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作业中。

`OpenClaw Release Checks` 还会在发布批准之前运行对发布至关重要的 QA Lab 通道；其 QA parity 门控将候选包和基线包作为并行通道作业运行，然后将两个构件下载到一个小型报告作业中，以进行最终的 parity 比较。

对于正常的 PR，请遵循限定的 CI/检查证据，而不是将同等性视为必需状态。

## CodeQL

`CodeQL` 工作流有意设计为一个狭窄的初步安全扫描器，而非全库扫描。每日、手动和非草稿 PR 守护运行会扫描 Actions 工作流代码以及最高风险的 JavaScript/TypeScript 表面，使用高置信度的安全查询并筛选出高危/严重 `security-severity`。

PR 守护保持轻量：仅当 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下发生更改时才会启动，并且它运行与计划工作流相同的高置信度安全矩阵。Android 和 macOS 的 CodeQL 默认不在 PR 范围内。

### 安全类别

| 类别                                              | 表面                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway 基线                                             |
| `/codeql-security-high/channel-runtime-boundary`  | 核心渠道实现合约以及渠道插件运行时、gateway、Plugin SDK、secrets、审计接触点             |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、network guard、web-fetch 和 Plugin SDK SSRF 策略表面                 |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 服务器、进程执行辅助程序、出站传递以及代理工具执行网关                               |
| `/codeql-security-high/plugin-trust-boundary`     | 插件安装、加载器、清单、registry、包管理器安装、源代码加载以及 Plugin SDK 包合约信任表面 |

### 平台特定的安全分片

- `CodeQL Android Critical Security` — 计划的 Android 安全分片。在工作流健全性检查接受的最小 Blacksmith Android 运行器上，为 CodeQL 手动构建 Linux 应用。上传于 `/codeql-critical-security/android`。
- `CodeQL macOS Critical Security`macOSmacOSmacOS — 每周/手动 macOS 安全分片。在 Blacksmith macOS 上为 CodeQL 手动构建 macOS 应用，从上传的 SARIF 中过滤掉依赖项构建结果，并在 `/codeql-critical-security/macos`macOS 下上传。之所以保留在每日默认设置之外，是因为即使在干净构建的情况下，macOS 构建也会占用大部分运行时间。

### 关键质量类别

`CodeQL Critical Quality`Linux 是匹配的非安全分片。它在较小的 Blacksmith Linux 运行器上，对狭窄的高价值表面仅运行错误严重性、非安全的 JavaScript/TypeScript 质量查询。其拉取请求保护 intentionally 小于计划配置文件：非草稿 PR 仅运行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片，涵盖代理命令/模型/工具执行和回复调度代码、配置架构/迁移/IO 代码、身份验证/机密/沙盒/安全代码、核心渠道和捆绑渠道插件运行时、Gateway 协议/服务器方法、内存运行时/SDK 粘合、MCP/进程/出站交付、提供商运行时/模型目录、会话诊断/交付队列、插件加载器、Plugin SDK/包契约，或 Plugin SDK 回复运行时更改。CodeQL 配置和质量工作流更改会运行所有十二个 PR 质量分片。

手动调度接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狭窄配置文件是用于隔离运行一个质量分片的教学/迭代钩子。

| 类别                                                    | 表面                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/codeql-critical-quality/core-auth-secrets`            | 身份验证、机密、沙盒、定时任务和 Gateway 安全边界代码                                                  |
| `/codeql-critical-quality/config-boundary`              | 配置架构、迁移、规范化和 IO 契约                                                                       |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Gateway 协议架构和服务器方法契约                                                                       |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心渠道和捆绑渠道插件实现契约                                                                         |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令执行、模型/提供商分发、自动回复分发和队列，以及 ACP 控制平面运行时契约                             |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 服务器和工具桥接、进程监督辅助程序，以及出站交付契约                                               |
| `/codeql-critical-quality/memory-runtime-boundary`      | 内存主机 SDK、内存运行时门面、内存插件 SDK 别名、内存运行时激活粘合剂，以及内存医生命令                |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回复队列内部、会话传递队列、出站会话绑定/传递辅助程序、诊断事件/日志捆绑包表面，以及会话医生 CLI 契约  |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | 插件 SDK 入站回复分发、回复负载/分块/运行时辅助程序、渠道回复选项、传递队列，以及会话/线程绑定辅助程序 |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目录规范化、提供商身份验证和发现、提供商运行时注册、提供商默认/目录，以及 Web/搜索/获取/嵌入注册表 |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 引导程序、本地持久化、网关控制流，以及任务控制平面运行时契约                                   |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心 Web 获取/搜索、媒体 IO、媒体理解、图像生成，以及媒体生成运行时契约                                |
| `/codeql-critical-quality/plugin-boundary`              | 加载器、注册表、公共表面，以及插件 SDK 入口点契约                                                      |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已发布的包端插件 SDK 源代码和插件包契约辅助程序                                                        |

质量与安全保持分离，以便对质量发现进行调度、衡量、禁用或扩展，而不会掩盖安全信号。Swift、Python 和捆绑插件 CodeQL 扩展应作为范围限定或分片的后续工作重新添加，但仅限于在狭义配置文件具有稳定的运行时和信号之后。

## 维护工作流

### Docs Agent

`Docs Agent` 工作流是一个事件驱动的 Codex 维护通道，用于确保现有文档与最近的更改保持一致。它没有纯粹的调度计划：在 `main` 上成功的非 bot 推送 CI 运行可以触发它，并且可以通过手动调度直接运行它。当 `main` 已经更新，或者在过去一小时内创建了另一个未跳过的 Docs Agent 运行时，工作流运行的调用将被跳过。当它运行时，它会审查从上一次未跳过的 Docs Agent 源 SHA 到当前 `main` 的提交范围，因此一次每小时运行可以涵盖自上次文档处理以来累积的所有主要更改。

### 测试性能代理

`Test Performance Agent` 工作流是一个针对慢速测试的事件驱动 Codex 维护通道。它没有纯粹的调度计划：在 `main` 上成功的非 bot 推送 CI 运行可以触发它，但如果该 UTC 日内另一个工作流运行调用已经运行或正在运行，它将跳过。手动调度会绕过该每日活动限制。该通道构建一个完整的分组 Vitest 性能报告，让 Codex 仅进行保持覆盖率的小规模测试性能修复，而不是大规模重构，然后重新运行完整套件报告并拒绝减少通过基准测试数量的更改。分组报告记录 Linux 和 macOS 上每个配置的运行时间和最大 RSS（常驻集大小），以便前后比较在持续时间差异之外显示出测试内存差异。如果基准包含失败的测试，Codex 可能仅修复明显的故障，并且代理后的完整套件报告必须在提交任何内容之前通过。当 `main` 在 bot 推送落地之前前进时，该通道会对已验证的补丁进行变基，重新运行 `pnpm check:changed`，并重试推送；冲突的过时补丁将被跳过。它使用 GitHub 托管的 Ubuntu，以便 Codex 操作可以保持与文档代理相同的 drop-sudo 安全姿态。

### 合并后的重复 PR

`Duplicate PRs After Merge` 工作流是一个用于合并后重复清理的手动维护者工作流。它默认为试运行，只有在 `apply=true` 时才关闭明确列出的 PR。在修改 GitHub 之前，它会验证已合并的 PR，并确保每个重复项都有共享的引用 issue 或重叠的修改块。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地检查门控和变更路由

本地变更通道逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。该本地检查门控在架构边界方面比广泛的 CI 平台范围更严格：

- 核心生产变更运行核心 prod 和核心 test 类型检查，加上核心 lint/guards；
- 核心仅测试变更仅运行核心 test 类型检查，加上核心 lint；
- 扩展生产变更运行扩展 prod 和扩展 test 类型检查，加上扩展 lint；
- 扩展仅测试变更运行扩展 test 类型检查，加上扩展 lint；
- 公共 Plugin SDK 或 plugin-contract 变更会扩展到扩展类型检查，因为扩展依赖于这些核心契约（Vitest 扩展扫描保持为显式测试工作）；
- 仅版本元数据的版本号提升运行针对性的版本/config/root-dependency 检查；
- 未知的 root/config 变更会安全失效，运行所有检查通道。

本地变更测试路由位于 `scripts/test-projects.test-support.mjs` 中，并且有意设计得比 `check:changed` 更廉价：直接测试编辑运行自身，源编辑优先显式映射，然后是同级测试和导入图依赖项。共享群组房间传递配置是显式映射之一：对群组可见回复配置、源回复传递模式或消息工具系统提示的更改，会路由到核心回复测试以及 Discord 和 Slack 传递回归，以便在首次 PR 推送之前使共享默认更改失败。仅当更改范围足够广泛，导致廉价映射集不是可信的代理时，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 验证

Crabbox 是仓库拥有的用于维护者 Linux 验证的远程机器封装。当检查范围对于本地编辑循环来说过大、当 CI 一致性很重要，或者当验证需要密钥、Docker、包通道、可复用机器或远程日志时，请从仓库根目录使用它。通常的 OpenClaw 后端是 `blacksmith-testbox`；拥有的 AWS/Hetzner 容量是 Blacksmith 故障、配额问题或显式拥有容量测试时的回退方案。

由 Crabbox 支持的 Blacksmith 会运行预热、认领、同步、运行、报告以及清理一次性 Testboxes。当所需的根文件（如 `pnpm-lock.yaml`）消失，或者当 `git status --short` 显示至少 200 个跟踪删除时，内置的同步完整性检查会快速失败。对于有意进行大量删除的 PR，请为远程命令设置 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 还会终止处于同步阶段超过五分钟且没有同步后输出的本地 Blacksmith CLI 调用。设置 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 可禁用该守护机制，或者对于异常大的本地差异，使用更大的毫秒值。

在首次运行之前，请从仓库根目录检查该封装程序：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

仓库封装程序会拒绝不公告 `blacksmith-testbox` 的过时 Crabbox 二进制文件。即使 `.crabbox.yaml` 拥有自有云默认值，也要显式传递提供商。在 Codex 工作树或链接/稀疏检出中，请避免使用本地的 `pnpm crabbox:run` 脚本，因为 pnpm 可能会在 Crabbox 启动之前协调依赖项；改为直接调用 node 封装程序：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

由 Blacksmith 支持的运行需要 Crabbox 0.22.0 或更新版本，以便封装程序获得当前的 Testbox 同步、队列和清理行为。使用兄弟检出时，请在计时或验证工作之前重建被忽略的本地二进制文件：

```bash
version="$(git -C ../crabbox describe --tags --always --dirty | sed 's/^v//')" \
  && go build -C ../crabbox -trimpath -ldflags "-s -w -X github.com/openclaw/crabbox/internal/cli.version=${version}" -o bin/crabbox ./cmd/crabbox
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
  "corepack pnpm check:changed"
```

专注的测试重新运行：

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
  "corepack pnpm test <path-or-filter>"
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
  "corepack pnpm test"
```

读取最终的 JSON 摘要。有用的字段包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性由 Blacksmith 支持的 Crabbox 运行应该会自动停止 Testbox；如果运行被中断或清理情况不明确，请检查正在运行的 box，并且仅停止您创建的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

仅当您有意在同一个已 hydrate 的 box 上执行多个命令时，才使用 reuse：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是出现故障的层，但 Blacksmith 本身工作正常，则仅将直接使用 Blacksmith 用于 `list`、`status` 和清理等诊断。在将直接运行 Blacksmith 视为维护者证明之前，请先修复 Crabbox 路径。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 工作正常，但新的 warmups 在几分钟后仍 `queued` 且没有 IP 或 Actions 运行 URL，请将其视为 Blacksmith 提供商、队列、计费或组织限制压力。请停止您创建的排队 ID，避免启动更多 Testbox，同时有人检查 Blacksmith 仪表板、计费和组织限制，将证明工作转移到下述拥有的 Crabbox 容量路径。

仅当 Blacksmith 停机、受配额限制、缺少所需环境，或者拥有的容量明确是目标时，才升级到拥有的 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 压力下，除非任务确实需要 48xlarge 级别的 CPU，否则应避免使用 `class=beast`。`beast` 请求始于 192 个 vCPU，这是触发区域级 EC2 Spot 或按需标准配额的最简单方式。仓库拥有的 `.crabbox.yaml` 默认为 `standard`、多容量区域和 `capacity.hints: true`，因此代理的 AWS 租赁会打印所选区域/市场、配额压力、Spot 回退以及高压类别警告。请对较重的广泛检查使用 `fast`，仅当标准/快速检查不足时才使用 `large`，并且仅针对异常的 CPU 密集型通道使用 `beast`，例如全套件或所有插件 Docker 矩阵、显式的发布/阻断验证或高核心性能分析。不要对 `pnpm check:changed`、专注测试、仅文档工作、常规 lint/typecheck、小型 E2E 复现或 Blacksmith 中断分类使用 `beast`。请使用 `--market on-demand` 进行容量诊断，以免 Spot 市场波动混入信号中。

`.crabbox.yaml` 拥有自有云通道的提供商、同步和 GitHub Actions 水合默认值。它排除了本地 `.git`，因此水合的 Actions 检出会保留其自己的远程 Git 元数据，而不是同步维护者本地的远程和对象存储；它还排除了永远不应传输的本地运行时/构建产物。`.github/workflows/crabbox-hydrate.yml` 拥有检出、Node/pnpm 设置、`origin/main` 获取以及自有云 `crabbox run --id <cbx_id>` 命令的非机密环境移交。

## 相关

- [安装概述](/zh/install)
- [开发渠道](/zh/install/development-channels)
