---
title: CI 流水线
description: OpenClaw CI 流水线的工作原理
summary: "CI 任务图、作用域门控以及本地命令等效项"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI 流水线

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能作用域，当仅文档或原生代码发生变化时跳过昂贵的任务。

## 任务概览

| 任务               | 目的                                                 | 运行时机                                      |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `docs-scope`      | 检测仅文档的变更                                | 始终                                            |
| `changed-scope`   | 检测哪些区域发生了变更 (node/macos/android/windows) | 非文档 PR (Pull Request)                                      |
| `check`           | TypeScript 类型检查、Lint、格式化                          | 推送到 `main`，或包含 Node 相关变更的 PR |
| `check-docs`      | Markdown Lint + 失效链接检查                       | 文档发生变更时                                      |
| `code-analysis`   | LOC（代码行数）阈值检查 (1000 行)                        | 仅限 PR                                          |
| `secrets`         | 检测泄露的密钥                                   | 始终                                            |
| `build-artifacts` | 构建一次 dist，与其他任务共享                  | 非文档、Node 变更                            |
| `release-check`   | 验证 npm pack 内容                              | 构建之后                                       |
| `checks`          | Node/Bun 测试 + 协议检查                         | 非文档、Node 变更                            |
| `checks-windows`  | Windows 特定测试                                  | 非文档、Windows 相关变更                |
| `macos`           | Swift Lint/构建/测试 + TS 测试                        | 包含 macOS 变更的 PR                            |
| `android`         | Gradle 构建 + 测试                                    | 非文档、Android 变更                         |

## 快速失败顺序

任务经过排序，以便在运行昂贵的检查之前，让低成本的检查先失败：

1. `docs-scope` + `code-analysis` + `check` (并行，约 1-2 分钟)
2. `build-artifacts` (依赖于上述任务)
3. `checks`, `checks-windows`, `macos`, `android` (依赖于构建)

范围 逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。

## 运行器

| 运行器                           | 任务                                       |
| -------------------------------- | ------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括范围检测 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                           |
| `macos-latest`                   | `macos`, `ios`                             |

## 本地等效项

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import zh from '/components/footer/zh.mdx';

<zh />
