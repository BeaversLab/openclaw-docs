---
summary : "Référence CLI pour `openclaw memory` (status/index/search)"
read_when :
  - Vous souhaitez indexer ou rechercher dans la mémoire sémantique
  - Vous déboguez la disponibilité ou l'indexation de la mémoire
title : "memory"
---

# `openclaw memory`

Gérer l'indexation et la recherche de la mémoire sémantique.
Fourni par le plugin de mémoire actif (par défaut : `memory-core` ; définissez `plugins.slots.memory = "none"` pour désactiver).

Connexe :

- Concept de Mémoire : [Mémoire](/fr/concepts/memory)
- Plugins : [Plugins](/fr/tools/plugin)

## Exemples

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## Options

`memory status` et `memory index` :

- `--agent <id>` : limiter à un seul agent. Sans cela, ces commandes s'exécutent pour chaque agent configuré ; si aucune liste d'agents n'est configurée, elles reviennent à l'agent par défaut.
- `--verbose` : émettre des journaux détaillés lors des sondages et de l'indexation.

`memory status` :

- `--deep` : sonder la disponibilité des vecteurs + des incorporations.
- `--index` : exécuter une réindexation si le stockage est sale (implique `--deep`).
- `--json` : afficher la sortie JSON.

`memory index` :

- `--force` : forcer une réindexation complète.

`memory search` :

- Entrée de requête : passez soit le `[query]` positionnel soit `--query <text>`.
- Si les deux sont fournis, `--query` l'emporte.
- Si aucun n'est fourni, la commande se termine avec une erreur.
- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--max-results <n>` : limiter le nombre de résultats renvoyés.
- `--min-score <n>` : filtrer les correspondances à faible score.
- `--json` : afficher les résultats JSON.

Remarques :

- `memory index --verbose` imprime les détails par phase (provider, model, sources, activité par lot).
- `memory status` inclut tous les chemins supplémentaires configurés via `memorySearch.extraPaths`.
- Si les champs de clé d'API distante de mémoire active effective sont configurés en tant que SecretRefs, la commande résout ces valeurs à partir de l'instantané de la passerelle active. Si la passerelle n'est pas disponible, la commande échoue rapidement.
- Remarque sur la différence de version de la Gateway : ce chemin de commande nécessite une passerelle qui prend en charge `secrets.resolve` ; les passerelles plus anciennes renvoient une erreur de méthode inconnue.

import en from "/components/footer/en.mdx";

<en />
