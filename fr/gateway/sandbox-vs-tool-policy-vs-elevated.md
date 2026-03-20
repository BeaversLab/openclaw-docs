---
title: Sandbox vs Tool Policy vs Elevated
summary: "Pourquoi un tool est bloqué : sandbox runtime, tool allow/deny policy, et elevated exec gates"
read_when: "Vous tombez sur 'sandbox jail' ou voyez un refus de tool/elevated et souhaitez modifier la clé de configuration exacte."
status: active
---

# Sandbox vs Tool Policy vs Elevated

OpenClaw possède trois contrôles liés (mais différents) :

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) décide **où s'exécutent les tools** (Docker vs hôte).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) décide **quels tools sont disponibles/autorisés**.
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) est une **échappatoire exec-only** pour s'exécuter sur l'hôte lorsque vous êtes sandboxed.

## Débogage rapide

Utilisez l'inspecteur pour voir ce que OpenClaw fait _réellement_ :

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

Il affiche :

- le mode/la portée/l'accès au workspace effective du sandbox
- si la session est actuellement sandboxed (main vs non-main)
- le tool allow/deny effective du sandbox (et s'il provient de agent/global/default)
- les portes elevated et les chemins des clés de correction

## Sandbox : où s'exécutent les tools

Le Sandboxing est contrôlé par `agents.defaults.sandbox.mode` :

- `"off"` : tout s'exécute sur l'hôte.
- `"non-main"` : seules les sessions non-main sont sandboxed (surprise fréquente pour les groupes/canaux).
- `"all"` : tout est sandboxed.

Voir [Sandboxing](/fr/gateway/sandboxing) pour la matrice complète (scope, workspace mounts, images).

### Bind mounts (vérification rapide de sécurité)

- `docker.binds` _traverse_ le système de fichiers du sandbox : tout ce que vous montrez est visible dans le conteneur avec le mode que vous avez défini (`:ro` ou `:rw`).
- La valeur par défaut est lecture-écriture si vous omettez le mode ; préférez `:ro` pour source/secrets.
- `scope: "shared"` ignore les binds par-agent (seuls les binds globaux s'appliquent).
- Monter `/var/run/docker.sock` donne effectivement le contrôle de l'hôte au sandbox ; ne faites cela qu'intentionnellement.
- L'accès au workspace (`workspaceAccess: "ro"`/`"rw"`) est indépendant des modes de bind.

## Stratégie de tool : quels tools existent/sont appelables

Deux couches sont importantes :

- **Profil de tool** : `tools.profile` et `agents.list[].tools.profile` (liste d'autorisation de base)
- **Profil de tool de fournisseur** : `tools.byProvider[provider].profile` et `agents.list[].tools.byProvider[provider].profile`
- **Stratégie de tool globale/par agent** : `tools.allow`/`tools.deny` et `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Stratégie de tool de fournisseur** : `tools.byProvider[provider].allow/deny` et `agents.list[].tools.byProvider[provider].allow/deny`
- **Stratégie de tool de Sandbox** (s'applique uniquement lors d'un sandboxing) : `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` et `agents.list[].tools.sandbox.tools.*`

Règles empiriques :

- `deny` gagne toujours.
- Si `allow` n'est pas vide, tout le reste est traité comme bloqué.
- La stratégie de tool est l'arrêt définitif : `/exec` ne peut pas remplacer un tool `exec` refusé.
- `/exec` ne modifie que les valeurs par défaut de session pour les expéditeurs autorisés ; il n'accorde pas l'accès au tool.
  Les clés de tool de fournisseur acceptent soit `provider` (par ex. `google-antigravity`), soit `provider/model` (par ex. `openai/gpt-5.2`).

### Groupes de tools (raccourcis)

Les stratégies de tools (globale, agent, sandbox) prennent en charge les entrées `group:*` qui s'étendent à plusieurs tools :

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
- `group:sessions` : `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory` : `memory_search`, `memory_get`
- `group:ui` : `browser`, `canvas`
- `group:automation` : `cron` , `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:openclaw` : tous les outils intégrés OpenClaw (exclut les plugins de fournisseur)

## Elevated : exécution uniquement « run on host »

Elevated n'accorde **pas** d'outils supplémentaires ; cela affecte uniquement `exec`.

- Si vous êtes dans un bac à sable, `/elevated on` (ou `exec` avec `elevated: true`) s'exécute sur l'hôte (les approbations peuvent toujours s'appliquer).
- Utilisez `/elevated full` pour ignorer les approbations d'exécution pour la session.
- Si vous fonctionnez déjà en mode direct, elevated est effectivement une opération vide (toujours soumise à des portes).
- Elevated n'est **pas** limité à une compétence (skill-scoped) et ne remplace **pas** les autorisations/refus d'outils.
- `/exec` est distinct d'elevated. Il ajuste uniquement les valeurs par défaut d'exécution par session pour les expéditeurs autorisés.

Portes (Gates) :

- Activation : `tools.elevated.enabled` (et facultativement `agents.list[].tools.elevated.enabled`)
- Listes d'autorisation d'expéditeurs : `tools.elevated.allowFrom.<provider>` (et facultativement `agents.list[].tools.elevated.allowFrom.<provider>`)

Voir [Elevated Mode](/fr/tools/elevated).

## Corrections courantes du « sandbox jail »

### « Tool X bloqué par la stratégie d'outil de bac à sable »

Clés de réparation (à choisir) :

- Désactiver le bac à sable : `agents.defaults.sandbox.mode=off` (ou par agent `agents.list[].sandbox.mode=off`)
- Autoriser l'outil dans le bac à sable :
  - supprimez-le de `tools.sandbox.tools.deny` (ou par agent `agents.list[].tools.sandbox.tools.deny`)
  - ou ajoutez-le à `tools.sandbox.tools.allow` (ou autorisation par agent)

### « Je pensais que c'était main, pourquoi est-ce dans un bac à sable ? »

En mode `"non-main"` , les clés de groupe/de canal ne sont _pas_ principales. Utilisez la clé de session principale (affichée par `sandbox explain`) ou basculez le mode sur `"off"`.

import fr from "/components/footer/fr.mdx";

<fr />
