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
- La sonde de canal indique connecté/prêt

## WhatsApp

### Signatures d'échec WhatsApp

| Symptôme                                      | Vérification la plus rapide                                              | Correctif                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Connecté mais pas de réponses en DM           | `openclaw pairing list whatsapp`                                         | Approuvez l'expéditeur ou modifiez la stratégie/la liste d'autorisation DM. |
| Messages de groupe ignorés                    | Vérifiez `requireMention` + les modèles de mention dans la configuration | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe.   |
| Boucles de déconnexion/reconnexion aléatoires | `openclaw channels status --probe` + journaux                            | Reconnectez-vous et vérifiez que le répertoire des identifiants est sain.   |

Dépannage complet : [/channels/whatsapp#troubleshooting-quick](/fr/channels/whatsapp#troubleshooting-quick)

## Telegram

### Signatures d'échec Telegram

| Symptôme                                            | Vérification la plus rapide                                         | Correctif                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable      | `openclaw pairing list telegram`                                    | Approuvez le jumelage ou modifiez la stratégie DM.                                                   |
| Bot en ligne mais le groupe reste silencieux        | Vérifiez l'exigence de mention et le mode de confidentialité du bot | Désactivez le mode de confidentialité pour la visibilité du groupe ou mentionnez le bot.             |
| Échecs d'envoi avec erreurs réseau                  | Inspectez les journaux pour les échecs d'appel Telegram API         | Corrigez le routage DNS/IPv6/proxy vers `api.telegram.org`.                                          |
| `setMyCommands` rejeté au démarrage                 | Inspectez les journaux pour `BOT_COMMANDS_TOO_MUCH`                 | Réduisez les commandes de plug-in/compétence/personnalisées Telegram ou désactivez les menus natifs. |
| Mis à niveau et la liste d'autorisation vous bloque | `openclaw security audit` et listes d'autorisation de configuration | Exécutez `openclaw doctor --fix` ou remplacez `@username` par des ID d'expéditeurs numériques.       |

Dépannage complet : [/channels/telegram#troubleshooting](/fr/channels/telegram#troubleshooting)

## Discord

### Signatures d'échec Discord

| Symptôme                                    | Vérification la plus rapide                                          | Correctif                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Bot en ligne mais pas de réponses de guilde | `openclaw channels status --probe`                                   | Autoriser la guilde/le channel et vérifier l'intent de contenu de message. |
| Messages de groupe ignorés                  | Vérifier les journaux pour les abandons dus au filtrage des mentions | Mentionner le bot ou définir `requireMention: false` de guilde/channel.    |
| Réponses DM manquantes                      | `openclaw pairing list discord`                                      | Approuver l'appariement DM ou ajuster la stratégie DM.                     |

Dépannage complet : [/channels/discord#troubleshooting](/fr/channels/discord#troubleshooting)

## Slack

### Slack failure signatures

| Symptôme                                 | Vérification la plus rapide                                  | Correctif                                                                   |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Mode Socket connecté mais aucune réponse | `openclaw channels status --probe`                           | Vérifier le token d'application + le token de bot et les étendues requises. |
| DMs bloqués                              | `openclaw pairing list slack`                                | Approuver l'appariement ou assouplir la stratégie DM.                       |
| Message de channel ignoré                | Vérifier `groupPolicy` et la liste d'autorisation du channel | Autoriser le channel ou changer la stratégie pour `open`.                   |

Dépannage complet : [/channels/slack#troubleshooting](/fr/channels/slack#troubleshooting)

## iMessage et BlueBubbles

### iMessage et BlueBubbles failure signatures

| Symptôme                                  | Vérification la plus rapide                                                            | Correctif                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Aucun événement entrant                   | Vérifier l'accessibilité du webhook/serveur et les autorisations de l'application      | Corriger l'URL du webhook ou l'état du serveur BlueBubbles.                     |
| Peut envoyer mais ne reçoit pas sur macOS | Vérifier les autorisations de confidentialité macOS pour l'automatisation des Messages | Accorder à nouveau les autorisations TCC et redémarrer le processus du channel. |
| Expéditeur DM bloqué                      | `openclaw pairing list imessage` ou `openclaw pairing list bluebubbles`                | Approuver l'appariement ou mettre à jour la liste d'autorisation.               |

Dépannage complet :

- [/channels/imessage#troubleshooting-macos-privacy-and-security-tcc](/fr/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#troubleshooting](/fr/channels/bluebubbles#troubleshooting)

## Signal

### Signal failure signatures

| Symptôme                                     | Vérification la plus rapide                                            | Correctif                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Démon accessible mais bot silencieux         | `openclaw channels status --probe`                                     | Vérifier l'URL/le compte du démon `signal-cli` et le mode de réception. |
| DM bloqué                                    | `openclaw pairing list signal`                                         | Approuver l'expéditeur ou ajuster la stratégie DM.                      |
| Les réponses de groupe ne se déclenchent pas | Vérifier la liste d'autorisation des groupes et les modèles de mention | Ajouter l'expéditeur/le groupe ou assouplir le filtrage.                |

Dépannage complet : [/channels/signal#troubleshooting](/fr/channels/signal#troubleshooting)

## Matrix

### Matrix failure signatures

| Symptôme                                   | Vérification la plus rapide                                        | Correction                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Connecté mais ignore les messages du salon | `openclaw channels status --probe`                                 | Vérifiez `groupPolicy` et la liste d'autorisation des salons.                 |
| Les DMs ne sont pas traités                | `openclaw pairing list matrix`                                     | Approuver l'expéditeur ou ajuster la politique de DM.                         |
| Les salons chiffrés échouent               | Vérifier le module de chiffrement et les paramètres de chiffrement | Activer la prise en charge du chiffrement et rejoindre/synchroniser le salon. |

Dépannage complet : [/channels/matrix#troubleshooting](/fr/channels/matrix#troubleshooting)

import fr from '/components/footer/fr.mdx';

<fr />
