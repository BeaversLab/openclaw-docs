---
summary: "Créer un plugin qui enregistre un backend d'CLI local"
title: "Créer des plugins de backend CLI"
sidebarTitle: "Plugins de backend CLI"
read_when:
  - You are building a local AI CLI backend plugin
  - You want to register a backend for model refs such as acme-cli/model
  - You need to map a third-party CLI into OpenClaw's text fallback runner
---

Les plugins de backend CLI permettent à OpenClaw d'appeler un CLI IA local en tant que backend d'inférence de texte. Le backend apparaît comme un préfixe de provider dans les références de modèle :

```text
acme-cli/acme-large
```

Utilisez un backend CLI lorsque l'intégration en amont est déjà exposée en tant que commande locale, lorsque le CLI gère l'état de connexion locale, ou lorsque le CLI constitue un repli utile si les providers d'API sont indisponibles.

<Info>Si le service en amont expose une API de modèle HTTP normale, écrivez un [provider plugin](/fr/plugins/sdk-provider-plugins) à la place. Si le runtime en amont gère des sessions d'agent complètes, des événements d'outil, la compaction, ou l'état des tâches en arrière-plan, utilisez un [agent harness](/fr/plugins/sdk-agent-harness).</Info>

## Ce que possède le plugin

Un plugin de backend CLI possède trois contrats :

| Contrat                   | Fichier                | Objectif                                                                         |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| Point d'entrée du package | `package.json`         | Pointe OpenClaw vers le module runtime du plugin                                 |
| Propriété du manifeste    | `openclaw.plugin.json` | Déclare l'identifiant du backend avant le chargement du runtime                  |
| Enregistrement du runtime | `index.ts`             | Appelle `api.registerCliBackend(...)` avec les valeurs par défaut de la commande |

Le manifeste contient les métadonnées de découverte. Il n'exécute pas le CLI et n'enregistre pas le comportement du runtime. Le comportement du runtime commence lorsque le point d'entrée du plugin appelle `api.registerCliBackend(...)`.

## Plugin de backend minimal

<Steps>
  <Step title="Créer les métadonnées du package">
    ```json package.json
    {
      "name": "@acme/openclaw-acme-cli",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      },
      "dependencies": {
        "openclaw": "^2026.3.24"
      },
      "devDependencies": {
        "typescript": "^5.9.0"
      }
    }
    ```

    Les packages publiés doivent inclure les fichiers d'exécution JavaScript construits. Si votre point
    d'entrée source est `./src/index.ts`, ajoutez `openclaw.runtimeExtensions` qui pointe vers
    le fichier JavaScript construit. Voir [Entry points](/fr/plugins/sdk-entrypoints).

  </Step>

  <Step title="Déclarer la propriété du backend">
    ```json openclaw.plugin.json
    {
      "id": "acme-cli",
      "name": "Acme CLI",
      "description": "Run Acme's local AI CLI through OpenClaw",
      "cliBackends": ["acme-cli"],
      "setup": {
        "cliBackends": ["acme-cli"],
        "requiresRuntime": false
      },
      "activation": {
        "onStartup": false
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```

    `cliBackends` est la liste de propriété d'exécution. Elle permet à OpenClaw de charger automatiquement le plugin lorsque la configuration ou la sélection de model mentionne `acme-cli/...`.

    `setup.cliBackends` est la surface de configuration basée sur les descripteurs. Ajoutez-la lorsque la découverte de model, l'onboarding ou l'état doivent reconnaître le backend sans charger l'exécution du plugin. Utilisez `requiresRuntime: false` uniquement lorsque ces descripteurs statiques suffisent pour la configuration.

  </Step>

  <Step title="Enregistrer le backend">
    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import {
      CLI_FRESH_WATCHDOG_DEFAULTS,
      CLI_RESUME_WATCHDOG_DEFAULTS,
      type CliBackendPlugin,
    } from "openclaw/plugin-sdk/cli-backend";

    function buildAcmeCliBackend(): CliBackendPlugin {
      return {
        id: "acme-cli",
        liveTest: {
          defaultModelRef: "acme-cli/acme-large",
          defaultImageProbe: false,
          defaultMcpProbe: false,
          docker: {
            npmPackage: "@acme/acme-cli",
            binaryName: "acme",
          },
        },
        config: {
          command: "acme",
          args: ["chat", "--json"],
          output: "json",
          input: "stdin",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptFileArg: "--system-file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          reliability: {
            watchdog: {
              fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
              resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
            },
          },
          serialize: true,
        },
      };
    }

    export default definePluginEntry({
      id: "acme-cli",
      name: "Acme CLI",
      description: "Run Acme's local AI CLI through OpenClaw",
      register(api) {
        api.registerCliBackend(buildAcmeCliBackend());
      },
    });
    ```

    L'identifiant du backend doit correspondre à l'entrée `cliBackends` du manifeste. La `config` enregistrée n'est que la valeur par défaut ; la configuration utilisateur sous `agents.defaults.cliBackends.acme-cli` est fusionnée avec celle-ci lors de l'exécution.

  </Step>
</Steps>

## Structure de la configuration

`CliBackendConfig` décrit comment OpenClaw doit lancer et analyser le CLI :

| Champ                                     | Usage                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `command`                                 | Nom du binaire ou chemin absolu de la commande                                       |
| `args`                                    | Argv de base pour les nouvelles exécutions                                           |
| `resumeArgs`                              | Argv alternatif pour les sessions reprises ; prend en charge `{sessionId}`           |
| `output` / `resumeOutput`                 | Analyseur : `json`, `jsonl` ou `text`                                                |
| `input`                                   | Transport de prompt : `arg` ou `stdin`                                               |
| `modelArg`                                | Option utilisée avant l'identifiant du model                                         |
| `modelAliases`                            | Faire correspondre les identifiants de model OpenClaw aux identifiants natifs du CLI |
| `sessionArg` / `sessionArgs`              | Comment passer un id de session                                                      |
| `sessionMode`                             | `always`, `existing` ou `none`                                                       |
| `sessionIdFields`                         | Champs JSON que OpenClaw lit depuis la sortie CLI                                    |
| `systemPromptArg` / `systemPromptFileArg` | Transport du prompt système                                                          |
| `systemPromptWhen`                        | `first`, `always` ou `never`                                                         |
| `imageArg` / `imageMode`                  | Support du chemin d'image                                                            |
| `serialize`                               | Garder les exécutions du même backend ordonnées                                      |
| `reliability.watchdog`                    | Ajustement du délai sans sortie                                                      |

Privilégiez la plus petite configuration statique correspondant au CLI. Ajoutez des rappels de plugin
uniquement pour les comportements appartenant vraiment au backend.

## Hooks de backend avancés

`CliBackendPlugin` peut également définir :

| Hook                               | Utilisation                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `normalizeConfig(config, context)` | Réécrire la configuration utilisateur héritée après fusion                  |
| `resolveExecutionArgs(ctx)`        | Ajouter des drapeaux liés à la requête tels que l'effort de réflexion       |
| `prepareExecution(ctx)`            | Créer des ponts d'auth ou de configuration temporaires avant le lancement   |
| `transformSystemPrompt(ctx)`       | Appliquer une transformation finale du prompt système spécifique au CLI     |
| `textTransforms`                   | Remplacements bidirectionnels de prompt/sortie                              |
| `defaultAuthProfileId`             | Privilégier un profil d'auth OpenClaw spécifique                            |
| `authEpochMode`                    | Décider comment les changements d'auth invalident les sessions stockées CLI |
| `nativeToolMode`                   | Déclarer si le CLI possède des outils natifs toujours actifs                |
| `bundleMcp` / `bundleMcpMode`      | Activer le pont d'outil MCP de boucle de retour OpenClaw                    |
| `ownsNativeCompaction`             | Le backend gère sa propre compaction - OpenClaw s'en remet                  |

Gardez ces hooks gérés par le provider. N'ajoutez pas de branches spécifiques au CLI dans le cœur lorsqu'un
hook de backend peut exprimer le comportement.

### `ownsNativeCompaction` : désactivation de la compaction OpenClaw

Si votre backend exécute un agent qui compacte sa **propre** transcription, définissez
`ownsNativeCompaction: true` pour que le résumé de sécurité de OpenClaw ne soit jamais exécuté sur ses
sessions - le cycle de vie de la compaction CLI renvoie une opération vide et le tour se poursuit. `claude-cli`
déclare cette propriété car Claude Code compacte en interne sans endpoint de harnais. Les sessions de harnais natif
telles que Codex continuent de router vers leur endpoint de compaction de harnais.

**Ne la déclarez que si toutes les conditions suivantes sont remplies**, sinon une session différée dépassant le budget peut
rester dépassée / devenir obsolète (OpenClaw ne la sauve plus) :

- le backend compacte ou limite de manière fiable sa propre transcription lorsqu'il approche sa fenêtre ;
- il persiste une session repriseable pour que l'état compacté survive aux tours
  (ex. `--resume` / `--session-id`) ;
- ce n'est pas une session de compaction de harnais natif - les sessions `agentHarnessId` correspondantes
  routent vers le endpoint de harnais à la place.

## Pont d'outil MCP

Les backends CLI ne reçoivent pas les outils OpenClaw par défaut. Si la CLI peut consommer une configuration MCP, optez explicitement pour cette option :

```typescript
return {
  id: "acme-cli",
  bundleMcp: true,
  bundleMcpMode: "codex-config-overrides",
  config: {
    command: "acme",
    args: ["chat", "--json"],
    output: "json",
  },
};
```

Les modes de pont pris en charge sont :

| Mode                     | Utilisation                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `claude-config-file`     | CLIs qui acceptent un fichier de configuration MCP                                   |
| `codex-config-overrides` | CLIs qui acceptent des surcharges de configuration sur argv                          |
| `gemini-system-settings` | CLIs qui lisent les paramètres MCP à partir de leur répertoire de paramètres système |

N'activez le pont que lorsque la CLI peut réellement l'utiliser. Si la CLI possède sa propre couche d'outils intégrée qui ne peut pas être désactivée, définissez `nativeToolMode:
"always-on"` afin qu'OpenClaw puisse échouer de manière fermée lorsqu'un appelant exige aucun outil natif.

## Configuration utilisateur

Les utilisateurs peuvent remplacer toute valeur par défaut du backend :

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "acme-cli": {
          command: "/opt/acme/bin/acme",
          args: ["chat", "--json", "--profile", "work"],
          modelAliases: {
            large: "acme-large-2026",
          },
        },
      },
      model: {
        primary: "openai/gpt-5.5",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

Documentez la redéfinition minimale dont les utilisateurs sont susceptibles d'avoir besoin. En général, il ne s'agit que de
`command` lorsque le binaire est en dehors de `PATH`.

## Vérification

Pour les plugins groupés, ajoutez un test ciblé autour du générateur et de l'enregistrement de la configuration,
puis exécutez la voie de test ciblée du plugin :

```bash
pnpm test extensions/acme-cli
```

Pour les plugins locaux ou installés, vérifiez la découverte et une exécution réelle de modèle :

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

Si le backend prend en charge les images ou MCP, ajoutez un test de fumée en direct qui prouve ces chemins
avec la vraie CLI. Ne vous fiez pas à l'inspection statique pour le prompt, l'image, MCP ou
le comportement de reprise de session.

## Liste de contrôle

<Check>`package.json` contient `openclaw.extensions` et des entrées d'exécution construites pour les packages publiés</Check>
<Check>`openclaw.plugin.json` déclare `cliBackends` et des `activation.onStartup` intentionnels</Check>
<Check>`setup.cliBackends` est présent lorsque la configuration/découverte de modèle doit voir le backend à froid</Check>
<Check>`api.registerCliBackend(...)` utilise le même identifiant de backend que le manifeste</Check>
<Check>Les redéfinitions utilisateur sous `agents.defaults.cliBackends.<id>`CLICLI priment toujours</Check>
<Check>Les paramètres de session, de système de prompt, d'image et d'analyseur de sortie correspondent au contrat réel de la CLI</Check>
<Check>Les tests ciblés et au moins un test de fumée de CLI en direct prouvent le chemin du backend</Check>

## Connexes

- [CLI backends](/fr/gateway/cli-backends) - configuration utilisateur et comportement à l'exécution
- [Building plugins](/fr/plugins/building-plugins) - bases du package et du manifeste
- [Plugin SDK overview](/fr/plugins/sdk-overview) - référence de l'API d'enregistrement
- [Plugin manifest](/fr/plugins/manifest) - descripteurs `cliBackends` et de configuration
- [Agent harness](/fr/plugins/sdk-agent-harness) - runtimes d'agents externes complets
