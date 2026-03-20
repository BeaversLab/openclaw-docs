---
summary: "Guide de troubleshooting approfondi pour la Gateway, les canaux, l'automatisation, les nœuds et le navigateur"
read_when:
  - Le hub de troubleshooting vous a orienté ici pour un diagnostic plus approfondi
  - Vous avez besoin de sections de runbook stables basées sur les symptômes avec des commandes exactes
title: "Troubleshooting"
---

# Gateway troubleshooting

Cette page est le runbook approfondi.
Commencez par [/help/troubleshooting](/fr/help/troubleshooting) si vous souhaitez d'abord le flux de triage rapide.

## Échelle de commandes

Exécutez ceux-ci en premier, dans cet ordre :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Signaux sains attendus :

- `openclaw gateway status` affiche `Runtime: running` et `RPC probe: ok`.
- `openclaw doctor` ne signale aucun problème de configuration/service bloquant.
- `openclaw channels status --probe` affiche les canaux connectés/prêts.

## Anthropic 429 utilisation supplémentaire requise pour un contexte long

Utilisez ceci lorsque les journaux/erreurs incluent :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Recherchez :

- Le modèle Anthropic Opus/Sonnet sélectionné a `params.context1m: true`.
- Les identifiants Anthropic actuels ne sont pas éligibles pour une utilisation à contexte long.
- Les requêtes échouent uniquement sur les longues sessions/exécutions de modèle nécessitant le chemin bêta 1M.

Options de correction :

1. Désactivez `context1m` pour ce modèle afin de revenir à la fenêtre de contexte normale.
2. Utilisez une clé Anthropic API avec facturation, ou activez l'utilisation supplémentaire Anthropic sur le compte d'abonnement.
3. Configurez des modèles de secours pour que les exécutions continuent lorsque les requêtes Anthropic à contexte long sont rejetées.

Connexes :

- [/providers/anthropic](/fr/providers/anthropic)
- [/reference/token-use](/fr/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/fr/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Pas de réponses

Si les canaux sont actifs mais que rien ne répond, vérifiez le routage et les règles avant de reconnecter quoi que ce soit.

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
- Inadéquations de la liste d'autorisation de canal/groupe.

Signatures courantes :

- `drop guild message (mention required` → message de groupe ignoré jusqu'à la mention.
- `pairing request` → l'expéditeur doit être approuvé.
- `blocked` / `allowlist` → l'expéditeur/le canal a été filtré par la stratégie.

Connexes :

- [/channels/troubleshooting](/fr/channels/troubleshooting)
- [/channels/pairing](/fr/channels/pairing)
- [/channels/groups](/fr/channels/groups)

## Connectivité de l'interface utilisateur de contrôle et du tableau de bord

Lorsque le tableau de bord/l'interface utilisateur de contrôle ne parvient pas à se connecter, vérifiez l'URL, le mode d'authentification et les hypothèses relatives au contexte sécurisé.

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

Signatures courantes :

- `device identity required` → contexte non sécurisé ou authentification d'appareil manquante.
- `device nonce required` / `device nonce mismatch` → le client ne termine pas le
  flux d'authentification d'appareil basé sur le défi (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → le client a signé la mauvaise
  charge utile (ou un horodatage obsolète) pour la poignée de main actuelle.
- `AUTH_TOKEN_MISMATCH` avec `canRetryWithDeviceToken=true` → le client peut effectuer une nouvelle tentative de confiance avec le jeton d'appareil mis en cache.
- `unauthorized` répété après cette nouvelle tentative → dérive du jeton partagé/jeton d'appareil ; actualisez la configuration du jeton et ré-approuvez/faites pivoter le jeton d'appareil si nécessaire.
- `gateway connect failed:` → mauvaise cible hôte/port/url.

### Carte rapide des codes de détail d'authentification

Utilisez `error.details.code` de la réponse `connect` échouée pour choisir l'action suivante :

| Code de détail               | Signification                                                                    | Action recommandée                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | Le client n'a pas envoyé un jeton partagé requis.                                | Collez/définissez le jeton dans le client et réessayez. Pour les chemins du tableau de bord : `openclaw config get gateway.auth.token` puis collez dans les paramètres de l'interface utilisateur de contrôle.                   |
| `AUTH_TOKEN_MISMATCH`        | Le jeton partagé ne correspond pas au jeton d'authentification de la passerelle. | Si `canRetryWithDeviceToken=true`, autorisez une nouvelle tentative de confiance. En cas d'échec persistant, exécutez la [liste de contrôle de récupération de dérive de jeton](/fr/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Le jeton par appareil mis en cache est obsolète ou révoqué.                      | Faites pivoter/ré-approuvez le jeton d'appareil à l'aide du [CLI des appareils](/fr/cli/devices), puis reconnectez-vous.                                                                                                         |
| `PAIRING_REQUIRED`           | L'identité de l'appareil est connue mais n'est pas approuvée pour ce rôle.       | Approuver la demande en attente : `openclaw devices list` puis `openclaw devices approve <requestId>`.                                                                                                                           |

Vérification de la migration de l'authentification appareil v2 :

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si les journaux indiquent des erreurs de nonce/signature, mettez à jour le client connecté et vérifiez-le :

1. attend `connect.challenge`
2. signe la charge utile liée au challenge
3. envoie `connect.params.device.nonce` avec le même nonce de challenge

Connexes :

- [/web/control-ui](/fr/web/control-ui)
- [/gateway/authentication](/fr/gateway/authentication)
- [/gateway/remote](/fr/gateway/remote)
- [/cli/devices](/fr/cli/devices)

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

- `Runtime: stopped` avec des indices de sortie.
- Inadéquation de la configuration du service (`Config (cli)` vs `Config (service)`).
- Conflits de port/écouteur.

Signatures courantes :

- `Gateway start blocked: set gateway.mode=local` → le mode passerelle locale n'est pas activé. Correctif : définissez `gateway.mode="local"` dans votre configuration (ou exécutez `openclaw configure`). Si vous exécutez OpenClaw via Podman en utilisant l'utilisateur dédié `openclaw`, la configuration se trouve à `~openclaw/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → liaison non-boucle sans jeton/mot de passe.
- `another gateway instance is already listening` / `EADDRINUSE` → conflit de port.

Connexes :

- [/gateway/background-process](/fr/gateway/background-process)
- [/gateway/configuration](/fr/gateway/configuration)
- [/gateway/doctor](/fr/gateway/doctor)

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

- Stratégie de DM (`pairing`, `allowlist`, `open`, `disabled`).
- Liste blanche de groupe et exigences de mention.
- Autorisations/portées de l'API du canal manquantes.

Signatures courantes :

- `mention required` → message ignoré par la stratégie de mention de groupe.
- `pairing` / traces d'approbation en attente → l'expéditeur n'est pas approuvé.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problème d'authentification/autorisations du channel.

Voir aussi :

- [/channels/troubleshooting](/fr/channels/troubleshooting)
- [/channels/whatsapp](/fr/channels/whatsapp)
- [/channels/telegram](/fr/channels/telegram)
- [/channels/discord](/fr/channels/discord)

## Livraison des tâches cron et des signaux de présence

Si les tâches cron ou les signaux de présence ne se sont pas exécutés ou n'ont pas été livrés, vérifiez d'abord l'état du planificateur, puis la cible de livraison.

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
- Raisons de l'absence de signal de présence (`quiet-hours`, `requests-in-flight`, `alerts-disabled`).

Signatures courantes :

- `cron: scheduler disabled; jobs will not run automatically` → cron désactivé.
- `cron: timer tick failed` → échec du tick du planificateur ; vérifiez les erreurs de fichier/journal/d'exécution.
- `heartbeat skipped` avec `reason=quiet-hours` → en dehors de la fenêtre d'heures actives.
- `heartbeat: unknown accountId` → ID de compte invalide pour la cible de livraison du signal de présence.
- `heartbeat skipped` avec `reason=dm-blocked` → la cible du signal de présence est résolue vers une destination de type DM alors que `agents.defaults.heartbeat.directPolicy` (ou le redéfinition par agent) est défini sur `block`.

Voir aussi :

- [/automation/troubleshooting](/fr/automation/troubleshooting)
- [/automation/cron-jobs](/fr/automation/cron-jobs)
- [/gateway/heartbeat](/fr/gateway/heartbeat)

## Échec de l'outil de nœud jumelé

Si un nœud est jumelé mais que les outils échouent, isolez l'état de premier plan, des autorisations et d'approbation.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Rechercher :

- Nœud en ligne avec les fonctionnalités attendues.
- Autorisations du système d'exploitation pour la caméra/le microphone/la localisation/l'écran.
- Approbations d'exécution et état de la liste d'autorisation.

Signatures courantes :

- `NODE_BACKGROUND_UNAVAILABLE` → l'application du nœud doit être au premier plan.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → autorisation du système d'exploitation manquante.
- `SYSTEM_RUN_DENIED: approval required` → approbation d'exécution en attente.
- `SYSTEM_RUN_DENIED: allowlist miss` → commande bloquée par la liste d'autorisation.

Voir aussi :

- [/nodes/troubleshooting](/fr/nodes/troubleshooting)
- [/nodes/index](/fr/nodes/index)
- [/tools/exec-approvals](/fr/tools/exec-approvals)

## Échec de l'outil de navigateur

Utilisez ceci lorsque les actions de l'outil de navigateur échouent alors que la passerelle elle-même est en bonne santé.

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
- `No Chrome tabs found for profile="user"` → le profil de connexion Chrome MCP n'a aucun onglet Chrome local ouvert.
- `Browser attachOnly is enabled ... not reachable` → le profil de connexion uniquement n'a aucune cible accessible.

Connexes :

- [/tools/browser-linux-troubleshooting](/fr/tools/browser-linux-troubleshooting)
- [/tools/browser](/fr/tools/browser)

## Si vous avez effectué une mise à niveau et que quelque chose s'est soudainement brisé

La plupart des dysfonctionnements après mise à niveau sont dus à une dérive de la configuration ou à des paramètres par défaut plus stricts désormais appliqués.

### 1) Comportement de remplacement de l'authentification et de l'URL modifié

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

- Les liaisons non bouclées (`lan`, `tailnet`, `custom`) nécessitent une authentification configurée.
- Les anciennes clés comme `gateway.token` ne remplacent pas `gateway.auth.token`.

Signatures courantes :

- `refusing to bind gateway ... without auth` → inadéquation liaison+authentification.
- `RPC probe: failed` alors que le runtime est en cours d'exécution → passerelle active mais inaccessible avec l'authentification/l'URL actuelle.

### 3) L'état de l'appairage et de l'identité de l'appareil a changé

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

Ce qu'il faut vérifier :

- Approbations d'appareil en attente pour le tableau de bord/les nœuds.
- Approbations d'appairage DM en attente après des modifications de stratégie ou d'identité.

Signatures courantes :

- `device identity required` → authentification de l'appareil non satisfaite.
- `pairing required` → l'expéditeur/l'appareil doit être approuvé.

Si la configuration du service et le runtime sont toujours en désaccord après les vérifications, réinstallez les métadonnées du service à partir du même répertoire de profil/état :

```bash
openclaw gateway install --force
openclaw gateway restart
```

Connexe :

- [/gateway/pairing](/fr/gateway/pairing)
- [/gateway/authentication](/fr/gateway/authentication)
- [/gateway/background-process](/fr/gateway/background-process)

import fr from "/components/footer/fr.mdx";

<fr />
