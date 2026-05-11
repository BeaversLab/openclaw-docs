---
summary: "Runtime de l'agent, contrat de l'espace de travail et amorçage de session"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent runtime"
---

OpenClaw exécute un **seul moteur d'agent intégré** — un processus d'agent par Gateway, avec son propre espace de travail, ses fichiers d'amorçage et son magasin de sessions. Cette page couvre ce contrat d'exécution : ce que l'espace de travail doit contenir, quels fichiers sont injectés et comment les sessions s'amorcent par rapport à celui-ci.

## Espace de travail (requis)

OpenClaw utilise un seul répertoire d'espace de travail d'agent (`agents.defaults.workspace`) comme **seul** répertoire de travail de l'agent (`cwd`) pour les outils et le contexte.

Recommandé : utilisez `openclaw setup` pour créer `~/.openclaw/openclaw.json` s'il est manquant et initialiser les fichiers de l'espace de travail.

Plan complet de l'espace de travail + guide de sauvegarde : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent remplacer cela par des espaces de travail par session sous `agents.defaults.sandbox.workspaceRoot` (voir [Configuration du Gateway](/fr/gateway/configuration)).

## Fichiers d'amorçage (injectés)

Dans `agents.defaults.workspace`, OpenClaw s'attend à trouver ces fichiers modifiables par l'utilisateur :

- `AGENTS.md` — instructions de fonctionnement + "mémoire"
- `SOUL.md` — persona, limites, ton
- `TOOLS.md` — notes sur les outils maintenues par l'utilisateur (ex. `imsg`, `sag`, conventions)
- `BOOTSTRAP.md` — rituel d'exécution unique au premier démarrage (supprimé après achèvement)
- `IDENTITY.md` — nom/ambiance/emoji de l'agent
- `USER.md` — profil utilisateur + adresse préférée

Au premier tour d'une nouvelle session, OpenClaw injecte le contenu de ces fichiers directement dans le contexte de l'agent.

Les fichiers vides sont ignorés. Les fichiers volumineux sont rognés et tronqués avec un marqueur pour que les invites restent légères (lisez le fichier pour le contenu complet).

Si un fichier est manquant, OpenClaw injecte une seule ligne de marqueur "fichier manquant" (et `openclaw setup` créera un modèle par défaut sécurisé).

`BOOTSTRAP.md` n'est créé que pour un **espace de travail entièrement nouveau** (aucun autre fichier d'amorçage présent). Si vous le supprimez après avoir terminé le rituel, il ne doit pas être recréé lors des redémarrages ultérieurs.

Pour désactiver entièrement la création des fichiers d'amorçage (pour les espaces de travail pré-ensemencés), définissez :

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Outils intégrés

Les outils principaux (lecture/exécution/modification/écriture et outils système associés) sont toujours disponibles, sous réserve de la stratégie d'outils. `apply_patch` est facultatif et conditionné par `tools.exec.applyPatch`. `TOOLS.md` ne contrôle pas **quels** outils existent ; il s'agit de conseils sur la manière dont **vous** souhaitez qu'ils soient utilisés.

## Compétences

OpenClaw charge les compétences depuis ces emplacements (du plus prioritaire au moins prioritaire) :

- Espace de travail : `<workspace>/skills`
- Compétences de l'agent de projet : `<workspace>/.agents/skills`
- Compétences de l'agent personnel : `~/.agents/skills`
- Géré/local : `~/.openclaw/skills`
- Groupés (fournis avec l'installation)
- Dossiers de compétences supplémentaires : `skills.load.extraDirs`

Les compétences peuvent être conditionnées par la configuration/l'environnement (voir `skills` dans [configuration du Gateway](/fr/gateway/configuration)).

## Limites du runtime

Le runtime de l'agent intégré est construit sur le cœur de l'agent Pi (modèles, outils et pipeline de prompts). La gestion des sessions, la découverte, le câblage des outils et la livraison des canaux sont des couches détenues par OpenClaw par-dessus ce cœur.

## Sessions

Les transcriptions de sessions sont stockées au format JSONL à :

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

L'ID de session est stable et choisi par OpenClaw.
Les dossiers de sessions hérités d'autres outils ne sont pas lus.

## Pilotage pendant le streaming

Lorsque le mode de file d'attente est `steer`, les messages entrants sont injectés dans l'exécution en cours.
Le pilotage mis en file d'attente est délivré **une fois que le tour de l'assistant actuel a fini**
d'exécuter ses appels d'outils, avant l'appel LLM suivant. Le pilotage ne saute plus
les appels d'outils restants du message de l'assistant actuel ; il injecte plutôt le message
mis en file d'attente à la prochaine limite du modèle.

Lorsque le mode de file d'attente est `followup` ou `collect`, les messages entrants sont retenus jusqu'à ce que
le tour actuel se termine, puis un nouveau tour d'agent commence avec les charges utiles en file d'attente. Voir
[File d'attente](/fr/concepts/queue) pour le comportement du mode + anti-rebond/limite.

Le Block streaming envoie les blocs d'assistant terminés dès qu'ils sont finis ; il est
**désactivé par défaut** (`agents.defaults.blockStreamingDefault: "off"`).
Ajustez la limite via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end` ; par défaut text_end).
Contrôlez le découpage souple des blocs avec `agents.defaults.blockStreamingChunk` (par défaut
800–1200 caractères ; préfère les sauts de paragraphe, puis les sauts de ligne ; phrases en dernier).
Fusionnez les blocs diffusés avec `agents.defaults.blockStreamingCoalesce` pour réduire
les messages en une seule ligne (fusion basée sur l'inactivité avant l'envoi). Les canaux non-Telegram nécessitent
un `*.blockStreaming: true` explicite pour activer les réponses par bloc.
Les résumés détaillés des outils sont émis au démarrage de l'outil (sans débounce) ; l'interface de contrôle
diffuse la sortie des outils via les événements de l'agent lorsque disponible.
Plus de détails : [Streaming + chunking](/fr/concepts/streaming).

## Model refs

Les Model refs dans la configuration (par exemple `agents.defaults.model` et `agents.defaults.models`) sont analysées en divisant sur le `/` **premier**.

- Utilisez `provider/model` lors de la configuration des modèles.
- Si l'ID du modèle contient lui-même `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique
  de fournisseur configuré pour cet ID de modèle exact, et ne revient ensuite qu'au
  fournisseur par défaut configuré. Si ce fournisseur n'expose plus le
  modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle
  configuré au lieu d'afficher un défaut de fournisseur obsolète supprimé.

## Configuration (minimale)

Au minimum, définissez :

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (fortement recommandé)

---

_Suivant : [Group Chats](/fr/channels/group-messages)_ 🦞

## Connexes

- [Agent workspace](/fr/concepts/agent-workspace)
- [Multi-agent routing](/fr/concepts/multi-agent)
- [Session management](/fr/concepts/session)
