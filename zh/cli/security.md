---
summary: "<!-- i18n:todo -->的 CLI 参考 %%P1%% (audit and fix common security footguns)<!-- /i18n:todo -->"
read_when:
  - "You want to run a quick security audit on config/state"
  - "You want to apply safe “fix” suggestions (chmod, tighten defaults)"
title: "<!-- i18n:todo -->security<!-- /i18n:todo -->"
---

# `openclaw security`

<!-- i18n:todo -->
Security tools (audit + optional fixes).
<!-- /i18n:todo -->

<!-- i18n:todo -->
Related:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Security guide: [Security]%%P2%%
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Audit
<!-- /i18n:todo -->

%%CB_72de7df3%%
<!-- i18n:todo -->
The audit warns when multiple DM senders share the main session and recommends **secure DM mode**: %%P3%% (or %%P4%% for multi-account channels) for shared inboxes.
It also warns when small models (%%P5%%) are used without sandboxing and with web/browser tools enabled.
<!-- /i18n:todo -->
