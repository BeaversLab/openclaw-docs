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

| 任务              | 目的                                                   | 运行时机                                   |
| ----------------- | ------------------------------------------------------ | ------------------------------------------ |
| `preflight`       | 文档范围，变更范围，密钥扫描，工作流审计，生产依赖审计 | 始终；仅在非文档变更时进行基于 Node 的审计 |
| `docs-scope`      | 检测仅文档变更                                         | 始终                                       |
| `changed-scope`   | 检测哪些区域发生了变更 (node/macos/android/windows)    | 非文档变更                                 |
| `check`           | TypeScript 类型检查，Lint，格式化                      | 非文档，Node 变更                          |
| `check-docs`      | Markdown Lint + 失效链接检查                           | 文档已变更                                 |
| `secrets`         | 检测泄漏的密钥                                         | 始终                                       |
| `build-artifacts` | 构建一次 dist，与 `release-check` 共享                 | 推送到 `main`，Node 变更                   |
| `release-check`   | 验证 npm pack 内容                                     | 构建后推送到 `main`                        |
| `checks`          | Node 测试 + PR 上的协议检查；推送时的 Bun 兼容性检查   | 非文档，Node 变更                          |
| `compat-node22`   | 支持的最低 Node 运行时版本                             | 推送到 `main`，Node 变更                   |
| `checks-windows`  | Windows 特定测试                                       | 非文档，Windows 相关变更                   |
| `macos`           | Swift Lint/构建/测试 + TS 测试                         | 包含 macOS 变更的 PR                       |
| `android`         | Gradle 构建 + 测试                                     | 非文档，Android 变更                       |

## 快速失败顺序

作业经过排序，以便廉价的检查在昂贵的检查运行之前失败：

1. `docs-scope` + `changed-scope` + `check` + `secrets` (并行，优先运行廉价的门槛检查)
2. PR：`checks` (Linux Node 测试拆分为 2 个分片), `checks-windows`, `macos`, `android`
3. 推送到 `main`：`build-artifacts` + `release-check` + Bun 兼容性 + `compat-node22`

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
同一个共享的作用域模块还通过更窄的 `changed-smoke` 门控来驱动独立的 `install-smoke` 工作流，因此 Docker/install 冒烟测试仅针对 install、打包和容器相关的更改运行。

## 运行器

| 运行器                           | 任务                              |
| -------------------------------- | --------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括作用域检测 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                  |
| `macos-latest`                   | `macos`, `ios`                    |

## 本地等效项

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```
