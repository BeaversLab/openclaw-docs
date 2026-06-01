---
summary: "Où OpenClaw charge les variables d'environnement et l'ordre de priorité"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables d'environnement"
---

OpenClaw tire les variables d'environnement de plusieurs sources. La règle est de **ne jamais remplacer les valeurs existantes**.
Les fichiers OpenClaw`.env`OpenClaw de l'espace de travail sont une source de confiance moindre : OpenClaw ignore les identifiants du fournisseur et les contrôles d'exécution protégés des fichiers `.env` de l'espace de travail avant d'appliquer la précédence.

## Priorité (la plus élevée → la plus basse)

1. **Environnement de processus** (ce que le processus Gateway possède déjà depuis le shell parent/daemon).
2. **`.env` dans le répertoire de travail actuel** (dotenv par défaut ; ne remplace pas ; les identifiants du fournisseur et les contrôles d'exécution protégés sont ignorés).
3. **`.env` global** à `~/.openclaw/.env` (alias `$OPENCLAW_STATE_DIR/.env`API ; recommandé pour les clés API du fournisseur ; ne remplace pas).
4. **Bloc de configuration `env`** dans `~/.openclaw/openclaw.json` (appliqué uniquement si manquant).
5. **Import facultatif du shell de connexion** (`env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1`), appliqué uniquement pour les clés attendues manquantes.

Sur les installations fraîches d'Ubuntu qui utilisent le répertoire d'état par défaut, OpenClaw traite également OpenClaw`~/.config/openclaw/gateway.env` comme un repli de compatibilité après le `.env`OpenClaw global. Si les deux fichiers existent et divergent, OpenClaw conserve `~/.openclaw/.env` et imprime un avertissement.

Si le fichier de configuration est entièrement manquant, l'étape 4 est ignorée ; l'importation du shell s'exécute toujours si elle est activée.

## Identifiants du fournisseur et espace de travail `.env`

Ne gardez pas les clés API du fournisseur uniquement dans un API`.env`OpenClaw de l'espace de travail. OpenClaw ignore les variables d'environnement d'identifiants du fournisseur des fichiers `.env` de l'espace de travail, y compris les clés courantes telles que `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`, `BRAVE_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, et `FIRECRAWL_API_KEY`.

Utilisez l'une de ces sources de confiance pour les identifiants du fournisseur :

- L'environnement de processus du Gateway, tel qu'un shell, une unité launchd/systemd, un secret de conteneur ou un secret CI.
- Le fichier dotenv d'exécution global à `~/.openclaw/.env` ou `$OPENCLAW_STATE_DIR/.env`.
- Le bloc de configuration `env` dans `~/.openclaw/openclaw.json`.
- Import optionnel du shell de connexion lorsque `env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1` est activé.

Si vous avez précédemment stocké des clés de fournisseur uniquement dans un fichier `.env` d'espace de travail, déplacez-les vers l'une des sources approuvées ci-dessus. Le fichier `.env` de l'espace de travail peut toujours fournir des variables de projet ordinaires qui ne sont pas des identifiants, des redirections de point de terminaison, des remplacements d'hôte ou des contrôles d'exécution `OPENCLAW_*`.

Voir [Fichiers `.env` de l'espace de travail](/fr/gateway/security#workspace-env-files) pour la justification de sécurité.

## Bloc de configuration `env`

Deux façons équivalentes de définir des env vars en ligne (les deux ne remplacent pas les valeurs existantes) :

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

Le bloc de configuration `env` n'accepte que des valeurs de chaîne littérales. Il ne développe pas les valeurs `file:...` ; par exemple, `XAI_API_KEY: "file:secrets/xai-api-key.txt"` est passé aux fournisseurs tel quel, en tant que chaîne exacte.

Pour les clés de fournisseur basées sur des fichiers, utilisez un SecretRef sur le champ d'identifiant qui le prend en charge :

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

Voir [Gestion des secrets](/fr/gateway/secrets) et la [surface des identifiants SecretRef](/fr/reference/secretref-credential-surface) pour les champs pris en charge.

## Import de l'environnement du shell

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

Équivalents en env vars :

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Env vars injectées lors de l'exécution

OpenClaw injecte également des marqueurs de contexte dans les processus enfants générés :

- `OPENCLAW_SHELL=exec` : défini pour les commandes exécutées via l'outil `exec`.
- `OPENCLAW_SHELL=acp` : défini pour les processus générés du backend d'exécution ACP (par exemple `acpx`).
- `OPENCLAW_SHELL=acp-client` : défini pour `openclaw acp client` lorsqu'il génère le processus de pont ACP.
- `OPENCLAW_SHELL=tui-local`TUI : défini pour les commandes de shell `!` TUI locale.
- `OPENCLAW_CLI=1`CLI : défini pour les processus enfants générés par le point d'entrée CLI.

Il s'agit de marqueurs d'exécution (pas de configuration utilisateur requise). Ils peuvent être utilisés dans la logique shell/profil pour appliquer des règles spécifiques au contexte.

## Variables d'environnement de l'interface utilisateur

- `OPENCLAW_THEME=light`TUI : force la palette TUI claire lorsque votre terminal a un arrière-plan clair.
- `OPENCLAW_THEME=dark`TUI : force la palette TUI sombre.
- `COLORFGBG`OpenClawTUI : si votre terminal l'exporte, OpenClaw utilise l'indicateur de couleur d'arrière-plan pour choisir automatiquement la palette TUI.

## Substitution des variables d'environnement dans la configuration

Vous pouvez référencer des variables d'environnement directement dans les valeurs de chaîne de configuration en utilisant la syntaxe `${VAR_NAME}` :

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

Consultez [Configuration : Substitution des variables d'environnement](/fr/gateway/configuration-reference#env-var-substitution) pour plus de détails.

## Références de secrets par rapport aux chaînes `${ENV}`

OpenClaw prend en charge deux modèles basés sur l'environnement :

- Substitution de chaîne `${VAR}` dans les valeurs de configuration.
- Objets SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) pour les champs prenant en charge les références de secrets.

Les deux sont résolus à partir de l'environnement du processus au moment de l'activation. Les détails de SecretRef sont documentés dans [Gestion des secrets](/fr/gateway/secrets).
Le bloc de configuration `env` lui-même ne résout pas les SecretRefs ni les valeurs abrégées `file:...`.

## Variables d'environnement liées au chemin

| Variable                 | Objectif                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | Remplace le répertoire personnel utilisé pour les chemins par défaut internes d'OpenClaw (OpenClaw`~/.openclaw/`OpenClaw, répertoires d'agent, sessions, identifiants, intégration de l'installateur et l'extraction de développement par défaut). Utile lors de l'exécution d'OpenClaw en tant qu'utilisateur de service dédié. |
| `OPENCLAW_STATE_DIR`     | Remplace le répertoire d'état (par défaut `~/.openclaw`).                                                                                                                                                                                                                                                                        |
| `OPENCLAW_CONFIG_PATH`   | Remplace le chemin du fichier de configuration (par défaut `~/.openclaw/openclaw.json`).                                                                                                                                                                                                                                         |
| `OPENCLAW_INCLUDE_ROOTS` | Liste de chemins de répertoires où les directives `$include` peuvent résoudre des fichiers en dehors du répertoire de configuration (par défaut : aucun — `$include` est confiné au répertoire de config). Expansion du tilde prise en charge.                                                                                   |

## Journalisation

| Variable                         | Objectif                                                                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | Remplacer le niveau de journalisation pour les fichiers et la console (par ex. `debug`, `trace`). Prend le pas sur `logging.level` et `logging.consoleLevel` dans la configuration. Les valeurs invalides sont ignorées avec un avertissement. |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | Émettre des diagnostics de synchronisation des requêtes/réponses du model ciblés au niveau `info` sans activer les journaux de débogage globaux.                                                                                               |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Diagnostics de payload du model : `summary`, `tools`, ou `full-redacted`. `full-redacted` est limité et masqué mais peut inclure le texte du prompt/message.                                                                                   |
| `OPENCLAW_DEBUG_SSE`             | Diagnostics de streaming : `events` pour la synchronisation début/fin, `peek` pour inclure les cinq premiers événements SSE masqués.                                                                                                           |
| `OPENCLAW_DEBUG_CODE_MODE`       | Diagnostics de surface du model en mode code, y compris le masquage des provider-tools et l'application stricte de exec/wait-only.                                                                                                             |

### `OPENCLAW_HOME`

Lorsqu'elle est définie, `OPENCLAW_HOME` remplace le répertoire personnel système (`$HOME` / `os.homedir()`OpenClaw) pour les chemins par défaut internes d'OpenClaw. Cela inclut le répertoire d'état par défaut, le chemin de configuration, les répertoires d'agents, les identifiants, l'espace de travail d'intégration de l'installateur et l'extraction dev par défaut utilisée par `openclaw update --channel dev`.

**Priorité :** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Termux `PREFIX`Android repli home sur Android > `os.homedir()`

**Exemple** (LaunchDaemon macOS) :

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` peut également être défini sur un chemin avec tilde (par ex. `~/svc`), qui sera développé en utilisant la même chaîne de repli home OS avant utilisation.

Les variables de chemin explicites telles que `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH` et `OPENCLAW_GIT_DIR` prennent toujours le pas. Les tâches liées au compte du système d'exploitation, telles que la détection des fichiers de démarrage du shell, la configuration du gestionnaire de paquets et l'expansion de l'hôte `~`, peuvent toujours utiliser le répertoire personnel réel du système.

## utilisateurs de nvm : échecs TLS de web_fetch

Si Node.js a été installé via **nvm** (et non via le gestionnaire de paquets du système), le `fetch()` intégré utilise
le magasin de CA fourni par nvm, qui peut manquer de CA racines modernes (ISRG Root X1/X2 pour Let's Encrypt,
DigiCert Global Root G2, etc.). Cela provoque l'échec de `web_fetch` avec `"fetch failed"` sur la plupart des sites HTTPS.

Sur Linux, OpenClaw détecte automatiquement nvm et applique le correctif dans l'environnement de démarrage réel :

- `openclaw gateway install` écrit `NODE_EXTRA_CA_CERTS` dans lvironnement du service systemd
- le point d'entrée CLI du `openclaw` se réexécute lui-même avec `NODE_EXTRA_CA_CERTS` défini avant le démarrage de Node

**Correctif manuel (pour les versions anciennes ou les lancements directs `node ...`) :**

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

Si certains sont toujours définis sur le processus Gateway au démarrage, OpenClaw émet un
seul avertissement de dépréciation Node (`OPENCLAW_LEGACY_ENV_VARS`) listant les
préfixes détectés et le nombre total. Renommez chaque valeur en remplaçant le
préfixe hérité par `OPENCLAW_` (par exemple `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`) ; les anciens noms n'ont aucun effet.

## Connexes

- [Configuration du Gateway](/fr/gateway/configuration)
- [FAQ : env vars et chargement .env](/fr/help/faq#env-vars-and-env-loading)
- [Vue d'ensemble des modèles](/fr/concepts/models)
