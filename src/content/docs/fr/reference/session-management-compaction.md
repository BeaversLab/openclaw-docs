---
summary: "Plongée approfondie : magasin de sessions + transcriptions, cycle de vie et internes de la (auto)compaction"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "Approfondissement de la gestion des sessions"
---

OpenClaw gère les sessions de bout en bout dans ces domaines :

- **Routage de session** (comment les messages entrants sont mappés à une `sessionKey`)
- **Magasin de sessions** (`sessions.json`) et ce qu'il suit
- **Persistance de la transcription** (`*.jsonl`) et sa structure
- **Hygiène de la transcription** (corrections spécifiques au fournisseur avant les exécutions)
- **Limites de contexte** (fenêtre de contexte vs jetons suivis)
- **Compactage** (manuel et automatique) et où accrocher le travail de pré-compactage
- **Ménage silencieux** (écritures en mémoire qui ne doivent pas produire de sortie visible pour l'utilisateur)

Si vous souhaitez d'abord un aperçu de plus haut niveau, commencez par :

- [Gestion des sessions](/fr/concepts/session)
- [Compactage](/fr/concepts/compaction)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche de mémoire](/fr/concepts/memory-search)
- [Élagage de session](/fr/concepts/session-pruning)
- [Hygiène de la transcription](/fr/reference/transcript-hygiene)

---

## Source de vérité : la Gateway

OpenClaw est conçu autour d'un seul processus **Gateway** qui possède l'état de la session.

- Les interfaces utilisateur (application macOS, interface de contrôle web, TUI) doivent interroger la Gateway pour les listes de sessions et les comptes de jetons.
- En mode distant, les fichiers de session se trouvent sur l'hôte distant ; « vérifier vos fichiers Mac locaux » ne reflétera pas ce que la Gateway utilise.

---

## Deux couches de persistance

OpenClaw persiste les sessions sur deux couches :

1. **Magasin de sessions (`sessions.json`)**
   - Carte clé/valeur : `sessionKey -> SessionEntry`
   - Petit, modifiable, sûr à éditer (ou à supprimer des entrées)
   - Suit les métadonnées de session (id de session actuel, dernière activité, bascules, compteurs de jetons, etc.)

2. **Transcription (`<sessionId>.jsonl`)**
   - Transcription en ajout uniquement avec une structure arborescente (les entrées ont `id` + `parentId`)
   - Stocke la conversation réelle + appels d'outils + résumés de compactage
   - Utilisé pour reconstruire le contexte du modèle pour les futurs tours
   - Les gros points de contrôle de débogage pré-compactage sont ignorés une fois que la transcription
     active dépasse la limite de taille du point de contrôle, évitant une deuxième copie
     géante de `.checkpoint.*.jsonl`.

---

## Emplacements sur disque

Par agent, sur l'hôte du Gateway :

- Magasin : `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcriptions : `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sessions de sujet Telegram : `.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw les résout via `src/config/sessions.ts`.

---

## Maintenance du magasin et contrôles disque

La persistance des sessions dispose de contrôles de maintenance automatique (`session.maintenance`) pour `sessions.json` et les artefacts de transcription :

- `mode` : `warn` (par défaut) ou `enforce`
- `pruneAfter` : limite d'ancienneté des entrées obsolètes (par défaut `30d`)
- `maxEntries` : plafond des entrées dans `sessions.json` (par défaut `500`)
- `rotateBytes` : faire une rotation de `sessions.json` lorsqu'il est trop volumineux (par défaut `10mb`)
- `resetArchiveRetention` : rétention pour les archives de transcription `*.reset.<timestamp>` (par défaut : identique à `pruneAfter` ; `false` désactive le nettoyage)
- `maxDiskBytes` : budget facultatif pour le répertoire des sessions
- `highWaterBytes` : cible facultative après nettoyage (par défaut `80%` de `maxDiskBytes`)

Les écritures normales du Gateway effectuent un nettoyage par lots des `maxEntries` pour les plafonds de taille de production, un magasin peut donc brièvement dépasser le plafond configuré avant que le prochain nettoyage de haut niveau ne le réduise. `openclaw sessions cleanup --enforce` applique toujours immédiatement le plafond configuré.

Ordre d'application pour le nettoyage du budget disque (`mode: "enforce"`) :

1. Supprimer d'abord les artefacts de transcription archivés ou orphelins les plus anciens.
2. Si toujours au-dessus de la cible, évincer les entrées de session les plus anciennes et leurs fichiers de transcription.
3. Continuer jusqu'à ce que l'utilisation soit inférieure ou égale à `highWaterBytes`.

Dans `mode: "warn"`, OpenClaw signale les évictions potentielles mais ne modifie pas le magasin/les fichiers.

Exécuter la maintenance à la demande :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sessions Cron et journaux d'exécution

Les exécutions Cron isolées créent également des entrées de session/transcriptions, et elles disposent de contrôles de rétention dédiés :

- `cron.sessionRetention` (par défaut `24h`) nettoie les anciennes sessions de cron isolées du magasin de sessions (`false` désactive).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` nettoient les fichiers `~/.openclaw/cron/runs/<jobId>.jsonl` (défauts : `2_000_000` octets et `2000` lignes).

Lorsque cron force la création d'une nouvelle session isolée, il nettoie l'entrée de session `cron:<jobId>` précédente avant d'écrire la nouvelle ligne. Il conserve les préférences sûres telles que les paramètres thinking/fast/verbose, les étiquettes et les remplacements explicites de modèle/auth sélectionnés par l'utilisateur. Il supprime le contexte de conversation ambiant tel que le routage canal/groupe, la politique d'envoi ou de file d'attente, l'élévation, l'origine et la liaison d'exécution ACP afin qu'une nouvelle exécution isolée ne puisse pas hériter d'une autorisation de livraison ou d'exécution obsolète d'une exécution plus ancienne.

---

## Clés de session (`sessionKey`)

Une `sessionKey` identifie _dans quel compartiment de conversation_ vous êtes (routage + isolation).

Motifs courants :

- Discussion principale/directe (par agent) : `agent:<agentId>:<mainKey>` (par défaut `main`)
- Groupe : `agent:<agentId>:<channel>:group:<id>`
- Salon/canal (Discord/Slack) : `agent:<agentId>:<channel>:channel:<id>` ou `...:room:<id>`
- Cron : `cron:<job.id>`
- Webhook : `hook:<uuid>` (sauf si remplacé)

Les règles canoniques sont documentées sur [/concepts/session](/fr/concepts/session).

---

## Identifiants de session (`sessionId`)

Chaque `sessionKey` pointe vers un `sessionId` actuel (le fichier de transcription qui poursuit la conversation).

Règles empiriques :

- **Réinitialiser** (`/new`, `/reset`) crée un nouveau `sessionId` pour cette `sessionKey`.
- **Réinitialisation quotidienne** (par défaut à 4h00 heure locale sur l'hôte de la passerelle) crée un nouveau `sessionId` lors du prochain message après la limite de réinitialisation.
- **Expiration d'inactivité** (`session.reset.idleMinutes` ou l'ancien `session.idleMinutes`) crée un nouveau `sessionId` lorsqu'un message arrive après la fenêtre d'inactivité. Lorsque les réinitialisations quotidienne et d'inactivité sont toutes deux configurées, la première qui expire l'emporte.
- **Événements système** (heartbeat, réveils cron, notifications d'exécution, tenue de livres de la passerelle) peuvent modifier la ligne de session mais n'étendent pas la fraîcheur de réinitialisation quotidienne/d'inactivité. Le basculement de réinitialisation ignore les notifications d'événements système mises en file d'attente pour la session précédente avant que le nouveau prompt ne soit construit.
- **Garde de fork de thread parent** (`session.parentForkMaxTokens`, défaut `100000`) ignore le fork du transcript parent lorsque la session parente est déjà trop volumineuse ; le nouveau thread recommence à zéro. Définissez `0` pour désactiver.

Détail d'implémentation : la décision a lieu dans `initSessionState()` dans `src/auto-reply/reply/session.ts`.

---

## Schéma du magasin de sessions (`sessions.json`)

Le type de valeur du magasin est `SessionEntry` dans `src/config/sessions.ts`.

Champs clés (non exhaustifs) :

- `sessionId` : id de transcript actuel (le nom de fichier est dérivé de celui-ci sauf si `sessionFile` est défini)
- `sessionStartedAt` : horodatage de début pour la `sessionId` actuelle ; la fraîcheur de
  réinitialisation quotidienne utilise ceci. Les lignes anciennes peuvent le dériver de l'en-tête de session JSONL.
- `lastInteractionAt` : horodatage de la dernière interaction réelle utilisateur/canal ; la fraîcheur de
  réinitialisation d'inactivité utilise ceci pour que les événements heartbeat, cron et exec ne gardent pas les sessions
  en vie. Les lignes anciennes sans ce champ se rabattent sur l'heure de début de session récupérée
  pour la fraîcheur d'inactivité.
- `updatedAt` : horodatage de la dernière mutation de la ligne de magasin, utilisé pour le listage, l'élagage et la
  tenue de livres. Ce n'est pas l'autorité pour la fraîcheur de réinitialisation quotidienne/d'inactivité.
- `sessionFile` : option de remplacement explicite du chemin de transcript
- `chatType` : `direct | group | room` (aide les interfaces utilisateur et la politique d'envoi)
- `provider`, `subject`, `room`, `space`, `displayName` : métadonnées pour l'étiquetage de groupe/canal
- Interrupteurs :
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (remplacement par session)
- Sélection du modèle :
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Compteurs de jetons (au mieux / dépendant du fournisseur) :
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount` : fréquence à laquelle l'auto-compaction s'est terminée pour cette clé de session
- `memoryFlushAt` : horodatage de la dernière purge de mémoire pré-compaction
- `memoryFlushCompactionCount` : nombre de compactages au moment de la dernière exécution de la purge

Le magasin peut être modifié en toute sécurité, mais le Gateway fait autorité : il peut réécrire ou réhydrater les entrées au fur et à mesure que les sessions s'exécutent.

---

## Structure de la transcription (`*.jsonl`)

Les transcriptions sont gérées par `@mariozechner/pi-coding-agent`’s `SessionManager`.

Le fichier est au format JSONL :

- Première ligne : en-tête de session (`type: "session"`, inclut `id`, `cwd`, `timestamp`, optionnel `parentSession`)
- Ensuite : entrées de session avec `id` + `parentId` (arborescence)

Types d'entrées notables :

- `message` : messages utilisateur/assistant/toolResult
- `custom_message` : messages injectés par l'extension qui _entrent_ dans le contexte du modèle (peuvent être masqués dans l'interface utilisateur)
- `custom` : état de l'extension qui n'_entre pas_ dans le contexte du modèle
- `compaction` : résumé de compactage persistant avec `firstKeptEntryId` et `tokensBefore`
- `branch_summary` : résumé persistant lors de la navigation dans une branche d'arborescence

OpenClaw ne "corrige" volontairement **pas** les transcriptions ; le Gateway utilise `SessionManager` pour les lire et les écrire.

---

## Fenêtres de contexte vs jetons suivis

Deux concepts différents sont importants :

1. **Fenêtre de contexte du modèle** : limite stricte par modèle (jetons visibles par le modèle)
2. **Compteurs du magasin de sessions** : statistiques roulantes écrites dans `sessions.json` (utilisées pour /status et les tableaux de bord)

Si vous ajustez les limites :

- La fenêtre de contexte provient du catalogue de modèles (et peut être remplacée via la configuration).
- `contextTokens` dans le magasin est une valeur d'estimation/rapport lors de l'exécution ; ne la traitez pas comme une garantie stricte.

Pour plus d'informations, consultez [/token-use](/fr/reference/token-use).

---

## Compactage : ce que c'est

Le compactage résume l'ancienne conversation dans une entrée persistante `compaction` de la transcription et garde les messages récents intacts.

Après compactage, les futurs tours voient :

- Le résumé du compactage
- Les messages après `firstKeptEntryId`

Le compactage est **persistant** (contrairement à l'élagage de session). Consultez [/concepts/session-pruning](/fr/concepts/session-pruning).

## Limites des blocs de compactage et appariement des outils

Lorsque OpenClaw divise une longue transcription en blocs de compactage, il conserve les appels d'outils de l'assistant associés à leurs entrées `toolResult` correspondantes.

- Si la division par partage de jetons tombe entre un appel d'outil et son résultat, OpenClaw déplace la limite vers le message d'appel d'outil de l'assistant au lieu de séparer la paire.
- Si un bloc de résultat d'outil de fin pousserait autrement le bloc au-delà de la cible, OpenClaw préserve ce bloc d'outil en attente et garde la queue non résumée intacte.
- Les blocs d'appels d'outil abandonnés/erreur ne maintiennent pas une division en attente ouverte.

---

## Moment où le compactage automatique se produit (environnement d'exécution Pi)

Dans l'agent Pi intégré, le compactage automatique se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, et variantes similaires propres aux fournisseurs) → compacter → réessayer.
2. **Maintenance de seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre de contexte du modèle
- `reserveTokens` est la marge réservée pour les invites + la prochaine sortie du modèle

Il s'agit de la sémantique d'exécution de Pi (OpenClaw consomme les événements, mais Pi décide quand compacter).

OpenClaw peut également déclencher une compactage local préliminaire avant d'ouvrir la prochaine exécution lorsque `agents.defaults.compaction.maxActiveTranscriptBytes` est défini et que le fichier de transcription actif atteint cette taille. Il s'agit d'une garde de taille de fichier pour le coût de réouverture local, et non d'archivage brut : OpenClaw exécute toujours la compactage sémantique normal, et cela nécessite `truncateAfterCompaction` pour que le résumé compacté puisse devenir une nouvelle transcription de successeur.

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
- Le `/compact` manuel respecte un `agents.defaults.compaction.keepRecentTokens` explicite et conserve le point de coupe de la queue récente de Pi. Sans un budget de conservation explicite, la compactage manuelle reste un point de contrôle strict et le contexte reconstruit commence à partir du nouveau résumé.
- Définissez `agents.defaults.compaction.maxActiveTranscriptBytes` sur une valeur en octets ou une chaîne telle que `"20mb"` pour exécuter la compactage locale avant un tour lorsque la transcription active devient volumineuse. Cette garde n'est active que lorsque `truncateAfterCompaction` est également activé. Laissez-le non défini ou définissez `0` pour désactiver.
- Lorsque `agents.defaults.compaction.truncateAfterCompaction` est activé, OpenClaw fait pivoter la transcription active vers un fichier JSONL successeur compacté après la compactage. L'ancienne transcription complète reste archivée et liée depuis le point de contrôle de compactage au lieu d'être réécrite sur place.

Pourquoi : laisser suffisamment de marge pour le « nettoyage » multi-tours (comme les écritures mémoire) avant que la compactage ne devienne inévitable.

Implémentation : `ensurePiCompactionReserveTokens()` dans `src/agents/pi-settings.ts` (appelé depuis `src/agents/pi-embedded-runner.ts`).

---

## Fournisseurs de compactage enfichables

Les plugins peuvent enregistrer un provider de compactage via `registerCompactionProvider()` sur l'API du plugin. Lorsque `agents.defaults.compaction.provider` est défini sur un id de provider enregistré, l'extension de sécurité délègue le résumé à ce provider au lieu du pipeline `summarizeInStages` intégré.

- `provider` : id d'un plugin provider de compactage enregistré. Laisser vide pour le résumé par défaut via LLM.
- Définir un `provider` force `mode: "safeguard"`.
- Les providers reçoivent les mêmes instructions de compactage et la même politique de préservation des identifiants que le chemin intégré.
- L'extension de sécurité préserve toujours le contexte des tours récents et des suffixes de tours fractionnés après la sortie du provider.
- Le résumé de sécurité intégré re-distille les résumés précédents avec de nouveaux messages
  au lieu de préserver l'intégralité du résumé précédent mot pour mot.
- Le mode sécurité active les audits de qualité de résumé par défaut ; définissez
  `qualityGuard.enabled: false` pour ignorer le comportement de nouvelle tentative en cas de sortie malformée.
- Si le provider échoue ou renvoie un résultat vide, OpenClaw revient automatiquement au résumé LLM intégré.
- Les signaux d'abort/timeout sont relancés (non avalés) pour respecter l'annulation de l'appelant.

Source : `src/plugins/compaction-provider.ts`, `src/agents/pi-hooks/compaction-safeguard.ts`.

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

- L'assistant commence sa sortie par le jeton silencieux exact `NO_REPLY` /
  `no_reply` pour indiquer « ne pas envoyer de réponse à l'utilisateur ».
- OpenClaw supprime/empêche cela dans la couche de livraison.
- La suppression exacte des jetons silencieux est insensible à la casse, donc `NO_REPLY` et
  `no_reply` comptent tous les deux lorsque la charge utile entière est seulement le jeton silencieux.
- Ceci est uniquement pour les tours d'arrière-plan véritable/sans livraison ; ce n'est pas un raccourci pour
  les demandes utilisateur ordinaires pouvant faire l'objet d'une action.

Depuis `2026.1.10`, OpenClaw supprime également le **streaming de brouillon/frappe** lorsqu'un
morceau partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de
sortie partielle en cours de tour.

---

## Pré-compaction « vidage de mémoire » (implémenté)

Objectif : avant que l'auto-compaction ne se produise, exécuter un tour agentique silencieux qui écrit l'état
durable sur le disque (par ex. `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) afin que la compaction ne puisse pas
effacer le contexte critique.

OpenClaw utilise l'approche du **vidage avant seuil** :

1. Surveiller l'utilisation du contexte de session.
2. Lorsqu'il dépasse un « seuil souple » (en dessous du seuil de compaction de Pi), envoyer une directive silencieuse
   « écrire la mémoire maintenant » à l'agent.
3. Utiliser le jeton silencieux exact `NO_REPLY` / `no_reply` pour que l'utilisateur ne voie
   rien.

Config (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de vidage)
- `systemPrompt` (invite système supplémentaire ajoutée pour le tour de vidage)

Notes :

- L'invite système par défaut inclut un indice `NO_REPLY` pour supprimer
  la livraison.
- Le vidage s'exécute une fois par cycle de compaction (suivi dans `sessions.json`).
- Le vidage ne s'exécute que pour les sessions Pi intégrées (les backends CLI l'ignorent).
- Le vidage est ignoré lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Voir [Mémoire](/fr/concepts/memory) pour la disposition des fichiers de l'espace de travail et les modèles d'écriture.

Pi expose également un hook `session_before_compact` dans l'API d'extension, mais la logique de
vidage d'OpenClaw réside aujourd'hui du côté de la Gateway.

---

## Liste de vérification de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/fr/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Inadéquation entre le store et la transcription ? Confirmez l'hôte de la Gateway et le chemin du store à partir de `openclaw status`.
- Spam de compaction ? Vérifiez :
  - fenêtre de contexte du model (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevés pour la fenêtre du model peuvent provoquer un compactage plus précoce)
  - gonflement des résultats d'outils : activez/réglez le nettoyage de session
- Fuites de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (jeton exact insensible à la casse) et que vous utilisez une version incluant le correctif de suppression du streaming.

## Connexe

- [Gestion de session](/fr/concepts/session)
- [Nettoyage de session](/fr/concepts/session-pruning)
- [Moteur de contexte](/fr/concepts/context-engine)
