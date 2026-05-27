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
2. **`.env` dans le répertoire de travail actuel** (dotenv par défaut ; ne pas écraser).
3. **`.env` global** à `~/.openclaw/.env` (alias `$OPENCLAW_STATE_DIR/.env` ; ne pas écraser).
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

Le bloc `env` de configuration n'accepte que les valeurs de chaîne littérales. Il ne développe pas les
valeurs `file:...` ; par exemple, `XAI_API_KEY: "file:secrets/xai-api-key.txt"`
est passé aux fournisseurs sous forme de cette chaîne exacte.

Pour les clés de fournisseur sauvegardées par fichier, utilisez un SecretRef sur le champ d'identification qui
le prend en charge :

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

Voir [Secrets Management](/fr/gateway/secrets) et la
[SecretRef credential surface](/fr/reference/secretref-credential-surface) pour
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

Équivalents de variables d'environnement :

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## Variables d'environnement injectées lors de l'exécution

OpenClaw injecte également des marqueurs de contexte dans les processus enfants générés :

- `OPENCLAW_SHELL=exec` : défini pour les commandes exécutées via l'outil `exec`.
- `OPENCLAW_SHELL=acp` : défini pour les spawns de processus backend du runtime ACP (par exemple `acpx`).
- `OPENCLAW_SHELL=acp-client` : défini pour `openclaw acp client` lorsqu'il génère le processus du pont ACP.
- `OPENCLAW_SHELL=tui-local`TUI : défini pour les commandes shell `!` de l'interface TUI locale.
- `OPENCLAW_CLI=1` : défini pour les processus enfants générés par le point d'entrée CLI.

Il s'agit de marqueurs d'exécution (pas une configuration utilisateur requise). Ils peuvent être utilisés dans la logique shell/profil
pour appliquer des règles spécifiques au contexte.

## Variables d'environnement de l'interface utilisateur

- `OPENCLAW_THEME=light` : force la palette claire de TUI lorsque votre terminal a un arrière-plan clair.
- `OPENCLAW_THEME=dark` : force la palette sombre de TUI.
- `COLORFGBG` : si votre terminal l'exporte, OpenClaw utilise l'indication de couleur d'arrière-plan pour choisir automatiquement la palette TUI.

## Substitution de variable d'environnement dans la configuration

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

Voir [Configuration: Env var substitution](/fr/gateway/configuration-reference#env-var-substitution) pour tous les détails.

## Références secrètes vs chaînes `${ENV}`

OpenClaw prend en charge deux modèles basés sur l'environnement :

- Substitution de chaîne `${VAR}` dans les valeurs de configuration.
- Objets SecretRef (`{ source: "env", provider: "default", id: "VAR" }`) pour les champs prenant en charge les références secrètes.

Les deux sont résolus à partir de l'environnement du processus au moment de l'activation. Les détails de SecretRef sont documentés dans [Secrets Management](/fr/gateway/secrets).
Le bloc de configuration `env` ne résout pas lui-même les SecretRefs ou les valeurs abrégées
`file:...`.

## Variables d'environnement liées au chemin

| Variable                 | Objectif                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | Remplacer le répertoire personnel utilisé pour les chemins par défaut internes de OpenClaw (`~/.openclaw/`, répertoires d'agent, sessions, informations d'identification, onboarding de l'installateur et l'extraction dev par défaut). Utile lors de l'exécution de OpenClaw en tant qu'utilisateur de service dédié. |
| `OPENCLAW_STATE_DIR`     | Remplacer le répertoire d'état (par défaut `~/.openclaw`).                                                                                                                                                                                                                                                             |
| `OPENCLAW_CONFIG_PATH`   | Remplacer le chemin du fichier de configuration (par défaut `~/.openclaw/openclaw.json`).                                                                                                                                                                                                                              |
| `OPENCLAW_INCLUDE_ROOTS` | Liste de chemins de répertoires où les directives `$include` peuvent résoudre des fichiers en dehors du répertoire de configuration (par défaut : aucun — `$include` est limité au répertoire de configuration). Le tilde est développé.                                                                               |

## Journalisation

| Variable                         | Objectif                                                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | Remplacer le niveau de journalisation pour les fichiers et la console (par exemple `debug`, `trace`). A priorité sur `logging.level` et `logging.consoleLevel` dans la configuration. Les valeurs non valides sont ignorées avec un avertissement. |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | Émettre des diagnostics de minutage des requêtes/réponses du modèle ciblés au niveau `info` sans activer les journaux de débogage globaux.                                                                                                         |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | Diagnostics de la charge utile du modèle : `summary`, `tools` ou `full-redacted`. `full-redacted` est plafonné et expurgé, mais peut inclure le texte de l'invite/message.                                                                         |
| `OPENCLAW_DEBUG_SSE`             | Diagnostics de diffusion en continu (streaming) : `events` pour la minutage du premier/terminé, `peek` pour inclure les cinq premiers événements SSE expurgés.                                                                                     |
| `OPENCLAW_DEBUG_CODE_MODE`       | Diagnostics de surface du modèle en mode code, y compris le masquage des outils du fournisseur et l'application stricte de l'exécution ou de l'attente uniquement.                                                                                 |

### `OPENCLAW_HOME`

Lorsqu'elle est définie, `OPENCLAW_HOME` remplace le répertoire personnel du système (`$HOME` / `os.homedir()`OpenClaw) pour les chemins par défaut internes d'OpenClaw. Cela inclut le répertoire d'état par défaut, le chemin de configuration, les répertoires des agents, les identifiants, l'espace de travail d'intégration de l'installateur et l'extraction de développement par défaut utilisée par `openclaw update --channel dev`.

**Priorité :** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Termux `PREFIX`Android domicile de secours sur Android > `os.homedir()`

**Exemple** (LaunchDaemon macOS) :

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` peut également être défini sur un chemin tilde (par ex. `~/svc`), qui est développé en utilisant la même chaîne de repli de domicile OS avant utilisation.

Les variables de chemin explicites telles que `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH` et `OPENCLAW_GIT_DIR` prennent toujours la priorité. Les tâches liées au compte OS telles que la détection des fichiers de démarrage du shell, la configuration du gestionnaire de paquets et le développement de l'hôte `~` peuvent toujours utiliser le vrai système home.

## utilisateurs de nvm : échecs TLS web_fetch

Si Node.js a été installé via **nvm** (et non le gestionnaire de paquets du système), le `fetch()` intégré utilise
le magasin de CA groupé de nvm, qui peut manquer de CA racines modernes (ISRG Root X1/X2 pour Let's Encrypt,
DigiCert Global Root G2, etc.). Cela provoque l'échec de `web_fetch` avec `"fetch failed"` sur la plupart des sites HTTPS.

Sur Linux, OpenClaw détecte automatiquement nvm et applique le correctif dans l'environnement de démarrage réel :

- `openclaw gateway install` écrit `NODE_EXTRA_CA_CERTS` dans lvironnement du service systemd
- le point d'entrée `openclaw` CLI se réexécute lui-même avec `NODE_EXTRA_CA_CERTS` défini avant le démarrage de Node

**Correction manuelle (pour les versions anciennes ou les lancements directs `node ...`) :**

Exportez la variable avant de démarrer OpenClaw :

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

Ne comptez pas sur l'écriture uniquement dans `~/.openclaw/.env` pour cette variable ; Node lit
`NODE_EXTRA_CA_CERTS` au démarrage du processus.

## Variables d'environnement héritées

OpenClaw ne lit que les variables d'environnement `OPENCLAW_*`. Les préfixes hérités
`CLAWDBOT_*` et `MOLTBOT_*` des versions précédentes sont silencieusement
ignorés.

Si certains sont toujours définis sur le processus Gateway au démarrage, OpenClaw émet un
avertissement de dépréciation Node unique (`OPENCLAW_LEGACY_ENV_VARS`) listant les
préfixes détectés et le nombre total. Renommez chaque valeur en remplaçant le
préfixe hérité par `OPENCLAW_` (par exemple `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`) ; les anciens noms n'ont aucun effet.

## Connexes

- [Configuration du Gateway](/fr/gateway/configuration)
- [FAQ : env vars et chargement .env](/fr/help/faq#env-vars-and-env-loading)
- [Aperçu des modèles](/fr/concepts/models)
