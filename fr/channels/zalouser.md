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

## Plugin requis

Zalo Personnel est fourni sous forme de plugin et n'est pas inclus avec l'installation principale.

- Installer via le CLI : `openclaw plugins install @openclaw/zalouser`
- Ou depuis une extraction des sources : `openclaw plugins install ./extensions/zalouser`
- Détails : [Plugins](/fr/tools/plugin)

Aucun binaire externe `zca`/`openzca` CLI n'est requis.

## Configuration rapide (débutant)

1. Installez le plugin (voir ci-dessus).
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

4. Redémarrez le Gateway (ou terminez la configuration).
5. L'accès DM est par défaut en mode jumelage ; approuvez le code de jumelage lors du premier contact.

## Ce que c'est

- Fonctionne entièrement en processus via `zca-js`.
- Utilise des écouteurs d'événements natifs pour recevoir les messages entrants.
- Envoie les réponses directement via l'API JS (texte/média/lien).
- Conçu pour les cas d'usage de « compte personnel » où l'API Bot Zalo n'est pas disponible.

## Appellation

L'identifiant du canal est `zalouser` pour préciser explicitement qu'il automatise un **compte utilisateur personnel Zalo** (non officiel). Nous conservons `zalo` réservé pour une future intégration officielle potentielle de l'API Zalo.

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

`channels.zalouser.allowFrom` accepte les identifiants ou les noms d'utilisateur. Lors de la configuration, les noms sont résolus en identifiants à l'aide de la recherche de contacts intégrée du plugin.

Approuver via :

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Accès aux groupes (optionnel)

- Par défaut : `channels.zalouser.groupPolicy = "open"` (groupes autorisés). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- Limiter à une liste d'autorisation (allowlist) avec :
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (les clés doivent être des identifiants de groupe stables ; les noms sont résolus en identifiants au démarrage si possible)
  - `channels.zalouser.groupAllowFrom` (contrôle quels expéditeurs dans les groupes autorisés peuvent déclencher le bot)
- Bloquer tous les groupes : `channels.zalouser.groupPolicy = "disabled"`.
- L'assistant de configuration peut demander les listes d'autorisation de groupes.
- Au démarrage, OpenClaw résout les noms de groupe/utilisateur dans les listes d'autorisation en identifiants et enregistre le mappage.
- La correspondance de la liste d'autorisation de groupe se fait uniquement par identifiant par défaut. Les noms non résolus sont ignorés pour l'authentification sauf si `channels.zalouser.dangerouslyAllowNameMatching: true` est activé.
- `channels.zalouser.dangerouslyAllowNameMatching: true` est un mode de compatité de secours (break-glass) qui réactive la correspondance par nom de groupe mutable.
- Si `groupAllowFrom` n'est pas défini, le système revient à `allowFrom` pour les vérifications des expéditeurs de groupe.
- Les vérifications d'expéditeur s'appliquent aux messages de groupe normaux ainsi qu'aux commandes de contrôle (par exemple `/new`, `/reset`).

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
- Ordre de résolution : identifiant/nom exact du groupe -> slug de groupe normalisé -> `*` -> par défaut (`true`).
- Cela s'applique à la fois aux groupes autorisés et au mode de groupe ouvert.
- Les commandes de contrôle autorisées (par exemple `/new`) peuvent contourner le filtrage par mention.
- Lorsqu'un message de groupe est ignoré car une mention est requise, OpenClaw le stocke dans l'historique de groupe en attente et l'inclut dans le prochain message de groupe traité.
- La limite d'historique de groupe est par défaut de `messages.groupChat.historyLimit` (de repli `50`). Vous pouvez la modifier par compte avec `channels.zalouser.historyLimit`.

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

- OpenClaw envoie un événement de frappe avant d'envoyer une réponse (au mieux effort).
- L'action de réaction au message `react` est prise en charge pour `zalouser` dans les actions de channel.
  - Utilisez `remove: true` pour supprimer un emoji de réaction spécifique d'un message.
  - Sémantique des réactions : [Réactions](/fr/tools/reactions)
- Pour les messages entrants incluant des métadonnées d'événement, OpenClaw envoie des accusés de réception de livraison + vus (au mieux effort).

## Dépannage

**La connexion ne persiste pas :**

- `openclaw channels status --probe`
- Reconnexion : `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**Allowlist/nom de groupe non résolu :**

- Utilisez les identifiants numériques dans `allowFrom`/`groupAllowFrom`/`groups`, ou les noms exacts d'amis/groupes.

**Mise à jour effectuée depuis l'ancienne configuration basée sur la CLI :**

- Supprimez toutes les anciennes hypothèses de processus externe `zca`.
- Le channel fonctionne désormais entièrement dans OpenClaw sans binaires CLI externes.

import fr from "/components/footer/fr.mdx";

<fr />
