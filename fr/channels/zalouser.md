---
summary: "Prise en charge du compte personnel Zalo via zca-js natif (connexion QR), fonctionnalités et configuration"
read_when:
  - Configuration de Zalo Personnel pour OpenClaw
  - Débogage de la connexion ou du flux de messages de Zalo Personnel
title: "Zalo Personnel"
---

# Zalo Personnel (non officiel)

Statut : expérimental. Cette intégration automatise un **compte personnel Zalo** via `zca-js` natif dans OpenClaw.

> **Avertissement :** Il s'agit d'une intégration non officielle qui pourrait entraîner la suspension ou le bannissement de votre compte. Utilisation à vos propres risques.

## Plugin requis

Zalo Personnel est fourni en tant que plugin et n'est pas inclus dans l'installation principale.

- Installer via la CLI : `openclaw plugins install @openclaw/zalouser`
- Ou depuis une source de checkout : `openclaw plugins install ./extensions/zalouser`
- Détails : [Plugins](/fr/tools/plugin)

Aucun binaire CLI externe `zca`/`openzca` n'est requis.

## Configuration rapide (débutant)

1. Installez le plugin (voir ci-dessus).
2. Connexion (QR, sur la machine Gateway) :
   - `openclaw channels login --channel zalouser`
   - Scannez le code QR avec l'application mobile Zalo.
3. Activer le channel :

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

4. Redémarrez le Gateway (ou terminez la configuration).
5. L'accès DM par défaut s'effectue par appairement ; approuvez le code d'appairement lors du premier contact.

## Ce que c'est

- S'exécute entièrement en processus via `zca-js`.
- Utilise les écouteurs d'événements natifs pour recevoir les messages entrants.
- Envoie les réponses directement via l'API JS (texte/média/lien).
- Conçu pour les cas d'utilisation de « compte personnel » où l'Zalo Bot API n'est pas disponible.

## Désignation

L'identifiant du channel est `zalouser` pour rendre explicite le fait que cela automatise un **compte utilisateur personnel Zalo** (non officiel). Nous gardons `zalo` réservé pour une future intégration officielle de l'Zalo API.

## Recherche d'ID (répertoire)

Utilisez la CLI de répertoire pour découvrir les pairs/groupes et leurs ID :

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

`channels.zalouser.allowFrom` accepte les ID ou noms d'utilisateur. Lors de la configuration, les noms sont résolus en ID à l'aide de la recherche de contact en processus du plugin.

Approuver via :

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Accès aux groupes (optionnel)

- Par défaut : `channels.zalouser.groupPolicy = "open"` (groupes autorisés). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- Limiter à une liste d'autorisation (allowlist) avec :
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (les clés doivent être des IDs de groupe stables ; les noms sont résolus en IDs au démarrage si possible)
  - `channels.zalouser.groupAllowFrom` (contrôle quels expéditeurs dans les groupes autorisés peuvent déclencher le bot)
- Bloquer tous les groupes : `channels.zalouser.groupPolicy = "disabled"`.
- L'assistant de configuration peut demander les listes d'autorisation de groupes.
- Au démarrage, OpenClaw résout les noms de groupe/utilisateur dans les listes d'autorisation en IDs et enregistre le mappage.
- La correspondance de la liste d'autorisation de groupe se fait par ID par défaut. Les noms non résolus sont ignorés pour l'authentification, sauf si `channels.zalouser.dangerouslyAllowNameMatching: true` est activé.
- `channels.zalouser.dangerouslyAllowNameMatching: true` est un mode de compatibilité de secours qui réactive la correspondance par nom de groupe modifiable.
- Si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` pour les vérifications des expéditeurs de groupe.
- Les vérifications d'expéditeur s'appliquent à la fois aux messages de groupe normaux et aux commandes de contrôle (par exemple `/new`, `/reset`).

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
- Cela s'applique à la fois aux groupes sur liste blanche et au mode de groupe ouvert.
- Les commandes de contrôle autorisées (par exemple `/new`) peuvent contourner le filtrage par mention.
- Lorsqu'un message de groupe est ignoré car une mention est requise, OpenClaw le stocke comme historique de groupe en attente et l'inclut dans le prochain message de groupe traité.
- La limite d'historique de groupe est `messages.groupChat.historyLimit` par défaut (secours `50`). Vous pouvez remplacer par compte avec `channels.zalouser.historyLimit`.

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

## En cours d'écriture, réactions et accusés de réception

- OpenClaw envoie un événement de frappe avant d'envoyer une réponse (au mieux effort).
- L'action de réaction au message `react` est prise en charge pour `zalouser` dans les actions de channel.
  - Utilisez `remove: true` pour supprimer un emoji de réaction spécifique d'un message.
  - Sémantique des réactions : [Réactions](/fr/tools/reactions)
- Pour les messages entrants incluant des métadonnées d'événement, OpenClaw envoie des accusés de réception et de lecture (au mieux effort).

## Dépannage

**La connexion ne persiste pas :**

- `openclaw channels status --probe`
- Reconnexion : `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**La liste d'autorisation/le nom du groupe n'a pas pu être résolu :**

- Utilisez des ID numériques dans `allowFrom`/`groupAllowFrom`/`groups`, ou les noms exacts des amis/groupes.

**Mise à niveau depuis l'ancienne configuration basée sur CLI :**

- Supprimez toutes les anciennes hypothèses de processus externe `zca`.
- Le channel fonctionne désormais entièrement dans OpenClaw sans binaires CLI externes.

import fr from "/components/footer/fr.mdx";

<fr />
