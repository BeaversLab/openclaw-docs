---
summary: "Dépannage rapide au niveau du canal avec des signatures d'échec et des correctifs par canal"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Dépannage de canal"
---

Utilisez cette page lorsqu'un channel se connecte mais que le comportement est incorrect.

## Échelle de commandes

Exécutez d'abord ceux-ci dans l'ordre :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Ligne de base saine :

- `Runtime: running`
- `Connectivity probe: ok`
- `Capability: read-only`, `write-capable`, ou `admin-capable`
- La sonde de canal indique que le transport est connecté et, si pris en charge, `works` ou `audit ok`

## Après une mise à jour

Utilisez ceci lorsque Telegram, iMessage, les configs de l'ère BlueBubbles, ou un autre canal de plugin
disparaît après la mise à jour.

```bash
openclaw status --all
openclaw doctor --fix
openclaw gateway restart
openclaw status --all
```

Recherchez `plugin load failed: dependency tree corrupted; run openclaw doctor
--fix` in `openclaw status --all`. Cela signifie que le canal est configuré, mais
que le chemin de configuration/chargement du plugin a rencontré un arbre de dépendances corrompu au lieu d'enregistrer
le canal. `openclaw doctor --fix` supprime les répertoires de mise en scène des dépendances de plugin obsolètes
et les ombres d'auth obsolètes, puis `openclaw gateway restart` recharge l'état
propre.

## WhatsApp

### Signatures d'échec WhatsApp

| Symptôme                                                     | Vérification la plus rapide                                       | Correctif                                                                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Connecté mais pas de réponses DM                             | `openclaw pairing list whatsapp`                                  | Approuvez l'expéditeur ou modifiez la stratégie/liste blanche des DM.                                                                                                                |
| Messages de groupe ignorés                                   | Vérifiez `requireMention` + les modèles de mention dans la config | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe.                                                                                                            |
| La connexion QR expire avec 408                              | Vérifiez la passerelle `HTTPS_PROXY` / `HTTP_PROXY` env           | Définissez un proxy accessible ; utilisez `NO_PROXY` uniquement pour les contournements.                                                                                             |
| Boucles de déconnexion/reconnexion aléatoires                | `openclaw channels status --probe` + journaux                     | Les reconnexions récentes sont signalées même lorsqu'elles sont actuellement connectées ; surveillez les journaux, redémarrez la passerelle, puis reliez si le vacillement continue. |
| Les réponses arrivent en retard de quelques secondes/minutes | `openclaw doctor --fix`                                           | Doctor arrête les clients TUI locaux obsolètes vérifiés lorsqu'ils dégradent la boucle d'événements du Gateway.                                                                      |

Dépannage complet : [Dépannage WhatsApp](WhatsApp/en/channels/whatsapp#troubleshooting)

## Telegram

### Signatures d'échec Telegram

| Symptôme                                            | Vérification la plus rapide                                           | Correction                                                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable      | `openclaw pairing list telegram`                                      | Approuver l'appariement ou modifier la stratégie de DM.                                                                                                                    |
| Bot en ligne mais le groupe reste silencieux        | Vérifier la condition de mention et le mode de confidentialité du bot | Désactiver le mode de confidentialité pour la visibilité du groupe ou mentionner le bot.                                                                                   |
| Échecs d'envoi avec erreurs réseau                  | Inspecter les journaux pour les échecs d'appel à l'Telegram API       | Corriger le routage DNS/IPv6/proxy vers `api.telegram.org`.                                                                                                                |
| Le démarrage signale `getMe returned 401`           | Vérifier la source du jeton configurée                                | Recopier ou régénérer le jeton BotFather et mettre à jour `botToken`, `tokenFile`, ou default-account `TELEGRAM_BOT_TOKEN`.                                                |
| Le sondage bloque ou se reconnecte lentement        | `openclaw logs --follow` pour les diagnostics de sondage              | Mettre à niveau ; si les redémarrages sont de faux positifs, ajustez `pollingStallThresholdMs`. Les blocages persistants indiquent toujours un problème de proxy/DNS/IPv6. |
| `setMyCommands` rejeté au démarrage                 | Inspecter les journaux pour `BOT_COMMANDS_TOO_MUCH`                   | Réduire les commandes de plug-in/compétence/personnalisées Telegram ou désactiver les menus natifs.                                                                        |
| Mis à niveau et la liste d'autorisation vous bloque | `openclaw security audit` et listes d'autorisation de configuration   | Exécuter `openclaw doctor --fix` ou remplacer `@username` par des ID d'expéditeur numériques.                                                                              |

Dépannage complet : [Dépannage Telegram](Telegram/en/channels/telegram#troubleshooting)

## Discord

### Signatures d'échec Discord

| Symptôme                                                  | Vérification la plus rapide                                                                                                           | Correctif                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot en ligne mais aucune réponse de guilde                | `openclaw channels status --probe`                                                                                                    | Autoriser la guilde/le channel et vérifier l'intention de contenu du message.                                                                                                                                                                                                                                                     |
| Messages de groupe ignorés                                | Vérifier les journaux pour les abandons dus au filtrage par mention                                                                   | Mentionner le bot ou définir `requireMention: false` de guilde/channel.                                                                                                                                                                                                                                                           |
| Utilisation de la frappe/jeton mais aucun message Discord | Vérifiez s'il s'agit d'un événement de salle ambiant ou d'une salle `message_tool` optée où le modèle a manqué `message(action=send)` | Inspectez le journal détaillé de la passerelle pour les métadonnées de charge utile finale supprimées, vérifiez `messages.groupChat.unmentionedInbound`, lisez [Événements de salle ambiants](/fr/channels/ambient-room-events), ou gardez `messages.groupChat.visibleReplies: "automatic"` pour les demandes de groupe normales. |
| Réponses DM manquantes                                    | `openclaw pairing list discord`                                                                                                       | Approuvez l'appariement DM ou ajustez la stratégie DM.                                                                                                                                                                                                                                                                            |

Dépannage complet : [Dépannage Discord](Discord/en/channels/discord#troubleshooting)

## Slack

### Signatures d'échec Slack

| Symptôme                                 | Vérification la plus rapide                                    | Correctif                                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode socket connecté mais aucune réponse | `openclaw channels status --probe`                             | Vérifiez le jeton d'application + le jeton de bot et les étendues requises ; surveillez les `botTokenStatus` / `appTokenStatus = configured_unavailable` sur les configurations basées sur SecretRef. |
| DMs bloqués                              | `openclaw pairing list slack`                                  | Approuvez l'appariement ou assouplissez la stratégie DM.                                                                                                                                              |
| Message de channel ignoré                | Vérifiez `groupPolicy` et la liste d'autorisation des channels | Autorisez le channel ou basculez la stratégie sur `open`.                                                                                                                                             |

Dépannage complet : [Dépannage Slack](Slack/en/channels/slack#troubleshooting)

## iMessage

### Signatures d'échec iMessage

| Symptôme                                     | Vérification la plus rapide                                                           | Correctif                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `imsg`macOS manquant ou échoue sur non-macOS | `openclaw channels status --probe --channel imessage`                                 | Exécutez OpenClaw sur le Mac Messages ou utilisez un wrapper SSH pour OpenClaw`cliPath`. |
| Peut envoyer mais ne reçoit pas sur macOS    | Vérifiez les autorisations de confidentialité macOS pour l'automatisation de Messages | Accordez à nouveau les autorisations TCC et redémarrez le processus du channel.          |
| Expéditeur DM bloqué                         | `openclaw pairing list imessage`                                                      | Approuvez l'appariement ou mettez à jour la liste d'autorisation.                        |

Dépannage complet :

- [Dépannage iMessage](iMessage/en/channels/imessage#troubleshooting)

## Signal

### Signatures d'échec Signal

| Symptôme                                     | Vérification la plus rapide                                            | Correctif                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Daemon accessible mais bot silencieux        | `openclaw channels status --probe`                                     | Vérifiez l'URL/le compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                                    | `openclaw pairing list signal`                                         | Approuver l'expéditeur ou ajuster la politique de DM.                   |
| Les réponses de groupe ne se déclenchent pas | Vérifier la liste d'autorisation des groupes et les modèles de mention | Ajouter l'expéditeur/groupe ou assouplir le filtrage.                   |

Dépannage complet : [Dépannage Signal](Signal/en/channels/signal#troubleshooting)

## QQ Bot

### Signatures d'échec du QQ Bot

| Symptôme                       | Vérification la plus rapide                              | Correction                                                                |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Le bot répond "parti sur Mars" | Vérifiez `appId` et `clientSecret` dans la configuration | Définir les identifiants ou redémarrer la passerelle.                     |
| Aucun message entrant          | `openclaw channels status --probe`                       | Vérifier les identifiants sur la plateforme ouverte QQ.                   |
| Voix non transcrite            | Vérifier la configuration du provider STT                | Configurez `channels.qqbot.stt` ou `tools.media.audio`.                   |
| Messages proactifs non reçus   | Vérifier les exigences d'interaction de la plateforme QQ | QQ peut bloquer les messages initiés par le bot sans interaction récente. |

Dépannage complet : [Dépannage du Bot QQ](/fr/channels/qqbot#troubleshooting)

## Matrix

### Signatures d'échec Matrix

| Symptôme                                              | Vérification la plus rapide            | Correction                                                                                                  |
| ----------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Connecté mais ignore les messages des salles          | `openclaw channels status --probe`     | Vérifiez `groupPolicy`, la liste d'autorisation des salles et le filtrage des mentions.                     |
| Les DMs ne sont pas traités                           | `openclaw pairing list matrix`         | Approuver l'expéditeur ou ajuster la politique de DM.                                                       |
| Les salles chiffrées échouent                         | `openclaw matrix verify status`        | Vérifiez à nouveau l'appareil, puis vérifiez `openclaw matrix verify backup status`.                        |
| La restauration de la sauvegarde est en cours/échouée | `openclaw matrix verify backup status` | Exécutez `openclaw matrix verify backup restore` ou réexécutez avec une clé de récupération.                |
| Le croisement de signatures/amorçage semble incorrect | `openclaw matrix verify bootstrap`     | Réparer le stockage des secrets, le croisement de signatures et l'état de la sauvegarde en une seule passe. |

Configuration complète et paramétrage : [Matrix](/fr/channels/matrix)

## Connexes

- [Appairage](/fr/channels/pairing)
- [Routage des canaux](/fr/channels/channel-routing)
- [Dépannage de la Gateway](/fr/gateway/troubleshooting)
