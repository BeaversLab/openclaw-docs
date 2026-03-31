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
5. `agent.wait` utilise `waitForAgentJob` :
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
- **`agent_end`** : inspecter la liste finale des messages et les métadonnées d'exécution après l'achèvement.
- **`before_compaction` / `after_compaction`** : observer ou annoter les cycles de compactage.
- **`before_tool_call` / `after_tool_call`** : intercepter les paramètres/résultats des outils.
- **`tool_result_persist`** : transformer de manière synchrone les résultats des outils avant qu'ils ne soient écrits dans la transcription de la session.
- **`message_received` / `message_sending` / `message_sent`** : hooks de messages entrants et sortants.
- **`session_start` / `session_end`** : limites du cycle de vie de la session.
- **`gateway_start` / `gateway_stop`** : événements du cycle de vie de la passerelle.

Règles de décision des hooks pour les gardes de sorties/tools :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_tool_call` : `{ block: false }` est une opération vide et ne efface pas un blocage précédent.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `message_sending` : `{ cancel: false }` est une opération vide et ne efface pas une annulation précédente.

Voir [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks) pour les détails de l'API de hook et d'enregistrement.

## Streaming + réponses partielles

- Les deltas de l'assistant sont diffusés en continu depuis pi-agent-core et émis en tant qu'événements `assistant`.
- Le Block streaming peut émettre des réponses partielles soit sur `text_end` soit sur `message_end`.
- Le streaming de raisonnement peut être émis comme un flux séparé ou comme des réponses de bloc.
- Voir [Streaming](/en/concepts/streaming) pour le comportement de découpage et de réponse de bloc.

## Exécution de tool + outils de messagerie

- Les événements de début/mise à jour/fin de tool sont émis sur le flux `tool`.
- Les résultats des tools sont assainis pour la taille et les charges utiles d'image avant la journalisation/l'émission.
- Les envois d'outils de messagerie sont suivis pour supprimer les confirmations en double de l'assistant.

## Mise en forme de la réponse + suppression

- Les charges utiles finales sont assemblées à partir de :
  - texte de l'assistant (et raisonnement facultatif)
  - résumés de tools en ligne (lorsque verbeux + autorisé)
  - texte d'erreur de l'assistant lorsque le model génère des erreurs
- `NO_REPLY` est traité comme un jeton silencieux et filtré des charges utiles sortantes.
- Les doublons d'outils de messagerie sont supprimés de la liste finale des charges utiles.
- S'il ne reste aucune charge utile rendable et qu'un tool a échoué, une réponse d'erreur de tool de secours est émise
  (sauf si un outil de messagerie a déjà envoyé une réponse visible par l'utilisateur).

## Compactage + nouvelles tentatives

- L'auto-compactage émet des événements de flux `compaction` et peut déclencher une nouvelle tentative.
- En cas de nouvelle tentative, les tampons en mémoire et les résumés des outils sont réinitialisés pour éviter les doublons.
- Voir [Compaction](/en/concepts/compaction) pour le pipeline de compactage.

## Flux d'événements (actuellement)

- `lifecycle` : émis par `subscribeEmbeddedPiSession` (et en secours par `agentCommand`)
- `assistant` : deltas diffusés en continu depuis pi-agent-core
- `tool` : événements d'outil diffusés en continu depuis pi-agent-core

## Gestion du canal de chat

- Les deltas de l'assistant sont mis en tampon dans les messages de chat `delta`.
- Un chat `final` est émis lors de la **fin ou de l'erreur du cycle de vie**.

## Délais d'expiration

- `agent.wait` par défaut : 30 s (juste l'attente). Le paramètre `timeoutMs` prend le dessus.
- Durée d'exécution de l'agent : `agents.defaults.timeoutSeconds` par défaut 172800 s (48 heures) ; appliquée dans le minuteur d'abandon `runEmbeddedPiAgent`.

## Où les choses peuvent se terminer tôt

- Délai d'expiration de l'agent (abandon)
- AbortSignal (annulation)
- Déconnexion du Gateway ou délai d'expiration RPC
- Délai d'expiration `agent.wait` (attente uniquement, n'arrête pas l'agent)
