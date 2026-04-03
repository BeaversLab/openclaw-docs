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

- [/concepts/session](/en/concepts/session)
- [/concepts/compaction](/en/concepts/compaction)
- [/concepts/memory](/en/concepts/memory)
- [/concepts/memory-search](/en/concepts/memory-search)
- [/concepts/session-pruning](/en/concepts/session-pruning)
- [/reference/transcript-hygiene](/en/reference/transcript-hygiene)

---

## Source de vérité : le Gateway

OpenClaw est conçu autour d'un unique **processus Gateway** qui possède l'état de la session.

- Les interfaces utilisateur (application macOS, interface de contrôle Web, TUI) doivent interroger le Gateway pour obtenir les listes de sessions et les comptes de jetons.
- En mode distant, les fichiers de session se trouvent sur l'hôte distant ; "vérifier vos fichiers Mac locaux" ne reflétera pas ce que le Gateway utilise.

---

## Deux couches de persistance

OpenClaw conserve les sessions sur deux couches :

1. **Magasin de sessions (`sessions.json`)**
   - Carte clé/valeur : `sessionKey -> SessionEntry`
   - Petit, mutable, sûr à modifier (ou à supprimer des entrées)
   - Suivi des métadonnées de session (id de session actuel, dernière activité, bascules, compteurs de jetons, etc.)

2. **Transcription (`<sessionId>.jsonl`)**
   - Transcription en ajout uniquement avec une structure arborescente (les entrées ont `id` + `parentId`)
   - Stocke la conversation réelle + les appels d'outils + les résumés de compactage
   - Utilisé pour reconstruire le contexte du modèle pour les futurs tours

---

## Emplacements sur disque

Par agent, sur l'hôte du Gateway :

- Magasin : `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcriptions : `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sessions de sujet Telegram : `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw les résout via `src/config/sessions.ts`.

---

## Maintenance du magasin et contrôles disque

La persistance des sessions dispose de contrôles de maintenance automatique (`session.maintenance`) pour les artefacts `sessions.json` et de transcription :

- `mode` : `warn` (par défaut) ou `enforce`
- `pruneAfter` : limite d'âge des entrées obsolètes (par défaut `30d`)
- `maxEntries` : plafonner les entrées dans `sessions.json` (par défaut `500`)
- `rotateBytes` : faire une rotation de `sessions.json` en cas de dépassement de taille (par défaut `10mb`)
- `resetArchiveRetention` : rétention pour les archives de transcriptions `*.reset.<timestamp>` (par défaut : identique à `pruneAfter` ; `false` désactive le nettoyage)
- `maxDiskBytes` : budget optionnel pour le répertoire de sessions
- `highWaterBytes` : cible optionnelle après nettoyage (par défaut `80%` de `maxDiskBytes`)

Ordre d'application pour le nettoyage du budget disque (`mode: "enforce"`) :

1. Supprimer d'abord les artefacts de transcription archivés ou orphelins les plus anciens.
2. Si toujours au-dessus de la cible, expulser les entrées de session les plus anciennes et leurs fichiers de transcription.
3. Continuer jusqu'à ce que l'utilisation soit égale ou inférieure à `highWaterBytes`.

En `mode: "warn"`, OpenClaw signale les expulsions potentielles mais ne modifie pas le magasin/les fichiers.

Exécuter la maintenance à la demande :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sessions Cron et journaux d'exécution

Les exécutions cron isolées créent également des entrées de session/transcriptions, et elles disposent de contrôles de rétention dédiés :

- `cron.sessionRetention` (par défaut `24h`) élimine les anciennes sessions d'exécution cron isolées du magasin de sessions (`false` désactive).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` éliminent les fichiers `~/.openclaw/cron/runs/<jobId>.jsonl` (par défaut : `2_000_000` octets et `2000` lignes).

---

## Clés de session (`sessionKey`)

Une `sessionKey` identifie _à quel bucket de conversation_ vous appartenez (routage + isolation).

Modèles courants :

- Chat principal/direct (par agent) : `agent:<agentId>:<mainKey>` (par défaut `main`)
- Groupe : `agent:<agentId>:<channel>:group:<id>`
- Salon/canal (Discord/Slack) : `agent:<agentId>:<channel>:channel:<id>` ou `...:room:<id>`
- Cron : `cron:<job.id>`
- Webhook : `hook:<uuid>` (sauf si remplacé)

Les règles canoniques sont documentées dans [/concepts/session](/en/concepts/session).

---

## Identifiants de session (`sessionId`)

Chaque `sessionKey` pointe vers un `sessionId` actuel (le fichier de transcription qui poursuit la conversation).

Règles empiriques :

- **Reset** (`/new`, `/reset`) crée un nouveau `sessionId` pour ce `sessionKey`.
- **Daily reset** (par défaut 4h00 heure locale sur l'hôte de la passerelle) crée un nouveau `sessionId` sur le prochain message après la limite de réinitialisation.
- **Idle expiry** (`session.reset.idleMinutes` ou l'ancien `session.idleMinutes`) crée un nouveau `sessionId` lorsqu'un message arrive après la fenêtre d'inactivité. Quand les réinitialisations quotidienne et par inactivité sont toutes deux configurées, la première qui expire l'emporte.
- **Thread parent fork guard** (`session.parentForkMaxTokens`, par défaut `100000`) ignore la duplication de la transcription parente lorsque la session parente est déjà trop volumineuse ; le nouveau fil démarre à l'état neuf. Définissez `0` pour désactiver.

Détail d'implémentation : la décision est prise dans `initSessionState()` dans `src/auto-reply/reply/session.ts`.

---

## Schéma du magasin de sessions (`sessions.json`)

Le type de valeur du magasin est `SessionEntry` dans `src/config/sessions.ts`.

Champs clés (liste non exhaustive) :

- `sessionId` : id de la transcription actuelle (le nom de fichier est dérivé de celui-ci sauf si `sessionFile` est défini)
- `updatedAt` : horodatage de la dernière activité
- `sessionFile` : remplacement explicite optionnel du chemin de la transcription
- `chatType` : `direct | group | room` (aide les interfaces utilisateur et la stratégie d'envoi)
- `provider`, `subject`, `room`, `space`, `displayName` : métadonnées pour l'étiquetage de groupe/canal
- Bascules :
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (remplacement par session)
- Sélection du modèle :
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Compteurs de jetons (best-effort / dépendant du fournisseur) :
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount` : fréquence à laquelle l'auto-compaction s'est terminée pour cette clé de session
- `memoryFlushAt` : horodatage de la dernière vidange de mémoire pré-compaction
- `memoryFlushCompactionCount` : compteur de compactage lors de la dernière exécution de vidange

Le magasin peut être modifié en toute sécurité, mais le Gateway fait autorité : il peut réécrire ou réhydrater les entrées au fur et à mesure que les sessions s'exécutent.

---

## Structure de la transcription (`*.jsonl`)

Les transcriptions sont gérées par le `SessionManager` de `@mariozechner/pi-coding-agent`.

Le fichier est au format JSONL :

- Première ligne : en-tête de session (`type: "session"`, inclut `id`, `cwd`, `timestamp`, `parentSession` en option)
- Ensuite : entrées de session avec `id` + `parentId` (arborescence)

Types d'entrées notables :

- `message` : messages utilisateur/assistant/toolResult
- `custom_message` : messages injectés par l'extension qui _entrent_ dans le contexte du modèle (peuvent être masqués dans l'interface utilisateur)
- `custom` : état de l'extension qui n'entre _pas_ dans le contexte du modèle
- `compaction` : résumé de compactage persisté avec `firstKeptEntryId` et `tokensBefore`
- `branch_summary` : résumé persisté lors de la navigation dans une branche d'arborescence

OpenClaw ne "corrige" **pas** intentionnellement les transcriptions ; le Gateway utilise `SessionManager` pour les lire/écrire.

---

## Fenêtres de contexte vs jetons suivis

Deux concepts différents sont importants :

1. **Fenêtre de contexte du modèle** : limite stricte par modèle (jetons visibles par le modèle)
2. **Compteurs du magasin de sessions** : statistiques roulantes écrites dans `sessions.json` (utilisés pour /status et les tableaux de bord)

Si vous réglez les limites :

- La fenêtre de contexte provient du catalogue de modèles (et peut être remplacée via la configuration).
- `contextTokens` dans le magasin est une valeur d'estimation/ de rapport à l'exécution ; ne la traitez pas comme une garantie stricte.

Pour plus d'informations, consultez [/token-use](/en/reference/token-use).

---

## Compactage : ce que c'est

La compression résume l'ancienne conversation dans une entrée `compaction` persistée dans la transcription et conserve les messages récents intacts.

Après la compression, les futurs tours voient :

- Le résumé de la compression
- Messages après `firstKeptEntryId`

La compression est **persistante** (contrairement à l'élagage de session). Voir [/concepts/session-pruning](/en/concepts/session-pruning).

---

## Quand la compression automatique se produit (exécution Pi)

Dans l'agent Pi embarqué, la compression automatique se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte → compresser → réessayer.
2. **Maintenance de seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre contextuelle du modèle
- `reserveTokens` est la marge réservée pour les invites (prompts) + la prochaine sortie du modèle

Ce sont les sémantiques d'exécution de Pi (OpenClaw consomme les événements, mais Pi décide quand compresser).

---

## Paramètres de compression (`reserveTokens`, `keepRecentTokens`)

Les paramètres de compression de Pi résident dans les paramètres Pi :

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw applique également un seuil de sécurité minimal pour les exécutions embarquées :

- Si `compaction.reserveTokens < reserveTokensFloor`, OpenClaw l'augmente.
- Le seuil par défaut est `20000` jetons.
- Définissez `agents.defaults.compaction.reserveTokensFloor: 0` pour désactiver le seuil minimal.
- S'il est déjà plus élevé, OpenClaw le laisse tel quel.

Pourquoi : laisser suffisamment de marge pour le « nettoyage » (housekeeping) multi-tours (comme les écritures en mémoire) avant que la compression ne devienne inévitable.

Implémentation : `ensurePiCompactionReserveTokens()` dans `src/agents/pi-settings.ts`
(appelé depuis `src/agents/pi-embedded-runner.ts`).

---

## Surfaces visibles par l'utilisateur

Vous pouvez observer la compression et l'état de la session via :

- `/status` (dans n'importe quelle session de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Mode détaillé : `🧹 Auto-compaction complete` + nombre de compressions

---

## Nettoyage silencieux (`NO_REPLY`)

OpenClaw prend en charge les tours « silencieux » pour les tâches en arrière-plan où l'utilisateur ne doit pas voir la sortie intermédiaire.

Convention :

- L'assistant commence sa sortie par `NO_REPLY` pour indiquer « ne pas livrer de réponse à l'utilisateur ».
- OpenClaw supprime ceci dans la couche de livraison.

Depuis `2026.1.10`, OpenClaw supprime également le **streaming de brouillon/frappe** lorsqu'un partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de sortie partielle en milieu de tour.

---

## Pré-compaction "vidange de la mémoire" (implémenté)

Objectif : avant que l'auto-compaction ne se produise, exécuter un tour agent silencieux qui écrit un état durable sur le disque (par exemple `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) afin que la compaction ne puisse pas effacer le contexte critique.

OpenClaw utilise l'approche de **vidange pré-seuil** :

1. Surveiller l'utilisation du contexte de session.
2. Lorsqu'il dépasse un "seuil souple" (en dessous du seuil de compaction de Pi), exécuter une directive silencieuse "écrire la mémoire maintenant" à l'agent.
3. Utilisez `NO_REPLY` pour que l'utilisateur ne voie rien.

Config (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de vidange)
- `systemPrompt` (invite système supplémentaire ajoutée pour le tour de vidange)

Notes :

- L'invite système par défaut inclut un indice `NO_REPLY` pour supprimer la livraison.
- La vidange s'exécute une fois par cycle de compaction (suivie dans `sessions.json`).
- La vidange ne s'exécute que pour les sessions Pi intégrées (les backends CLI l'ignorent).
- La vidange est ignorée lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Voir [Mémoire](/en/concepts/memory) pour la disposition des fichiers de l'espace de travail et les modèles d'écriture.

Pi expose également un hook `session_before_compact` dans l'API d'extension, mais la logique de vidange d'OpenClaw réside aujourd'hui du côté de la Gateway.

---

## Liste de contrôle de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/en/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Inadéquation entre le magasin et la transcription ? Confirmez l'hôte de la Gateway et le chemin du magasin à partir de `openclaw status`.
- Spam de compaction ? Vérifiez :
  - fenêtre de contexte du modèle (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevés pour la fenêtre du model peuvent entraîner un compactage plus précoce)
  - bloat des résultats de tool : activez/réglez l'élagage de session
- Fuites de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (jeton exact) et que vous êtes sur une version qui inclut le correctif de suppression du streaming.
