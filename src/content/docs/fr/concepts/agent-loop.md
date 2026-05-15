---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Boucle d'agent"
---

Une boucle agentique est l'exécution complète « réelle » d'un agent : réception → assemblage du contexte → inférence du modèle →
exécution d'outils → réponses en flux continu → persistance. C'est le chemin faisant autorité qui transforme un message
en actions et une réponse finale, tout en maintenant l'état de la session cohérent.

Dans OpenClaw, une boucle est une exécution unique et sérialisée par session qui émet des événements de cycle de vie et de flux
alors que le modèle réfléchit, appelle des outils et diffuse sa sortie. Ce document explique comment cette boucle authentique
est connectée de bout en bout.

## Points d'entrée

- Gateway RPC : `agent` et `agent.wait`.
- CLI : commande `agent`.

## Fonctionnement (niveau élevé)

1. Le RPC `agent` valide les paramètres, résout la session (sessionKey/sessionId), persiste les métadonnées de session et renvoie `{ runId, acceptedAt }` immédiatement.
2. `agentCommand` exécute l'agent :
   - résout le modèle et les valeurs par défaut de réflexion/verbose/trace
   - charge l'instantané des compétences
   - appelle `runEmbeddedPiAgent` (runtime pi-agent-core)
   - émet un **cycle de vie fin/erreur** si la boucle intégrée n'en émet pas un
3. `runEmbeddedPiAgent` :
   - sérialise les exécutions via des files par session + globales
   - résout le modèle + le profil d'authentification et construit la session pi
   - s'abonne aux événements pi et diffuse les deltas assistant/tool
   - applique le délai d'attente -> annule l'exécution s'il est dépassé
   - pour les tours de app-server Codex, abandonne un tour accepté qui cesse de produire des progrès app-server avant un événement terminal
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
  conscient du processus et basé sur les fichiers, il attrape donc les writers qui contournent la file d'attente intra-processus ou qui proviennent
  d'un autre processus. Les writers de transcription de session attendent jusqu'à `session.writeLock.acquireTimeoutMs`
  avant de signaler que la session est occupée ; la valeur par défaut est `60000` ms.
- Les verrous d'écriture de session sont non réentrants par défaut. Si une fonctionnaire imbrique intentionnellement l'acquisition du
  même verrou tout en préservant un writer logique, elle doit opter explicitement pour cela avec
  `allowReentrant: true`.

## Préparation de la session et de l'espace de travail

- L'espace de travail est résolu et créé ; les exécutions en bac à sable (sandboxed) peuvent être redirigées vers une racine d'espace de travail isolée.
- Les compétences (Skills) sont chargées (ou réutilisées à partir d'un instantané) et injectées dans l'environnement et le prompt.
- Les fichiers d'amorçage (bootstrap) et de contexte sont résolus et injectés dans le rapport du système de prompt.
- Un verrou d'écriture de session est acquis ; `SessionManager` est ouvert et préparé avant le streaming. Tout
  chemin ultérieur de réécriture, de compactage ou de troncation de la transcription doit prendre le même verrou avant d'ouvrir ou
  de modifier le fichier de transcription.

## Assemblage du prompt et système de prompt

- Le prompt système est construit à partir du prompt de base d'OpenClaw, du prompt de compétences, du contexte d'amorçage et des substitutions par exécution.
- Les limites spécifiques au modèle et les jetons de réserve de compactage sont appliqués.
- Voir [System prompt](/fr/concepts/system-prompt) pour ce que le modèle voit.

## Points d'ancrage (hooks) (où vous pouvez intercepter)

OpenClaw possède deux systèmes de hooks :

- **Hooks internes** (hooks Gateway) : scripts pilotés par les événements pour les commandes et les événements de cycle de vie.
- **Hooks de plugin** : points d'extension à l'intérieur du cycle de vie de l'agent/de l'outil et du pipeline de la passerelle.

### Hooks internes (hooks Gateway)

- **`agent:bootstrap`** : s'exécute lors de la construction des fichiers d'amorçage avant que le prompt système ne soit finalisé.
  Utilisez ceci pour ajouter/supprimer des fichiers de contexte d'amorçage.
- **Command hooks** : `/new`, `/reset`, `/stop` et autres événements de commande (voir la doc Hooks).

Voir [Hooks](/fr/automation/hooks) pour la configuration et les exemples.

### Hooks de plugin (cycle de vie de l'agent + passerelle)

Ceux-ci s'exécutent à l'intérieur de la boucle de l'agent ou du pipeline de la passerelle :

- **`before_model_resolve`** : s'exécute pré-session (pas de `messages`) pour substituer de manière déterministe le provider/model avant la résolution du modèle.
- **`before_prompt_build`** : s'exécute après le chargement de la session (avec `messages`) pour injecter `prependContext`, `systemPrompt`, `prependSystemContext` ou `appendSystemContext` avant la soumission du prompt. Utilisez `prependContext` pour le texte dynamique par tour et les champs de contexte système pour des directives stables qui doivent figurer dans l'espace du système.
- **`before_agent_start`** : hook de compatibilité hérité qui peut s'exécuter dans l'une ou l'autre phase ; préférez les hooks explicites ci-dessus.
- **`before_agent_reply`** : s'exécute après les actions en ligne et avant l'appel du LLM, permettant à un plugin de revendiquer le tour et de retourner une réponse synthétique ou de réduire le tour au silence.
- **`agent_end`** : inspecter la liste finale des messages et les métadonnées d'exécution après achèvement.
- **`before_compaction` / `after_compaction`** : observer ou annoter les cycles de compactage.
- **`before_tool_call` / `after_tool_call`** : intercepter les paramètres/résultats des outils.
- **`before_install`** : inspecter les résultats de l'analyse intégrée et bloquer facultativement les installations de compétences ou de plugins.
- **`tool_result_persist`** : transformer de manière synchrone les résultats des outils avant qu'ils ne soient écrits dans une transcription de session détenue par OpenClaw.
- **`message_received` / `message_sending` / `message_sent`** : hooks de messages entrants et sortants.
- **`session_start` / `session_end`** : limites du cycle de vie de la session.
- **`gateway_start` / `gateway_stop`** : événements du cycle de vie de la passerelle.

Règles de décision de hook pour les gardes de sorties/outils :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_tool_call` : `{ block: false }` est une opération vide et ne efface pas un blocage antérieur.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_install` : `{ block: false }` est une opération vide et ne efface pas un blocage antérieur.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `message_sending` : `{ cancel: false }` est une opération vide et n'efface pas une annulation antérieure.

Voir [Plugin hooks](/fr/plugins/hooks) pour l'API des hooks et les détails d'enregistrement.

Les harnais peuvent adapter ces hooks différemment. Le harnais du serveur d'application Codex conserve les hooks de plugin OpenClaw comme contrat de compatibilité pour les surfaces miroir documentées, tandis que les hooks natifs Codex restent un mécanisme Codex de bas niveau distinct.

## Diffusion en continu + réponses partielles

- Les deltas de l'assistant sont diffusés en continu depuis pi-agent-core et émis sous forme d'événements `assistant`.
- La diffusion en bloc peut émettre des réponses partielles soit sur `text_end` soit sur `message_end`.
- La diffusion du raisonnement peut être émise comme un flux séparé ou comme des réponses bloc.
- Voir [Streaming](/fr/concepts/streaming) pour le comportement de découpage et de réponse bloc.

## Exécution d'outils + outils de messagerie

- Les événements de début/mise à jour/fin d'outil sont émis sur le flux `tool`.
- Les résultats des outils sont nettoyés pour la taille et les charges utiles d'image avant la journalisation/l'émission.
- Les envois d'outils de messagerie sont suivis pour supprimer les confirmations en double de l'assistant.

## Mise en forme des réponses + suppression

- Les charges utiles finales sont assemblées à partir de :
  - texte de l'assistant (et raisonnement optionnel)
  - résumés d'outils en ligne (lorsque verbeux + autorisé)
  - texte d'erreur de l'assistant lorsque le modèle génère des erreurs
- Le jeton silencieux exact `NO_REPLY` / `no_reply` est filtré des
  charges utiles sortantes.
- Les doublons d'outils de messagerie sont supprimés de la liste finale des charges utiles.
- S'il ne reste aucune charge utile rendable et qu'un outil a échoué, une réponse d'erreur d'outil de secours est émise
  (sauf si un outil de messagerie a déjà envoyé une réponse visible par l'utilisateur).

## Compactage + nouvelles tentatives

- L'auto-compactage émet des événements de flux `compaction` et peut déclencher une nouvelle tentative.
- Lors d'une nouvelle tentative, les tampons en mémoire et les résumés d'outils sont réinitialisés pour éviter les doublons.
- Voir [Compaction](/fr/concepts/compaction) pour le pipeline de compactage.

## Flux d'événements (actuellement)

- `lifecycle` : émis par `subscribeEmbeddedPiSession` (et en secours par `agentCommand`)
- `assistant` : deltas diffusés en continu depuis pi-agent-core
- `tool` : événements d'outil diffusés en continu depuis pi-agent-core

## Gestion du channel de discussion

- Les deltas de l'assistant sont mis en tampon dans les messages de discussion `delta`.
- Un `final` de discussion est émis lors de la **fin/erreur du cycle de vie**.

## Délais d'expiration

- `agent.wait` par défaut : 30 s (juste l'attente). Le paramètre `timeoutMs` prévaut.
- Durée d'exécution de l'agent : `agents.defaults.timeoutSeconds` par défaut 172800 s (48 heures) ; appliquée dans la minuterie d'abandon `runEmbeddedPiAgent`.
- Durée d'exécution Cron : le tour d'agent isolé `timeoutSeconds` appartient à cron. Le planificateur démarre cette minuterie lorsque l'exécution commence, abandonne l'exécution sous-jacente à l'échéance configurée, puis exécute un nettoyage limité avant d'enregistrer l'expiration afin qu'une session enfant obsolète ne puisse pas bloquer la voie.
- Diagnostics de vivacité de session : avec les diagnostics activés, `diagnostics.stuckSessionWarnMs` classifie les sessions `processing` longues qui n'ont aucune progression observée en termes de réponse, d'outil, de statut, de bloc ou de progression ACP. Les exécutions intégrées actives, les appels au modèle et les appels à l'outil sont signalés comme `session.long_running` ; le travail actif sans progression récente comme `session.stalled` ; `session.stuck` est réservé à la gestion des sessions obsolètes sans travail actif. La gestion des sessions obsolètes libère immédiatement la voie de session affectée ; les exécutions intégrées bloquées sont drainées par abandon uniquement après `diagnostics.stuckSessionAbortMs` (par défaut : au moins 10 minutes et 5 fois le seuil d'avertissement) afin que le travail en file d'attente puisse reprendre sans interrompre les exécutions simplement lentes. La récupération émet des résultats structurés demandés/terminés, et l'état de diagnostic est marqué inactif uniquement si la même génération de traitement est toujours actuelle. Les diagnostics `session.stuck` répétés se espaçent tant que la session reste inchangée.
- Délai d'inactivité du modèle : OpenClaw abandonne une requête de modèle lorsque aucun fragment de réponse n'arrive avant la fenêtre d'inactivité. OpenClaw`models.providers.<id>.timeoutSeconds`OpenClaw étend ce chien de garde d'inactivité pour les fournisseurs locaux/auto-hébergés lents ; sinon OpenClaw utilise `agents.defaults.timeoutSeconds` lorsque configuré, plafonné à 120 s par défaut. Les exécutions déclenchées par Cron sans explicitation de délai d'expiration du modèle ou de l'agent désactivent le chien de garde d'inactivité et s'appuient sur le délai d'expiration externe du cron.
- Délai d'expiration de la requête HTTP du fournisseur : `models.providers.<id>.timeoutSeconds`Ollama s'applique aux récupérations HTTP du modèle de ce fournisseur, y compris la connexion, les en-têtes, le corps, le délai d'expiration de la requête du SDK, la gestion globale de l'abandon de la récupération gardée et le chien de garde d'inactivité du flux du modèle. Utilisez ceci pour les fournisseurs locaux/auto-hébergés lents tels que Ollama avant d'augmenter le délai d'exécution global de l'agent.

## Où les choses peuvent se terminer tôt

- Délai d'expiration de l'agent (abandon)
- AbortSignal (annulation)
- Déconnexion de la Gateway ou délai d'attente RPC
- Délai d'expiration `agent.wait` (attente uniquement, n'arrête pas l'agent)

## Connexes

- [Outils](/fr/tools) — outils de l'agent disponibles
- [Crochets](/fr/automation/hooks) — scripts pilotés par les événements déclenchés par les événements du cycle de vie de l'agent
- [Compaction](/fr/concepts/compaction) — résumé des longues conversations
- [Approbations Exec](/fr/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Réflexion](/fr/tools/thinking) — configuration du niveau de réflexion/raisonnement
