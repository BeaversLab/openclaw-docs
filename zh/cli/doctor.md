---
summary: "<!-- i18n:todo -->CLI reference for %%P1%% (health checks + guided repairs)<!-- /i18n:todo -->"
read_when:
  - "You have connectivity/auth issues and want guided fixes"
  - "You updated and want a sanity check"
title: "<!-- i18n:todo -->doctor<!-- /i18n:todo -->"
---

# `openclaw doctor`

<!-- i18n:todo -->
Health checks + quick fixes for the gateway and channels.
<!-- /i18n:todo -->

<!-- i18n:todo -->
Related:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Troubleshooting: [Troubleshooting]%%P2%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Security audit: [Security]%%P3%%
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Examples
<!-- /i18n:todo -->

%%CB_4e737405%%
<!-- i18n:todo -->
Notes:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Interactive prompts (like keychain/OAuth fixes) only run when stdin is a TTY and %%P4%% is **not** set. Headless runs (cron, Telegram, no terminal) will skip prompts.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P5%% (alias for %%P6%%) writes a backup to %%P7%% and drops unknown config keys, listing each removal.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## macOS: %%P8%% env overrides
<!-- /i18n:todo -->

<!-- i18n:todo -->
If you previously ran %%P9%% (or %%P10%%), that value overrides your config file and can cause persistent “unauthorized” errors.
<!-- /i18n:todo -->

%%CB_9ff4fe2c%%