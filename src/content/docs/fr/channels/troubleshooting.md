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

| Symptôme                                                  | Vérification la plus rapide                                       | Correctif                                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Connecté mais pas de réponses DM                          | `openclaw pairing list whatsapp`                                  | Approuvez l'expéditeur ou modifiez la stratégie/liste blanche des DM.                                                                                                                |
| Messages de groupe ignorés                                | Vérifiez `requireMention` + les modèles de mention dans la config | Mentionnez le bot ou assouplissez la stratégie de mention pour ce groupe.                                                                                                            |
| La connexion QR expire avec 408                           | Vérifiez la passerelle `HTTPS_PROXY` / `HTTP_PROXY` env           | Définissez un proxy accessible ; utilisez `NO_PROXY` uniquement pour les contournements.                                                                                             |
| Boucles de déconnexion/reconnexion aléatoires             | `openclaw channels status --probe` + journaux                     | Les reconnexions récentes sont signalées même lorsqu'elles sont actuellement connectées ; surveillez les journaux, redémarrez la passerelle, puis reliez si le vacillement continue. |
| `status=408 Request Time-out` boucle                      | Sonde, journaux, docteur, puis état de la passerelle              | Corrigez d'abord la connectivité/le timing de l'hôte ; sauvegardez l'authentification et reliez le compte si la boucle persiste.                                                     |
| Les réponses arrivent quelques secondes/minutes en retard | `openclaw doctor --fix`                                           | Le docteur arrête les clients locaux TUI vérifiés obsolètes lorsqu'ils dégradent la boucle d'événements du Gateway.                                                                  |

Troubleshooting complet : [WhatsApp troubleshooting](/fr/channels/whatsapp#troubleshooting)

## Telegram

### Signatures d'échec Telegram

| Symptôme                                            | Vérification la plus rapide                                           | Correction                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` mais aucun flux de réponse utilisable      | `openclaw pairing list telegram`                                      | Approuvez le jumelage ou modifiez la politique de DM.                                                                                                       |
| Bot en ligne mais le groupe reste silencieux        | Vérifiez la condition de mention et le mode de confidentialité du bot | Désactivez le mode de confidentialité pour la visibilité du groupe ou mentionnez le bot.                                                                    |
| Échecs d'envoi avec erreurs réseau                  | Inspectez les journaux pour les échecs d'appel Telegram de API        | Corrigez le routage DNS/IPv6/proxy vers `api.telegram.org`.                                                                                                 |
| Le démarrage signale `getMe returned 401`           | Vérifiez la source du jeton configurée                                | Recopiez ou régénérez le jeton BotFather et mettez à jour `botToken`, `tokenFile`, ou le compte par défaut `TELEGRAM_BOT_TOKEN`.                            |
| Le sondage bloque ou se reconnecte lentement        | `openclaw logs --follow` pour les diagnostics de sondage              | Mise à niveau ; si les redémarrages sont de faux positifs, réglez `pollingStallThresholdMs`. Les blocages persistants indiquent toujours un proxy/DNS/IPv6. |
| `setMyCommands` rejeté au démarrage                 | Inspectez les journaux pour `BOT_COMMANDS_TOO_MUCH`                   | Réduisez les commandes Telegram de plugin/compétence/personnalisées ou désactivez les menus natifs.                                                         |
| Mis à niveau et la liste d'autorisation vous bloque | `openclaw security audit` et listes d'autorisation de configuration   | Exécutez `openclaw doctor --fix` ou remplacez `@username` par des identifiants d'expéditeur numériques.                                                     |

Troubleshooting complet : [Telegram troubleshooting](/fr/channels/telegram#troubleshooting)

## Discord

### Signatures d'échec Discord

| Symptôme                                                  | Vérification la plus rapide                                                                                                           | Correction                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot en ligne mais aucune réponse de guilde                | `openclaw channels status --probe`                                                                                                    | Autoriser la guilde/le channel et vérifier l'intention de contenu des messages.                                                                                                                                                                                                                                                     |
| Messages de groupe ignorés                                | Vérifier les logs pour les abandons dus au filtrage des mentions                                                                      | Mentionner le bot ou définir la guilde/le channel `requireMention: false`.                                                                                                                                                                                                                                                          |
| Utilisation de la frappe/jeton mais aucun message Discord | Vérifier s'il s'agit d'un événement de salle ambiant ou d'une salle `message_tool` optée où le modèle a manqué `message(action=send)` | Inspecter le journal détaillé de la passerelle pour les métadonnées de charge utile finale supprimées, vérifier `messages.groupChat.unmentionedInbound`, lire [Événements de salle ambiants](/fr/channels/ambient-room-events), ou conserver `messages.groupChat.visibleReplies: "automatic"` pour les demandes de groupe normales. |
| Réponses DM manquantes                                    | `openclaw pairing list discord`                                                                                                       | Approuver l'appariement DM ou ajuster la politique DM.                                                                                                                                                                                                                                                                              |

Dépannage complet : [Dépannage Discord](/fr/channels/discord#troubleshooting)

## Slack

### Signatures d'échec Slack

| Symptôme                                 | Vérification la plus rapide                                  | Correction                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode socket connecté mais aucune réponse | `openclaw channels status --probe`                           | Vérifier le jeton d'application + le jeton bot et les portées requises ; surveiller `botTokenStatus` / `appTokenStatus = configured_unavailable` sur les configurations basées sur SecretRef. |
| DMs bloqués                              | `openclaw pairing list slack`                                | Approuver l'appariement ou assouplir la politique DM.                                                                                                                                         |
| Message de channel ignoré                | Vérifier `groupPolicy` et la liste d'autorisation du channel | Autoriser le channel ou changer la politique pour `open`.                                                                                                                                     |

Dépannage complet : [Dépannage Slack](/fr/channels/slack#troubleshooting)

## iMessage

### Signatures d'échec iMessage

| Symptôme                                  | Vérification la plus rapide                                                           | Correction                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `imsg` manquant ou échoue sur non-macOS   | `openclaw channels status --probe --channel imessage`                                 | Exécuter OpenClaw sur le Mac Messages ou utiliser un wrapper SSH pour `cliPath`. |
| Peut envoyer mais ne reçoit pas sur macOS | Vérifier les autorisations de confidentialité macOS pour l'automatisation de Messages | Accorder à nouveau les autorisations TCC et redémarrer le processus de channel.  |
| Expéditeur DM bloqué                      | `openclaw pairing list imessage`                                                      | Approuver l'appariement ou mettre à jour la liste d'autorisation.                |

Dépannage complet :

- [Dépannage iMessage](/fr/channels/imessage#troubleshooting)

## Signal

### Signal failure signatures

| Symptom                         | Fastest check                              | Fix                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Daemon reachable but bot silent | `openclaw channels status --probe`         | Verify `signal-cli` daemon URL/account and receive mode. |
| DM blocked                      | `openclaw pairing list signal`             | Approve sender or adjust DM policy.                      |
| Group replies do not trigger    | Check group allowlist and mention patterns | Add sender/group or loosen gating.                       |

Full troubleshooting: [Signal troubleshooting](/fr/channels/signal#troubleshooting)

## QQ Bot

### QQ Bot failure signatures

| Symptom                         | Fastest check                               | Fix                                                             |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Bot replies "gone to Mars"      | Verify `appId` and `clientSecret` in config | Set credentials or restart the gateway.                         |
| No inbound messages             | `openclaw channels status --probe`          | Verify credentials on the QQ Open Platform.                     |
| Voice not transcribed           | Check STT provider config                   | Configure `channels.qqbot.stt` or `tools.media.audio`.          |
| Proactive messages not arriving | Check QQ platform interaction requirements  | QQ may block bot-initiated messages without recent interaction. |

Full troubleshooting: [QQ Bot troubleshooting](/fr/channels/qqbot#troubleshooting)

## Matrix

### Matrix failure signatures

| Symptom                             | Fastest check                          | Fix                                                                       |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Logged in but ignores room messages | `openclaw channels status --probe`     | Check `groupPolicy`, room allowlist, and mention gating.                  |
| DMs do not process                  | `openclaw pairing list matrix`         | Approve sender or adjust DM policy.                                       |
| Encrypted rooms fail                | `openclaw matrix verify status`        | Re-verify the device, then check `openclaw matrix verify backup status`.  |
| Backup restore is pending/broken    | `openclaw matrix verify backup status` | Run `openclaw matrix verify backup restore` or rerun with a recovery key. |
| Cross-signing/bootstrap looks wrong | `openclaw matrix verify bootstrap`     | Repair secret storage, cross-signing, and backup state in one pass.       |

Full setup and config: [Matrix](/fr/channels/matrix)

## Related

- [Pairing](/fr/channels/pairing)
- [Channel routing](/fr/channels/channel-routing)
- [Gateway troubleshooting](/fr/gateway/troubleshooting)
