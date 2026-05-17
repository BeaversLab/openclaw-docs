---
summary: "Plongée approfondie : magasin de sessions + transcriptions, cycle de vie et internes de la (auto)compaction"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding "pre-compaction" housekeeping
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

- [Gestion de session](/fr/concepts/session)
- [Compaction](/fr/concepts/compaction)
- [Vue d'ensemble de la mémoire](/fr/concepts/memory)
- [Recherche en mémoire](/fr/concepts/memory-search)
- [Élagage de session](/fr/concepts/session-pruning)
- [Hygiène de la transcription](/fr/reference/transcript-hygiene)

---

## Source de vérité : la Gateway

OpenClaw est conçu autour d'un seul processus **Gateway** qui possède l'état de la session.

- Les interfaces utilisateur (application macOS, interface de contrôle web, TUI) doivent interroger la Gateway pour les listes de sessions et les comptes de jetons.
- En mode distant, les fichiers de session se trouvent sur l'hôte distant ; « vérifier vos fichiers Mac locaux » ne reflétera pas ce que le Gateway utilise.

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

Les lecteurs d'historique du Gateway doivent éviter de matérialiser la transcription entière, sauf si la surface a explicitement besoin d'un accès historique arbitraire. L'historique de la première page, l'historique de chat intégré, la récupération après redémarrage et les vérifications de jetons/d'utilisation utilisent des lectures de queue limitées. Les analyses complètes de transcription passent par l'index de transcription asynchrone, qui est mis en cache par chemin de fichier plus `mtimeMs`/`size` et partagé entre les lecteurs concurrents.

---

## Emplacements sur disque

Par agent, sur l'hôte du Gateway :

- Store : `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcriptions : `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Sessions de sujet Telegram : `.../<sessionId>-topic-<threadId>.jsonl`

Le OpenClaw les résout via `src/config/sessions.ts`.

---

## Maintenance du store et contrôles disque

La persistance de session dispose de contrôles de maintenance automatique (`session.maintenance`) pour `sessions.json`, les artefacts de transcription et les sidecars de trajectoire :

- `mode` : `warn` (par défaut) ou `enforce`
- `pruneAfter` : limite d'âge des entrées obsolètes (par défaut `30d`)
- `maxEntries` : plafonner les entrées dans `sessions.json` (par défaut `500`)
- `resetArchiveRetention` : rétention pour les archives de transcriptions `*.reset.<timestamp>` (par défaut : identique à `pruneAfter` ; `false` désactive le nettoyage)
- `maxDiskBytes` : budget optionnel pour le répertoire de sessions
- `highWaterBytes` : cible optionnelle après nettoyage (par défaut `80%` de `maxDiskBytes`)

Les écritures normales du Gateway passent par un enregistreur de session par magasin qui sérialise les mutations en cours de processus sans prendre de verrou de fichier au moment de l'exécution. Les assistants de correctif sur le chemin critique empruntent le cache mutable validé pendant qu'ils occupent cet emplacement d'enregistreur, de sorte que les fichiers volumineux Gateway`sessions.json` ne sont pas clonés ni relus pour chaque mise à jour des métadonnées. Le code d'exécution doit préférer `updateSessionStore(...)` ou `updateSessionStoreEntry(...)`Gateway ; les enregistrements directs de l'ensemble du magasin sont des outils de compatibilité et de maintenance hors ligne. Lorsqu'un Gateway est accessible, les exécutions non simulées (non-dry-run) de `openclaw sessions cleanup` et `openclaw agents delete`Gateway délèguent les mutations du magasin au Gateway afin que le nettoyage rejoigne la même file d'attente d'enregistreurs ; `--store <path>` est le chemin de réparation hors ligne explicite pour la maintenance directe des fichiers. Le nettoyage `maxEntries`Gateway est toujours traité par lots pour les limites de taille de production, de sorte qu'un magasin peut brièvement dépasser la limite configurée avant que le prochain nettoyage de niveau haut (high-water) ne le réécrive à la baisse. Les lectures du magasin de sessions ne suppriment pas (prune) ni ne limitent (cap) les entrées pendant le démarrage du Gateway ; utilisez les écritures ou `openclaw sessions cleanup --enforce` pour le nettoyage. `openclaw sessions cleanup --enforce` applique toujours immédiatement la limite configurée et supprime les anciens artefacts de transcription, de point de contrôle et de trajectoire non référencés, même si aucun budget disque n'est configuré.

La maintenance conserve les pointeurs de conversation externes durables tels que les sessions de groupe et les sessions de chat délimitées par thread, mais les entrées d'exécution synthétiques pour cron, hooks, heartbeat, ACP et sous-agents peuvent toujours être supprimées lorsqu'elles dépassent l'âge, le nombre ou le budget disque configurés.

OpenClaw ne crée plus de sauvegardes automatiques par rotation OpenClaw`sessions.json.bak.*`Gateway pendant les écritures du Gateway. La clé héritée `session.maintenance.rotateBytes` est ignorée et `openclaw doctor --fix` la supprime des anciennes configurations.

Les mutations de transcript utilisent un verrou d'écriture de session sur le fichier de transcript. L'acquisition du verrou attend jusqu'à `session.writeLock.acquireTimeoutMs` avant de signaler une erreur de session occupée ; la valeur par défaut est `60000` ms. N'augmentez cette valeur que lorsque des tâches légitimes de préparation, de nettoyage, de compactage ou de miroir de transcript entrent en conflit plus longtemps sur des machines lentes. La détection de verrous périmés et les avertissements de rétention maximale restent des politiques distinctes.

Ordre d'application pour le nettoyage du budget disque (`mode: "enforce"`) :

1. Supprimer d'abord les artefacts de transcript orphelins ou de trajectoire orpheline archivés les plus anciens.
2. Si toujours au-dessus de la cible, expulser les entrées de session les plus anciennes et leurs fichiers de transcript/trajectoire.
3. Continuer jusqu'à ce que l'utilisation soit inférieure ou égale à `highWaterBytes`.

En `mode: "warn"`OpenClaw, OpenClaw signale les expulsions potentielles mais ne mute pas le magasin/les fichiers.

Exécuter la maintenance à la demande :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sessions Cron et journaux d'exécution

Les exécutions cron isolées créent également des entrées de session/transcripts, et elles disposent de contrôles de rétention dédiés :

- `cron.sessionRetention` (par défaut `24h`) supprime les anciennes sessions d'exécution cron isolées du magasin de sessions (`false` désactive).
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` suppriment les fichiers `~/.openclaw/cron/runs/<jobId>.jsonl` (par défaut : `2_000_000` octets et `2000` lignes).

Lorsque cron force la création d'une nouvelle session d'exécution isolée, il nettoie l'entrée de session `cron:<jobId>` précédente avant d'écrire la nouvelle ligne. Il conserve les préférences sûres telles que les paramètres de réflexion/rapide/verbose, les étiquettes et les substitutions explicites de modèle/auth sélectionnées par l'utilisateur. Il supprime le contexte de conversation ambiant tel que le routage channel/groupe, la stratégie d'envoi ou de file d'attente, l'élévation, l'origine et la liaison d'exécution ACP, afin qu'une nouvelle exécution isolée ne puisse pas hériter d'une autorité de livraison ou d'exécution obsolète d'une exécution plus ancienne.

---

## Clés de session (`sessionKey`)

Un `sessionKey` identifie _dans quel compartiment de conversation_ vous vous trouvez (routage + isolation).

Modèles courants :

- Chat principal/direct (par agent) : `agent:<agentId>:<mainKey>` (par défaut `main`)
- Groupe : `agent:<agentId>:<channel>:group:<id>`
- Salon/channel (Discord/Slack) : `agent:<agentId>:<channel>:channel:<id>` ou `...:room:<id>`
- Cron : `cron:<job.id>`
- Webhook : `hook:<uuid>` (sauf s'il est remplacé)

Les règles canoniques sont documentées sur [/concepts/session](/fr/concepts/session).

---

## Session ids (`sessionId`)

Chaque `sessionKey` pointe vers un `sessionId` actuel (le fichier de transcription qui poursuit la conversation).

Règles empiriques :

- **Reset** (`/new`, `/reset`) crée un nouveau `sessionId` pour ce `sessionKey`.
- **Daily reset** (par défaut 4h00 heure locale sur l'hôte de la passerelle) crée un nouveau `sessionId` sur le message suivant après la limite de réinitialisation.
- **Idle expiry** (`session.reset.idleMinutes` ou ancien `session.idleMinutes`) crée un nouveau `sessionId` lorsqu'un message arrive après la fenêtre d'inactivité. Lorsque les réinitialisations quotidienne et par inactivité sont configurées, la première à expirer l'emporte.
- **System events** (heartbeat, réveils cron, notifications d'exécution, maintenance de la passerelle) peuvent modifier la ligne de session mais n'étendent pas la fraîcheur de la réinitialisation quotidienne/inactive. Le basculement de réinitialisation ignore les avis d'événements système mis en file d'attente pour la session précédente avant la construction du nouveau prompt.
- **Parent fork policy** utilise la branche active du PI lors de la création d'un fil ou d'un fork de sous-agent. Si cette branche est trop volumineuse, OpenClaw lance l'enfant avec un contexte isolé au lieu d'échouer ou d'hériter d'un historique inutilisable. La politique de dimensionnement est automatique ; l'ancienne configuration `session.parentForkMaxTokens` est supprimée par `openclaw doctor --fix`.

Détail d'implémentation : la décision a lieu dans `initSessionState()` dans `src/auto-reply/reply/session.ts`.

---

## Session store schema (`sessions.json`)

Le type de valeur du magasin est `SessionEntry` dans `src/config/sessions.ts`.

Champs clés (non exhaustifs) :

- `sessionId` : id de transcription actuel (le nom de fichier est dérivé de celui-ci sauf si `sessionFile` est défini)
- `sessionStartedAt` : horodatage de début pour le `sessionId` actuel ; la fraîcheur de la réinitialisation journalière utilise ceci. Les lignes héritées peuvent le dériver de l'en-tête de session JSONL.
- `lastInteractionAt` : horodatage de la dernière véritable interaction utilisateur/channel ; la fraîcheur de la réinitialisation inactive utilise ceci, de sorte que les événements de heartbeat, cron et exec ne gardent pas les sessions en vie. Les lignes héritées sans ce champ reviennent à l'heure de début de session récupérée pour la fraîcheur inactive.
- `updatedAt` : horodatage de la dernière mutation de ligne de magasin, utilisé pour le listing, l'élagage et la tenue de livres. Ce n'est pas l'autorité pour la fraîcheur de réinitialisation journalière/inactive.
- `sessionFile` : remplacement explicite facultatif du chemin de la transcription
- `chatType` : `direct | group | room` (aide les UI et la politique d'envoi)
- `provider`, `subject`, `room`, `space`, `displayName` : métadonnées pour l'étiquetage de groupe/channel
- Bascules :
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (remplacement par session)
- Sélection du modèle :
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Compteurs de jetons (meilleur effort / dépendant du provider) :
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount` : fréquence à laquelle la auto-compaction s'est terminée pour cette clé de session
- `memoryFlushAt` : horodatage de la dernière purge de mémoire pré-compaction
- `memoryFlushCompactionCount` : nombre de compactages lors de l'exécution de la dernière purge

Le magasin peut être édité en toute sécurité, mais le Gateway fait autorité : il peut réécrire ou réhydrater les entrées au fur et à mesure que les sessions s'exécutent.

---

## Structure de la transcription (`*.jsonl`)

Les transcriptions sont gérées par `@earendil-works/pi-coding-agent`'s `SessionManager`.

Le fichier est un JSONL :

- Première ligne : en-tête de session (`type: "session"`, inclut `id`, `cwd`, `timestamp`, `parentSession` en option)
- Ensuite : entrées de session avec `id` + `parentId` (arbre)

Types d'entrées notables :

- `message` : messages utilisateur/assistant/toolResult
- `custom_message` : messages injectés par l'extension qui _entrent_ dans le contexte du modèle (peuvent être masqués de l'interface utilisateur)
- `custom` : état de l'extension qui n'entre _pas_ dans le contexte du modèle
- `compaction` : résumé de compactage persistant avec `firstKeptEntryId` et `tokensBefore`
- `branch_summary` : résumé persistant lors de la navigation dans une branche d'arbre

OpenClaw ne "corrige" volontairement pas les transcriptions ; le Gateway utilise `SessionManager` pour les lire/écrire.

---

## Fenêtres de contexte vs jetons suivis

Deux concepts différents comptent :

1. **Fenêtre de contexte du modèle** : limite stricte par modèle (jetons visibles par le modèle)
2. **Compteurs du magasin de session** : statistiques déroulantes écrites dans `sessions.json` (utilisés pour /status et les tableaux de bord)

Si vous ajustez les limites :

- La fenêtre de contexte provient du catalogue de modèles (et peut être remplacée via la configuration).
- `contextTokens` dans le magasin est une valeur d'estimation/rapport d'exécution ; ne la traitez pas comme une garantie stricte.

Pour plus d'informations, voir [/token-use](/fr/reference/token-use).

---

## Compactage : ce que c'est

Le compactage résume l'ancienne conversation dans une entrée `compaction` persistante de la transcription et garde les messages récents intacts.

Après le compactage, les futurs tours voient :

- Le résumé de compactage
- Les messages après `firstKeptEntryId`

La compaction est **persistante** (contrairement à l'élagage de session). Voir [/concepts/session-pruning](/fr/concepts/session-pruning).

## Limites des blocs de compactage et appariement d'outils

Lorsque OpenClaw divise une longue transcription en blocs de compactage, il conserve
les appels d'outils de l'assistant appariés avec leurs entrées `toolResult` correspondantes.

- Si la division du partage de jetons tombe entre un appel d'outil et son résultat, OpenClaw
  déplace la limite vers le message d'appel d'outil de l'assistant au lieu de séparer
  la paire.
- Si un bloc de résultat d'outil à la traîne devait autrement pousser le chunk au-delà de la cible,
  OpenClaw préserve ce bloc d'outil en attente et garde la queue non résumée
  intacte.
- Les blocs d'appel d'outil abandonnés/erroqués ne maintiennent pas une division en attente ouverte.

---

## Lorsque l'auto-compaction se produit (exécution Pi)

Dans l'agent Pi embarqué, l'auto-compaction se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `ollama error: context length
exceeded`, et variantes similaires de forme fournisseur) → compacter → réessayer.
2. **Maintenance du seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre de contexte du modèle
- `reserveTokens` est la marge réservée pour les invites + la prochaine sortie du modèle

Ce sont là les sémantiques d'exécution Pi (OpenClaw consomme les événements, mais Pi décide quand compacter).

OpenClaw peut également déclencher une compactage local préalable avant d'ouvrir la prochaine
exécution lorsque `agents.defaults.compaction.maxActiveTranscriptBytes` est défini et que le
fichier de transcription actif atteint cette taille. Il s'agit d'une garde de taille de fichier pour le
coût de réouverture local, et non d'archivage brut : OpenClaw exécute toujours la compactage sémantique normale,
et il nécessite `truncateAfterCompaction` pour que le résumé compacté puisse devenir une
nouvelle transcription de successeur.

Pour les exécutions Pi intégrées, `agents.defaults.compaction.midTurnPrecheck.enabled: true`OpenClaw
ajoute une garde de boucle d'outils facultative. Après l'ajout d'un résultat d'outil et avant l'appel
suivant au model, OpenClaw estime la pression sur le prompt en utilisant la même logique de budget
préliminaire utilisée au début du tour. Si le contexte ne tient plus, la garde ne
compacte pas à l'intérieur du hook `transformContext` de Pi. Elle lève un signal
structuré de prévérification en cours de tour, arrête la soumission du prompt actuel, et permet à la
boucle d'exécution externe d'utiliser le chemin de récupération existant : tronquer les résultats d'outils trop volumineux
lorsque cela suffit, ou déclencher le mode de compactage configuré et réessayer. L'option
est désactivée par défaut et fonctionne avec les modes de compactage `default` et `safeguard`
, y compris le compactage de sauvegarde soutenu par le provider.
Ceci est indépendant de `maxActiveTranscriptBytes` : la garde de taille en octets s'exécute
avant l'ouverture d'un tour, tandis que la prévérification en cours de tour s'exécute plus tard dans la boucle d'outils Pi intégrée
après l'ajout de nouveaux résultats d'outils.

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

- Si `compaction.reserveTokens < reserveTokensFloor`OpenClaw, OpenClaw l'augmente.
- Le plancher par défaut est `20000` jetons.
- Définissez `agents.defaults.compaction.reserveTokensFloor: 0` pour désactiver le plancher.
- S'il est déjà plus élevé, OpenClaw le laisse tel quel.
- Le `/compact` manuel respecte un `agents.defaults.compaction.keepRecentTokens`
  explicite et conserve le point de coupure de la fin récente de Pi. Sans un budget de conservation explicite,
  le compactage manuel reste un point de contrôle strict et le contexte reconstruit commence à partir
  du nouveau résumé.
- Définissez `agents.defaults.compaction.midTurnPrecheck.enabled: true` pour exécuter la
  prévérification facultative de la boucle d'outils après les nouveaux résultats d'outils et avant l'appel au model
  suivant. Il ne s'agit que d'un déclencheur ; la génération de résumé utilise toujours le chemin de
  compactage configuré. Elle est indépendante de `maxActiveTranscriptBytes`, qui est une
  garde de taille en octets de la transcription active en début de tour.
- Définissez `agents.defaults.compaction.maxActiveTranscriptBytes` sur une valeur en octets ou
  une chaîne telle que `"20mb"` pour exécuter une compaction locale avant un tour lorsque la transcription
  active devient volumineuse. Cette garde n'est active que lorsque
  `truncateAfterCompaction` est également activé. Laissez-le non défini ou définissez `0` pour
  désactiver.
- Lorsque `agents.defaults.compaction.truncateAfterCompaction`OpenClaw est activé,
  OpenClaw fait passer la transcription active à un JSONL successeur compacté après
  la compaction. L'ancienne transcription complète reste archivée et liée à partir du
  point de contrôle de compaction au lieu d'être réécrite sur place.

Pourquoi : laisser suffisamment de marge pour la « maintenance » multi-tours (comme les écritures en mémoire) avant que la compaction ne devienne inévitable.

Implémentation : `ensurePiCompactionReserveTokens()` dans `src/agents/pi-settings.ts`
(appelé depuis `src/agents/pi-embedded-runner.ts`).

---

## Fournisseurs de compaction enfichables

Les plugins peuvent enregistrer un fournisseur de compaction via `registerCompactionProvider()`API sur l'API de plugin. Lorsque `agents.defaults.compaction.provider` est défini sur un id de fournisseur enregistré, l'extension de sécurité délègue la synthèse à ce fournisseur au lieu du pipeline intégré `summarizeInStages`.

- `provider`LLM : id d'un plugin fournisseur de compaction enregistré. Laissez non défini pour la synthèse LLM par défaut.
- Définir un `provider` force `mode: "safeguard"`.
- Les fournisseurs reçoivent les mêmes instructions de compaction et la même politique de préservation des identifiants que le chemin intégré.
- La sécurité préserve toujours le contexte du suffixe des tours récents et divisés après la sortie du fournisseur.
- La synthèse de sécurité intégrée redistille les résumés précédents avec de nouveaux messages
  au lieu de préserver le résumé précédent complet mot pour mot.
- Le mode de sécurité active les audits de qualité de synthèse par défaut ; définissez
  `qualityGuard.enabled: false` pour ignorer le comportement de nouvelle tentative en cas de sortie malformée.
- Si le fournisseur échoue ou renvoie un résultat vide, OpenClaw revient automatiquement à la synthèse LLM intégrée.
- Les signaux d'abort/d'expiration sont relancés (non avalés) pour respecter l'annulation de l'appelant.

Source : `src/plugins/compaction-provider.ts`, `src/agents/pi-hooks/compaction-safeguard.ts`.

---

## Surfaces visibles par l'utilisateur

Vous pouvez observer la compaction et l'état de la session via :

- `/status` (dans n'importe quelle session de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Journaux Gateway (`pnpm gateway:watch` ou `openclaw logs --follow`) : `embedded run auto-compaction start` + `complete`
- Mode verbeux : `🧹 Auto-compaction complete` + nombre de compactions

---

## Maintenance silencieuse (`NO_REPLY`)

OpenClaw prend en charge les tours "silencieux" pour les tâches en arrière-plan où l'utilisateur ne doit pas voir la sortie intermédiaire.

Convention :

- L'assistant commence sa sortie par le jeton silencieux exact `NO_REPLY` /
  `no_reply` pour indiquer "ne pas envoyer de réponse à l'utilisateur".
- OpenClaw supprime/ignore cela dans la couche de livraison.
- La suppression exacte du jeton silencieux est insensible à la casse, donc `NO_REPLY` et
  `no_reply` comptent tous les deux lorsque la charge utile entière est uniquement le jeton silencieux.
- Ceci est uniquement pour les vrais tours d'arrière-plan/sans livraison ; ce n'est pas un raccourci pour
  les demandes utilisateur actionnables ordinaires.

Depuis `2026.1.10`, OpenClaw supprime également le **flux de brouillon/frappe** lorsqu'un
bloc partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de sortie
partielle en cours de tour.

---

## "Vidange de mémoire" pré-compaction (implémentée)

Objectif : avant que l'auto-compaction n'ait lieu, lancer un tour agentique silencieux qui écrit un état
durable sur le disque (par ex. `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) afin que la compaction ne puisse
pas effacer le contexte critique.

OpenClaw utilise l'approche du **pre-threshold flush** :

1. Surveiller l'utilisation du contexte de session.
2. Lorsqu'elle dépasse un « seuil souple » (en dessous du seuil de compactage de Pi), exécuter une directive silencieuse
   « write memory now » vers l'agent.
3. Utiliser le jeton silencieux exact `NO_REPLY` / `no_reply` afin que l'utilisateur ne voie
   rien.

Config (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `model` (remplacement facultatif exact du provider/modèle pour le tour de flush, par exemple `ollama/qwen3:8b`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de flush)
- `systemPrompt` (prompt système supplémentaire ajouté pour le tour de flush)

Notes :

- Le prompt système par défaut inclut un indice `NO_REPLY` pour supprimer
  la livraison.
- Lorsque `model` est défini, le tour de flush utilise ce modèle sans hériter de la
  chaîne de repli de session active, afin que la maintenance locale uniquement ne retombe
  pas silencieusement sur un modèle de conversation payant.
- Le flush s'exécute une fois par cycle de compactage (suivi dans `sessions.json`).
- Le flush s'exécute uniquement pour les sessions Pi embarquées (les backends CLI l'ignorent).
- Le flush est ignoré lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Voir [Memory](/fr/concepts/memory) pour la disposition des fichiers de l'espace de travail et les modèles d'écriture.

Pi expose également un hook `session_before_compact` dans l'API d'extension, mais la logique de flush de OpenClaw
réside aujourd'hui du côté du Gateway.

---

## Liste de contrôle de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/fr/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Inadéquation entre le magasin et la transcription ? Confirmez l'hôte du Gateway et le chemin du magasin à partir de `openclaw status`.
- Spam de compactage ? Vérifiez :
  - fenêtre de contexte du modèle (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevés pour la fenêtre du modèle peuvent provoquer un compactage plus précoce)
  - gonflement des résultats d'outils : activer/régler l'élagage de session
- Fuites de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (jeton exact insensible à la casse) et que vous utilisez une version incluant le correctif de suppression du flux.

## Connexes

- [Gestion de session](/fr/concepts/session)
- [Élagage de session](/fr/concepts/session-pruning)
- [Moteur de contexte](/fr/concepts/context-engine)
