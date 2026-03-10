---
summary: "<!-- i18n:todo -->CLI reference for %%P1%% (schedule and run background jobs)<!-- /i18n:todo -->"
read_when:
  - "You want scheduled jobs and wakeups"
  - "You’re debugging cron execution and logs"
title: "<!-- i18n:todo -->cron<!-- /i18n:todo -->"
---

# `openclaw cron`

<!-- i18n:todo -->
Manage cron jobs for the Gateway scheduler.
<!-- /i18n:todo -->

<!-- i18n:todo -->
Related:
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Cron jobs: [Cron jobs]%%P2%%
<!-- /i18n:todo -->

<!-- i18n:todo -->
Tip: run %%P3%% for the full command surface.
<!-- /i18n:todo -->

<!-- i18n:todo -->
Note: isolated %%P4%% jobs default to %%P5%% delivery. Use %%P6%% to keep
output internal. %%P7%% remains as a deprecated alias for %%P8%%.
<!-- /i18n:todo -->

<!-- i18n:todo -->
Note: one-shot (%%P9%%) jobs delete after success by default. Use %%P10%% to keep them.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Common edits
<!-- /i18n:todo -->

<!-- i18n:todo -->
Update delivery settings without changing the message:
<!-- /i18n:todo -->

%%CB_b720dd76%%
<!-- i18n:todo -->
Disable delivery for an isolated job:
<!-- /i18n:todo -->

%%CB_d9495ddc%%
<!-- i18n:todo -->
Announce to a specific channel:
<!-- /i18n:todo -->

%%CB_3e3dfd68%%