---
title: CI Pipeline
summary: "CI job graph, scope gates, and local command equivalents"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI Pipeline

CI 會在每次推送到 `main` 和每個 pull request 時執行。它使用智慧作用域來在只有無關區域變更時跳過耗時的工作。

## Job Overview

| Job               | Purpose                                                 | When it runs             |
| ----------------- | ------------------------------------------------------- | ------------------------ |
| `docs-scope`      | Detect docs-only changes                                | Always                   |
| `changed-scope`   | Detect which areas changed (node/macos/android/windows) | Non-doc changes          |
| `check`           | TypeScript types, lint, format                          | Non-docs, node changes   |
| `check-docs`      | Markdown lint + broken link check                       | Docs changed             |
| `secrets`         | Detect leaked secrets                                   | Always                   |
| `build-artifacts` | Build dist once, share with `release-check`             | 推送到 `main`，節點變更  |
| `release-check`   | 驗證 npm pack 內容                                      | 建置後推送到 `main`      |
| `checks`          | PR 上的節點測試 + 協定檢查；推送時的 Bun 相容性         | 非文件，節點變更         |
| `compat-node22`   | 最低支援的 Node 執行環境相容性                          | 推送到 `main`，節點變更  |
| `checks-windows`  | Windows 特定測試                                        | 非文件，Windows 相關變更 |
| `macos`           | Swift lint/build/test + TS 測試                         | 包含 macos 變更的 PR     |
| `android`         | Gradle 建置 + 測試                                      | 非文件，Android 變更     |

## 快速失敗順序

工作已排序，因此廉價檢查會在昂貴檢查執行之前失敗：

1. `docs-scope` + `changed-scope` + `check` + `secrets` (平行，先執行廉價的門檻)
2. PR：`checks` (Linux Node 測試分為 2 個分片)、`checks-windows`、`macos`、`android`
3. 推送到 `main`：`build-artifacts` + `release-check` + Bun 相容性 + `compat-node22`

Scope 邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試覆蓋。

## 執行器

| 執行器                           | 工作                               |
| -------------------------------- | ---------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大部分 Linux 工作，包括 scope 檢測 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                   |
| `macos-latest`                   | `macos`，`ios`                     |

## 本地對等項

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
