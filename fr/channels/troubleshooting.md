---
summary: "Dépannage rapide au niveau du channel avec des signatures d'échec par channel et des correctifs"
read_when:
  - Le transport du channel indique connecté mais les réponses échouent
  - Vous avez besoin de vérifications spécifiques au channel avant la documentation approfondie du provider
title: "Channel Troubleshooting"
---

# Channel troubleshooting

Utilisez cette page lorsqu'un channel se connecte mais que le comportement est incorrect.

## Command ladder

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
- La sonde du channel indique connecté/prêt

## WhatsApp

### WhatsApp failure signatures

| Symptôme                         | Vérification la plus rapide                                       | Correctif                                                     |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Connecté mais pas de réponses DM     | `openclaw pairing list whatsapp`                    | Approuvez l'expéditeur ou changez la politique DM/allowlist.           |
| Messages de groupe ignorés          | Vérifiez `requireMention` + les modèles de mention dans la config | Mentionnez le bot ou assouplissez la politique de mention pour ce groupe. |
| Boucles aléatoires de déconnexion/reconnexion | `openclaw channels status --probe` + logs           | Reconnectez-vous et vérifiez que le répertoire des identifiants est sain.   |

Dépannage complet : [/channels/whatsapp#troubleshooting-quick](/fr/channels/whatsapp#troubleshooting-quick)

## Telegram

### Telegram failure signatures

| Symptôme                             | Vérification la plus rapide                                   | Correctif                                                                         |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable   | `openclaw pairing list telegram`                | Approuvez l'appairage ou changez la politique DM.                                        |
| Bot en ligne mais le groupe reste silencieux   | Vérifiez la exigence de mention et le mode de confidentialité du bot | Désactivez le mode de confidentialité pour la visibilité du groupe ou mentionnez le bot.                   |
| Échecs d'envoi avec erreurs réseau   | Inspectez les logs pour les échecs d'appel Telegram API     | Corrigez le routage DNS/IPv6/proxy vers `api.telegram.org`.                           |
| `setMyCommands` rejeté au démarrage | Inspectez les logs pour `BOT_COMMANDS_TOO_MUCH`        | Réduisez les commandes plugin/skill/custom Telegram ou désactivez les menus natifs.       |
| Mis à niveau et l'allowlist vous bloque   | `openclaw security audit` et allowlists de config | Exécutez `openclaw doctor --fix` ou remplacez `@username` par des ID d'expéditeur numériques. |

Dépannage complet : [/channels/telegram#troubleshooting](/fr/channels/telegram#troubleshooting)

## Discord

### Discord failure signatures

| Symptôme                         | Vérification la plus rapide                       | Correctif                                                       |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Bot en ligne mais pas de réponses de guild | `openclaw channels status --probe`  | Autorisez la guild/le channel et vérifiez l'intention de contenu du message.    |
| Messages de groupe ignorés          | Vérifier les journaux pour les abandons de filtrage des mentions | Mentionnez le bot ou définissez le `requireMention: false` de guilde/canal. |
| Réponses DM manquantes              | `openclaw pairing list discord`     | Approuvez l'appairage DM ou ajustez la stratégie DM.                   |

Dépannage complet : [/channels/discord#troubleshooting](/fr/channels/discord#troubleshooting)

## Slack

### Slack failure signatures

| Symptôme                                | Vérification la plus rapide                             | Correctif                                               |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Mode socket connecté mais aucune réponse | `openclaw channels status --probe`        | Vérifiez le jeton d'application + le jeton bot et les étendues requises. |
| DMs bloqués                            | `openclaw pairing list slack`             | Approuvez l'appairage ou assouplissez la stratégie DM.               |
| Message de canal ignoré                | Vérifiez le `groupPolicy` et la liste d'autorisation des canaux | Autorisez le canal ou passez la stratégie à `open`.     |

Dépannage complet : [/channels/slack#troubleshooting](/fr/channels/slack#troubleshooting)

## iMessage et BlueBubbles

### iMessage et BlueBubbles failure signatures

| Symptôme                          | Vérification la plus rapide                                                           | Correctif                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Aucun événement entrant                | Vérifiez l'accessibilité du webhook/serveur et les autorisations de l'application                  | Corrigez l'URL du webhook ou l'état du serveur BlueBubbles.          |
| Peut envoyer mais ne reçoit pas sur macOS | Vérifiez les autorisations de confidentialité macOS pour l'automatisation des messages                 | Accordez à nouveau les autorisations TCC et redémarrez le processus de canal. |
| Expéditeur DM bloqué                | `openclaw pairing list imessage` ou `openclaw pairing list bluebubbles` | Approuvez l'appairage ou mettez à jour la liste d'autorisation.                  |

Dépannage complet :

- [/channels/imessage#troubleshooting-macos-privacy-and-security-tcc](/fr/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#troubleshooting](/fr/channels/bluebubbles#troubleshooting)

## Signal

### Signal failure signatures

| Symptôme                         | Vérification la plus rapide                              | Correctif                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Demon accessible mais bot silencieux | `openclaw channels status --probe`         | Vérifiez l'URL/le compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                      | `openclaw pairing list signal`             | Approuvez l'expéditeur ou ajustez la stratégie DM.                      |
| Les réponses de groupe ne se déclenchent pas    | Vérifiez la liste d'autorisation des groupes et les modèles de mentions | Ajoutez l'expéditeur/groupe ou assouplissez le filtrage.                       |

Dépannage complet : [/channels/signal#troubleshooting](/fr/channels/signal#troubleshooting)

## Matrix

### Matrix failure signatures

| Symptôme                             | Vérification la plus rapide                                | Correctif                                             |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Connecté mais ignore les messages de salle | `openclaw channels status --probe`           | Vérifiez le `groupPolicy` et la liste d'autorisation des salles.         |
| Les DMs ne sont pas traités                  | `openclaw pairing list matrix`               | Approuver l'expéditeur ou ajuster la politique de DM.             |
| Les salons chiffrés échouent                | Vérifier le module de chiffrement et les paramètres de chiffrement | Activer la prise en charge du chiffrement et rejoindre/synchroniser le salon. |

Dépannage complet : [/channels/matrix#troubleshooting](/fr/channels/matrix#troubleshooting)

import en from "/components/footer/en.mdx";

<en />
