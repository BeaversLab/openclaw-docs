---
doc-schema-version: 1
summary: "Automations: scheduled jobs, webhooks, and Gmail PubSub triggers for the Gateway scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and automations for scheduled work
title: "Automations"
sidebarTitle: "Automations"
---

Automations are OpenClaw's built-in scheduler. The scheduler persists jobs, wakes the agent at the right time, and can deliver output to a chat channel, a webhook, or nowhere.

Manage automations with the `openclaw automations` CLI; `openclaw cron` remains an alias for the same commands.

## Quick start

<Steps>
  <Step title="Add a one-shot reminder">
    ```bash
    openclaw automations create "2027-02-01T16:00:00Z" \
      --name "Reminder" \
      --session main \
      --system-event "Reminder: check the automations docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="Check your jobs">
    ```bash
    openclaw automations list
    openclaw automations get <job-id>
    openclaw automations show <job-id>
    ```
  </Step>
  <Step title="See run history">
    ```bash
    openclaw automations runs <job-id>
    ```
  </Step>
</Steps>

## Where each section moved

This page is an index. Each section below moved to a child page, and every anchor from the single-page version still resolves here.

### Runtime model and promotion

[How automations work](/en/automation/cron-jobs/how-it-works) — Runtime model, run lifecycle, and job promotion.

- <a id="how-automations-work"></a>[How automations work](/en/automation/cron-jobs/how-it-works#how-automations-work)
- <a id="isolated-run-hardening"></a>[Isolated run hardening](/en/automation/cron-jobs/how-it-works#isolated-run-hardening)
- <a id="task-reconciliation"></a>[Task reconciliation](/en/automation/cron-jobs/how-it-works#task-reconciliation)
- <a id="promoting-a-repeated-job-into-an-automation"></a>[Promoting a repeated job into an automation](/en/automation/cron-jobs/how-it-works#promoting-a-repeated-job-into-an-automation)

### Schedule and trigger sections

[Automation schedules](/en/automation/cron-jobs/schedules) — Schedule kinds, cron rules, pacing, and condition watchers.

- <a id="schedule-types"></a>[Schedule types](/en/automation/cron-jobs/schedules#schedule-types)
- <a id="heartbeat-task-migration"></a>[Heartbeat task migration](/en/automation/cron-jobs/schedules#heartbeat-task-migration)
- <a id="stream-sources"></a>[Stream sources](/en/automation/cron-jobs/schedules#stream-sources)
- <a id="dynamic-cadence-pacing"></a><a id="dynamic-cadence-(pacing)"></a>[Dynamic cadence (pacing)](/en/automation/cron-jobs/schedules#dynamic-cadence-pacing)
- <a id="%2Floop-chat-shortcut"></a><a id="/loop-chat-shortcut"></a>[`/loop` chat shortcut](/en/automation/cron-jobs/schedules#%2Floop-chat-shortcut)
- <a id="day-of-month-and-day-of-week-use-or-logic"></a>[Day-of-month and day-of-week use OR logic](/en/automation/cron-jobs/schedules#day-of-month-and-day-of-week-use-or-logic)
- <a id="event-triggers-condition-watchers"></a><a id="event-triggers-(condition-watchers)"></a>[Event triggers (condition watchers)](/en/automation/cron-jobs/schedules#event-triggers-condition-watchers)

### Payload and execution sections

[Automation payloads](/en/automation/cron-jobs/payloads) — Payload kinds, agent-turn flags, and session execution styles.

- <a id="payloads"></a>[Payloads](/en/automation/cron-jobs/payloads#payloads)
- <a id="agent-turn-options"></a>[Agent-turn options](/en/automation/cron-jobs/payloads#agent-turn-options)
- <a id="param-message"></a>[`--message`](/en/automation/cron-jobs/payloads#param-message)
- <a id="param-model"></a>[`--model`](/en/automation/cron-jobs/payloads#param-model)
- <a id="param-fallbacks"></a>[`--fallbacks`](/en/automation/cron-jobs/payloads#param-fallbacks)
- <a id="param-clear-fallbacks"></a>[`--clear-fallbacks`](/en/automation/cron-jobs/payloads#param-clear-fallbacks)
- <a id="param-clear-model"></a>[`--clear-model`](/en/automation/cron-jobs/payloads#param-clear-model)
- <a id="param-thinking"></a>[`--thinking`](/en/automation/cron-jobs/payloads#param-thinking)
- <a id="param-clear-thinking"></a>[`--clear-thinking`](/en/automation/cron-jobs/payloads#param-clear-thinking)
- <a id="param-light-context"></a>[`--light-context`](/en/automation/cron-jobs/payloads#param-light-context)
- <a id="param-tools"></a>[`--tools`](/en/automation/cron-jobs/payloads#param-tools)
- <a id="command-payloads"></a>[Command payloads](/en/automation/cron-jobs/payloads#command-payloads)
- <a id="script-payloads"></a>[Script payloads](/en/automation/cron-jobs/payloads#script-payloads)
- <a id="execution-styles"></a>[Execution styles](/en/automation/cron-jobs/payloads#execution-styles)
- <a id="codex-apps-in-scheduled-automations"></a>[Codex apps in scheduled automations](/en/automation/cron-jobs/payloads#codex-apps-in-scheduled-automations)
- <a id="main-session-vs-current-vs-isolated-vs-custom"></a>[Main session vs current vs isolated vs custom](/en/automation/cron-jobs/payloads#main-session-vs-current-vs-isolated-vs-custom)
- <a id="what-fresh-session-means-for-isolated-jobs"></a>[What 'fresh session' means for isolated jobs](/en/automation/cron-jobs/payloads#what-fresh-session-means-for-isolated-jobs)
- <a id="unattended-run-contract"></a>[Unattended run contract](/en/automation/cron-jobs/payloads#unattended-run-contract)
- <a id="subagent-and-discord-delivery"></a>[Subagent and Discord delivery](/en/automation/cron-jobs/payloads#subagent-and-discord-delivery)

### Delivery sections

[Automation delivery](/en/automation/cron-jobs/delivery) — Delivery modes, failure notifications, and output language.

- <a id="delivery-and-output"></a>[Delivery and output](/en/automation/cron-jobs/delivery#delivery-and-output)
- <a id="failure-notifications"></a>[Failure notifications](/en/automation/cron-jobs/delivery#failure-notifications)
- <a id="output-language"></a>[Output language](/en/automation/cron-jobs/delivery#output-language)

### Management and configuration sections

[Manage automations](/en/automation/cron-jobs/managing-jobs) — CLI examples, management commands, run history, and config keys.

- <a id="cli-examples"></a>[CLI examples](/en/automation/cron-jobs/managing-jobs#cli-examples)
- <a id="one-shot-reminder"></a>[One-shot reminder](/en/automation/cron-jobs/managing-jobs#one-shot-reminder)
- <a id="recurring-isolated-job"></a>[Recurring isolated job](/en/automation/cron-jobs/managing-jobs#recurring-isolated-job)
- <a id="model-and-thinking-override"></a>[Model and thinking override](/en/automation/cron-jobs/managing-jobs#model-and-thinking-override)
- <a id="webhook-output"></a>[Webhook output](/en/automation/cron-jobs/managing-jobs#webhook-output)
- <a id="command-output"></a>[Command output](/en/automation/cron-jobs/managing-jobs#command-output)
- <a id="managing-jobs"></a>[Managing jobs](/en/automation/cron-jobs/managing-jobs#managing-jobs)
- <a id="conversational-management"></a>[Conversational management](/en/automation/cron-jobs/managing-jobs#conversational-management)
- <a id="cli-management"></a>[CLI management](/en/automation/cron-jobs/managing-jobs#cli-management)
- <a id="configuration"></a>[Configuration](/en/automation/cron-jobs/managing-jobs#configuration)
- <a id="retry-behavior"></a>[Retry behavior](/en/automation/cron-jobs/managing-jobs#retry-behavior)
- <a id="maintenance"></a>[Maintenance](/en/automation/cron-jobs/managing-jobs#maintenance)
- <a id="legacy-store-migration"></a>[Legacy store migration](/en/automation/cron-jobs/managing-jobs#legacy-store-migration)

### Inbound webhook sections

[Inbound webhooks](/en/automation/cron-jobs/webhooks) — Gateway HTTP hooks for external callers.

- <a id="webhooks"></a>[Webhooks](/en/automation/cron-jobs/webhooks#webhooks)
- <a id="enable-and-test-an-agent-hook"></a>[Enable and test an agent hook](/en/automation/cron-jobs/webhooks#enable-and-test-an-agent-hook)
- <a id="authentication"></a>[Authentication](/en/automation/cron-jobs/webhooks#authentication)
- <a id="post-hooks-wake"></a>[POST /hooks/wake](/en/automation/cron-jobs/webhooks#post-hooks-wake)
- <a id="post-hooks-agent"></a>[POST /hooks/agent](/en/automation/cron-jobs/webhooks#post-hooks-agent)
- <a id="mapped"></a>[Mapped hooks (`POST /hooks/<name>`)](/en/automation/cron-jobs/webhooks#mapped)
- <a id="verify-and-troubleshoot-hook-requests"></a>[Verify and troubleshoot hook requests](/en/automation/cron-jobs/webhooks#verify-and-troubleshoot-hook-requests)

### Gmail sections

[Gmail PubSub triggers](/en/automation/cron-jobs/gmail) — Gmail inbox triggers through Google Pub/Sub.

- <a id="gmail-pubsub-integration"></a>[Gmail PubSub integration](/en/automation/cron-jobs/gmail#gmail-pubsub-integration)
- <a id="configure-a-restricted-gmail-reader-recommended"></a><a id="configure-a-restricted-gmail-reader-(recommended)"></a>[Configure a restricted Gmail reader (recommended)](/en/automation/cron-jobs/gmail#configure-a-restricted-gmail-reader-recommended)
- <a id="authenticate-the-reader-model"></a>[Authenticate the reader model](/en/automation/cron-jobs/gmail#authenticate-the-reader-model)
- <a id="connect-gmail-transport"></a>[Connect Gmail transport](/en/automation/cron-jobs/gmail#connect-gmail-transport)
- <a id="verify-the-reader-boundary"></a>[Verify the reader boundary](/en/automation/cron-jobs/gmail#verify-the-reader-boundary)
- <a id="gateway-auto-start"></a>[Gateway auto-start](/en/automation/cron-jobs/gmail#gateway-auto-start)
- <a id="manual-one-time-setup"></a>[Manual one-time setup](/en/automation/cron-jobs/gmail#manual-one-time-setup)
- <a id="select-the-gcp-project"></a>[Select the GCP project](/en/automation/cron-jobs/gmail#select-the-gcp-project)
- <a id="create-topic-and-grant-gmail-push-access"></a>[Create topic and grant Gmail push access](/en/automation/cron-jobs/gmail#create-topic-and-grant-gmail-push-access)
- <a id="start-the-watch"></a>[Start the watch](/en/automation/cron-jobs/gmail#start-the-watch)
- <a id="gmail-model-override"></a>[Gmail model override](/en/automation/cron-jobs/gmail#gmail-model-override)

### Troubleshooting sections

[Automation troubleshooting](/en/automation/cron-jobs/troubleshooting) — Command ladder and common automation failure shapes.

- <a id="troubleshooting"></a>[Troubleshooting](/en/automation/cron-jobs/troubleshooting#troubleshooting)
- <a id="command-ladder"></a>[Command ladder](/en/automation/cron-jobs/troubleshooting#command-ladder)
- <a id="automations-not-firing"></a>[Automations not firing](/en/automation/cron-jobs/troubleshooting#automations-not-firing)
- <a id="job-fired-but-no-delivery"></a>[Job fired but no delivery](/en/automation/cron-jobs/troubleshooting#job-fired-but-no-delivery)
- <a id="automations-or-heartbeat-appear-to-prevent-new-style-rollover"></a>[Automations or heartbeat appear to prevent /new-style rollover](/en/automation/cron-jobs/troubleshooting#automations-or-heartbeat-appear-to-prevent-new-style-rollover)
- <a id="timezone-gotchas"></a>[Timezone gotchas](/en/automation/cron-jobs/troubleshooting#timezone-gotchas)

## Related

- [Automation](/en/automation) — all automation mechanisms at a glance
- [Background Tasks](/en/automation/tasks) — task ledger for automation runs
- [Heartbeat](/en/gateway/heartbeat) — periodic main-session turns
- [Timezone](/en/concepts/timezone) — timezone configuration
