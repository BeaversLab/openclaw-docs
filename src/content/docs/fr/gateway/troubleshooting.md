---
summary: "Deep troubleshooting runbook for gateway, channels, automation, nodes, and browser"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Troubleshooting"
sidebarTitle: "Troubleshooting"
---

Cette page est le runbook approfondi. Commencez par [/help/troubleshooting](/fr/help/troubleshooting) si vous souhaitez d'abord suivre le processus de triage rapide.

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
- `openclaw doctor` signale aucun problème de configuration/service bloquant.
- `openclaw channels status --probe` affiche l'état du transport en temps réel par compte et, lorsque pris en charge, les résultats des sondes/audits tels que `works` ou `audit ok`.

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

- `Update restart` dans `openclaw status` / `openclaw status --all`. Les transferts en attente ou
  échoués incluent la commande suivante à exécuter.
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  sous Channels (Canaux). Cela signifie que la configuration du canal existe toujours, mais que l'enregistrement
  du plugin a échoué avant que le canal puisse être chargé.
- provider 401s après ré-authentification. `openclaw doctor --fix` vérifie les ombres d'authentification OAuth périmées par agent et supprime les anciennes copies afin que tous les agents résolvent
  le profil partagé actuel.

## Installations split brain et garde de configuration plus récente

Utilisez ceci lorsqu'un service de passerelle s'arrête inopinément après une mise à jour, ou lorsque les journaux indiquent qu'un binaire `openclaw` est plus ancien que la version qui a écrit `openclaw.json` pour la dernière fois.

OpenClaw estampille les écritures de configuration avec `meta.lastTouchedVersion`. Les commandes en lecture seule peuvent toujours inspecter une configuration écrite par un OpenClaw plus récent, mais les mutations de processus et de services refusent de continuer à partir d'un binaire plus ancien. Les actions bloquées incluent le démarrage, l'arrêt, le redémarrage, la désinstallation, la réinstallation forcée du service, le démarrage de la passerelle en mode service et le nettoyage des ports `gateway --force`.

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="Fix PATH">
    Corrigez `PATH` afin que `openclaw` résolve vers la nouvelle installation, puis réexécutez l'action.
  </Step>
  <Step title="Réinstaller le service Gateway">
    Réinstallez le service Gateway prévu à partir de la nouvelle installation :

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="Supprimer les wrappers obsolètes">
    Supprimez les packages système obsolètes ou les anciennes entrées de wrapper qui pointent toujours vers un binaire `openclaw`.
  </Step>
</Steps>

<Warning>Pour une rétrogradation intentionnelle ou une récupération d'urgence uniquement, définissez `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1` pour la commande unique. Laissez-le non défini pour un fonctionnement normal.</Warning>

## Désaccord de protocole après un retour en arrière (rollback)

Utilisez ceci lorsque les journaux continuent d'imprimer `protocol mismatch`OpenClawGatewayGateway après avoir rétrogradé ou annulé OpenClaw. Cela signifie qu'un ancien Gateway est en cours d'exécution, mais qu'un processus client local plus récent tente toujours de se reconnecter avec une plage de protocole que l'ancien Gateway ne peut pas parler.

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

Recherchez :

- `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`Gateway dans les journaux Gateway.
- `Established clients:` dans `openclaw gateway status --deep` ou `Gateway clients` dans `openclaw doctor --deep`Gateway. Cela liste les clients TCP actifs connectés au port Gateway, y compris les PID et les lignes de commande lorsque le système d'exploitation le permet.
- Un processus client dont la ligne de commande pointe vers la nouvelle installation ou le nouveau wrapper OpenClaw depuis lequel vous avez effectué un retour en arrière.

Correction :

1. Arrêtez ou redémarrez le processus client OpenClaw obsolète indiqué par OpenClaw`gateway status --deep`.
2. Redémarrez les applications ou wrappers qui intègrent OpenClaw, tels que les tableaux de bord locaux, les éditeurs, les assistants de serveur d'application ou les shells OpenClaw`openclaw logs --follow` de longue durée.
3. Réexécutez `openclaw gateway status --deep` ou `openclaw doctor --deep` et confirmez que le PID client obsolète a disparu.

Ne forcez pas un ancien Gateway à accepter un protocole plus récent incompatible. Les augmentations de protocole protègent le contrat de fil ; la récupération après retour en arrière est un problème de nettoyage de processus/version.

## Skill symlink ignoré en raison d'une échappée de chemin

Utilisez ceci lorsque les journaux incluent :

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw traite chaque racine de compétence (skill root) comme une limite de confinement. Un lien symbolique sous OpenClaw`~/.agents/skills`, `<workspace>/.agents/skills`, `<workspace>/skills`, ou `~/.openclaw/skills` est ignoré lorsque sa cible réelle résout en dehors de cette racine, sauf si la cible est explicitement approuvée.

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

N'utilisez pas de cibles larges telles que `~`, `/`, ou un dossier de projet synchronisé entier.
Gardez `allowSymlinkTargets` limité à la racine de la compétence réelle qui contient des répertoires `SKILL.md` de confiance.

Connexes :

- [Configuration des Skills](/fr/tools/skills-config#symlinked-sibling-repos)
- [Exemples de configuration](/fr/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 utilisation supplémentaire requise pour un contexte long

Utilisez ceci lorsque les journaux/erreurs incluent : `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Anthropic sélectionné est un modèle Claude 4.x capable 1M GA, ou le modèle a un `params.context1m: true` hérité.
- L'identifiant Anthropic actuel n'est pas éligible pour une utilisation à contexte long.
- Les requêtes échouent uniquement sur les longues sessions/exécutions de modèle qui nécessitent le chemin de contexte 1M.

Options de correction :

<Steps>
  <Step title="Utiliser une fenêtre de contexte standard">Passez à un modèle à fenêtre standard, ou supprimez le `context1m` hérité de l'ancienne configuration de modèle qui n'est pas compatible GA pour le contexte 1M.</Step>
  <Step title="Utiliser des informations d'identification éligibles">Utilisez des informations d'identification Anthropic éligibles pour les requêtes à long contexte, ou passez à une clé API AnthropicAPI.</Step>
  <Step title="Configurer les modèles de repli">Configurez des modèles de repli pour que les exécutions continuent lorsque les requêtes à long contexte Anthropic sont rejetées.</Step>
</Steps>

En relation :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation des jetons et coûts](/fr/reference/token-use)
- [Pourquoi vois-je HTTP 429 de Anthropic ?](/fr/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Réponses bloquées en amont 403

Utilisez ceci lorsqu'un fournisseur LLM en amont renvoie un `403` générique tel que
`Your request was blocked`.

Ne supposez pas qu'il s'agit toujours d'un problème de configuration OpenClaw. La réponse peut
provenir d'une couche de sécurité en amont telle qu'un CDN, un WAF, une règle de gestion des bots, ou
un proxy inverse devant un point de terminaison compatible OpenAI.

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

Recherchez :

- plusieurs modèles sous le même fournisseur échouant de la même manière
- HTML ou un texte de sécurité générique au lieu d'une erreur d'API normale du fournisseur
- événements de sécurité côté fournisseur pour la même heure de requête
- une sonde `curl` directe minime réussit tandis que les requêtes normales de type SDK échouent

Corrigez d'abord le filtrage côté fournisseur lorsque les preuves indiquent un blocage WAF/CDN.
Préférez une règle d'autorisation ou d'exclusion à portée restreinte pour le chemin d'API utilisé par OpenClaw,
et évitez de désactiver la protection pour l'ensemble du site.

<Warning>Un `curl` minimal réussi ne garantit pas que les requêtes réelles de type SDK traverseront la même couche de sécurité en amont.</Warning>

En relation :

- [points de terminaison compatibles OpenAI](/fr/gateway/configuration-reference#openai-compatible-endpoints)
- [Configuration du fournisseur](/fr/providers)
- [Journaux](/fr/logging)

## Le backend local compatible OpenAI passe les sondes directes mais les exécutions de l'agent échouent

À utiliser lorsque :

- `curl ... /v1/models` fonctionne
- les appels `/v1/chat/completions` directs minimes fonctionnent
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

- les appels directs minimes réussissent, mais les exécutions OpenClaw échouent uniquement sur les invites plus volumineuses
- erreurs `model_not_found` ou 404 même si l'appel direct `/v1/chat/completions`
  fonctionne avec le même id de modèle nu
- erreurs backend concernant `messages[].content` attendant une chaîne
- avertissements `incomplete turn detected ... stopReason=stop payloads=0` intermittents avec un backend local compatible OpenAI
- plantages du backend qui n'apparaissent qu'avec des nombres plus élevés de jetons d'invite ou des invites complètes du runtime de l'agent

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `model_not_found` avec un serveur local style MLX/vLLM → vérifiez que `baseUrl` inclut `/v1`, `api` est `"openai-completions"` pour les backends `/v1/chat/completions`, et `models.providers.<provider>.models[].id` est l'identifiant brut local au fournisseur. Sélectionnez-le une fois avec le préfixe du fournisseur, par exemple `mlx/mlx-community/Qwen3-30B-A3B-6bit` ; conservez l'entrée du catalogue comme `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → le backend rejette les parties de contenu structurées des Chat Completions. Solution : définissez `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `validation.keys` ou les clés de message autorisées comme `["role","content"]` → le backend rejette les métadonnées de relecture style OpenAI sur les messages de Chat Completions. Solution : définissez `models.providers.<provider>.models[].compat.strictMessageKeys: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → le backend a terminé la requête de Chat Completions mais n'a renvoyé aucun texte d'assistant visible par l'utilisateur pour ce tour. OpenClaw réessaie une fois les tours vides compatibles OpenAI et sécurisés pour la relecture ; les échecs persistants signifient généralement que le backend émet un contenu vide/non textuel ou supprime le texte de la réponse finale.
    - les minuscules requêtes directes réussissent, mais les exécutions d'agent OpenClaw échouent avec des plantages de backend/modèle (par exemple Gemma sur certaines versions `inferrs`) → le transport OpenClaw est probablement déjà correct ; le backend échoue sur la forme de l'invite plus grande de l'exécution de l'agent.
    - les échecs diminuent après la désactivation des outils mais ne disparaissent pas → les schémas d'outils faisaient partie de la pression, mais le problème restant est toujours la capacité du modèle/serveur amont ou un bogue du backend.

  </Accordion>
  <Accordion title="Options de correction">
    1. Définissez `compat.requiresStringContent: true` pour les backends Chat Completions en mode texte uniquement.
    2. Définissez `compat.strictMessageKeys: true` pour les backends Chat Completions stricts qui n'acceptent que `role` et `content` dans chaque message.
    3. Définissez `compat.supportsTools: false`OpenClawOpenClaw pour les modèles/backends qui ne peuvent pas gérer de manière fiable la surface du schéma d'outil d'OpenClaw.
    4. Réduisez la pression sur le prompt lorsque cela est possible : bootstrap d'espace de travail plus petit, historique de session plus court, modèle local plus léger, ou un backend avec un meilleur support pour le contexte long.
    5. Si de minuscules requêtes directes continuent de passer alors que les tours de l'agent OpenClaw plantent toujours à l'intérieur du backend, considérez cela comme une limitation du serveur/du modèle en amont et signalez un problème reproductible là-bas avec la forme de payload acceptée.
  </Accordion>
</AccordionGroup>

Connexe :

- [Configuration](/fr/gateway/configuration)
- [Modèles locaux](/fr/gateway/local-models)
- [Points de terminaison compatibles OpenAI](OpenAI/en/gateway/configuration-reference#openai-compatible-endpoints)

## Aucune réponse

Si les canaux sont actifs mais que rien ne répond, vérifiez le routage et les stratégies avant de reconnecter quoi que ce soit.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Recherchez :

- Appairage en attente pour les expéditeurs DM.
- Filtrage des mentions de groupe (`requireMention`, `mentionPatterns`).
- Inadéquations des listes d'autorisation de canal/groupe.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à la mention.
- `pairing request` → l'expéditeur a besoin d'une approbation.
- `blocked` / `allowlist` → l'expéditeur/le canal a été filtré par la stratégie.

Connexe :

- [Dépannage des canaux](/fr/channels/troubleshooting)
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

Recherchez :

- URL de sonde et URL de tableau de bord correctes.
- Inadéquation du mode d'authentification/jeton entre le client et la passerelle.
- Utilisation HTTP alors que l'identité de l'appareil est requise.

Si un navigateur local ne parvient pas à se connecter à `127.0.0.1:18789`Gateway après une mise à jour, récupérez d'abord le service Gateway local et confirmez qu'il sert le tableau de bord :

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

Si `curl`OpenClawGateway renvoie du HTML OpenClaw, le Gateway fonctionne et le problème restant
est probablement le cache du navigateur, un ancien lien profond ou un état d'onglet obsolète. Ouvrez
`http://127.0.0.1:18789` directement et naviguez depuis le tableau de bord. Si le redémarrage
ne laisse pas le service en cours d'exécution, exécutez `openclaw gateway start` et revérifiez
`openclaw gateway status`.

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → contexte non sécurisé ou authentification de l'appareil manquante.
    - `origin not allowed` → le navigateur `Origin` n'est pas dans `gateway.controlUi.allowedOrigins` (ou vous vous connectez depuis une origine de navigateur non bouclée sans liste d'autorisation explicite).
    - `device nonce required` / `device nonce mismatch` → le client ne termine pas le flux d'authentification de l'appareil basé sur un défi (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → le client a signé la charge utile incorrecte (ou l'horodatage est périmé) pour la poignée de main actuelle.
    - `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
    - Cette nouvelle tentative avec jeton mis en cache réutilise l'ensemble de portées mises en cache stockées avec le jeton d'appareil couplé. Les appelants avec `deviceToken` explicite / `scopes` explicite conservent leur ensemble de portées demandées à la place.
    - `AUTH_SCOPE_MISMATCH` → le jeton d'appareil a été reconnu, mais ses portées approuvées ne couvrent pas cette demande de connexion ; recouplez ou approuvez le contrat de portée demandé au lieu de faire tourner un jeton de passerelle partagé.
    - En dehors de ce chemin de nouvelle tentative, la priorité de l'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - Sur le chemin asynchrone de l'interface utilisateur de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec. Deux mauvaises nouvelles tentatives simultanées du même client peuvent donc faire apparaître `retry later` lors de la deuxième tentative au lieu de deux simples inadéquations.
    - `too many failed authentication attempts (retry later)` d'un client bouclé d'origine navigateur → des échecs répétés de ce même `Origin` normalisé sont temporairement verrouillés ; une autre origine localhost utilise un compartiment séparé.
    - `unauthorized` répétés après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et réapprouvez/faites tourner le jeton d'appareil si nécessaire.
    - `gateway connect failed:` → mauvaise cible hôte/port/url.

  </Accordion>
</AccordionGroup>

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` de la réponse `connect` ayant échoué pour choisir l'action suivante :

| Code de détail               | Signification                                                                                                                                                                                                           | Action recommandée                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                                                                                                                                                       | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface de contrôle.                                                                                                                                                                                                                      |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle.                                                                                                                                        | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. Les nouvelles tentatives avec jeton mis en cache réutilisent les portées approuvées stockées ; les appelants explicites `deviceToken` / `scopes` conservent les portées demandées. En cas d'échec persistant, exécutez la [liste de vérification de récupération de dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton mis en cache par appareil est périmé ou révoqué.                                                                                                                                                               | Faites pivoter/réapprouvez le jeton de l'appareil en utilisant la [CLI des appareils](CLI/en/cli/devices), puis reconnectez-vous.                                                                                                                                                                                                                                                                                       |
| `AUTH_SCOPE_MISMATCH`        | Le jeton de l'appareil est valide, mais son rôle/portées approuvés ne couvrent pas cette demande de connexion.                                                                                                          | Reassociez l'appareil ou approuvez le contrat de portée demandé ; ne traitez pas cela comme une dérive de jeton partagé.                                                                                                                                                                                                                                                                                                |
| `PAIRING_REQUIRED`           | L'identité de l'appareil nécessite une approbation. Vérifiez `error.details.reason` pour `not-paired`, `scope-upgrade`, `role-upgrade`, ou `metadata-upgrade`, et utilisez `requestId` / `remediationHint` si présents. | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`. Les mises à niveau de portée/rôle utilisent le même flux après avoir examiné l'accès demandé.                                                                                                                                                                                                                    |

<Note>
  Les RPC backend de bouclage direct authentifiés avec le jeton/mot de passe partagé de la passerelle ne doivent pas dépendre de la ligne de base de portée d'appareil associé du CLI. Si les sous-agents ou d'autres appels internes échouent toujours avec CLI`scope-upgrade`, vérifiez que l'appelant utilise `client.id: "gateway-client"` et `client.mode: "backend"` et ne force pas un `deviceIdentity`
  explicite ou un jeton d'appareil.
</Note>

Vérification de la migration de l'authentification appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux indiquent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

<Steps>
  <Step title="Wait for connect.challenge">Le client attend le `connect.challenge` émis par la passerelle.</Step>
  <Step title="Sign the payload">Le client signe la charge utile liée au défi.</Step>
  <Step title="Send the device nonce">Le client envoie `connect.params.device.nonce` avec le même nonce de défi.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` est refusé de manière inattendue :

- les sessions de jetons d'appareil couplé ne peuvent gérer que **leur propre** appareil, sauf si l'appelant possède également `operator.admin`
- `openclaw devices rotate --scope ...` ne peut demander que des portées d'opérateur que la session de l'appelant possède déjà

Connexes :

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
- Inadéquation de la configuration du service (`Config (cli)` vs `Config (service)`).
- Conflits de port/d'écoute.
- Installations launchd/systemd/schtasks supplémentaires lorsque `--deep` est utilisé.
- Indices de nettoyage `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Signatures courantes">
    - `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle local n'est pas activé, ou le fichier de configuration a été écrasé et la valeur `gateway.mode` a été perdue. Solution : définissez `gateway.mode="local"` dans votre configuration, ou relancez `openclaw onboard --mode local` / `openclaw setup`OpenClaw pour rétablir la configuration attendue en mode local. Si vous exécutez OpenClaw via Podman, le chemin de configuration par défaut est `~/.openclaw/openclaw.json`.
    - `refusing to bind gateway ... without auth` → liaison non bouclée (non-loopback) sans chemin d'authentification de passerelle valide (jeton/mot de passe, ou trusted-proxy si configuré).
    - `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.
    - `Other gateway-like services detected (best effort)` → des unités launchd/systemd/schtasks périmées ou parallèles existent. La plupart des configurations doivent conserver une seule passerelle par machine ; si vous avez besoin de plus d'une, isolez les ports + configuration/état/workspace. Voir [/gateway#multiple-gateways-same-host](/fr/gateway#multiple-gateways-same-host).
    - `System-level OpenClaw gateway service detected` du doctor → une unité système systemd existe alors que le service de niveau utilisateur est manquant. Supprimez ou désactivez le doublon avant d'autoriser le doctor à installer un service utilisateur, ou définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` si l'unité système est le superviseur prévu.
    - `Gateway service port does not match current gateway config` → le superviseur installé pointe toujours vers l'ancien `--port`. Exécutez `openclaw doctor --fix` ou `openclaw gateway install --force`, puis redémarrez le service de passerelle.

  </Accordion>
</AccordionGroup>

Connexes :

- [Tool d'exécution en arrière-plan et de processus](/fr/gateway/background-process)
- [Configuration](/fr/gateway/configuration)
- [Doctor](/fr/gateway/doctor)

## Le Gateway s'arrête lors d'une utilisation élevée de la mémoire

Utilisez ceci lorsque le Gateway disparaît sous la charge, que le superviseur signale un redémarrage de type OOM, ou que les journaux mentionnent Gateway`critical memory pressure bundle written`.

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
- `V8 heap:` octets utilisés sont proches de la limite du tas → réduisez la pression de prompt/session, réduisez le travail simultané, ou augmentez la limite du tas Node uniquement après avoir confirmé que la charge de travail est attendue.
- `Memory pressure: critical/rss_growth` → la mémoire a augmenté rapidement dans une fenêtre d'échantillonnage. Vérifiez les derniers journaux pour une grande importation, une sortie d'outil incontrôlable, des tentatives répétées, ou un lot de travail d'agent en file d'attente.
- Une pression critique sur la mémoire apparaît dans les journaux mais aucun bundle n'existe → c'est la valeur par défaut. Définissez `diagnostics.memoryPressureSnapshot: true` pour capturer le bundle de stabilité pré-OOM lors des futurs événements de pression critique sur la mémoire.

Le bundle de stabilité est sans charge utile. Il comprend des preuves de mémoire opérationnelle et des chemins de fichiers relatifs expurgés, et non le texte des messages, les corps de webhook, les identifiants, les jetons, les cookies ou les identifiants de session bruts. Joignez l'exportation des diagnostics aux rapports de bugs au lieu de copier les journaux bruts.

Connexes :

- [Santé de la Gateway](/fr/gateway/health)
- [Exportation des diagnostics](/fr/gateway/diagnostics)
- [Sessions](/fr/cli/sessions)

## La Gateway a rejeté une configuration non valide

Utilisez ceci lorsque le démarrage de la Gateway échoue avec `Invalid config` ou lorsque les journaux de rechargement à chaud indiquent
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
- Un fichier `openclaw.json.clobbered.*` horodaté si `doctor --fix` a réparé une modification directe défectueuse
- OpenClaw conserve les 32 derniers fichiers `.clobbered.*` pour chaque chemin de configuration et fait tourner les plus anciens

<AccordionGroup>
  <Accordion title="Ce qui s'est passé">
    - La configuration n'a pas été validée lors du démarrage, du rechargement à chaud ou d'une écriture propriétaire d'OpenClaw.
    - Le démarrage du Gateway échoue de manière fermée au lieu de réécrire `openclaw.json`.
    - Le rechargement à chaud ignore les modifications externes non valides et conserve la configuration d'exécution actuelle active.
    - Les écritures propriétaires d'OpenClaw rejettent les payloads invalides/destructifs avant la validation et enregistrent `.rejected.*`.
    - `openclaw doctor --fix` est propriétaire de la réparation. Il peut supprimer les préfixes non-JSON ou restaurer la dernière copie connue bonne tout en préservant le payload rejeté sous forme de `.clobbered.*`.
    - Lorsque de nombreuses réparations se produisent pour un chemin de configuration, OpenClaw fait tourner les anciens fichiers `.clobbered.*` afin que le payload réparé le plus récent reste disponible.

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
    - `.clobbered.*` existe → le médecin a préservé une modification externe cassée lors de la réparation de la configuration active.
    - `.rejected.*` existe → une écriture de configuration appartenant à OpenClaw a échoué aux contrôles de schéma ou d'écrasement avant la validation.
    - `Config write rejected:` → l'écriture a tenté de supprimer une forme requise, de réduire considérablement le fichier ou de rendre persistante une configuration non valide.
    - `config reload skipped (invalid config):` → une modification directe a échoué à la validation et a été ignorée par le Gateway en cours d'exécution.
    - `Invalid config at ...` → le démarrage a échoué avant le démarrage des services du Gateway.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good` ou `size-drop-vs-last-good:*` → une écriture appartenant à OpenClaw a été rejetée car elle a perdu des champs ou de la taille par rapport à la dernière sauvegarde saine connue.
    - `Config last-known-good promotion skipped` → le candidat contenait des espaces réservés de secrets expurgés tels que `***`.

  </Accordion>
  <Accordion title="Options de correction">
    1. Exécutez `openclaw doctor --fix` pour laisser le médecin réparer la configuration préfixée/écrasée ou restaurer la dernière version saine connue.
    2. Copiez uniquement les clés prévues depuis `.clobbered.*` ou `.rejected.*`, puis appliquez-les avec `openclaw config set` ou `config.patch`.
    3. Exécutez `openclaw config validate` avant de redémarrer.
    4. Si vous modifiez manuellement, gardez la configuration JSON5 complète, et pas seulement l'objet partiel que vous souhaitiez modifier.
  </Accordion>
</AccordionGroup>

Connexes :

- [Configuration](/fr/cli/config)
- [Configuration : rechargement à chaud](/fr/gateway/configuration#config-hot-reload)
- [Configuration : validation stricte](/fr/gateway/configuration#strict-validation)
- [Médecin](/fr/gateway/doctor)

## Avertissements de sonde du Gateway

Utilisez ceci lorsque `openclaw gateway probe` atteint quelque chose, mais imprime toujours un bloc d'avertissement.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Recherchez :

- `warnings[].code` et `primaryTargetId` dans la sortie JSON.
- Que l'avertissement concerne le repli SSH, plusieurs Gateway, des portées manquantes ou des références d'authentification non résolues.

Signatures courantes :

- `SSH tunnel failed to start; falling back to direct probes.` → Échec de la configuration SSH, mais la commande a tout de même tenté les cibles configurées/boucle directe.
- `multiple reachable gateways detected` → plus d'une cible a répondu. Cela signifie généralement une configuration multi-Gateway intentionnelle ou des écouteurs obsolètes/en double.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)`RPC → connexion réussie, mais le RPC de détail est limité par la portée ; associez l'identité de l'appareil ou utilisez des identifiants avec `operator.read`.
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed`RPCGateway → connexion réussie, mais l'ensemble complet de RPC de diagnostic a expiré ou a échoué. Considérez cela comme une Gateway accessible avec des diagnostics dégradés ; comparez `connect.ok` et `connect.rpcOk` dans la sortie `--json`.
- `Capability: pairing-pending` ou `gateway closed (1008): pairing required` → la Gateway a répondu, mais ce client a toujours besoin d'un appariement/approbation avant l'accès normal de l'opérateur.
- texte d'avertissement SecretRef `gateway.auth.*` / `gateway.remote.*` non résolu → le matériel d'authentification n'était pas disponible dans ce chemin de commande pour la cible échouée.

Connexes :

- [Gateway](Gateway/en/cli/gateway)
- [Plusieurs Gateway sur le même hôte](/fr/gateway#multiple-gateways-same-host)
- [Accès à distance](/fr/gateway/remote)

## Channel connecté, messages ne circulant pas

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
- Liste autorisée (allowlist) de groupe et exigences de mention.
- Autorisations/portées de l'API de channel manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'auth/permissions du channel.

Connexe :

- [Dépannage de channel](/fr/channels/troubleshooting)
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
    - `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/runtime.
    - `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre d'heures actives.
    - `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient que des lignes vides / en-têtes markdown, donc OpenClaw ignore l'appel au model.
    - `heartbeat skipped` avec `reason=no-tasks-due` → `HEARTBEAT.md` contient un bloc `tasks:`, mais aucune tâche n'est due à ce tick.
    - `heartbeat: unknown accountId` → identifiant de compte invalide pour la cible de livraison du heartbeat.
    - `heartbeat skipped` avec `reason=dm-blocked` → la cible du heartbeat a été résolue vers une destination de style DM alors que `agents.defaults.heartbeat.directPolicy` (ou le remplacement par agent) est défini sur `block`.

  </Accordion>
</AccordionGroup>

Connexe :

- [Heartbeat](/fr/gateway/heartbeat)
- [Tâches planifiées](/fr/automation/cron-jobs)
- [Tâches planifiées : troubleshooting](/fr/automation/cron-jobs#troubleshooting)

## Nœud apparié, tool échoue

Si un nœud est apparié mais que les tools échouent, isolez l'état de premier plan, les autorisations et l'état d'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Recherchez :

- Nœud en ligne avec les fonctionnalités attendues.
- Autorisations du système d'exploitation pour la caméra, le micro, la localisation et l'écran.
- Approbations d'exécution et état de la liste d'autorisation.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation du système d'exploitation manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste d'autorisation.

Connexes :

- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Troubleshooting de nœud](/fr/nodes/troubleshooting)
- [Nœuds](/fr/nodes/index)

## Le tool navigateur échoue

Utilisez ceci lorsque les actions du tool navigateur échouent même si la passerelle elle-même est en bonne santé.

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
    - `unknown command "browser"` ou `unknown command 'browser'` → le plugin navigateur inclus est exclu par `plugins.allow`.
    - outil de navigateur manquant / indisponible pendant `browser.enabled=true` → `plugins.allow` exclut `browser`, donc le plugin n'a jamais été chargé.
    - `Failed to start Chrome CDP on port` → le processus du navigateur n'a pas pu démarrer.
    - `browser.executablePath not found` → le chemin configuré est invalide.
    - `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge tel que `file:` ou `ftp:`.
    - `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → l'installation actuelle de la passerelle manque la dépendance d'exécution principale du navigateur ; réinstallez ou mettez à jour OpenClaw, puis redémarrez la passerelle. Les snapshots ARIA et les captures d'écran de base de la page peuvent toujours fonctionner, mais la navigation, les snapshots IA, les captures d'écran d'éléments par sélecteur CSS et l'export PDF restent indisponibles.

  </Accordion>
  <Accordion title="Chrome MCP / signatures de session existante">
    - `Could not find DevToolsActivePort for chrome` → la session existante Chrome MCP n'a pas encore pu s'attacher au répertoire de données du navigateur sélectionné. Ouvrez la page d'inspection du navigateur, activez le débogage à distance, gardez le navigateur ouvert, approuvez la première invite d'attachement, puis réessayez. Si l'état de connexion n'est pas requis, préférez le profil géré `openclaw`.
    - `No Chrome tabs found for profile="user"` → le profil d'attachement Chrome MCP n'a aucun onglet Chrome local ouvert.
    - `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible depuis l'hôte de la passerelle.
    - `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil attachement uniquement n'a aucune cible accessible, ou le point de terminaison HTTP a répondu mais le WebSocket CDP n'a toujours pas pu être ouvert.

  </Accordion>
  <Accordion title="Élément / capture d'écran / signatures de téléchargement">
    - `fullPage is not supported for element screenshots` → demande de capture d'écran `--full-page` mixte avec `--ref` ou `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → les appels de capture d'écran Chrome MCP / `existing-session` doivent utiliser la capture de page ou un `--ref` snapshot, pas le `--element` CSS.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → les hooks de téléchargement Chrome MCP ont besoin de références de snapshot, pas de sélecteurs CSS.
    - `existing-session file uploads currently support one file at a time.` → envoyer un téléchargement par appel sur les profils Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → les hooks de dialogue sur les profils Chrome MCP ne prennent pas en charge les substitutions de délai d'expiration.
    - `existing-session type does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:type` sur les profils de session existante `profile="user"` / Chrome MCP, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'expiration personnalisé est requis.
    - `existing-session evaluate does not support timeoutMs overrides.` → omettez `timeoutMs` pour `act:evaluate` sur les profils de session existante `profile="user"` / Chrome MCP, ou utilisez un profil de navigateur géré/CDP lorsqu'un délai d'expiration personnalisé est requis.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` nécessite toujours un navigateur géré ou un profil CDP brut.
    - substitutions de viewport obsolète / mode sombre / langue locale / hors ligne sur les profils CDP attachement uniquement ou distant → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation Playwright/CDP sans redémarrer toute la passerelle.

  </Accordion>
</AccordionGroup>

En relation :

- [Navigateur (géré par OpenClaw)](/fr/tools/browser)
- [Dépannage du navigateur](/fr/tools/browser-linux-troubleshooting)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des pannes après mise à niveau sont dues à une dérive de la configuration ou à des paramètres par défaut plus stricts désormais appliqués.

<AccordionGroup>
  <Accordion title="1. Le comportement de remplacement de l'authentification et de l'URL a changé">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    Ce qu'il faut vérifier :

    - Si `gateway.mode=remote`, les appels du CLI peuvent cibler un service distant alors que votre service local fonctionne correctement.
    - Les appels explicites avec `--url` ne reviennent pas aux identifiants stockés.

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

    - Approbations d'appareils en attente pour le tableau de bord/les nœuds.
    - Approbations de jumelage DM en attente après des changements de stratégie ou d'identité.

    Signatures courantes :

    - `device identity required` → authentification de l'appareil non satisfaite.
    - `pairing required` → l'expéditeur/l'appareil doit être approuvé.

  </Accordion>
</AccordionGroup>

Si la configuration du service et le runtime ne sont toujours pas d'accord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexe :

- [Authentification](/fr/gateway/authentication)
- [Outil d'exécution en arrière-plan et de processus](/fr/gateway/background-process)
- [Jumelage détenu par la Gateway](/fr/gateway/pairing)

## Connexe

- [Doctor](/fr/gateway/doctor)
- [FAQ](/fr/help/faq)
- [Manuel de procédures Gateway](/fr/gateway)
