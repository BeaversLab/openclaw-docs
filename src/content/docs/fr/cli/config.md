---
summary: "Référence CLI pour `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "Config"
sidebarTitle: "Config"
---

Helpers de configuration pour les modifications non interactives dans `openclaw.json` : obtenir/définir/supprimer/fichier/schéma/valider les valeurs par chemin et imprimer le fichier de configuration actif. Exécuter sans sous-commande pour ouvrir l'assistant de configuration (identique à `openclaw configure`).

## Options racine

<ParamField path="--section <section>" type="string">
  Filtre de section d'installation guidée répétable lorsque vous exécutez `openclaw config` sans sous-commande.
</ParamField>

Sections guidées prises en charge : `workspace`, `model`, `web`, `gateway`, `daemon`, `channels`, `plugins`, `skills`, `health`.

## Exemples

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Imprimer le schéma JSON généré pour `openclaw.json` vers stdout en tant que JSON.

<AccordionGroup>
  <Accordion title="Ce qu'il inclut">
    - Le schéma de configuration racine actuel, plus un champ de chaîne racine `$schema` pour les outils de l'éditeur. - Les métadonnées de documentation des champs `title` et `description` utilisées par l'interface utilisateur de contrôle. - Les nœuds d'objet imbriqué, de caractère générique (`*`) et d'élément de tableau (`[]`) héritent des mêmes métadonnées `title` / `description` lorsque la
    documentation de champ correspondante existe. - Les branches `anyOf` / `oneOf` / `allOf` héritent également des mêmes métadonnées de documentation lorsque la documentation de champ correspondante existe. - Métadonnées de schéma de plugin en direct + channel avec les meilleurs efforts lorsque les manifestes d'exécution peuvent être chargés. - Un schéma de repli propre même lorsque la
    configuration actuelle est invalide.
  </Accordion>
  <Accordion title="RPC d'exécution associé">
    `config.schema.lookup` renvoie un chemin de configuration normalisé avec un nœud de schéma superficiel (`title`, `description`, `type`, `enum`, `const`, limites communes), les métadonnées de suggestion d'interface correspondantes et les résumés des enfants immédiats. Utilisez-le pour un forage ciblé sur le chemin dans l'interface utilisateur de Control ou les clients personnalisés.
  </Accordion>
</AccordionGroup>

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

Les valeurs sont analysées en tant que JSON5 lorsque cela est possible ; sinon, elles sont traitées comme des chaînes de caractères. Utilisez `--strict-json` pour exiger l'analyse JSON5. `--json` reste pris en charge en tant qu'alias hérité.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` affiche la valeur brute au format JSON au lieu du texte formaté pour le terminal.

<Note>
L'assignation d'objet remplace le chemin cible par défaut. Les chemins de carte/liste protégés qui contiennent généralement des entrées ajoutées par l'utilisateur, telles que `agents.defaults.models`, `models.providers`, `models.providers.<id>.models`, `plugins.entries` et `auth.profiles`, refusent les remplacements qui supprimeraient les entrées existantes, sauf si vous passez `--replace`.
</Note>

Utilisez `--merge` lors de l'ajout d'entrées à ces cartes :

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

Utilisez `--replace` uniquement lorsque vous souhaitez intentionnellement que la valeur fournie devienne la valeur cible complète.

## modes `config set`

`openclaw config set` prend en charge quatre styles d'assignation :

<Tabs>
  <Tab title="Mode Valeur">
    ```bash
    openclaw config set <path> <value>
    ```
  </Tab>
  <Tab title="Mode constructeur SecretRef">
    ```bash
    openclaw config set channels.discord.token \
      --ref-provider default \
      --ref-source env \
      --ref-id DISCORD_BOT_TOKEN
    ```
  </Tab>
  <Tab title="Mode constructeur de fournisseur">
    Le mode constructeur de fournisseur cible uniquement les chemins `secrets.providers.<alias>` :

    ```bash
    openclaw config set secrets.providers.vault \
      --provider-source exec \
      --provider-command /usr/local/bin/openclaw-vault \
      --provider-arg read \
      --provider-arg openai/api-key \
      --provider-timeout-ms 5000
    ```

  </Tab>
  <Tab title="Mode batch">
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

  </Tab>
</Tabs>

<Warning>Les affectations SecretRef sont rejetées sur les surfaces modifiables à l'exécution non prises en charge (par exemple `hooks.token`, `commands.ownerDisplaySecret`, les jetons de webhook de liaison de thread Discord, et le JSON d'identification WhatsApp). Voir [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).</Warning>

L'analyse en mode batch utilise toujours la charge utile batch (`--batch-json`/`--batch-file`) comme source de vérité. `--strict-json` / `--json` ne changent pas le comportement de l'analyse en mode batch.

Le mode de chemin/valeur JSON reste pris en charge pour les SecretRefs et les providers :

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Indicateurs du builder de provider

Les cibles du builder de provider doivent utiliser `secrets.providers.<alias>` comme chemin.

<AccordionGroup>
  <Accordion title="Indicateurs communs">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)
  </Accordion>
  <Accordion title="Provider Env (--provider-source env)">
    - `--provider-allowlist <ENV_VAR>` (répétable)
  </Accordion>
  <Accordion title="Provider Fichier (--provider-source file)">
    - `--provider-path <path>` (requis)
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`
  </Accordion>
  <Accordion title="Provider Exec (--provider-source exec)">
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
  </Accordion>
</AccordionGroup>

Exemple de provider Exec renforcé :

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

<AccordionGroup>
  <Accordion title="Comportement de dry-run">
    - Mode Builder : exécute les vérifications de résolvabilité SecretRef pour les refs/providers modifiés.
    - Mode JSON (`--strict-json`, `--json`, ou mode batch) : exécute la validation du schéma ainsi que les vérifications de résolvabilité SecretRef.
    - La validation de stratégie s'exécute également pour les surfaces cibles SecretRef connues non prises en charge.
    - Les vérifications de stratégie évaluent la configuration complète après modification, les écritures d'objets parents (par exemple définir `hooks` comme un objet) ne peuvent donc pas contourner la validation des surfaces non prises en charge.
    - Les vérifications SecretRef Exec sont ignorées par défaut lors du dry-run pour éviter les effets secondaires des commandes.
    - Utilisez `--allow-exec` avec `--dry-run` pour activer les vérifications SecretRef Exec (cela peut exécuter des commandes de provider).
    - `--allow-exec` est réservé au dry-run et génère une erreur s'il est utilisé sans `--dry-run`.
  </Accordion>
  <Accordion title="Champs --dry-run --">
    `--dry-run --json` imprime un rapport lisible par machine :

    - `ok` : indique si le dry-run a réussi
    - `operations` : nombre d'affectations évaluées
    - `checks` : indique si les vérifications de schéma/résolvabilité ont été exécutées
    - `checks.resolvabilityComplete` : indique si les vérifications de résolvabilité ont été exécutées jusqu'au bout (false lorsque les refs exec sont ignorées)
    - `refsChecked` : nombre de refs réellement résolues lors du dry-run
    - `skippedExecRefs` : nombre de refs exec ignorées parce que `--allow-exec` n'était pas défini
    - `errors` : échecs structurés de schéma/résolvabilité lorsque `ok=false`

  </Accordion>
</AccordionGroup>

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

<Tabs>
  <Tab title="Exemple de succès">
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
  </Tab>
  <Tab title="Exemple d'échec">
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
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="If dry-run fails">
    - `config schema validation failed` : la forme de votre config après modification est invalide ; corrigez le chemin/valeur ou la forme de l'objet provider/ref.
    - `Config policy validation failed: unsupported SecretRef usage` : remettez cet identifiant en entrée en texte brut/chaîne et gardez les SecretRefs uniquement sur les surfaces prises en charge.
    - `SecretRef assignment(s) could not be resolved` : le provider/ref référencé ne peut pas être résolu pour l'instant (env var manquante, pointeur de fichier invalide, échec du provider d'exécution, ou inadéquation provider/source).
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)` : le dry-run a ignoré les exec refs ; relancez avec `--allow-exec` si vous avez besoin d'une validation de la résolvabilité d'exécution.
    - Pour le mode batch, corrigez les entrées en échec et relancez `--dry-run` avant l'écriture.
  </Accordion>
</AccordionGroup>

## Sécurité d'écriture

`openclaw config set` et autres rédacteurs de config appartenant à OpenClaw valident la configuration complète après modification avant de la valider sur le disque. Si le nouveau payload échoue à la validation du schéma ou ressemble à un écrasement destructeur, la config active est laissée telle quelle et le payload rejeté est enregistré à côté sous `openclaw.json.rejected.*`.

<Warning>Le chemin de la config active doit être un fichier régulier. Les dispositions `openclaw.json` liées par des liens symboliques ne sont pas prises en charge pour l'écriture ; utilisez `OPENCLAW_CONFIG_PATH` pour pointer directement vers le vrai fichier à la place.</Warning>

Privilégiez les écritures via la CLI pour les petites modifications :

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

Si une écriture est rejetée, inspectez le payload enregistré et corrigez la forme complète de la configuration :

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

Les écritures directes par l'éditeur sont toujours autorisées, mais le Gateway en cours d'exécution les considère comme non fiables jusqu'à ce qu'elles soient validées. Les modifications directes non valides peuvent être restaurées à partir de la dernière sauvegarde connue saine lors du démarrage ou du rechargement à chaud. Voir [dépannage Gateway](/fr/gateway/troubleshooting#gateway-restored-last-known-good-config).

La récupération de l'intégralité du fichier est réservée aux configurations globalement endommagées, telles que des erreurs d'analyse, des échecs de schéma au niveau racine, des échecs de migration hérités, ou des échecs mixtes de plugins et de racine. Si la validation échoue uniquement sous `plugins.entries.<id>...`, OpenClaw conserve le `openclaw.json` actuel en place et signale le problème local au lieu de restaurer `.last-good`. Cela empêche les modifications de schéma de plugin ou le décalage `minHostVersion` de revenir sur les paramètres utilisateur non liés tels que les modèles, les fournisseurs, les profils d'authentification, les canaux, l'exposition de la passerelle, les outils, la mémoire, le navigateur ou la configuration cron.

## Sous-commandes

- `config file` : Afficher le chemin du fichier de configuration actuel (résolu à partir de `OPENCLAW_CONFIG_PATH` ou de l'emplacement par défaut). Le chemin doit nommer un fichier régulier, et non un lien symbolique.

Redémarrez la passerelle après les modifications.

## Valider

Validez la configuration actuelle par rapport au schéma actif sans démarrer la passerelle.

```bash
openclaw config validate
openclaw config validate --json
```

Une fois que `openclaw config validate` est réussi, vous pouvez utiliser l'interface TUI locale pour demander à un agent intégré de comparer la configuration active avec la documentation pendant que vous validez chaque modification à partir du même terminal :

<Note>Si la validation échoue déjà, commencez par `openclaw configure` ou `openclaw doctor --fix`. `openclaw chat` ne contourne pas la garde de configuration invalide.</Note>

```bash
openclaw chat
```

Ensuite, à l'intérieur de la TUI :

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

Boucle de réparation typique :

<Steps>
  <Step title="Comparer avec la documentation">Demandez à l'agent de comparer votre configuration actuelle avec la page de documentation pertinente et de suggérer la plus petite correction.</Step>
  <Step title="Appliquer des modifications ciblées">Appliquez des modifications ciblées avec `openclaw config set` ou `openclaw configure`.</Step>
  <Step title="Re-valider">Relancez `openclaw config validate` après chaque modification.</Step>
  <Step title="Doctor pour les problèmes d'exécution">Si la validation réussit mais que l'exécution est toujours défaillante, exécutez `openclaw doctor` ou `openclaw doctor --fix` pour obtenir de l'aide à la migration et à la réparation.</Step>
</Steps>

## Connexe

- [Référence CLI](/fr/cli)
- [Configuration](/fr/gateway/configuration)
