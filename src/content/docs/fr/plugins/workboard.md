---
summary: "Tableau de travail de tableau de bord facultatif pour les cartes détenues par des agents et le transfert de session"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Plugin Workboard"
---

Le plugin Workboard ajoute un tableau de style Kanban optionnel à l'[interface de contrôle](/fr/web/control-ui). Utilisez-le pour collecter des cartes de travail adaptées aux agents, les leur assigner, et passer d'une carte à la session du tableau de bord liée.

Workboard est volontairement petit. Il suit le travail d'exploitation local pour un OpenClaw Gateway ; il ne remplace pas GitHub Issues, Linear, Jira ou d'autres systèmes de gestion de projet d'équipe.

## État par défaut

Workboard est un plugin groupé et est désactivé par défaut, sauf si vous l'activez dans la configuration du plugin.

Activez-le avec :

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

Ensuite, ouvrez le tableau de bord :

```bash
openclaw dashboard
```

L'onglet Workboard apparaît dans la navigation du tableau de bord. Si l'onglet est visible mais que le plugin est désactivé ou bloqué par `plugins.allow` / `plugins.deny`, la vue affiche un état d'indisponibilité du plugin au lieu des données de carte locales.

## Que contiennent les cartes

Chaque carte stocke :

- titre et notes
- status : `triage`, `backlog`, `todo`, `scheduled`, `ready`, `running`,
  `review`, `blocked` ou `done`
- priorité : `low`, `normal`, `high` ou `urgent`
- étiquettes
- id d'agent facultatif
- session liée facultative, exécution, tâche ou URL source
- métadonnées d'exécution facultatives pour une session Codex ou Claude démarrée à partir de la carte
- métadonnées compactes pour les tentatives, commentaires, liens, preuves, artefacts, automatisation,
  pièces jointes, journaux des workers, état du protocole du worker, réclamations, diagnostics,
  notifications, modèles, état de l'archive et détection de session obsolète
- événements récents de la carte tels que créé, déplacé, lié, réclamé, heartbeat,
  tentative, preuve, artefact, diagnostic, notification, dispatch, archive, obsolète
  ou modifications mises à jour par l'agent

Les cartes sont stockées dans l'état du Gateway du plugin. Elles sont locales au répertoire d'état du Gateway et se déplacent avec le reste de l'état Gateway de ce OpenClaw.

Workboard conserve des métadonnées compactes par carte afin que les opérateurs puissent voir comment une carte a traversé le tableau sans ouvrir la session liée. Les événements, les résumés de tentatives, les extraits de preuve, les liens connexes, les commentaires, les marqueurs d'archive et les marqueurs de session inactive sont des métadonnées intentionnellement locales ; elles ne remplacent pas les transcriptions de session ni l'historique des problèmes GitHub.

## Exécutions de cartes

Les cartes non liées peuvent démarrer le travail à partir de la carte. L'action Démarrer utilise l'agent et le modèle par défaut configurés du Gateway. Les actions Codex et Claude sont des choix explicites optionnels de modèle :

- Lancer Codex ou Lancer Claude crée une session de tableau de bord, envoie l'invite de la carte
  et marque la carte `running`.
- Ouvrir Codex ou Ouvrir Claude crée une session de tableau de bord liée sans envoyer l'invite de la carte ni déplacer la carte, afin que vous puissiez travailler manuellement tout en restant attaché au tableau.

Les métadonnées d'exécution stockent le moteur sélectionné, le mode, la référence du modèle, la clé de session,
l'ID d'exécution et l'état du cycle de vie sur la carte. Les exécutions Codex utilisent
`openai/gpt-5.5` ; les exécutions Claude utilisent `anthropic/claude-sonnet-4-6`.

Chaque exécution liée enregistre également un résumé de tentative sur le même enregistrement de carte. Le résumé de tentative conserve le moteur, le mode, le modèle, l'ID d'exécution, les horodatages, l'état et le décompte cumulé des échecs afin que les échecs répétés restent visibles sur le tableau.

## Coordination des agents

Workboard expose également des outils d'agent optionnels pour les flux de travail conscients du tableau :

- `workboard_list` liste les cartes compactes avec l'état des réclamations et des diagnostics, avec un
  filtre de tableau optionnel.
- `workboard_read` renvoie une carte plus un contexte de worker délimité built à partir de notes,
  tentatives, commentaires, liens, preuves, artefacts, résultats parents, travail récent de l'assignataire
  et diagnostics actifs.
- `workboard_create` crée une carte avec des parents optionnels, tenant, compétences,
  tableau, métadonnées de l'espace de travail, clé d'idempotence, limite d'exécution et budget de nouvelle tentative.
- `workboard_link` lie une carte parente à une carte fille. Les filles restent dans `todo`
  jusqu'à ce que chaque parent atteigne `done` ; ensuite la promotion par répartition les déplace vers
  `ready`.
- `workboard_claim` réserve une carte pour l'agent appelant et déplace les cartes de backlog, à faire,
  ou prêtes vers `running`.
- `workboard_heartbeat` actualise le battement de cœur de la réservation pendant les exécutions longues.
- `workboard_release` libère la réservation après l'achèvement, la pause ou le transfert et
  peut déplacer la carte vers un statut suivant.
- `workboard_complete` et `workboard_block` sont des outils de cycle de vie structurés pour
  les résumés finaux, les preuves, les artefacts, les manifestes de cartes créées et les raisons
  de blocage. Les manifestes de cartes créées doivent référencer les cartes liées en retour vers la
  carte terminée, ce qui empêche les enfants fantômes d'apparaître dans les résumés.
- `workboard_attachment_add`, `workboard_attachment_read` et
  `workboard_attachment_delete` stockent de petites pièces jointes de carte dans l'état SQLite
  du plugin, les indexent sur la carte et les exposent dans le contexte du travailleur.
- `workboard_worker_log` et `workboard_protocol_violation` enregistrent les lignes de
  journal du travailleur et bloquent les cartes lorsqu'un travailleur automatisé s'arrête sans appeler
  `workboard_complete` ou `workboard_block`.
- `workboard_board_create`, `workboard_board_archive` et
  `workboard_board_delete` gèrent les métadonnées persistantes du tableau telles que le nom d'affichage,
  la description, l'état d'archivage et l'espace de travail par défaut.
- `workboard_runs` renvoie l'historique persistant des tentatives d'exécution stocké sur une carte.
- `workboard_specify` transforme une carte de triage approximatif ou de backlog en une carte `todo` clarifiée
  et enregistre le résumé de la spécification sur la carte.
- `workboard_decompose` éclate une carte d'orchestration parente en enfants liés,
  hérite des métadonnées du tableau et du client, et peut terminer le parent avec un
  manifeste de cartes créées.
- `workboard_notify_subscribe`, `workboard_notify_list`,
  `workboard_notify_events`, `workboard_notify_advance` et
  `workboard_notify_unsubscribe` gèrent les abonnements aux notifications dans l'état du
  plugin. Les lectures d'événements sont sûres en cas de relecture ; l'outil d'avancée (advance tool)
  déplace le curseur durable afin que les appelants puissent reprendre sans perdre
  ni relire les événements de carte terminés, échoués ou obsolètes.
- `workboard_boards`, `workboard_stats`, `workboard_promote`,
  `workboard_reassign`, `workboard_reclaim`, `workboard_comment`,
  `workboard_proof`, `workboard_unblock` et `workboard_dispatch` permettent à un agent
  d'inspecter les espaces de noms du tableau, de consulter les statistiques de la file d'attente,
  de récupérer le travail bloqué, d'ajouter des notes de transfert, d'attacher des preuves
  ou des références d'artefacts, de remettre le travail bloqué dans `todo`,
  et de stimuler la promotion des dépendances ou le nettoyage des réclamations obsolètes.

Les cartes réclamées rejettent les mutations d'outils d'agent provenant d'autres agents,
sauf si l'appelant possède le jeton de réclamation renvoyé par `workboard_claim`.
Les opérateurs du tableau de bord utilisent toujours la surface RPC normale du GatewayRPC
et peuvent récupérer ou réattribuer des cartes.

Workboard stocke les données durables du tableau dans une base de données relationnelle SQLite
appartenant au plugin, sous le répertoire d'état OpenClaw. Les tableaux,
les cartes, les étiquettes, les événements de cycle de vie, les tentatives d'exécution,
les commentaires, les liens de dépendance, les preuves, les références d'artefacts,
les métadonnées et blobs de pièces jointes, les diagnostics, les notifications,
les journaux de travail, l'état du protocole et les abonnements sont persistés
dans les tables Workboard au lieu des entrées clé-valeur du plugin. Une exportation de carte
préserve toujours la narration du tableau sans inclure le contenu des blobs de pièces jointes.

Les installations qui ont utilisé Workboard dans la version `.28` peuvent exécuter
`openclaw doctor --fix` pour migrer les espaces de noms d'état de plugin hérités livrés
(`workboard.cards`, `workboard.boards` et `workboard.notify`) vers la
base de données relationnelle. Si un espace de noms `workboard.attachments` hérité est présent,
doctor migre également ces blobs de pièces jointes.

Les diagnostics de Workboard sont calculés à partir des métadonnées locales des cartes. Les vérifications intégrées signalent les cartes assignées qui attendent trop longtemps, les cartes en cours d'exécution sans battement de cœur récent, les cartes bloquées nécessitant une attention, les échecs répétés, les cartes terminées sans preuve, et les cartes en cours d'exécution qui n'ont qu'un lien de session lâche.

La répartition est intentionnellement locale au Gateway. Elle ne génère pas de processus de système d'exploitation arbitraires ; les sessions OpenClaw normales possèdent toujours l'exécution. Un coup de pouce de répartition promeut les cartes prêtes pour les dépendances, enregistre les métadonnées de répartition sur les cartes prêtes, bloque les réclamations expirées ou les exécutions expirées, marque les cartes de triage configurées par le tableau comme candidats à l'orchestration, et laisse des abonnements de notification durables pour l'appelant qui délivre les notifications.

Les métadonnées du tableau peuvent inclure des paramètres d'orchestration tels que `autoDecompose`, `autoDecomposePerDispatch`, `defaultAssignee` et `orchestratorProfile`. OpenClaw enregistre l'intention d'orchestration et l'expose dans le contexte du travailleur ; la spécification réelle, la décomposition ou le démarrage de session se produisent toujours via les outils Workboard normaux et le flux de session du tableau de bord.

## Synchronisation du cycle de vie de la session

Les cartes peuvent être liées à des sessions de tableau de bord existantes ou à la session créée lorsque vous commencez le travail à partir d'une carte. Les cartes liées affichent le cycle de vie de la session en ligne : en cours d'exécution, périmée, inactive liée, terminée, échouée ou manquante.

Si la session liée est manquante, la carte reste liée pour le contexte et offre toujours des contrôles de démarrage afin que vous puissiez redémarrer le travail dans une nouvelle session de tableau de bord. Si une session liée active cesse de signaler une activité récente, Workboard marque la carte comme périmée et stocke le marqueur dans les métadonnées de la carte jusqu'à ce que le cycle de vie l'efface.

Vous pouvez également capturer une session de tableau de bord existante à partir de l'onglet Sessions avec Ajouter à Workboard. La carte est liée à cette session, utilise l'étiquette de la session ou la dernière invite de l'utilisateur comme titre, et remplit les notes à partir de la dernière invite de l'utilisateur plus la dernière réponse de l'assistant lorsque l'historique du chat est disponible.

Workboard suit la session liée tant que la carte est encore dans un état de travail actif :

- session liée active -> `running`
- session liée terminée -> `review`
- session liée échouée, tuée, expirée ou abandonnée -> `blocked`

Les états de révision manuelle priment. Si vous déplacez une carte vers `review`, `blocked` ou `done`,
Workboard cesse de déplacer automatiquement cette carte jusqu'à ce que vous la remettiez dans `todo` ou
`running`.

## Flux de travail du tableau de bord

1. Ouvrez l'onglet Workboard dans l'interface de contrôle.
2. Créez une carte avec un titre, des notes, une priorité, des étiquettes, un agent optionnel et
   une session liée optionnelle.
3. Ou ouvrez Sessions et choisissez Ajouter à Workboard pour une session existante.
4. Faites glisser la carte entre les colonnes ou utilisez les contrôles de colonne.
5. Démarrez le travail depuis la carte pour créer ou réutiliser une session de tableau de bord.
6. Ouvrez la session liée depuis la carte pendant que l'agent travaille.
7. Laissez la synchronisation du cycle de vie déplacer le travail en cours vers révision ou bloqué, puis déplacez
   manuellement la carte vers terminé une fois acceptée.

Le démarrage d'une carte utilise des sessions normales de Gateway. Le plugin Workboard ne stocke que
les métadonnées et les liens de la carte ; la transcription de la conversation, la sélection du modèle et le cycle de
vie de l'exécution restent la propriété du système de session standard.

Utilisez Stop sur une carte liée en direct pour abandonner l'exécution de la session active. Workboard marque
cette carte `blocked` afin qu'elle reste visible pour le suivi.

Les nouvelles cartes peuvent démarrer à partir de modèles Workboard pour les corrections de bugs, la documentation, les versions, les revues de PR
ou le travail de plugin. Les modèles pré-remplissent le titre, les notes, les étiquettes et la priorité,
et l'identifiant du modèle sélectionné est stocké en tant que métadonnées de la carte.

## Autorisations

Le plugin enregistre les méthodes Gateway du RPC sous l'espace de noms `workboard.*` :

- `workboard.cards.list` nécessite `operator.read`
- `workboard.cards.export` nécessite `operator.read`
- `workboard.cards.diagnostics` nécessite `operator.read`
- `workboard.cards.diagnostics.refresh` nécessite `operator.write`
- la liste/obtention des pièces jointes et les lectures d'événements de notification nécessitent `operator.read`
- l'avancement du curseur de notification nécessite `operator.write`
- les méthodes create, update, move, delete, comment, link, dependency link, proof, artifact,
  attachment add/delete, worker log, protocol violation, claim, heartbeat,
  release, complete, block, unblock, dispatch, bulk et archive nécessitent
  `operator.write`

Les navigateurs connectés avec un accès opérateur en lecture seule peuvent inspecter le tableau mais
ne peuvent pas modifier les cartes.

## Configuration

Workboard n'a aucune configuration spécifique au plugin pour le moment. Activez-le ou désactivez-le avec
l'entrée de plugin standard :

```json5
{
  plugins: {
    entries: {
      workboard: {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Désactivez-le à nouveau avec :

```bash
openclaw plugins disable workboard
openclaw gateway restart
```

## Dépannage

### L'onglet indique que Workboard n'est pas disponible

Vérifiez la stratégie du plugin :

```bash
openclaw plugins inspect workboard --runtime --json
```

Si `plugins.allow` est configuré, ajoutez `workboard` à cette liste d'autorisation. Si
`plugins.deny` contient `workboard`, supprimez-le avant d'activer le plugin.

### Les cartes ne sont pas sauvegardées

Confirmez que la connexion du navigateur dispose de l'accès `operator.write`. Les sessions d'opérateur
en lecture seule peuvent lister les cartes mais ne peuvent pas les créer, les modifier, les déplacer ou les supprimer.

### Le démarrage d'une carte n'ouvre pas la session attendue

Workboard crée des liens vers des sessions de tableau de bord normales. Vérifiez l'ID de l'agent de la carte
et la session liée, puis ouvrez la vue Sessions ou Chat pour inspecter l'état réel
de l'exécution.

## Connexes

- [Control UI](/fr/web/control-ui)
- [Plugins](/fr/tools/plugin)
- [Gérer les plugins](/fr/plugins/manage-plugins)
- [Sessions](/fr/concepts/session)
