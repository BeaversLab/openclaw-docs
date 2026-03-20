---
summary: "Channel agnostic session binding architecture and iteration 1 delivery scope"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "in-progress"
last_updated: "2026-02-21"
title: "Session Binding Channel Agnostic Plan"
---

# Session Binding Channel Agnostic Plan

## Overview

This document defines the long term channel agnostic session binding model and the concrete scope for the next implementation iteration.

Goal:

- make subagent bound session routing a core capability
- keep channel specific behavior in adapters
- avoid regressions in normal Discord behavior

## Why this exists

Current behavior mixes:

- completion content policy
- destination routing policy
- Discord specific details

This caused edge cases such as:

- duplicate main and thread delivery under concurrent runs
- stale token usage on reused binding managers
- missing activity accounting for webhook sends

## Iteration 1 scope

This iteration is intentionally limited.

### 1. Add channel agnostic core interfaces

Add core types and service interfaces for bindings and routing.

Proposed core types:

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

Core service contract:

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

### 2. Add one core delivery router for subagent completions

Add a single destination resolution path for completion events.

Router contract:

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

For this iteration:

- only `task_completion` is routed through this new path
- existing paths for other event kinds remain as-is

### 3. Keep Discord as adapter

Discord remains the first adapter implementation.

Adapter responsibilities:

- create/reuse thread conversations
- send bound messages via webhook or channel send
- validate thread state (archived/deleted)
- map adapter metadata (webhook identity, thread ids)

### 4. Fix currently known correctness issues

Required in this iteration:

- refresh token usage when reusing existing thread binding manager
- record outbound activity for webhook based Discord sends
- stop implicit main channel fallback when a bound thread destination is selected for session mode completion

### 5. Preserve current runtime safety defaults

No behavior change for users with thread bound spawn disabled.

Defaults stay:

- `channels.discord.threadBindings.spawnSubagentSessions = false`

Result:

- 一般的 Discord 使用者維持目前的行為
- 新的核心路徑僅影響啟用後的綁定會話完成路由

## 不在第一次迭代中

明確延後：

- ACP 綁定目標 (`targetKind: "acp"`)
- Discord 以外的新通道適配器
- 全面替換所有傳遞路徑 (`spawn_ack`，未來的 `subagent_message`)
- 協議層級的變更
- 針對所有綁定持久化的儲存遷移/版本控制重新設計

關於 ACP 的備註：

- 介面設計為 ACP 預留空間
- ACP 實作不會在此迭代中啟動

## 路由不變性

這些不變性對於第一次迭代是強制性的。

- 目的端選擇和內容生成是分開的步驟
- 如果會話模式完成解析為作用中的綁定目的端，傳遞必須以該目的端為目標
- 不得從綁定目的端隱性地重新路由到主頻道
- 後援行為必須是明確且可觀察的

## 相容性和推出

相容性目標：

- 對於關閉執行緒綁定生成的使用者，不得有回歸
- 在此迭代中不變更非 Discord 頻道

推出計畫：

1. 在現有的功能開關後方實作介面和路由器。
2. 透過路由器路由 Discord 完成模式綁定的傳遞。
3. 為非綁定流程保留舊版路徑。
4. 透過目標測試和金絲雀執行階段日誌進行驗證。

## 第一次迭代中所需的測試

需要單元和整合覆蓋率：

- 管理器權杖輪換在管理器重複使用後會使用最新的權杖
- webhook 發送更新頻道活動時間戳記
- 同一個請求者頻道中的兩個作用中綁定會話不會重複到主頻道
- 綁定會話模式執行的完成僅解析為執行緒目的端
- 停用的生成旗標會維持舊版行為不變

## 提議的實作檔案

核心：

- `src/infra/outbound/session-binding-service.ts` (新增)
- `src/infra/outbound/bound-delivery-router.ts` (新增)
- `src/agents/subagent-announce.ts` (完成目的端解析整合)

Discord 適配器和執行階段：

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

測試：

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## 第一次迭代的完成準則

- 核心介面已存在並已完成完成路由的連接
- 上述的正確性修復已與測試合併
- 「在繫結執行的會話模式下，不會有主訊息和執行緒重複的完成內容傳遞」
- 「已停用繫結生成部署的行為不變」
- 「ACP 仍然明確延後」

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
