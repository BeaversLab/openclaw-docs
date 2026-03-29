---
title: CI Pipeline
summary: "CI job graph, scope gates, and local command equivalents"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

# CI Pipeline

CI 在每次推送到 `main` 和每個 Pull Request 時執行。它使用智慧範圍機制，在僅有不相關區域變更時跳過耗時的工作。

## Job Overview

| Job               | 用途                                                                      | 執行時機                                    |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `preflight`       | Docs scope, change scope, key scan, workflow audit, prod dependency audit | 總是；僅在非文檔變更時進行 node-based audit |
| `docs-scope`      | 偵測僅文檔變更                                                            | 總是                                        |
| `changed-scope`   | 偵測哪些區域變更 (node/macos/android/windows)                             | 非文檔變更                                  |
| `check`           | TypeScript 類型檢查, lint, 格式化                                         | 非文檔, node 變更                           |
| `check-docs`      | Markdown lint + 壞連結檢查                                                | 文檔變更                                    |
| `secrets`         | 偵測洩漏的機密                                                            | 總是                                        |
| `build-artifacts` | 建構 dist 一次，與 `release-check` 共用                                   | 推送到 `main`，node 變更                    |
| `release-check`   | 驗證 npm pack 內容                                                        | 建構後推送到 `main`                         |
| `checks`          | PR 上進行 Node 測試 + 協定檢查；Push 時進行 Bun 相容性測試                | 非文檔, node 變更                           |
| `compat-node22`   | 最低支援的 Node 執行環境相容性                                            | 推送到 `main`，node 變更                    |
| `checks-windows`  | Windows 特定測試                                                          | 非文檔, windows 相關變更                    |
| `macos`           | Swift lint/build/test + TS 測試                                           | 包含 macos 變更的 PR                        |
| `android`         | Gradle build + 測試                                                       | 非文檔, android 變更                        |

## Fail-Fast Order

Job 排序時讓低成本檢查在高成本任務執行前先失敗：

1. `docs-scope` + `changed-scope` + `check` + `secrets` (平行，低成本優先)
2. PR: `checks` (Linux Node 測試拆分為 2 個分片), `checks-windows`, `macos`, `android`
3. 推送到 `main`：`build-artifacts` + `release-check` + Bun 相容性 + `compat-node22`

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試覆蓋。
同一個共享的範圍模組也透過更狹隘的 `changed-smoke` 閘道驅動獨立的 `install-smoke` 工作流程，因此 Docker/安裝煙霧測試僅針對安裝、打包和容器相關的變更執行。

## 執行器

| 執行器                           | 工作                            |
| -------------------------------- | ------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | 大多數 Linux 工作，包括範圍偵測 |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                |
| `macos-latest`                   | `macos`，`ios`                  |

## 本地等效項

```bash
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack
```
