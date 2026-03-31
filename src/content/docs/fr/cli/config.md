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

## Exemples

```bash
openclaw config file
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

Imprime le schéma JSON généré pour `openclaw.json` vers stdout en texte brut.

```bash
openclaw config schema
```

Redirigez-le vers un fichier lorsque vous souhaitez l'inspecter ou le valider avec d'autres outils :

```bash
openclaw config schema > openclaw.schema.json
```

### Chemins d'accès

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

Les valeurs sont analysées en JSON5 si possible ; sinon, elles sont traitées comme des chaînes de caractères.
Utilisez `--strict-json` pour exiger l'analyse JSON5. `--json` reste pris en charge comme un alias hérité.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

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

3. Mode constructeur de fournisseur (chemin `secrets.providers.<alias>` uniquement) :

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

L'analyse par lot utilise toujours la charge utile du lot (`--batch-json`/`--batch-file`) comme source de vérité.
`--strict-json` / `--json` ne modifient pas le comportement de l'analyse par lot.

Le mode de chemin/valeur JSON reste pris en charge pour les SecretRefs et les fournisseurs :

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Indicateurs du constructeur de fournisseur

Les cibles du constructeur de fournisseur doivent utiliser `secrets.providers.<alias>` comme chemin.

Indicateurs courants :

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Env provider (`--provider-source env`) :

- `--provider-allowlist <ENV_VAR>` (répétable)

Fournisseur de fichier (`--provider-source file`) :

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

Exemple de provider d'exécution renforcé :

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

## Essai à blanc

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

Comportement de l'essai à blanc :

- Mode Builder : exécute les contrôles de résolvabilité SecretRef pour les références/providers modifiés.
- Mode JSON (`--strict-json`, `--json`, ou mode batch) : exécute la validation du schéma ainsi que les contrôles de résolvabilité SecretRef.
- Les vérifications Exec SecretRef sont ignorées par défaut lors du dry-run pour éviter les effets secondaires de la commande.
- Utilisez `--allow-exec` avec `--dry-run` pour activer les vérifications exec SecretRef (cela peut exécuter des commandes provider).
- `--allow-exec` est réservé au dry-run et génère une erreur s'il est utilisé sans `--dry-run`.

`--dry-run --json` imprime un rapport lisible par la machine :

- `ok`: indique si le dry-run a réussi
- `operations`: nombre d'assignations évaluées
- `checks`: indique si les vérifications de schéma/de résolubilité ont été exécutées
- `checks.resolvabilityComplete`: indique si les vérifications de résolubilité ont été exécutées jusqu'au bout (false lorsque les exec refs sont ignorés)
- `refsChecked`: nombre de refs réellement résolues pendant le dry-run
- `skippedExecRefs` : nombre de références d'exécution ignorées car `--allow-exec` n'était pas défini
- `errors` : échecs structurés de schéma/de résolvabilité lors du `ok=false`

### Structure de sortie JSON

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

Exemple de succès :

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

Si le dry-run échoue :

- `config schema validation failed` : la structure de votre config après modification est invalide ; corrigez le chemin/la valeur ou la forme de l'objet provider/référence.
- `SecretRef assignment(s) could not be resolved` : le provider/référencé ne peut pas actuellement être résolu (env var manquante, pointeur de fichier invalide, échec du provider d'exécution ou inadéquation provider/source).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)` : dry-run a ignoré les références exec ; relancez avec `--allow-exec` si vous avez besoin d'une validation de la résolution exec.
- Pour le mode batch, corrigez les entrées défaillantes et relancez `--dry-run` avant d'écrire.

## Sous-commandes

- `config file` : Affiche le chemin du fichier de configuration actif (résolu à partir de `OPENCLAW_CONFIG_PATH` ou de l'emplacement par défaut).

Redémarrez la passerelle après les modifications.

## Valider

Valider la configuration actuelle par rapport au schéma actif sans démarrer la passerelle.

```bash
openclaw config validate
openclaw config validate --json
```
