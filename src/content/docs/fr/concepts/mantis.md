---
summary: "Mantis est le système de vérification de bout en bout visuel pour reproduire les bugs OpenClaw sur des transports en direct, capturant des preuves avant et après, et attachant des artefacts aux PRs."
title: "Mantis"
read_when:
  - Building or running live visual QA for OpenClaw bugs
  - Adding before and after verification for a pull request
  - Adding Discord, Slack, WhatsApp, or other live transport scenarios
  - Debugging QA runs that need screenshots, browser automation, or VNC access
---

Mantis est le système de vérification de bout en bout OpenClaw pour les bugs qui nécessitent un vrai
runtime, un vrai transport, et une preuve visible. Il exécute un scénario sur une
réf mauvaise connue, capture des preuves, exécute le même scénario sur une réf
candidate, et publie la comparaison sous forme d'artefacts qu'un mainteneur peut inspecter depuis une PR ou
une commande locale.

Mantis commence avec Discord car Discord nous offre une première voie à haute valeur :
une vraie auth de bot, de vrais channels de guilde, des réactions, des fils, des commandes natives, et une
interface utilisateur de navigateur où les humains peuvent confirmer visuellement ce que le transport a montré.

## Objectifs

- Reproduire un bug à partir d'une issue GitHub ou d'une PR avec la même forme de transport que les utilisateurs
  voient.
- Capturer un artefact **avant** sur la réf de base avant d'appliquer la correction.
- Capturer un artefact **après** sur la réf candidate après avoir appliqué la correction.
- Utiliser un oracle déterministe chaque fois que possible, comme une lecture de réaction REST Discord
  ou une vérification de transcript de channel.
- Capturer des captures d'écran lorsque le bug a une surface d'interface utilisateur visible.
- Exécuter localement depuis un CLI contrôlé par un agent et à distance depuis GitHub.
- Préserver suffisamment d'état de la machine pour le sauvetage VNC lorsque la connexion, l'automatisation du navigateur, ou
  l'authentification du fournisseur se bloque.
- Publier un état concis sur un channel opérateur Discord lorsque l'exécution est bloquée,
  a besoin d'une aide manuelle VNC, ou est terminée.

## Non-objectifs

- Mantis n'est pas un remplacement pour les tests unitaires. Une exécution Mantis devrait généralement devenir
  un plus petit test de régression une fois la correction comprise.
- Mantis n'est pas la porte d'entrée CI rapide normale. Il est plus lent, utilise des identifiants en direct, et
  est réservé aux bugs où l'environnement réel compte.
- Mantis ne devrait pas nécessiter d'intervention humaine pour un fonctionnement normal. Le VNC manuel est un chemin
  de secours, pas le chemin heureux.
- Mantis ne stocke pas de secrets bruts dans les artefacts, les journaux, les captures d'écran, les rapports
  Markdown, ou les commentaires de PR.

## Propriété

Mantis réside dans la pile QA OpenClaw.

- OpenClaw possède le runtime de scénario, les adaptateurs de transport, le schéma de preuves et
  la CLI locale sous `pnpm openclaw qa mantis`.
- QA Lab possède les éléments du harnais de transport en direct, les assistants de capture de navigateur et
  les rédacteurs d'artefacts.
- Crabbox possède les machines Linux prêtes à l'emploi lorsqu'une machine virtuelle distante est nécessaire.
- Les actions GitHub possèdent le point d'entrée du workflow distant et la rétention des artefacts.
- ClawSweeper possède le routage des commentaires GitHub : l'analyse des commandes des mainteneurs,
  le répartissage du workflow et la publication du commentaire final de PR.
- Les agents OpenClaw pilotent Mantis via Codex lorsqu'un scénario nécessite une configuration agentic,
  un débogage ou un rapport d'état bloqué.

Cette limite maintient la connaissance du transport dans OpenClaw, la planification des machines dans
Crabbox, et la colle de workflow des mainteneurs dans ClawSweeper.

## Forme de la commande

La première commande locale vérifie le bot Discord, la guilde, le channel, l'envoi de message,
l'envoi de réaction et le chemin de l'artefact :

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

L'exécuteur local avant et après accepte cette forme :

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

L'exécuteur crée des arbres de travail (worktrees) détachés de référence initiale et candidate sous le répertoire de
sortie, installe les dépendances, construit chaque référence, exécute le scénario avec
`--allow-failures`, puis écrit `baseline/`, `candidate/`, `comparison.json`,
et `mantis-report.md`. Pour le premier scénario Discord, une vérification
réussie signifie que le statut de référence initiale est `fail` et que le statut candidat est `pass`.

La seconde sonde avant/après Discord cible les pièces jointes de fils de discussion :

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-thread-reply-filepath-attachment \
  --baseline <bug-ref> \
  --candidate <fix-ref> \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-thread-attachment
```

Ce scénario publie un message parent avec le bot pilote, crée un vrai fil de discussion
Discord, appelle l'action `message.thread-reply` de OpenClaw avec un
`filePath` local au dépôt, puis interroge le fil pour la réponse du SUT et le nom du fichier joint. La
capture d'écran de référence initiale montre la réponse sans pièce jointe ; la capture d'écran candidate
montre la pièce jointe `mantis-thread-report.md` attendue.

La première primitive VM/navigateur est le test de fumée de bureau (desktop smoke) :

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

Elle loue ou réutilise une machine de bureau Crabbox, démarre un navigateur visible dans la session VNC, capture le bureau, récupère les artefacts dans le répertoire de sortie local, et écrit la commande de reconnexion dans le rapport. La commande utilise par défaut le fournisseur Hetzner car c'est le premier fournisseur avec une couverture bureau/VNC fonctionnelle dans la voie Mantis. Remplacez-le par `--provider`, `--crabbox-bin` ou `OPENCLAW_MANTIS_CRABBOX_PROVIDER` lors de l'exécution sur une autre flotte Crabbox.

Indicateurs utiles pour le test de fumée de bureau :

- `--lease-id <cbx_...>` ou `OPENCLAW_MANTIS_CRABBOX_LEASE_ID` réutilise un bureau déjà chaud.
- `--browser-url <url>` modifie la page ouverte dans le navigateur visible.
- `--html-file <path>` rend un artefact HTML local au référentiel dans le navigateur visible. Mantis l'utilise pour capturer la chronologique des réactions de statut Discord générée via un vrai bureau Crabbox.
- `--browser-profile-dir <remote-path>` réutilise un user-data-dir Chrome distant pour qu'un bureau Mantis persistant puisse rester connecté entre les exécutions. Utilisez ceci pour le profil de visionneuse Web Discord de longue durée.
- `--browser-profile-archive-env <name>` restaure une archive user-data-dir Chrome `.tgz` en base64 à partir de la variable d'environnement nommée avant de lancer le navigateur. Utilisez ceci pour les témoins connectés tels que Discord Web. La variable d'environnement par défaut est `OPENCLAW_MANTIS_BROWSER_PROFILE_TGZ_B64`.
- `--video-duration <seconds>` contrôle la durée de la capture MP4. Utilisez une durée plus longue pour les applications Web connectées lentes qui ont besoin de temps pour se stabiliser.
- `--keep-lease` ou `OPENCLAW_MANTIS_KEEP_VM=1` garde ouverte une location créée et réussie pour inspection VNC. Les exécutions échouées gardent la location par défaut lorsqu'une a été créée afin qu'un opérateur puisse se reconnecter.
- `--class`, `--idle-timeout` et `--ttl` ajustent la taille de la machine et la durée de vie de la location.

Pour les preuves Web Discord, Mantis utilise un compte de visualisateur dédié au lieu d'un jeton de bot. Le scénario de l'API Discord en direct reste l'oracle : il crée le vrai fil, envoie le SUT DiscordDiscordAPI`thread-reply`Discord et vérifie la pièce jointe via le REST Discord. Lorsque `OPENCLAW_QA_DISCORD_CAPTURE_UI_METADATA=1`Discord est défini, le scénario écrit également un artefact d'URL Web Discord. Lorsque `OPENCLAW_QA_DISCORD_KEEP_THREADS=1` est défini, il laisse ce fil disponible suffisamment longtemps pour qu'un navigateur connecté puisse l'ouvrir et l'enregistrer.

Le workflow GitHub ouvre l'URL du fil candidat dans Discord Web, capture une capture d'écran, enregistre un MP4 et génère un aperçu GIF rogné lorsque les outils médias Crabbox sont disponibles. Préférez un chemin de profil de visualisateur persistant configuré via GitHubDiscord`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR`GitHub, car les archives complètes de profil Chrome peuvent dépasser la limite de taille des secrets de GitHub. Pour les petits profils ou profils d'amorçage, le workflow peut également restaurer une archive base64 `.tgz` à partir de `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord. Si aucune source de profil n'est configurée, le workflow publie toujours les captures d'écran des pièces jointes de base/candidat déterministes et enregistre un avis indiquant que le témoin Discord Web connecté a été ignoré.

La première primitive de transport de bureau complet est le test de fumée du bureau Slack :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Il loue ou réutilise une machine de bureau Crabbox, synchronise l'extraction actuelle dans la VM, exécute `pnpm openclaw qa slack`SlackSlackOpenClawLinux à l'intérieur de cette VM, ouvre Slack Web dans le navigateur VNC, capture le bureau visible et copie à la fois les artefacts QA Slack et la capture d'écran VNC vers le répertoire de sortie local. C'est la première forme Mantis où la passerelle OpenClaw du SUT et le navigateur résident tous deux dans la même VM de bureau Linux.

Avec `--gateway-setup`OpenClaw, la commande prépare un home OpenClaw jeton persistant à `$HOME/.openclaw-mantis/slack-openclaw`Slack, corrige la configuration du Mode Socket Slack pour le channel sélectionné, démarre `openclaw gateway run` sur le port `38973`LinuxSlackSlack, et maintient Chrome en cours d'exécution dans la session VNC. C'est le mode « laissez-moi un bureau Linux avec Slack et un claw en cours d'exécution » ; la ligne QA bot-à-bot Slack reste celle par défaut lorsque `--gateway-setup` est omis.

Entrées requises pour `--credential-source env` :

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- `OPENCLAW_LIVE_OPENAI_KEY` pour la ligne du model distant. Si seul
  `OPENAI_API_KEY` est défini localement, Mantis le mappe à `OPENCLAW_LIVE_OPENAI_KEY`
  avant d'invoquer Crabbox afin que le transfert d'env `OPENCLAW_*` de Crabbox puisse le transporter
  dans la VM.

Avec `--gateway-setup --credential-source convex`Slack, Mantis loue les identifiants Slack SUT
depuis le pool partagé avant de créer la VM et transmet l'ID du channel loué, le jeton d'application Socket Mode et le jeton bot en tant que `OPENCLAW_MANTIS_SLACK_*`GitHubSlack
d'exécution runtime à l'intérieur du bureau. Cela garde les workflows GitHub légers : ils n'ont besoin
que du secret du broker Convex, et non des jetons bruts de bot ou d'application Slack.

Drapeaux utiles du bureau Slack :

- `--lease-id <cbx_...>`Slack réexécute sur une machine où un opérateur s'est déjà connecté à Slack Web via VNC.
- `--gateway-setup`OpenClawSlack démarre une passerelle OpenClaw Slack persistante dans la VM au lieu de n'exécuter que la ligne QA bot-à-bot.
- `--keep-lease` laisse la VM passerelle ouverte pour inspection VNC après succès ; `--no-keep-lease` l'arrête après la collecte des artefacts.
- `--slack-url <url>` ouvre une URL Web Slack spécifique. Sans cela, Mantis déduit `https://app.slack.com/client/<team>/<channel>` à partir du Slack `auth.test` lorsque le jeton de bot SUT est disponible.
- `--slack-channel-id <id>` contrôle la liste d'autorisation des channels Slack utilisée par la configuration de la passerelle.
- `OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` contrôle le profil Chrome persistant à l'intérieur de la VM. La valeur par défaut est `$HOME/.config/openclaw-mantis/slack-chrome-profile`, donc une connexion manuelle au Web Slack persiste lors des nouvelles exécutions sur le même bail.
- `--credential-source convex --credential-role ci` utilise le pool d'informations d'identification partagé au lieu des jetons d'environnement Slack directs.
- `--provider-mode`, `--model`, `--alt-model` et `--fast` sont transmis à la ligne en direct Slack.

Le workflow de fumée GitHub est `Mantis Discord Smoke`. Le workflow avant et après GitHub pour le premier scénario réel est `Mantis Discord Status Reactions`. Il accepte :

- `baseline_ref` : la référence censée reproduire le comportement mis en file d'attente uniquement.
- `candidate_ref` : la référence censée afficher `queued -> thinking -> done`.

Il extrait la référence du harnais de workflow, construit des arbres de travail (worktrees) distincts pour la ligne de base et le candidat, exécute `discord-status-reactions-tool-only` sur chaque arbre de travail, et télécharge `baseline/`, `candidate/`, `comparison.json` et `mantis-report.md` en tant qu'artefacts Actions. Il restitue également le HTML de la chronologie de chaque ligne dans un navigateur de bureau Crabbox et publie ces captures d'écran VNC à côté des PNG de chronologie déterministes dans le commentaire de la PR. Le même commentaire de PR intègre des prévisualisations GIF allégées et rognées par mouvement générées par `crabbox media preview`, des liens vers les clips MP4 rognés par mouvement correspondants, et conserve les fichiers MP4 complets du bureau pour une inspection approfondie. Les captures d'écran restent en ligne pour une révision rapide. Le workflow construit la CLI Crabbox à partir du main de `openclaw/crabbox` afin qu'il puisse utiliser les indicateurs actuels de bail de bureau/navigateur avant la publication de la prochaine version binaire de Crabbox.

`Mantis Scenario` est le point d'entrée manuel générique. Il prend un `scenario_id`, un `candidate_ref`, un `baseline_ref` optionnel, et un `pr_number` optionnel, puis lance le workflow propriétaire du scénario. Le wrapper est intentionnellement léger : les workflows de scénarios possèdent toujours leur configuration de transport, leurs identifiants, leur classe de VM, leur oracle attendu et leur manifeste d'artefacts.

`Mantis Slack Desktop Smoke` est le premier workflow VM Slack. Il extrait la référence candidate de confiance dans un arbre de travail séparé, loue un bureau Crabbox Linux, exécute `pnpm openclaw qa mantis slack-desktop-smoke --gateway-setup` sur ce candidat, ouvre Slack Web dans le navigateur VNC, enregistre le bureau, génère un aperçu rogné au mouvement avec `crabbox media preview`, télécharge le répertoire complet des artefacts, et publie facultativement le commentaire de preuve en ligne sur la PR cible. Il utilise par défaut AWS pour la location du bureau et expose une entrée de provider manuelle afin que les opérateurs puissent passer à Hetzner lorsque la capacité AWS est lente ou indisponible. Utilisez ce lane lorsque vous souhaitez « un bureau Linux avec Slack et un claw en cours d'exécution » au lieu d'une simple transcription bot-à-bot Slack.

`Mantis Telegram Live` encapsule le lane QA en direct Telegram existant dans le même pipeline de preuves de PR. Il extrait la référence candidate de confiance dans un arbre de travail séparé, exécute `pnpm openclaw qa telegram --credential-source convex
--credential-role ci`, writes a `mantis-evidence.` manifest à partir du résumé QA Telegram et de l'artefact de message observé, rend le HTML de la transcription expurgée via un navigateur de bureau Crabbox, génère un GIF rogné au mouvement avec `crabbox media preview`, et publie le commentaire de preuve PR en ligne lorsqu'un numéro de PR est disponible. Ce lane est visuel par transcription plutôt qu'une preuve Telegram Web connectée : le Telegram Bot API fournit des preuves de messages en direct stables, mais l'état de connexion Telegram Web n'est pas requis pour l'automatisation Mantis normale.

`Mantis Telegram Desktop Proof` est le wrapper natif agentique avant/après pour Telegram Desktop. Un mainteneur peut le déclencher depuis un commentaire de PR avec `@Mantis telegram desktop proof`, depuis l'interface utilisateur Actions avec des instructions libres, ou via le répartiteur générique `Mantis Scenario`. Le workflow transmet la PR, la référence de base, la référence candidate et les instructions du mainteneur à Codex. L'agent lit la PR, décide quel comportement visible sur Telegram prouve le changement, exécute la ligne de preuve Crabbox Telegram Desktop pour utilisateur réel pour la base et le candidat, itère jusqu'à ce que les GIF natifs soient utiles, écrit des artefacts `motionPreview` appariés dans `mantis-evidence.json`, télécharge le bundle et publie un tableau de preuves PR à 2 colonnes lorsqu'un numéro de PR est disponible.

Pour la configuration du bureau Telegram avec humain dans la boucle, utilisez le constructeur de scénario :

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

Le constructeur loue ou réutilise un bureau Crabbox, installe le binaire natif du bureau Linux sous Telegram, restaure optionnellement une archive de session utilisateur, configure OpenClaw avec le jeton de bot SUT Telegram loué, démarre `openclaw gateway run` sur le port `38974`, publie un message de disponibilité du bot pilote dans le groupe privé loué, puis capture une capture d'écran et un MP4 du bureau VNC visible. Un jeton de bot ne connecte jamais Telegram Desktop ; il configure uniquement OpenClaw. La visionneuse de bureau est une session utilisateur Telegram distincte restaurée depuis `--telegram-profile-archive-env <name>` ou créée manuellement via VNC et maintenue active avec `--keep-lease`.

Drapeaux utiles du constructeur de bureau Telegram :

- `--lease-id <cbx_...>` réexécute sur une VM où un opérateur s'est déjà connecté à Telegram Desktop.
- `--telegram-profile-archive-env <name>` lit une archive de profil bureau Telegram en base64 `.tgz` à partir de cette variable d'environnement et la restaure avant le lancement.
- `--telegram-profile-dir <remote-path>`Telegram contrôle le répertoire distant du profil Telegram Desktop. La valeur par défaut est `$HOME/.local/share/TelegramDesktop`.
- `--no-gateway-setup`TelegramOpenClaw installe et ouvre Telegram Desktop sans configurer OpenClaw.
- `--credential-source convex --credential-role ci`Telegram utilise le courtier d'informations d'identification partagé au lieu des jetons d'environnement Telegram directs.

Chaque scénario de publication sur une PR écrit `mantis-evidence.json`GitHub à côté de son rapport.
Ce schéma sert de passerelle entre le code du scénario et les commentaires GitHub :

```json
{
  "schemaVersion": 1,
  "id": "discord-status-reactions",
  "title": "Mantis Discord Status Reactions QA",
  "summary": "Human-readable top summary for the PR comment.",
  "scenario": "discord-status-reactions-tool-only",
  "comparison": {
    "baseline": { "sha": "...", "status": "fail", "expected": "queued-only" },
    "candidate": { "sha": "...", "status": "pass", "expected": "queued -> thinking -> done" },
    "pass": true
  },
  "artifacts": [
    {
      "kind": "timeline",
      "lane": "baseline",
      "label": "Baseline queued-only",
      "path": "baseline/timeline.png",
      "targetPath": "baseline.png",
      "alt": "Baseline Discord timeline",
      "width": 420
    }
  ]
}
```

Les valeurs de `path` sont relatives au répertoire du manifeste. Les valeurs de `targetPath` sont des chemins relatifs sous le préfixe d'artefact Mantis R2/S3 configuré. L'éditeur rejette la traversée de chemins et ignore les entrées marquées `"required": false` lorsque les aperçus ou vidéos optionnels ne sont pas disponibles.

Types d'artefacts pris en charge :

- `timeline` : capture d'écran déterministe du scénario, généralement avant/après.
- `desktopScreenshot` : capture d'écran du bureau VNC/navigateur.
- `motionPreview` : GIF animé en ligne généré à partir de l'enregistrement du bureau.
- `motionClip` : MP4 découpé par mouvement qui supprime l'introduction et la fin statiques.
- `fullVideo` : enregistrement MP4 complet pour une inspection approfondie.
- `metadata` : sidecar JSON/journal.
- `report` : rapport Markdown.

L'éditeur réutilisable est `scripts/mantis/publish-pr-evidence.mjs`. Les workflows l'appellent avec le manifeste, la PR cible, la racine cible des artefacts, le marqueur de commentaire, l'URL de l'artefact Actions, l'URL d'exécution et la source de la requête. Il télécharge les artefacts déclarés vers le compartiment Mantis R2/S3 configuré, construit un commentaire de PR commençant par un résumé avec des images/aperçus en ligne et des vidéos liées, puis met à jour le commentaire marqueur existant ou en crée un nouveau. Les workflows publient vers `openclaw-crabbox-artifacts` avec des URL publiques sous `https://artifacts.openclaw.ai`. Ils fournissent directement les valeurs du compartiment, de la région et de l'URL publique. L'éditeur réutilisable nécessite :

- `MANTIS_ARTIFACT_R2_ACCESS_KEY_ID`
- `MANTIS_ARTIFACT_R2_SECRET_ACCESS_KEY`
- `MANTIS_ARTIFACT_R2_BUCKET`
- `MANTIS_ARTIFACT_R2_ENDPOINT`
- `MANTIS_ARTIFACT_R2_REGION`
- `MANTIS_ARTIFACT_R2_PUBLIC_BASE_URL`

Vous pouvez également déclencher l'exécution des réactions de statut directement depuis un commentaire de PR :

```text
@Mantis discord status reactions
```

Le déclencheur de commentaire est intentionnellement restreint. Il ne s'exécute que sur les commentaires de pull request d'utilisateurs ayant un accès en écriture, de maintenance ou d'administrateur, et il ne reconnaît que les demandes de réactions de statut Discord. Par défaut, il utilise la référence de base connue comme mauvaise et le SHA de la tête de la PR actuelle comme candidat. Les mainteneurs peuvent remplacer l'une ou l'autre référence :

```text
@Mantis discord status reactions baseline=origin/main candidate=HEAD
```

La QA en direct Telegram peut également être déclenchée depuis un commentaire de PR :

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

Par défaut, il utilise le SHA de la tête de la PR actuelle comme candidat et exécute
`telegram-status-command`. Les responsables peuvent remplacer `candidate=...`,
`provider=aws|hetzner`, et `lease=<cbx_...>` lorsqu'ils ont besoin d'une référence spécifique ou d'un
bureau Crabbox préchauffé.

Exemples de commandes ClawSweeper :

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

La première commande est explicite et axée sur le scénario. La seconde peut ultérieurement mapper une PR
ou un problème aux scénarios Mantis recommandés à partir des labels, des fichiers modifiés et
des conclusions de l'examen ClawSweeper.

## Cycle de vie d'exécution

1. Acquérir les identifiants.
2. Allouer ou réutiliser une machine virtuelle.
3. Préparer le profil du bureau/navigateur lorsque le scénario nécessite des éléments d'interface utilisateur.
4. Préparer un checkout propre pour la référence de base.
5. Installer les dépendances et construire uniquement ce dont le scénario a besoin.
6. Démarrer une passerelle OpenClaw Gateway enfant avec un répertoire d'état isolé.
7. Configurer le transport en direct, le fournisseur, le modèle et le profil du navigateur.
8. Exécuter le scénario et capturer les preuves de base.
9. Arrêter la passerelle et conserver les journaux.
10. Préparer la référence candidate dans la même machine virtuelle.
11. Exécuter le même scénario et capturer les preuves candidates.
12. Comparer les résultats de l'oracle et les preuves visuelles.
13. Écrire des artefacts Markdown, JSON, journaux, captures d'écran et de trace optionnels.
14. Télécharger les artefacts d'actions GitHub.
15. Publier un message de statut concis pour la PR ou Discord.

Le scénario doit pouvoir échouer de deux manières différentes :

- **Bogue reproduit** : la base a échoué de la manière attendue.
- **Échec du harnais** : la configuration de l'environnement, les identifiants, l'Discord API, le navigateur, ou
  le fournisseur a échoué avant que l'oracle de bogue ne soit significatif.

Le rapport final doit séparer ces cas afin que les responsables ne confondent pas un
environnement instable avec le comportement du produit.

## MVP Discord

Le premier scénario devrait cibler les réactions de statut Discord dans les canaux de guilde où
le mode de livraison de réponse source est `message_tool_only`.

Pourquoi c'est une bonne graine Mantis :

- C'est visible dans Discord sous forme de réactions sur le message déclencheur.
- Il possède un oracle REST solide via l'état de réaction aux messages Discord.
- Il exerce un vrai OpenClaw Gateway Discord de bot, l'authentification du bot Discord, la distribution des messages,
  le mode de livraison de réponse source, l'état de réaction de statut, et le cycle de vie des tours du modèle.
- Il est assez étroit pour garder la première implémentation honnête.

Forme de scénario attendue :

```yaml
id: discord-status-reactions-tool-only
transport: discord
baseline:
  expect:
    reproduced: true
candidate:
  expect:
    fixed: true
config:
  messages:
    ackReaction: "👀"
    ackReactionScope: "group-mentions"
    groupChat:
      visibleReplies: "message_tool"
    statusReactions:
      enabled: true
      timing:
        debounceMs: 0
discord:
  requireMention: true
  notifyChannel: operator-notify
evidence:
  rest:
    messageReactions: true
  browser:
    screenshotMessageRow: true
```

Les preuves de base doivent montrer la réaction d'accusé de réception mise en file d'attente mais aucune
transition de cycle de vie en mode outil uniquement. Les preuves candidates doivent montrer les réactions
de statut du cycle de vie en cours d'exécution lorsque `messages.statusReactions.enabled` est explicitement
true.

La première tranche exécutable est le scénario QA live Discord opt-in :

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

Il configure le SUT avec une gestion de guilde toujours activée, `visibleReplies:
  "message_tool"`, `ackReaction: "👀"`, et des réactions de statut explicites. L'oracle
interroge le vrai message déclencheur Discord et s'attend à ce que la séquence observée
`👀 -> 🤔 -> 👍`. Les artefacts incluent `discord-qa-reaction-timelines.json`,
`discord-status-reactions-tool-only-timeline.html`, et
`discord-status-reactions-tool-only-timeline.png`.

## Éléments QA existants

Mantis devrait s'appuyer sur la pile QA privée existante au lieu de partir de zéro :

- `pnpm openclaw qa discord` exécute déjà une voie live Discord avec des bots de pilote et
  SUT.
- Le lanceur de transport live écrit déjà des rapports et des artefacts de message observé
  sous `.artifacts/qa-e2e/`.
- Les baux d'informations d'identification Convex fournissent déjà un accès exclusif aux informations d'identification
  de transport live partagées.
- Le service de contrôle de navigateur prend déjà en charge les captures d'écran, les instantanés,
  les profils gérés sans tête et les profils CDP distants.
- QA Lab dispose déjà d'une interface utilisateur de débogueur et d'un bus pour les tests de forme de transport.

La première implémentation Mantis peut être un lanceur avant/après léger sur ces
éléments, plus une couche de preuve visuelle.

## Modèle de preuve

Chaque exécution écrit un répertoire d'artefacts stable :

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-summary.json
  baseline/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  candidate/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  comparison.json
  run.log
```

`mantis-summary.json` doit être la source de vérité lisible par machine. Le
rapport Markdown est destiné aux commentaires de PR et à la révision humaine.

Le résumé doit inclure :

- réfs et SHA testés
- transport et identifiant de scénario
- fournisseur de machine et identifiant de machine ou identifiant de bail
- source d'informations d'identification sans valeurs secrètes
- résultat de base
- résultat candidat
- si le bug s'est reproduit sur la base
- si le candidat a corrigé le problème
- chemins des artefacts
- problèmes de configuration ou de nettoyage nettoyés

Les captures d'écran sont des preuves, pas des secrets. Elles nécessitent encore une discipline de rédaction :
les noms de canaux privés, les noms d'utilisateur ou le contenu des messages peuvent apparaître. Pour les PR publics,
privilégiez les liens vers les artefacts GitHub Actions par rapport aux images intégrées jusqu'à ce que l'histoire de la rédaction
soit plus solide.

## Navigateur et VNC

La voie du navigateur a deux modes :

- **Automatisation sans affichage (headless)** : par défaut pour la CI. Chrome s'exécute avec CDP activé et
  Playwright ou le contrôle de navigateur OpenClaw capture des captures d'écran.
- **Secours VNC** : activé sur la même machine virtuelle lorsque la connexion, la MFA, l'anti-automation Discord,
  ou le débogage visuel nécessite une intervention humaine.

Le profil de navigateur de l'observateur Discord doit être suffisamment persistant pour éviter
la connexion à chaque exécution, mais isolé de l'état du navigateur personnel. Un profil
appartient au pool de machines Mantis, et non à l'ordinateur portable d'un développeur.

Lorsque Mantis est bloqué, il publie un message de statut Discord avec :

- id d'exécution
- id de scénario
- fournisseur de machines
- répertoire des artefacts
- instructions de connexion VNC ou noVNC si disponibles
- texte court sur le blocage

Le premier déploiement privé peut publier ces messages sur le canal d'opérateur existant
et passer ensuite à un canal Mantis dédié.

## Machines

Mantis devrait préférer AWS via Crabbox pour la première implémentation distante.
Crabbox nous fournit des machines prêtes, le suivi des baux, l'hydratation, les journaux, les résultats et
le nettoyage. Si la capacité AWS est trop lente ou indisponible, ajoutez un fournisseur Hetzner
derrière la même interface machine.

Configuration minimale de la VM :

- Linux avec une installation Chrome ou Chromium compatible avec le bureau
- Accès CDP pour l'automatisation du navigateur
- VNC ou noVNC pour le secours
- Node 22 et pnpm
- Extraction OpenClaw et cache des dépendances
- Cache du navigateur Chromium Playwright lorsque Playwright est utilisé
- suffisamment de CPU et de mémoire pour un OpenClaw Gateway, un navigateur et une exécution de modèle
- accès sortant vers Discord, GitHub, les fournisseurs de modèles et le courtier d'informations d'identification

La VM ne doit pas conserver de secrets bruts à long terme en dehors des magasins d'informations d'identification ou
de profils de navigateur attendus.

## Secrets

Les secrets résident dans les secrets de l'organisation ou du dépôt GitHub pour les exécutions distantes, et dans
un fichier de secrets local contrôlé par l'opérateur pour les exécutions locales.

Noms de secrets recommandés :

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` pour les téléchargements d'artefacts publics GitHub
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

À long terme, le pool d'informations d'identification Convex doit rester la source normale pour les
informations d'identification de transport en direct. Les secrets GitHub amorcent le courtier et les voies de secours.
Le flux de travail des réactions de statut Discord remappe les secrets Mantis Crabbox vers
les variables d'environnement `CRABBOX_COORDINATOR` et `CRABBOX_COORDINATOR_TOKEN`
que le CLI Crabbox attend. Les noms de secrets GitHub simples `CRABBOX_*` restent
acceptés en guise de solution de repli de compatibilité.

Le lanceur Mantis ne doit jamais imprimer :

- Jeton de bot Discord
- Clés API du fournisseur
- cookies du navigateur
- contenu du profil d'auth
- mots de passe VNC
- charges utiles d'identification brutes

Les téléchargements d'artefacts publics doivent également expurger les métadonnées de la cible Discord telles que le bot,
la guilde, le canal et les identifiants de message. Le flux de travail de fumée GitHub active
`OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` pour cette raison.

Si un jeton est collé par inadvertance dans un ticket, une PR, une discussion ou un journal, faites-le tourner
après que le nouveau secret a été stocké.

## Artefacts GitHub et commentaires de PR

Les flux de travail Mantis doivent télécharger le bundle complet de preuves en tant qu'artefact Actions
court terme. Lorsque le flux de travail est exécuté pour un rapport de bogue ou une PR de correction, il doit également
publier des médias en ligne expurgés dans le bucket Mantis R2/S3 configuré et insérer (upsert) un
commentaire sur ce bogue ou cette PR de correction avec des captures d'écran avant/après en ligne. Ne publiez pas
la preuve principale uniquement sur une PR d'automatisation QA générique. Les journaux bruts, les messages
observés et autres éléments de preuve volumineux restent dans l'artefact Actions.

Les workflows de production doivent publier ces commentaires avec l'application Mantis GitHub, et non
avec `github-actions[bot]`. Stockez l'identifiant de l'application et la clé privée en tant que
secrets GitHub Actions `MANTIS_GITHUB_APP_ID` et `MANTIS_GITHUB_APP_PRIVATE_KEY`. Le workflow utilise un marqueur caché comme clé de upsert, met à jour ce
commentaire lorsque le jeton peut le modifier, et crée un nouveau commentaire appartenant à Mantis lorsqu'un
ancien marqueur appartenant au bot ne peut pas être modifié.

Le commentaire de PR doit être court et visuel :

```md
Mantis Discord Status Reactions QA

Summary: Mantis reran the reported Discord status-reaction bug against the known
bad baseline and the candidate fix. The baseline reproduced the bug, while the
candidate showed the expected queued -> thinking -> done sequence.

- Scenario: `discord-status-reactions-tool-only`
- Run: <workflow run link>
- Artifact: <artifact link>
- Baseline: `<status>` at `<sha>`
- Candidate: `<status>` at `<sha>`

| Baseline            | Candidate           |
| ------------------- | ------------------- |
| <inline screenshot> | <inline screenshot> |
```

Lorsque l'exécution échoue parce que le harnais a échoué, le commentaire doit le dire au lieu
d'impliquer que le candidat a échoué.

## Notes de déploiement privé

Un déploiement privé peut déjà avoir une application Mantis Discord. Réutilisez cette
application au lieu d'en créer une autre lorsqu'elle dispose des bonnes autorisations de bot
et peut être effectuée une rotation en toute sécurité.

Définissez le channel de notification initial de l'opérateur via des secrets ou la configuration
du déploiement. Il peut pointer vers un channel de mainteneur ou d'opérations existant
d'abord, puis passer à un channel Mantis dédié une fois qu'il existe.

Ne mettez pas les identifiants de guilde, les identifiants de channel, les jetons de bot, les cookies du navigateur ou les mots de passe VNC
dans ce document. Stockez-les dans les secrets GitHub, le courtier d'informations d'identification ou le
magasin de secrets local de l'opérateur.

## Ajout d'un scénario

Un scénario Mantis doit déclarer :

- id et titre
- transport
- informations d'identification requises
- politique de ref de base
- politique de ref candidat
- correctif de configuration OpenClaw
- étapes de configuration
- stimulus
- oracle de base attendu
- oracle candidat attendu
- cibles de capture visuelle
- budget de délai d'expiration
- étapes de nettoyage

Les scénarios devraient préférer des oracles petits et typés :

- état de réaction Discord pour les bugs de réaction
- références de message Discord pour les bugs de discussion
- ts de discussion Slack et état de l'API de réaction pour les bugs Slack
- identifiants de message et en-têtes d'e-mail pour les bugs d'e-mail
- captures d'écran du navigateur lorsque l'interface utilisateur est le seul observable fiable

Les contrôles de vision doivent être additifs. Si une API de plateforme peut prouver le bug, utilisez la
API comme oracle de réussite/échec et gardez les captures d'écran pour la confiance humaine.

## Extension du fournisseur

Après Discord, le même runner peut ajouter :

- Slack : réactions, fils, mentions d'application, modales, téléchargements de fichiers.
- Email : authentification Gmail et fils de discussion en utilisant `gog` lorsque les connecteurs ne suffisent pas.
- WhatsApp : connexion QR, ré-identification, livraison de messages, médias, réactions.
- Telegram : filtrage des mentions de groupe, commandes, réactions si disponibles.
- Matrix : salons chiffrés, relations de fil ou de réponse, reprise après redémarrage.

Chaque transport doit avoir un scénario de fumée bon marché et un ou plusieurs scénarios de classe de bugs. Les scénarios visuels coûteux doivent rester optionnels.

## Questions ouvertes

- Quel bot Discord doit être le pilote, et lequel doit être le SUT, lorsque le bot Mantis existant est réutilisé ?
- La connexion du navigateur observateur doit-elle utiliser un compte humain Discord, un compte de test, ou uniquement des preuves REST lisibles par des bots pour la première phase ?
- Combien de temps GitHub doit-il conserver les artefacts Mantis pour les PRs ?
- Quand ClawSweeper doit-il recommander automatiquement Mantis au lieu d'attendre une commande de mainteneur ?
- Les captures d'écran doivent-elles être expurgées ou recadrées avant le téléchargement pour les PRs publiques ?
