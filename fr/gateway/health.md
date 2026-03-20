---
summary: "Étapes de contrôle de santé pour la connectivité du canal"
read_when:
  - Diagnostic de la santé du canal WhatsApp
title: "Health Checks"
---

# Vérifications de l'état (CLI)

Guide court pour vérifier la connectivité du canal sans deviner.

## Vérifications rapides

- `openclaw status` — résumé local : accessibilité/mode de la passerelle, indice de mise à jour, âge de l'auth du canal lié, sessions + activité récente.
- `openclaw status --all` — diagnostic local complet (lecture seule, couleur, sans risque à coller pour le débogage).
- `openclaw status --deep` — sonde également la Gateway en cours d'exécution (sondes par canal lorsque prises en charge).
- `openclaw health --json` — demande à la Gateway en cours d'exécution un instantané complet de l'état de santé (WS uniquement ; pas de socket directe Baileys).
- Envoyez `/status` comme message autonome dans WhatsApp/WebChat pour obtenir une réponse de statut sans invoquer l'agent.
- Journaux : tail `/tmp/openclaw/openclaw-*.log` et filtrez pour `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnostics approfondis

- Identifiants sur disque : `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (le mtime doit être récent).
- Magasin de sessions : `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (le chemin peut être remplacé dans la config). Le nombre et les destinataires récents sont affichés via `status`.
- Flux de reconnexion : `openclaw channels logout && openclaw channels login --verbose` lorsque les codes de statut 409–515 ou `loggedOut` apparaissent dans les journaux. (Remarque : le flux de connexion QR redémarre automatiquement une fois pour le statut 515 après l'appariement.)

## Health monitor config

- `gateway.channelHealthCheckMinutes` : fréquence à laquelle la passerelle vérifie la santé du canal. Par défaut : `5`. Définissez `0` pour désactiver globalement les redémarrages du moniteur de santé.
- `gateway.channelStaleEventThresholdMinutes` : durée pendant laquelle un canal connecté peut rester inactif avant que le moniteur de santé ne le considère comme périmé et ne le redémarre. Par défaut : `30`. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour` : plafond glissant sur une heure pour les redémarrages du moniteur de santé par canal/compte. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactive les redémarrages du moniteur de santé pour un canal spécifique tout en laissant la surveillance globale activée.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : remplacement multi-compte qui prime sur le paramètre au niveau du canal.
- Ces substitutions par channel s'appliquent aux surveillances de channel intégrées qui les exposent aujourd'hui : Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram et WhatsApp.

## Lorsque quelque chose échoue

- `logged out` ou statut 409–515 → relier avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway inaccessible → démarrez-le : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Aucun message entrant → confirmez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les chats de groupe, assurez-vous que les règles de liste d'autorisation et de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande "health" dédiée

`openclaw health --json` demande au Gateway en cours d'exécution son instantané de santé (pas de sockets channel directs depuis le CLI). Il signale l'âge des identifiants/auth liés, le cas échéant, des résumés de sonde par channel, un résumé du session-store et une durée de sonde. Il se termine avec un code non nul si le Gateway est inaccessible ou si la sonde échoue/expire. Utilisez `--timeout <ms>` pour remplacer la valeur par défaut de 10 s.

import en from "/components/footer/en.mdx";

<en />
