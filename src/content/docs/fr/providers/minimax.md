---
summary: "Utiliser les modèles MiniMax dans OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

Le fournisseur MiniMax d'OpenClaw utilise par défaut **MiniMax M2.7** et conserve
**MiniMax M2.5** dans le catalogue pour la compatibilité.

## Gamme de modèles

- `MiniMax-M2.7` : modèle de texte hébergé par défaut.
- `MiniMax-M2.7-highspeed` : niveau de texte M2.7 plus rapide.
- `MiniMax-M2.5` : modèle de texte précédent, toujours disponible dans le catalogue MiniMax.
- `MiniMax-M2.5-highspeed` : niveau de texte M2.5 plus rapide.
- `MiniMax-VL-01` : modèle de vision pour les entrées texte + image.

## Choisir une configuration

### MiniMax OAuth (Coding Plan) - recommandé

**Idéal pour :** configuration rapide avec le Coding Plan MiniMax via OAuth, aucune clé API requise.

Activez le plugin OAuth inclus et authentifiez-vous :

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

**Idéal pour :** MiniMax hébergé avec API compatible Anthropic.

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
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5-highspeed",
            name: "MiniMax M2.5 Highspeed",
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

### MiniMax M2.7 comme repli (exemple)

**Idéal pour :** conserver votre modèle le plus puissant de la dernière génération comme principal, basculer vers MiniMax M2.7 en cas de défaillance.
L'exemple ci-dessous utilise Opus comme principal concret ; remplacez-le par votre modèle principal de dernière génération préféré.

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

### Optionnel : Local via LM Studio (manuel)

**Idéal pour :** inférence locale avec LM Studio.
Nous avons obtenu de bons résultats avec MiniMax M2.5 sur du matériel puissant (par ex. un
desktop/serveur) en utilisant le serveur local de LM Studio.

Configurer manuellement via `openclaw.json` :

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Configurer via `openclaw configure`

Utilisez l'assistant de configuration interactif pour définir MiniMax sans modifier JSON :

1. Exécutez `openclaw configure`.
2. Sélectionnez **Modèle/auth**.
3. Choisissez une option d'authentification **MiniMax**.
4. Choisissez votre modèle par défaut lorsque vous y êtes invité.

## Options de configuration

- `models.providers.minimax.baseUrl` : préférez `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est optionnel pour les payloads compatibles OpenAI.
- `models.providers.minimax.api`: préférez `anthropic-messages`; `openai-completions` est facultatif pour les charges utiles compatibles OpenAI.
- `models.providers.minimax.apiKey`: clé MiniMax API (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: définissez `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: créez des alias pour les modèles que vous souhaitez dans la liste verte.
- `models.mode`: gardez `merge` si vous souhaitez ajouter MiniMax en plus des intégrés.

## Notes

- Les références de modèle sont `minimax/<model>`.
- Modèle de texte par défaut : `MiniMax-M2.7`.
- Modèles de texte alternatifs : `MiniMax-M2.7-highspeed`, `MiniMax-M2.5`, `MiniMax-M2.5-highspeed`.
- API d'utilisation du Coding Plan : `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (nécessite une clé de coding plan).
- Mettez à jour les valeurs de tarification dans `models.json` si vous avez besoin d'un suivi précis des coûts.
- Lien de parrainage pour le Coding Plan MiniMax (10% de réduction) : [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Consultez [/concepts/model-providers](/fr/concepts/model-providers) pour les règles du provider.
- Utilisez `openclaw models list` et `openclaw models set minimax/MiniMax-M2.7` pour basculer.

## Dépannage

### "Unknown model: minimax/MiniMax-M2.7"

Cela signifie généralement que le **fournisseur MiniMax n’est pas configuré** (aucune entrée de fournisseur
et aucun profil de clé d’auth/env MiniMax trouvé). Une correction pour cette détection est prévue dans
**2026.1.12**. Corriger par :

- Mise à niveau vers **2026.1.12** (ou exécution depuis la source `main`), puis redémarrage de la passerelle.
- Exécution de `openclaw configure` et sélection d'une option d'authentification **MiniMax**, ou
- Ajout manuel du bloc `models.providers.minimax`, ou
- Configuration de `MINIMAX_API_KEY` (ou d'un profil d'authentification MiniMax) afin que le provider puisse être injecté.

Assurez-vous que l'identifiant du modèle respecte la **casse** :

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`
- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

Vérifiez ensuite avec :

```bash
openclaw models list
```
