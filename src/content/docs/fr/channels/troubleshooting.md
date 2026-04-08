---
summary: "Dépannage rapide au niveau du canal avec des signatures d'échec et des correctifs par canal"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Dépannage de canal"
---

# Dépannage de canal

Utilisez cette page lorsqu'un canal se connecte mais que le comportement est incorrect.

## Échelle de commande

Exécutez ceux-ci dans l'ordre d'abord :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Ligne de base saine :

- `Runtime: running`
- `RPC probe: ok`
- La sonde de canal indique que le transport est connecté et, si pris en charge, `works` ou `audit ok`

## WhatsApp

### Signatures d'échec WhatsApp

| Symptôme                                      | Vérification la plus rapide                                              | Correctif                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Connecté mais pas de réponses en DM           | `openclaw pairing list whatsapp`                                         | Approuvez l'expéditeur ou modifiez la stratégie/la liste d'autorisation DM. |
| Messages de groupe ignorés                    | Vérifiez `requireMention` + les modèles de mention dans la configuration | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe.   |
| Boucles de déconnexion/reconnexion aléatoires | `openclaw channels status --probe` + journaux                            | Reconnectez-vous et vérifiez que le répertoire des identifiants est sain.   |

Dépannage complet : [/channels/whatsapp#troubleshooting](/en/channels/whatsapp#troubleshooting)

## Telegram

### Signatures d'échec Telegram

| Symptôme                                            | Vérification la plus rapide                                         | Correctif                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable      | `openclaw pairing list telegram`                                    | Approuvez le jumelage ou modifiez la stratégie DM.                                                   |
| Bot en ligne mais le groupe reste silencieux        | Vérifiez l'exigence de mention et le mode de confidentialité du bot | Désactivez le mode de confidentialité pour la visibilité du groupe ou mentionnez le bot.             |
| Échecs d'envoi avec erreurs réseau                  | Inspectez les journaux pour les échecs d'appel Telegram API         | Corrigez le routage DNS/IPv6/proxy vers `api.telegram.org`.                                          |
| `setMyCommands` rejeté au démarrage                 | Inspectez les journaux pour `BOT_COMMANDS_TOO_MUCH`                 | Réduisez les commandes de plug-in/compétence/personnalisées Telegram ou désactivez les menus natifs. |
| Mis à niveau et la liste d'autorisation vous bloque | `openclaw security audit` et listes d'autorisation de configuration | Exécutez `openclaw doctor --fix` ou remplacez `@username` par des ID d'expéditeur numériques.        |

Dépannage complet : [/channels/telegram#troubleshooting](/en/channels/telegram#troubleshooting)

## Discord

### Signatures d'échec Discord

| Symptôme                                    | Vérification la plus rapide                                          | Correctif                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Bot en ligne mais pas de réponses de guilde | `openclaw channels status --probe`                                   | Autoriser la guilde/le channel et vérifier l'intent de contenu de message. |
| Messages de groupe ignorés                  | Vérifier les journaux pour les abandons dus au filtrage des mentions | Mentionnez le bot ou définissez `requireMention: false` de guilde/canal.   |
| Réponses DM manquantes                      | `openclaw pairing list discord`                                      | Approuver l'appariement DM ou ajuster la stratégie DM.                     |

Dépannage complet : [/channels/discord#troubleshooting](/en/channels/discord#troubleshooting)

## Slack

### Slack failure signatures

| Symptôme                                 | Vérification la plus rapide                                | Correctif                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode Socket connecté mais aucune réponse | `openclaw channels status --probe`                         | Vérifiez le jeton d'application + le jeton bot et les portées requises ; surveillez `botTokenStatus` / `appTokenStatus = configured_unavailable` sur les configurations basées sur SecretRef. |
| DMs bloqués                              | `openclaw pairing list slack`                              | Approuver l'appariement ou assouplir la stratégie DM.                                                                                                                                         |
| Message de channel ignoré                | Vérifiez `groupPolicy` et la liste d'autorisation du canal | Autorisez le canal ou passez la stratégie à `open`.                                                                                                                                           |

Dépannage complet : [/channels/slack#troubleshooting](/en/channels/slack#troubleshooting)

## iMessage et BlueBubbles

### iMessage et BlueBubbles failure signatures

| Symptôme                                  | Vérification la plus rapide                                                            | Correctif                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Aucun événement entrant                   | Vérifier l'accessibilité du webhook/serveur et les autorisations de l'application      | Corriger l'URL du webhook ou l'état du serveur BlueBubbles.                     |
| Peut envoyer mais ne reçoit pas sur macOS | Vérifier les autorisations de confidentialité macOS pour l'automatisation des Messages | Accorder à nouveau les autorisations TCC et redémarrer le processus du channel. |
| Expéditeur DM bloqué                      | `openclaw pairing list imessage` ou `openclaw pairing list bluebubbles`                | Approuver l'appariement ou mettre à jour la liste d'autorisation.               |

Dépannage complet :

- [/channels/imessage#troubleshooting](/en/channels/imessage#troubleshooting)
- [/channels/bluebubbles#troubleshooting](/en/channels/bluebubbles#troubleshooting)

## Signal

### Signal failure signatures

| Symptôme                                     | Vérification la plus rapide                                            | Correctif                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Démon accessible mais bot silencieux         | `openclaw channels status --probe`                                     | Vérifiez l'URL/le compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                                    | `openclaw pairing list signal`                                         | Approuver l'expéditeur ou ajuster la stratégie DM.                      |
| Les réponses de groupe ne se déclenchent pas | Vérifier la liste d'autorisation des groupes et les modèles de mention | Ajouter l'expéditeur/le groupe ou assouplir le filtrage.                |

Dépannage complet : [/channels/signal#troubleshooting](/en/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot failure signatures

| Symptôme                        | Vérification la plus rapide                              | Correction                                                      |
| ------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Bot replies "gone to Mars"      | Vérifiez `appId` et `clientSecret` dans la configuration | Set credentials or restart the gateway.                         |
| No inbound messages             | `openclaw channels status --probe`                       | Verify credentials on the QQ Open Platform.                     |
| Voice not transcribed           | Check STT provider config                                | Configurez `channels.qqbot.stt` ou `tools.media.audio`.         |
| Proactive messages not arriving | Check QQ platform interaction requirements               | QQ may block bot-initiated messages without recent interaction. |

Dépannage complet : [/channels/qqbot#troubleshooting](/en/channels/qqbot#troubleshooting)

## Matrix

### Matrix failure signatures

| Symptom                                               | Fastest check                          | Fix                                                                                                  |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Logged in but ignores room messages                   | `openclaw channels status --probe`     | Vérifiez `groupPolicy`, la liste d'autorisation des salles et le filtrage des mentions.              |
| DMs do not process                                    | `openclaw pairing list matrix`         | Approve sender or adjust DM policy.                                                                  |
| Encrypted rooms fail                                  | `openclaw matrix verify status`        | Vérifiez à nouveau l'appareil, puis vérifiez `openclaw matrix verify backup status`.                 |
| La restauration de la sauvegarde est en cours/échouée | `openclaw matrix verify backup status` | Exécutez `openclaw matrix verify backup restore` ou relancez avec une clé de récupération.           |
| La signature croisée/l'amorçage semble incorrect      | `openclaw matrix verify bootstrap`     | Réparez le stockage des secrets, la signature croisée et l'état de la sauvegarde en une seule passe. |

Configuration complète et paramètres : [Matrix](/en/channels/matrix)
