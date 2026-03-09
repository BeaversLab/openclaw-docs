---
summary: "<!-- i18n:todo -->RPC protocol notes for onboarding wizard and config schema<!-- /i18n:todo -->"
read_when: "<!-- i18n:todo -->Changing onboarding wizard steps or config schema endpoints<!-- /i18n:todo -->"
title: "<!-- i18n:todo -->Onboarding and Config Protocol<!-- /i18n:todo -->"
---

<!-- i18n:todo -->
# Onboarding + Config Protocol
<!-- /i18n:todo -->

<!-- i18n:todo -->
Purpose: shared onboarding + config surfaces across CLI, macOS app, and Web UI.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Components
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Wizard engine (shared session + prompts + onboarding state).
<!-- /i18n:todo -->
<!-- i18n:todo -->
- CLI onboarding uses the same wizard flow as the UI clients.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Gateway RPC exposes wizard + config schema endpoints.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- macOS onboarding uses the wizard step model.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Web UI renders config forms from JSON Schema + UI hints.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Gateway RPC
<!-- /i18n:todo -->

<!-- i18n:todo -->
- %%P1%% params: %%P2%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P3%% params: %%P4%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P5%% params: %%P6%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P7%% params: %%P8%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- %%P9%% params: %%P10%%
<!-- /i18n:todo -->

<!-- i18n:todo -->
Responses (shape)
<!-- /i18n:todo -->

<!-- i18n:todo -->
- Wizard: %%P11%%
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Config schema: %%P12%%
<!-- /i18n:todo -->

<!-- i18n:todo -->
## UI Hints
<!-- /i18n:todo -->

<!-- i18n:todo -->
- %%P13%% keyed by path; optional metadata (label/help/group/order/advanced/sensitive/placeholder).
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Sensitive fields render as password inputs; no redaction layer.
<!-- /i18n:todo -->
<!-- i18n:todo -->
- Unsupported schema nodes fall back to the raw JSON editor.
<!-- /i18n:todo -->

<!-- i18n:todo -->
## Notes
<!-- /i18n:todo -->

<!-- i18n:todo -->
- This doc is the single place to track protocol refactors for onboarding/config.
<!-- /i18n:todo -->
