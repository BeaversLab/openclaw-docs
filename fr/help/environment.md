---
summary: "Où OpenClaw charge les variables d'environnement et l'ordre de priorité"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables d'environnement"
---

# Variables d'environnement

OpenClaw récupère les variables d'environnement depuis plusieurs sources. La règle est de **ne jamais remplacer les valeurs existantes**.

## Priorité (la plus élevée → la plus basse)

1. **Processus d'environnement** (ce que le processus Gateway possède déjà depuis le shell/démon parent).
2. \***\* `.env` dans le répertoire de travail actuel** (dotenv par défaut ; ne remplace pas).
3. \***\* `.env` global** à `~/.openclaw/.env`\*\* (aka `$OPENCLAW_STATE_DIR/.env` ; ne remplace pas).
4. **Bloc `env` Config** dans `~/.openclaw/openclaw.json` (appliqué uniquement si manquant).
5. **Import optionnel du shell de connexion** (`env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1`), appliqué uniquement pour les clés attendues manquantes.

Si le fichier de configuration est entièrement manquant, l'étape 4 est ignorée ; l'importation du shell s'exécute toujours si elle est activée.

## Bloc `env` de configuration

Deux façons équivalentes de définir des variables d'environnement en ligne (les deux ne remplacent pas) :

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Importation de l'environnement du shell

`env.shellEnv` exécute votre shell de connexion et importe uniquement les clés attendues **manquantes** :

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

Équivalents de variables d'environnement :

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Variables d'environnement injectées lors de l'exécution

OpenClaw injecte également des marqueurs de contexte dans les processus enfants générés :

- `OPENCLAW_SHELL=exec` : défini pour les commandes exécutées via l'outil `exec`.
- `OPENCLAW_SHELL=acp` : défini pour les générations de processus backend du runtime ACP (par exemple `acpx`).
- `OPENCLAW_SHELL=acp-client` : défini pour `openclaw acp client` lorsqu'il génère le processus de pont ACP.
- `OPENCLAW_SHELL=tui-local` : défini pour les commandes shell `!` de l'interface TUI locale.

Ce sont des marqueurs d'exécution (pas une configuration utilisateur requise). Ils peuvent être utilisés dans la logique du shell/profil
pour appliquer des règles spécifiques au contexte.

## Variables d'env de l'interface utilisateur

- `OPENCLAW_THEME=light` : force la palette claire de la TUI lorsque votre terminal a un arrière-plan clair.
- `OPENCLAW_THEME=dark` : force la palette sombre de la TUI.
- `COLORFGBG` : si votre terminal l'exporte, OpenClaw utilise l'indication de couleur d'arrière-plan pour choisir automatiquement la palette TUI.

## Substitution des variables d'env dans la configuration

Vous pouvez référencer des variables d'env directement dans les valeurs de chaîne de la configuration en utilisant la syntaxe `${VAR_NAME}` :

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

Voir [Configuration : substitution de variables d'environnement](/fr/gateway/configuration-reference#env-var-substitution) pour plus de détails.

## Références secrètes vs chaînes `${ENV}`

OpenClaw prend en charge deux modèles basés sur l'env :

- Substitution de chaîne `${VAR}` dans les valeurs de configuration.
- Objets SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) pour les champs qui prennent en charge les références de secrets.

Les deux sont résolus à partir de l'env du processus au moment de l'activation. Les détails de SecretRef sont documentés dans [Gestion des secrets](/fr/gateway/secrets).

## Variables d'env liées au chemin

| Variable               | Objet                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | Remplace le répertoire personnel utilisé pour toute résolution de chemin interne (`~/.openclaw/`, répertoires d'agent, sessions, informations d'identification). Utile lors de l'exécution de OpenClaw en tant qu'utilisateur de service dédié. |
| `OPENCLAW_STATE_DIR`   | Remplace le répertoire d'état (par défaut `~/.openclaw`).                                                                                                                                                                                       |
| `OPENCLAW_CONFIG_PATH` | Remplace le chemin du fichier de configuration (par défaut `~/.openclaw/openclaw.json`).                                                                                                                                                        |

## Journalisation

| Variable             | Objet                                                                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | Remplace le niveau de journalisation pour les fichiers et la console (par ex. `debug`, `trace`). Prend le pas sur `logging.level` et `logging.consoleLevel` dans la configuration. Les valeurs non valides sont ignorées avec un avertissement. |

### `OPENCLAW_HOME`

Lorsqu'elle est définie, `OPENCLAW_HOME` remplace le répertoire personnel du système (`$HOME` / `os.homedir()`) pour toute la résolution de chemin interne. Cela permet une isolation complète du système de fichiers pour les comptes de service sans interface.

**Priorité :** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Exemple** (macOS LaunchDaemon) :

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` peut également être défini sur un chemin avec tilde (par ex. `~/svc`), qui est développé en utilisant `$HOME` avant utilisation.

## Connexes

- [Configuration du Gateway](/fr/gateway/configuration)
- [FAQ : env vars et chargement .env](/fr/help/faq#env-vars-and-env-loading)
- [Aperçu des modèles](/fr/concepts/models)

import fr from "/components/footer/fr.mdx";

<fr />
