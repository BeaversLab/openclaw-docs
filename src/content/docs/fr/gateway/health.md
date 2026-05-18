---
summary: "Health check commands and gateway health monitoring"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "Health checks"
---

Court guide pour vérifier la connectivité du channel sans deviner.

## Vérifications rapides

- `openclaw status` — résumé local : accessibilité/mode de la passerelle, indice de mise à jour, âge de l'auth du channel lié, sessions + activité récente.
- `openclaw status --all` — diagnostic local complet (lecture seule, couleur, sans risque à coller pour le débogage).
- `openclaw status --deep` — demande à la passerelle en cours d'exécution une sonde de santé en direct (`health` avec `probe:true`), incluant les sondes de channel par compte lorsque prises en charge.
- `openclaw health` — demande à la passerelle en cours d'exécution son instantané de santé (WS uniquement ; pas de sockets de channel directs depuis le CLI).
- `openclaw health --verbose` — force une sonde de santé en direct et imprime les détails de connexion de la passerelle.
- `openclaw health --json` — sortie d'instantané de santé lisible par machine.
- Envoyez `/status` comme message autonome dans WhatsApp/WebChat pour obtenir une réponse de statut sans invoquer l'agent.
- Journaux : tail `/tmp/openclaw/openclaw-*.log` et filtrez pour `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

Pour Discord et autres fournisseurs de chat, les lignes de session ne correspondent pas à la vivacité du socket.
Discord`openclaw sessions`Gateway, le Gateway `sessions.list` et l'outil `sessions_list` de l'agent
lisent l'état stocké de la conversation. Un fournisseur peut se reconnecter et afficher un état de canal sain
avant qu'une nouvelle ligne de session ne soit matérialisée. Utilisez l'état du canal et
les commandes de santé ci-dessus pour les vérifications de connectivité en temps réel.

## Diagnostics approfondis

- Identifiants sur le disque : `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (le mtime doit être récent).
- Magasin de sessions : `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (le chemin peut être remplacé dans la configuration). Le nombre et les destinataires récents sont affichés via `status`.
- Flux de reconnexion (Relink flow) : `openclaw channels logout && openclaw channels login --verbose` lorsque les codes d'état 409–515 ou `loggedOut` apparaissent dans les journaux. (Note : le flux de connexion QR redémarre automatiquement une fois pour le statut 515 après l'appariement.)
- Les diagnostics sont activés par défaut. La passerelle enregistre les faits opérationnels sauf si `diagnostics.enabled: false` est défini. Les événements de mémoire enregistrent les comptes d'octets RSS/tas, la pression de seuil et la pression de croissance. Une pression critique de la mémoire est consignée via l'enregistreur de la passerelle. Lorsque `diagnostics.memoryPressureSnapshot: true` est défini, une pression critique de la mémoire écrit également un bundle de stabilité pré-OOM avec les statistiques du tas V8, les compteurs cgroup Linux si disponibles, les comptes de ressources actives, et les plus grands fichiers de session/transcription par chemin relatif expurgé. Les avertissements de vivacité enregistrent le délai de la boucle d'événements, l'utilisation de la boucle d'événements, le rapport cœur de processeur, et les comptes de sessions actives/en attente/mises en file lorsque le processus fonctionne mais est saturé. Les événements de charge utile trop volumineuse enregistrent ce qui a été rejeté, tronqué ou découpé, ainsi que les tailles et limites si disponibles. Ils n'enregistrent pas le texte du message, le contenu des pièces jointes, le corps du webhook, le corps de la requête ou de la réponse brute, les jetons, les cookies ou les valeurs secrètes. Le même battement de cœur démarre l'enregistreur de stabilité borné, qui est disponible via `openclaw gateway stability``diagnostics.stability` ou le Gateway RPC RPC de la passerelle. Les sorties fatales de la Gateway, les arrêts expirés et les échecs de démarrage après redémarrage conservent le dernier instantané de l'enregistreur sous `~/.openclaw/logs/stability/` lorsque des événements existent ; la pression critique de la mémoire fait de même uniquement lorsque `diagnostics.memoryPressureSnapshot: true` est défini. Inspectez le dernier bundle enregistré avec `openclaw gateway stability --bundle latest`.
- Pour les rapports de bogues, exécutez `openclaw gateway diagnostics export` et joignez le fichier zip généré. L'exportation combine un résumé Markdown, le bundle de stabilité le plus récent, les métadonnées de journal nettoyées, les instantanés d'état/santé de la Gateway nettoyés et la forme de la configuration. Il est destiné à être partagé : le texte du chat, les corps des webhooks, les sorties des outils, les informations d'identification, les cookies, les identifiants de compte/message et les valeurs secrètes sont omis ou expurgés. Voir [Diagnostics Export](/fr/gateway/diagnostics).

## Configuration du moniteur de santé

- `gateway.channelHealthCheckMinutes` : fréquence à laquelle la passerelle vérifie l'état du channel. Par défaut : `5`. Définissez `0` pour désactiver globalement les redémarrages du moniteur de santé.
- `gateway.channelStaleEventThresholdMinutes` : durée pendant laquelle un canal connecté peut rester inactif avant que le moniteur de santé ne le considère comme obsolète et ne le redémarre. Par défaut : `30`. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour` : plafond glissant d'une heure pour les redémarrages du moniteur de santé par canal/compte. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactive les redémarrages du moniteur de santé pour un canal spécifique tout en laissant la surveillance globale activée.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : substitution multi-compte qui prime sur le paramètre au niveau du canal.
- Ces remplacements par channel s'appliquent aux moniteurs de canal intégrés qui les exposent aujourd'hui : Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram et WhatsApp.

## En cas d'échec

- `logged out` ou statut 409–515 → reliez avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway inaccessible → démarrez-le : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Aucun message entrant → vérifiez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les discussions de groupe, assurez-vous que les règles de liste d'autorisation + de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande "health" dédiée

`openclaw health` demande à la passerie en cours d'exécution son instantané de santé (pas de sockets de canal directs depuis le CLI). Par défaut, il peut renvoyer un instantané frais de la passerie mis en cache ; la passerie actualise ensuite ce cache en arrière-plan. `openclaw health --verbose` force une sonde en direct à la place. La commande signale l'âge des identifiants/authentification liés lorsque disponible, des résumés de sonde par canal, un résumé du magasin de sessions, et une durée de sonde. Il se termine avec un code non nul si la passerie est inaccessible ou si la sonde échoue/expire.

Options :

- `--json` : sortie JSON lisible par machine
- `--timeout <ms>` : remplacer le délai d'expiration de la sonde par défaut de 10 s
- `--verbose` : force une sonde en direct et imprime les détails de la connexion de la passerie
- `--debug` : alias pour `--verbose`

L'instantané de santé inclut : `ok` (booléen), `ts` (horodatage), `durationMs` (temps de sonde), le statut par canal, la disponibilité de l'agent et un résumé du magasin de sessions.

## Connexes

- [Gateway runbook](/fr/gateway)
- [Diagnostics export](/fr/gateway/diagnostics)
- [Gateway troubleshooting](/fr/gateway/troubleshooting)
