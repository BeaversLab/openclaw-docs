---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
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
   - résout le modèle + les valeurs par défaut de réflexion/verbosité
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
  Voir [Command Queue](/en/concepts/queue).

## Préparation de la session + de l'espace de travail

- L'espace de travail est résolu et créé ; les exécutions en bac à sable peuvent rediriger vers une racine d'espace de travail en bac à sable.
- Les Skills sont chargés (ou réutilisés à partir d'un instantané) et injectés dans l'environnement et le prompt.
- Les fichiers d'amorçage/contexte sont résolus et injectés dans le rapport du prompt système.
- Un verrou d'écriture de session est acquis ; `SessionManager` est ouvert et préparé avant le streaming.

## Assemblage du prompt + prompt système

- Le prompt système est construit à partir du prompt de base d'OpenClaw, du prompt des Skills, du contexte d'amorçage et des redéfinitions par exécution.
- Les limites spécifiques au modèle et les jetons de réserve de compactage sont appliqués.
- Voir [System prompt](/en/concepts/system-prompt) pour ce que le model voit.

## Points d'accroche (où vous pouvez intercepter)

OpenClaw possède deux systèmes d'accroche :

- **Accroches internes** (accroches Gateway) : scripts pilotés par les événements pour les commandes et les événements de cycle de vie.
- **Accroches de plugin** : points d'extension à l'intérieur du cycle de vie de l'agent/de l'outil et du pipeline du Gateway.

### Accroches internes (accroches Gateway)

- **`agent:bootstrap`** : s'exécute lors de la création des fichiers d'amorçage avant la finalisation du prompt système.
  Utilisez-le pour ajouter/supprimer des fichiers de contexte d'amorçage.
- **Accroches de commande** : `/new`, `/reset`, `/stop` et autres événements de commande (voir la documentation sur les Hooks).

Voir [Hooks](/en/automation/hooks) pour la configuration et les exemples.

### Accroches de plugin (cycle de vie de l'agent + Gateway)

Celles-ci s'exécutent à l'intérieur de la boucle de l'agent ou du pipeline du Gateway :

- **`before_model_resolve`** : s'exécute pré-session (sans `messages`) pour redéfinir de manière déterminante le provider/modèle avant la résolution du modèle.
- **`before_prompt_build`** : s'exécute après le chargement de la session (avec `messages`) pour injecter `prependContext`, `systemPrompt`, `prependSystemContext` ou `appendSystemContext` avant la soumission du prompt. Utilisez `prependContext` pour le texte dynamique par tour et les champs system-context pour des conseils stables qui doivent figurer dans l'espace du prompt système.
- **`before_agent_start`** : hook de compatibilité héritée qui peut s'exécuter dans l'une ou l'autre phase ; privilégiez les hooks explicites ci-dessus.
- **`before_agent_reply`** : s'exécute après les actions en ligne et avant l'appel du LLM, permettant à un plugin de revendiquer le tour et de retourner une réponse synthétique ou de faire taire le tour entièrement.
- **`agent_end`** : inspecter la liste finale des messages et les métadonnées d'exécution après l'achèvement.
- **`before_compaction` / `after_compaction`** : observer ou annoter les cycles de compactage.
- **`before_tool_call` / `after_tool_call`** : intercepter les paramètres/résultats des tools.
- **`before_install`** : inspecter les résultats de l'analyse intégrée et bloquer facultativement les installations de compétences ou de plugins.
- **`tool_result_persist`** : transformer de manière synchrone les résultats des tools avant qu'ils ne soient écrits dans la transcription de la session.
- **`message_received` / `message_sending` / `message_sent`** : hooks de message entrants + sortants.
- **`session_start` / `session_end`** : limites du cycle de vie de la session.
- **`gateway_start` / `gateway_stop`** : événements du cycle de vie de la passerelle.

Règles de décision des hooks pour les gardes de sortie/tool :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_tool_call` : `{ block: false }` est une opération vide (no-op) et ne supprime pas un blocage précédent.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_install` : `{ block: false }` est une opération vide (no-op) et ne supprime pas un blocage précédent.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `message_sending` : `{ cancel: false }` est une opération vide (no-op) et ne supprime pas une annulation précédente.

Voir [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks) pour l'API des hooks et les détails d'enregistrement.

## Streaming + réponses partielles

- Les deltas de l'assistant sont transmis en continu depuis pi-agent-core et émis sous forme d'événements `assistant`.
- Le Block streaming peut émettre des réponses partielles soit sur `text_end` soit sur `message_end`.
- Le streaming de raisonnement peut être émis sous forme d'un flux séparé ou sous forme de réponses de bloc.
- Voir [Streaming](/en/concepts/streaming) pour le découpage (chunking) et le comportement des réponses de bloc.

## Exécution d'outils + outils de messagerie

- Les événements de début/mise à jour/fin d'outil sont émis sur le flux `tool`.
- Les résultats des outils sont nettoyés pour la taille et les charges utiles d'images avant la journalisation/l'émission.
- Les envois via l'outil de messagerie sont suivis pour supprimer les confirmations en double de l'assistant.

## Mise en forme de la réponse + suppression

- Les charges utiles finales sont assemblées à partir de :
  - texte de l'assistant (et raisonnement optionnel)
  - résumés d'outils en ligne (lorsque verbeux + autorisé)
  - texte d'erreur de l'assistant lorsque le modèle rencontre une erreur
- Le jeton silencieux exact `NO_REPLY` / `no_reply` est filtré des
  charges utiles sortantes.
- Les doublons de l'outil de messagerie sont supprimés de la liste des charges utiles finales.
- S'il ne reste aucune charge utile pouvant être rendue et qu'un outil a échoué, une réponse d'erreur d'outil de secours est émise
  (sauf si un outil de messagerie a déjà envoyé une réponse visible par l'utilisateur).

## Compactage + nouvelles tentatives

- L'auto-compactage émet des événements de flux `compaction` et peut déclencher une nouvelle tentative.
- Lors d'une nouvelle tentative, les tampons en mémoire et les résumés d'outils sont réinitialisés pour éviter les doublons.
- Voir [Compaction](/en/concepts/compaction) pour le pipeline de compactage.

## Flux d'événements (actuellement)

- `lifecycle` : émis par `subscribeEmbeddedPiSession` (et comme solution de secours par `agentCommand`)
- `assistant` : deltas transmis en continu depuis pi-agent-core
- `tool` : événements d'outil transmis en continu depuis pi-agent-core

## Gestion du canal de chat

- Les deltas de l'assistant sont mis en tampon dans des messages de chat `delta`.
- Un chat `final` est émis lors de la **fin/erreur du cycle de vie**.

## Délais d'expiration

- `agent.wait` par défaut : 30s (juste l'attente). Remplacé par le paramètre `timeoutMs`.
- Durée d'exécution de l'agent : `agents.defaults.timeoutSeconds` par défaut 172800 s (48 heures) ; appliquée dans `runEmbeddedPiAgent` la minuterie d'abandon.

## Où les choses peuvent se terminer tôt

- Délai d'attente de l'agent (abandon)
- AbortSignal (annuler)
- Déconnexion du Gateway ou délai d'attente RPC
- Délai d'attente `agent.wait` (attente uniquement, n'arrête pas l'agent)

## Connexes

- [Outils](/en/tools) — outils de l'agent disponibles
- [Hooks](/en/automation/hooks) — scripts pilotés par les événements déclenchés par les événements de cycle de vie de l'agent
- [Compactage](/en/concepts/compaction) — résumé des longues conversations
- [Approbations d'exécution](/en/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Réflexion](/en/tools/thinking) — configuration du niveau de réflexion/raisonnement
