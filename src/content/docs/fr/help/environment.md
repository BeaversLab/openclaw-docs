---
summary: "Où OpenClaw charge les variables d'environnement et l'ordre de priorité"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables d'environnement"
---

OpenClaw récupère les variables d'environnement à partir de plusieurs sources. La règle est de **ne jamais remplacer les valeurs existantes**.

## Priorité (la plus élevée → la plus basse)

1. **Environnement de processus** (ce que le processus Gateway possède déjà depuis le shell parent/daemon).
2. **`.env` dans le répertoire de travail actuel** (par défaut de dotenv ; ne remplace pas).
3. **`.env` global** à `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env` ; ne remplace pas).
4. **Bloc `env` de configuration** dans `~/.openclaw/openclaw.json` (appliqué uniquement si manquant).
5. **Import optionnel du shell de connexion** (`env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1`), appliqué uniquement pour les clés attendues manquantes.

Sur les installations fraîches d'Ubuntu qui utilisent le répertoire d'état par défaut, OpenClaw traite également `~/.config/openclaw/gateway.env` comme un repli de compatibilité après le `.env` global. Si les deux fichiers existent et sont en désaccord, OpenClaw conserve `~/.openclaw/.env` et imprime un avertissement.

Si le fichier de configuration est entièrement manquant, l'étape 4 est ignorée ; l'importation du shell s'exécute toujours si elle est activée.

## Bloc `env` de configuration

Deux façons équivalentes de définir des env vars en ligne (aucune des deux n'est écrasante) :

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

## Importation de l'environnement shell

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

## Variables d'environnement injectées à l'exécution

OpenClaw injecte également des marqueurs de contexte dans les processus enfants générés :

- `OPENCLAW_SHELL=exec` : défini pour les commandes exécutées via l'outil `exec`.
- `OPENCLAW_SHELL=acp` : défini pour les générations de processus backend d'exécution ACP (par exemple `acpx`).
- `OPENCLAW_SHELL=acp-client` : défini pour `openclaw acp client` lorsqu'il génère le processus de pont ACP.
- `OPENCLAW_SHELL=tui-local` : défini pour les commandes shell `!` de la TUI locale.

Il s'agit de marqueurs d'exécution (pas de configuration utilisateur requise). Ils peuvent être utilisés dans la logique de shell/profil
pour appliquer des règles spécifiques au contexte.

## Variables d'environnement de l'interface utilisateur

- `OPENCLAW_THEME=light` : force la palette claire de l'interface TUI lorsque votre terminal a un arrière-plan clair.
- `OPENCLAW_THEME=dark` : force la palette sombre de l'interface TUI.
- `COLORFGBG` : si votre terminal l'exporte, OpenClaw utilise l'indication de couleur d'arrière-plan pour choisir automatiquement la palette de l'interface TUI.

## Substitution des env vars dans la config

Vous pouvez référencer des env vars directement dans les valeurs de chaîne de la configuration en utilisant la syntaxe `${VAR_NAME}` :

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

Voir [Configuration : Substitution de variables d'environnement](/fr/gateway/configuration-reference#env-var-substitution) pour tous les détails.

## Références secrètes vs chaînes `${ENV}`

OpenClaw prend en charge deux modèles basés sur les env vars :

- Substitution de chaîne `${VAR}` dans les valeurs de configuration.
- Objets SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) pour les champs qui prennent en charge les références de secrets.

Les deux sont résolus à partir de l'environnement du processus au moment de l'activation. Les détails sur SecretRef sont documentés dans [Gestion des secrets](/fr/gateway/secrets).

## Env vars liés au chemin

| Variable                 | Objet                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | Remplace le répertoire personnel utilisé pour toute la résolution de chemin interne (`~/.openclaw/`, répertoires d'agent, sessions, informations d'identification). Utile lors de l'exécution de OpenClaw en tant qu'utilisateur de service dédié. |
| `OPENCLAW_STATE_DIR`     | Remplace le répertoire d'état (par défaut `~/.openclaw`).                                                                                                                                                                                          |
| `OPENCLAW_CONFIG_PATH`   | Remplace le chemin du fichier de configuration (par défaut `~/.openclaw/openclaw.json`).                                                                                                                                                           |
| `OPENCLAW_INCLUDE_ROOTS` | Liste de chemins de répertoires où les directives `$include` peuvent résoudre des fichiers en dehors du répertoire de configuration (par défaut : aucun — `$include` est confiné au répertoire de configuration). Avec expansion du tilde.         |

## Journalisation

| Variable             | Objectif                                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | Remplacer le niveau de journalisation pour les fichiers et la console (par ex. `debug`, `trace`). A priorité sur `logging.level` et `logging.consoleLevel` dans la configuration. Les valeurs invalides sont ignorées avec un avertissement. |

### `OPENCLAW_HOME`

Lorsqu'elle est définie, `OPENCLAW_HOME` remplace le répertoire personnel du système (`$HOME` / `os.homedir()`) pour toute résolution de chemin interne. Cela permet une isolation complète du système de fichiers pour les comptes de service sans interface.

**Priorité :** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**Exemple** (LaunchDaemon macOS) :

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` peut également être défini sur un chemin avec tilde (par ex. `~/svc`), qui est étendu en utilisant `$HOME` avant utilisation.

## utilisateurs de nvm : échecs TLS web_fetch

Si Node.js a été installé via **nvm** (et non le gestionnaire de paquets du système), le `fetch()` intégré utilise
le magasin de CA groupé par nvm, qui peut manquer de racines CA modernes (ISRG Root X1/X2 pour Let's Encrypt,
DigiCert Global Root G2, etc.). Cela provoque l'échec de `web_fetch` avec `"fetch failed"` sur la plupart des sites HTTPS.

Sur Linux, OpenClaw détecte automatiquement nvm et applique le correctif dans l'environnement de démarrage réel :

- `openclaw gateway install` écrit `NODE_EXTRA_CA_CERTS` dans lvironnement du service systemd
- le point d'entrée `openclaw` de la CLI se réexécute lui-même avec `NODE_EXTRA_CA_CERTS` défini avant le démarrage de Node

**Correction manuelle (pour les anciennes versions ou les lancements directs `node ...`) :**

Exportez la variable avant de démarrer OpenClaw :

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

Ne comptez pas sur l'écriture uniquement dans `~/.openclaw/.env` pour cette variable ; Node lit
`NODE_EXTRA_CA_CERTS` au démarrage du processus.

## Variables d'environnement héritées

OpenClaw lit uniquement les variables d'environnement `OPENCLAW_*`. Les préfixes hérités
`CLAWDBOT_*` et `MOLTBOT_*` des versions précédentes sont silencieusement
ignorés.

Si certaines sont toujours définies sur le processus Gateway au démarrage, OpenClaw émet un
seul avertissement de dépréciation Node (`OPENCLAW_LEGACY_ENV_VARS`) listant les
préfixes détectés et le nombre total. Renommez chaque valeur en remplaçant le
préfixe hérité par `OPENCLAW_` (par exemple `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`) ; les anciens noms n'ont aucun effet.

## Connexes

- [Configuration du Gateway](/fr/gateway/configuration)
- [FAQ : variables d'environnement et chargement .env](/fr/help/faq#env-vars-and-env-loading)
- [Aperçu des modèles](/fr/concepts/models)
