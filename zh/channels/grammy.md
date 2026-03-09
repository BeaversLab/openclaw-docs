---
summary: "Telegram Bot API integration via grammY with setup notes"
read_when:
  - "Working on Telegram or grammY pathways"
title: "grammY"
---

# grammY Integration (Telegram Bot API)

# Why grammY

- TS-first Bot API client with built-in long-poll + webhook helpers, middleware, error handling, rate limiter.
- Cleaner media helpers than hand-rolling fetch + FormData; supports all Bot API methods.
- Extensible: proxy support via custom fetch, session middleware (optional), type-safe context.

# What we shipped

- **Single client path:** fetch-based implementation removed; grammY is now the sole Telegram client (send + gateway) with the grammY throttler enabled by default.
- **Gateway:** `openclaw logs` builds a grammY (/en/logging), wires mention/allowlist gating, media download via %%P3%%/%%P4%%, and delivers replies with %%P5%%. Supports long-poll or webhook via %%P6%%.
- **Proxy:** optional %%P7%% uses %%P8%% through grammY’s %%P9%%.
- **Webhook support:** %%P10%% wraps %%P11%%; %%P12%% hosts the callback with health + graceful shutdown. Gateway enables webhook mode when %%P13%% + %%P14%% are set (otherwise it long-polls).
- **Sessions:** direct chats collapse into the agent main session (%%P15%%); groups use %%P16%%; replies route back to the same channel.
- **Config knobs:** %%P17%%, %%P18%%, %%P19%% (allowlist + mention defaults), %%P20%%, %%P21%%, %%P22%%, %%P23%%, %%P24%%, %%P25%%, %%P26%%, %%P27%%.
- **Draft streaming:** optional %%P28%% uses %%P29%% in private topic chats (Bot API 9.3+). This is separate from channel block streaming.
- **Tests:** grammy mocks cover DM + group mention gating and outbound send; more media/webhook fixtures still welcome.

Open questions

- Optional grammY plugins (throttler) if we hit Bot API 429s.
- Add more structured media tests (stickers, voice notes).
- Make webhook listen port configurable (currently fixed to 8787 unless wired through the gateway).
