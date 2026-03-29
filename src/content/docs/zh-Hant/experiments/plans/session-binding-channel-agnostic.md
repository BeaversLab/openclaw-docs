---
summary: "與頻道無關的 session 綁定架構與第一次實作的交付範圍"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "進行中"
last_updated: "2026-02-21"
title: "與頻道無關的 Session 綁定計畫"
---

# 與頻道無關的 Session 綁定計畫

## 概述

本文件定義了長期的與頻道無關的 session 綁定模型，以及下一次實作迭代的具體範圍。

目標：

- 將子代理 綁定的 session 路由變成核心功能
- 將特定頻道的行為保留在介面卡 中
- 避免 Discord 正常行為的回歸

## 為何存在

目前的行為混合了：

- 完成內容政策
- 目標路由政策
- Discord 特定細節

這導致了邊緣情況，例如：

- 並行執行時重複的主要和執行緒交付
- 重複使用的綁定管理器上使用了過時的權杖
- 缺少 webhook 傳送的活動計算

## 第一次迭代範圍

此迭代範圍受到刻意限制。

### 1. 新增與頻道無關的核心介面

新增綁定和路由的核心型別與服務介面。

提議的核心型別：

```ts
export type BindingTargetKind = "subagent" | "session";
export type BindingStatus = "active" | "ending" | "ended";

export type ConversationRef = {
  channel: string;
  accountId: string;
  conversationId: string;
  parentConversationId?: string;
};

export type SessionBindingRecord = {
  bindingId: string;
  targetSessionKey: string;
  targetKind: BindingTargetKind;
  conversation: ConversationRef;
  status: BindingStatus;
  boundAt: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
};
```

核心服務合約：

```ts
export interface SessionBindingService {
  bind(input: { targetSessionKey: string; targetKind: BindingTargetKind; conversation: ConversationRef; metadata?: Record<string, unknown>; ttlMs?: number }): Promise<SessionBindingRecord>;

  listBySession(targetSessionKey: string): SessionBindingRecord[];
  resolveByConversation(ref: ConversationRef): SessionBindingRecord | null;
  touch(bindingId: string, at?: number): void;
  unbind(input: { bindingId?: string; targetSessionKey?: string; reason: string }): Promise<SessionBindingRecord[]>;
}
```

### 2. 新增一個用於子代理完成內容的核心交付路由器

為完成事件新增單一目標解析路徑。

路由器合約：

```ts
export interface BoundDeliveryRouter {
  resolveDestination(input: { eventKind: "task_completion"; targetSessionKey: string; requester?: ConversationRef; failClosed: boolean }): {
    binding: SessionBindingRecord | null;
    mode: "bound" | "fallback";
    reason: string;
  };
}
```

對於此迭代：

- 僅有 `task_completion` 會透過此新路徑路由
- 其他事件類型的現有路徑保持不變

### 3. 將 Discord 保留為介面卡

Discord 仍是第一個介面卡實作。

介面卡職責：

- 建立/重複使用執行緒對話
- 透過 webhook 或頻道傳送繫結訊息
- 驗證執行緒狀態 (封存/刪除)
- 對應介面卡中繼資料 (webhook 身份、執行緒 ID)

### 4. 修正目前已知的正確性問題

此迭代必須完成：

- 重複使用現有執行緒綁定管理器時，更新權杖的使用
- 記錄基於 webhook 的 Discord 傳送的輸出活動
- 當為 session 模式完成內容選擇了綁定的執行緒目標時，停止隱含的主要頻道回退

### 5. 保留目前的執行時期安全預設值

對於已停用執行緒綁定產生的使用者，行為沒有變化。

預設值保持為：

- `channels.discord.threadBindings.spawnSubagentSessions = false`

結果：

- 一般的 Discord 使用者維持目前的行為
- 新的核心路徑僅影響已啟用的綁定階段完成傳送路由

## 不在第 1 次迭代中

明確延後：

- ACP 綁定目標 (`targetKind: "acp"`)
- Discord 以外的新頻道適配器
- 全面替換所有傳送路徑 (`spawn_ack`，未來的 `subagent_message`)
- 協議層級的變更
- 針對所有綁定持久化的儲存遷移/版本控制重新設計

關於 ACP 的備註：

- 介面設計為 ACP 預留了空間
- ACP 實作在此次迭代中尚未開始

## 路由不變性

這些不變性是第 1 次迭代的強制要求。

- 目的地選擇和內容生成是分開的步驟
- 如果階段模式完成解析為一個有效的綁定目的地，傳送必須以該目的地為目標
- 沒有從綁定目的地到主頻道的隱藏重新路由
- 後備行為必須是明確且可觀察的

## 相容性和推出

相容性目標：

- 對於已關閉執行緒綁定產生的使用者，沒有回歸
- 在此迭代中，非 Discord 頻道沒有變更

推出：

1. 在現有的功能開關後放置介面和路由器。
2. 將 Discord 完成模式綁定傳送透過路由器路由。
3. 為非綁定流程保留舊路徑。
4. 透過針對性測試和金絲雀執行時記錄進行驗證。

## 第 1 次迭代所需的測試

需要單元和整合測試覆蓋率：

- 管理員令牌輪換在管理員重複使用後使用最新令牌
- webhook 發送更新頻道活動時間戳記
- 同一個請求者頻道中的兩個有效綁定階段不會重複到主頻道
- 綁定階段模式執行的完成僅解析為執行緒目的地
- 停用的產生標誌使舊行為保持不變

## 建議的實作檔案

核心：

- `src/infra/outbound/session-binding-service.ts` (新增)
- `src/infra/outbound/bound-delivery-router.ts` (新增)
- `src/agents/subagent-announce.ts` (完成目的地解析整合)

Discord 適配器和執行時：

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

測試：

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## 第 1 次迭代的完成標準

- 核心介面已存在並已接線用於完成路由
- 上述的正確性修復已與測試合併
- 在繫結執行的會話模式下，不會有主串和執行緒重複的完成交付
- 已停用繫結生成部署的行為沒有變化
- ACP 保持明確延期
