---
summary: Notes de crash Node + tsx "__name is not a function" et solutions de contournement
read_when:
  - Debugging Node-only dev scripts or watch mode failures
  - Investigating tsx/esbuild loader crashes in OpenClaw
title: "Node + tsx Crash"
---

# Node + tsx crash "\_\_name is not a function"

## Résumé

L'exécution d'OpenClaw via Node avec `tsx` échoue au démarrage avec :

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

Cela a commencé après avoir changé les scripts de dev de Bun à `tsx` (commit `2871657e`, 2026-01-06). Le même chemin d'exécution fonctionnait avec Bun.

## Environnement

- Node : v25.x (observé sur v25.3.0)
- tsx : 4.21.0
- OS : macOS (reproductible probablement aussi sur d'autres plates-formes exécutant Node 25)

## Repro (Node uniquement)

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## Repro minimal dans le dépôt

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Vérification de la version Node

- Node 25.3.0 : échoue
- Node 22.22.0 (Homebrew `node@22`) : échoue
- Node 24 : pas encore installé ici ; nécessite une vérification

## Notes / hypothèse

- `tsx` utilise esbuild pour transformer TS/ESM. Le `keepNames` d'esbuild émet une fonction utilitaire `__name` et enveloppe les définitions de fonction avec `__name(...)`.
- Le crash indique que `__name` existe mais n'est pas une fonction à l'exécution, ce qui implique que l'utilitaire est manquant ou écrasé pour ce module dans le chemin du chargeur Node 25.
- Des problèmes similaires avec la fonction utilitaire `__name` ont été signalés chez d'autres consommateurs d'esbuild lorsque l'utilitaire est manquant ou réécrit.

## Historique de la régression

- `2871657e` (2026-01-06) : scripts passés de Bun à tsx pour rendre Bun optionnel.
- Avant cela (chemin Bun), `openclaw status` et `gateway:watch` fonctionnaient.

## Solutions de contournement

- Utilisez Bun pour les scripts de dev (retour temporaire actuel).
- Utilisez Node + tsc watch, puis exécutez la sortie compilée :

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- Confirmé localement : `pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` fonctionne sur Node 25.
- Désactiver esbuild keepNames dans le chargeur TS si possible (empêche l'insertion de la fonction utilitaire `__name`) ; tsx ne l'expose pas actuellement.
- Testez Node LTS (22/24) avec `tsx` pour voir si le problème est spécifique à Node 25.

## Références

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## Prochaines étapes

- Reproduire sur Node 22/24 pour confirmer la régression de Node 25.
- Testez la version nightly de `tsx` ou verrouillez une version antérieure si une régression connue existe.
- Si cela se reproduit sur Node LTS, signalez un problème minimal en amont avec la trace de la pile `__name`.

import fr from '/components/footer/fr.mdx';

<fr />
