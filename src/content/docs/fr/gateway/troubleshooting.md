---
summary: "Livre de procédures approfondi de troubleshooting pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Troubleshooting"
sidebarTitle: "Troubleshooting"
---

Cette page est le runbook approfondi. Commencez par [/help/troubleshooting](/fr/help/troubleshooting) si vous souhaitez d'abord le flux de triage rapide.

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
- `openclaw doctor` signale aucun problème bloquant de configuration/service.
- `openclaw channels status --probe` affiche l'état du transport en direct par compte et, si pris en charge, les résultats de sondage/audit tels que `works` ou `audit ok`.

## Installations avec split brain et protection de configuration plus récente

Utilisez ceci lorsqu'un service de passerelle s'arrête de manière inattendue après une mise à jour, ou lorsque les journaux indiquent qu'un binaire `openclaw` est plus ancien que la version qui a écrit `openclaw.json` pour la dernière fois.

OpenClaw appose les écritures de configuration avec `meta.lastTouchedVersion`. Les commandes en lecture seule peuvent toujours inspecter une configuration écrite par un OpenClaw plus récent, mais les mutations de processus et de services refusent de continuer à partir d'un binaire plus ancien. Les actions bloquées incluent le démarrage, l'arrêt, le redémarrage, la désinstallation, la réinstallation forcée du service, le démarrage de la passerelle en mode service, et le nettoyage de port `gateway --force`.

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="Corriger PATH">
    Corrigez `PATH` afin que `openclaw` résolve vers l'installation plus récente, puis réexécutez l'action.
  </Step>
  <Step title="Réinstaller le service de passerelle">
    Réinstallez le service de passerelle prévu depuis l'installation plus récente :

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

## Lien symbolique de compétence ignoré en tant qu'échappement de chemin

Utilisez ceci lorsque les journaux incluent :

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw traite chaque racine de compétence comme une limite de confinement. Un lien symbolique sous
`~/.agents/skills`, `<workspace>/.agents/skills`, `<workspace>/skills`, ou
`~/.openclaw/skills` est ignoré lorsque sa cible réelle résout en dehors de cette racine
sauf si la cible est explicitement approuvée.

Inspecter le lien :

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

Si la cible est intentionnelle, configurez à la fois la racine directe de la compétence et la
cible de lien symbolique autorisée :

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

Démarrez ensuite une nouvelle session ou attendez que l'observateur de compétences (skills watcher) s'actualise. Redémarrez la
passerelle si le processus en cours date d'avant la modification de la configuration.

N'utilisez pas de cibles larges telles que `~`, `/`, ou un dossier de projet synchronisé entier.
Gardez `allowSymlinkTargets` limité à la racine réelle de la compétence qui contient des répertoires `SKILL.md` de confiance.

Connexe :

- [Configuration des Skills](/fr/tools/skills-config#symlinked-sibling-repos)
- [Exemples de configuration](/fr/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 utilisation supplémentaire requise pour le contexte long

Utilisez ceci lorsque les journaux/erreurs incluent : `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Opus/Sonnet Anthropic sélectionné a `params.context1m: true`.
- Les identifiants Anthropic actuels ne sont pas éligibles pour une utilisation à contexte long.
- Les requêtes échouent uniquement sur les sessions longues/exécutions de modèle qui nécessitent le chemin bêta 1M.

Options de correction :

<Steps>
  <Step title="Disable context1m">Désactivez `context1m` pour ce modèle afin de revenir à la fenêtre de contexte normale.</Step>
  <Step title="Use an eligible credential">Utilisez un identifiant Anthropic éligible pour les requêtes à contexte long, ou passez à une clé Anthropic de API.</Step>
  <Step title="Configurer les modèles de repli">Configurez les modèles de repli pour que les exécutions continuent lorsque les demandes de contexte long d'Anthropic sont rejetées.</Step>
</Steps>

Connexe :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation des jetons et coûts](/fr/reference/token-use)
- [Pourquoi vois-je des erreurs HTTP 429 de la part de Anthropic ?](/fr/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Le backend local compatible OpenAI réussit les sondages directs mais les exécutions de l'agent échouent

Utilisez ceci lorsque :

- `curl ... /v1/models` fonctionne
- les minuscules appels directs `/v1/chat/completions` fonctionnent
- les exécutions du modèle OpenClaw échouent uniquement lors des tours normaux de l'agent

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Recherchez :

- les appels directs minimes réussissent, mais les exécutions OpenClaw échouent uniquement sur les invites plus volumineuses
- erreurs `model_not_found` ou 404 même si le `/v1/chat/completions` direct
  fonctionne avec le même id de modèle nu
- erreurs du backend indiquant que `messages[].content` attend une chaîne
- avertissements intermittents `incomplete turn detected ... stopReason=stop payloads=0` avec un backend local compatible OpenAI
- plantages du backend qui n'apparaissent qu'avec des nombres plus élevés de jetons d'invite ou des invites complètes du runtime de l'agent

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `model_not_found` avec un serveur local style MLX/vLLM → vérifiez que `baseUrl` inclut `/v1`, que `api` est `"openai-completions"` pour les backends `/v1/chat/completions`, et que `models.providers.<provider>.models[].id` est l'identifiant local brut du fournisseur. Sélectionnez-le une fois avec le préfixe du fournisseur, par exemple `mlx/mlx-community/Qwen3-30B-A3B-6bit`; conservez l'entrée du catalogue comme `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → le backend rejette les parties de contenu structurées des Chat Completions. Correction : définissez `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `validation.keys` ou les clés de message autorisées comme `["role","content"]` → le backend rejette les métadonnées de relecture style OpenAI sur les messages de Chat Completions. Correction : définissez `models.providers.<provider>.models[].compat.strictMessageKeys: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → le backend a terminé la demande de Chat Completions mais n'a renvoyé aucun texte d'assistant visible par l'utilisateur pour ce tour. OpenClaw réessaie une fois les tours vides compatibles OpenAI et sécurisés pour la relecture ; les échecs persistants signifient généralement que le backend émet un contenu vide/non textuel ou supprime le texte de la réponse finale.
    - de minuscules demandes directes réussissent, mais les exécutions de l'agent OpenClaw échouent avec des plantages de backend/model (par exemple Gemma sur certains `inferrs` builds) → le transport OpenClaw est probablement déjà correct ; le backend échoue en raison de la forme plus grande du prompt du runtime de l'agent.
    - les échecs diminuent après la désactivation des outils mais ne disparaissent pas → les schémas d'outils faisaient partie de la pression, mais le problème restant est toujours la capacité du modèle/serveur en amont ou un bug du backend.

  </Accordion>
  <Accordion title="Options de correction">
    1. Définissez `compat.requiresStringContent: true` pour les backends de Chat Completions en mode chaîne uniquement.
    2. Définissez `compat.strictMessageKeys: true` pour les backends de Chat Completions stricts qui n'acceptent que `role` et `content` pour chaque message.
    3. Définissez `compat.supportsTools: false` pour les modèles/backends qui ne peuvent pas gérer de manière fiable la surface du schéma d'outil d'OpenClaw.
    4. Réduisez la pression du prompt lorsque cela est possible : bootstrap d'espace de travail plus petit, historique de session plus court, modèle local plus léger, ou un backend avec un support plus fort pour le long contexte.
    5. Si de minuscules requêtes directes continuent de passer alors que les tours d'agent OpenClaw plantent toujours à l'intérieur du backend, considérez cela comme une limitation du serveur/modèle amont et ouvrez un ticket de bug là-bas avec la forme de payload acceptée.
  </Accordion>
</AccordionGroup>

En relation :

- [Configuration](/fr/gateway/configuration)
- [Modèles locaux](/fr/gateway/local-models)
- [Points de termination compatibles OpenAI](/fr/gateway/configuration-reference#openai-compatible-endpoints)

## Pas de réponse

Si les canaux sont opérationnels mais que rien ne répond, vérifiez le routage et les stratégies avant de reconnecter quoi que ce soit.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Rechercher :

- Appariement en attente pour les expéditeurs de DM.
- Filtrage des mentions de groupe (`requireMention`, `mentionPatterns`).
- Incohérences dans la liste d'autorisation (allowlist) des canaux/groupes.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à mention.
- `pairing request` → l'expéditeur a besoin d'une approbation.
- `blocked` / `allowlist` → l'expéditeur/le channel a été filtré par la stratégie.

En relation :

- [Dépannage des channels](/fr/channels/troubleshooting)
- [Groupes](/fr/channels/groups)
- [Appairage](/fr/channels/pairing)

## Connectivité de l'interface utilisateur de contrôle du tableau de bord

Lorsque le tableau de bord/l'interface utilisateur de contrôle ne parvient pas à se connecter, validez l'URL, le mode d'authentification et les hypothèses de contexte sécurisé.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Rechercher :

- URL de sonde et URL du tableau de bord correctes.
- Inadéquation du mode d'authentification/du jeton entre le client et la passerelle.
- Utilisation HTTP alors que l'identité de l'appareil est requise.

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → contexte non sécurisé ou authentification d'appareil manquante.
    - `origin not allowed` → le `Origin` du navigateur n'est pas dans `gateway.controlUi.allowedOrigins` (ou vous vous connectez depuis une origine de navigateur non bouclée sans liste blanche explicite).
    - `device nonce required` / `device nonce mismatch` → le client ne termine pas le flux d'authentification d'appareil basé sur un défi (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → le client a signé la mauvaise charge utile (ou horodatage périmé) pour la poignée de main actuelle.
    - `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
    - Cette nouvelle tentative avec jeton mis en cache réutilise l'ensemble d'étendues mises en cache stockées avec le jeton d'appareil apparié. Les appelants explicites `deviceToken` / explicites `scopes` conservent leur ensemble d'étendues demandées à la place.
    - `AUTH_SCOPE_MISMATCH` → le jeton d'appareil a été reconnu, mais ses étendues approuvées ne couvrent pas cette demande de connexion ; ré-appariez ou approuvez le contrat d'étendue demandé au lieu de faire tourner un jeton de passerelle partagé.
    - En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - Sur le chemin asynchrone de l'interface de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Deux mauvaises nouvelles tentatives simultanées du même client peuvent donc afficher `retry later` lors de la deuxième tentative au lieu de deux simples inadéquations.
    - `too many failed authentication attempts (retry later)` d'un client bouclé d'origine navigateur → les échecs répétés de ce même `Origin` normalisé sont temporairement bloqués ; une autre origine localhost utilise un compartiment séparé.
    - `unauthorized` répétés après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et ré-approuvez/faites tourner le jeton d'appareil si nécessaire.
    - `gateway connect failed:` → mauvaise cible hôte/port/url.

  </Accordion>
</AccordionGroup>

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` à partir de la réponse `connect` échouée pour choisir l'action suivante :

| Code de détail               | Signification                                                                                                                                                                                                                       | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                                                                                                                                                                   | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                                                                                                                                                                                                                    |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle.                                                                                                                                                    | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Les nouvelles tentatives avec jeton mis en cache réutilisent les étendues approuvées stockées ; les appelants explicites `deviceToken` / `scopes` conservent les étendues demandées. En cas d'échec persistant, exécutez la [liste de contrôle de récupération de dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton mis en cache par appareil est périmé ou révoqué.                                                                                                                                                                           | Faites pivoter/réapprouvez le jeton d'appareil à l'aide de la [CLI devices](CLI/en/cli/devices), puis reconnectez-vous.                                                                                                                                                                                                                                                                                               |
| `AUTH_SCOPE_MISMATCH`        | Le jeton d'appareil est valide, mais son rôle/étendues approuvés ne couvrent pas cette demande de connexion.                                                                                                                        | Jumelez à nouveau l'appareil ou approuvez le contrat d'étendue demandé ; ne traitez pas cela comme une dérive de jeton partagé.                                                                                                                                                                                                                                                                                       |
| `PAIRING_REQUIRED`           | L'identité de l'appareil nécessite une approbation. Vérifiez `error.details.reason` pour `not-paired`, `scope-upgrade`, `role-upgrade` ou `metadata-upgrade`, et utilisez `requestId` / `remediationHint` lorsqu'ils sont présents. | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`. Les mises à niveau d'étendue/de rôle utilisent le même flux après avoir examiné l'accès demandé.                                                                                                                                                                                                               |

<Note>
  Les RPC backend de bouclage direct authentifiés avec le jeton/mot de passe partagé de la passerelle ne doivent pas dépendre de la ligne de base de l'étendue de l'appareil jumelé de la CLI. Si les sous-agents ou d'autres appels internes échouent toujours avec CLI`scope-upgrade`, vérifiez que l'appelant utilise `client.id: "gateway-client"` et `client.mode: "backend"` et ne force pas un
  `deviceIdentity` explicite ou un jeton d'appareil.
</Note>

Vérification de la migration de l'authentification appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux indiquent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

<Steps>
  <Step title="Wait for connect.challenge">Le client attend la `connect.challenge` émise par la passerelle.</Step>
  <Step title="Sign the payload">Le client signe la charge utile liée au challenge.</Step>
  <Step title="Send the device nonce">Le client envoie `connect.params.device.nonce` avec le même nonce de challenge.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` est refusé de manière inattendue :

- les sessions de jetons d'appareil couplé ne peuvent gérer que **leur propre** appareil, sauf si l'appelant possède également `operator.admin`
- `openclaw devices rotate --scope ...` ne peut demander que les portées d'opérateur que la session de l'appelant possède déjà

Connexes :

- [Configuration](/fr/gateway/configuration) (modes d'authentification du Gateway)
- [Interface de contrôle](/fr/web/control-ui)
- [Appareils](/fr/cli/devices)
- [Accès à distance](/fr/gateway/remote)
- [Authentification via proxy de confiance](/fr/gateway/trusted-proxy-auth)

## Gateway service non démarré

Utilisez cette section lorsque le service est installé mais que le processus ne reste pas actif.

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
- Conflits de port/écouteur.
- Installations supplémentaires de launchd/systemd/schtasks lorsque `--deep` est utilisé.
- Indices de nettoyage `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Common signatures">
    - `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle local n'est pas activé, ou le fichier de configuration a été écrasé et `gateway.mode` a été perdu. Solution : définissez `gateway.mode="local"` dans votre configuration, ou relancez `openclaw onboard --mode local` / `openclaw setup`OpenClaw pour rétablir la configuration locale attendue. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
    - `refusing to bind gateway ... without auth` → liaison non bouclée sans chemin d'authentification passerelle valide (jeton/mot de passe, ou trusted-proxy si configuré).
    - `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.
    - `Other gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks périmées ou parallèles existent. La plupart des configurations doivent conserver une seule passerelle par machine ; si vous avez besoin de plus d'une, isolez les ports + configuration/état/espace de travail. Voir [/gateway#multiple-gateways-same-host](/fr/gateway#multiple-gateways-same-host).
    - `System-level OpenClaw gateway service detected` du doctor → une unité système systemd existe alors que le service de niveau utilisateur est manquant. Supprimez ou désactivez le doublon avant d'autoriser le doctor à installer un service utilisateur, ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` si l'unité système est le superviseur prévu.
    - `Gateway service port does not match current gateway config` → le superviseur installé épingle encore l'ancien `--port`. Exécutez `openclaw doctor --fix` ou `openclaw gateway install --force`, puis redémarrez le service de passerelle.

  </Accordion>
</AccordionGroup>

Connexes :

- [Outil d'exécution en arrière-plan et de processus](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Doctor](/fr/gateway/doctor)

## La passerelle a rejeté une configuration non valide

Utilisez ceci lorsque le démarrage de la passerelle échoue avec Gateway`Invalid config` ou que les journaux de rechargement à chaud indiquent
qu'il a ignoré une modification non valide.

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

Recherchez :

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- Un fichier `openclaw.json.rejected.*` horodaté à côté de la configuration active
- Un fichier `openclaw.json.clobbered.*` horodaté si `doctor --fix` a réparé une modification directe endommagée

<AccordionGroup>
  <Accordion title="Ce qui s'est passé">
    - La configuration n'a pas été validée lors du démarrage, du rechargement à chaud (hot reload) ou d'une écriture appartenant à OpenClaw.
    - Le démarrage du Gateway échoue de manière fermée au lieu de réécrire `openclaw.json`.
    - Le rechargement à chaud ignore les modifications externes non valides et conserve la configuration d'exécution actuelle active.
    - Les écritures appartenant à OpenClaw rejettent les payloads non valides ou destructifs avant la validation et enregistrent `.rejected.*`.
    - `openclaw doctor --fix` gère la réparation. Il peut supprimer les préfixes non-JSON ou restaurer la dernière copie saine connue tout en préservant le payload rejeté sous la forme `.clobbered.*`.

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
    - `.clobbered.*` existe → doctor a préservé une modification externe endommagée tout en réparant la configuration active.
    - `.rejected.*` existe → une écriture de configuration appartenant à OpenClaw a échoué aux vérifications de schéma ou d'écrasement avant la validation.
    - `Config write rejected:` → l'écriture a tenté de supprimer une forme requise, de réduire considérablement le fichier ou de persister une configuration non valide.
    - `config reload skipped (invalid config):` → une modification directe a échoué à la validation et a été ignorée par le Gateway en cours d'exécution.
    - `Invalid config at ...` → le démarrage a échoué avant le démarrage des services Gateway.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good`, ou `size-drop-vs-last-good:*` → une écriture appartenant à OpenClaw a été rejetée car elle a perdu des champs ou de la taille par rapport à la sauvegarde saine connue.
    - `Config last-known-good promotion skipped` → le candidat contenait des espaces réservés de secrets expurgés tels que `***`.

  </Accordion>
  <Accordion title="Options de correction">
    1. Exécutez `openclaw doctor --fix` pour permettre au docteur de réparer la configuration préfixée/écrasée ou de restaurer la dernière configuration connue valide.
    2. Copiez uniquement les clés souhaitées depuis `.clobbered.*` ou `.rejected.*`, puis appliquez-les avec `openclaw config set` ou `config.patch`.
    3. Exécutez `openclaw config validate` avant de redémarrer.
    4. Si vous modifiez manuellement, conservez la configuration JSON5 complète, et non seulement l'objet partiel que vous souhaitiez modifier.
  </Accordion>
</AccordionGroup>

Connexe :

- [Config](/fr/cli/config)
- [Configuration : rechargement à chaud](/fr/gateway/configuration#config-hot-reload)
- [Configuration : validation stricte](/fr/gateway/configuration#strict-validation)
- [Docteur](/fr/gateway/doctor)

## Avertissements de sonde Gateway

Utilisez ceci lorsque `openclaw gateway probe` atteint quelque chose, mais imprime toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Si l'avertissement concerne le repli SSH, plusieurs passerelles, des portées manquantes ou des références d'authentification non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → Échec de la configuration SSH, mais la commande a tout de même essayé les cibles configurées directes/boucle locale.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration intentionnelle multi-passereaux ou des écouteurs périmés/en double.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → la connexion a fonctionné, mais le RPC détaillé est limité par la portée ; associez l'identité de l'appareil ou utilisez des informations d'identification avec `operator.read`.
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → la connexion a fonctionné, mais l'ensemble complet de RPC de diagnostic a expiré ou a échoué. Traitez cela comme un Gateway accessible avec des diagnostics dégradés ; comparez `connect.ok` et `connect.rpcOk` dans la sortie `--json`.
- `Capability: pairing-pending` ou `gateway closed (1008): pairing required` → la passerelle a répondu, mais ce client a toujours besoin d'un jumelage/approbation avant l'accès normal de l'opérateur.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → les informations d'authentification n'étaient pas disponibles dans ce chemin de commande pour la cible échouée.

Connexes :

- [Gateway](/fr/cli/gateway)
- [Plusieurs passerelles sur le même hôte](/fr/gateway#multiple-gateways-same-host)
- [Accès à distance](/fr/gateway/remote)

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
- Liste d'autorisation de groupe et exigences de mention.
- Autorisations/portées de l'API du canal manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'autorisation/autorisations du canal.

Connexes :

- [Dépannage du canal](/fr/channels/troubleshooting)
- [Discord](/fr/channels/discord)
- [Telegram](/fr/channels/telegram)
- [WhatsApp](/fr/channels/whatsapp)

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
- Raisons de l'omission du heartbeat (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
    - `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/d'exécution.
    - `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre d'heures actives.
    - `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md`OpenClaw existe mais ne contient que des lignes vides / des en-têtes markdown, donc OpenClaw ignore l'appel au model.
    - `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune tâche n'est prévue pour ce tick.
    - `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de livraison du heartbeat.
    - `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat a été résolue vers une destination de style DM alors que `agents.defaults.heartbeat.directPolicy` (ou la priorité par agent) est défini sur `block`.

  </Accordion>
</AccordionGroup>

En relation :

- [Heartbeat](/fr/gateway/heartbeat)
- [Tâches planifiées](/fr/automation/cron-jobs)
- [Tâches planifiées : dépannage](/fr/automation/cron-jobs#troubleshooting)

## Nœud associé, échec de l'outil

Si un nœud est associé mais que les outils échouent, isolez l'état du premier plan, des autorisations et des approbations.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les capacités attendues.
- Autorisations du système d'exploitation pour la caméra/micro/localisation/écran.
- Approbations d'exécution et état de la liste blanche.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation OS manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste blanche.

Connexe :

- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Dépannage du nœud](/fr/nodes/troubleshooting)
- [Nœuds](/fr/nodes/index)

## Échec de l'outil navigateur

Utilisez ceci lorsque les actions de l'outil navigateur échouent même si la passerelle elle-même est en bonne santé.

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

<AccordionGroup>
  <Accordion title="Plugin / signatures exécutables">
    - `unknown command "browser"` ou `unknown command 'browser'` → le plugin de navigateur inclus est exclu par `plugins.allow`.
    - outil de navigateur manquant / indisponible pendant que `browser.enabled=true` → `plugins.allow` exclut `browser`, donc le plugin n'a jamais été chargé.
    - `Failed to start Chrome CDP on port` → le processus du navigateur n'a pas pu démarrer.
    - `browser.executablePath not found` → le chemin configuré n'est pas valide.
    - `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
    - `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → l'installation actuelle de la passerelle manque la dépendance d'exécution principale du navigateur ; réinstallez ou mettez à jour OpenClaw, puis redémarrez la passerelle. Les instantanés ARIA et les captures d'écran de page de base peuvent toujours fonctionner, mais la navigation, les instantanés IA, les captures d'écran d'éléments par sélecteur CSS et l'export PDF restent indisponibles.

  </Accordion>
  <Accordion title="Chrome MCP / signatures de session existante">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP session existante n'a pas encore pu s'attacher au répertoire de données du navigateur sélectionné. Ouvrez la page d'inspection du navigateur, activez le débogage à distance, gardez le navigateur ouvert, approuvez la première invite d'attachement, puis réessayez. Si l'état de connexion n'est pas requis, préférez le profil géré `openclaw`.
    - `No Chrome tabs found for profile="user"` → le profil d'attachement Chrome MCP n'a aucun onglet Chrome local ouvert.
    - `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible depuis l'hôte de la passerelle.
    - `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil d'attachement uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → demande de capture d'écran `--full-page` mixte avec `--ref` ou `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser une capture de page ou un instantané `--ref`, et non un sélecteur CSS `--element`.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → les hooks de téléchargement Chrome MCP ont besoin de références d'instantanés, et non de sélecteurs CSS.
    - `existing-session file uploads currently support one file at a time.` → envoyer un téléchargement par appel sur les profils Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → les hooks de boîte de dialogue sur les profils Chrome MCP ne prennent pas en charge la substitution du délai d'expiration.
    - `existing-session type does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:type` sur les profils de session existante `profile="user"` / Chrome MCP, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'expiration personnalisé est requis.
    - `existing-session evaluate does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:evaluate` sur les profils de session existante `profile="user"` / Chrome MCP, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'expiration personnalisé est requis.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
    - substitutions de viewport obsolète / mode sombre / langue / hors ligne sur les profils CDP attachement-seul ou distant → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer l'intégralité de la passerelle.

  </Accordion>
</AccordionGroup>

Connexe :

- [Navigateur (géré par OpenClaw)](/fr/tools/browser)
- [Dépannage du navigateur](/fr/tools/browser-linux-troubleshooting)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des ruptures post-mise à niveau sont dues à une dérive de la configuration ou à des paramètres par défaut plus strictes désormais appliqués.

<AccordionGroup>
  <Accordion title="1. Le comportement de remplacement de l'authentification et de l'URL a changé">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    Ce qu'il faut vérifier :

    - Si `gateway.mode=remote`, les appels du CLI peuvent cibler une instance distante alors que votre service local fonctionne correctement.
    - Les appels explicites `--url` ne reviennent pas aux informations d'identification stockées.

    Signatures courantes :

    - `gateway connect failed:` → mauvaise cible d'URL.
    - `unauthorized` → point de terminaison accessible mais mauvaise authentification.

  </Accordion>
  <Accordion title="2. Les garde-fous de liaison et d'authentification sont plus stricts">
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
    - `Connectivity probe: failed` alors que le runtime est en cours d'exécution → passerelle opérationnelle mais inaccessible avec l'authentification/l'URL actuelle.

  </Accordion>
  <Accordion title="3. L'état de l'appareillage et de l'identité de l'appareil a changé">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    Ce qu'il faut vérifier :

    - Approbations d'appareil en attente pour les tableaux de bord/nœuds.
    - Approbations d'appareillage DM en attente après des modifications de stratégie ou d'identité.

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
- [Appareillage détenu par le Gateway](/fr/gateway/pairing)

## Connexes

- [Doctor](/fr/gateway/doctor)
- [FAQ](/fr/help/faq)
- [Gateway runbook](Gateway/en/gateway)
