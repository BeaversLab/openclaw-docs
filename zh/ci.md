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

| 任务              | 目的                                                | 运行时机                 |
| ----------------- | --------------------------------------------------- | ------------------------ |
| `docs-scope`      | 检测仅文档更改                                      | 始终                     |
| `changed-scope`   | 检测哪些区域发生了更改 (node/macos/android/windows) | 非文档更改               |
| `check`           | TypeScript 类型检查、Lint、格式化                   | 非文档、node 更改        |
| `check-docs`      | Markdown Lint + 损坏链接检查                        | 文档更改                 |
| `secrets`         | 检测泄露的密钥                                      | 始终                     |
| `build-artifacts` | 构建一次 dist，与 `release-check` 共享              | 推送到 `main`，node 更改 |
| `release-check`   | 验证 npm pack 内容                                  | 构建后推送到 `main`      |
| `checks`          | PR 上的 Node 测试 + 协议检查；推送时的 Bun 兼容性   | 非文档、node 更改        |
| `compat-node22`   | 最低支持的 Node 运行时兼容性                        | 推送到 `main`，node 更改 |
| `checks-windows`  | Windows 特定测试                                    | 非文档、windows 相关更改 |
| `macos`           | Swift lint/build/test + TS 测试                     | 包含 macos 更改的 PR     |
| `android`         | Gradle build + 测试                                 | 非文档、android 更改     |

## 快速失败顺序

任务经过排序，以便廉价的检查在昂贵的检查运行之前失败：

1. `docs-scope` + `changed-scope` + `check` + `secrets` （并行，廉价门控优先）
2. PR：`checks` （Linux Node 测试拆分为 2 个分片），`checks-windows`，`macos`，`android`
3. 推送到 `main`：`build-artifacts` + `release-check` + Bun 兼容性 + `compat-node22`

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。

## Runner

| Runner                           | 作业                              |
| -------------------------------- | --------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 作业，包括作用域检测 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                  |
| `macos-latest`                   | `macos`, `ios`                    |

## 本地等效项

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import zh from "/components/footer/zh.mdx";

<zh />
