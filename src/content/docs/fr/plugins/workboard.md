---
summary: "Tableau de travail de tableau de bord facultatif pour les cartes détenues par des agents et le transfert de session"
read_when:
  - You want a Kanban-style workboard in the Control UI
  - You are enabling or disabling the bundled Workboard plugin
  - You want to track planned agent work without an external project manager
title: "Plugin Workboard"
---

Le plugin Workboard ajoute un tableau de style Kanban facultatif à l'interface utilisateur de [Contrôle](/fr/web/control-ui). Utilisez-le pour collecter des cartes de travail de taille agent, les assigner aux agents et passer d'une carte à la session de tableau de bord liée.

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
- statut : `backlog`, `todo`, `running`, `review`, `blocked` ou `done`
- priorité : `low`, `normal`, `high` ou `urgent`
- étiquettes
- id d'agent facultatif
- session liée facultative, exécution, tâche ou URL source
- métadonnées d'exécution facultatives pour une session Codex ou Claude démarrée à partir de la carte
- métadonnées compactes pour les tentatives, commentaires, liens, preuves, modèles, état d'archive et détection de session obsolète
- événements récents de la carte tels que créés, déplacés, liés, tentative, preuve, archive, obsolète ou modifications mises à jour par l'agent

Les cartes sont stockées dans l'état du Gateway du plugin. Elles sont locales au répertoire d'état du Gateway et se déplacent avec le reste de l'état Gateway de ce OpenClaw.

Workboard conserve des métadonnées compactes par carte afin que les opérateurs puissent voir comment une carte a traversé le tableau sans ouvrir la session liée. Les événements, les résumés de tentatives, les extraits de preuve, les liens connexes, les commentaires, les marqueurs d'archive et les marqueurs de session inactive sont des métadonnées intentionnellement locales ; elles ne remplacent pas les transcriptions de session ni l'historique des problèmes GitHub.

## Exécutions de cartes

Les cartes non liées peuvent démarrer le travail à partir de la carte. L'action Démarrer utilise l'agent et le modèle par défaut configurés du Gateway. Les actions Codex et Claude sont des choix explicites optionnels de modèle :

- Exécuter Codex ou Exécuter Claude crée une session de tableau de bord, envoie l'invite de la carte et marque la carte `running`.
- Ouvrir Codex ou Ouvrir Claude crée une session de tableau de bord liée sans envoyer l'invite de la carte ni déplacer la carte, afin que vous puissiez travailler manuellement tout en restant attaché au tableau.

Les métadonnées d'exécution stockent le moteur sélectionné, le mode, la référence du modèle, la clé de session, l'ID d'exécution et l'état du cycle de vie sur la carte. Les exécutions Codex utilisent `openai/gpt-5.5` ; les exécutions Claude utilisent `anthropic/claude-sonnet-4-6`.

Chaque exécution liée enregistre également un résumé de tentative sur le même enregistrement de carte. Le résumé de tentative conserve le moteur, le mode, le modèle, l'ID d'exécution, les horodatages, l'état et le décompte cumulé des échecs afin que les échecs répétés restent visibles sur le tableau.

## Synchronisation du cycle de vie de session

Les cartes peuvent être liées à des sessions de tableau de bord existantes ou à la session créée lorsque vous démarrez le travail à partir d'une carte. Les cartes liées affichent le cycle de vie de la session en ligne : en cours, inactive, liée inactive, terminée, échouée ou manquante.

Si la session liée est manquante, la carte reste liée pour le contexte et offre toujours des contrôles de démarrage afin que vous puissiez redémarrer le travail dans une nouvelle session de tableau de bord. Si une session liée active cesse de signaler une activité récente, Workboard marque la carte comme inactive et stocke le marqueur en tant que métadonnée de carte jusqu'à ce que le cycle de vie l'efface.

Vous pouvez également capturer une session de tableau de bord existante à partir de l'onglet Sessions avec Ajouter à Workboard. La carte est liée à cette session, utilise l'étiquette de la session ou la dernière invite de l'utilisateur comme titre, et remplit les notes à partir de la dernière invite de l'utilisateur ainsi que de la dernière réponse de l'assistant lorsque l'historique du chat est disponible.

Workboard suit la session liée tant que la carte est toujours dans un état de travail actif :

- session liée active -> `running`
- session liée terminée -> `review`
- session liée ayant échoué, tuée, expirée ou abandonnée -> `blocked`

Les états de révision manuelle priment. Si vous déplacez une carte vers `review`, `blocked` ou `done`,
Workboard arrête de déplacer automatiquement cette carte jusqu'à ce que vous la remettiez dans `todo` ou
`running`.

## Flux de travail du tableau de bord

1. Ouvrez l'onglet Workboard dans l'interface de contrôle.
2. Créez une carte avec un titre, des notes, une priorité, des étiquettes, un agent facultatif et
   une session liée facultative.
3. Ou ouvrez Sessions et choisissez Ajouter au Workboard pour une session existante.
4. Faites glisser la carte entre les colonnes ou utilisez les contrôles de colonne.
5. Démarrez le travail depuis la carte pour créer ou réutiliser une session de tableau de bord.
6. Ouvrez la session liée depuis la carte pendant que l'agent travaille.
7. Laissez la synchronisation du cycle de vie déplacer le travail en cours vers la révision ou le blocage, puis déplacez
   manuellement la carte vers terminé une fois acceptée.

Le démarrage d'une carte utilise des sessions normales de Gateway. Le plugin Workboard ne stocke que
les métadonnées et les liens de la carte ; la transcription de la conversation, la sélection du modèle et le cycle
de vie de l'exécution restent la propriété du système de session régulier.

Utilisez Arrêter sur une carte liée en direct pour abandonner l'exécution de la session active. Workboard marque
cette carte `blocked` afin qu'elle reste visible pour le suivi.

Les nouvelles cartes peuvent démarrer à partir de modèles Workboard pour les corrections de bugs, la documentation, les versions, les révisions
PR ou les travaux de plugins. Les modèles préremplissent le titre, les notes, les étiquettes et la priorité,
et l'identifiant du modèle sélectionné est stocké en tant que métadonnées de la carte.

## Autorisations

Le plugin enregistre les méthodes Gateway du RPC sous l'espace de noms `workboard.*` :

- `workboard.cards.list` nécessite `operator.read`
- `workboard.cards.export` nécessite `operator.read`
- les méthodes create, update, move, delete, comment, link, proof et archive nécessitent `operator.write`

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

### L'onglet indique que Workboard est indisponible

Vérifiez la stratégie du plugin :

```bash
openclaw plugins inspect workboard --runtime --json
```

Si `plugins.allow` est configuré, ajoutez `workboard` à cette liste autorisée. Si `plugins.deny` contient `workboard`, supprimez-le avant d'activer le plugin.

### Les cartes ne sont pas enregistrées

Confirmez que la connexion du navigateur dispose d'un accès `operator.write`. Les sessions d'opérateur en lecture seule peuvent lister les cartes mais ne peuvent pas les créer, les modifier, les déplacer ni les supprimer.

### Le démarrage d'une carte n'ouvre pas la session attendue

Workboard crée des liens vers des sessions de tableau de bord normales. Vérifiez l'ID de l'agent de la carte et la session liée, puis ouvrez la vue Sessions ou Chat pour inspecter l'état réel de l'exécution.

## Connexes

- [Control UI](/fr/web/control-ui)
- [Plugins](/fr/tools/plugin)
- [Gérer les plugins](/fr/plugins/manage-plugins)
- [Sessions](/fr/concepts/session)
