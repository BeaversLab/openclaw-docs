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
- `Connectivity probe: ok`
- `Capability: read-only`, `write-capable` ou `admin-capable`
- La sonde du canal indique que le transport est connecté et, si pris en charge, `works` ou `audit ok`

## WhatsApp

### Signatures d'échec WhatsApp

| Symptôme                                      | Vérification la plus rapide                                              | Correctif                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Connecté mais aucune réponse DM               | `openclaw pairing list whatsapp`                                         | Approuvez l'expéditeur ou modifiez la stratégie/liste blanche DM.         |
| Messages de groupe ignorés                    | Vérifiez `requireMention` + les modèles de mention dans la configuration | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe. |
| Boucles de déconnexion/reconnexion aléatoires | `openclaw channels status --probe` + journaux                            | Reconnectez-vous et vérifiez que le répertoire des identifiants est sain. |

Dépannage complet : [Dépannage WhatsApp](/fr/channels/whatsapp#troubleshooting)

## Telegram

### Signatures d'échec Telegram

| Symptôme                                       | Vérification la plus rapide                                      | Correctif                                                                                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable | `openclaw pairing list telegram`                                 | Approuvez l'appariement ou modifiez la stratégie DM.                                                                                                                                |
| Bot en ligne mais le groupe reste silencieux   | Vérifiez la mention requise et le mode de confidentialité du bot | Désactivez le mode de confidentialité pour la visibilité du groupe ou mentionnez le bot.                                                                                            |
| Échecs d'envoi avec erreurs réseau             | Inspectez les journaux pour les échecs d'appel Telegram API      | Corrigez le routage DNS/IPv6/proxy vers `api.telegram.org`.                                                                                                                         |
| Le polling s'arrête ou se reconnecte lentement | `openclaw logs --follow` pour les diagnostics de polling         | Effectuez une mise à niveau ; si les redémarrages sont de faux positifs, réglez `pollingStallThresholdMs`. Des arrêts persistants indiquent toujours un problème de proxy/DNS/IPv6. |
| `setMyCommands` rejeté au démarrage            | Inspectez les journaux pour `BOT_COMMANDS_TOO_MUCH`              | Réduisez les commandes de plug-in/compétence/personnalisées Telegram ou désactivez les menus natifs.                                                                                |
| Mis à niveau et la liste blanche vous bloque   | `openclaw security audit` et listes blanches de configuration    | Exécutez `openclaw doctor --fix` ou remplacez `@username` par des ID d'expéditeurs numériques.                                                                                      |

Dépannage complet : [Dépannage Telegram](/fr/channels/telegram#troubleshooting)

## Discord

### Signatures d'échec Discord

| Symptôme                                   | Vérification la plus rapide                                         | Correctif                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Bot en ligne mais aucune réponse de guilde | `openclaw channels status --probe`                                  | Autorisez la guilde/le canal et vérifiez l'intention de contenu de message. |
| Messages de groupe ignorés                 | Vérifiez les journaux pour les abandons dus au filtrage par mention | Mentionnez le bot ou définissez la guilde/le canal `requireMention: false`. |
| Réponses DM manquantes                     | `openclaw pairing list discord`                                     | Approuvez l'appariement DM ou ajustez la stratégie DM.                      |

Dépannage complet : [Dépannage Discord](/fr/channels/discord#troubleshooting)

## Slack

### Slack failure signatures

| Symptôme                                 | Vérification la plus rapide                                | Correction                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode socket connecté mais aucune réponse | `openclaw channels status --probe`                         | Vérifiez le token d'application + le token de bot et les étendues requises ; surveillez les `botTokenStatus` / `appTokenStatus = configured_unavailable` sur les configurations basées sur SecretRef. |
| DMs bloqués                              | `openclaw pairing list slack`                              | Approuvez l'appariement ou assouplissez la stratégie DM.                                                                                                                                              |
| Message de canal ignoré                  | Vérifiez `groupPolicy` et la liste d'autorisation du canal | Autorisez le canal ou passez la stratégie à `open`.                                                                                                                                                   |

Dépannage complet : [Dépannage Slack](/fr/channels/slack#troubleshooting)

## iMessage et BlueBubbles

### iMessage et BlueBubbles failure signatures

| Symptôme                                   | Vérification la plus rapide                                                            | Correction                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Aucun événement entrant                    | Vérifiez l'accessibilité du webhook/serveur et les autorisations de l'application      | Corrigez l'URL du webhook ou l'état du serveur BlueBubbles.                   |
| Peut envoyer mais ne reçoit rien sur macOS | Vérifiez les autorisations de confidentialité macOS pour l'automatisation des messages | Accordez à nouveau les autorisations TCC et redémarrez le processus du canal. |
| Expéditeur DM bloqué                       | `openclaw pairing list imessage` ou `openclaw pairing list bluebubbles`                | Approuvez l'appariement ou mettez à jour la liste d'autorisation.             |

Dépannage complet :

- [Dépannage iMessage](/fr/channels/imessage#troubleshooting)
- [Dépannage BlueBubbles](/fr/channels/bluebubbles#troubleshooting)

## Signal

### Signal failure signatures

| Symptôme                                  | Vérification la plus rapide                                            | Correction                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Démon accessible mais bot silencieux      | `openclaw channels status --probe`                                     | Vérifiez l'URL/le compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                                 | `openclaw pairing list signal`                                         | Approuvez l'expéditeur ou ajustez la stratégie DM.                      |
| Les réponses de groupe ne déclenchent pas | Vérifiez la liste d'autorisation des groupes et les modèles de mention | Ajoutez l'expéditeur/le groupe ou assouplissez le filtrage.             |

Dépannage complet : [Dépannage Signal](/fr/channels/signal#troubleshooting)

## QQ Bot

### Signatures d'échec du QQ Bot

| Symptôme                       | Vérification la plus rapide                              | Correction                                                                |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Le bot répond « gone to Mars » | Vérifiez `appId` et `clientSecret` dans la configuration | Définissez les identifiants ou redémarrez la passerelle.                  |
| Aucun message entrant          | `openclaw channels status --probe`                       | Vérifiez les identifiants sur la plateforme ouverte QQ.                   |
| Voix non transcrite            | Vérifiez la configuration du fournisseur STT             | Configurez `channels.qqbot.stt` ou `tools.media.audio`.                   |
| Messages proactifs non reçus   | Vérifiez les exigences d'interaction de la plateforme QQ | QQ peut bloquer les messages initiés par le bot sans interaction récente. |

Dépannage complet : [Dépannage du bot QQ](/fr/channels/qqbot#troubleshooting)

## Matrix

### Signatures d'échec Matrix

| Symptôme                                              | Vérification la plus rapide            | Correction                                                                                           |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Connecté mais ignore les messages des salons          | `openclaw channels status --probe`     | Vérifiez `groupPolicy`, la liste blanche des salons et le filtrage par mention.                      |
| Les DMs ne sont pas traités                           | `openclaw pairing list matrix`         | Approuvez l'expéditeur ou ajustez la stratégie de DM.                                                |
| Les salons chiffrés échouent                          | `openclaw matrix verify status`        | Vérifiez à nouveau l'appareil, puis vérifiez `openclaw matrix verify backup status`.                 |
| La restauration de la sauvegarde est en cours/échouée | `openclaw matrix verify backup status` | Exécutez `openclaw matrix verify backup restore` ou relancez avec une clé de récupération.           |
| La signature croisée/l'amorçage semble incorrect      | `openclaw matrix verify bootstrap`     | Réparez le stockage des secrets, la signature croisée et l'état de la sauvegarde en une seule passe. |

Configuration complète : [Matrix](/fr/channels/matrix)
