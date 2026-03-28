---
summary: "Plongée approfondie : magasin de sessions + transcriptions, cycle de vie et internes de la (auto)compaction"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Plongée approfondie dans la gestion des sessions"
---

# Gestion des sessions et compaction (Plongée approfondie)

Ce document explique comment OpenClaw gère les sessions de bout en bout :

- **Routage des sessions** (façon dont les messages entrants sont mappés à une `sessionKey`)
- **Magasin de sessions** (`sessions.json`) et ce qu'il suit
- **Persistance des transcriptions** (`*.jsonl`) et sa structure
- **Hygiène des transcriptions** (corrections spécifiques au fournisseur avant les exécutions)
- **Limites de contexte** (fenêtre de contexte par rapport aux jetons suivis)
- **Compaction** (manuelle + auto-compaction) et où accrocher le travail de pré-compaction
- **Maintenance silencieuse** (ex: écritures en mémoire qui ne doivent pas produire de sortie visible pour l'utilisateur)

Si vous souhaitez d'abord un aperçu de plus haut niveau, commencez par :

- [/concepts/session](/fr/concepts/session)
- [/concepts/compaction](/fr/concepts/compaction)
- [/concepts/session-pruning](/fr/concepts/session-pruning)
- [/reference/transcript-hygiene](/fr/reference/transcript-hygiene)

---

## Source de vérité : le Gateway

OpenClaw est conçu autour d'un unique **processus Gateway** qui possède l'état de la session.

- Les interfaces utilisateur (application macOS, interface de contrôle Web, TUI) doivent interroger le Gateway pour les listes de sessions et les compteurs de jetons.
- En mode distant, les fichiers de session se trouvent sur l'hôte distant ; « vérifier vos fichiers Mac locaux » ne reflétera pas ce que le Gateway utilise.

---

## Deux couches de persistance

OpenClaw persiste les sessions sur deux couches :

1. **Magasin de sessions (`sessions.json`)**
   - Carte clé/valeur : `sessionKey -> SessionEntry`
   - Petit, mutable, sûr à éditer (ou à supprimer des entrées)
   - Suivi des métadonnées de session (id de session actuel, dernière activité, bascules, compteurs de jetons, etc.)

2. **Transcription (`<sessionId>.jsonl`)**
   - Transcription en ajout uniquement avec une structure d'arborescence (les entrées ont `id` + `parentId`)
   - Stocke la conversation réelle + les appels d'outils + les résumés de compactage
   - Utilisé pour reconstruire le contexte du modèle pour les prochains tours

---

## Emplacements sur disque

Par agent, sur l'hôte du Gateway :

- Store : `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcriptions : `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sessions de sujet Telegram : `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw les résout via `src/config/sessions.ts`.

---

## Maintenance du magasin et contrôles du disque

La persistance des sessions dispose de contrôles de maintenance automatique (`session.maintenance`) pour `sessions.json` et les artefacts de transcription :

- `mode` : `warn` (par défaut) ou `enforce`
- `pruneAfter` : limite d'âge des entrées obsolètes (par défaut `30d`)
- `maxEntries` : limite le nombre d'entrées dans `sessions.json` (par défaut `500`)
- `rotateBytes` : faire une rotation de `sessions.json` lorsqu'il est trop volumineux (par défaut `10mb`)
- `resetArchiveRetention` : rétention pour les archives de transcriptions `*.reset.<timestamp>` (par défaut : identique à `pruneAfter` ; `false` désactive le nettoyage)
- `maxDiskBytes` : budget facultatif pour le répertoire des sessions
- `highWaterBytes` : cible facultative après le nettoyage (par défaut `80%` de `maxDiskBytes`)

Ordre d'application pour le nettoyage du budget disque (`mode: "enforce"`) :

1. Supprimer d'abord les artefacts de transcription archivés ou orphelins les plus anciens.
2. Si toujours au-dessus de la cible, expulser les entrées de session les plus anciennes et leurs fichiers de transcription.
3. Continuer jusqu'à ce que l'utilisation soit inférieure ou égale à `highWaterBytes`.

En `mode: "warn"`, OpenClaw signale les expulsions potentielles mais ne modifie pas le magasin/les fichiers.

Exécuter la maintenance à la demande :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sessions Cron et journaux d'exécution

Les exécutions cron isolées créent également des entrées/transcriptions de session, et elles disposent de contrôles de rétention dédiés :

- `cron.sessionRetention` (par défaut `24h`) supprime les anciennes sessions de cron isolées du magasin de sessions (`false` désactive).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` nettoient les fichiers `~/.openclaw/cron/runs/<jobId>.jsonl` (défauts : `2_000_000` octets et `2000` lignes).

---

## Clés de session (`sessionKey`)

Une `sessionKey` identifie _à quel bucket de conversation_ vous appartenez (routage + isolation).

Modèles courants :

- Chat principal/direct (par agent) : `agent:<agentId>:<mainKey>` (par défaut `main`)
- Groupe : `agent:<agentId>:<channel>:group:<id>`
- Salon/channel (Discord/Slack) : `agent:<agentId>:<channel>:channel:<id>` ou `...:room:<id>`
- Cron : `cron:<job.id>`
- Webhook : `hook:<uuid>` (sauf si remplacé)

Les règles canoniques sont documentées sur [/concepts/session](/fr/concepts/session).

---

## IDs de session (`sessionId`)

Chaque `sessionKey` pointe vers un `sessionId` actuel (le fichier de transcription qui poursuit la conversation).

Règles empiriques :

- **Réinitialisation** (`/new`, `/reset`) crée un nouveau `sessionId` pour cette `sessionKey`.
- **Réinitialisation quotidienne** (par défaut 4h00 heure locale sur l'hôte de la passerelle) crée un nouveau `sessionId` sur le prochain message après la limite de réinitialisation.
- **Expiration d'inactivité** (`session.reset.idleMinutes` ou l'ancien `session.idleMinutes`) crée un nouveau `sessionId` lorsqu'un message arrive après la fenêtre d'inactivité. Lorsque daily + idle sont tous deux configurés, celui qui expire primeiro prime.
- **Garde de bifurcation du parent de fil** (`session.parentForkMaxTokens`, par défaut `100000`) ignore la bifurcation de la transcription parente lorsque la session parente est déjà trop volumineuse ; le nouveau fil recommence à zéro. Définissez `0` pour désactiver.

Détail d'implémentation : la décision a lieu dans `initSessionState()` dans `src/auto-reply/reply/session.ts`.

---

## Schéma du magasin de sessions (`sessions.json`)

Le type de valeur du magasin est `SessionEntry` dans `src/config/sessions.ts`.

Champs clés (non exhaustifs) :

- `sessionId` : id de la transcription actuelle (le nom de fichier est dérivé de celui-ci à moins que `sessionFile` ne soit défini)
- `updatedAt` : horodatage de la dernière activité
- `sessionFile` : substitution facultative du chemin de transcription explicite
- `chatType` : `direct | group | room` (aide les interfaces utilisateur et la politique d'envoi)
- `provider`, `subject`, `room`, `space`, `displayName` : métadonnées pour l'étiquetage de groupe/channel
- Interrupteurs :
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (substitution par session)
- Sélection du modèle :
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Compteurs de jetons (au mieux/dependants du provider) :
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount` : fréquence à laquelle la compactage automatique s'est terminé pour cette clé de session
- `memoryFlushAt` : horodatage de la dernière purge de mémoire pré-compaction
- `memoryFlushCompactionCount` : nombre de compactages lors de la dernière purge

Le magasin peut être modifié sans risque, mais le Gateway fait autorité : il peut réécrire ou réhydrater les entrées lorsque les sessions s'exécutent.

---

## Structure de la transcription (`*.jsonl`)

Les transcriptions sont gérées par `SessionManager` de `@mariozechner/pi-coding-agent`.

Le fichier est au format JSONL :

- Première ligne : en-tête de session (`type: "session"`, inclut `id`, `cwd`, `timestamp`, optionnel `parentSession`)
- Ensuite : entrées de session avec `id` + `parentId` (arbre)

Types d'entrées notables :

- `message` : messages utilisateur/assistant/toolResult
- `custom_message` : messages injectés par l'extension qui _entrent_ dans le contexte du modèle (peuvent être masqués dans l'interface utilisateur)
- `custom` : état de l'extension qui n'entre _pas_ dans le contexte du modèle
- `compaction` : résumé de compactage persistant avec `firstKeptEntryId` et `tokensBefore`
- `branch_summary` : résumé persistant lors de la navigation dans une branche d'arbre

OpenClaw ne "corrige" **pas** intentionnellement les transcriptions ; le OpenClaw utilise `SessionManager` pour les lire/écrire.

---

## Fenêtres contextuelles vs jetons suivis

Deux concepts différents importent :

1. **Fenêtre contextuelle du modèle** : limite stricte par modèle (jetons visibles par le modèle)
2. **Compteurs du magasin de sessions** : statistiques roulantes écrites dans `sessions.json` (utilisées pour /status et les tableaux de bord)

Si vous ajustez les limites :

- La fenêtre contextuelle provient du catalogue de modèles (et peut être remplacée via la configuration).
- `contextTokens` dans le magasin est une valeur d'estimation/rapport à l'exécution ; ne la traitez pas comme une garantie stricte.

Pour en savoir plus, voir [/token-use](/fr/reference/token-use).

---

## Compactage : ce que c'est

Le compactage résume l'ancienne conversation dans une entrée `compaction` persistante de la transcription et conserve les messages récents intacts.

Après compactage, les futurs tours voient :

- Le résumé de compactage
- Les messages après `firstKeptEntryId`

Le compactage est **persistant** (contrairement à l'élagage de session). Voir [/concepts/session-pruning](/fr/concepts/session-pruning).

---

## Quand l'auto-compactage se produit (runtime Pi)

Dans l'agent Pi intégré, la compactage automatique se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte → compactage → nouvelle tentative.
2. **Maintenance de seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre de contexte du modèle
- `reserveTokens` est la marge réservée pour les invites + la prochaine sortie du modèle

Ce sont des sémantiques d'exécution Pi (OpenClaw consomme les événements, mais Pi décide quand compacter).

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

OpenClaw applique également un plancher de sécurité pour les exécutions intégrées :

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw l'augmente.
- Le plancher par défaut est `20000` jetons.
- Définissez `agents.defaults.compaction.reserveTokensFloor: 0` pour désactiver le plancher.
- S'il est déjà plus élevé, OpenClaw le laisse tel quel.

Pourquoi : laisser suffisamment de marge pour le « nettoyage » multi-tours (comme les écritures en mémoire) avant que le compactage ne devienne inévitable.

Implémentation : `ensurePiCompactionReserveTokens()` dans `src/agents/pi-settings.ts`
(appelé depuis `src/agents/pi-embedded-runner.ts`).

---

## Surfaces visibles par l'utilisateur

Vous pouvez observer le compactage et l'état de la session via :

- `/status` (dans n'importe quelle session de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Mode verbeux : `🧹 Auto-compaction complete` + nombre de compactages

---

## Nettoyage silencieux (`NO_REPLY`)

OpenClaw prend en charge les tours « silencieux » pour les tâches en arrière-plan où l'utilisateur ne doit pas voir la sortie intermédiaire.

Convention :

- L'assistant commence sa sortie par `NO_REPLY` pour indiquer « ne pas livrer de réponse à l'utilisateur ».
- OpenClaw supprime/masque cela dans la couche de livraison.

À partir de `2026.1.10`, OpenClaw supprime également le **streaming de brouillon/frappe** lorsqu'un segment partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de sortie partielle en cours de tour.

---

## Pré-compaction "vidage de la mémoire" (implémenté)

Objectif : avant que la auto-compaction n'ait lieu, exécuter un tour agentique silencieux qui écrit l'état
durable sur le disque (p. ex. `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) pour que la compaction ne puisse pas
effacer le contexte critique.

OpenClaw utilise l'approche du **vidage pré-seuil** :

1. Surveiller l'utilisation du contexte de session.
2. Lorsqu'il dépasse un « seuil souple » (en dessous du seuil de compaction de Pi), exécuter une directive
   silencieuse « écrire la mémoire maintenant » vers l'agent.
3. Utilisez `NO_REPLY` pour que l'utilisateur ne voie rien.

Configuration (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de vidage)
- `systemPrompt` (invite système supplémentaire ajoutée pour le tour de vidage)

Notes :

- L'invite système par défaut inclut un indice `NO_REPLY` pour supprimer la livraison.
- Le vidage s'exécute une fois par cycle de compaction (suivi dans `sessions.json`).
- Le vidage ne s'exécute que pour les sessions Pi intégrées (les backends CLI l'ignorent).
- Le vidage est ignoré lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Voir [Mémoire](/fr/concepts/memory) pour la disposition des fichiers de l'espace de travail et les modèles d'écriture.

Pi expose également un hook `session_before_compact` dans l'API d'extension, mais la logique de
vidage d'OpenClaw réside aujourd'hui du côté de la Gateway.

---

## Liste de contrôle de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/fr/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Incohérence entre le magasin et la transcription ? Confirmez l'hôte du Gateway et le chemin du magasin à partir de `openclaw status`.
- Spam de compactage ? Vérifiez :
  - fenêtre de contexte du model (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevés pour la fenêtre du model peuvent provoquer un compactage plus précoce)
  - gonflement des résultats de tool : activez/réglez le nettoyage des sessions
- Fuites de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (token exact) et que vous êtes sur une version qui inclut la correction de la suppression du streaming.
