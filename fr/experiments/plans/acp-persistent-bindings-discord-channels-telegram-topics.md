# Liaisons persistantes de l'ACP pour les canaux Discord et les sujets Telegram

Statut : Brouillon

## Résumé

Introduire des liaisons persistantes de l'ACP qui mappent :

- Les canaux Discord (et les fils de discussion existants, si nécessaire), et
- Les sujets de forum Telegram dans les groupes/supergroupes (`chatId:topic:topicId`)

à des sessions ACP de longue durée, avec l'état de liaison stocké dans des entrées `bindings[]` de premier niveau utilisant des types de liaison explicites.

Cela rend l'utilisation de l'ACP dans les canaux de messagerie à fort trafic prévisible et durable, afin que les utilisateurs puissent créer des canaux/sujets dédiés tels que `codex`, `claude-1` ou `claude-myrepo`.

## Pourquoi

Le comportement actuel de l'ACP lié aux fils est optimisé pour les flux de travail éphémères des fils Discord. Telegram n'a pas le même modèle de fil ; il a des sujets de forum dans les groupes/supergroupes. Les utilisateurs souhaitent des « espaces de travail » ACP stables et toujours actifs dans les surfaces de chat, et pas seulement des sessions de fil temporaires.

## Objectifs

- Prendre en charge la liaison durable de l'ACP pour :
  - Les canaux/fils Discord
  - Les sujets de forum Telegram (groupes/supergroupes)
- Rendre la source de vérité de la liaison basée sur la configuration.
- Garder `/acp`, `/new`, `/reset`, `/focus` et le comportement de livraison cohérents entre Discord et Telegram.
- Conserver les flux de liaison temporaires existants pour une usage ponctuel.

## Non-Objectifs

- Refonte complète des composants internes d'exécution/session de l'ACP.
- Suppression des flux de liaison éphémères existants.
- Extension à chaque canal lors de la première itération.
- Mise en œuvre des sujets de messages directs des canaux Telegram (`direct_messages_topic_id`) lors de cette phase.
- Mise en œuvre des variantes de sujets de chat privé Telegram lors de cette phase.

## Direction UX

### 1) Deux types de liaison

- **Liaison persistante** : enregistrée dans la configuration, réconciliée au démarrage, destinée aux canaux/sujets « espace de travail nommés ».
- **Liaison temporaire** : uniquement lors de l'exécution, expire selon une stratégie d'inactivité/d'ancienneté maximale.

### 2) Comportement de la commande

- `/acp spawn ... --thread here|auto|off` reste disponible.
- Ajouter des contrôles explicites du cycle de vie de la liaison :
  - `/acp bind [session|agent] [--persist]`
  - `/acp unbind [--persist]`
  - `/acp status` indique si la liaison est `persistent` ou `temporary`.
- Dans les conversations liées, `/new` et `/reset` réinitialisent la session ACP liée sur place et conservent la liaison attachée.

### 3) Identité de la conversation

- Utiliser les ID de conversation canoniques :
  - Discord : ID de channel/fil de discussion.
  - Sujet Telegram : `chatId:topic:topicId`.
- Ne jamais utiliser l'ID de sujet brut seul comme clé pour les liaisons Telegram.

## Modèle de configuration (Proposé)

Unifier la configuration du routage et des liaisons ACP persistantes dans un `bindings[]` de niveau supérieur avec un discriminateur `type` explicite :

```jsonc
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "runtime": { "type": "embedded" },
      },
      {
        "id": "codex",
        "workspace": "~/.openclaw/workspace-codex",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "codex",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-a",
          },
        },
      },
      {
        "id": "claude",
        "workspace": "~/.openclaw/workspace-claude",
        "runtime": {
          "type": "acp",
          "acp": {
            "agent": "claude",
            "backend": "acpx",
            "mode": "persistent",
            "cwd": "/workspace/repo-b",
          },
        },
      },
    ],
  },
  "acp": {
    "enabled": true,
    "backend": "acpx",
    "allowedAgents": ["codex", "claude"],
  },
  "bindings": [
    // Route bindings (existing behavior)
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },
    // Persistent ACP conversation bindings
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
      "acp": {
        "label": "codex-main",
        "mode": "persistent",
        "cwd": "/workspace/repo-a",
        "backend": "acpx",
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
      "acp": {
        "label": "claude-repo-b",
        "mode": "persistent",
        "cwd": "/workspace/repo-b",
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1001234567890:topic:42" },
      },
      "acp": {
        "label": "tg-codex-42",
        "mode": "persistent",
      },
    },
  ],
  "channels": {
    "discord": {
      "guilds": {
        "111111111111111111": {
          "channels": {
            "222222222222222222": {
              "enabled": true,
              "requireMention": false,
            },
            "333333333333333333": {
              "enabled": true,
              "requireMention": false,
            },
          },
        },
      },
    },
    "telegram": {
      "groups": {
        "-1001234567890": {
          "topics": {
            "42": {
              "requireMention": false,
            },
          },
        },
      },
    },
  },
}
```

### Exemple minimal (Aucune substitution ACP par liaison)

```jsonc
{
  "agents": {
    "list": [
      { "id": "main", "default": true, "runtime": { "type": "embedded" } },
      {
        "id": "codex",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "codex", "backend": "acpx", "mode": "persistent" },
        },
      },
      {
        "id": "claude",
        "runtime": {
          "type": "acp",
          "acp": { "agent": "claude", "backend": "acpx", "mode": "persistent" },
        },
      },
    ],
  },
  "acp": { "enabled": true, "backend": "acpx" },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "discord", "accountId": "default" },
    },
    {
      "type": "route",
      "agentId": "main",
      "match": { "channel": "telegram", "accountId": "default" },
    },

    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "222222222222222222" },
      },
    },
    {
      "type": "acp",
      "agentId": "claude",
      "match": {
        "channel": "discord",
        "accountId": "default",
        "peer": { "kind": "channel", "id": "333333333333333333" },
      },
    },
    {
      "type": "acp",
      "agentId": "codex",
      "match": {
        "channel": "telegram",
        "accountId": "default",
        "peer": { "kind": "group", "id": "-1009876543210:topic:5" },
      },
    },
  ],
}
```

Notes :

- `bindings[].type` est explicite :
  - `route` : routage normal de l'agent.
  - `acp` : liaison persistante du harnais ACP pour une conversation correspondante.
- Pour `type: "acp"`, `match.peer.id` est la clé de conversation canonique :
  - Channel/fil de discussion Discord : ID brut de channel/fil de discussion.
  - Sujet Telegram : `chatId:topic:topicId`.
- `bindings[].acp.backend` est facultatif. Ordre de repli du backend :
  1. `bindings[].acp.backend`
  2. `agents.list[].runtime.acp.backend`
  3. `acp.backend` global
- `mode`, `cwd` et `label` suivent le même modèle de substitution (`binding override -> agent runtime default -> global/default behavior`).
- Conserver les `session.threadBindings.*` et `channels.discord.threadBindings.*` existants pour les politiques de liaison temporaires.
- Les entrées persistantes déclarent l'état souhaité ; l'exécution réconcilie avec les sessions/liens ACP réels.
- Une liaison ACP active par nœud de conversation est le modèle prévu.
- Compatibilité descendante : l'absence de `type` est interprétée comme `route` pour les entrées héritées.

### Sélection du backend

- L'initialisation de la session ACP utilise déjà la sélection du backend configurée lors du spawn (`acp.backend` aujourd'hui).
- Cette proposition étend la logique de spawn/réconciliation pour privilégier les substitutions de liaison ACP typées :
  - `bindings[].acp.backend` pour la substitution locale à la conversation.
  - `agents.list[].runtime.acp.backend` pour les valeurs par défaut par agent.
- Si aucune substitution n'existe, conserver le comportement actuel (`acp.backend` par défaut).

## Intégration de l'architecture dans le système actuel

### Réutiliser les composants existants

- `SessionBindingService` prend déjà en charge les références de conversation indépendantes du canal.
- Les flux de spawn/bind d'ACP prennent déjà en charge la liaison via les API de service.
- Telegram transporte déjà le contexte de sujet/fil via `MessageThreadId` et `chatId`.

### Nouveaux composants / composants étendus

- **Adaptateur de liaison Telegram** (parallèle à l'adaptateur Discord) :
  - enregistrer l'adaptateur par compte Telegram,
  - résoudre/lister/lier/délier/toucher par ID de conversation canonique.
- **Résolveur/index de liaison typée** :
  - diviser `bindings[]` en vues `route` et `acp`,
  - garder `resolveAgentRoute` uniquement sur les liaisons `route`,
  - résoudre l'intention persistante de l'ACP uniquement à partir des liaisons `acp`.
- **Résolution de liaison entrante pour Telegram** :
  - résoudre la session liée avant la finalisation de l'itinéraire (Discord le fait déjà).
- **Réconciliateur de liaison persistante** :
  - au démarrage : charger les liaisons `type: "acp"` de niveau supérieur configurées, s'assurer que les sessions ACP existent, s'assurer que les liaisons existent.
  - en cas de changement de configuration : appliquer les deltas en toute sécurité.
- **Modèle de basculement** :
  - aucun repli de liaison ACP local au canal n'est lu,
  - les liaisons ACP persistantes sont sourcées uniquement à partir des entrées `bindings[].type="acp"` de niveau supérieur.

## Livraison par phases

### Phase 1 : Fondation du schéma de liaison typée

- Étendre le schéma de configuration pour prendre en charge le discriminateur `bindings[].type` :
  - `route`,
  - `acp` avec objet de remplacement `acp` optionnel (`mode`, `backend`, `cwd`, `label`).
- Étendre le schéma de l'agent avec un descripteur d'exécution pour marquer les agents natifs ACP (`agents.list[].runtime.type`).
- Ajouter une séparation analyseur/indexeur pour les liaisons de route vs ACP.

### Phase 2 : Résolution à l'exécution + parité Discord/Telegram

- Résoudre les liaisons ACP persistantes à partir des entrées `type: "acp"` de premier niveau pour :
  - Channels/threads Discord,
  - Sujets de forum Telegram (`chatId:topic:topicId` ID canoniques).
- Implémenter l'adaptateur de liaison Telegram et la parité de remplacement de session liée entrante avec Discord.
- Ne pas inclure les variantes de sujet direct/privé Telegram dans cette phase.

### Phase 3 : Parité des commandes et réinitialisations

- Aligner le comportement de `/acp`, `/new`, `/reset` et `/focus` dans les conversations Telegram/Discord liées.
- Assurer que la liaison survit aux flux de réinitialisation tels que configurés.

### Phase 4 : Durcissement

- Meilleurs diagnostics (`/acp status`, journaux de réconciliation au démarrage).
- Gestion des conflits et contrôles de santé.

## Garde-fous et politique

- Respecter l'activation et les restrictions du bac à sable (sandbox) ACP exactement comme aujourd'hui.
- Conserver la portée de compte explicite (`accountId`) pour éviter les fuites entre comptes.
- Échec fermé en cas de routage ambigu.
- Garder le comportement de la politique de mention/d'accès explicite par configuration de channel.

## Plan de test

- Unitaire :
  - normalisation de l'ID de conversation (surtout les ID de sujet Telegram),
  - chemins de création/mise à jour/suppression du réconciliateur,
  - flux `/acp bind --persist` et de dissociation.
- Intégration :
  - sujet Telegram entrant -> résolution de session ACP liée,
  - channel/thread Discord entrant -> priorité de liaison persistante.
- Régression :
  - les liaisons temporaires continuent de fonctionner,
  - les channels/sujets non liés gardent le comportement de routage actuel.

## Questions ouvertes

- `/acp spawn --thread auto` dans le sujet Telegram doit-il par défaut être `here` ?
- Les liaisons persistantes doivent-elles toujours contourner le filtrage par mention dans les conversations liées, ou nécessiter un `requireMention=false` explicite ?
- `/focus` doit-il obtenir `--persist` comme un alias pour `/acp bind --persist` ?

## Déploiement

- Lancer en opt-in par conversation (entrée `bindings[].type="acp"` présente).
- Commencer uniquement avec Discord et Telegram.
- Ajouter de la documentation avec des exemples pour :
  - « un channel/topic par agent »
  - « plusieurs channels/topics pour le même agent avec différents `cwd` »
  - « modèles de nommage d'équipe (`codex-1`, `claude-repo-x`) ».

import fr from '/components/footer/fr.mdx';

<fr />
