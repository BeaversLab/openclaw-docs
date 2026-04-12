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

| Job                      | 用途                                                                | 執行時機                       |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------ |
| `preflight`              | 偵測純文件變更、變更範圍、變更副檔名，並建構 CI 清單                | 一律在非草稿的推送和 PR 上執行 |
| `security-fast`          | 金鑰偵測、透過 `zizmor` 進行工作流程稽核、生產環境相依性稽核        | 一律在非草稿的推送和 PR 上執行 |
| `build-artifacts`        | 建構 `dist/` 和 Control UI 一次，上傳可重構建的成品供下游工作使用   | Node 相關變更                  |
| `checks-fast-core`       | 快速的 Linux 正確性通道，例如 bundled/plugin-contract/protocol 檢查 | Node 相關變更                  |
| `checks-node-extensions` | 擴充套件套件的完整捆綁外掛程式測試分片                              | Node 相關變更                  |
| `checks-node-core-test`  | 核心節點測試分片，排除通道、捆綁、合約和擴充套件通道                | 節點相關變更                   |
| `extension-fast`         | 僅針對已變更捆綁外掛程式的專注測試                                  | 當偵測到擴充套件變更時         |
| `check`                  | CI 中的主要本地閘道：`pnpm check` 加上 `pnpm build:strict-smoke`    | Node 相關變更                  |
| `check-additional`       | 架構、邊界、匯入週期防護以及閘道監看回歸測試工具                    | Node 相關變更                  |
| `build-smoke`            | 建置 CLI 稽核測試和啟動記憶體稽核                                   | Node 相關變更                  |
| `checks`                 | 其餘 Linux 節點通道：通道測試和僅推送 Node 22 相容性                | 節點相關變更                   |
| `check-docs`             | 文件格式設定、Lint 和連結失效檢查                                   | 文件已變更                     |
| `skills-python`          | Python 支援技能的 Ruff + pytest                                     | Python 技能相關變更            |
| `checks-windows`         | Windows 專屬測試通道                                                | Windows 相關變更               |
| `macos-node`             | 使用共用建置成品的 macOS TypeScript 測試通道                        | macOS 相關變更                 |
| `macos-swift`            | macOS 應用程式的 Swift lint、建置和測試                             | macOS 相關變更                 |
| `android`                | Android 建置和測試矩陣                                              | Android 相關變更               |

## 快速失敗順序

工作的排序方式是讓廉價檢查在昂貴檢查運行之前失敗：

1. `preflight` 決定完全存在哪些通道。`docs-scope` 和 `changed-scope` 邏輯是此工作內的步驟，而非獨立工作。
2. `security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，無需等待較繁重的成品和平台矩陣工作。
3. `build-artifacts` 與快速 Linux 通道重疊，因此下游使用者在共用建置準備好時即可立即開始。
4. 之後會展開較繁重的平台和運行時通道：`checks-fast-core`、`checks-node-extensions`、`checks-node-core-test`、`extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

範圍邏輯位於 `scripts/ci-changed-scope.mjs`，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試覆蓋。
獨立的 `install-smoke` 工作流程透過其自己的 `preflight` 工作重複使用相同的範圍腳本。它根據更狹窄的 changed-smoke 信號計算 `run_install_smoke`，因此 Docker/安裝 smok e 僅針對安裝、封裝和容器相關的變更執行。

在推送時，`checks` 矩陣會新增僅限推送的 `compat-node22` 通道。在拉取請求時，該通道會被跳過，且矩陣會保持專注於正常的測試/通道通道。

## Runners

| Runner                           | Jobs                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`、`security-fast`、`build-artifacts`、Linux 檢查、docs 檢查、Python skills、`android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                 |
| `macos-latest`                   | `macos-node`、`macos-swift`                                                                      |

## Local Equivalents

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm check:import-cycles
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
