---
summary: "Pairing overview: approve who can DM you + which nodes can join"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Pairing"
---

# Pairing

“Pairing” is OpenClaw’s explicit **owner approval** step.
It is used in two places:

1. **DM pairing** (who is allowed to talk to the bot)
2. **Node pairing** (which devices/nodes are allowed to join the gateway network)

Security context: [Security](/en/gateway/security)

## 1) DM pairing (inbound chat access)

When a channel is configured with DM policy `pairing`, unknown senders get a short code and their message is **not processed** until you approve.

Default DM policies are documented in: [Security](/en/gateway/security)

Pairing codes:

- 8 characters, uppercase, no ambiguous chars (`0O1I`).
- **Expire after 1 hour**. The bot only sends the pairing message when a new request is created (roughly once per hour per sender).
- Pending DM pairing requests are capped at **3 per channel** by default; additional requests are ignored until one expires or is approved.

### Approve a sender

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Supported channels: `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`.

### Where the state lives

Stored under `~/.openclaw/credentials/`:

- Pending requests: `<channel>-pairing.json`
- Approved allowlist store: `<channel>-allowFrom.json`

Treat these as sensitive (they gate access to your assistant).

## 2) Node device pairing (iOS/Android/macOS/headless nodes)

Nodes connect to the Gateway as **devices** with `role: node`. The Gateway
creates a device pairing request that must be approved.

### Approve a node device

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Where the state lives

Stored under `~/.openclaw/devices/`:

- `pending.json` (short-lived; pending requests expire)
- `paired.json` (paired devices + tokens)

### Notes

- The legacy `node.pair.*` API (CLI: `openclaw nodes pending/approve`) is a
  separate gateway-owned pairing store. WS nodes still require device pairing.

## Related docs

- Security model + prompt injection: [Security](/en/gateway/security)
- Updating safely (run doctor): [Updating](/en/install/updating)
- Channel configs:
  - Telegram: [Telegram](/en/channels/telegram)
  - WhatsApp: [WhatsApp](/en/channels/whatsapp)
  - Signal: [Signal](/en/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/en/channels/bluebubbles)
  - iMessage (legacy): [iMessage](/en/channels/imessage)
  - Discord: [Discord](/en/channels/discord)
  - Slack: [Slack](/en/channels/slack)

import en from '/components/footer/en.mdx';

<en />
