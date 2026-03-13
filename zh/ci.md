---
title: CI 流水线
description: OpenClaw CI 流水线的工作原理
summary: "CI 作业图、作用域门控和本地命令等效项"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI 流水线

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能作用域，在仅文档或本机代码更改时跳过昂贵的作业。

## 任务概览

| 作业               | 用途                                                 | 运行时机                                      |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `docs-scope`      | 检测仅文档的更改                                | 始终                                            |
| `changed-scope`   | 检测哪些区域发生了更改 (node/macos/android/windows) | 非文档 PR                                      |
| `check`           | TypeScript 类型检查、lint、格式化                          | 推送到 `main`，或包含 Node 相关更改的 PR |
| `check-docs`      | Markdown lint + 失效链接检查                       | 文档已更改                                      |
| `code-analysis`   | LOC 阈值检查 (1000 行)                        | 仅 PR                                          |
| `secrets`         | 检测泄露的机密信息                                   | 始终                                            |
| `build-artifacts` | 构建一次 dist，与其他作业共享                  | 非文档，node 更改                            |
| `release-check`   | 验证 npm pack 内容                              | 构建后                                       |
| `checks`          | Node/Bun 测试 + 协议检查                         | 非文档，node 更改                            |
| `checks-windows`  | Windows 特定测试                                  | 非文档，Windows 相关更改                |
| `macos`           | Swift lint/build/test + TS 测试                        | 包含 macos 更改的 PR                            |
| `android`         | Gradle build + 测试                                    | 非文档，android 更改                         |

## 快速失败顺序

任务经过排序，以便在运行昂贵的检查之前，让低成本的检查先失败：

1. `docs-scope` + `code-analysis` + `check` （并行，约 1-2 分钟）
2. `build-artifacts` （被上述任务阻塞）
3. `checks`、`checks-windows`、`macos`、`android` （被构建阻塞）

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。

## 运行器

| Runner                           | Jobs                                       |
| -------------------------------- | ------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括范围检测 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                           |
| `macos-latest`                   | `macos`、`ios`                             |

## 本地等效项

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import zh from '/components/footer/zh.mdx';

<zh />
