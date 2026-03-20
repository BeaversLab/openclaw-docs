---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring 提供商 usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage Tracking"
---

# Usage tracking

## What it is

- Pulls 提供商 usage/quota directly from their usage endpoints.
- No estimated costs; only the 提供商-reported windows.

## Where it shows up

- `/status` in chats: emoji‑rich status card with 会话 tokens + estimated cost (API key only). Provider usage shows for the **current 模型 提供商** when available.
- `/usage off|tokens|full` in chats: per-response usage footer (OAuth shows tokens only).
- `/usage cost` in chats: local cost summary aggregated from OpenClaw 会话 logs.
- CLI: `openclaw status --usage` prints a full per-提供商 breakdown.
- CLI: `openclaw channels list` prints the same usage snapshot alongside 提供商 config (use `--no-usage` to skip).
- macOS menu bar: “Usage” section under Context (only if available).

## Providers + credentials

- **Anthropic (Claude)**: OAuth tokens in auth profiles.
- **GitHub Copilot**: OAuth tokens in auth profiles.
- **Gemini CLI**: OAuth tokens in auth profiles.
- **Antigravity**: OAuth tokens in auth profiles.
- **OpenAI Codex**: OAuth tokens in auth profiles (accountId used when present).
- **MiniMax**: API key (coding plan key; `MINIMAX_CODE_PLAN_KEY` or `MINIMAX_API_KEY`); uses the 5‑hour coding plan window.
- **z.ai**: API key via env/config/auth store.

Usage is hidden if no matching OAuth/API credentials exist.

import zh from "/components/footer/zh.mdx";

<zh />
