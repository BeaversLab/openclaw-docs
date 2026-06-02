---
summary: "OpenAIAPIOpenClawUtilisez l'API compatible OpenAI de GMI Cloud avec OpenClaw"
read_when:
  - You want to run OpenClaw with GMI Cloud models
  - You need the GMI provider id, key, or endpoint
title: "GMI Cloud"
---

GMI Cloud est une plateforme d'inférence hébergée pour les modèles de pointe et à poids ouverts
derrière une API compatible OpenAI. Dans OpenClaw, il s'agit d'un provider de modèle inclus,
ce qui signifie que vous pouvez le sélectionner avec l'id de provider OpenAIAPIOpenClaw`gmi`, stocker les identifiants
via l'authentification de modèle normale, et utiliser des références de modèle comme
`gmi/google/gemini-3.1-flash-lite`.

Utilisez GMI lorsque vous souhaitez une clé API pour plusieurs familles de modèles hébergés, y compris
Google, Anthropic, OpenAI, DeepSeek, Moonshot, et les routes Z.AI exposées par le
catalogue de GMI. C'est utile comme provider secondaire pour le basculement de modèle (fallback), pour comparer
les routes hébergées entre différents fournisseurs, ou lorsque GMI a un modèle disponible avant que
votre provider principal ne le fasse.

Ce provider utilise la sémantique de chat compatible OpenAI. OpenClaw possède l'id de
provider, le profil d'authentification, les alias, l'amorce du catalogue de modèles et l'URL de base ; GMI possède la
disponibilité des modèles en direct, la facturation, les limites de débit et toute politique de routage côté provider.

## Configuration

Créez une clé API dans GMI Cloud, puis exécutez :

```bash
openclaw onboard --auth-choice gmi-api-key
```

Ou définissez :

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## Valeurs par défaut

- Provider : `gmi`
- Alias : `gmi-cloud`, `gmicloud`
- URL de base : `https://api.gmi-serving.com/v1`
- Variable d'env : `GMI_API_KEY`
- Modèle par défaut : `gmi/google/gemini-3.1-flash-lite`

## Quand choisir GMI

- Vous souhaitez un point de terminaison hébergé compatible OpenAI plutôt qu'un serveur de modèle local.
- Vous souhaitez essayer plusieurs familles de modèles commerciaux et à poids ouverts via un
  compte provider unique.
- Vous souhaitez un provider de secours avec un routage en amont différent de OpenRouter,
  DeepInfra, Together, ou des API directes des vendeurs.
- Vous avez besoin d'ids de modèle spécifiques à GMI, de tarifs ou de contrôles de compte.

Choisissez plutôt le fournisseur direct du vendeur lorsque vous avez besoin de fonctionnalités natives que GMI n'expose pas via sa route compatible OpenAI. Choisissez un fournisseur local tel que Ollama, LM Studio, vLLM ou SGLang lorsque la localité des données ou le contrôle du GPU local est plus important que la commodité de l'hébergement.

## Modèles

Le catalogue inclus fournit des identifiants de route GMI Cloud couramment disponibles, notamment :

- `gmi/zai-org/GLM-5.1-FP8`
- `gmi/deepseek-ai/DeepSeek-V3.2`
- `gmi/moonshotai/Kimi-K2.5`
- `gmi/google/gemini-3.1-flash-lite`
- `gmi/anthropic/claude-sonnet-4.6`
- `gmi/openai/gpt-5.4`

Le catalogue est une base, et non une promesse que chaque compte peut appeler chaque modèle à tout moment. Utilisez la commande de liste de modèles d'OpenClaw pour voir ce que le fournisseur configuré signale dans votre environnement :

```bash
openclaw models list --provider gmi
```

## Dépannage

- `401` ou `403` : vérifiez que `GMI_API_KEY` est défini pour le processus exécutant OpenClaw, ou relancez l'intégration pour stocker la clé dans le profil d'authentification du fournisseur.
- Erreurs de modèle inconnu : confirmez que le modèle existe dans votre compte GMI et utilisez la référence complète `gmi/<route-id>` affichée par `openclaw models list --provider gmi`.
- Erreurs intermittentes du fournisseur : essayez une route GMI différente ou configurez GMI comme solution de repli plutôt que comme seul fournisseur de modèle principal.

## Connexes

- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [Tous les fournisseurs](/fr/providers/index)
