---
title: Outbound Session Mirroring Refactor (Issue #1520)
description: 追蹤 outbound session mirroring 重構筆記、決策、測試及未結事項。
summary: "將 outbound sends mirror 至目標 channel session 的重構筆記"
read_when:
  - 正在處理 outbound transcript/session mirroring 行為
  - 除錯 send/message tool 路徑的 sessionKey 推導
---

# 輸出會話鏡像重構 (Issue #1520)

## 狀態

- 進行中。
- 核心 + 外掛頻道路由已針對輸出鏡像進行更新。
- Gateway 發送現在會在省略 sessionKey 時推導目標會話。

## 背景

輸出發送先前被鏡像到 _目前_ 的 agent 會話 (tool session key)，而非目標頻道會話。輸入路由使用 channel/peer session keys，因此輸出回應落到了錯誤的會話中，且首次接觸的目標通常缺少會話條目。

## 目標

- 將輸出訊息鏡像到目標頻道 session key。
- 在輸出時建立缺少的會話條目。
- 保持 thread/topic 範圍與輸入 session keys 一致。
- 涵蓋核心頻道以及內建擴充功能。

## 實作摘要

- 新的輸出會話路由輔助函式：
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` 使用 `buildAgentSessionKey` (dmScope + identityLinks) 建構目標 sessionKey。
  - `ensureOutboundSessionEntry` 透過 `recordSessionMetaFromInbound` 寫入最精簡的 `MsgContext`。
- `runMessageAction` (send) 推導目標 sessionKey 並將其傳遞給 `executeSendAction` 以進行 mirroring。
- `message-tool` 不再直接進行 mirroring；它僅從目前 session key 解析 agentId。
- Plugin send 路徑使用推導出的 sessionKey 透過 `appendAssistantMessageToSessionTranscript` 進行 mirroring。
- 當未提供目標會話金鑰 (預設 agent) 時，Gateway 發送會推導一個目標會話金鑰，並確保會話條目存在。

## Thread/Topic 處理

- Slack: replyTo/threadId -> `resolveThreadSessionKeys` (suffix)。
- Discord: threadId/replyTo -> `resolveThreadSessionKeys` 並帶有 `useSuffix=false` 以符合 inbound (thread channel id 已限定 session 範圍)。
- Telegram: topic IDs 透過 `buildTelegramGroupPeerId` 對應至 `chatId:topic:<id>`。

## 涵蓋的擴充功能

- Matrix、MS Teams、Mattermost、BlueBubbles、Nextcloud Talk、Zalo、Zalo Personal、Nostr、Tlon。
- 筆記：
  - Mattermost 目標現在會去除 `@` 以用於 DM session key 路由。
  - Zalo Personal 對 1:1 目標使用 DM peer kind (僅在 `group:` 存在時為群組)。
  - BlueBubbles 群組目標會去除 `chat_*` 前綴以符合 inbound session keys。
  - Slack 自動執行緒鏡像會不區分大小寫地比對頻道 ID。
  - Gateway send 在鏡像之前會將提供的 session keys 轉為小寫。

## 決策

- **Gateway send session 推導**：若提供 `sessionKey`，則使用它。若省略，則從目標 + 預設 agent 推導 sessionKey 並在該處 mirror。
- **Session 項目建立**：總是使用 `recordSessionMetaFromInbound`，並搭配符合 inbound 格式的 `Provider/From/To/ChatType/AccountId/Originating*`。
- **目標正規化**：outbound 路由在可用時使用已解析的目標 (在 `resolveChannelTarget` 之後)。
- **Session key 大小寫**：在寫入和遷移期間將 session keys 正規化為小寫。

## 新增/更新的測試

- `src/infra/outbound/outbound.test.ts`
  - Slack 執行緒 session key。
  - Telegram 主題 session key。
  - Discord 的 dmScope identityLinks。
- `src/agents/tools/message-tool.test.ts`
  - 從 session key 導出 agentId（未傳遞 sessionKey）。
- `src/gateway/server-methods/send.test.ts`
  - 當省略時導出 session key 並建立 session 項目。

## 未決事項 / 待辦事項

- 語音通話外掛使用自訂的 `voice:<phone>` 會話金鑰。出站對應在此並未標準化；若 message-tool 應支援語音通話發送，請新增明確對應。
- 確認是否有任何外部外掛使用內建集合以外的非標準 `From/To` 格式。

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

import en from "/components/footer/en.mdx";

<en />
