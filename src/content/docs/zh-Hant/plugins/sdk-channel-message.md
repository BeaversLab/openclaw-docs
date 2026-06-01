---
summary: "重新導向至 /plugins/sdk-channel-outbound"
title: "頻道訊息 API"
---

本頁面已移至 [Channel outbound API](/zh-Hant/plugins/sdk-channel-outbound)。

`openclaw/plugin-sdk/channel-message` 和
`openclaw/plugin-sdk/channel-message-runtime` 仍是舊版外掛程式的已棄用相容性
子路徑。新的頻道外掛程式應使用
`openclaw/plugin-sdk/channel-outbound` 來處理訊息生命週期、回執、持久
傳送及即時預覽協助程式。這些已棄用的子路徑是共享頻道訊息核心及專用 inbound/outbound SDK 介面的
精簡別名；
請勿在那裡新增協助程式。

移除計畫：在外部外掛程式遷移期間保留這些別名，
然後在呼叫者已移至
`channel-outbound` 後的下一次主要 SDK 清理作業中將其移除。
