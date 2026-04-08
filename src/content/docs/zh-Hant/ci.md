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

| Job                      | 用途                                                                        | 執行時機                       |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------ |
| `preflight`              | 偵測純文件變更、變更範圍、變更副檔名，並建構 CI 清單                        | 一律在非草稿的推送和 PR 上執行 |
| `security-fast`          | 金鑰偵測、透過 `zizmor` 進行工作流程稽核、生產環境相依性稽核                | 一律在非草稿的推送和 PR 上執行 |
| `build-artifacts`        | 建構 `dist/` 和 Control UI 一次，上傳可重構建的成品供下游工作使用           | Node 相關變更                  |
| `checks-fast-core`       | 快速的 Linux 正確性通道，例如 bundled/plugin-contract/protocol 檢查         | Node 相關變更                  |
| `checks-fast-extensions` | 在 `checks-fast-extensions-shard` 完成後聚合擴充功能分片通道                | Node 相關變更                  |
| `extension-fast`         | 僅針對變更的內建外掛進行測試                                                | 當偵測到擴充功能變更時         |
| `check`                  | CI 中的主要本機閘道：`pnpm check` 加上 `pnpm build:strict-smoke`            | Node 相關變更                  |
| `check-additional`       | 架構和邊界防護以及閘道監看迴歸測試工具                                      | Node 相關變更                  |
| `build-smoke`            | 內建 CLI 程式碼測試和啟動記憶體測試                                         | Node 相關變更                  |
| `checks`                 | 較繁重的 Linux Node 通道：完整測試、通道測試，以及僅推送時的 Node 22 相容性 | Node 相關變更                  |
| `check-docs`             | 文件格式設定、Lint 和斷開連結檢查                                           | 文件變更                       |
| `skills-python`          | Ruff + pytest 適用於 Python 支援的技能                                      | Python 技能相關變更            |
| `checks-windows`         | Windows 專屬測試通道                                                        | Windows 相關變更               |
| `macos-node`             | 使用共用建構成品的 macOS TypeScript 測試通道                                | macOS 相關變更                 |
| `macos-swift`            | Swift lint、建構和測試適用於 macOS 應用程式                                 | macOS 相關變更                 |
| `android`                | Android 建構和測試矩陣                                                      | Android 相關變更               |

## 快速失敗順序

工作已排序，以便廉價的檢查在昂貴的檢查運行之前失敗：

1. `preflight` 決定存在哪些執行管道。`docs-scope` 和 `changed-scope` 邏輯是此作業中的步驟，而非獨立的作業。
2. `security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，而不必等待較繁重的構件和平台矩陣作業。
3. `build-artifacts` 與快速的 Linux 管道重疊，因此下游取用者可以在共享構件準備就緒後立即開始。
4. 較繁重的平台和執行時管道隨之展開：`checks-fast-core`、`checks-fast-extensions`、`extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。
獨立的 `install-smoke` 工作流程透過其自身的 `preflight` 作業重複使用相同的範圍腳本。它根據更狹窄的 changed-smoke 訊號計算 `run_install_smoke`，因此 Docker/安裝 smoke 僅針對安裝、封裝和容器相關的變更執行。

在推送時，`checks` 矩陣會新增僅限推送的 `compat-node22` 管道。在提取請求時，會跳過該管道，且矩陣會保持專注於正常的測試/頻道管道。

## 執行器

| 執行器                           | 作業                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`、`security-fast`、`build-artifacts`、Linux 檢查、docs 檢查、Python skills、`android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                 |
| `macos-latest`                   | `macos-node`、`macos-swift`                                                                      |

## 本地對等項

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
