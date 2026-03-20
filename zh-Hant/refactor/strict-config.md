---
summary: "嚴格配置驗證 + 僅限 Doctor 的遷移"
read_when:
  - 設計或實作配置驗證行為
  - 處理配置遷移或 Doctor 工作流程
  - 處理外掛配置綱要或外掛載入閘門
title: "嚴格配置驗證"
---

# 嚴格配置驗證（僅限 Doctor 的遷移）

## 目標

- **到處拒絕未知的配置金鑰**（根層級 + 巢狀層級），根層級 `$schema` 元資料除外。
- **拒絕沒有綱要的外掛配置**；不要載入該外掛。
- **移除載入時的舊版自動遷移**；遷移僅透過 Doctor 執行。
- **在啟動時自動執行 Doctor（試運行）**；如果無效，封鎖非診斷指令。

## 非目標

- 載入時的向後相容性（舊版金鑰不會自動遷移）。
- 靜默捨棄無法識別的金鑰。

## 嚴格驗證規則

- 配置必須在每個層級都完全符合綱要。
- 未知金鑰是驗證錯誤（根層級或巢狀層級都不允許通過），當根層級 `$schema` 是字串時除外。
- `plugins.entries.<id>.config` 必須由外掛的綱要進行驗證。
  - 如果外掛缺少綱要，**拒絕載入外掛**並顯示清楚的錯誤訊息。
- 未知的 `channels.<id>` 金鑰是錯誤，除非外掛清單宣告了頻道 ID。
- 外掛清單（`openclaw.plugin.json`）是所有外掛都需要的。

## 外掛綱要執行

- 每個外掛都為其配置提供嚴格的 JSON Schema（內嵌於清單中）。
- 外掛載入流程：
  1. 解析外掛清單 + 綱要（`openclaw.plugin.json`）。
  2. 根據綱要驗證配置。
  3. 如果缺少綱要或配置無效：封鎖外掛載入，記錄錯誤。
- 錯誤訊息包含：
  - 外掛 ID
  - 原因（缺少綱要 / 無效配置）
  - 驗證失敗的路徑
- 已停用的外掛會保留其配置，但 Doctor + 日誌會顯示警告。

## Doctor 流程

- 每次載入配置時 Doctor 都會**執行**（預設為試運行）。
- 如果配置無效：
  - 列印摘要 + 可採取行動的錯誤。
  - 指示：`openclaw doctor --fix`。
- `openclaw doctor --fix`：
  - 套用遷移。
  - 移除未知金鑰。
  - 寫入更新後的配置。

## 指令閘門（當配置無效時）

允許（僅限診斷）：

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他所有項目必須徹底失敗並顯示：“Config invalid. Run `openclaw doctor --fix`。”

## 錯誤 UX 格式

- 單一摘要標頭。
- 分組區段：
  - 未知鍵（完整路徑）
  - 舊版鍵 / 需要遷移
  - 外掛程式載入失敗（外掛程式 ID + 原因 + 路徑）

## 實作接觸點

- `src/config/zod-schema.ts`：移除根層級傳遞；到處使用嚴格物件。
- `src/config/zod-schema.providers.ts`：確保嚴格的通道架構。
- `src/config/validation.ts`：遇到未知鍵時失敗；不套用舊版遷移。
- `src/config/io.ts`：移除舊版自動遷移；總是執行 doctor dry-run。
- `src/config/legacy*.ts`：將使用方式移至僅限 doctor。
- `src/plugins/*`：新增架構登錄檔 + 閘道。
- `src/cli` 中的 CLI 指令閘道。

## 測試

- 未知鍵拒絕（根層級 + 巢狀）。
- 外掛程式缺少架構 → 外掛程式載入被阻擋並顯示清楚的錯誤。
- 無效設定 → 閘道啟動被阻擋，診斷指令除外。
- Doctor dry-run 自動；`doctor --fix` 寫入更正後的設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
