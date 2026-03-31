---
summary: "Guide de dépannage approfondi pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Dépannage"
---

# Dépannage de la passerelle

Cette page est le runbook approfondi.
Commencez par [/help/troubleshooting](/en/help/troubleshooting) si vous souhaitez d'abord suivre le flux de triage rapide.

## Échelle de commande

Exécutez-les d'abord, dans cet ordre :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Signaux sains attendus :

- `openclaw gateway status` affiche `Runtime: running` et `RPC probe: ok`.
- `openclaw doctor` ne signale aucun problème bloquant de configuration/service.
- `openclaw channels status --probe` affiche les canaux connectés/prêts.

## Anthropic 429 utilisation supplémentaire requise pour le contexte long

Utilisez ceci lorsque les journaux/erreurs incluent :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Anthropic Opus/Sonnet sélectionné a `params.context1m: true`.
- Les identifiants Anthropic actuels ne sont pas éligibles pour l'utilisation à contexte long.
- Les requêtes échouent uniquement sur les longues sessions/exécutions de modèle qui nécessitent le chemin bêta 1M.

Options de correction :

1. Désactivez `context1m` pour ce modèle pour revenir à la fenêtre de contexte normale.
2. Utilisez une clé API Anthropic avec facturation, ou activez l'Extra Usage Anthropic sur le compte d'abonnement.
3. Configurez des modèles de secours afin que les exécutions continuent lorsque les requêtes à contexte long d'Anthropic sont rejetées.

Connexes :

- [/providers/anthropic](/en/providers/anthropic)
- [/reference/token-use](/en/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/en/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Aucune réponse

Si les canaux sont actifs mais qu'aucune réponse n'est donnée, vérifiez le routage et les règles avant de reconnecter quoi que ce soit.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Recherchez :

- Appariement en attente pour les expéditeurs DM.
- Filtrage des mentions de groupe (`requireMention`, `mentionPatterns`).
- Incohérences dans la liste d'autorisation des canaux/groupes.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à la mention.
- `pairing request` → l'expéditeur a besoin d'une approbation.
- `blocked` / `allowlist` → l'expéditeur/le canal a été filtré par la stratégie.

Connexe :

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/pairing](/en/channels/pairing)
- [/channels/groups](/en/channels/groups)

## Connectivité de l'interface utilisateur de contrôle du tableau de bord

Lorsque le tableau de bord/l'interface utilisateur de contrôle ne se connecte pas, vérifiez l'URL, le mode d'authentification et les hypothèses de contexte sécurisé.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Rechercher :

- URL de sonde correcte et URL du tableau de bord.
- Inadéquation du mode/token d'authentification entre le client et la passerelle.
- Utilisation HTTP alors que l'identité de l'appareil est requise.

Signatures courantes :

- `device identity required` → contexte non sécurisé ou authentification de l'appareil manquante.
- `device nonce required` / `device nonce mismatch` → le client ne termine pas le
  flux d'authentification de l'appareil basé sur un défi (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → le client a signé la mauvaise
  charge utile (ou horodatage périmé) pour la poignée de main actuelle.
- `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
- `unauthorized` répété après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et réapprouvez/faites pivoter le jeton d'appareil si nécessaire.
- `gateway connect failed:` → mauvaise cible hôte/port/url.

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` de la réponse `connect` échouée pour choisir l'action suivante :

| Code de détail               | Signification                                                                    | Action recommandée                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                               |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle. | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Si l'échec persiste, exécutez la [liste de vérification de récupération de dérive des jetons](/en/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton mis en cache par appareil est périmé ou révoqué.                        | Faites pivoter/réapprouver le jeton de l'appareil en utilisant le [devices CLI](/en/cli/devices), puis reconnectez-vous.                                                                                                         |
| `PAIRING_REQUIRED`           | L'identité de l'appareil est connue mais n'est pas approuvée pour ce rôle.       | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`.                                                                                                                           |

Vérification de la migration de l'authentification d'appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux indiquent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

1. attend `connect.challenge`
2. signe la charge utile liée au challenge
3. envoie `connect.params.device.nonce` avec le même nonce de défi

Connexes :

- [/web/control-ui](/en/web/control-ui)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## Le service Gateway ne fonctionne pas

Utilisez ceci lorsque le service est installé mais que le processus ne reste pas actif.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

Recherchez :

- `Runtime: stopped` avec des indicateurs de sortie.
- Inadéquation de la configuration du service (`Config (cli)` contre `Config (service)`).
- Conflits de port/d'écoute.

Signatures courantes :

- `Gateway start blocked: set gateway.mode=local` → le mode passerelle locale n'est pas activé. Correction : définissez `gateway.mode="local"` dans votre configuration (ou exécutez `openclaw configure`). Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → liaison non-boucle sans jeton/mot de passe.
- `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.

Connexes :

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## Les messages ne circulent pas alors que le canal est connecté

Si l'état du canal est connecté mais que le flux de messages est mort, concentrez-vous sur la stratégie, les autorisations et les règles de livraison spécifiques au canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Recherchez :

- Stratégie DM (`pairing`, `allowlist`, `open`, `disabled`).
- Liste blanche de groupe et exigences de mention.
- Autorisations/portées de l'API du channel manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'authentification/autorisations du channel.

Connexes :

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Livraison du cron et du heartbeat

Si le cron ou le heartbeat ne s'est pas exécuté ou n'a pas été livré, vérifiez d'abord l'état du planificateur, puis la cible de livraison.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Rechercher :

- Cron activé et prochain réveil présent.
- Statut de l'historique d'exécution des tâches (`ok`, `skipped`, `error`).
- Raisons de l'omission du battement de cœur (`quiet-hours`, `requests-in-flight`, `alerts-disabled`).

Signatures courantes :

- `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
- `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/d'exécution.
- `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre des heures actives.
- `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de livraison du battement de cœur.
- `heartbeat skipped` avec `reason=dm-blocked` → la cible du battement de cœur est résolue vers une destination de type DM alors que `agents.defaults.heartbeat.directPolicy` (ou une priorité par agent) est défini sur `block`.

Connexes :

- [/automation/troubleshooting](/en/automation/troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## Échec de l'outil couplé au nœud

Si un nœud est apparié mais que les outils échouent, isolez les états de premier plan, d'autorisation et d'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les fonctionnalités attendues.
- Autorisations OS pour la caméra, le micro, la localisation et l'écran.
- Approbations d'exécution et état de la liste autorisée.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application node doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → permission OS manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste autorisée.

Connexes :

- [/nodes/troubleshooting](/en/nodes/troubleshooting)
- [/nodes/index](/en/nodes/index)
- [/tools/exec-approvals](/en/tools/exec-approvals)

## Échec de l'outil navigateur

Utilisez ceci lorsque les actions de l'outil navigateur échouent alors que la passerelle elle-même est saine.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Recherchez :

- Chemin d'exécutable du navigateur valide.
- Accessibilité du profil CDP.
- Disponibilité locale de Chrome pour les profils `existing-session` / `user`.

Signatures courantes :

- `Failed to start Chrome CDP on port` → le processus du navigateur n'a pas pu démarrer.
- `browser.executablePath not found` → le chemin configuré n'est pas valide.
- `No Chrome tabs found for profile="user"` → le profil de jointure MCP Chrome n'a aucun onglet Chrome local ouvert.
- `Browser attachOnly is enabled ... not reachable` → le profil de jointure uniquement n'a aucune cible accessible.

Connexes :

- [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des pannes post-mise à niveau sont dues à une dérive de la configuration ou à des valeurs par défaut plus strictes désormais appliquées.

### 1) Le comportement de remplacement de l'authentification et de l'URL a changé

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Ce qu'il faut vérifier :

- Si `gateway.mode=remote`, les appels CLI peuvent cibler une instance distante alors que votre service local est correct.
- Les appels explicites `--url` ne reviennent pas aux identifiants stockés.

Signatures courantes :

- `gateway connect failed:` → mauvaise cible d'URL.
- `unauthorized` → point de terminaison accessible mais mauvaise authentification.

### 2) Les garde-fous de liaison et d'authentification sont plus stricts

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

Ce qu'il faut vérifier :

- Les liaisons non-bouclage (`lan`, `tailnet`, `custom`) nécessitent une authentification configurée.
- Les anciennes clés comme `gateway.token` ne remplacent pas `gateway.auth.token`.

Signatures courantes :

- `refusing to bind gateway ... without auth` → inadéquation liaison+auth.
- `RPC probe: failed` alors que le runtime est en cours d'exécution → passerelle active mais inaccessible avec l'authentification/l'URL actuelle.

### 3) L'état du jumelage et de l'identité de l'appareil a changé

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

Ce qu'il faut vérifier :

- Approbations d'appareils en attente pour le tableau de bord/les nœuds.
- Approbations de jumelage DM en attente après des modifications de stratégie ou d'identité.

Signatures courantes :

- `device identity required` → authentification de l'appareil non satisfaite.
- `pairing required` → l'expéditeur/appareil doit être approuvé.

Si la configuration du service et le runtime sont toujours en désaccord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexes :

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
