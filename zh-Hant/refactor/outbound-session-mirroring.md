---
title: Outbound Session Mirroring Refactor (Issue #1520)
description: 追蹤出站會話鏡像重構的筆記、決策、測試和待辦事項。
summary: "將出站發送鏡像到目標通道會話的重構筆記"
read_when:
  - Working on outbound transcript/session mirroring behavior
  - Debugging sessionKey derivation for send/message tool paths
---

# Outbound Session Mirroring Refactor (Issue #1520)

## 狀態

- 進行中。
- 核心 + 插件通道路由已針對出站鏡像進行更新。
- 當省略 sessionKey 時，網關發送現在會推導目標會話。

## 背景

出站發送之前被鏡像到「當前」代理會話（工具會話鍵），而不是目標通道會話。入站路由使用通道/對等會話鍵，因此出站回應落入了錯誤的會話，並且首次聯繫的目標通常缺少會話條目。

## 目標

- 將出站訊息鏡像到目標通道會話鍵。
- 在出站時建立缺失的會話條目。
- 保持 thread/topic 作用域與 inbound session keys 對齊。
- 涵蓋核心通道以及捆綁的擴充功能。

## 實作摘要

- 新的 outbound session routing helper：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey` (dmScope + identityLinks) 建構目標 sessionKey。
  - `ensureOutboundSessionEntry` 透過 `recordSessionMetaFromInbound` 寫入最少的 `MsgContext`。
- `runMessageAction` (send) 推導目標 sessionKey 並將其傳遞給 `executeSendAction` 以進行 mirroring。
- `message-tool` 不再直接 mirror；它僅從當前 session key 解析 agentId。
- Plugin send 路徑使用推導出的 sessionKey 透過 `appendAssistantMessageToSessionTranscript` 進行 mirror。
- Gateway send 在未提供時推導目標 session key (預設 agent)，並確保有 session entry。

## 串列/主題處理

- Slack：replyTo/threadId -> `resolveThreadSessionKeys` (後綴)。
- Discord：threadId/replyTo -> `resolveThreadSessionKeys`，並使用 `useSuffix=false` 以符合傳入（thread channel id 已限制範圍）。
- Telegram：主題 ID 透過 `buildTelegramGroupPeerId` 對應到 `chatId:topic:<id>`。

## 涵蓋的擴充功能

- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 備註：
  - Mattermost 目標現在會移除 `@` 以進行 DM 會話金鑰路由。
  - Zalo Personal 針對 1:1 目標使用 DM peer kind（僅在存在 `group:` 時為群組）。
  - BlueBubbles 群組目標會移除 `chat_*` 前綴以符合傳入會話金鑰。
  - Slack 自動串列鏡像會不區分大小寫地比對頻道 ID。
  - Gateway send 會在鏡像之前將提供的 session keys 轉為小寫。

## 決策

- **Gateway send session 推導**：如果提供了 `sessionKey`，則使用它。如果省略，則從 target + default agent 推導 sessionKey 並在那裡進行鏡像。
- **Session 項目建立**：總是使用 `recordSessionMetaFromInbound` 並使用與 inbound 格式一致的 `Provider/From/To/ChatType/AccountId/Originating*`。
- **Target 正規化**：outbound routing 在可用時使用已解析的 targets （在 `resolveChannelTarget` 之後）。
- **Session key 大小寫**：在寫入和遷移期間將 session keys 正規化為小寫。

## 新增/更新的測試

- `src/infra/outbound/outbound.test.ts`
  - Slack thread session key。
  - Telegram topic session key。
  - dmScope identityLinks 與 Discord。
- `src/agents/tools/message-tool.test.ts`
  - 從 session key 推導 agentId （未傳遞 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 當省略時推導會話金鑰並建立會話項目。

## 待辦事項 / 後續追蹤

- Voice-call 外掛程式使用自訂的 `voice:<phone>` 會話金鑰。此處的對應並未標準化；如果 message-tool 應支援 voice-call 傳送，請新增明確的對應。
- 確認是否有任何外部外掛程式使用內建集合以外的非標準 `From/To` 格式。

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
