---
summary: "Aperçu de la pile QA : qa-lab, qa-channel, scénarios basés sur le dépôt, voies de transport en direct, adaptateurs de transport et rapports."
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Aperçu QA"
---

La pile QA privée est conçue pour exercer OpenClaw de manière plus réaliste et structurée en canal qu'un test unitaire unique ne le peut.

Éléments actuels :

- `extensions/qa-channel` : channel de messages synthétique avec surfaces de DM, channel, fil,
  réaction, modification et suppression.
- `extensions/qa-lab` : interface utilisateur de débogage et bus QA pour observer la transcription,
  injecter des messages entrants et exporter un rapport Markdown.
- `extensions/qa-matrix`, plugins de runner futurs : adaptateurs de transport en direct qui
  pilotent un channel réel à l'intérieur d'une passerelle QA enfant.
- `qa/` : actifs d'amorçage basés sur le dépôt pour la tâche de lancement et les scénarios QA
  de référence.
- [Mantis](/fr/concepts/mantis) : vérification avant et après en direct pour les bogues qui
  nécessitent des transports réels, des captures d'écran du navigateur, l'état de la VM et des preuves de PR.

## Surface de commande

Chaque flux QA s'exécute sous `pnpm openclaw qa <subcommand>`. Beaucoup ont des alias de script
`pnpm qa:*` ; les deux formes sont prises en charge.

| Commande                                            | Objectif                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Auto-vérification QA groupée ; écrit un rapport Markdown.                                                                                                                                                                                                                                                                                |
| `qa suite`                                          | Exécuter des scénarios basés sur le dépôt sur la voie de la passerelle QA. Alias : `pnpm openclaw qa suite --runner multipass` pour une VM Linux jetable.                                                                                                                                                                                |
| `qa coverage`                                       | Imprimer l'inventaire de couverture des scénarios en markdown (`--json` pour la sortie machine).                                                                                                                                                                                                                                         |
| `qa parity-report`                                  | Comparer deux fichiers `qa-suite-summary.json` et rédiger le rapport de parité agentique, ou utiliser `--runtime-axis --token-efficiency` pour rédiger des rapports de parité d'exécution Codex-vs-OpenClaw et d'efficacité des jetons à partir d'un résumé de paire d'exécution.                                                        |
| `qa character-eval`                                 | Exécuter le scénario QA de personnage sur plusieurs modèles en direct avec un rapport jugé. Voir [Rapports](#reporting).                                                                                                                                                                                                                 |
| `qa manual`                                         | Exécuter une invite ponctuelle contre la voie fournisseur/modèle sélectionnée.                                                                                                                                                                                                                                                           |
| `qa ui`                                             | Démarrer l'interface utilisateur du débogueur QA et le bus QA local (alias : `pnpm qa:lab:ui`).                                                                                                                                                                                                                                          |
| `qa docker-build-image`                             | Construire l'image QA Docker préfabriquée.                                                                                                                                                                                                                                                                                               |
| `qa docker-scaffold`                                | Écrire un échafaudage docker-compose pour le tableau de bord QA + la voie de passerelle.                                                                                                                                                                                                                                                 |
| `qa up`                                             | Construire le site QA, démarrer la pile soutenue par Docker, imprimer l'URL (alias : `pnpm qa:lab:up` ; la variante `:fast` ajoute `--use-prebuilt-image --bind-ui-dist --skip-ui-build`).                                                                                                                                               |
| `qa aimock`                                         | Démarrez uniquement le serveur provider AIMock.                                                                                                                                                                                                                                                                                          |
| `qa mock-openai`                                    | Démarrer uniquement le serveur fournisseur `mock-openai` sensible aux scénarios.                                                                                                                                                                                                                                                         |
| `qa credentials doctor` / `add` / `list` / `remove` | Gérez le pool d'identifiants Convex partagé.                                                                                                                                                                                                                                                                                             |
| `qa matrix`                                         | Voie de transport en direct contre un serveur domestique Tuwunel jetable. Voir [QA Matrix](/fr/concepts/qa-matrix).                                                                                                                                                                                                                      |
| `qa telegram`                                       | Voie de transport en direct contre un groupe Telegram privé réel.                                                                                                                                                                                                                                                                        |
| `qa discord`                                        | Voie de transport en direct contre un channel de guilde Discord privé réel.                                                                                                                                                                                                                                                              |
| `qa slack`                                          | Voie de transport en direct contre un channel Slack privé réel.                                                                                                                                                                                                                                                                          |
| `qa mantis`                                         | Exécuteur de vérification avant et après pour les bugs de transport en direct, avec des preuves de réactions de statut Discord, des tests de fumée du bureau/navigateur Crabbox, et des tests de fumée Slack-dans-VNC. Voir [Mantis](/fr/concepts/mantis) et [Manuel de bureau Mantis Slack](/fr/concepts/mantis-slack-desktop-runbook). |

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
reconstruit ce bundle lors des modifications, et le navigateur se recharge automatiquement lorsque le hachage de ressources du QA Lab
change.

Pour un test de fumée local des signaux OpenTelemetry, exécutez :

```bash
pnpm qa:otel:smoke
```

Ce script démarre un récepteur OTLP/HTTP local, exécute le scénario QA `otel-trace-smoke` avec le plugin `diagnostics-otel` activé, puis vérifie que les traces, les métriques et les journaux sont exportés. Il décode les spans de trace protobuf exportés et vérifie la structure critique pour la version : `openclaw.run`, `openclaw.harness.run`, un span model-call respectant la dernière convention sémantique GenAI, `openclaw.context.assembled` et `openclaw.message.delivery` doivent être présents. Le smoke force `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`, donc le span model-call doit utiliser le nom `{gen_ai.operation.name} {gen_ai.request.model}` ; les appels de modèle ne doivent pas exporter `StreamAbandoned` lors des tours réussis ; les ID de diagnostic bruts et les attributs `openclaw.content.*` doivent rester hors de la trace. Les charges utiles OTLP brutes ne doivent pas contenir la sentinelle de prompt, la sentinelle de réponse ou la clé de session QA. Il écrit `otel-smoke-summary.json` à côté des artefacts de la suite QA.

Pour exécuter un smoke OpenTelemetry soutenu par un collecteur, lancez :

```bash
pnpm qa:otel:collector-smoke
```

Ce voie place un vrai conteneur Docker OpenTelemetry Collector devant le même récepteur local. Utilisez-le lors de modifications du câblage des points de terminaison, de la compatibilité du collecteur ou du comportement d'exportation OTLP que le récepteur in-process pourrait masquer.

Pour le smoke de scraping Prometheus protégé, lancez :

```bash
pnpm qa:prometheus:smoke
```

Cet alias exécute le scénario QA `docker-prometheus-smoke` avec `diagnostics-prometheus` activé, vérifie que les scrapings non authentifiés sont rejetés, puis vérifie que le scraping authentifié inclut les familles de métriques critiques pour la version sans contenu de prompt, contenu de réponse, identifiants de diagnostic bruts, jetons d'authentification ou chemins locaux.

Pour exécuter les deux smokes d'observabilité à la suite, utilisez :

```bash
pnpm qa:observability:smoke
```

Pour la voie OpenTelemetry soutenue par un collecteur ainsi que le smoke de scraping Prometheus protégé, utilisez :

```bash
pnpm qa:observability:collector-smoke
```

La QA d'observabilité reste uniquement accessible via l'extraction des sources. L'archive npm omet intentionnellement QA Lab, donc les voies de publication de package Docker n'exécutent pas les commandes npmDocker`qa`. Utilisez `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke` ou `pnpm qa:observability:smoke` à partir d'une extraction de sources construite lors de la modification de l'instrumentation de diagnostic.

Pour une voie de smoke Matrix réaliste au niveau du transport, lancez :

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

La référence complète de la CLI, le catalogue de profils/scénarios, les env vars et la structure des artefacts pour cette voie se trouvent dans [Matrix QA](CLIMatrix/en/concepts/qa-matrixDockerMatrix). En résumé : il provisionne un serveur d'accueil Tuwunel jetable dans Docker, enregistre des utilisateurs temporaires pilote/SUT/observateur, exécute le véritable plugin Matrix à l'intérieur d'une passerelle QA enfant limitée à ce transport (pas de `qa-channel`), puis écrit un rapport Markdown, un résumé JSON, un artefact d'événements observés et un journal de sortie combiné sous `.artifacts/qa-e2e/matrix-<timestamp>/`.

Les scénarios couvrent le comportement du transport que les tests unitaires ne peuvent pas prouver de bout en bout : filtrage des mentions, stratégies allow-bot, listes autorisées, réponses de premier niveau et en fil de discussion, routage DM, gestion des réactions, suppression des modifications entrantes, déduplication du rejeu après redémarrage, récupération après interruption du serveur d'accueil, livraison des métadonnées d'approbation, gestion des médias et les flux de démarrage/récupération/vérification E2EE de Matrix. Le profil E2EE de la CLI pilote également les commandes MatrixCLI`openclaw matrix encryption setup` et de vérification via le même serveur d'accueil jetable avant de vérifier les réponses de la passerelle.

Discord possède également des scénarios optionnels exclusifs à Mantis pour la reproduction de bugs. Utilisez Discord`--scenario discord-status-reactions-tool-only` pour la chronologie explicite des réactions de statut, ou `--scenario discord-thread-reply-filepath-attachment`Discord pour créer un fil Discord réel et vérifier que `message.thread-reply` préserve une pièce jointe `filePath`DiscordDiscord. Ces scénarios restent en dehors de la voie Discord active par défaut car ils sont des sondes de reproduction avant/après plutôt qu'une couverture de fumée large. Le flux de travail Mantis thread-attachment peut également ajouter une vidéo témoin Web Discord connectée lorsque `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` ou `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`Discord est configuré dans l'environnement QA. Ce profil de visualisation est uniquement pour la capture visuelle ; la décision de réussite/échec provient toujours de l'oracle REST Discord.

CI utilise la même surface de commande dans `.github/workflows/qa-live-transports-convex.yml`. Les exécutions planifiées et les exécutions manuelles par défaut exécutent le profil Matrix rapide avec les informations d'identification de la frontière en direct (live frontier), `--fast`, et `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000`. Le `matrix_profile=all` manuel se répartit dans les cinq shards de profil afin que le catalogue exhaustif puisse s'exécuter en parallèle tout en conservant un répertoire d'artefacts par shard.

Pour les voies de test de fumée (smoke lanes) réelles de transport Telegram, Discord et Slack :

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

Elles ciblent un channel réel préexistant avec deux bots (pilote + SUT). Les variables d'environnement requises, les listes de scénarios, les artefacts de sortie et le pool d'informations d'identification Convex sont documentés dans [référence QA Telegram, Discord et Slack](#telegram-discord-and-slack-qa-reference) ci-dessous.

Pour une exécution complète sur VM de bureau Slack avec secours VNC, exécutez :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Cette commande loue une machine de bureau/navigateur Crabbox, exécute le live lane Slack
à l'intérieur de la VM, ouvre Slack Web dans le navigateur VNC, capture le bureau et
copie `slack-qa/`, `slack-desktop-smoke.png` et `slack-desktop-smoke.mp4`
lorsque la capture vidéo est disponible dans le répertoire d'artefacts Mantis. Les baux de bureau/navigateur
Crabbox fournissent les outils de capture et les paquets d'aide pour la construction native/du navigateur
dès le départ, le scénario ne devrait donc installer des solutions de repli que sur les baux plus anciens.
Mantis rapporte les durées totales et par phase dans
`mantis-slack-desktop-smoke-report.md` afin que les exécutions lentes indiquent si le temps a été consacré à
l'échauffement du bail, à l'acquisition des informations d'identification, à la configuration à distance ou à la copie d'artefacts. Réutilisez
`--lease-id <cbx_...>` après vous être connecté manuellement à Slack Web via VNC ;
les baux réutilisés maintiennent également le cache du magasin pnpm de Crabbox à chaud. Le défaut
`--hydrate-mode source` vérifie à partir d'une extraction des sources et exécute l'installation/la construction
à l'intérieur de la VM. Utilisez `--hydrate-mode prehydrated` uniquement lorsque l'espace de travail distant réutilisé
possède déjà `node_modules` et une version construite de `dist/` ; ce mode ignore l'étape
coûteuse d'installation/construction et échoue fermement si l'espace de travail n'est pas prêt.
Avec `--gateway-setup`, Mantis laisse une passerelle OpenClaw Slack persistante
fonctionner à l'intérieur de la VM sur le port `38973` ; sans cela, la commande exécute la file QA Slack
normale de bot à bot et se termine après la capture d'artefacts.

Pour prouver l'interface utilisateur d'approbation native Slack avec des preuves sur bureau, exécutez le mode de point de contrôle d'approbation Mantis :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

Ce mode est mutuellement exclusif avec `--gateway-setup`SlackSlackAPI. Il exécute les scénarios d'approbation Slack, rejette les ID de scénarios non liés à l'approbation, attend à chaque état d'approbation en attente et résolu, restitue le message de l'API Slack observé dans `approval-checkpoints/<scenario>-pending.png` et `approval-checkpoints/<scenario>-resolved.png`Slack, puis échoue si un point de contrôle, une preuve de message, un accusé de réception ou une capture d'écran restituée est manquant ou vide. Les baux CI froids peuvent toujours afficher la connexion Slack dans `slack-desktop-smoke.png`; les images des points de contrôle d'approbation constituent la preuve visuelle pour cette voie.

La liste de contrôle de l'opérateur, la commande de dispatch du workflow GitHub, le contrat de commentaire de preuve, la table de décision du mode hydrate, l'interprétation du timing et les étapes de gestion des échecs se trouvent dans le [Mantis Slack Desktop Runbook](GitHubSlack/en/concepts/mantis-slack-desktop-runbook).

Pour une tâche de bureau de type agent/CV, exécutez :

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` loue ou réutilise une machine de bureau/navigateur Crabbox, démarre `crabbox record --while`, pilote le navigateur visible via une `visual-driver` imbriquée, capture `visual-task.png`, exécute `openclaw infer image describe` contre la capture d'écran lorsque `--vision-mode image-describe` est sélectionné, et écrit `visual-task.mp4`, `mantis-visual-task-summary.json`, `mantis-visual-task-driver-result.json` et `mantis-visual-task-report.md`. Lorsque `--expect-text` est défini, le prompt de vision demande un verdict JSON structuré et ne réussit que lorsque le modèle rapporte une preuve visible positive ; une réponse négative qui se contente de citer le texte cible fait échouer l'assertion. Utilisez `--vision-mode metadata` pour un test de fumée sans modèle qui prouve la plomberie du bureau, du navigateur, de la capture d'écran et de la vidéo sans appeler de fournisseur de compréhension d'image. L'enregistrement est un artefact requis pour `visual-task`; si Crabbox n'enregistre aucun `visual-task.mp4` non vide, la tâche échoue même si le pilote visuel a réussi. En cas d'échec, Mantis conserve le bail pour VNC à moins que la tâche n'ait déjà réussi et que `--keep-lease` n'ait pas été défini.

Avant d'utiliser les identifiants en direct partagés, exécutez :

```bash
pnpm openclaw qa credentials doctor
```

Le médecin vérifie l'environnement du courtier Convex, valide les paramètres du point de terminaison et vérifie l'accessibilité de l'admin/liste lorsque le secret du mainteneur est présent. Il ne signale que l'état défini/manquant pour les secrets.

## Couverture du transport en direct

Les voies de transport en direct partagent un seul contrat au lieu que chacune invente sa propre forme de liste de scénarios. `qa-channel` est la suite synthétique large de comportement produit et ne fait pas partie de la matrice de couverture du transport en direct.

| Voie     | Canary | Limitation de mention | Bot-à-bot | Bloc de liste autorisée | Réponse de premier niveau | Reprise après redémarrage | Suivi de fil de discussion | Isolement de fil de discussion | Observation de réaction | Commande d'aide | Enregistrement de commande native |
| -------- | ------ | --------------------- | --------- | ----------------------- | ------------------------- | ------------------------- | -------------------------- | ------------------------------ | ----------------------- | --------------- | --------------------------------- |
| Matrix   | x      | x                     | x         | x                       | x                         | x                         | x                          | x                              | x                       |                 |                                   |
| Telegram | x      | x                     | x         |                         |                           |                           |                            |                                |                         | x               |                                   |
| Discord  | x      | x                     | x         |                         |                           |                           |                            |                                |                         |                 | x                                 |
| Slack    | x      | x                     | x         | x                       | x                         | x                         | x                          | x                              |                         |                 |                                   |

Cela permet de garder `qa-channel` comme suite de comportement produit large, tandis que Matrix,
Telegram et les futurs transports en direct partagent une liste de contrôle explicite du contrat de transport.

Pour une voie de machine virtuelle Linux jetable sans intégrer Docker dans le chemin QA, exécutez :

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Cela démarre un nouvel invité Multipass, installe les dépendances, construit OpenClaw à l'intérieur de l'invité, exécute `qa suite`, puis copie le rapport QA normal et le résumé dans `.artifacts/qa-e2e/...` sur l'hôte.
Il réutilise le même comportement de sélection de scénarios que `qa suite` sur l'hôte.
Les exécutions de suites sur l'hôte et Multipass exécutent plusieurs scénarios sélectionnés en parallèle avec des workers de passerelle isolés par défaut. `qa-channel` est par défaut à une concurrence de 4, plafonnée par le nombre de scénarios sélectionnés. Utilisez `--concurrency <count>` pour ajuster le nombre de workers, ou `--concurrency 1` pour une exécution série.
Utilisez `--pack personal-agent` pour exécuter le pack de benchmark de l'assistant personnel. Le sélecteur de pack est additif avec des drapeaux `--scenario` répétés : les scénarios explicites s'exécutent en premier, puis les scénarios de pack s'exécutent dans l'ordre du pack avec les doublons supprimés.
Utilisez `--pack observability` lorsqu'un exécuteur QA personnalisé fournit déjà la configuration du collecteur OpenTelemetry et souhaite que les scénarios de test de fumée des diagnostics OpenTelemetry et Prometheus soient sélectionnés ensemble.
La commande se termine avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous voulez des artefacts sans code de sortie en échec.
Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité : les clés de provider basés sur l'environnement, le chemin de configuration du provider QA en direct, et `CODEX_HOME` si présent. Gardez `--output-dir` sous la racine du dépôt pour que l'invité puisse écrire en retour via l'espace de travail monté.

## Référence QA pour Telegram, Discord et Slack

Matrix a une [page dédiée](/fr/concepts/qa-matrix) en raison de son nombre de scénarios et de l'approvisionnement du serveur domestique soutenu par Docker. Telegram, Discord et Slack sont plus petits - une poignée de scénarios chacun, pas de système de profil, sur des canaux réels préexistants - donc leur référence se trouve ici.

### Drapeaux CLI partagés

Ces voies s'inscrivent via `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` et acceptent les mêmes drapeaux :

| Drapeau                               | Par défaut                                                      | Description                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | Exécuter uniquement ce scénario. Répétable.                                                                                                           |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | Emplacement d'écriture des rapports/résumés/messages observés et du journal de sortie. Les chemins relatifs sont résolus par rapport à `--repo-root`. |
| `--repo-root <path>`                  | `process.cwd()`                                                 | Racine du référentiel lors de l'appel à partir d'un répertoire de travail neutre.                                                                     |
| `--sut-account <id>`                  | `sut`                                                           | ID de compte temporaire dans la configuration de la passerelle QA.                                                                                    |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` ou `live-frontier` (l'ancien `live-openai` fonctionne toujours).                                                                        |
| `--model <ref>` / `--alt-model <ref>` | provider default                                                | Références de model primaire/secondaire.                                                                                                              |
| `--fast`                              | désactivé                                                       | Mode rapide du provider lorsque pris en charge.                                                                                                       |
| `--credential-source <env\|convex>`   | `env`                                                           | Voir [Convex credential pool](#convex-credential-pool).                                                                                               |
| `--credential-role <maintainer\|ci>`  | `ci` dans CI, `maintainer` sinon                                | Rôle utilisé lors de `--credential-source convex`.                                                                                                    |

Chaque volet se termine avec un code non nul en cas d'échec d'un scénario. `--allow-failures` écrit les artefacts sans définir de code d'échec.

### QA Telegram

```bash
pnpm openclaw qa telegram
```

Cible un groupe privé réel Telegram avec deux bots distincts (pilote + SUT). Le bot SUT doit posséder un nom d'utilisateur Telegram ; l'observation bot-à-bot fonctionne mieux lorsque les deux bots ont le **Mode de communication Bot-à-Bot** activé dans `@BotFather`.

Variables d'environnement requises lors de `--credential-source env` :

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - identifiant de conversation numérique (chaîne).
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

Optionnel :

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` conserve les corps des messages dans les artefacts de messages observés (réduction par défaut).

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

L'ensemble implicite par défaut couvre toujours le canary, le filtrage par mention, les réponses aux commandes natives, l'adressage des commandes et les réponses de groupe de bot à bot. Les valeurs par défaut `mock-openai` incluent également les vérifications déterministes de la chaîne de réponse et du streaming du message final. `telegram-current-session-status-tool` reste optionnel car il n'est stable que lorsqu'il est utilisé dans un fil directement après le canary, et non après des réponses de commandes natives arbitraires. Utilisez `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` pour afficher la répartition actuelle par défaut/optionnel avec les références de régression.

Artefacts de sortie :

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - inclut le RTT par réponse (envoi du pilote → réponse SUT observée) commençant par le canary.
- `telegram-qa-observed-messages.json` - corps expurgés sauf si `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`.

La comparaison RTT du package utilise le même contrat d'identification Telegram tout en maintenant ses contrôles d'échantillon RTT sur le chemin du harnais RTT :

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

Lorsque `--credential-source convex` est défini, le wrapper RTT Docker loue un identifiant `kind: "telegram"`, exporte l'environnement du groupe/pilote/bot SUT loué dans l'exécution du package installé, effectue un heartbeat sur le bail et le libère à l'arrêt. `--samples` et `--sample-timeout-ms` alimentent toujours `OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` et `OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`, de sorte que `result.json` reste comparable entre les exécutions RTT basées sur l'environnement et celles basées sur Convex.

### QA Discord

```bash
pnpm openclaw qa discord
```

Cible un Discord privé de guilde Discord réel avec deux bots : un bot pilote contrôlé par le harnais et un bot SUT démarré par la passerelle enfant OpenClaw via le plugin Discord inclus. Vérifie la gestion des mentions du Discord que le bot SUT a enregistré la commande native `/help` avec Discord et les scénarios de preuve Mantis opt-in.

Variables d'environnement requises lorsque `--credential-source env` :

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - doit correspondre à l'ID utilisateur du bot SUT renvoyé par Discord (sinon la voie échoue rapidement).

Optionnel :

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` conserve les corps de message dans les artefacts de message observé.
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` sélectionne le canal vocal/scène pour `discord-voice-autojoin` ; sans cela, le scénario choisit le premier canal vocal/scène visible pour le bot SUT.

Scénarios (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`) :

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - scénario vocal opt-in. S'exécute seul, active `channels.discord.voice.autoJoin` et vérifie que l'état vocal Discord actuel du bot SUT est le canal vocal/scène cible. Les identifiants Discord Convex peuvent inclure un `voiceChannelId` optionnel ; sinon le runner découvre le premier canal vocal/scène visible dans la guilde.
- `discord-status-reactions-tool-only` - scénario Mantis opt-in. S'exécute seul car il bascule le SUT vers des réponses de guilde toujours actives et uniquement avec `messages.statusReactions.enabled=true`, puis capture une chronologie de réactions REST ainsi que des artefacts visuels HTML/PNG. Les rapports Mantis avant/après conservent également les artefacts MP4 fournis par le scénario sous `baseline.mp4` et `candidate.mp4`.

Exécuter explicitement le scénario d'auto-rejoindre vocal Discord :

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
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
  --fast
```

Artefacts de sortie :

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - corps expurgés sauf si `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`.
- `discord-qa-reaction-timelines.json` et `discord-status-reactions-tool-only-timeline.png` lorsque le scénario de réaction de statut s'exécute.

### Slack QA

```bash
pnpm openclaw qa slack
```

Cible un véritable channel privé Slack avec deux bots distincts : un bot pilote contrôlé par le harnais et un bot SUT démarré par la passerelle enfant OpenClaw via le plugin Slack fourni.

Variables d'environnement requises lorsque `--credential-source env` :

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

Facultatif :

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` conserve les corps de messages dans les artefacts de messages observés.
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` active les points de contrôle d'approbation visuelle pour Mantis. Le runner écrit `<scenario>.pending.json` et `<scenario>.resolved.json`, puis attend les fichiers `.ack.json` correspondants.
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` remplace le délai d'attente de reconnaissance du point de contrôle. La valeur par défaut est `120000`.

Scénarios (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`) :

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native`SlackSlackSlack - scénario d'approbation d'exécution native Slack en option.
  Demande une approbation d'exécution via la passerelle, vérifie que le message Slack possède
  des boutons d'approbation natifs, le résout et vérifie la mise à jour Slack résolue.
- `slack-approval-plugin-native`SlackSlack - scénario d'approbation de plugin native Slack en option.
  Active ensemble le transfert des approbations d'exécution et de plugin pour que les événements du plugin ne soient pas
  supprimés par le routage de l'approbation d'exécution, puis vérifie le même chemin d'interface utilisateur
  natif Slack en attente/résolu.

Artefacts de sortie :

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - corps expurgés sauf si `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`.
- `approval-checkpoints/` - uniquement lorsque Mantis définit `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` ; contient le JSON de point de contrôle, le JSON d'accusé de réception et les captures d'écran en attente/résolues.

#### Configuration de l'espace de travail Slack

La voie nécessite deux applications Slack distinctes dans un même espace de travail, ainsi qu'un channel dont les deux bots sont membres :

- `channelId` - l'identifiant `Cxxxxxxxxxx` d'un channel auquel les deux bots ont été invités. Utilisez un channel dédié ; la voie publie un message à chaque exécution.
- `driverBotToken` - jeton de bot (`xoxb-...`) de l'application **Driver**.
- `sutBotToken` - jeton de bot (`xoxb-...`) de l'application **SUT**, qui doit être une application Slack distincte de celle du pilote afin que son identifiant d'utilisateur bot soit différent.
- `sutAppToken` - jeton au niveau de l'application (`xapp-...`) de l'application SUT avec `connections:write`, utilisé par le mode Socket pour que l'application SUT puisse recevoir des événements.

Il est préférable d'utiliser un espace de travail Slack dédié à la QA plutôt que de réutiliser un espace de travail de production.

Le manifeste SUT ci-dessous restreint intentionnellement l'installation de production du plugin Slack intégré (`extensions/slack/src/setup-shared.ts:10`) aux autorisations et événements couverts par la suite QA Slack en direct. Pour la configuration du channel de production telle que les utilisateurs la voient, consultez la section [Configuration rapide du channel Slack](/fr/channels/slack#quick-setup) ; la paire QA Driver/SUT est intentionnellement séparée car la voie a besoin de deux identifiants d'utilisateur bot distincts dans un même espace de travail.

**1. Créer l'application Driver**

Accédez à [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → choisissez l'espace de travail QA, collez le manifeste suivant, puis _Install to Workspace_ :

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

Copiez le _Bot User OAuth Token_ (`xoxb-...`) - il devient `driverBotToken`. Le pilote doit uniquement publier des messages et s'identifier ; aucun événement, aucun mode Socket.

**2. Créer l'application SUT**

Répétez _Create New App → From a manifest_ dans le même espace de travail. Cette application QA utilise intentionnellement une version plus restreinte du manifeste de production du plugin Slack fourni (`extensions/slack/src/setup-shared.ts:10`) : les portées et événements de réaction sont omis car la suite QA Slack en direct ne couvre pas encore la gestion des réactions.

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

- _Install to Workspace_ → copiez le _Bot User OAuth Token_ → qui devient `sutBotToken`.
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → ajoutez la portée `connections:write` → enregistrez → copiez la valeur `xapp-...` → qui devient `sutAppToken`.

Vérifiez que les deux bots ont des identifiants utilisateur distincts en appelant `auth.test` sur chaque jeton. Le runtime distingue le pilote et le SUT par l'identifiant utilisateur ; réutiliser la même application pour les deux fera échouer immédiatement le filtrage par mention.

**3. Créer le channel**

Dans l'espace de travail QA, créez un channel (par exemple `#openclaw-qa`) et invitez les deux bots depuis l'intérieur du channel :

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

Copiez l'identifiant `Cxxxxxxxxxx` depuis _channel info → About → Channel ID_ - qui devient `channelId`. Un channel public fonctionne ; si vous utilisez un channel privé, les deux applications ont déjà `groups:history`, donc les lectures de l'historique par le harnais réussiront toujours.

**4. Enregistrer les informations d'identification**

Deux options. Utilisez les env vars pour le débogage sur une seule machine (définissez les quatre variables `OPENCLAW_QA_SLACK_*` et passez `--credential-source env`), ou alimentez le pool Convex partagé pour que CI et autres mainteneurs puissent les louer.

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

Attendez-vous à `count: 1`, `status: "active"`, aucun champ `lease`.

**5. Vérifier de bout en bout**

Exécutez la voie localement pour confirmer que les deux bots peuvent communiquer entre eux via le courtier :

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

Une exécution réussie se termine en bien moins de 30 secondes et `slack-qa-report.md` affiche à la fois `slack-canary` et `slack-mention-gating` à l'état `pass`. Si la voie se bloque pendant environ 90 secondes et se termine avec `Convex credential pool exhausted for kind "slack"`, cela signifie soit que le pool est vide soit que chaque ligne est louée - `qa credentials list --kind slack --status all --json` vous indiquera laquelle.

### QA WhatsApp

```bash
pnpm openclaw qa whatsapp
```

Cible deux comptes Web WhatsApp dédiés : un compte pilote contrôlé par le harnais et un compte SUT démarré par la passerelle enfant OpenClaw via le plugin WhatsApp inclus.

Variables d'environnement requises lorsque `--credential-source env` :

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

Optionnel :

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` active `whatsapp-mention-gating`.
- `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1` conserve les corps de message dans
  les artefacts de messages observés.

Scénarios (`extensions/qa-lab/src/live-transports/whatsapp/whatsapp-live.runtime.ts`) :

- `whatsapp-canary`
- `whatsapp-pairing-block`
- `whatsapp-mention-gating`
- `whatsapp-approval-exec-native` - scénario d'approbation d'exécution native WhatsApp (optionnel). Demande une approbation d'exécution via la passerelle, vérifie que le message WhatsApp dispose de fonctions d'approbation par réaction native, le résout et vérifie le suivi WhatsApp résolu.
- `whatsapp-approval-plugin-native` - scénario d'approbation de plugin native WhatsApp (optionnel). Active ensemble le transfert des approbations d'exécution et de plugin, puis vérifie le même chemin natif WhatsApp en attente/résolu.

Artefacts de sortie :

- `whatsapp-qa-report.md`
- `whatsapp-qa-summary.json`
- `whatsapp-qa-observed-messages.json` - corps expurgés sauf si `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1`.

### Pool d'identifiants Convex

Les voies Telegram, Discord, Slack et WhatsApp peuvent louer des informations d'identification à partir d'un pool Convex partagé au lieu de lire les env vars ci-dessus. Passez `--credential-source convex` (ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) ; QA Lab acquiert un bail exclusif, envoie des pulsations pendant la durée de l'exécution et le libère à l'arrêt. Les types de pools sont `"telegram"`, `"discord"`, `"slack"` et `"whatsapp"`.

Formes de payload que le courtier valide sur `admin/add` :

- Telegram (`kind: "telegram"`) : `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` doit être une chaîne d'identifiant de conversation numérique.
- Telegram utilisateur réel (`kind: "telegram-user"`) : `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - Preuve Mantis Telegram Desktop uniquement. Les voies QA Lab génériques ne doivent pas acquérir ce type.
- Discord (`kind: "discord"`) : `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`.
- WhatsApp (`kind: "whatsapp"`) : `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - les numéros de téléphone doivent être des chaînes E.164 distinctes.

Le flux de travail de preuve Mantis Telegram Desktop conserve un bail Convex `telegram-user` exclusif pour le pilote TDLib CLI et le témoin Telegram Desktop, puis le libère après avoir publié la preuve.

Lorsqu'une PR nécessite une comparaison visuelle déterministe, Mantis peut utiliser la même réponse de modèle factice sur `main` et sur le head de la PR pendant les modifications du formateur ou de la couche de livraison Telegram. Les valeurs par défaut de capture sont réglées pour les commentaires de PR : classe Crabbox standard, enregistrement de bureau à 24 ips, GIF animé à 24 ips et largeur de prévisualisation de 1920 px. Les commentaires avant/après doivent publier un bundle propre contenant uniquement les GIF prévus.

Les voies Slack peuvent également utiliser le pool. Les vérifications de la forme des payloads Slack résident actuellement dans le runner QA Slack plutôt que dans le broker ; utilisez SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack, avec un identifiant de channel Slack comme `Cxxxxxxxxxx`Slack. Voir [Configuration de l'espace de travail Slack](#setting-up-the-slack-workspace) pour la provision de l'application et de la portée.

Les env vars opérationnels et le contrat de point de terminaison du broker Convex résident dans [Testing → Shared Telegram credentials via Convex](Telegram/en/help/testing#shared-telegram-credentials-via-convex-v1) (le nom de la section précède le pool multi-channel ; la sémantique de bail est partagée entre les types).

## Graines soutenues par le repo

Les actifs de graines résident dans `qa/` :

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Elles sont intentionnellement dans git afin que le plan QA soit visible à la fois par les humains et par l'agent.

`qa-lab` doit rester un runner markdown générique. Chaque fichier markdown de scénario est la source de vérité pour une exécution de test et doit définir :

- les métadonnées du scénario
- les métadonnées optionnelles de catégorie, de capacité, de voie et de risque
- les références de docs et de code
- les exigences optionnelles de plugin
- le correctif de configuration Gateway optionnel
- l'exécutable `qa-flow`

La surface d'exécution réutilisable qui prend en charge `qa-flow`Gateway est autorisée à rester générique et transversale. Par exemple, les scénarios markdown peuvent combiner des helpers côté transport avec des helpers côté navigateur qui pilotent l'interface utilisateur de contrôle intégrée via la jointure `browser.request` du Gateway sans ajouter de runner cas particulier.

Les fichiers de scénario doivent être regroupés par capacité produit plutôt que par dossier de l'arborescence source. Conservez les identifiants de scénario stables lors du déplacement des fichiers ; utilisez `docsRefs` et `codeRefs` pour la traçabilité de l'implémentation.

La liste de base doit rester suffisamment large pour couvrir :

- les discussions DM et channel
- le comportement des fils de discussion
- le cycle de vie des actions de message
- les rappels cron
- la mémoire de rappel
- le changement de model
- le transfert vers un sous-agent
- la lecture du repo et la lecture des docs
- une petite tâche de construction telle que Lobster Invaders

## Voies fictives du fournisseur

`qa suite` possède deux voies de simulation de fournisseur local :

- `mock-openai` est le simulateur OpenClaw conscient des scénarios. Il reste la voie de simulation déterministe par défaut pour la QA reposant sur le dépôt et les portes de parité.
- `aimock` démarre un serveur de fournisseur basé sur AIMock pour la couverture expérimentale du protocole, des appareils, de l'enregistrement/lecture et du chaos. Il est additif et ne remplace pas le répartiteur de scénarios `mock-openai`.

L'implémentation de la voie de fournisseur réside sous `extensions/qa-lab/src/providers/`. Chaque fournisseur possède ses propres valeurs par défaut, le démarrage du serveur local, la configuration du modèle de passerelle, les besoins de mise en scène du profil d'authentification et les indicateurs de capacité en direct/simulation. La suite partagée et le code de la passerelle doivent passer par le registre des fournisseurs au lieu de créer des embranchements sur les noms des fournisseurs.

## Adaptateurs de transport

`qa-lab` possède une couture de transport générique pour les scénarios QA Markdown. `qa-channel` est le premier adaptateur sur cette couture, mais la cible de conception est plus large : les futurs canaux réels ou synthétiques doivent se connecter au même exécuteur de suite au lieu d'ajouter un exécuteur QA spécifique au transport.

Au niveau de l'architecture, la séparation est la suivante :

- `qa-lab` gère l'exécution générique des scénarios, la simultanéité des workers, l'écriture d'artefacts et les rapports.
- L'adaptateur de transport gère la configuration de la passerelle, la disponibilité, l'observation entrante et sortante, les actions de transport et l'état normalisé du transport.
- Les fichiers de scénario Markdown sous `qa/scenarios/` définissent le test ; `qa-lab` fournit la surface d'exécution réutilisable qui les exécute.

### Ajouter un channel

Ajouter un channel au système QA Markdown nécessite exactement deux choses :

1. Un adaptateur de transport pour le channel.
2. Un pack de scénarios qui exerce le contrat du channel.

N'ajoutez pas de nouvelle racine de commande QA de premier niveau lorsque l'hôte partagé `qa-lab` peut posséder le flux.

`qa-lab` possède la mécanique de l'hôte partagé :

- la racine de commande `openclaw qa`
- le démarrage et l'arrêt de la suite
- la simultanéité des workers
- l'écriture d'artefacts
- la génération de rapports
- l'exécution de scénarios
- les alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins de l'exécuteur possèdent le contrat de transport :

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
2. Implémentez le transport runner sur l'hôte `qa-lab` partagé.
3. Gardez les mécaniques spécifiques au transport à l'intérieur du plugin runner ou du harnais de channel.
4. Montez le runner en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente. Les plugins de runner doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`. Gardez `runtime-api.ts` léger ; l'exécution paresseuse du CLI et du runner doit rester derrière des points d'entrée séparés.
5. Rédigez ou adaptez des scénarios markdown dans les répertoires thématiques `qa/scenarios/`.
6. Utilisez les assistants de scénario génériques pour les nouveaux scénarios.
7. Gardez les alias de compatibilité existants fonctionnels, sauf si le dépôt effectue une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend d'un transport de channel, gardez-le dans ce plugin runner ou ce harnais de plugin.
- Si un scénario nécessite une nouvelle capacité que plus d'un channel peut utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au channel dans `suite.ts`.
- Si un comportement n'a de sens que pour un seul transport, gardez le scénario spécifique au transport et explicitez-le dans le contrat du scénario.

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

Les alias de compatibilité restent disponibles pour les scénarios existants - `waitForQaChannelReady`, `waitForOutboundMessage`, `waitForNoOutbound`, `formatConversationTranscript`, `resetBus` - mais la création de nouveaux scénarios devrait utiliser les noms génériques. Les alias existent pour éviter une migration en une seule étape (flag-day), et non comme modèle pour l'avenir.

## Rapports

`qa-lab` exporte un rapport de protocole Markdown à partir de la chronologie du bus observée.
Le rapport doit répondre à :

- Ce qui a fonctionné
- Ce qui a échoué
- Ce qui est resté bloqué
- Quels scénarios de suivi valent la peine d'être ajoutés

Pour l'inventaire des scénarios disponibles - utile lors de l'évaluation du travail de suivi ou du câblage d'un nouveau transport - exécutez `pnpm openclaw qa coverage` (ajoutez `--json` pour une sortie lisible par machine).
Lors du choix d'une preuve ciblée pour un comportement ou un chemin de fichier touché, exécutez `pnpm openclaw qa coverage --match <query>`.
Le rapport de correspondance recherche les métadonnées de scénario, les références docs, les références code, les ID de couverture, les plugins et les exigences du provider, puis imprime les cibles `qa suite --scenario ...` correspondantes.
Considérez-le comme une aide à la découverte, et non comme un remplacement de porte (gate); le scénario sélectionné a toujours besoin du bon mode provider, du transport en direct, de Multipass, Testbox ou de la voie de release pour le comportement testé.

Pour les vérifications de caractère et de style, exécutez le même scénario sur plusieurs références de model en direct et écrivez un rapport Markdown jugé :

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

La commande exécute des processus enfants de passerelle QA locaux, et non Docker. Les scénarios d'évaluation de caractère doivent définir la persona via `SOUL.md`, puis exécuter des tours d'utilisateur ordinaires tels que le chat, l'aide de l'espace de travail et les petites tâches de fichiers. Le modèle candidat ne doit pas être informé qu'il est évalué. La commande conserve chaque transcription complète, enregistre des statistiques d'exécution de base, puis demande aux modèles juges en mode rapide avec un raisonnement `xhigh` lorsque cela est pris en charge de classer les exécutions par naturel, ambiance et humour. Utilisez `--blind-judge-models` lors de la comparaison de providers : l'invite du juge reçoit toujours chaque transcription et le statut de l'exécution, mais les références des candidats sont remplacées par des étiquettes neutres telles que `candidate-01` ; le rapport remappe les classements vers les vraies références après l'analyse.
Les exécutions candidates utilisent par défaut la réflexion `high`, avec `medium` pour GPT-5.5 et `xhigh` pour les anciennes références d'évaluation OpenAI qui la prennent en charge. Remplacez un candidat spécifique en ligne avec `--model provider/model,thinking=<level>`. `--thinking <level>` définit toujours un repli global, et l'ancienne forme `--model-thinking <provider/model=level>` est conservée pour la compatibilité.
Les références candidates OpenAI utilisent par défaut le mode rapide, donc le traitement prioritaire est utilisé lorsque le provider le prend en charge. Ajoutez `,fast`, `,no-fast` ou `,fast=false` en ligne lorsqu'un seul candidat ou juge a besoin d'une modification. Passez `--fast` uniquement lorsque vous souhaitez forcer le mode rapide pour chaque modèle candidat. Les durées des candidats et des juges sont enregistrées dans le rapport pour l'analyse des performances, mais les invites des juges indiquent explicitement de ne pas classer par vitesse.
Les exécutions de modèles candidats et juges utilisent par défaut une concurrence de 16. Réduisez `--concurrency` ou `--judge-concurrency` lorsque les limites du provider ou la pression de la passerelle locale rendent une exécution trop bruyante.
Lorsqu'aucun candidat `--model` n'est passé, l'évaluation de caractère utilise par défaut `openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-8`,
`anthropic/claude-sonnet-4-6`, `zai/glm-5.1`,
`moonshot/kimi-k2.5` et
`google/gemini-3.1-pro-preview` lorsqu'aucun `--model` n'est passé.
Lorsqu'aucun `--judge-model` n'est passé, les juges utilisent par défaut `openai/gpt-5.5,thinking=xhigh,fast` et
`anthropic/claude-opus-4-8,thinking=high`.

## Documentation connexe

- [QA Matrix](/fr/concepts/qa-matrix)
- [Pack de référence pour l'agent personnel](/fr/concepts/personal-agent-benchmark-pack)
- [Canal QA](/fr/channels/qa-channel)
- [Tests](/fr/help/testing)
- [Tableau de bord](/fr/web/dashboard)
