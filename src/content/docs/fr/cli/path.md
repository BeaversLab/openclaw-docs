---
summary: "CLIRéférence de la CLI pour `openclaw path` (inspecter et modifier les fichiers de l'espace de travail via le `oc://` schéma d'adressage)"
read_when:
  - You want to read or write a leaf inside a workspace file from the terminal
  - You're scripting against workspace state and want a stable, kind-agnostic addressing scheme
  - You're debugging a `oc://` path (validate the syntax, see what it resolves to)
title: "Path"
---

# `openclaw path`

Accès shell fourni par un plugin au substrat d'adressage `oc://` : un
schéma de chemin par type pour inspecter et modifier les fichiers d'espace de
travail adressables (markdown, c, l, yaml/yml/lobster). Les auto-hébergeurs,
les auteurs de plugins et les extensions d'éditeur l'utilisent pour lire,
trouver ou mettre à jour un emplacement précis sans avoir à créer des
analyseurs spécifiques à chaque fichier.

La CLI reflète les verbes publics du substrat :

- `resolve` est concret et à correspondance unique.
- `find` est le verbe à correspondances multiples pour les caractères génériques, les unions,
  les prédicats et l'expansion positionnelle.
- `set` n'accepte que les chemins concrets ou les marqueurs d'insertion ; les motifs avec
  caractères génériques sont rejetés avant l'écriture.

`path` est fourni par le plugin optionnel `oc-path` inclus. Activez-le avant
la première utilisation :

```bash
openclaw plugins enable oc-path
```

## Pourquoi l'utiliser

L'état d'OpenClaw est réparti dans des fichiers markdown édités par des humains,
des configurations JSONC commentées, des journaux JSONL en ajout uniquement, et
des fichiers de flux de travail/spécifications YAML. Les scripts shell, les hooks
et les agents ont souvent besoin d'une seule petite valeur dans ces fichiers : une
clé de frontmatter, un paramètre de plugin, un champ d'enregistrement de journal,
une étape YAML ou un élément de puce sous une section nommée.

`openclaw path` fournit à ces appelants une adresse stable au lieu d'un grep,
d'une expression régulière ou d'un analyseur ponctuel pour chaque type de fichier.
Le même chemin `oc://` peut être validé, résolu, recherché, testé à blanc
et écrit depuis le terminal, ce qui rend l'automatisation ciblée plus facile à
réviser et plus sûre à réexécuter. C'est particulièrement utile lorsque vous
souhaitez mettre à jour une feuille tout en préservant le reste des commentaires,
des fins de ligne et du formatage environnant du fichier.

Utilisez-le lorsque la chose que vous souhaitez possède une adresse logique, mais que la forme physique du
fichier varie :

- Un hook souhaite lire un paramètre dans du JSONC commenté sans perdre les commentaires
  lorsqu'il réécrit la valeur.
- Un script de maintenance veut trouver chaque champ d'événement correspondant dans un journal JSONL
  sans charger le journal entier dans un analyseur personnalisé.
- Une extension d'éditeur veut accéder à une section markdown ou à un élément de liste à puces par
  slug, puis afficher la ligne exacte qu'elle a résolue.
- Un agent veut effectuer un essai à blanc d'une petite modification de l'espace de travail avant de l'appliquer, avec les
  octets modifiés visibles lors de la révision.

Vous n'avez probablement pas besoin de `openclaw path` pour les modifications ordinaires de fichiers entiers, les migrations de configuration complexes ou les écritures spécifiques à la mémoire. Ceux-ci doivent utiliser la commande propriétaire ou le plugin. `path` est destiné aux petites opérations sur des fichiers adressables où une commande terminal répétable est plus claire qu'un autre analyseur sur mesure.

## Comment il est utilisé

Lire une valeur dans un fichier de configuration modifié par l'homme :

```bash
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled'
```

Prévisualiser une écriture sans toucher au disque :

```bash
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

Trouver les enregistrements correspondants dans un journal JSONL en ajout seul :

```bash
openclaw path find 'oc://session.jsonl/[event=tool_call]/name'
```

Addresser une instruction dans le markdown par section et par élément au lieu de par numéro
de ligne :

```bash
openclaw path resolve 'oc://AGENTS.md/runtime-safety/openclaw-gateway'
```

Valider un chemin dans l'CI ou un script préliminaire avant que le script ne lise ou n'écrive :

```bash
openclaw path validate 'oc://AGENTS.md/tools/$last/risk'
```

Ces commandes sont destinées à être copiées dans des scripts shell. Utilisez `--json` lorsqu'un appelant a besoin d'une sortie structurée et `--human` lorsqu'une personne inspecte le résultat.

## Comment cela fonctionne

`openclaw path` fait quatre choses :

1. Analyse l'adresse `oc://` en emplacements : fichier, section, élément, champ et session facultative.
2. Choisit l'adaptateur de type de fichier à partir de l'extension cible (`.md`, `.jsonc`, `.jsonl`, `.yaml`, `.yml`, `.lobster` et les alias associés).
3. Résout les emplacements par rapport à l'AST de ce type de fichier : titres/éléments markdown, clés d'objet/indices de tableau JSONC, enregistrements de ligne JSONL ou nœuds de carte/séquence YAML.
4. Pour `set`, émet les octets modifiés via le même adaptateur afin que les parties inchangées du fichier conservent leurs commentaires, leurs fins de ligne et leur formatage environnant lorsque le type le prend en charge.

`resolve` et `set` nécessitent une cible concrète. `find` est le verbe d'exploration : il développe les caractères génériques, les unions, les prédicats et les ordinaux dans les correspondances concrètes que vous pouvez inspecter avant d'en choisir une à écrire.

## Sous-commandes

| Sous-commande           | Objectif                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `resolve <oc-path>`     | Afficher la correspondance concrète au chemin (ou "non trouvé").                                      |
| `find <pattern>`        | Énumérer les correspondances pour un chemin générique / union / prédicat.                             |
| `set <oc-path> <value>` | Écrit une feuille ou une cible d'insertion à un chemin concret. Prend en charge `--dry-run`.          |
| `validate <oc-path>`    | Analyse uniquement ; afficher la décomposition structurelle (fichier / section / élément / champ).    |
| `emit <file>`           | Effectue un aller-retour d'un fichier via `parseXxx` + `emitXxx` (diagnostic de fidélité des octets). |

## Drapeaux globaux

| Drapeau         | Objectif                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------- |
| `--cwd <dir>`   | Résout l'emplacement du fichier par rapport à ce répertoire (par défaut : `process.cwd()`). |
| `--file <path>` | Remplacer le chemin résolu de l'emplacement du fichier (accès absolu).                      |
| `--json`        | Forcer la sortie JSON (par défaut lorsque stdout n'est pas un TTY).                         |
| `--human`       | Forcer la sortie humaine (par défaut lorsque stdout est un TTY).                            |
| `--dry-run`     | (uniquement sur `set`) affiche les octets qui seraient écrits sans écrire.                  |
| `--diff`        | (avec `set --dry-run`) affiche un diff unifié au lieu des octets complets.                  |

## syntaxe `oc://`

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

Règles d'emplacement : `field` nécessite `item`, et `item` nécessite `section`. Pour les quatre
emplacements :

- **Segments entre guillemets** — `"a/b.c"` survit aux séparateurs `/` et `.`.
  Le contenu est littéral en octets ; `"` et `\` ne sont pas autorisés à l'intérieur des guillemets.
  L'emplacement du fichier est également conscient des guillemets : `oc://"skills/email-drafter"/Tools/$last`
  traite `skills/email-drafter` comme un seul chemin de fichier.
- **Prédicats** — `[k=v]`, `[k!=v]`, `[k<v]`, `[k<=v]`, `[k>v]`,
  `[k>=v]`. Les opérations numériques nécessitent que les deux côtés soient convertis en nombres finis.
- **Unions** — `{a,b,c}` correspond à l'une des alternatives.
- **Caractères génériques** — `*` (sous-segment unique) et `**` (zéro ou plus,
  récursif). `find` les accepte ; `resolve` et `set` les rejettent car
  ambigus.
- **Positionnel** — `$first` / `$last` résolvent vers le premier / dernier index ou
  la clé déclarée.
- **Ordinal** — `#N` pour la Nième correspondance par ordre de document.
- **Marqueurs d'insertion** — `+`, `+key`, `+nnn` pour l'insertion par clé / indexée
  (à utiliser avec `set`).
- **Portée de session** — `?session=cron-daily`, etc. Orthogonal à l'imbrication
  des emplacements. Les valeurs de session sont brutes, non décodées en pourcentage ; elles ne doivent pas contenir
  de caractères de contrôle ni de délimiteurs de requête réservés (`?`, `&`, `%`).

Les caractères réservés (`?`, `&`, `%`) hors des segments entre guillemets, prédicats ou d'union
sont rejetés. Les caractères de contrôle (U+0000-U+001F, U+007F) sont rejetés
partout, y compris dans la valeur de requête `session`.

`formatOcPath(parseOcPath(path)) === path` est garanti pour les chemins canoniques.
Les paramètres de requête non canoniques sont ignorés, à l'exception de la première valeur non vide
`session=`.

## Addressing by file kind

| Kind              | Modèle d'adressage                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Markdown          | Sections H2 par slug, éléments à puces par slug ou `#N`, frontmatter via `[frontmatter]`.                                    |
| JSONC/JSON        | Clés d'objet et index de tableau ; les points séparent les sous-segments imbriqués sauf entre guillemets.                    |
| JSONL             | Adresses de ligne de premier niveau (`L1`, `L2`, `$first`, `$last`), puis descente de style JSONC à l'intérieur de la ligne. |
| YAML/YML/.lobster | Clés de map et index de séquence ; les commentaires et le style flow sont gérés par l'API de document YAML.                  |

`resolve` renvoie une correspondance structurée : `root`, `node`, `leaf` ou
`insertion-point`, avec un numéro de ligne commençant à 1. Les valeurs feuille sont présentées sous forme de texte
ainsi qu'un `leafType` afin que les auteurs de plugins puissent afficher des aperçus sans dépendre de
la forme AST spécifique à chaque type.

## Contrat de mutation

`set` écrit une cible concrète :

- Les valeurs de frontmatter Markdown et les champs d'élément `- key: value` sont des feuilles de chaîne.
  Les insertions Markdown ajoutent des sections, des clés de frontmatter ou des éléments de section
  et rendent une forme Markdown canonique pour le fichier modifié.
- Les écritures de feuilles JSONC forcent la valeur de chaîne vers le type de feuille existant
  (`string`, `number` fini, `true`/`false`, ou `null`). Les insertions d'objets et de tableaux JSONC analysent `<value>` en tant que JSON et utilisent le chemin d'édition `jsonc-parser` pour
  les écritures de feuilles ordinaires, en préservant les commentaires et le formatage environnant.
- Les écritures de feuilles JSONL forcent comme JSONC à l'intérieur d'une ligne. Le remplacement de ligne entière et
  l'ajout analysent `<value>` en tant que JSON. Le JSONL rendu préserve la convention dominante
  de fin de ligne LF/CRLF du fichier.
- Les écritures de feuilles YAML forcent vers le type scalaire existant (`string`, `number` fini,
  `true`/`false`, ou `null`). Les insertions YAML utilisent l'API de document du package `yaml` inclus pour les mises à jour de cartes/séquences. Les documents YAML malformés
  avec des erreurs d'analyse sont refusés avant mutation avec `parse-error`.

Utilisez `--dry-run` avant les écritures visibles par l'utilisateur lorsque les octets exacts importent. Le
substrat préserve une sortie identique en octets pour les allers-retours d'analyse/émission, mais une
mutation peut canoniser la région ou le fichier édité selon le type.
Ajoutez `--diff` lorsque vous voulez l'aperçu sous forme de patch avant/après ciblé au lieu
du fichier rendu complet.

## Exemples

```bash
# Validate a path (no filesystem access)
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk'

# Read a leaf
openclaw path resolve 'oc://gateway.jsonc/version'

# Wildcard search
openclaw path find 'oc://session.jsonl/*/event' --file ./logs/session.jsonl

# Dry-run a write
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run

# Dry-run a write as a unified diff
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff

# Apply the write
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# Byte-fidelity round-trip (diagnostic)
openclaw path emit ./AGENTS.md
```

Plus d'exemples de grammaire :

```bash
# Quote keys containing / or .
openclaw path resolve 'oc://config.jsonc/agents.defaults.models/"anthropic/claude-opus-4-7"/alias'

# Predicate search over JSONC children
openclaw path find 'oc://config.jsonc/plugins/[enabled=true]/id'

# Insert into a JSONC array
openclaw path set 'oc://config.jsonc/items/+1' '{"id":"new","enabled":true}' --dry-run

# Insert a JSONC object key
openclaw path set 'oc://config.jsonc/plugins/+github' '{"enabled":true}' --dry-run

# Append a JSONL event
openclaw path set 'oc://session.jsonl/+' '{"event":"checkpoint","ok":true}' --file ./logs/session.jsonl

# Resolve the last JSONL value line
openclaw path resolve 'oc://session.jsonl/$last/event' --file ./logs/session.jsonl

# Resolve a YAML workflow step
openclaw path resolve 'oc://workflow.yaml/steps/0/id'

# Update a YAML scalar
openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --dry-run

# Address markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# Insert markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# Find markdown item fields
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# Validate a session-scoped path
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## Recettes par type de fichier

Les mêmes cinq verbes fonctionnent pour tous les types ; le schéma d'adressage répartit selon
l'extension de fichier. Les exemples ci-dessous utilisent les fixtures de la description du PR.

### Markdown

```text
<!-- frontmatter.md -->
---
name: drafter
description: email drafting agent
tier: core
---
## Tools
- gh: GitHub CLI
- curl: HTTP client
- send_email: enabled
```

```bash
$ openclaw path resolve 'oc://x.md/[frontmatter]/tier' --file frontmatter.md --human
leaf @ L4: "core" (string)

$ openclaw path resolve 'oc://x.md/tools/gh/gh' --file frontmatter.md --human
leaf @ L9: "GitHub CLI" (string)

$ openclaw path find 'oc://x.md/tools/*' --file frontmatter.md --human
3 matches for oc://x.md/tools/*:
  oc://x.md/tools/gh           →  node @ L9 [md-item]
  oc://x.md/tools/curl         →  node @ L10 [md-item]
  oc://x.md/tools/send-email   →  node @ L11 [md-item]
```

Le prédicat `[frontmatter]` adresse le bloc de frontmatter YAML ; `tools`
correspond à l'en-tête `## Tools` via le slug, et les feuilles d'élément gardent leur forme de slug
même lorsque la source utilise des traits de soulignement (`send_email` → `send-email`).

### JSONC

```text
// config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": false, "role": "chat"}
  }
}
```

```bash
$ openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --file config.jsonc --human
leaf @ L4: "true" (boolean)

$ openclaw path set 'oc://config.jsonc/plugins/slack/enabled' 'true' --file config.jsonc --dry-run
--dry-run: would write 142 bytes to /…/config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": true, "role": "chat"}
  }
}
```

Les modifications JSONC passent par `jsonc-parser`, de sorte que les commentaires et les espaces blancs survivent à un `set`. Exécutez d'abord avec `--dry-run` pour inspecter les octets avant de valider.

### JSONL

```text
{"event":"start","userId":"u1","ts":1}
{"event":"action","userId":"u1","ts":2}
{"event":"end","userId":"u1","ts":3}
```

```bash
$ openclaw path find 'oc://session.jsonl/[event=action]/userId' --file session.jsonl --human
1 match for oc://session.jsonl/[event=action]/userId:
  oc://session.jsonl/L2/userId  →  leaf @ L2: "u1" (string)

$ openclaw path resolve 'oc://session.jsonl/L2/ts' --file session.jsonl --human
leaf @ L2: "2" (number)
```

Chaque ligne est un enregistrement. Adressez par prédicat (`[event=action]`) lorsque vous ne connaissez pas le numéro de ligne, ou par le segment canonique `LN` lorsque vous le connaissez.

### YAML

```text
# workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify
    command: openclaw.invoke
```

```bash
$ openclaw path resolve 'oc://workflow.yaml/steps/0/id' --file workflow.yaml --human
leaf @ L3: "fetch" (string)

$ openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --file workflow.yaml --dry-run
--dry-run: would write 99 bytes to /…/workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify-renamed
    command: openclaw.invoke
```

YAML utilise l'API `Document` du paquet `yaml` plutôt qu'un analyseur fait sur mesure, de sorte que les allers-retours d'analyse/d'émission ordinaires préservent les commentaires et la forme de rédaction tandis que les chemins résolus utilisent le même modèle de clé de carte / d'index de séquence que JSONC. Le même adaptateur gère les fichiers `.yaml`, `.yml` et `.lobster`.

## Référence des sous-commandes

### `resolve <oc-path>`

Lit une feuille ou un nœud unique. Les caractères génériques sont rejetés — utilisez `find` pour ceux-ci. Sort `0` en cas de correspondance, `1` en cas d'absence nette, `2` en cas d'erreur d'analyse ou de motif refusé.

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

Énumère chaque correspondance pour un motif de caractère générique / prédicat / union. Sort `0` s'il y a au moins une correspondance, `1` s'il y en a zéro. Les caractères génériques d'emplacement de fichier sont rejetés avec `OC_PATH_FILE_WILDCARD_UNSUPPORTED` — passez un fichier concret (le globbing multi-fichiers est une fonctionnalité future).

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

Écrit une feuille. Associez avec `--dry-run` pour prévisualiser les octets qui seraient écrits sans toucher au fichier. Ajoutez `--diff` pour une prévisualisation diff unifiée. Sort `0` en cas d'écriture réussie, `1` si le substrat refuse (par exemple, une collision de garde sentinelle), `2` en cas d'erreurs d'analyse.

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

Le marqueur d'insertion `+key` crée l'enfant nommé s'il n'existe pas déjà ; `+nnn` et le `+` nu fonctionnent respectivement pour l'insertion indexée et l'ajout.

### `validate <oc-path>`

Vérification d'analyse uniquement. Aucun accès au système de fichiers. Utile lorsque vous souhaitez confirmer qu'un chemin modèle est bien formé avant de substituer des variables, ou lorsque vous souhaitez la décomposition structurelle pour le débogage :

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

Quitte avec `0` si valide, `1` si invalide (avec un `code` structuré et
`message`), `2` en cas d'erreur d'argument.

### `emit <file>`

Effectue un aller-retour d'un fichier via l'analyseur et l'émetteur propres à chaque type. La sortie doit être identique octet par octet à l'entrée pour un fichier sain — toute divergence indique un bogue de l'analyseur ou la rencontre d'une sentinelle. Utile pour déboguer le comportement du substrat sur des entrées réelles.

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## Codes de sortie

| Code | Signification                                                                            |
| ---- | ---------------------------------------------------------------------------------------- |
| `0`  | Succès. (`resolve` / `find` : au moins une correspondance. `set` : écriture réussie.)    |
| `1`  | Aucune correspondance, ou `set` rejeté par le substrat (pas d'erreur au niveau système). |
| `2`  | Erreur d'argument ou d'analyse.                                                          |

## Mode de sortie

`openclaw path` est conscient du TTY : sortie lisible par l'humain sur un terminal, JSON lorsque stdout est redirigé par un tuyau ou une redirection. `--json` et `--human` forcent la détection automatique.

## Notes

- `set` écrit des octets via le chemin d'émission du substrat, qui applique automatiquement la garde de sentinelle de rédaction. Une feuille contenant `__OPENCLAW_REDACTED__` (mot pour mot ou en tant que sous-chaîne) est refusée au moment de l'écriture.
- L'analyse JSONC et les modifications de feuilles utilisent la dépendance locale `jsonc-parser` du plugin, de sorte que les commentaires et le formatage sont préservés lors des écritures de feuilles ordinaires au lieu de passer par un chemin d'analyse/re-rendu fait maison.
- `path` ne connaît pas le LKG. Si le fichier est suivi par le LKG, le prochain appel observe décide de promouvoir ou de récupérer. `set --batch` pour un multi-ensemble atomique à travers le cycle de vie de promotion/récupération LKG est prévu parallèlement au substrat de récupération LKG.

## Connexes

- [Référence CLI](/fr/cli)
