---
summary: "Pourquoi un tool est bloqué : sandbox runtime, stratégie d'autorisation/refus de tool, et portes d'exécution élevées"
title: Sandbox vs stratégie de tool vs élevé
read_when: "You hit 'sandbox jail' or see a tool/elevated refusal and want the exact config key to change."
status: active
---

OpenClaw possède trois contrôles liés (mais différents) :

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) décide **où les tools s'exécutent** (sandbox backend vs host).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) décide **quels tools sont disponibles/autorisés**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) est une **échappatoire d'exécution uniquement** pour s'exécuter en dehors du sandbox lorsque vous êtes sandboxé (`gateway` par défaut, ou `node` lorsque la cible d'exécution est configurée sur `node`).

## Débogage rapide

Utilisez l'inspecteur pour voir ce que OpenClaw fait _réellement_ :

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

Il affiche :

- mode/portée d'accès au sandbox et à l'espace de travail effectifs
- si la session est actuellement sandboxed (main vs non-main)
- stratégie d'autorisation/refus de sandbox tool effective (et si elle provient de agent/global/default)
- portes élevées et chemins de clés de correction

## Sandbox : où les tools s'exécutent

Le sandboxing est contrôlé par `agents.defaults.sandbox.mode` :

- `"off"` : tout s'exécute sur l'hôte.
- `"non-main"` : seules les sessions non principales sont sandboxées (« surprise » courante pour les groupes/canaux).
- `"all"` : tout est sandboxed.

Voir [Sandboxing](/fr/gateway/sandboxing) pour la matrice complète (portée, montages de l'espace de travail, images).

### Bind mounts (vérification rapide de sécurité)

- `docker.binds` _perce_ le système de fichiers du sandbox : tout ce que vous montrez est visible à l'intérieur du conteneur avec le mode que vous avez défini (`:ro` ou `:rw`).
- Le défaut est lecture-écriture si vous omettez le mode ; préférez `:ro` pour le source/les secrets.
- `scope: "shared"` ignore les bind par-agent (seuls les binds globaux s'appliquent).
- OpenClaw valide les sources de liaison deux fois : d'abord sur le chemin source normalisé, puis à nouveau après résolution via l'ancêtre existant le plus profond. Les échappements de parents par lien symbolique ne contournent pas les vérifications de chemin bloqué ou de racines autorisées.
- Les chemins de feuilles inexistants sont toujours vérifiés en toute sécurité. Si `/workspace/alias-out/new-file` résout via un parent symbolisé vers un chemin bloqué ou à l'extérieur des racines autorisées configurées, la liaison est rejetée.
- Lier `/var/run/docker.sock` cède effectivement le contrôle de l'hôte au bac à sable ; ne faites cela qu'intentionnellement.
- L'accès à l'espace de travail (`workspaceAccess: "ro"`/`"rw"`) est indépendant des modes de liaison.

## Stratégie d'outil : quels outils existent/sont appelables

Deux couches sont importantes :

- **Profil d'outil** : `tools.profile` et `agents.list[].tools.profile` (liste d'autorisation de base)
- **Profil d'outil du fournisseur** : `tools.byProvider[provider].profile` et `agents.list[].tools.byProvider[provider].profile`
- **Stratégie d'outil globale/par agent** : `tools.allow`/`tools.deny` et `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Stratégie d'outil du fournisseur** : `tools.byProvider[provider].allow/deny` et `agents.list[].tools.byProvider[provider].allow/deny`
- **Stratégie d'outil de bac à sable** (s'applique uniquement lors de la mise en bac à sable) : `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` et `agents.list[].tools.sandbox.tools.*`

Règles empiriques :

- `deny` gagne toujours.
- Si `allow` n'est pas vide, tout le reste est traité comme bloqué.
- La stratégie d'outil est l'arrêt définitif : `/exec` ne peut pas remplacer un outil `exec` refusé.
- La stratégie de tools filtre la disponibilité des tools par nom ; elle n'inspecte pas les effets secondaires dans `exec`. Si `exec` est autorisé, le refus de `write`, `edit` ou `apply_patch` ne rend pas les commandes shell en lecture seule.
- `/exec` ne modifie que les valeurs par défaut de session pour les expéditeurs autorisés ; il n'accorde pas l'accès aux tools.
  Les clés de tools du fournisseur acceptent soit `provider` (par exemple `google-antigravity`) soit `provider/model` (par exemple `openai/gpt-5.4`).

### Groupes de tools (raccourcis)

Les stratégies de tools (globales, agent, sandbox) prennent en charge les entrées `group:*` qui s'étendent à plusieurs tools :

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
  Pour les agents en lecture seule, refusez `group:runtime` ainsi que les tools de système de fichiers mutants, sauf si la stratégie de système de fichiers du sandbox ou une limite d'hôte distincte applique la contrainte de lecture seule.
- `group:sessions` : `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory` : `memory_search`, `memory_get`
- `group:web` : `web_search`, `x_search`, `web_fetch`
- `group:ui` : `browser`, `canvas`
- `group:automation` : `heartbeat_respond`, `cron`, `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:agents` : `agents_list`, `update_plan`
- `group:media` : `image`, `image_generate`, `music_generate`, `video_generate`, `tts`
- `group:openclaw` : tous les outils intégrés OpenClaw (exclut les plugins provider)

## Elevated : exécution uniquement "exécuter sur l'hôte"

Le mode élevé n'accorde **pas** d'outils supplémentaires ; il affecte uniquement `exec`.

- Si vous êtes %%PH:GLOSSARY:sandboxed%%4d83966c%% (ou `/elevated on``exec` avec `elevated: true`), il s'exécute en dehors du bac à sable (les approbations peuvent toujours s'appliquer).
- Utilisez `/elevated full` pour ignorer les approbations d'exécution pour la session.
- Si vous exécutez déjà en direct, le mode élevé est effectivement une opération vide (toujours restreint).
- Elevated n'est **pas** limité aux compétences (skill-scoped) et ne **surcharge pas** l'autorisation/refus des outils.
- Le mode élevé n'accorde pas de remplacements arbitraires entre hôtes depuis `host=auto` ; il suit les règles normales de cible d'exécution et ne conserve `node` que lorsque la cible configurée/de session est déjà `node`.
- `/exec` est distinct du mode élevé. Il ajuste uniquement les valeurs par défaut d'exécution par session pour les expéditeurs autorisés.

Portes :

- Activation : `tools.elevated.enabled` (et facultativement `agents.list[].tools.elevated.enabled`)
- Listes d'autorisation des expéditeurs : `tools.elevated.allowFrom.<provider>` (et facultativement `agents.list[].tools.elevated.allowFrom.<provider>`)

Voir [Elevated Mode](/fr/tools/elevated).

## Corrections courantes du "bac à sable"

### "Outil X bloqué par la stratégie d'outil du bac à sable"

Clés de réparation (en choisir une) :

- Désactiver le bac à sable (sandbox) : `agents.defaults.sandbox.mode=off` (ou par agent `agents.list[].sandbox.mode=off`)
- Autoriser l'outil dans le bac à sable :
  - le supprimer de `tools.sandbox.tools.deny` (ou par agent `agents.list[].tools.sandbox.tools.deny`)
  - ou l'ajouter à `tools.sandbox.tools.allow` (ou autorisation par agent)

### "Je pensais que c'était le principal, pourquoi est-il sandboxé ?"

En mode `"non-main"`, les clés de groupe/channel ne sont pas principales. Utilisez la clé de session principale (affichée par `sandbox explain`) ou passez en mode `"off"`.

## Connexes

- [Sandboxing](/fr/gateway/sandboxing) -- référence complète sur le bac à sable (modes, portées, backends, images)
- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) -- substitutions par agent et priorité
- [Elevated Mode](/fr/tools/elevated)
