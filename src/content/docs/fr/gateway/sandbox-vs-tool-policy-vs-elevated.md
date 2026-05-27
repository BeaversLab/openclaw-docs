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
- Les journaux du Gateway incluent des entrées d'audit `agents/tool-policy` lorsqu'une étape de stratégie d'outil supprime des outils ou qu'une stratégie d'outil de bac à sable (sandbox) bloque un appel. Utilisez `openclaw logs` pour voir l'étiquette de règle, la clé de configuration et les noms des outils concernés.

### Groupes d'outils (abréviations)

Les stratégies d'outils (globales, agent, bac à sable) prennent en charge les entrées `group:*` qui s'étendent à plusieurs outils :

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
  Pour les agents en lecture seule, refusez `group:runtime` ainsi que les outils de modification du système de fichiers, sauf si la stratégie de système de fichiers du bac à sable ou une limite hôte distincte applique la contrainte de lecture seule.
- `group:sessions` : `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory` : `memory_search`, `memory_get`
- `group:web` : `web_search`, `x_search`, `web_fetch`
- `group:ui` : `browser`, `canvas`
- `group:automation` : `heartbeat_respond`, `cron`, `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:agents` : `agents_list`, `update_plan`
- `group:media` : `image`, `image_generate`, `music_generate`, `video_generate`, `tts`
- `group:openclaw` : tous les outils intégrés OpenClaw (exclut les plugins de provider)
- `group:plugins` : tous les outils chargés appartenant à des plugins, y compris les serveurs MCP configurés exposés via `bundle-mcp`

Pour les serveurs MCP sandboxés, la stratégie d'outil de sandbox est une seconde porte d'autorisation. Si `mcp.servers` est configuré mais que les tours sandboxés n'affichent que les outils intégrés, ajoutez `bundle-mcp`, `group:plugins`, ou un nom/glob d'outil MCP préfixé par serveur tel que `outlook__send_mail` ou `outlook__*` à `tools.sandbox.tools.alsoAllow`, puis redémarrez/rechargez la passerelle et recapturez la liste des outils. Les globs de serveur utilisent le préfixe de serveur MCP sécurisé pour le provider : les caractères non-`[A-Za-z0-9_-]` deviennent `-`, les noms qui ne commencent pas par une lettre reçoivent un préfixe `mcp-`, et les préfixes longs ou en double peuvent être tronqués ou suffixés.

`openclaw doctor` vérifie actuellement cette forme pour les serveurs gérés par OpenClaw dans `mcp.servers`. Les serveurs MCP chargés depuis les manifestes de plugins groupés ou les `.mcp.json` Claude utilisent la même porte de sandbox, mais ce diagnostic n'énumère pas encore ces sources ; utilisez les mêmes entrées de liste blanche si leurs outils disparaissent dans les tours sandboxés.

## Elevated : exécution uniquement « exécuter sur l'hôte »

Elevated n'accorde **pas** d'outils supplémentaires ; il affecte uniquement `exec`.

- Si vous êtes sandboxé, `/elevated on` (ou `exec` avec `elevated: true`) s'exécute en dehors du sandbox (les approbations peuvent toujours s'appliquer).
- Utilisez `/elevated full` pour ignorer les approbations d'exécution pour la session.
- Si vous fonctionnez déjà en mode direct, elevated est effectivement une opération vide (toujours filtré).
- Elevated n'est **pas** limité au niveau de la compétence et ne **pas** outrepasse les autorisations/refus d'outils.
- Elevated n'accorde pas de remplacements arbitraires entre hôtes depuis `host=auto` ; il suit les règles normales de cible d'exécution et ne préserve `node` que lorsque la cible configurée/session est déjà `node`.
- `/exec` est distinct du mode élevé. Il n'ajuste que les valeurs par défaut d'exécution par session pour les expéditeurs autorisés.

Portes (Gates) :

- Activation : `tools.elevated.enabled` (et facultativement `agents.list[].tools.elevated.enabled`)
- Listes d'autorisation des expéditeurs : `tools.elevated.allowFrom.<provider>` (et facultativement `agents.list[].tools.elevated.allowFrom.<provider>`)

Voir [Elevated Mode](/fr/tools/elevated).

## Corrections courantes du "bac à sable (sandbox jail)"

### "Tool X bloqué par la stratégie d'outil du bac à sable"

Clés de correction (en choisir une) :

- Désactiver le bac à sable : `agents.defaults.sandbox.mode=off` (ou par agent `agents.list[].sandbox.mode=off`)
- Autoriser l'outil dans le bac à sable :
  - le retirer de `tools.sandbox.tools.deny` (ou par agent `agents.list[].tools.sandbox.tools.deny`)
  - ou l'ajouter à `tools.sandbox.tools.allow` (ou allow par agent)
- Vérifiez `openclaw logs` pour l'entrée `agents/tool-policy`. Elle enregistre le mode de bac à sable et si la règle d'autorisation ou de refus a bloqué l'outil.

### "Je pensais que c'était main, pourquoi est-ce sandboxed ?"

En mode `"non-main"`, les clés de groupe/canal ne sont _pas_ main. Utilisez la clé de session principale (affichée par `sandbox explain`) ou passez en mode `"off"`.

## Connexes

- [Sandboxing](/fr/gateway/sandboxing) -- référence complète du bac à sable (modes, portées, backends, images)
- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) -- remplacements et priorités par agent
- [Elevated Mode](/fr/tools/elevated)
