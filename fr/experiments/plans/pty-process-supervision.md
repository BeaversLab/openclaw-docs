---
summary: "Plan de production pour une supervision fiable des processus interactifs (PTY + non-PTY) avec une propriété explicite, un cycle de vie unifié et un nettoyage déterministe"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "en cours"
last_updated: "2026-02-15"
title: "Plan de supervision PTY et des processus"
---

# Plan de supervision PTY et des processus

## 1. Problème et objectif

Nous avons besoin d'un cycle de vie fiable pour l'exécution de commandes longues à travers :

- `exec` exécutions au premier plan
- `exec` exécutions en arrière-plan
- `process` actions de suivi (`poll`, `log`, `send-keys`, `paste`, `submit`, `kill`, `remove`)
- Sous-processus du runner d'agent CLI

L'objectif n'est pas seulement de prendre en charge PTY. L'objectif est une propriété prévisible, une annulation, un délai d'attente et un nettoyage sans heuristiques de correspondance de processus non sécurisées.

## 2. Portée et limites

- Garder l'implémentation interne dans `src/process/supervisor`.
- Ne pas créer de nouveau paquet pour cela.
- Conserver la compatibilité du comportement actuel lorsque cela est pratique.
- Ne pas élargir la portée à la relecture de terminal ou à la persistance de session style tmux.

## 3. Implémenté dans cette branche

### Ligne de base du superviseur déjà présente

- Le module superviseur est en place sous `src/process/supervisor/*`.
- Le runtime d'exécution et le runner CLI sont déjà acheminés via le spawn et l'attente du superviseur.
- La finalisation du registre est idempotente.

### Cette passe terminée

1. Contrat de commande PTY explicite

- `SpawnInput` est maintenant une union discriminée dans `src/process/supervisor/types.ts`.
- Les exécutions PTY nécessitent `ptyCommand` au lieu de réutiliser générique `argv`.
- Le superviseur ne reconstruit plus les chaînes de commandes PTY à partir des jointures argv dans `src/process/supervisor/supervisor.ts`.
- Le runtime d'exécution transmet maintenant `ptyCommand` directement dans `src/agents/bash-tools.exec-runtime.ts`.

2. Découplage des types de couche de processus

- Les types de superviseur n'importent plus `SessionStdin` depuis les agents.
- Le contrat stdin local au processus réside dans `src/process/supervisor/types.ts` (`ManagedRunStdin`).
- Les adaptateurs dépendent désormais uniquement des types de niveau processus :
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. Amélioration de la propriété du cycle de vie de l'outil de processus

- `src/agents/bash-tools.process.ts` demande désormais l'annulation via le superviseur en premier.
- `process kill/remove` utilisent maintenant la terminaison de secours de l'arborescence des processus lorsque la recherche du superviseur échoue.
- `remove` conserve un comportement de suppression déterministe en supprimant les entrées de session en cours immédiatement après que la terminaison a été demandée.

4. Valeurs par défaut du chien de garde à source unique

- Ajout de valeurs par défaut partagées dans `src/agents/cli-watchdog-defaults.ts`.
- `src/agents/cli-backends.ts` consomme les valeurs par défaut partagées.
- `src/agents/cli-runner/reliability.ts` consomme les mêmes valeurs par défaut partagées.

5. Nettoyage des assistants morts

- Suppression du chemin d'assistant `killSession` inutilisé depuis `src/agents/bash-tools.shared.ts`.

6. Tests de chemin direct du superviseur ajoutés

- Ajout de `src/agents/bash-tools.process.supervisor.test.ts` pour couvrir le routage de kill et remove via l'annulation du superviseur.

7. Corrections des écarts de fiabilité terminées

- `src/agents/bash-tools.process.ts` revient désormais à la terminaison réelle des processus au niveau de l'OS lorsque la recherche du superviseur échoue.
- `src/process/supervisor/adapters/child.ts` utilise maintenant la sémantique de terminaison de l'arborescence des processus pour les chemins de kill d'annulation/dépassement de délai par défaut.
- Ajout d'un utilitaire d'arborescence des processus partagé dans `src/process/kill-tree.ts`.

8. Ajout de la couverture des cas limites du contrat PTY

- Ajout de `src/process/supervisor/supervisor.pty-command.test.ts` pour le transfert verbatim des commandes PTY et le rejet des commandes vides.
- Ajout de `src/process/supervisor/adapters/child.test.ts` pour le comportement de kill de l'arborescence des processus lors de l'annulation de l'adaptateur enfant.

## 4. Écarts restants et décisions

### État de fiabilité

Les deux lacunes de fiabilité requises pour cette passe sont désormais comblées :

- `process kill/remove` dispose désormais d'un véritable recours de terminaison OS en cas d'échec de la recherche du superviseur.
- l'annulation/le délai d'attente de l'enfant utilise désormais la sémantique de terminaison de l'arborescence des processus pour le chemin de terminaison par défaut.
- Des tests de régression ont été ajoutés pour les deux comportements.

### Durabilité et réconciliation au démarrage

Le comportement de redémarrage est désormais explicitement défini comme un cycle de vie en mémoire uniquement.

- `reconcileOrphans()` reste une opération nulle (no-op) dans `src/process/supervisor/supervisor.ts` par conception.
- Les exécutions actives ne sont pas récupérées après le redémarrage du processus.
- Cette limite est intentionnelle pour cette passe d'implémentation afin d'éviter les risques de persistance partielle.

### Suites de maintenabilité

1. `runExecProcess` dans `src/agents/bash-tools.exec-runtime.ts` gère encore plusieurs responsabilités et peut être divisé en assistants ciblés dans une suite.

## 5. Plan de mise en œuvre

La passe de mise en œuvre pour les éléments de fiabilité et de contrat requis est terminée.

Terminé :

- terminaison réelle de recours pour `process kill/remove`
- annulation de l'arborescence des processus pour le chemin de terminaison par défaut de l'adaptateur enfant
- tests de régression pour la terminaison de recours et le chemin de terminaison de l'adaptateur enfant
- tests de cas limites de commande PTY sous `ptyCommand` explicite
- limite de redémarrage en mémoire explicite avec `reconcileOrphans()` opération nulle (no-op) par conception

Suite facultative :

- diviser `runExecProcess` en assistants ciblés sans dérive de comportement

## 6. Cartographie des fichiers

### Superviseur de processus

- `src/process/supervisor/types.ts` mis à jour avec une entrée de génération discriminée et un contrat stdin local au processus.
- `src/process/supervisor/supervisor.ts` mis à jour pour utiliser `ptyCommand` explicite.
- `src/process/supervisor/adapters/child.ts` et `src/process/supervisor/adapters/pty.ts` découplés des types d'agents.
- finalisation idempotente `src/process/supervisor/registry.ts` inchangée et conservée.

### Intégration Exec et processus

- `src/agents/bash-tools.exec-runtime.ts` mis à jour pour passer la commande PTY explicitement et conserver le chemin de recours.
- `src/agents/bash-tools.process.ts` mis à jour pour annuler via le superviseur avec une termination de repli de véritable arborescence de processus.
- `src/agents/bash-tools.shared.ts` a supprimé le chemin d'aide de kill direct.

### Fiabilité CLI

- `src/agents/cli-watchdog-defaults.ts` ajouté comme base de référence partagée.
- `src/agents/cli-backends.ts` et `src/agents/cli-runner/reliability.ts` consomment maintenant les mêmes valeurs par défaut.

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

Note sur la vérification de type :

- Utilisez `pnpm build` (et `pnpm check` pour la porte complète de lint/docs) dans ce dépôt. Les anciennes notes qui mentionnent `pnpm tsgo` sont obsolètes.

## 8. Garanties opérationnelles préservées

- Le comportement de durcissement de l'environnement d'exécution est inchangé.
- Le flux d'approbation et de liste d'autorisation est inchangé.
- La désinfection de la sortie et les limites de sortie sont inchangées.
- L'adaptateur PTY garantit toujours le règlement de l'attente lors de l'arrêt forcé et de l'élimination de l'écouteur.

## 9. Définition de terminé

1. Le superviseur est le propriétaire du cycle de vie pour les exécutions gérées.
2. Le spawn PTY utilise un contrat de commande explicite sans reconstruction d'argv.
3. La couche de processus n'a aucune dépendance de type sur la couche de l'agent pour les contrats stdin du superviseur.
4. Les valeurs par défaut du chien de garde proviennent d'une source unique.
5. Les tests unitaires et e2e ciblés restent verts.
6. La limite de durabilité du redémarrage est explicitement documentée ou entièrement implémentée.

## 10. Résumé

La branche possède désormais une forme de supervision plus cohérente et plus sûre :

- contrat PTY explicite
- superposition de processus plus propre
- chemin d'annulation piloté par le superviseur pour les opérations de processus
- véritable terminaison de repli lorsque la recherche du superviseur échoue
- annulation de l'arborescence de processus pour les chemins de kill par défaut de l'exécution enfant
- valeurs par défaut unifiées du chien de garde
- limite de redémarrage explicite en mémoire (aucune réconciliation des orphelins lors des redémarrages dans cette passe)

import fr from '/components/footer/fr.mdx';

<fr />
