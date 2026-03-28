---
summary: Node + tsx "__name is not a function" 當機說明與變通方法
read_when:
  - Debugging Node-only dev scripts or watch mode failures
  - Investigating tsx/esbuild loader crashes in OpenClaw
title: "Node + tsx 當機"
---

# Node + tsx "\_\_name is not a function" 當機

## 摘要

透過 Node 使用 `tsx` 執行 OpenClaw 時，在啟動時失敗：

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

這是將開發腳本從 Bun 切換到 `tsx` 後開始發生的（提交 `2871657e`，2026-01-06）。相同的執行路徑在 Bun 上運作正常。

## 環境

- Node：v25.x（觀察於 v25.3.0）
- tsx：4.21.0
- 作業系統：macOS（在其他執行 Node 25 的平台上也可能重現）

## 重現（僅限 Node）

```exec
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## 儲存庫中的最小重現

```exec
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Node 版本檢查

- Node 25.3.0：失敗
- Node 22.22.0（Homebrew `node@22`）：失敗
- Node 24：此處尚未安裝；需要驗證

## 備註 / 假設

- `tsx` 使用 esbuild 來轉換 TS/ESM。esbuild 的 `keepNames` 會發出 `__name` 輔助函式，並使用 `__name(...)` 包裝函式定義。
- 崩潰表示 `__name` 存在但在執行時不是函式，這意味著在 Node 25 載入器路徑中，該模組缺少此輔助函式或被覆蓋。
- 在其他 esbuild 使用者中，當輔助函式缺失或被重寫時，也有類似的 `__name` 輔助函式問題被回報。

## 回溯歷史

- `2871657e` (2026-01-06)：腳本從 Bun 改為 tsx，以使 Bun 成為可選項。
- 在此之前（Bun 路徑），`openclaw status` 和 `gateway:watch` 都運作正常。

## 變通方法

- 對於開發腳本使用 Bun（目前的暫時性回退）。
- 使用 Node + tsc watch，然後執行編譯後的輸出：

  ```exec
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- 已在本地確認：`pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` 在 Node 25 上正常運作。
- 如果可能的話，在 TS 載入器中停用 esbuild keepNames（防止插入 `__name` 輔助函式）；tsx 目前未公開此選項。
- 使用 `tsx` 測試 Node LTS (22/24)，查看此問題是否僅限於 Node 25。

## 參考資料

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## 後續步驟

- 在 Node 22/24 上重現問題，以確認 Node 25 的回歸。
- 測試 `tsx` 每夜構建版，如果存在已知的回歸，則鎖定到較早的版本。
- 如果在 Node LTS 上重現，請向上游提交帶有 `__name` 堆疊追蹤的最小重現案例。
