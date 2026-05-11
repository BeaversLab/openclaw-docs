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

## Diagnostics approfondis

- Identifiants sur disque : `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (la mtime doit être récente).
- Stockage de session : `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (le chemin peut être remplacé dans la config). Le nombre et les destinataires récents sont affichés via `status`.
- Flux de reliage : `openclaw channels logout && openclaw channels login --verbose` lorsque les codes de statut 409–515 ou `loggedOut` apparaissent dans les journaux. (Remarque : le flux de connexion QR redémarre automatiquement une fois pour le statut 515 après l'appairage.)
- Les diagnostics sont activés par défaut. La passerelle enregistre les faits opérationnels, sauf si `diagnostics.enabled: false` est défini. Les événements de mémoire enregistrent les comptes d'octets RSS/tas, la pression de seuil et la pression de croissance. Les événements de charge utile trop volumineuse enregistrent ce qui a été rejeté, tronqué ou découpé, ainsi que les tailles et limites lorsque disponibles. Ils n'enregistrent pas le texte du message, le contenu des pièces jointes, le corps du webhook, le corps brut de la requête ou de la réponse, les jetons, les cookies ou les valeurs secrètes. Le même battement de cœur démarre l'enregistreur de stabilité bornée, qui est disponible via `openclaw gateway stability` ou le `diagnostics.stability` Gateway RPC. Les sorties fatales du Gateway, les délais d'arrêt et les échecs de démarrage au redémarrage enregistrent le dernier instantané de l'enregistreur sous `~/.openclaw/logs/stability/` lorsque des événements existent ; inspectez le dernier paquet enregistré avec `openclaw gateway stability --bundle latest`.
- Pour les rapports de bugs, exécutez `openclaw gateway diagnostics export` et joignez le fichier zip généré. L'exportation combine un résumé Markdown, le dernier bundle de stabilité, les métadonnées de journal nettoyées, les instantanés d'état/santé de la Gateway nettoyés et la forme de la configuration. Il est destiné à être partagé : le texte de chat, les corps de webhook, les sorties d'outil, les identifiants, les cookies, les identifiants de compte/message et les valeurs secrètes sont omis ou expurgés. Voir [Exportation des diagnostics](/fr/gateway/diagnostics).

## Configuration du moniteur de santé

- `gateway.channelHealthCheckMinutes` : fréquence à laquelle la passerelle vérifie la santé du canal. Par défaut : `5`. Définissez `0` pour désactiver globalement les redémarrages du moniteur de santé.
- `gateway.channelStaleEventThresholdMinutes` : durée pendant laquelle un canal connecté peut rester inactif avant que le moniteur de santé ne le considère comme périmé et ne le redémarre. Par défaut : `30`. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour` : plafond glissant sur une heure pour les redémarrages du moniteur de santé par canal/compte. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactiver les redémarrages du moniteur de santé pour un canal spécifique tout en laissant la surveillance globale activée.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : remplacement multi-compte qui prime sur le paramètre au niveau du canal.
- Ces remplacements par channel s'appliquent aux moniteurs de channel intégrés qui les exposent aujourd'hui : Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram et WhatsApp.

## En cas d'échec

- `logged out` ou statut 409–515 → relier avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway injoignable → démarrez-le : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Aucun message entrant → confirmez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les discussions de groupe, assurez-vous que les règles de liste blanche + de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande "health" dédiée

`openclaw health` demande à la gateway en exécution son instantané de santé (aucun socket de channel direct depuis le CLI). Par défaut, il peut renvoyer un instantané de gateway fraîchement mis en cache ; la gateway actualise ensuite ce cache en arrière-plan. `openclaw health --verbose` force une sonde en direct à la place. La commande signale l'âge des identifiants/auth liés lorsque disponible, les résumés de sonde par channel, le résumé du session-store et une durée de sonde. Il se termine avec un code non nul si la gateway est injoignable ou si la sonde échoue/expire.

Options :

- `--json` : sortie JSON lisible par machine
- `--timeout <ms>` : remplacer le délai d'attente de sonde par défaut de 10s
- `--verbose` : forcer une sonde en direct et imprimer les détails de connexion de la gateway
- `--debug` : alias pour `--verbose`

L'instantané de santé inclut : `ok` (booléen), `ts` (horodatage), `durationMs` (temps de sonde), le statut par channel, la disponibilité de l'agent et le résumé du session-store.

## Connexes

- [Runbook de la Gateway](/fr/gateway)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Dépannage de la Gateway](/fr/gateway/troubleshooting)
