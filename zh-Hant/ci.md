---
title: CI Pipeline
description: OpenClaw CI 管道的運作方式
summary: "CI 作業圖、範圍閘道與本地指令對等項"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI Pipeline

CI 會在每次推送到 `main` 及每個 Pull Request 時執行。它使用智慧範圍設定，在僅變更無關區域時跳過耗時的作業。

## 作業概覽

| 作業              | 用途                                                         | 執行時機                 |
| ----------------- | ------------------------------------------------------------ | ------------------------ |
| `docs-scope`      | 偵測僅文件變更                                               | 總是                     |
| `changed-scope`   | 偵測哪些區域變更 (node/macos/android/windows)                | 非文件變更               |
| `check`           | TypeScript 類型、Lint、格式化                                | 非文件、node 變更        |
| `check-docs`      | Markdown lint + 損壞連結檢查                                 | 文件變更                 |
| `secrets`         | 偵測洩漏的機密                                               | 總是                     |
| `build-artifacts` | 建構 dist 一次，與 `release-check` 共用                      | 推送到 `main`，node 變更 |
| `release-check`   | 驗證 npm pack 內容                                           | 在建構後推送到 `main`    |
| `checks`          | Node 測試 + 通訊協定檢查（在 PR 上）；Bun 相容性（在推送時） | 非文件、node 變更        |
| `compat-node22`   | 最低支援的 Node 執行環境相容性                               | 推送到 `main`，node 變更 |
| `checks-windows`  | Windows 特定測試                                             | 非文件、Windows 相關變更 |
| `macos`           | Swift lint/build/test + TS 測試                              | 包含 macos 變更的 PR     |
| `android`         | Gradle build + 測試                                          | 非文件、android 變更     |

## 快速失敗順序

作業已排序，讓廉價的檢查在昂貴的檢查執行前先失敗：

1. `docs-scope` + `changed-scope` + `check` + `secrets`（平行，優先執行廉價閘道）
2. PR：`checks`（Linux Node 測試分為 2 個分片）、`checks-windows`、`macos`、`android`
3. 推送到 `main`：`build-artifacts` + `release-check` + Bun 相容性 + `compat-node22`

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。

## Runners

| Runner                           | Jobs                            |
| -------------------------------- | ------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大部分 Linux 工作，包括範圍檢測 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                |
| `macos-latest`                   | `macos`、`ios`                  |

## 本機對等項目

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
