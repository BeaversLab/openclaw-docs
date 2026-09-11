---
summary: "Secrets management: SecretRef contract, shared secret store, runtime snapshots, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and SQLite auth-profile refs
  - Storing team-wide secrets and environment values in the shared SQLite store
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets management"
sidebarTitle: "Secrets management"
---

OpenClaw supports additive SecretRefs so supported credentials do not need to live as plaintext in configuration.

<Note>
Plaintext still works. SecretRefs are opt-in per credential.
</Note>

<Warning>
Plaintext credentials remain agent-readable when they sit in files the agent can inspect, including `openclaw.json`, `.env`, retired auth-profile JSON archives, or generated `agents/*/agent/models.json` files. SecretRefs reduce that local blast radius once every supported credential is migrated and `openclaw secrets audit --check` reports no plaintext residue.
</Warning>

This page is an index. Secrets management is documented on five pages, one per reader job.
Open the page that matches your task.

## Secrets pages

| Page                                                                             | Read it when                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Secrets runtime model](/en/gateway/secrets/runtime-model)                          | Owner isolation, sentinel injection, the agent-access boundary, and active-surface filtering.                |
| [SecretRef contract and provider config](/en/gateway/secrets/secretref-contract)    | The SecretRef contract, id grammars, validation rules, and the env, file, exec, and store provider blocks.   |
| [Shared secret store and egress proxy](/en/gateway/secrets/secret-store-and-egress) | The shared secret store, the secret egress proxy and its traffic allowlist, and file-backed API keys.        |
| [Secrets integration examples](/en/gateway/secrets/integration-examples)            | Exec provider recipes for 1Password, Bitwarden, Vault, pass, and sops, plus MCP and sandbox SSH.             |
| [Secrets operations and behavior](/en/gateway/secrets/operations)                   | Supported surfaces, precedence, activation triggers, degraded signals, and the audit and configure workflow. |

## Where each section moved

Every section, tab, step, and accordion title from the previous single-page
version keeps its anchor here, so an existing link such as
`/gateway/secrets#shared-secret-store` still resolves. Each entry points at the
page that now holds the content.

- <a id="runtime-model" />[Runtime model](/en/gateway/secrets/runtime-model#runtime-model)
- <a id="egress-time-injection-(sentinels)" />[Egress-time injection (sentinels)](/en/gateway/secrets/runtime-model#egress-time-injection-sentinels)
- <a id="agent-access-boundary" />[Agent-access boundary](/en/gateway/secrets/runtime-model#agent-access-boundary)
- <a id="active-surface-filtering" />[Active-surface filtering](/en/gateway/secrets/runtime-model#active-surface-filtering)
- <a id="gateway-auth-surface-diagnostics" />[Gateway auth surface diagnostics](/en/gateway/secrets/runtime-model#gateway-auth-surface-diagnostics)
- <a id="onboarding-reference-preflight" />[Onboarding reference preflight](/en/gateway/secrets/runtime-model#onboarding-reference-preflight)
- <a id="secretref-contract" />[SecretRef contract](/en/gateway/secrets/secretref-contract#secretref-contract)
- <a id="provider-config" />[Provider config](/en/gateway/secrets/secretref-contract#provider-config)
- <a id="shared-secret-store" />[Shared secret store](/en/gateway/secrets/secret-store-and-egress#shared-secret-store)
- <a id="secret-egress-proxy" />[Secret egress proxy](/en/gateway/secrets/secret-store-and-egress#secret-egress-proxy)
- <a id="traffic-allowlist" />[Traffic allowlist](/en/gateway/secrets/secret-store-and-egress#traffic-allowlist)
- <a id="file-backed-api-keys" />[File-backed API keys](/en/gateway/secrets/secret-store-and-egress#file-backed-api-keys)
- <a id="exec-integration-examples" />[Exec integration examples](/en/gateway/secrets/integration-examples#exec-integration-examples)
- <a id="mcp-server-environment-variables" />[MCP server environment variables](/en/gateway/secrets/integration-examples#mcp-server-environment-variables)
- <a id="sandbox-ssh-auth-material" />[Sandbox SSH auth material](/en/gateway/secrets/integration-examples#sandbox-ssh-auth-material)
- <a id="supported-credential-surface" />[Supported credential surface](/en/gateway/secrets/operations#supported-credential-surface)
- <a id="required-behavior-and-precedence" />[Required behavior and precedence](/en/gateway/secrets/operations#required-behavior-and-precedence)
- <a id="activation-triggers" />[Activation triggers](/en/gateway/secrets/operations#activation-triggers)
- <a id="degraded-and-recovered-signals" />[Degraded and recovered signals](/en/gateway/secrets/operations#degraded-and-recovered-signals)
- <a id="command-path-resolution" />[Command-path resolution](/en/gateway/secrets/operations#command-path-resolution)
- <a id="audit-and-configure-workflow" />[Audit and configure workflow](/en/gateway/secrets/operations#audit-and-configure-workflow)
- <a id="one-way-safety-policy" />[One-way safety policy](/en/gateway/secrets/operations#one-way-safety-policy)
- <a id="legacy-auth-compatibility-notes" />[Legacy auth compatibility notes](/en/gateway/secrets/operations#legacy-auth-compatibility-notes)
- <a id="control-ui" />[Control UI](/en/gateway/secrets/operations#control-ui)
- <a id="egress-time-injection-sentinels" />[Egress-time injection (sentinels)](/en/gateway/secrets/runtime-model#egress-time-injection-sentinels)
- <a id="examples-of-inactive-surfaces" />[Examples of inactive surfaces](/en/gateway/secrets/runtime-model#examples-of-inactive-surfaces)
- <a id="env" />[env](/en/gateway/secrets/secretref-contract#env)
- <a id="file" />[file](/en/gateway/secrets/secretref-contract#file)
- <a id="exec" />[exec](/en/gateway/secrets/secretref-contract#exec)
- <a id="store" />[store](/en/gateway/secrets/secretref-contract#store)
- <a id="env-provider" />[Env provider](/en/gateway/secrets/secretref-contract#env-provider)
- <a id="file-provider" />[File provider](/en/gateway/secrets/secretref-contract#file-provider)
- <a id="exec-provider" />[Exec provider](/en/gateway/secrets/secretref-contract#exec-provider)
- <a id="store-provider" />[Store provider](/en/gateway/secrets/secretref-contract#store-provider)
- <a id="1password" />[1Password](/en/gateway/secrets/integration-examples#1password)
- <a id="bitwarden-secrets-manager-openclawverbatim568end" />[Bitwarden Secrets Manager (`bws`)](/en/gateway/secrets/integration-examples#bitwarden-secrets-manager-openclawverbatim229end)
- <a id="hashicorp-vault-cli" />[HashiCorp Vault CLI](/en/gateway/secrets/integration-examples#hashicorp-vault-cli)
- <a id="password-store-openclawverbatim579end" />[password-store (`pass`)](/en/gateway/secrets/integration-examples#password-store-openclawverbatim240end)
- <a id="sops" />[sops](/en/gateway/secrets/integration-examples#sops)
- <a id="strict-command-paths" />[Strict command paths](/en/gateway/secrets/operations#strict-command-paths)
- <a id="read-only-command-paths" />[Read-only command paths](/en/gateway/secrets/operations#read-only-command-paths)
- <a id="audit-current-state" />[Audit current state](/en/gateway/secrets/operations#audit-current-state)
- <a id="configure-and-apply-secretrefs" />[Configure and apply SecretRefs](/en/gateway/secrets/operations#configure-and-apply-secretrefs)
- <a id="re-audit" />[Re-audit](/en/gateway/secrets/operations#re-audit)
- <a id="secrets-audit" />[secrets audit](/en/gateway/secrets/operations#secrets-audit)
- <a id="secrets-configure" />[secrets configure](/en/gateway/secrets/operations#secrets-configure)
- <a id="secrets-apply" />[secrets apply](/en/gateway/secrets/operations#secrets-apply)

## Related

- [Authentication](/en/gateway/authentication) - auth setup
- [CLI: secrets](/en/cli/secrets) - CLI commands
- [Vault SecretRefs](/en/plugins/vault) - HashiCorp Vault provider setup
- [Environment Variables](/en/help/environment) - environment precedence
- [SecretRef Credential Surface](/en/reference/secretref-credential-surface) - credential surface
- [Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract) - plan contract details
- [Security](/en/gateway/security) - security posture
- [Configuration reference](/en/gateway/configuration-reference) - where each secrets and env setting is documented
- [Ask user](/en/tools/ask-user) - asking the operator a non-secret question; never answer it with a credential, use the masked `secrets` tool for those
- [Auth credential semantics](/en/auth-credential-semantics) - the canonical rules for auth profile ordering and runtime credential resolution
