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

Plan complet de l'espace de travail + guide de sauvegarde : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent remplacer cela par des espaces de travail par session sous `agents.defaults.sandbox.workspaceRoot` (voir [configuration Gateway](/fr/gateway/configuration)).

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

Après qu'un espace de travail a été observé, OpenClaw conserve également un marqueur d'attestation du répertoire d'état pour le chemin de l'espace de travail. Si un espace de travail récemment attesté disparaît ou est effacé, le démarrage refuse de réamorcer silencieusement `BOOTSTRAP.md` ; restaurez l'espace de travail ou utilisez une réinitialisation complète à bord pour que l'espace de travail et le marqueur soient effacés ensemble.

Pour désactiver entièrement la création de fichiers d'amorçage (pour les espaces de travail pré-amorcés), définissez :

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Outils intégrés

Les outils de base (read/exec/edit/write et les outils système associés) sont toujours disponibles, sous réserve de la stratégie d'outil. `apply_patch` est facultatif et conditionné par `tools.exec.applyPatch`. `TOOLS.md` ne contrôle **pas** quels outils existent ; c'est une indication sur la façon dont _vous_ voulez qu'ils soient utilisés.

## Skills

OpenClaw charge les skills à partir de ces emplacements (du plus prioritaire au moins prioritaire) :

- Espace de travail : `<workspace>/skills`
- Skills de l'agent de projet : `<workspace>/.agents/skills`
- Skills de l'agent personnel : `~/.agents/skills`
- Géré/local : `~/.openclaw/skills`
- Bundled (fourni avec l'installation)
- Dossiers de skills supplémentaires : `skills.load.extraDirs`

Les racines de skills peuvent contenir des dossiers groupés tels que `<workspace>/skills/personal/foo/SKILL.md` ; le skill est toujours exposé par son nom d'en-tête plat, par exemple `foo`.

Les skills peuvent être conditionnés par la configuration/l'environnement (voir `skills` dans [configuration Gateway](/fr/gateway/configuration)).

## Limites du runtime

Le runtime de l'agent intégré est détenu par OpenClaw : la découverte de modèle, le câblage d'outil, l'assemblage de prompt, la gestion de session et la livraison de canal partagent une surface de runtime intégrée.

## Sessions

Les transcriptions de session sont stockées sous forme de JSONL à :

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

L'ID de session est stable et choisi par OpenClaw.
Les dossiers de session hérités d'autres outils ne sont pas lus.

## Pilotage pendant le streaming

Les invites entrantes qui arrivent en cours d'exécution sont dirigées vers l'exécution en cours par défaut.
Le pilotage est effectué **une fois que le tour de l'assistant actuel a terminé d'exécuter ses
appels d'outils**, avant le prochain appel LLM, et ne saute plus les appels d'outils restants
du message de l'assistant actuel.

`/queue steer` est le comportement par défaut pour l'exécution active. `/queue followup` et
`/queue collect` font attendre les messages pour un tour ultérieur au lieu de piloter.
`/queue interrupt` interrompt l'exécution active à la place. Voir [Queue](/fr/concepts/queue)
et [Steering queue](/fr/concepts/queue-steering) pour le comportement de la file et des limites.

Le Block streaming envoie les blocs d'assistant terminés dès qu'ils sont prêts ; il est
**désactivé par défaut** (`agents.defaults.blockStreamingDefault: "off"`).
Ajustez la limite via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end` ; par défaut text_end).
Contrôlez le découpage souple des blocs avec `agents.defaults.blockStreamingChunk` (par défaut
800-1200 caractères ; préfère les sauts de paragraphe, puis les nouvelles lignes ; les phrases en dernier).
Fusionnez les fragments diffusés avec `agents.defaults.blockStreamingCoalesce` pour réduire
le spam sur une seule ligne (fusion basée sur l'inactivité avant l'envoi). Les canaux non-Telegram nécessitent
un `*.blockStreaming: true` explicite pour activer les réponses par blocs.
Des résumés d'outils verbeux sont émis au début de l'outil (sans debounce) ; l'interface de contrôle
diffuse la sortie de l'outil via les événements de l'agent lorsqu'ils sont disponibles.
Plus de détails : [Streaming + chunking](/fr/concepts/streaming).

## Références de modèle

Les références de modèle dans la configuration (par exemple `agents.defaults.model` et `agents.defaults.models`) sont analysées en divisant sur la **première** `/`.

- Utilisez `provider/model` lors de la configuration des modèles.
- Si l'ID du modèle contient lui-même `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw tente d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite qu'au fournisseur par défaut configuré. Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un ancien modèle par défaut d'un fournisseur supprimé.

## Configuration (minimale)

Au minimum, définissez :

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (fortement recommandé)

---

_Suite : [Groupes de discussion](/fr/channels/group-messages)_ 🦞

## Connexes

- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Gestion des sessions](/fr/concepts/session)
