---
summary: "Logique de l'état de la barre de menus et ce qui est affiché aux utilisateurs"
read_when:
  - Tweaking mac menu UI or status logic
title: "Barre de menu"
---

## Ce qui est affiché

- Nous affichons l'état de travail actuel de l'agent dans l'icône de la barre de menus et dans la première ligne d'état du menu.
- L'état de santé est masqué pendant que le travail est actif ; il réapparaît lorsque toutes les sessions sont inactives.
- Un sous-menu racine "Contexte" contient les sessions récentes au lieu de les développer directement dans le menu racine.
- Le bloc "Nœuds" dans le menu racine liste uniquement les **appareils** (nœuds couplés via `node.list`), et non les entrées client/présence.
- Une section racine "Utilisation" apparaît sous Contexte lorsque les instantanés d'utilisation du provider sont disponibles, suivie des détails des coûts d'utilisation lorsque disponibles.

## Modèle d'état

- Sessions : les événements arrivent avec `runId` (par exécution) plus `sessionKey` dans la charge utile. La session "principale" est la clé `main` ; si absente, nous revenons à la session la plus récemment mise à jour.
- Priorité : principale gagne toujours. Si principale est active, son état est affiché immédiatement. Si principale est inactive, la session non principale la plus récemment active est affichée. Nous n'alternons pas en cours d'activité ; nous ne basculons que lorsque la session actuelle devient inactive ou que principale devient active.
- Types d'activité :
  - `job` : exécution de commandes de haut niveau (`state: started|streaming|done|error`).
  - `tool` : `phase: start|result` avec `toolName` et `meta/args`.

## Énumération IconState (Swift)

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)` (remplacement de débogage)

### ActivityKind → glyphe

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- default → 🛠️

### Correspondance visuelle

- `idle` : créature normale.
- `workingMain` : badge avec glyphe, teinte complète, jambe d'animation "working".
- `workingOther` : badge avec glyphe, teinte atténuée, pas de course.
- `overridden` : utilise le glyphe/la teinte choisi, indépendamment de l'activité.

## Sous-menu Contexte

- Le menu racine affiche une ligne "Contexte" avec un nombre/statut de session et ouvre un sous-menu.
- L'en-tête du sous-menu Contexte affiche le nombre de sessions actives pour les dernières 24 heures.
- Chaque ligne de session conserve sa barre de jetons, son âge, son aperçu, ses actions thinking/verbose, reset, compact et delete.
- Les messages de chargement, de déconnexion et d'erreur de chargement de session apparaissent à l'intérieur du sous-menu Contexte.
- Les détails d'utilisation du provider et des coûts d'utilisation restent au niveau racine sous Contexte pour qu'ils restent visibles d'un coup d'œil sans ouvrir le sous-menu.

## Texte de la ligne d'état (menu)

- Pendant que le travail est actif : `<Session role> · <activity label>`
  - Exemples : `Main · exec: pnpm test`, `Other · read: apps/macos/Sources/OpenClaw/AppState.swift`.
- Lorsqu'inactif : revient au résumé de santé.

## Ingestion des événements

- Source : événements du `agent` de contrôle (`ControlChannel.handleAgentEvent`).
- Champs analysés :
  - `stream: "job"` avec `data.state` pour le démarrage/arrêt.
  - `stream: "tool"` avec `data.phase`, `name`, `meta`/`args` facultatif.
- Libellés :
  - `exec` : première ligne de `args.command`.
  - `read`/`write` : chemin raccourci.
  - `edit` : chemin plus type de modification déduit à partir de `meta`/diff counts.
  - repli (fallback) : nom de l'outil.

## Débogage par remplacement

- Paramètres ▸ Débogage ▸ sélecteur "Remplacement d'icône" :
  - `System (auto)` (par défaut)
  - `Working: main` (par type d'outil)
  - `Working: other` (par type d'outil)
  - `Idle`
- Stocké via `@AppStorage("iconOverride")` ; mappé vers `IconState.overridden`.

## Liste de vérification des tests

- Déclencher la tâche de la session principale : vérifier que l'icône change immédiatement et que la ligne d'état affiche le libellé principal.
- Déclencher une tâche de session non principale alors que la session principale est inactive : l'icône/l'état affiche non principal ; reste stable jusqu'à ce qu'elle se termine.
- Démarrer la session principale alors qu'une autre est active : l'icône bascule immédiatement vers la session principale.
- Rafales rapides d'outils : s'assurer que le badge ne clignote pas (délai de grâce TTL sur les résultats des outils).
- La ligne d'état de santé réapparaît dès que toutes les sessions sont inactives.

## Connexes

- [Application macOS](/fr/platforms/macos)
- [Icône de la barre de menus](/fr/platforms/mac/icon)
