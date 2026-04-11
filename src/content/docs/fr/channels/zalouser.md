---
summary: "Prise en charge du compte personnel Zalo via zca-js natif (connexion QR), capacités et configuration"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo Personnel"
---

# Zalo Personnel (non officiel)

Statut : expérimental. Cette intégration automatise un **compte personnel Zalo** via `zca-js` natif dans OpenClaw.

> **Avertissement :** Il s'agit d'une intégration non officielle qui pourrait entraîner une suspension ou un bannissement de compte. Utilisation à vos propres risques.

## Plugin inclus

Zalo Personal est fourni en tant que plugin inclus dans les versions actuelles d'OpenClaw, les versions empaquetées standard n'ont donc pas besoin d'installation séparée.

Si vous utilisez une version ancienne ou une installation personnalisée qui exclut Zalo Personal, installez-le manuellement :

- Installer via CLI : `openclaw plugins install @openclaw/zalouser`
- Ou depuis une récupération des sources : `openclaw plugins install ./path/to/local/zalouser-plugin`
- Détails : [Plugins](/en/tools/plugin)

Aucun binaire CLI externe `zca`/`openzca` n'est requis.

## Installation rapide (débutant)

1. Assurez-vous que le plugin Zalo Personal est disponible.
   - Les versions empaquetées actuelles d'OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Connexion (QR, sur la machine Gateway) :
   - `openclaw channels login --channel zalouser`
   - Scannez le code QR avec l'application mobile Zalo.
3. Activez le canal :

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

4. Redémarrez le Gateway (ou terminez l'installation).
5. L'accès DM est par défaut en mode jumelage ; approuvez le code de jumelage lors du premier contact.

## Ce que c'est

- S'exécute entièrement en processus via `zca-js`.
- Utilise des écouteurs d'événements natifs pour recevoir les messages entrants.
- Envoie les réponses directement via l'API JS (texte/médias/lien).
- Conçu pour les cas d'utilisation de « compte personnel » où le Bot Zalo de API n'est pas disponible.

## Nomination

L'identifiant du canal est `zalouser` pour indiquer explicitement qu'il automatise un **compte utilisateur personnel Zalo** (non officiel). Nous conservons `zalo` réservé pour une future intégration officielle potentielle de l'Zalo API.

## Recherche d'identifiants (répertoire)

Utilisez le CLI de répertoire pour découvrir les pairs/groupes et leurs identifiants :

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## Limites

- Le texte sortant est découpé en blocs d'environ 2000 caractères (limites du client Zalo).
- Le streaming est bloqué par défaut.

## Contrôle d'accès (DMs)

`channels.zalouser.dmPolicy` prend en charge : `pairing | allowlist | open | disabled` (par défaut : `pairing`).

`channels.zalouser.allowFrom` accepte les identifiants ou noms d'utilisateur. Lors de la configuration, les noms sont résolus en identifiants à l'aide de la recherche de contacts en processus du plugin.

Approuver via :

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Accès aux groupes (optionnel)

- Par défaut : `channels.zalouser.groupPolicy = "open"` (groupes autorisés). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- Limiter à une liste autorisée avec :
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (les clés doivent être des ID de groupe stables ; les noms sont résolus en ID au démarrage si possible)
  - `channels.zalouser.groupAllowFrom` (contrôle quels expéditeurs dans les groupes autorisés peuvent déclencher le bot)
- Bloquer tous les groupes : `channels.zalouser.groupPolicy = "disabled"`.
- L'assistant de configuration peut demander les listes blanches de groupes.
- Au démarrage, OpenClaw résout les noms de groupe/utilisateur dans les listes blanches en ID et enregistre le mappage.
- La correspondance des listes blanches de groupe se fait par ID par défaut. Les noms non résolus sont ignorés pour l'authentification, sauf si `channels.zalouser.dangerouslyAllowNameMatching: true` est activé.
- `channels.zalouser.dangerouslyAllowNameMatching: true` est un mode de compatibilité de secours qui réactive la correspondance par nom de groupe mutable.
- Si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` pour les vérifications des expéditeurs de groupe.
- Les vérifications d'expéditeur s'appliquent aux messages de groupe normaux et aux commandes de contrôle (par exemple `/new`, `/reset`).

Exemple :

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["1471383327500481391"],
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true },
      },
    },
  },
}
```

### Filtrage des mentions de groupe

- `channels.zalouser.groups.<group>.requireMention` contrôle si les réponses de groupe nécessitent une mention.
- Ordre de résolution : id/nom de groupe exact -> slug de groupe normalisé -> `*` -> par défaut (`true`).
- Cela s'applique aux groupes sur liste blanche et au mode de groupe ouvert.
- Citer un message de bot compte comme une mention implicite pour l'activation du groupe.
- Les commandes de contrôle autorisées (par exemple `/new`) peuvent contourner le filtrage par mention.
- Lorsqu'un message de groupe est ignoré car une mention est requise, OpenClaw le stocke comme historique de groupe en attente et l'inclut dans le prochain message de groupe traité.
- La limite de l'historique du groupe est `messages.groupChat.historyLimit` par défaut (valeur de repli `50`). Vous pouvez la modifier par compte avec `channels.zalouser.historyLimit`.

Exemple :

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "*": { allow: true, requireMention: true },
        "Work Chat": { allow: true, requireMention: false },
      },
    },
  },
}
```

## Multi-compte

Les comptes correspondent aux profils `zalouser` dans l'état de OpenClaw. Exemple :

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" },
      },
    },
  },
}
```

## Indication de frappe, réactions et accusés de réception

- OpenClaw envoie un événement de frappe avant d'envoyer une réponse (au mieux possible).
- L'action de réaction de message `react` est prise en charge pour `zalouser` dans les actions de canal.
  - Utilisez `remove: true` pour supprimer un emoji de réaction spécifique d'un message.
  - Sémantique des réactions : [Réactions](/en/tools/reactions)
- Pour les messages entrants incluant des métadonnées d'événement, OpenClaw envoie des accusés de réception délivrés + lus (au mieux possible).

## Dépannage

**La connexion ne persiste pas :**

- `openclaw channels status --probe`
- Reconnexion : `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**Le nom de la liste d'autorisation/groupe n'a pas pu être résolu :**

- Utilisez des identifiants numériques dans `allowFrom`/`groupAllowFrom`/`groups`, ou les noms exacts d'amis/groupes.

**Mise à niveau à partir de l'ancienne configuration basée sur CLI :**

- Supprimez toutes les anciennes hypothèses de processus externe `zca`.
- Le canal s'exécute désormais entièrement dans OpenClaw sans binaires externes CLI.

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — authentification et flux d'appairage par DM
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage par mention
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
