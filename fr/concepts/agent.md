---
summary: "Agent runtime (pi-mono intégré), contrat d'espace de travail et amorçage de session"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Agent Runtime 🤖

OpenClaw exécute un seul runtime d'agent intégré dérivé de **pi-mono**.

## Espace de travail (requis)

OpenClaw utilise un seul répertoire d'espace de travail de l'agent (`agents.defaults.workspace`) comme répertoire de travail **unique** (`cwd`) de l'agent pour les outils et le contexte.

Recommandé : utilisez `openclaw setup` pour créer `~/.openclaw/openclaw.json` s'il est manquant et initialiser les fichiers de l'espace de travail.

Guide complet de la structure de l'espace de travail + sauvegarde : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent remplacer ceci par des espaces de travail par session sous `agents.defaults.sandbox.workspaceRoot` (voir [Configuration Gateway](/fr/gateway/configuration)).

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

OpenClaw charge les Skills depuis trois emplacements (l'espace de travail prévaut en cas de conflit de noms) :

- Groupés (fournis avec l'installation)
- Gérés/locaux : `~/.openclaw/skills`
- Espace de travail : `<workspace>/skills`

Les Skills peuvent être restreints par la configuration/l'environnement (voir `skills` dans [Configuration Gateway](/fr/gateway/configuration)).

## Intégration pi-mono

OpenClaw réutilise des parties de la base de code pi-mono (modèles/outils), mais **la gestion de session, la découverte et le câblage des outils sont la propriété de OpenClaw**.

- Pas de runtime d'agent pi-coding.
- Aucun paramètre `~/.pi/agent` ou `<workspace>/.pi` n'est consulté.

## Sessions

Les transcriptions de session sont stockées au format JSONL à :

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

L'ID de session est stable et choisi par OpenClaw.
Les dossiers de session Pi/Tau hérités ne sont **pas** lus.

## Pilotage lors du streaming

Lorsque le mode de file d'attente est `steer`, les messages entrants sont injectés dans l'exécution en cours.
La file d'attente est vérifiée **après chaque appel d'outil** ; si un message en file d'attente est présent,
les appels d'outils restants du message assistant actuel sont ignorés (résultats d'erreur d'outil
avec "Skipped due to queued user message."), puis le message utilisateur en file d'attente
est injecté avant la prochaine réponse de l'assistant.

Lorsque le mode de file d'attente est `followup` ou `collect`, les messages entrants sont conservés jusqu'à la fin du tour actuel, puis un nouveau tour d'agent commence avec les charges utiles mises en file d'attente. Voir [Queue](/fr/concepts/queue) pour le comportement du mode + debounce/cap.

Le flux en bloc (Block streaming) envoie les blocs d'assistant terminés dès qu'ils sont terminés ; il est **désactivé par défaut** (`agents.defaults.blockStreamingDefault: "off"`).
Ajustez la limite via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end` ; par défaut text_end).
Contrôlez le découpage souple des blocs avec `agents.defaults.blockStreamingChunk` (par défaut 800–1200 caractères ; préfère les sauts de paragraphe, puis les sauts de ligne ; les phrases en dernier).
Fusionnez les morceaux diffusés avec `agents.defaults.blockStreamingCoalesce` pour réduire le spam sur une seule ligne (fusion basée sur l'inactivité avant l'envoi). Les canaux non-Telegram nécessitent un `*.blockStreaming: true` explicite pour activer les réponses par bloc.
Les résumés détaillés des outils sont émis au début de l'outil (sans debounce) ; l'interface de contrôle diffuse la sortie des outils via les événements de l'agent lorsque disponible.
Plus de détails : [Streaming + chunking](/fr/concepts/streaming).

## Model refs

Les références de modèle dans la configuration (par exemple `agents.defaults.model` et `agents.defaults.models`) sont analysées en divisant sur la **première** `/`.

- Utilisez `provider/model` lors de la configuration des modèles.
- Si l'ID du modèle lui-même contient `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw traite l'entrée comme un alias ou un modèle pour le **fournisseur par défaut** (fonctionne uniquement lorsqu'il n'y a pas de `/` dans l'ID du modèle).

## Configuration (minimal)

Au minimum, définissez :

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (fortement recommandé)

---

_Suite : [Group Chats](/fr/channels/group-messages)_ 🦞

import fr from "/components/footer/fr.mdx";

<fr />
