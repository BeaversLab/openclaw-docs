---
title: "Arcee AI"
summary: "Configuration Arcee AI (auth + sélection de modèle)"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) donne accès à la famille de modèles Trinity de type mixture-of-experts via une OpenAI compatible. Tous les modèles Trinity sont sous licence Apache 2.0.

Les modèles Arcee AI sont accessibles directement via la plateforme Arcee ou via [OpenRouter](/en/providers/openrouter).

- Fournisseur : `arcee`
- Auth : `ARCEEAI_API_KEY` (direct) ou `OPENROUTER_API_KEY` (via OpenRouter)
- API : compatible OpenAI
- URL de base : `https://api.arcee.ai/api/v1` (direct) ou `https://openrouter.ai/api/v1` (OpenRouter)

## Quick start

1. Obtenez une clé API auprès de [Arcee AI](https://chat.arcee.ai/) ou de [OpenRouter](https://openrouter.ai/keys).

2. Définissez la clé API (recommandé : stockez-la pour le Gateway) :

```bash
# Direct (Arcee platform)
openclaw onboard --auth-choice arceeai-api-key

# Via OpenRouter
openclaw onboard --auth-choice arceeai-openrouter
```

3. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "arcee/trinity-large-thinking" },
    },
  },
}
```

## Exemple non interactif

```bash
# Direct (Arcee platform)
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-api-key \
  --arceeai-api-key "$ARCEEAI_API_KEY"

# Via OpenRouter
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-openrouter \
  --openrouter-api-key "$OPENROUTER_API_KEY"
```

## Note sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `ARCEEAI_API_KEY`
(ou `OPENROUTER_API_KEY`) est disponible pour ce processus (par exemple, dans
`~/.openclaw/.env` ou via `env.shellEnv`).

## Catalogue intégré

OpenClaw fournit actuellement ce catalogue Arcee intégré :

| Réf modèle                     | Nom                    | Entrée | Contexte | Coût (entrée/sortie par 1M) | Notes                                       |
| ------------------------------ | ---------------------- | ------ | -------- | --------------------------- | ------------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | texte  | 256K     | 0,25 $ / 0,90 $             | Modèle par défaut ; raisonnement activé     |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | texte  | 128K     | 0,25 $ / 1,00 $             | Usage général ; 400B paramètres, 13B actifs |
| `arcee/trinity-mini`           | Trinity Mini 26B       | texte  | 128K     | 0,045 $ / 0,15 $            | Rapide et rentable ; appel de fonction      |

Les mêmes références de modèle fonctionnent pour les configurations directes et OpenRouter (par exemple `arcee/trinity-large-thinking`).

La préréglage d'intégration (onboarding) définit `arcee/trinity-large-thinking` comme modèle par défaut.

## Fonctionnalités prises en charge

- Streaming
- Utilisation d'outils / appel de fonction
- Sortie structurée (mode JSON et schéma JSON)
- Réflexion étendue (Trinity Large Thinking)
