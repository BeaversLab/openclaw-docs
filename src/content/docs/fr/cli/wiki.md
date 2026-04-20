---
summary: "Référence de la CLI pour `openclaw wiki` (statut du coffre memory-wiki, recherche, compilation, lint, application, pont et aides Obsidian)"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "wiki"
---

# `openclaw wiki`

Inspecter et maintenir le coffre `memory-wiki`.

Fourni par le plugin `memory-wiki` inclus.

Connexes :

- [Plugin Memory Wiki](/fr/plugins/memory-wiki)
- [Vue d'ensemble de Memory](/fr/concepts/memory)
- [CLI : memory](/fr/cli/memory)

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

### `wiki doctor`

Exécuter les contrôles de santé du wiki et signaler les problèmes de configuration ou de coffre.

Les problèmes typiques incluent :

- mode pont activé sans artefacts de mémoire publics
- disposition de coffre invalide ou manquante
- CLI Obsidian externe manquante lorsque le mode Obsidian est attendu

### `wiki init`

Créer la disposition du coffre wiki et les pages de démarrage.

Cela initialise la structure racine, y compris les index de niveau supérieur et les répertoires
de cache.

### `wiki ingest <path-or-url>`

Importer du contenu dans la couche source du wiki.

Notes :

- L'ingestion d'URL est contrôlée par `ingest.allowUrlIngest`
- les pages source importées conservent la provenance dans le frontmatter
- la compilation automatique peut s'exécuter après l'ingestion si activée

### `wiki compile`

Reconstruire les index, les blocs liés, les tableaux de bord et les résumés compilés.

Cela écrit des artefacts stables orientés machine sous :

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Si `render.createDashboards` est activé, la compilation actualise également les pages de rapport.

### `wiki lint`

Vérifier le coffre et signaler :

- problèmes structurels
- lacunes de provenance
- contradictions
- questions ouvertes
- pages/réclamations à faible confiance
- pages/réclamations obsolètes

Exécutez ceci après des mises à jour significatives du wiki.

### `wiki search <query>`

Rechercher dans le contenu du wiki.

Le comportement dépend de la configuration :

- `search.backend` : `shared` ou `local`
- `search.corpus` : `wiki`, `memory` ou `all`

Utilisez `wiki search` lorsque vous souhaitez un classement spécifique au wiki ou des détails de provenance.
Pour une passe de rappel large et partagée, préférez `openclaw memory search` lorsque le
plugin de mémoire actif expose une recherche partagée.

### `wiki get <lookup>`

Lire une page de wiki par id ou par chemin relatif.

Exemples :

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

Appliquer des mutations étroites sans modification manuelle de page.

Les flux pris en charge incluent :

- créer/mettre à jour une page de synthèse
- mettre à jour les métadonnées de la page
- attacher les identifiants source
- ajouter des questions
- ajouter des contradictions
- mettre à jour la confiance/le statut
- écrire des réclamations structurées

Cette commande existe pour que le wiki puisse évoluer en toute sécurité sans modifier manuellement
les blocs gérés.

### `wiki bridge import`

Importer des artefacts de mémoire publique du plugin de mémoire actif vers des pages source
prises en charge par le pont.

Utilisez ceci en mode `bridge` lorsque vous souhaitez que les derniers artefacts de mémoire exportés
soient tirés dans le coffre-fort du wiki.

### `wiki unsafe-local import`

Importer à partir de chemins locaux explicitement configurés en mode `unsafe-local`.

Ceci est intentionnellement expérimental et limité à la même machine.

### `wiki obsidian ...`

Commandes d'assistance Obsidian pour les coffres-forts fonctionnant en mode compatible Obsidian.

Sous-commandes :

- `status`
- `search`
- `open`
- `command`
- `daily`

Celles-ci nécessitent la CLI officielle `obsidian` CLI sur `PATH` lorsque
`obsidian.useOfficialCli` est activé.

## Guide d'utilisation pratique

- Utilisez `wiki search` + `wiki get` lorsque la provenance et l'identité de la page sont importantes.
- Utilisez `wiki apply` au lieu de modifier manuellement les sections générées gérées.
- Utilisez `wiki lint` avant de faire confiance à un contenu contradictoire ou à faible confiance.
- Utilisez `wiki compile` après des importations en masse ou des modifications de source lorsque vous souhaitez des tableaux de bord frais et des résumés compilés immédiatement.
- Utilisez `wiki bridge import` lorsque le mode pont dépend d'artefacts de mémoire nouvellement exportés.

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
