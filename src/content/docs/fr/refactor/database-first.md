---
summary: "Plan de migration pour faire de SQLite la couche principale d'état durable et de cache tout en conservant le "
title: "Refactorisation de l'état axée sur la base de données"
read_when:
  - Moving OpenClaw runtime data, cache, transcripts, task state, or scratch files into SQLite
  - Designing doctor migrations from legacy JSON or JSONL files
  - Changing backup, restore, VFS, or worker storage behavior
  - Removing session locks, pruning, truncation, or JSON compatibility paths
---

# Refactorisation de l'état axée sur la base de données

## Décision

Utiliser une architecture SQLite à deux niveaux :

- Base de données globale : `~/.openclaw/state/openclaw.sqlite`
- Base de données de l'agent : une base de données SQLite par agent pour l'espace de travail détenu par l'agent,
  la transcription, le VFS, les artefacts et l'état d'exécution important par agent
- La configuration reste sauvegardée dans un fichier : `openclaw.json` reste en dehors de la
  base de données. Les profils d'authentification d'exécution migrent vers SQLite ; les fichiers d'identification de CLI externes ou de OpenClaw
  restent gérés par leur propriétaire en dehors de la base de données d'OpenClaw.

La base de données globale est la base de données du plan de contrôle. Elle gère la découverte des agents,
l'état de la passerelle partagée, l'appariement, l'état des appareils/nœuds, les grands livres des tâches et des flux, l'état
des plugins, l'état d'exécution du planificateur, les métadonnées de sauvegarde et l'état de migration.

La base de données de l'agent est la base de données du plan de données. Elle gère les métadonnées de session de l'agent,
le flux d'événements de transcription, l'espace de travail VFS ou l'espace de noms temporaire, les artefacts
d'outils, les artefacts d'exécution et les données de cache locales à l'agent et consultables/indexables.

Cela offre une vue globale durable unique sans forcer les grands espaces de travail des agents,
les transcriptions et les données temporaires binaires dans la voie d'écriture de la passerelle partagée.

## Contrat strict

Cette migration a une forme canonique d'exécution :

- Les lignes de session ne persistent que les métadonnées de session. Elles ne doivent pas persister
  `transcriptLocator`, les chemins de fichiers de transcription, les chemins JSONL frères, les chemins de verrou,
  les métadonnées d'élagage ou les pointeurs de compatibilité de l'ère des fichiers.
- L'identité de la transcription est toujours l'identité SQLite : `{agentId, sessionId}` plus
  des métadonnées de rubrique facultatives là où le protocole le nécessite.
- `sqlite-transcript://...` n'est pas une identité d'exécution ou de protocole. Le nouveau code ne doit
  pas dériver, persister, transmettre, analyser ou migrer les localisateurs de transcription. L'exécution et
  les tests ne doivent pas contenir de pseudo-localisateurs du tout ; la documentation peut mentionner la chaîne
  uniquement pour l'interdire.
- Le `sessions.json` hérité, le JSONL de transcription, le `.jsonl.lock`, l'élagage, la troncation,
  et l'ancienne logique de chemin de session appartiennent uniquement au chemin de migration/importation du doctor.
- Les alias de configuration de session hérités appartiennent uniquement à la migration du docteur. Le runtime n'interprète pas `session.idleMinutes`, `session.resetByType.dm`, ou les alias de session principale inter-agents `agent:main:*` pour un autre agent configuré.
- L'identité de routage de session est un état relationnel typé. Les chemins d'exécution à chaud et l'interface utilisateur doivent lire `sessions.session_scope`, `sessions.account_id`, `sessions.primary_conversation_id`, `conversations` et `session_conversations` ; ils ne doivent pas analyser `session_key` ou extraire `session_entries.entry_json` pour l'identité du fournisseur, sauf en tant qu'ombre de compatibilité pendant que les anciens sites d'appel sont en cours de suppression.
- Les marqueurs de message direct au niveau du canal, tels que `dm` par rapport à `direct`, sont un vocabulaire de routage, et non des localisateurs de transcription ou des handles de compatibilité de stockage de fichiers.
- La configuration héritée du gestionnaire de hooks appartient uniquement aux surfaces d'avertissement et de migration du docteur. Le runtime ne doit pas charger `hooks.internal.handlers` ; les hooks s'exécutent uniquement via les répertoires de hooks découverts et les métadonnées `HOOK.md`.
- Le démarrage du runtime, les chemins de réponse à chaud, la compactage, la réinitialisation, la récupération, les diagnostics, la synthèse vocale (TTS), les hooks de mémoire, les sous-agents, le routage des commandes de plugin, les limites du protocole et les hooks doivent faire passer `{agentId, sessionId}` à travers le runtime.
- Les tests devraient amorcer et vérifier les lignes de transcription SQLite via `{agentId, sessionId}`. Les tests qui prouvent uniquement le transfert de chemin JSONL, la préservation du localisateur fourni par l'appelant ou la compatibilité des fichiers de transcription doivent être supprimés, sauf s'ils couvrent l'importation du docteur, la matérialisation de support/débogage sans session ou la forme du protocole.
- `runEmbeddedPiAgent(...)`, les exécutions de worker préparées et la tentative intégrée interne ne doivent pas accepter de localisateurs de transcription. Ils ouvrent le gestionnaire de transcription SQLite par `{agentId, sessionId}` et passent ce gestionnaire à la session d'agent compatible PI internalisée, afin que les appelants obsolètes ne puissent pas forcer le runner à écrire des transcriptions JSON/JSONL.
- Les diagnostics de l'exécuteur (Runner) doivent stocker les enregistrements de trace runtime/cache/payload dans SQLite.
  Les diagnostics d'exécution ne doivent pas exposer de commandes de remplacement de fichiers JSONL ou d'helpers d'export de transcriptions JSONL génériques ; les exports orientés utilisateur peuvent matérialiser des artefacts explicites à partir des lignes de la base de données sans renvoyer les noms de fichiers dans l'exécution.
- La journalisation du flux brut utilise `OPENCLAW_RAW_STREAM=1` plus les lignes de diagnostic SQLite.
  L'ancien contrat de logger de fichiers pi-mono `PI_RAW_STREAM`, `PI_RAW_STREAM_PATH` et
  `raw-openai-completions.jsonl` ne fait pas partie du runtime OpenClaw
  ou des tests.
- L'indexation mémoire QMD ne doit pas exporter les transcriptions SQLite vers des fichiers markdown.
  QMD indexe uniquement les fichiers de mémoire configurés ; la recherche de transcriptions de session reste
  basée sur SQLite.
- Le sous-chemin du SDK QMD est réservé à QMD uniquement pour le nouveau code. Les helpers d'indexation des transcriptions de session SQLite résident sur `memory-core-host-engine-session-transcripts` ; toute
  ré-exportation QMD n'est que de la compatibilité et ne doit pas être utilisée par le code d'exécution.
- Les index de mémoire intégrés résident dans la base de données de l'agent propriétaire. La configuration d'exécution et
  les contrats d'exécution résolus ne doivent pas exposer `memorySearch.store.path` ; doctor
  supprime cette clé de configuration héritée et le code actuel transmet en interne l'`databasePath`
  de l'agent.

Le travail d'implémentation doit continuer à supprimer du code jusqu'à ce que ces déclarations soient vraies
sans exceptions en dehors des limites doctor/import/export/debug.

## État objectif et progression

### Objectif strict

- Une base de données SQLite globale possède l'état du plan de contrôle :
  `state/openclaw.sqlite`.
- Une base de données SQLite par agent possède l'état du plan de données :
  `agents/<agentId>/agent/openclaw-agent.sqlite`.
- La configuration reste sauvegardée dans un fichier. `openclaw.json` ne fait pas partie de cette refactorisation
  de base de données.
- Les fichiers hérités sont uniquement des entrées pour la migration doctor.
- L'exécution n'écrit ni ne lit jamais de JSONL de session ou de transcription en tant qu'état actif.

### États objectifs

- `not-started` : le code d'exécution de l'ère des fichiers écrit encore l'état actif.
- `migrating` : le code doctor/import peut déplacer les données des fichiers vers SQLite.
- `dual-read` : un pont temporaire lit à la fois SQLite et les fichiers hérités. Cet état
  est interdit pour cette refactorisation sauf s'il est explicitement documenté comme
  réservé à doctor.
- `sqlite-runtime` : l'exécution lit et écrit uniquement SQLite.
- `clean` : les API et tests d'exécution hérités sont supprimés, et la garde empêche les régressions.
- `done` : les docs, tests, sauvegardes, migrations du docteur et vérifications des modifications prouvent l'état propre.

### État actuel

- Sessions : `clean` pour l'exécution. Les lignes de session résident dans la base de données par agent, les API d'exécution utilisent `{agentId, sessionId}` ou `{agentId, sessionKey}`, et `sessions.json` est une entrée héritée réservée au docteur.
- Transcriptions : `clean` pour l'exécution. Les événements de transcription, les identités, les instantanés et les événements d'exécution de trajectoire résident dans la base de données par agent. L'exécution n'accepte plus les localisateurs de transcription ni les chemins de transcription JSONL.
- Runner PI intégré : `clean`. Les exécutions PI intégrées, les workers préparés, la compactage et les boucles de réessai utilisent la portée de session SQLite et rejettent les handles de transcription périmés.
- Cron : `clean` pour l'exécution. L'exécution utilise `cron_jobs` et `cron_run_logs` ; les tests d'exécution utilisent la dénomination SQLite `storeKey`, et les chemins cron de l'ère des fichiers ne restent que dans les tests de migration hérités du docteur.
- Registre des tâches : `clean`. Les lignes d'exécution de Task et Task Flow résident dans `state/openclaw.sqlite` ; les importateurs SQLite sidecar non expédiés sont supprimés.
- État du plugin : `clean`. Les lignes d'état/blob de plugin résident dans la base de données globale partagée ; les anciens assistants SQLite sidecar d'état de plugin sont protégés.
- Mémoire : `sqlite-runtime` pour la mémoire intégrée et l'indexation des transcriptions de session. Les tables d'index de mémoire résident dans la base de données par agent, l'état de mémoire du plugin utilise les lignes d'état de plugin partagées, et les fichiers de mémoire hérités sont des entrées de migration du docteur ou du contenu de l'espace de travail utilisateur.
- Sauvegarde : `sqlite-runtime`. Les étapes de sauvegarde compactent les instantanés SQLite, omettent les sidecars WAL/SHM en direct, vérifient l'intégrité SQLite et enregistrent les exécutions de sauvegarde dans la base de données globale.
- Migration du docteur : `migrating`, intentionnellement. Le docteur importe le JSON hérité, les fichiers JSONL et les magasins sidecar retirés vers SQLite, enregistre les exécutions/sources de migration et supprime les sources réussies.
- Scripts E2E : `clean`DockerDocker pour la couverture de l'exécution. Le seeding du MCP Docker écrit des lignes
  SQLite. Le script de contexte d'exécution Docker crée du JSONL hérité uniquement à l'intérieur du
  seed de migration du docteur et nomme explicitement le chemin de l'index de session hérité.

### Travail restant

- [x] Renommer les variables de magasin de test d'exécution cron en les éloignant de `storePath`, à moins
      qu'elles ne soient des entrées héritées du docteur.
      Fichiers : `src/cron/service.test-harness.ts`,
      `src/cron/service.runs-one-shot-main-job-disables-it.test.ts`,
      `src/cron/service/timer.regression.test.ts`,
      `src/cron/service/ops.test.ts`, `src/cron/service/store.test.ts`,
      `src/cron/service.heartbeat-ok-summary-suppressed.test.ts`,
      `src/cron/service.main-job-passes-heartbeat-target-last.test.ts`,
      `src/cron/store.test.ts`.
      Preuve : `pnpm check:database-first-legacy-stores` ; `rg -n 'storePath' src/cron --glob '!**/commands/doctor/**'`.
- [x] Supprimer ou renommer les mocks de test d'export obsolètes de l'époque des fichiers.
      Fichier : `src/auto-reply/reply/commands-export-test-mocks.ts`.
      Preuve : `rg -n 'resolveSessionFilePath|sessionFile|storePath|transcriptLocator' src/auto-reply/reply`.
- [x] Rendre le seed JSONL hérité de contexte d'exécution Docker évidemment réservé au docteur.
      Fichier : Docker`scripts/e2e/session-runtime-context-docker-client.ts`.
      Preuve : `rg -n 'sessions\\.json|sessionFile|\\.jsonl' scripts/e2e/session-runtime-context-docker-client.ts` montre uniquement
      `seedBrokenLegacySessionForDoctorMigration`.
- [x] Garder les types générés par Kysely alignés après tout changement de schéma.
      Fichiers : `src/state/openclaw-state-schema.sql`,
      `src/state/openclaw-agent-schema.sql`,
      `src/state/*generated*`.
      Preuve : aucun changement de schéma dans cette passe ; `pnpm db:kysely:check` ;
      `pnpm lint:kysely`.
- [x] Relancer les tests ciblés pour les magasins, commandes et scripts touchés.
      Preuve : `pnpm test src/cron/service/store.test.ts src/cron/store.test.ts src/cron/service.heartbeat-ok-summary-suppressed.test.ts src/cron/service.main-job-passes-heartbeat-target-last.test.ts src/cron/service.every-jobs-fire.test.ts src/cron/service.persists-delivered-status.test.ts src/cron/service.runs-one-shot-main-job-disables-it.test.ts src/cron/service/ops.test.ts src/cron/service/timer.regression.test.ts src/auto-reply/reply/commands-export-trajectory.test.ts extensions/telegram/src/thread-bindings.test.ts extensions/slack/src/monitor/message-handler/prepare.test.ts src/acp/translator.session-lineage-meta.test.ts` ; `git diff --check`.
- [x] Avant de déclarer `done`, exécuter la porte modifiée ou la preuve large à distance.
      Preuve : `pnpm check:changed --timed -- <changed extension paths>` a réussi sur l'exécution
      Hetzner Crabbox `run_3f1cabf6b25c` après une configuration temporaire de Node 24/pnpm et
      un routage de chemin explicite pour l'espace de travail synchronisé sans `.git`.

### Ne pas régresser

- Aucun localisateur de transcript.
- Aucun fichier de session actif.
- Aucune fixture de test JSONL factice, sauf pour les tests de migration héritée du docteur.
- Aucun accès SQLite brut là où Kysely est attendu.
- Aucune nouvelle migration de DB héritée. Cette mise en page n'a pas été expédiée ; gardez la version du schéma
  à `1` sauf s'il y a une forte raison.

## Hypothèses de lecture du code

Aucune décision produit de suivi ne bloque ce plan. La mise en œuvre doit
se poursuivre avec ces hypothèses :

- Utiliser `node:sqlite` directement et exiger l'exécution Node 22+
  pour ce chemin de stockage.
- Conserver exactement un fichier de configuration normal. Ne pas déplacer la
  configuration, les manifests de plugins ou les espaces de travail Git dans
  SQLite lors de cette refactorisation.
- Les fichiers de compatibilité d'exécution ne sont pas requis. Les fichiers JSON
  et JSONL hérités sont uniquement des entrées de migration. Les fichiers SQLite
  sidecars locaux à la branche n'ont jamais été livrés et sont supprimés au lieu
  d'être importés.
- `openclaw doctor --fix` possède l'étape de migration des fichiers hérités
  vers la base de données. Le démarrage de l'exécution et `openclaw migrate`
  ne doivent pas contenir de chemins de mise à niveau de base de données OpenClaw
  hérités.
- La compatibilité des identifiants suit la même règle : les identifiants
  d'exécution résident dans SQLite. Les anciens fichiers `auth-profiles.json`,
  `auth.json` par agent et partagés `credentials/oauth.json`
  sont des entrées de migration du doctor, puis sont supprimés après importation.
- L'état du catalogue de modèle généré est sauvegardé dans une base de données.
  Le code d'exécution ne doit pas écrire `agents/<agentId>/agent/models.json` ; les fichiers
  existants `models.json` sont des entrées héritées du doctor et sont
  supprimés après importation dans `agent_model_catalogs`.
- L'exécution ne doit pas migrer, normaliser ou pontifier les localisateurs de
  transcription. L'identité active de la transcription est `{agentId, sessionId}`
  dans SQLite. Les chemins de fichiers sont uniquement des entrées héritées du
  doctor, et `sqlite-transcript://...` doit disparaître des surfaces d'exécution,
  de protocole, de hook et de plugin au lieu d'être traité comme un handle de
  frontière.
- Les lectures de transcription SQLite d'exécution n'exécutent pas les anciennes
  migrations de forme d'entrée JSONL ni ne réécrivent des transcriptions entières
  pour la compatibilité. La normalisation des entrées héritées reste dans les
  utilitaires explicites de doctor/importation. Le doctor normalise les fichiers
  de transcription JSONL hérités avant d'insérer les lignes SQLite ; les lignes
  d'exécution actuelles sont déjà écrites dans le schéma de transcription actuel.
  L'exportation de trajectoire/session lit ces lignes telles quelles et ne doit
  pas effectuer de migrations héritées au moment de l'exportation.
- Les assistants d'analyse/migration de transcription JSONL hérités sont réservés
  au doctor. Le code de format de transcription d'exécution construit uniquement le
  contexte de transcription SQLite actuel ; le doctor possède les mises à jour
  d'entrées JSONL anciennes avant d'insérer les lignes.
- L'ancien assistant de streaming de transcription JSONL propriétaire du runtime a été supprimé. Le code d'importation Doctor possède désormais des lectures de fichiers héritées explicites ; l'historique de session du runtime lit les lignes SQLite.
- Les liaisons du serveur d'application Codex utilisent le OpenClaw `sessionId` comme clé canonique dans l'espace de noms d'état du plugin Codex. `sessionKey` est une métadonnée pour le routage/l'affichage et ne doit pas remplacer l'identifiant de session durable ou ressusciter l'identité du fichier de transcription.
- Les moteurs de contexte reçoivent directement le contrat de runtime actuel. Le registre ne doit pas envelopper les moteurs avec des shims de réessai qui suppriment `sessionKey`, `transcriptScope` ou `prompt` ; les moteurs qui ne peuvent pas accepter les paramètres actuels axés sur la base de données doivent échouer bruyamment au lieu d'être pontés.
- La sortie de sauvegarde doit rester un fichier d'archive. Le contenu de la base de données doit entrer dans cette archive sous forme de instantanés SQLite compacts, et non de sidecars WAL bruts en direct.
- La recherche de transcription est utile mais n'est pas requise pour la première version axée sur la base de données. Concevez le schéma afin que la FTS puisse être ajoutée plus tard.
- L'exécution du Worker doit rester expérimentale derrière les paramètres pendant que la frontière de la base de données se stabilise.

## Résultats de la lecture de code

La branche actuelle a déjà dépassé le stade de la preuve de concept. La base de données partagée existe, Node `node:sqlite` est câblé via un petit assistant d'exécution, et les anciens magasins écrivent désormais dans `state/openclaw.sqlite` ou la base de données `openclaw-agent.sqlite` propriétaire.

Le travail restant ne consiste pas à choisir SQLite ; il consiste à garder la nouvelle frontière propre et à supprimer toutes les interfaces de compatibilité qui ressemblent encore à l'ancien monde des fichiers :

- Le `storePath` de session n'est plus une identité de runtime, une forme de fixture de test ou un champ de payload de statut. Les tests de runtime et de pont ne contiennent plus le nom de contrat `storePath` ; le code de doctor/migration possède ce vocabulaire hérité.
- Les écritures de session ne passent plus par l'ancienne file d'attente `store-writer.ts` en cours de processus. Les écritures de correctifs SQLite utilisent à la place la détection de conflits et une nouvelle tentative limitée.
- La découverte de chemin héritée a encore des utilisations de migration valides, mais le code de runtime doit cesser de traiter `sessions.json` et les fichiers de transcription JSONL comme cibles d'écriture possibles.
- Les tables détenues par les agents résident dans des bases de données SQLite par agent. La base de données globale conserve les lignes de registre/plan de contrôle ; l'identité de la transcription est `{agentId, sessionId}` dans les lignes de transcription par agent. Le code d'exécution ne doit pas persister les chemins de fichiers de transcription ni migrer les localisateurs de transcription.
- Doctor importe déjà plusieurs fichiers hérités. Le nettoyage consiste à en faire une seule implémentation de migration explicite que Doctor appelle, avec un rapport de migration durable.

Aucune question produit supplémentaire ne bloque l'implémentation.

## Forme actuelle du code

La branche possède déjà une base SQLite partagée réelle :

- La version d'exécution minimale est désormais Node 22+ : `package.json`, la garde d'exécution CLI, les valeurs par défaut de l'installateur, le localisateur d'exécution macOS, l'CI et la documentation publique d'installation sont tous d'accord. L'ancienne voie de compatibilité Node 22 a été supprimée.
- `src/state/openclaw-state-db.ts` ouvre `openclaw.sqlite`, définit WAL,
  `synchronous=NORMAL`, `busy_timeout=30000`, `foreign_keys=ON`, et applique
  le module de schéma généré dérivé de
  `src/state/openclaw-state-schema.sql`.
- Les types de tables Kysely et les modules de schéma d'exécution sont générés à partir de bases de données SQLite jetables créées à partir des fichiers `.sql` validés ; le code d'exécution ne conserve plus de chaînes de schéma copiées-collées pour les bases de données globales, par agent ou de capture de proxy.
- Les magasins d'exécution dérivent les types de lignes sélectionnées et insérées de ces interfaces Kysely `DB` générées au lieu de masquer manuellement les formes de lignes SQLite. Le SQL brut reste limité à l'application du schéma, aux pragmas et au DDL de migration uniquement.
- Les schémas SQLite sont réduits à `user_version = 1` car cette disposition de base de données n'a pas encore été expédiée. Les ouvreurs d'exécution créent uniquement le schéma actuel ; l'importation de fichier vers base de données reste dans le code Doctor, et les assistants de mise à niveau de base de données locaux à la branche ont été supprimés.
- La propriété relationnelle est appliquée là où la limite de propriété est canonique : les lignes de migration source sont en cascade à partir de `migration_runs`, l'état de livraison des tâches est en cascade à partir de `task_runs`, et les lignes d'identité de transcription sont en cascade à partir des événements de transcription.
- Les tables partagées actuelles incluent `agent_databases`,
  `auth_profile_stores`, `auth_profile_state`,
  `plugin_state_entries`, `plugin_blob_entries`, `media_blobs`,
  `skill_uploads`, `capture_sessions`, `capture_events`, `capture_blobs`,
  `sandbox_registry_entries`, `cron_run_logs`, `cron_jobs`, `commitments`,
  `delivery_queue_entries`, `model_capability_cache`,
  `workspace_setup_state`, `native_hook_relay_bridges`,
  `current_conversation_bindings`, `plugin_binding_approvals`,
  `tui_last_sessions`, `acp_sessions`, `acp_replay_sessions`,
  `acp_replay_events`, `task_runs`, `task_delivery_state`, `flow_runs`,
  `subagent_runs`, `migration_runs`, et `backup_runs`.
- L'état arbitraire appartenant aux plugins n'obtient pas de tables typées appartenant à l'hôte. Les plugins
  installés utilisent `plugin_state_entries` pour les charges utiles JSON versionnées et
  `plugin_blob_entries` pour les octets, avec une propriété d'espace de noms/clé, le nettoyage TTL,
  la sauvegarde et les enregistrements de migration de plugins. L'état d'orchestration de plugins appartenant à l'hôte peut
  toujours avoir des tables typées lorsque l'hôte possède le contrat de requête, tel que
  `plugin_binding_approvals`.
- Les migrations de plugins sont des migrations de données sur des espaces de noms appartenant aux plugins, et non des
  migrations de schéma de l'hôte. Un plugin peut migrer ses propres entrées d'état/blob versionnées
  via un provider de migration, et l'hôte enregistre l'état de la source/exécution dans le
  registre de migration normal. Les nouvelles installations de plugins ne nécessitent pas de modifier
  `openclaw-state-schema.sql` à moins que l'hôte ne prenne lui-même la propriété d'un
  nouveau contrat inter-plugins.
- `src/state/openclaw-agent-db.ts` ouvre
  `agents/<agentId>/agent/openclaw-agent.sqlite`, enregistre la base de données dans la
  base de données globale et possède les tables session, transcript, VFS, artifact, cache
  et memory-index locales à l'agent. La découverte du runtime partagé lit désormais le registre `agent_databases` généré et typé
  au lieu de réimplémenter cette requête à chaque site d'appel.
- Les bases de données globales et par agent enregistrent une ligne `schema_meta` avec le rôle de la base de données,
  la version du schéma, les horodatages et l'identifiant de l'agent pour les bases de données d'agent. La disposition reste
  à `user_version = 1` car ce schéma SQLite n'a pas encore été expédié.
- L'identité de session par agent possède désormais une table racine `sessions` canonique indexée par
  `session_id`, avec `session_key`, `session_scope`, `account_id`,
  `primary_conversation_id`, les horodatages, les champs d'affichage, les métadonnées du model,
  l'identifiant du harnais et la liaison parent/génération en tant que colonnes interrogeables. `session_routes`
  est l'index de route actif unique de `session_key` vers le `session_id` actuel,
  afin qu'une clé de route puisse passer à une session persistante fraîche sans
  obliger les lectures à chaud à choisir entre des lignes `sessions.session_key` en double. L'ancienne
  charge utile de forme de compatibilité `session_entries.entry_json` est rattachée à la
  racine `session_id` persistante par clé étrangère ; elle n'est plus la seule
  représentation au niveau du schéma d'une session.
- L'identité de conversation externe par agent est également relationnelle :
  `conversations` stocke l'identité normalisée provider/account/conversation, et
  `session_conversations`OpenClaw lie une session OpenClaw à une ou plusieurs conversations
  externes. Cela couvre les sessions DM partagées principales (shared-main) où plusieurs pairs peuvent
  intentionnellement correspondre à une seule session sans mentir dans `session_key`. SQLite applique
  également l'unicité pour l'identité naturelle du provider afin que le même tuple
  channel/account/kind/peer/thread ne puisse pas bifurquer à travers les ids de conversation.
  Les pairs directs partagés principaux sont liés avec un rôle `participant`OpenClaw, donc une
  seule session OpenClaw peut représenter plusieurs pairs DM externes sans rétrograder
  les anciens pairs en lignes connexes vagues. `sessions.primary_conversation_id` pointe
  toujours vers la cible de livraison typée actuelle. Les colonnes de routage/état fermées
  sont appliquées avec des contraintes `CHECK` de SQLite au lieu de se fier uniquement aux
  unions TypeScript.
  La projection de session à l'exécution efface les ombres de routage de compatibilité de
  `session_entries.entry_json` avant d'appliquer les colonnes de session/conversation typées,
  afin que les payloads JSON périmés ne puissent pas ressusciter les cibles de livraison.
  Le routage d'annonce de sous-agent nécessite également le contexte de livraison SQLite typé ;
  il ne revient plus aux champs de route de compatibilité `SessionEntry`Gateway.
  L'héritage de livraison explicite du `chat.send` de la Gateway lit le contexte de livraison SQLite typé
  au lieu des champs de compatibilité `origin`/`last*`.
  `tools.effective` dérive également le contexte provider/account/thread à partir des lignes de
  livraison/routage SQLite typées, et non des ombres d'entrée de session `last*` périmées.
  La reconstruction du contexte d'invite d'événement système reconstruit les champs channel/to/account/thread à partir des
  champs de livraison typés au lieu des ombres `origin`.
  L'assistant partagé `deliveryContextFromSession` et le mappeur session-vers-conversation
  ignorent désormais entièrement `SessionEntry.origin` ; seuls les champs de livraison typés
  et les lignes de conversation relationnelles peuvent créer une identité de route à chaud.
  La normalisation d'entrée de session à l'exécution supprime `origin` avant de persister ou
  de projeter `entry_json`, et les métadonnées entrantes écrivent les champs channel/chat typés
  ainsi que les lignes de conversation relationnelles au lieu de créer de nouvelles ombres d'origine.
- Les événements de transcription, les instantanés de transcription et les événements d'exécution de trajectoire font désormais référence à la racine `sessions` canonique par agent et sont en cascade lors de la suppression de la session. Les lignes d'identité/idempotence de la transcription continuent d'être en cascade à partir de la ligne d'événement de transcription exacte.
- Les index de mémoire-core utilisent désormais des tables de base de données d'agent explicites `memory_index_meta`, `memory_index_sources`, `memory_index_chunks` et `memory_embedding_cache` ; les index secondaires FTS/vectoriels facultatifs utilisent le même préfixe `memory_index_*` au lieu des tables génériques `meta`, `files`, `chunks` ou `chunks_vec`. `memory_index_sources` est indexé par `(source_kind, source_key)` et porte une propriété `session_id` facultative, de sorte que les sources et les chunks dérivés de la session sont en cascade lors de la suppression d'une session. Les intégrations de chunk mises en cache sont stockées sous forme de BLOB SQLite Float32, et non sous forme de tableaux de texte JSON. Ces tables constituent un cache de recherche/dérivé, et non un stockage de transcription canonique ; elles peuvent être supprimées et reconstruites à partir de `sessions`, `transcript_events` et des fichiers de l'espace de travail mémoire.
- L'état de récupération de l'exécution du sous-agent réside désormais dans des lignes `subagent_runs` partagées typées avec des clés de session enfant, demandeur et contrôleur indexées. L'ancien fichier `subagents/runs.json` sert uniquement d'entrée pour la migration du docteur.
- Les liaisons de conversation actuelles résident désormais dans des lignes `current_conversation_bindings` partagées typées indexées par l'ID de conversation normalisé, avec des colonnes d'agent/session cibles, le type de conversation, l'état, l'expiration et les métadonnées stockés sous forme de colonnes relationnelles au lieu d'un enregistrement de liaison opaque en double. La clé de liaison durable inclut le type de conversation normalisé afin que les références direct/group/channel ne puissent pas entrer en collision, et SQLite rejette les valeurs invalides de type/état de liaison. L'ancien fichier `bindings/current-conversations.json` sert uniquement d'entrée pour la migration du docteur.
- La récupération de la file d'attente de livraison superpose désormais des colonnes de file d'attente typées pour channel, target, account, session, retry, error, platform-send et recovery state sur le replay JSON. `entry_json` conserve les replay payloads, hooks et formatting payload, mais les colonnes typées sont déterminantes pour le routage/état de la file d'attente à chaud.
- Les pointeurs de restauration de la dernière session TUI résident désormais dans des lignes `tui_last_sessions` partagées typées, indexées par la portée de connexion/session TUI hachée. L'ancien fichier JSON TUI est uniquement une entrée pour la migration doctor.
- Les préférences TTS par défaut résident désormais dans des lignes SQLite d'état de plugin partagé, indexées sous le plugin `speech-core`. L'ancien fichier `settings/tts.json` est uniquement une entrée pour la migration doctor ; le runtime ne lit ni n'écrit plus les fichiers JSON de préférences TTS, et le résolveur de chemin legacy réside dans le module de migration doctor.
- Les métadonnées de la cible secrète parlent désormais de magasins au lieu de prétendre que chaque cible d'informations d'identification est un fichier de configuration. `openclaw.json` reste le magasin de configuration ; les cibles de profil d'authentification utilisent des lignes SQLite `auth_profile_stores` typées avec des informations d'identification en forme de provider conservées comme payloads JSON.
- L'audit des secrets ne scanne plus les fichiers `auth.json` `auth.json` par agent retirés. Doctor est responsable de l'avertissement, de l'importation et de la suppression de ce fichier legacy.
- Les assistants de chemin de profil d'authentification legacy résident désormais dans le code legacy de doctor. Les assistants de chemin de profil d'authentification principal exposent les emplacements d'identité et d'affichage du magasin d'authentification SQLite, et non les chemins d'exécution `auth-profiles.json` ou `auth-state.json`.
- Les modules d'exécution de récupération de exécution de sous-agent et de cache de capacités de modèle OpenRouter séparent désormais les lecteurs/rédacteurs de snapshot SQLite des assistants d'importation JSON legacy réservés à doctor. Les capacités OpenRouter utilisent les lignes génériques typées `model_capability_cache` sous `provider_id = "openrouter"` au lieu d'un blob de cache opaque ou d'une table hôte spécifique au provider. L'exécution de sous-agent `taskName` est stockée dans la colonne typée `subagent_runs.task_name` ; la copie `payload_json` sert de données de replay/débogage, et non de source pour l'affichage à chaud ou les champs de recherche.
- `src/agents/filesystem/virtual-agent-fs.sqlite.ts` implémente un SQLite VFS
  sur la table `vfs_entries` de la base de données de l'agent. Les lectures de répertoire, les exports
  récursifs, les suppressions et les renommages utilisent des plages de préfixes `(namespace, path)` indexées
  au lieu de scanner un espace de noms entier ou de s'appuyer sur la correspondance de chemin `LIKE`.
- `src/agents/runtime-worker.entry.ts` crée des magasins VFS SQLite par exécution, d'artefacts d'outil,
  d'artefacts d'exécution et de cache délimité pour les workers.
- Les marqueurs d'achèvement de l'amorçage de l'espace de travail résident désormais dans des lignes partagées typées
  `workspace_setup_state` indexées par le chemin de l'espace de travail résolu au lieu de
  `.openclaw/workspace-state.json` ; le runtime ne lit plus ni ne réécrit le
  marqueur d'espace de travail hérité, et les API d'aide ne transmettent plus un faux chemin
  `.openclaw/setup-state` simplement pour dériver l'identité de stockage.
- Les approbations d'exécution résident désormais dans la ligne singleton `exec_approvals_config`
  SQLite partagée typée. Doctor importe le `~/.openclaw/exec-approvals.json` hérité ;
  les écritures du runtime ne créent, ne réécrivent plus ni ne signalent ce fichier comme son emplacement
  de stockage actif. Le compagnon macOS lit et écrit la même ligne
  de table `state/openclaw.sqlite` ; il ne conserve sur le disque que le socket de l'invite Unix
  car c'est de l'IPC, et non un état d'exécution durable.
- L'identité de l'appareil, l'authentification de l'appareil et les modules d'exécution de l'amorçage gardent désormais leurs
  lecteurs/rédacteurs de captures instantanées SQLite séparés des helpers d'importation JSON hérités propres à Doctor. L'identité de l'appareil utilise des lignes typées `device_identities` et les jetons d'authentification
  de l'appareil utilisent des lignes typées `device_auth_tokens`. Les écritures de l'authentification de l'appareil réconcilient les lignes
  par appareil/rôle au lieu de tronquer la table des jetons, et le runtime ne route
  plus les mises à jour de jeton unique via l'ancien adaptateur de magasin entier. Les charges utiles JSON
  de version 1 héritées n'existent que comme formes d'importation/exportation de Doctor.
- Le cache d'échange de jetons GitHub Copilot utilise la table d'état du plugin SQLite partagée
  sous `github-copilot/token-cache/default`. C'est un état de cache détenu par le provider,
  il n'ajoute donc pas intentionnellement de table de schéma hôte.
- GitHub Copilot compaction n'écrit plus les GitHub`openclaw-compaction-*.json`RPCOpenClaw
  sidecars de l'espace de travail. Le harnais appelle le RPC de compactage de l'historique du SDK pour la
  session SDK suivie, et OpenClaw conserve l'état durable de session/transcription dans
  SQLite au lieu des fichiers marqueurs de compatibilité.
- Le runtime Swift partagé (`OpenClawKit`) utilise les mêmes
  `state/openclaw.sqlite`macOS lignes pour l'identité de l'appareil et l'authentification de l'appareil. Les assistants d'application macOS
  importent les assistants SQLite partagés au lieu de posséder un second chemin JSON ou
  SQLite. Un fichier hérité `identity/device.json`Android restant bloque la création de l'identité
  jusqu'à ce que doctor l'importe dans SQLite, correspondant à la porte de démarrage TypeScript et Android.
- L'identité de l'appareil Android utilise le même matériel de clé compatible TypeScript
  stocké dans des Android`state/openclaw.sqlite#table/device_identities` lignes typées. Il ne lit jamais
  et n'écrit jamais `openclaw/identity/device.json` ; un fichier hérité restant bloque
  le démarrage jusqu'à ce que doctor l'importe dans SQLite.
- Les jetons d'authentification d'appareil mis en cache sur Android utilisent également des
  Android`state/openclaw.sqlite#table/device_auth_tokens` lignes typées et partagent la même
  sémantique de jeton version-1 que TypeScript et Swift. Le runtime ne lit plus les `SecurePrefs`
  `gateway.deviceToken*` clés de compatibilité ; celles-ci appartiennent uniquement à la logique de migration/doctor.
- L'historique des packages récents des notifications Android utilise des
  Android`android_notification_recent_packages` lignes typées. Le runtime ne migre plus
  ni ne lit les anciennes clés CSV SharedPreferences.
- La création de l'identité de l'appareil échoue de manière fermée lorsque le `identity/device.json` hérité
  existe, lorsque la ligne d'identité SQLite est invalide, ou lorsque le magasin d'identité
  SQLite ne peut pas être ouvert. Doctor importe et supprime d'abord ce fichier, afin que le démarrage
  du runtime ne puisse pas faire pivoter silencieusement l'identité d'appairement avant la migration.
- La sélection de l'identité de l'appareil est une clé de ligne SQLite, pas un localisateur de fichier JSON. Les tests
  et les assistants de passerelle transmettent des clés d'identité explicites ; seule la migration doctor et la
  porte de démarrage fermée par défaut connaissent le nom de fichier `identity/device.json` retiré.
- La compatibilité de la réinitialisation de session réside désormais dans la migration de la configuration du docteur :
  `session.idleMinutes` est déplacé dans `session.reset.idleMinutes`,
  `session.resetByType.dm` est déplacé dans `session.resetByType.direct`, et la
  stratégie de réinitialisation de l'exécution ne lit que les clés de réinitialisation canoniques.
- La compatibilité de l'ancienne configuration réside désormais sous `src/commands/doctor/`. La validation
  `readConfigFileSnapshot()` normale n'importe pas les détecteurs d'héritage du docteur
  ni n'annote les problèmes d'héritage ; `runDoctorConfigPreflight()` ajoute ces problèmes pour
  la réparation/le rapport du docteur. Le flux de configuration du docteur importe
  `src/commands/doctor/legacy-config.ts`OAuth, et la réparation de l'ancien id de profil OAuth réside
  sous
  `src/commands/doctor/legacy/oauth-profile-ids.ts`.
- Les commandes autres que le docteur n'exécutent pas automatiquement la réparation de l'ancienne configuration. Par exemple,
  `openclaw update --channel` échoue désormais sur une ancienne configuration non valide et demande à
  l'utilisateur d'exécuter le docteur, plutôt que d'importer silencieusement le code de migration du docteur.
- Web push, APNs, Voice Wake, les vérifications de mise à jour et la santé de la configuration utilisent désormais des tables SQLite partagées typées
  pour les abonnements, les clés VAPID, les enregistrements de nœuds, les lignes de déclencheur,
  les lignes de routage, l'état des notifications de mise à jour et les entrées de santé de la configuration au lieu de
  blobs JSON opaques entiers. Les écritures de instantané Web push et APNs réconcilient désormais
  les abonnements/enregistrements par clé primaire au lieu d'effacer leurs tables ;
  la santé de la configuration fait de même par chemin de configuration.
  Leurs modules d'exécution gardent les lecteurs/rédacteurs d'instantanés SQLite séparés des
  assistants d'import JSON d'héritage réservés au docteur.
- La configuration de l'hôte de nœud utilise désormais une ligne singleton typée dans la base de données SQLite partagée ;
  le docteur importe l'ancien fichier `node.json` avant l'utilisation normale de l'exécution.
- L'appareillage appareil/nœud, l'appareillage channel, les listes d'autorisation channel et l'état d'amorçage
  utilisent désormais des lignes SQLite typées au lieu de blobs JSON opaques entiers. Les approbations
  de liaison de plug-in et l'état des tâches cron suivent la même répartition : les modules d'exécution exposent
  des opérations soutenues par SQLite et des assistants d'instantané neutres, et les écritures d'instantané d'appareillage/d'amorçage
  plus d'approbation de liaison de plug-in réconcilient les lignes par clé primaire
  au lieu de tronquer les tables, tandis que le docteur importe/supprime les anciens fichiers JSON via
  les modules `src/commands/doctor/legacy/*`.
- Les enregistrements des plugins installés résident désormais dans l'index des plugins installés SQLite.
  La lecture/écriture de la configuration d'exécution ne migre plus et ne préserve plus les anciennes
  données de configuration `plugins.installs` ; le docteur importe cette forme de configuration héritée
  dans SQLite avant une utilisation normale en exécution.
- Les instantanés de récupération des identifiants QQBot résident désormais dans l'état du plugin SQLite sous
  `qqbot/credential-backups`. L'exécution n'écrit plus
  `qqbot/data/credential-backup*.json` ; le docteur importe et supprime ces
  fichiers de sauvegarde hérités avec les autres entrées d'état QQBot.
- La planification du rechargement du Gateway compare les instantanés de l'index des plugins installés SQLite sous
  un espace de noms de diff interne `installedPluginIndex.installRecords.*`. Les décisions de rechargement
  lors de l'exécution n'enveloppent plus ces lignes dans de faux objets de configuration `plugins.installs`.
- La mise à niveau des identifiants de compte nommé du Matrix ne se produit plus pendant les lectures
  lors de l'exécution. Le docteur gère l'ancien renommage `credentials/matrix/credentials.json`
  de niveau supérieur lorsqu'un compte Matrix unique/défaut peut être résolu.
- Les modules d'exécution centraux d'appairage et de cron n'exportent plus les constructeurs de chemins JSON hérités.
  Les modules hérités possédés par le docteur construent des chemins source `pending.json`, `paired.json`,
  `bootstrap.json` et `cron/jobs.json` uniquement pour les tests d'importation et
  la migration. La normalisation de la forme des tâches cron héritées et l'importation des journaux d'exécution cron
  résident sous `src/commands/doctor/legacy/cron*.ts`.
- `src/commands/doctor/legacy/runtime-state.ts` importe les fichiers d'état JSON hérités,
  y compris la configuration de l'hôte de nœud, dans SQLite depuis le docteur. Les nouveaux importateurs de fichiers hérités
  restent sous `src/commands/doctor/legacy/`.
- `src/commands/doctor/state-migrations.ts` importe les transcriptions héritées `sessions.json` et
  `*.jsonl` directement dans SQLite et supprime les sources réussies. Il
  ne met plus en intermédiaire les transcriptions héritées racine via
  `agents/<agentId>/sessions/*.jsonl` ou ne crée plus de cible JSONL canonique avant
  l'importation.
- Les contrôles du docteur d'intégrité de l'état ne scannent plus les répertoires de session hérités ni
  ne proposent la suppression de JSONL orphelins. Les fichiers de transcription hérités sont uniquement des entrées de migration,
  et l'étape de migration gère l'importation ainsi que la suppression de la source.
- L'importation de l'ancien registre de bac à sable réside sous `src/commands/doctor/legacy/sandbox-registry.ts` ; les lectures et écritures du registre de bac à sable actif restent exclusivement sous SQLite.
- La réparation de l'état et de l'importation des anciennes transcriptions de session réside sous `src/commands/doctor/legacy/session-transcript-health.ts` ; les modules de commandes d'exécution ne contiennent plus de code d'analyse de transcription JSONL ni de réparation de branche active.

Points saillants de la consolidation/suppression terminée :

- L'état des plugins utilise désormais la base de données partagée `state/openclaw.sqlite`. L'ancien importateur sidecar `plugin-state/state.sqlite` local à la branche a été supprimé car cette disposition SQLite n'a jamais été publiée. Les assistants de sonde/test signalent le `databasePath` partagé au lieu d'exposer un chemin SQLite spécifique à l'état du plugin.
- Les tables d'exécution de tâches et de flux de tâches résident désormais dans la base de données partagée `state/openclaw.sqlite` au lieu de `tasks/runs.sqlite` et `tasks/flows/registry.sqlite` ; les anciens importateurs sidecar ont été supprimés pour la même raison de disposition non publiée.
- `src/config/sessions/store.ts` n'a plus besoin de `storePath`CLI pour les métadonnées entrantes, les mises à jour d'itinéraire ou les lectures de mise à jour. La persistance des commandes, le nettoyage de session CLI, la profondeur des sous-agents, les substitutions d'authentification et l'identité de session de transcription utilisent les API de lignes agent/session. Les écritures sont appliquées sous forme de correctifs de lignes SQLite avec une nouvelle tentative en cas de conflit optimiste.
- La résolution de la cible de session expose désormais des cibles de base de données par agent, et non les chemins d'ancien `sessions.json`. La passerelle partagée, les métadonnées ACP, la réparation d'itinéraire du médecin et `openclaw sessions` énumèrent `agent_databases` ainsi que les agents configurés.
- Le routage de session de la passerelle utilise désormais Gateway`resolveGatewaySessionDatabaseTarget` ; la cible renvoyée transporte `databasePath` et les clés de lignes SQLite candidates au lieu d'un chemin de fichier de magasin de session de l'ancien format.
- Les types d'exécution de session de canal exposent désormais `{agentId, sessionKey}` pour les lectures de mise à jour, les métadonnées entrantes et les mises à jour du dernier itinéraire. L'ancien type de compatibilité `saveSessionStore(storePath, store)` a disparu.
- Le runtime du plugin, l'API d'extension et les surfaces de module API`config/sessions` orientent désormais
  le code du plugin vers les assistants de ligne de session soutenus par SQLite. Les exportations de compatibilité
  de la bibliothèque racine (`loadSessionStore`, `saveSessionStore`, `resolveStorePath`) restent des
  shim obsolètes pour les consommateurs existants. L'ancien assistant
  `resolveLegacySessionStorePath` a disparu ; la construction
  de chemin héritée `sessions.json` est désormais locale aux migrations et aux appareils de test.
- `src/config/sessions/session-entries.sqlite.ts` stocke désormais les entrées de session canoniques
  dans la base de données par agent et prend en charge les correctifs de lecture/mise à jour/suppression au niveau de la ligne. Les opérations d'exécution upsert/patch/delete ne scannent plus les variantes de casse
  ni ne nettoient les clés d'alias héritées ; doctor gère la canonisation. L'assistant
  d'importation JSON autonome a disparu, et la migration fusionne les lignes plus récentes via upsert
  au lieu de remplacer toute la table de session. Les assistants publics de lecture/liste/chargement
  projettent les métadonnées de session active à partir des lignes typées `sessions` et `conversations` ;
  `entry_json` est une ombre de compatibilité/débogage et peut être obsolète ou invalide
  sans perdre l'identité de session typée ni le contexte de livraison.
- `src/config/sessions/delivery-info.ts` résout désormais le contexte de livraison à partir des
  lignes typées par agent `sessions` + `conversations` + `session_conversations`.
  Il ne reconstruit plus l'identité de livraison d'exécution à partir de
  `session_entries.entry_json` ; une ligne de conversation typée manquante est un problème
  de migration/réparation du doctor, et non un repli d'exécution.
- Les décisions de réinitialisation de session stockée préfèrent désormais les métadonnées typées `sessions.session_scope`,
  `sessions.chat_type` et `sessions.channel`. L'analyse
  `sessionKey` ne reste que pour les suffixes de fil/discussion explicites sur les cibles de commande ; la classification de réinitialisation groupe vs direct
  ne provient plus de la forme de la clé.
- La classification de l'affichage de liste/statut de session utilise désormais les métadonnées de discussion typées et
  le type de session de la passerelle. Elle ne traite plus les sous-chaînes `:group:` ou `:channel:`
  à l'intérieur de `session_key` comme une vérité durable groupe/direct.
- La sélection de la politique de réponse silencieuse utilise désormais uniquement le type de conversation explicite ou les métadonnées de surface. Elle ne devine plus la politique directe/de groupe à partir des sous-chaînes `session_key`.
- La résolution du modèle d'affichage de session reçoit désormais l'identifiant de l'agent à partir de la cible de base de données de session SQLite au lieu de l'extraire de `session_key`.
- L'hydratation de la cible d'annonce agent-à-agent utilise désormais uniquement des `sessions.list` `deliveryContext` typés. Elle ne récupère plus le routage channel/account/thread à partir de `origin` hérité, des champs `last*` mis en miroir, ou de la forme `session_key`.
- Le rejet de cible de thread `sessions_send` lit désormais les métadonnées de routage SQLite typées. Il ne rejette plus ni n'accepte les cibles en analysant les suffixes de thread à partir de la clé de cible.
- La validation de la politique d'outil à portée de groupe lit désormais le routage de conversation SQLite typé pour la session actuelle ou générée. Elle ne fait plus confiance à l'identité group/channel en décodant `sessionKey` ; les identifiants de groupe fournis par l'appelant sont ignorés lorsqu'aucune ligne de session typée ne les atteste.
- La correspondance de substitution de modèle de canal utilise désormais les métadonnées de groupe et de conversation parent explicites. Elle ne décode plus les identifiants de conversation parent à partir de `parentSessionKey`.
- L'héritage de substitution de modèle stocké nécessite désormais une clé de session parent explicite à partir du contexte de session typé. Il ne dérive plus les substitutions parentes à partir des suffixes `:thread:` ou `:topic:` dans `sessionKey`.
- L'ancien wrapper d'informations de thread de session et l'analyseur de thread de plugin chargé ont disparu ; aucun code d'exécution n'importe `config/sessions/thread-info`.
- Le helper de conversation de canal n'expose plus de ponts d'analyse de clé de session complète. Core normalise toujours les identifiants de conversation bruts détenus par le fournisseur via `resolveSessionConversation(...)`, mais il ne reconstruit pas les faits de routage à partir de `sessionKey`.
- La livraison des complétions, la politique d'envoi et la maintenance des tâches ne dérivent plus le type de chat à partir de la forme `session_key`. L'ancien analyseur de clé de type de chat a été supprimé ; ces chemins nécessitent des métadonnées de session typées, un contexte de livraison typé ou un vocabulaire de cible de livraison explicite.
- La liste/le statut des sessions, les diagnostics, la liaison du compte d'approbation, le filtrage du rythme TUI et les résumés d'utilisation n'extraient plus TUI`SessionEntry.origin` pour le routage fournisseur/compte/fil/affichage. Les seules lectures d'exécution `origin` restantes concernent des concepts hors session ou des objets de livraison du tour actuel.
- La recherche de conversation native de demande d'approbation lit désormais les lignes de routage de session typées par agent. Elle n'analyse plus l'identité de conversation canal/groupe/fil à partir de `sessionKey` ; l'absence de métadonnées typées est un problème de migration/réparation.
- Les payloads d'événement de session modifiée/chat/session du Gateway ne répercutent plus les ombres de route `SessionEntry.origin` ou `last*` ; les clients reçoivent des objets typés `channel`, `chatType` et `deliveryContext`.
- La résolution de livraison des rythmes peut désormais recevoir l'objet SQLite typé `deliveryContext` directement, et l'exécution des rythmes transmet la ligne de livraison de session par agent au lieu de s'appuyer sur les ombres de compatibilité `session_entries` pour le routage actuel.
- La résolution de la cible de livraison pour l'agent isolé du Cron réhydrate également sa route actuelle à partir de la ligne de livraison de session typée par agent avant de revenir au payload d'entrée de compatibilité.
- La résolution de l'origine d'annonce du sous-agent fait désormais passer le contexte de livraison de la session du demandeur typée via `loadRequesterSessionEntry` et privilégie cette ligne par rapport aux ombres de compatibilité `last*`/`deliveryContext`.
- Les mises à jour des métadonnées de session entrantes fusionnent désormais d'abord avec la ligne de livraison typée par agent ; les anciens champs de livraison `SessionEntry` ne servent de repli que si aucune ligne de conversation typée n'existe.
- L'extraction de livraison de redémarrage/mise à jour permet désormais à la livraison SQLite typée `threadId` de l'emporter sur les fragments sujet/fil analysés depuis `sessionKey` ; l'analyse n'est qu'un repli pour les clés en forme de fil héritées.
- Les identifiants de canal de contexte de l'agent Hook privilégient désormais l'identité de conversation SQLite typée,
  puis les métadonnées de message explicites. Ils n'analysent plus les fragments fournisseur/groupe/canal
  à partir de `sessionKey`.
- L'héritage de route externe `chat.send` du Gateway lit désormais les métadonnées de routage de session SQLite typées au lieu d'inférer la portée canal/direct/groupe à partir des pièces `sessionKey`. Les sessions à portée canal n'héritent que lorsque le canal de session typé et le type de chat correspondent au contexte de livraison stocké ; les sessions partagées principales conservent leur règle plus stricte CLI/sans-métadonnées-client.
- Le réveil de sentinelle de redémarrage et le routage de continuation lisent désormais les lignes de livraison/routage SQLite typées avant la mise en file des réveils de battement de cœur ou des continuations de tour d'agent routées. Ils ne reconstruisent plus le contexte de livraison à partir de l'ombre JSON de l'entrée de session.
- La résolution de contexte `tools.effective` du Gateway lit désormais les lignes de livraison/routage SQLite typées pour les entrées fournisseur, compte, cible, fil et mode de réponse. Elle ne récupère plus ces champs de routage à chaud à partir des ombres d'origine `session_entries.entry_json` périmées.
- Le routage de consultation vocale en temps réel résout désormais la livraison parent/appel à partir des lignes de session SQLite par agent typées. Il ne revient plus aux ombres de compatibilité `SessionEntry.deliveryContext` lors du choix de la route du message de l'agent intégré.
- Le relais de battement de cœur de spawn ACP et le routage du flux parent lisent désormais la livraison parent à partir des lignes de session SQLite typées. Ils ne reconstruisent plus le contexte de livraison parent à partir des ombres de compatibilité de l'entrée de session.
- La préservation de la route de livraison de session suit désormais les métadonnées de chat typées et les colonnes de livraison persistantes. Elle n'extrait plus les indices de canal, les marqueurs direct/principal ou la forme du fil à partir de `sessionKey` ; les routes de discussion Web internes n'héritent d'une cible externe que lorsque SQLite possède déjà une identité de livraison typée/persistée pour la session.
- L'extraction générique de livraison de session lit désormais uniquement la ligne exacte de livraison de session SQLite typée. Elle n'analyse plus les suffixes de fil/sujet ou ne revient pas d'une clé en forme de fil à une clé de session de base.
- L'envoi de réponses, la récupération du sentinel de redémarrage et le routage des consultations vocales en temps réel
  utilisent désormais des lignes de session/conversation SQLite typées exactes pour le routage des fils. Ils
  ne récupèrent plus les identifiants de fils ou le contexte de livraison de session de base en analysant
  les clés de session en forme de fil.
- La limitation de l'historique PI intégrée utilise désormais la projection de routage de session SQLite typée
  (`sessions` + `conversations` primaire) pour le fournisseur, le type de chat,
  et l'identité du pair. Elle n'analyse plus la forme du fournisseur, DM, groupe ou fil
  à partir de `sessionKey`.
- L'inférence de livraison de l'outil Cron utilise désormais une livraison explicite ou le contexte de livraison typé
  actuel uniquement. Elle ne décode plus les cibles de canal, pair, compte ou fil
  à partir de `agentSessionKey`.
- Les lignes de session d'exécution ne portent plus l'ancien alias de route `lastProvider`.
  Les helpers et les tests utilisent des champs typés `lastChannel` et `deliveryContext` ;
  la migration doctor est le seul endroit qui doit traduire les anciens alias de route
  ou les ombres persistées `origin`.
- Les événements de transcription, les lignes VFS et les lignes d'artefacts d'outil écrivent désormais dans la base de données par agent.
  La table de mappage de fichiers de transcription globale non expédiée a disparu ; doctor
  enregistre les chemins source hérités dans les lignes de migration durables à la place.
- La recherche de transcription d'exécution ne scanne plus les décalages d'octets JSONL ou ne sonde plus les fichiers
  de transcription hérités. Les chemins chat/médias/historique du Gateway lisent les lignes de transcription depuis
  SQLite ; le JSONL de session n'est plus désormais qu'une entrée doctor héritée, et non un état d'exécution
  ou un format d'export.
- Les relations parent et branche de la transcription utilisent des métadonnées structurées
  `parentTranscriptScope: {agentId, sessionId}` dans les en-têtes de transcription
  SQLite, et non des chaînes de localisation `agent-db:...transcript_events...` de type chemin.
- Le contrat du gestionnaire de transcription n'expose plus de constructeurs implicites persistés
  `create(cwd)` ou `continueRecent(cwd)`. Les gestionnaires de transcription
  persistés sont ouverts avec une portée explicite `{agentId, sessionId}` ; seuls
  les gestionnaires en mémoire restent sans portée pour les tests et les transformations de transcription pures.
- Les API de stockage des transcriptions d'exécution résolvent la portée SQLite, et non les chemins du système de fichiers. L'ancien assistant `resolve...ForPath` et les options d'écriture inutilisées `transcriptPath` ont disparu des appelants d'exécution.
- La résolution de session d'exécution utilise désormais `{agentId, sessionId}` et ne doit pas dériver de chaînes `sqlite-transcript://<agent>/<session>` pour les limites externes. Les chemins absolus JSONL hérités sont uniquement des entrées de migration du docteur.
- Les enregistrements de pont direct du relais de hook natif résident désormais dans des lignes partagées typées `native_hook_relay_bridges` indexées par l'identifiant du relais. L'exécution n'écrit plus de registre JSON `/tmp` ni d'enregistrements génériques opaques pour ces enregistrements de pont éphémères.
- `runEmbeddedPiAgent(...)` n'a plus de paramètre de localisateur de transcription. Les descripteurs de travail préparés omettent également les localisateurs de transcription. L'état de session d'exécution et les exécutions de suivi en file d'attente transportent `{agentId, sessionId}` au lieu de descripteurs de transcription dérivés.
- La compactage intégré prend désormais la portée SQLite à partir de `agentId` et `sessionId`. Les hooks de compactage, les appels du moteur de contexte, la délégation CLI et les réponses du protocole ne doivent pas recevoir de descripteurs `sqlite-transcript://...` dérivés. Le code d'exportation/débogage peut matérialiser des artefacts utilisateur explicites à partir des lignes, mais il ne fournit pas de chemin d'exportation JSONL de session générique ni ne renvoie les noms de fichiers dans l'identité d'exécution.
- `/export-session` lit les lignes de transcription depuis SQLite et écrit uniquement la vue HTML autonome demandée. La visionneuse intégrée ne reconstruit ni ne télécharge le JSONL de session à partir de ces lignes.
- La délégation du moteur de contexte n'analyse plus de localisateur de transcription pour récupérer l'identité de l'agent. Le contexte d'exécution préparé transporte la `agentId` résolue dans l'adaptateur de compactage intégré.
- La réécriture de transcription et la troncature en direct des résultats d'outils lisent et persistent désormais l'état de transcription par `{agentId, sessionId}` et ne dérivent pas de localisateurs temporaires pour les charges utaires d'événements de mise à jour de transcription.
- La surface d'assistance de l'état de transcription n'a plus de variantes basées sur des localiseurs `readTranscriptState`, `replaceTranscriptStateEvents` ou `persistTranscriptStateMutation`. Les appelants d'exécution doivent utiliser les API `{agentId, sessionId}`. L'importation Doctor lit les fichiers hérités par chemin de fichier explicite et écrit des lignes SQLite ; elle ne migre pas les chaînes de localiseurs.
- Le contrat du gestionnaire de session d'exécution n'expose plus `open(locator)`, `forkFrom(locator)` ou `setTranscriptLocator(...)`. Les gestionnaires de session persistants s'ouvrent uniquement par `{agentId, sessionId}` ; les assistants de liste/fork résident sur les API de session et de point de contrôle orientées ligne au lieu de la façade du gestionnaire de transcription.
- Les API du lecteur de transcription du Gateway sont d'abord basées sur la portée. Elles prennent `{agentId, sessionId}` et n'acceptent pas de localisateur de transcription positionnel qui pourrait accidentellement devenir une identité d'exécution. L'analyse active du localisateur de transcription a disparu ; les chemins source hérités sont lus uniquement par le code d'importation Doctor.
- Les événements de mise à jour de la transcription sont également d'abord basés sur la portée. `emitSessionTranscriptUpdate` n'accepte plus de chaîne de localisateur nue, et les routeurs d'écoute se basent sur `{agentId, sessionId}` sans analyser de handle.
- La diffusion de messages de session du Gateway résout les clés de session à partir de la portée agent/session, et non d'un localisateur de transcription. L'ancien résolveur/cache de localisateur-de-transcription-vers-clé-de-session a disparu.
- Le SSE de l'historique de session du Gateway filtre les mises à jour en direct par portée agent/session. Il ne canonise plus les candidats de localisateur de transcription, les chemins réels ou les identités de transcription en forme de fichier pour décider si un flux doit recevoir une mise à jour.
- Les hooks de cycle de vie de session ne dérivent plus et n'exposent plus de localisateurs de transcription sur `session_end`. Les consommateurs de hooks obtiennent `sessionId`, `sessionKey`, les ID de session suivante et le contexte de l'agent ; les fichiers de transcription ne font pas partie du contrat de cycle de vie.
- Les hooks de réinitialisation ne dérivent plus et n'exposent plus non plus de localisateurs de transcription. La payload `before_reset` transporte les messages SQLite récupérés ainsi que la raison de la réinitialisation, tandis que l'identité de la session reste dans le contexte du hook.
- La réinitialisation du harnais de l'agent n'accepte plus de localisateur de transcript. La répartition de la réinitialisation est délimitée par `sessionId`/`sessionKey` plus la raison.
- Les types de session d'extension d'agent n'exposent plus `transcriptLocator` ; les extensions doivent utiliser le contexte de session et les API d'exécution plutôt que d'accéder à une identité de transcript sous forme de fichier.
- Les hooks de compactage de plugin n'exposent plus les localisateurs de transcript. Le contexte du hook transporte déjà l'identité de la session, et les lectures de transcript doivent passer par des API SQLite sensibles à la portée au lieu de descripteurs de fichiers.
- Les hooks `before_agent_finalize` n'exposent plus `transcriptPath`, y compris les charges utiles de relais de hook natif. Les hooks de finalisation utilisent uniquement le contexte de session.
- Les réponses de réinitialisation du Gateway ne synthétisent plus de localisateur de transcript sur l'entrée renvoyée. La réinitialisation crée des lignes de transcript SQLite, renvoie l'entrée de session propre, et laisse l'accès au transcript aux lecteurs sensibles à la portée.
- Les résultats d'exécution intégrée et de compactage n'exposent plus de localisateurs de transcript pour la comptabilité de session. Le compactage automatique met à jour uniquement le `sessionId` actif, les compteurs de compactage et les métadonnées de jetons.
- Les résultats de tentative intégrée ne renvoient plus `transcriptLocatorUsed`, et les résultats `compact()` du moteur de contexte ne renvoient plus de localisateurs de transcript. Les boucles de réessai d'exécution n'acceptent qu'un `sessionId` successeur.
- Les résultats d'ajout de transcript de miroir de livraison ne renvoient plus de localisateurs de transcript. Les appelants obtiennent le `messageId` ajouté ; les signaux de mise à jour de transcript utilisent la portée SQLite.
- Les assistants de bifurcation de session parent ne renvoient que le `sessionId` bifurqué. La préparation du sous-agent passe la portée de l'agent/session enfant aux moteurs.
- Les paramètres du runner CLI et le réensemencement de l'historique n'acceptent plus de localisateurs de transcript. Les lectures de l'historique CLI résolvent la portée du transcript SQLite à partir de `{agentId, sessionId}` et du contexte de clé de session.
- Les fixtures de test du CLI et de l'exécuteur intégré (embedded-runner) initialisent et lisent désormais les lignes de transcriptions SQLite par ID de session au lieu de prétendre que les sessions actives sont des fichiers CLI`*.jsonl` ou de transmettre une chaîne `sqlite-transcript://...` via les paramètres d'exécution.
- Les événements de garde des résultats d'outil (tool-result) de session sont émis depuis le périmètre de session connu, même lorsqu'un gestionnaire en mémoire n'a pas de localisateur dérivé. Ses tests ne simulent plus de fichiers de transcription `/tmp/*.jsonl` actifs.
- Les assistants BTW et de point de vérification de compaction (compaction-checkpoint) lisent et forkent désormais les lignes de transcription par périmètre SQLite. Les métadonnées du point de vérification stockent désormais uniquement les ID de session et les ID de feuille/entrée ; les localisés dérivés ne sont plus écrits dans les charges utiles du point de vérification.
- La recherche de clé de transcription du Gateway utilise le périmètre de transcription SQLite aux limites du protocole et n'utilise plus de realpath ou de stats sur les noms de fichiers de transcription.
- La rotation automatique des transcriptions par compaction écrit les lignes de transcriptions successeurs directement via le magasin de transcriptions SQLite. Les lignes de session ne gardent que l'identité de session successeur, et non un chemin JSONL durable ou un localisateur persistant.
- La compaction du moteur de contexte intégré (embedded context-engine) utilise des assistants de rotation de transcription nommés SQLite. Les tests de rotation ne construisent plus de chemins successeurs JSONL ou ne modélisent plus les sessions actives comme des fichiers.
- La rétention gérée des images sortantes indexe son cache de messages de transcription à partir des statistiques de transcription SQLite au lieu des appels système de fichiers.
- Les verrous de session d'exécution (runtime) et la voie legacy (doctor) autonome `.jsonl.lock` ont été supprimés.
- Le module d'exécution (runtime barrel) Microsoft Teams et le SDK de plugin public n'exportent plus l'ancien assistant de verrouillage de fichier ; les chemins d'état de plugin durables sont sauvegardés par SQLite.
- Le nettoyage par âge/compte de session et le nettoyage explicite de session ont été supprimés. Doctor possède l'importation legacy ; les sessions obsolètes sont réinitialisées ou supprimées explicitement.
- Les vérifications d'intégrité de Doctor ne comptent plus un fichier JSONL legacy comme une transcription active valide pour une ligne de session SQLite. La santé de la transcription active est exclusive à SQLite ; les fichiers JSONL legacy sont signalés comme entrées de migration/nettoyage d'orphelins.
- Doctor ne traite plus `agents/<agent>/sessions/` comme un état d'exécution requis. Il analyse ce répertoire uniquement lorsqu'il existe déjà, en tant qu'entrée d'importation legacy ou de nettoyage d'orphelins.
- Gateway Gateway`sessions.resolve`TUI, les chemins de correctif/réinitialisation/compactage de session, le lancement de sous-agents, l'abandon rapide, les métadonnées ACP, les sessions isolées par heartbeat et le correctif TUI ne migrent plus ni n'élaguent les clés de session héritées en tant qu'effet secondaire du travail normal d'exécution.
- La résolution de session de commande CLI renvoie désormais le CLI`agentId` propriétaire au lieu d'un `storePath`, et elle ne copie plus les lignes de session principale héritées lors de la résolution normale `--to` ou `--session-id`. La canonification des lignes principales héritées appartient uniquement au doctor.
- La résolution de profondeur de sous-agent lors de l'exécution ne lit plus les magasins de session `sessions.json` ou JSON5. Elle lit les `session_entries` SQLite par identifiant d'agent, et les métadonnées de profondeur/session héritées ne peuvent entrer que par le chemin d'importation du doctor.
- Les remplacements de session du profil d'authentification persistent via des upserts directs de lignes `{agentId, sessionKey}` au lieu du chargement différé d'un runtime de magasin de session en forme de fichier.
- La filtration verbeuse de réponse automatique et les assistants de mise à jour de session lisent désormais/mettent à jour via upsert les lignes de session SQLite par identité de session et ne nécessitent plus de chemin de magasin hérité avant de toucher l'état persistant des lignes.
- Les assistants de métadonnées de session d'exécution de commande utilisent désormais des noms et des chemins de module orientés entrée ; l'ancienne surface d'assistance de commande `session-store` a été supprimée.
- L'amorçage de l'en-tête (seeding) et le durcissement de la limite de compactage manuel modifient désormais directement les lignes de transcription SQLite. Les appelants d'exécution passent l'identité de session, non les chemins `.jsonl` inscriptibles.
- La relecture silencieuse par rotation de session copie les tours récents utilisateur/assistant par `{agentId, sessionId}` à partir des lignes de transcription SQLite. Elle n'accepte plus les localisateurs de transcription source ou cible.
- Les nouvelles lignes de session d'exécution ne stockent plus les localisateurs de transcription. Les appelants utilisent directement `{agentId, sessionId}` ; les commandes d'exportation/débogage peuvent choisir les noms de fichiers de sortie lorsqu'ils matérialisent les lignes.
- Le démarrage d'une nouvelle session de transcription persistante ouvre désormais toujours les lignes SQLite par portée. Le gestionnaire de session ne réutilise plus un chemin ou un localisateur de transcription de l'époque des fichiers précédent comme identité pour la nouvelle session.
- Les sessions de transcriptions persistantes utilisent l'API explicite `openTranscriptSessionManagerForSession({agentId, sessionId})`API. Les anciennes façades statiques `SessionManager.create/openForSession/list/forkFromSession` ont disparu, ce qui empêche les tests et le code d'exécution de recréer accidentellement la découverte de sessions de l'époque des fichiers.
- Le runtime du plugin n'expose plus `api.runtime.agent.session.resolveTranscriptLocatorPath` ; le code du plugin utilise les assistants de ligne SQLite et les valeurs de portée.
- La surface du SDK public `session-store-runtime` n'exporte désormais que les assistants de ligne de session et de transcription. Les assistants bruts d'ouverture/chemin, de fermeture et de réinitialisation de base de données SQLite résident dans la surface du SDK ciblée `sqlite-runtime`, de sorte que les tests des plugins n'utilisent plus le baril de test large obsolète pour le nettoyage de la base de données.
- Les anciens classificateurs de noms de fichiers de trajectoire/checkpoint `.jsonl` résident désormais dans le module de fichiers de session hérité du docteur. La validation centrale des sessions n'importe plus les assistants d'artefacts de fichiers pour déterminer les identifiants de session SQLite normaux.
- Les exécutions de sous-agents bloquantes en mémoire active utilisent des lignes de transcription SQLite au lieu de créer des fichiers `session.jsonl` temporaires ou persistants sous l'état du plugin. L'ancienne option `transcriptDir` a été supprimée.
- La génération ponctuelle de slugs et les exécutions du planificateur Crestodian utilisent des lignes de transcription SQLite au lieu de créer des fichiers `session.jsonl` temporaires.
- Les exécutions d'assistance `llm-task` et l'extraction d'engagement masquée utilisent également des lignes de transcription SQLite, de sorte que ces sessions d'assistance uniquement modèles ne créent plus de fichiers de transcription temporaires JSON/JSONL.
- `TranscriptSessionManager` n'est plus désormais qu'une portée de transcription SQLite ouverte. Le code d'exécution l'ouvre avec `openTranscriptSessionManagerForSession({agentId, sessionId})` ; les flux de création, de branchement, de continuation, de liste et de bifurcation résident dans leurs assistants de ligne SQLite propriétaires plutôt que dans des façades de gestionnaire statiques. Le code de docteur/importation/débogage gère les fichiers sources hérités explicites en dehors du gestionnaire de sessions d'exécution.
- Les méthodes de façade obsolètes `SessionManager.newSession()` et `SessionManager.createBranchedSession()` ont été supprimées. Les nouvelles sessions et les descendants de transcriptions sont créés par leur flux de travail SQLite propriétaire au lieu de faire muter un gestionnaire déjà ouvert en une session persistante différente.
- Les décisions de fork de transcription parent et la création de fork n'acceptent plus
  `storePath` ou `sessionsDir` ; ils utilisent `{agentId, sessionId}` SQLite
  portée de transcription au lieu des métadonnées de chemin de système de fichiers conservées.
- Memory-host n'exporte plus les assistants de classification de transcription de répertoire de session no-ops ;
  le filtrage des transcriptions dérive désormais des métadonnées de ligne SQLite
  lors de la construction de l'entrée.
- Les tests d'exportation de session Memory-host et QMD utilisent des portées de transcription SQLite. Les anciens
  chemins `agents/<agentId>/sessions/*.jsonl` ne restent couverts que là où un test
  prouve intentionnellement la compatibilité doctor/import/export.
- L'inspection de session brute du QA-lab utilise désormais `sessions.list` via la passerelle
  au lieu de lire `agents/qa/sessions/sessions.json` ; les commentaires MSteams
  s'ajoutent directement aux transcriptions SQLite sans fabriquer de chemin JSONL.
- Les tours de canal entrant partagés transportent désormais `{agentId, sessionKey}` plutôt qu'un
  `storePath` hérité. Les chemins d'enregistrement LINE, WhatsApp, Slack, Discord, Telegram, Matrix, Signal,
  iMessage, BlueBubbles, Feishu, Google Chat, IRC, Nextcloud Talk, Zalo,
  Zalo Personal, QA Channel, Microsoft Teams, Mattermost, Synology Chat, Tlon,
  Twitch et QQBot lisent désormais les métadonnées de mise à jour et enregistrent
  les lignes de session entrantes via l'identité SQLite.
- La persistance du localisateur de transcription est supprimée des lignes de session actives.
  `resolveSessionTranscriptTarget` renvoie `agentId`, `sessionId` et des métadonnées
  de sujet optionnelles ; doctor est le seul code qui importe les noms de fichiers
  de transcription hérités.
- Les en-têtes de transcription d'exécution commencent à la version SQLite `1`. Les mises à niveau de forme JSONL V1/V2/V3
  héritées ne vivent que dans l'importation doctor et normalisent les en-têtes importés vers
  la version actuelle de transcription SQLite avant que les lignes ne soient stockées.
- La garde de priorité à la base de données interdit désormais `SessionManager.listAll` et
  `SessionManager.forkFromSession` ; les workflows de listage de session et de bifurcation/restauration
  doivent rester sur les API SQLite par ligne/étendue.
- La garde interdit également les noms d'assistants d'analyse JSONL et de réparation de branche active des transcriptions héritées en dehors du code doctor/import, afin que l'exécution ne puisse pas développer un deuxième chemin de migration de transcription hérité.
- Les exécutions PI intégrées rejettent les handles de transcription entrants. Elles utilisent l'identité SQLite
  `{agentId, sessionId}` avant le lancement du worker et à nouveau avant que
  la tentative ne touche à l'état de la transcription. Une entrée `/tmp/*.jsonl` périmée ne peut pas sélectionner une
  cible d'écriture de l'exécution.
- Les enregistrements de trace du cache, de payload Anthropic, de flux brut et de la chronologie de diagnostic
  écrivent désormais dans des lignes SQLite `diagnostic_events` typées. Les bundles de stabilité Gateway
  écrivent désormais dans des lignes SQLite `diagnostic_stability_bundles` typées. Les anciens chemins de substitution
  `diagnostics.cacheTrace.filePath`, `OPENCLAW_CACHE_TRACE_FILE`,
  `OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE` et
  `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` JSONL sont supprimés, et
  la capture de stabilité normale n'écrit plus de fichiers `logs/stability/*.json`.
- La persistance Cron réconcilie désormais les lignes SQLite `cron_jobs` au lieu de
  supprimer/réinsérer toute la table des tâches à chaque enregistrement. Les réécritures des cibles de plugin
  mettent à jour directement les lignes cron correspondantes et maintiennent l'état cron de l'exécution dans
  la même transaction de base de données d'état.
- Les appelants de l'exécution Cron utilisent désormais une clé de magasin Cron SQLite stable. Les chemins
  `cron.store` hérités sont des entrées d'importation doctor uniquement ; les chemins de réécriture de la cible de production Telegram,
  de maintenance des tâches, de statut, de journal d'exécution et de la cible Telegram utilisent
  `resolveCronStoreKey` et ne normalisent plus le chemin de la clé. Le statut Cron rapporte désormais
  `storeKey` plutôt que l'ancien champ en forme de fichier `storePath`.
- Le chargement et la planification de l'exécution Cron ne normalisent plus les formes de tâches persistantes héritées
  telles que `jobId`, `schedule.cron`, `atMs` numériques, booléens sous forme de chaîne, ou
  `sessionTarget` manquants. L'importation héritée du Doctor gère ces réparations avant que les lignes
  ne soient insérées dans SQLite.
- ACP spawn ne résout plus ni ne persiste les chemins de fichiers JSONL de transcription. Spawn et la configuration du thread-bind persistent directement la ligne de session SQLite et conservent l'identifiant de session comme identité de transcription retenue.
- Les API de métadonnées de session ACP lisent/listent/mettent à jour (upsert) désormais les lignes SQLite par `agentId` et n'exposent plus `storePath` dans le cadre du contrat d'entrée de session ACP.
- La comptabilisation de l'utilisation de session et l'agrégation de l'utilisation du Gateway résolvent désormais les transcription uniquement par `{agentId, sessionId}`. Le cache de coût/utilisation et les résumés de sessions découvertes ne synthétisent ni ne retournent de chaînes de localisateur de transcription.
- L'ajout (append) de chat du Gateway, la persistance d'abandon partiel, Gateway`/sessions.send`, et les écritures de transcription média du webchat s'ajoutent directement via la portée (scope) de transcription SQLite. La fonctionnalité d'aide à l'injection de transcription du Gateway n'accepte plus de paramètre `transcriptLocator`.
- La découverte de transcription SQLite liste désormais uniquement les portées (scopes) et les statistiques des transcriptions : `{agentId, sessionId, updatedAt, eventCount}`. La fonctionnalité d'aide à la compatibilité morte `listSqliteSessionTranscriptLocators` et le champ par ligne `locator` ont disparu.
- Le runtime de réparation de transcription expose désormais uniquement `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`. L'ancienne fonctionnalité d'aide à la réparation basée sur des localisateurs est supprimée ; le code doctor/debug lit des chemins de fichiers source explicites et ne migre jamais les chaînes de localisateurs.
- Le runtime du registre de relecture (replay ledger) ACP stocke désormais les lignes de relecture par session dans la base de données d'état SQLite partagée au lieu de `acp/event-ledger.json` ; doctor importe et supprime l'ancien fichier.
- Les fonctions d'aide de lecture de transcription du Gateway résident désormais dans Gateway`src/gateway/session-transcript-readers.ts` au lieu de l'ancien nom de module `session-utils.fs`. La vérification de l'historique de nouvelle tentative (retry) de secours est nommée pour le contenu de la transcription SQLite au lieu de l'ancienne surface d'aide aux fichiers.
- Les fonctions d'aide de chat injecté et de compactage du Gateway passent désormais la portée (scope) de transcription SQLite via des API d'aide internes au lieu de nommer les valeurs chemins de transcription ou fichiers source.
- La détection de continuation de l'amorçage (bootstrap) vérifie désormais les lignes de transcription SQLite via `hasCompletedBootstrapTranscriptTurn` ; elle n'expose plus de nom de fonctionnalité d'aide de type fichier.
- Les tests de l'exécuteur intégré utilisent désormais l'identité de transcription SQLite, et l'ouverture d'un nouveau gestionnaire de transcription nécessite toujours un `sessionId` explicite.
- Les assistants d'indexation mémoire utilisent désormais la terminologie de transcription SQLite de bout en bout : l'hôte exporte `listSessionTranscriptScopesForAgent` et `sessionTranscriptKeyForScope`, les files de synchronisation ciblées `sessionTranscripts`, les résultats de recherche de session publique exposent des chemins `transcript:<agent>:<session>` opaques, et la clé de source DB interne est `session:<session>` sous `source_kind='sessions'` au lieu d'un faux chemin de fichier.
- L'assistant de déduplication persistante du SDK de plugin générique n'expose plus d'options de forme de fichier. Les appelants fournissent des clés de portée SQLite et les lignes de déduplication durables résident dans l'état partagé du plugin.
- Les jetons SSO et OAuth délégués Microsoft TeamsOAuth ont été déplacés des fichiers JSON verrouillés vers l'état du plugin SQLite. Le Docteur importe `msteams-sso-tokens.json` et `msteams-delegated.json`, reconstruit les clés canoniques de jetons SSO à partir des charges utiles et supprime les fichiers source.
- L'état du cache de synchronisation Matrix a été déplacé de `bot-storage.json` vers l'état du plugin SQLite. Le Docteur importe les charges utiles de synchronisation brutes ou encapsulées héritées et supprime le fichier source. Les clients Matrix et Matrix actifs passent un répertoire racine de magasin de synchronisation SQLite, et non un faux chemin `sync-store.json` ou `bot-storage.json`.
- Le statut de migration de chiffrement hérité Matrix a été déplacé de `legacy-crypto-migration.json` vers l'état du plugin SQLite. Le Docteur importe l'ancien fichier de statut ; les instantanés IndexedDB du SDK Matrix ont été déplacés de `crypto-idb-snapshot.json` vers les blobs du plugin SQLite. Les clés de récupération et les informations d'identification Matrix sont des lignes d'état de plugin SQLite ; leurs anciens fichiers JSON ne servent que d'entrées pour la migration du Docteur.
- Les journaux d'activité du Wiki Mémoire utilisent désormais l'état du plugin SQLite au lieu de `.openclaw-wiki/log.jsonl`. Le fournisseur de migration du Wiki Mémoire importe les anciens journaux JSONL ; le markdown du wiki et le contenu du coffre utilisateur restent sauvegardés par fichier en tant que contenu de l'espace de travail.
- Memory Wiki ne crée plus `.openclaw-wiki/state.json` ou le répertoire inutilisé `.openclaw-wiki/locks`. Le fournisseur de migration supprime ces fichiers de métadonnées de plugin obsolètes si un coffre ancien les possède encore.
- Les entrées d'audit de Crestodian utilisent désormais l'état central du plugin SQLite au lieu de `audit/crestodian.jsonl`. Doctor importe le journal d'audit JSONL hérité et le supprime après une importation réussie.
- Les entrées d'audit d'écriture/observation de configuration utilisent désormais l'état central du plugin SQLite au lieu de `logs/config-audit.jsonl`. Doctor importe le journal d'audit JSONL hérité et le supprime après une importation réussie.
- Le compagnon macOS n'écrit plus de `logs/config-audit.jsonl` ou de fichiers d'accompagnement `logs/config-health.json` locaux à l'application lors de l'édition de `openclaw.json`. Le fichier de configuration reste sauvegardé par fichier, les instantanés de récupération restent à côté du fichier de configuration, et l'état durable d'audit/santé de la configuration appartient au magasin SQLite du Gateway.
- Les approbations en attente de sauvetage de Crestodian utilisent désormais l'état central du plugin SQLite au lieu de `crestodian/rescue-pending/*.json`. Doctor importe les fichiers d'approbation en attente hérités et les supprime après une importation réussie.
- L'état d'armement temporaire du Phone Control utilise désormais l'état du plugin SQLite au lieu de `plugins/phone-control/armed.json`. Doctor importe le fichier d'état armé hérité dans l'espace de noms `phone-control/arm-state` et supprime le fichier.
- Doctor ne répare plus les transcriptions JSONL sur place ni ne crée de fichiers de sauvegarde JSONL. Il importe la branche active dans SQLite et supprime la source héritée.
- La recherche de transcription du hook de mémoire de session utilise des lectures SQLite limitées à la portée `{agentId, sessionId}`. Son assistant n'accepte plus ni ne dérive de localisateurs de transcription, de lectures de fichiers hérités ou d'options de réécriture de fichiers.
- Les liaisons de conversation du serveur d'application Codex indexent désormais l'état du plugin SQLite par la clé de session OpenClaw ou par une portée explicite `{agentId, sessionId}`. Elles ne doivent pas conserver les liaisons de repli basées sur le chemin de transcription.
- Les lectures d'historique miroir du serveur d'application Codex utilisent uniquement la portée de transcription SQLite ; elles ne doivent pas récupérer l'identité à partir des chemins de fichiers de transcription.
- Les chemins de réinitialisation de l'ordre des rôles et de la compactage ne suppriment plus (unlink) les anciens fichiers de transcription ; la réinitialisation ne fait que faire pivoter la ligne de session SQLite et l'identité de la transcription.
- Les réponses de réinitialisation et de point de contrôle du Gateway renvoient des lignes de session propres plus les identifiants de session. Ils ne synthétisent plus les localisateurs de transcripts SQLite pour les clients.
- Le rêve (dreaming) du noyau de mémoire ne nettoie plus les lignes de session en sondant les fichiers JSONL manquants. Le nettoyage des sous-agents passe par l'API d'exécution de session au lieu des vérifications d'existence du système de fichiers. Ses tests d'ingestion de transcripts amorcent directement les lignes SQLite au lieu de créer des appareils `agents/<id>/sessions` ou des espaces réservés de localisateur.
- L'indexation des transcripts de mémoire peut exposer `transcript:<agentId>:<sessionId>` comme un chemin de recherche virtuel pour les assistants de citation/lecture. La source d'index durable est relationnelle (`source_kind='sessions'`, `source_key='session:<sessionId>'`, `session_id=<sessionId>`), donc la valeur n'est pas un localisateur de transcript d'exécution, ni un chemin de système de fichiers, et ne doit jamais être renvoyée dans les API d'exécution de session.
- Le Gateway de l'état de la mémoire du docteur lit les comptes de rappel à court terme et de signaux de phase à partir des lignes d'état du plugin SQLite au lieu de `memory/.dreams/*.json` ; la sortie de la CLI et du docteur étiquette désormais ce stockage comme un magasin SQLite, et non comme un chemin.
- Le runtime du noyau de mémoire, le statut de la CLI, les méthodes du docteur du Gateway et les façades du SDK de plugin n'auditent ni n'archivent plus les fichiers `.dreams/session-corpus` hérités. Ces fichiers ne sont que des entrées de migration ; le docteur les importe dans SQLite et supprime la source après vérification. Les lignes de preuve d'ingestion de session active utilisent désormais le chemin SQLite virtuel `memory/session-ingestion/<day>.txt` ; le runtime n'écrit ni ne dérive d'état à partir de `.dreams/session-corpus`.
- Les artefacts publics du noyau de mémoire exposent les événements de l'hôte SQLite en tant qu'artefact JSON virtuel `memory/events/memory-host-events.json` ; ils ne réutilisent plus le chemin source `.dreams/events.jsonl` hérité.
- Les registres de conteneurs/navigateurs Sandbox utilisent désormais la table partagée
  `sandbox_registry_entries` SQLite avec des colonnes typées pour session, image, horodatage,
  backend/config et port du navigateur. Doctor importe les fichiers de registre JSON monolithiques et
  partitionnés hérités et supprime les sources réussies. Les lectures à l'exécution utilisent
  les colonnes de lignes typées comme source de vérité ; `entry_json` n'est qu'une copie de relecture/débogage.
- Les engagements utilisent désormais une table partagée typée `commitments` au lieu d'un
  blob JSON pour tout le magasin. Les enregistrements de l'instantané (snapshot) effectuent des upserts par ID d'engagement et ne suppriment
  que les lignes manquantes au lieu d'effacer et de réinsérer la table. Le chargement à l'exécution
  récupère les engagements à partir des colonnes typées scope, delivery-window, status, attempt et text ;
  `record_json` n'est qu'une copie de relecture/débogage. Doctor importe l'hérité
  `commitments.json` et le supprime après une importation réussie.
- Les définitions de tâches Cron, l'état de planification et l'historique d'exécution n'ont plus de writers
  ou readers JSON à l'exécution. L'exécution utilise des lignes `cron_jobs` avec des colonnes typées pour schedule,
  payload, delivery, failure-alert, session, status et runtime-state, ainsi que des métadonnées `cron_run_logs` typées
  pour status, diagnostics summary, delivery status/error,
  session/run, model et token totals. `job_json` n'est qu'une copie de relecture/débogage ; `state_json` conserve les
  diagnostics d'exécution imbriqués qui n'ont pas encore de champs de requête à accès rapide, tandis que l'exécution
  réhydrate les champs d'état à accès rapide à partir des colonnes typées. Doctor importe
  les fichiers hérités `jobs.json`, `jobs-state.json` et `runs/*.jsonl` et supprime
  les sources importées. Les retranscriptions d'écriture des plugins mettent à jour les lignes `cron_jobs`
  correspondantes au lieu de charger et de remplacer tout le magasin cron.
- Au démarrage, Doctor et Gateway traduisent le webhook de secours hérité `notify: true`
  en une livraison SQLite explicite avant que le planificateur ne s'exécute. Les tâches qui
  annoncent déjà à une chat conservent cette livraison et reçoivent un webhook
  `completionDestination` ; les tâches sans `cron.webhook` sont signalées pour une réparation
  manuelle.
- Les files d'attente de livraison sortante et de session stockent désormais le statut de la file, le type d'entrée, la clé de session, le canal, la cible, l'identifiant du compte, le nombre de tentatives, la dernière tentative/erreur, l'état de récupération et les marqueurs d'envoi de plateforme en tant que colonnes typées dans la table partagée `delivery_queue_entries`. La récupération à l'exécution lit ces champs à accès fréquent depuis les colonnes typées, et les mutations de nouvelle tentative/récupération mettent à jour ces colonnes directement sans réécrire le JSON de rejeu. La charge utile JSON complète ne reste que comme blob de rejeu/débogage pour les corps de message et d'autres données de rejeu à accès peu fréquent.
- Les enregistrements d'images sortantes gérés utilisent désormais des lignes typées partagées `managed_outgoing_image_records` avec les octets du média toujours stockés dans `media_blobs`. L'enregistrement JSON ne reste que comme une copie de rejeu/débogage.
- Les préférences du sélecteur de modèle de Discord, les hachages de déploiement de commandes et les liaisons de fils utilisent désormais l'état partagé du plugin SQLite. Leurs plans d'importation JSON hérités résident dans l'interface de configuration/migration du doctor du plugin Discord, et non dans le code de migration central.
- Les détecteurs d'importation hérités de plugins utilisent des modules nommés par le doctor tels que `doctor-legacy-state.ts` ou `doctor-state-imports.ts` ; les modules d'exécution de canal normaux ne doivent pas importer de détecteurs JSON hérités.
- Les curseurs de rattrapage et les marqueurs de déduplication entrante de BlueBubbles utilisent désormais l'état partagé du plugin SQLite. Leurs plans d'importation JSON hérités résident dans l'interface de configuration/migration du doctor du plugin BlueBubbles, et non dans le code de migration central.
- Les décalages de mise à jour, les lignes de cache de stickers, les lignes de cache de messages envoyés, les lignes de cache de noms de sujets et les liaisons de fils de Telegram utilisent désormais l'état partagé du plugin SQLite. Leurs plans d'importation JSON hérités résident dans l'interface de configuration/migration du doctor du plugin Telegram, et non dans le code de migration central.
- Les curseurs de rattrapage, les mappages d'identifiants courts de réponse et les lignes de déduplication d'écho envoyé d'iMessage utilisent désormais l'état partagé du plugin SQLite. Les anciens fichiers iMessage`imessage/catchup/*.json`, `imessage/reply-cache.jsonl` et `imessage/sent-echoes.jsonl` ne servent que d'entrées pour le doctor.
- Les lignes de déduplication de messages Feishu utilisent désormais l'état partagé du plugin SQLite au lieu des fichiers `feishu/dedup/*.json`. Son plan d'importation JSON hérité réside dans l'interface de configuration/migration du doctor du plugin Feishu, et non dans le code de migration central.
- Les conversations, sondages, tampons de téléchargement en attente et les apprentissages des commentaires de Microsoft Teams utilisent désormais des tables d'état/blob de plugin SQLite partagées. Le chemin de téléchargement en attente utilise `plugin_blob_entries`, de sorte que les tampons multimédias sont stockés sous forme de BLOBs SQLite plutôt que de JSON base64. Les noms des helpers d'exécution utilisent désormais une dénomination SQLite/state plutôt qu'une dénomination de magasin de fichiers `*-fs`, et l'ancien shim `storePath` a disparu de ces magasins. Son plan d'importation JSON hérité réside dans la surface de configuration/plugin/doctor migration de Microsoft Teams.
- Les médias sortants hébergés par Zalo utilisent désormais un SQLite partagé `plugin_blob_entries` au lieu des sidecars temporaires JSON/bin `openclaw-zalo-outbound-media`.
- Le HTML et les métadonnées de la visionneuse de différences utilisent désormais un SQLite partagé `plugin_blob_entries` au lieu des fichiers temporaires `meta.json`/`viewer.html`. Les sorties PNG/PDF rendues restent des matérialisations temporaires car la livraison via le channel a toujours besoin d'un chemin de fichier.
- Les documents gérés par Canvas utilisent désormais un SQLite partagé `plugin_blob_entries` au lieu d'un répertoire `state/canvas/documents` par défaut. L'hôte Canvas sert ces blobs directement ; les fichiers locaux sont créés uniquement pour un contenu d'opérateur `host.root` explicite ou une matérialisation temporaire lorsqu'un lecteur multimédia en aval nécessite un chemin.
- Les décisions d'audit de transfert de fichiers utilisent désormais un SQLite partagé `plugin_state_entries` au lieu du journal d'exécution `audit/file-transfer.jsonl` non borné. Doctor importe le fichier d'audit JSONL hérité dans l'état du plugin et supprime la source après une importation propre.
- Les baux de processus ACPX et l'identité de l'instance de passerelle utilisent désormais l'état du plugin SQLite partagé. Doctor importe le fichier `gateway-instance-id` hérité dans l'état du plugin et supprime la source.
- Les scripts wrapper générés par ACPX et le domicile isolé Codex sont des matérialisations temporaires sous la racine temp OpenClaw, et non un état OpenClaw durable. Les enregistrements d'exécution ACPX durables sont les lignes de bail SQLite et d'instance de ; l'ancienne surface de configuration `stateDir` d'ACPX est supprimée car aucun état d'exécution n'y est plus écrit.
- Les pièces jointes multimédias du Gateway utilisent désormais la table SQLite partagée `media_blobs` comme magasin d'octets canonique. Les chemins locaux renvoyés aux surfaces de compatibilité de et de bac à sable sont des matérialisations temporaires de la ligne de base de données, et non le magasin multimédia durable. Les listes d'autorisation multimédias d'exécution n'incluent plus les racines `$OPENCLAW_STATE_DIR/media` héritées ou `media` du répertoire de configuration ; ces répertoires sont uniquement des sources d'importation pour le doctor.
- La complétion du shell n'écrit plus de fichiers de cache `$OPENCLAW_STATE_DIR/completions/*`. Les chemins d'installation, de diagnostic, de mise à jour et de test de publication utilisent la sortie de complétion générée ou l'approvisionnement de profil au lieu des fichiers de cache de complétion durables.
- La zone de préparation de téléchargement de compétences du Gateway utilise désormais les lignes partagées `skill_uploads`. Les métadonnées de téléchargement, les clés d'idempotence et les octets d'archive résident dans SQLite ; l'installateur ne reçoit qu'un chemin d'archive matérialisé temporaire pendant qu'une installation est en cours.
- Les pièces jointes en ligne des sous-agents ne se matérialisent plus sous l'espace de travail `.openclaw/attachments/*`. Le chemin de génération prépare les entrées de départ SQLite VFS, les exécutions en ligne amorcent ces entrées dans l'espace de noms de brouillon d'exécution par agent, et les outils sauvegardés sur disque superposent ce brouillon SQLite pour les chemins des pièces jointes. Les anciennes colonnes de registre du répertoire de pièces jointes de sous-agent et les crochets de nettoyage ont disparu.
- L'hydratation d'images CLI ne maintient plus de fichiers de cache `openclaw-cli-images` stables. Les backend CLI externes reçoivent toujours des chemins de fichiers, mais ces chemins sont des matérialisations temporaires par exécution avec nettoyage.
- Les diagnostics de trace du cache, les diagnostics de payload Anthropic, les diagnostics de flux brut du modèle, les événements de la chronologie des diagnostics et les bundles de stabilité Gateway écrivent désormais des lignes SQLite au lieu de fichiers `logs/*.jsonl` ou `logs/stability/*.json`. Les indicateurs de remplacement du chemin d'exécution et les env vars ont été supprimés ; les commandes d'exportation/débogage peuvent matérialiser explicitement des fichiers à partir des lignes de la base de données.
- Le compagnon macOS n'a plus de writer `diagnostics.jsonl` tournant. Les journaux de l'application vont vers la journalisation unifiée et les diagnostics durables Gateway restent basés sur SQLite.
- La liste des enregistrements du port-gardien macOS utilise désormais des lignes SQLite `macos_port_guardian_records` partagées typées au lieu d'un fichier JSON Application Support ou d'un blob singleton opaque.
- Les verrous singleton Gateway utilisent désormais des lignes SQLite `state_leases` partagées typées sous la portée `gateway_locks` au lieu de fichiers de verrou dans le répertoire temporaire. La documentation de dépannage Fly et OAuth pointe désormais vers le verrou de bail/rafraîchissement d'auth SQLite au lieu du nettoyage des verrous de fichiers obsolètes.
- L'état sentinelle de redémarrage Gateway utilise désormais des lignes SQLite `gateway_restart_sentinel` partagées typées au lieu de `restart-sentinel.json` ; l'exécution lit le type, le statut, le routage, le message, la continuation et les statistiques de la sentinelle à partir de colonnes typées. `payload_json` n'est qu'une copie de relecture/débogage. Le code d'exécution efface directement la ligne SQLite et ne transporte plus la plomberie de nettoyage de fichiers.
- L'intention de redémarrage Gateway et l'état de transfert du superviseur utilisent désormais des lignes SQLite `gateway_restart_intent` et `gateway_restart_handoff` partagées typées au lieu des sidecars `gateway-restart-intent.json` et `gateway-supervisor-restart-handoff.json`.
- La coordination du singleton Gateway utilise désormais des lignes Gateway`state_leases` typées sous `gateway_locks` au lieu d'écrire des fichiers `gateway.<hash>.lock`. La ligne de bail possède le propriétaire du verrou, l'expiration, le signal de présence (heartbeat) et la charge utile de débogage ; SQLite possède la frontière d'acquisition/libération atomique. L'option de répertoire de verrouillage de fichier retirée a disparu ; les tests utilisent directement l'identité de la ligne SQLite.
- L'ancien assistant de rapport d'utilisation cron non référencé qui scannait les fichiers `cron/runs/*.jsonl` a été supprimé. Les rapports d'historique d'exécution cron doivent lire les lignes `cron_run_logs` SQLite typées.
- La récupération de redémarrage de la session principale découvre désormais les agents candidats via le registre `agent_databases` SQLite au lieu de scanner les répertoires `agents/*/sessions`.
- La récupération de corruption de session Gemini ne supprime désormais que la ligne de session SQLite ; elle n'a plus besoin d'une porte `storePath` héritée et n'essaie plus de dissocier un chemin de transcription JSONL dérivé.
- La gestion de la substitution de chemin traite désormais les valeurs d'environnement littérales `undefined`/`null` comme non définies, empêchant les bases de données `undefined/state/*.sqlite` accidentelles à la racine du dépôt lors des tests ou des transferts de shell.
- Les empreintes d'intégrité de la configuration utilisent désormais des lignes `config_health_entries` SQLite partagées typées au lieu de `logs/config-health.json`macOS, conservant le fichier de configuration normal comme le seul document de configuration non lié aux identifiants. Le compagnon macOS ne conserve que l'état d'intégrité local au processus et ne recrée pas l'ancien sidecar JSON.
- Le runtime du profil d'authentification n'importe plus et n'écrit plus de fichiers d'identifiants JSON. Le stockage d'identifiants canonique est SQLite ; `auth-profiles.json`, `auth.json` par agent, et `credentials/oauth.json` partagés sont des entrées de migration doctor qui sont supprimées après l'importation.
- Les tests de sauvegarde/état du profil d'authentification vérifient désormais directement les tables d'authentification SQLite typées et n'utilisent les noms de fichiers de profil d'authentification hérités que pour les entrées de migration doctor.
- `openclaw secrets apply` nettoie uniquement le fichier de configuration, le fichier d'environnement et le magasin de profils d'authentification SQLite. Il ne contient plus de logique de compatibilité qui modifie les `auth.json` retirés par agent ; le docteur gère l'importation et la suppression de ce fichier.
- La planification de la migration des secrets par Hermes applique directement les profils de clés API importés dans le magasin de profils d'authentification SQLite. Il n'écrit plus ni ne vérifie `auth-profiles.json` comme cible intermédiaire.
- La documentation d'authentification orientée utilisateur décrit désormais `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>` au lieu de demander aux utilisateurs d'inspecter ou de copier `auth-profiles.json` ; les noms JSON OAuth/auth hérités ne restent documentés que comme entrées d'importation du docteur.
- Les assistants de chemin d'état principaux n'exposent plus le fichier `credentials/oauth.json` retiré. Le nom de fichier hérité est local au chemin d'importation d'authentification du docteur.
- Les documents d'installation, de sécurité, d'intégration (onboarding), d'authentification de modèle et SecretRef décrivent désormais les lignes de profils d'authentification SQLite et la sauvegarde/migration de l'état complet au lieu des fichiers JSON de profils d'authentification par agent.
- La découverte de modèle PI transmet désormais les informations d'identification canoniques dans le stockage d'authentification `pi-coding-agent` en mémoire. Il ne crée plus, ne nettoie plus ni n'écrit de `auth.json` par agent lors de la découverte.
- Les paramètres de déclenchement et de routage de Voice Wake utilisent désormais des tables SQLite partagées typées au lieu de `settings/voicewake.json`, `settings/voicewake-routing.json` ou de lignes génériques opaques ; le docteur importe les fichiers JSON hérités et les supprime après une migration réussie.
- L'état de vérification des mises à jour utilise désormais une ligne `update_check_state` partagée typée au lieu de `update-check.json` ou d'un blob générique opaque ; le docteur importe le fichier JSON hérité et le supprime après une migration réussie.
- L'état de santé de la configuration utilise désormais des lignes `config_health_entries` partagées typées au lieu de `logs/config-health.json` ou d'un blob générique opaque ; le docteur importe le fichier JSON hérité et le supprime après une migration réussie.
- Les approbations de liaison de conversation de plugins utilisent désormais des lignes `plugin_binding_approvals` typées au lieu d'un état SQLite partagé opaque ou de `plugin-binding-approvals.json` ; le fichier hérité est une entrée de migration du docteur.
- Les liaisons de conversation actuelle génériques stockent désormais des lignes `current_conversation_bindings` typées au lieu de réécrire `bindings/current-conversations.json` ; doctor importe le fichier JSON hérité et le supprime après une migration réussie.
- Les registres de synchronisation des sources importées du Memory Wiki stockent désormais une ligne d'état de plugin SQLite par clé de coffre/source au lieu de réécrire `.openclaw-wiki/source-sync.json` ; le provider de migration importe et supprime le registre JSON hérité.
- Les enregistrements d'exécution d'importation ChatGPT du Memory Wiki stockent désormais une ligne d'état de plugin SQLite par identifiant de coffre/exécution au lieu d'écrire `.openclaw-wiki/import-runs/*.json`. Les instantanés de restauration restent des fichiers de coffre explicites jusqu'à ce que l'archivage des instantanés d'exécution d'importation soit déplacé dans le stockage d'objets blob.
- Les résumés compilés du Memory Wiki stockent désormais des lignes d'objets blob de plugin SQLite au lieu d'écrire `.openclaw-wiki/cache/agent-digest.json` et `.openclaw-wiki/cache/claims.jsonl`. Le provider de migration importe les anciens fichiers de cache et supprime le répertoire de cache lorsqu'il devient vide.
- Le suivi de l'installation des compétences de ClawHub stocke désormais une ligne d'état de plugin SQLite par espace de travail/compétence au lieu d'écrire ou de lire les fichiers ClawHub`.clawhub/lock.json` et `.clawhub/origin.json` à l'exécution. Le code d'exécution utilise des objets d'état d'installation suivie plutôt que des abstractions de fichier de verrouillage/origine. Doctor importe les fichiers hérités depuis les espaces de travail de l'agent configurés et les supprime après un import propre.
- L'index des plugins installés lit et écrit désormais la ligne singleton `installed_plugin_index` SQLite partagée typée au lieu de `plugins/installs.json` ; le fichier JSON hérité n'est plus qu'une entrée de migration de doctor et est supprimé après l'import.
- La fonction d'aide de chemin `plugins/installs.json` héritée réside désormais dans le code hérité de doctor. Les modules d'index de plugins à l'exécution exposent uniquement des options de persistance basées sur SQLite, et non un chemin de fichier JSON.
- La sentinelle de redémarrage de Gateway, l'intention de redémarrage et l'état de transfert du superviseur utilisent désormais des lignes SQLite partagées typées (Gateway`gateway_restart_sentinel`, `gateway_restart_intent` et `gateway_restart_handoff`) au lieu d'objets blob opaques génériques. Le code de redémarrage à l'exécution n'a aucun contrat de sentinelle/intention/transfert de forme fichier.
- Le cache de synchronisation Matrix, les métadonnées de stockage, les liaisons de threads, les marqueurs de déduplication entrante, l'état de cooldown de vérification au démarrage, les instantanés cryptographiques IndexedDB du SDK, les informations d'identification et les clés de récupération utilisent désormais les tables d'état/blob de plugin SQLite partagées. Les structures de chemin d'exécution n'exposent plus de chemin de métadonnées Matrix`storage-meta.json`; ce nom de fichier est uniquement une entrée de migration héritée. Leur plan d'importation JSON hérité réside dans la surface de configuration/migration du doctor du plugin Matrix.
- Le démarrage Matrix ne scanne plus, ne signale plus et ne termine plus l'état de fichier hérité Matrix. La détection de fichiers Matrix, la création d'instantanés cryptographiques hérités, l'état de migration de restauration des clés de salle, l'importation et la suppression de la source sont tous gérés par le doctor.
- Les barils de migration d'exécution Matrix ont été supprimés. Les aides à la détection et à la mutation de l'état/cryptographie hérités sont importés directement par le doctor Matrix au lieu de faire partie de la surface de l'API d'exécution.
- Les marqueurs de réutilisation d'instantanés de migration Matrix résident désormais dans l'état du plugin SQLite au lieu de `matrix/migration-snapshot.json`; le doctor peut toujours réutiliser la même archive vérifiée pré-migration sans écrire de fichier d'état sidecar.
- Les curseurs de bus Nostr et l'état de publication du profil utilisent désormais l'état partagé du plugin SQLite. Leur plan d'importation JSON hérité réside dans la surface de configuration/migration du doctor du plugin Nostr.
- Les commutateurs de session Active Memory utilisent désormais l'état partagé du plugin SQLite au lieu de `session-toggles.json`; la réactivation de la mémoire supprime la ligne au lieu de réécrire un objet JSON.
- Les propositions et les compteurs de révision de l'Atelier de compétences utilisent désormais l'état partagé du plugin SQLite au lieu des magasins `skill-workshop/<workspace>.json` par espace de travail. Chaque proposition est une ligne distincte sous `skill-workshop/proposals`, et le compteur de révision est une ligne distincte sous `skill-workshop/reviews`.
- Les exécutions de sous-agent de révision de l'Atelier de compétences utilisent désormais le résolveur de transcription de session d'exécution au lieu de créer des chemins de session sidecar `skill-workshop/<sessionId>.json`.
- Les baux de processus ACPX utilisent désormais l'état partagé du plugin SQLite sous `acpx/process-leases` au lieu d'un registre `process-leases.json` de fichier entier. Chaque bail est stocké dans sa propre ligne, préservant le nettoyage des processus obsolètes au démarrage sans chemin de réécriture JSON à l'exécution.
- Les scripts wrapper ACPX et le domicile isolé Codex sont générés dans la racine temporaire OpenClaw OpenClaw. Ils sont recréés selon les besoins et ne sont pas des entrées de sauvegarde ou de migration.
- La persistance du registre d'exécution des sous-agents utilise des lignes `subagent_runs` partagées typées. L'ancien chemin `subagents/runs.json` n'est maintenant qu'une entrée de migration de doctor, et les noms des helpers d'exécution ne décrivent plus la couche d'état comme étant stockée sur disque. Les tests d'exécution ne créent plus de fixtures `runs.json` invalides ou vides pour prouver le comportement du registre ; ils initialisent et lisent directement les lignes SQLite.
- La sauvegarde met en zone de préparation le répertoire d'état avant l'archivage, copie les fichiers non base de données, capture des instantanés des bases de données `*.sqlite` avec `VACUUM INTO`, omet les fichiers annexes WAL/SHM en cours d'utilisation, enregistre les métadonnées de l'instantané dans le manifeste d'archive, et enregistre les exécutions de sauvegarde terminées dans SQLite avec le manifeste d'archive. `openclaw backup
create` validates the written archive by default; `--no-verify` est le chemin rapide explicite.
- `openclaw backup restore` valide l'archive avant l'extraction, réutilise le manifeste normalisé du vérificateur, et restaure les actifs vérifiés du manifeste vers leurs chemins source enregistrés. Il nécessite `--yes` pour les écritures et prend en charge `--dry-run` pour un plan de restauration.
- L'ancien filtre de chemin volatil de sauvegarde est supprimé. La sauvegarde n'a plus besoin d'une liste de saut live-tar pour les fichiers JSON/JSONL de session ou cron hérités car les instantanés SQLite sont mis en zone de préparation avant la création de l'archive.
- La préparation de l'espace de travail de configuration simple et d'intégration ne crée plus de répertoires `agents/<agentId>/sessions/`. Ils ne créent que config/workspace ; les lignes de session SQLite et les lignes de transcription sont créées à la demande dans la base de données par agent.
- La réparation des autorisations de sécurité cible désormais les bases de données SQLite globales et par agent ainsi que les fichiers annexes WAL/SHM au lieu des fichiers `sessions.json` et des fichiers JSONL de transcription.
- Les noms d'exécution du registre du Sandbox décrivent désormais directement les types de registres SQLite au lieu de véhiculer la terminologie de registre JSON héritée à travers le magasin actif.
- `openclaw reset --scope config+creds+sessions` supprime les bases de données `openclaw-agent.sqlite` par agent ainsi que les fichiers sidecars WAL/SHM, et pas seulement les répertoires `sessions/` hérités.
- Les assistants de session agrégée du Gateway utilisent désormais des noms orientés entrées : Gateway`loadCombinedSessionEntriesForGateway` retourne `{ databasePath, entries }`. L'ancienne dénomination combinée de magasin a été supprimée des appelants d'exécution.
- L'initialisation du canal MCP Docker écrit désormais la ligne de session principale et les événements de transcription dans la base de données SQLite par agent au lieu de créer Docker`sessions.json` et une transcription JSONL.
- Le hook de mémoire de session groupé résout désormais le contexte de session précédente à partir de SQLite via `{agentId, sessionId}`. Il ne scanne plus, ne stocke plus, ni ne synthétise les chemins de transcription ou les répertoires `workspace/sessions`.
- Le hook de journalisation des commandes groupé écrit désormais les lignes d'audit de commandes dans la table partagée SQLite `command_log_entries` au lieu d'ajouter `logs/commands.log`.
- Les listes d'autorisation de jumelage de canaux exposent désormais uniquement des assistants de lecture/écriture basés sur SQLite lors de l'exécution et dans le SDK de plugin. L'ancien résolveur de chemin `*-allowFrom.json` et le lecteur de fichiers ne subsistent que dans le code d'importation hérité du docteur.
- `migration_runs` enregistre les exécutions de migration d'état hérité avec le statut, les horodatages et les rapports JSON.
- `migration_sources` enregistre chaque source de fichier hérité importé avec le hachage, la taille, le nombre d'enregistrements, la table cible, l'ID d'exécution, le statut et l'état de suppression de la source.
- `backup_runs` enregistre les chemins des archives de sauvegarde, le statut et les manifestes JSON.
- Le schéma global ne conserve pas de table de registre `agents` inutilisée. La découverte de base de données de l'agent est le registre `agent_databases` canonique jusqu'à ce que l'exécution ait un véritable propriétaire d'enregistrement d'agent.
- La configuration du catalogue de modèle générée est stockée dans des lignes `agent_model_catalogs` SQLite globales typées, indexées par répertoire d'agent. Les appelants d'exécution utilisent `ensureOpenClawModelCatalog` ; il n'y a pas d'API de compatibilité `models.json`API dans le code d'exécution. L'implémentation écrit dans SQLite et le registre PI embarqué est hydraté à partir de cette charge utile stockée sans créer de fichier `models.json`.
- L'exportation markdown de la transcription de session QMD et la configuration `memory.qmd.sessions` ont été supprimées. Il n'y a pas de collection de transcriptions QMD, pas de chemin d'exécution `qmd/sessions*`, et pas de pont de mémoire de session sauvegardé par fichier.
- Le runtime Memory-core importe les assistants d'indexation de transcription SQLite depuis `openclaw/plugin-sdk/memory-core-host-engine-session-transcripts`, et non depuis le sous-chemin du SDK QMD. Le sous-chemin QMD conserve une ré-exportation de compatibilité uniquement pour les appelants externes, jusqu'à ce qu'un nettoyage majeur du SDK puisse le supprimer.
- Le propre `index.sqlite` de QMD est désormais une matérialisation temporaire d'exécution soutenue par la table SQLite `plugin_blob_entries` principale. Le runtime ne crée plus de `~/.openclaw/agents/<agentId>/qmd` secondaire durable.
- Le plug-in `memory-lancedb` en option ne crée plus `~/.openclaw/memory/lancedb`OpenClaw en tant que magasin géré implicitement par OpenClaw. Il s'agit d'un backend LanceDB externe et reste désactivé jusqu'à ce que l'opérateur configure un `dbPath` explicite.
- `check:database-first-legacy-stores` échoue les nouvelles sources d'exécution qui associent des noms de magasins hérités aux API de système de fichiers de style écriture. Il échoue également les sources d'exécution qui réintroduisent des contrats de pont de transcription tels que `transcriptLocator`, `sqlite-transcript://...`, `sessionFile` ou `storePath`, et recherche ces noms de contrats de pont dans les tests. Il interdit également `SessionManager.open(...)` et les anciennes façades statiques SessionManager afin que l'exécution et les tests ne puissent pas recréer silencieusement un ouvreur de session sauvegardé sur fichier ou une découverte de session de l'ère des fichiers. Il interdit également l'ancien crochet/classe de téléchargeur session JSONL de l'interface utilisateur d'exportation. Il interdit également les noms d'assistants SQLite pour l'état des plugins/tâches de forme sidecar ; les tests devraient vérifier `databasePath` et l'emplacement partagé `state/openclaw.sqlite` au lieu de prétendre que ces fonctionnalités possèdent des fichiers SQLite séparés. Il interdit également les anciens noms de tables SQL d'index mémoire génériques (`meta`, `files`, `chunks`, `chunks_vec`, `chunks_fts`, `embedding_cache`) dans les sources d'exécution pour que la base de données de l'agent conserve son schéma explicite `memory_index_*`. Il interdit également l'intégration de schémas TEXT et l'intégration d'écritures de tableaux JSON afin que les vecteurs restent des BLOB SQLite compacts. Le code de migration, de diagnostic, d'importation et d'exportation explicite non-session reste autorisé. Le garde couvre désormais également les magasins d'exécution `cache/*.json`, les sidecars génériques `thread-bindings.json`, les JSON d'état/journal d'exécution cron, les JSON de santé de la configuration, les sidecars de redémarrage et de verrouillage, les paramètres Voice Wake, les approbations de liaison de plugins, l'index de plugins installés JSON, les JSONL d'audit de transfert de fichiers, les journaux d'activité Memory Wiki, l'ancien journal texte groupé `command-logger`, et les commutateurs de diagnostic JSONL de flux brut pi-mono. Il interdit également les anciens noms de modules hérités de médecin au niveau racine afin que le code de compatibilité reste sous `src/commands/doctor/`Android. Les gestionnaires de débogage Android utilisent également une sortie logcat/en mémoire au lieu de la mise en cache `camera_debug.log` ou des fichiers cache `debug_logs.txt`.

## Forme du schéma cible

Gardez les schémas explicites. L'état d'exécution appartenant à l'hôte utilise des tables typées. L'état opaque appartenant au plugin utilise `plugin_state_entries` / `plugin_blob_entries` ; il n'y a pas de table `kv` générique pour l'hôte.

Base de données globale :

```text
state_leases(scope, lease_key, owner, expires_at, heartbeat_at, payload_json, created_at, updated_at)
exec_approvals_config(config_key, raw_json, socket_path, has_socket_token, default_security, default_ask, default_ask_fallback, auto_allow_skills, agent_count, allowlist_count, updated_at_ms)
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
agent_databases(agent_id, path, schema_version, last_seen_at, size_bytes)
task_runs(...)
task_delivery_state(...)
flow_runs(...)
subagent_runs(run_id, child_session_key, requester_session_key, controller_session_key, created_at, ended_at, cleanup_handled, payload_json)
current_conversation_bindings(binding_key, binding_id, target_agent_id, target_session_id, target_session_key, channel, account_id, conversation_kind, parent_conversation_id, conversation_id, target_kind, status, bound_at, expires_at, metadata_json, updated_at)
plugin_binding_approvals(plugin_root, channel, account_id, plugin_id, plugin_name, approved_at)
tui_last_sessions(scope_key, session_key, updated_at)
plugin_state_entries(plugin_id, namespace, entry_key, value_json, created_at, expires_at)
plugin_blob_entries(plugin_id, namespace, entry_key, metadata_json, blob, created_at, expires_at)
media_blobs(subdir, id, content_type, size_bytes, blob, created_at, updated_at)
skill_uploads(upload_id, kind, slug, force, size_bytes, sha256, actual_sha256, received_bytes, archive_blob, created_at, expires_at, committed, committed_at, idempotency_key_hash)
web_push_subscriptions(endpoint_hash, subscription_id, endpoint, p256dh, auth, created_at_ms, updated_at_ms)
web_push_vapid_keys(key_id, public_key, private_key, subject, updated_at_ms)
apns_registrations(node_id, transport, token, relay_handle, send_grant, installation_id, topic, environment, distribution, token_debug_suffix, updated_at_ms)
node_host_config(config_key, version, node_id, token, display_name, gateway_host, gateway_port, gateway_tls, gateway_tls_fingerprint, updated_at_ms)
device_identities(identity_key, device_id, public_key_pem, private_key_pem, created_at_ms, updated_at_ms)
device_auth_tokens(device_id, role, token, scopes_json, updated_at_ms)
macos_port_guardian_records(pid, port, command, mode, timestamp)
workspace_setup_state(workspace_key, workspace_path, version, bootstrap_seeded_at, setup_completed_at, updated_at)
native_hook_relay_bridges(relay_id, pid, hostname, port, token, expires_at_ms, updated_at_ms)
model_capability_cache(provider_id, model_id, name, input_text, input_image, reasoning, supports_tools, context_window, max_tokens, cost_input, cost_output, cost_cache_read, cost_cache_write, updated_at_ms)
agent_model_catalogs(catalog_key, agent_dir, raw_json, updated_at)
managed_outgoing_image_records(attachment_id, session_key, message_id, created_at, updated_at, retention_class, alt, original_media_id, original_media_subdir, original_content_type, original_width, original_height, original_size_bytes, original_filename, record_json)
gateway_restart_sentinel(sentinel_key, version, kind, status, ts, session_key, thread_id, delivery_channel, delivery_to, delivery_account_id, message, continuation_json, doctor_hint, stats_json, payload_json, updated_at_ms)
channel_pairing_requests(channel_key, account_id, request_id, code, created_at, last_seen_at, meta_json)
channel_pairing_allow_entries(channel_key, account_id, entry, sort_order, updated_at)
voicewake_triggers(config_key, position, trigger, updated_at_ms)
voicewake_routing_config(config_key, version, default_target_mode, default_target_agent_id, default_target_session_key, updated_at_ms)
voicewake_routing_routes(config_key, position, trigger, target_mode, target_agent_id, target_session_key, updated_at_ms)
update_check_state(state_key, last_checked_at, last_notified_version, last_notified_tag, last_available_version, last_available_tag, auto_install_id, auto_first_seen_version, auto_first_seen_tag, auto_first_seen_at, auto_last_attempt_version, auto_last_attempt_at, auto_last_success_version, auto_last_success_at, updated_at_ms)
config_health_entries(config_path, last_known_good_json, last_promoted_good_json, last_observed_suspicious_signature, updated_at_ms)
sandbox_registry_entries(registry_kind, container_name, session_key, backend_id, runtime_label, image, created_at_ms, last_used_at_ms, config_label_kind, config_hash, cdp_port, no_vnc_port, entry_json, updated_at)
cron_run_logs(store_key, job_id, seq, ts, status, error, summary, diagnostics_summary, delivery_status, delivery_error, delivered, session_id, session_key, run_id, run_at_ms, duration_ms, next_run_at_ms, model, provider, total_tokens, entry_json, created_at)
cron_jobs(store_key, job_id, name, description, enabled, delete_after_run, created_at_ms, agent_id, session_key, schedule_kind, schedule_expr, schedule_tz, every_ms, anchor_ms, at, stagger_ms, session_target, wake_mode, payload_kind, payload_message, payload_model, payload_fallbacks_json, payload_thinking, payload_timeout_seconds, payload_allow_unsafe_external_content, payload_external_content_source_json, payload_light_context, payload_tools_allow_json, delivery_mode, delivery_channel, delivery_to, delivery_thread_id, delivery_account_id, delivery_best_effort, failure_delivery_mode, failure_delivery_channel, failure_delivery_to, failure_delivery_account_id, failure_alert_disabled, failure_alert_after, failure_alert_channel, failure_alert_to, failure_alert_cooldown_ms, failure_alert_include_skipped, failure_alert_mode, failure_alert_account_id, next_run_at_ms, running_at_ms, last_run_at_ms, last_run_status, last_error, last_duration_ms, consecutive_errors, consecutive_skipped, schedule_error_count, last_delivery_status, last_delivery_error, last_delivered, last_failure_alert_at_ms, job_json, state_json, runtime_updated_at_ms, schedule_identity, sort_order, updated_at)
delivery_queue_entries(queue_name, id, status, entry_kind, session_key, channel, target, account_id, retry_count, last_attempt_at, last_error, recovery_state, platform_send_started_at, entry_json, enqueued_at, updated_at, failed_at)
commitments(id, agent_id, session_key, channel, account_id, recipient_id, thread_id, sender_id, kind, sensitivity, source, status, reason, suggested_text, dedupe_key, confidence, due_earliest_ms, due_latest_ms, due_timezone, source_message_id, source_run_id, created_at_ms, updated_at_ms, attempts, last_attempt_at_ms, sent_at_ms, dismissed_at_ms, snoozed_until_ms, expired_at_ms, record_json)
migration_runs(id, started_at, finished_at, status, report_json)
migration_sources(source_key, migration_kind, source_path, target_table, source_sha256, source_size_bytes, source_record_count, last_run_id, status, imported_at, removed_source, report_json)
backup_runs(id, created_at, archive_path, status, manifest_json)
```

Base de données de l'agent :

```text
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
sessions(session_id, session_key, session_scope, created_at, updated_at, started_at, ended_at, status, chat_type, channel, account_id, primary_conversation_id, model_provider, model, agent_harness_id, parent_session_key, spawned_by, display_name)
conversations(conversation_id, channel, account_id, kind, peer_id, parent_conversation_id, thread_id, native_channel_id, native_direct_user_id, label, metadata_json, created_at, updated_at)
session_conversations(session_id, conversation_id, role, first_seen_at, last_seen_at)
session_routes(session_key, session_id, updated_at)
session_entries(session_id, session_key, entry_json, updated_at)
transcript_events(session_id, seq, event_json, created_at)
transcript_event_identities(session_id, event_id, seq, event_type, has_parent, parent_id, message_idempotency_key, created_at)
transcript_snapshots(session_id, snapshot_id, reason, event_count, created_at, metadata_json)
vfs_entries(namespace, path, kind, content_blob, metadata_json, updated_at)
tool_artifacts(run_id, artifact_id, kind, metadata_json, blob, created_at)
run_artifacts(run_id, path, kind, metadata_json, blob, created_at)
trajectory_runtime_events(session_id, run_id, seq, event_json, created_at)
memory_index_meta(meta_key, schema_version, provider, model, provider_key, sources_json, scope_hash, chunk_tokens, chunk_overlap, vector_dims, fts_tokenizer, config_hash, updated_at)
memory_index_sources(source_kind, source_key, path, session_id, hash, mtime, size)
memory_index_chunks(id, source_kind, source_key, path, session_id, start_line, end_line, hash, model, text, embedding, embedding_dims, updated_at)
memory_embedding_cache(provider, model, provider_key, hash, embedding, dims, updated_at)
cache_entries(scope, key, value_json, blob, expires_at, updated_at)
```

La recherche future peut ajouter des tables FTS sans modifier les tables d'événements canoniques :

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

Les grandes valeurs doivent utiliser des colonnes `blob`, et non un encodage de chaîne JSON. Conservez `value_json` pour les petites données structurées qui doivent rester inspectables avec les outils SQLite standard.

`agent_databases` est le registre canonique pour cette branche. N'ajoutez pas de table `agents` tant qu'un véritable propriétaire d'enregistrement d'agent n'existe pas ; la configuration de l'agent reste dans `openclaw.json`.

## Structure de la migration Doctor

Doctor doit appeler une étape de migration explicite qui peut être rapportée et qui est sûre à réexécuter :

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` invoque l'implémentation de la migration d'état après la pré vérification de configuration ordinaire et crée une sauvegarde vérifiée avant l'importation. Le démarrage de l'exécution et `openclaw migrate` ne doivent pas importer les fichiers d'état historiques d'OpenClaw.

Propriétés de la migration :

- Une passe de migration découvre toutes les sources de fichiers hérités et produit un plan avant de modifier quoi que ce soit.
- Doctor crée une archive de sauvegarde vérifiée pré-migration avant d'importer les fichiers hérités.
- Les importations sont idempotentes et indexées par le chemin source, l'heure de modification (mtime), la taille, le hachage et la table cible.
- Les fichiers sources réussis sont supprimés ou archivés après la validation de la base de données cible.
- Les importations échouées laissent la source intacte et enregistrent un avertissement dans `migration_runs`.
- Le code d'exécution lit SQLite uniquement après l'existence de la migration.
- Aucun chemin de rétrogradation ou d'exportation vers des fichiers d'exécution n'est requis.

## Inventaire de la migration

Déplacez ceux-ci dans la base de données globale :

- Les écritures d'exécution du registre des tâches utilisent désormais la base de données partagée ; l'importateur latéral non expédié `tasks/runs.sqlite` est supprimé. Les sauvegardes d'instantanés effectuent des upserts par ID de tâche et ne suppriment que les lignes de tâches/livraisons manquantes.
- Les écritures d'exécution du flux de tâches (Task Flow) utilisent désormais la base de données partagée ; l'importateur latéral non expédié `tasks/flows/registry.sqlite` est supprimé. Les sauvegardes d'instantanés effectuent des upserts par ID de flux et ne suppriment que les lignes de flux manquantes.
- Les écritures d'état du plugin lors de l'exécution utilisent désormais la base de données partagée ; l'importateur `plugin-state/state.sqlite` non livré a été supprimé.
- La recherche de mémoire intégrée ne s'active plus par défaut sur `memory/<agentId>.sqlite` ; ses tables d'index résident dans la base de données de l'agent propriétaire, et l'option explicite `memorySearch.store.path` sidecar a été retirée au profit de la migration de configuration du doctor.
- La réindexation de la mémoire intégrée réinitialise uniquement les tables appartenant à la mémoire dans la base de données de l'agent. Elle ne doit pas remplacer l'intégralité du fichier SQLite, car la même base de données possède les sessions, les transcriptions, les lignes VFS, les artefacts et les caches d'exécution.
- Registres de conteneurs/navigateurs du Sandbox à partir de JSON monolithiques et partitionnés. Les écritures lors de l'exécution utilisent désormais la base de données partagée ; l'importation de l'héritage JSON est conservée.
- Les définitions de tâches cron, l'état de planification et l'historique d'exécution utilisent désormais SQLite partagé ; le doctor importe/supprime les fichiers hérités `jobs.json`, `jobs-state.json` et `cron/runs/*.jsonl`.
- Identité/authentification de l'appareil, push, vérification de mise à jour, engagements, cache des OpenRouter OpenRouter, index des plugins installés et liaisons app-server.
- Les enregistrements de jumelage et d'amorçage de l'appareil/nœud utilisent désormais des tables SQLite typées.
- Les abonnés aux notifications de jumelage d'appareil et les marqueurs de demandes livrées utilisent désormais la table d'état du plugin SQLite partagée au lieu de `device-pair-notify.json`.
- Les enregistrements d'appels vocaux utilisent désormais la table d'état du plugin SQLite partagée sous l'espace de noms `voice-call` / `calls` au lieu de `calls.jsonl` ; la CLI du plugin suit et résume l'historique des appels sauvegardé dans SQLite.
- Les sessions de passerelle QQBot, les enregistrements d'utilisateurs connus et le cache de citations d'index de référence utilisent désormais l'état du plugin SQLite sous des espaces de noms `qqbot` (`sessions`, `known-users`, `ref-index`) au lieu de `session-*.json`, `known-users.json` et `ref-index.jsonl` ; la migration doctor/setup du QQBot importe et supprime les fichiers hérités.
- Les préférences du sélecteur de modèle, les hachages de déploiement de commandes et les liaisons de threads de Discord utilisent désormais l'état du plugin SQLite sous les espaces de noms `discord` (`model-picker-preferences`, `command-deploy-hashes`, `thread-bindings`) au lieu de `model-picker-preferences.json`, `command-deploy-cache.json` et `thread-bindings.json` ; la migration du doctor/setup de Discord importe et supprime les fichiers hérités.
- Les curseurs de rattrapage et les marqueurs de déduplication entrante de BlueBubbles utilisent désormais l'état du plugin SQLite sous les espaces de noms `bluebubbles` (`catchup-cursors`, `inbound-dedupe`) au lieu de `bluebubbles/catchup/*.json` et `bluebubbles/inbound-dedupe/*.json` ; la migration du doctor/setup de BlueBubbles importe et supprime les fichiers hérités.
- Les décalages de mise à jour, les entrées de cache de stickers, les entrées de cache de messages de chaîne de réponse, les entrées de cache de messages envoyés, les entrées de cache de noms de sujet et les liaisons de threads de Telegram utilisent désormais l'état du plugin SQLite sous les espaces de noms `telegram` (`update-offsets`, `sticker-cache`, `message-cache`, `sent-messages`, `topic-names`, `thread-bindings`) au lieu de `update-offset-*.json`, `sticker-cache.json`, `*.telegram-messages.json`, `*.telegram-sent-messages.json`, `*.telegram-topic-names.json` et `thread-bindings-*.json` ; la migration du doctor/setup de Telegram importe et supprime les fichiers hérités.
- Les curseurs de rattrapage, les mappages d'ID courts de réponse et les lignes de déduplication d'écho envoyé de iMessage utilisent désormais l'état du plugin SQLite sous les espaces de noms `imessage` (`catchup-cursors`, `reply-cache`, `sent-echoes`) au lieu de `imessage/catchup/*.json`, `imessage/reply-cache.jsonl` et `imessage/sent-echoes.jsonl` ; la migration du doctor/setup de iMessage importe et supprime les fichiers hérités.
- Les conversations, sondages, jetons délégués, téléchargements en attente et apprentissages des commentaires de Microsoft Teams utilisent désormais les espaces de noms d'état/blob du plugin SQLite (`conversations`, `polls`, `delegated-tokens`, `pending-uploads`, `feedback-learnings`) au lieu de `msteams-conversations.json`, `msteams-polls.json`, `msteams-delegated.json`, `msteams-pending-uploads.json` et `*.learnings.json` ; la migration doctor/setup de Microsoft Teams importe et supprime les fichiers hérités.
- Le cache de synchronisation, les métadonnées de stockage, les liaisons de fils de discussion, les marqueurs de déduplication entrante, l'état de refroidissement de la vérification au démarrage, les identifiants, les clés de récupération et les snapshots crypto IndexedDB du SDK de Matrix utilisent désormais les espaces de noms d'état/blob du plugin SQLite sous `matrix` (`sync-store`, `storage-meta`, `thread-bindings`, `inbound-dedupe`, `startup-verification`, `credentials`, `recovery-key`, `idb-snapshots`) au lieu de `bot-storage.json`, `storage-meta.json`, `thread-bindings.json`, `inbound-dedupe.json`, `startup-verification.json`, `credentials.json`, `recovery-key.json` et `crypto-idb-snapshot.json` ; la migration doctor/setup de Matrix importe et supprime ces fichiers hérités des racines de stockage Matrix délimitées au compte.
- Les curseurs de bus et l'état de publication du profil de Nostr utilisent désormais l'état du plugin SQLite sous les espaces de noms `nostr` (`bus-state`, `profile-state`) au lieu de `bus-state-*.json` et `profile-state-*.json` ; la migration doctor/setup de Nostr importe et supprime les fichiers hérités.
- Les bascules de session Active Memory utilisent désormais l'état du plugin SQLite sous `active-memory/session-toggles` au lieu de `session-toggles.json`.
- Les files d'attente de propositions et les compteurs de revue de Skill Workshop utilisent désormais l'état du plugin SQLite sous `skill-workshop/proposals` et `skill-workshop/reviews` au lieu des fichiers `skill-workshop/<workspace>.json` par espace de travail.
- Les files d'attente de livraison sortante et de livraison de session partagent désormais la table globale SQLite `delivery_queue_entries` sous des noms de file distincts (`outbound-delivery`, `session-delivery`) au lieu des fichiers durables `delivery-queue/*.json`, `delivery-queue/failed/*.json` et `session-delivery-queue/*.json`. L'étape legacy-state du docteur importe les lignes en attente et échouées, supprime les marqueurs livrés obsolètes et supprime les anciens fichiers JSON après l'importation. Les champs de routage à chaud et de nouvelle tentative sont des colonnes typées ; la charge utile JSON n'est conservée que pour la relecture/le débogage.
- Les baux de processus ACPX utilisent désormais l'état du plugin SQLite sous `acpx/process-leases` au lieu de `process-leases.json`.
- Métadonnées de sauvegarde et d'exécution de migration

Déplacez-les dans les bases de données des agents :

- Racines de session d'agent et charges utiles d'entrée de session formatées pour la compatibilité. Effectué pour les écritures d'exécution : les métadonnées de session à chaud sont interrogeables dans `sessions`, tandis que la charge utile complète `SessionEntry` formatée pour l'héritage reste dans `session_entries`.
- Événements de transcription d'agent. Effectué pour les écritures d'exécution.
- Points de contrôle de compactage et instantanés de transcription. Effectué pour les écritures d'exécution : les copies de transcription des points de contrôle sont des lignes de transcription SQLite et les métadonnées du point de contrôle sont enregistrées dans `transcript_snapshots`. Les assistants de point de contrôle du Gateway nomment désormais ces valeurs comme des instantanés de transcription plutôt que comme des fichiers source.
- Espaces de noms scratch/espace de travail VFS de l'agent. Effectué pour les écritures VFS d'exécution.
- Charges utiles de pièce jointe de sous-agent. Effectué pour les écritures d'exécution : ce sont des entrées de départ VFS SQLite et jamais des fichiers d'espace de travail durables.
- Artefacts d'outils. Effectué pour les écritures d'exécution.
- Artefacts d'exécution. Effectué pour les écritures d'exécution du worker via la table `run_artifacts` par agent.
- Caches d'exécution locaux à l'agent. Effectué pour les écritures de cache délimitées à l'exécution du worker via la table `cache_entries` par agent. Les caches de modèle à l'échelle du Gateway restent dans la base de données globale, sauf s'ils deviennent spécifiques à un agent.
- Journaux du flux parent ACP. Effectué pour les écritures d'exécution.
- Sessions du registre de relecture ACP. Effectué pour les écritures d'exécution via
  `acp_replay_sessions` et `acp_replay_events` ; le `acp/event-ledger.json`
  hérité ne reste qu'en tant qu'entrée du docteur.
- Métadonnées de session ACP. Effectué pour les écritures d'exécution via `acp_sessions` ; les blocs
  `entry.acp` hérités dans `sessions.json` sont uniquement des entrées de migration du docteur.
- Sidecars de trajectoire lorsqu'ils ne sont pas des fichiers d'exportation explicites. Effectué pour les
  écritures d'exécution : la capture de trajectoire écrit les lignes `trajectory_runtime_events`
  de la base de données de l'agent et met en miroir les artefacts délimités par l'exécution dans SQLite. Les sidecars hérités sont uniquement
  des entrées d'importation du docteur ; l'exportation peut matérialiser des sorties de bundle de support JSONL
  fraîches mais ne lit pas ne migre pas les anciens sidecars de trajectoire/transcription lors de l'exécution.
  La capture de trajectoire d'exécution expose la portée SQLite ; les assistants de chemin JSONL sont
  isolés pour le support d'exportation/débogage et ne sont pas réexportés depuis le module d'exécution.
  Les métadonnées de trajectoire de l'exécuteur intégré enregistrent l'identité `{agentId, sessionId, sessionKey}`
  au lieu de conserver un localisateur de transcription.

Garder ceux-ci basés sur des fichiers pour l'instant :

- `openclaw.json`
- fichiers d'identification du provider ou CLI
- manifestes de plugin/package
- espaces de travail utilisateur et dépôts Git lorsque le mode disque est sélectionné
- journaux destinés au suivi par l'opérateur, sauf si une surface de journal spécifique est déplacée

## Plan de migration

### Phase 0 : Fixer la limite

Rendre explicite la limite de l'état durable avant de déplacer plus de lignes :

- Ajouter une table `migration_runs` à la base de données globale.
  Effectué pour les rapports d'exécution de migration de l'état hérité.
- Ajouter un service unique de migration d'état appartenant au docteur pour l'importation de fichier vers base de données.
  Effectué : `openclaw doctor --fix` utilise l'implémentation de migration de l'état hérité.
- Rendre `plan` en lecture seule et faire en sorte que `apply` crée une sauvegarde, importe, vérifie, et
  puis supprime ou met en quarantaine les anciens fichiers.
  Effectué : le docteur crée une sauvegarde vérifiée pré-migration, transmet le chemin de la sauvegarde
  dans `migration_runs`, et réutilise les chemins d'importation/suppression.
- Ajoutez des interdictions statiques afin que le nouveau code d'exécution ne puisse pas écrire de fichiers d'état hérités, tandis que
  le code de migration et les tests peuvent toujours les amorcer/les lire.
  Fait pour les magasins hérités actuellement migrés ; le garde analyse également les
  tests imbriqués pour détecter les contrats de localisation de transcript d'exécution interdits.

### Phase 1 : Finaliser le plan de contrôle global

Conserver l'état de coordination partagé dans `state/openclaw.sqlite` :

- Agents et registre de base de données d'agents
- Registres de tâches et de flux de tâches
- État des plugins
- Registre des conteneurs/navigateurs de Sandbox
- Historique des exécutions Cron/planificateur
- Jumelage, appareil, push, vérification de mise à jour, TUI, caches de modèles OpenRouter, et autre
  petit état d'exécution délimité par la passerelle
- Métadonnées de sauvegarde et de migration
- Octets de pièce jointe multimédia Gateway. Fait pour les écritures d'exécution ; les chemins de fichiers directs
  sont des matérialisations temporaires pour la compatibilité avec les expéditeurs de canal et la
  mise en zone de préparation de la Sandbox. Les listes autorisées d'exécution acceptent les chemins de matérialisation SQLite, et non les racines
  multimédias d'état/de configuration héritées. Doctor importe les fichiers multimédias hérités dans
  `media_blobs` et supprime les fichiers sources après l'écriture réussie des lignes.
- Sessions, événements et blobs de charge utile de capture du proxy de débogage. Fait : les captures se font en direct
  dans la base de données d'état partagée et s'ouvrent via les paramètres d'amorçage, de schéma,
  de WAL et de délai d'attente occupé de la base de données d'état partagée. Il n'y a pas de base de données
  de remplacement sidecar d'exécution du proxy de débogage, de répertoire de blobs, ou de cible
  de schéma/génération de code uniquement pour la capture proxy.

Cette phase supprime également les ouvreurs sidecar en double, les assistants de permission, la configuration
WAL, l'élagage du système de fichiers et les rédacteurs de compatibilité de ces sous-systèmes.

### Phase 2 : Introduire des bases de données par agent

Créer une base de données par agent et l'enregistrer depuis la base de données globale :

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

La ligne `agent_databases` globale stocke le chemin, la version du schéma, l'horodatage de la dernière vue
et les métadonnées de base de taille/intégrité. Le code d'exécution demande au registre
la base de données de l'agent au lieu de dériver directement les chemins de fichiers.

La base de données de l'agent possède :

- `sessions` comme racine de session canonique, avec `session_entries` comme la
  table de charge utile formatée pour la compatibilité attachée à cette racine, et
  `session_routes` comme la recherche `session_key` active unique
- `conversations` et `session_conversations` en tant qu'identité de routage du fournisseur normalisée attachée aux sessions
- `transcript_events`
- instantanés de transcript et points de contrôle de compactage. Effectué pour les écritures à l'exécution.
- `vfs_entries`
- `tool_artifacts` et artefacts d'exécution
- lignes d'exécution/cache locales à l'agent. Effectué pour les caches délimités au worker.
- événements de flux parent ACP
- événements d'exécution de trajectoire lorsqu'ils ne sont pas des artefacts d'exportation explicites

### Phase 3 : Remplacer les API de Session Store

Effectué pour l'exécution. La surface du magasin de sessions de type fichier n'est pas un contrat d'exécution actif :

- L'exécution n'appelle plus `loadSessionStore(storePath)` ni ne traite `storePath` comme identité de session.
- Les opérations sur les lignes de l'exécution sont `getSessionEntry`, `upsertSessionEntry`, `patchSessionEntry`, `deleteSessionEntry` et `listSessionEntries`.
- Les aides de réécriture du magasin entier, les rédacteurs de fichiers, les tests de file d'attente, l'élagage des alias et les paramètres de suppression de clés hérités ont disparu de l'exécution.
- Les exportations de compatibilité obsolètes du package racine adaptent toujours les chemins `sessions.json` canoniques sur les API de lignes SQLite.
- L'analyse `sessions.json` ne subsiste que dans le code de migration/importation du docteur et les tests du docteur.
- Les lectures de repli du cycle de vie de l'exécution lisent les en-têtes de transcript SQLite, et non les premières lignes JSONL.

Continuer à supprimer tout ce qui réintroduit des paramètres de verrouillage de fichiers, un vocabulaire d'élagage/troncature en tant que maintenance de fichiers, une identité de chemin de magasin, ou des tests dont la seule assertion est la persistance JSON.

### Phase 4 : Déplacer les Transcripts, les flux ACP, les trajectoires et le VFS

Rendre chaque flux de données d'agent natif à la base de données :

- Les écritures d'ajout de transcript passent par une seule transaction SQLite qui assure l'en-tête de session, vérifie l'idempotence des messages, sélectionne la queue parente, insère dans `transcript_events` et enregistre les métadonnées d'identité interrogeables dans `transcript_event_identities`. Effectué pour les ajouts directs de messages de transcript et les ajouts `TranscriptSessionManager` persistés normaux ; les opérations de branchement explicites conservent leur choix parent explicite et écrivent toujours des lignes SQLite sans dériver de localisateur de fichier.
- Les journaux du flux parent ACP deviennent des lignes, pas des fichiers `.acp-stream.jsonl`. Fait.
- La configuration de l'apparition ACP ne persiste plus les chemins JSONL des transcriptions. Fait.
- La capture de la trajectoire d'exécution écrit directement les lignes d'événements/artefacts. La commande explicite de support/export peut toujours produire des artefacts JSONL de bundle de support en tant que format d'export, mais l'export de session ne recrée pas le JSONL de session. Fait.
- Les espaces de travail sur disque restent sur disque lorsqu'ils sont configurés en mode disque.
- Le mode brouillon VFS et le mode d'espace de travail expérimental VFS uniquement utilisent la base de données de l'agent.

La migration importe les anciens fichiers JSONL une seule fois, enregistre les comptes/hachages dans `migration_runs`, et supprime les fichiers importés après les vérifications d'intégrité.

### Phase 5 : Sauvegarde, Restauration, Nettoyage et Vérification

Les sauvegardes restent un fichier d'archive :

- Créer un point de contrôle pour chaque base de données globale et agent.
- Capturer instantanément chaque base de données avec la sémantique de sauvegarde SQLite ou `VACUUM INTO`.
- Archiver les instantanés compacts de la base de données, la configuration, les identifiants externes et les exports d'espace de travail demandés.
- Omettre les fichiers bruts en direct `*.sqlite-wal` et `*.sqlite-shm`.
- Vérifier en ouvrant chaque instantané de base de données et en exécutant `PRAGMA integrity_check`. `openclaw backup create` effectue cette vérification d'archive par défaut ; `--no-verify` ne saute que la passe d'archive post-écriture, et non la vérification d'intégrité de la création de l'instantané.
- La restauration copie les instantanés vers leurs chemins cibles. Cette branche réinitialise la disposition SQLite non expédiée à `user_version = 1` ; les futurs changements de schéma expédiés peuvent ajouter des migrations explicites lorsqu'elles sont nécessaires.

### Phase 6 : Runtime du Worker

Garder le mode worker expérimental pendant que le partage de la base de données est effectué :

- Les workers reçoivent l'identifiant de l'agent, l'identifiant de l'exécution, le mode du système de fichiers et l'identité du registre de base de données.
- Chaque worker ouvre sa propre connexion SQLite.
- Le parent conserve l'autorité de livraison sur le channel, les approbations, la configuration et l'annulation.
- Commencer avec un worker par exécution active ; ajouter la mise en commun (pooling) uniquement après que le cycle de vie et la propriété de la connexion à la base de données sont stables.

### Phase 7 : Supprimer l'ancien monde

Terminé pour la gestion des sessions d'exécution. L'ancien monde est autorisé uniquement en tant qu'entrée explicite de docteur ou sortie de support/export :

- Pas d'écritures d'exécution `sessions.json`, de JSONL de transcription, de JSON de registre de bac à sable, de SQLite sidecar de tâche, ou de SQLite sidecar d'état de plugin.
- Aucun nettoyage des fichiers JSON/session, aucune troncation des transcriptions de fichiers, aucun verrouillage de fichiers de session,
  ni tests de session de type verrou.
- Aucune exportation de compatibilité d'exécution dont le but est de maintenir les anciens fichiers de session
  à jour.
- Les exportations de support explicite restent des formats d'archive/matérialisation demandés par l'utilisateur
  et ne doivent pas réinjecter les noms de fichiers dans l'identité d'exécution.

## Sauvegarde Et Restauration

Les sauvegardes doivent être un fichier d'archive unique, mais la capture de la base de données doit être
native SQLite :

1. Arrêtez les activités d'écriture de longue durée ou entrez dans une courte barrière de sauvegarde.
2. Pour chaque base de données globale et d'agent, exécutez un point de contrôle.
3. Créez une instantané de chaque base de données en utilisant la sémantique de sauvegarde SQLite ou `VACUUM INTO` dans un
   répertoire de sauvegarde temporaire.
4. Archivez les instantanés de base de données compactés, le fichier de configuration, le répertoire des identifiants,
   les espaces de travail sélectionnés et un manifeste.
5. Vérifiez l'archive en ouvrant chaque instantané SQLite inclus et en exécutant
   `PRAGMA integrity_check`.
   `openclaw backup create` fait cela par défaut ; `--no-verify` n'est utilisé que pour
   sauter intentionnellement la passe d'archive après écriture.

Ne comptez pas sur les copies brutes en direct de `*.sqlite`, `*.sqlite-wal` et `*.sqlite-shm` comme
format de sauvegarde principal. Le manifeste de l'archive doit enregistrer le rôle de la base de données,
l'identifiant de l'agent, la version du schéma, le chemin source, le chemin de l'instantané, la taille en octets et l'état d'intégrité.

La restauration doit reconstruire les fichiers de la base de données globale et des bases de données d'agents à partir des
instantanés d'archive. Comme la disposition SQLite n'a pas encore été expédiée, cette refactorisation
ne conserve que le schéma version-1 plus l'importation fichier-vers-base de données du doctor. La commande
de restauration valide d'abord l'archive, puis remplace chaque élément du manifeste à partir de la
charge utile extraite vérifiée.

## Plan De Refactorisation De L'exécution

1. Ajoutez les API de registre de base de données.
   - Résolvez les chemins de la base de données globale et des bases de données par agent.
   - Conservez les schémas non expédiés à `user_version = 1` ; n'ajoutez pas de code
     d'exécuteur de migration de schéma avant qu'un schéma expédié n'en ait besoin.
   - Ajoutez les assistants de fermeture/point de contrôle/intégrité utilisés par les tests, la sauvegarde et le doctor.

2. Effondrez les magasins SQLite latéraux.
   - Déplacez les tables d'état des plugins dans la base de données globale. Fait pour les écritures
     d'exécution ; l'importateur latéral hérité non expédié est supprimé.
   - Déplacer les tables du registre des tâches vers la base de données globale. Effectué pour les écritures d'exécution ; l'importateur de fichier annexe hérité non livré est supprimé.
   - Déplacer les tables de flux de tâches vers la base de données globale. Effectué pour les écritures d'exécution ; l'importateur de fichier annexe hérité non livré est supprimé.
   - Déplacer les tables de recherche de mémoire intégrées dans chaque base de données d'agent. Effectué ; la `memorySearch.store.path` personnalisée explicite est désormais supprimée par la migration de la configuration du docteur. La réindexation complète s'exécute en place uniquement sur les tables de mémoire ; l'ancien chemin d'échange de fichiers entiers et l'assistant d'échange d'index de fichier annexe sont supprimés.
   - Supprimer les ouvreurs de base de données en double, la configuration WAL, les assistants d'autorisation et les chemins de fermeture de ces sous-systèmes.

3. Déplacer les tables appartenant aux agents vers des bases de données par agent.
   - Créer la base de données de l'agent à la demande via le registre global des bases de données. Effectué.
   - Déplacer les entrées de session d'exécution, les événements de transcription, les lignes VFS et les artefacts d'outil vers les bases de données des agents. Effectué.
   - Ne pas migrer les entrées de session, les événements de transcription, les lignes VFS ou les artefacts d'outil de la base de données partagée locale à la branche ; cette disposition n'a jamais été livrée. Ne conserver que l'importation de fichier vers base de données héritée dans le docteur.

4. Remplacer les API de stockage de session.
   - Supprimer `storePath` en tant qu'identité d'exécution. Terminé pour l'exécution et sécurisé par `check:database-first-legacy-stores`CLI : les métadonnées de session, les mises à jour de routage, la persistance des commandes, le nettoyage de session CLI, les prévisualisations de raisonnement Feishu, la persistance de l'état des transcriptions, la profondeur des sous-agents, les remplacements de session de profil d'authentification, la logique de bifurcation parente et l'inspection du laboratoire QA résolvent désormais la base de données à partir des clés canoniques d'agent/de session. Les réponses de la liste de sessions Gateway/TUI/UI/macOS exposent désormais `databasePath` au lieu de l'ancien `path` ; les surfaces de débogage macOS affichent la base de données par agent en tant qu'état en lecture seule au lieu d'écrire la configuration `session.store`. `/status`, l'export de trajectoire piloté par le chat et les proxys de dépendances CLI ne propagent plus les chemins de stockage hérités ; la lecture de repli d'utilisation des transcriptions lit SQLite par identité d'agent/de session. Les tests d'exécution et de pont n'exposent plus `storePath` ; les entrées de docteur/migration possèdent ce nom de champ hérité. Le chargement de session combinée Gateway n'a plus de branche d'exécution spéciale pour les valeurs `session.store` sans modèle ; il agrège les lignes SQLite par agent. La voie de docteur de verrouillage de session héritée et son assistant de nettoyage `.jsonl.lock` ont été supprimés ; SQLite est désormais la limite de concurrence des sessions. Les sites d'appel d'exécution à chaud utilisent des noms d'assistants orientés lignes tels que `resolveSessionRowEntry` ; l'ancien alias de compatibilité `resolveSessionStoreEntry` a été supprimé des exportations du SDK d'exécution et de plugin.

- Utiliser les opérations de ligne `{ agentId, sessionKey }`. Terminé : `getSessionEntry`, `upsertSessionEntry`, `deleteSessionEntry`, `patchSessionEntry` et `listSessionEntries` sont des API prioritaires pour SQLite qui ne nécessitent pas de chemin de stockage de session. Le résumé de statut, le statut de l'agent local, la santé et la commande de liste `openclaw sessions` lisent désormais directement les lignes par agent et affichent les chemins de base de données SQLite par agent au lieu des chemins `sessions.json`.
- Remplacer la suppression/insertion de l'ensemble du magasin par `upsertSessionEntry`,
  `deleteSessionEntry`, `listSessionEntries` et des requêtes de nettoyage SQL.
  Fait pour l'exécution : les chemins chauds utilisent désormais les API de ligne et les correctifs de ligne réessayés en cas de conflit ;
  les assistants d'importation/remplacement de l'ensemble du magasin restants sont limités au code d'importation de migration
  et aux tests du backend SQLite.
  - Supprimer `store-writer.ts` et les tests de la file d'attente d'écriture. Fait.
  - Supprimer les paramètres d'élagage de clé héritée et de suppression d'alias de l'exécution
    à partir des upserts/correctifs de ligne de session. Fait.

5. Supprimer le comportement du registre JSON de l'exécution.
   - Rendre les lectures et écritures du registre du bac à sable exclusivement SQLite. Fait.
   - Importer les JSON monolithiques et partitionnés uniquement à partir de l'étape de migration. Fait.
   - Supprimer les verrous de registre partitionnés et les écritures JSON. Fait.

- Conserver une table de registre typée au lieu de stocker les lignes de registre sous forme de JSON
  opaque générique si la forme reste un état opérationnel de chemin chaud. Fait.

6. Supprimer la mutation de session sous forme de verrou de fichier.
   - Fait pour la création de verrou d'exécution et les API de verrou d'exécution.
   - La voie de nettoyage du médecin héritée autonome `.jsonl.lock` est supprimée.
   - `session.writeLock` est une configuration héritée migrée par le médecin, et non un paramètre d'exécution typé.
   - L'intégrité de l'état n'a plus de chemin distinct d'élagage de fichiers de transcription orphelins ;
     la migration du médecin importe/supprime les sources JSONL héritées en un seul endroit.
   - La coordination du singleton Gateway utilise des lignes SQLite `state_leases` typées sous
     `gateway_locks` et n'expose plus de jointure de répertoire de verrouillage de fichiers.
   - La persistance de déduplication du SDK de plugin générique n'utilise plus de verrous de fichiers ou de fichiers JSON ;
     elle écrit des lignes d'état de plugin SQLite partagées. Fait.
   - La coordination d'intégration QMD utilise un bail d'état SQLite au lieu de
     `qmd/embed.lock`. Fait.

7. Rendre les workers conscients de la base de données.
   - Les workers ouvrent leurs propres connexions SQLite.
   - Le parent possède la livraison, les rappels de canal et la configuration.
   - Le worker reçoit l'identifiant de l'agent, l'identifiant d'exécution, le mode de système de fichiers et l'identité du registre de base de données,
     et non des handles en direct.
   - `vfs-only` reste expérimental et utilise la base de données de l'agent comme racine de son stockage.
   - Garder d'abord un worker par exécution active. La mise en commun peut attendre que la durée de vie de la connexion DB
     et le comportement d'annulation soient triviaux.

8. Intégration de sauvegarde.
   - Apprendre à la sauvegarde à créer des instantanés des bases de données globales et des agents via la sauvegarde SQLite ou
     `VACUUM INTO`. Fait pour les fichiers `*.sqlite` découverts sous l'élément d'état (state asset).
   - Ajouter une vérification de sauvegarde pour l'intégrité SQLite et la version du schéma. Fait pour
     la création de sauvegarde et les vérifications d'intégrité par défaut des archives.
   - Enregistrer les métadonnées d'exécution de sauvegarde dans SQLite. Fait via la table `backup_runs`
     partagée avec le chemin de l'archive, le statut et le manifeste JSON.
   - Ajouter la restauration à partir d'instantanés d'archives vérifiés. Fait : `openclaw backup
restore` valide avant l'extraction, utilise le manifeste normalisé du vérificateur,
     prend en charge `--dry-run` et nécessite `--yes` avant de remplacer
     les chemins sources enregistrés.
   - Inclure l'exportation VFS/espace de travail uniquement sur demande ; ne pas exporter les
     éléments internes de session au format JSON ou JSONL.

9. Supprimer les tests et le code obsolètes. Fait pour les surfaces de session d'exécution connues.

- Supprimez les tests qui vérifient la création à l'exécution de fichiers `sessions.json` ou de fichiers JSONL de transcription. Effectué pour le magasin de sessions principal, le chat, les événements de transcription de la passerelle, l'aperçu, le cycle de vie, les mises à jour des entrées de session de commande, la réinitialisation/le suivi de réponse automatique et les appareils de rêve du cœur de mémoire, le routage de la cible d'approbation, la réparation de la transcription de session, la réparation des autorisations de sécurité, l'exportation de trajectoire et l'exportation de session.
  Les tests de transcription de mémoire active vérifient désormais les portées SQLite et aucune création de fichiers JSONL temporaires ou persistants.
  L'ancienne régression de l'élagage de la transcription du heartbeat a été supprimée car l'exécution ne tronque plus les transcriptions JSONL.
  Les tests de l'outil de liste de sessions de l'agent ne modélisent plus les chemins `sessions.json`macOS hérités comme forme de réponse de la passerelle ; les tests d'application/UI/macOS utilisent `databasePath`.
  Les tests d'utilisation de la transcription `/status` initialisent désormais directement les lignes de transcription SQLite au lieu d'écrire des fichiers JSONL.
  Les tests de cycle de vie de session de la Gateway utilisent désormais directement les assistants d'initialisation de transcription SQLite ; l'ancienne forme d'appareil de fichier de session sur une seule ligne a disparu de la couverture de réinitialisation et de suppression.
  `sessions.delete` ne renvoie plus de champ `archived: []` de l'époque des fichiers ; la suppression ne rapporte que le résultat de la mutation de ligne. L'ancienne option `deleteTranscript` a également disparu : supprimer une session supprime la racine `sessions` canonique et permet à SQLite de cascader les lignes de transcription, d'instantané et de trajectoire appartenant à la session, afin qu'aucun appelant ne puisse laisser des orphelins de transcription ou oublier une branche de nettoyage.
  Les tests de capture de trajectoire du moteur de contexte lisent désormais les lignes `trajectory_runtime_events` à partir d'une base de données d'agent isolée au lieu de lire `session.trajectory.jsonl`.
  Les scripts d'initialisation de canal Docker MCP initialisent désormais directement les lignes SQLite. Les écritures directes `sessions.json` sont limitées aux appareils de docteur.
  Le E2E de recherche d'outil de la Gateway lit les preuves d'appel d'outil à partir des lignes de transcription SQLite au lieu de scanner les fichiers `agents/<agentId>/sessions/*.jsonl`.
  Les événements d'hôte du cœur de mémoire et les lignes scratch du corpus de session vivent désormais dans l'état du plugin SQLite partagé ; `events.jsonl` et `session-corpus/*.txt` sont uniquement des entrées de migration de docteur héritées. Les lignes actives utilisent des chemins virtuels `memory/session-ingestion/`, pas `.dreams/session-corpus`. L'ancien module de réparation de rêve du cœur de mémoire et ses tests CLI/Gateway ont été supprimés car l'exécution ne possède plus la réparation d'archives de fichiers pour ce corpus. Les tests de pont/artefact public du cœur de mémoire n'exposent plus `.dreams/events.jsonl` ; ils utilisent le nom d'artefact JSON virtuel soutenu par SQLite.
  La documentation de test du SDK public/Codex mentionne désormais l'état de session SQLite au lieu des fichiers de session, et l'exemple de tour de canal n'expose plus d'argument `storePath`.
  L'état de synchronisation Matrix utilise désormais directement le magasin d'état du plugin SQLite. Les contrats client/exécution actuels passent une racine de stockage de compte, pas un chemin `bot-storage.json`, et le docteur importe les `bot-storage.json` hérités dans SQLite avant de supprimer la source. Les scénarios QA de redémarrage/destruction Matrix mutent désormais directement la ligne de synchronisation SQLite au lieu de créer ou de supprimer de faux fichiers `bot-storage.json`, et le substrat E2EE passe une racine de magasin de synchronisation au lieu d'un faux chemin `sync-store.json`.
  La sélection de la racine de stockage Matrix ne note plus les racines par les fichiers JSON de synchronisation/fil hérités ; elle utilise les métadonnées de racine durables plus l'état cryptographique réel.
  La suite de tests du backend de session SQLite de l'exécution ne fabrique plus de `sessions.json` ; les appareils source hérités vivent désormais dans les tests de docteur qui les importent.
  Les tests de session de la Gateway n'exposent plus d'assistant `createSessionStoreDir` ou de configuration de chemin de magasin de session temporaire inutilisé ; les répertoires d'appareils sont explicites, et la configuration directe de ligne utilise la nommage des lignes de session SQLite.
  La couverture de l'analyseur de magasin de sessions JSON5 réservée au docteur a été déplacée hors des tests d'infra et vers les tests de migration du docteur, donc les suites de tests d'exécution ne possèdent plus l'analyse de fichiers de session hérités.
  Les tests d'exécution SSO/téléchargement en attente Microsoft Teams ne transportent plus d'appareils ou d'analyseurs de sidecar JSON ; l'analyse de jeton SSO héritée ne vit que dans le module de migration de plugin. Les tests Telegram n'initialisent plus de faux chemins de magasin `/tmp/*.json` ; ils réinitialisent directement le cache de messages soutenu par SQLite. L'assistant d'état de test générique OpenClaw n'expose plus d'enregistreur `auth-profiles.json` hérité ; les tests de migration d'auth du docteur possèdent cet appareil localement.
  Les tests d'exécution pour les pointeurs de dernière session TUI, les approbations d'exécution, les bascules de mémoire active, la vérification de déduplication/démarrage Matrix, la synchronisation de source Memory Wiki, les liaisons de conversation actuelle, l'authentification d'intégration et les importations de secrets Hermes ne fabriquent plus d'anciens fichiers sidecar ou n'affirment plus que les anciens noms de fichiers sont absents. Ils prouvent le comportement via les lignes SQLite et les API de magasin public ; les tests de docteur/migration sont le seul endroit où appartiennent les noms de fichiers source hérités.
  Les tests d'exécution pour le jumelage appareil/nœud, le canal allowFrom, les intentions de redémarrage, la transition de redémarrage, les entrées de file de livraison de session, la santé de la configuration, les caches iMessage, les tâches cron, les en-têtes de transcription PI, les registres de sous-agent et les pièces jointes d'image gérées ne créent plus non plus de fichiers JSON/JSONL retirés juste pour prouver qu'ils sont ignorés ou absents.
  La récupération de débordement PI n'a plus de repli de réécriture/troncature SessionManager : la troncature des résultats d'outil et les réécritures de transcription du moteur de contexte mutent les lignes de transcription SQLite, puis actualisent l'état d'invite actif à partir de la base de données.
  Les ajouts de messages SessionManager persistés délèguent à l'assistant d'ajout de transcription SQLite atomique pour la sélection du parent et l'idempotence. Les ajouts normaux d'entrées de métadonnées/personnalisées sélectionnent également le parent actuel à l'intérieur de SQLite, de sorte que les instances de gestionnaire obsolètes ne résument pas les courses de chaîne de parent pré-SQLite.
  Le nettoyage de la queue PI synthétique pour les prévérifications de tour et `sessions_yield` coupe désormais directement l'état de transcription SQLite ; l'ancien pont de suppression de queue SessionManager et ses tests sont supprimés.
  La capture de point de contrôle de compactation capture également des instantanés uniquement à partir de SQLite ; les appelants ne passent plus de SessionManager en direct comme source de transcription alternative.
- Conserver uniquement les tests qui initialisent des fichiers hérités pour la migration.
- La preuve par fichier JSON a été remplacée par la preuve par ligne SQL pour les surfaces d'exécution actives.

- Ajouter des interdictions statiques pour les écritures d'exécution sur les chemins JSON de session/cache hérités. Fait pour le gardien de dépôt.

10. Rendre le rapport de migration auditable.
    - Enregistrer les exécutions de migration dans SQLite avec des horodatages de début/fin, les chemins source, les hachages source, les comptes, les avertissements et le chemin de sauvegarde. Fait : les exécutions de migration d'état hérité persistent désormais un rapport `migration_runs` avec l'inventaire des chemins/tables source, le SHA-256 du fichier source, les tailles, les comptes d'enregistrements, les avertissements et le chemin de sauvegarde. Fait : les exécutions de migration d'état hérité persistent également des lignes `migration_sources` pour l'audit au niveau source et les futures décisions d'oubli/remplissage.
    - Rendre l'application idempotente. Une réexécution après un import partiel doit soit ignorer une source déjà importée, soit fusionner par clé stable. Fait : les index de session, les transcriptions, les files de livraison, l'état des plugins, les grands livres de tâches et les lignes globales SQLite détenues par l'agent s'importent via des clés stables ou une sémantique upsert/replace, de sorte que les réexécutions fusionnent sans dupliquer les lignes durables.
    - Les imports échoués doivent conserver le fichier source d'origine en place. Fait : les imports de transcriptions échoués laissent désormais la source JSONL d'origine à son chemin détecté, et `migration_sources` enregistre la source comme `warning` avec `removed_source=0` pour la prochaine exécution du docteur.

## Règles de performance

- Une connexion par thread/processus est acceptable ; ne partagez pas les handles entre les workers.
- Utilisez WAL, `foreign_keys=ON`, un délai d'attente occupé de 30 s et de courtes transactions d'écriture `BEGIN IMMEDIATE`.
- Garder les assistants de transaction d'écriture synchrones à moins/qu'une API de transaction asynchrone API n'ajoute une sémantique explicite de mutex/rétropression.
- Garder les écritures de livraison parentales petites et transactionnelles.
- Éviter les réécritures du magasin entier ; utiliser des upsert/suppressions au niveau des lignes.
- Ajouter des index pour les listes par agent, par session, la date de mise à jour, l'ID d'exécution et les chemins d'expiration avant de déplacer le code à chaud.
- Stocker les artefacts volumineux, les médias et les vecteurs sous forme de BLOB ou de lignes BLOB partitionnées, et non en base64 ou JSON de tableaux numériques.
- Garder les entrées d'état de plugin opaques petites et délimitées.
- Ajouter un nettoyage SQL pour la TTL/expiration au lieu de l'élagage du système de fichiers.
  Effectué pour les magasins d'exécution détenus par la base de données : les médias, l'état des plugins, les blobs de plugins,
  la déduplication persistante et le cache de l'agent expirent tous par le biais de lignes SQLite. Le nettoyage
  restant du système de fichiers est limité aux matérialisations temporaires ou aux commandes
  de suppression explicites.

## Bans statiques

Ajouter une vérification du dépôt qui fait échouer les nouvelles écritures d'exécution vers les chemins d'état hérités :

- `sessions.json`
- `*.trajectory.jsonl` sauf pour les outputs materialisés de support-bundle
- `.acp-stream.jsonl`
- `acp/event-ledger.json`
- `cache/*.json` fichiers de cache d'exécution
- `agents/<agentId>/agent/auth.json`
- `agents/<agentId>/agent/models.json`
- `credentials/oauth.json`
- `github-copilot.token.json`
- `openrouter-models.json`
- `auth-profiles.json`
- `auth-state.json`
- `exec-approvals.json`
- `workspace-state.json`
- Matrix Matrix`credentials*.json` et `recovery-key.json`
- `cron/runs/*.jsonl`
- `cron/jobs.json`
- `jobs-state.json`
- `device-pair-notify.json`
- `devices/pending.json`
- `devices/paired.json`
- `devices/bootstrap.json`
- `nodes/pending.json`
- `nodes/paired.json`
- `identity/device.json`
- `identity/device-auth.json`
- `push/web-push-subscriptions.json`
- `push/vapid-keys.json`
- `push/apns-registrations.json`
- `process-leases.json`
- `gateway-instance-id`
- `session-toggles.json`
- Memory-core `.dreams/events.jsonl`
- Memory-core `.dreams/session-corpus/`
- Memory-core `.dreams/daily-ingestion.json`
- Memory-core `.dreams/session-ingestion.json`
- Memory-core `.dreams/short-term-recall.json`
- Memory-core `.dreams/phase-signals.json`
- Memory-core `.dreams/short-term-promotion.lock`
- Skill Workshop `skill-workshop/<workspace>.json`
- Skill Workshop `skill-workshop/skill-workshop-review-*.json`
- Nostr Nostr`bus-state-*.json`
- Nostr Nostr`profile-state-*.json`
- `calls.jsonl`
- `known-users.json`
- `ref-index.jsonl`
- QQBot `session-*.json`
- BlueBubbles BlueBubbles`bluebubbles/catchup/*.json`
- BlueBubbles BlueBubbles`bluebubbles/inbound-dedupe/*.json`
- Telegram Telegram`update-offset-*.json`
- Telegram Telegram`sticker-cache.json`
- Telegram Telegram`*.telegram-messages.json`
- Telegram Telegram`*.telegram-sent-messages.json`
- Telegram Telegram`*.telegram-topic-names.json`
- Telegram Telegram`thread-bindings-*.json`
- iMessage iMessage`catchup/*.json`
- iMessage iMessage`reply-cache.jsonl`
- iMessage iMessage`sent-echoes.jsonl`
- Microsoft Teams Microsoft Teams`msteams-conversations.json`
- Microsoft Teams Microsoft Teams`msteams-polls.json`
- Microsoft Teams Microsoft Teams`msteams-sso-tokens.json`
- Microsoft Teams Microsoft Teams`msteams-delegated.json`
- Microsoft Teams Microsoft Teams`msteams-pending-uploads.json`
- Microsoft Teams Microsoft Teams`*.learnings.json`
- Matrix Matrix`bot-storage.json`
- Matrix Matrix`sync-store.json`
- Matrix Matrix`thread-bindings.json`
- Matrix Matrix`inbound-dedupe.json`
- Matrix Matrix`startup-verification.json`
- Matrix Matrix`storage-meta.json`
- Matrix Matrix`crypto-idb-snapshot.json`
- Discord Discord`model-picker-preferences.json`
- Discord Discord`command-deploy-cache.json`
- sandbox registry shard JSON files
- native hook relay `/tmp` bridge JSON files
- `plugin-state/state.sqlite`
- ad-hoc `openclaw-state.sqlite` runtime sidecars
- `tasks/runs.sqlite`
- `tasks/flows/registry.sqlite`
- `bindings/current-conversations.json`
- `restart-sentinel.json`
- `gateway-restart-intent.json`
- `gateway-supervisor-restart-handoff.json`
- `gateway.<hash>.lock`
- `qmd/embed.lock`
- `commands.log`
- `config-health.json`
- `port-guard.json`
- `settings/voicewake.json`
- `settings/voicewake-routing.json`
- `plugin-binding-approvals.json`
- `plugins/installs.json`
- `audit/file-transfer.jsonl`
- `audit/crestodian.jsonl`
- `crestodian/rescue-pending/*.json`
- `plugins/phone-control/armed.json`
- Wiki mémoire `.openclaw-wiki/log.jsonl`
- Wiki mémoire `.openclaw-wiki/state.json`
- Wiki mémoire `.openclaw-wiki/locks/`
- Wiki mémoire `.openclaw-wiki/source-sync.json`
- Wiki mémoire `.openclaw-wiki/import-runs/*.json`
- Wiki mémoire `.openclaw-wiki/cache/agent-digest.json`
- Wiki mémoire `.openclaw-wiki/cache/claims.jsonl`
- ClawHub ClawHub`.clawhub/lock.json`
- ClawHub ClawHub`.clawhub/origin.json`
- Décoration de profil de navigateur `.openclaw-profile-decorated`
- Ouvreurs de session sauvegardés dans un fichier `SessionManager.open(...)`
- `SessionManager.listAll(...)` et `TranscriptSessionManager.listAll(...)`
  façades de listing de transcription
- `SessionManager.forkFromSession(...)` et
  `TranscriptSessionManager.forkFromSession(...)` façades de bifurcation de transcription
- `SessionManager.newSession(...)` et `TranscriptSessionManager.newSession(...)`
  façades de remplacement de session mutable
- `SessionManager.createBranchedSession(...)` et
  `TranscriptSessionManager.createBranchedSession(...)` façades de session de branche

L'interdiction doit permettre aux tests de créer des fixtures héritées et permettre au code de migration de lire/importer/supprimer les sources de fichiers héritées. Les sidecars SQLite non livrés restent interdits et ne bénéficient pas d'autorisations d'importation docteur.

## Critères de fin

- Les écritures de données d'exécution et de cache vont vers la base de données SQLite globale ou de l'agent.
- Le runtime n'écrit plus d'index de session, de JSONL de transcription, de registre de bac à sable JSON, de sidecar SQLite de tâche ou de sidecar SQLite d'état de plugin. Les importateurs de sidecar SQLite de tâche et d'état de plugin non livrés sont supprimés.
- L'importation de fichiers hérités est réservée au docteur.
- La sauvegarde produit une archive contenant des instantanés SQLite compacts et une preuve d'intégrité.
- Les workers de l'agent peuvent s'exécuter avec un stockage sur disque, VFS scratch, ou le stockage expérimental VFS uniquement.
- Les fichiers de configuration et les fichiers d'identification explicites restent les seuls fichiers de contrôle persistants non base de données attendus.
- Les vérifications du dépôt empêchent la réintroduction de magasins de fichiers d'exécution hérités.
