---
summary: "嚴格配置驗證 + 僅限 Doctor 的遷移"
read_when:
  - Designing or implementing config validation behavior
  - Working on config migrations or doctor workflows
  - Handling plugin config schemas or plugin load gating
title: "嚴格配置驗證"
---

# 嚴格配置驗證（僅限 Doctor 的遷移）

## 目標

- **拒絕任何位置未知配置鍵**（根層級 + 巢狀），根層級 `$schema` metadata 除外。
- **拒絕沒有架構的外掛配置**；不載入該外掛。
- **移除載入時的舊版自動遷移**；遷移僅透過 Doctor 執行。
- **啟動時自動執行 Doctor（試運行）**；如果無效，封鎖非診斷指令。

## 非目標

- 載入時的向後相容性（舊版鍵不會自動遷移）。
- 靜默丟棄無法識別的鍵。

## 嚴格驗證規則

- 配置必須在每個層級完全符合架構。
- 未知鍵為驗證錯誤（根層級或巢狀均不透傳），除非根層級 `$schema` 為字串。
- `plugins.entries.<id>.config` 必須透過外掛的架構進行驗證。
  - 如果外掛缺少架構，**拒絕載入外掛**並顯示明確錯誤。
- 未知的 `channels.<id>` 鍵為錯誤，除非外掛清單聲明了頻道 ID。
- 所有外掛都需要外掛清單 (`openclaw.plugin.json`)。

## 外掛架構執行

- 每個外掛為其配置提供一個嚴格的 JSON Schema（在清單中內聯）。
- 外掛載入流程：
  1. 解析外掛清單 + 架構 (`openclaw.plugin.json`)。
  2. 根據架構驗證配置。
  3. 如果缺少架構或配置無效：封鎖外掛載入，記錄錯誤。
- 錯誤訊息包括：
  - 外掛 ID
  - 原因（缺少架構 / 無效配置）
  - 驗證失敗的路徑
- 停用的外掛保留其配置，但 Doctor + 日誌會顯示警告。

## Doctor 流程

- Doctor **每次** 載入配置時都會執行（預設為試運行）。
- 如果配置無效：
  - 列印摘要 + 可操作的錯誤。
  - 指示：`openclaw doctor --fix`。
- `openclaw doctor --fix`：
  - 套用遷移。
  - 移除未知鍵。
  - 寫入更新的配置。

## 指令封鎖（當配置無效時）

允許（僅限診斷）：

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他所有操作必須硬性失敗並顯示：「Config invalid. Run `openclaw doctor --fix`。」

## 錯誤 UX 格式

- 單一摘要標題。
- 分組區塊：
  - 未知鍵（完整路徑）
  - 舊版鍵 / 需要遷移
  - 外掛程式載入失敗（外掛程式 ID + 原因 + 路徑）

## 實作接觸點

- `src/config/zod-schema.ts`：移除根傳遞；到處使用嚴格物件。
- `src/config/zod-schema.providers.ts`：確保嚴格的通道結構描述。
- `src/config/validation.ts`：遇到未知鍵時失敗；不要套用舊版遷移。
- `src/config/io.ts`：移除舊版自動遷移；始終執行 doctor 試執行。
- `src/config/legacy*.ts`：將使用範圍移至僅限 doctor。
- `src/plugins/*`：新增結構描述註冊表 + 閘道。
- `src/cli` 中的 CLI 指令閘道。

## 測試

- 未知鍵拒絕（根層級 + 巢狀層級）。
- 外掛程式缺少結構描述 → 外掛程式載入被阻擋並顯示明確錯誤。
- 無效的配置 → 閘道啟動被阻擋，診斷指令除外。
- Doctor 自動試執行；`doctor --fix` 寫入更正後的配置。
