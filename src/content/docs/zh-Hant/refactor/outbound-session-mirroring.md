---
title: Outbound Session Mirroring 重構（Issue #1520）
description: 追蹤 outbound session mirroring 重構的筆記、決策、測試和未完成項目。
summary: "將 outbound sends 鏡像到目標通道 session 的重構筆記"
read_when:
  - Working on outbound transcript/session mirroring behavior
  - Debugging sessionKey derivation for send/message tool paths
---

# Outbound Session Mirroring 重構（Issue #1520）

## 狀態

- 進行中。
- 核心 + 外掛通道路由已針對 outbound mirroring 進行更新。
- Gateway send 現在會在省略 sessionKey 時推導目標 session。

## 背景

Outbound sends 之前被鏡像到*當前* agent session（tool session key），而非目標通道 session。Inbound routing 使用 channel/peer session keys，因此 outbound responses 會落在錯誤的 session 中，且首次接觸的目標通常缺少 session entries。

## 目標

- 將 outbound messages 鏡像到目標通道 session key。
- 在 outbound 時建立缺失的 session entries。
- 保持 thread/topic 範圍與 inbound session keys 一致。
- 涵蓋核心通道以及隨附的外掛。

## 實作摘要

- 新的 outbound session routing 輔助函式：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey` (dmScope + identityLinks) 建構目標 sessionKey。
  - `ensureOutboundSessionEntry` 透過 `recordSessionMetaFromInbound` 寫入最少的 `MsgContext`。
- `runMessageAction` (send) 推導目標 sessionKey 並將其傳遞給 `executeSendAction` 進行鏡像。
- `message-tool` 不再直接進行鏡像；它僅從當前 session key 解析 agentId。
- 外掛 send 路徑使用推導出的 sessionKey 透過 `appendAssistantMessageToSessionTranscript` 進行鏡像。
- 當未提供目標 session key 時（預設 agent），Gateway send 會推導一個目標 session key，並確保存在一個 session entry。

## Thread/Topic 處理

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (suffix)。
- Discord: threadId/replyTo -> `resolveThreadSessionKeys` 搭配 `useSuffix=false` 以符合 inbound（thread channel id 已經作為 session 的範圍）。
- Telegram: topic IDs 透過 `buildTelegramGroupPeerId` 對應到 `chatId:topic:<id>`。

## 涵蓋的外掛

- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 筆記：
  - Mattermost 目標現在會剝離 `@` 以進行 DM session key 路由。
  - Zalo Personal 對 1:1 目標使用 DM peer kind（僅當存在 `group:` 時使用 group）。
  - BlueBubbles 群組目標會剝離 `chat_*` 前綴以匹配 inbound session keys。
  - Slack 自動執行緒映射會以不區分大小寫的方式匹配頻道 ID。
  - Gateway 發送在映射前會將提供的 session keys 轉為小寫。

## 決策

- **Gateway 發送 session 推導**：如果提供了 `sessionKey`，則使用它。如果省略，則從目標 + 預設代理推導出 sessionKey 並在那裡映射。
- **Session 條目建立**：總是使用 `recordSessionMetaFromInbound` 並使用 `Provider/From/To/ChatType/AccountId/Originating*` 對齊 inbound 格式。
- **目標正規化**：當可用時，outbound 路由使用已解析的目標（在 `resolveChannelTarget` 之後）。
- **Session key 大小寫**：在寫入和遷移期間將 session keys 正規化為小寫。

## 已新增/更新的測試

- `src/infra/outbound/outbound.test.ts`
  - Slack 執行緒 session key。
  - Telegram 主題 session key。
  - Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 從 session key 推導 agentId（未傳遞 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 省略時推導 session key 並建立 session 條目。

## 待辦事項 / 後續追蹤

- 通話外掛使用自訂 `voice:<phone>` session keys。此處未標準化 outbound 映射；如果 message-tool 應支援通話發送，請新增顯式映射。
- 確認是否有任何外部外掛使用超出內建集合的非標準 `From/To` 格式。

## 修改的檔案

- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- 測試位於：
  - `src/infra/outbound/outbound.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`
