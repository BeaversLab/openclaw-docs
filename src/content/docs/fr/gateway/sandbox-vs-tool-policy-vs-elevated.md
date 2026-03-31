---
title: Sandbox vs Tool Policy vs Elevated
summary: "Why a tool is blocked: sandbox runtime, tool allow/deny policy, and elevated exec gates"
read_when: "You hit 'sandbox jail' or see a tool/elevated refusal and want the exact config key to change."
status: active
---

# Sandbox vs Tool Policy vs Elevated

OpenClaw has three related (but different) controls:

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) decides **where tools run** (Docker vs host).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) decides **which tools are available/allowed**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) is an **exec-only escape hatch** to run on the host when you’re sandboxed.

## Quick debug

Use the inspector to see what OpenClaw is _actually_ doing:

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

It prints:

- effective sandbox mode/scope/workspace access
- whether the session is currently sandboxed (main vs non-main)
- effective sandbox tool allow/deny (and whether it came from agent/global/default)
- elevated gates and fix-it key paths

## Sandbox: where tools run

Sandboxing is controlled by `agents.defaults.sandbox.mode`:

- `"off"`: everything runs on the host.
- `"non-main"`: only non-main sessions are sandboxed (common “surprise” for groups/channels).
- `"all"`: everything is sandboxed.

See [Sandboxing](/en/gateway/sandboxing) for the full matrix (scope, workspace mounts, images).

### Bind mounts (security quick check)

- `docker.binds` _pierces_ the sandbox filesystem: whatever you mount is visible inside the container with the mode you set (`:ro` or `:rw`).
- Default is read-write if you omit the mode; prefer `:ro` for source/secrets.
- `scope: "shared"` ignore les liaisons par agent (seules les liaisons globales s'appliquent).
- Lier `/var/run/docker.sock` confère effectivement le contrôle de l'hôte au sandbox ; ne faites cela que intentionnellement.
- L'accès à l'espace de travail (`workspaceAccess: "ro"`/`"rw"`) est indépendant des modes de liaison.

## Stratégie d'outil : quels outils existent/sont appelables

Deux couches sont importantes :

- **Profil d'outil** : `tools.profile` et `agents.list[].tools.profile` (liste d'autorisation de base)
- **Profil d'outil du fournisseur** : `tools.byProvider[provider].profile` et `agents.list[].tools.byProvider[provider].profile`
- **Stratégie d'outil globale/par agent** : `tools.allow`/`tools.deny` et `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Stratégie d'outil du fournisseur** : `tools.byProvider[provider].allow/deny` et `agents.list[].tools.byProvider[provider].allow/deny`
- **Stratégie d'outil du sandbox** (s'applique uniquement lors de l'utilisation du sandbox) : `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` et `agents.list[].tools.sandbox.tools.*`

Règles empiriques :

- `deny` gagne toujours.
- Si `allow` n'est pas vide, tout le reste est traité comme bloqué.
- La stratégie d'outil est l'arrêt définitif : `/exec` ne peut pas remplacer un outil `exec` refusé.
- `/exec` ne modifie que les valeurs par défaut de session pour les expéditeurs autorisés ; il n'accorde pas l'accès aux outils.
  Les clés d'outil du fournisseur acceptent soit `provider` (par ex. `google-antigravity`) soit `provider/model` (par ex. `openai/gpt-5.2`).

### Groupes d'outils (raccourcis)

Les stratégies d'outil (globales, agent, sandbox) prennent en charge les entrées `group:*` qui s'étendent à plusieurs outils :

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

Groupes disponibles :

- `group:runtime` : `exec`, `bash`, `process`
- `group:fs` : `read`, `write`, `edit`, `apply_patch`
- `group:sessions` : `sessions_list` , `sessions_history` , `sessions_send` , `sessions_spawn` , `session_status`
- `group:memory` : `memory_search` , `memory_get`
- `group:ui` : `browser` , `canvas`
- `group:automation` : `cron` , `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:openclaw` : tous les outils OpenClaw intégrés (exclut les plugins de provider)

## Elevated : exec-only "run on host"

Elevated n'accorde **pas** d'outils supplémentaires ; cela n'affecte que `exec`.

- Si vous êtes sandboxed, `/elevated on` (ou `exec` avec `elevated: true`) s'exécute sur l'hôte (les approbations peuvent toujours s'appliquer).
- Utilisez `/elevated full` pour ignorer les approbations d'exécution pour la session.
- Si vous fonctionnez déjà en mode direct, elevated est effectivement une opération vide (toujours soumise à des restrictions).
- Elevated n'est **pas** limité à une compétence (skill) et ne **remplace pas** l'autorisation/le refus d'outil.
- `/exec` est distinct d'elevated. Il ajuste uniquement les valeurs par défaut d'exécution par session pour les expéditeurs autorisés.

Portes :

- Activation : `tools.elevated.enabled` (et optionnellement `agents.list[].tools.elevated.enabled`)
- Listes d'autorisation des expéditeurs : `tools.elevated.allowFrom.<provider>` (et optionnellement `agents.list[].tools.elevated.allowFrom.<provider>`)

Voir [Elevated Mode](/en/tools/elevated).

## Corrections courantes du "sandbox jail"

### "Tool X bloqué par la stratégie d'outil de sandbox"

Clés de réparation (en choisir une) :

- Désactiver le sandbox : `agents.defaults.sandbox.mode=off` (ou `agents.list[].sandbox.mode=off` par agent)
- Autoriser l'outil dans le sandbox :
  - le supprimer de `tools.sandbox.tools.deny` (ou `agents.list[].tools.sandbox.tools.deny` par agent)
  - ou l'ajouter à `tools.sandbox.tools.allow` (ou allow par agent)

### "Je pensais que c'était main, pourquoi est-ce sandboxed ?"

En mode `"non-main"`, les clés de groupe/channel ne sont _pas_ main. Utilisez la clé de session principale (affichée par `sandbox explain`) ou basculez le mode sur `"off"`.

## Voir aussi

- [Sandboxing](/en/gateway/sandboxing) -- référence complète du sandbox (modes, portées, backends, images)
- [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) -- substitutions par agent et priorité
- [Elevated Mode](/en/tools/elevated)
