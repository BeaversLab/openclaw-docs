---
summary: "Plan de refactorisation QA pour le catalogue de scénarios et la consolidation du harnais"
read_when:
  - Refactoring QA scenario definitions or qa-lab harness code
  - Moving QA behavior between markdown scenarios and TypeScript harness logic
title: "Refactorisation QA"
---

# Refactorisation QA

Statut : la migration fondamentale a atterri.

## Objectif

Faire passer la QA OpenClaw d'un modèle à définition fractionnée à une source unique de vérité :

- métadonnées de scénario
- prompts envoyés au modèle
- configuration et démontage
- logique de harnais
- assertions et critères de succès
- artefacts et indices de rapport

L'état final souhaité est un harnais QA générique qui charge des fichiers de définition de scénario puissants au lieu de coder en dur la plupart des comportements en TypeScript.

## État actuel

La source principale de vérité réside maintenant dans `qa/scenarios/index.md` plus un fichier par
scénario sous `qa/scenarios/<theme>/*.md`.

Implémenté :

- `qa/scenarios/index.md`
  - métadonnées canoniques du pack QA
  - identité de l'opérateur
  - mission de lancement
- `qa/scenarios/<theme>/*.md`
  - un fichier markdown par scénario
  - métadonnées de scénario
  - liaisons de gestionnaires (handler bindings)
  - configuration d'exécution spécifique au scénario
- `extensions/qa-lab/src/scenario-catalog.ts`
  - analyseur de pack markdown + validation zod
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - rendu du plan à partir du pack markdown
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - seeds a généré des fichiers de compatibilité plus `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - sélectionne les scénarios exécutables via les liaisons de gestionnaires définies dans le markdown
- protocole de bus QA + interface utilisateur
  - pièces jointes génériques en ligne pour le rendu d'image/vidéo/audio/fichier

Surfaces fractionnées restantes :

- `extensions/qa-lab/src/suite.ts`
  - possède toujours la plupart de la logique exécutable personnalisée des gestionnaires
- `extensions/qa-lab/src/report.ts`
  - dérive toujours la structure du rapport à partir des sorties d'exécution

Ainsi, le fractionnement de la source de vérité est corrigé, mais l'exécution est encore majoritairement basée sur des gestionnaires plutôt que entièrement déclarative.

## À quoi ressemble réellement la surface du scénario

La lecture de la suite actuelle montre quelques classes de scénarios distinctes.

### Interaction simple

- ligne de base du channel
- ligne de base DM
- suivi enfilé
- changement de modèle
- suite de l'approbation
- réaction/édition/suppression

### Mutation de la configuration et de l'exécution

- désactivation de compétence par correctif de configuration
- application de config redémarrage réveil
- changement de capacité de redémarrage config
- vérification de la dérive de l'inventaire d'exécution

### Assertions du système de fichiers et du dépôt

- rapport de découverte source/docs
- construire Lobster Invaders
- recherche d'artefact d'image générée

### Orchestration de la mémoire

- rappel de mémoire
- outils de mémoire dans le contexte du channel
- secours en cas d'échec de la mémoire
- classement de la mémoire de session
- isolement de la mémoire du fil de discussion
- balayage de la rêverie de la mémoire (memory dreaming sweep)

### Intégration des outils et plugins

- appel aux outils de plugin MCP
- visibilité des compétences (skills)
- installation à chaud des compétences (skills)
- génération d'image native
- aller-retour d'image
- compréhension d'image à partir de la pièce jointe

### Multi-tours et multi-acteurs

- transfert vers un sous-agent
- synthèse par éclatement vers des sous-agents
- flux de style reprise après redémarrage

Ces catégories sont importantes car elles dictent les exigences du DSL. Une liste plate d'invites (prompts) et de texte attendu ne suffit pas.

## Direction

### Source unique de vérité

Utilisez `qa/scenarios/index.md` plus `qa/scenarios/<theme>/*.md` comme source unique de vérité rédigée.

Le pack doit rester :

- lisible par l'homme lors de la relecture
- analysable par la machine
- assez riche pour piloter :
  - l'exécution de la suite
  - l'amorçage de l'espace de travail QA
  - métadonnées de l'interface utilisateur du Lab QA
  - prompts de documentation/découverte
  - génération de rapports

### Format de rédaction préféré

Utilisez markdown comme format de premier niveau, avec du YAML structuré à l'intérieur.

Forme recommandée :

- YAML frontmatter
  - id
  - titre
  - surface
  - étiquettes
  - réf. docs
  - réf. code
  - surcharge de modèle/fournisseur
  - prérequis
- sections en prose
  - objectif
  - notes
  - indices de débogage
- blocs YAML délimités
  - configuration
  - étapes
  - assertions
  - nettoyage

Cela permet :

- une meilleure lisibilité des PR qu'un énorme fichier JSON
- un contexte plus riche qu'un YAML pur
- analyse stricte et validation zod

Le JSON brut n'est acceptable que comme forme intermédiaire générée.

## Forme de fichier de scénario proposée

Exemple :

````md
---
id: image-generation-roundtrip
title: Image generation roundtrip
surface: image
tags: [media, image, roundtrip]
models:
  primary: openai/gpt-5.4
requires:
  tools: [image_generate]
  plugins: [openai, qa-channel]
docsRefs:
  - docs/help/testing.md
  - docs/concepts/model-providers.md
codeRefs:
  - extensions/qa-lab/src/suite.ts
  - src/gateway/chat-attachments.ts
---

# Objective

Verify generated media is reattached on the follow-up turn.

# Setup

```yaml scenario.setup
- action: config.patch
  patch:
    agents:
      defaults:
        imageGenerationModel:
          primary: openai/gpt-image-1
- action: session.create
  key: agent:qa:image-roundtrip
```

# Steps

```yaml scenario.steps
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Image generation check: generate a QA lighthouse image and summarize it in one short sentence.
- action: artifact.capture
  kind: generated-image
  promptSnippet: Image generation check
  saveAs: lighthouseImage
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Roundtrip image inspection check: describe the generated lighthouse attachment in one short sentence.
  attachments:
    - fromArtifact: lighthouseImage
```

# Expect

```scenario d'attente yaml
- assert: outbound.textIncludes
  value: lighthouse
- assert: requestLog.matches
  where:
    promptIncludes: Vérification de l'inspection d'image aller-retour
  imageInputCountGte: 1
- assert: artifact.exists
  ref: lighthouseImage
```
````

## Capacités du runner que le DSL doit couvrir

Basé sur la suite actuelle, le runner générique a besoin de plus que l'exécution de prompts.

### Actions d'environnement et de configuration

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### Actions de tour d'agent

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### Actions de configuration et d'exécution

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### Actions de fichier et d'artefact

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### Actions de mémoire et de cron

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### Actions MCP

- `mcp.callTool`

### Assertions

- `outbound.textIncludes`
- `outbound.inThread`
- `outbound.notInRoot`
- `tool.called`
- `tool.notPresent`
- `skill.visible`
- `skill.disabled`
- `file.contains`
- `memory.contains`
- `requestLog.matches`
- `sessionStore.matches`
- `cron.managedPresent`
- `artifact.exists`

## Variables et références d'artefacts

Le DSL doit prendre en charge les sorties sauvegardées et les références ultérieures.

Exemples de la suite actuelle :

- créer un fil de discussion, puis réutiliser `threadId`
- créer une session, puis réutiliser `sessionKey`
- générer une image, puis attacher le fichier au tour suivant
- générer une chaîne de marqueur de réveil, puis affirmer qu'elle apparaît plus tard

Capacités nécessaires :

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- références typées pour les chemins, les clés de session, les identifiants de fil, les marqueurs, les sorties d'outil

Sans le support des variables, le harnais continuera à faire fuiter la logique de scénario vers TypeScript.

## Ce qui doit rester comme échappatoires

Un exécuteur purement déclaratif n'est pas réaliste dans la phase 1.

Certains scénarios sont intrinsèquement lourds en orchestration :

- balayage de rêve de mémoire
- application de configuration redémarrage réveil
- basculement de capacité de redémarrage de configuration
- résolution d'artefact d'image générée par horodatage/chemin
- évaluation du rapport de découverte

Ceux-ci doivent utiliser des gestionnaires personnalisés explicites pour l'instant.

Règle recommandée :

- 85 à 90 % déclaratif
- étapes explicites `customHandler` pour le reste difficile
- gestionnaires personnalisés nommés et documentés uniquement
- pas de code en ligne anonyme dans le fichier de scénario

Cela garde le moteur générique propre tout en permettant la progression.

## Changement d'architecture

### Actuel

Le markdown de scénario est déjà la source de vérité pour :

- exécution de la suite
- fichiers d'amorçage de l'espace de travail
- catalogue de scénarios de l'interface utilisateur QA Lab
- métadonnées de rapport
- prompts de découverte

Compatibilité générée :

- l'espace de travail ensemencé inclut toujours `QA_KICKOFF_TASK.md`
- l'espace de travail ensemencé inclut toujours `QA_SCENARIO_PLAN.md`
- l'espace de travail ensemencé inclut maintenant aussi `QA_SCENARIOS.md`

## Plan de refactorisation

### Phase 1 : chargeur et schéma

Terminé.

- ajouté `qa/scenarios/index.md`
- scénarios divisés en `qa/scenarios/<theme>/*.md`
- ajouté un analyseur pour le contenu du pack YAML markdown nommé
- validé avec zod
- basculé les consommateurs vers le pack analysé
- supprimé `qa/seed-scenarios.json` et `qa/QA_KICKOFF_TASK.md` au niveau du dépôt

### Phase 2 : moteur générique

- divisé `extensions/qa-lab/src/suite.ts` en :
  - chargeur
  - moteur
  - registre d'actions
  - registre d'assertions
  - gestionnaires personnalisés
- garder les fonctions d'assistance existantes en tant qu'opérations du moteur

Livrable :

- le moteur exécute des scénarios déclaratifs simples

Commencez par des scénarios qui sont principalement prompt + wait + assert :

- suivi dans un fil de discussion
- compréhension d'image à partir d'une pièce jointe
- visibilité et invocation de compétences
- ligne de base du channel

Livraison :

- premiers vrais scénarios définis en markdown expédiés via le moteur générique

### Phase 4 : migrer les scénarios moyens

- aller-retour de génération d'image
- outils de mémoire dans le contexte du channel
- classement de la mémoire de session
- transfert vers un sous-agent
- synthèse par éclatement de sous-agents

Livraison :

- variables, artefacts, assertions d'outils, assertions de journal de requêtes prouvés

### Phase 5 : conserver les scénarios difficiles sur les gestionnaires personnalisés

- balayage de rêve de mémoire
- réveil après redémarrage de l'application de configuration
- basculement de capacité de redémarrage de configuration
- dérive de l'inventaire d'exécution

Livraison :

- même format de création, mais avec des blocs d'étapes personnalisés explicites si nécessaire

### Phase 6 : supprimer la carte de scénario codée en dur

Une fois que la couverture du pack est suffisamment bonne :

- supprimer la plupart des branchements TypeScript spécifiques aux scénarios de `extensions/qa-lab/src/suite.ts`

## Faux Slack / Support des médias riches

Le bus QA actuel est d'abord basé sur le texte.

Fichiers pertinents :

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

Aujourd'hui, le bus QA prend en charge :

- texte
- réactions
- fils de discussion

Il ne modélise pas encore les pièces jointes multimédias en ligne.

### Contrat de transport nécessaire

Ajouter un modèle générique de pièce jointe au bus QA :

```ts
type QaBusAttachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName?: string;
  inline?: boolean;
  url?: string;
  contentBase64?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  transcript?: string;
};
```

Puis ajoutez `attachments?: QaBusAttachment[]` à :

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### Pourquoi d'abord générique

Ne créez pas un modèle média exclusif à Slack.

Au lieu de cela :

- un modèle de transport QA générique
- plusieurs moteurs de rendu par-dessus
  - chat QA Lab actuel
  - faux Web Slack futur
  - toutes autres vues de faux transport

Cela évite la logique en double et permet aux scénarios multimédias de rester agnostiques au transport.

### Travail UI nécessaire

Mettre à jour l'interface utilisateur QA pour afficher :

- aperçu d'image en ligne
- lecteur audio en ligne
- lecteur vidéo en ligne
- puce de pièce jointe de fichier

L'interface utilisateur actuelle peut déjà afficher les fils de discussion et les réactions, donc le rendu des pièces jointes doit se superposer au même modèle de carte de message.

### Travail de scénario activé par le transport multimédia

Une fois que les pièces jointes circulent dans le bus QA, nous pouvons ajouter des scénarios de faux chat plus riches :

- réponse image en ligne dans faux Slack
- compréhension des pièces jointes audio
- compréhension des pièces jointes vidéo
- ordre de pièce jointe mixte
- réponse de fil de discussion avec support multimédia conservé

## Recommandation

Le prochain bloc de mise en œuvre doit être :

1. ajouter un chargeur de scénario markdown + schéma zod
2. générer le catalogue actuel depuis le markdown
3. migrer d'abord quelques scénarios simples
4. ajouter le support générique des pièces jointes du bus QA
5. afficher l'image en ligne dans l'interface QA
6. puis étendre à l'audio et à la vidéo

C'est le plus petit chemin qui prouve les deux objectifs :

- QA générique défini en markdown
- surfaces de messagerie factices plus riches

## Questions ouvertes

- si les fichiers de scénario doivent permettre des modèles de prompt markdown intégrés avec interpolation de variables
- si la configuration/le nettoyage doit être des sections nommées ou simplement des listes d'actions ordonnées
- si les références d'artefacts doivent être fortement typées dans le schéma ou basées sur des chaînes
- si les gestionnaires personnalisés doivent résider dans un registre unique ou dans des registres par surface
- si le fichier de compatibilité JSON généré doit rester validé pendant la migration
