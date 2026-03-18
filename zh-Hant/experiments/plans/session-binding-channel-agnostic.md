---
summary: "與管道無關的會話綁定架構與第 1 次交付範圍"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "in-progress"
last_updated: "2026-02-21"
title: "Session Binding Channel Agnostic Plan"
---

# 與管道無關的會話綁定計劃

## 概覽

本文件定義了長期的與管道無關的會話綁定模型，以及下一次實作迭代的具體範圍。

目標：

- 讓子代理綁定會話路由成為一項核心能力
- 將特定管道的行為保留在適配器中
- 避免在正常 Discord 行為上出現回歸

## 為何存在

當前行為混合了：

- 完成內容政策
- 目的地路由政策
- Discord 特定細節

這導致了諸如以下邊緣情況：

- 併發執行時重複的主貼文和執行緒交付
- 重複使用綁定管理器時使用過時的 Token
- 遺漏 Webhook 發送的活動記錄

## 第 1 次迭代範圍

本迭代特意受到限制。

### 1. 新增與管道無關的核心介面

新增用於綁定和路由的核心類型與服務介面。

提議的核心類型：

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

### 2. 新增一個用於子代理完成的核心交付路由器

為完成事件新增單一的目的地解析路徑。

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

對於本次迭代：

- 僅有 `task_completion` 透過此新路徑進行路由
- 其他事件類型的現有路徑保持不變

### 3. 將 Discord 保留為適配器

Discord 仍然是第一個適配器實作。

適配器職責：

- 建立/重複使用執行緒對話
- 透過 Webhook 或管道發送發送綁定訊息
- 驗證執行緒狀態（已封存/已刪除）
- 對應適配器中繼資料（Webhook 身份、執行緒 ID）

### 4. 修復目前已知的正確性問題

本次迭代必須完成：

- 重複使用現有執行緒綁定管理器時更新 Token 使用
- 記錄基於 Webhook 的 Discord 發送的出站活動
- 當為會話模式完成選擇綁定執行緒目的地時，停止隱含的主管道回退

### 5. 保留當前的執行時安全預設值

對於停用了線程綁定生成的用戶，行為沒有變化。

預設值保持：

- `channels.discord.threadBindings.spawnSubagentSessions = false`

結果：

- 普通 Discord 用戶保持當前行為
- 新的核心路徑僅在已啟用的綁定會話完成路由中生效

## 不在第 1 次迭代中

明確推遲：

- ACP 綁定目標 (`targetKind: "acp"`)
- Discord 以外的新通道適配器
- 全局替換所有傳遞路徑 (`spawn_ack`，未來的 `subagent_message`)
- 協議級別的更改
- 針對所有綁定持久化的存儲遷移/版本控制重新設計

關於 ACP 的註記：

- 接口設計為 ACP 預留了空間
- ACP 的實施不在此迭代中開始

## 路由不變性

這些不變性對於第 1 次迭代是強制性的。

- 目標選擇和內容生成是分開的步驟
- 如果會話模式完成解析為活躍的綁定目標，傳遞必須以該目標為對象
- 沒有從綁定目標到主通道的隱式重新路由
- 後備行為必須是明確且可觀察的

## 兼容性和推出

兼容性目標：

- 對於關閉了線程綁定生成的用戶沒有回歸
- 在此迭代中，非 Discord 通道沒有變更

推出：

1. 在當前功能門控後落地接口和路由器。
2. 將 Discord 完成模式綁定傳遞路由通過路由器。
3. 為非綁定流程保留舊路徑。
4. 通過定向測試和金絲雀運行時日誌進行驗證。

## 第 1 次迭代中所需的測試

需要單元和集成覆蓋：

- 管理器令牌輪換在管理器重用後使用最新令牌
- webhook 發送更新通道活動時間戳
- 同一請求者通道中的兩個活躍綁定會話不會重複到主通道
- 綁定會話模式運行的完成僅解析為線程目標
- 停用的生成標誌使舊行為保持不變

## 建議的實施文件

核心：

- `src/infra/outbound/session-binding-service.ts` (新增)
- `src/infra/outbound/bound-delivery-router.ts` (新增)
- `src/agents/subagent-announce.ts` (完成目標解析集成)

Discord 適配器和運行時：

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

測試：

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## 迭代 1 的完成標準

- 核心介面已存在並已連接用於完成路由
- 上述的正確性修復已與測試合併
- 在會話模式綁定執行中，沒有主執行緒和執行緒重複的完成傳遞
- 對於停用綁定生成的部署，沒有行為變更
- ACP 保持明確延遲

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
