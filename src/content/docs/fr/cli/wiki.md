---
summary: "CLIRéférence de la CLI pour `openclaw wiki` (état du coffre memory-wiki, recherche, compilation, lint, application, pont et assistants Obsidian)"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

Inspecter et maintenir le coffre `memory-wiki`.

Fourni par le plugin `memory-wiki` inclus.

Connexes :

- [Plugin Memory Wiki](/fr/plugins/memory-wiki)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [CLI : mémoire](CLI/en/cli/memory)

## À quoi ça sert

Utilisez `openclaw wiki` lorsque vous souhaitez un coffre de connaissances compilé avec :

- recherche native wiki et lecture de pages
- synthèses riches en provenance
- rapports de contradictions et de fraîcheur
- importations du pont depuis le plugin mémoire actif
- aides CLI Obsidian en option

## Commandes courantes

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "who should I ask about Teams?" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "Short synthesis body" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "Still active?"

openclaw wiki bridge import
openclaw wiki unsafe-local import

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## Commandes

### `wiki status`

Inspecter le mode, l'état de santé du coffre actuel et la disponibilité de la CLI Obsidian.

Utilisez ceci en premier si vous n'êtes pas sûr que le coffre soit initialisé, que le mode pont
soit sain, ou que l'intégration Obsidian soit disponible.

Lorsque le mode pont est actif et configuré pour lire les artefacts de mémoire, cette commande
interroge le Gateway en cours d'exécution afin qu'il voie le même contexte de plugin de mémoire actif que
la mémoire de l'agent/runtime.

### `wiki doctor`

Exécuter les contrôles de santé du wiki et révéler les problèmes de configuration ou de coffre.

Lorsque le mode pont est actif et configuré pour lire les artefacts de mémoire, cette commande
interroge le Gateway en cours d'exécution avant de construire le rapport. Les importations de pont désactivées
et les configurations de pont qui ne lisent pas les artefacts de mémoire restent locales/hors ligne.

Les problèmes typiques incluent :

- mode pont activé sans artefacts de mémoire publics
- disposition du coffre invalide ou manquante
- CLI externe Obsidian manquante lorsque le mode Obsidian est attendu

### `wiki init`

Créer la disposition du coffre wiki et les pages de démarrage.

Cela initialise la structure racine, y compris les index de niveau supérieur et les répertoires
de cache.

### `wiki ingest <path-or-url>`

Importer du contenu dans la couche source du wiki.

Notes :

- L'ingestion d'URL est contrôlée par `ingest.allowUrlIngest`
- les pages source importées conservent leur provenance dans le frontmatter
- la compilation automatique peut s'exécuter après l'ingestion lorsqu'elle est activée

### `wiki compile`

Reconstruire les index, les blocs associés, les tableaux de bord et les résumés compilés.

Cela écrit des artefacts stables orientés machine sous :

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Si `render.createDashboards` est activé, la compilation actualise également les pages de rapport.

### `wiki lint`

Analyser le coffre-fort et signaler :

- problèmes structurels
- lacunes de provenance
- contradictions
- questions en suspens
- pages/assertions à faible confiance
- pages/assertions obsolètes

Exécutez ceci après des mises à jour significatives du wiki.

### `wiki search <query>`

Rechercher du contenu dans le wiki.

Le comportement dépend de la configuration :

- `search.backend` : `shared` ou `local`
- `search.corpus` : `wiki`, `memory`, ou `all`
- `--mode` : `auto`, `find-person`, `route-question`, `source-evidence`, ou
  `raw-claim`

Utilisez `wiki search` lorsque vous souhaitez un classement spécifique au wiki ou des détails de provenance.
Pour une passe de rappel large et partagée, préférez `openclaw memory search` lorsque le
plugin de mémoire actif expose une recherche partagée.

Les modes de recherche aident l'agent à choisir la bonne surface :

- `find-person` : alias, pseudonymes, réseaux sociaux, IDs canoniques et pages de personnes
- `route-question` : indices ask-for/best-used-for et contexte des relations
- `source-evidence` : pages sources et champs de preuve structurés
- `raw-claim` : texte d'assertion structuré avec des métadonnées d'assertion/preuve

Exemples :

```bash
openclaw wiki search "bgroux" --mode find-person
openclaw wiki search "who knows Teams rollout?" --mode route-question
openclaw wiki search "maintainer-whois" --mode source-evidence
openclaw wiki search "strong route Teams" --mode raw-claim --json
```

La sortie texte inclut les lignes `Claim:` et `Evidence:` lorsqu'un résultat correspond à
une assertion structurée. La sortie JSON expose également `matchedClaimId`,
`matchedClaimStatus`, `matchedClaimConfidence`, `evidenceKinds`, et
`evidenceSourceIds` pour un forage côté agent.

### `wiki get <lookup>`

Lire une page wiki par id ou par chemin relatif.

Exemples :

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

Appliquer des mutations étroites sans chirurgie de page libre.

Les flux pris en charge incluent :

- créer/mettre à jour une page de synthèse
- mettre à jour les métadonnées de la page
- attacher les ids des sources
- ajouter des questions
- ajouter des contradictions
- mettre à jour la confiance/le statut
- écrire des assertions structurées

Cette commande existe pour que le wiki puisse évoluer en toute sécurité sans éditer manuellement
les blocs gérés.

### `wiki bridge import`

Importez des artefacts de mémoire publics depuis le plugin de mémoire actif vers les pages sources prises en charge par le bridge.

Utilisez ceci en mode `bridge` lorsque vous souhaitez que les derniers artefacts de mémoire exportés soient tirés dans le coffre-fort wiki.

Pour les lectures actives d'artefacts de bridge, le CLI achemine l'importation via le Gateway RPC afin que l'importation utilise le contexte du plugin de mémoire d'exécution. Si les importations via le bridge sont désactivées ou si les lectures d'artefacts sont désactivées, la commande conserve le comportement d'importation zéro local/hors ligne.

### `wiki unsafe-local import`

Importez depuis des chemins locaux explicitement configurés en mode `unsafe-local`.

Ceci est intentionnellement expérimental et réservé à la même machine.

### `wiki obsidian ...`

Commandes d'assistance Obsidian pour les coffres-forts fonctionnant en mode compatible Obsidian.

Sous-commandes :

- `status`
- `search`
- `open`
- `command`
- `daily`

Celles-ci nécessitent le CLI officiel `obsidian` sur `PATH` lorsque `obsidian.useOfficialCli` est activé.

## Guide d'utilisation pratique

- Utilisez `wiki search` + `wiki get` lorsque la provenance et l'identité de la page sont importantes.
- Utilisez `wiki apply` au lieu de modifier manuellement les sections générées gérées.
- Utilisez `wiki lint` avant de faire confiance à un contenu contradictoire ou à faible confiance.
- Utilisez `wiki compile` après des importations en masse ou des modifications de source lorsque vous souhaitez de nouveaux tableaux de bord et des résumés compilés immédiatement.
- Utilisez `wiki bridge import` lorsque le mode pont dépend de nouveaux artefacts de mémoire exportés.

## Liens avec la configuration

Le comportement de `openclaw wiki` est déterminé par :

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

Voir [Plugin Memory Wiki](/fr/plugins/memory-wiki) pour le modèle de configuration complet.

## Connexes

- [Référence CLI](/fr/cli)
- [Wiki de mémoire](/fr/plugins/memory-wiki)
