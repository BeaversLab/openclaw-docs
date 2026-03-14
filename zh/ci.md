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

| Job               | Purpose                                                 | When it runs                                      |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `docs-scope`      | Detect docs-only changes                                | Always                                            |
| `changed-scope`   | Detect which areas changed (node/macos/android/windows) | Non-docs PRs                                      |
| `check`           | TypeScript types, lint, format                          | Push to `main`, or PRs with Node-relevant changes |
| `check-docs`      | Markdown lint + broken link check                       | Docs changed                                      |
| `code-analysis`   | LOC threshold check (1000 lines)                        | PRs only                                          |
| `secrets`         | Detect leaked secrets                                   | Always                                            |
| `build-artifacts` | Build dist once, share with other jobs                  | Non-docs, node changes                            |
| `release-check`   | 验证 npm pack 内容                                      | After build                                       |
| `checks`          | Node/Bun 测试 + 协议检查                                | Non-docs, node changes                            |
| `checks-windows`  | Windows 特定测试                                        | Non-docs, windows-relevant changes                |
| `macos`           | Swift lint/build/test + TS tests                        | PRs with macos changes                            |
| `android`         | Gradle build + tests                                    | Non-docs, android changes                         |

## Fail-Fast Order

Jobs are ordered so cheap checks fail before expensive ones run:

1. `docs-scope` + `code-analysis` + `check` (parallel, ~1-2 min)
2. `build-artifacts` (blocked on above)
3. `checks`, `checks-windows`, `macos`, `android` (blocked on build)

Scope logic lives in `scripts/ci-changed-scope.mjs` and is covered by unit tests in `src/scripts/ci-changed-scope.test.ts`.

## Runners

| Runner                           | Jobs                            |
| -------------------------------- | ------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括范围检测 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                |
| `macos-latest`                   | `macos`, `ios`                  |

## Local Equivalents

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import zh from '/components/footer/zh.mdx';

<zh />
