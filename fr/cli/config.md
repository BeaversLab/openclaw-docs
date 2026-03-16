---
summary: "Référence de la CLI pour `openclaw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Assistants de configuration : obtenir/définir/supprimer/valider des valeurs par chemin et imprimer le fichier de configuration actif. Exécuter sans sous-commande pour ouvrir l'assistant de configuration (identique à `openclaw configure`).

## Exemples

```bash
openclaw config file
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config unset tools.web.search.apiKey
openclaw config validate
openclaw config validate --json
```

## Chemins

Les chemins utilisent la notation par point ou par crochet :

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

Utilisez l'index de la liste des agents pour cibler un agent spécifique :

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Valeurs

Les valeurs sont analysées en JSON5 si possible ; sinon, elles sont traitées comme des chaînes de caractères. Utilisez `--strict-json` pour exiger l'analyse JSON5. `--json` reste pris en charge en tant qu'alias hérité.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## Sous-commandes

- `config file` : Imprimer le chemin du fichier de configuration actif (résolu à partir de `OPENCLAW_CONFIG_PATH` ou de l'emplacement par défaut).

Redémarrez la passerelle après les modifications.

## Valider

Valider la configuration actuelle par rapport au schéma actif sans démarrer la passerelle.

```bash
openclaw config validate
openclaw config validate --json
```

import fr from "/components/footer/fr.mdx";

<fr />
