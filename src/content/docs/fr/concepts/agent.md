---
summary: "Runtime de l'agent, contrat de l'espace de travail et amorçage de session"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent runtime"
---

OpenClaw exécute un **runtime d'agent unique intégré** - un processus d'agent par
Gateway, avec son propre espace de travail, ses fichiers d'amorçage et son stockage de session. Cette page
couvre ce contrat de runtime : ce que l'espace de travail doit contenir, quels fichiers sont
injectés, et comment les sessions s'amorcent avec.

## Espace de travail (requis)

OpenClaw utilise un répertoire unique d'espace de travail de l'agent (OpenClaw`agents.defaults.workspace`) comme **seul** répertoire de travail de l'agent (`cwd`) pour les outils et le contexte.

Recommandé : utilisez `openclaw setup` pour créer `~/.openclaw/openclaw.json` s'il est manquant et initialiser les fichiers de l'espace de travail.

Guide complet de la disposition et de la sauvegarde de l'espace de travail : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent remplacer ceci par des espaces de travail par session sous `agents.defaults.sandbox.workspaceRoot`Gateway (voir [Configuration du Gateway](/fr/gateway/configuration)).

## Fichiers d'amorçage (injectés)

Dans `agents.defaults.workspace`, OpenClaw s'attend à trouver ces fichiers modifiables par l'utilisateur :

- `AGENTS.md` - instructions de fonctionnement + "mémoire"
- `SOUL.md` - persona, limites, ton
- `TOOLS.md` - notes sur les outils maintenues par l'utilisateur (ex. `imsg`, `sag`, conventions)
- `BOOTSTRAP.md` - rituel unique de premier démarrage (supprimé après achèvement)
- `IDENTITY.md` - nom/ambiance/emoji de l'agent
- `USER.md` - profil utilisateur + adresse préférée

Au premier tour d'une nouvelle session, OpenClaw injecte le contenu de ces fichiers dans le contexte du projet du système prompt.

Les fichiers vides sont ignorés. Les fichiers volumineux sont rognés et tronqués avec un marqueur pour que les invites restent légères (lisez le fichier pour le contenu complet).

Si un fichier est manquant, OpenClaw injecte une seule ligne de marqueur "fichier manquant" (et OpenClaw`openclaw setup` créera un modèle par défaut sécurisé).

`BOOTSTRAP.md`OpenClaw est créé uniquement pour un **espace de travail tout nouveau** (aucun autre fichier d'amorçage présent). Tant qu'il est en attente, OpenClaw le conserve dans le contexte du projet et ajoute des instructions d'amorçage du système prompt pour le rituel initial au lieu de le copier dans le message utilisateur. Si vous le supprimez après avoir terminé le rituel, il ne doit pas être recréé lors des redémarrages ultérieurs.

Pour désactiver entièrement la création des fichiers d'amorçage (pour les espaces de travail pré-ensemencés), définissez :

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Outils intégrés

Les outils principaux (read/exec/edit/write et les outils système associés) sont toujours disponibles, sous réserve de la stratégie d'outils. `apply_patch` est optionnel et limité par `tools.exec.applyPatch`. `TOOLS.md` ne contrôle **pas** les outils existants ; il s'agit de directives pour la manière dont _vous_ souhaitez qu'ils soient utilisés.

## Compétences

OpenClaw charge les compétences depuis ces emplacements (du plus prioritaire au moins prioritaire) :

- Espace de travail : `<workspace>/skills`
- Compétences de l'agent de projet : `<workspace>/.agents/skills`
- Compétences de l'agent personnel : `~/.agents/skills`
- Géré/local : `~/.openclaw/skills`
- Groupés (fournis avec l'installation)
- Dossiers de compétences supplémentaires : `skills.load.extraDirs`

Les racines de compétences peuvent contenir des dossiers groupés tels que `<workspace>/skills/personal/foo/SKILL.md` ; la compétence est toujours exposée par son nom de frontmatter plat, par exemple `foo`.

Les compétences peuvent être conditionnées par config/env (voir `skills`Gateway dans [Configuration du Gateway](/fr/gateway/configuration)).

## Limites du Runtime

Le runtime d'agent intégré appartient à OpenClaw : la découverte de modèle, le câblage d'outils, l'assemblage de prompts, la gestion des sessions et la livraison de canaux partagent une surface de runtime intégrée.

## Sessions

Les transcriptions de session sont stockées au format JSONL à :

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

L'ID de session est stable et choisi par OpenClaw.
Les dossiers de session hérités d'autres outils ne sont pas lus.

## Pilotage pendant le streaming

Les prompts entrants qui arrivent en cours d'exécution sont dirigés vers l'exécution en cours par défaut. La direction est délivrée **après que le tour de l'assistant actuel a fini d'exécuter ses appels d'outils**, avant le prochain appel LLM, et ne saute plus les appels d'outils restants du message de l'assistant actuel.

`/queue steer` est le comportement d'exécution active par défaut. `/queue followup` et `/queue collect` font attendre les messages pour un tour ultérieur au lieu de diriger. `/queue interrupt` interrompt l'exécution active à la place. Voir [File d'attente](/fr/concepts/queue) et [File d'attente de direction](/fr/concepts/queue-steering) pour le comportement de file et de limite.

Le Block streaming envoie les blocs de l'assistant terminés dès qu'ils sont finis ; il est
**désactivé par défaut** (`agents.defaults.blockStreamingDefault: "off"`).
Ajustez la limite via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end` ; par défaut text_end).
Contrôlez le découpage souple des blocs avec `agents.defaults.blockStreamingChunk` (par défaut
800-1200 caractères ; préfère les sauts de paragraphe, puis les sauts de ligne ; les phrases en dernier).
Fusionnez les fragments diffusés avec `agents.defaults.blockStreamingCoalesce` pour réduire
les spams en une seule ligne (fusion basée sur l'inactivité avant l'envoi). Les canaux non-Telegram nécessitent
un `*.blockStreaming: true` explicite pour activer les réponses par bloc.
Les résumés détaillés des outils sont émis au début de l'outil (sans débounce) ; l'interface de contrôle
diffuse la sortie des outils via les événements de l'agent lorsque disponible.
Plus de détails : [Streaming + chunking](/fr/concepts/streaming).

## Références de modèle

Les références de modèle dans la configuration (par exemple `agents.defaults.model` et `agents.defaults.models`) sont analysées en divisant sur la **première** `/`.

- Utilisez `provider/model` lors de la configuration des modèles.
- Si l'ID du modèle contient lui-même `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet ID de modèle exact, et ne revient ensuite qu'au fournisseur par défaut configuré. Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un ancien fournisseur par défaut supprimé.

## Configuration (minimale)

Au minimum, définissez :

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (fortement recommandé)

---

_Suivant : [Group Chats](/fr/channels/group-messages)_ 🦞

## Connexes

- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Gestion de session](/fr/concepts/session)
