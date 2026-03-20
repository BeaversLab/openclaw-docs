---
title: CI 流水线
description: OpenClaw CI 流水线的工作原理
summary: "CI 作业图、范围门控和本地命令等效项"
read_when:
  - 您需要了解为什么 CI 作业运行或未运行
  - 您正在调试失败的 GitHub Actions 检查
---

# CI 流水线

CI 在每次推送到 `main` 和每个拉取请求时运行。它使用智能范围限定，当仅更改不相关区域时跳过昂贵的作业。

## 任务概览

| Job               | Purpose                                                 | When it runs                       |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `docs-scope`      | Detect docs-only changes                                | Always                             |
| `changed-scope`   | Detect which areas changed (node/macos/android/windows) | 非文档更改                    |
| `check`           | TypeScript types, lint, format                          | 非文档、节点更改             |
| `check-docs`      | Markdown lint + broken link check                       | Docs changed                       |
| `secrets`         | 检测泄露的密钥                                   | 始终                             |
| `build-artifacts` | 构建一次 dist，与 `release-check` 共享             | 推送到 `main`，node 更改     |
| `release-check`   | 验证 npm pack 内容                              | 构建后推送到 `main`       |
| `checks`          | PR 上的节点测试 + 协议检查；推送时的 Bun 兼容性  | 非文档、节点更改             |
| `compat-node22`   | 支持的最低 Node 运行时兼容性            | 推送到 `main`，node 更改     |
| `checks-windows`  | Windows 特定测试                                  | Non-docs, windows-relevant changes |
| `macos`           | Swift lint/build/test + TS tests                        | PRs with macos changes             |
| `android`         | Gradle build + tests                                    | Non-docs, android changes          |

## Fail-Fast Order

Jobs are ordered so cheap checks fail before expensive ones run:

1. `docs-scope` + `changed-scope` + `check` + `secrets`（并行，先进行廉价门控）
2. PR：`checks`（Linux Node 测试拆分为 2 个分片），`checks-windows`，`macos`，`android`
3. 推送到 `main`：`build-artifacts` + `release-check` + Bun 兼容性 + `compat-node22`

范围逻辑位于 `scripts/ci-changed-scope.mjs` 中，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。

## Runners

| Runner                           | Jobs                                       |
| -------------------------------- | ------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多数 Linux 任务，包括范围检测 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                           |
| `macos-latest`                   | `macos`，`ios`                             |

## Local Equivalents

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import en from "/components/footer/en.mdx";

<en />
