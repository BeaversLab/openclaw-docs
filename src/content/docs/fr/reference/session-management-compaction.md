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
- [/concepts/memory](/fr/concepts/memory)
- [/concepts/memory-search](/fr/concepts/memory-search)
- [/concepts/session-pruning](/fr/concepts/session-pruning)
- [/reference/transcript-hygiene](/fr/reference/transcript-hygiene)

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

Les règles canoniques sont documentées sur [/concepts/session](/fr/concepts/session).

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

Pour plus d'informations, voir [/token-use](/fr/reference/token-use).

---

## Compactage : ce que c'est

La compression résume l'ancienne conversation dans une entrée `compaction` persistée dans la transcription et conserve les messages récents intacts.

Après la compression, les futurs tours voient :

- Le résumé de la compression
- Messages après `firstKeptEntryId`

La compaction est **persistante** (contrairement à l'élagage de session). Voir [/concepts/session-pruning](/fr/concepts/session-pruning).

## Limites des blocs de compression et appariement des outils

Lorsque OpenClaw divise un long transcript en blocs de compression, il conserve
les appels d'outil de l'assistant associés à leurs entrées `toolResult` correspondantes.

- Si la division par part de jetons se situe entre un appel d'outil et son résultat, OpenClaw
  déplace la limite vers le message d'appel d'outil de l'assistant au lieu de séparer
  la paire.
- Si un bloc de résultat d'outil à la traîne devait autrement pousser le bloc au-delà de la cible,
  OpenClaw préserve ce bloc d'outil en attente et garde la queue non résumée
  intacte.
- Les blocs d'appels d'outil avortés/erreur ne maintiennent pas une division en attente ouverte.

---

## Lorsque la compression automatique se produit (runtime Pi)

Dans l'agent Pi intégré, la compression automatique se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, et variantes similaires de forme fournisseur) → compacter → réessayer.
2. **Maintenance de seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre de contexte du modèle
- `reserveTokens` est la marge réservée pour les invites + la prochaine sortie du modèle

Ce sont les sémantiques du runtime Pi (OpenClaw consomme les événements, mais Pi décide quand compacter).

---

## Paramètres de compactage (`reserveTokens`, `keepRecentTokens`)

Les paramètres de compactage de Pi se trouvent dans les paramètres de Pi :

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

Pourquoi : laisser suffisamment de marge pour le « nettoyage » (housekeeping) multi-tours (comme les écritures en mémoire) avant que le compactage ne devienne inévitable.

Implémentation : `ensurePiCompactionReserveTokens()` dans `src/agents/pi-settings.ts`
(appelé depuis `src/agents/pi-embedded-runner.ts`).

---

## Fournisseurs de compaction enfichables

Les plugins peuvent enregistrer un fournisseur de compaction via `registerCompactionProvider()` sur l'API du plugin. Lorsque `agents.defaults.compaction.provider` est défini sur un id de fournisseur enregistré, l'extension de sécurité délègue le résumé à ce fournisseur au lieu du pipeline intégré `summarizeInStages`.

- `provider` : id d'un plugin fournisseur de compaction enregistré. Laisser non défini pour le résumé LLM par défaut.
- Définir un `provider` force `mode: "safeguard"`.
- Les fournisseurs reçoivent les mêmes instructions de compaction et la même politique de préservation des identifiants que le chemin intégré.
- Le garde-fou préserve toujours le contexte de suffixe des tours récents et des tours fractionnés après la sortie du fournisseur.
- Si le fournisseur échoue ou renvoie un résultat vide, OpenClaw revient automatiquement au résumé LLM intégré.
- Les signaux d'abort/d'expiration sont relancés (non ignorés) pour respecter l'annulation de l'appelant.

Source : `src/plugins/compaction-provider.ts`, `src/agents/pi-hooks/compaction-safeguard.ts`.

---

## Surfaces visibles par l'utilisateur

Vous pouvez observer la compaction et l'état de la session via :

- `/status` (dans n'importe quelle session de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Mode verbeux : `🧹 Auto-compaction complete` + nombre de compactages

---

## Maintenance silencieuse (`NO_REPLY`)

OpenClaw prend en charge les tours « silencieux » pour les tâches d'arrière-plan où l'utilisateur ne doit pas voir la sortie intermédiaire.

Convention :

- L'assistant commence sa sortie par le jeton silencieux exact `NO_REPLY` /
  `no_reply` pour indiquer « ne pas envoyer de réponse à l'utilisateur ».
- OpenClaw supprime/empêche cela dans la couche de livraison.
- La suppression exacte du jeton silencieux ne tient pas compte de la casse, donc `NO_REPLY` et
  `no_reply` comptent tous les deux lorsque la charge utile entière est juste le jeton silencieux.
- Ceci est uniquement pour les tours réels en arrière-plan/sans livraison ; ce n'est pas un raccourci pour
  les demandes utilisateur actionnables ordinaires.

Depuis `2026.1.10`, OpenClaw supprime également le **streaming de brouillon/frappe** lorsqu'un
bloc partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de sortie
partielle en cours de tour.

---

## « Vidange de mémoire » de pré-compaction (implémentée)

Objectif : avant que la auto-compaction ne se produise, exécuter un tour agent silencieux qui écrit l'état
durable sur le disque (par exemple `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) afin que la compaction ne puisse pas
effacer le contexte critique.

OpenClaw utilise l'approche de « vidange avant seuil » :

1. Surveiller l'utilisation du contexte de session.
2. Lorsqu'il franchit un « seuil souple » (en dessous du seuil de compaction de Pi), exécuter une directive
   silencieuse « écrire la mémoire maintenant » à l'agent.
3. Utiliser le jeton silencieux exact `NO_REPLY` / `no_reply` afin que l'utilisateur ne voie
   rien.

Config (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de vidange)
- `systemPrompt` (invite système supplémentaire ajoutée pour le tour de vidange)

Notes :

- L'invite système par défaut inclut un indice `NO_REPLY` pour supprimer
  la livraison.
- La vidange s'exécute une fois par cycle de compaction (suivi dans `sessions.json`).
- La vidange ne s'exécute que pour les sessions Pi intégrées (les backends CLI l'ignorent).
- La vidange est ignorée lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Voir [Mémoire](/fr/concepts/memory) pour la disposition des fichiers et les modèles d'écriture de l'espace de travail.

Pi expose également un hook `session_before_compact` dans l'API d'extension, mais la logique de vidage d'OpenClaw réside aujourd'hui du côté de la Gateway.

---

## Liste de contrôle de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/fr/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Incohérence entre le magasin et la transcription ? Confirmez l'hôte de la Gateway et le chemin du magasin à partir de `openclaw status`.
- Spam de compactage ? Vérifiez :
  - fenêtre contextuelle du modèle (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevé pour la fenêtre du modèle peut provoquer un compactage plus précoce)
  - gonflement des résultats d'outils : activez/réglez l'élagage de session
- Fuite de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (jeton exact insensible à la casse) et que vous êtes sur une version qui inclut la correction de la suppression du flux.
