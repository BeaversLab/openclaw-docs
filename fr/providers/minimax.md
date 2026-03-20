---
summary: "Utiliser MiniMax M2.5 dans OpenClaw"
read_when:
  - Vous souhaitez des modèles MiniMax dans OpenClaw
  - Vous avez besoin de conseils de configuration MiniMax
title: "MiniMax"
---

# MiniMax

MiniMax est une entreprise d'IA qui développe la famille de modèles **M2/M2.5**. La version
actuelle axée sur le codage est **MiniMax M2.5** (23 décembre 2025), conçue pour
des tâches complexes du monde réel.

Source : [note de version MiniMax M2.5](https://www.minimax.io/news/minimax-m25)

## Aperçu du modèle (M2.5)

MiniMax souligne ces améliorations dans M2.5 :

- **Codage multi-langage** plus performant (Rust, Java, Go, C++, Kotlin, Objective-C, TS/JS).
- Meilleur **développement web/application** et meilleure qualité de sortie esthétique (y compris mobile natif).
- Gestion améliorée des **instructions composites** pour les flux de travail de type bureautique, s'appuyant sur
  une réflexion entrelacée et une exécution de contraintes intégrée.
- **Réponses plus concises** avec une utilisation moindre de jetons et des boucles d'itération plus rapides.
- Meilleure compatibilité avec les **frameworks d'outils/agents** et gestion du contexte (Claude Code,
  Droid/Factory AI, Cline, Kilo Code, Roo Code, BlackBox).
- Sorties de **dialogue et rédaction technique** de meilleure qualité.

## MiniMax M2.5 vs MiniMax M2.5 Highspeed

- **Vitesse :** `MiniMax-M2.5-highspeed` est le niveau de vitesse officiel dans la documentation MiniMax.
- **Coût :** La tarification MiniMax indique le même coût d'entrée et un coût de sortie plus élevé pour la version haute vitesse.
- **ID de modèle actuels :** utilisez `MiniMax-M2.5` ou `MiniMax-M2.5-highspeed`.

## Choisir une configuration

### MiniMax OAuth (Coding Plan) - recommandé

**Idéal pour :** configuration rapide avec le Coding Plan MiniMax via OAuth, aucune clé API requise.

Activez le plugin OAuth inclus et authentifiez-vous :

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Un message vous invitera à sélectionner un point de terminaison :

- **Global** - Utilisateurs internationaux (`api.minimax.io`)
- **CN** - Utilisateurs en Chine (`api.minimaxi.com`)

Consultez le [README du plugin MiniMax](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) pour plus de détails.

### MiniMax M2.5 (clé API)

**Idéal pour :** MiniMax hébergé avec une Anthropic compatible API.

Configurer via CLI :

- Exécutez `openclaw configure`
- Sélectionnez **Model/auth**
- Choisissez **MiniMax M2.5**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.5" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
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

### MiniMax M2.5 en secours (exemple)

**Idéal pour :** conserver votre modèle le plus puissant de la dernière génération comme principal, basculer sur MiniMax M2.5 en cas d'échec.
L'exemple ci-dessous utilise Opus comme modèle principal concret ; remplacez-le par votre modèle principal de dernière génération préféré.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
    },
  },
}
```

### Optionnel : Local via LM Studio (manuel)

**Idéal pour :** inférence locale avec LM Studio.
Nous avons observé de bons résultats avec MiniMax M2.5 sur du matériel puissant (ex. :
un ordinateur de bureau/serveur) en utilisant le serveur local de LM Studio.

Configurez manuellement via `openclaw.json` :

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

## Configurez via `openclaw configure`

Utilisez l'assistant de configuration interactif pour définir MiniMax sans modifier le JSON :

1. Exécutez `openclaw configure`.
2. Sélectionnez **Modèle/auth**.
3. Choisissez **MiniMax M2.5**.
4. Choisissez votre modèle par défaut lorsque vous y êtes invité.

## Options de configuration

- `models.providers.minimax.baseUrl` : préférez `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est optionnel pour les payloads compatibles OpenAI.
- `models.providers.minimax.api` : préférez `anthropic-messages` ; `openai-completions` est optionnel pour les payloads compatibles OpenAI.
- `models.providers.minimax.apiKey` : clé MiniMax API (`MINIMAX_API_KEY`).
- `models.providers.minimax.models` : définissez `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models` : alias des modèles que vous souhaitez dans la liste d'autorisation.
- `models.mode` : conservez `merge` si vous souhaitez ajouter MiniMax aux intégrations natives.

## Notes

- Les références de modèle sont `minimax/<model>`.
- ID de modèles recommandés : `MiniMax-M2.5` et `MiniMax-M2.5-highspeed`.
- API d'utilisation du Coding Plan : `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (nécessite une clé de coding plan).
- Mettez à jour les valeurs de tarification dans `models.json` si vous avez besoin d'un suivi précis des coûts.
- Lien de parrainage pour le Coding Plan MiniMax (10 % de réduction) : [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Voir [/concepts/model-providers](/fr/concepts/model-providers) pour les règles du provider.
- Utilisez `openclaw models list` et `openclaw models set minimax/MiniMax-M2.5` pour basculer.

## Dépannage

### "Unknown model: minimax/MiniMax-M2.5"

Cela signifie généralement que le **provider MiniMax n'est pas configuré** (aucune entrée de provider
et aucun profil de clé d'environnement/auth MiniMax trouvé). Une correction pour cette détection est prévue
dans la version **2026.1.12** (non publiée au moment de la rédaction). Corrigez en :

- Mise à niveau vers **2026.1.12** (ou exécution à partir de la source `main`), puis redémarrage de la passerelle.
- Exécution de `openclaw configure` et sélection de **MiniMax M2.5**, ou
- Ajout manuel du bloc `models.providers.minimax`, ou
- Définition de `MINIMAX_API_KEY` (ou d'un profil d'authentification MiniMax) pour que le fournisseur puisse être injecté.

Assurez-vous que l'ID du modèle est **sensible à la casse** :

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

Vérifiez ensuite avec :

```bash
openclaw models list
```

import en from "/components/footer/en.mdx";

<en />
