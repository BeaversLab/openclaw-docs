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
- [Compactage](/fr/concepts/compaction)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche en mémoire](/fr/concepts/memory-search)
- [Élagage de session](/fr/concepts/session-pruning)
- [Hygiène des transcripts](/fr/reference/transcript-hygiene)

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
   - Les points de contrôle de compactage sont des métadonnées sur la transcription
     compactée successeur. Les nouveaux compactages n'écrivent pas une seconde copie `.checkpoint.*.jsonl`.

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

Les mutations de transcription utilisent un verrou en écriture de session sur le fichier de transcription. L'acquisition du verrou attend jusqu'à `session.writeLock.acquireTimeoutMs` avant de renvoyer une erreur de session occupée ; la valeur par défaut est `60000` ms. N'augmentez cette valeur que lorsque des tâches légitimes de préparation, de nettoyage, de compactage ou de mise en miroir de transcription entrent en conflit plus longtemps sur des machines lentes. `session.writeLock.staleMs` contrôle quand un verrou existant peut être récupéré comme étant périmé ; la valeur par défaut est `1800000` ms. `session.writeLock.maxHoldMs` contrôle le seuil de libération du chien de garde intra-processus ; la valeur par défaut est `300000` ms. Les substitutions d'environnement d'urgence sont `OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS`, `OPENCLAW_SESSION_WRITE_LOCK_STALE_MS` et `OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`.

Ordre d'application pour le nettoyage du budget disque (`mode: "enforce"`) :

1. Supprimer d'abord les artefacts de transcript orphelins ou de trajectoire orpheline archivés les plus anciens.
2. Si toujours au-dessus de la cible, expulser les entrées de session les plus anciennes et leurs fichiers de transcript/trajectoire.
3. Continuer jusqu'à ce que l'utilisation soit inférieure ou égale à `highWaterBytes`.

En `mode: "warn"`OpenClaw, OpenClaw signale les expulsions potentielles mais ne mute pas le store/les fichiers.

Exécuter la maintenance à la demande :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Sessions Cron et journaux d'exécution

Les exécutions cron isolées créent également des entrées de session/transcripts, et elles disposent de contrôles de rétention dédiés :

- `cron.sessionRetention` (par défaut `24h`) élimine les anciennes sessions isolées d'exécution cron du store de session (`false` désactive).
- `cron.runLog.keepLines` nettoie les lignes d'historique d'exécution SQLite conservées par tâche cron (par défaut : `2000`). `cron.runLog.maxBytes` reste accepté pour les anciens journaux d'exécution basés sur des fichiers.

Lorsque cron force la création d'une nouvelle session d'exécution isolée, il nettoie l'entrée de session `cron:<jobId>` précédente avant d'écrire la nouvelle ligne. Il conserve des préférences sûres telles que les paramètres thinking/fast/verbose, les étiquettes et les substitutions explicites de modèle/auth sélectionnées par l'utilisateur. Il supprime le contexte ambiant de la conversation tel que le routage channel/group, la stratégie d'envoi ou de file d'attente, l'élévation, l'origine et la liaison d'exécution ACP afin qu'une nouvelle exécution isolée ne puisse pas hériter d'une autorisation de livraison ou d'exécution obsolète d'une exécution plus ancienne.

---

## Clés de session (`sessionKey`)

Un `sessionKey` identifie _à quel compartiment de conversation_ vous appartenez (routage + isolation).

Modèles courants :

- Chat principal/direct (par agent) : `agent:<agentId>:<mainKey>` (par défaut `main`)
- Groupe : `agent:<agentId>:<channel>:group:<id>`
- Salon/channel (Discord/Slack) : DiscordSlack`agent:<agentId>:<channel>:channel:<id>` ou `...:room:<id>`
- Cron : `cron:<job.id>`
- Webhook : `hook:<uuid>` (sauf si remplacé)

Les règles canoniques sont documentées sur [/concepts/session](/fr/concepts/session).

---

## Ids de session (`sessionId`)

Chaque `sessionKey` pointe vers un `sessionId` actuel (le fichier de transcription qui poursuit la conversation).

Règles empiriques :

- **Reset** (`/new`, `/reset`) crée un nouveau `sessionId` pour ce `sessionKey`.
- **Reset quotidien** (par défaut à 4h00 heure locale sur l'hôte de la passerelle) crée un nouveau `sessionId` sur le prochain message après la limite de reset.
- **Idle expiry** (`session.reset.idleMinutes` ou l'ancien `session.idleMinutes`) crée un nouveau `sessionId` lorsqu'un message arrive après la fenêtre d'inactivité. Lorsque les paramètres quotidien et inactif sont tous deux configurés, celui qui expire primeiro prime.
- **System events** (heartbeat, réveils cron, notifications d'exécution, maintenance de la passerelle) peuvent modifier la ligne de session mais n'étendent pas la fraîcheur de la réinitialisation quotidienne/inactive. Le basculement de réinitialisation ignore les avis d'événements système mis en file d'attente pour la session précédente avant la construction du nouveau prompt.
- **Parent fork policy** utilise la branche active d'OpenClaw lors de la création d'un fork de thread ou de sous-agent. Si cette branche est trop grande, OpenClaw démarre l'enfant avec un contexte isolé au lieu d'échouer ou d'hériter d'un historique inutilisable. La politique de dimensionnement est automatique ; l'ancienne configuration `session.parentForkMaxTokens` est supprimée par `openclaw doctor --fix`.

Détail d'implémentation : la décision se prend dans `initSessionState()` dans `src/auto-reply/reply/session.ts`.

---

## Schéma du magasin de sessions (`sessions.json`)

Le type de valeur du magasin est `SessionEntry` dans `src/config/sessions.ts`.

Champs clés (non exhaustifs) :

- `sessionId` : identifiant actuel de la transcription (le nom de fichier est dérivé de celui-ci sauf si `sessionFile` est défini)
- `sessionStartedAt` : horodatage de début pour la `sessionId` actuelle ; la fraîcheur
  de la réinitialisation quotidienne utilise ceci. Les lignes héritées peuvent le dériver de l'en-tête de session JSONL.
- `lastInteractionAt` : horodatage de la dernière véritable interaction utilisateur/canal ; la fraîcheur
  de la réinitialisation inactive utilise ceci afin que les événements de heartbeat, cron et exec ne gardent pas les sessions
  en vie. Les lignes héritées sans ce champ reviennent à l'heure de début de session récupérée
  pour la fraîcheur inactive.
- `updatedAt` : horodatage de la dernière mutation de la ligne du magasin, utilisé pour la liste, l'élagage et
  la tenue de livres. Ce n'est pas l'autorité pour la fraîcheur de la réinitialisation quotidienne/inactive.
- `sessionFile` : substitution facultative du chemin explicite de la transcription
- `chatType` : `direct | group | room` (aide les UI et la politique d'envoi)
- `provider`, `subject`, `room`, `space`, `displayName` : métadonnées pour l'étiquetage de groupe/canal
- Bascules :
  - `thinkingLevel`, `verboseLevel`, `reasoningLevel`, `elevatedLevel`
  - `sendPolicy` (remplacement par session)
- Sélection du modèle :
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- Compteurs de jetons (meilleur effort / dépendant du provider) :
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount` : fréquence à laquelle l'auto-compaction s'est terminée pour cette clé de session
- `memoryFlushAt` : horodatage de la dernière purge mémoire de pré-compaction
- `memoryFlushCompactionCount` : nombre de compactages lors de l'exécution de la dernière purge

Le magasin peut être édité en toute sécurité, mais le Gateway fait autorité : il peut réécrire ou réhydrater les entrées au fur et à mesure que les sessions s'exécutent.

---

## Structure de la transcription (`*.jsonl`)

Les transcriptions sont gérées par le `SessionManager` de `openclaw/plugin-sdk/agent-sessions`.

Le fichier est un JSONL :

- Première ligne : en-tête de session (`type: "session"`, inclut `id`, `cwd`, `timestamp`, `parentSession` facultatif)
- Ensuite : entrées de session avec `id` + `parentId` (arbre)

Types d'entrées notables :

- `message` : messages utilisateur/assistant/toolResult
- `custom_message` : messages injectés par l'extension qui entrent dans le contexte du modèle (peuvent être masqués dans l'interface utilisateur)
- `custom` : état de l'extension qui n'entre pas dans le contexte du modèle
- `compaction` : résumé de compactage persisté avec `firstKeptEntryId` et `tokensBefore`
- `branch_summary` : résumé persisté lors de la navigation dans une branche d'arbre

OpenClaw ne corrige volontairement pas les transcriptions ; le OpenClawGateway utilise `SessionManager` pour les lire/écrire.

---

## Fenêtres de contexte vs jetons suivis

Deux concepts différents comptent :

1. **Fenêtre de contexte du modèle** : limite stricte par modèle (jetons visibles par le modèle)
2. **Compteurs de session store** : statistiques déroulantes écrites dans `sessions.json` (utilisés pour /status et les tableaux de bord)

Si vous ajustez les limites :

- La fenêtre de contexte provient du catalogue de modèles (et peut être remplacée via la configuration).
- `contextTokens` dans le store est une valeur d'estimation/rapport à l'exécution ; ne le traitez pas comme une garantie stricte.

Pour plus d'informations, consultez [/token-use](/fr/reference/token-use).

---

## Compactage : ce que c'est

La compactation résume l'ancienne conversation dans une entrée persistante `compaction` de la transcription et conserve les messages récents intacts.

Après le compactage, les futurs tours voient :

- Le résumé de compactage
- Messages après `firstKeptEntryId`

La réinjection de la section AGENTS.md après la compactage est optionnelle via
`agents.defaults.compaction.postCompactionSections` ; lorsqu'elle est non définie ou `[]`OpenClaw,
OpenClaw n'ajoute pas d'extraits AGENTS.md au-dessus du résumé de compactage.

Le compactage est **persistant** (contrairement à l'élagage de session). Voir [/concepts/session-pruning](/fr/concepts/session-pruning).

## Limites des blocs de compactage et appariement d'outils

Lorsqu'OpenClaw divise une longue transcription en blocs de compactage, il conserve
les appels d'outil de l'assistant associés à leurs entrées OpenClaw`toolResult` correspondantes.

- Si la division de la part de jetons atterrit entre un appel d'outil et son résultat, OpenClaw
  déplace la limite vers le message d'appel d'outil de l'assistant au lieu de séparer
  la paire.
- Si un bloc de résultat d'outil à la traîne devait autrement pousser le bloc au-delà de la cible,
  OpenClaw préserve ce bloc d'outil en attente et maintient la queue non résumée
  intacte.
- Les blocs d'appels d'outils avortés/erroqués ne maintiennent pas une division en attente ouverte.

---

## Quand l'auto-compactage se produit (runtime OpenClaw)

Dans l'agent OpenClaw intégré, l'auto-compaction se déclenche dans deux cas :

1. **Récupération de dépassement** : le modèle renvoie une erreur de dépassement de contexte
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, `OpenClawOpenClawOpenClawollama error: context length
exceeded`, et variantes similaires propres aux fournisseurs) → compacter → réessayer.
   Lorsque le fournisseur signale le nombre de jetons tenté, OpenClaw transfère ce
   nombre observé vers le compactage de récupération de dépassement. Si le fournisseur confirme
   le dépassement mais n'expose pas un nombre analysable, OpenClaw transmet un nombre
   synthétique légèrement au-delà du budget aux moteurs de compactage et aux diagnostics.
   Si la récupération de dépassement échoue toujours, OpenClaw présente des conseils explicites à
   l'utilisateur et préserve le mappage de session actuel au lieu de faire pivoter silencieusement
   la clé de session vers un identifiant de session frais. L'étape suivante est contrôlée par l'opérateur :
   réessayer le message, exécuter `/compact`, ou exécuter `/new` lorsqu'une session fraîche est
   préférée.
2. **Maintenance du seuil** : après un tour réussi, lorsque :

`contextTokens > contextWindow - reserveTokens`

Où :

- `contextWindow` est la fenêtre contextuelle du modèle
- `reserveTokens` est la marge réservée pour les invites + la prochaine sortie du modèle

Ce sont les sémantiques d'exécution de OpenClaw.

OpenClaw peut également déclencher une pré-compaction locale avant l'ouverture de la prochaine exécution lorsque OpenClaw`agents.defaults.compaction.maxActiveTranscriptBytes`OpenClaw est défini et que le fichier de transcription actif atteint cette taille. Il s'agit d'une garde de taille de fichier pour le coût de réouverture local, et non d'archivage brut : OpenClaw exécute toujours la compaction sémantique normale, et nécessite `truncateAfterCompaction` pour que le résumé compacté puisse devenir une nouvelle transcription de successeur.

Pour les exécutions OpenClaw intégrées, OpenClaw`agents.defaults.compaction.midTurnPrecheck.enabled: true`OpenClawOpenClaw ajoute une garde de boucle d'outils facultative. Après qu'un résultat d'outil est ajouté et avant le prochain appel de modèle, OpenClaw estime la pression du prompt en utilisant la même logique de budget préliminaire utilisée au début du tour. Si le contexte ne tient plus, la garde ne compacte pas à l'intérieur du hook `transformContext` du runtime OpenClaw. Il lève un signal de pré-vérification structuré en milieu de tour, arrête la soumission du prompt actuel, et permet à la boucle d'exécution externe d'utiliser le chemin de récupération existant : tronquer les résultats d'outil trop volumineux lorsque cela suffit, ou déclencher le mode de compaction configuré et réessayer. L'option est désactivée par défaut et fonctionne avec les modes de compaction `default` et `safeguard`, y compris la compaction de sauvegarde prise en charge par le fournisseur. Ceci est indépendant de `maxActiveTranscriptBytes`OpenClaw : la garde de taille en octets s'exécute avant l'ouverture d'un tour, tandis que la pré-vérification en milieu de tour s'exécute plus tard dans la boucle d'outils OpenClaw intégrée après l'ajout de nouveaux résultats d'outil.

---

## Paramètres de compaction (`reserveTokens`, `keepRecentTokens`)

Les paramètres de compactage du runtime OpenClaw se trouvent dans les paramètres de l'agent :

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
- Le plancher par défaut est de `20000` jetons.
- Définissez `agents.defaults.compaction.reserveTokensFloor: 0` pour désactiver le plancher.
- S'il est déjà plus élevé, OpenClaw le laisse tel quel.
- La `/compact` manuelle respecte un `agents.defaults.compaction.keepRecentTokens`OpenClaw explicite et conserve le point de coupe de fin récent du runtime OpenClaw. Sans un budget de conservation explicite, la compaction manuelle reste un point de contrôle strict et le contexte reconstruit commence à partir du nouveau résumé.
- Définissez `agents.defaults.compaction.midTurnPrecheck.enabled: true` pour exécuter la
  pré-vérification optionnelle de la boucle d'outils après les nouveaux résultats d'outils et avant l'appel suivant au
  model. Il s'agit uniquement d'un déclencheur ; la génération de résumé utilise toujours le chemin de compactage
  configuré. Il est indépendant de `maxActiveTranscriptBytes`, qui est une
  garde de taille en octets de la transcription active en début de tour.
- Définissez `agents.defaults.compaction.maxActiveTranscriptBytes` sur une valeur en octets ou
  une chaîne telle que `"20mb"` pour exécuter un compactage local avant un tour lorsque la
  transcription active devient volumineuse. Cette garde n'est active que lorsque
  `truncateAfterCompaction` est également activé. Laissez-le non défini ou définissez `0` pour
  désactiver.
- Lorsque `agents.defaults.compaction.truncateAfterCompaction` est activé,
  OpenClaw fait pivoter la transcription active vers un JSONL successeur compacté après
  compactage. Les actions de point de contrôle de branchement/restauration utilisent ce successeur compacté ;
  les fichiers de point de contrôle de pré-compactage hérités restent lisibles tant qu'ils sont référencés.

Pourquoi : laisser suffisamment de marge pour le « nettoyage » multi-tours (comme les écritures en mémoire) avant que le compactage ne devienne inévitable.

Implémentation : `ensureAgentCompactionReserveTokens()` dans `src/agents/agent-settings.ts`
(appelé depuis `src/agents/embedded-agent-runner.ts`).

---

## Fournisseurs de compactage enfichables

Les plugins peuvent enregistrer un provider de compactage via `registerCompactionProvider()` sur l'API du plugin. Lorsque `agents.defaults.compaction.provider` est défini sur un id de provider enregistré, l'extension de sécurité délègue la synthèse à ce provider au lieu du pipeline intégré `summarizeInStages`.

- `provider` : id d'un plugin provider de compactage enregistré. Laissez non défini pour la synthèse LLM par défaut.
- Définir un `provider` force `mode: "safeguard"`.
- Les fournisseurs reçoivent les mêmes instructions de compactage et la même politique de préservation des identifiants que le chemin intégré.
- La sécurité préserve toujours le contexte de suffixe de tour récent et de tour fractionné après la sortie du fournisseur.
- La synthèse de sécurité intégrée redistille les synthèses précédentes avec de nouveaux messages
  au lieu de préserver l'intégralité de la synthèse précédente mot pour mot.
- Le mode mode garde active les audits de qualité de résumé par défaut ; définissez
  `qualityGuard.enabled: false` pour ignorer le comportement de nouvelle tentative en cas de sortie malformée.
- Si le fournisseur échoue ou renvoie un résultat vide, OpenClaw revient automatiquement à la synthèse LLM intégrée.
- Les signaux d'abort/délai d'attente sont relancés (non ignorés) pour respecter l'annulation de l'appelant.

Source : `src/plugins/compaction-provider.ts`, `src/agents/agent-hooks/compaction-safeguard.ts`.

---

## Surfaces visibles par l'utilisateur

Vous pouvez observer la compactage et l'état de la session via :

- `/status` (dans n'importe quelle session de chat)
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- Journaux de la Gateway (Gateway`pnpm gateway:watch` ou `openclaw logs --follow`) : `embedded run auto-compaction start` + `complete`
- Mode verbeux : `🧹 Auto-compaction complete` + nombre de compactages

---

## Maintenance silencieuse (`NO_REPLY`)

OpenClaw prend en charge les tours "silencieux" pour les tâches en arrière-plan où l'utilisateur ne doit pas voir la sortie intermédiaire.

Convention :

- L'assistant commence sa sortie par le jeton silencieux exact `NO_REPLY` /
  `no_reply` pour indiquer « ne pas délivrer de réponse à l'utilisateur ».
- OpenClaw supprime/masque cela dans la couche de diffusion.
- La suppression exacte du jeton silencieux ne respecte pas la casse, donc `NO_REPLY` et
  `no_reply` comptent tous les deux lorsque la charge utile entière est uniquement le jeton silencieux.
- Ceci est réservé aux véritables tours en arrière-plan/sans diffusion ; ce n'est pas un raccourci pour les demandes utilisateur ordinaires faisables.

Depuis `2026.1.10`OpenClaw, OpenClaw supprime également le **streaming de brouillon/frappe** lorsqu'un
bloc partiel commence par `NO_REPLY`, afin que les opérations silencieuses ne fuient pas de sortie
partielle en cours de tour.

---

## "Vidange de la mémoire" avant compactage (implémenté)

Objectif : avant que l'auto-compactage n'ait lieu, exécuter un tour agent silencieux qui écrit l'état
durable sur le disque (par exemple `memory/YYYY-MM-DD.md` dans l'espace de travail de l'agent) afin que le compactage ne puisse
pas effacer le contexte critique.

OpenClaw utilise l'approche de **vidange avant seuil** :

1. Surveiller l'utilisation du contexte de session.
2. Lorsqu'il dépasse un "seuil souple" (en dessous du seuil de compactage du runtime OpenClaw), exécuter une directive silencieuse "écrire la mémoire maintenant" à l'agent.
3. Utilisez le jeton silencieux exact `NO_REPLY` / `no_reply` pour que l'utilisateur ne
   voie rien.

Configuration (`agents.defaults.compaction.memoryFlush`) :

- `enabled` (par défaut : `true`)
- `model` (remplacement facultatif exact de provider/model pour le tour de flush, par exemple `ollama/qwen3:8b`)
- `softThresholdTokens` (par défaut : `4000`)
- `prompt` (message utilisateur pour le tour de flush)
- `systemPrompt` (prompt système supplémentaire ajouté pour le tour de flush)

Notes :

- Le prompt système par défaut inclut un indice `NO_REPLY` pour supprimer
  la livraison.
- Lorsque `model` est défini, le tour de flush utilise ce modèle sans hériter de la
  chaîne de repli de session active, afin que la maintenance locale uniquement ne revienne pas
  silencieusement à un modèle de conversation payant.
- Le flush s'exécute une fois par cycle de compactage (suivi dans `sessions.json`).
- Le flush ne s'exécute que pour les sessions OpenClaw intégrées (les backends CLI l'ignorent).
- Le vidage est ignoré lorsque l'espace de travail de la session est en lecture seule (`workspaceAccess: "ro"` ou `"none"`).
- Consultez [Mémoire](/fr/concepts/memory) pour la disposition des fichiers de l'espace de travail et les modèles d'écriture.

OpenClaw expose également un hook OpenClaw`session_before_compact`APIOpenClawGateway dans l'API d'extension, mais la logique de vidage d'OpenClaw réside aujourd'hui du côté de la Gateway.

---

## Liste de contrôle de dépannage

- Clé de session incorrecte ? Commencez par [/concepts/session](/fr/concepts/session) et confirmez le `sessionKey` dans `/status`.
- Inadéquation entre le magasin et la transcription ? Confirmez l'hôte de la Gateway et le chemin du magasin à partir de Gateway`openclaw status`.
- Spam de compactage ? Vérifiez :
  - fenêtre de contexte du modèle (trop petite)
  - paramètres de compactage (`reserveTokens` trop élevé pour la fenêtre du modèle peut provoquer un compactage plus précoce)
  - bloat des résultats d'outil : activer/régler l'élagage de session
- Fuite de tours silencieux ? Confirmez que la réponse commence par `NO_REPLY` (jeton exact insensible à la casse) et que vous êtes sur une version qui inclut la correction de la suppression du streaming.

## Connexes

- [Gestion des sessions](/fr/concepts/session)
- [Élagage de session](/fr/concepts/session-pruning)
- [Moteur de contexte](/fr/concepts/context-engine)
