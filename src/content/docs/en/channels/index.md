---
summary: "Messaging platforms OpenClaw can connect to"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Chat channels"
---

OpenClaw can talk to you on any chat app you already use. Each channel connects via the Gateway.
Text is supported everywhere; media and reactions vary by channel.

## Delivery notes

- Telegram replies that contain markdown image syntax, such as `![alt](url)`,
  are converted into media replies on the final outbound path when possible.
- Slack multi-person DMs route as group chats, so group policy, mention
  behavior, and group-session rules apply to MPIM conversations.
- WhatsApp setup is install-on-demand: onboarding can show the setup flow before
  the plugin package is installed, and the Gateway loads the external
  ClawHub/npm plugin only when the channel is actually active.
- Channels that accept bot-authored inbound messages can use shared
  [bot loop protection](/en/channels/bot-loop-protection) to prevent bot pairs from
  replying to each other indefinitely.
- Supported always-on rooms can use [ambient room events](/en/channels/ambient-room-events)
  so unmentioned room chatter becomes quiet context unless the agent sends with
  the `message` tool.

## Supported channels

- [Discord](/en/channels/discord) - Discord Bot API + Gateway; supports servers, channels, and DMs.
- [Feishu](/en/channels/feishu) - Feishu/Lark bot via WebSocket (bundled plugin).
- [Google Chat](/en/channels/googlechat) - Google Chat API app via HTTP webhook (downloadable plugin).
- [iMessage](/en/channels/imessage) - Native macOS integration via the `imsg` bridge on a signed-in Mac (or SSH wrapper when the Gateway runs elsewhere), including private API actions for replies, tapbacks, effects, attachments, and group management. Preferred for new OpenClaw iMessage setups when host permissions and Messages access fit.
- [IRC](/en/channels/irc) - Classic IRC servers; channels + DMs with pairing/allowlist controls.
- [LINE](/en/channels/line) - LINE Messaging API bot (downloadable plugin).
- [Matrix](/en/channels/matrix) - Matrix protocol (downloadable plugin).
- [Mattermost](/en/channels/mattermost) - Bot API + WebSocket; channels, groups, DMs (downloadable plugin).
- [Microsoft Teams](/en/channels/msteams) - Bot Framework; enterprise support (bundled plugin).
- [Nextcloud Talk](/en/channels/nextcloud-talk) - Self-hosted chat via Nextcloud Talk (bundled plugin).
- [Nostr](/en/channels/nostr) - Decentralized DMs via NIP-04 (bundled plugin).
- [QQ Bot](/en/channels/qqbot) - QQ Bot API; private chat, group chat, and rich media (bundled plugin).
- [Signal](/en/channels/signal) - signal-cli; privacy-focused.
- [Slack](/en/channels/slack) - Bolt SDK; workspace apps.
- [Synology Chat](/en/channels/synology-chat) - Synology NAS Chat via outgoing+incoming webhooks (bundled plugin).
- [Telegram](/en/channels/telegram) - Bot API via grammY; supports groups.
- [Tlon](/en/channels/tlon) - Urbit-based messenger (bundled plugin).
- [Twitch](/en/channels/twitch) - Twitch chat via IRC connection (bundled plugin).
- [Voice Call](/en/plugins/voice-call) - Telephony via Plivo or Twilio (plugin, installed separately).
- [WebChat](/en/web/webchat) - Gateway WebChat UI over WebSocket.
- [WeChat](/en/channels/wechat) - Tencent iLink Bot plugin via QR login; private chats only (external plugin).
- [WhatsApp](/en/channels/whatsapp) - Most popular; uses Baileys and requires QR pairing.
- [Yuanbao](/en/channels/yuanbao) - Tencent Yuanbao bot (external plugin).
- [Zalo](/en/channels/zalo) - Zalo Bot API; Vietnam's popular messenger (bundled plugin).
- [Zalo Personal](/en/channels/zalouser) - Zalo personal account via QR login (bundled plugin).

## Notes

- Channels can run simultaneously; configure multiple and OpenClaw will route per chat.
- Fastest setup is usually **Telegram** (simple bot token). WhatsApp requires QR pairing and
  stores more state on disk.
- Group behavior varies by channel; see [Groups](/en/channels/groups).
- DM pairing and allowlists are enforced for safety; see [Security](/en/gateway/security).
- Troubleshooting: [Channel troubleshooting](/en/channels/troubleshooting).
- Model providers are documented separately; see [Model Providers](/en/providers/models).
