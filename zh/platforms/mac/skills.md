---
summary: "<!-- i18n:todo -->macOS Skills settings UI and gateway-backed status<!-- /i18n:todo -->"
read_when:
  - "Updating the macOS Skills settings UI"
  - "Changing skills gating or install behavior"
title: "<!-- i18n:todo -->Skills<!-- /i18n:todo -->"
---

<!-- i18n:todo -->
# Skills (macOS)
<!-- /i18n:todo -->

<!-- i18n:todo -->
The macOS app surfaces OpenClaw skills via the gateway; it does not parse skills locally.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Data source
<!-- /i18n:todo -->

<!-- i18n:todo -->
- %%P1%% (gateway) returns all skills plus eligibility and missing requirements
  (including allowlist blocks for bundled skills).
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Requirements are derived from %%P2%% in each %%P3%%.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Install actions
<!-- /i18n:todo -->

<!-- i18n:todo -->
- %%P4%% defines install options (brew/node/go/uv).
<!-- /i18n:todo -->
<!-- i18n:todo -->
- The app calls %%P5%% to run installers on the gateway host.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- The gateway surfaces only one preferred installer when multiple are provided
  (brew when available, otherwise node manager from %%P6%%, default npm).
<!-- /i18n:todo -->

## Env/API keys

<!-- i18n:todo -->
- The app stores keys in %%P7%% under %%P8%%.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P9%% patches %%P10%%, %%P11%%, and %%P12%%.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Remote mode
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Install + config updates happen on the gateway host (not the local Mac).
<!-- /i18n:todo -->
