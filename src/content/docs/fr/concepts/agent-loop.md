---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Agent Loop"
---

# Agent Loop (OpenClaw)

Une boucle agentique est l'exécution complète « réelle » d'un agent : ingestion → assemblage du contexte → inférence du modèle → exécution d'outils → réponses en streaming → persistance. C'est le chemin autoritatif qui transforme un message en actions et une réponse finale, tout en maintenant l'état de la session cohérent.

Dans OpenClaw, une boucle est une exécution unique et sérialisée par session qui émet des événements de cycle de vie et de flux alors que le modèle réfléchit, appelle des outils et diffuse la sortie. Ce document explique comment cette boucle authentique est câblée de bout en bout.

## Points d'entrée

- Gateway RPC : `agent` et `agent.wait`.
- CLI : commande `agent`.

## Fonctionnement (haut niveau)

1. Le RPC `agent` valide les paramètres, résout la session (sessionKey/sessionId), persiste les métadonnées de session et renvoie `{ runId, acceptedAt }` immédiatement.
2. `agentCommand` exécute l'agent :
   - résout le modèle + les valeurs par défaut de réflexion/verbeux/trace
   - charge l'instantané des compétences
   - appelle `runEmbeddedPiAgent` (runtime pi-agent-core)
   - émet une **fin/erreur de cycle de vie** si la boucle intégrée n'en émet pas une
3. `runEmbeddedPiAgent` :
   - sérialise les exécutions via des files d'attente par session + globales
   - résout le modèle + le profil d'authentification et construit la session pi
   - s'abonne aux événements pi et diffuse les deltas de l'assistant/outils
   - applique le délai d'attente -> annule l'exécution s'il est dépassé
   - renvoie les charges utiles + les métadonnées d'utilisation
4. `subscribeEmbeddedPiSession` fait le pont entre les événements pi-agent-core et le flux OpenClaw `agent` :
   - événements d'outils => `stream: "tool"`
   - deltas de l'assistant => `stream: "assistant"`
   - événements de cycle de vie => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` utilise `waitForAgentRun` :
   - attend la **fin/erreur de cycle de vie** pour `runId`
   - renvoie `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## File d'attente + concurrence

- Les exécutions sont sérialisées par clé de session (voie de session) et éventuellement via une voie globale.
- Cela évite les conflits d'outils/session et maintient l'historique de la session cohérent.
- Les canaux de messagerie peuvent choisir des modes de file d'attente (collect/steer/followup) qui alimentent ce système de voies.
  Voir [Command Queue](/fr/concepts/queue).
- Les écritures de transcription sont également protégées par un verrou d'écriture de session sur le fichier de session. Le verrou est
  conscient du processus et basé sur des fichiers, il intercepte donc les rédacteurs qui contournent la file d'attente intra-processus ou qui proviennent
  d'un autre processus.
- Les verrous d'écriture de session ne sont pas réentrants par défaut. Si un assistant imbrique intentionnellement l'acquisition du
  même verrou tout en préservant un seul rédacteur logique, il doit opter explicitement pour ce comportement avec
  `allowReentrant: true`.

## Préparation de la session et de l'espace de travail

- L'espace de travail est résolu et créé ; les exécutions en bac à sable (sandboxed) peuvent être redirigées vers une racine d'espace de travail isolée.
- Les compétences (Skills) sont chargées (ou réutilisées à partir d'un instantané) et injectées dans l'environnement et le prompt.
- Les fichiers d'amorçage (bootstrap) et de contexte sont résolus et injectés dans le rapport du système de prompt.
- Un verrou d'écriture de session est acquis ; `SessionManager` est ouvert et préparé avant le streaming. Tout
  chemin ultérieur de réécriture, de compactage ou de troncature de la transcription doit prendre le même verrou avant d'ouvrir ou
  de modifier le fichier de transcription.

## Assemblage du prompt et système de prompt

- Le système de prompt est construit à partir du prompt de base de OpenClaw, du prompt des compétences, du contexte d'amorçage et des remplacements par exécution.
- Les limites spécifiques au modèle et les jetons de réserve de compactage sont appliqués.
- Voir [System prompt](/fr/concepts/system-prompt) pour voir ce que le modèle perçoit.

## Points d'ancrage (hooks) (où vous pouvez intercepter)

OpenClaw possède deux systèmes de hooks :

- **Hooks internes** (hooks Gateway) : scripts pilotés par les événements pour les commandes et les événements de cycle de vie.
- **Hooks de plugin** : points d'extension à l'intérieur du cycle de vie de l'agent/de l'outil et du pipeline de la passerelle.

### Hooks internes (hooks Gateway)

- **`agent:bootstrap`** : s'exécute lors de la construction des fichiers d'amorçage avant que le système de prompt ne soit finalisé.
  Utilisez ceci pour ajouter/supprimer des fichiers de contexte d'amorçage.
- **Hooks de commande** : `/new`, `/reset`, `/stop`, et autres événements de commande (voir la documentation sur les Hooks).

Voir [Hooks](/fr/automation/hooks) pour la configuration et les exemples.

### Hooks de plugin (cycle de vie de l'agent + passerelle)

Ceux-ci s'exécutent à l'intérieur de la boucle de l'agent ou du pipeline de la passerelle :

- **`before_model_resolve`** : s'exécute avant la session (sans `messages`) pour remplacer de manière déterministe le provider/model avant la résolution du model.
- **`before_prompt_build`** : s'exécute après le chargement de la session (avec `messages`) pour injecter `prependContext`, `systemPrompt`, `prependSystemContext` ou `appendSystemContext` avant la soumission du prompt. Utilisez `prependContext` pour le texte dynamique par tour et les champs system-context pour des directives stables devant figurer dans l'espace du système de prompt.
- **`before_agent_start`** : hook de compatibilité hérité qui peut s'exécuter dans l'une ou l'autre phase ; privilégiez les hooks explicites ci-dessus.
- **`before_agent_reply`** : s'exécute après les actions en ligne et avant l'appel LLM, permettant à un plugin de réclamer le tour et de retourner une réponse synthétique ou de réduire le tour au silence.
- **`agent_end`** : inspecter la liste finale des messages et les métadonnées d'exécution après l'achèvement.
- **`before_compaction` / `after_compaction`** : observer ou annoter les cycles de compactage.
- **`before_tool_call` / `after_tool_call`** : intercepter les paramètres/résultats de l'outil.
- **`before_install`** : inspecter les résultats de l'analyse intégrée et bloquer optionnellement les installations de compétences ou de plugins.
- **`tool_result_persist`** : transformer de manière synchrone les résultats de l'outil avant qu'ils ne soient écrits dans la transcription de session.
- **`message_received` / `message_sending` / `message_sent`** : hooks de messages entrants + sortants.
- **`session_start` / `session_end`** : frontières du cycle de vie de session.
- **`gateway_start` / `gateway_stop`** : événements du cycle de vie de passerelle.

Règles de décision de hook pour les gardes de sorties/outils :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_tool_call` : `{ block: false }` est une opération vide (no-op) et ne efface pas un blocage précédent.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_install` : `{ block: false }` est une opération sans effet et ne nettoie pas un bloc précédent.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `message_sending` : `{ cancel: false }` est une opération sans effet et ne nettoie pas une annulation précédente.

Voir [Plugin hooks](/fr/plugins/architecture#provider-runtime-hooks) pour les détails sur l'API des hooks et l'enregistrement.

## Streaming + réponses partielles

- Les deltas de l'assistant sont diffusés en continu depuis pi-agent-core et émis sous forme d'événements `assistant`.
- Le block streaming peut émettre des réponses partielles soit sur `text_end` soit sur `message_end`.
- Le streaming de raisonnement peut être émis comme un flux distinct ou comme des réponses de bloc.
- Voir [Streaming](/fr/concepts/streaming) pour le comportement de découpage et de réponse de bloc.

## Exécution d'outils + outils de messagerie

- Les événements de début/mise à jour/fin d'outil sont émis sur le flux `tool`.
- Les résultats des outils sont nettoyés pour la taille et les charges utiles d'image avant la journalisation/l'émission.
- Les envois d'outils de messagerie sont suivis pour supprimer les confirmations en double de l'assistant.

## Façonnage + suppression des réponses

- Les charges utiles finales sont assemblées à partir de :
  - texte de l'assistant (et raisonnement optionnel)
  - résumés d'outils en ligne (lorsque verbeux + autorisé)
  - texte d'erreur de l'assistant lorsque le modèle produit une erreur
- Le jeton silencieux exact `NO_REPLY` / `no_reply` est filtré des
  charges utiles sortantes.
- Les doublons d'outils de messagerie sont supprimés de la liste finale des charges utiles.
- Si aucune charge utile affichable ne reste et qu'un outil a échoué, une réponse d'erreur d'outil de secours est émise
  (sauf si un outil de messagerie a déjà envoyé une réponse visible par l'utilisateur).

## Compactage + nouvelles tentatives

- L'auto-compactage émet des événements de flux `compaction` et peut déclencher une nouvelle tentative.
- En cas de nouvelle tentative, les tampons en mémoire et les résumés d'outils sont réinitialisés pour éviter une sortie en double.
- Voir [Compaction](/fr/concepts/compaction) pour le pipeline de compactage.

## Flux d'événements (aujourd'hui)

- `lifecycle` : émis par `subscribeEmbeddedPiSession` (et en secours par `agentCommand`)
- `assistant` : deltas diffusés en continu depuis pi-agent-core
- `tool` : événements d'outil diffusés en continu depuis pi-agent-core

## Gestion du channel de chat

- Les deltas de l'assistant sont mis en tampon dans les messages `delta` du chat.
- Un `final` de chat est émis lors de la **fin/erreur du cycle de vie**.

## Délais d'expiration

- `agent.wait` par défaut : 30s (seulement l'attente). Le paramètre `timeoutMs` prévaut.
- Durée d'exécution de l'agent : `agents.defaults.timeoutSeconds` par défaut 172800s (48 heures) ; appliquée dans la minuterie d'abandon `runEmbeddedPiAgent`.
- Délai d'inactivité LLM : `agents.defaults.llm.idleTimeoutSeconds` abandonne une requête de model lorsque aucun chunk de réponse n'arrive avant la fenêtre d'inactivité. Définissez-le explicitement pour les models locaux lents ou les fournisseurs de raisonnement/appel d'outils ; définissez-le sur 0 pour désactiver. S'il n'est pas défini, LLM utilise `agents.defaults.timeoutSeconds` si configuré, sinon 120s. Les exécutions déclenchées par Cron sans délai d'expiration explicite LLM ou agent désactivent le chien de garde d'inactivité et s'appuient sur le délai d'expiration externe de Cron.

## Où les choses peuvent se terminer prématurément

- Délai d'expiration de l'agent (abandon)
- AbortSignal (annulation)
- Déconnexion du Gateway ou délai d'expiration RPC
- Délai d'expiration `agent.wait` (attente uniquement, n'arrête pas l'agent)

## Connexes

- [Outils](/fr/tools) — outils d'agent disponibles
- [Crochets (Hooks)](/fr/automation/hooks) — scripts pilotés par les événements déclenchés par les événements du cycle de vie de l'agent
- [Compactage](/fr/concepts/compaction) — comment les longues conversations sont résumées
- [Approbations Exec](/fr/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Réflexion](/fr/tools/thinking) — configuration du niveau de réflexion/raisonnement
