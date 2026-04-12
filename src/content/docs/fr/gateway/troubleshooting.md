---
summary: "Guide de dépannage approfondi pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Dépannage"
---

# Dépannage de la passerelle

Cette page est le guide d'exécution détaillé.
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
- `openclaw doctor` signale aucun problème de configuration/service bloquant.
- `openclaw channels status --probe` affiche l'état du transport en direct par compte et,
  lorsque pris en charge, les résultats des sondes/audits tels que `works` ou `audit ok`.

## Anthropic 429 utilisation supplémentaire requise pour le contexte long

Utilisez ceci lorsque les journaux/erreurs incluent :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Anthropic Opus/Sonnet sélectionné dispose de `params.context1m: true`.
- Les identifiants Anthropic actuels ne sont pas éligibles pour l'utilisation à contexte long.
- Les requêtes échouent uniquement sur les longues sessions/exécutions de modèle qui nécessitent le chemin bêta 1M.

Options de correction :

1. Désactivez `context1m` pour ce modèle pour revenir à la fenêtre de contexte normale.
2. Utilisez des identifiants Anthropic éligibles pour les requêtes à contexte long, ou passez à une clé API Anthropic.
3. Configurez des modèles de secours afin que les exécutions continuent lorsque les requêtes à contexte long d'Anthropic sont rejetées.

Connexes :

- [/providers/anthropic](/en/providers/anthropic)
- [/reference/token-use](/en/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/en/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Le backend local compatible OpenAI réussit les sondes directes mais les exécutions de l'agent échouent

Utilisez ceci lorsque :

- `curl ... /v1/models` fonctionne
- les petits appels `/v1/chat/completions` directs fonctionnent
- les exécutions de modèle OpenClaw échouent uniquement lors des tours d'agent normaux

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Recherchez :

- les petits appels directs réussissent, mais les exécutions OpenClaw échouent uniquement sur les invites plus volumineuses
- erreurs du backend concernant `messages[].content` attendant une chaîne
- plantages du backend qui n'apparaissent qu'avec des nombres plus élevés de jetons d'invite ou des invites d'exécution
  d'agent complètes

Signatures courantes :

- `messages[...].content: invalid type: sequence, expected a string` → le backend
  rejette les parties de contenu structuré des Chat Completions. Correctif : définissez
  `models.providers.<provider>.models[].compat.requiresStringContent: true`.
- les minuscules requêtes directes réussissent, mais les exécutions de l'agent OpenClaw échouent avec des plantages du backend/du modèle
  (par exemple Gemma sur certaines versions `inferrs`) → le transport OpenClaw est
  probablement déjà correct ; le backend échoue sur la forme de l'invite de l'agent d'exécution
  plus volumineuse.
- les échecs diminuent après la désactivation des outils mais ne disparaissent pas → les schémas d'outils faisaient partie de la pression, mais le problème restant est toujours une capacité du modèle/serveur en amont ou un bug du backend.

Options de correction :

1. Définissez `compat.requiresStringContent: true` pour les backends Chat Completions en chaîne uniquement.
2. Définissez `compat.supportsTools: false` pour les modèles/backends qui ne peuvent pas gérer de manière fiable la surface du schéma d'outils d'OpenClaw.
3. Réduisez la pression du prompt lorsque cela est possible : bootstrap d'espace de travail plus petit, historique de session plus court, modèle local plus léger, ou un backend avec un support plus fort du contexte long.
4. Si de minuscules requêtes directes continuent de passer alors que les tours d'agent OpenClaw plantent toujours à l'intérieur du backend, considérez cela comme une limitation du serveur/modèle en amont et ouvrez un ticket de repro là-bas avec la forme de payload acceptée.

Connexe :

- [/gateway/local-models](/en/gateway/local-models)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/configuration-reference#openai-compatible-endpoints](/en/gateway/configuration-reference#openai-compatible-endpoints)

## Aucune réponse

Si les canaux sont opérationnels mais que rien ne répond, vérifiez le routage et la stratégie avant de reconnecter quoi que ce soit.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Recherchez :

- Appariement en attente pour les expéditeurs de DM.
- Filtrage des mentions de groupe (`requireMention`, `mentionPatterns`).
- Inadéquations des listes d'autorisation de canal/groupe.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à la mention.
- `pairing request` → l'expéditeur a besoin d'une approbation.
- `blocked` / `allowlist` → l'expéditeur/le canal a été filtré par la stratégie.

Connexe :

- [/channels/troubleshooting](/en/channels/troubleshooting)
- [/channels/pairing](/en/channels/pairing)
- [/channels/groups](/en/channels/groups)

## Connectivité de l'interface de contrôle du tableau de bord

Lorsque le tableau de bord/l'interface de contrôle ne se connecte pas, validez l'URL, le mode d'authentification et les hypothèses de contexte sécurisé.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Recherchez :

- URL de sonde correcte et URL du tableau de bord.
- Inadéquation du mode d'authentification/jeton entre le client et la passerelle.
- Utilisation HTTP alors que l'identité de l'appareil est requise.

Signatures courantes :

- `device identity required` → contexte non sécurisé ou authentification d'appareil manquante.
- `origin not allowed` → navigateur `Origin` n'est pas dans `gateway.controlUi.allowedOrigins`
  (ou vous vous connectez depuis une origine de navigateur non-bouclage sans liste d'autorisation explicite).
- `device nonce required` / `device nonce mismatch` → le client ne termine pas le flux d'authentification de l'appareil basé sur un défi (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → le client a signé la mauvaise charge utile (ou horodatage périmé) pour la négociation actuelle.
- `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative approuvée avec le jeton d'appareil mis en cache.
- Cette nouvelle tentative avec jeton mis en cache réutilise l'ensemble de portées mis en cache et stocké avec le jeton d'appareil associé. Les appelants `deviceToken` / `scopes` explicites conservent plutôt leur ensemble de portées demandé.
- En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton partagé/mot de passe explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- Sur le chemin asynchrone de l'interface utilisateur de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Par conséquent, deux nouvelles tentatives simultanées incorrectes du même client peuvent entraîner `retry later` lors de la deuxième tentative au lieu de deux simples inadéquations.
- `too many failed authentication attempts (retry later)` depuis un client bouclage d'origine navigateur → des échecs répétés de ce même `Origin` normalisé sont temporairement verrouillés ; une autre origine localhost utilise un compartiment séparé.
- `unauthorized` répétés après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et réapprouvez/faites pivoter le jeton d'appareil si nécessaire.
- `gateway connect failed:` → mauvaise cible hôte/port/url.

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` de la réponse `connect` échouée pour choisir l'action suivante :

| Code de détail               | Signification                                                                    | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                                                                                                                                                                                                                |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle. | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Les nouvelles tentatives avec jeton en cache réutilisent les étendues approuvées stockées ; les appelants explicites `deviceToken` / `scopes` conservent les étendues demandées. En cas d'échec persistant, exécutez la [liste de contrôle de récupération de dérive de jeton](/en/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton par appareil en cache est périmé ou révoqué.                            | Faites pivoter/réapprouvez le jeton de l'appareil en utilisant le [CLI des appareils](/en/cli/devices), puis reconnectez-vous.                                                                                                                                                                                                                                                                                    |
| `PAIRING_REQUIRED`           | L'identité de l'appareil est connue mais n'est pas approuvée pour ce rôle.       | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`.                                                                                                                                                                                                                                                                                                            |

Vérification de la migration de l'authentification des appareils v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux indiquent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

1. attend `connect.challenge`
2. signe la charge utile liée au défi
3. envoie `connect.params.device.nonce` avec le même nonce de défi

Si `openclaw devices rotate` / `revoke` / `remove` est refusé de manière inattendue :

- les sessions de jeton d'appareil couplé peuvent gérer uniquement **leur propre** appareil, sauf si
  l'appelant possède également `operator.admin`
- `openclaw devices rotate --scope ...` ne peut demander que les étendues d'opérateur que
  la session de l'appelant possède déjà

Connexes :

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
- Conflits de port/d'écouteur.
- Installations supplémentaires de launchd/systemd/schtasks lorsque `--deep` est utilisé.
- `Other gateway-like services detected (best effort)` conseils de nettoyage.

Signatures courantes :

- `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle locale n'est pas activé, ou le fichier de configuration a été écrasé et `gateway.mode` a été perdu. Correctif : définissez `gateway.mode="local"` dans votre configuration, ou réexécutez `openclaw onboard --mode local` / `openclaw setup` pour réappliquer la configuration locale attendue. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → liaison non bouclée sans chemin d'authentification passerelle valide (jeton/mot de passe, ou proxy de confiance si configuré).
- `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.
- `Other gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks obsolètes ou parallèles existent. La plupart des configurations doivent conserver une seule passerelle par machine ; si vous en avez besoin de plus d'une, isolez les ports + config/état/espace de travail. Voir [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host).

Connexes :

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## Avertissements de sonde Gateway

Utilisez ceci lorsque `openclaw gateway probe` atteint quelque chose, mais imprime toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Si l'avertissement concerne le repli SSH, plusieurs passerelles, des portées manquantes ou des références d'auth non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → la configuration SSH a échoué, mais la commande a tout de même essayé les cibles configurées/bouclées directes.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration intentionnelle de plusieurs passerelles ou des écouteurs obsolètes/en double.
- `Probe diagnostics are limited by gateway scopes (missing operator.read)` → la connexion a réussi, mais le RPC détaillé est limité par la portée ; associez l'identité de l'appareil ou utilisez des informations d'identification avec `operator.read`.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → le matériel d'authentification n'était pas disponible dans ce chemin de commande pour la cible ayant échoué.

Connexes :

- [/cli/gateway](/en/cli/gateway)
- [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)
- [/gateway/remote](/en/gateway/remote)

## Messages du channel connectés ne circulant pas

Si l'état du channel est connecté mais que le flux de messages est mort, concentrez-vous sur la stratégie, les autorisations et les règles de livraison spécifiques au channel.

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
- Autorisations/scopes de l'API du channel manquants.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'authentification/autorisations du channel.

Connexes :

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
- Statut de l'historique des exécutions de tâche (`ok`, `skipped`, `error`).
- Raisons d'ignorance du heartbeat (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

Signatures courantes :

- `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
- `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/runtime.
- `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre des heures actives.
- `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient que des lignes vides / en-têtes markdown, donc OpenClaw ignore l'appel au model.
- `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune des tâches n'est prévue pour cette occurrence.
- `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de remise du heartbeat.
- `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat est résolue vers une destination de style DM alors que `agents.defaults.heartbeat.directPolicy` (ou la priorité par agent) est défini sur `block`.

Connexe :

- [/automation/cron-jobs#troubleshooting](/en/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## Échec de l'outil appairé au nœud

Si un nœud est appairé mais que les outils échouent, isolez les états de premier plan, d'autorisation et d'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les capacités attendues.
- Autorisations OS pour la caméra, le microphone, la localisation et l'écran.
- Approbations d'exécution et état de la liste d'autorisation.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation OS manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste d'autorisation.

Connexe :

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

- Si `plugins.allow` est défini et inclut `browser`.
- Chemin exécutable du navigateur valide.
- Accessibilité du profil CDP.
- Disponibilité locale de Chrome pour les profils `existing-session` / `user`.

Signatures courantes :

- `unknown command "browser"` ou `unknown command 'browser'` → le plugin navigateur inclus est exclu par `plugins.allow`.
- outil navigateur manquant / indisponible alors que `browser.enabled=true` → `plugins.allow` exclut `browser`, le plugin n'a donc jamais été chargé.
- `Failed to start Chrome CDP on port` → Échec du lancement du processus navigateur.
- `browser.executablePath not found` → Le chemin configuré n'est pas valide.
- `browser.cdpUrl must be http(s) or ws(s)` → L'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
- `browser.cdpUrl has invalid port` → L'URL CDP configurée possède un port incorrect ou hors plage.
- `No Chrome tabs found for profile="user"` → Le profil de connexion Chrome MCP n'a aucun onglet Chrome local ouvert.
- `Remote CDP for profile "<name>" is not reachable` → Le point de terminaison CDP distant configuré n'est pas accessible depuis l'hôte de la passerelle.
- `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → Le profil de connexion uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → L'installation actuelle de la passerelle ne dispose pas du package complet Playwright ; les instantanés ARIA et les captures d'écran de base de la page peuvent toujours fonctionner, mais la navigation, les instantanés IA, les captures d'écran d'éléments par sélecteur CSS et l'export PDF restent indisponibles.
- `fullPage is not supported for element screenshots` → La demande de capture d'écran a mélangé `--full-page` avec `--ref` ou `--element`.
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser une capture de page ou un `--ref` d'instantané, et non un `--element` CSS.
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Les hooks de téléchargement Chrome MCP ont besoin de références d'instantané, pas de sélecteurs CSS.
- `existing-session file uploads currently support one file at a time.` → Envoyez un téléchargement par appel sur les profils Chrome MCP.
- `existing-session dialog handling does not support timeoutMs.` → Les hooks de dialogue sur les profils Chrome MCP ne prennent pas en charge les substitutions de délai d'attente.
- `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
- substitutions de viewport / mode sombre / langue / hors ligne obsolètes sur les profils CDP distants ou de connexion uniquement → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer toute la passerelle.

Connexes :

- [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## Si vous avez effectué une mise à jour et que quelque chose s'est soudainement brisé

La plupart des ruptures post-mise à jour sont dues à une dérive de la configuration ou à des paramètres par défaut plus stricts désormais appliqués.

### 1) Le comportement de remplacement de l'authentification et de l'URL a changé

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Ce qu'il faut vérifier :

- Si `gateway.mode=remote`, les appels CLI peuvent cibler le distant alors que votre service local est fonctionnel.
- Les appels explicites `--url` ne reviennent pas aux identifiants stockés.

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

- Les liaisons non-boucle (`lan`, `tailnet`, `custom`) nécessitent un chemin d'authentification de passerelle valide : authentification par jeton partagé/mot de passe, ou un déploiement `trusted-proxy` non-boucle correctement configuré.
- Les anciennes clés comme `gateway.token` ne remplacent pas `gateway.auth.token`.

Signatures courantes :

- `refusing to bind gateway ... without auth` → liaison non-boucle sans chemin d'authentification de passerelle valide.
- `RPC probe: failed` alors que le runtime est en cours d'exécution → passerelle active mais inaccessible avec l'auth/url actuelle.

### 3) L'état du couplage et de l'identité de l'appareil a changé

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

Ce qu'il faut vérifier :

- Approbations d'appareil en attente pour le tableau de bord/les nœuds.
- Approbations de couplage DM en attente après des changements de stratégie ou d'identité.

Signatures courantes :

- `device identity required` → authentification de l'appareil non satisfaite.
- `pairing required` → l'expéditeur/l'appareil doit être approuvé.

Si la configuration du service et le runtime sont toujours en désaccord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexes :

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
