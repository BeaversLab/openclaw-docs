---
summary: "Holy grail refactor plan for one unified runtime streaming pipeline across main, subagent, and ACP"
owner: "onutc"
status: "draft"
last_updated: "2026-02-25"
title: "Unified Runtime Streaming Refactor Plan"
---

# Unified Runtime Streaming Refactor Plan

## Objective

Deliver one shared streaming pipeline for `main`, `subagent`, and `acp` so all runtimes get identical coalescing, chunking, delivery ordering, and crash recovery behavior.

## Why this exists

- Current behavior is split across multiple runtime-specific shaping paths.
- Formatting/coalescing bugs can be fixed in one path but remain in others.
- Delivery consistency, duplicate suppression, and recovery semantics are harder to reason about.

## Target architecture

Single pipeline, runtime-specific adapters:

1. Runtime adapters emit canonical events only.
2. Shared stream assembler coalesces and finalizes text/tool/status events.
3. Shared channel projector applies channel-specific chunking/formatting once.
4. Shared delivery ledger enforces idempotent send/replay semantics.
5. Outbound channel adapter executes sends and records delivery checkpoints.

Canonical event contract:

- `turn_started`
- `text_delta`
- `block_final`
- `tool_started`
- `tool_finished`
- `status`
- `turn_completed`
- `turn_failed`
- `turn_cancelled`

## Workstreams

### 1) Canonical streaming contract

- Define strict event schema + validation in core.
- Add adapter contract tests to guarantee each runtime emits compatible events.
- Reject malformed runtime events early and surface structured diagnostics.

### 2) Shared stream processor

- Replace runtime-specific coalescer/projector logic with one processor.
- Processor owns text delta buffering, idle flush, max-chunk splitting, and completion flush.
- 將 ACP/main/subagent 配置解析移至一個輔助函式中，以防止差異。

### 3) 共用通道投影

- 保持通道配接器簡單：接受最終區塊並發送。
- 將 Discord 特有的分塊怪癖僅移至通道投影器。
- 在投影之前，保持管線與通道無關。

### 4) 傳遞帳本 + 重放

- 新增每回合/每區塊的傳遞 ID。
- 在實體發送前後記錄檢查點。
- 重啟時，等幂地重播暫止區塊並避免重複。

### 5) 遷移與切換

- 第一階段：影子模式（新管線計算輸出，但由舊路徑發送；進行比較）。
- 第二階段：依執行時期逐一切換（`acp`，然後 `subagent`，然後 `main` 或依風險反向順序）。
- 第三階段：刪除舊版特定於執行時期的串流程式碼。

## 非目標

- 在此重構中不變更 ACP 政策/權限模型。
- 除投影相容性修正外，不進行特定通道的功能擴充。
- 不重新設計傳輸/後端（除非需要事件同等性，否則 acpx 外掛程式合約保持不變）。

## 風險與緩解措施

- 風險：現有 main/subagent 路徑的行為回歸。
  緩解措施：影子模式差異比對 + 配接器合約測試 + 通道端對端測試。
- 風險：當機恢復期間重複發送。
  緩解措施：持久化傳遞 ID + 傳遞配接器中的等幂重放。
- 風險：執行時期配接器再次分歧。
  緩解措施：所有配接器必須通過共用的合約測試套件。

## 驗收標準

- 所有執行時期皆通過共用的串流合約測試。
- Discord ACP/main/subagent 對於微小增量產生等效的間距/分塊行為。
- 當機/重啟重放時，不會對相同的傳遞 ID 發送重複的區塊。
- 舊版 ACP 投影器/合併器路徑已移除。
- 串流配置解析是共用的，且獨立於執行時期。
