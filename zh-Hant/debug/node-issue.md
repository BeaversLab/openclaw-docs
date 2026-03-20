---
summary: Node + tsx "__name is not a function" 毀損筆記與變通方法
read_when:
  - 除錯僅限 Node 的開發腳本或監看模式失敗
  - 調查 OpenClaw 中的 tsx/esbuild 載入器毀損
title: "Node + tsx 毀損"
---

# Node + tsx "\_\_name is not a function" 毀損

## 摘要

透過 Node 使用 `tsx` 執行 OpenClaw 會在啟動時失敗，錯誤訊息如下：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

這是從 Bun 將開發腳本切換到 `tsx` 後開始發生的（提交 `2871657e`，2026-01-06）。相同的執行路徑在 Bun 上運作正常。

## 環境

- Node：v25.x（觀察於 v25.3.0）
- tsx：4.21.0
- OS：macOS（其他執行 Node 25 的平台也可能重現）

## 重現步驟（僅限 Node）

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 儲存庫中的最小重現

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本檢查

- Node 25.3.0：失敗
- Node 22.22.0（Homebrew `node@22`）：失敗
- Node 24：尚未在此安裝；需要驗證

## 備註 / 假設

- `tsx` 使用 esbuild 來轉換 TS/ESM。esbuild 的 `keepNames` 會發出 `__name` 輔助函式，並用 `__name(...)` 包裹函式定義。
- 此毀損表示 `__name` 存在但在執行時並非函式，這暗示在 Node 25 載入器路徑中，該模組缺少此輔助函式或被覆寫了。
- 當輔助函式遺失或被重寫時，在其他使用 esbuild 的專案中也曾回報過類似的 `__name` 輔助函式問題。

## 迴歸歷史

- `2871657e` (2026-01-06)：腳本從 Bun 改為 tsx，以讓 Bun 變為可選。
- 在此之前（Bun 路徑），`openclaw status` 和 `gateway:watch` 運作正常。

## 變通方法

- 使用 Bun 來執行開發腳本（目前的暫時還原）。
- 使用 Node + tsc watch，然後執行編譯輸出：

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- 已在本地確認：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 上可正常運作。
- 如果可能的話，在 TS 載入器中停用 esbuild 的 keepNames（防止插入 `__name` 輔助函式）；tsx 目前未公開此選項。
- 使用 `tsx` 測試 Node LTS (22/24)，以確認此問題是否僅發生於 Node 25。

## 參考資料

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 下一步

- 在 Node 22/24 上重現以確認 Node 25 的回歸問題。
- 測試 `tsx` 每夜版或如果存在已知回歸問題則鎖定到較早版本。
- 如果在 Node LTS 上重現，請附上 `__name` 堆疊追蹤向上游提交最小重現案例。

import en from "/components/footer/en.mdx";

<en />
