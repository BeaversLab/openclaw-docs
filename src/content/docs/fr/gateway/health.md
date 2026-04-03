---
summary: "Health check commands and gateway health monitoring"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "Vérifications de l'état"
---

# Vérifications de l'état (CLI)

Guide court pour vérifier la connectivité du canal sans deviner.

## Vérifications rapides

- `openclaw status` — résumé local : accessibilité/mode de la passerelle, indice de mise à jour, âge de l'auth du canal lié, sessions + activité récente.
- `openclaw status --all` — diagnostic local complet (lecture seule, couleur, sans risque de coller pour le débogage).
- `openclaw status --deep` — sonde également la Gateway en cours d'exécution (sondes par canal lorsque pris en charge).
- `openclaw health --json` — demande à la Gateway en cours d'exécution un instantané complet de l'état (WS uniquement ; pas de socket Baileys direct).
- Envoyez `/status` comme message autonome dans WhatsApp/WebChat pour obtenir une réponse de statut sans invoquer l'agent.
- Journaux : tail `/tmp/openclaw/openclaw-*.log` et filtrez pour `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnostics approfondis

- Identifiants sur le disque : `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (la date de modification doit être récente).
- Magasin de sessions : `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (le chemin peut être remplacé dans la configuration). Le nombre et les destinataires récents sont affichés via `status`.
- Flux de reconnexion : `openclaw channels logout && openclaw channels login --verbose` lorsque les codes de statut 409–515 ou `loggedOut` apparaissent dans les journaux. (Remarque : le flux de connexion QR redémarre automatiquement une fois pour le statut 515 après l'appariement.)

## Health monitor config

- `gateway.channelHealthCheckMinutes` : fréquence à laquelle la passerelle vérifie l'état du channel. Valeur par défaut : `5`. Définissez `0` pour désactiver les redémarrages du health-monitor globalement.
- `gateway.channelStaleEventThresholdMinutes` : durée pendant laquelle un channel connecté peut rester inactif avant que le health-monitor ne le considère comme périmé et ne le redémarre. Valeur par défaut : `30`. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour` : plafond glissant sur une heure pour les redémarrages du health-monitor par channel/compte. Valeur par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactiver les redémarrages du health-monitor pour un channel spécifique tout en laissant la surveillance globale activée.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : substitution multi-compte qui prend le pas sur le paramètre au niveau du channel.
- Ces substitutions par channel s'appliquent aux surveillances de channel intégrées qui les exposent aujourd'hui : Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram et WhatsApp.

## Lorsque quelque chose échoue

- `logged out` ou statut 409–515 → reliez avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway injoignable → démarrez-le : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Pas de messages entrants → confirmez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les discussions de groupe, assurez-vous que les règles de liste d'autorisation + de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande "health" dédiée

`openclaw health --json` demande au Gateway en cours d'exécution son instantané de santé (pas de sockets de channel directs depuis le CLI). Il signale l'âge des identifiants liés/de l'authentification lorsque disponible, les résumés des sondages par channel, le résumé du session-store et une durée de sondage. Il se termine avec un code non nul si le Gateway est injoignable ou si le sondage échoue/expire.

Options :

- `--json` : sortie JSON lisible par machine
- `--timeout <ms>` : remplacer le délai d'expiration du sondage par défaut de 10s
- `--probe` : forcer un sondage en direct de tous les channels au lieu de renvoyer l'instantané de santé mis en cache

L'instantané de santé inclut : `ok` (booléen), `ts` (horodatage), `durationMs` (temps de sondage), l'état par channel, la disponibilité de l'agent et le résumé du session-store.
