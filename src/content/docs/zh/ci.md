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

| 任务                     | 目的                                                                | 运行时机                     |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------- |
| `preflight`              | 检测仅文档更改、更改的作用域、更改的扩展，并构建 CI 清单            | 始终在非草稿推送和 PR 上运行 |
| `security-fast`          | 私钥检测、通过 `zizmor` 进行工作流审计、生产依赖审计                | 始终在非草稿推送和 PR 上运行 |
| `build-artifacts`        | 构建 `dist/` 和控制 UI 一次，为下游作业上传可复用的构件             | 节点相关更改                 |
| `checks-fast-core`       | 快速的 Linux 正确性通道，例如 bundled/plugin-contract/protocol 检查 | 节点相关更改                 |
| `checks-fast-extensions` | 在 `checks-fast-extensions-shard` 完成后聚合扩展分片通道            | 节点相关更改                 |
| `extension-fast`         | 仅针对已更改的捆绑插件的专注测试                                    | 当检测到扩展更改时           |
| `check`                  | CI 中的主要本地关卡：`pnpm check` 加上 `pnpm build:strict-smoke`    | 节点相关更改                 |
| `check-additional`       | 架构和边界守卫加上网关监视回归测试工具                              | 节点相关更改                 |
| `build-smoke`            | 已构建 CLI 冒烟测试和启动内存冒烟测试                               | 节点相关更改                 |
| `checks`                 | 较重的 Linux 节点通道：完整测试、渠道测试和仅推送时的节点 22 兼容性 | 节点相关更改                 |
| `check-docs`             | 文档格式、Lint 和断开链接检查                                       | 文档已更改                   |
| `skills-python`          | 用于 Python 支持技能的 Ruff + pytest                                | Python 技能相关更改          |
| `checks-windows`         | Windows 特定的测试通道                                              | Windows 相关更改             |
| `macos-node`             | 使用共享构建构件的 macOS TypeScript 测试通道                        | macOS 相关更改               |
| `macos-swift`            | 针对 macOS 应用程序的 Swift Lint、构建和测试                        | macOS 相关更改               |
| `android`                | Android 构建和测试矩阵                                              | Android 相关更改             |

## 快速失败顺序

作业已排序，以便在运行昂贵的作业之前让廉价的检查失败：

1. `preflight` 决定了存在哪些通道。`docs-scope` 和 `changed-scope` 逻辑是该作业内的步骤，而非独立的作业。
2. `security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，无需等待较重的构建产物和平台矩阵作业。
3. `build-artifacts` 与快速的 Linux 通道重叠，以便共享构建一准备好，下游使用者就能立即开始。
4. 在那之后，更重的平台和运行时通道会展开：`checks-fast-core`、`checks-fast-extensions`、`extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
独立的 `install-smoke` 工作流通过其自身的 `preflight` 作业复用相同的作用域脚本。它根据范围更窄的 changed-smoke 信号来计算 `run_install_smoke`，因此 Docker/install smoke 仅针对安装、打包和容器相关的更改运行。

在推送时，`checks` 矩阵会添加仅限推送的 `compat-node22` 通道。在拉取请求中，该通道被跳过，矩阵保持专注于正常的测试/渠道通道。

## 运行器

| 运行器                           | 作业                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`、`security-fast`、`build-artifacts`、Linux 检查、文档检查、Python 技能、`android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                              |
| `macos-latest`                   | `macos-node`、`macos-swift`                                                                   |

## 本地等效项

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
