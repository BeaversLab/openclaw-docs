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
- `image-01` : modèle de génération d'images (génération et retouche image-à-image).

## Génération d'images

Le plugin MiniMax enregistre le modèle `image-01` pour l'outil `image_generate`. Il prend en charge :

- **Génération de texte vers image** avec contrôle des proportions.
- **Retouche d'image vers image** (référence de sujet) avec contrôle des proportions.
- Ratios d'aspect pris en charge : `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`.

Pour utiliser MiniMax pour la génération d'images, définissez-le comme fournisseur de génération d'images :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

Le plugin utilise la même authentification `MINIMAX_API_KEY` ou OAuth que les modèles de texte. Aucune configuration supplémentaire n'est nécessaire si MiniMax est déjà configuré.

## Choisir une configuration

### MiniMax MiniMax (Coding Plan) - recommandé

**Idéal pour :** configuration rapide avec MiniMax Coding Plan via MiniMax, aucune clé OAuth requise.

Activez le plugin OAuth inclus et authentifiez-vous :

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Il vous sera demandé de sélectionner un point de terminaison :

- **Global** - Utilisateurs internationaux (`api.minimax.io`)
- **CN** - Utilisateurs en Chine (`api.minimaxi.com`)

Consultez le fichier README du package du plugin MiniMax dans le dépôt MiniMax pour plus de détails.

### MiniMax M2.7 (clé MiniMax)

**Idéal pour :** MiniMax hébergé avec une MiniMax compatible Anthropic.

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

### MiniMax M2.7 en secours (exemple)

**Idéal pour :** gardez votre modèle le plus puissant de la dernière génération comme principal, basculez vers MiniMax M2.7 en cas d'échec.
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

Utilisez l'assistant de configuration interactif pour définir MiniMax sans modifier le JSON :

1. Exécutez `openclaw configure`.
2. Sélectionnez **Modèle/auth**.
3. Choisissez une option d'authentification **MiniMax**.
4. Choisissez votre modèle par défaut lorsque vous y êtes invité.

## Options de configuration

- `models.providers.minimax.baseUrl` : préférez `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est facultatif pour les charges utiles compatibles OpenAI.
- `models.providers.minimax.api` : préférez `anthropic-messages` ; `openai-completions` est facultatif pour les payloads compatibles OpenAI.
- `models.providers.minimax.apiKey` : clé MiniMax API (`MINIMAX_API_KEY`).
- `models.providers.minimax.models` : définissez `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models` : des alias pour les modèles que vous souhaitez dans la liste autorisée.
- `models.mode` : gardez `merge` si vous souhaitez ajouter MiniMax aux intégrés.

## Remarques

- Les références de modèle sont `minimax/<model>`.
- Modèle de texte par défaut : `MiniMax-M2.7`.
- Modèle de texte alternatif : `MiniMax-M2.7-highspeed`.
- API d'utilisation du Coding Plan : `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (nécessite une clé de plan de codage).
- Mettez à jour les valeurs de tarification dans `models.json` si vous avez besoin d'un suivi précis des coûts.
- Lien de parrainage pour le Coding Plan MiniMax (10 % de réduction) : [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Voir [/concepts/model-providers](/en/concepts/model-providers) pour les règles du fournisseur.
- Utilisez `openclaw models list` et `openclaw models set minimax/MiniMax-M2.7` pour basculer.

## Dépannage

### "Unknown model: minimax/MiniMax-M2.7"

Cela signifie généralement que le **fournisseur MiniMax n'est pas configuré** (aucune entrée de fournisseur
et aucun profil de clé d'auth/env MiniMax trouvé). Un correctif pour cette détection est prévu
dans **2026.1.12**. Corrigez par :

- Mise à niveau vers **2026.1.12** (ou exécution depuis la source `main`), puis redémarrage de la passerelle.
- Exécution de `openclaw configure` et sélection d'une option d'authentification **MiniMax**, ou
- Ajout manuel du bloc `models.providers.minimax`, ou
- Configuration de `MINIMAX_API_KEY` (ou d'un profil d'authentification MiniMax) afin que le fournisseur puisse être injecté.

Assurez-vous que l'ID du modèle est **sensible à la casse** :

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

Vérifiez ensuite avec :

```bash
openclaw models list
```
