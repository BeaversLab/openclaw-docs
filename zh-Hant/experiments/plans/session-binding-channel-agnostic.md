---
summary: "與通道無關的會話綁定架構與第 1 次交付範圍"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "進行中"
last_updated: "2026-02-21"
title: "與通道無關的會話綁定計劃"
---

# 與通道無關的會話綁定計劃

## 概觀

本文定義了長期的與通道無關的會話綁定模型，以及下一次實作迭代的具體範圍。

目標：

- 將子代理綁定的會話路由變為核心功能
- 將通道特定行為保留在配接器中
- 避免正常的 Discord 行為出現回歸

## 存在的理由

目前的行為混合了：

- 生成內容政策
- 目標地路由政策
- Discord 特定細節

這導致了諸如以下邊緣情況：

- 並發執行時主通道和執行緒的重複遞送
- 在重複使用的綁定管理器上使用了過時的令牌
- 遺漏了 Webhook 發送的活動記錄

## 第 1 次迭代範圍

此次迭代是有意限制範圍的。

### 1. 新增與通道無關的核心介面

新增用於綁定和路由的核心型別與服務介面。

建議的核心型別：

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
  bind(input: {
    targetSessionKey: string;
    targetKind: BindingTargetKind;
    conversation: ConversationRef;
    metadata?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<SessionBindingRecord>;

  listBySession(targetSessionKey: string): SessionBindingRecord[];
  resolveByConversation(ref: ConversationRef): SessionBindingRecord | null;
  touch(bindingId: string, at?: number): void;
  unbind(input: {
    bindingId?: string;
    targetSessionKey?: string;
    reason: string;
  }): Promise<SessionBindingRecord[]>;
}
```

### 2. 為子代理程式完成項新增一個核心遞送路由器

為完成事件新增單一目標解析路徑。

路由器合約：

```ts
export interface BoundDeliveryRouter {
  resolveDestination(input: {
    eventKind: "task_completion";
    targetSessionKey: string;
    requester?: ConversationRef;
    failClosed: boolean;
  }): {
    binding: SessionBindingRecord | null;
    mode: "bound" | "fallback";
    reason: string;
  };
}
```

對於此次迭代：

- 只有 `task_completion` 經由這個新路徑進行路由
- 其他事件類型的既有路徑保持不變

### 3. 將 Discord 保留為轉接器

Discord 仍是第一個轉接器實作。

轉接器職責：

- 建立/重複使用執行緒對話
- 透過 Webhook 或通道發送來傳送綁定訊息
- 驗證執行緒狀態（已封存/已刪除）
- 映射介接器元資料（webhook 身份、執行緒 ID）

### 4. 修正目前已知的正確性問題

本迭代所需：

- 重複使用現有執行緒綁定管理器時重新整理 token 使用
- 記錄基於 webhook 的 Discord 傳送的出站活動
- 當會話模式完成選擇了綁定的執行緒目的地時，停止隱含的主通道回退

### 5. 保留目前的執行時安全預設值

停用了執行緒綁定生成 的使用者行為不變。

預設值保持：

- `channels.discord.threadBindings.spawnSubagentSessions = false`

結果：

- 一般 Discord 使用者維持目前的行為
- 新的核心路徑僅影響已啟用的綁定會話完成路由

## 不在第 1 次迭代中

明確延後：

- ACP 綁定目標（`targetKind: "acp"`）
- Discord 以外的新通道介接器
- 所有傳遞路徑的全域替換（`spawn_ack`，未來的 `subagent_message`）
- 協議層級變更
- 針對所有綁定持久化的儲存遷移/版本控制重新設計

關於 ACP 的筆記：

- 介面設計保留了 ACP 的空間
- 此迭代不會開始 ACP 的實作

## 路由不變性

這些不變性對於迭代 1 是強制性的。

- 目的地選擇和內容生成是分開的步驟
- 如果會話模式完成解析到有效的綁定目的地，傳遞必須以該目的地為目標
- 不得有從綁定目的地到主頻道的隱藏重新路由
- 後備行為必須是明確且可觀察的

## 相容性和推出

相容性目標：

- 對於關閉執行緒綁定生成的使用者，不得有迴歸
- 此迭代不會變更非 Discord 頻道

推出：

1. 在現有功能門控後合併介面和路由器。
2. 透過路由器傳輸 Discord 完成模式綁定的傳送。
3. 為非綁定流程保留舊版路徑。
4. 透過針對性測試和 Canary 運行時日誌進行驗證。

## 第 1 次疊代所需的測試

需要單元和整合測試覆蓋範圍：

- manager token 輪換在 manager 重複使用後使用最新的 token
- webhook 發送更新頻道活動時間戳記
- 同一請求者頻道中的兩個作用中綁定會話不會重複發送到主頻道
- 綁定會話模式運行的完成僅解析至執行緒目標地
- 停用的生成 標誌保持舊版行為不變

## 建議的實作檔案

核心：

- `src/infra/outbound/session-binding-service.ts` (新增)
- `src/infra/outbound/bound-delivery-router.ts` (新增)
- `src/agents/subagent-announce.ts` (完成目標地解析整合)

Discord 配接器和運行時：

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

測試：

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## 第 1 次迭代的完成標準

- 核心介面已存在並已接線至完成路由
- 上述的正確性修正已合併並包含測試
- 在會話模式綁定執行中，無主要和執行緒重複的完成傳遞
- 已停用綁定生成部署的行為無變更
- ACP 仍明確延後

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
