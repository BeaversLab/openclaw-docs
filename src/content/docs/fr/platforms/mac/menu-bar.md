---
summary: "Logique de l'état de la barre de menus et ce qui est affiché aux utilisateurs"
read_when:
  - Tweaking mac menu UI or status logic
title: "Barre de menus"
---

# Logique de l'état de la barre de menus

## Ce qui est affiché

- Nous affichons l'état de travail actuel de l'agent dans l'icône de la barre de menus et dans la première ligne d'état du menu.
- L'état de santé est masqué pendant le travail actif ; il réapparaît lorsque toutes les sessions sont inactives.
- Le bloc « Nodes » dans le menu répertorie uniquement les **appareils** (nœuds appariés via `node.list`), et non les entrées client/présence.
- Une section « Utilisation » apparaît sous Contexte lorsque des instantanés d'utilisation du provider sont disponibles.

## Modèle d'état

- Sessions : les événements arrivent avec `runId` (par exécution) ainsi que `sessionKey` dans la charge utile. La session « principale » est la clé `main` ; si elle est absente, nous revenons à la session la plus récemment mise à jour.
- Priorité : la session principale gagne toujours. Si la session principale est active, son état est affiché immédiatement. Si la session principale est inactive, la session non principale la plus récemment active est affichée. Nous n'alternons pas en pleine activité ; nous ne changeons que lorsque la session actuelle devient inactive ou que la session principale devient active.
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
- `workingMain` : badge avec glyphe, teinte complète, animation de patte « working ».
- `workingOther` : badge avec glyphe, teinte atténuée, pas de course.
- `overridden` : utilise le glyphe/la teinte choisi, indépendamment de l'activité.

## Texte de la ligne d'état (menu)

- Pendant le travail actif : `<Session role> · <activity label>`
  - Exemples : `Main · exec: pnpm test`, `Other · read: apps/macos/Sources/OpenClaw/AppState.swift`.
- Au repos : retourne au résumé de santé.

## Ingestion des événements

- Source : événements du canal de contrôle `agent` (`ControlChannel.handleAgentEvent`).
- Champs analysés :
  - `stream: "job"` avec `data.state` pour le démarrage/l'arrêt.
  - `stream: "tool"` avec `data.phase`, `name`, `meta`/`args` en option.
- Libellés :
  - `exec` : première ligne de `args.command`.
  - `read`/`write` : chemin raccourci.
  - `edit` : chemin plus type de modification déduit à partir de `meta`/diff counts.
  - repli (fallback) : nom de l'outil.

## Remplacement de débogage

- Paramètres ▸ Débogage ▸ Sélecteur « Icon override » :
  - `System (auto)` (par défaut)
  - `Working: main` (par type d'outil)
  - `Working: other` (par type d'outil)
  - `Idle`
- Stocké via `@AppStorage("iconOverride")` ; mappé à `IconState.overridden`.

## Liste de vérification des tests

- Déclencher la tâche de session principale : vérifier que l'icône change immédiatement et que la ligne d'état affiche le libellé principal.
- Déclencher une tâche de session non principale alors que la session principale est inactive : l'icône/le statut affiche la non principale ; reste stable jusqu'à sa fin.
- Démarrer la session principale alors qu'une autre est active : l'icône bascule immédiatement vers la principale.
- Rafales d'outils rapides : s'assurer que le badge ne clignote pas (délai de grâce TTL sur les résultats des outils).
- La ligne de santé réapparaît une fois toutes les sessions inactives.
