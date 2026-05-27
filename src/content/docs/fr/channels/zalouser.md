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
installez directement le package npm :

- Installer via CLI : `openclaw plugins install @openclaw/zalouser`
- Version épinglée : `openclaw plugins install @openclaw/zalouser@2026.5.2`
- Ou depuis une récupération des sources : `openclaw plugins install ./path/to/local/zalouser-plugin`
- Détails : [Plugins](/fr/tools/plugin)

Aucun binaire externe `zca`/`openzca`CLI CLI n'est requis.

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
- Conçu pour les cas d'usage de « compte personnel » où l'API Bot Zalo n'est pas disponible.

## Nomination

L'ID de canal est `zalouser`Zalo pour indiquer explicitement que cela automatise un **compte utilisateur personnel Zalo** (non officiel). Nous gardons `zalo`ZaloAPI réservé pour une future intégration officielle potentielle de l'API Zalo.

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

`channels.zalouser.allowFrom`Zalo doit utiliser des ID utilisateur stables Zalo. Il peut également référencer des groupes d'accès d'expéditeurs statiques (`accessGroup:<name>`). Lors de la configuration interactive, les noms saisis peuvent être résolus en ID en utilisant la recherche de contacts intégrée du plugin.

Si un nom brut reste dans la configuration, le démarrage le résout uniquement lorsque `channels.zalouser.dangerouslyAllowNameMatching: true` est activé. Sans cette option, les vérifications de l'expéditeur à l'exécution se basent uniquement sur l'ID et les noms bruts sont ignorés pour l'autorisation.

Approuver via :

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Accès aux groupes (facultatif)

- Par défaut : `channels.zalouser.groupPolicy = "open"` (groupes autorisés). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- Limiter à une liste d'autorisation avec :
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (les clés doivent être des ID de groupe stables ; les noms sont résolus en ID au démarrage uniquement lorsque `channels.zalouser.dangerouslyAllowNameMatching: true` est activé)
  - `channels.zalouser.groupAllowFrom` (contrôle quels expéditeurs dans les groupes autorisés peuvent déclencher le bot ; les groupes d'accès d'expéditeurs statiques peuvent être référencés avec `accessGroup:<name>`)
- Bloquer tous les groupes : `channels.zalouser.groupPolicy = "disabled"`.
- L'assistant de configuration peut demander des listes blanches de groupes.
- Au démarrage, OpenClaw résout les noms d'utilisateur/de groupes dans les listes blanches en identifiants et enregistre le mappage uniquement si `channels.zalouser.dangerouslyAllowNameMatching: true` est activé.
- La correspondance de la liste blanche de groupes se fait par identifiant par défaut. Les noms non résolus sont ignorés pour l'authentification, sauf si `channels.zalouser.dangerouslyAllowNameMatching: true` est activé.
- `channels.zalouser.dangerouslyAllowNameMatching: true` est un mode de compatibilité de secours qui réactive la résolution mutable des noms au démarrage et la correspondance des noms de groupe à l'exécution.
- Si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` pour les vérifications de l'expéditeur du groupe.
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
- Ordre de résolution : identifiant/nom exact du groupe -> slug de groupe normalisé -> `*` -> par défaut (`true`).
- Cela s'applique à la fois aux groupes sur liste blanche et au mode groupe ouvert.
- Citer un message du bot compte comme une mention implicite pour l'activation du groupe.
- Les commandes de contrôle autorisées (par exemple `/new`) peuvent contourner le filtrage par mention.
- Lorsqu'un message de groupe est ignoré car une mention est requise, OpenClaw le stocke comme historique de groupe en attente et l'inclut dans le prochain message de groupe traité.
- La limite d'historique des groupes est par défaut de `messages.groupChat.historyLimit` (de repli `50`). Vous pouvez la remplacer par compte avec `channels.zalouser.historyLimit`.

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

## Variables d'environnement

Le plugin personnel Zalo peut également lire la sélection du profil depuis les variables d'environnement :

- `ZALOUSER_PROFILE` : nom du profil à utiliser lorsqu'aucun `profile` n'est défini dans la configuration du canal ou du compte.
- `ZCA_PROFILE` : nom de profil de secours hérité, utilisé uniquement lorsque `ZALOUSER_PROFILE` n'est pas défini.

Les noms de profil sélectionnent les identifiants de connexion Zalo enregistrés dans l'état de OpenClaw. L'ordre de résolution est :

1. `profile` explicite dans la configuration.
2. `ZALOUSER_PROFILE`.
3. `ZCA_PROFILE`.
4. L'identifiant du compte pour les comptes non par défaut, ou `default` pour le compte par défaut.

Pour les configurations multi-comptes, privilégiez le réglage de `profile` sur chaque compte dans la configuration pour qu'une
variable d'environnement ne fasse pas partager la même session de
connexion par plusieurs comptes.

## Indicateur de frappe, réactions et accusés de réception

- OpenClaw envoie un événement de frappe avant d'envoyer une réponse (au mieux effort).
- L'action de réaction au message `react` est prise en charge pour `zalouser` dans les actions de canal.
  - Utilisez `remove: true` pour supprimer un emoji de réaction spécifique d'un message.
  - Sémantique des réactions : [Réactions](/fr/tools/reactions)
- Pour les messages entrants incluant des métadonnées d'événement, OpenClaw envoie des accusés de réception de livraison + lus (au mieux effort).

## Dépannage

**La connexion ne persiste pas :**

- `openclaw channels status --probe`
- Reconnexion : `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**La liste d'autorisation/nom de groupe n'a pas pu être résolu :**

- Utilisez des identifiants numériques dans `allowFrom`/`groupAllowFrom` et des identifiants de groupe stables dans `groups`. Si vous avez intentionnellement besoin des noms exacts d'amis/groupes, activez `channels.zalouser.dangerouslyAllowNameMatching: true`.

**Mise à niveau depuis l'ancienne configuration basée sur CLI :**

- Supprimez toutes les anciennes hypothèses de processus externe `zca`.
- Le canal s'exécute désormais entièrement dans OpenClaw sans binaires CLI externes.

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) — flux d'authentification et d'appairage par DM
- [Groupes](/fr/channels/groups) — comportement des discussions de groupe et filtrage par mention
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
