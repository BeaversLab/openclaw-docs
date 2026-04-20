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
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) est une **échappatoire d'exécution uniquement** pour s'exécuter en dehors du bac à sable lorsque vous êtes sandboxé (`gateway` par défaut, ou `node` lorsque la cible d'exécution est configurée sur `node`).

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

La mise en bac à sable est contrôlée par `agents.defaults.sandbox.mode` :

- `"off"` : tout s'exécute sur l'hôte.
- `"non-main"` : seules les sessions non principales sont sandboxées (« surprise » courante pour les groupes/canaux).
- `"all"` : tout est sandboxé.

Voir [Sandboxing](/fr/gateway/sandboxing) pour la matrice complète (portée, montages d'espace de travail, images).

### Bind mounts (security quick check)

- `docker.binds` _traverse_ le système de fichiers du bac à sable : tout ce que vous montrez est visible à l'intérieur du conteneur avec le mode que vous définissez (`:ro` ou `:rw`).
- La valeur par défaut est lecture-écriture si vous omettez le mode ; préférez `:ro` pour le code source/les secrets.
- `scope: "shared"` ignore les montages par agent (seuls les montages globaux s'appliquent).
- OpenClaw valide les sources de montage deux fois : d'abord sur le chemin source normalisé, puis à nouveau après résolution via l'ancêtre existant le plus profond. Les échappements par lien symbolique parent ne contournent pas les vérifications de chemin bloqué ou de racine autorisée.
- Les chemins de feuilles inexistants sont toujours vérifiés en toute sécurité. Si `/workspace/alias-out/new-file` se résout via un parent lié par un lien symbolique vers un chemin bloqué ou en dehors des racines autorisées configurées, le montage est rejeté.
- Monter `/var/run/docker.sock` confère effectivement le contrôle de l'hôte au bac à sable ; ne faites cela que intentionnellement.
- L'accès à l'espace de travail (`workspaceAccess: "ro"`/`"rw"`) est indépendant des modes de montage.

## Stratégie d'outil : quels outils existent/sont appelables

Deux couches sont importantes :

- **Profil d'outil** : `tools.profile` et `agents.list[].tools.profile` (liste d'autorisation de base)
- **Profil d'outil du fournisseur** : `tools.byProvider[provider].profile` et `agents.list[].tools.byProvider[provider].profile`
- **Stratégie d'outil globale/par agent** : `tools.allow`/`tools.deny` et `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Stratégie de tool du fournisseur** : `tools.byProvider[provider].allow/deny` et `agents.list[].tools.byProvider[provider].allow/deny`
- **Stratégie de tool du bac à sable** (s'applique uniquement lorsque sandboxed) : `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` et `agents.list[].tools.sandbox.tools.*`

Règles empiriques :

- `deny` l'emporte toujours.
- Si `allow` n'est pas vide, tout le reste est considéré comme bloqué.
- La stratégie de tool constitue l'arrêt définitif : `/exec` ne peut pas remplacer un tool `exec` refusé.
- `/exec` modifie uniquement les valeurs par défaut de session pour les expéditeurs autorisés ; il n'accorde pas l'accès aux tools.
  Les clés de tool du fournisseur acceptent soit `provider` (par ex. `google-antigravity`) soit `provider/model` (par ex. `openai/gpt-5.4`).

### Groupes de tools (raccourcis)

Les stratégies de tools (globale, agent, bac à sable) prennent en charge les entrées `group:*` qui s'étendent à plusieurs tools :

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

- `group:runtime` : `exec`, `process`, `code_execution` (`bash` est accepté comme
  un alias pour `exec`)
- `group:fs` : `read`, `write`, `edit`, `apply_patch`
- `group:sessions` : `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory` : `memory_search`, `memory_get`
- `group:web` : `web_search`, `x_search`, `web_fetch`
- `group:ui` : `browser`, `canvas`
- `group:automation` : `cron`, `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:agents` : `agents_list`
- `group:media` : `image`, `image_generate`, `video_generate`, `tts`
- `group:openclaw` : tous les outils intégrés OpenClaw (exclut les plugins de provider)

## Elevated : exécution uniquement "exécuter sur l'hôte"

Elevated n'accorde **pas** d'outils supplémentaires ; cela n'affecte que `exec`.

- Si vous êtes dans un bac à sable, `/elevated on` (ou `exec` avec `elevated: true`) s'exécute en dehors du bac à sable (les approbations peuvent toujours s'appliquer).
- Utilisez `/elevated full` pour ignorer les approbations d'exécution pour la session.
- Si vous exécutez déjà en mode direct, elevated est effectivement une opération vide (toujours limité par une porte).
- Elevated n'est **pas** limité aux compétences (skill-scoped) et ne **surcharge pas** l'autorisation/refus des outils.
- Elevated n'accorde pas de remplacements arbitraires entre hôtes depuis `host=auto` ; il suit les règles normales de cible d'exécution et ne préserve `node` que lorsque la cible configurée/de session est déjà `node`.
- `/exec` est distinct d'elevated. Il n'ajuste que les valeurs par défaut d'exécution par session pour les expéditeurs autorisés.

Portes :

- Activation : `tools.elevated.enabled` (et facultativement `agents.list[].tools.elevated.enabled`)
- Listes d'autorisation des expéditeurs : `tools.elevated.allowFrom.<provider>` (et facultativement `agents.list[].tools.elevated.allowFrom.<provider>`)

Voir [Mode élevé](/fr/tools/elevated).

## Corrections courantes du "bac à sable"

### "Outil X bloqué par la stratégie d'outil du bac à sable"

Clés de réparation (en choisir une) :

- Désactiver le bac à sable : `agents.defaults.sandbox.mode=off` (ou par agent `agents.list[].sandbox.mode=off`)
- Autoriser l'outil dans le bac à sable :
  - le retirer de `tools.sandbox.tools.deny` (ou par agent `agents.list[].tools.sandbox.tools.deny`)
  - ou l'ajouter à `tools.sandbox.tools.allow` (ou autorisation par agent)

### "Je pensais que c'était le principal, pourquoi est-il sandboxé ?"

En mode `"non-main"`, les clés de groupe/channel ne sont _pas_ principales. Utilisez la clé de session principale (affichée par `sandbox explain`) ou passez en mode `"off"`.

## Voir aussi

- [Sandboxing](/fr/gateway/sandboxing) -- référence complète sur le sandboxing (modes, portées, backends, images)
- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) -- priorités et substitutions par agent
- [Elevated Mode](/fr/tools/elevated)
