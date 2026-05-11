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

| Symptôme                                      | Vérification la plus rapide                                              | Correctif                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Connecté mais pas de réponses en DM           | `openclaw pairing list whatsapp`                                         | Approuvez l'expéditeur ou modifiez la stratégie/la liste d'autorisation DM.         |
| Messages de groupe ignorés                    | Vérifiez `requireMention` + les modèles de mention dans la configuration | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe.           |
| La connexion par QR expire avec 408           | Vérifiez la passerelle `HTTPS_PROXY` / l'environnement `HTTP_PROXY`      | Définissez un proxy accessible ; n'utilisez `NO_PROXY` que pour les contournements. |
| Boucles de déconnexion/reconnexion aléatoires | `openclaw channels status --probe` + journaux                            | Reconnectez-vous et vérifiez que le répertoire des identifiants est sain.           |

Dépannage complet : [WhatsApp troubleshooting](/fr/channels/whatsapp#troubleshooting)

## Telegram

### Telegram failure signatures

| Symptôme                                                       | Vérification la plus rapide                                             | Correction                                                                                                                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable                 | `openclaw pairing list telegram`                                        | Approuvez l'appariement ou modifiez la stratégie de DM.                                                                                                                    |
| Bot en ligne mais le groupe reste silencieux                   | Vérifiez l'exigence de mention et le mode de confidentialité du bot     | Désactivez le mode de confidentialité pour la visibilité du groupe ou mentionnez le bot.                                                                                   |
| Échecs d'envoi avec des erreurs réseau                         | Inspectez les journaux pour les échels d'appel Telegram API             | Corrigez le routage DNS/IPv6/proxy vers `api.telegram.org`.                                                                                                                |
| Le sondage bloque ou se reconnecte lentement                   | `openclaw logs --follow` pour le diagnostic du sondage                  | Mettez à niveau ; si les redémarrages sont de faux positifs, ajustez `pollingStallThresholdMs`. Les blocages persistants indiquent toujours un problème de proxy/DNS/IPv6. |
| `setMyCommands` rejeté au démarrage                            | Inspectez les journaux pour `BOT_COMMANDS_TOO_MUCH`                     | Réduisez les commandes de plugin/compétence/custom Telegram ou désactivez les menus natifs.                                                                                |
| Mise à niveau effectuée et la liste d'autorisation vous bloque | `openclaw security audit` et les listes d'autorisation de configuration | Exécutez `openclaw doctor --fix` ou remplacez `@username` par des ID d'expéditeurs numériques.                                                                             |

Dépannage complet : [Telegram troubleshooting](/fr/channels/telegram#troubleshooting)

## Discord

### Discord failure signatures

| Symptôme                                   | Vérification la plus rapide                                          | Correction                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Bot en ligne mais aucune réponse de guilde | `openclaw channels status --probe`                                   | Autoriser la guilde/le channel et vérifier l'intent de contenu de message. |
| Messages de groupe ignorés                 | Vérifier les journaux pour les abandons dus au filtrage des mentions | Mentionner le bot ou définir `requireMention: false` de guilde/channel.    |
| Réponses DM manquantes                     | `openclaw pairing list discord`                                      | Approuver l'appariement DM ou ajuster la politique DM.                     |

Dépannage complet : [Dépannage Discord](/fr/channels/discord#troubleshooting)

## Slack

### Signatures d'échec Slack

| Symptôme                                 | Vérification la plus rapide                                  | Correction                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode socket connecté mais aucune réponse | `openclaw channels status --probe`                           | Vérifier le jeton d'application + le jeton bot et les portées requises ; surveiller les `botTokenStatus` / `appTokenStatus = configured_unavailable` sur les configurations basées sur SecretRef. |
| DMs bloqués                              | `openclaw pairing list slack`                                | Approuver l'appariement ou assouplir la politique DM.                                                                                                                                             |
| Message de channel ignoré                | Vérifier `groupPolicy` et la liste d'autorisation du channel | Autoriser le channel ou passer la politique à `open`.                                                                                                                                             |

Dépannage complet : [Dépannage Slack](/fr/channels/slack#troubleshooting)

## iMessage et BlueBubbles

### Signatures d'échec iMessage et BlueBubbles

| Symptôme                                  | Vérification la plus rapide                                                          | Correction                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Aucun événement entrant                   | Vérifier l'accessibilité du webhook/serveur et les permissions de l'application      | Corriger l'URL du webhook ou l'état du serveur BlueBubbles.                   |
| Peut envoyer mais ne reçoit pas sur macOS | Vérifier les permissions de confidentialité macOS pour l'automatisation des Messages | Accorder à nouveau les permissions TCC et redémarrer le processus du channel. |
| Expéditeur DM bloqué                      | `openclaw pairing list imessage` ou `openclaw pairing list bluebubbles`              | Approuver l'appariement ou mettre à jour la liste d'autorisation.             |

Dépannage complet :

- [Dépannage iMessage](/fr/channels/imessage#troubleshooting)
- [Dépannage BlueBubbles](/fr/channels/bluebubbles#troubleshooting)

## Signal

### Signatures d'échec Signal

| Symptôme                                  | Vérification la plus rapide                                            | Correction                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Démon accessible mais bot silencieux      | `openclaw channels status --probe`                                     | Vérifier l'URL/le compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                                 | `openclaw pairing list signal`                                         | Approuver l'expéditeur ou ajuster la politique DM.                      |
| Les réponses de groupe ne déclenchent pas | Vérifier la liste d'autorisation des groupes et les modèles de mention | Ajouter l'expéditeur/le groupe ou desserrer le filtrage.                |

Dépannage complet : [Dépannage Signal](/fr/channels/signal#troubleshooting)

## Bot QQ

### Signatures d'échec du Bot QQ

| Symptôme                     | Vérification la plus rapide                              | Correction                                                                |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Le bot répond "gone to Mars" | Vérifiez `appId` et `clientSecret` dans la configuration | Définissez les identifiants ou redémarrez la passerelle.                  |
| Aucun message entrant        | `openclaw channels status --probe`                       | Vérifiez les identifiants sur la QQ Open Platform.                        |
| Voix non transcrite          | Vérifiez la configuration du fournisseur STT             | Configurez `channels.qqbot.stt` ou `tools.media.audio`.                   |
| Messages proactifs non reçus | Vérifiez les exigences d'interaction de la plateforme QQ | QQ peut bloquer les messages initiés par le bot sans interaction récente. |

Dépannage complet : [Dépannage du bot QQ](/fr/channels/qqbot#troubleshooting)

## Matrix

### Signatures d'échec Matrix

| Symptôme                                                | Vérification la plus rapide            | Correction                                                                                                  |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Connecté mais ignore les messages du salon              | `openclaw channels status --probe`     | Vérifiez `groupPolicy`, la liste d'autorisation des salons et le filtrage par mention.                      |
| Les DMs ne sont pas traités                             | `openclaw pairing list matrix`         | Approuvez l'expéditeur ou ajustez la stratégie de DM.                                                       |
| Échec des salons chiffrés                               | `openclaw matrix verify status`        | Vérifiez à nouveau l'appareil, puis vérifiez `openclaw matrix verify backup status`.                        |
| La restauration de la sauvegarde est en cours/échouée   | `openclaw matrix verify backup status` | Exécutez `openclaw matrix verify backup restore` ou relancez avec une clé de récupération.                  |
| Le croisement de signatures/l'amorçage semble incorrect | `openclaw matrix verify bootstrap`     | Réparez le stockage des secrets, le croisement de signatures et l'état de la sauvegarde en une seule passe. |

Configuration complète : [Matrix](/fr/channels/matrix)

## Connexe

- [Appairage](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Dépannage de la passerelle](/fr/gateway/troubleshooting)
