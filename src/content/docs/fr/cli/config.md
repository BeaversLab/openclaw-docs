---
summary: "Référence CLI pour `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Helpers de configuration pour les modifications non interactives dans `openclaw.json` : get/set/unset/file/schema/validate
valeurs par chemin et imprimer le fichier de configuration actif. Exécuter sans sous-commande pour
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
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Imprimer le schéma JSON généré pour `openclaw.json` vers stdout au format JSON.

Ce qu'il inclut :

- Le schéma de configuration racine actuel, plus un champ de chaîne racine `$schema` pour les outils de l'éditeur
- Métadonnées de documentation du champ `title` et `description` utilisées par l'interface utilisateur de contrôle
- Les nœuds d'objet imbriqué, de caractère générique (`*`) et d'élément de tableau (`[]`) héritent des mêmes métadonnées `title` / `description` lorsque la documentation du champ correspondante existe
- Les branches `anyOf` / `oneOf` / `allOf` héritent également des mêmes métadonnées de documentation lorsque la documentation du champ correspondante existe
- Métadonnées de schéma de plugin dynamique et de canal au mieux lorsque les manifestes d'exécution peuvent être chargés
- Un schéma de repli propre même lorsque la configuration actuelle n'est pas valide

RPC d'exécution associé :

- `config.schema.lookup` renvoie un chemin de configuration normalisé avec un nœud de
  schéma superficiel (`title`, `description`, `type`, `enum`, `const`, limites communes),
  les métadonnées correspondantes d'indices de l'interface utilisateur et les résumés des enfants immédiats. Utilisez-le pour
  une exploration ciblée par chemin dans l'interface utilisateur de contrôle ou les clients personnalisés.

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

Les valeurs sont analysées en tant que JSON5 lorsque cela est possible ; sinon, elles sont traitées comme des chaînes de caractères. Utilisez `--strict-json` pour forcer l'analyse JSON5. `--json` reste pris en charge en tant qu'alias hérité.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` affiche la valeur brute en JSON au lieu du texte formaté pour le terminal.

L'assignation d'objet remplace le chemin cible par défaut. Les chemins de carte/liste protégés qui contiennent généralement des entrées ajoutées par l'utilisateur, telles que `agents.defaults.models`, `models.providers`, `models.providers.<id>.models`, `plugins.entries` et `auth.profiles`, refusent les remplacements qui supprimeraient les entrées existantes à moins que vous ne passiez `--replace`.

Utilisez `--merge` lors de l'ajout d'entrées à ces cartes :

```bash
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

Utilisez `--replace` uniquement lorsque vous souhaitez intentionnellement que la valeur fournie devienne la valeur cible complète.

## Modes `config set`

`openclaw config set` prend en charge quatre styles d'assignation :

1. Mode valeur : `openclaw config set <path> <value>`
2. Mode de générateur SecretRef :

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Mode de générateur de fournisseur (chemin `secrets.providers.<alias>` uniquement) :

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

Remarque sur la stratégie :

- Les assignations SecretRef sont rejetées sur les surfaces mutables au runtime non prises en charge (par exemple `hooks.token`, `commands.ownerDisplaySecret`, les jetons de webhook liés aux fils Discord et les identifiants JSON WhatsApp). Voir [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).

L'analyse batch utilise toujours la charge utile batch (`--batch-json`/`--batch-file`) comme source de vérité. `--strict-json` / `--json` ne modifient pas le comportement de l'analyse batch.

Le mode chemin/valeur JSON reste pris en charge pour les SecretRefs et les fournisseurs :

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Drapeaux du générateur de fournisseur

Les cibles du générateur de fournisseur doivent utiliser `secrets.providers.<alias>` comme chemin.

Drapeaux communs :

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Fournisseur Env (`--provider-source env`) :

- `--provider-allowlist <ENV_VAR>` (répétable)

Fournisseur de fichier (`--provider-source file`) :

- `--provider-path <path>` (requis)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Fournisseur Exec (`--provider-source exec`) :

- `--provider-command <path>` (requis)
- `--provider-arg <arg>` (répétitable)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (répétitable)
- `--provider-pass-env <ENV_VAR>` (répétitable)
- `--provider-trusted-dir <path>` (répétitable)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

Exemple de fournisseur Exec renforcé :

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

- Mode Builder : exécute les vérifications de résolvabilité SecretRef pour les refs/fournisseurs modifiés.
- Mode JSON (`--strict-json`, `--json` ou mode batch) : exécute la validation du schéma ainsi que les vérifications de résolvabilité SecretRef.
- La validation de stratégie s'exécute également pour les surfaces cibles SecretRef connues comme non prises en charge.
- Les vérifications de stratégie évaluent la configuration complète après modification, les écritures d'objets parents (par exemple, définir `hooks` comme un objet) ne peuvent donc pas contourner la validation des surfaces non prises en charge.
- Les vérifications Exec SecretRef sont ignorées par défaut lors de l'essai à blanc pour éviter les effets secondaires des commandes.
- Utilisez `--allow-exec` avec `--dry-run` pour activer les vérifications Exec SecretRef (cela peut exécuter des commandes de fournisseur).
- `--allow-exec` est réservé à l'essai à blanc et génère une erreur s'il est utilisé sans `--dry-run`.

`--dry-run --json` imprime un rapport lisible par la machine :

- `ok` : indique si l'essai à blanc a réussi
- `operations` : nombre d'assignations évaluées
- `checks` : indique si les vérifications de schéma/résolvabilité ont été exécutées
- `checks.resolvabilityComplete` : indique si les vérifications de résolvabilité ont été exécutées jusqu'au bout (faux lorsque les exec refs sont ignorées)
- `refsChecked` : nombre de refs réellement résolues lors de l'essai à blanc
- `skippedExecRefs` : nombre de refs exec ignorées car `--allow-exec` n'était pas défini
- `errors` : échecs structurés de schéma/résolubilité lorsque `ok=false`

### Structure de la sortie JSON

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

- `config schema validation failed` : la structure de votre config après modification est invalide ; corrigez le chemin/valeur ou la forme de l'objet provider/ref.
- `Config policy validation failed: unsupported SecretRef usage` : remettez cette information d'identification en entrée en texte/clé et conservez les SecretRefs uniquement sur les surfaces prises en charge.
- `SecretRef assignment(s) could not be resolved` : le provider/ref référencé ne peut pas actuellement être résolu (env var manquante, pointeur de fichier invalide, échec du provider exec, ou inadéquation provider/source).
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)` : le dry-run a ignoré les refs exec ; relancez avec `--allow-exec` si vous avez besoin de la validation de la résolubilité exec.
- Pour le mode batch, corrigez les entrées défaillantes et relancez `--dry-run` avant d'écrire.

## Sécurité d'écriture

`openclaw config set` et autres rédacteurs de config détenus par OpenClaw valident la config complète après modification avant de la valider sur le disque. Si le nouveau payload échoue à la validation du schéma ou ressemble à un écrasement destructif, la config active est laissée telle quelle et le payload rejeté est sauvegardé à côté sous le nom `openclaw.json.rejected.*`.
Le chemin de la config active doit être un fichier régulier. Les dispositions `openclaw.json` liées par lien symbolique ne sont pas prises en charge pour l'écriture ; utilisez `OPENCLAW_CONFIG_PATH` pour pointer directement vers le vrai fichier à la place.

Privilégiez les écritures via la CLI pour les petites modifications :

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

Si une écriture est rejetée, inspectez le payload sauvegardé et corrigez la structure complète de la config :

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

Les écritures directes par l'éditeur sont toujours autorisées, mais le Gateway en cours d'exécution les considère comme non fiables tant qu'elles ne sont pas validées. Les modifications directes invalides peuvent être restaurées à partir de la dernière sauvegarde connue bonne lors du démarrage ou du rechargement à chaud. Voir
[dépannage Gateway](/fr/gateway/troubleshooting#gateway-restored-last-known-good-config).

## Sous-commandes

- `config file` : Afficher le chemin du fichier de config actif (résolu à partir de `OPENCLAW_CONFIG_PATH` ou de l'emplacement par défaut). Le chemin doit désigner un fichier régulier, et non un lien symbolique.

Redémarrez la passerelle après les modifications.

## Validate

Valide la config actuelle par rapport au schéma actif sans démarrer la passerelle.

```bash
openclaw config validate
openclaw config validate --json
```

Une fois que `openclaw config validate` réussit, vous pouvez utiliser le TUI local pour qu'un agent intégré compare la configuration active à la documentation pendant que vous validez chaque modification depuis le même terminal :

Si la validation échoue déjà, commencez par `openclaw configure` ou `openclaw doctor --fix`. `openclaw chat` contourne pas la garde de configuration invalide.

```bash
openclaw chat
```

Ensuite à l'intérieur du TUI :

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

Boucle de réparation typique :

- Demandez à l'agent de comparer votre configuration actuelle avec la page de documentation pertinente et de suggérer la plus petite correction.
- Appliquez des modifications ciblées avec `openclaw config set` ou `openclaw configure`.
- Réexécutez `openclaw config validate` après chaque modification.
- Si la validation réussit mais que l'exécution est encore défaillante, exécutez `openclaw doctor` ou `openclaw doctor --fix` pour de l'aide à la migration et à la réparation.
