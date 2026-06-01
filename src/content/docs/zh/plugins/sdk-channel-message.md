---
summary: "重定向到 /plugins/sdk-渠道-outbound"
title: "APIChannel message API"
---

此页面已移至 [Channel outbound API](API/en/plugins/sdk-channel-outbound)。

`openclaw/plugin-sdk/channel-message` 和
`openclaw/plugin-sdk/channel-message-runtime` 仍为旧版插件保留的已弃用兼容性
子路径。新的渠道插件应使用
`openclaw/plugin-sdk/channel-outbound` 来处理消息生命周期、回执、持久化
发送和实时预览辅助程序。这些已弃用的子路径是
共享渠道消息核心和专用的入站/出站 SDK 表面之上的精简别名；
请勿在那里添加新的辅助程序。

移除计划：在外部插件迁移窗口内保留这些别名，
待调用者迁移至
`channel-outbound` 后，在下次主要的 SDK 清理中将其移除。
