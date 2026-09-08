---
summary: "Slack setup and runtime behavior (Socket Mode, HTTP Request URLs, and relay mode)"
read_when:
  - Setting up Slack or debugging Slack socket, HTTP, or relay mode
title: "Slack"
---

Slack support covers DMs and channels via Slack app integrations. Default transport is Socket Mode; HTTP Request URLs are also supported. Relay mode is for managed deployments where a trusted router owns Slack ingress.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Slack DMs default to pairing mode.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/en/tools/slash-commands">
    Native command behavior and command catalog.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/en/channels/troubleshooting">
    Cross-channel diagnostics and repair playbooks.
  </Card>
</CardGroup>

## What each page covers

- [Slack setup](/en/channels/slack/setup) — install the plugin, create the Slack app, and configure tokens.
- [Slack transports](/en/channels/slack/transports) — Socket Mode, HTTP Request URLs, and relay mode compared.
- [Slack Enterprise Grid](/en/channels/slack/enterprise-grid) — org-wide installs across a Grid organization.
- [Slack manifest and scopes](/en/channels/slack/manifest-and-scopes) — the base app manifest, OAuth scopes, and optional settings.
- [Slack access control](/en/channels/slack/access-control) — DM policy, channel allowlists, mention gating, and action gates.
- [Slack threads and sessions](/en/channels/slack/threads-and-sessions) — session keys, reply threading, and Agent View DMs.
- [Slack message behavior](/en/channels/slack/messaging) — ack reactions, streaming previews, and slash commands.
- [Slack media and attachments](/en/channels/slack/media) — audio clips, inbound files, chunking, and delivery targets.
- [Slack charts, tables, and approvals](/en/channels/slack/rich-messages) — native charts, tables, modals, and approval buttons.
- [Slack events and operations](/en/channels/slack/events) — system events, interactions, and presence polling.
- [Slack troubleshooting](/en/channels/slack/troubleshooting) — silent channels, ignored DMs, and dead transports.

## Where each section moved

Every section heading from the previous single-page version keeps its anchor here, so an existing link such as `/channels/slack#text-streaming` still resolves. Each entry points at the page that now holds the content.

- <a id="choosing-a-transport" />[Choosing a transport](/en/channels/slack/transports#choosing-a-transport)
- <a id="relay-mode" />[Relay mode](/en/channels/slack/transports#relay-mode)
- <a id="enterprise-grid-org-wide-installs" />[Enterprise Grid org-wide installs](/en/channels/slack/enterprise-grid#enterprise-grid-org-wide-installs)
- <a id="socket-mode" />[Socket Mode](/en/channels/slack/enterprise-grid#socket-mode)
- <a id="http-request-urls" />[HTTP Request URLs](/en/channels/slack/enterprise-grid#http-request-urls)
- <a id="install" />[Install](/en/channels/slack/setup#install)
- <a id="quick-setup" />[Quick setup](/en/channels/slack/setup#quick-setup)
- <a id="user-identity-(post-as-a-real-person)" />[User identity (post as a real person)](</channels/slack/setup#user-identity-(post-as-a-real-person)>)
- <a id="socket-mode-transport-tuning" />[Socket Mode transport tuning](/en/channels/slack/transports#socket-mode-transport-tuning)
- <a id="manifest-and-scope-checklist" />[Manifest and scope checklist](/en/channels/slack/manifest-and-scopes#manifest-and-scope-checklist)
- <a id="additional-manifest-settings" />[Additional manifest settings](/en/channels/slack/manifest-and-scopes#additional-manifest-settings)
- <a id="token-model" />[Token model](/en/channels/slack/setup#token-model)
- <a id="actions-and-gates" />[Actions and gates](/en/channels/slack/access-control#actions-and-gates)
- <a id="access-control-and-routing" />[Access control and routing](/en/channels/slack/access-control#access-control-and-routing)
- <a id="group-dms-(mpdms)-and-bots" />[Group DMs (MPDMs) and bots](</channels/slack/access-control#group-dms-(mpdms)-and-bots>)
- <a id="threading%2C-sessions%2C-and-reply-tags" />[Threading, sessions, and reply tags](/en/channels/slack/threads-and-sessions#threading%2C-sessions%2C-and-reply-tags)
- <a id="agent-view-dms" />[Agent View DMs](/en/channels/slack/threads-and-sessions#agent-view-dms)
- <a id="ack-reactions" />[Ack reactions](/en/channels/slack/messaging#ack-reactions)
- <a id="emoji-(ackreaction)" />[Emoji (ackReaction)](</channels/slack/messaging#emoji-(ackreaction)>)
- <a id="scope-(messages.ackreactionscope)" />[Scope (messages.ackReactionScope)](</channels/slack/messaging#scope-(messages.ackreactionscope)>)
- <a id="text-streaming" />[Text streaming](/en/channels/slack/messaging#text-streaming)
- <a id="typing-reaction-fallback" />[Typing reaction fallback](/en/channels/slack/messaging#typing-reaction-fallback)
- <a id="voice-input" />[Voice input](/en/channels/slack/media#voice-input)
- <a id="media%2C-chunking%2C-and-delivery" />[Media, chunking, and delivery](/en/channels/slack/media#media%2C-chunking%2C-and-delivery)
- <a id="commands-and-slash-behavior" />[Commands and slash behavior](/en/channels/slack/messaging#commands-and-slash-behavior)
- <a id="native-charts" />[Native charts](/en/channels/slack/rich-messages#native-charts)
- <a id="native-tables" />[Native tables](/en/channels/slack/rich-messages#native-tables)
- <a id="plugin-owned-modal-submissions" />[Plugin-owned modal submissions](/en/channels/slack/rich-messages#plugin-owned-modal-submissions)
- <a id="native-approvals-in-slack" />[Native approvals in Slack](/en/channels/slack/rich-messages#native-approvals-in-slack)
- <a id="events-and-operational-behavior" />[Events and operational behavior](/en/channels/slack/events#events-and-operational-behavior)
- <a id="presence-events" />[Presence events](/en/channels/slack/events#presence-events)
- <a id="troubleshooting" />[Troubleshooting](/en/channels/slack/troubleshooting#troubleshooting)
- <a id="attachment-media-reference" />[Attachment media reference](/en/channels/slack/media#attachment-media-reference)
- <a id="supported-media-types" />[Supported media types](/en/channels/slack/media#supported-media-types)
- <a id="inbound-pipeline" />[Inbound pipeline](/en/channels/slack/media#inbound-pipeline)
- <a id="thread-root-attachment-inheritance" />[Thread-root attachment inheritance](/en/channels/slack/media#thread-root-attachment-inheritance)
- <a id="multi-attachment-handling" />[Multi-attachment handling](/en/channels/slack/media#multi-attachment-handling)
- <a id="size%2C-download%2C-and-model-limits" />[Size, download, and model limits](/en/channels/slack/media#size%2C-download%2C-and-model-limits)
- <a id="known-limits" />[Known limits](/en/channels/slack/media#known-limits)
- <a id="related-documentation" />[Related documentation](/en/channels/slack/media#related-documentation)
- <a id="user-identity-post-as-a-real-person" />[User identity (post as a real person)](/en/channels/slack/setup#user-identity-post-as-a-real-person)
- <a id="group-dms-mpdms-and-bots" />[Group DMs (MPDMs) and bots](/en/channels/slack/access-control#group-dms-mpdms-and-bots)
- <a id="threading-sessions-and-reply-tags" />[Threading, sessions, and reply tags](/en/channels/slack/threads-and-sessions#threading-sessions-and-reply-tags)
- <a id="emoji-ackreaction" />[Emoji (ackReaction)](/en/channels/slack/messaging#emoji-ackreaction)
- <a id="scope-messages-ackreactionscope" />[Scope (messages.ackReactionScope)](/en/channels/slack/messaging#scope-messages-ackreactionscope)
- <a id="media-chunking-and-delivery" />[Media, chunking, and delivery](/en/channels/slack/media#media-chunking-and-delivery)
- <a id="size-download-and-model-limits" />[Size, download, and model limits](/en/channels/slack/media#size-download-and-model-limits)
- <a id="socket-mode-default" />[Socket Mode (default)](/en/channels/slack/setup#socket-mode-default)
- <a id="create-a-new-slack-app" />[Create a new Slack app](/en/channels/slack/setup#create-a-new-slack-app)
- <a id="configure-openclaw" />[Configure OpenClaw](/en/channels/slack/setup#configure-openclaw)
- <a id="start-gateway" />[Start gateway](/en/channels/slack/setup#start-gateway)
- <a id="http-request-urls-1" />[HTTP Request URLs](/en/channels/slack/setup#http-request-urls)
- <a id="create-a-new-slack-app-1" />[Create a new Slack app](/en/channels/slack/setup#create-a-new-slack-app-1)
- <a id="configure-openclaw-1" />[Configure OpenClaw](/en/channels/slack/setup#configure-openclaw-1)
- <a id="start-gateway-1" />[Start gateway](/en/channels/slack/setup#start-gateway-1)
- <a id="optional-native-slash-commands" />[Optional native slash commands](/en/channels/slack/manifest-and-scopes#optional-native-slash-commands)
- <a id="socket-mode-default-2" />[Socket Mode (default)](/en/channels/slack/manifest-and-scopes#socket-mode-default)
- <a id="http-request-urls-2" />[HTTP Request URLs](/en/channels/slack/manifest-and-scopes#http-request-urls)
- <a id="optional-authorship-scopes-write-operations" />[Optional authorship scopes (write operations)](/en/channels/slack/manifest-and-scopes#optional-authorship-scopes-write-operations)
- <a id="optional-user-token-scopes-read-operations" />[Optional user-token scopes (read operations)](/en/channels/slack/manifest-and-scopes#optional-user-token-scopes-read-operations)
- <a id="dm-policy" />[DM policy](/en/channels/slack/access-control#dm-policy)
- <a id="channel-policy" />[Channel policy](/en/channels/slack/access-control#channel-policy)
- <a id="mentions-and-channel-users" />[Mentions and channel users](/en/channels/slack/access-control#mentions-and-channel-users)
- <a id="inbound-attachments" />[Inbound attachments](/en/channels/slack/media#inbound-attachments)
- <a id="outbound-text-and-files" />[Outbound text and files](/en/channels/slack/media#outbound-text-and-files)
- <a id="delivery-targets" />[Delivery targets](/en/channels/slack/media#delivery-targets)
- <a id="no-replies-in-channels" />[No replies in channels](/en/channels/slack/troubleshooting#no-replies-in-channels)
- <a id="dm-messages-ignored" />[DM messages ignored](/en/channels/slack/troubleshooting#dm-messages-ignored)
- <a id="agent-view-dms-share-one-session" />[Agent View DMs share one session](/en/channels/slack/troubleshooting#agent-view-dms-share-one-session)
- <a id="socket-mode-not-connecting" />[Socket mode not connecting](/en/channels/slack/troubleshooting#socket-mode-not-connecting)
- <a id="http-mode-not-receiving-events" />[HTTP mode not receiving events](/en/channels/slack/troubleshooting#http-mode-not-receiving-events)
- <a id="native-slash-commands-not-firing" />[Native/slash commands not firing](/en/channels/slack/troubleshooting#native-slash-commands-not-firing)

## Configuration reference

Primary reference: [Configuration reference - Slack](/en/gateway/config-channels#slack).

<Accordion title="High-signal Slack fields">

- mode/auth: `postAs`, `mode`, `botToken`, `appToken`, `userToken`, `signingSecret`, `webhookPath`, `accounts.*`
- DM access: `dm.enabled`, `dmPolicy`, `allowFrom` (legacy: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- compatibility toggle: `dangerouslyAllowNameMatching` (break-glass; keep off unless needed)
- channel access: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`, `implicitMentions.*`
- group introductions: `joinIntro`, `accounts.*.joinIntro` (default: `true`)
- threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- presence wakes: `presenceEvents.mode`, `presenceEvents.prompt`, `channels.*.presenceEvents.*` (`off|auto|on`; default `off`)
- delivery: `textChunkLimit`, `streaming.chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls: `unfurlLinks` (default: `false`), `unfurlMedia` for `chat.postMessage` link/media preview control; set `unfurlLinks: true` to opt back into link previews
- ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Related

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Pair a Slack user to the gateway.
  </Card>
  <Card title="Groups" icon="users" href="/en/channels/groups">
    Channel and group DM behavior.
  </Card>
  <Card title="Channel routing" icon="route" href="/en/channels/channel-routing">
    Route inbound messages to agents.
  </Card>
  <Card title="Security" icon="shield" href="/en/gateway/security">
    Threat model and hardening.
  </Card>
  <Card title="Configuration" icon="sliders" href="/en/gateway/configuration">
    Config layout and precedence.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/en/tools/slash-commands">
    Command catalog and behavior.
  </Card>
</CardGroup>
