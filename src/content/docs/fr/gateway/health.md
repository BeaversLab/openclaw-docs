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
- Les diagnostics sont activés par défaut. Le Gateway enregistre les faits opérationnels à moins que `diagnostics.enabled: false` ne soit défini. Les événements de mémoire enregistrent les comptes d'octets RSS/tas, la pression de seuil et la pression de croissance. Les avertissements de vivacité enregistrent le délai de la boucle d'événements, l'utilisation de la boucle d'événements, le ratio des cœurs CPU et les comptes de sessions actives/en attente/en file d'attente lorsque le processus est en cours d'exécution mais saturé. Les événements de charge utile trop volumineuse enregistrent ce qui a été rejeté, tronqué ou découpé, ainsi que les tailles et limites lorsque disponibles. Ils n'enregistrent pas le texte du message, le contenu des pièces jointes, le corps du webhook, le corps brut de la requête ou de la réponse, les jetons, les cookies ou les valeurs secrètes. Le même battement de cœur démarre l'enregistreur de stabilité bornée, qui est disponible via `openclaw gateway stability` ou le `diagnostics.stability`GatewayRPCGateway Gateway RPC. Les sorties fatales du Gateway, les délais d'attente d'arrêt et les échecs de démarrage au redémarrage rendent persistant le dernier instantané de l'enregistreur sous `~/.openclaw/logs/stability/` lorsque des événements existent ; inspectez le plus récent ensemble sauvegardé avec `openclaw gateway stability --bundle latest`.
- Pour les rapports de bugs, exécutez `openclaw gateway diagnostics export` et joignez le fichier zip généré. L'exportation combine un résumé Markdown, le dernier bundle de stabilité, les métadonnées de journal nettoyées, les instantanés de statut/santé du Gateway nettoyés, et la forme de la configuration. Il est destiné à être partagé : le texte de chat, les corps de webhook, les sorties d'outils, les identifiants, les cookies, les identifiants de compte/message et les valeurs secrètes sont omis ou expurgés. Voir [Diagnostics Export](/fr/gateway/diagnostics).

## Configuration du moniteur de santé

- `gateway.channelHealthCheckMinutes` : fréquence à laquelle la passerelle vérifie la santé du canal. Par défaut : `5`. Définissez `0` pour désactiver globalement les redémarrages du moniteur de santé.
- `gateway.channelStaleEventThresholdMinutes` : durée pendant laquelle un canal connecté peut rester inactif avant que le moniteur de santé ne le considère comme périmé et ne le redémarre. Par défaut : `30`. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour` : plafond glissant sur une heure pour les redémarrages du moniteur de santé par canal/compte. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactive les redémarrages du moniteur de santé pour un canal spécifique tout en laissant la surveillance globale activée.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : remplacement multi-compte qui prime sur le paramètre au niveau du canal.
- Ces remplacements par channel s'appliquent aux moniteurs de canal intégrés qui les exposent aujourd'hui : Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram et WhatsApp.

## En cas d'échec

- `logged out` ou statut 409–515 → reliez avec `openclaw channels logout` puis `openclaw channels login`.
- Gateway injoignable → démarrez-le : `openclaw gateway --port 18789` (utilisez `--force` si le port est occupé).
- Aucun message entrant → confirmez que le téléphone lié est en ligne et que l'expéditeur est autorisé (`channels.whatsapp.allowFrom`) ; pour les discussions de groupe, assurez-vous que les règles de liste d'autorisation + de mention correspondent (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Commande "health" dédiée

`openclaw health` demande au Gateway en exécution son instantané de santé (aucun socket de canal direct depuis le CLI). Par défaut, il peut renvoyer un instantané Gateway mis en cache fraîchement ; le Gateway actualise ensuite ce cache en arrière-plan. `openclaw health --verbose` force une sonde en direct à la place. La commande signale l'âge des informations d'identification/authentification liées lorsque disponible, des résumés de sondes par canal, un résumé du magasin de sessions et une durée de sonde. Il se termine avec un code non nul si le Gateway est inaccessible ou si la sonde échoue/expire.

Options :

- `--json` : sortie JSON lisible par machine
- `--timeout <ms>` : remplacer le délai d'expiration de sonde par défaut de 10 s
- `--verbose` : forcer une sonde en direct et imprimer les détails de la connexion Gateway
- `--debug` : alias pour `--verbose`

L'instantané de santé inclut : `ok` (booléen), `ts` (horodatage), `durationMs` (temps de sonde), l'état par canal, la disponibilité de l'agent et un résumé du magasin de sessions.

## Connexes

- [Guide de procédures du Gateway](/fr/gateway)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Dépannage du Gateway](/fr/gateway/troubleshooting)
