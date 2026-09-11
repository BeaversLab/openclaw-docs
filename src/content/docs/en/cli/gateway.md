---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — run, query, and discover gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
  - Integrating an external Gateway process supervisor
title: "Gateway"
sidebarTitle: "Gateway"
---

The Gateway is OpenClaw's WebSocket server (channels, nodes, sessions, hooks). All subcommands on the pages listed here live under `openclaw gateway ...`.

`openclaw daemon ...` is a legacy alias for the service-control subcommands; see [`openclaw daemon`](/en/cli/daemon).

<CardGroup cols={3}>
  <Card title="Bonjour discovery" href="/en/gateway/bonjour">
    Local mDNS + wide-area DNS-SD setup.
  </Card>
  <Card title="Discovery overview" href="/en/gateway/discovery">
    How OpenClaw advertises and finds gateways.
  </Card>
  <Card title="Configuration" href="/en/gateway/configuration">
    Top-level gateway config keys.
  </Card>
</CardGroup>

## Gateway CLI pages

This page is an index. Five pages document `openclaw gateway`, one per reader
job. Open the page that matches your task.

| Page                                                            | Read it when                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Run the Gateway](/en/cli/gateway/running)                         | You are starting the Gateway, tuning its run options, or reading its shared token. |
| [Restart and supervision](/en/cli/gateway/restart-and-supervision) | You are restarting the Gateway, or an external supervisor owns its lifecycle.      |
| [Query a running Gateway](/en/cli/gateway/query)                   | You want health, status, stability, diagnostics, or a direct RPC call.             |
| [Manage the Gateway service](/en/cli/gateway/service)              | You are installing, starting, stopping, or repairing the native service.           |
| [Discover gateways (Bonjour)](/en/cli/gateway/discovery)           | You are looking for gateways over mDNS or wide-area DNS-SD.                        |

`openclaw gateway install` installs and starts the service. `--force` reinstalls an existing install and may restart a running Gateway. Finish offline configuration and runtime repairs before installation.

## Where each section moved

Every anchor from the previous single-page version still resolves here, so an
existing link such as `/cli/gateway#manage-the-gateway-service` keeps working.
Each entry points at the page that now holds the content.

- <a id="run-the-gateway" />[Run the Gateway](/en/cli/gateway/running#run-the-gateway)
- <a id="options" />[Options](/en/cli/gateway/running#options)
- <a id="reveal-the-configured-token" />[Reveal the configured token](/en/cli/gateway/running#reveal-the-configured-token)
- <a id="restart-the-gateway" />[Restart the Gateway](/en/cli/gateway/restart-and-supervision#restart-the-gateway)
- <a id="install-identity" />[Install identity](/en/cli/gateway/restart-and-supervision#install-identity)
- <a id="external-supervisors" />[External supervisors](/en/cli/gateway/restart-and-supervision#external-supervisors)
- <a id="gateway-profiling" />[Gateway profiling](/en/cli/gateway/restart-and-supervision#gateway-profiling)
- <a id="query-a-running-gateway" />[Query a running Gateway](/en/cli/gateway/query#query-a-running-gateway)
- <a id="gateway-health" />[`gateway health`](/en/cli/gateway/query#gateway-health)
- <a id="gateway-usage-cost" />[`gateway usage-cost`](/en/cli/gateway/query#gateway-usage-cost)
- <a id="gateway-stability" />[`gateway stability`](/en/cli/gateway/query#gateway-stability)
- <a id="gateway-diagnostics-export" />[`gateway diagnostics export`](/en/cli/gateway/query#gateway-diagnostics-export)
- <a id="gateway-status" />[`gateway status`](/en/cli/gateway/query#gateway-status)
- <a id="gateway-probe" />[`gateway probe`](/en/cli/gateway/query#gateway-probe)
- <a id="remote-over-ssh-(mac-app-parity)" />[Remote over SSH (Mac app parity)](/en/cli/gateway/query#remote-over-ssh-%28mac-app-parity%29)
- <a id="gateway-call-%3Cmethod%3E" />[`gateway call <method>`](/en/cli/gateway/query#gateway-call-%3Cmethod%3E)
- <a id="gateway-suspend" />[`gateway suspend`](/en/cli/gateway/query#gateway-suspend)
- <a id="gateway-resume-%3Csuspensionid%3E" />[`gateway resume <suspensionId>`](/en/cli/gateway/query#gateway-resume-%3Csuspensionid%3E)
- <a id="manage-the-gateway-service" />[Manage the Gateway service](/en/cli/gateway/service#manage-the-gateway-service)
- <a id="recover-an-unreadable-native-service-definition" />[Recover an unreadable native service definition](/en/cli/gateway/service#recover-an-unreadable-native-service-definition)
- <a id="lifecycle-requests-from-gateway-chat" />[Lifecycle requests from Gateway chat](/en/cli/gateway/service#lifecycle-requests-from-gateway-chat)
- <a id="install-with-a-wrapper" />[Install with a wrapper](/en/cli/gateway/service#install-with-a-wrapper)
- <a id="discover-gateways-(bonjour)" />[Discover gateways (Bonjour)](/en/cli/gateway/discovery#discover-gateways-%28bonjour%29)
- <a id="gateway-discover" />[`gateway discover`](/en/cli/gateway/discovery#gateway-discover)
- <a id="remote-over-ssh-mac-app-parity" />[Remote over SSH (Mac app parity)](/en/cli/gateway/query#remote-over-ssh-mac-app-parity)
- <a id="gateway-call-&lt;method&gt;" />[`gateway call <method>`](/en/cli/gateway/query#gateway-call-%3Cmethod%3E)
- <a id="gateway-resume-&lt;suspensionid&gt;" />[`gateway resume <suspensionId>`](/en/cli/gateway/query#gateway-resume-%3Csuspensionid%3E)
- <a id="discover-gateways-bonjour" />[Discover gateways (Bonjour)](/en/cli/gateway/discovery#discover-gateways-bonjour)

Option, tab, and panel anchors:

- <a id="startup-behavior" />[Startup behavior](/en/cli/gateway/running#startup-behavior)
- <a id="param-port" />[`--port`](/en/cli/gateway/running#param-port)
- <a id="param-bind" />[`--bind`](/en/cli/gateway/running#param-bind)
- <a id="param-token" />[`--token`](/en/cli/gateway/running#param-token)
- <a id="param-auth" />[`--auth`](/en/cli/gateway/running#param-auth)
- <a id="param-password" />[`--password`](/en/cli/gateway/running#param-password)
- <a id="param-tailscale" />[`--tailscale`](/en/cli/gateway/running#param-tailscale)
- <a id="param-allow-unconfigured" />[`--allow-unconfigured`](/en/cli/gateway/running#param-allow-unconfigured)
- <a id="param-dev" />[`--dev`](/en/cli/gateway/running#param-dev)
- <a id="param-ambient-channels" />[`--ambient-channels`](/en/cli/gateway/running#param-ambient-channels)
- <a id="param-dev-ambient-channels" />[`--dev-ambient-channels`](/en/cli/gateway/running#param-dev-ambient-channels)
- <a id="param-reset" />[`--reset`](/en/cli/gateway/running#param-reset)
- <a id="param-force" />[`--force`](/en/cli/gateway/running#param-force)
- <a id="param-verbose" />[`--verbose`](/en/cli/gateway/running#param-verbose)
- <a id="param-cli-backend-logs" />[`--cli-backend-logs`](/en/cli/gateway/running#param-cli-backend-logs)
- <a id="param-ws-log" />[`--ws-log`](/en/cli/gateway/running#param-ws-log)
- <a id="param-compact" />[`--compact`](/en/cli/gateway/running#param-compact)
- <a id="param-raw-stream" />[`--raw-stream`](/en/cli/gateway/running#param-raw-stream)
- <a id="output-modes" />[Output modes](/en/cli/gateway/query#output-modes)
- <a id="shared-options" />[Shared options](/en/cli/gateway/query#shared-options)
- <a id="param-port-1" />[`--port`](/en/cli/gateway/query#param-port)
- <a id="param-days" />[`--days`](/en/cli/gateway/query#param-days)
- <a id="param-agent" />[`--agent`](/en/cli/gateway/query#param-agent)
- <a id="param-all-agents" />[`--all-agents`](/en/cli/gateway/query#param-all-agents)
- <a id="param-limit" />[`--limit`](/en/cli/gateway/query#param-limit)
- <a id="param-type" />[`--type`](/en/cli/gateway/query#param-type)
- <a id="param-since-seq" />[`--since-seq`](/en/cli/gateway/query#param-since-seq)
- <a id="param-bundle-path" />[`--bundle`](/en/cli/gateway/query#param-bundle-path)
- <a id="param-export" />[`--export`](/en/cli/gateway/query#param-export)
- <a id="privacy-and-bundle-behavior" />[Privacy and bundle behavior](/en/cli/gateway/query#privacy-and-bundle-behavior)
- <a id="param-log-lines" />[`--log-lines`](/en/cli/gateway/query#param-log-lines)
- <a id="param-log-bytes" />[`--log-bytes`](/en/cli/gateway/query#param-log-bytes)
- <a id="param-url" />[`--url`](/en/cli/gateway/query#param-url)
- <a id="param-token-1" />[`--token`](/en/cli/gateway/query#param-token)
- <a id="param-password-1" />[`--password`](/en/cli/gateway/query#param-password)
- <a id="param-timeout" />[`--timeout`](/en/cli/gateway/query#param-timeout)
- <a id="param-no-stability-bundle" />[`--no-stability-bundle`](/en/cli/gateway/query#param-no-stability-bundle)
- <a id="param-json" />[`--json`](/en/cli/gateway/query#param-json)
- <a id="param-url-1" />[`--url`](/en/cli/gateway/query#param-url-1)
- <a id="param-port-2" />[`--port`](/en/cli/gateway/query#param-port-1)
- <a id="param-token-2" />[`--token`](/en/cli/gateway/query#param-token-1)
- <a id="param-password-2" />[`--password`](/en/cli/gateway/query#param-password-1)
- <a id="param-timeout-1" />[`--timeout`](/en/cli/gateway/query#param-timeout-1)
- <a id="param-no-probe" />[`--no-probe`](/en/cli/gateway/query#param-no-probe)
- <a id="param-deep" />[`--deep`](/en/cli/gateway/query#param-deep)
- <a id="param-require-rpc" />[`--require-rpc`](/en/cli/gateway/query#param-require-rpc)
- <a id="status-semantics" />[Status semantics](/en/cli/gateway/query#status-semantics)
- <a id="linux-systemd-auth-drift-checks" />[Linux systemd auth-drift checks](/en/cli/gateway/query#linux-systemd-auth-drift-checks)
- <a id="param-port-3" />[`--port`](/en/cli/gateway/query#param-port-2)
- <a id="interpretation" />[Interpretation](/en/cli/gateway/query#interpretation)
- <a id="json-output" />[JSON output](/en/cli/gateway/query#json-output)
- <a id="common-warning-codes" />[Common warning codes](/en/cli/gateway/query#common-warning-codes)
- <a id="param-ssh" />[`--ssh`](/en/cli/gateway/query#param-ssh)
- <a id="param-ssh-auto" />[`--ssh-auto`](/en/cli/gateway/query#param-ssh-auto)
- <a id="param-params" />[`--params`](/en/cli/gateway/query#param-params)
- <a id="param-url-2" />[`--url`](/en/cli/gateway/query#param-url-2)
- <a id="param-port-4" />[`--port`](/en/cli/gateway/query#param-port-3)
- <a id="param-token-3" />[`--token`](/en/cli/gateway/query#param-token-2)
- <a id="param-password-3" />[`--password`](/en/cli/gateway/query#param-password-2)
- <a id="param-timeout-2" />[`--timeout`](/en/cli/gateway/query#param-timeout-2)
- <a id="param-expect-final" />[`--expect-final`](/en/cli/gateway/query#param-expect-final)
- <a id="param-json-1" />[`--json`](/en/cli/gateway/query#param-json-1)
- <a id="command-options" />[Command options](/en/cli/gateway/service#command-options)
- <a id="service-runtime" />[Service runtime](/en/cli/gateway/service#service-runtime)
- <a id="lifecycle-behavior" />[Lifecycle behavior](/en/cli/gateway/service#lifecycle-behavior)
- <a id="managed-gateway-heap-sizing" />[Managed Gateway heap sizing](/en/cli/gateway/service#managed-gateway-heap-sizing)
- <a id="auth-and-secretrefs-at-install-time" />[Auth and SecretRefs at install time](/en/cli/gateway/service#auth-and-secretrefs-at-install-time)
- <a id="param-timeout-3" />[`--timeout`](/en/cli/gateway/discovery#param-timeout)
- <a id="param-json-2" />[`--json`](/en/cli/gateway/discovery#param-json)

## Related

- [CLI reference](/en/cli)
- [Gateway runbook](/en/gateway)
