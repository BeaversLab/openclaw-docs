---
summary: "Guide de dépannage approfondi pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Troubleshooting"
---

# Dépannage de la passerelle

Cette page est le guide de dépannage approfondi.
Commencez par [/help/troubleshooting](/fr/help/troubleshooting) si vous souhaitez d'abord suivre le processus de triage rapide.

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

- `openclaw gateway status` affiche `Runtime: running`, `Connectivity probe: ok`, et une ligne `Capability: ...`.
- `openclaw doctor` signale aucun problème de configuration/service bloquant.
- `openclaw channels status --probe` affiche l'état du transport en temps réel par compte et,
  lorsque pris en charge, les résultats de sondage/audit tels que `works` ou `audit ok`.

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

1. Désactivez `context1m` pour ce modèle afin de revenir à la fenêtre de contexte normale.
2. Utilisez des identifiants Anthropic éligibles pour les requêtes à contexte long, ou passez à une clé API Anthropic.
3. Configurez des modèles de secours afin que les exécutions continuent lorsque les requêtes à contexte long d'Anthropic sont rejetées.

Connexes :

- [/providers/anthropic](/fr/providers/anthropic)
- [/reference/token-use](/fr/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/fr/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Le backend local compatible OpenAI réussit les sondes directes mais les exécutions de l'agent échouent

Utilisez ceci lorsque :

- `curl ... /v1/models` fonctionne
- de minuscules appels directs `/v1/chat/completions` fonctionnent
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
  rejette les parties de contenu structurées des Chat Completions. Correctif : définir
  `models.providers.<provider>.models[].compat.requiresStringContent: true`.
- de minuscules requêtes directes réussissent, mais les exécutions d'agent OpenClaw échouent avec des plantages du backend/modèle
  (par exemple Gemma sur certaines constructions `inferrs`) → le transport OpenClaw est
  probablement déjà correct ; le backend échoue sur la forme de l'invite du runtime de l'agent
  plus grande.
- les échecs diminuent après la désactivation des outils mais ne disparaissent pas → les schémas d'outils faisaient partie de la pression, mais le problème restant est toujours une capacité du modèle/serveur en amont ou un bug du backend.

Options de correction :

1. Définissez `compat.requiresStringContent: true` pour les backends Chat Completions en chaîne uniquement.
2. Définissez `compat.supportsTools: false` pour les modèles/backends qui ne peuvent pas gérer
   la surface du schéma d'outils de OpenClaw de manière fiable.
3. Réduisez la pression du prompt lorsque cela est possible : bootstrap d'espace de travail plus petit, historique de session plus court, modèle local plus léger, ou un backend avec un support plus fort du contexte long.
4. Si de minuscules requêtes directes continuent de passer alors que les tours d'agent OpenClaw plantent toujours à l'intérieur du backend, considérez cela comme une limitation du serveur/modèle en amont et ouvrez un ticket de repro là-bas avec la forme de payload acceptée.

Connexe :

- [/gateway/local-models](/fr/gateway/local-models)
- [/gateway/configuration](/fr/gateway/configuration)
- [/gateway/configuration-reference#openai-compatible-endpoints](/fr/gateway/configuration-reference#openai-compatible-endpoints)

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
- `pairing request` → l'expéditeur doit être approuvé.
- `blocked` / `allowlist` → l'expéditeur/le canal a été filtré par la stratégie.

Connexe :

- [/channels/troubleshooting](/fr/channels/troubleshooting)
- [/channels/pairing](/fr/channels/pairing)
- [/channels/groups](/fr/channels/groups)

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

- `device identity required` → contexte non sécurisé ou authentification de l'appareil manquante.
- `origin not allowed` → le `Origin` du navigateur n'est pas dans `gateway.controlUi.allowedOrigins`
  (ou vous vous connectez depuis une origine de navigateur non bouclée sans liste d'autorisation explicite).
- `device nonce required` / `device nonce mismatch` → le client ne termine pas le flux d'authentification de l'appareil basé sur un challenge (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → le client a signé la mauvaise charge utile (ou un horodatage obsolète) pour la poignée de main actuelle.
- `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
- Cette nouvelle tentative à jeton mis en cache réutilise l'ensemble d'étendues mises en cache stockées avec le jeton d'appareil associé. Les appelants `deviceToken` explicites / `scopes` explicites conservent plutôt leur ensemble d'étendues demandé.
- En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
- Sur le chemin asynchrone de l'interface de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Deux nouvelles tentatives simultanées incorrectes du même client peuvent donc afficher `retry later`
  lors de la deuxième tentative au lieu de deux simples inadéquations.
- `too many failed authentication attempts (retry later)` à partir d'un client bouclage d'origine navigateur
  → des échecs répétés de ce même `Origin` normalisé sont
  temporairement verrouillés ; une autre origine localhost utilise un compartiment séparé.
- `unauthorized` répétés après cet essai → dérive du jeton partagé/jeton d'appareil ; rafraîchissez la configuration du jeton et approuvez de nouveau/faites pivoter le jeton d'appareil si nécessaire.
- `gateway connect failed:` → mauvaise cible hôte/port/url.

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` à partir de la réponse `connect` échouée pour choisir l'action suivante :

| Code de détail               | Signification                                                                                                                                                                                                                        | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                                                                                                                                                                    | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                                                                                                                                                                                                             |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle.                                                                                                                                                     | Si `canRetryWithDeviceToken=true`, autorisez un nouvel essai de confiance. Les nouvelles tentatives avec jeton en cache réutilisent les étendues approuvées stockées ; les appelants `deviceToken` / `scopes` explicites conservent les étendues demandées. En cas d'échec persistant, exécutez la [liste de vérification de récupération de dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton par appareil en cache est périmé ou révoqué.                                                                                                                                                                                | Faites pivoter/approuvez de nouveau le jeton d'appareil en utilisant le [CLI des appareils](/fr/cli/devices), puis reconnectez-vous.                                                                                                                                                                                                                                                                           |
| `PAIRING_REQUIRED`           | L'identité de l'appareil nécessite une approbation. Vérifiez `error.details.reason` pour `not-paired`, `scope-upgrade`, `role-upgrade`, ou `metadata-upgrade`, et utilisez `requestId` / `remediationHint` lorsqu'ils sont présents. | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`. Les mises à niveau d'étendue/rôle utilisent le même processus après avoir examiné l'accès demandé.                                                                                                                                                                                                      |

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

- les sessions de jeton d'appareil couplé ne peuvent gérer que **leur propre** appareil à moins que
  l'appelant n'ait également `operator.admin`
- `openclaw devices rotate --scope ...` ne peut demander que des étendues d'opérateur que
  la session de l'appelant possède déjà

Connexes :

- [/web/control-ui](/fr/web/control-ui)
- [/gateway/configuration](/fr/gateway/configuration) (modes d'authentification de la passerelle)
- [/gateway/trusted-proxy-auth](/fr/gateway/trusted-proxy-auth)
- [/gateway/remote](/fr/gateway/remote)
- [/cli/devices](/fr/cli/devices)

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

- `Runtime: stopped` avec des indices de sortie.
- Inadéquation de la configuration du service (`Config (cli)` contre `Config (service)`).
- Conflits de port/d'écouteur.
- Installations launchd/systemd/schtasks supplémentaires lorsque `--deep` est utilisé.
- Indices de nettoyage `Other gateway-like services detected (best effort)`.

Signatures courantes :

- `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle local n'est pas activé, ou le fichier de configuration a été écrasé et `gateway.mode` a été perdu. Correction : définissez `gateway.mode="local"` dans votre configuration, ou réexécutez `openclaw onboard --mode local` / `openclaw setup` pour réappliquer la configuration en mode local attendue. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → liaison non-boucle sans chemin d'authentification de passerelle valide (jeton/mot de passe, ou proxy de confiance si configuré).
- `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.
- `Other gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks obsolètes ou parallèles existent. La plupart des configurations doivent conserver une passerelle par machine ; si vous avez besoin de plus d'une, isolez les ports + la configuration/l'état/l'espace de travail. Voir [/gateway#multiple-gateways-same-host](/fr/gateway#multiple-gateways-same-host).

Connexes :

- [/gateway/background-process](/fr/gateway/background-process)
- [/gateway/configuration](/fr/gateway/configuration)
- [/gateway/doctor](/fr/gateway/doctor)

## Gateway a restauré la dernière configuration connue correcte

Utilisez ceci lorsque la Gateway démarre, mais que les journaux indiquent qu'elle a restauré `openclaw.json`.

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

Recherchez :

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- Un fichier `openclaw.json.clobbered.*` horodaté à côté de la configuration active
- Un événement système de l'agent principal qui commence par `Config recovery warning`

Ce qui s'est passé :

- La configuration rejetée n'a pas été validée lors du démarrage ou du rechargement à chaud.
- OpenClaw a conservé la payload rejetée sous `.clobbered.*`.
- La configuration active a été restaurée à partir de la dernière copie valide connue (last-known-good).
- Le prochain tour de l'agent principal (main-agent) est averti de ne pas réécrire aveuglément la configuration rejetée.

Inspecter et réparer :

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
openclaw config validate
openclaw doctor
```

Signatures courantes :

- `.clobbered.*` existe → une modification directe externe ou une lecture au démarrage a été restaurée.
- `.rejected.*` existe → une écriture de configuration propriété d'OpenClaw a échoué aux vérifications de schéma ou d'écrasement avant la validation.
- `Config write rejected:` → l'écriture a tenté de supprimer une forme requise, de réduire considérablement le fichier ou de rendre persistante une configuration non valide.
- `Config last-known-good promotion skipped` → le candidat contenait des espaces réservés de secrets expurgés tels que `***`.

Options de correction :

1. Conservez la configuration active restaurée si elle est correcte.
2. Copiez uniquement les clés prévues depuis `.clobbered.*` ou `.rejected.*`, puis appliquez-les avec `openclaw config set` ou `config.patch`.
3. Exécutez `openclaw config validate` avant de redémarrer.
4. Si vous modifiez manuellement, gardez la configuration JSON5 complète, et non seulement l'objet partiel que vous souhaitiez modifier.

Connexes :

- [/gateway/configuration#strict-validation](/fr/gateway/configuration#strict-validation)
- [/gateway/configuration#config-hot-reload](/fr/gateway/configuration#config-hot-reload)
- [/cli/config](/fr/cli/config)
- [/gateway/doctor](/fr/gateway/doctor)

## Avertissements de sonde Gateway

Utilisez ceci quand `openclaw gateway probe` atteint quelque chose, mais imprime toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Si l'avertissement concerne le repli SSH, plusieurs passerelles, des portées manquantes ou des références d'auth non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → la configuration SSH a échoué, mais la commande a tout de même tenté les cibles configurées directes/boucle locale.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration intentionnelle multi-passerelle ou des écouteurs obsolètes/en double.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → la connexion a fonctionné, mais le RPC détaillé est limité dans la portée ; associez l'identité de l'appareil ou utilisez des informations d'identification avec `operator.read`.
- `Capability: pairing-pending` ou `gateway closed (1008): pairing required` → la passerelle a répondu, mais ce client a toujours besoin d'un couplage/approbation avant l'accès normal de l'opérateur.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → le matériel d'authentification n'était pas disponible dans ce chemin de commande pour la cible échouée.

Connexe :

- [/cli/gateway](/fr/cli/gateway)
- [/gateway#multiple-gateways-same-host](/fr/gateway#multiple-gateways-same-host)
- [/gateway/remote](/fr/gateway/remote)

## Channel connecté mais les messages ne circulent pas

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
- Liste d'autorisation de groupe et exigences de mention.
- Autorisations/portées API du channel manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'autorisations/authentification du channel.

Connexe :

- [/channels/troubleshooting](/fr/channels/troubleshooting)
- [/channels/whatsapp](/fr/channels/whatsapp)
- [/channels/telegram](/fr/channels/telegram)
- [/channels/discord](/fr/channels/discord)

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
- Statut de l'historique des exécutions de tâches (`ok`, `skipped`, `error`).
- Raisons de l'absence de heartbeat (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

Signatures courantes :

- `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
- `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/d'exécution.
- `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre des heures actives.
- `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient que des lignes vides / des en-têtes markdown, donc OpenClaw ignore l'appel au model.
- `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune des tâches n'est prévue pour ce tick.
- `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de livraison de heartbeat.
- `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat a été résolue vers une destination de style DM alors que `agents.defaults.heartbeat.directPolicy` (ou la substitution par agent) est défini sur `block`.

Connexe :

- [/automation/cron-jobs#troubleshooting](/fr/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/fr/automation/cron-jobs)
- [/gateway/heartbeat](/fr/gateway/heartbeat)

## Échec de l'outil couplé au nœud

Si un nœud est couplé mais que les outils échouent, isolez les états de premier plan, d'autorisation et d'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les capacités attendues.
- Autorisations OS pour la caméra/micro/localisation/écran.
- Approbations d'exécution et état de la liste blanche.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation OS manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste blanche.

Connexe :

- [/nodes/troubleshooting](/fr/nodes/troubleshooting)
- [/nodes/index](/fr/nodes/index)
- [/tools/exec-approvals](/fr/tools/exec-approvals)

## Échec de l'outil de navigation

Utilisez ceci lorsque les actions de l'outil de navigateur échouent même si la passerelle elle-même est en bonne santé.

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

- `unknown command "browser"` ou `unknown command 'browser'` → le module externe du navigateur fourni est exclu par `plugins.allow`.
- outil de navigateur manquant / indisponible alors que `browser.enabled=true` → `plugins.allow` exclut `browser`, donc le module ne s'est jamais chargé.
- `Failed to start Chrome CDP on port` → le processus du navigateur n'a pas réussi à démarrer.
- `browser.executablePath not found` → le chemin configuré n'est pas valide.
- `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
- `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
- `Could not find DevToolsActivePort for chrome` → la session existante Chrome MCP n'a pas encore pu s'attacher au répertoire de données du navigateur sélectionné. Ouvrez la page d'inspection du navigateur, activez le débogage à distance, gardez le navigateur ouvert, approuvez la première invite d'attachement, puis réessayez. Si l'état de connexion n'est pas requis, privilégiez le profil géré `openclaw`.
- `No Chrome tabs found for profile="user"` → le profil d'attachement Chrome MCP n'a aucun onglet Chrome local ouvert.
- `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible à partir de l'hôte de la passerelle.
- `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil d'attachement uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → l'installation actuelle de la passerelle ne dispose pas du package Playwright complet ; les instantanés ARIA et les captures d'écran de base de la page peuvent toujours fonctionner, mais la navigation, les instantanés IA, les captures d'écran d'éléments par sélecteur CSS et l'exportation PDF restent indisponibles.
- `fullPage is not supported for element screenshots` → demande de capture d'écran mixte `--full-page` avec `--ref` ou `--element`.
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser une capture de page ou un instantané `--ref`, et non un `--element` CSS.
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → les hooks de téléchargement Chrome MCP ont besoin de références d'instantanés, et non de sélecteurs CSS.
- `existing-session file uploads currently support one file at a time.` → envoyez un seul téléchargement par appel sur les profils Chrome MCP.
- `existing-session dialog handling does not support timeoutMs.` → les hooks de dialogue sur les profils Chrome MCP ne prennent pas en charge la substitution du délai d'attente.
- `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
- substitutions de viewport / mode sombre / locale / hors ligne obsolètes sur les profils CDP de type attachement uniquement ou distant → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer l'intégralité de la passerelle.

Connexes :

- [/tools/browser-linux-troubleshooting](/fr/tools/browser-linux-troubleshooting)
- [/tools/browser](/fr/tools/browser)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des pannes après mise à niveau sont dues à une dérive de la configuration ou à des valeurs par défaut plus strictes désormais appliquées.

### 1) Comportement d'authentification et de substitution d'URL modifié

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Ce qu'il faut vérifier :

- Si `gateway.mode=remote`, les appels CLI peuvent cibler le distant alors que votre service local fonctionne correctement.
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

- Les liaisons non-bouclage (`lan`, `tailnet`, `custom`) nécessitent un chemin d'authentification de passerelle valide : authentification par jeton/mot de passe partagé, ou un déploiement `trusted-proxy` non-bouclage correctement configuré.
- Les anciennes clés comme `gateway.token` ne remplacent pas `gateway.auth.token`.

Signatures courantes :

- `refusing to bind gateway ... without auth` → liaison non-bouclage sans chemin d'authentification de passerelle valide.
- `Connectivity probe: failed` alors que le runtime est en cours d'exécution → la passerelle est active mais inaccessible avec l'auth/url actuelle.

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

Si la configuration du service et le runtime sont toujours en désaccord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexes :

- [/gateway/pairing](/fr/gateway/pairing)
- [/gateway/authentication](/fr/gateway/authentication)
- [/gateway/background-process](/fr/gateway/background-process)
