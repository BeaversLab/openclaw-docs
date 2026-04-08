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
- `openclaw status --deep` — demande à la passerelle en cours d'exécution une sonde de santé en direct (`health` avec `probe:true`), y compris les sondes de canal par compte lorsque cela est pris en charge.
- `openclaw health` — demande à la passerelle en cours d'exécution son instantané de santé (WS uniquement ; pas de sockets de canal directs depuis le CLI).
- `openclaw health --verbose` — force une sonde de santé en direct et imprime les détails de connexion de la passerelle.
- `openclaw health --json` — sortie d'instantané de santé lisible par machine.
- Envoyez `/status` comme message autonome dans WhatsApp/WebChat pour obtenir une réponse de statut sans invoquer l'agent.
- Journaux : tail `/tmp/openclaw/openclaw-*.log` et filtrez pour `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnostics approfondis

- Identifiants sur disque : `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (mtime doit être récent).
- Magasin de sessions : `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (le chemin peut être remplacé dans la configuration). Le nombre et les destinataires récents sont affichés via `status`.
- Flux de reconnexion : `openclaw channels logout && openclaw channels login --verbose` lorsque les codes de statut 409–515 ou `loggedOut` apparaissent dans les journaux. (Remarque : le flux de connexion QR redémarre automatiquement une fois pour le statut 515 après l'appairage.)

## Configuration du moniteur de santé

- `gateway.channelHealthCheckMinutes` : fréquence à laquelle la passerelle vérifie la santé du canal. Par défaut : `5`. Définissez `0` pour désactiver globalement les redémarrages du moniteur de santé.
- `gateway.channelStaleEventThresholdMinutes` : durée pendant laquelle un canal connecté peut rester inactif avant que le moniteur de santé ne le considère comme périmé et ne le redémarre. Par défaut : `30`. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour` : plafond glissant d'une heure pour les redémarrages du moniteur de santé par canal/compte. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactive les redémarrages du moniteur de santé pour un canal spécifique tout en laissant la surveillance globale activée.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : remplacement multi-compte qui prime sur le paramètre au niveau du canal.
- Ces substitutions par canal s'appliquent aux moniteurs de canal intégrés qui les exposent actuellement : Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram et WhatsApp.

## En cas d'échec

- `logged out` ou statut 409–515 → reliez avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway injoignable → démarrez-le : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Pas de messages entrants → vérifiez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les chats de groupe, assurez-vous que les règles de liste d'autorisation et de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande dédiée "health"

`openclaw health` demande à la passerelle en cours d'exécution son instantané de santé (pas de sockets de canal direct depuis le CLI). Par défaut, il peut renvoyer un instantané de passerine fraîchement mis en cache ; la passerine rafraîchit ensuite ce cache en arrière-plan. `openclaw health --verbose` force une sonde en direct à la place. La commande signale l'âge des identifiants/authentifications liés lorsque disponible, les résumés de sondes par canal, le résumé du magasin de session et une durée de sonde. Il sort avec un code non nul si la passerine est injoignable ou si la sonde échoue/expire.

Options :

- `--json` : sortie JSON lisible par machine
- `--timeout <ms>` : remplacer le délai d'attente de sonde par défaut de 10s
- `--verbose` : forcer une sonde en direct et imprimer les détails de connexion de la passerine
- `--debug` : alias pour `--verbose`

L'instantané de santé inclut : `ok` (booléen), `ts` (horodatage), `durationMs` (temps de sonde), le statut par canal, la disponibilité de l'agent et le résumé du magasin de session.
