---
summary: "Agent runtime (intégré pi-mono), contrat d'espace de travail et bootstrap de session"
read_when:
  - Modification du runtime de l'agent, du bootstrap de l'espace de travail ou du comportement de session
title: "Agent Runtime"
---

# Agent Runtime 🤖

OpenClaw exécute un seul runtime d'agent intégré dérivé de **pi-mono**.

## Espace de travail (requis)

OpenClaw utilise un seul répertoire d'espace de travail de l'agent (`agents.defaults.workspace`) comme unique (**only**) répertoire de travail (`cwd`) pour les outils et le contexte.

Recommandé : utiliser `openclaw setup` pour créer `~/.openclaw/openclaw.json` s'il est manquant et initialiser les fichiers de l'espace de travail.

Plan complet de l'espace de travail + guide de sauvegarde : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent remplacer ceci par
des espaces de travail par session sous `agents.defaults.sandbox.workspaceRoot` (voir
[configuration du Gateway](/fr/gateway/configuration)).

## Fichiers d'amorçage (injectés)

Dans `agents.defaults.workspace`, OpenClaw s'attend à ces fichiers modifiables par l'utilisateur :

- `AGENTS.md` — instructions de fonctionnement + "mémoire"
- `SOUL.md` — persona, limites, ton
- `TOOLS.md` — notes sur les outils maintenues par l'utilisateur (ex. `imsg`, `sag`, conventions)
- `BOOTSTRAP.md` — rituel de premier démarrage unique (supprimé après achèvement)
- `IDENTITY.md` — nom/vibe/emoji de l'agent
- `USER.md` — profil utilisateur + adresse préférée

Au premier tour d'une nouvelle session, OpenClaw injecte directement le contenu de ces fichiers dans le contexte de l'agent.

Les fichiers vides sont ignorés. Les fichiers volumineux sont rognés et tronqués avec un marqueur pour que les invites restent légères (lisez le fichier pour le contenu complet).

Si un fichier est manquant, OpenClaw injecte une seule ligne de marqueur "fichier manquant" (et `openclaw setup` créera un modèle par défaut sécurisé).

`BOOTSTRAP.md` est créé uniquement pour un **tout nouvel espace de travail** (aucun autre fichier d'amorçage présent). Si vous le supprimez après avoir terminé le rituel, il ne doit pas être recréé lors des redémarrages ultérieurs.

Pour désactiver complètement la création de fichiers d'amorçage (pour les espaces de travail pré-remplis), définissez :

```json5
{ agent: { skipBootstrap: true } }
```

## Outils intégrés

Les outils de base (lecture/exécution/édition/écriture et outils système associés) sont toujours disponibles,
sous réserve de la politique d'outils. `apply_patch` est facultatif et verrouillé par
`tools.exec.applyPatch`. `TOOLS.md` ne contrôle **pas** les outils existants ; il s'agit
d'une recommandation sur la manière dont _vous_ souhaitez qu'ils soient utilisés.

## Skills

OpenClaw charge les Skills depuis trois emplacements (l'espace de travail prévaut en cas de conflit de noms) :

- Groupés (fournis avec l'installation)
- Géré/local : `~/.openclaw/skills`
- Espace de travail : `<workspace>/skills`

Les Skills peuvent être limitées par la configuration/l'environnement (voir `skills` dans [Gateway configuration](/fr/gateway/configuration)).

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
les appels d'outil restants du message assistant actuel sont ignorés (résultats d'erreur d'outil
avec "Ignoré en raison d'un message utilisateur en file d'attente."), puis le message utilisateur en file d'attente
est injecté avant la prochaine réponse de l'assistant.

Lorsque le mode de file d'attente est `followup` ou `collect`, les messages entrants sont conservés jusqu'à ce que
le tour actuel se termine, puis un nouveau tour d'agent commence avec les charges utiles en file d'attente. Voir
[Queue](/fr/concepts/queue) pour le comportement du mode + debounce/cap.

Le Block streaming envoie les blocs assistant terminés dès qu'ils sont terminés ; il est
**désactivé par défaut** (`agents.defaults.blockStreamingDefault: "off"`).
Ajustez la limite via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end` ; par défaut text_end).
Contrôlez le découpage en blocs souple avec `agents.defaults.blockStreamingChunk` (par défaut
800–1200 caractères ; préfère les sauts de paragraphe, puis les sauts de ligne ; les phrases en dernier).
Fusionnez les fragments diffusés avec `agents.defaults.blockStreamingCoalesce` pour réduire
le spam en ligne unique (fusion basée sur l'inactivité avant l'envoi). Les canaux non-Telegram nécessitent
un `*.blockStreaming: true` explicite pour activer les réponses par bloc.
Des résumés d'outils verbeux sont émis au début de l'outil (sans debounce) ; l'interface de contrôle
diffuse la sortie de l'outil via les événements de l'agent lorsqu'ils sont disponibles.
Plus de détails : [Streaming + chunking](/fr/concepts/streaming).

## Model refs

Les références de modèle dans la configuration (par exemple `agents.defaults.model` et `agents.defaults.models`) sont analysées en divisant sur le **premier** `/`.

- Utilisez `provider/model` lors de la configuration des modèles.
- Si l'ID du modèle contient `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw traite l'entrée comme un alias ou un modèle pour le **fournisseur par défaut** (fonctionne uniquement lorsqu'il n'y a pas `/` dans l'ID du modèle).

## Configuration (minimal)

Au minimum, définissez :

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (fortement recommandé)

---

_Suivant : [Group Chats](/fr/channels/group-messages)_ 🦞

import fr from "/components/footer/fr.mdx";

<fr />
