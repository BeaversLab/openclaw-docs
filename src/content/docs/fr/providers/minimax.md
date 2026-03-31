---
summary: "Utiliser les modèles MiniMax dans OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

Le fournisseur OpenClaw de MiniMax est réglé par défaut sur **MiniMax M2.7**.

## Gamme de modèles

- `MiniMax-M2.7` : modèle de texte hébergé par défaut.
- `MiniMax-M2.7-highspeed` : niveau de texte M2.7 plus rapide.

## Choisir une configuration

### MiniMax OAuth (Coding Plan) - recommandé

**Idéal pour :** configuration rapide avec le MiniMax Coding Plan via OAuth, aucune clé API requise.

Activez le plug-in OAuth fourni et authentifiez-vous :

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Vous serez invité à sélectionner un point de terminaison :

- **Global** - Utilisateurs internationaux (`api.minimax.io`)
- **CN** - Utilisateurs en Chine (`api.minimaxi.com`)

Consultez le [README du plugin MiniMax](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) pour plus de détails.

### MiniMax M2.7 (clé API)

**Idéal pour :** MiniMax hébergé avec une API compatible MiniMax.

Configurer via CLI :

- Exécutez `openclaw configure`
- Sélectionnez **Modèle/auth**
- Choisissez une option d'authentification **MiniMax**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### MiniMax M2.7 comme solution de secours (exemple)

**Idéal pour :** gardez votre modèle le plus puissant de la dernière génération comme principal, basculez sur MiniMax M2.7.
L'exemple ci-dessous utilise Opus comme modèle principal concret ; remplacez-le par votre modèle principal de dernière génération préféré.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

## Configurer via `openclaw configure`

Utilisez l'assistant de configuration interactif pour configurer MiniMax sans modifier le JSON :

1. Exécutez `openclaw configure`.
2. Sélectionnez **Modèle/auth**.
3. Choisissez une option d'authentification **MiniMax**.
4. Choisissez votre model par défaut lorsque vous y êtes invité.

## Options de configuration

- `models.providers.minimax.baseUrl` : préférez `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est facultatif pour les charges utiles compatibles OpenAI.
- `models.providers.minimax.api` : préférez `anthropic-messages` ; `openai-completions` est optionnel pour les payloads compatibles avec OpenAI.
- `models.providers.minimax.apiKey` : clé MiniMax API (`MINIMAX_API_KEY`).
- `models.providers.minimax.models` : définir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models` : les alias des modèles que vous souhaitez dans la liste autorisée.
- `models.mode` : conservez `merge` si vous souhaitez ajouter MiniMax aux intégrations natives.

## Remarques

- Les références de modèle sont `minimax/<model>`.
- Modèle de texte par défaut : `MiniMax-M2.7`.
- Modèle de texte alternatif : `MiniMax-M2.7-highspeed`.
- Utilisation de l'API API : `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (nécessite une clé de plan de codage).
- Mettez à jour les valeurs de tarification dans `models.json` si vous avez besoin d'un suivi précis des coûts.
- Lien de parrainage pour MiniMax Coding Plan (10% de réduction) : [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Consultez [/concepts/model-providers](/en/concepts/model-providers) pour connaître les règles du provider.
- Utilisez `openclaw models list` et `openclaw models set minimax/MiniMax-M2.7` pour basculer.

## Dépannage

### "Unknown model: minimax/MiniMax-M2.7"

Cela signifie généralement que le **fournisseur MiniMax n'est pas configuré** (aucune entrée de fournisseur
et aucun profil de clé d'auth/env MiniMax trouvé). Un correctif pour cette détection est prévu dans
**2026.1.12**. Corriger en :

- Mise à niveau vers **2026.1.12** (ou exécution à partir de la source `main`), puis redémarrage de la passerelle.
- Exécution de `openclaw configure` et sélection d'une option d'auth **MiniMax**, ou
- Ajout manuel du bloc `models.providers.minimax`, ou
- Définir `MINIMAX_API_KEY` (ou un profil d'authentification MiniMax) afin que le fournisseur puisse être injecté.

Assurez-vous que l'identifiant du model est sensible à la casse :

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

Vérifiez ensuite avec :

```bash
openclaw models list
```
