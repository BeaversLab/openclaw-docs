---
title: CI 流水线
summary: "CI 任务图、作用域门控以及本地命令等效项"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI 流水线

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能作用域，当仅更改不相关区域时跳过昂贵的任务。

QA Lab 在主要的智能限定工作流之外拥有专用的 CI 通道。`Parity gate` 工作流在匹配的 PR 更改和手动触发时运行；它构建私有 QA 运行时并比较模拟 GPT-5.4 和 Opus 4.6 的代理包。`QA-Lab - All Lanes` 工作流每晚在 `main` 和手动触发时运行；它将模拟一致性关卡、实时 Matrix 通道和实时 Telegram 通道作为并行作业展开。实时作业使用 `qa-live-shared` 环境，而 Telegram 通道使用 Convex 租约。`OpenClaw Release Checks` 也会在发布批准前运行相同的 QA Lab 通道。

## 作业概览

| 作业                             | 目的                                                                     | 运行时机                       |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| `preflight`                      | 检测仅文档更改、更改的范围、更改的扩展，并构建 CI 清单                   | 在非草稿推送和 PR 上始终运行   |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                   | 对于非草稿的推送和 PR 始终运行 |
| `security-dependency-audit`      | 针对 npm 公告的无依赖生产环境 lockfile 审计                              | 对于非草稿的推送和 PR 始终运行 |
| `security-fast`                  | 快速安全作业的必需聚合                                                   | 对于非草稿的推送和 PR 始终运行 |
| `build-artifacts`                | 构建 `dist/`、Control UI、构建产物检查以及可复用的下游产物               | Node 相关变更                  |
| `checks-fast-core`               | 快速的 Linux 正确性通道，例如 bundled/plugin-contract/protocol 检查      | Node 相关变更                  |
| `checks-fast-contracts-channels` | 具有稳定聚合检查结果的分片渠道 合约检查                                  | Node 相关变更                  |
| `checks-node-extensions`         | 跨扩展套件的完整 bundled-plugin 测试分片                                 | Node 相关变更                  |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括渠道、bundled、合约和扩展通道                  | Node 相关变更                  |
| `extension-fast`                 | 仅针对已更改的 bundled 插件的专注测试                                    | 包含扩展变更的拉取请求         |
| `check`                          | 分片的主本地网关等效项：prod 类型、lint、guards、测试类型和 strict smoke | Node 相关变更                  |
| `check-additional`               | 架构、边界、扩展表面 guards、包边界和 gateway-watch 分片                 | Node 相关变更                  |
| `build-smoke`                    | Built-CLI smoke 测试和启动内存 smoke                                     | Node 相关变更                  |
| `checks`                         | 用于构建产物渠道测试的验证器以及仅限推送的 Node 22 兼容性                | Node 相关变更                  |
| `check-docs`                     | 文档格式化、Lint 和失效链接检查                                          | 文档变更                       |
| `skills-python`                  | 基于 Python 的技能的 Ruff + pytest                                       | Python 技能相关的变更          |
| `checks-windows`                 | Windows 特定的测试通道                                                   | Windows 相关的变更             |
| `macos-node`                     | 使用共享构建产物的 macOS TypeScript 测试通道                             | macOS 相关的变更               |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                      | macOS 相关的变更               |
| `android`                        | 针对两个版本的 Android 单元测试以及一次调试版 APK 构建                   | Android 相关的变更             |

## 快速失败顺序

作业已排序，因此廉价检查会在昂贵作业运行之前失败：

1. `preflight` 决定哪些通道实际存在。`docs-scope` 和 `changed-scope` 逻辑是该作业内的步骤，而非独立的作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，无需等待更繁重的工件和平台矩阵作业。
3. `build-artifacts` 与快速 Linux 通道重叠，以便下游使用者在共享构建准备好后可以立即开始。
4. 之后，更繁重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、仅限 PR 的 `extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
CI 工作流编辑会验证 Node CI 图以及工作流 lint，但不会自行强制 Windows、Android 或 macOS 原生构建；这些平台通道仍然局限于平台源码的更改。
Windows Node 检查的范围限于 Windows 特定的进程/路径封装器、npm/pnpm/UI 运行器辅助程序、包管理器配置以及执行该通道的 CI 工作流表面；不相关的源码、插件、install-smoke 和仅测试更改会保留在 Linux Node 通道上，这样它们就不会为已被常规测试分片执行的覆盖率占用一个 16 vCPU 的 Windows 工作线程。
独立的 `install-smoke` 工作流通过其自己的 `preflight` 作业复用相同的作用域脚本。它根据更窄的 changed-smoke 信号计算 `run_install_smoke`，因此 Docker/install smoke 会针对安装、打包、容器相关更改、打包扩展生产更改以及 Docker smoke 作业所练习的核心插件/渠道/gateway/Plugin SDK 表面运行。仅测试和仅文档的编辑不会占用 Docker 工作线程。其 QR 包 smoke 强制 Docker `pnpm install` 层重新运行，同时保留 BuildKit pnpm 存储缓存，因此它仍然练习安装而无需在每次运行时重新下载依赖项。其 gateway-network e2e 复用作业中先前构建的运行时镜像，因此它增加了真实的容器到容器 WebSocket 覆盖率，而无需添加另一个 Docker 构建。本地 `test:docker:all` 预构建一个共享的 `scripts/e2e/Dockerfile` built-app 镜像，并在 E2E 容器 smoke 运行器之间复用它；可复用的 live/E2E 工作流镜像了该模式，即在 Docker 矩阵之前构建并推送一个 SHA 标记的 GHCR Docker E2E 镜像，然后使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 运行矩阵。QR 和安装程序 Docker 测试保留自己专注于安装的 Dockerfiles。一个单独的 `docker-e2e-fast` 作业在 120 秒命令超时下运行有界的 bundled-plugin Docker 配置文件：setup-entry 依赖项修复以及合成的 bundled-loader 故障隔离。完整的 bundled update/渠道矩阵保持手动/全套件模式，因为它执行重复的真实 npm update 和 doctor 修复过程。

本地变更车道逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。该本地关卡对架构边界的检查比广泛的 CI 平台范围更严格：核心生产变更运行核心生产类型检查加上核心测试，核心仅测试变更仅运行核心测试类型检查/测试，扩展生产变更运行扩展生产类型检查加上扩展测试，扩展仅测试变更仅运行扩展测试类型检查/测试。公共 Plugin SDK 或 plugin-contract 的变更会扩展到扩展验证，因为扩展依赖于这些核心契约。仅发布元数据的版本提升运行定向的版本/配置/根依赖检查。未知的根/配置变更会自动回退到所有车道。

在推送时，`checks` 矩阵会添加仅限推送的 `compat-node22` 通道。在拉取请求时，该通道会被跳过，矩阵将专注于正常的测试/渠道通道。

最慢的 Node 测试系列被拆分或平衡，以保持每个作业的轻量：渠道契约将注册表和核心覆盖范围拆分为总共六个加权分片，捆绑插件测试在六个扩展工作器之间平衡，自动回复作为三个平衡的工作器运行，而不是六个微小的工作器，并且代理 Gateway(网关)/插件配置分布在现有的仅源代理 Node 作业上，而不是等待构建的产物。广泛的浏览器、QA、媒体和杂项插件测试使用其专用的 Vitest 配置，而不是共享的插件全能配置。广泛的代理通道使用共享的 Vitest 文件并行调度程序，因为它由导入/调度主导，而不是由单个慢速测试文件拥有。`runtime-config` 与 infra core-runtime 分片一起运行，以防止共享运行时分片拥有尾部延迟。`check-additional` 将包边界编译/金丝雀工作保持在一起，并将运行时拓扑架构与 Gateway(网关) 监视覆盖范围分开；边界卫士分片在一个作业内并发运行其小型独立卫士。在 `dist/` 和 `dist-runtime/` 构建完成后，Gateway(网关) 监视、渠道测试和核心支持边界分片在 `build-artifacts` 内并发运行，同时保留其旧的检查名称作为轻量级验证作业，同时避免两个额外的 Blacksmith 工作器和第二个产物使用者队列。
Android CI 同时运行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然后构建 Play 调试 APK。第三方风格没有单独的源集或清单；其单元测试通道仍然使用 SMS/通话记录 BuildConfig 标志编译该风格，同时避免在每次 Android 相关推送上重复的调试 APK 打包作业。
`extension-fast` 仅限 PR，因为推送运行已经执行完整的捆绑插件分片。这样可以在不为 `main` 上已存在的 `checks-node-extensions` 覆盖范围预留额外的 Blacksmith 工作器的情况下，为审查保留更改插件的反馈。

GitHub 当有更新的推送到同一个 PR 或 `main` 引用时，可能会将过时的作业标记为 `cancelled`。除非同一引用的最新运行也失败了，否则应将其视为 CI 噪音。聚合分片检查使用 `!cancelled() && always()`，因此它们仍然报告正常的分片失败，但在整个工作流已被取代后不会排队。CI 并发键是版本化的 (`CI-v7-*`)，因此 GitHub 端的旧队列组中的僵尸作业不会无限期地阻塞较新的主分支运行。

## 运行器

| 运行器                           | 作业                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`、快速安全作业和聚合（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速协议/合约/打包检查、分片渠道合约检查、`check` 分片（lint 除外）、`check-additional` 分片和聚合、Node 测试聚合验证器、文档检查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 预检也使用 GitHub 托管的 Ubuntu，以便 Blacksmith 矩阵可以更早排队 |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 测试分片、打包插件测试分片、`android`                                                                                                                                                                                                                                                                                               |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，它对 CPU 仍然足够敏感，以至于 8 vCPU 的成本超过了其节省的开销；install-smoke Docker 构建，其中 32-vCPU 队列时间的成本超过了其节省的开销                                                                                                                                                                                                                          |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                               |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 运行于 `openclaw/openclaw`；派生仓库回退到 `macos-latest`                                                                                                                                                                                                                                                                                                         |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 运行于 `openclaw/openclaw`；派生仓库回退到 `macos-latest`                                                                                                                                                                                                                                                                                                        |

## 本地等效项

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local gate: changed typecheck/lint/tests by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
node scripts/ci-run-timings.mjs <run-id>  # summarize wall time, queue time, and slowest jobs
```
