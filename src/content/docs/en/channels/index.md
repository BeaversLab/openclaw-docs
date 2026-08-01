---
summary: "Messaging platforms OpenClaw can connect to"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Chat channels"
---

OpenClaw can talk to you on any chat app you already use. Each channel connects via the Gateway.
Text is supported everywhere; media and reactions vary by channel.

iMessage, Telegram, and the WebChat UI ship with the core install. Channels marked
"official plugin" install with one command (`openclaw plugins install @openclaw/<id>`)
or on demand during `openclaw onboard` / `openclaw channels add`, then need a Gateway
restart. "External plugin" channels are maintained outside the OpenClaw repo.

## Supported channels

- [Buzz](/en/channels/buzz) - Buzz team rooms with threaded replies (official plugin).
- [Discord](/en/channels/discord) - Discord Bot API + Gateway; supports servers, channels, and DMs (official plugin).
- [Feishu](/en/channels/feishu) - Feishu/Lark bot via WebSocket (official plugin).
- [Google Chat](/en/channels/googlechat) - Google Chat API app via HTTP webhook (official plugin).
- [iMessage](/en/channels/imessage) - Included in core. Native macOS integration via the `imsg` bridge on a signed-in Mac (or SSH wrapper when the Gateway runs elsewhere), including private API actions for replies, tapbacks, effects, attachments, and group management.
- [IRC](/en/channels/irc) - Classic IRC servers; channels + DMs with pairing/allowlist controls (official plugin).
- [LINE](/en/channels/line) - LINE Messaging API bot (official plugin).
- [Matrix](/en/channels/matrix) - Matrix protocol (official plugin).
- [Mattermost](/en/channels/mattermost) - Bot API + WebSocket; channels, groups, DMs (official plugin).
- [Microsoft Teams](/en/channels/msteams) - Bot Framework; enterprise support (official plugin).
- [Nextcloud Talk](/en/channels/nextcloud-talk) - Self-hosted chat via Nextcloud Talk (official plugin).
- [Nostr](/en/channels/nostr) - Decentralized DMs via NIP-04 (official plugin).
- [QQ Bot](/en/channels/qqbot) - QQ Bot API; private chat, group chat, and rich media (official plugin).
- [Reef](/en/channels/reef) - Guarded, end-to-end-encrypted claw-to-claw messaging between OpenClaw agents of different people (bundled plugin).
- [Raft](/en/channels/raft) - Raft CLI wake bridge for human and agent collaboration (official plugin).
- [Signal](/en/channels/signal) - signal-cli; privacy-focused (official plugin).
- [Slack](/en/channels/slack) - Bolt SDK; workspace apps (official plugin).
- [SMS](/en/channels/sms) - Twilio-backed SMS through the Gateway webhook (official plugin).
- [Synology Chat](/en/channels/synology-chat) - Synology NAS Chat via outgoing+incoming webhooks (official plugin).
- [Telegram](/en/channels/telegram) - Included in core. Bot API via grammY; supports groups.
- [Tlon](/en/channels/tlon) - Urbit-based messenger (official plugin).
- [Twitch](/en/channels/twitch) - Twitch chat via IRC connection (official plugin).
- [Voice Call](/en/plugins/voice-call) - Telephony via Plivo, Telnyx, or Twilio (official plugin).
- [WebChat](/en/web/webchat) - Included in core. Gateway WebChat UI over WebSocket.
- [WeChat](/en/channels/wechat) - Tencent iLink bot via QR login; private chats only (external plugin).
- [WhatsApp](/en/channels/whatsapp) - Most popular; uses Baileys and requires QR pairing (official plugin).
- [Yuanbao](/en/channels/yuanbao) - Tencent Yuanbao bot (external plugin).
- [Zalo](/en/channels/zalo) - Zalo Bot API; Vietnam's popular messenger (official plugin).
- [Zalo ClawBot](/en/channels/zaloclawbot) - Personal Zalo assistant via QR login; owner-bound (external plugin).
- [Zalo Personal](/en/channels/zalouser) - Zalo personal account via QR login (official plugin).

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

## Notes

- Channels can run simultaneously; configure multiple and OpenClaw will route per chat.
- Fastest setup is usually **Telegram** (simple bot token, no plugin install). WhatsApp
  requires QR pairing and stores more state on disk.
- Group behavior varies by channel; see [Groups](/en/channels/groups).
- DM pairing and allowlists are enforced for safety; see [Security](/en/gateway/security).
- Troubleshooting: [Channel troubleshooting](/en/channels/troubleshooting).
- Model providers are documented separately; see [Model Providers](/en/providers/models).
