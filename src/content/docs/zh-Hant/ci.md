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

| Job                              | 用途                                                                        | 執行時機                         |
| -------------------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| `preflight`                      | 偵測純文件變更、變更範圍、變更副檔名，並建構 CI 清單                        | 一律在非草稿的推送和 PR 上執行   |
| `security-scm-fast`              | 透過 `zizmor` 進行私密金鑰偵測與工作流程稽核                                | 一律在非草稿的推送和 PR 上執行   |
| `security-dependency-audit`      | 無需相依性的生產環境鎖定檔案稽核，對照 npm 公告                             | 在所有非草稿推入與 PR 上恆常執行 |
| `security-fast`                  | 快速安全性工作的必要彙總                                                    | 在所有非草稿推入與 PR 上恆常執行 |
| `build-artifacts`                | 建置 `dist/` 與控制 UI 一次，上傳可重複使用的成品供下游工作使用             | Node 相關變更                    |
| `checks-fast-core`               | 快速的 Linux 正確性跑道，例如 bundled/plugin-contract/protocol 檢查         | 節點相關變更                     |
| `checks-fast-contracts-channels` | 分區的通道合約檢查，並提供穩定的彙總檢查結果                                | Node 相關變更                    |
| `checks-node-extensions`         | 橫跨擴充套件套件的完整 bundled-plugin 測試分區                              | Node 相關變更                    |
| `checks-node-core-test`          | 核心 Node 測試分區，排除通道、bundled、合約與擴充套件跑道                   | Node 相關變更                    |
| `extension-fast`                 | 僅針對變更的 bundled 外掛進行專注測試                                       | 偵測到擴充套件變更時             |
| `check`                          | 分區的主要本地閘道對等項目：prod 類型、lint、guards、測試類型與嚴格的 smoke | 節點相關變更                     |
| `check-additional`               | 架構、邊界、擴充套件表面 guards、套件邊界與 gateway-watch 分區              | Node 相關變更                    |
| `build-smoke`                    | Built-CLI 測試與啟動記憶體測試                                              | Node 相關變更                    |
| `checks`                         | 剩餘的 Linux Node 跑道：通道測試與僅限推入的 Node 22 相容性                 | Node 相關變更                    |
| `check-docs`                     | 文件格式、lint 與失效連結檢查                                               | 文件變更時                       |
| `skills-python`                  | Python 支援技能的 Ruff + pytest                                             | Python 技能相關變更              |
| `checks-windows`                 | Windows 專用測試跑道                                                        | Windows 相關變更                 |
| `macos-node`                     | 使用共用建置成品的 macOS TypeScript 測試跑道                                | macOS 相關變更                   |
| `macos-swift`                    | macOS app 的 Swift lint、建置與測試                                         | macOS 相關變更                   |
| `android`                        | Android 建置與測試矩陣                                                      | Android 相關變更                 |

## 快速失敗順序

作業的排序會讓廉價的檢查在昂貴的作業執行前先失敗：

1. `preflight` 決定哪些通道實際上存在。`docs-scope` 和 `changed-scope` 邏輯是此作業內的步驟，而非獨立的作業。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，無需等待較繁重的構建產物和平台矩陣作業。
3. `build-artifacts` 與快速 Linux 通道重疊，因此下游使用者在共用構建準備好後就能立即開始。
4. 在那之後，較繁重的平台和執行時通道會展開：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、`extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

範圍邏輯位於 `scripts/ci-changed-scope.mjs`，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試覆蓋。
獨立的 `install-smoke` 工作流程透過其自身的 `preflight` 作業重複使用相同的範圍腳本。它根據更狹窄的 changed-smoke 信號計算 `run_install_smoke`，因此 Docker/安裝冒煙測試僅針對安裝、打包和容器相關變更執行。

本地變更通道邏輯位於 `scripts/changed-lanes.mjs` 並由 `scripts/check-changed.mjs` 執行。該本地閘道對架構邊界的要求比廣泛的 CI 平台範圍更嚴格：核心生產變更執行核心生產型別檢查加上核心測試，核心僅測試變更僅執行核心測試型別檢查/測試，擴充生產變更執行擴充生產型別檢查加上擴充測試，擴充僅測試變更僅執行擴充測試型別檢查/測試。公開 Plugin SDK 或 plugin-contract 變更會擴展至擴充驗證，因為擴充功能依賴這些核心合約。未知的根/配置變更會失效安全並執行所有通道。

在推送時，`checks` 矩陣會新增僅限推送的 `compat-node22` 通道。在拉取請求中，該通道會被跳過，矩陣則會專注於正常的測試/通道通道。

最慢的 Node 測試組會被拆分成 include-file 分片，以確保每個任務保持輕量：channel contracts 將 registry 和 core coverage 各拆分為八個加權分片，auto-reply reply command 測試拆分為四個 include-pattern 分片，而其他大型 auto-reply reply prefix 群組各拆分為兩個分片。`check-additional` 也會將 package-boundary compile/canary 工作與 runtime topology gateway/architecture 工作分開。

當有新的推送推送到同一個 PR 或 `main` ref 時，GitHub 可能會將被取代的任務標記為 `cancelled`。除非同一 ref 的最新執行也失敗，否則請將此視為 CI 噪音。Aggregate shard checks 會明確指出此取消情況，以便更容易將其與測試失敗區分開來。

## 執行器

| 執行器                           | 工作                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`, `security-scm-fast`, `security-dependency-audit`, `security-fast`, `build-artifacts`, Linux 檢查, 文件檢查, Python 技能, `android` |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                                                                |
| `macos-latest`                   | `macos-node`, `macos-swift`                                                                                                                     |

## 本地對等指令

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local gate: changed typecheck/lint/tests by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
```
