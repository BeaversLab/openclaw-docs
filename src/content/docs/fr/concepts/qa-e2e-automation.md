---
summary: "Aperçu de la pile QA : qa-lab, qa-channel, scénarios reposant sur le dépôt, voies de transport en direct, adaptateurs de transport et rapports."
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Aperçu QA"
---

La pile QA privée est conçue pour exercer OpenClaw de manière plus réaliste et structurée en canal qu'un test unitaire unique ne le peut.

Éléments actuels :

- `extensions/qa-channel` : channel de messages synthétique avec les surfaces DM, channel, fil,
  réaction, modification et suppression.
- `extensions/qa-lab` : interface utilisateur de débogueur et bus QA pour observer la transcription,
  injecter des messages entrants et exporter un rapport Markdown.
- `extensions/qa-matrix`, futurs plugins de lanceur : adaptateurs de transport en direct qui
  pilotent un channel réel à l'intérieur d'une passerelle QA enfant.
- `qa/` : actifs d'amorçage reposant sur le dépôt pour la tâche de lancement et les scénarios QA
  de référence.
- [Mantis](/fr/concepts/mantis) : vérification avant et après en direct pour les bugs qui
  nécessitent de vrais transports, des captures d'écran du navigateur, l'état de la VM et les preuves de PR.

## Surface de commande

Chaque flux QA s'exécute sous `pnpm openclaw qa <subcommand>`. Beaucoup ont des alias de script `pnpm qa:*`
; les deux formes sont prises en charge.

| Commande                                            | Objectif                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Auto-vérification QA groupée ; écrit un rapport Markdown.                                                                                                                                                                                                                                                                        |
| `qa suite`                                          | Exécutez des scénarios reposant sur le dépôt contre la voie de la passerelle QA. Alias : `pnpm openclaw qa suite --runner multipass` pour une VM Linux jetable.                                                                                                                                                                  |
| `qa coverage`                                       | Imprimez l'inventaire de couverture des scénarios en markdown (`--json` pour la sortie machine).                                                                                                                                                                                                                                 |
| `qa parity-report`                                  | Comparez deux fichiers `qa-suite-summary.json` et écrivez le rapport de parité agentique.                                                                                                                                                                                                                                        |
| `qa character-eval`                                 | Exécutez le scénario QA de personnage sur plusieurs modèles en direct avec un rapport jugé. Voir [Rapports](#reporting).                                                                                                                                                                                                         |
| `qa manual`                                         | Exécuter une invite ponctuelle contre la voie fournisseur/modèle sélectionnée.                                                                                                                                                                                                                                                   |
| `qa ui`                                             | Démarrez l'interface utilisateur du débogueur QA et le bus QA local (alias : `pnpm qa:lab:ui`).                                                                                                                                                                                                                                  |
| `qa docker-build-image`                             | Construire l'image QA Docker préfabriquée.                                                                                                                                                                                                                                                                                       |
| `qa docker-scaffold`                                | Écrire un échafaudage docker-compose pour le tableau de bord QA + la voie de passerelle.                                                                                                                                                                                                                                         |
| `qa up`                                             | Créez le site QA, démarrez la pile prise en charge par Docker, imprimez l'URL (alias : `pnpm qa:lab:up` ; la variante `:fast` ajoute `--use-prebuilt-image --bind-ui-dist --skip-ui-build`).                                                                                                                                     |
| `qa aimock`                                         | Démarrez uniquement le serveur provider AIMock.                                                                                                                                                                                                                                                                                  |
| `qa mock-openai`                                    | Démarrez uniquement le serveur de fournisseur `mock-openai` conscient des scénarios.                                                                                                                                                                                                                                             |
| `qa credentials doctor` / `add` / `list` / `remove` | Gérez le pool d'identifiants Convex partagé.                                                                                                                                                                                                                                                                                     |
| `qa matrix`                                         | Voie de transport en direct contre un serveur domestique Tuwunel éphémère. Voir [QA Matrix](/fr/concepts/qa-matrix).                                                                                                                                                                                                             |
| `qa telegram`                                       | Voie de transport en direct contre un groupe Telegram privé réel.                                                                                                                                                                                                                                                                |
| `qa discord`                                        | Voie de transport en direct contre un channel de guilde Discord privé réel.                                                                                                                                                                                                                                                      |
| `qa slack`                                          | Voie de transport en direct contre un channel Slack privé réel.                                                                                                                                                                                                                                                                  |
| `qa mantis`                                         | Exécuteur de vérification avant et après pour les bugs de transport en direct, avec des preuves de réactions de statut Discord, un test de fumée Crabbox bureau/navigateur, et un test de fumée Slack dans VNC. Voir [Mantis](/fr/concepts/mantis) et [Mantis Slack Desktop Runbook](/fr/concepts/mantis-slack-desktop-runbook). |

## Flux de l'opérateur

Le flux de l'opérateur QA actuel est un site QA à deux volets :

- Gauche : tableau de bord Gateway (UI de contrôle) avec l'agent.
- Droite : QA Lab, affichant la transcription style Slack et le plan de scénario.

Exécutez-le avec :

```bash
pnpm qa:lab:up
```

Cela crée le site QA, démarre la voie gateway basée sur Docker et expose la
page QA Lab où un opérateur ou une boucle d'automatisation peut donner à l'agent une mission
QA, observer le comportement réel du channel, et enregistrer ce qui a fonctionné, échoué, ou
est resté bloqué.

Pour une itération plus rapide de l'UI du QA Lab sans reconstruire l'image Docker à chaque fois,
démarrez la stack avec un bundle QA Lab monté par liaison :

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` conserve les services Docker sur une image préconstruite et monte en liaison (bind-mounts)
`extensions/qa-lab/web/dist` dans le conteneur `qa-lab`. `qa:lab:watch`
reconstruit ce bundle lors des modifications, et le navigateur se recharge automatiquement lorsque le hachage des ressources du QA Lab
change.

Pour un test de fumée de trace OpenTelemetry local, exécutez :

```bash
pnpm qa:otel:smoke
```

Ce script démarre un récepteur de traces OTLP/HTTP local, exécute le
scénario QA `otel-trace-smoke` avec le plugin `diagnostics-otel` activé, puis
décodifie les spans protobuf exportées et vérifie la forme critique pour la version :
`openclaw.run`, `openclaw.harness.run`, `openclaw.model.call`,
`openclaw.context.assembled`, et `openclaw.message.delivery` doivent être présents ;
les appels du modèle ne doivent pas exporter `StreamAbandoned` lors des tours réussis ; les ID de diagnostic bruts et
les attributs `openclaw.content.*` doivent rester hors de la trace. Il écrit
`otel-smoke-summary.json` à côté des artefacts de la suite QA.

Le QA d'observabilité reste uniquement accessible via l'extraction des sources. Le tarball npm omet intentionnellement
le QA Lab, donc les voies de publication de paquets Docker n'exécutent pas les commandes `qa`. Utilisez
`pnpm qa:otel:smoke` à partir d'une extraction de sources construite lors de la modification de l'instrumentation
de diagnostic.

Pour une voie de test de fumée Matrix réelle de transport, exécutez :

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

La référence complète du CLI, le catalogue de profils/scénarios, les env vars et la disposition des artefacts pour cette voie résident dans [Matrix QA](/fr/concepts/qa-matrix). En un coup d'œil : il provisionne un serveur domestique Tuwunel jetable dans Docker, enregistre des utilisateurs temporaires pilote/SUT/observateur, exécute le vrai plugin Matrix à l'intérieur d'une passerelle QA fille limitée à ce transport (pas de `qa-channel`), puis écrit un rapport Markdown, un résumé JSON, un artefact d'événements observés et un journal de sortie combiné sous `.artifacts/qa-e2e/matrix-<timestamp>/`.

Les scénarios couvrent le comportement du transport que les tests unitaires ne peuvent pas prouver de bout en bout : filtrage des mentions, politiques allow-bot, listes blanches, réponses de premier niveau et en fil, routage DM, gestion des réactions, suppression des modifications entrantes, déduplication du rejouage après redémarrage, récupération des interruptions du serveur domestique, livraison des métadonnées d'approbation, gestion des médias, et les flux de démarrage/récupération/vérification E2EE Matrix. Le profil CLI E2EE pilote également les commandes `openclaw matrix encryption setup` et de vérification via le même serveur domestique jetable avant de vérifier les réponses de la passerelle.

Discord possède également des scénarios optionnels exclusifs à Mantis pour la reproduction de bogues. Utilisez `--scenario discord-status-reactions-tool-only` pour la chronologie de réaction de statut explicite, ou `--scenario discord-thread-reply-filepath-attachment` pour créer un vrai fil Discord et vérifier que `message.thread-reply` préserve une pièce jointe `filePath`. Ces scénarios restent en dehors de la voie Discord en direct par défaut car il s'agit de sondes de reproduction avant/après plutôt que d'une couverture fumatoire large. Le flux de travail Mantis thread-attachment peut également ajouter une vidéo témoin Web Discord connectée lorsque `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` ou `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` est configuré dans l'environnement QA. Ce profil de visualiseur est uniquement pour la capture visuelle ; la décision de réussite/échec provient toujours de l'oracle REST Discord.

L'IC utilise la même surface de commande dans `.github/workflows/qa-live-transports-convex.yml`Matrix. Les exécutions planifiées et manuelles par défaut exécutent le profil rapide Matrix avec les identifiants de la frontière en direct, `--fast`, et `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000`. L'exécution manuelle de `matrix_profile=all` se répartit sur les cinq partitions de profil afin que le catalogue exhaustif puisse s'exécuter en parallèle tout en conservant un répertoire d'artefacts par partition.

Pour les voies de test de fumée réelles de transport pour Telegram, Discord et Slack :

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

Ils ciblent un canal réel préexistant avec deux bots (pilote + SUT). Les env vars requises, les listes de scénarios, les artefacts de sortie et le pool d'identifiants Convex sont documentés dans [Référence QA Telegram, Discord et Slack](TelegramDiscordSlack#telegram-discord-and-slack-qa-reference) ci-dessous.

Pour une exécution complète de la VM de bureau Slack avec le secours VNC, exécutez :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Cette commande loue une machine de bureau/navigateur Crabbox, exécute le canal live Slack à l'intérieur de la VM, ouvre Slack Web dans le navigateur VNC, capture le bureau et copie `slack-qa/`, `slack-desktop-smoke.png` et `slack-desktop-smoke.mp4` lorsque la capture vidéo est disponible vers le répertoire d'artefacts Mantis. Les baux de bureau/navigateur Crabbox fournissent les outils de capture et les packages auxiliaires de construction native/navigateur à l'avance, donc le scénario ne devrait installer des solutions de repli que sur les baux plus anciens. Mantis signale les durées totales et par phase dans `mantis-slack-desktop-smoke-report.md` afin que les exécutions lentes indiquent si le temps a été consacré au préchauffage du bail, à l'acquisition des identifiants, à la configuration distante ou à la copie d'artefacts. Réutilisez `--lease-id <cbx_...>` après vous être connecté manuellement à Slack Web via VNC ; les baux réutilisés maintiennent également le cache du magasin pnpm de Crabbox à chaud. Le `--hydrate-mode source` par défaut vérifie à partir d'une extraction des sources et exécute install/build à l'intérieur de la VM. Utilisez `--hydrate-mode prehydrated` uniquement lorsque l'espace de travail distant réutilisé dispose déjà de `node_modules` et d'un `dist/` construit ; ce mode saute l'étape coûteuse d'installation/construction et échoue de manière sécurisée lorsque l'espace de travail n'est pas prêt. Avec `--gateway-setup`, Mantis laisse une passerelle OpenClaw Slack persistante s'exécuter à l'intérieur de la VM sur le port `38973` ; sans cela, la commande exécute le canal QA Slack bot-à-bot normal et se termine après la capture des artefacts.

La liste de contrôle de l'opérateur, la commande de dispatch du workflow GitHub, le contrat de commentaire de preuve, le tableau de décision du mode d'hydratation, l'interprétation du chronométrage et les étapes de gestion des échecs se trouvent dans [Mantis Slack Desktop Runbook](/fr/concepts/mantis-slack-desktop-runbook).

Pour une tâche de bureau de type agent/CV, exécutez :

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
```

`visual-task` loue ou réutilise une machine de bureau/navigateur Crabbox, démarre `crabbox record --while`, pilote le navigateur visible via un `visual-driver` imbriqué, capture `visual-task.png`, exécute `openclaw infer image describe` sur la capture d'écran lorsque `--vision-mode image-describe` est sélectionné, et écrit `visual-task.mp4`, `mantis-visual-task-summary.json`, `mantis-visual-task-driver-result.json`, et `mantis-visual-task-report.md`. Lorsque `--expect-text` est défini, le prompt de vision demande un verdict JSON structuré et ne réussit que lorsque le model signale une preuve visible positive ; une réponse négative qui se contente de citer le texte cible échoue l'assertion. Utilisez `--vision-mode metadata` pour un smoke test sans model qui prouve le plomberie du bureau, du navigateur, de la capture d'écran et de la vidéo sans appeler de provider de compréhension d'image. L'enregistrement est un artefact requis pour `visual-task` ; si Crabbox n'enregistre aucun `visual-task.mp4` non vide, la tâche échoue même si le pilote visuel a réussi. En cas d'échec, Mantis conserve le bail pour le VNC à moins que la tâche n'ait déjà réussi et que `--keep-lease` n'ait pas été défini.

Avant d'utiliser des identifiants en direct mutualisés, exécutez :

```bash
pnpm openclaw qa credentials doctor
```

Le docteur vérifie l'environnement du courtier Convex, valide les paramètres du point de terminaison et vérifie l'accessibilité admin/list lorsque le secret de mainteneur est présent. Il ne rapporte que le statut défini/manquant pour les secrets.

## Couverture du transport en direct

Les voies de transport en direct partagent un contrat au lieu que chacune invente sa propre forme de liste de scénarios. `qa-channel` est la suite large de comportement produit synthétique et ne fait pas partie de la matrice de couverture des transports en direct.

| Voie     | Canari | Gating par mention | Bot-à-bot | Bloc de liste d'autorisation | Réponse de niveau supérieur | Reprise après redémarrage | Suivi de fil | Isolement de fil | Observation de réaction | Commande d'aide | Enregistrement de commande natif |
| -------- | ------ | ------------------ | --------- | ---------------------------- | --------------------------- | ------------------------- | ------------ | ---------------- | ----------------------- | --------------- | -------------------------------- |
| Matrix   | x      | x                  | x         | x                            | x                           | x                         | x            | x                | x                       |                 |                                  |
| Telegram | x      | x                  | x         |                              |                             |                           |              |                  |                         | x               |                                  |
| Discord  | x      | x                  | x         |                              |                             |                           |              |                  |                         |                 | x                                |
| Slack    | x      | x                  | x         | x                            | x                           | x                         | x            | x                |                         |                 |                                  |

Cela permet de garder `qa-channel`MatrixTelegram comme suite de comportement produit large, tandis que Matrix, Telegram et les futurs transports en direct partagent une liste de contrôle de contrat de transport explicite.

Pour une voie de machine virtuelle Linux jetable sans intégrer Docker dans le chemin QA, exécutez :

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Cela démarre un invité Multipass frais, installe les dépendances, construit OpenClaw
à l'intérieur de l'invité, exécute OpenClaw`qa suite`, puis copie le rapport QA normal et
le résumé dans `.artifacts/qa-e2e/...` sur l'hôte.
Il réutilise le même comportement de sélection de scénario que `qa suite` sur l'hôte.
Les exécutions de suite sur l'hôte et Multipass exécutent plusieurs scénarios sélectionnés en parallèle
avec des workers de passerelle isolés par défaut. `qa-channel` est par défaut à une concurrence
de 4, plafonnée par le nombre de scénarios sélectionnés. Utilisez `--concurrency <count>` pour ajuster
le nombre de workers, ou `--concurrency 1` pour une exécution série.
La commande se termine avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque
vous souhaitez des artefacts sans code de sortie d'échec.
Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour
l'invité : les clés de fournisseur basées sur l'environnement, le chemin de configuration du fournisseur QA en direct, et
`CODEX_HOME` si présent. Gardez `--output-dir` sous la racine du dépôt pour que l'invité
puisse écrire en retour via l'espace de travail monté.

## Référence QA pour Telegram, Discord et Slack

Matrix a une [page dédiée](Matrix/en/concepts/qa-matrixDockerTelegramDiscordSlack) en raison de son nombre de scénarios et de l'approvisionnement de serveur domestique soutenu par Docker. Telegram, Discord et Slack sont plus petits - une poignée de scénarios chacun, pas de système de profil, contre des canaux réels préexistants - donc leur référence se trouve ici.

### Indicateurs CLI partagés

Ces voies s'inscrivent via `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` et acceptent les mêmes drapeaux :

| Indicateur                            | Par défaut                                                      | Description                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | Exécuter uniquement ce scénario. Répétable.                                                                                                   |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | Où les rapports/résumés/messages observés et le journal de sortie sont écrits. Les chemins relatifs sont résolus par rapport à `--repo-root`. |
| `--repo-root <path>`                  | `process.cwd()`                                                 | Racine du référentiel lors de l'appel à partir d'un répertoire de travail neutre.                                                             |
| `--sut-account <id>`                  | `sut`                                                           | Identifiant de compte temporaire dans la configuration de la passerelle QA.                                                                   |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` ou `live-frontier` (l'ancien `live-openai` fonctionne toujours).                                                                |
| `--model <ref>` / `--alt-model <ref>` | par défaut du fournisseur                                       | Références de modèle principal/alternatif.                                                                                                    |
| `--fast`                              | désactivé                                                       | Mode rapide du fournisseur lorsque pris en charge.                                                                                            |
| `--credential-source <env\|convex>`   | `env`                                                           | Voir [Convex credential pool](#convex-credential-pool).                                                                                       |
| `--credential-role <maintainer\|ci>`  | `ci` dans CI, `maintainer` sinon                                | Rôle utilisé lorsque `--credential-source convex`.                                                                                            |

Chaque volet se termine avec un code non nul en cas d'échec d'un scénario. `--allow-failures` écrit les artefacts sans définir de code d'échec.

### QA Telegram

```bash
pnpm openclaw qa telegram
```

Cible un vrai groupe privé Telegram avec deux bots distincts (pilote + SUT). Le bot SUT doit avoir un nom d'utilisateur Telegram ; l'observation bot-à-bot fonctionne mieux lorsque les deux bots ont le **Mode de Communication Bot-à-Bot** activé dans `@BotFather`.

Variables d'environnement requises lors de `--credential-source env` :

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - identifiant de discussion numérique (chaîne).
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

Optionnel :

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` conserve les corps de message dans les artefacts de message observé (par défaut, ils sont masqués).

Scénarios (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`) :

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-status-command`
- `telegram-repeated-command-authorization`
- `telegram-other-bot-command-gating`
- `telegram-context-command`
- `telegram-current-session-status-tool`
- `telegram-reply-chain-exact-marker`
- `telegram-stream-final-single-message`
- `telegram-long-final-reuses-preview`
- `telegram-long-final-three-chunks`

L'ensemble implicite par défaut couvre toujours canary, le filtrage par mention, les réponses aux commandes natives, l'adressage des commandes et les réponses de groupe de bot à bot. Les valeurs par défaut de `mock-openai` incluent également les vérifications déterministes de la chaîne de réponses et du streaming du message final. `telegram-current-session-status-tool` reste optionnel car il n'est stable que lorsqu'il est threadé directement après canary, et non après des réponses de commandes natives arbitraires. Utilisez `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` pour afficher la division par défaut/optionnelle actuelle avec les références de régression.

Artefacts de sortie :

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - inclut le RTT par réponse (envoi du pilote → réponse SUT observée) commençant par canary.
- `telegram-qa-observed-messages.json` - corps des messages expurgés sauf si `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`.

### Discord QA

```bash
pnpm openclaw qa discord
```

Cible un channel de guilde Discord privé réel avec deux bots : un bot pilote contrôlé par le harnais et un bot SUT démarré par la passerelle enfant DiscordOpenClaw via le plugin Discord fourni. Vérifie la gestion des mentions de channel, que le bot SUT a enregistré la commande native `/help` avec Discord, et les scénarios de preuve Mantis optionnels.

Variables d'environnement requises lorsque `--credential-source env` :

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - doit correspondre à l'identifiant utilisateur du bot SUT renvoyé par Discord (sinon la voie échoue rapidement).

Optionnel :

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` conserve les corps des messages dans les artefacts de messages observés.
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` sélectionne le channel vocal/de scène pour `discord-voice-autojoin` ; sans cela, le scénario choisit le premier channel vocal/de scène visible pour le bot SUT.

Scénarios (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`) :

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - scénario vocal optionnel. S'exécute seul, active `channels.discord.voice.autoJoin`DiscordDiscord et vérifie que l'état vocal Discord actuel du bot SUT est le channel vocal/scène cible. Les identifiants Discord Convex peuvent inclure un `voiceChannelId` optionnel ; sinon, le runner découvre le premier channel vocal/scène visible dans la guilde.
- `discord-status-reactions-tool-only` - scénario Mantis optionnel. S'exécute seul car il bascule le SUT vers des réponses de guilde en permanence active et tool uniquement avec `messages.statusReactions.enabled=true`, puis capture une chronologie de réactions REST ainsi que des artefacts visuels HTML/PNG. Les rapports avant/après de Mantis préservent également les artefacts MP4 fournis par le scénario en tant que `baseline.mp4` et `candidate.mp4`.

Exécuter explicitement le scénario de jointure automatique vocale Discord :

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

Exécuter explicitement le scénario de réaction d'état Mantis :

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast
```

Artefacts de sortie :

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - corps des messages expurgés sauf si `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`.
- `discord-qa-reaction-timelines.json` et `discord-status-reactions-tool-only-timeline.png` lors de l'exécution du scénario de réaction de statut.

### QA Slack

```bash
pnpm openclaw qa slack
```

Cible un vrai channel privé Slack avec deux bots distincts : un bot pilote contrôlé par le harnais et un bot SUT démarré par la passerelle enfant OpenClaw via le plugin Slack inclus.

Variables d'environnement requises lorsque `--credential-source env` :

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

Optionnel :

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` conserve les corps des messages dans les artefacts de messages observés.

Scénarios (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`) :

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`

Artefacts de sortie :

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - corps des messages expurgés sauf si `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`.

#### Configuration de l'espace de travail Slack

La voie nécessite deux applications Slack distinctes dans un même espace de travail, ainsi qu'un channel dont les deux bots sont membres :

- `channelId` - l'id `Cxxxxxxxxxx` d'un channel auquel les deux bots ont été invités. Utilisez un channel dédié ; la lane publie à chaque exécution.
- `driverBotToken` - jeton bot (`xoxb-...`) de l'application **Driver**.
- `sutBotToken` - jeton bot (`xoxb-...`Slack) de l'application **SUT**, qui doit être une application Slack distincte du pilote afin que son identifiant utilisateur bot soit distinct.
- `sutAppToken` - jeton de niveau application (`xapp-...`) de l'application SUT avec `connections:write`, utilisé par le mode Socket pour que l'application SUT puisse recevoir des événements.

Privilégiez un espace de travail Slack dédié à la QA plutôt que de réutiliser un espace de travail de production.

Le manifeste SUT ci-dessous réduit intentionnellement l'installation de production du plugin Slack fourni (Slack`extensions/slack/src/setup-shared.ts:10`SlackSlack) aux autorisations et événements couverts par la suite de tests QA Slack en direct. Pour la configuration du canal de production telle que les utilisateurs la voient, consultez la section [Configuration rapide du canal Slack](/fr/channels/slack#quick-setup); la paire Pilote QA/SUT est intentionnellement séparée car la ligne a besoin de deux identifiants utilisateur bot distincts dans un même espace de travail.

**1. Créer l'application Driver**

Allez sur [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → choisissez l'espace de travail QA, collez le manifeste suivant, puis _Install to Workspace_:

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "Test driver bot for OpenClaw QA Slack live lane"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

Copiez le _Bot User OAuth Token_ (OAuth`xoxb-...`) — il devient `driverBotToken`. Le pilote a seulement besoin de publier des messages et de s'identifier ; pas d'événements, pas de mode Socket.

**2. Créer l'application SUT**

Répétez _Create New App → From a manifest_ dans le même espace de travail. Cette application QA utilise intentionnellement une version plus restreinte du manifeste de production du plugin Slack fourni (Slack`extensions/slack/src/setup-shared.ts:10`Slack) : les scopes et événements de réaction sont omis car la suite de tests QA Slack en direct ne couvre pas encore la gestion des réactions.

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed"]
    }
  }
}
```

Une fois que Slack a créé l'application, faites deux choses sur sa page de paramètres :

- _Install to Workspace_ → copiez le _Bot User OAuth Token_ → il devient OAuth`sutBotToken`.
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → ajoutez le scope `connections:write` → enregistrez → copiez la valeur du `xapp-...` → elle devient `sutAppToken`.

Vérifiez que les deux bots ont des identifiants utilisateur distincts en appelant `auth.test` sur chaque jeton. Le runtime distingue le pilote et le SUT par l'identifiant utilisateur ; réutiliser une seule application pour les deux entraînera immédiatement un échec du filtrage par mention.

**3. Créer le channel**

Dans l'espace de travail QA, créez un canal (p. ex. `#openclaw-qa`) et invitez les deux bots depuis l'intérieur du canal :

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

Copiez l'identifiant `Cxxxxxxxxxx` depuis _informations du canal → À propos → Identifiant du canal_ — il devient `channelId`. Un canal public fonctionne ; si vous utilisez un canal privé, les deux applications ont déjà `groups:history`, donc les lectures d'historique du harnais réussiront toujours.

**4. Enregistrez les identifiants**

Deux options. Utilisez les env vars pour le débogage sur une seule machine (définissez les quatre variables `OPENCLAW_QA_SLACK_*` et passez `--credential-source env`), ou amorcez le pool partagé Convex afin que CI et d'autres mainteneurs puissent les louer.

Pour le pool Convex, écrivez les quatre champs dans un fichier JSON :

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

Avec `OPENCLAW_QA_CONVEX_SITE_URL` et `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` exportés dans votre shell, enregistrez et vérifiez :

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

Attendez-vous à `count: 1`, `status: "active"`, sans champ `lease`.

**5. Vérifiez de bout en bout**

Exécutez la lane localement pour confirmer que les deux bots peuvent communiquer entre eux via le broker :

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

Une exécution réussie se termine en bien moins de 30 secondes et `slack-qa-report.md` montre à la fois `slack-canary` et `slack-mention-gating` avec l'état `pass`. Si la voie se bloque pendant ~90 secondes et se termine avec `Convex credential pool exhausted for kind "slack"`, soit le pool est vide, soit chaque ligne est louée — `qa credentials list --kind slack --status all --json` vous indiquera laquelle.

### Pool d'identifiants Convex

Les voies Telegram, Discord, Slack et WhatsApp peuvent louer des identifiants depuis un pool partagé Convex au lieu de lire les env vars ci-dessus. Passez `--credential-source convex` (ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) ; QA Lab acquiert un bail exclusif, envoie un battement de cœur pendant toute la durée de l'exécution et le libère à l'arrêt. Les types de pool sont `"telegram"`, `"discord"`, `"slack"` et `"whatsapp"`.

Formes de payload que le courtier valide sur `admin/add` :

- Telegram (`kind: "telegram"`) : `{ groupId: string, driverToken: string, sutToken: string }` — `groupId` doit être une chaîne d'identifiant de chat numérique.
- Telegram real user (Telegram`kind: "telegram-user"`) : `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`CLITelegram - un bail de compte jetable exclusif utilisé par le pilote CLI TDLib et le témoin visuel Telegram Desktop.
- Discord (Discord`kind: "discord"`) : `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`.
- WhatsApp (WhatsApp`kind: "whatsapp"`) : `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - les numéros de téléphone doivent être des chaînes E.164 distinctes.

Pour une preuve visuelle Telegram en temps réel, préférez une session Crabbox maintenue :

```bash
pnpm qa:telegram-user:crabbox -- start --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json --text /status
pnpm qa:telegram-user:crabbox -- finish --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` détient un bail exclusif Convex `telegram-user`CLITelegram pour le pilote CLI TDLib et le témoin Telegram Desktop, lance l'enregistrement du bureau et laisse le Crabbox actif pour des étapes de reprod arbitraires pilotées par l'agent. Les agents peuvent utiliser `send`, `run`, `screenshot` et `status` jusqu'à satisfaction, puis `finish` collecte la capture d'écran, la vidéo, la vidéo/GIF découpée par mouvement, les sorties des sondes TDLib et les journaux avant de libérer les informations d'identification. `publish --session <file> --pr <number>` comments only the motion GIF by default; `--full-artifacts` est l'adhésion explicite pour les journaux et la sortie JSON. La commande `probe` par défaut reste un raccourci à une seule commande pour des contrôles de fumée `/status` rapides.

Utilisez `--mock-response-file <path>` lorsqu'une PR nécessite un différentiel visuel déterministe : la même réponse de modèle simulé peut être exécutée sur `main`Telegram et sur le tête de la PR alors que le formateur Telegram ou la couche de livraison change. Les valeurs par défaut de capture sont réglées pour les commentaires PR : classe Crabbox standard, enregistrement du bureau à 24fps, GIF de mouvement à 24fps et largeur de prévisualisation de 1920px. Les commentaires avant/après devraient publier un bundle propre qui contient uniquement les GIF prévus.

Les voies Slack peuvent également utiliser le pool. Les vérifications de la forme des payloads Slack résident actuellement dans le runner QA Slack plutôt que dans le broker ; utilisez `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`, avec un identifiant de channel Slack comme `Cxxxxxxxxxx`. Consultez [Setting up the Slack workspace](#setting-up-the-slack-workspace) pour la configuration de l'application et de la portée.

Les env vars opérationnels et le contrat de point de terminaison du broker Convex se trouvent dans [Testing → Shared Telegram credentials via Convex](/fr/help/testing#shared-telegram-credentials-via-convex-v1) (le nom de la section précède le pool multi-channel ; la sémantique de bail est partagée entre les types).

## Seeds basés sur le repo

Les assets de seed résident dans `qa/` :

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Ces éléments sont intentionnellement dans git pour que le plan QA soit visible à la fois par les humains et l'agent.

`qa-lab` doit rester un runner markdown générique. Chaque fichier markdown de scénario est la source de vérité pour une exécution de test et doit définir :

- métadonnées du scénario
- métadonnées de catégorie, de capacité, de voie et de risque facultatives
- réfs docs et code
- exigences de plugin facultatives
- correctif de configuration gateway facultatif
- l'exécutable `qa-flow`

La surface d'exécution réutilisable qui prend en charge `qa-flow` est autorisée à rester générique et transversale. Par exemple, les scénarios markdown peuvent combiner des helpers côté transport avec des helpers côté navigateur qui pilotent l'interface utilisateur de contrôle intégrée via la couture `browser.request` du Gateway sans ajouter de runner spécifique.

Les fichiers de scénario doivent être regroupés par capacité produit plutôt que par dossier de l'arborescence source. Conservez les identifiants de scénario stables lors du déplacement des fichiers ; utilisez `docsRefs` et `codeRefs` pour la traçabilité de l'implémentation.

La liste de base doit rester suffisamment large pour couvrir :

- chat DM et channel
- comportement de fil de discussion
- cycle de vie des actions de message
- rappels cron
- rappel de mémoire
- changement de model
- transfert vers un sous-agent
- lecture de repo et lecture de docs
- une petite tâche de construction telle que Lobster Invaders

## Voies de simulation de fournisseur

`qa suite` possède deux voies de simulation de fournisseur local :

- `mock-openai`OpenClaw est le mock OpenClaw conscient des scénarios. Il reste la voie de mock déterministe par défaut pour la QA reposant sur le repo et les portes de parité.
- `aimock` démarre un serveur de fournisseur soutenu par AIMock pour la couverture de protocole expérimental, de fixtures, d'enregistrement/relecture et de chaos. Il est additif et ne remplace pas le répartiteur de scénarios `mock-openai`.

L'implémentation de la voie de fournisseur réside sous `extensions/qa-lab/src/providers/`.
Chaque fournisseur possède ses propres valeurs par défaut, le démarrage de son serveur local, la configuration du modèle de passerelle, les besoins de mise en lots des profils d'authentification, et les indicateurs de capacités en direct/mock. La suite partagée et le code de la passerelle doivent passer par le registre des fournisseurs au lieu de créer des branches sur les noms des fournisseurs.

## Adaptateurs de transport

`qa-lab` possède une couture de transport générique pour les scénarios de QA markdown. `qa-channel` est le premier adaptateur sur cette couture, mais la cible de conception est plus large : les futurs canaux réels ou synthétiques doivent se connecter au même exécuteur de suite au lieu d'ajouter un exécuteur de QA spécifique au transport.

Au niveau de l'architecture, la séparation est la suivante :

- `qa-lab` gère l'exécution générique de scénarios, la concurrence des workers, l'écriture d'artefacts et les rapports.
- L'adaptateur de transport gère la configuration de la passerelle, la disponibilité, l'observation entrante et sortante, les actions de transport et l'état normalisé du transport.
- Les fichiers de scénarios Markdown sous `qa/scenarios/` définissent le test ; `qa-lab` fournit la surface d'exécution réutilisable qui les exécute.

### Ajouter un channel

Ajouter un channel au système de QA Markdown nécessite exactement deux choses :

1. Un adaptateur de transport pour le channel.
2. Un pack de scénarios qui teste le contrat du channel.

N'ajoutez pas une nouvelle racine de commande QA de premier niveau lorsque l'hôte partagé `qa-lab` peut gérer le flux.

`qa-lab` possède les mécaniques de l'hôte partagé :

- la racine de commande `openclaw qa`
- le démarrage et l'arrêt de la suite
- la concurrence des workers
- l'écriture d'artefacts
- la génération de rapports
- l'exécution de scénarios
- les alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins d'exécuteur possèdent le contrat de transport :

- comment `openclaw qa <runner>` est monté sous la racine `qa` partagée
- comment la passerelle est configurée pour ce transport
- comment la disponibilité est vérifiée
- comment les événements entrants sont injectés
- comment les messages sortants sont observés
- comment les transcriptions et l'état normalisé du transport sont exposés
- comment les actions basées sur le transport sont exécutées
- comment la réinitialisation ou le nettoyage spécifique au transport est géré

Le niveau minimum d'adoption pour un nouveau channel :

1. Gardez `qa-lab` comme propriétaire de la racine `qa` partagée.
2. Implémentez le lanceur de transport sur la couture d'hôte `qa-lab` partagée.
3. Conservez les mécanismes spécifiques au transport dans le plugin du lanceur ou le harnais du channel.
4. Montez le lanceur en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente. Les plugins de lanceur doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`. Gardez `runtime-api.ts` léger ; l'exécution différée du CLI et du lanceur doit rester derrière des points d'entrée séparés.
5. Rédigez ou adaptez des scénarios Markdown dans les répertoires thématiques `qa/scenarios/`.
6. Utilisez les assistants de scénario génériques pour les nouveaux scénarios.
7. Assurez le fonctionnement des alias de compatibilité existants, sauf si le dépôt effectue une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend d'un transport de channel, conservez-le dans le plugin du lanceur ou le harnais du plugin.
- Si un scénario nécessite une nouvelle capacité que plusieurs channels peuvent utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au channel dans `suite.ts`.
- Si un comportement n'est significatif que pour un seul transport, gardez le scénario spécifique au transport et rendez cela explicite dans le contrat du scénario.

### Noms des assistants de scénario

Assistants génériques préférés pour les nouveaux scénarios :

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

Des alias de compatibilité restent disponibles pour les scénarios existants - `waitForQaChannelReady`, `waitForOutboundMessage`, `waitForNoOutbound`, `formatConversationTranscript`, `resetBus` - mais la création de nouveaux scénarios devrait utiliser les noms génériques. Les alias existent pour éviter une migration brutale, et non comme modèle à suivre.

## Rapports

`qa-lab` exporte un rapport de protocole Markdown à partir de la chronologie du bus observée.
Le rapport doit répondre à :

- Ce qui a fonctionné
- Ce qui a échoué
- Ce qui est resté bloqué
- Quels scénarios de suivi valent la peine d'être ajoutés

Pour l'inventaire des scénarios disponibles - utile lors de l'estimation des travaux de suivi ou du câblage d'un nouveau transport - exécutez `pnpm openclaw qa coverage` (ajoutez `--json` pour une sortie lisible par machine).

Pour les vérifications de caractère et de style, exécutez le même scénario sur plusieurs refs de modèle live
et écrivez un rapport Markdown jugé :

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

La commande exécute des processus enfants de passerelle QA locaux, et non Docker. Les scénarios d'évaluation de personnalité doivent définir la persona via `SOUL.md`, puis exécuter des tours d'utilisateur ordinaires tels que le chat, l'aide de l'espace de travail et de petites tâches sur fichiers. Le modèle candidat ne doit pas être informé qu'il est en cours d'évaluation. La commande conserve chaque transcription complète, enregistre des statistiques de base, puis demande aux modèles juges en mode rapide avec un raisonnement `xhigh` lorsque cela est pris en charge, afin de classer les exécutions par naturel, ambiance et humour. Utilisez `--blind-judge-models` lors de la comparaison de providers : l'invite du juge reçoit toujours chaque transcription et le statut de l'exécution, mais les références candidates sont remplacées par des étiquettes neutres telles que `candidate-01` ; le rapport fait correspondre les classements aux vraies références après l'analyse.
Les exécutions candidates utilisent par défaut la réflexion `high`, avec `medium` pour GPT-5.5 et `xhigh` pour les anciennes références d'évaluation OpenAI qui la prennent en charge. Remplacez un candidat spécifique en ligne avec `--model provider/model,thinking=<level>`. `--thinking <level>` définit toujours un repli global, et l'ancienne forme `--model-thinking <provider/model=level>` est conservée pour la compatibilité.
Les références candidates OpenAI utilisent par défaut le mode rapide, donc un traitement prioritaire est utilisé lorsque le provider le prend en charge. Ajoutez `,fast`, `,no-fast` ou `,fast=false` en ligne lorsqu'un seul candidat ou juge a besoin d'une modification. Passez `--fast` uniquement lorsque vous souhaitez forcer le mode rapide pour chaque modèle candidat. Les durées des candidats et des juges sont enregistrées dans le rapport pour l'analyse de référence, mais les invites des juges indiquent explicitement de ne pas classer par vitesse.
Les exécutions de modèles candidats et juges utilisent par défaut une concurrence de 16. Réduisez `--concurrency` ou `--judge-concurrency` lorsque les limites du provider ou la pression de la passerelle locale rendent une exécution trop bruyante.
Lorsqu'aucun `--model` candidat n'est passé, l'évaluation de personnalité utilise par défaut `openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`,
`anthropic/claude-sonnet-4-6`, `zai/glm-5.1`,
`moonshot/kimi-k2.5` et
`google/gemini-3.1-pro-preview` lorsqu'aucun `--model` n'est passé.
Lorsqu'aucun `--judge-model` n'est passé, les juges utilisent par défaut
`openai/gpt-5.5,thinking=xhigh,fast` et
`anthropic/claude-opus-4-6,thinking=high`.

## Documentation connexe

- [QA Matrix](Matrix/en/concepts/qa-matrix)
- [Canal QA](/fr/channels/qa-channel)
- [Tests](/fr/help/testing)
- [Tableau de bord](/fr/web/dashboard)
