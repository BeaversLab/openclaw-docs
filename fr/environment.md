---
summary: "Où OpenClaw charge les environment variables et l'ordre de priorité"
read_when:
  - Vous devez savoir quelles env vars sont chargées et dans quel ordre
  - Vous déboguez des clés API manquantes dans le Gateway
  - Vous documentez l'authentification du provider ou les environnements de déploiement
title: "Environment Variables"
---

# Environment variables

OpenClaw récupère les environment variables à partir de plusieurs sources. La règle est **ne jamais remplacer les valeurs existantes**.

## Priorité (la plus élevée → la plus basse)

1. **Environnement de processus** (ce que le processus Gateway possède déjà à partir du shell/daemon parent).
2. **`.env` dans le répertoire de travail actuel** (dotenv par défaut ; ne remplace pas).
3. **`.env` global** à `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env` ; ne remplace pas).
4. **Bloc `env` de configuration** dans `~/.openclaw/openclaw.json` (appliqué uniquement si manquant).
5. **Import facultatif du shell de connexion** (`env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1`), appliqué uniquement pour les clés attendues manquantes.

Si le fichier de configuration est entièrement manquant, l'étape 4 est ignorée ; l'import du shell s'exécute toujours s'il est activé.

## Bloc `env` de configuration

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

## Substitution de variables d'environnement dans la configuration

Vous pouvez référencer les env vars directement dans les valeurs de chaîne de configuration en utilisant la syntaxe `${VAR_NAME}` :

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

Voir [Configuration : Substitution de variables d'environnement](/fr/gateway/configuration#env-var-substitution-in-config) pour plus de détails.

## Connexes

- [Configuration du Gateway](/fr/gateway/configuration)
- [FAQ : env vars et chargement .env](/fr/help/faq#env-vars-and-env-loading)
- [Aperçu des modèles](/fr/concepts/models)

import fr from "/components/footer/fr.mdx";

<fr />
