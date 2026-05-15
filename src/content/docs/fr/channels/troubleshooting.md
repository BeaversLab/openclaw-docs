---
summary: "Dépannage rapide au niveau du canal avec des signatures d'échec et des correctifs par canal"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Channel troubleshooting"
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
- La sonde du channel indique que le transport est connecté et, si pris en charge, `works` ou `audit ok`

## WhatsApp

### Signatures d'échec WhatsApp

| Symptôme                                                  | Vérification la plus rapide                                              | Correctif                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connecté mais pas de réponses en DM                       | `openclaw pairing list whatsapp`                                         | Approuvez l'expéditeur ou modifiez la stratégie/la liste d'autorisation DM.                                                                                                         |
| Messages de groupe ignorés                                | Vérifiez `requireMention` + les modèles de mention dans la configuration | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe.                                                                                                           |
| La connexion par QR expire avec 408                       | Vérifiez la passerelle `HTTPS_PROXY` / l'environnement `HTTP_PROXY`      | Définissez un proxy accessible ; n'utilisez `NO_PROXY` que pour les contournements.                                                                                                 |
| Boucles de déconnexion/reconnexion aléatoires             | `openclaw channels status --probe` + journaux                            | Les reconnexions récentes sont signalées même lorsqu'elles sont actuellement connectées ; surveillez les journaux, redémarrez la passerelle, puis reliez si le flottement continue. |
| Les réponses arrivent quelques secondes/minutes en retard | `openclaw doctor --fix`                                                  | Doctor arrête les clients TUI locaux périmés vérifiés lorsqu'ils dégradent la boucle d'événements du Gateway.                                                                       |

Dépannage complet : [Dépannage WhatsApp](WhatsApp/en/channels/whatsapp#troubleshooting)

## Telegram

### Telegram failure signatures

| Symptôme                                            | Vérification la plus rapide                                             | Correctif                                                                                                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable      | `openclaw pairing list telegram`                                        | Approuver l'appairage ou modifier la stratégie de DM.                                                                                                                  |
| Bot en ligne mais le groupe reste silencieux        | Vérifier la exigence de mention et le mode de confidentialité du bot    | Désactiver le mode de confidentialité pour la visibilité du groupe ou mentionner le bot.                                                                               |
| Échecs d'envoi avec erreurs réseau                  | Inspecter les journaux pour les échecs des appels API TelegramAPI       | Corriger le routage DNS/IPv6/proxy vers `api.telegram.org`.                                                                                                            |
| Le démarrage signale `getMe returned 401`           | Vérifier la source du jeton configurée                                  | Recopier ou régénérer le jeton BotFather et mettre à jour `botToken`, `tokenFile`, ou default-account `TELEGRAM_BOT_TOKEN`.                                            |
| Le sondage stagne ou se reconnecte lentement        | `openclaw logs --follow` pour le diagnostic du sondage                  | Mettre à niveau ; si les redémarrages sont de faux positifs, ajustez `pollingStallThresholdMs`. Les stagnations persistantes pointent toujours vers un proxy/DNS/IPv6. |
| `setMyCommands` rejeté au démarrage                 | Inspecter les journaux pour `BOT_COMMANDS_TOO_MUCH`                     | Réduire les commandes plugin/skill/personnalisées Telegram ou désactiver les menus natifs.                                                                             |
| Mis à niveau et la liste d'autorisation vous bloque | `openclaw security audit` et les listes d'autorisation de configuration | Exécuter `openclaw doctor --fix` ou remplacer `@username` par des ID d'expéditeurs numériques.                                                                         |

Dépannage complet : [Dépannage Telegram](Telegram/en/channels/telegram#troubleshooting)

## Discord

### Discord failure signatures

| Symptôme                                                   | Vérification la plus rapide                                                                | Correctif                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot en ligne mais aucune réponse de guilde                 | `openclaw channels status --probe`                                                         | Autoriser la guilde/le canal et vérifier l'intention de contenu du message.                                                                                                                                         |
| Messages de groupe ignorés                                 | Vérifiez les journaux pour les abandons dus au filtrage des mentions                       | Mentionnez le bot ou définissez `requireMention: false` de guilde/channel.                                                                                                                                          |
| Utilisation de la frappe/jetons mais aucun message Discord | Le journal de session montre le texte de l'assistant avec `didSendViaMessagingTool: false` | Le modèle a répondu en privé au lieu d'appeler l'outil de message. Utilisez un modèle fiable pour les appels d'outils, ou définissez `messages.groupChat.visibleReplies: "automatic"` pour publier automatiquement. |
| Réponses DM manquantes                                     | `openclaw pairing list discord`                                                            | Approuvez l'appairage DM ou ajustez la politique DM.                                                                                                                                                                |

Dépannage complet : [Dépannage Discord](/fr/channels/discord#troubleshooting)

## Slack

### Signatures d'échec Slack

| Symptôme                                 | Vérification la plus rapide                                    | Correctif                                                                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode socket connecté mais aucune réponse | `openclaw channels status --probe`                             | Vérifiez le jeton d'application + le jeton bot et les étendues requises ; surveillez `botTokenStatus` / `appTokenStatus = configured_unavailable` sur les configurations basées sur SecretRef. |
| DMs bloqués                              | `openclaw pairing list slack`                                  | Approuvez l'appairage ou assouplissez la politique DM.                                                                                                                                         |
| Message de channel ignoré                | Vérifiez `groupPolicy` et la liste d'autorisation des channels | Autorisez le channel ou passez la politique à `open`.                                                                                                                                          |

Dépannage complet : [Dépannage Slack](/fr/channels/slack#troubleshooting)

## iMessage

### Signatures d'échec iMessage

| Symptôme                                  | Vérification la plus rapide                                                           | Correctif                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `imsg` manquant ou échoue sur non-macOS   | `openclaw channels status --probe --channel imessage`                                 | Exécutez OpenClaw sur le Mac Messages ou utilisez un wrapper SSH pour `cliPath`. |
| Peut envoyer mais ne reçoit pas sur macOS | Vérifiez les autorisations de confidentialité macOS pour l'automatisation de Messages | Accordez à nouveau les autorisations TCC et redémarrez le processus du channel.  |
| Expéditeur DM bloqué                      | `openclaw pairing list imessage`                                                      | Approuvez l'appairage ou mettez à jour la liste d'autorisation.                  |

Dépannage complet :

- [Dépannage iMessage](/fr/channels/imessage#troubleshooting)

## Signal

### Signatures d'échec Signal

| Symptôme                                  | Vérification la plus rapide                                            | Correctif                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Démon accessible mais bot silencieux      | `openclaw channels status --probe`                                     | Vérifiez l'URL/compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                                 | `openclaw pairing list signal`                                         | Approuvez l'expéditeur ou ajustez la stratégie de DM.                |
| Les réponses de groupe ne déclenchent pas | Vérifiez la liste d'autorisation des groupes et les modèles de mention | Ajoutez l'expéditeur/le groupe ou assouplissez le filtrage.          |

Dépannage complet : [Signal troubleshooting](/fr/channels/signal#troubleshooting)

## QQ Bot

### Signatures d'échec du QQ Bot

| Symptôme                              | Vérification la plus rapide                              | Correction                                                                |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Le bot répond "parti sur Mars"        | Vérifiez `appId` et `clientSecret` dans la configuration | Définissez les identifiants ou redémarrez la passerelle.                  |
| Aucun message entrant                 | `openclaw channels status --probe`                       | Vérifiez les identifiants sur la plateforme ouverte QQ.                   |
| La voix n'est pas transcrite          | Vérifiez la configuration du fournisseur STT             | Configurez `channels.qqbot.stt` ou `tools.media.audio`.                   |
| Les messages proactifs n'arrivent pas | Vérifiez les exigences d'interaction de la plateforme QQ | QQ peut bloquer les messages initiés par le bot sans interaction récente. |

Dépannage complet : [QQ Bot troubleshooting](/fr/channels/qqbot#troubleshooting)

## Matrix

### Signatures d'échec Matrix

| Symptôme                                              | Vérification la plus rapide            | Correction                                                                                           |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Connecté mais ignore les messages de salle            | `openclaw channels status --probe`     | Vérifiez `groupPolicy`, la liste d'autorisation des salles et le filtrage des mentions.              |
| Les DMs ne sont pas traités                           | `openclaw pairing list matrix`         | Approuvez l'expéditeur ou ajustez la stratégie de DM.                                                |
| Les salles chiffrées échouent                         | `openclaw matrix verify status`        | Vérifiez à nouveau l'appareil, puis vérifiez `openclaw matrix verify backup status`.                 |
| La restauration de la sauvegarde est en cours/échouée | `openclaw matrix verify backup status` | Exécutez `openclaw matrix verify backup restore` ou relancez avec une clé de récupération.           |
| La signature croisée/l'amorçage semble incorrect      | `openclaw matrix verify bootstrap`     | Réparez le stockage des secrets, la signature croisée et l'état de la sauvegarde en une seule passe. |

Configuration complète : [Matrix](/fr/channels/matrix)

## Connexes

- [Jumelage](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Gateway troubleshooting](/fr/gateway/troubleshooting)
