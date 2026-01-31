# Mintlify i18n (en + zh) design

Date: 2026-01-31

## Context
This repository is a Mintlify CLI docs site (docs.json schema). The goal is to make the entire site bilingual (English and Simplified Chinese) with language-prefixed URLs and automatic browser-language detection on the root path.

## Goals
- Support English and Simplified Chinese across the entire documentation site.
- Use language-prefixed routes: /en/... and /zh/...
- Auto-redirect from / based on browser language, defaulting to English.
- Keep a single shared assets directory.

## Non-goals
- Preserve or redirect legacy non-prefixed URLs.
- Add additional languages beyond English and Simplified Chinese.
- Introduce server-side redirects or CDN-based locale detection.

## Decisions
- Use Mintlify's native multi-language navigation and content structure.
- Mirror directory structure under /en and /zh.
- Root path / uses a minimal page with client-side language detection and redirect.
- Default to English if browser language is not Chinese.

## Architecture
- Content structure:
  - /en/... English docs
  - /zh/... Simplified Chinese docs
- Shared assets in /assets
- docs.json updated to define per-language navigation and topbar language switcher
- Root index page contains a small script to detect language and redirect

## Routing and redirect behavior
- / -> client-side redirect based on navigator.language / navigator.languages
- If language starts with "zh", redirect to /zh/; otherwise to /en/
- If user explicitly switches language via UI, persist choice in localStorage and prefer it

## Content strategy
- Keep file names and paths aligned between /en and /zh
- Translate frontmatter (title/description) and content; keep code samples shared
- Allow incomplete translation by showing a short placeholder if needed (optional)

## Error handling and edge cases
- If language detection fails, default to English
- If localStorage is unavailable, fall back to browser language

## Testing and verification
- Manual checks:
  - / redirects to /en/ on non-zh browser locale
  - / redirects to /zh/ on zh locale
  - language switcher updates URL and persists preference
  - navigation shows correct language labels and paths
- Optional script to report missing counterpart files between /en and /zh

## Risks
- Client-side redirect could briefly flash the root page
- Maintenance overhead for keeping content in sync across languages

## Open questions
- Whether to add a translation-completeness indicator on untranslated pages
- Whether to enforce mirrored file structure via CI (not required initially)
