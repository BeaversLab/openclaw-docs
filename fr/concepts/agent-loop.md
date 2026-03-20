---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
title: "Agent Loop"
---

# Agent Loop (OpenClaw)

Une bouche agentic est le « véritable » parcours complet d'un agent : intake → assemblage du contexte → inférence du modèle →
exécution de l'outil → réponses en continu → persistance. C'est le chemin faisant autorité qui transforme un message
en actions et une réponse finale, tout en maintenant l'état de la session cohérent.

Dans OpenClaw, une boucle est une exécution unique et sérialisée par session qui émet des événements de cycle de vie et de flux
alors que le modèle réfléchit, appelle des outils et diffuse la sortie. Ce document explique comment cette bouche authentique est
connectée de bout en bout.

## Points d'entrée

- Gateway RPC : `agent` et `agent.wait`.
- CLI : commande `agent`.

## Fonctionnement (haut niveau)

1. Le RPC `agent` valide les paramètres, résout la session (sessionKey/sessionId), persiste les métadonnées de la session, renvoie `{ runId, acceptedAt }` immédiatement.
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
4. `subscribeEmbeddedPiSession` fait le pont entre les événements pi-agent-core et le flux `agent` OpenClaw :
   - événements d'outil => `stream: "tool"`
   - deltas d'assistant => `stream: "assistant"`
   - événements de cycle de vie => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` utilise `waitForAgentJob` :
   - attend la **fin du cycle de vie/erreur** pour `runId`
   - renvoie `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## File d'attente + concurrence

- Les exécutions sont sérialisées par clé de session (voie de session) et éventuellement via une voie globale.
- Cela évite les conflits d'outils/session et maintient l'historique de la session cohérent.
- Les canaux de messagerie peuvent choisir des modes de file d'attente (collect/steer/followup) qui alimentent ce système de voies.
  Voir [Command Queue](/fr/concepts/queue).

## Préparation de la session + de l'espace de travail

- L'espace de travail est résolu et créé ; les exécutions en bac à sable peuvent rediriger vers une racine d'espace de travail en bac à sable.
- Les Skills sont chargés (ou réutilisés à partir d'un instantané) et injectés dans l'environnement et le prompt.
- Les fichiers d'amorçage/contexte sont résolus et injectés dans le rapport du prompt système.
- Un verrou en écriture de session est acquis ; `SessionManager` est ouvert et préparé avant la diffusion.

## Assemblage du prompt + prompt système

- Le prompt système est construit à partir du prompt de base d'OpenClaw, du prompt des Skills, du contexte d'amorçage et des redéfinitions par exécution.
- Les limites spécifiques au modèle et les jetons de réserve de compactage sont appliqués.
- Voir [System prompt](/fr/concepts/system-prompt) pour ce que le modèle voit.

## Points d'accroche (où vous pouvez intercepter)

OpenClaw possède deux systèmes d'accroche :

- **Accroches internes** (accroches Gateway) : scripts pilotés par les événements pour les commandes et les événements de cycle de vie.
- **Accroches de plugin** : points d'extension à l'intérieur du cycle de vie de l'agent/de l'outil et du pipeline du Gateway.

### Accroches internes (accroches Gateway)

- **`agent:bootstrap`** : s'exécute lors de la création des fichiers d'amorçage avant la finalisation du système de prompt.
  Utilisez ceci pour ajouter/supprimer des fichiers de contexte d'amorçage.
- **Command hooks** : `/new`, `/reset`, `/stop`, et autres événements de commande (voir la documentation sur les hooks).

Consultez [Hooks](/fr/automation/hooks) pour la configuration et les exemples.

### Accroches de plugin (cycle de vie de l'agent + Gateway)

Celles-ci s'exécutent à l'intérieur de la boucle de l'agent ou du pipeline du Gateway :

- **`before_model_resolve`** : s'exécute avant la session (sans `messages`) pour remplacer de manière déterministe le provider/model avant la résolution du model.
- **`before_prompt_build`** : s'exécute après le chargement de la session (avec `messages`) pour injecter `prependContext`, `systemPrompt`, `prependSystemContext` ou `appendSystemContext` avant la soumission du prompt. Utilisez `prependContext` pour le texte dynamique par tour et les champs de contexte système pour une guidance stable qui doit figurer dans l'espace du système prompt.
- **`before_agent_start`** : hook de compatibilité héritée qui peut s'exécuter dans l'une ou l'autre phase ; préférez les hooks explicites ci-dessus.
- **`agent_end`** : inspecter la liste finale des messages et exécuter les métadonnées après l'achèvement.
- **`before_compaction` / `after_compaction`** : observer ou annoter les cycles de compactage.
- **`before_tool_call` / `after_tool_call`** : intercepter les paramètres/résultats des outils.
- **`tool_result_persist`** : transformer de manière synchrone les résultats des outils avant qu'ils ne soient écrits dans la transcription de la session.
- **`message_received` / `message_sending` / `message_sent`** : hooks de messages entrants + sortants.
- **`session_start` / `session_end`** : limites du cycle de vie de la session.
- **`gateway_start` / `gateway_stop`** : événements du cycle de vie de la passerelle.

Consultez [Plugins](/fr/tools/plugin#plugin-hooks) pour l'API des hooks et les détails d'enregistrement.

## Streaming + réponses partielles

- Les deltas de l'assistant sont diffusés en continu depuis pi-agent-core et émis sous forme d'événements `assistant`.
- Le streaming par bloc peut émettre des réponses partielles soit sur `text_end` soit sur `message_end`.
- Le streaming de raisonnement peut être émis sous forme d'un flux séparé ou sous forme de réponses de bloc.
- Consultez [Streaming](/fr/concepts/streaming) pour le comportement de découpage et de réponse par bloc.

## Exécution d'outils + outils de messagerie

- Les événements de début/mise à jour/fin de tool sont émis sur le flux `tool`.
- Les résultats des outils sont nettoyés en termes de taille et de charges d'images avant la journalisation/l'émission.
- Les envois d'outils de messagerie sont suivis pour supprimer les confirmations en double de l'assistant.

## Mise en forme et suppression des réponses

- Les charges utiles finales sont assemblées à partir de :
  - texte de l'assistant (et raisonnement optionnel)
  - résumés d'outils en ligne (lorsque verbeux et autorisé)
  - texte d'erreur de l'assistant lorsque le modèle rencontre une erreur
- `NO_REPLY` est traité comme un jeton silencieux et filtré des charges utiles sortantes.
- Les doublons d'outils de messagerie sont supprimés de la liste finale des charges utiles.
- S'il ne reste aucune charge utile rendable et qu'un tool a généré une erreur, une réponse d'erreur de tool de secours est émise
  (sauf si un tool de messagerie a déjà envoyé une réponse visible par l'utilisateur).

## Compactage + nouvelles tentatives

- La compactage automatique émet des événements de flux `compaction` et peut déclencher une nouvelle tentative.
- Lors d'une nouvelle tentative, les tampons en mémoire et les résumés d'outils sont réinitialisés pour éviter les doublons.
- Voir [Compactage](/fr/concepts/compaction) pour le pipeline de compactage.

## Flux d'événements (actuellement)

- `lifecycle` : émis par `subscribeEmbeddedPiSession` (et comme solution de repli par `agentCommand`)
- `assistant` : deltas diffusés en continu depuis pi-agent-core
- `tool` : événements de tool diffusés en continu depuis pi-agent-core

## Gestion du canal de discussion

- Les deltas de l'assistant sont mis en tampon dans les messages de chat `delta`.
- Un chat `final` est émis lors de la **fin/erreur du cycle de vie**.

## Délais d'expiration

- `agent.wait` par défaut : 30 s (seulement l'attente). Le paramètre `timeoutMs` permet de le remplacer.
- Runtime de l'agent : `agents.defaults.timeoutSeconds` par défaut 600 s ; appliqué dans la minuterie d'abandon `runEmbeddedPiAgent`.

## Où les choses peuvent se terminer tôt

- Délai d'expiration de l'agent (abandon)
- AbortSignal (annulation)
- Déconnexion du Gateway ou délai d'expiration RPC
- Délai d'expiration `agent.wait` (attente uniquement, n'arrête pas l'agent)

import en from "/components/footer/en.mdx";

<en />
