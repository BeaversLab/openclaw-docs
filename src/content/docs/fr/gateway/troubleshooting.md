---
summary: "Guide de dépannage approfondi pour la passerelle, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Troubleshooting"
sidebarTitle: "Troubleshooting"
---

Cette page est le guide de procédures détaillé. Commencez par [/help/troubleshooting](/fr/help/troubleshooting) si vous souhaitez d'abord suivre le processus de triage rapide.

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
- `openclaw channels status --probe` affiche l'état du transport en direct par compte et, si pris en charge, les résultats des sondes/audits tels que `works` ou `audit ok`.

## Après une mise à jour

Utilisez ceci lorsqu'une mise à jour se termine mais que la Gateway est arrêtée, que les canaux sont vides, ou
que les appels au modèle commencent à échouer avec des 401.

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

Recherchez :

- `Update restart` dans `openclaw status` / `openclaw status --all`. Les remises en attente ou
  échouées incluent la prochaine commande à exécuter.
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  sous Channels (Canaux). Cela signifie que la configuration du canal existe toujours, mais que l'enregistrement
  du plugin a échoué avant que le canal puisse être chargé.
- provider 401s après réauthentification. `openclaw doctor --fix` vérifie les ombres d'auth OAuth par agent périmées et supprime les anciennes copies afin que tous les agents résolvent
  le profil partagé actuel.

## Installations split brain et garde de configuration plus récente

Utilisez ceci lorsqu'un service de passerelle s'arrête de manière inattendue après une mise à jour, ou que les journaux indiquent qu'un binaire `openclaw` est plus ancien que la version qui a écrit `openclaw.json` pour la dernière fois.

OpenClaw estampille les écritures de configuration avec `meta.lastTouchedVersion`. Les commandes en lecture seule peuvent toujours inspecter une configuration écrite par un OpenClaw plus récent, mais les mutations de processus et de services refusent de continuer à partir d'un binaire plus ancien. Les actions bloquées incluent le démarrage, l'arrêt, le redémarrage, la désinstallation, la réinstallation forcée du service, le démarrage de la passerelle en mode service, et le nettoyage des ports `gateway --force`.

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="Fix PATH">
    Corrigez `PATH` pour que `openclaw` résolve vers la nouvelle installation, puis relancez l'action.
  </Step>
  <Step title="Reinstall the gateway service">
    Réinstallez le service Gateway prévu depuis la nouvelle installation :

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="Remove stale wrappers">
    Supprimez les paquets système obsolètes ou les anciennes entrées de wrapper qui pointent toujours vers un ancien binaire `openclaw`.
  </Step>
</Steps>

<Warning>Pour une rétrogradation intentionnelle ou une récupération d'urgence uniquement, définissez `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1` pour la commande unique. Laissez-le indéfini pour un fonctionnement normal.</Warning>

## Désaccord de protocole après un retour en arrière (rollback)

Utilisez ceci lorsque les journaux continuent d'imprimer `protocol mismatch`OpenClawGatewayGateway après avoir rétrogradé ou effectué un retour en arrière d'OpenClaw. Cela signifie qu'un ancien Gateway est en cours d'exécution, mais qu'un processus client local plus récent essaie toujours de se reconnecter avec une plage de protocoles que l'ancien Gateway ne peut pas comprendre.

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

Recherchez :

- `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`Gateway dans les journaux du Gateway.
- `Established clients:` dans `openclaw gateway status --deep` ou `Gateway clients` dans `openclaw doctor --deep`Gateway. Cela liste les clients TCP actifs connectés au port Gateway, y compris les PID et les lignes de commande quand le système d'exploitation le permet.
- Un processus client dont la ligne de commande pointe vers la nouvelle installation ou le nouveau wrapper OpenClaw depuis lequel vous avez effectué un retour en arrière.

Correction :

1. Arrêtez ou redémarrez le processus client obsolète OpenClaw indiqué par OpenClaw`gateway status --deep`.
2. Redémarrez les applications ou wrappers qui intègrent OpenClaw, tels que les tableaux de bord locaux, les éditeurs, les assistants de serveur d'application, ou les shells OpenClaw`openclaw logs --follow` à longue durée d'exécution.
3. Relancez `openclaw gateway status --deep` ou `openclaw doctor --deep` et confirmez que le PID du client obsolète a disparu.

Ne forcez pas un ancien Gateway à accepter un protocole plus récent incompatible. Les augmentations de protocole protègent le contrat de fil ; la récupération après retour en arrière est un problème de nettoyage de processus/version.

## Skill symlink ignoré en raison d'une échappée de chemin

Utilisez ceci lorsque les journaux incluent :

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw traite chaque racine de compétence comme une limite de confinement. Un lien symbolique sous `~/.agents/skills`, `<workspace>/.agents/skills`, `<workspace>/skills` ou `~/.openclaw/skills` est ignoré lorsque sa cible réelle est résolue en dehors de cette racine, sauf si la cible est explicitement approuvée.

Inspectez le lien :

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

Si la cible est intentionnelle, configurez à la fois la racine de compétence directe et la cible de lien symbolique autorisée :

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

Démarrez ensuite une nouvelle session ou attendez que l'observateur de compétences se rafraîchisse. Redémarrez la passerelle si le processus en cours est antérieur au changement de configuration.

N'utilisez pas de cibles larges telles que `~`, `/`, ou un dossier de projet synchronisé entier. Gardez `allowSymlinkTargets` limité à la racine de compétence réelle qui contient des répertoires `SKILL.md` approuvés.

Connexes :

- [Configuration des compétences](/fr/tools/skills-config#symlinked-sibling-repos)
- [Exemples de configuration](/fr/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 utilisation supplémentaire requise pour un contexte long

Utilisez ceci lorsque les journaux/erreurs incluent : `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Anthropic Opus/Sonnet sélectionné dispose de `params.context1m: true`.
- L'identifiant Anthropic actuel n'est pas éligible pour une utilisation à contexte long.
- Les requêtes échouent uniquement sur les sessions/exécutions de modèle longues qui nécessitent le chemin bêta 1M.

Options de correction :

<Steps>
  <Step title="Désactiver context1m">Désactivez `context1m` pour ce modèle afin de revenir à la fenêtre de contexte normale.</Step>
  <Step title="Utiliser un identifiant éligible">Utilisez un identifiant Anthropic éligible pour les requêtes à contexte long, ou basculez vers une clé Anthropic API.</Step>
  <Step title="Configurer les modèles de repli">Configurez les modèles de repli pour que les exécutions continuent lorsque les requêtes Anthropic à contexte long sont rejetées.</Step>
</Steps>

En relation :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation des tokens et coûts](/fr/reference/token-use)
- [Pourquoi vois-je HTTP 429 de la part de Anthropic ?](/fr/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Le backend compatible OpenAI local passe les sondages directs mais les exécutions de l'agent échouent

À utiliser lorsque :

- `curl ... /v1/models` fonctionne
- les tiny directs `/v1/chat/completions` calls fonctionnent
- Les exécutions du model OpenClaw échouent uniquement lors des tours normaux de l'agent

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Recherchez :

- les tiny directs réussissent, mais les exécutions OpenClaw échouent uniquement sur les invites plus volumineuses
- Erreurs `model_not_found` ou 404 même si le direct `/v1/chat/completions`
  fonctionne avec le même id de model nu
- erreurs du backend concernant `messages[].content` attendant une chaîne
- avertissements `incomplete turn detected ... stopReason=stop payloads=0` intermittents avec un backend local compatible OpenAI
- plantages du backend qui n'apparaissent qu'avec des comptages de tokens d'invite plus élevés ou des invites complètes du runtime de l'agent

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `model_not_found` avec un serveur local de style MLX/vLLM → vérifiez que `baseUrl` inclut `/v1`, que `api` est `"openai-completions"` pour les backends `/v1/chat/completions`, et que `models.providers.<provider>.models[].id` est l'ID local brut du fournisseur. Sélectionnez-le une fois avec le préfixe du fournisseur, par exemple `mlx/mlx-community/Qwen3-30B-A3B-6bit` ; conservez l'entrée du catalogue comme `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → le backend rejette les parties de contenu structuré des Chat Completions. Correctif : définissez `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `validation.keys` ou des clés de message autorisées comme `["role","content"]` → le backend rejette les métadonnées de relecture de style OpenAI sur les messages de Chat Completions. Correctif : définissez `models.providers.<provider>.models[].compat.strictMessageKeys: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → le backend a terminé la demande de Chat Completions mais n'a renvoyé aucun texte d'assistant visible par l'utilisateur pour ce tour. OpenClaw réessaie une fois les tours vides compatibles OpenAI et sécurisés pour la relecture ; les échecs persistants signifient généralement que le backend émet un contenu vide/non textuel ou qu'il supprime le texte de la réponse finale.
    - de minuscules demandes directes réussissent, mais les exécutions de l'agent OpenClaw échouent avec des plantages de backend/model (par exemple Gemma sur certains builds `inferrs`) → le transport OpenClaw est probablement déjà correct ; le backend échoue en raison de la forme plus importante du prompt du runtime de l'agent.
    - les échecs diminuent après la désactivation des outils mais ne disparaissent pas → les schémas d'outils faisaient partie de la pression, mais le problème restant est toujours une capacité amont du modèle/serveur ou un bug du backend.

  </Accordion>
  <Accordion title="Options de correction">
    1. Définissez `compat.requiresStringContent: true` pour les backends de complétion de chat en mode chaîne uniquement.
    2. Définissez `compat.strictMessageKeys: true` pour les backends de complétion de chat stricts qui n'acceptent que `role` et `content` sur chaque message.
    3. Définissez `compat.supportsTools: false`OpenClawOpenClaw pour les modèles/backends qui ne peuvent pas gérer fiacement la surface du schéma d'outil d'OpenClaw.
    4. Réduisez la pression du prompt lorsque cela est possible : démarrage d'espace de travail plus petit, historique de session plus court, modèle local plus léger, ou un backend avec un support plus fort pour le contexte long.
    5. Si de minuscules requêtes directes continuent de passer alors que les tours d'agent OpenClaw plantent toujours à l'intérieur du backend, traitez-le comme une limitation du serveur/modèle en amont et signalez un bug reproductible avec la forme de payload acceptée.
  </Accordion>
</AccordionGroup>

Connexe :

- [Configuration](/fr/gateway/configuration)
- [Modèles locaux](/fr/gateway/local-models)
- [Points de terminaison compatibles OpenAI](OpenAI/en/gateway/configuration-reference#openai-compatible-endpoints)

## Aucune réponse

Si les canaux sont opérationnels mais que rien ne répond, vérifiez le routage et les règles avant de reconnecter quoi que ce soit.

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
- Inadéquations de la liste d'autorisation (allowlist) des canaux/groupes.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à la mention.
- `pairing request` → l'expéditeur a besoin d'une approbation.
- `blocked` / `allowlist` → l'expéditeur/le canal a été filtré par la règle.

Connexe :

- [Dépannage des canaux](/fr/channels/troubleshooting)
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
- Inadéquation du mode/jeton d'authentification entre le client et la passerelle.
- Utilisation HTTP alors que l'identité de l'appareil est requise.

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → contexte non sécurisé ou authentification de l'appareil manquante.
    - `origin not allowed` → le `Origin` du navigateur n'est pas dans `gateway.controlUi.allowedOrigins` (ou vous vous connectez depuis une origine de navigateur non bouclage sans liste blanche explicite).
    - `device nonce required` / `device nonce mismatch` → le client ne termine pas le flux d'authentification de l'appareil basé sur un défi (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → le client a signé la mauvaise charge utile (ou horodatage périmé) pour la poignée de main actuelle.
    - `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
    - Cette nouvelle tentative avec jeton mis en cache réutilise l'ensemble de portées mises en cache stockées avec le jeton d'appareil appairé. Les appelants explicites `deviceToken` / explicites `scopes` conservent plutôt leur ensemble de portées demandé.
    - `AUTH_SCOPE_MISMATCH` → le jeton d'appareil a été reconnu, mais ses portées approuvées ne couvrent pas cette demande de connexion ; réappareiller ou approuver le contrat de portée demandé au lieu de faire pivoter un jeton de passerelle partagé.
    - En dehors de ce chemin de nouvelle tentative, la priorité de l'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - Sur le chemin asynchrone de l'interface de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Deux mauvaises nouvelles tentatives simultanées du même client peuvent donc faire surface `retry later` lors de la deuxième tentative au lieu de deux simples discordances.
    - `too many failed authentication attempts (retry later)` provenant d'un client bouclage d'origine navigateur → des échecs répétés de ce même `Origin` normalisé sont temporairement verrouillés ; une autre origine localhost utilise un compartiment séparé.
    - `unauthorized` répétés après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; rafraîchir la configuration du jeton et réapprouver/faire pivoter le jeton d'appareil si nécessaire.
    - `gateway connect failed:` → mauvaise cible hôte/port/url.

  </Accordion>
</AccordionGroup>

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` à partir de la réponse `connect` ayant échoué pour choisir l'action suivante :

| Code de détail               | Signification                                                                                                                                                                                                                  | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                                                                                                                                                              | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                                                                                                                                                                                                                    |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle.                                                                                                                                               | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Les nouvelles tentatives avec jeton en cache réutilisent les étendues approuvées stockées ; les appelants explicites `deviceToken` / `scopes` conservent les étendues demandées. En cas d'échec persistant, exécutez la [liste de vérification de récupération de dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton mis en cache par appareil est périmé ou révoqué.                                                                                                                                                                      | Faites pivoter/réapprouvez le jeton de l'appareil en utilisant la [CLI des appareils](CLI/en/cli/devices), puis reconnectez-vous.                                                                                                                                                                                                                                                                                     |
| `AUTH_SCOPE_MISMATCH`        | Le jeton de l'appareil est valide, mais son rôle/étendues approuvés ne couvrent pas cette demande de connexion.                                                                                                                | Reassociez l'appareil ou approuvez le contrat d'étendue demandé ; ne traitez pas cela comme une dérive de jeton partagé.                                                                                                                                                                                                                                                                                              |
| `PAIRING_REQUIRED`           | L'identité de l'appareil doit être approuvée. Vérifiez `error.details.reason` pour `not-paired`, `scope-upgrade`, `role-upgrade`, ou `metadata-upgrade`, et utilisez `requestId` / `remediationHint` lorsqu'ils sont présents. | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`. Les mises à niveau d'étendue/de rôle utilisent le même flux après avoir examiné l'accès demandé.                                                                                                                                                                                                               |

<Note>
  Les RPC backend en boucle directe authentifiés avec le jeton/mot de passe partagé de la passerelle ne doivent pas dépendre de la ligne de base de l'étendue des appareils associés de la CLI. Si les sous-agents ou autres appels internes échouent toujours avec CLI`scope-upgrade`, vérifiez que l'appelant utilise `client.id: "gateway-client"` et `client.mode: "backend"` et ne force pas un
  `deviceIdentity` explicite ou un jeton d'appareil.
</Note>

Vérification de la migration de l'authentification appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux indiquent des erreurs de nonce/signature, mettez à jour le client de connexion et vérifiez-le :

<Steps>
  <Step title="Wait for connect.challenge">Le client attend le `connect.challenge` émis par la passerelle.</Step>
  <Step title="Sign the payload">Le client signe la charge utile liée au défi.</Step>
  <Step title="Send the device nonce">Le client envoie `connect.params.device.nonce` avec le même nonce de défi.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` est refusé de manière inattendue :

- les sessions de jetons d'appareils jumelés ne peuvent gérer que **leur propre** appareil, sauf si l'appelant possède également `operator.admin`
- `openclaw devices rotate --scope ...` ne peut demander que des portées d'opérateur que la session de l'appelant possède déjà

Connexes :

- [Configuration](/fr/gateway/configuration) (modes d'auth de la passerelle)
- [Interface de contrôle](/fr/web/control-ui)
- [Appareils](/fr/cli/devices)
- [Accès à distance](/fr/gateway/remote)
- [Authentification via proxy de confiance](/fr/gateway/trusted-proxy-auth)

## Le service Gateway n'est pas en cours d'exécution

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
- Conflits de port/écouteur.
- Installations launchd/systemd/schtasks supplémentaires lorsque `--deep` est utilisé.
- Indices de nettoyage `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Common signatures">
    - `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle locale n'est pas activé, ou le fichier de configuration a été écrasé et `gateway.mode` a été perdu. Correction : définissez `gateway.mode="local"` dans votre configuration, ou relancez `openclaw onboard --mode local` / `openclaw setup` pour réappliquer la configuration locale attendue. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
    - `refusing to bind gateway ... without auth` → liaison non-boucle (non-loopback) sans chemin d'authentification passerelle valide (jeton/mot de passe, ou proxy de confiance si configuré).
    - `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.
    - `Other gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks périmées ou parallèles existent. La plupart des installations doivent conserver une seule passerelle par machine ; si vous en avez besoin de plus d'une, isolez les ports + la configuration/l'état/l'espace de travail. Voir [/gateway#multiple-gateways-same-host](/fr/gateway#multiple-gateways-same-host).
    - `System-level OpenClaw gateway service detected` du doctor → une unité système systemd existe alors que le service de niveau utilisateur est manquant. Supprimez ou désactivez le doublon avant d'autoriser le doctor à installer un service utilisateur, ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` si l'unité système est le superviseur prévu.
    - `Gateway service port does not match current gateway config` → le superviseur installé cible toujours l'ancien `--port`. Exécutez `openclaw doctor --fix` ou `openclaw gateway install --force`, puis redémarrez le service de la passerelle.

  </Accordion>
</AccordionGroup>

Connexes :

- [Outil d'exécution en arrière-plan et de processus](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Doctor](/fr/gateway/doctor)

## Gateway s'arrête lors d'une utilisation élevée de la mémoire

Utilisez ceci lorsque la Gateway disparaît sous charge, que le superviseur signale un redémarrage de type OOM, ou que les journaux mentionnent `critical memory pressure bundle written`.

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

Recherchez :

- `Reason: diagnostic.memory.pressure.critical` dans le dernier bundle de stabilité.
- `Memory pressure:` avec `critical/rss_threshold`, `critical/heap_threshold`, ou `critical/rss_growth`.
- `V8 heap:` valeurs proches de la limite du tas.
- `Largest session files:` entrées telles que `agents/<agent>/sessions/<session>.jsonl` ou `sessions/<session>.jsonl`.
- Compteurs de mémoire cgroup Linux lorsque la passerelle s'exécute dans un conteneur ou un service à mémoire limitée.

Signatures courantes :

- `critical memory pressure bundle written` apparaît peu avant le redémarrage → OpenClaw a capturé un bundle de stabilité pré-OOM. Inspectez-le avec `openclaw gateway stability --bundle latest`.
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` apparaît dans les journaux de la passerelle → OpenClaw a détecté une pression critique sur la mémoire, mais l'instantané de stabilité pré-OOM est désactivé.
- `Largest session files:` pointe vers un chemin de transcription expurgé très volumineux → réduisez l'historique des sessions conservées, inspectez la croissance des sessions ou déplacez les anciennes transcriptions hors du stockage actif avant de redémarrer.
- `V8 heap:` octets utilisés sont proches de la limite du tas → réduisez la pression du prompt/session, réduisez le travail simultané, ou augmentez la limite du tas Node uniquement après avoir confirmé que la charge de travail est attendue.
- `Memory pressure: critical/rss_growth` → la mémoire a augmenté rapidement à l'intérieur d'une fenêtre d'échantillonnage. Vérifiez les derniers journaux pour une grande importation, une sortie d'outil incontrôlée, des tentatives répétées ou un lot de travail d'agent en file d'attente.
- Une pression critique sur la mémoire apparaît dans les journaux mais aucun bundle n'existe → c'est le comportement par défaut. Définissez `diagnostics.memoryPressureSnapshot: true` pour capturer le bundle de stabilité pré-OOM lors de futurs événements de pression critique sur la mémoire.

Le bundle de stabilité est sans charge utile. Il comprend des preuves de mémoire opérationnelle et des chemins de fichiers relatifs expurgés, et non le texte des messages, les corps de webhook, les identifiants, les jetons, les cookies ou les identifiants de session bruts. Joignez l'export des diagnostics aux rapports de bugs au lieu de copier les journaux bruts.

Connexes :

- [Santé du Gateway](/fr/gateway/health)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Sessions](/fr/cli/sessions)

## Gateway a rejeté une configuration non valide

Utilisez ceci lorsque le démarrage du Gateway échoue avec `Invalid config` ou que les journaux de rechargement à chaud indiquent
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
- OpenClaw conserve les 32 derniers fichiers `.clobbered.*` pour chaque chemin de configuration et fait pivoter les plus anciens

<AccordionGroup>
  <Accordion title="Ce qui s'est passé">
    - La configuration n'a pas été validée lors du démarrage, du rechargement à chaud (hot reload) ou d'une écriture appartenant à OpenClaw.
    - Le démarrage de Gateway échoue en mode fermé (fails closed) au lieu de réécrire `openclaw.json`.
    - Le rechargement à chaud ignore les modifications externes non valides et conserve la configuration d'exécution actuelle.
    - Les écritures appartenant à OpenClaw rejettent les payloads invalides ou destructeurs avant la validation et enregistrent `.rejected.*`.
    - `openclaw doctor --fix` gère la réparation. Il peut supprimer les préfixes non-JSON ou restaurer la dernière copie saine connue tout en préservant le payload rejeté sous le nom `.clobbered.*`.
    - Lorsque de nombreuses réparations surviennent pour un chemin de configuration, OpenClaw fait pivoter les anciens fichiers `.clobbered.*` afin que le payload réparé le plus récent reste disponible.

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
    - `.clobbered.*` existe → le docteur a préservé une modification externe cassée lors de la réparation de la configuration active.
    - `.rejected.*` existe → une écriture de configuration détenue par OpenClaw a échoué aux vérifications de schéma ou d'écrasement avant la validation.
    - `Config write rejected:` → l'écriture a tenté de supprimer une forme requise, de réduire considérablement le fichier ou de persister une configuration invalide.
    - `config reload skipped (invalid config):` → une modification directe a échoué à la validation et a été ignorée par le Gateway en cours d'exécution.
    - `Invalid config at ...` → le démarrage a échoué avant le démarrage des services du Gateway.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good`, ou `size-drop-vs-last-good:*` → une écriture détenue par OpenClaw a été rejetée car elle a perdu des champs ou de la taille par rapport à la dernière sauvegarde saine connue.
    - `Config last-known-good promotion skipped` → le candidat contenait des espaces réservés de secrets expurgés tels que `***`.

  </Accordion>
  <Accordion title="Options de correction">
    1. Exécutez `openclaw doctor --fix` pour laisser le docteur réparer la configuration préfixée/écrasée ou restaurer la dernière version saine connue.
    2. Copiez uniquement les clés prévues depuis `.clobbered.*` ou `.rejected.*`, puis appliquez-les avec `openclaw config set` ou `config.patch`.
    3. Exécutez `openclaw config validate` avant de redémarrer.
    4. Si vous modifiez à la main, gardez la configuration JSON5 complète, et pas seulement l'objet partiel que vous souhaitiez modifier.
  </Accordion>
</AccordionGroup>

En relation :

- [Configuration](/fr/cli/config)
- [Configuration : rechargement à chaud](/fr/gateway/configuration#config-hot-reload)
- [Configuration : validation stricte](/fr/gateway/configuration#strict-validation)
- [Docteur](/fr/gateway/doctor)

## Avertissements de sonde du Gateway

Utilisez ceci lorsque `openclaw gateway probe` atteint quelque chose, mais imprime toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Que l'avertissement concerne le repli SSH, plusieurs passerelles, des portées manquantes ou des références d'authentification non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → La configuration SSH a échoué, mais la commande a tout de même tenté les cibles configurées/boucle locale directes.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration intentionnelle de multi-passerelle ou des écouteurs obsolètes/en double.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → la connexion a réussi, mais le RPC de détail est limité par la portée ; associez l'identité de l'appareil ou utilisez des informations d'identification avec `operator.read`.
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → la connexion a réussi, mais l'ensemble complet de RPC de diagnostic a expiré ou a échoué. Traitez cela comme un Gateway joignable avec des diagnostics dégradés ; comparez `connect.ok` et `connect.rpcOk` dans la sortie de `--json`.
- `Capability: pairing-pending` ou `gateway closed (1008): pairing required` → la passerelle a répondu, mais ce client a toujours besoin d'un jumelage/approbation avant un accès opérateur normal.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → le matériel d'authentification n'était pas disponible dans ce chemin de commande pour la cible ayant échoué.

En lien :

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
- Liste blanche de groupes et exigences de mention.
- Autorisations/portées de l'API du canal manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'auth/permissions du channel.

Connexes :

- [Channel troubleshooting](/fr/channels/troubleshooting)
- [Discord](/fr/channels/discord)
- [Telegram](/fr/channels/telegram)
- [WhatsApp](/fr/channels/whatsapp)

## Livraison du cron et du heartbeat

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
  <Accordion title="Common signatures">
    - `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
    - `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/d'exécution.
    - `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre des heures actives.
    - `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient que des lignes vides / des en-têtes markdown, donc OpenClaw ignore l'appel au model.
    - `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune tâche n'est due à ce tick.
    - `heartbeat: unknown accountId` → id de compte invalide pour la cible de livraison du heartbeat.
    - `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat est résolue vers une destination de style DM alors que `agents.defaults.heartbeat.directPolicy` (ou le remplacement par agent) est défini sur `block`.

  </Accordion>
</AccordionGroup>

Connexes :

- [Heartbeat](/fr/gateway/heartbeat)
- [Tâches planifiées](/fr/automation/cron-jobs)
- [Tâches planifiées : troubleshooting](/fr/automation/cron-jobs#troubleshooting)

## Nœud couplé, tool échoue

Si un nœud est couplé mais que les tools échouent, isolez l'état de premier plan, les autorisations et l'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les fonctionnalités attendues.
- Autorisations du système d'exploitation pour la caméra/micro/position/écran.
- Approbations d'exécution et état de la liste autorisée.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation OS manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste autorisée.

Connexes :

- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Troubleshooting de nœud](/fr/nodes/troubleshooting)
- [Nœuds](/fr/nodes/index)

## Échec du tool navigateur

Utilisez ceci lorsque les actions du tool navigateur échouent même si la passerelle elle-même est saine.

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
  <Accordion title="Plugin / signatures de l'exécutable">
    - `unknown command "browser"` ou `unknown command 'browser'` → le plugin de navigateur groupé est exclu par `plugins.allow`.
    - outil de navigateur manquant / indisponible pendant `browser.enabled=true` → `plugins.allow` exclut `browser`, le plugin n'a donc jamais été chargé.
    - `Failed to start Chrome CDP on port` → échec du lancement du processus du navigateur.
    - `browser.executablePath not found` → le chemin configuré n'est pas valide.
    - `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
    - `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → l'installation actuelle de la passerelle manque la dépendance d'exécution principale du navigateur ; réinstallez ou mettez à jour OpenClaw, puis redémarrez la passerelle. Les instantanés ARIA et les captures d'écran de base peuvent toujours fonctionner, mais la navigation, les instantanés IA, les captures d'écran d'éléments par sélecteur CSS et l'export PDF restent indisponibles.

  </Accordion>
  <Accordion title="Chrome MCP / signatures de session existante">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session n'a pas encore pu s'attacher au répertoire de données du navigateur sélectionné. Ouvrez la page d'inspection du navigateur, activez le débogage à distance, gardez le navigateur ouvert, approuvez la première invite d'attachement, puis réessayez. Si l'état de connexion n'est pas requis, préférez le profil géré `openclaw`.
    - `No Chrome tabs found for profile="user"` → le profil d'attachement Chrome MCP n'a aucun onglet Chrome local ouvert.
    - `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible depuis l'hôte de la passerelle.
    - `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil d'attachement uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.

  </Accordion>
  <Accordion title="Élément / capture d'écran / signatures de téléchargement">
    - `fullPage is not supported for element screenshots` → demande de capture d'écran `--full-page` mixte avec `--ref` ou `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser la capture de page ou un `--ref` instantané, pas un `--element` CSS.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → les hooks de téléchargement Chrome MCP ont besoin de références d'instantanés, pas de sélecteurs CSS.
    - `existing-session file uploads currently support one file at a time.` → envoyez un téléchargement par appel sur les profils Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → les hooks de dialogue sur les profils Chrome MCP ne prennent pas en charge les substitutions de délai d'attente.
    - `existing-session type does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:type` sur les profils `profile="user"` / Chrome MCP de session existante, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'attente personnalisé est requis.
    - `existing-session evaluate does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:evaluate` sur les profils `profile="user"` / Chrome MCP de session existante, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'attente personnalisé est requis.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
    - substitutions de viewport obsolètes / mode sombre / langue locale / hors ligne sur les profils CDP attachés uniquement ou distants → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer toute la passerelle.

  </Accordion>
</AccordionGroup>

Connexe :

- [Navigateur (géré par OpenClaw)](/fr/tools/browser)
- [Dépannage du navigateur](/fr/tools/browser-linux-troubleshooting)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des pannes post-mise à niveau sont dues à une dérive de configuration ou à des paramètres par défaut plus stricts désormais appliqués.

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    What to check:

    - If `gateway.mode=remote`CLI, CLI calls may be targeting remote while your local service is fine.
    - Explicit `--url` calls do not fall back to stored credentials.

    Common signatures:

    - `gateway connect failed:` → wrong URL target.
    - `unauthorized` → endpoint reachable but wrong auth.

  </Accordion>
  <Accordion title="2. Bind and auth guardrails are stricter">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    What to check:

    - Non-loopback binds (`lan`, `tailnet`, `custom`) need a valid gateway auth path: shared token/password auth, or a correctly configured non-loopback `trusted-proxy` deployment.
    - Old keys like `gateway.token` do not replace `gateway.auth.token`.

    Common signatures:

    - `refusing to bind gateway ... without auth` → non-loopback bind without a valid gateway auth path.
    - `Connectivity probe: failed` while runtime is running → gateway alive but inaccessible with current auth/url.

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    What to check:

    - Pending device approvals for dashboard/nodes.
    - Pending DM pairing approvals after policy or identity changes.

    Common signatures:

    - `device identity required` → device auth not satisfied.
    - `pairing required` → sender/device must be approved.

  </Accordion>
</AccordionGroup>

If the service config and runtime still disagree after checks, reinstall service metadata from the same profile/state directory:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Related:

- [Authentication](/fr/gateway/authentication)
- [Background exec and process tool](/fr/gateway/background-process)
- [Gateway-owned pairing](Gateway/en/gateway/pairing)

## Related

- [Doctor](/fr/gateway/doctor)
- [FAQ](/fr/help/faq)
- [Gateway runbook](Gateway/en/gateway)
