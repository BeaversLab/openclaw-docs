---
summary: "Vue d'ensemble de la pile QA : qa-lab, qa-channel, scénarios reposant sur un dépôt, voies de transport en direct, adaptateurs de transport et rapports."
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Vue d'ensemble de la QA"
---

La pile QA privée est conçue pour exercer OpenClaw de manière plus réaliste et structurée en canal qu'un test unitaire unique ne le peut.

Éléments actuels :

- `extensions/qa-channel` : canal de messages synthétiques avec des surfaces de DM, de canal, de fil de discussion, de réaction, de modification et de suppression.
- `extensions/qa-lab` : interface utilisateur du débogueur et bus QA pour observer la transcription, injecter des messages entrants et exporter un rapport Markdown.
- `extensions/qa-matrix`, futurs plugins de lanceur : adaptateurs de transport en direct qui pilotent un canal réel à l'intérieur d'une passerelle QA enfant.
- `qa/` : ressources d'amorçage (seed) reposant sur un dépôt pour la tâche de lancement et les scénarios QA de référence.

## Surface de commande

Chaque flux QA s'exécute sous `pnpm openclaw qa <subcommand>`. Beaucoup ont des alias de script `pnpm qa:*` ; les deux formes sont prises en charge.

| Commande                                            | Objectif                                                                                                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Auto-vérification QA fournie ; écrit un rapport Markdown.                                                                                                                               |
| `qa suite`                                          | Exécuter des scénarios reposant sur un dépôt contre la voie de passerelle QA. Alias : `pnpm openclaw qa suite --runner multipass` pour une VM Linux éphémère.                           |
| `qa coverage`                                       | Afficher l'inventaire de couverture des scénarios au format markdown (`--json` pour la sortie machine).                                                                                 |
| `qa parity-report`                                  | Comparer deux fichiers `qa-suite-summary.json` et écrire le rapport de parité agentic.                                                                                                  |
| `qa character-eval`                                 | Exécuter le scénario QA de personnage sur plusieurs modèles en direct avec un rapport jugé. Voir [Rapports](#reporting).                                                                |
| `qa manual`                                         | Exécuter une invite ponctuelle contre la voie fournisseur/modèle sélectionnée.                                                                                                          |
| `qa ui`                                             | Démarrer l'interface utilisateur du débogueur QA et le bus QA local (alias : `pnpm qa:lab:ui`).                                                                                         |
| `qa docker-build-image`                             | Construire l'image QA Docker préconfigurée.                                                                                                                                             |
| `qa docker-scaffold`                                | Écrire une structure docker-compose pour le tableau de bord QA + la voie de passerelle.                                                                                                 |
| `qa up`                                             | Générez le site QA, démarrez la pile soutenue par Docker, imprimez l'URL (alias : `pnpm qa:lab:up` ; la variante `:fast` ajoute `--use-prebuilt-image --bind-ui-dist --skip-ui-build`). |
| `qa aimock`                                         | Démarrez uniquement le serveur provider AIMock.                                                                                                                                         |
| `qa mock-openai`                                    | Démarrez uniquement le serveur provider `mock-openai` tenant compte des scénarios.                                                                                                      |
| `qa credentials doctor` / `add` / `list` / `remove` | Gérez le pool d'identifiants Convex partagés.                                                                                                                                           |
| `qa matrix`                                         | Voie de transport en direct sur un serveur domestique Tuwunel jetable. Voir [QA Matrix](/fr/concepts/qa-matrix).                                                                        |
| `qa telegram`                                       | Voie de transport en direct sur un groupe privé réel Telegram.                                                                                                                          |
| `qa discord`                                        | Voie de transport en direct sur un channel de guilde privé réel Discord.                                                                                                                |

## Flux de l'opérateur

Le flux actuel de l'opérateur QA est un site QA à deux volets :

- Gauche : Tableau de bord Gateway (Interface de contrôle) avec l'agent.
- Droite : QA Lab, affichant la transcription style Slack et le plan de scénario.

Lancez-le avec :

```bash
pnpm qa:lab:up
```

Cela génère le site QA, démarre la voie gateway soutenue par Docker, et expose la
page QA Lab où un opérateur ou une boucle d'automatisation peut donner à l'agent une mission QA,
observer le comportement réel du channel, et enregistrer ce qui a fonctionné, échoué, ou
resté bloqué.

Pour une itération plus rapide de l'interface QA Lab sans reconstruire l'image Docker à chaque fois,
démarrez la pile avec un bundle QA Lab monté par liaison :

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` maintient les services Docker sur une image préconstruite et monte par liaison
`extensions/qa-lab/web/dist` dans le conteneur `qa-lab`. `qa:lab:watch`
reconstruit ce bundle lors des modifications, et le navigateur se recharge automatiquement lorsque le hachage
des ressources QA Lab change.

Pour un test de fumée de trace OpenTelemetry local, exécutez :

```bash
pnpm qa:otel:smoke
```

Ce script démarre un récepteur de trace OTLP/HTTP local, exécute le scénario QA `otel-trace-smoke` avec le plugin `diagnostics-otel` activé, puis décode les spans protobuf exportées et vérifie la structure critique pour la version : `openclaw.run`, `openclaw.harness.run`, `openclaw.model.call`, `openclaw.context.assembled` et `openclaw.message.delivery` doivent être présents ; les appels model ne doivent pas exporter `StreamAbandoned` lors des tours réussis ; les ID de diagnostic bruts et les attributs `openclaw.content.*` ne doivent pas figurer dans la trace. Il écrit `otel-smoke-summary.json` à côté des artefacts de la suite QA.

Le QA d'observabilité reste uniquement dans le source-checkout. L'archive tar npm omet intentionnellement QA Lab, donc les lignes de publication Docker du paquet n'exécutent pas les commandes `qa`. Utilisez `pnpm qa:otel:smoke` à partir d'un source-checkout construit lors de la modification de l'instrumentation de diagnostic.

Pour une ligne de test de fumée Matrix réelle de transport, exécutez :

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

La référence complète CLI, le catalogue de profils/scénarios, les env vars et la disposition des artefacts pour cette ligne se trouvent dans [Matrix QA](/fr/concepts/qa-matrix). En bref : il provisionne un homeserver Tuwunel éphémère dans Docker, enregistre des utilisateurs temporaires (pilote/SUT/observateur), exécute le plugin réel Matrix dans une passerelle QA enfant délimitée à ce transport (pas de `qa-channel`), puis écrit un rapport Markdown, un résumé JSON, un artefact d'événements observés et un journal de sortie combiné sous `.artifacts/qa-e2e/matrix-<timestamp>/`.

Pour les lignes de test de fumée Telegram et Discord réelles de transport :

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
```

Les deux ciblent un channel réel préexistant avec deux bots (pilote + SUT). Les env vars requises, les listes de scénarios, les artefacts de sortie et le pool d'informations d'identification Convex sont documentés dans [Telegram et Discord QA reference](#telegram-and-discord-qa-reference) ci-dessous.

Avant d'utiliser les identifiants en direct mutualisés, exécutez :

```bash
pnpm openclaw qa credentials doctor
```

Le doctor vérifie l'environnement du courtier Convex, valide les paramètres du point de terminaison et vérifie l'accessibilité admin/list lorsque le secret de maintenance est présent. Il ne signale que l'état défini/manquant pour les secrets.

## Couverture du transport en direct

Les voies de transport en direct partagent un même contrat au lieu que chacune n'invente sa propre forme de liste de scénarios. `qa-channel` est la suite large de comportement produit synthétique et ne fait pas partie de la matrice de couverture du transport en direct.

| Voie     | Canary | Filtrage des mentions | Bloc de liste verte | Réponse de premier niveau | Reprise après redémarrage | Suivi de discussion | Isolation de discussion | Observation de réaction | Commande d'aide | Enregistrement de commande native |
| -------- | ------ | --------------------- | ------------------- | ------------------------- | ------------------------- | ------------------- | ----------------------- | ----------------------- | --------------- | --------------------------------- |
| Matrix   | x      | x                     | x                   | x                         | x                         | x                   | x                       | x                       |                 |                                   |
| Telegram | x      | x                     |                     |                           |                           |                     |                         |                         | x               |                                   |
| Discord  | x      | x                     |                     |                           |                           |                     |                         |                         |                 | x                                 |

Cela maintient `qa-channel` comme la suite large de comportement produit tandis que Matrix,
Telegram et les futurs transports en direct partagent une liste de contrôle
explicite de contrat de transport.

Pour une voie VM Linux éphémère sans intégrer Docker dans le chemin QA, exécutez :

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Cela démarre un invité Multipass frais, installe les dépendances, construit OpenClaw
à l'intérieur de l'invité, exécute `qa suite`, puis copie le rapport QA normal et
le résumé dans `.artifacts/qa-e2e/...` sur l'hôte.
Il réutilise le même comportement de sélection de scénario que `qa suite` sur l'hôte.
Les exécutions de suite sur l'hôte et Multipass exécutent par défaut plusieurs scénarios
sélectionnés en parallèle avec des workers de passerelle isolés. `qa-channel` est par défaut
couplé à une concurrence de 4, plafonnée par le nombre de scénarios sélectionnés. Utilisez `--concurrency <count>`
pour régler le nombre de workers, ou `--concurrency 1` pour une exécution en série.
La commande se termine avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures`
lorsque vous voulez les artefacts sans code de sortie d'échec.
Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui
sont pratiques pour l'invité : les clés de fournisseur basées sur les variables d'environnement,
le chemin de configuration du fournisseur QA en direct et `CODEX_HOME` si présent. Gardez `--output-dir`
sous la racine du repo pour que l'invité puisse écrire en retour via l'espace de travail monté.

## Référence QA Telegram et Discord

Matrix dispose d'une [page dédiée](/fr/concepts/qa-matrix) en raison de son nombre de scénarios et de l'approvisionnement de serveur domestique soutenu par Docker. Telegram et Discord sont plus petits — une poignée de scénarios chacun, pas de système de profil, contre des canaux réels préexistants — donc leur référence se trouve ici.

### Indicateurs CLI partagés

Les deux voies s'enregistrent via `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` et acceptent les mêmes drapeaux :

| Drapeau                               | Par défaut                                                | Description                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | —                                                         | Exécuter uniquement ce scénario. Répétable.                                                                                                           |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord}-<timestamp>` | Emplacement d'écriture des rapports/résumés/messages observés et du journal de sortie. Les chemins relatifs sont résolus par rapport à `--repo-root`. |
| `--repo-root <path>`                  | `process.cwd()`                                           | Racine du dépôt lors de l'appel depuis un cwd neutre.                                                                                                 |
| `--sut-account <id>`                  | `sut`                                                     | Identifiant de compte temporaire dans la configuration de la passerelle QA.                                                                           |
| `--provider-mode <mode>`              | `live-frontier`                                           | `mock-openai` ou `live-frontier` (l'ancien `live-openai` fonctionne toujours).                                                                        |
| `--model <ref>` / `--alt-model <ref>` | valeur par défaut du provider                             | Références de model principal/alternatif.                                                                                                             |
| `--fast`                              | désactivé                                                 | Mode rapide du provider lorsque pris en charge.                                                                                                       |
| `--credential-source <env\|convex>`   | `env`                                                     | Voir [Convex credential pool](#convex-credential-pool).                                                                                               |
| `--credential-role <maintainer\|ci>`  | `ci` dans CI, `maintainer` sinon                          | Rôle utilisé lorsque `--credential-source convex`.                                                                                                    |

Les deux quittent avec un code non nul en cas d'échec d'un scénario. `--allow-failures` écrit les artefacts sans définir de code de sortie d'échec.

### QA Telegram

```bash
pnpm openclaw qa telegram
```

Cible un vrai groupe privé Telegram avec deux bots distincts (pilote + SUT). Le bot SUT doit avoir un nom d'utilisateur Telegram ; l'observation bot à bot fonctionne mieux lorsque les deux bots ont le **Mode de communication bot à bot** activé dans `@BotFather`.

Variables d'environnement requises lorsque `--credential-source env` :

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` — identifiant de chat numérique (chaîne).
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

Optionnel :

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` conserve les corps des messages dans les artefacts de messages observés (par défaut, ils sont masqués).

Scénarios (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts:44`) :

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-context-command`

Artefacts de sortie :

- `telegram-qa-report.md`
- `telegram-qa-summary.json` — inclut le RTT par réponse (envoi du pilote → réponse SUT observée) en commençant par le canary.
- `telegram-qa-observed-messages.json` — corps des messages rédigés sauf si `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`.

### QA Discord

```bash
pnpm openclaw qa discord
```

Cible un vrai channel de guilde Discord privé avec deux bots : un bot pilote contrôlé par le harnais et un bot SUT démarré par la passerelle OpenClaw enfant via le plugin Discord inclus. Vérifie la gestion des mentions de channel et que le bot SUT a enregistré la commande native `/help` avec Discord.

Env vars requises lorsque `--credential-source env` :

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` — doit correspondre à l'identifiant utilisateur du bot SUT renvoyé par Discord (la voie échoue rapidement sinon).

Optionnel :

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` conserve les corps des messages dans les artefacts de messages observés.

Scénarios (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`) :

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`

Artefacts de sortie :

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` — corps des messages rédigés sauf si `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`.

### Réserve d'informations d'identification Convex

Les voies Telegram et Discord peuvent louer des informations d'identification depuis un pool Convex partagé au lieu de lire les env vars ci-dessus. Passez `--credential-source convex` (ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) ; QA Lab acquiert un bail exclusif, envoie un battement de cœur pendant la durée de l'exécution et le libère à l'arrêt. Les types de pools sont `"telegram"` et `"discord"`.

Formes de payload que le courtier valide sur `admin/add` :

- Telegram (`kind: "telegram"`) : `{ groupId: string, driverToken: string, sutToken: string }` — `groupId` doit être une chaîne d'identifiant de chat numérique.
- Discord (`kind: "discord"`) : `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`.

Les env vars opérationnelles et le contrat de point de terminaison du broker Convex se trouvent dans [Testing → Shared Telegram credentials via Convex](/fr/help/testing#shared-telegram-credentials-via-convex-v1) (le nom de la section précède la prise en charge de Discord ; la sémantique du broker est identique pour les deux types).

## Seeds reposant sur le repo

Les ressources de seed se trouvent dans `qa/` :

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Ces éléments sont intentionnellement dans git afin que le plan de QA soit visible à la fois par les humains et l'agent.

`qa-lab` doit rester un exécuteur de markdown générique. Chaque fichier markdown de scénario est la source de vérité pour une exécution de test et doit définir :

- les métadonnées du scénario
- les métadonnées de catégorie, de capacité, de voie et de risque facultatives
- les docs et les refs de code
- les exigences de plugin facultatives
- le correctif de configuration de la passerelle facultatif
- le `qa-flow` exécutable

La surface d'exécution réutilisable qui prend en charge `qa-flow` est autorisée à rester générique et transversale. Par exemple, les scénarios markdown peuvent combiner des helpers côté transport avec des helpers côté navigateur qui pilotent l'interface de contrôle intégrée via la jointure Gateway `browser.request` sans ajouter d'exécuteur de cas particulier.

Les fichiers de scénario doivent être regroupés par capacité produit plutôt que par dossier de l'arborescence source. Gardez les IDs de scénario stables lors du déplacement des fichiers ; utilisez `docsRefs` et `codeRefs` pour la traçabilité de l'implémentation.

La liste de base doit rester suffisamment large pour couvrir :

- le chat DM et channel
- le comportement des fils de discussion
- le cycle de vie des actions de message
- les rappels cron
- le rappel de mémoire
- le changement de model
- le transfert vers le sous-agent
- la lecture de repo et la lecture de docs
- une petite tâche de construction telle que Lobster Invaders

## Voies de simulation du provider

`qa suite` a deux voies de simulation locales de provider :

- `mock-openai` est le simulacre OpenClaw conscient des scénarios. Il reste la voie de simulacre déterministe par défaut pour la QA reposant sur le repo et les portes de parité.
- `aimock` démarre un serveur de provider soutenu par AIMock pour la couverture expérimentale du protocole, des fixtures, de l'enregistrement/lecture et du chaos. Il est additif et ne remplace pas le répartiteur de scénario `mock-openai`.

L'implémentation de la voie (lane) du fournisseur réside sous `extensions/qa-lab/src/providers/`. Chaque fournisseur possède ses valeurs par défaut, le démarrage de son serveur local, la configuration du modèle de passerelle, les besoins de mise en scène du profil d'authentification (auth-profile) et les indicateurs de capacités en direct/mock. La suite partagée et le code de la passerelle devraient être acheminés via le registre du fournisseur au lieu de créer des branches sur les noms des fournisseurs.

## Adaptateurs de transport

`qa-lab` possède une jointure de transport générique pour les scénarios QA en markdown. `qa-channel` est le premier adaptateur sur cette jointure, mais la cible de conception est plus large : les futurs canaux réels ou synthétiques devraient se connecter au même exécuteur de suite au lieu d'ajouter un exécuteur QA spécifique au transport.

Au niveau de l'architecture, la répartition est la suivante :

- `qa-lab` gère l'exécution générique des scénarios, la concurrence des travailleurs, l'écriture des artefacts et les rapports.
- L'adaptateur de transport gère la configuration de la passerelle, l'état de préparation (readiness), l'observation entrante et sortante, les actions de transport et l'état de transport normalisé.
- Les fichiers de scénarios Markdown sous `qa/scenarios/` définissent le test ; `qa-lab` fournit la surface d'exécution réutilisable qui les exécute.

### Ajouter un canal

Ajouter un canal au système QA Markdown nécessite exactement deux choses :

1. Un adaptateur de transport pour le canal.
2. Un pack de scénarios qui teste le contrat du canal.

N'ajoutez pas une nouvelle racine de commande QA de premier niveau lorsque l'hôte partagé `qa-lab` peut gérer le flux.

`qa-lab` gère la mécanique de l'hôte partagé :

- la racine de commande `openclaw qa`
- le démarrage et l'arrêt de la suite
- la concurrence des travailleurs
- l'écriture des artefacts
- la génération de rapports
- l'exécution des scénarios
- les alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins de l'exécuteur (Runner plugins) gèrent le contrat de transport :

- la manière dont `openclaw qa <runner>` est monté sous la racine partagée `qa`
- la manière dont la passerelle est configurée pour ce transport
- la manière dont l'état de préparation est vérifié
- la manière dont les événements entrants sont injectés
- la manière dont les messages sortants sont observés
- la manière dont les transcriptions et l'état normalisé du transport sont exposés
- la manière dont les actions basées sur le transport sont exécutées
- la manière dont la réinitialisation ou le nettoyage spécifique au transport est géré

Le niveau minimum d'adoption pour un nouveau canal :

1. Gardez `qa-lab` comme propriétaire de la racine partagée `qa`.
2. Implémentez le transport runner sur le point de jonction d'hôte partagé `qa-lab`.
3. Conservez les mécanismes spécifiques au transport à l'intérieur du plugin runner ou du harnais de channel.
4. Montez le runner en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente. Les plugins runner doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`. Gardez `runtime-api.ts` léger ; l'exécution paresseuse de la CLI et du runner doit rester derrière des points d'entrée distincts.
5. Rédigez ou adaptez des scénarios markdown dans les répertoires thématiques `qa/scenarios/`.
6. Utilisez les assistants de scénario génériques pour les nouveaux scénarios.
7. Assurez le fonctionnement des alias de compatibilité existants, sauf si le dépôt effectue une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend d'un transport de channel, conservez-le dans ce plugin runner ou ce harnais de plugin.
- Si un scénario nécessite une nouvelle capacité que plusieurs channels peuvent utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au channel dans `suite.ts`.
- Si un comportement n'a de sens que pour un seul transport, gardez le scénario spécifique au transport et rendez cela explicite dans le contrat du scénario.

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

Des alias de compatibilité restent disponibles pour les scénarios existants — `waitForQaChannelReady`, `waitForOutboundMessage`, `waitForNoOutbound`, `formatConversationTranscript`, `resetBus` — mais la création de nouveaux scénarios devrait utiliser les noms génériques. Les alias existent pour éviter une migration brutale, et non comme modèle à suivre.

## Rapport

`qa-lab` exporte un rapport de protocole Markdown à partir de la chronologie observée du bus.
Le rapport doit répondre :

- Ce qui a fonctionné
- Ce qui a échoué
- Ce qui est resté bloqué
- Quels scénarios de suivi valent la peine d'être ajoutés

Pour l'inventaire des scénarios disponibles — utile lors de l'estimation du travail de suivi ou du câblage d'un nouveau transport — exécutez `pnpm openclaw qa coverage` (ajoutez `--json` pour une sortie lisible par machine).

Pour les vérifications de caractère et de style, exécutez le même scénario sur plusieurs références de modèle live
et rédigez un rapport Markdown évalué :

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

La commande exécute des processus enfants locaux de passerelle QA, et non Docker. Les scénarios d'évaluation de caractère doivent définir le persona via `SOUL.md`, puis exécuter des tours utilisateur ordinaires tels que le chat, l'aide de l'espace de travail et les petites tâches sur fichiers. Le modèle candidat ne doit pas être informé qu'il est en cours d'évaluation. La commande conserve chaque transcription complète, enregistre des statistiques de base, puis demande aux modèles juges en mode rapide avec un raisonnement `xhigh` lorsque pris en charge de classer les exécutions par naturel, ambiance et humour. Utilisez `--blind-judge-models` lors de la comparaison de providers : l'invite du juge reçoit toujours chaque transcription et le statut d'exécution, mais les références candidates sont remplacées par des étiquettes neutres telles que `candidate-01` ; le rapport remappe les classements vers les références réelles après analyse. Les exécutions candidates utilisent par défaut la réflexion `high`, avec `medium` pour GPT-5.5 et `xhigh` pour les anciennes références d'évaluation OpenAI qui la prennent en charge. Remplacez un candidat spécifique en ligne avec `--model provider/model,thinking=<level>`. `--thinking <level>` définit toujours un repli global, et l'ancien formulaire `--model-thinking <provider/model=level>` est conservé pour compatibilité. Les références candidates OpenAI utilisent par défaut le mode rapide afin que le traitement prioritaire soit utilisé là où le provider le prend en charge. Ajoutez `,fast`, `,no-fast` ou `,fast=false` en ligne lorsqu'un candidat ou juge unique nécessite une modification. Passez `--fast` uniquement lorsque vous souhaitez forcer le mode rapide pour chaque modèle candidat. Les durées des candidats et des juges sont enregistrées dans le rapport pour l'analyse de benchmark, mais les invites des juges indiquent explicitement de ne pas classer par vitesse. Les exécutions de modèles candidats et juges utilisent par défaut une concurrence de 16. Réduisez `--concurrency` ou `--judge-concurrency` lorsque les limites du provider ou la pression de la passerelle locale rendent une exécution trop bruyante. Lorsqu'aucun candidat `--model` n'est passé, l'évaluation de caractère utilise par défaut `openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`, `moonshot/kimi-k2.5` et `google/gemini-3.1-pro-preview` lorsque aucun `--model` n'est passé. Lorsqu'aucun `--judge-model` n'est passé, les juges utilisent par défaut `openai/gpt-5.5,thinking=xhigh,fast` et `anthropic/claude-opus-4-6,thinking=high`.

## Documentation connexe

- [QA Matrix](/fr/concepts/qa-matrix)
- [QA Channel](/fr/channels/qa-channel)
- [Tests](/fr/help/testing)
- [Tableau de bord](/fr/web/dashboard)
