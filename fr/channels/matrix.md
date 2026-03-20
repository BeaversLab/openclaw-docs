---
summary: "État du support Matrix, capacités et configuration"
read_when:
  - Travailler sur les fonctionnalités du canal Matrix
title: "Matrix"
---

# Matrix (plugin)

Matrix est un protocole de messagerie ouvert et décentralisé. OpenClaw se connecte en tant qu'**utilisateur** Matrix
sur n'importe quel serveur d'accueil, vous avez donc besoin d'un compte Matrix pour le bot. Une fois connecté, vous pouvez envoyer un DM
au bot directement ou l'inviter dans des salons (Matrix "groupes"). Beeper est également une option client valide,
mais elle nécessite l'activation de l'E2EE.

Statut : pris en charge via le plugin (@vector-im/matrix-bot-sdk). Messages directs, salons, fils de discussion, médias, réactions,
sondages (envoi + poll-start en tant que texte), position et E2EE (avec prise en charge du chiffrement).

## Plugin requis

Matrix est fourni en tant que plugin et n'est pas inclus avec l'installation de base.

Installer via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/matrix
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./extensions/matrix
```

Si vous choisissez Matrix lors de la configuration et qu'une extraction git est détectée,
OpenClaw proposera automatiquement le chemin d'installation local.

Détails : [Plugins](/fr/tools/plugin)

## Configuration

1. Installer le plugin Matrix :
   - Depuis npm : `openclaw plugins install @openclaw/matrix`
   - Depuis une extraction locale : `openclaw plugins install ./extensions/matrix`
2. Créer un compte Matrix sur un serveur d'accueil :
   - Parcourir les options d'hébergement sur [https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/)
   - Ou hébergez-le vous-même.
3. Obtenir un jeton d'accès pour le compte du bot :
   - Utilisez l'Matrix de connexion API avec `curl` sur votre serveur d'accueil :

   ```bash
   curl --request POST \
     --url https://matrix.example.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "your-user-name"
     },
     "password": "your-password"
   }'
   ```

   - Remplacez `matrix.example.org` par l'URL de votre serveur d'accueil.
   - Ou définissez `channels.matrix.userId` + `channels.matrix.password` : OpenClaw appelle le même
     point de terminaison de connexion, stocke le jeton d'accès dans `~/.openclaw/credentials/matrix/credentials.json`,
     et le réutilise au prochain démarrage.

4. Configurer les identifiants :
   - Env : `MATRIX_HOMESERVER`, `MATRIX_ACCESS_TOKEN` (ou `MATRIX_USER_ID` + `MATRIX_PASSWORD`)
   - Ou config : `channels.matrix.*`
   - Si les deux sont définis, la configuration prend le pas.
   - Avec le jeton d'accès : l'ID utilisateur est récupéré automatiquement via `/whoami`.
   - Lorsqu'il est défini, `channels.matrix.userId` doit être l'ID complet Matrix (exemple : `@bot:example.org`).
5. Redémarrez la passerelle (ou terminez la configuration).
6. Démarrez un DM avec le bot ou invitez-le dans un salon depuis n'importe quel client Matrix
   (Element, Beeper, etc. ; voir [https://matrix.org/ecosystem/clients/](https://matrix.org/ecosystem/clients/)). Beeper nécessite l'E2EE,
   définissez donc `channels.matrix.encryption: true` et vérifiez l'appareil.

Configuration minimale (jeton d'accès, ID utilisateur récupéré automatiquement) :

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" },
    },
  },
}
```

Configuration E2EE (chiffrement de bout en bout activé) :

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

## Chiffrement (E2EE)

Le chiffrement de bout en bout est **pris en charge** via le SDK crypto Rust.

Activer avec `channels.matrix.encryption: true` :

- Si le module de chiffrement se charge, les salles chiffrées sont déchiffrées automatiquement.
- Les médias sortants sont chiffrés lors de l'envoi vers des salles chiffrées.
- Lors de la première connexion, OpenClaw demande une vérification de l'appareil depuis vos autres sessions.
- Vérifiez l'appareil dans un autre client Matrix (Element, etc.) pour activer le partage de clés.
- Si le module de chiffrement ne peut pas être chargé, l'E2EE est désactivé et les salons chiffrés ne seront pas déchiffrés ;
  OpenClaw enregistre un avertissement.
- Si vous voyez des erreurs de module crypto manquant (par exemple, `@matrix-org/matrix-sdk-crypto-nodejs-*`),
  autorisez les scripts de build pour `@matrix-org/matrix-sdk-crypto-nodejs` et exécutez
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` ou récupérez le binaire avec
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js`.

L'état du chiffrement est stocké par compte + jeton d'accès dans
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`
(base de données SQLite). L'état de synchronisation réside à côté dans `bot-storage.json`.
Si le jeton d'accès (appareil) change, un nouveau magasin est créé et le bot doit être
vérifié à nouveau pour les salons chiffrés.

**Vérification de l'appareil :**
Lorsque le chiffrement de bout en bout (E2EE) est activé, le bot demandera une vérification à vos autres sessions au démarrage.
Ouvrez Element (ou un autre client) et approuvez la demande de vérification pour établir la confiance.
Une fois vérifié, le bot peut déchiffrer les messages dans les salons chiffrés.

## Multi-compte

Prise en charge multi-compte : utilisez `channels.matrix.accounts` avec des identifiants par compte et `name` en option. Voir [`gateway/configuration`](/fr/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) pour le modèle partagé.

Chaque compte fonctionne en tant qu'utilisateur Matrix distinct sur n'importe quel serveur d'accueil. La configuration par compte
hérite des paramètres `channels.matrix` de premier niveau et peut remplacer n'importe quelle option
politique de DM, groupes, chiffrement, etc.).

```json5
{
  channels: {
    matrix: {
      enabled: true,
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          name: "Main assistant",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_***",
          encryption: true,
        },
        alerts: {
          name: "Alerts bot",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_***",
          dm: { policy: "allowlist", allowFrom: ["@admin:example.org"] },
        },
      },
    },
  },
}
```

Notes :

- Le démarrage du compte est sérialisé pour éviter les conditions de course avec les importations de modules simultanées.
- Les variables d'environnement (`MATRIX_HOMESERVER`, `MATRIX_ACCESS_TOKEN`, etc.) ne s'appliquent qu'au compte **par défaut**.
- Les paramètres de base du canal (stratégie de DM, stratégie de groupe, filtrage des mentions, etc.) s'appliquent à tous les comptes, sauf s'ils sont remplacés pour chaque compte.
- Utilisez `bindings[].match.accountId` pour router chaque compte vers un agent différent.
- L'état de chiffrement est stocké par compte + jeton d'accès (magasins de clés distincts par compte).

## Modèle de routage

- Les réponses vont toujours vers Matrix.
- Les DMs partagent la session principale de l'agent ; les salles sont mappées à des sessions de groupe.

## Contrôle d'accès (DMs)

- Par défaut : `channels.matrix.dm.policy = "pairing"`. Les expéditeurs inconnus reçoivent un code d'appariement.
- Approuver via :
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- DMs publics : `channels.matrix.dm.policy="open"` plus `channels.matrix.dm.allowFrom=["*"]`.
- `channels.matrix.dm.allowFrom` accepte les identifiants utilisateur complets Matrix (exemple : `@user:server`). L'assistant résout les noms d'affichage en identifiants utilisateur lorsque la recherche dans l'annuaire trouve une seule correspondance exacte.
- N'utilisez pas de noms d'affichage ou de parties locales simples (exemple : `"Alice"` ou `"alice"`). Ils sont ambigus et sont ignorés pour la correspondance de la liste d'autorisation. Utilisez des identifiants `@user:server` complets.

## Salles (groupes)

- Par défaut : `channels.matrix.groupPolicy = "allowlist"` (limité par mention). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- Remarque d'exécution : si `channels.matrix` est totalement absent, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de salon (même si `channels.defaults.groupPolicy` est défini).
- Liste blanche des salons avec `channels.matrix.groups` (ID ou alias de salon ; les noms sont résolus en ID lorsque la recherche de répertoire trouve une seule correspondance exacte) :

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
      groupAllowFrom: ["@owner:example.org"],
    },
  },
}
```

- `requireMention: false` active la réponse automatique dans ce salon.
- `groups."*"` peut définir les valeurs par défaut pour le filtrage par mention entre les salons.
- `groupAllowFrom` restreint les expéditeurs pouvant déclencher le bot dans les salons (ID d'utilisateur Matrix complets).
- Les listes blanches `users` par salon peuvent restreindre davantage les expéditeurs dans un salon spécifique (utilisez les ID d'utilisateur Matrix complets).
- L'assistant de configuration demande les listes blanches de salons (identifiants, alias ou noms de salon) et ne résout les noms que sur une correspondance exacte et unique.
- Au démarrage, OpenClaw résout les noms de salon/utilisateur dans les listes blanches en identifiants et consigne le mappage ; les entrées non résolues sont ignorées pour la correspondance de liste blanche.
- Les invitations sont acceptées automatiquement par défaut ; contrôlez avec `channels.matrix.autoJoin` et `channels.matrix.autoJoinAllowlist`.
- Pour n'**autoriser aucun salon**, définissez `channels.matrix.groupPolicy: "disabled"` (ou gardez une liste blanche vide).
- Clé héritée : `channels.matrix.rooms` (même forme que `groups`).

## Fils de discussion

- Les fils de discussion en réponse sont pris en charge.
- `channels.matrix.threadReplies` contrôle si les réponses restent dans les fils :
  - `off`, `inbound` (par défaut), `always`
- `channels.matrix.replyToMode` contrôle les métadonnées de réponse lors d'une réponse hors fil :
  - `off` (par défaut), `first`, `all`

## Capacités

| Fonctionnalité     | Statut                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Messages directs   | ✅ Pris en charge                                                                                          |
| Salons             | ✅ Pris en charge                                                                                          |
| Fils de discussion | ✅ Pris en charge                                                                                          |
| Médias             | ✅ Pris en charge                                                                                          |
| E2EE               | ✅ Pris en charge (module crypto requis)                                                                   |
| Réactions          | ✅ Pris en charge (envoi/lecture via outils)                                                               |
| Sondages           | ✅ Envoi pris en charge ; les débuts de sondages entrants sont convertis en texte (réponses/fins ignorées) |
| Emplacement        | ✅ Pris en charge (URI géo ; altitude ignorée)                                                             |
| Commandes natives  | ✅ Pris en charge                                                                                          |

## Dépannage

Exécutez d'abord cette échelle :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Confirmez ensuite l'état du jumelage DM si nécessaire :

```bash
openclaw pairing list matrix
```

Pannes courantes :

- Connecté mais messages de salon ignorés : salon bloqué par `groupPolicy` ou liste blanche de salons.
- DMs ignorés : expéditeur en attente d'approbation lorsque `channels.matrix.dm.policy="pairing"`.
- Échec des salles chiffrées : prise en charge du chiffrement ou inadéquation des paramètres de chiffrement.

Pour le flux de triage : [/channels/troubleshooting](/fr/channels/troubleshooting).

## Référence de configuration (Matrix)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.matrix.enabled` : activer/désactiver le démarrage du channel.
- `channels.matrix.homeserver` : URL du serveur domestique.
- `channels.matrix.userId` : ID d'utilisateur Matrix (optionnel avec le jeton d'accès).
- `channels.matrix.accessToken` : jeton d'accès.
- `channels.matrix.password` : mot de passe pour la connexion (jeton stocké).
- `channels.matrix.deviceName` : nom d'affichage de l'appareil.
- `channels.matrix.encryption` : activer l'E2EE (par défaut : false).
- `channels.matrix.initialSyncLimit` : limite de synchronisation initiale.
- `channels.matrix.threadReplies` : `off | inbound | always` (par défaut : entrant).
- `channels.matrix.textChunkLimit` : taille du bloc de texte sortant (caractères).
- `channels.matrix.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.matrix.dm.policy` : `pairing | allowlist | open | disabled` (par défaut : couplage).
- `channels.matrix.dm.allowFrom` : liste d'autorisation de DMs (identifiants utilisateur Matrix complets). `open` nécessite `"*"`. L'assistant résout les noms en identifiants lorsque cela est possible.
- `channels.matrix.groupPolicy` : `allowlist | open | disabled` (par défaut : allowlist).
- `channels.matrix.groupAllowFrom` : expéditeurs autorisés pour les messages de groupe (identifiants utilisateur Matrix complets).
- `channels.matrix.allowlistOnly` : forcer les règles de liste d'autorisation pour les DMs + salons.
- `channels.matrix.groups` : liste d'autorisation de groupe + carte des paramètres par salon.
- `channels.matrix.rooms` : ancienne liste d'autorisation/configuration de groupe.
- `channels.matrix.replyToMode` : mode de réponse pour les fils/tags.
- `channels.matrix.mediaMaxMb` : limite de média entrant/sortant (Mo).
- `channels.matrix.autoJoin` : gestion des invitations (`always | allowlist | off`, par défaut : toujours).
- `channels.matrix.autoJoinAllowlist` : identifiants/alias de salon autorisés pour l'auto-join.
- `channels.matrix.accounts` : configuration multi-compte indexée par l'identifiant de compte (chaque compte hérite des paramètres de premier niveau).
- `channels.matrix.actions` : vérification des outils par action (réactions/messages/épingles/memberInfo/channelInfo).

import fr from "/components/footer/fr.mdx";

<fr />
