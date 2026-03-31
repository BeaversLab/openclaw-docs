---
summary: "Où OpenClaw charge les variables d'environnement et l'ordre de priorité"
read_when:
  - You need to know which env vars are loaded, and in what order
  - You are debugging missing API keys in the Gateway
  - You are documenting provider auth or deployment environments
title: "Variables d'environnement"
---

# Variables d'environnement

OpenClaw récupère les variables d'environnement à partir de plusieurs sources. La règle est **ne jamais remplacer les valeurs existantes**.

## Priorité (la plus élevée → la plus basse)

1. **Environnement de processus** (ce que le processus Gateway possède déjà du shell/parent démon).
2. **`.env` dans le répertoire de travail actuel** (dotenv par défaut ; ne remplace pas).
3. **`.env` global** à `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env` ; ne remplace pas).
4. **Bloc de configuration `env`** dans `~/.openclaw/openclaw.json` (appliqué uniquement si manquant).
5. **Import facultatif du shell de connexion** (`env.shellEnv.enabled` ou `OPENCLAW_LOAD_SHELL_ENV=1`), appliqué uniquement pour les clés attendues manquantes.

Si le fichier de configuration est entièrement manquant, l'étape 4 est ignorée ; l'import du shell s'exécute toujours s'il est activé.

## Bloc de configuration `env`

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

## Substitution de variable d'environnement dans la configuration

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

Voir [Configuration : Substitution de variable d'environnement](/en/gateway/configuration#env-var-substitution-in-config) pour plus de détails.

## Connexes

- [Configuration du Gateway](/en/gateway/configuration)
- [FAQ : env vars et chargement .env](/en/help/faq#env-vars-and-env-loading)
- [Aperçu des modèles](/en/concepts/models)
