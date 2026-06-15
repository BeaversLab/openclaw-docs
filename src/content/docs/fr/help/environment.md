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

Voir [Gestion des secrets](/fr/gateway/secrets) et la
[surface de credential SecretRef](/fr/reference/secretref-credential-surface) pour
les champs pris en charge.

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

## Snapshots du shell d'exécution

Sur les hôtes Gateway non-WindowsGateway, les commandes bash et zsh `exec` utilisent par défaut un snapshot de démarrage.
Définissez `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` dans l'environnement de processus du Gateway pour désactiver ce chemin.
Les valeurs `false`, `no` et `off` le désactivent également. Les valeurs `exec.env` par appel ne peuvent pas activer/désactiver
les snapshots ou rediriger le cache de snapshots.

## Env vars injectés lors de l'exécution

OpenClaw injecte également des marqueurs de contexte dans les processus enfants générés :

- `OPENCLAW_SHELL=exec` : défini pour les commandes exécutées via l'outil `exec`.
- `OPENCLAW_SHELL=acp` : défini pour les générations de processus de backend d'exécution ACP (par exemple `acpx`).
- `OPENCLAW_SHELL=acp-client` : défini pour `openclaw acp client` lorsqu'il génère le processus de pont ACP.
- `OPENCLAW_SHELL=tui-local`TUI : défini pour les commandes shell `!` de la TUI locale.
- `OPENCLAW_CLI=1` : défini pour les processus enfants générés par le point d'entrée de la CLI.

Ce sont des marqueurs d'exécution (pas de configuration utilisateur requise). Ils peuvent être utilisés dans la logique shell/profil
pour appliquer des règles spécifiques au contexte.

## Env vars de l'interface utilisateur

- `OPENCLAW_THEME=light`TUI : force la palette TUI claire lorsque votre terminal a un arrière-plan clair.
- `OPENCLAW_THEME=dark`TUI : force la palette TUI sombre.
- `COLORFGBG` : si votre terminal l'exporte, OpenClawTUI utilise l'indication de couleur d'arrière-plan pour choisir automatiquement la palette TUI.

## Substitution des env vars dans la configuration

Vous pouvez référencer des env vars directement dans les valeurs de chaîne de configuration en utilisant la syntaxe `${VAR_NAME}` :

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

## Références de secrets par rapport aux chaînes `${ENV}`

OpenClaw prend en charge deux modèles basés sur des env vars :

- Substitution de chaînes `${VAR}` dans les valeurs de configuration.
- Objets SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) pour les champs prenant en charge les références de secrets.

Les deux sont résolus à partir des variables d'environnement du processus au moment de l'activation. Les détails sur SecretRef sont documentés dans [Gestion des secrets](/fr/gateway/secrets).
Le bloc de configuration `env` ne résout pas lui-même les SecretRefs ni les valeurs abrégées `file:...`.

## Variables d'environnement liées au chemin

| Variable                 | Objet                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | Remplace le répertoire personnel utilisé pour les chemins par défaut internes de OpenClaw (`~/.openclaw/`, répertoires d'agents, sessions, identifiants, intégration de l'installateur et l'extraction de développement par défaut). Utile lors de l'exécution de OpenClaw en tant qu'utilisateur de service dédié. |
| `OPENCLAW_STATE_DIR`     | Remplace le répertoire d'état (par défaut `~/.openclaw`).                                                                                                                                                                                                                                                           |
| `OPENCLAW_CONFIG_PATH`   | Remplace le chemin du fichier de configuration (par défaut `~/.openclaw/openclaw.json`).                                                                                                                                                                                                                            |
| `OPENCLAW_INCLUDE_ROOTS` | Liste de chemins de répertoires où les directives `$include` peuvent résoudre des fichiers en dehors du répertoire de configuration (par défaut : aucun — `$include` est confiné au répertoire de configuration). Avec expansion du tilde.                                                                          |

## Journalisation

| Variable                         | Objet                                                                                                                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | Remplace le niveau de journalisation pour le fichier et la console (par exemple `debug`, `trace`). A priorité sur `logging.level` et `logging.consoleLevel` dans la configuration. Les valeurs non valides sont ignorées avec un avertissement. |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | Émet des diagnostics de synchronisation ciblés des requêtes/réponses du model au niveau `info` sans activer les journaux de débogage globaux.                                                                                                   |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Diagnostics de la charge utile du modèle : `summary`, `tools` ou `full-redacted`. `full-redacted` est limité et expurgé mais peut inclure le texte de l'invite/du message.                                                                      |
| `OPENCLAW_DEBUG_SSE`             | Diagnostics de diffusion en continu : `events` pour la chronologie de début/fin, `peek` pour inclure les cinq premiers événements SSE expurgés.                                                                                                 |
| `OPENCLAW_DEBUG_CODE_MODE`       | Diagnostics de surface de modèle en mode code, y compris le masquage des outils de fournisseur et l'application stricte de l'exécution ou de l'attente uniquement.                                                                              |

### `OPENCLAW_HOME`

Lorsqu'elle est définie, `OPENCLAW_HOME` remplace le répertoire personnel du système (`$HOME` / `os.homedir()`OpenClaw) pour les chemins par défaut internes d'OpenClaw. Cela inclut le répertoire d'état par défaut, le chemin de configuration, les répertoires des agents, les identifiants, l'espace de travail d'intégration de l'installateur et l'extraction de développement par défaut utilisée par `openclaw update --channel dev`.

**Priorité :** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Valeur de repli du domicile Termux `PREFIX`Android sur Android > `os.homedir()`

**Exemple** (LaunchDaemon macOS) :

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` peut également être défini sur un chemin avec tilde (par exemple `~/svc`), qui est développé en utilisant la même chaîne de repli du domicile du système d'exploitation avant utilisation.

Les variables de chemin explicites telles que `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH` et `OPENCLAW_GIT_DIR` priment toujours. Les tâches liées au compte du système d'exploitation, telles que la détection des fichiers de démarrage du shell, la configuration du gestionnaire de packages et le développement de l'hôte `~`, peuvent toujours utiliser le véritable domicile du système.

## utilisateurs de nvm : échecs TLS web_fetch

Si Node.js a été installé via **nvm** (et non via le gestionnaire de packages du système), le Node.js`fetch()` intégré utilise
le magasin de CA fourni avec nvm, qui peut manquer de CA racines modernes (ISRG Root X1/X2 pour Let's Encrypt,
DigiCert Global Root G2, etc.). Cela provoque l'échec de `web_fetch` avec `"fetch failed"` sur la plupart des sites HTTPS.

Sur Linux, OpenClaw détecte automatiquement nvm et applique le correctif dans l'environnement de démarrage réel :

- `openclaw gateway install` écrit `NODE_EXTRA_CA_CERTS` dans l'environnement du service systemd
- le point d'entrée CLI `openclaw` se réexécute lui-même avec `NODE_EXTRA_CA_CERTS` défini avant le démarrage de Node

**Correctif manuel (pour les versions antérieures ou les lancements directs `node ...`) :**

Exportez la variable avant de démarrer OpenClaw :

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

Ne comptez pas uniquement sur l'écriture dans `~/.openclaw/.env` pour cette variable ; Node lit
`NODE_EXTRA_CA_CERTS` au démarrage du processus.

## Variables d'environnement héritées

OpenClaw ne lit que les variables d'environnement `OPENCLAW_*`. Les préfixes hérités
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
