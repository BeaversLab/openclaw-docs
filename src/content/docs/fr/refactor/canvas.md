---
summary: "CanvasPlan et liste de contrôle d'audit pour le déplacement de Canvas hors du cœur et vers un plugin expérimental groupé."
read_when:
  - Moving Canvas host, tools, commands, docs, or protocol ownership
  - Auditing whether Canvas is still core-owned
  - Preparing or reviewing the experimental Canvas plugin PR
title: "CanvasRefactorisation du plugin Canvas"
---

# Refactorisation du plugin Canvas

Canvas est peu utilisé et expérimental. Traitez-le comme un plugin groupé, et non comme une fonctionnalité centrale. Le cœur peut conserver la plomberie générique de passerelle, de nœud, HTTP, d'auth, de config et de client natif, mais le comportement spécifique à Canvas doit résider sous CanvasCanvas`extensions/canvas`.

## Objectif

Transférer la propriété de Canvas à Canvas`extensions/canvas` tout en préservant le comportement actuel des nœuds jumelés :

- l'outil `canvas`Canvas orienté agent est enregistré par le plugin Canvas
- Les commandes de nœud Canvas sont autorisées uniquement lorsque le plugin Canvas les enregistre
- Les fichiers hôte/source A2UI résident sous le plugin Canvas
- La matérialisation des documents Canvas réside sous le plugin Canvas
- L'implémentation de la commande CLI réside sous le plugin Canvas, ou délègue via un barrel d'exécution appartenant au plugin
- La documentation et l'inventaire des plugins décrivent Canvas comme expérimental et soutenu par un plugin

## Non-objectifs

- Ne redessinez pas l'interface utilisateur Canvas de l'application native dans cette refactorisation.
- Ne supprimez pas la prise en charge du protocole/du client Canvas d'iOS, d'Android ou de macOS, à moins qu'une décision produit distincte n'indique que Canvas doit être supprimé.
- Ne créez pas un vaste framework de service de plugin uniquement pour Canvas, sauf si au moins un autre plugin groupé a besoin de la même interface.

## État actuel de la branche

Terminé :

- Ajouté le package de plugin groupé dans `extensions/canvas`.
- Ajouté `extensions/canvas/openclaw.plugin.json`.
- Déplacé l'outil `canvas` de l'agent de `src/agents/tools/canvas-tool.ts` vers `extensions/canvas/src/tool.ts`.
- Suppression de l'enregistrement central de `createCanvasTool` depuis `src/agents/openclaw-tools.ts`.
- Déplacement de l'implémentation de l'hôte Canvas de `src/canvas-host` vers `extensions/canvas/src/host`.
- Conservation de `extensions/canvas/runtime-api.ts` en tant que barrel de compatibilité propriétaire du plugin pour les tests, le packaging et les assistants publics Canvas externes.
- Déplacement de la matérialisation des documents Canvas de `src/gateway/canvas-documents.ts` vers `extensions/canvas/src/documents.ts`.
- Déplacement de l'implémentation Canvas de CLI et des assistants JSONL A2UI vers `extensions/canvas/src/cli.ts`.
- Déplacement de l'URL de l'hôte Canvas et des assistants de capacités scoped vers `extensions/canvas/src`.
- Déplacement des valeurs par défaut des commandes de nœud Canvas hors des listes centralisées en dur et vers `nodeInvokePolicies` du plugin.
- Ajout d'une configuration d'hôte Canvas propriétaire du plugin à `plugins.entries.canvas.config.host`.
- Déplacement du service HTTP Canvas et A2UI derrière l'enregistrement des routes HTTP du plugin Canvas.
- Ajout d'une répartition générique des mises à niveau WebSocket pour les routes HTTP propriétaires du plugin.
- Remplacement de l'URL de l'hôte de passerie et de l'authentification par capacité de nœud spécifiques à Canvas par une surface de plugin hébergé générique et des assistants de capacité de nœud.
- Ajout de résolveurs de média hébergés propriétaires du plugin afin que les URL des documents Canvas soient résolues via le plugin Canvas au lieu que le cœur n'importe les internes des documents Canvas.
- Ajout de `api.registerNodeCliFeature(...)` pour que Canvas puisse déclarer `openclaw nodes canvas` comme une fonctionnalité de nœud propriétaire du plugin sans épeler manuellement le chemin de la commande parente.
- Suppression des imports de production `src/**` de `extensions/canvas/runtime-api.js`.
- Déplacement de la source du bundle A2UI de `apps/shared/OpenClawKit/Tools/CanvasA2UI` vers `extensions/canvas/src/host/a2ui-app`.
- Déplacement de l'implémentation de build/copie A2UI sous `extensions/canvas/scripts` et remplacement du câblage de build racine par des hooks d'actifs génériques pour plugin groupé.
- Suppression de l'alias de configuration `canvasHost` de premier niveau hérité à l'exécution.
- Conservé la migration du docteur Canvas afin que Canvas`openclaw doctor --fix` réécrive les anciennes configurations `canvasHost` en `plugins.entries.canvas.config.host`.
- Supprimé la compatibilité du protocole Canvas pour les anciens agents derrière le protocole de passerelle v4. Les clients natifs et les passerelles n'utilisent désormais que Canvas`pluginSurfaceUrls.canvas` plus `node.pluginSurface.refresh` ; le chemin déprécié `canvasHostUrl`, `canvasCapability` et `node.canvas.capability.refresh` est intentionnellement non pris en charge dans cette refactorisation expérimentale.
- Mis à jour l'inventaire des plugins générés pour inclure Canvas.
- Ajouté la documentation de référence du plugin à `docs/plugins/reference/canvas.md`.

Surfaces Canvas restantes appartenant au cœur connues :

- Les gestionnaires Canvas de l'application native sous Canvas`apps/`Canvas consomment toujours intentionnellement la surface du plugin Canvas
- gestionnaires de protocole/client Canvas de l'application native sous Canvas`apps/`
- la sortie de l'artefact publié utilise toujours `dist/canvas-host/a2ui` pour la recherche à l'exécution rétrocompatible, mais l'étape de copie appartient désormais au plugin

## Structure cible

`extensions/canvas` devrait posséder :

- le manifeste du plugin et les métadonnées du package
- l'enregistrement de l'outil de l'agent
- la stratégie de commande d'appel de nœud
- l'hôte Canvas et le runtime A2UI
- la source du bundle A2UI Canvas et les scripts de construction/copie des actifs
- la création de documents Canvas et la résolution des actifs
- l'implémentation de la CLI Canvas
- la page de documentation Canvas et l'entrée d'inventaire des plugins

Le cœur ne doit posséder que les interfaces génériques :

- la découverte et l'enregistrement des plugins
- le registre générique des outils de l'agent
- le registre générique des stratégies d'appel de nœud
- la répartition générique des mises à niveau HTTP/auth et WebSocket de la passerelle
- la résolution générique de l'URL de surface du plugin hébergé
- l'enregistrement générique du résolveur de média hébergé
- le transport générique des capacités des nœuds
- le plomberie de configuration générique
- la découverte générique des crochets d'actifs de plugins groupés

Les applications natives peuvent conserver les gestionnaires de commandes Canvas en tant que clients du protocole. Ils ne sont pas les propriétaires du runtime du plugin.

## Étapes de migration

1. Considérez `plugins.entries.canvas.config.host` comme la surface de configuration détenue par le plugin.
2. Mettez à jour la documentation pour que Canvas soit décrit comme un plugin groupé expérimental.
3. Exécutez les tests Canvas ciblés, les vérifications de l'inventaire des plugins, les vérifications de l'API du SDK de plugins, et les portes de build/type affectées par les limites d'exécution.

## Liste de vérification d'audit

Avant de déclarer la refactorisation terminée :

- `rg "src/canvas-host|../canvas-host"` ne renvoie aucune importation de source active.
- `rg "canvas-tool|createCanvasTool" src`Canvas ne trouve aucune implémentation d'outil Canvas détenue par le noyau.
- `rg "canvas.present|canvas.snapshot|canvas.a2ui" src/gateway` ne trouve aucun défaut de liste d'autorisation codé en dur en dehors des tests de stratégie de plugin générique.
- `rg "extensions/canvas/runtime-api" src --glob '!**/*.test.ts'` est vide.
- `rg "canvas-documents" src` est vide.
- `rg "registerNodesCanvasCommands|nodes-canvas" src`Canvas est vide ; le plugin Canvas enregistre `openclaw nodes canvas`CLI via les métadonnées CLI de plugin imbriquées.
- `rg "createCanvasHostHandler|handleA2uiHttpRequest" src/gateway` ne renvoie aucune propriété d'exécution de passerelle.
- `rg "apps/shared/OpenClawKit/Tools/CanvasA2UI|canvas-a2ui-copy|extensions/canvas/src/host/a2ui" scripts .github package.json` ne trouve que des wrappers de compatibilité ou des chemins détenus par le plugin.
- `pnpm plugins:inventory:check` réussit.
- `pnpm plugin-sdk:api:check`API réussit, ou les lignes de base de l'API générées sont mises à jour intentionnellement et révisées.
- Les tests Canvas ciblés réussissent.
- Les tests de voies modifiées réussissent pour les chemins d'hôte Canvas/A2UI.
- Le corps du PR indique explicitement que Canvas est expérimental et basé sur un plugin.

## Commandes de vérification

Utilisez des vérifications locales ciblées lors de l'itération :

```sh
pnpm test extensions/canvas/src/host/server.test.ts extensions/canvas/src/host/server.state-dir.test.ts extensions/canvas/src/host/file-resolver.test.ts
pnpm test src/gateway/server.plugin-node-capability-auth.test.ts src/gateway/server-import-boundary.test.ts
pnpm test extensions/canvas/src/config-migration.test.ts src/commands/doctor-legacy-config.migrations.test.ts
pnpm test test/scripts/changed-lanes.test.ts test/scripts/build-all.test.ts extensions/canvas/scripts/bundle-a2ui.test.ts test/scripts/bundled-plugin-assets.test.ts extensions/canvas/scripts/copy-a2ui.test.ts src/infra/run-node.test.ts
pnpm tsgo:extensions
pnpm plugins:inventory:check
pnpm plugin-sdk:api:check
```

Exécutez `pnpm build` avant le push si le baril d'exécution, l'importation paresseuse, l'empaquetage ou les surfaces de plugin publiées changent.
