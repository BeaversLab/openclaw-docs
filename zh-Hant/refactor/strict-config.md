---
summary: "嚴格設定驗證 + 僅透過 doctor 的遷移"
read_when:
  - Designing or implementing config validation behavior
  - Working on config migrations or doctor workflows
  - Handling plugin config schemas or plugin load gating
title: "嚴格設定驗證"
---

# 嚴格設定驗證（僅透過 doctor 的遷移）

## 目標

- **在任何地方拒絕未知的設定鍵**（根層級 + 巢狀層級），根層級 `$schema` metadata 除外。
- **拒絕沒有 schema 的外掛設定**；不要載入該外掛。
- **移除載入時的舊版自動遷移**；遷移僅透過 doctor 執行。
- **啟動時自動執行 doctor（試執行/dry-run）**；如果無效，封鎖非診斷指令。

## 非目標

- 載入時的向後相容性（舊版鍵不會自動遷移）。
- 無聲地捨棄無法識別的鍵。

## 嚴格驗證規則

- 設定必須在每一層級都完全符合 schema。
- 未知鍵為驗證錯誤（根層級或巢狀層級皆不傳遞），除非根層級 `$schema` 為字串時例外。
- `plugins.entries.<id>.config` 必須透過外掛程式的綱要進行驗證。
  - 如果外掛程式缺少綱要，**拒絕載入外掛程式**並顯示清晰的錯誤。
- 未知的 `channels.<id>` 鍵是錯誤，除非外掛程式清單宣告了頻道 ID。
- 所有外掛程式都需要外掛程式清單 (`openclaw.plugin.json`)。

## 外掛程式綱要強制執行

- 每個外掛程式都為其組態提供嚴格的 JSON 綱要（內嵌於清單中）。
- 外掛程式載入流程：
  1. 解析外掛程式清單與綱要 (`openclaw.plugin.json`)。
  2. 根據綱要驗證組態。
  3. 如果缺少綱要或組態無效：阻擋外掛程式載入，記錄錯誤。
- 錯誤訊息包括：
  - 外掛程式 ID
  - 原因（缺少綱要 / 組態無效）
  - 驗證失敗的路徑
- 停用的外掛程式會保留其設定，但 Doctor + 記錄會顯示警告。

## Doctor 流程

- 每次載入設定時都會執行 Doctor（預設為試運行）。
- 如果設定無效：
  - 列印摘要 + 可採取行動的錯誤。
  - 指示：`openclaw doctor --fix`。
- `openclaw doctor --fix`：
  - 套用遷移。
  - 移除未知的金鑰。
  - 寫入更新後的設定。

## 指令閘道（當設定無效時）

允許（僅限診斷）：

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他所有內容都必須強制失敗並顯示：「設定無效。請執行 `openclaw doctor --fix`。」

## 錯誤 UX 格式

- 單一摘要標題。
- 分組區段：
  - 未知的金鑰（完整路徑）
  - 舊版金鑰 / 需要遷移
  - 外掛程式載入失敗（外掛程式 id + 原因 + 路徑）

## 實作接觸點

- `src/config/zod-schema.ts`: 移除根層級直通；到處使用嚴格物件。
- `src/config/zod-schema.providers.ts`: 確保嚴格的通道架構。
- `src/config/validation.ts`: 在遇到未知金鑰時失敗；不套用舊版遷移。
- `src/config/io.ts`: 移除舊版自動遷移；一律執行 doctor dry-run。
- `src/config/legacy*.ts`: 將使用僅限於 doctor。
- `src/plugins/*`: 新增架構註冊表 + 閘道控制。
- `src/cli` 中的 CLI 指令閘道控制。

## 測試

- 拒絕未知金鑰（根層級 + 巢狀層級）。
- 外掛程式缺少架構 → 外掛程式載入被阻擋並顯示清楚的錯誤。
- 無效設定 → 閘道啟動被阻擋，診斷指令除外。
- Doctor 自動 dry-run；`doctor --fix` 寫入更正後的設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
