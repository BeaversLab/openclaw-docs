---
title: CI 流水线
summary: "CI 任务图、作用域门控以及本地命令等效项"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI 流水线

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能作用域，当仅更改不相关区域时跳过昂贵的任务。

## 任务概览

| 任务                             | 目的                                                                       | 运行时机                     |
| -------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                      | 检测仅文档更改、更改的作用域、更改的扩展，并构建 CI 清单                   | 始终在非草稿推送和 PR 上运行 |
| `security-scm-fast`              | 通过 `zizmor` 进行私钥检测和工作流审计                                     | 始终在非草稿推送和 PR 上运行 |
| `security-dependency-audit`      | 针对 npm 公告的无依赖生产 lockfile 审计                                    | 始终在非草稿推送和 PR 上运行 |
| `security-fast`                  | 快速安全作业的必需聚合                                                     | 始终在非草稿推送和 PR 上运行 |
| `build-artifacts`                | 一次性构建 `dist/` 和控制 UI，上传可复用构件以供下游作业使用               | 节点相关更改                 |
| `checks-fast-core`               | 快速 Linux 正确性通道，例如 bundled/plugin-contract/protocol 检查          | Node 相关的更改              |
| `checks-fast-contracts-channels` | 分片的渠道合约检查，具有稳定的聚合检查结果                                 | Node 相关更改                |
| `checks-node-extensions`         | 跨扩展套件的完整 bundled-plugin 测试分片                                   | 节点相关更改                 |
| `checks-node-core-test`          | 核心 Node 测试分片，不包括渠道、bundled、合约和扩展通道                    | 节点相关更改                 |
| `extension-fast`                 | 针对已更改 bundled 插件的专注测试                                          | 当检测到扩展更改时           |
| `check`                          | 分片的主要本地入口等效项：prod 类型、lint、guards、test 类型和严格冒烟测试 | Node 相关的更改              |
| `check-additional`               | 架构、边界、扩展表面 guards、包边界和 gateway-watch 分片                   | Node 相关更改                |
| `build-smoke`                    | 已构建 CLI 冒烟测试和启动内存冒烟测试                                      | Node 相关更改                |
| `checks`                         | 其余 Linux Node 通道：渠道测试和仅推送的 Node 22 兼容性                    | Node 相关更改                |
| `check-docs`                     | 文档格式化、lint 和失效链接检查                                            | 文档已更改                   |
| `skills-python`                  | Python 支持的技能的 Ruff + pytest                                          | Python 技能相关更改          |
| `checks-windows`                 | Windows 特定测试通道                                                       | Windows 相关更改             |
| `macos-node`                     | 使用共享构建构件的 macOS TypeScript 测试通道                               | macOS 相关更改               |
| `macos-swift`                    | macOS 应用的 Swift lint、构建和测试                                        | macOS 相关更改               |
| `android`                        | Android 构建和测试矩阵                                                     | Android 相关更改             |

## 快速失败顺序

任务的排序使得廉价的检查在昂贵的检查运行之前失败：

1. `preflight` 决定了哪些通道存在。`docs-scope` 和 `changed-scope` 逻辑是该作业内部的步骤，而不是独立的作业。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，无需等待更繁重的构建产物和平台矩阵作业。
3. `build-artifacts` 与快速的 Linux 通道重叠，以便下游消费者一旦共享构建完成即可开始。
4. 较重的平台和运行时通道随后展开：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、`extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
独立的 `install-smoke` 工作流通过其自己的 `preflight` 作业复用相同的范围脚本。它根据范围更窄的 changed-smoke 信号计算 `run_install_smoke`，因此仅当与安装、打包和容器相关的更改发生时，才会运行 Docker/install smoke。

本地 changed-lane 逻辑位于 `scripts/changed-lanes.mjs` 中，并由 `scripts/check-changed.mjs` 执行。与广泛的 CI 平台范围相比，该本地关卡对架构边界更为严格：核心生产更改运行核心 prod typecheck 和核心测试，核心仅测试更改仅运行核心测试 typecheck/测试，扩展生产更改运行扩展 prod typecheck 和扩展测试，扩展仅测试更改仅运行扩展测试 typecheck/测试。公共 Plugin SDK 或 plugin-contract 的更改会扩展到扩展验证，因为扩展依赖于这些核心契约。未知的 root/config 更改会故障安全地运行所有通道。

在推送时，`checks` 矩阵会添加仅限推送的 `compat-node22` 车道。在拉取请求中，该车道被跳过，矩阵保持专注于常规的 test/渠道 车道。

最慢的 Node 测试组被拆分为包含文件分片，以保持每个作业的小巧：渠道合约将注册表和核心覆盖范围各拆分为八个加权分片，自动回复 reply 命令测试拆分为四个包含模式分片，其他大型自动回复 reply 前缀组各拆分为两个分片。`check-additional` 还将包边界 compile/canary 工作与运行时拓扑 gateway/architecture 工作分离开来。

当新的推送到达同一 PR 或 `main` 引用时，GitHub 可能会将被取代的作业标记为 `cancelled`。除非同一引用的最新运行也失败，否则请将其视为 CI 噪音。聚合分片检查会明确指出这种取消情况，以便更容易将其与测试失败区分开来。

## 运行器

| 运行器                           | 作业                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-scm-fast`, `security-dependency-audit`, `security-fast`, `build-artifacts`, Linux 检查, 文档检查, Python 技能, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                                                |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                                                     |

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
```
