---
summary: "Plug-in intégré `oc-path` : fournit le `openclaw path` CLI pour le schéma d'adressage de fichiers d'espace de travail `oc://`"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "Plug-in OC Path"
---

Le plug-in intégré `oc-path` ajoute le CLI [`openclaw path`](/fr/cli/path) pour le
schéma d'adressage de fichiers d'espace de travail `oc://`. Il est livré dans le dépôt OpenClaw sous
`extensions/oc-path/` mais est optionnel — l'installation/la construction le laisse dormant jusqu'à ce que
vous l'activiez.

Les adresses `oc://` pointent vers une feuille unique (ou un ensemble de feuilles avec caractères génériques) à l'intérieur
d'un fichier d'espace de travail. Le plug-in comprend aujourd'hui trois types de fichiers :

- **markdown** (`.md`, `.mdx`) : frontmatter, sections, éléments, champs
- **c** (`.jsonc`, `.json5`, `.json`) : commentaires et formatage préservés
- **l** (`.jsonl`, `.ndjson`) : enregistrements orientés ligne

Les auto-hébergeurs et les extensions d'éditeur utilisent le CLI pour lire ou écrire une feuille unique
sans scripter directement avec le SDK ; les agents et les hooks le traitent comme un
substrat déterministe, de sorte que les allers-retours fidèles au niveau octet et la sentinelle de
masquage s'appliquent uniformément selon les types.

## Pourquoi l'activer

Activez `oc-path` lorsque vous voulez que des scripts, des hooks ou des outils d'agent locaux pointent
vers une partie précise de l'état de l'espace de travail sans inventer d'analyseur pour chaque forme de
fichier. Une seule adresse `oc://` peut nommer une clé de frontmatter markdown, un élément de
section, une feuille de configuration JSONC ou un champ d'événement JSONL.

C'est important pour les flux de travail des mainteneurs où la modification doit être petite, auditable et reproductible : inspecter une valeur, trouver les enregistrements correspondants, faire un essai à blanc d'une écriture, puis appliquer uniquement cette feuille en laissant les commentaires, les fins de ligne et le formatage voisin intacts. Le fait de garder cela en tant que plugin optionnel donne aux utilisateurs expérimentés le substrat d'adressage sans introduire les dépendances de l'analyseur ou la surface CLI dans le cœur pour les installations qui n'en ont jamais besoin.

Raisons courantes de l'activer :

- **Automatisation locale** : les scripts shell peuvent résoudre ou mettre à jour une valeur de l'espace de travail avec `openclaw path … --json` au lieu de porter du code d'analyse markdown, JSONC et JSONL séparé.
- **Modifications visibles par les agents** : un agent peut afficher une différence d'essai à blanc pour une feuille adressée avant l'écriture, ce qui est plus facile à réviser qu'une réécriture de fichier libre.
- **Intégrations d'éditeurs** : un éditeur peut faire correspondre `oc://AGENTS.md/tools/gh` au nœud markdown exact et au numéro de ligne sans avoir à deviner à partir du texte de l'en-tête.
- **Diagnostics** : `emit` fait un aller-retour du fichier via l'analyseur et l'émetteur, vous pouvez donc vérifier si un type de fichier est stable en octets avant de vous fier aux modifications automatisées.

Exemples concrets :

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

Le plugin n'est intentionnellement pas le propriétaire de la sémantique de niveau supérieur. Les plugins de mémoire sont toujours propriétaires des écritures en mémoire, les commandes de configuration sont toujours propriétaires de la gestion complète de la configuration, et la logique LKG est toujours propriétaire de la restauration/promotion. `oc-path` est la couche d'opération de fichier d'adressage étroit et de préservation d'octets autour de laquelle ces outils de niveau supérieur peuvent être construits.

## Où il s'exécute

Le plugin s'exécute **en processus à l'intérieur du `openclaw` CLI** sur l'hôte où vous invoquez la commande. Il n'a pas besoin d'un Gateway en cours d'exécution et n'ouvre aucune socket réseau — chaque verbe est une transformation pure sur un fichier vers lequel vous le pointez.

Les métadonnées du plugin résident dans `extensions/oc-path/openclaw.plugin.json` :

```json
{
  "id": "oc-path",
  "name": "OC Path",
  "activation": {
    "onStartup": false,
    "onCommands": ["path"]
  },
  "commandAliases": [{ "name": "path", "kind": "cli" }]
}
```

`onStartup: false` garde le plugin en dehors du chemin chaud du Gateway. `onCommands:
["path"]` indique au CLI de charger le plugin paresseusement la première fois que vous exécutez `openclaw path …`, les installations qui n'utilisent jamais le verbe ne paient donc aucun coût.

## Activer

```bash
openclaw plugins enable oc-path
```

Redémarrez la Gateway (si vous en exécutez une) pour que l'instantané du manifeste prenne en compte le nouvel état. Les appels basiques Gateway`openclaw path`CLI fonctionnent immédiatement sur le même hôte — le CLI charge le plugin à la demande.

Désactiver avec :

```bash
openclaw plugins disable oc-path
```

## Dépendances

Toutes les dépendances de l'analyseur sont locales au plugin — l'activation de `oc-path` n'ajoute pas de nouveaux paquets au moteur d'exécution central :

| Dépendance     | Objectif                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `commander`    | Câblage des sous-commandes pour `resolve`, `find`, `set`, `validate`, `emit`.                     |
| `jsonc-parser` | Analyse JSONC + modifications de feuilles en conservant les commentaires et les virgules finales. |
| `markdown-it`  | Tokenisation Markdown pour le model section / élément / champ.                                    |

JSONL reste fait à la main — l'analyse orientée ligne est plus simple que n'importe quelle dépendance, et l'analyse JSONC ligne par ligne passe déjà par `jsonc-parser`.

## Ce qu'il fournit

| Surface                                         | Fourni par                                              |
| ----------------------------------------------- | ------------------------------------------------------- |
| `openclaw path`CLI CLI                          | `extensions/oc-path/cli-registration.ts`                |
| Analyseur / Formateur `oc://`                   | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| Analyse / émission / modification par type      | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl}`       |
| Résolution / Recherche / Définition universelle | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| Garde de sentinelle de rédaction                | `extensions/oc-path/src/oc-path/sentinel.ts`            |

Le CLI est la seule surface publique aujourd'hui. Les verbes du substrat sont privés au plugin ; les consommateurs utilisent le CLI (ou construisent leur propre plugin avec le SDK).

## Relation avec les autres plugins

- **`memory-*`** : les écritures en mémoire passent par les plugins de mémoire, et non `oc-path`.
  `oc-path` est un substrat de fichier générique ; les plugins de mémoire ajoutent leur propre sémantique par-dessus.
- **LKG** : `path` ne connaît pas la restauration de la configuration Last-Known-Good. Si un
  fichier est suivi par LKG, le prochain appel `observe` décide s'il faut promouvoir ou
  récupérer ; `set --batch` pour un multi-ensemble atomique à travers le cycle de vie
  de promotion/récupération LKG est prévu parallèlement au substrat de récupération LKG.

## Sécurité

`set` écrit des octets bruts via le chemin d'émission du substrat, qui applique
automatiquement la garde de sentinelle de rédaction. Une feuille contenant
`__OPENCLAW_REDACTED__` (textuellement ou en tant que sous-chaîne) est refusée au moment de l'écriture
avec `OC_EMIT_SENTINEL`. Le CLI nettoie également la sentinelle littérale de toute
sortie humaine ou JSON qu'il imprime, la remplaçant par `[REDACTED]` afin que les
captures de terminal et les pipelines ne fuient jamais le marqueur.

## Connexes

- [Référence du `openclaw path` CLI](/fr/cli/path)
- [Gérer les plugins](/fr/plugins/manage-plugins)
- [Construire des plugins](/fr/plugins/building-plugins)
