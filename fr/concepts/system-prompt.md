---
summary: "Contenu du prompt système OpenClaw et comment il est assemblé"
read_when:
  - Modification du texte du prompt système, de la liste des outils ou des sections de temps/heartbeat
Modification du comportement d'amorçage de l'espace de travail ou d'injection de compétences
  - title: "System Prompt"
---

# System Prompt

OpenClaw builds a custom system prompt for every agent run. The prompt is **OpenClaw-owned** and does not use the pi-coding-agent default prompt.

The prompt is assembled by OpenClaw and injected into each agent run.

## Structure

The prompt is intentionally compact and uses fixed sections:

- **Tooling**: current tool list + short descriptions.
- **Safety**: short guardrail reminder to avoid power-seeking behavior or bypassing oversight.
- **Skills** (when available): tells the model how to load skill instructions on demand.
- **OpenClaw Self-Update**: how to run `config.apply` and `update.run`.
- **Workspace**: working directory (`agents.defaults.workspace`).
- **Documentation**: local path to OpenClaw docs (repo or npm package) and when to read them.
- **Workspace Files (injected)**: indicates bootstrap files are included below.
- **Sandbox** (when enabled): indicates sandboxed runtime, sandbox paths, and whether elevated exec is available.
- **Current Date & Time**: user-local time, timezone, and time format.
- **Reply Tags**: optional reply tag syntax for supported providers.
- **Heartbeats**: heartbeat prompt and ack behavior.
- **Runtime**: host, OS, node, model, repo root (when detected), thinking level (one line).
- **Reasoning**: current visibility level + /reasoning toggle hint.

Safety guardrails in the system prompt are advisory. They guide model behavior but do not enforce policy. Use tool policy, exec approvals, sandboxing, and channel allowlists for hard enforcement; operators can disable these by design.

## Prompt modes

OpenClaw can render smaller system prompts for sub-agents. The runtime sets a
`promptMode` for each run (not a user-facing config):

- `full` (default): includes all sections above.
- `minimal` : utilisé pour les sous-agents ; omet **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies** et **Heartbeats**. Les outils, **Safety**,
  Workspace, Sandbox, la date et l'heure actuelles (si connues), le Runtime et le contexte
  injecté restent disponibles.
- `none` : renvoie uniquement la ligne d'identité de base.

Lorsque `promptMode=minimal`, les invites injectées supplémentaires sont étiquetées **Subagent
Context** au lieu de **Group Chat Context**.

## Injection d'amorçage de l'espace de travail

Les fichiers d'amorçage sont rognés et ajoutés sous **Project Context** afin que le model voie l'identité et le contexte du profil sans avoir besoin de lectures explicites :

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (uniquement sur les espaces de travail tout neufs)
- `MEMORY.md` si présent, sinon `memory.md` comme solution de repli en minuscules

Tous ces fichiers sont **injectés dans la fenêtre de contexte** à chaque tour, ce qui
signifie qu'ils consomment des jetons. Gardez-les concis — en particulier `MEMORY.md`, qui peut
croître avec le temps et entraîner une utilisation inattendue du contexte et des compactages
plus fréquents.

> **Remarque :** Les fichiers quotidiens `memory/*.md` ne sont **pas** injectés automatiquement. Ils
> sont accessibles à la demande via les outils `memory_search` et `memory_get`, ils ne
> comptent donc pas contre la fenêtre de contexte à moins que le model ne les lise explicitement.

Les fichiers volumineux sont tronqués avec un marqueur. La taille maximale par fichier est contrôlée par
`agents.defaults.bootstrapMaxChars` (par défaut : 20000). Le contenu total d'amorçage
injecté sur tous les fichiers est plafonné par `agents.defaults.bootstrapTotalMaxChars`
(par défaut : 150000). Les fichiers manquants injectent un marqueur court de fichier manquant. Lorsqu'une troncature
se produit, OpenClaw peut injecter un bloc d'avertissement dans Project Context ; contrôlez cela avec
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always` ;
par défaut : `once`).

Les sessions de sous-agent injectent uniquement `AGENTS.md` et `TOOLS.md` (les autres fichiers d'amorçage
sont filtrés pour garder le contexte du sous-agent petit).

Les crochets internes peuvent intercepter cette étape via `agent:bootstrap` pour modifier ou remplacer
les fichiers d'amorçage injectés (par exemple en échangeant `SOUL.md` pour une autre personnalité).

Pour inspecter combien chaque fichier injecté contribue (brut vs injecté, troncation, plus la surcharge du schéma d'outil), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Gestion du temps

Le prompt système inclut une section dédiée **Date et heure actuelles** lorsque le
fuseau horaire de l'utilisateur est connu. Pour garder le prompt stable dans le cache, il n'inclut désormais
que le **fuseau horaire** (pas d'horloge dynamique ou de format d'heure).

Utilisez `session_status` lorsque l'agent a besoin de l'heure actuelle ; la carte de statut
inclut une ligne d'horodatage.

Configurer avec :

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Voir [Date et heure](/fr/date-time) pour les détails complets du comportement.

## Skills

Lorsque des compétences éligibles existent, OpenClaw injecte une **liste de compétences disponibles** compacte
(`formatSkillsForPrompt`) qui inclut le **chemin de fichier** pour chaque compétence. Le
prompt instruit le model d'utiliser `read` pour charger le SKILL.md à l'emplacement
répertorié (espace de travail, géré ou groupé). Si aucune compétence n'est éligible, la
section Skills est omise.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Cela permet de garder le prompt de base petit tout en permettant une utilisation ciblée des compétences.

## Documentation

Lorsqu'elle est disponible, le prompt système inclut une section **Documentation** qui pointe vers le
répertoire de documentation local OpenClaw (soit `docs/` dans l'espace de travail du dépôt ou les docs du package npm
groupé) et note également le miroir public, le dépôt source, la communauté Discord, et
ClawHub ([https://clawhub.com](https://clawhub.com)) pour la découverte de compétences. Le prompt instruit le model de consulter d'abord la documentation locale
pour le comportement, les commandes, la configuration ou l'architecture de OpenClaw, et d'exécuter
`openclaw status` lui-même lorsque cela est possible (en demandant à l'utilisateur uniquement lorsqu'il n'a pas accès).

import fr from "/components/footer/fr.mdx";

<fr />
