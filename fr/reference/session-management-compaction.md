---
summary: "Deep dive: session store + transcripts, lifecycle, and (auto)compaction internals"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions. fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Session Management Deep Dive"
---

# Session Management & Compaction (Deep Dive)

This document explains how OpenClaw manages sessions end-to-end:

- **Session routing** (how inbound messages map to a `sessionKey`)
- **Session store** (`sessions.json`) and what it tracks
- **Transcript persistence** (`*.jsonl`) and its structure
- **Transcript hygiene** (provider-specific fixups before runs)
- **Context limits** (context window vs tracked tokens)
- **Compaction** (manual + auto-compaction) and where to hook pre-compaction work
- **Silent housekeeping** (e.g. memory writes that shouldn’t produce user-visible output)

If you want a higher-level overview first, start with:

- [/concepts/session](/fr/concepts/session)
- [/concepts/compaction](/fr/concepts/compaction)
- [/concepts/session-pruning](/fr/concepts/session-pruning)
- [/reference/transcript-hygiene](/fr/reference/transcript-hygiene)

---

## Source of truth: the Gateway

OpenClaw is designed around a single **Gateway process** that owns session state.

- UIs (macOS app, web Control UI, TUI) should query the Gateway for session lists and token counts.
- In remote mode, session files are on the remote host; “checking your local Mac files” won’t reflect what the Gateway is using.

---

## Two persistence layers

OpenClaw persists sessions in two layers:

1. **Session store (`sessions.json`)**
   - Key/value map: `sessionKey -> SessionEntry`
   - Small, mutable, safe to edit (or delete entries)
   - Tracks session metadata (current session id, last activity, toggles, token counters, etc.)

2. **Transcript (`<sessionId>.jsonl`)**
   - Append-only transcript with tree structure (entries have `id` + `parentId`)
   - Stores the actual conversation + tool calls + compaction summaries
   - Used to rebuild the model context for future turns

---

## Emplacements sur disque

Par agent, sur l'hôte Gateway :

- Magasin : `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcriptions : `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sessions de sujet Telegram : `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw les résout via `src/config/sessions.ts`.

---

## Maintenance du magasin et contrôles de disque

La persistance des sessions dispose de contrôles de maintenance automatique (`session.maintenance`) pour `sessions.json` et les artefacts de transcription :

- `mode` : `warn` (par défaut) ou `enforce`
- `pruneAfter` : limite d'ancienneté des entrées obsolètes (par défaut `30d`)
- `maxEntries` : plafonner les entrées dans `sessions.json` (par défaut `500`)
- `rotateBytes` : faire une rotation de `sessions.json` lorsqu'il est trop volumineux (par défaut `10mb`)
- `resetArchiveRetention` : rétention pour les archives de transcriptions `*.reset.<timestamp>` (par défaut : identique à `pruneAfter` ; `false` désactive le nettoyage)
- `maxDiskBytes` : budget optionnel pour le répertoire des sessions
- `highWaterBytes` : cible optionnelle après le nettoyage (par défaut `80%` de `maxDiskBytes`)

Ordre d'application pour le nettoyage du budget disque (`mode: "enforce"`) :

1. Supprimer d'abord les artefacts de transcription archivés ou orphelins les plus anciens.
2. Si toujours au-dessus de la cible, expulser les entrées de session les plus anciennes et leurs fichiers de transcription.
3. Continuer jusqu'à ce que l'utilisation soit inférieure ou égale à `highWaterBytes`.

En mode `mode: "warn"`, OpenClaw signale les expulsions potentielles mais ne modifie pas le magasin/les fichiers.

Exécuter la maintenance à la demande :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sessions Cron et journaux d'exécution

Les exécutions cron isolées créent également des entrées/transcriptions de session, et disposent de contrôles de rétention dédiés :

- `cron.sessionRetention` (par défaut `24h`) nettoie les anciennes sessions d'exécution cron isolées du magasin de sessions (`false` désactive).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` élaguent les fichiers `~/.openclaw/cron/runs/<jobId>.jsonl` (par défaut : `2_000_000` octets et `2000` lignes).

---

## Clés de session (`sessionKey`)

Une `sessionKey` identifie _à quel compartiment de conversation_ vous appartenez (routage + isolation).

Modèles courants :

- Chat principal/direct (par agent) : `agent:<agentId>:<mainKey>` (par défaut `main`)
- Groupe : `agent:<agentId>:<channel>:group:<id>`
- Salon/Canal (Discord/Slack) : `agent:<agentId>:<channel>:channel:<id>` ou `...:room:<id>`
- Cron : `cron:<job.id>`
- Webhook : `hook:<uuid>` (sauf s'il est remplacé)

Les règles canoniques sont documentées dans [/concepts/session](/fr/concepts/session).

---

## Identifiants de session (`sessionId`)

Chaque `sessionKey` pointe vers un `sessionId` actuel (le fichier de transcription qui poursuit la conversation).

Règles empiriques :

- **Réinitialiser** (`/new`, `/reset`) crée un nouveau `sessionId` pour cette `sessionKey`.
- **Réinitialisation quotidienne** (par défaut à 4h00 heure locale sur l'hôte de la passerelle) crée un nouveau `sessionId` sur le message suivant après la limite de réinitialisation.
- **Expiration d'inactivité** (`session.reset.idleMinutes` ou l'ancien `session.idleMinutes`) crée un nouveau `sessionId` lorsqu'un message arrive après la fenêtre d'inactivité. Lorsque le quotidien et l'inactivité sont tous deux configurés, celui qui expire first l'emporte.
- **Garde de bifurcation du fil parent** (`session.parentForkMaxTokens`, par défaut `100000`) ignore la bifurcation de la transcription parent lorsque la session parent est déjà trop volumineuse ; le nouveau fil recommence à zéro. Définissez `0` pour désactiver.

Détail de mise en œuvre : la décision est prise dans `initSessionState()` dans `src/auto-reply/reply/session.ts`.

---

## Schéma du magasin de sessions (`sessions.json`)

Le type de valeur du magasin est `SessionEntry` dans `src/config/sessions.ts`.

Champs clés (non exhaustif) :

- `sessionId` : id de la transcription actuelle (le nom de fichier est dérivé de celui-ci sauf si `sessionFile` est défini)
- `updatedAt` : horodatage de la dernière activité
- `sessionFile` : substitution facultative du chemin de la transcription explicite
- `chatType` : `direct | group | room` (aide les interfaces utilisateur et la stratégie d'envoi)
- `provider` , `subject` , `room` , `space` , `displayName` : métadonnées pour l'étiquetage de groupe/channel
- Bascules :
  - `thinkingLevel` , `verboseLevel` , `reasoningLevel` , `elevatedLevel`
  - `sendPolicy` (substitution par session)
- Sélection du model :
  - `providerOverride` , `modelOverride` , `authProfileOverride`
- Compteurs de jetons (au mieux / dépend du provider) :
  - `inputTokens` , `outputTokens` , `totalTokens` , `contextTokens`
- `compactionCount` : fréquence à laquelle la compactage automatique s'est terminé pour cette clé de session
- `memoryFlushAt` : horodatage de la dernière vidange de la mémoire pré-compaction
- `memoryFlushCompactionCount` : nombre de compactages lors de la dernière exécution de la vidange

Le magasin peut être modifié en toute sécurité, mais le Gateway est l'autorité : il peut réécrire ou réhydrater les entrées lorsque les sessions s'exécutent.

---

## Structure de la transcription (`*.jsonl`)

Les transcriptions sont gérées par le `SessionManager` de `@mariozechner/pi-coding-agent`.

Le fichier est au format JSONL :

- Première ligne : en-tête de session (`type: "session"`, inclut `id`, `cwd`, `timestamp`, `parentSession` facultatif)
- Ensuite : entrées de session avec `id` + `parentId` (arborescence)

Types d'entrées notables :

- `message` : messages utilisateur/assistant/toolResult
- `custom_message` : messages injectés par l'extension qui entrent _bien_ dans le contexte du model (peuvent être masqués dans l'interface utilisateur)
- `custom` : état de l'extension qui n'entre _pas_ dans le contexte du modèle
- `compaction` : résumé de compactage persistant avec `firstKeptEntryId` et `tokensBefore`
- `branch_summary` : résumé persistant lors de la navigation dans une branche d'arbre

OpenClaw ne corrige intentionnellement **pas** les transcriptions ; le OpenClaw utilise `SessionManager` pour les lire/écrire.

---

## Fenêtres de contexte vs jetons suivis

Deux concepts différents comptent :

1. **Fenêtre de contexte du modèle** : limite stricte par modèle (jetons visibles par le modèle)
2. **Compteurs du magasin de sessions** : statistiques roulantes écrites dans `sessions.json` (utilisés pour /status et les tableaux de bord)

Si vous ajustez les limites :

- La fenêtre de contexte provient du catalogue de modèles (et peut être remplacée via la configuration).
- `contextTokens` dans le magasin est une valeur d'estimation/ de rapport à l'exécution ; ne la traitez pas comme une garantie stricte.

Pour plus d'informations, consultez [/token-use](/fr/reference/token-use).

---

## Compactage : ce que c'est

Le compactage résume l'ancienne conversation dans une entrée `compaction` persistante de la transcription et garde les messages récents intacts.

Après compactage, les futurs tours voient :

- Le résumé de compactage
- Les messages après `firstKeptEntryId`

Le compactage est **persistant** (contrairement à l'élagage de session). Consultez [/concepts/session-pruning](/fr/concepts/session-pruning).

---

## Quand l'auto-compactage se produit (runtime Pi)

Dans l'agent Pi intégré, l'auto-compactage se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte → compacter → réessayer.
2. **Maintenance du seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre de contexte du modèle
- `reserveTokens` est la marge réservée pour les invites + la prochaine sortie du modèle

Il s'agit de la sémantique du runtime Pi (OpenClaw consomme les événements, mais Pi décide quand compacter).

---

## Paramètres de compactage (`reserveTokens`, `keepRecentTokens`)

Les paramètres de compactage de Pi se trouvent dans les paramètres Pi :

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw applique également un seuil de sécurité minimum pour les exécutions intégrées :

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw l'augmente.
- Le plancher par défaut est `20000` tokens.
- Définissez `agents.defaults.compaction.reserveTokensFloor: 0` pour désactiver le plancher.
- S'il est déjà plus élevé, OpenClaw le laisse tel quel.

Pourquoi : laisser suffisamment de marge pour le « nettoyage » multitours (comme les écritures en mémoire) avant que la compaction ne devienne inévitable.

Implémentation : `ensurePiCompactionReserveTokens()` dans `src/agents/pi-settings.ts`
(appelé depuis `src/agents/pi-embedded-runner.ts`).

---

## Surfaces visibles par l'utilisateur

Vous pouvez observer la compaction et l'état de la session via :

- `/status` (dans n'importe quelle session de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Mode verbeux : `🧹 Auto-compaction complete` + nombre de compactages

---

## Nettoyage silencieux (`NO_REPLY`)

OpenClaw prend en charge les tours « silencieux » pour les tâches d'arrière-plan où l'utilisateur ne doit pas voir la sortie intermédiaire.

Convention :

- L'assistant commence sa sortie par `NO_REPLY` pour indiquer « ne pas envoyer de réponse à l'utilisateur ».
- OpenClaw supprime/masque ceci au niveau de la livraison.

Depuis `2026.1.10`, OpenClaw supprime également le **streaming de brouillon/frappe** lorsqu'un bloc partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de sortie partielle en cours de tour.

---

## "Vidange de la mémoire" pré-compaction (implémenté)

Objectif : avant que la auto-compaction ne se produise, exécuter un tour agentique silencieux qui écrit l'état
durable sur le disque (par exemple `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) afin que la compaction ne puisse pas
effacer le contexte critique.

OpenClaw utilise l'approche de **vidange pré-seuil** :

1. Surveiller l'utilisation du contexte de la session.
2. Lorsqu'il franchit un « seuil souple » (en dessous du seuil de compaction de Pi), exécuter une directive
   silencieuse « écrire la mémoire maintenant » à l'agent.
3. Utilisez `NO_REPLY` pour que l'utilisateur ne voie rien.

Configuration (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de vidange)
- `systemPrompt` (invite système supplémentaire ajoutée pour le tour de vidange)

Notes :

- Le prompt système par défaut inclut un indice `NO_REPLY` pour supprimer la livraison.
- Le vidage s'exécute une fois par cycle de compactage (suivi dans `sessions.json`).
- Le vidage ne s'exécute que pour les sessions Pi intégrées (les backends CLI l'ignorent).
- Le vidage est ignoré lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Voir [Mémoire](/fr/concepts/memory) pour la disposition des fichiers de l'espace de travail et les modèles d'écriture.

Pi expose également un hook `session_before_compact` dans l'API des extensions, mais la logique de vidage de OpenClaw réside aujourd'hui du côté Gateway.

---

## Liste de contrôle de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/fr/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Inadéquation entre le magasin et la transcription ? Confirmez l'hôte Gateway et le chemin du magasin à partir de `openclaw status`.
- Spam de compactage ? Vérifiez :
  - fenêtre de contexte du modèle (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevé pour la fenêtre du modèle peut provoquer un compactage plus précoce)
  - gonflement des résultats d'outil : activez/réglez le nettoyage des sessions
- Fuite de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (jeton exact) et que vous utilisez une version incluant la correction de la suppression du flux.

import fr from "/components/footer/fr.mdx";

<fr />
