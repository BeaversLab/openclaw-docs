---
summary: "Référence CLI pour `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Assistants de configuration pour les modifications non interactives dans `openclaw.json` : get/set/unset/file/schema/validate
les valeurs par chemin et imprime le fichier de configuration actif. Exécuter sans sous-commande pour
ouvrir l'assistant de configuration (identique à `openclaw configure`).

Options racine :

- `--section <section>` : filtre de section de configuration guidée répétable lorsque vous exécutez `openclaw config` sans sous-commande

Sections guidées prises en charge :

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

## Exemples

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Imprime le schéma JSON généré pour `openclaw.json` vers stdout au format JSON.

Ce qu'il inclut :

- Le schéma de configuration racine actuel, plus un champ de chaîne racine `$schema` pour les outils de l'éditeur
- Métadonnées de documentation de champ `title` et `description` utilisées par l'interface utilisateur de contrôle
- Les nœuds d'objet imbriqué, de caractère générique (`*`) et d'élément de tableau (`[]`) héritent des mêmes métadonnées `title` / `description` lorsque la documentation de champ correspondante existe
- Les branches `anyOf` / `oneOf` / `allOf` héritent également des mêmes métadonnées de documentation lorsque la documentation de champ correspondante existe
- Métadonnées de schéma de plugin dynamique et de canal au mieux lorsque les manifestes d'exécution peuvent être chargés
- Un schéma de repli propre même lorsque la configuration actuelle n'est pas valide

RPC d'exécution associé :

- `config.schema.lookup` renvoie un chemin de configuration normalisé avec un nœud de
  schéma superficiel (`title`, `description`, `type`, `enum`, `const`, limites communes),
  les métadonnées d'indication d'interface correspondantes et les résumés des enfants immédiats. Utilisez-le
  pour un forage basé sur le chemin dans l'interface utilisateur de contrôle ou les clients personnalisés.

```bash
openclaw config schema
```

Redirigez-le vers un fichier lorsque vous souhaitez l'inspecter ou le valider avec d'autres outils :

```bash
openclaw config schema > openclaw.schema.json
```

### Chemins

Les chemins utilisent la notation par point ou par crochets :

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

Les valeurs sont analysées en tant que JSON5 si possible ; sinon, elles sont traitées comme des chaînes de caractères.
Utilisez `--strict-json` pour exiger l'analyse JSON5. `--json` reste pris en charge en tant qu'alias hérité.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` affiche la valeur brute au format JSON au lieu d'un texte formaté pour le terminal.

## Modes `config set`

`openclaw config set` prend en charge quatre styles d'assignation :

1. Mode valeur : `openclaw config set <path> <value>`
2. Mode constructeur SecretRef :

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Mode constructeur provider (chemin `secrets.providers.<alias>` uniquement) :

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. Mode batch (`--batch-json` ou `--batch-file`) :

```bash
openclaw config set --batch-json '[
  {
    "path": "secrets.providers.default",
    "provider": { "source": "env" }
  },
  {
    "path": "channels.discord.token",
    "ref": { "source": "env", "provider": "default", "id": "DISCORD_BOT_TOKEN" }
  }
]'
```

```bash
openclaw config set --batch-file ./config-set.batch.json --dry-run
```

Remarque concernant la stratégie :

- Les assignations SecretRef sont rejetées sur les surfaces mutables au runtime non prises en charge (par exemple `hooks.token`, `commands.ownerDisplaySecret`, les jetons de webhook de liaison de thread Discord et les identifiants JSON WhatsApp). Voir [SecretRef Credential Surface](/en/reference/secretref-credential-surface).

L'analyse batch utilise toujours la charge utile batch (`--batch-json`/`--batch-file`) comme source de vérité.
`--strict-json` / `--json` ne modifient pas le comportement de l'analyse batch.

Le mode chemin/valeur JSON reste pris en charge pour les SecretRefs et les providers :

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Options du constructeur de provider

Les cibles du constructeur de provider doivent utiliser `secrets.providers.<alias>` comme chemin.

Options communes :

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Provider Env (`--provider-source env`) :

- `--provider-allowlist <ENV_VAR>` (répétable)

Provider File (`--provider-source file`) :

- `--provider-path <path>` (requis)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Provider Exec (`--provider-source exec`) :

- `--provider-command <path>` (requis)
- `--provider-arg <arg>` (répétable)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (répétable)
- `--provider-pass-env <ENV_VAR>` (répétable)
- `--provider-trusted-dir <path>` (répétable)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

Exemple de provider d'exécution sécurisé :

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-json-only \
  --provider-pass-env VAULT_TOKEN \
  --provider-trusted-dir /usr/local/bin \
  --provider-timeout-ms 5000
```

## Dry run

Utilisez `--dry-run` pour valider les modifications sans écrire `openclaw.json`.

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run

openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run \
  --json

openclaw config set channels.discord.token \
  --ref-provider vault \
  --ref-source exec \
  --ref-id discord/token \
  --dry-run \
  --allow-exec
```

Comportement du dry run :

- Mode Builder : exécute les vérifications de résolvabilité SecretRef pour les refs/providers modifiés.
- Mode JSON (`--strict-json`, `--json`, ou mode batch) : exécute la validation du schéma ainsi que les vérifications de résolvabilité SecretRef.
- La validation de stratégie s'exécute également pour les surfaces cibles SecretRef connues comme non prises en charge.
- Les vérifications de stratégie évaluent la configuration complète après modification, de sorte que les écritures d'objets parents (par exemple, définir `hooks` comme un objet) ne peuvent pas contourner la validation des surfaces non prises en charge.
- Les vérifications Exec SecretRef sont ignorées par défaut lors du dry run pour éviter les effets secondaires des commandes.
- Utilisez `--allow-exec` avec `--dry-run` pour activer les vérifications Exec SecretRef (cela peut exécuter des commandes de provider).
- `--allow-exec` est réservé au dry run et génère une erreur s'il est utilisé sans `--dry-run`.

`--dry-run --json` imprime un rapport lisible par la machine :

- `ok` : indique si le dry run a réussi
- `operations` : nombre d'assignations évaluées
- `checks` : indique si les vérifications de schéma/résolvabilité ont été exécutées
- `checks.resolvabilityComplete` : indique si les vérifications de résolvabilité ont été exécutées jusqu'au bout (faux lorsque les exec refs sont ignorées)
- `refsChecked` : nombre de refs réellement résolues pendant le dry run
- `skippedExecRefs` : nombre d'exec refs ignorées car `--allow-exec` n'était pas défini
- `errors` : échecs structurés de schéma/résolvabilité lorsque `ok=false`

### JSON Output Shape

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "schema" | "resolvability",
      message: string,
      ref?: string, // present for resolvability errors
    },
  ],
}
```

Exemple de réussite :

```json
{
  "ok": true,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0
}
```

Exemple d'échec :

```json
{
  "ok": false,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0,
  "errors": [
    {
      "kind": "resolvability",
      "message": "Error: Environment variable \"MISSING_TEST_SECRET\" is not set.",
      "ref": "env:default:MISSING_TEST_SECRET"
    }
  ]
}
```

Si le dry run échoue :

- `config schema validation failed` : la forme de votre configuration après modification est invalide ; corrigez le chemin/valeur ou la forme de l'objet provider/ref.
- `Config policy validation failed: unsupported SecretRef usage` : remettez ces identifiants en entrée en texte brut/chaîne et ne gardez les SecretRefs que sur les surfaces prises en charge.
- `SecretRef assignment(s) could not be resolved` : le provider/réf référencé ne peut actuellement pas être résolu (env var manquante, pointeur de fichier invalide, échec du provider d'exécution ou inadéquation provider/source).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)` : le dry-run a ignoré les références d'exécution ; relancez avec `--allow-exec` si vous avez besoin d'une validation de la résolution d'exécution.
- Pour le mode batch, corrigez les entrées défaillantes et relancez `--dry-run` avant l'écriture.

## Sous-commandes

- `config file` : Affiche le chemin du fichier de configuration actif (résolu à partir de `OPENCLAW_CONFIG_PATH` ou de l'emplacement par défaut).

Redémarrez la passerelle après les modifications.

## Valider

Validez la configuration actuelle par rapport au schéma actif sans démarrer la passerelle.

```bash
openclaw config validate
openclaw config validate --json
```
