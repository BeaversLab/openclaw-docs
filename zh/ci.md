---
title: "CI 流水线"
description: "OpenClaw CI 流水线的工作原理"
summary: "CI 作业图、范围门控和本地命令等效项"
read_when:
  - "You need to understand why a CI job did or did not run"
  - "You are debugging failing GitHub Actions checks"
---

# CI 流水线

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能作用域来跳过仅文档或原生代码更改时的昂贵作业。

## 作业概述

| Job               | Purpose                                                 | When it runs                                      |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `docs-scope`      | Detect docs-only changes                                | Always                                            |
| `changed-scope`   | Detect which areas changed (node/macos/android/windows) | Non-docs PRs                                      |
| `check`           | TypeScript types, lint, format                          | Push to `main`, or PRs with Node-relevant changes |
| `check-docs`      | Markdown lint + broken link check                       | Docs changed                                      |
| `code-analysis`   | LOC threshold check (1000 lines)                        | PRs only                                          |
| `secrets`         | Detect leaked secrets                                   | Always                                            |
| `build-artifacts` | Build dist once, share with other jobs                  | Non-docs, node changes                            |
| `release-check`   | Validate npm pack contents                              | After build                                       |
| `checks`          | Node/Bun tests + protocol check                         | Non-docs, node changes                            |
| `checks-windows`  | Windows-specific tests                                  | Non-docs, windows-relevant changes                |
| `macos`           | Swift lint/build/test + TS tests                        | PRs with macos changes                            |
| `android`         | Gradle build + tests                                    | Non-docs, android changes                         |

## 快速失败顺序

作业的排序使得廉价的检查在昂贵的检查运行之前失败：

1. `docs-scope` + `code-analysis` + `check` (parallel, ~1-2 min)
2. `build-artifacts` (blocked on above)
3. `checks`, `checks-windows`, `macos`, `android` (blocked on build)

作用域逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。

## 运行器

| Runner                           | Jobs                                       |
| -------------------------------- | ------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | Most Linux jobs, including scope detection |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                           |
| `macos-latest`                   | `macos`, `ios`                             |

## 本地等效项

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```
