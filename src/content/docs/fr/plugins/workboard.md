---
summary: "Tableau de travail de tableau de bord facultatif pour les cartes détenues par des agents et le transfert de session"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Plugin Workboard"
---

Le plugin Workboard ajoute un tableau de style Kanban facultatif à l'interface utilisateur de [contrôle](/fr/web/control-ui). Utilisez-le pour collecter des cartes de travail adaptées aux agents, les leur attribuer et suivre la tâche en arrière-plan, l'exécution et la session de tableau de bord liées depuis une seule carte.

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
- tâche liée, exécution, session ou URL source facultatives
- métadonnées d'exécution facultatives pour une exécution Codex ou Claude démarrée à partir de la carte
- métadonnées compactes pour les tentatives, commentaires, liens, preuves, artefacts, automatisation,
  pièces jointes, journaux des workers, état du protocole du worker, réclamations, diagnostics,
  notifications, modèles, état de l'archive et détection de session obsolète
- événements récents de la carte tels que créé, déplacé, lié, réclamé, heartbeat,
  tentative, preuve, artefact, diagnostic, notification, dispatch, archive, obsolète
  ou modifications mises à jour par l'agent

Les cartes sont stockées dans l'état du Gateway du plugin. Elles sont locales au répertoire d'état du Gateway et se déplacent avec le reste de l'état Gateway de ce OpenClaw.

Workboard conserve des métadonnées compactes par carte afin que les opérateurs puissent voir comment une carte a traversé le tableau sans ouvrir la session liée. Les événements, les résumés de tentatives, les extraits de preuve, les liens connexes, les commentaires, les marqueurs d'archive et les marqueurs de session inactive sont des métadonnées intentionnellement locales ; elles ne remplacent pas les transcriptions de session ni l'historique des problèmes GitHub.

## Exécutions et tâches de cartes

Les cartes non liées peuvent démarrer le travail à partir de la carte. Les démarrages autonomes utilisent le chemin d'exécution de l'agent suivi par les tâches du Gateway, puis Workboard lie la tâche résultante, l'ID d'exécution et la clé de session à la carte. Le démarrage utilise l'agent et le model par défaut configurés du Gateway. Les actions Codex et Claude sont des choix de model explicites facultatifs :

- Exécuter Codex ou Exécuter Claude lance une exécution d'agent prise en charge par une tâche, envoie l'invite de la carte et marque la carte `running`.
- Ouvrir Codex ou Ouvrir Claude crée une session de tableau de bord liée sans envoyer l'invite de la carte ni déplacer la carte, afin que vous puissiez travailler manuellement tout en restant attaché au tableau.

Les métadonnées d'exécution stockent le moteur sélectionné, le mode, la référence de model, la clé de session, l'ID d'exécution, l'ID de tâche si disponible, et le statut du cycle de vie sur la carte. Les exécutions Codex utilisent `openai/gpt-5.5` ; les exécutions Claude utilisent
`anthropic/claude-sonnet-4-6`.

Chaque exécution liée enregistre également un résumé de tentative sur le même enregistrement de carte. Le résumé de tentative conserve le moteur, le mode, le modèle, l'ID d'exécution, les horodatages, l'état et le décompte cumulé des échecs afin que les échecs répétés restent visibles sur le tableau.

Le tableau de bord actualise l'état des tâches depuis le grand livre des tâches du Gateway et fait correspondre les tâches aux cartes par ID de tâche, ID d'exécution ou clé de session liée. Si une tâche est en file d'attente ou en cours d'exécution, le cycle de vie de la carte affiche l'état de la tâche active. Si la tâche se termine, échoue, expire ou est annulée, le cycle de vie de la carte passe à un état de révision ou bloqué en utilisant la même synchronisation de cycle de vie que les sessions liées.

## Coordination de l'agent

Workboard expose également des outils d'agent facultatifs pour les flux de travail tenant compte du tableau :

- `workboard_list` liste les cartes compactes avec l'état de réclamation et de diagnostic, avec
  un filtre de tableau facultatif.
- `workboard_read` renvoie une carte plus le contexte de travailleur délimité construit à partir de notes,
  tentatives, commentaires, liens, preuves, artefacts, résultats parents,
  travail récent de l'attributaire et diagnostics actifs.
- `workboard_create` crée une carte avec des parents, un locataire, des compétences,
  des métadonnées de tableau et d'espace de travail, une clé d'idempotence, une limite d'exécution et un budget de réessai facultatifs.
- `workboard_link` lie une carte parente à une carte enfant. Les enfants restent dans `todo`
  jusqu'à ce que chaque parent atteigne `done`; puis la promotion de répartition les déplace vers
  `ready`.
- `workboard_claim` réclame une carte pour l'agent appelant et déplace les cartes de l'arriéré, à faire
  ou prêtes vers `running`.
- `workboard_heartbeat` actualise le battement de cœur de réclamation lors des exécutions longues.
- `workboard_release` libère la réclamation après achèvement, pause ou transfert et
  peut déplacer la carte vers un statut suivant.
- `workboard_complete` et `workboard_block` sont des outils de cycle de vie structurés pour
  les résumés finaux, les preuves, les artefacts, les manifestes de cartes créées et les raisons
  de blocage. Les manifestes de cartes créées doivent référencer les cartes liées à la
  carte terminée, ce qui garde les enfants fantômes hors des résumés.
- `workboard_attachment_add`, `workboard_attachment_read` et
  `workboard_attachment_delete` stockent de petites pièces jointes de carte dans l'état SQLite
  du plugin, les indexent sur la carte et les exposent dans le contexte du travailleur.
- `workboard_worker_log` et `workboard_protocol_violation` enregistrent les lignes de journal du travailleur et bloquent les cartes lorsqu'un travailleur automatisé s'arrête sans appeler `workboard_complete` ou `workboard_block`.
- `workboard_board_create`, `workboard_board_archive` et `workboard_board_delete` gèrent les métadonnées persistantes du tableau telles que le nom d'affichage, la description, l'état d'archivage et l'espace de travail par défaut.
- `workboard_runs` renvoie l'historique persistant des tentatives d'exécution stocké sur une carte.
- `workboard_specify` transforme une carte de triage ou de backlog brute en une carte `todo` clarifiée et enregistre le résumé de la spécification sur la carte.
- `workboard_decompose` répartit une carte d'orchestration parente en enfants liés, hérite des métadonnées du tableau et du locataire, et peut terminer la parente avec un manifeste de cartes créées.
- `workboard_notify_subscribe`, `workboard_notify_list`, `workboard_notify_events`, `workboard_notify_advance` et `workboard_notify_unsubscribe` gèrent les abonnements aux notifications dans l'état du plugin. Les lectures d'événements sont sûres en cas de relecture ; l'outil d'avance déplace le curseur durable afin que les appelants puissent reprendre sans perdre ou relire les événements de carte terminés, échoués ou obsolètes.
- `workboard_boards`, `workboard_stats`, `workboard_promote`, `workboard_reassign`, `workboard_reclaim`, `workboard_comment`, `workboard_proof`, `workboard_unblock` et `workboard_dispatch` permettent à un agent d'inspecter les espaces de noms du tableau, de voir les statistiques de file d'attente, de récupérer le travail bloqué, d'ajouter des notes de transfert, d'attacher des références de preuve ou d'artefact, de ramener le travail bloqué vers `todo` et de pousser la promotion des dépendances ou le nettoyage des réclamations obsolètes.

Les cartes réclamées rejettent les mutations d'outils d'agent provenant d'autres agents, sauf si l'appelant possède le jeton de réclamation renvoyé par `workboard_claim`. Les opérateurs de tableau de bord utilisent toujours la surface Gateway RPC normale et peuvent récupérer ou réaffecter des cartes.

Workboard stocke des données de tableau durables dans une base de données relationnelle SQLite appartenant au plugin sous le répertoire d'état OpenClaw. Les tableaux, les cartes, les étiquettes, les événements de cycle de vie, les tentatives d'exécution, les commentaires, les liens de dépendance, les preuves, les références d'artefacts, les métadonnées et blobs de pièces jointes, les diagnostics, les notifications, les journaux des workers, l'état du protocole et les abonnements sont persistés dans les tables Workboard au lieu des entrées clé-valeur du plugin. Un export de carte préserve toujours la narration du tableau sans inclure le contenu des blobs de pièces jointes.

Les installations qui ont utilisé Workboard dans la version `.28` peuvent exécuter `openclaw doctor --fix` pour migrer les espaces de noms d'état de plugin hérités livrés (`workboard.cards`, `workboard.boards`, et `workboard.notify`) vers la base de données relationnelle. Si un espace de noms `workboard.attachments` hérité est présent, le médecin migre également ces blobs de pièces jointes.

Les diagnostics Workboard sont calculés à partir des métadonnées locales de la carte. Les vérifications intégrées signalent les cartes assignées qui attendent trop longtemps, les cartes en cours d'exécution sans heartbeat récent, les cartes bloquées nécessitant une attention, les échecs répétés, les cartes terminées sans preuve, et les cartes en cours d'exécution qui n'ont qu'un lien de session lâche.

La répartition est intentionnellement locale au Gateway. Elle ne génère pas de processus de système d'exploitation arbitraires ; les sessions de sous-agent normales OpenClaw possèdent toujours l'exécution. L'action de répartition promeut les cartes prêtes pour les dépendances, enregistre les métadonnées de répartition sur les cartes prêtes, bloque les réclamations expirées ou les exécutions expirées, marque les cartes de triage configurées par le tableau comme candidates à l'orchestration, puis réclame un petit lot de cartes prêtes et démarre les exécutions des workers via le runtime de sous-agent Gateway. Les cartes assignées utilisent des clés de session de worker `agent:<id>:subagent:workboard-*` ; les cartes non assignées utilisent des clés `subagent:workboard-*` non délimitées afin que le Gateway résolve toujours l'agent par défaut configuré. Les workers obtiennent un contexte de carte délimité ainsi que le jeton de réclamation dont ils ont besoin pour effectuer un heartbeat, terminer ou bloquer la carte via les outils Workboard.

### Sélection du worker de répartition

Chaque passe de répartition démarre au plus trois travailleurs par défaut. Les cartes prêtes sont classées par priorité, position et heure de création, puis filtrées pour éviter une propriété active en double. Une répartition ne démarre qu'une seule carte pour un propriétaire ou un agent donné lors de la même passe, et ignore les propriétaires qui ont déjà du travail en cours ou en révision sur le tableau.

Les cartes archivées, les cartes avec des réclamations actives et les cartes sans statut `ready` ne sont pas sélectionnées pour le démarrage des travailleurs. Elles peuvent toujours être affectées par le côté données de la répartition lorsque des réclamations obsolètes, la promotion de dépendances ou le nettoyage des délais d'expiration s'appliquent.

### Invite et cycle de vie du travailleur

L'invite du travailleur comprend le titre de la carte, les notes et le contexte limités, le tableau assigné et le protocole de travailleur Workboard. Il comprend également le propriétaire de la réclamation et le jeton de réclamation afin que le travailleur puisse appeler `workboard_heartbeat`, `workboard_complete` ou `workboard_block` sans qu'un autre acteur ne prenne en charge la carte.

Lorsqu'un travailleur démarre avec succès, Workboard stocke la clé de session, l'ID d'exécution, le moteur, le mode, l'étiquette du modèle, le statut et le journal du travailleur sur la carte. La clé de session est déterministe pour le tableau et la carte, ce qui fait que les répartitions répétées acheminent vers la même voie de travailleur au lieu de créer des sessions sans rapport.

Si un travailleur ne peut pas être démarré après qu'une carte a été réclamée, Workboard bloque la carte, efface la réclamation, enregistre l'échec du démarrage de l'exécution et ajoute une ligne au journal du travailleur. Cet échec est visible dans le tableau de bord, le JSON CLI, les outils de l'agent et les diagnostics de la carte.

### Points d'entrée de répartition

Les démarrages de travailleurs pour cartes prêtes peuvent provenir de :

- l'action de répartition du tableau de bord
- `openclaw workboard dispatch`
- `/workboard dispatch` sur un canal compatible avec les commandes

Les trois points d'entrée utilisent le runtime du sous-agent Gateway lorsque le Gateway est disponible. Le CLI dispose d'un secours d'opérateur supplémentaire : si le Gateway est hors ligne ou n'expose pas la méthode de répartition Workboard et qu'aucune cible explicite `--url` ou `--token` n'a été fournie, il exécute une répartition de données uniquement sur l'état SQLite local. Ce secours peut promouvoir des dépendances, nettoyer les réclamations obsolètes et bloquer les exécutions expirées, mais il ne peut pas démarrer de travailleurs.

Les métadonnées du tableau peuvent inclure des paramètres d'orchestration tels que `autoDecompose`,
`autoDecomposePerDispatch`, `defaultAssignee` et `orchestratorProfile`OpenClaw.
OpenClaw enregistre l'intention d'orchestration et l'expose dans le contexte du worker ; la
spécification et la décomposition réelles se produisent toujours via les outils
Workboard normaux.

## CLI et commande slash

Le plugin enregistre une commande CLI racine :

```bash
openclaw workboard list
openclaw workboard create "Fix stale card lifecycle" --priority high --labels bug,workboard
openclaw workboard show <card-id>
openclaw workboard dispatch
```

`openclaw workboard dispatch`GatewayGateway appelle le Gateway en cours d'exécution afin que les démarrages de workers utilisent le
même runtime de sous-agent que le tableau de bord. Si le Gateway n'est pas disponible, il revient
à une dispatch de données uniquement afin que la promotion des dépendances, le nettoyage des réclamations obsolètes et le
blocage par délai d'attente puissent toujours s'exécuter. Les échecs d'authentification, d'autorisation et de validation
apparaissent toujours comme des erreurs de commande, tout comme les échecs pour les cibles `--url` ou `--token`
explicites.

La commande slash `/workboard` prend en charge le même chemin d'opérateur compact :
`/workboard list`, `/workboard show <card-id>`, `/workboard create <title>` et
`/workboard dispatch`Gateway. Les opérations de liste et d'affichage sont des opérations de lecture pour les expéditeurs de
commandes autorisés. La création et la dispatch nécessitent le statut de propriétaire sur les surfaces de chat ou un client
Gateway avec `operator.write` ou `operator.admin`.

Voir [Workboard CLI](CLI/en/cli/workboardGateway) pour les indicateurs de commande, la sortie JSON, le comportement de
secours du Gateway, la gestion des préfixes d'ID sans ambiguïté, les règles de sélection de la dispatch et le
dépannage.

## Synchronisation du cycle de vie de la session

Les cartes peuvent être liées à des sessions de tableau de bord existantes ou à la session créée
lorsque vous commencez le travail à partir d'une carte. Les cartes liées affichent le cycle de vie de la session en ligne :
en cours d'exécution, périmée, inactive liée, terminée, échouée ou manquante.

Si la session liée est manquante, la carte reste liée pour le contexte et offre
toujours des commandes de démarrage afin que vous puissiez redémarrer le travail dans une nouvelle session de tableau de bord.
Si une session liée active cesse de signaler une activité récente, Workboard marque la
carte comme périmée et stocke le marqueur en tant que métadonnées de carte jusqu'à ce que le cycle de vie l'efface.

Vous pouvez également capturer une session de tableau de bord existante depuis l'onglet Sessions avec
Ajouter au Workboard. La carte est liée à cette session, utilise le libellé de la session ou
la récente invite utilisateur comme titre, et remplit les notes à partir de la récente invite utilisateur plus
la dernière réponse de l'assistant lorsque l'historique de conversation est disponible.

Le Workboard suit la session liée tant que la carte est encore dans un état de travail
actif :

- session liée active -> `running`
- session liée terminée -> `review`
- session liée échouée, tuée, expirée ou abandonnée -> `blocked`

Les états de révision manuelle priment. Si vous déplacez une carte vers `review`, `blocked` ou `done`,
le Workboard arrête de déplacer automatiquement cette carte jusqu'à ce que vous la remettiez sur `todo` ou
`running`.

## Flux de travail du tableau de bord

1. Ouvrez l'onglet Workboard dans l'interface de contrôle.
2. Créez une carte avec un titre, des notes, une priorité, des étiquettes, un agent optionnel et une
   session liée optionnelle.
3. Ou ouvrez Sessions et choisissez Ajouter au Workboard pour une session existante.
4. Faites glisser la carte entre les colonnes ou utilisez les contrôles de colonne.
5. Démarrez le travail depuis la carte pour créer ou réutiliser une session de tableau de bord.
6. Ouvrez la session liée depuis la carte pendant que l'agent travaille.
7. Laissez la synchronisation du cycle de vie déplacer le travail en cours vers révision ou bloqué, puis déplacez
   manuellement la carte vers terminé une fois acceptée.

Le démarrage d'une carte utilise des sessions normales du Gateway. Le plugin Workboard stocke uniquement
les métadonnées et les liens de la carte ; la transcription de la conversation, la sélection du modèle et le cycle de vie
d'exécution restent la propriété du système de session standard.

Utilisez Stopper sur une carte liée en direct pour abandonner l'exécution de la session active. Le Workboard marque
cette carte `blocked` afin qu'elle reste visible pour le suivi.

Les nouvelles cartes peuvent démarrer à partir de modèles Workboard pour les correctifs, la documentation, les versions, les revues de PR
ou le travail de plugin. Les modèles pré-remplissent le titre, les notes, les étiquettes et la priorité,
et l'identifiant du modèle sélectionné est stocké en tant que métadonnées de la carte.

## Autorisations

Le plugin enregistre les méthodes Gateway du RPC sous l'espace de noms `workboard.*` :

- `workboard.cards.list` nécessite `operator.read`
- `workboard.cards.export` nécessite `operator.read`
- `workboard.cards.diagnostics` nécessite `operator.read`
- `workboard.cards.diagnostics.refresh` nécessite `operator.write`
- la liste et la récupération des pièces jointes ainsi que les lectures d'événements de notification nécessitent `operator.read`
- l'avancement du curseur de notification nécessite `operator.write`
- les méthodes create, update, move, delete, comment, link, dependency link, proof, artifact,
  attachment add/delete, worker log, protocol violation, claim, heartbeat,
  release, complete, block, unblock, dispatch, bulk et archive nécessitent
  `operator.write`

Les navigateurs connectés avec un accès opérateur en lecture seule peuvent inspecter le tableau mais
ne peuvent pas modifier les cartes.

## Configuration

Workboard n'a pas de configuration spécifique au plugin pour le moment. Activez-le ou désactivez-le via l'entrée de plugin standard :

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

Vérifiez la stratégie de plugin :

```bash
openclaw plugins inspect workboard --runtime --json
```

Si `plugins.allow` est configuré, ajoutez `workboard` à cette liste d'autorisation. Si
`plugins.deny` contient `workboard`, supprimez-le avant d'activer le plugin.

### Les cartes ne s'enregistrent pas

Confirmez que la connexion du navigateur dispose de l'accès `operator.write`. Les sessions d'opérateur
en lecture seule peuvent lister les cartes mais ne peuvent pas les créer, modifier, déplacer ou supprimer.

### Le démarrage d'une carte n'ouvre pas la session attendue

Workboard crée des liens vers des sessions de tableau de bord normales. Vérifiez l'identifiant de l'agent de la carte
et la session liée, puis ouvrez la vue Sessions ou Chat pour inspecter l'état réel
de l'exécution.

### Le dispatch ne démarre pas de worker

Confirmez qu'il y a au moins une carte `ready` sans réclamation active :

```bash
openclaw workboard list --status ready
```

Si le CLI signale un dispatch données uniquement, démarrez ou redémarrez le Gateway et réessayez.
Le dispatch données uniquement met à jour l'état local du tableau mais ne peut pas démarrer les exécutions de worker de sous-agent.

Les cartes peuvent également être ignorées lorsqu'une autre carte pour le même propriétaire ou agent est
déjà en cours d'exécution ou en attente de révision. Terminez, bloquez ou libérez ce travail
actif avant d'envoyer plus de travail pour le même propriétaire.

## Connexes

- [Control UI](/fr/web/control-ui)
- [Workboard CLI](/fr/cli/workboard)
- [Plugins](/fr/tools/plugin)
- [Manage plugins](/fr/plugins/manage-plugins)
- [Sessions](/fr/concepts/session)
