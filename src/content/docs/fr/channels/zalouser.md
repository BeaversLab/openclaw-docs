---
summary: "Prise en charge du compte personnel Zalo via zca-js natif (connexion QR), capacités et configuration"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo personnel"
---

Statut : expérimental. Cette intégration automatise un **compte personnel Zalo** via `zca-js` natif dans OpenClaw.

<Warning>Ceci est une intégration non officielle et peut entraîner une suspension ou un bannissement du compte. Utilisation à vos propres risques.</Warning>

## Plugin inclus

Zalo Personnel est fourni en tant que plugin inclus dans les versions actuelles d'OpenClaw, les builds empaquetés normaux n'ont donc pas besoin d'une installation séparée.

Si vous êtes sur une version antérieure ou une installation personnalisée qui exclut Zalo Personnel,
installez-le manuellement :

- Installer via CLI : `openclaw plugins install @openclaw/zalouser`
- Ou depuis une source checkout : `openclaw plugins install ./path/to/local/zalouser-plugin`
- Détails : [Plugins](/fr/tools/plugin)

Aucun binaire CLI externe `zca`/`openzca` n'est requis.

## Installation rapide (débutant)

1. Assurez-vous que le plugin Zalo Personnel est disponible.
   - Les versions empaquetées actuelles d'OpenClaw l'incluent déjà.
   - Les installations plus anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
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

4. Redémarrez la Gateway (ou terminez l'installation).
5. L'accès DM par défaut est l'appairage ; approuvez le code d'appairage au premier contact.

## Ce que c'est

- S'exécute entièrement en processus via `zca-js`.
- Utilise des écouteurs d'événements natifs pour recevoir les messages entrants.
- Envoie les réponses directement via l'API JS (texte/média/lien).
- Conçu pour les cas d'utilisation de « compte personnel » où l'API Bot Zalo n'est pas disponible.

## Dénomination

L'ID du channel est `zalouser` pour expliciter que ceci automatise un **compte utilisateur personnel Zalo** (non officiel). Nous gardons `zalo` réservé pour une future intégration officielle potentielle de l'API Zalo.

## Trouver les ID (répertoire)

Utilisez le CLI de répertoire pour découvrir les pairs/groupes et leurs IDs :

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## Limites

- Le texte sortant est découpé en blocs d'environ 2000 caractères (limites du client Zalo).
- Le streaming est bloqué par défaut.

## Contrôle d'accès (DMs)

`channels.zalouser.dmPolicy` supporte : `pairing | allowlist | open | disabled` (par défaut : `pairing`).

`channels.zalouser.allowFrom` accepte les ID ou noms d'utilisateur. Lors de la configuration, les noms sont résolus en ID à l'aide de la recherche de contacts intégrée du plugin.

Approuver via :

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Accès aux groupes (optionnel)

- Par défaut : `channels.zalouser.groupPolicy = "open"` (groupes autorisés). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- Restreindre à une liste d'autorisation avec :
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (les clés doivent être des ID de groupe stables ; les noms sont résolus en ID au démarrage si possible)
  - `channels.zalouser.groupAllowFrom` (contrôle quels expéditeurs dans les groupes autorisés peuvent déclencher le bot)
- Bloquer tous les groupes : `channels.zalouser.groupPolicy = "disabled"`.
- L'assistant de configuration peut demander des listes d'autorisation de groupes.
- Au démarrage, OpenClaw résout les noms de groupe/utilisateur dans les listes d'autorisation en ID et enregistre le mappage.
- La correspondance de la liste d'autorisation de groupe se fait uniquement par ID par défaut. Les noms non résolus sont ignorés pour l'authentification, sauf si `channels.zalouser.dangerouslyAllowNameMatching: true` est activé.
- `channels.zalouser.dangerouslyAllowNameMatching: true` est un mode de compatibilité de secours qui réactive la correspondance par nom de groupe modifiable.
- Si `groupAllowFrom` n'est pas défini, le système revient à `allowFrom` pour les vérifications des expéditeurs de groupe.
- Les vérifications de l'expéditeur s'appliquent aux messages de groupe normaux ainsi qu'aux commandes de contrôle (par exemple `/new`, `/reset`).

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

### Filtrage par mention de groupe

- `channels.zalouser.groups.<group>.requireMention` contrôle si les réponses de groupe nécessitent une mention.
- Ordre de résolution : id/nom de groupe exact -> slug de groupe normalisé -> `*` -> par défaut (`true`).
- Cela s'applique à la fois aux groupes autorisés et au mode de groupe ouvert.
- Citer un message du bot compte comme une mention implicite pour l'activation du groupe.
- Les commandes de contrôle autorisées (par exemple `/new`) peuvent contourner le filtrage par mention.
- Lorsqu'un message de groupe est ignoré car une mention est requise, OpenClaw le stocke comme historique de groupe en attente et l'inclut dans le prochain message de groupe traité.
- La limite d'historique de groupe est par défaut de `messages.groupChat.historyLimit` (secours `50`). Vous pouvez la remplacer par compte avec `channels.zalouser.historyLimit`.

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

Les comptes correspondent aux profils `zalouser` dans l'état OpenClaw. Exemple :

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

## État de frappe, réactions et accusés de réception

- OpenClaw envoie un événement de frappe avant d'envoyer une réponse (au mieux effort).
- L'action de réaction au message `react` est prise en charge pour `zalouser` dans les actions de channel.
  - Utilisez `remove: true` pour supprimer un emoji de réaction spécifique d'un message.
  - Sémantique des réactions : [Reactions](/fr/tools/reactions)
- Pour les messages entrants incluant des métadonnées d'événement, OpenClaw envoie des accusés de réception et de lecture (best-effort).

## Dépannage

**La connexion ne persiste pas :**

- `openclaw channels status --probe`
- Reconnexion : `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**La liste d'autorisation/le nom de groupe n'a pas pu être résolu :**

- Utilisez des ID numériques dans `allowFrom`/`groupAllowFrom`/`groups`, ou les noms exacts des amis/groupes.

**Mise à niveau depuis l'ancienne configuration basée sur le CLI :**

- Supprimez toutes les anciennes hypothèses concernant le processus externe `zca`.
- Le canal fonctionne désormais entièrement dans OpenClaw sans binaires CLI externes.

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification et flux d'appariement DM
- [Groupes](/fr/channels/groups) — comportement des discussions de groupe et filtrage des mentions
- [Routage des canaux](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et renforcement
