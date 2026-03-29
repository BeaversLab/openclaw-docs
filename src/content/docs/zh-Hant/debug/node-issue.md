---
summary: Node + tsx "__name is not a function" 潰潰筆記與解決方法
read_when:
  - Debugging Node-only dev scripts or watch mode failures
  - Investigating tsx/esbuild loader crashes in OpenClaw
title: "Node + tsx 潰潰"
---

# Node + tsx "\_\_name is not a function" 潰潰

## 摘要

透過 Node 使用 `tsx` 執行 OpenClaw 時，在啟動時失敗並顯示：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

這是在將開發腳本從 Bun 切換到 `tsx` 之後開始發生的（提交 `2871657e`，2026-01-06）。相同的執行路徑在 Bun 上運作正常。

## 環境

- Node：v25.x（在 v25.3.0 上觀察到）
- tsx：4.21.0
- OS：macOS（在其他執行 Node 25 的平台上也可能重現）

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
- Node 22.22.0 (Homebrew `node@22`)：失敗
- Node 24：此處尚未安裝；需要驗證

## 筆記 / 假設

- `tsx` 使用 esbuild 來轉換 TS/ESM。esbuild 的 `keepNames` 會發出一個 `__name` 輔助函數，並用 `__name(...)` 包裹函數定義。
- 潰潰表示 `__name` 在執行時期存在但不是函數，這意味著在 Node 25 的載入器路徑中，該模組缺少此輔助函數或被覆寫了。
- 在其他 esbuild 使用者中，當輔助函數缺失或被重寫時，也曾報告過類似的 `__name` 輔助函數問題。

## 回歸歷史

- `2871657e` (2026-01-06)：腳本從 Bun 更改為 tsx，以使 Bun 成為可選項。
- 在此之前（Bun 路徑），`openclaw status` 和 `gateway:watch` 運作正常。

## 解決方法

- 使用 Bun 執行開發腳本（目前暫時回退）。
- 使用 Node + tsc watch，然後執行編譯輸出：

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- 已在本地確認：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 可在 Node 25 上運作。
- 如果可能的話，在 TS 載入器中停用 esbuild keepNames（這可以防止插入 `__name` 輔助函數）；tsx 目前未公開此選項。
- 使用 `tsx` 測試 Node LTS (22/24)，以查看問題是否僅限於 Node 25。

## 參考資料

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 後續步驟

- 在 Node 22/24 上重現問題，以確認是否為 Node 25 的回歸問題。
- 測試 `tsx` 每夜版，如果存在已知的回歸問題，請固定到較早的版本。
- 如果在 Node LTS 上重現，請向上遊提交帶有 `__name` 堆疊追蹤的最小重現案例。
