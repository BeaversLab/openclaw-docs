---
summary: "Forme d'automatisation QA privée pour qa-lab, qa-channel, les scénarios amorcés et les rapports de protocole"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E Automation"
---

# Automatisation E2E QA

La pile QA privée est destinée à exercer OpenClaw de manière plus réaliste,
sous la forme d'un channel, qu'un test unitaire unique ne le peut.

Éléments actuels :

- `extensions/qa-channel` : channel de messages synthétiques avec les surfaces DM, channel, fil,
  réaction, modification et suppression.
- `extensions/qa-lab` : interface de débogueur et bus QA pour observer la transcription,
  injecter des messages entrants et exporter un rapport Markdown.
- `qa/` : ressources d'amorçage sauvegardées dans le dépôt pour la tâche de lancement et les scénarios QA
  de référence.

Le flux actuel de l'opérateur QA est un site QA à deux volets :

- Gauche : tableau de bord Gateway (Interface de contrôle) avec l'agent.
- Droite : QA Lab, affichant la transcription de type Slack et le plan de scénario.

Lancez-le avec :

```bash
pnpm qa:lab:up
```

Cela construit le site QA, démarre la voie de passerelle (gateway lane) soutenue par Docker et expose la
page QA Lab où un opérateur ou une boucle d'automatisation peut donner à l'agent une mission QA,
observer le comportement réel du channel, et enregistrer ce qui a fonctionné, échoué, ou
resté bloqué.

Pour une itération plus rapide de l'interface utilisateur de QA Lab sans reconstruire l'image Docker à chaque fois,
démarrez la pile avec un bundle QA Lab monté en liaison (bind-mounted) :

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` maintient les services Docker sur une image préconstruite et monte en liaison
`extensions/qa-lab/web/dist` dans le conteneur `qa-lab`. `qa:lab:watch`
reconstruit ce bundle lors des modifications, et le navigateur se recharge automatiquement lorsque le hachage de ressource
QA Lab change.

Pour une voie de test de fumée Matrix réaliste au niveau du transport, exécutez :

```bash
pnpm openclaw qa matrix
```

Cette voie provisionne un serveur domestique Tuwunel éphémère dans Docker, inscrit des utilisateurs pilotes, SUT et observateurs temporaires, crée une salle privée, puis exécute le véritable plugin Matrix dans un enfant de passerelle QA. La voie de transport en direct conserve la configuration de l'enfant limitée au transport testé, de sorte que Matrix s'exécute sans `qa-channel` dans la configuration de l'enfant. Il écrit les artefacts de rapport structurés et un journal combiné stdout/stderr dans le répertoire de sortie QA Matrix sélectionné. Pour capturer également la sortie de construction/launcher `scripts/run-node.mjs` externe, définissez `OPENCLAW_RUN_NODE_OUTPUT_LOG=<path>` sur un fichier journal local au dépôt.

Pour une voie de test de fumée Telegram réaliste au niveau du transport, exécutez :

```bash
pnpm openclaw qa telegram
```

Cette voie cible un vrai groupe privé Telegram au lieu de provisionner un serveur jetable. Elle nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`, ainsi que deux bots distincts dans le même groupe privé. Le bot SUT doit avoir un nom d'utilisateur Telegram, et l'observation de bot à bot fonctionne mieux lorsque les deux bots ont le Mode de Communication Bot-à-Bot activé dans `@BotFather`.
La commande renvoie une valeur non nulle lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous souhaitez des artefacts sans code de sortie d'échec.

Les voies de transport en direct partagent désormais un contrat plus petit au lieu que chacune n'invente
sa propre forme de liste de scénarios :

`qa-channel` reste la suite synthétique large du comportement du produit et ne fait pas partie de la matrice de couverture des transports en direct.

| Voie     | Canary | Blocage de mention | Bloc de liste blanche | Réponse de premier niveau | Reprise après redémarrage | Suite de fil | Isolement de fil | Observation de réaction | Commande d'aide |
| -------- | ------ | ------------------ | --------------------- | ------------------------- | ------------------------- | ------------ | ---------------- | ----------------------- | --------------- |
| Matrix   | x      | x                  | x                     | x                         | x                         | x            | x                | x                       |                 |
| Telegram | x      |                    |                       |                           |                           |              |                  |                         | x               |

Cela permet de garder `qa-channel` comme suite de comportement produit large, tandis que Matrix, Telegram et les futurs transports en partagent une liste de vérification explicite des contrats de transport.

Pour une voie de machine virtuelle Linux éphémère sans introduire Docker dans le chemin QA, exécutez :

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Cela démarre un nouvel invité Multipass, installe les dépendances, construit OpenClaw à l'intérieur de l'invité, exécute `qa suite`, puis copie le rapport et le résumé QA normaux dans `.artifacts/qa-e2e/...` sur l'hôte.
Il réutilise le même comportement de sélection de scénario que `qa suite` sur l'hôte.
Les exécutions de suites sur l'hôte et Multipass exécutent plusieurs scénarios sélectionnés en parallèle avec des workers de passerelle isolés par défaut. `qa-channel` est réglé par défaut sur une concurrence de 4, plafonnée par le nombre de scénarios sélectionnés. Utilisez `--concurrency <count>` pour ajuster le nombre de workers, ou `--concurrency 1` pour une exécution en série.
La commande renvoie une valeur non nulle lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous souhaitez des artefacts sans code de sortie d'échec.
Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité : les clés de provider basés sur les variables d'environnement, le chemin de configuration du provider de QA en direct, et `CODEX_HOME` si présent. Gardez `--output-dir` sous la racine du dépôt pour que l'invité puisse écrire en retour via l'espace de travail monté.

## Graines supportées par dépôt

Les ressources de seeds résident dans `qa/` :

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Ils sont intentionnellement dans git afin que le plan QA soit visible à la fois par les humains et par l'agent.

`qa-lab` doit rester un exécuteur markdown générique. Chaque fichier markdown de scénario est la source de vérité pour une exécution de test et doit définir :

- les métadonnées du scénario
- des métadonnées de catégorie, de capacité, de voie et de risque optionnelles
- références de documentation et de code
- exigences de plugin optionnelles
- correctif de configuration gateway optionnel
- l'exécutable `qa-flow`

La surface d'exécution réutilisable qui soutient `qa-flow` est autorisée à rester générique
et transversale. Par exemple, les scénarios markdown peuvent combiner des aides
côté transport avec des aides côté navigateur qui pilotent l'interface de contrôle intégrée via la
couture Gateway `browser.request` sans ajouter de runner spécialisé.

Les fichiers de scénario doivent être regroupés par capacité produit plutôt que par dossier
de l'arborescence source. Gardez les identifiants de scénario stables lors du déplacement des fichiers ; utilisez `docsRefs` et `codeRefs`
pour la traçabilité de l'implémentation.

La liste de base doit rester suffisamment large pour couvrir :

- la discussion DM et channel
- le comportement des fils de discussion
- le cycle de vie des actions de message
- rappels cron
- rappel de mémoire
- changement de model
- transfert de sous-agent
- lecture de repo et lecture de docs
- une petite tâche de construction telle que Lobster Invaders

## Voies de simulation provider

`qa suite` possède deux voies de simulation (mock lanes) de provider locales :

- `mock-openai` est le simulacre (mock) OpenClaw conscient des scénarios. Il reste la voie
  de simulation déterministe par défaut pour la QA basée sur le dépôt et les portes de parité.
- `aimock` démarre un serveur provider soutenu par AIMock pour le protocole expérimental,
  les fixtures, l'enregistrement/relecture, et la couverture chaos. Il est additif et ne
  remplace pas le répartiteur de scénarios `mock-openai`.

L'implémentation de la voie de provider se trouve sous `extensions/qa-lab/src/providers/`.
Chaque provider possède ses propres valeurs par défaut, le démarrage de son serveur local, la configuration du modèle de passerelle,
les besoins de mise en scène du profil d'authentification et les indicateurs de capacités en direct/simulation. La suite partagée et
le code de la passerelle doivent passer par le registre des providers au lieu de créer des branches en fonction
des noms de providers.

## Adaptateurs de transport

`qa-lab` possède une couture de transport générique pour les scénarios QA markdown.
`qa-channel` est le premier adaptateur sur cette couture, mais la cible de conception est plus large :
les futurs channels réels ou synthétiques doivent se connecter au même runner de suite
au lieu d'ajouter un runner QA spécifique au transport.

Au niveau de l'architecture, la répartition est la suivante :

- `qa-lab` possède l'exécution de scénario générique, la concurrence des workers, l'écriture d'artefacts et le rapport.
- l'adaptateur de transport possède la configuration de la passerelle, la disponibilité, l'observation entrante et sortante, les actions de transport et l'état de transport normalisé.
- les fichiers de scénario markdown sous `qa/scenarios/` définissent le run de test ; `qa-lab` fournit la surface d'exécution réutilisable qui les exécute.

Les directives d'adoption destinées aux mainteneurs pour les nouveaux adaptateurs de channel se trouvent dans
[Testing](/fr/help/testing#adding-a-channel-to-qa).

## Rapports

`qa-lab` exporte un rapport de protocole Markdown à partir de la chronologie du bus observée.
Le rapport doit répondre :

- Ce qui a fonctionné
- Ce qui a échoué
- Ce qui est resté bloqué
- Quels scénarios de suivi valent la peine d'être ajoutés

Pour les vérifications de caractère et de style, exécutez le même scénario sur plusieurs refs de modèle en direct
et écrivez un rapport Markdown jugé :

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.4,thinking=xhigh \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.4,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

La commande exécute des processus enfants locaux de passerelle QA, et non Docker. Les scénarios d'évaluation de caractère doivent définir la persona via `SOUL.md`, puis exécuter des tours d'utilisateur ordinaires tels que le chat, l'aide de l'espace de travail et de petites tâches sur fichiers. Le modèle candidat ne doit pas être informé qu'il est en cours d'évaluation. La commande préserve chaque transcription complète, enregistre des statistiques de base d'exécution, puis demande aux modèles juges en mode rapide avec un raisonnement `xhigh` de classer les exécutions par naturel, ambiance et humour.
Utilisez `--blind-judge-models` lors de la comparaison de providers : le prompt du juge reçoit toujours chaque transcription et le statut d'exécution, mais les références candidates sont remplacées par des étiquettes neutres telles que `candidate-01` ; le rapport fait correspondre les classements aux références réelles après l'analyse.
Les exécutions candidates passent par défaut à la réflexion `high`, avec `xhigh` pour les modèles OpenAI qui la prennent en charge. Remplacez un candidat spécifique en ligne avec `--model provider/model,thinking=<level>`. `--thinking <level>` définit toujours un repli global, et l'ancienne forme `--model-thinking <provider/model=level>` est conservée pour la compatibilité.
Les références candidates OpenAI passent par défaut en mode rapide afin que le traitement prioritaire soit utilisé là où le provider le prend en charge. Ajoutez `,fast`, `,no-fast` ou `,fast=false` en ligne lorsqu'un seul candidat ou juge a besoin d'une modification. Passez `--fast` uniquement lorsque vous souhaitez forcer le mode rapide pour chaque modèle candidat. Les durées des candidats et des juges sont enregistrées dans le rapport pour l'analyse de référence, mais les invites des juges indiquent explicitement de ne pas classer par vitesse.
Les exécutions de modèles candidats et juges passent par défaut à une concurrence de 16. Réduisez `--concurrency` ou `--judge-concurrency` lorsque les limites du provider ou la pression de la passerelle locale rendent une exécution trop bruyante.
Lorsqu'aucun candidat `--model` n'est passé, l'évaluation de caractère par défaut est `openai/gpt-5.4`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`,
`anthropic/claude-sonnet-4-6`, `zai/glm-5.1`,
`moonshot/kimi-k2.5`, et
`google/gemini-3.1-pro-preview` lorsqu'aucun `--model` n'est passé.
Lorsqu'aucun `--judge-model` n'est passé, les juges sont par défaut `openai/gpt-5.4,thinking=xhigh,fast` et
`anthropic/claude-opus-4-6,thinking=high`.

## Documentation connexe

- [Test](/fr/help/testing)
- [QA Channel](/fr/channels/qa-channel)
- [Tableau de bord](/fr/web/dashboard)
