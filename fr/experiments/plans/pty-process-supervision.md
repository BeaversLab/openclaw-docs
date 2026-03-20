---
summary: "Plan de production pour une supervision de processus interactive fiable (PTY + non-PTY) avec une propriété explicite, un cycle de vie unifié et un nettoyage déterministe"
read_when:
  - Travailler sur la propriété et le nettoyage du cycle de vie des processus/exec
  - Débogage du comportement de supervision PTY et non-PTY
owner: "openclaw"
status: "in-progress"
last_updated: "2026-02-15"
title: "PTY and Process Supervision Plan"
---

# PTY and Process Supervision Plan

## 1. Problème et objectif

Nous avons besoin d'un cycle de vie fiable pour l'exécution de commandes longues, couvrant :

- `exec` exécutions au premier plan
- `exec` exécutions en arrière-plan
- `process` actions de suivi (`poll`, `log`, `send-keys`, `paste`, `submit`, `kill`, `remove`)
- CLI processus du lanceur d'agent

L'objectif n'est pas seulement de prendre en charge PTY. L'objectif est une propriété prévisible, une annulation, un délai d'attente et un nettoyage sans heuristiques de correspondance de processus non sécurisées.

## 2. Portée et limites

- Garder l'implémentation interne dans `src/process/supervisor`.
- Ne pas créer de nouveau paquet pour cela.
- Conserver la compatibilité du comportement actuel lorsque cela est pratique.
- Ne pas élargir la portée à la relecture de terminal ou à la persistance de session de style tmux.

## 3. Implémenté dans cette branche

### Ligne de base du superviseur déjà présente

- Le module superviseur est en place sous `src/process/supervisor/*`.
- Le runtime d'exécution et le lanceur CLI sont déjà acheminés via le spawn et l'attente du superviseur.
- La finalisation du registre est idempotente.

### Cette passe terminée

1. Contrat de commande PTY explicite

- `SpawnInput` est maintenant une union discriminée dans `src/process/supervisor/types.ts`.
- Les exécutions PTY nécessitent `ptyCommand` au lieu de réutiliser le générique `argv`.
- Le superviseur ne reconstruit plus les chaînes de commande PTY à partir des jointures argv dans `src/process/supervisor/supervisor.ts`.
- Le runtime d'exécution passe maintenant `ptyCommand` directement dans `src/agents/bash-tools.exec-runtime.ts`.

2. Découplage des types de couche de processus

- Les types de superviseur n'importent plus `SessionStdin` depuis les agents.
- Le contrat stdin local au processus réside dans `src/process/supervisor/types.ts` (`ManagedRunStdin`).
- Les adaptateurs dépendent désormais uniquement des types au niveau du processus :
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. Amélioration de la propriété du cycle de vie du tool de processus

- `src/agents/bash-tools.process.ts` demande désormais l'annulation via le superviseur en premier.
- `process kill/remove` utilise désormais la terminaison de repli de l'arborescence des processus (process-tree) lorsque la recherche dans le superviseur échoue.
- `remove` conserve un comportement de suppression déterministe en supprimant immédiatement les entrées de session en cours d'exécution après que la terminaison a été demandée.

4. Par défaut du chien de garde (watchdog) à source unique

- Ajout de paramètres par défaut partagés dans `src/agents/cli-watchdog-defaults.ts`.
- `src/agents/cli-backends.ts` utilise les paramètres par défaut partagés.
- `src/agents/cli-runner/reliability.ts` utilise les mêmes paramètres par défaut partagés.

5. Nettoyage des helpers morts

- Suppression du chemin d'helper inutilisé `killSession` de `src/agents/bash-tools.shared.ts`.

6. Tests ajoutés pour le chemin direct du superviseur

- Ajout de `src/agents/bash-tools.process.supervisor.test.ts` pour couvrir le routage kill et remove via l'annulation du superviseur.

7. Corrections des lacunes de fiabilité terminées

- `src/agents/bash-tools.process.ts` revient désormais à la terminaison réelle du processus au niveau de l'OS lorsque la recherche dans le superviseur échoue.
- `src/process/supervisor/adapters/child.ts` utilise désormais la sémantique de terminaison de l'arborescence des processus (process-tree) pour les chemins de kill par défaut d'annulation/dépassement de délai.
- Ajout d'un utilitaire d'arborescence de processus (process-tree) partagé dans `src/process/kill-tree.ts`.

8. Ajout de la couverture des cas limites du contrat PTY

- Ajout de `src/process/supervisor/supervisor.pty-command.test.ts` pour le transfert de commande PTY verbatim et le rejet de commande vide.
- Ajout de `src/process/supervisor/adapters/child.test.ts` pour le comportement de kill de l'arborescence des processus (process-tree) lors de l'annulation de l'adaptateur enfant.

## 4. Lacunes et décisions restantes

### Statut de fiabilité

Les deux lacunes de fiabilité requises pour cette passe sont désormais comblées :

- `process kill/remove` dispose désormais d'une terminaison réelle au niveau de l'OS en repli lorsque la recherche dans le superviseur échoue.
- l'annulation/le délai d'attente de l'enfant (child cancel/timeout) utilise désormais la sémantique de kill de l'arborescence des processus (process-tree) pour le chemin de kill par défaut.
- Des tests de régression ont été ajoutés pour les deux comportements.

### Durabilité et réconciliation au démarrage

Le comportement de redémarrage est désormais explicitement défini comme un cycle de vie uniquement en mémoire.

- `reconcileOrphans()` reste une opération vide (no-op) dans `src/process/supervisor/supervisor.ts` par conception.
- Les exécutions actives ne sont pas récupérées après le redémarrage du processus.
- Cette limite est intentionnelle pour cette passe de mise en œuvre afin d'éviter les risques de persistance partielle.

### Suivis de maintenabilité

1. `runExecProcess` dans `src/agents/bash-tools.exec-runtime.ts` gère toujours plusieurs responsabilités et peut être divisé en auxiliaires ciblés dans un suivi.

## 5. Plan de mise en œuvre

La passe de mise en œuvre pour les éléments de fiabilité et de contrat requis est terminée.

Terminé :

- Terminaison réelle de secours `process kill/remove`
- annulation de l'arborescence des processus pour le chemin de kill par défaut de l'adaptateur enfant
- tests de régression pour le kill de secours et le chemin de kill de l'adaptateur enfant
- tests de cas limites de commande PTY sous `ptyCommand` explicite
- limite de redémarrage en mémoire explicite avec `reconcileOrphans()` sans effet par conception

Suivi facultatif :

- diviser `runExecProcess` en auxiliaires ciblés sans dérive de comportement

## 6. Cartographie des fichiers

### Superviseur de processus

- `src/process/supervisor/types.ts` mis à jour avec une entrée de génération discriminée et un contrat stdin local au processus.
- `src/process/supervisor/supervisor.ts` mis à jour pour utiliser `ptyCommand` explicite.
- `src/process/supervisor/adapters/child.ts` et `src/process/supervisor/adapters/pty.ts` découplés des types d'agents.
- finalisation idempotente `src/process/supervisor/registry.ts` inchangée et conservée.

### Intégration Exec et processus

- `src/agents/bash-tools.exec-runtime.ts` mis à jour pour transmettre explicitement la commande PTY et conserver le chemin de secours.
- `src/agents/bash-tools.process.ts` mis à jour pour annuler via le superviseur avec une terminaison de secours réelle de l'arborescence des processus.
- `src/agents/bash-tools.shared.ts` a supprimé le chemin d'auxiliaire de kill direct.

### Fiabilité du CLI

- `src/agents/cli-watchdog-defaults.ts` ajouté comme base commune.
- `src/agents/cli-backends.ts` et `src/agents/cli-runner/reliability.ts` consomment désormais les mêmes valeurs par défaut.

## 7. Validation exécutée dans cette passe

Tests unitaires :

- `pnpm vitest src/process/supervisor/registry.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.pty-command.test.ts`
- `pnpm vitest src/process/supervisor/adapters/child.test.ts`
- `pnpm vitest src/agents/cli-backends.test.ts`
- `pnpm vitest src/agents/bash-tools.exec.pty-cleanup.test.ts`
- `pnpm vitest src/agents/bash-tools.process.poll-timeout.test.ts`
- `pnpm vitest src/agents/bash-tools.process.supervisor.test.ts`
- `pnpm vitest src/process/exec.test.ts`

Cibles E2E :

- `pnpm vitest src/agents/cli-runner.test.ts`
- `pnpm vitest run src/agents/bash-tools.exec.pty-fallback.test.ts src/agents/bash-tools.exec.background-abort.test.ts src/agents/bash-tools.process.send-keys.test.ts`

Note de vérification de type :

- Utilisez `pnpm build` (et `pnpm check` pour la porte complète de lint/docs) dans ce dépôt. Les anciennes notes mentionnant `pnpm tsgo` sont obsolètes.

## 8. Garanties opérationnelles préservées

- Le comportement de renforcement de l'environnement d'exécution est inchangé.
- Le flux d'approbation et de liste d'autorisation est inchangé.
- La nettoyage et les limites de sortie sont inchangés.
- L'adaptateur PTY garantit toujours le règlement de l'attente lors de l'arrêt forcé et de l'élimination de l'écouteur.

## 9. Définition de terminé

1. Le superviseur est le propriétaire du cycle de vie pour les exécutions gérées.
2. Le lancement PTY utilise un contrat de commande explicite sans reconstruction d'argv.
3. La couche de processus n'a aucune dépendance de type sur la couche d'agent pour les contrats stdin du superviseur.
4. Les valeurs par défaut du chien de garde proviennent d'une source unique.
5. Les tests unitaires et e2e ciblés restent verts.
6. La limite de durabilité du redémarrage est explicitement documentée ou entièrement implémentée.

## 10. Résumé

La branche possède maintenant une forme de supervision plus cohérente et plus sûre :

- contrat PTY explicite
- superposition de processus plus propre
- chemin d'annulation piloté par le superviseur pour les opérations de processus
- véritable termination de repli lorsque la recherche du superviseur échoue
- annulation de l'arborescence des processus pour les chemins de mise à mort par défaut des exécutions enfants
- valeurs par défaut unifiées du chien de garde
- limite de redémarrage explicite en mémoire (pas de réconciliation des orphelins lors du redémarrage dans cette passe)

import en from "/components/footer/en.mdx";

<en />
