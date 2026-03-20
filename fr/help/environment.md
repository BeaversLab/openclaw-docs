---
summary: "Où OpenClaw charge les variables d'environnement et l'ordre de priorité"
read_when:
  - Vous devez savoir quelles env vars sont chargées et dans quel ordre
  - Vous déboguez des clés API manquantes dans le Gateway
  - Vous documentez l'authentification du provider ou les environnements de déploiement
title: "Variables d'environnement"
---

# Variables d'environnement

OpenClaw récupère les variables d'environnement à partir de plusieurs sources. La règle est **ne jamais remplacer les valeurs existantes**.

## Priorité (la plus élevée → la plus basse)

1. **Environnement de processus** (ce que le processus Gateway possède déjà du shell parent/daemon).
2. **`.env` dans le répertoire de travail actuel** (dotenv par défaut ; ne remplace pas).
3. **`.env` global** à `~/.openclaw/.env` (aussi appelé `$OPENCLAW_STATE_DIR/.env` ; ne remplace pas).
4. **Bloc de config `env`** dans `~/.openclaw/openclaw.json` (appliqué uniquement si manquant).
5. **Import facultatif du shell de connexion** (`env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1`), appliqué uniquement pour les expected keys manquantes.

Si le fichier de configuration est entièrement manquant, l'étape 4 est ignorée ; l'import du shell s'exécute toujours s'il est activé.

## Bloc de config `env`

Deux façons équivalentes de définir des env vars en ligne (les deux ne remplacent pas) :

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

## Import de l'environnement du shell

`env.shellEnv` exécute votre shell de connexion et importe uniquement les expected keys **manquantes** :

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

## Variables d'environnement injectées à l'exécution

OpenClaw injecte également des marqueurs de contexte dans les processus enfants générés :

- `OPENCLAW_SHELL=exec` : défini pour les commandes exécutées via l'outil `exec`.
- `OPENCLAW_SHELL=acp` : défini pour les générations de processus backend du runtime ACP (par exemple `acpx`).
- `OPENCLAW_SHELL=acp-client` : défini pour `openclaw acp client` lorsqu'il génère le processus du pont ACP.
- `OPENCLAW_SHELL=tui-local` : défini pour les commandes shell `!` de la TUI locale.

Il s'agit de marqueurs d'exécution (pas de configuration utilisateur requise). Ils peuvent être utilisés dans la logique du shell/profil
pour appliquer des règles spécifiques au contexte.

## Variables d'environnement de l'interface utilisateur

- `OPENCLAW_THEME=light` : force la palette claire de l'interface TUI lorsque votre terminal a un arrière-plan clair.
- `OPENCLAW_THEME=dark` : force la palette sombre de l'interface TUI.
- `COLORFGBG` : si votre terminal l'exporte, OpenClaw utilise l'indication de couleur d'arrière-plan pour choisir automatiquement la palette de l'interface TUI.

## Substitution des variables d'environnement dans la configuration

Vous pouvez référencer des variables d'environnement directement dans les valeurs de chaîne de configuration en utilisant la syntaxe `${VAR_NAME}` :

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

Voir [Configuration : Substitution des variables d'environnement](/fr/gateway/configuration#env-var-substitution-in-config) pour plus de détails.

## Références secrètes par rapport aux chaînes `${ENV}`

OpenClaw prend en charge deux modèles basés sur les variables d'environnement :

- Substitution de chaîne `${VAR}` dans les valeurs de configuration.
- Objets SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) pour les champs qui prennent en charge les références de secrets.

Les deux sont résolus à partir des variables d'environnement du processus au moment de l'activation. Les détails sur SecretRef sont documentés dans [Gestion des secrets](/fr/gateway/secrets).

## Variables d'environnement liées au chemin

| Variable               | Objectif                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | Remplace le répertoire personnel utilisé pour toute la résolution de chemin interne (`~/.openclaw/`, répertoires d'agent, sessions, identifiants). Utile lors de l'exécution de OpenClaw en tant qu'utilisateur de service dédié. |
| `OPENCLAW_STATE_DIR`   | Remplace le répertoire d'état (par défaut `~/.openclaw`).                                                                                                                                                                         |
| `OPENCLAW_CONFIG_PATH` | Remplace le chemin du fichier de configuration (par défaut `~/.openclaw/openclaw.json`).                                                                                                                                          |

## Journalisation

| Variable             | Objectif                                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | Remplace le niveau de journalisation pour les fichiers et la console (par ex. `debug`, `trace`). A priorité sur `logging.level` et `logging.consoleLevel` dans la configuration. Les valeurs non valides sont ignorées avec un avertissement. |

### `OPENCLAW_HOME`

Lorsqu'elle est définie, `OPENCLAW_HOME` remplace le répertoire personnel système (`$HOME` / `os.homedir()`) pour toute la résolution de chemin interne. Cela permet une isolation complète du système de fichiers pour les comptes de service sans interface.

**Priorité :** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Exemple** (LaunchDaemon macOS) :

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` peut également être défini sur un chemin tilde (par ex. `~/svc`), qui est développé en utilisant `$HOME` avant utilisation.

## Connexes

- [Configuration du Gateway](/fr/gateway/configuration)
- [FAQ : env vars et chargement .env](/fr/help/faq#env-vars-and-env-loading)
- [Vue d'ensemble des modèles](/fr/concepts/models)

import fr from "/components/footer/fr.mdx";

<fr />
