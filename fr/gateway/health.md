---
summary: "Étapes de vérification de l'état pour la connectivité du canal"
read_when:
  - Diagnosing WhatsApp channel health
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

## En cas d'échec

- `logged out` ou statut 409–515 → reconnectez avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway inaccessible → démarrez-la : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Pas de messages entrants → confirmez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les conversations de groupe, assurez-vous que les règles de liste blanche + de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande "health" dédiée

`openclaw health --json` demande au Gateway en cours d'exécution son instantané de santé (pas de sockets channel directs depuis le CLI). Il signale l'âge des identifiants/authentifications liés lorsque disponible, des résumés de sondage par channel, un résumé du session-store, et une durée de sondage. Il se termine avec un code non nul si le Gateway est inaccessible ou si le sondage échoue/expire. Utilisez `--timeout <ms>` pour remplacer la valeur par défaut de 10s.

import fr from '/components/footer/fr.mdx';

<fr />
