---
summary: "Configuration DeepSeek (auth + sélection du modèle)"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) fournit des modèles d'IA puissants avec une API compatible OpenAI.

- Fournisseur : `deepseek`
- Auth : `DEEPSEEK_API_KEY`
- API : compatible OpenAI
- URL de base : `https://api.deepseek.com`

## Quick start

Définissez la clé API (recommandé : stockez-la pour le Gateway) :

```bash
openclaw onboard --auth-choice deepseek-api-key
```

Cela vous demandera votre clé API et définira `deepseek/deepseek-chat` comme modèle par défaut.

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice deepseek-api-key \
  --deepseek-api-key "$DEEPSEEK_API_KEY" \
  --skip-health \
  --accept-risk
```

## Note sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `DEEPSEEK_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Catalogue intégré

| Réf du modèle                | Nom               | Entrée | Contexte | Max sortie | Notes                                                      |
| ---------------------------- | ----------------- | ------ | -------- | ---------- | ---------------------------------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text   | 131 072  | 8 192      | Modèle par défaut ; surface non réflexive de DeepSeek V3.2 |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text   | 131 072  | 65 536     | Surface V3.2 avec capacités de raisonnement                |

Les deux modèles inclus annoncent actuellement une compatibilité d'utilisation en streaming dans la source.

Obtenez votre clé API sur [platform.deepseek.com](https://platform.deepseek.com/api_keys).
