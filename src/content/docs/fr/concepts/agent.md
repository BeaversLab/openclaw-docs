---
summary: "Runtime de l'agent, contrat de l'espace de travail et amorçage de session"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Runtime de l'agent

OpenClaw exécute un seul runtime d'agent intégré.

## Espace de travail (requis)

OpenClaw utilise un seul répertoire d'espace de travail de l'agent (`agents.defaults.workspace`) comme répertoire de travail **unique** (`cwd`) de l'agent pour les outils et le contexte.

Recommandé : utilisez `openclaw setup` pour créer `~/.openclaw/openclaw.json` s'il est manquant et initialiser les fichiers de l'espace de travail.

Guide complet de la disposition de l'espace de travail + sauvegarde : [Agent workspace](/en/concepts/agent-workspace)

Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent remplacer ceci par
des espaces de travail par session sous `agents.defaults.sandbox.workspaceRoot` (voir
[Gateway configuration](/en/gateway/configuration)).

## Fichiers d'amorçage (injectés)

Dans `agents.defaults.workspace`, OpenClaw s'attend à ces fichiers modifiables par l'utilisateur :

- `AGENTS.md` — instructions de fonctionnement + « mémoire »
- `SOUL.md` — personnalité, limites, ton
- `TOOLS.md` — notes sur les outils maintenues par l'utilisateur (ex. `imsg`, `sag`, conventions)
- `BOOTSTRAP.md` — rituel d'exécution unique au premier démarrage (supprimé après achèvement)
- `IDENTITY.md` — nom/atmosphère/emoji de l'agent
- `USER.md` — profil utilisateur + adresse préférée

Au premier tour d'une nouvelle session, OpenClaw injecte directement le contenu de ces fichiers dans le contexte de l'agent.

Les fichiers vides sont ignorés. Les fichiers volumineux sont rognés et tronqués avec un marqueur pour que les invites restent légères (lisez le fichier pour le contenu complet).

Si un fichier est manquant, OpenClaw injecte une seule ligne de marqueur « fichier manquant » (et `openclaw setup` créera un modèle par défaut sécurisé).

`BOOTSTRAP.md` est créé uniquement pour un **espace de travail entièrement nouveau** (aucun autre fichier d'amorçage présent). Si vous le supprimez après avoir terminé le rituel, il ne devrait pas être recréé lors des redémarrages ultérieurs.

Pour désactiver complètement la création de fichiers d'amorçage (pour les espaces de travail pré-remplis), définissez :

```json5
{ agent: { skipBootstrap: true } }
```

## Outils intégrés

Les outils principaux (read/exec/edit/write et les outils système associés) sont toujours disponibles, sous réserve de la stratégie d'outils. `apply_patch` est optionnel et restreint par `tools.exec.applyPatch`. `TOOLS.md` ne contrôle **pas** les outils existants ; il s'agit de directives sur la manière dont _vous_ souhaitez qu'ils soient utilisés.

## Skills

OpenClaw charge les compétences depuis ces emplacements (par ordre de priorité décroissante) :

- Espace de travail : `<workspace>/skills`
- Compétences de l'agent de projet : `<workspace>/.agents/skills`
- Compétences de l'agent personnel : `~/.agents/skills`
- Géré/local : `~/.openclaw/skills`
- Groupé (fourni avec l'installation)
- Dossiers de compétences supplémentaires : `skills.load.extraDirs`

Les compétences peuvent être conditionnées par la config/env (voir `skills` dans [Gateway configuration](/en/gateway/configuration)).

## Limites du Runtime

Le runtime de l'agent intégré est construit sur le cœur de l'agent Pi (modèles, outils et
pipeline de prompts). La gestion des sessions, la découverte, le câblage des outils et la remise des
canaux sont des couches détenues par OpenClaw par-dessus ce cœur.

## Sessions

Les transcriptions de session sont stockées au format JSONL à :

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

L'ID de session est stable et choisi par OpenClaw.
Les dossiers de session hérités d'autres outils ne sont pas lus.

## Pilotage pendant le streaming

Lorsque le mode de file d'attente est `steer`, les messages entrants sont injectés dans l'exécution
courante. Le pilotage en file d'attente est livré **une fois que le tour de l'assistant actuel a fini
d'exécuter ses appels d'outils**, avant le prochain appel LLM. Le pilotage ne saute plus
les appels d'outils restants du message de l'assistant actuel ; il injecte plutôt le message
en file d'attente à la prochaine limite du modèle.

Lorsque le mode de file d'attente est `followup` ou `collect`, les messages entrants sont conservés jusqu'à ce
que le tour actuel se termine, puis un nouveau tour d'agent commence avec les charges utiles en file d'attente. Voir
[Queue](/en/concepts/queue) pour le comportement du mode + rebond/limite.

Block streaming sends completed assistant blocks as soon as they finish; it is
**off by default** (`agents.defaults.blockStreamingDefault: "off"`).
Tune the boundary via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; defaults to text_end).
Control soft block chunking with `agents.defaults.blockStreamingChunk` (defaults to
800–1200 chars; prefers paragraph breaks, then newlines; sentences last).
Coalesce streamed chunks with `agents.defaults.blockStreamingCoalesce` to reduce
single-line spam (idle-based merging before send). Non-Telegram channels require
explicit `*.blockStreaming: true` to enable block replies.
Verbose tool summaries are emitted at tool start (no debounce); Control UI
streams tool output via agent events when available.
More details: [Streaming + chunking](/en/concepts/streaming).

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

_Suivant : [Group Chats](/en/channels/group-messages)_ 🦞
