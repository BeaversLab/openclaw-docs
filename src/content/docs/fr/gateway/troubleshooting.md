---
summary: "Guide de dépannage approfondi pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Dépannage"
sidebarTitle: "Dépannage"
---

Cette page est le guide de procédures (runbook) approfondi. Commencez par [/help/troubleshooting](/fr/help/troubleshooting) si vous souhaitez d'abord suivre le processus de triage rapide.

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

- `openclaw gateway status` affiche `Runtime: running`, `Connectivity probe: ok` et une ligne `Capability: ...`.
- `openclaw doctor` signale aucun problème bloquant de configuration/service.
- `openclaw channels status --probe` affiche l'état du transport en temps réel par compte et, si pris en charge, les résultats des sondes/audits tels que `works` ou `audit ok`.

## Installations avec split brain et protection de configuration plus récente

Utilisez ceci lorsqu'un service de passerelle s'arrête de manière inattendue après une mise à jour, ou si les journaux indiquent qu'un binaire `openclaw` est plus ancien que la version qui a écrit `openclaw.json` pour la dernière fois.

OpenClaw appose un `meta.lastTouchedVersion` sur les écritures de configuration. Les commandes en lecture seule peuvent toujours inspecter une configuration écrite par un OpenClaw plus récent, mais les mutations de processus et de services refusent de continuer à partir d'un binaire plus ancien. Les actions bloquées incluent le démarrage, l'arrêt, le redémarrage, la désinstallation, la réinstallation forcée du service de passerelle, le démarrage de la passerelle en mode service, ainsi que le nettoyage des ports `gateway --force`.

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="Corriger le PATH">
    Corrigez `PATH` afin que `openclaw` résolve vers l'installation la plus récente, puis réexécutez l'action.
  </Step>
  <Step title="Réinstaller le service de passerelle">
    Réinstallez le service de passerelle prévu à partir de l'installation la plus récente :

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="Supprimer les wrappers obsolètes">
    Supprimez les paquets système obsolètes ou les anciennes entrées de wrapper qui pointent toujours vers un ancien binaire `openclaw`.
  </Step>
</Steps>

<Warning>Pour une rétrogradation intentionnelle ou une récupération d'urgence uniquement, définissez `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1` pour la commande unique. Laissez-le non défini pour un fonctionnement normal.</Warning>

## Anthropic 429 utilisation supplémentaire requise pour un long contexte

Utilisez ceci lorsque les journaux/erreurs incluent : `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Opus/Sonnet Anthropic sélectionné a `params.context1m: true`.
- L'identifiant Anthropic actuel n'est pas éligible pour l'utilisation à long contexte.
- Les requêtes échouent uniquement sur les longues sessions/exécutions de modèle qui nécessitent le chemin bêta 1M.

Options de correction :

<Steps>
  <Step title="Désactiver context1m">Désactivez `context1m` pour ce modèle pour revenir à la fenêtre de contexte normale.</Step>
  <Step title="Utiliser un identifiant éligible">Utilisez un identifiant Anthropic éligible pour les requêtes à long contexte, ou passez à une clé Anthropic API.</Step>
  <Step title="Configurer les modèles de repli">Configurez les modèles de repli pour que les exécutions continuent lorsque les requêtes à long contexte Anthropic sont rejetées.</Step>
</Steps>

Connexes :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation des jetons et coûts](/fr/reference/token-use)
- [Pourquoi vois-je HTTP 429 de la part de Anthropic ?](/fr/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Le backend local compatible OpenAI passe les sondages directs mais les exécutions de l'agent échouent

Utilisez ceci lorsque :

- `curl ... /v1/models` fonctionne
- les minuscules appels directs `/v1/chat/completions` fonctionnent
- les exécutions de modèle OpenClaw échouent uniquement lors des tours normaux de l'agent

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Recherchez :

- les minuscules appels directs réussissent, mais les exécutions OpenClaw échouent uniquement sur les invites plus volumineuses
- erreurs `model_not_found` ou 404 même si le `/v1/chat/completions` direct
  fonctionne avec le même identifiant de modèle brut
- erreurs du backend concernant `messages[].content` attendant une chaîne
- avertissements intermittents `incomplete turn detected ... stopReason=stop payloads=0` avec un backend local compatible OpenAI
- plantages du backend qui n'apparaissent qu'avec des nombres de jetons d'invite élevés ou des invites complètes du runtime de l'agent

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `model_not_found` avec un serveur local style MLX/vLLM → vérifiez que `baseUrl` inclut `/v1`, que `api` est `"openai-completions"` pour les backends `/v1/chat/completions`, et que `models.providers.<provider>.models[].id` est l'identifiant local nu du fournisseur. Sélectionnez-le une fois avec le préfixe du fournisseur, par exemple `mlx/mlx-community/Qwen3-30B-A3B-6bit` ; conservez l'entrée du catalogue comme `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → le backend rejette les parties de contenu structurées des Chat Completions. Correctif : définissez `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → le backend a terminé la demande de Chat Completions mais n'a renvoyé aucun texte d'assistant visible par l'utilisateur pour ce tour. OpenClaw réessaie une fois les tours vides compatibles OpenAI sécurisés pour la relecture ; les échecs persistants signifient généralement que le backend émet un contenu vide/non textuel ou supprime le texte de la réponse finale.
    - de minuscules demandes directes réussissent, mais les exécutions de l'agent OpenClaw échouent avec des plantages de backend/model (par exemple Gemma sur certains builds `inferrs`) → le transport OpenClaw est probablement déjà correct ; le backend échoue en raison de la forme du prompt plus importante du runtime de l'agent.
    - les échecs diminuent après la désactivation des outils mais ne disparaissent pas → les schémas d'outils faisaient partie de la pression, mais le problème restant est toujours une capacité amont du modèle/serveur ou un bogue du backend.
  </Accordion>
  <Accordion title="Options de correction">
    1. Définissez `compat.requiresStringContent: true` pour les backends Chat Completions en mode chaîne uniquement.
    2. Définissez `compat.supportsTools: false` pour les modèles/backends qui ne peuvent pas gérer de manière fiable la surface de schéma d'outil de OpenClaw.
    3. Réduisez la pression du prompt dans la mesure du possible : amorçage d'espace de travail plus petit, historique de session plus court, modèle local plus léger ou un backend avec un support de contexte long plus robuste.
    4. Si de minuscules demandes directes continuent de passer alors que les tours de l'agent OpenClaw plantent toujours à l'intérieur du backend, considérez cela comme une limitation du serveur/modèle amont et ouvrez un ticket de reproduction avec la forme de charge utile acceptée.
  </Accordion>
</AccordionGroup>

Connexe :

- [Configuration](/fr/gateway/configuration)
- [Modèles locaux](/fr/gateway/local-models)
- [Points de terminaison compatibles OpenAI](/fr/gateway/configuration-reference#openai-compatible-endpoints)

## Aucune réponse

Si les channels sont opérationnels mais qu'aucune réponse n'est fournie, vérifiez le routage et les stratégies avant de reconnecter quoi que ce soit.

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
- Inadéquations des listes d'autorisation de channel/groupe.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à la mention.
- `pairing request` → l'expéditeur a besoin d'une approbation.
- `blocked` / `allowlist` → l'expéditeur/le channel a été filtré par la stratégie.

Connexes :

- [Dépannage de channel](/fr/channels/troubleshooting)
- [Groupes](/fr/channels/groups)
- [Appariement](/fr/channels/pairing)

## Connectivité de l'interface utilisateur de contrôle du tableau de bord

Lorsque le tableau de bord/l'interface utilisateur de contrôle ne se connecte pas, validez l'URL, le mode d'authentification et les hypothèses de contexte sécurisé.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Recherchez :

- URL de sonde correcte et URL du tableau de bord.
- Inadéquation du mode/token d'authentification entre le client et la passerelle.
- Utilisation HTTP lorsque l'identité de l'appareil est requise.

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → contexte non sécurisé ou authentification d'appareil manquante.
    - `origin not allowed` → le `Origin` du navigateur n'est pas dans `gateway.controlUi.allowedOrigins` (ou vous vous connectez depuis une origine de navigateur non bouclage sans liste d'autorisation explicite).
    - `device nonce required` / `device nonce mismatch` → le client ne termine pas le flux d'authentification d'appareil basé sur un défi (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → le client a signé la mauvaise charge utile (ou horodatage périmé) pour la poignée de main actuelle.
    - `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil en cache.
    - Cette nouvelle tentative avec jeton en cache réutilise l'ensemble d'étendues stocké avec le jeton d'appareil associé. Les appelants `deviceToken` explicite / `scopes` explicite conservent plutôt leur ensemble d'étendues demandé.
    - En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - Sur le chemin asynchrone de l'interface de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Deux mauvaises nouvelles tentatives simultanées du même client peuvent donc faire apparaître `retry later` lors de la deuxième tentative au lieu de deux simples discordances.
    - `too many failed authentication attempts (retry later)` d'un client bouclage d'origine de navigateur → des échecs répétés de ce même `Origin` normalisé sont temporairement verrouillés ; une autre origine localhost utilise un compartiment séparé.
    - `unauthorized` répétées après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et réapprouvez/faites pivoter le jeton d'appareil si nécessaire.
    - `gateway connect failed:` → mauvaise cible hôte/port/url.
  </Accordion>
</AccordionGroup>

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` à partir de la réponse `connect` échouée pour choisir la prochaine action :

| Code de détail               | Signification                                                                                                                                                                                                               | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé le jeton partagé requis.                                                                                                                                                                           | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                                                                                                                                                                                                                |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle.                                                                                                                                            | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Les nouvelles tentatives avec jeton en cache réutilisent les étendues approuvées stockées ; les appelants explicites `deviceToken` / `scopes` conservent les étendues demandées. En cas d'échec persistant, exécutez la [liste de contrôle de récupération de dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton par appareil en cache est périmé ou révoqué.                                                                                                                                                                       | Faites tourner/réapprouver le jeton d'appareil en utilisant la [CLI des appareils](/fr/cli/devices), puis reconnectez-vous.                                                                                                                                                                                                                                                                                       |
| `PAIRING_REQUIRED`           | L'identité de l'appareil nécessite une approbation. Vérifiez `error.details.reason` pour `not-paired`, `scope-upgrade`, `role-upgrade` ou `metadata-upgrade`, et utilisez `requestId` / `remediationHint` lorsque présents. | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`. Les mises à niveau d'étendue/de rôle utilisent le même processus après avoir examiné l'accès demandé.                                                                                                                                                                                                      |

<Note>
  Les RPC backend de bouclage direct authentifiés avec le jeton/mot de passe partagé de la passerelle ne doivent pas dépendre de la ligne de base de l'étendue de l'appareil jumelé de la CLI. Si les sous-agents ou d'autres appels internes échouent toujours avec `scope-upgrade`, vérifiez que l'appelant utilise `client.id: "gateway-client"` et `client.mode: "backend"` et ne force pas un
  `deviceIdentity` explicite ou un jeton d'appareil.
</Note>

Vérification de la migration de l'authentification d'appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux montrent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

<Steps>
  <Step title="Wait for connect.challenge">Le client attend le `connect.challenge` émis par la passerelle.</Step>
  <Step title="Sign the payload">Le client signe la charge utile liée au challenge.</Step>
  <Step title="Envoyer le nonce de l'appareil">Le client envoie `connect.params.device.nonce` avec le même nonce de challenge.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` est refusé de manière inattendue :

- les sessions de jetons d'appareil couplé ne peuvent gérer que **leur propre** appareil, sauf si l'appelant dispose également de `operator.admin`
- `openclaw devices rotate --scope ...` ne peut demander que les portées opérateur que la session de l'appelant possède déjà

Connexe :

- [Configuration](/fr/gateway/configuration) (modes d'authentification de la passerelle)
- [Interface de contrôle](/fr/web/control-ui)
- [Appareils](/fr/cli/devices)
- [Accès à distance](/fr/gateway/remote)
- [Authentification par proxy de confiance](/fr/gateway/trusted-proxy-auth)

## Gateway service not running

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
- Conflits de port/d'écoute.
- Installations supplémentaires de launchd/systemd/schtasks lorsque `--deep` est utilisé.
- Indices de nettoyage `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle locale n'est pas activé, ou le fichier de configuration a été écrasé et `gateway.mode` a été perdu. Correctif : définissez `gateway.mode="local"` dans votre configuration, ou réexécutez `openclaw onboard --mode local` / `openclaw setup` pour réinitialiser la configuration locale
    attendue. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`. - `refusing to bind gateway ... without auth` → liaison non bouclée sans chemin d'authentification passerelle valide (jeton/mot de passe, ou proxy de confiance si configuré). - `another gateway instance is already listening` / `EADDRINUSE` → conflit de port. - `Other
    gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks obsolètes ou parallèles existent. La plupart des installations doivent conserver une seule passerelle par machine ; si vous en avez besoin de plus d'une, isolez les ports + configuration/état/espace de travail. Voir [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host). - `System-level
    OpenClaw gateway service detected` du doctor → une unité système systemd existe alors que le service de niveau utilisateur est manquant. Supprimez ou désactivez le doublon avant d'autoriser le doctor à installer un service utilisateur, ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` si l'unité système est le superviseur prévu. - `Gateway service port does not match current gateway
    config` → le superviseur installé épingle toujours l'ancien `--port`. Exécutez `openclaw doctor --fix` ou `openclaw gateway install --force`, puis redémarrez le service de passerelle.
  </Accordion>
</AccordionGroup>

En relation :

- [Outil d'exécution en arrière-plan et de processus](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Doctor](/fr/gateway/doctor)

## Gateway a restauré la dernière configuration connue bonne

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
- Un événement système du main-agent commençant par `Config recovery warning`

<AccordionGroup>
  <Accordion title="Ce qui s'est passé">
    - La configuration rejetée n'a pas été validée lors du démarrage ou du rechargement à chaud.
    - OpenClaw a conservé la charge utile rejetée en tant que `.clobbered.*`.
    - La configuration active a été restaurée à partir de la dernière copie valide connue.
    - Le prochain tour de l'agent principal est averti de ne pas réécrire aveuglément la configuration rejetée.
    - Si tous les problèmes de validation se trouvaient sous `plugins.entries.<id>...`, OpenClaw ne restaurerait pas le fichier entier. Les échecs locaux de plugins restent visibles tandis que les paramètres utilisateur non liés restent dans la configuration active.
  </Accordion>
  <Accordion title="Inspecter et réparer">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="Signatures courantes">
    - `.clobbered.*` existe → une modification externe directe ou une lecture au démarrage a été restaurée.
    - `.rejected.*` existe → une écriture de configuration détenue par OpenClaw a échoué aux vérifications de schéma ou d'écrasement avant la validation.
    - `Config write rejected:` → l'écriture a tenté de supprimer une forme requise, de réduire considérablement le fichier ou de rendre une configuration non valide.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good`, ou `size-drop-vs-last-good:*` → le démarrage a traité le fichier actuel comme écrasé car il a perdu des champs ou de la taille par rapport à la dernière sauvegarde connue valide.
    - `Config last-known-good promotion skipped` → le candidat contenait des espaces réservés de secrets expurgés tels que `***`.
  </Accordion>
  <Accordion title="Options de correction">
    1. Conservez la configuration active restaurée si elle est correcte.
    2. Copiez uniquement les clés prévues depuis `.clobbered.*` ou `.rejected.*`, puis appliquez-les avec `openclaw config set` ou `config.patch`.
    3. Exécutez `openclaw config validate` avant de redémarrer.
    4. Si vous modifiez manuellement, gardez la configuration JSON5 complète, et pas seulement l'objet partiel que vous souhaitiez modifier.
  </Accordion>
</AccordionGroup>

En relation :

- [Config](/fr/cli/config)
- [Configuration : rechargement à chaud](/fr/gateway/configuration#config-hot-reload)
- [Configuration : validation stricte](/fr/gateway/configuration#strict-validation)
- [Doctor](/fr/gateway/doctor)

## Avertissements de sonde de Gateway

Utilisez ceci lorsque `openclaw gateway probe` atteint une cible, mais affiche toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Si l'avertissement concerne le repli SSH, plusieurs passerelles, des portées manquantes ou des références d'authentification non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → échec de la configuration SSH, mais la commande a tout de même tenté les cibles configurées/boucle directes.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration intentionnelle de plusieurs passerelles ou des écouteurs périmés/en double.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → connexion réussie, mais le RPC de détail est limité par la portée ; associez l'identité de l'appareil ou utilisez des informations d'identification avec `operator.read`.
- `Capability: pairing-pending` ou `gateway closed (1008): pairing required` → la passerelle a répondu, mais ce client a toujours besoin d'un couplage/approbation avant un accès opérateur normal.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → le matériel d'authentification n'était pas disponible dans ce chemin de commande pour la cible ayant échoué.

Connexes :

- [Gateway](/fr/cli/gateway)
- [Plusieurs passerelles sur le même hôte](/fr/gateway#multiple-gateways-same-host)
- [Accès distant](/fr/gateway/remote)

## Canal connecté, messages ne circulant pas

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
- Autorisations/portées API du canal manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'autorisation/autorisation de canal.

Connexes :

- [Dépannage de canal](/fr/channels/troubleshooting)
- [Discord](/fr/channels/discord)
- [Telegram](/fr/channels/telegram)
- [WhatsApp](/fr/channels/whatsapp)

## Livraison de Cron et Heartbeat

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
- Raisons de l'ignorance du heartbeat (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `cron: scheduler disabled; jobs will not run automatically` → cron désactivé. - `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/exécution. - `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre d'heures actives. - `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient que des
    lignes vides / en-têtes markdown, donc OpenClaw ignore l'appel au model. - `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune des tâches n'est prévue pour ce tick. - `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de livraison du heartbeat. - `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat a
    été résolue vers une destination de type DM alors que `agents.defaults.heartbeat.directPolicy` (ou la priorité par agent) est défini sur `block`.
  </Accordion>
</AccordionGroup>

Connexes :

- [Heartbeat](/fr/gateway/heartbeat)
- [Tâches planifiées](/fr/automation/cron-jobs)
- [Tâches planifiées : dépannage](/fr/automation/cron-jobs#troubleshooting)

## Nœud couplé, échec de l'outil

Si un nœud est couplé mais que les outils échouent, isolez l'état du premier plan, des autorisations et des approbations.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Rechercher :

- Nœud en ligne avec les capacités attendues.
- Autorisations du système d'exploitation pour la caméra, le microphone, la localisation et l'écran.
- Approbations d'exécution et état de la liste d'autorisation.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application node doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → permission OS manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste d'autorisation.

Connexes :

- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Dépannage de nœud](/fr/nodes/troubleshooting)
- [Nœuds](/fr/nodes/index)

## Échec de l'outil de navigateur

Utilisez ceci lorsque les actions de l'outil de navigateur échouent alors que la passerelle elle-même est en bonne santé.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Rechercher :

- Si `plugins.allow` est défini et inclut `browser`.
- Chemin d'exécutable de navigateur valide.
- Accessibilité du profil CDP.
- Disponibilité locale de Chrome pour les profils `existing-session` / `user`.

<AccordionGroup>
  <Accordion title="Signature de plugin / exécutable">
    - `unknown command "browser"` ou `unknown command 'browser'` → le plugin de navigateur inclus est exclu par `plugins.allow`.
    - outil de navigateur manquant / indisponible alors que `browser.enabled=true` → `plugins.allow` exclut `browser`, donc le plugin n'a jamais été chargé.
    - `Failed to start Chrome CDP on port` → le processus du navigateur n'a pas pu démarrer.
    - `browser.executablePath not found` → le chemin configuré n'est pas valide.
    - `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
    - `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → l'installation actuelle de la passerelle manque de la dépendance d'exécution `playwright-core` du plugin de navigateur inclus ; exécutez `openclaw doctor --fix`, puis redémarrez la passerelle. Les instantanés ARIA et les captures d'écran de page de base peuvent toujours fonctionner, mais la navigation, les instantanés IA, les captures d'écran d'éléments par sélecteur CSS et l'exportation PDF restent indisponibles.
  </Accordion>
  <Accordion title="Chrome MCP / existing-session signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session n'a pas encore pu s'attacher au répertoire de données du navigateur sélectionné. Ouvrez la page d'inspection du navigateur, activez le débogage à distance, gardez le navigateur ouvert, approuvez la première invite d'attachement, puis réessayez. Si l'état de connexion n'est pas requis, préférez le profil géré `openclaw`.
    - `No Chrome tabs found for profile="user"` → le profil d'attachement Chrome MCP n'a aucun onglet Chrome local ouvert.
    - `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible depuis l'hôte de la passerelle.
    - `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil d'attachement uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.
  </Accordion>
  <Accordion title="Élément / capture d'écran / signatures de téléchargement">
    - `fullPage is not supported for element screenshots` → demande de capture d'écran `--full-page` mixte avec `--ref` ou `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser la capture de page ou un `--ref` d'instantané, pas `--element` CSS.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → les hooks de téléchargement Chrome MCP ont besoin de références d'instantanés, pas de sélecteurs CSS.
    - `existing-session file uploads currently support one file at a time.` → envoyez un téléchargement par appel sur les profils Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → les hooks de boîte de dialogue sur les profils Chrome MCP ne prennent pas en charge les substitutions de délai d'attente.
    - `existing-session type does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:type` sur les profils `profile="user"` / Chrome MCP de session existante, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'attente personnalisé est requis.
    - `existing-session evaluate does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:evaluate` sur les profils `profile="user"` / Chrome MCP de session existante, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'attente personnalisé est requis.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
    - substitutions de viewport obsolète / mode sombre / langue / hors ligne sur les profils CDP attachés uniquement ou distants → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer toute la passerelle.
  </Accordion>
</AccordionGroup>

Connexe :

- [Navigateur (géré par OpenClaw)](/fr/tools/browser)
- [Dépannage du navigateur](/fr/tools/browser-linux-troubleshooting)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des pannes après mise à niveau sont dues à une dérive de la configuration ou à l'application stricte de valeurs par défaut plus strictes.

<AccordionGroup>
  <Accordion title="1. Le comportement de la priorité de l'authentification et de l'URL a changé">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    Ce qu'il faut vérifier :

    - Si `gateway.mode=remote`, les appels CLI peuvent cibler un service distant alors que votre service local fonctionne correctement.
    - Les appels explicites `--url` ne reviennent pas aux informations d'identification stockées.

    Signatures courantes :

    - `gateway connect failed:` → mauvaise cible d'URL.
    - `unauthorized` → point de terminaison accessible mais mauvaise authentification.

  </Accordion>
  <Accordion title="2. Les gardes-fous de liaison et d'authentification sont plus stricts">
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
    - `Connectivity probe: failed` alors que le runtime est en cours d'exécution → passerelle active mais inaccessible avec l'authentification/l'URL actuelle.

  </Accordion>
  <Accordion title="3. L'état du jumelage et de l'identité de l'appareil a changé">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    Ce qu'il faut vérifier :

    - Les approbations d'appareils en attente pour le tableau de bord/les nœuds.
    - Les approbations de jumelage DM en attente après des modifications de stratégie ou d'identité.

    Signatures courantes :

    - `device identity required` → authentification de l'appareil non satisfaite.
    - `pairing required` → l'expéditeur/l'appareil doit être approuvé.

  </Accordion>
</AccordionGroup>

Si la configuration du service et le runtime sont toujours en désaccord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexes :

- [Authentification](/fr/gateway/authentication)
- [Outil d'exécution en arrière-plan et de processus](/fr/gateway/background-process)
- [Jumelage détenu par Gateway](/fr/gateway/pairing)

## Connexes

- [Docteur](/fr/gateway/doctor)
- [FAQ](/fr/help/faq)
- [Manuel de procédures Gateway](/fr/gateway)
