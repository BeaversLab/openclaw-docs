---
summary: "Plug-in intégré `oc-path` : fournit le `openclaw path` CLI pour le schéma d'adressage de fichiers d'espace de travail `oc://`"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "Plug-in OC Path"
---

Le plugin `oc-path` inclus ajoute la CLI [`openclaw path`](/fr/cli/path) pour le
schéma d'adressage de fichiers d'espace de travail `oc://`. Il est fourni dans le dépôt OpenClaw sous
`extensions/oc-path/` mais est facultatif — l'installation/build le laisse en veille jusqu'à ce que
vous l'activiez.

Les adresses `oc://` pointent vers une feuille unique (ou un ensemble de feuilles avec caractères génériques) à l'intérieur
d'un fichier d'espace de travail. Le plugin comprend aujourd'hui quatre types de fichiers :

- **markdown** (`.md`, `.mdx`) : frontmatter, sections, éléments, champs
- **c** (`.jsonc`, `.json5`, `.json`) : commentaires et formatage préservés
- **l** (`.jsonl`, `.ndjson`) : enregistrements orientés ligne
- **yaml** (`.yaml`, `.yml`, `.lobster`) : nœuds map/séquence/scalaire via l'API du document YAML

Les auto-hébergeurs et les extensions d'éditeur utilisent la CLI pour lire ou écrire une feuille unique
sans scripter directement avec le SDK ; les agents et les hooks la traitent comme un
substrat déterministe, de sorte que les allers-retours avec fidélité des octets et la garde de sentinelle de rédaction
s'appliquent uniformément selon les types.

## Pourquoi l'activer

Activez `oc-path` lorsque vous voulez que des scripts, des hooks ou des outils d'agent locaux pointent
vers une partie précise de l'état de l'espace de travail sans inventer un analyseur pour chaque forme de
fichier. Une seule adresse `oc://` peut nommer une clé de frontmatter markdown, un élément de
section, une feuille de configuration JSONC, un champ d'événement JSONL ou une étape de workflow YAML.

C'est important pour les workflows des mainteneurs où le changement doit être petit,
auditable et reproductible : inspecter une valeur, trouver les enregistrements correspondants, faire un essai à blanc d'une
écriture, puis appliquer uniquement cette feuille tout en laissant les commentaires, les fins de ligne et le
formatage voisin intacts. Garder cela en tant que plugin facultatif donne aux utilisateurs expérimentés le
substrat d'adressage sans introduire de dépendances d'analyseur ou de surface CLI dans
le cœur pour les installations qui n'en ont jamais besoin.

Raisons courantes de l'activer :

- **Automatisation locale** : les scripts shell peuvent résoudre ou mettre à jour une valeur d'espace de travail
  avec `openclaw path … --json` au lieu de porter du code d'analyse markdown, JSONC,
  JSONL et YAML distinct.
- **Modifications visibles par l'agent** : un agent peut afficher une diff à blanc pour une feuille adressée
  avant l'écriture, ce qui est plus facile à réviser qu'une réécriture de fichier libre.
- **Intégrations de l'éditeur** : un éditeur peut associer `oc://AGENTS.md/tools/gh` à
  le nœud markdown exact et le numéro de ligne sans deviner à partir du texte de l'en-tête.
- **Diagnostics** : `emit` effectue un aller-retour sur un fichier via l'analyseur et l'émetteur, donc
  vous pouvez vérifier si un type de fichier est stable en octets avant de compter sur des modifications
  automatisées.

Exemples concrets :

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

Le plugin n'est intentionnellement pas le propriétaire de la sémantique de niveau supérieur. Les plugins
de mémoire possèdent toujours les écritures en mémoire, les commandes de configuration possèdent toujours la gestion complète de la
configuration, et la logique LKG possède toujours la restauration/promotion. `oc-path` est la fine
couche d'adressage et d'opération de fichier préservant les octets autour de laquelle ces outils de niveau supérieur
peuvent être construits.

## Où il s'exécute

Le plugin s'exécute **en processus à l'intérieur du `openclaw` CLI** sur l'hôte où vous
invoquez la commande. Il n'a pas besoin d'un Gateway en cours d'exécution et n'ouvre aucune
socket réseau — chaque verbe est une transformation pure sur un fichier vers lequel vous le pointez.

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

`onStartup: false` garde le plugin hors du chemin chaud du Gateway. `onCommands:
["path"]` indique au CLI de charger le plugin paresseusement la première fois que vous exécutez
`openclaw path …`, donc les installations qui n'utilisent jamais ce verbe ne paient aucun coût.

## Activer

```bash
openclaw plugins enable oc-path
```

Redémarrez le Gateway (si vous en exécutez un) pour que l'instantané du manifeste prenne en compte le nouvel
état. Les invocations nues de `openclaw path` fonctionnent immédiatement sur le même hôte —
le CLI charge le plugin à la demande.

Désactiver avec :

```bash
openclaw plugins disable oc-path
```

## Dépendances

Toutes les dépendances de l'analyseur sont locales au plugin — activer `oc-path` n'ajoute pas
de nouveaux paquets dans l'exécution central :

| Dépendance     | Objectif                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------- |
| `commander`    | Câblage des sous-commandes pour `resolve`, `find`, `set`, `validate`, `emit`.                 |
| `jsonc-parser` | Analyse JSONC + modifications de feuilles en gardant les commentaires et les virgules de fin. |
| `markdown-it`  | Tokenisation Markdown pour le modèle de section / élément / champ.                            |
| `yaml`         | YAML `Document` analyse / émet / modifie en conservant les commentaires et le style de flux.  |

JSONL reste fait sur mesure — l'analyse orientée ligne est plus simple que n'importe quelle dépendance, et l'analyse JSONC ligne par ligne passe déjà par `jsonc-parser`.

## Ce qu'il fournit

| Surface                                          | Fourni par                                              |
| ------------------------------------------------ | ------------------------------------------------------- |
| CLI `openclaw path`CLI                           | `extensions/oc-path/cli-registration.ts`                |
| analyseur / formateur `oc://`                    | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| Analyse / émission / modification par type       | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl,yaml}`  |
| Résolution / recherche / définition universelles | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| Garde de sentinelle de rédaction                 | `extensions/oc-path/src/oc-path/sentinel.ts`            |

La CLI est la seule surface publique aujourd'hui. Les verbes du substrat sont privés au plugin ; les consommateurs utilisent la CLI (ou créent leur propre plugin sur le SDK).

## Relation avec d'autres plugins

- **`memory-*`** : les écritures en mémoire passent par les plugins de mémoire, pas par `oc-path`.
  `oc-path` est un substrat de fichier générique ; les plugins de mémoire ajoutent leur propre sémantique par-dessus.
- **LKG** : `path` ne connaît pas la restauration de la configuration Last-Known-Good. Si un fichier est suivi par LKG, le prochain appel `observe` décide s'il faut promouvoir ou récupérer ; `set --batch` pour la multi-définition atomique à travers le cycle de vie de promotion/récupération LKG est prévu avec le substrat de récupération LKG.

## Sécurité

`set` écrit des octets bruts via le chemin d'émission du substrat, ce qui applique automatiquement la garde de sentinelle de rédaction. Une feuille contenant `__OPENCLAW_REDACTED__` (textuellement ou comme sous-chaîne) est refusée à l'écriture avec `OC_EMIT_SENTINEL`CLI. La nettoie également la sentinelle littérale de toute sortie humaine ou JSON qu'elle imprime, en la remplaçant par `[REDACTED]` afin que les captures de terminal et les pipelines ne fuient jamais le marqueur.

## Connexes

- [Référence de la CLI `openclaw path`CLI](/fr/cli/path)
- [Gérer les plugins](/fr/plugins/manage-plugins)
- [Construire des plugins](/fr/plugins/building-plugins)
