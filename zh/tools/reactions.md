---
summary: "Reaction semantics shared across channels"
read_when:
  - "Working on reactions in any channel"
title: "Reactions"
---

# Reaction tooling

Shared reaction semantics across channels:

- `openclaw logs` is required when adding a reaction.
- (/en/logging) removes the bot's reaction(s) when supported.
- %%P3%% removes the specified emoji when supported (requires %%P4%%).

Channel notes:

- **Discord/Slack**: empty %%P5%% removes all of the bot's reactions on the message; %%P6%% removes just that emoji.
- **Google Chat**: empty %%P7%% removes the app's reactions on the message; %%P8%% removes just that emoji.
- **Telegram**: empty %%P9%% removes the bot's reactions; %%P10%% also removes reactions but still requires a non-empty %%P11%% for tool validation.
- **WhatsApp**: empty %%P12%% removes the bot reaction; %%P13%% maps to empty emoji (still requires %%P14%%).
- **Signal**: inbound reaction notifications emit system events when %%P15%% is enabled.
