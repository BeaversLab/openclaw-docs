---
summary: "Guide de dépannage approfondi pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Dépannage"
---

# Dépannage de la passerelle

Cette page est le guide de dépannage détaillé.
Commencez par [/help/troubleshooting](/en/help/troubleshooting) si vous souhaitez d'abord suivre le processus de triage rapide.

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
- `openclaw doctor` signale aucun problème bloquant de configuration/service.
- `openclaw channels status --probe` affiche l'état du transport en temps réel par compte et,
  lorsque pris en charge, les résultats de sonde/audit tels que `works` ou `audit ok`.

## Anthropic 429 utilisation supplémentaire requise pour le contexte long

Utilisez ceci lorsque les journaux/erreurs incluent :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Opus/Sonnet Anthropic sélectionné dispose de `params.context1m: true`.
- Les identifiants Anthropic actuels ne sont pas éligibles pour l'utilisation à contexte long.
- Les requêtes échouent uniquement sur les longues sessions/exécutions de modèle qui nécessitent le chemin bêta 1M.

Options de correction :

1. Désactivez `context1m` pour ce modèle pour revenir à la fenêtre de contexte normale.
2. Utilisez une clé Anthropic API avec facturation, ou activez l'Utilisation Extra Anthropic sur le compte Anthropic/abonnement OAuth.
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
- `origin not allowed` → le `Origin` du navigateur n'est pas dans `gateway.controlUi.allowedOrigins`
  (ou vous vous connectez depuis une origine de navigateur non bouclée sans une
  n liste d'autorisation explicite).
- `device nonce required` / `device nonce mismatch` → le client ne termine pas
  le flux d'authentification des appareils basé sur des défis (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → le client a signé la mauvaise
  charge utile (ou un horodatage obsolète) pour la poignée de main actuelle.
- `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
- Cette nouvelle tentative avec jeton mis en cache réutilise l'ensemble de portées mises en cache et stockées avec le jeton d'appareil associé.
  Les appelants `deviceToken` explicite / `scopes` explicite conservent à la place leur ensemble de portées demandé.
- En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite,
  puis `deviceToken` explicite, puis le jeton d'appareil stocké,
  puis le jeton d'amorçage.
- Sur le chemin asynchrone de l'interface utilisateur de contrôle Tailscale Serve, les tentatives échouées pour le même
  `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Deux nouvelles tentatives simultanées
  incorrectes du même client peuvent donc faire apparaître `retry later`
  lors de la deuxième tentative au lieu de deux simples inadéquations.
- `too many failed authentication attempts (retry later)` provenant d'un client
  en boucle d'origine navigateur → des échecs répétés de ce même `Origin` normalisé sont
  temporairement verrouillés ; une autre origine localhost utilise un compartiment séparé.
- `unauthorized` répétés après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et réapprouvez/faites pivoter le jeton d'appareil si nécessaire.
- `gateway connect failed:` → mauvaise cible hôte/port/url.

### Carte rapide des codes de détails d'authentification

Utilisez `error.details.code` de la réponse `connect` échouée pour choisir l'action suivante :

| Code de détail               | Signification                                                                    | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface utilisateur de contrôle.                                                                                                                                                                                                    |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle. | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Les nouvelles tentatives avec jeton mis en cache réutilisent les portées approuvées stockées ; les appelants explicites `deviceToken` / `scopes` conservent les portées demandées. Si cela échoue toujours, exécutez la [liste de contrôle de récupération de dérive de jeton](/en/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton par appareil mis en cache est périmé ou révoqué.                        | Faire pivoter/réapprouver le jeton de l'appareil en utilisant [devices CLI](/en/cli/devices), puis se reconnecter.                                                                                                                                                                                                                                                                                                |
| `PAIRING_REQUIRED`           | L'identité de l'appareil est connue mais non approuvée pour ce rôle.             | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`.                                                                                                                                                                                                                                                                                                            |

Vérification de la migration de l'authentification d'appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux affichent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

1. attend `connect.challenge`
2. signe la charge utile liée au challenge
3. envoie `connect.params.device.nonce` avec le même nonce de challenge

Si `openclaw devices rotate` / `revoke` / `remove` est refusé de manière inattendue :

- les sessions de jeton d'appareil couplé peuvent gérer uniquement **leur propre** appareil, sauf si l'appelant possède également `operator.admin`
- `openclaw devices rotate --scope ...` peut uniquement demander des portées d'opérateur que la session de l'appelant possède déjà

Connexe :

- [/web/control-ui](/en/web/control-ui)
- [/gateway/configuration](/en/gateway/configuration) (modes d'authentification de la passerelle)
- [/gateway/trusted-proxy-auth](/en/gateway/trusted-proxy-auth)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## Le service Gateway ne fonctionne pas

Utilisez ceci lorsque le service est installé mais que le processus ne reste pas actif.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

Recherchez :

- `Runtime: stopped` avec des indications de sortie.
- Inadéquation de la configuration du service (`Config (cli)` contre `Config (service)`).
- Conflits de port/écouteur.
- Installations supplémentaires de launchd/systemd/schtasks lorsque `--deep` est utilisé.
- Indications de nettoyage `Other gateway-like services detected (best effort)`.

Signatures courantes :

- `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode de passerelle local n'est pas activé, ou le fichier de configuration a été écrasé et `gateway.mode` a été perdu. Correctif : définissez `gateway.mode="local"` dans votre configuration, ou relancez `openclaw onboard --mode local` / `openclaw setup` pour rétablir la configuration de mode local attendue. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → liaison non bouclée sans chemin d'authentification de passerelle valide (jeton/mot de passe, ou proxy de confiance si configuré).
- `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.
- `Other gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks périmées ou parallèles existent. La plupart des configurations doivent conserver une seule passerelle par machine ; si vous avez besoin de plus d'une, isolez les ports + config/état/espace de travail. Voir [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host).

Connexe :

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## Avertissements de sonde Gateway

Utilisez ceci lorsque `openclaw gateway probe` atteint quelque chose, mais affiche toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Si l'avertissement concerne la repli SSH, plusieurs passerelles, des portées manquantes ou des références d'authentification non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → échec de la configuration SSH, mais la commande a tout de même essayé les cibles configurées/bouclées directes.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration intentionnelle de plusieurs passerelles ou des écouteurs périmés/en double.
- `Probe diagnostics are limited by gateway scopes (missing operator.read)` → la connexion a fonctionné, mais le RPC de détail est limité par la portée ; associez l'identité de l'appareil ou utilisez des identifiants avec `operator.read`.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → le matériel d'authentification n'était pas disponible dans ce chemin de commande pour la cible échouée.

Connexe :

- [/cli/gateway](/en/cli/gateway)
- [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)
- [/gateway/remote](/en/gateway/remote)

## Messages du canal connecté ne circulant pas

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
- Liste autorisée de groupes et exigences de mention.
- Autorisations/portées API du canal manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'authentification/autorisation du canal.

Connexe :

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Livraison Cron et heartbeat

Si le cron ou le heartbeat ne s'est pas exécuté ou n'a pas été livré, vérifiez d'abord l'état du planificateur, puis la cible de livraison.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Recherchez :

- Cron activé et prochain réveil présent.
- Statut de l'historique d'exécution des tâches (`ok`, `skipped`, `error`).
- Raisons de l'oubli du heartbeat (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

Signatures courantes :

- `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
- `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/d'exécution.
- `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre des heures actives.
- `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient que des lignes vides / en-têtes markdown, donc OpenClaw ignore l'appel au modèle.
- `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune tâche n'est prévue pour ce tick.
- `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de livraison du heartbeat.
- `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat est résolue vers une destination de style DM alors que `agents.defaults.heartbeat.directPolicy` (ou la redéfinition par agent) est défini sur `block`.

Connexes :

- [/automation/cron-jobs#troubleshooting](/en/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## Échec de l'outil sur un nœud jumelé

Si un nœud est jumelé mais que les outils échouent, isolez les états de premier plan, d'autorisation et d'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les fonctionnalités attendues.
- Autorisations du système d'exploitation pour la caméra, le microphone, la localisation et l'écran.
- Approbations d'exécution et état de la liste d'autorisation.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation du système d'exploitation manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste d'autorisation.

Connexes :

- [/nodes/troubleshooting](/en/nodes/troubleshooting)
- [/nodes/index](/en/nodes/index)
- [/tools/exec-approvals](/en/tools/exec-approvals)

## Échec de l'outil navigateur

Utilisez ceci lorsque les actions de l'outil navigateur échouent alors que la passerelle elle-même est en bonne santé.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Recherchez :

- Si `plugins.allow` est défini et inclut `browser`.
- Chemin d'exécutable du navigateur valide.
- Accessibilité du profil CDP.
- Disponibilité locale de Chrome pour les profils `existing-session` / `user`.

Signatures courantes :

- `unknown command "browser"` ou `unknown command 'browser'` → le plugin navigateur fourni est exclu par `plugins.allow`.
- outil navigateur manquant / indisponible alors que `browser.enabled=true` → `plugins.allow` exclut `browser`, le plugin n'a donc jamais été chargé.
- `Failed to start Chrome CDP on port` → échec du lancement du processus du navigateur.
- `browser.executablePath not found` → le chemin configuré n'est pas valide.
- `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
- `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
- `No Chrome tabs found for profile="user"` → le profil de connexion Chrome MCP n'a aucun onglet Chrome local ouvert.
- `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible à partir de l'hôte de la passerelle.
- `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil de connexion uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → l'installation actuelle de la passerelle ne dispose pas du package Playwright complet ; les instantanés ARIA et les captures d'écran de page de base peuvent toujours fonctionner, mais la navigation, les instantanés IA, les captures d'écran d'éléments de sélecteur CSS et l'export PDF restent indisponibles.
- `fullPage is not supported for element screenshots` → la demande de capture d'écran a mélangé `--full-page` avec `--ref` ou `--element`.
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser la capture de page ou un instantané `--ref`, et non CSS `--element`.
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → les hooks de téléchargement Chrome MCP nécessitent des références d'instantané, et non des sélecteurs CSS.
- `existing-session file uploads currently support one file at a time.` → envoyez un téléchargement par appel sur les profils Chrome MCP.
- `existing-session dialog handling does not support timeoutMs.` → les hooks de boîte de dialogue sur les profils Chrome MCP ne prennent pas en charge les remplacements de délai d'attente.
- `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
- remplacements de viewport / mode sombre / langue / hors connexion obsolètes sur les profils CDP de connexion uniquement ou distants → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer la passerelle entière.

Connexes :

- [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des ruptures après mise à niveau sont dues à une dérive de la configuration ou à des valeurs par défaut plus strictes désormais appliquées.

### 1) Le comportement de remplacement de l'authentification et de l'URL a changé

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Ce qu'il faut vérifier :

- Si `gateway.mode=remote`, les appels CLI peuvent cibler une instance distante alors que votre service local est fonctionnel.
- Les appels explicites `--url` ne reviennent pas aux informations d'identification stockées.

Signatures courantes :

- `gateway connect failed:` → mauvaise cible d'URL.
- `unauthorized` → point de terminaison accessible mais mauvaise authentification.

### 2) Les garde-fous de liaison et d'authentification sont plus stricts

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

Ce qu'il faut vérifier :

- Les liaisons non-bouclage (`lan`, `tailnet`, `custom`) nécessitent un chemin d'authentification de passerelle valide : authentification par jeton partagé/mot de passe, ou un déploiement `trusted-proxy` non-bouclage correctement configuré.
- Les anciennes clés comme `gateway.token` ne remplacent pas `gateway.auth.token`.

Signatures courantes :

- `refusing to bind gateway ... without auth` → liaison non-bouclage sans chemin d'authentification de passerelle valide.
- `RPC probe: failed` alors que le runtime est en cours d'exécution → passerelle active mais inaccessible avec l'authentification/l'URL actuelle.

### 3) L'état du jumelage et de l'identité de l'appareil a changé

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

Ce qu'il faut vérifier :

- Approbations d'appareil en attente pour le tableau de bord/les nœuds.
- Approbations de jumelage DM en attente après des modifications de stratégie ou d'identité.

Signatures courantes :

- `device identity required` → authentification de l'appareil non satisfaite.
- `pairing required` → l'expéditeur/l'appareil doit être approuvé.

Si la configuration du service et le runtime ne sont toujours pas d'accord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexes :

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
