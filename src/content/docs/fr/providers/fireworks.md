---
summary: "Configuration de Fireworks (auth + sélection de modèle)"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) expose des modèles à poids ouverts et routés via une API compatible OpenAI. API inclut désormais un plugin provider Fireworks groupé.

- Provider : `fireworks`
- Auth : `FIREWORKS_API_KEY`
- API : chat/completions compatible OpenAI
- URL de base : `https://api.fireworks.ai/inference/v1`
- Modèle par défaut : `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`

## Quick start

Configurez l'authentification Fireworks via l'onboarding :

```bash
openclaw onboard --auth-choice fireworks-api-key
```

Cela stocke votre clé Fireworks dans la configuration OpenClaw et définit le modèle de démarrage Fire Pass comme modèle par défaut.

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Note sur l'environnement

Si le Gateway s'exécute en dehors de votre shell interactif, assurez-vous que `FIREWORKS_API_KEY`
est également disponible pour ce processus. Une clé présente uniquement dans `~/.profile` ne sera
pas utile à un démon launchd/systemd, sauf si cet environnement y est également importé.

## Catalogue intégré

| Réf modèle                                             | Nom                         | Entrée      | Contexte | Max sortie | Notes                                               |
| ------------------------------------------------------ | --------------------------- | ----------- | -------- | ---------- | --------------------------------------------------- |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texte,image | 256 000  | 256 000    | Modèle de démarrage groupé par défaut sur Fireworks |

## Ids de modèle Fireworks personnalisés

OpenClaw accepte également les ids de modèle Fireworks dynamiques. Utilisez l'exact id de modèle ou de routeur affiché par Fireworks et préfixez-le avec `fireworks/`.

Exemple :

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

Si Fireworks publie un modèle plus récent tel qu'une nouvelle version de Qwen ou de Gemma, vous pouvez basculer directement dessus en utilisant son id de modèle Fireworks sans attendre de mise à jour du catalogue groupé.
