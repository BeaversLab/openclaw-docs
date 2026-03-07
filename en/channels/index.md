---
summary: "Messaging platforms OpenClaw can connect to"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Chat Channels"
---

# Chat Channels

OpenClaw can talk to you on any chat app you already use. Each channel connects via the Gateway.
Text is supported everywhere; media and reactions vary by channel.

## Supported channels

- [WhatsApp](/en/channels/whatsapp) — Most popular; uses Baileys and requires QR pairing.
- [Telegram](/en/channels/telegram) — Bot API via grammY; supports groups.
- [Discord](/en/channels/discord) — Discord Bot API + Gateway; supports servers, channels, and DMs.
- [Slack](/en/channels/slack) — Bolt SDK; workspace apps.
- [Feishu](/en/channels/feishu) — Feishu/Lark bot via WebSocket (plugin, installed separately).
- [Google Chat](/en/channels/googlechat) — Google Chat API app via HTTP webhook.
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket; channels, groups, DMs (plugin, installed separately).
- [Signal](/en/channels/signal) — signal-cli; privacy-focused.
- [BlueBubbles](/en/channels/bluebubbles) — **Recommended for iMessage**; uses the BlueBubbles macOS server REST API with full feature support (edit, unsend, effects, reactions, group management — edit currently broken on macOS 26 Tahoe).
- [iMessage (/en/channels/imessage)](/channels/imessage) — Legacy macOS integration via imsg CLI (deprecated, use BlueBubbles for new setups).
- [Microsoft Teams](/en/channels/msteams) — Bot Framework; enterprise support (plugin, installed separately).
- [LINE](/en/channels/line) — LINE Messaging API bot (plugin, installed separately).
- [Nextcloud Talk](/en/channels/nextcloud-talk) — Self-hosted chat via Nextcloud Talk (plugin, installed separately).
- [Matrix](/en/channels/matrix) — Matrix protocol (plugin, installed separately).
- [Nostr](/en/channels/nostr) — Decentralized DMs via NIP-04 (plugin, installed separately).
- [Tlon](/en/channels/tlon) — Urbit-based messenger (plugin, installed separately).
- [Twitch](/en/channels/twitch) — Twitch chat via IRC connection (plugin, installed separately).
- [Zalo](/en/channels/zalo) — Zalo Bot API; Vietnam's popular messenger (plugin, installed separately).
- [Zalo Personal](/en/channels/zalouser) — Zalo personal account via QR login (plugin, installed separately).
- [WebChat](/en/web/webchat) — Gateway WebChat UI over WebSocket.

## Notes

- Channels can run simultaneously; configure multiple and OpenClaw will route per chat.
- Fastest setup is usually **Telegram** (simple bot token). WhatsApp requires QR pairing and
  stores more state on disk.
- Group behavior varies by channel; see [Groups](/en/concepts/groups).
- DM pairing and allowlists are enforced for safety; see [Security](/en/gateway/security).
- Telegram internals: [grammY notes](/en/channels/grammy).
- Troubleshooting: [Channel troubleshooting](/en/channels/troubleshooting).
- Model providers are documented separately; see [Model Providers](/en/providers/models).
