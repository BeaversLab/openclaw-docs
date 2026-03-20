---
résumé : notes et contournements du plantage Node + tsx "__name is not a function"
read_when:
  - Débogage des scripts de développement exclusifs à Node ou des échecs du mode surveillance
  - Enquête sur les plantages du chargeur tsx/esbuild dans OpenClaw
title : "Node + tsx Crash"
---

# Plantage Node + tsx "\_\_name is not a function"

## Résumé

L'exécution d'OpenClaw via Node avec `tsx` échoue au démarrage avec :

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

Cela a commencé après avoir changé les scripts de développement de Bun vers `tsx` (commit `2871657e`, 2026-01-06). Le même chemin d'exécution fonctionnait avec Bun.

## Environnement

- Node : v25.x (observé sur v25.3.0)
- tsx : 4.21.0
- OS : macOS (reproduction probable aussi sur d'autres plateformes exécutant Node 25)

## Reproduction (Node uniquement)

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## Reproduction minimale dans le dépôt

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Vérification de la version de Node

- Node 25.3.0 : échoue
- Node 22.22.0 (Homebrew `node@22`) : échoue
- Node 24 : pas encore installé ici ; nécessite une vérification

## Notes / hypothèse

- `tsx` utilise esbuild pour transformer TS/ESM. Le `keepNames` d'esbuild émet une fonction d'aide `__name` et enveloppe les définitions de fonctions avec `__name(...)`.
- Le plantage indique que `__name` existe mais n'est pas une fonction à l'exécution, ce qui implique que la fonction d'aide est manquante ou écrasée pour ce module dans le chemin du chargeur Node 25.
- Des problèmes similaires avec la fonction d'aide `__name` ont été signalés chez d'autres utilisateurs d'esbuild lorsque la fonction d'aide est manquante ou réécrite.

## Historique de la régression

- `2871657e` (2026-01-06) : scripts modifiés de Bun vers tsx pour rendre Bun optionnel.
- Avant cela (chemin Bun), `openclaw status` et `gateway:watch` fonctionnaient.

## Contournements

- Utiliser Bun pour les scripts de développement (retour temporaire actuel).
- Utiliser Node + tsc watch, puis exécuter la sortie compilée :

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- Confirmé localement : `pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` fonctionne sur Node 25.
- Désactiver esbuild keepNames dans le chargeur TS si possible (empêche l'insertion de la fonction d'aide `__name`) ; tsx ne l'expose pas actuellement.
- Tester Node LTS (22/24) avec `tsx` pour voir si le problème est spécifique à Node 25.

## Références

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## Prochaines étapes

- Reproduire sur Node 22/24 pour confirmer la régression de Node 25.
- Tester la version nightly `tsx` ou épingler à une version antérieure si une régression connue existe.
- Si cela se reproduit sur Node LTS, soumettre un rapport minimal en amont avec la stack trace `__name`.

import en from "/components/footer/en.mdx";

<en />
