---
summary: "Configuration DeepSeek (auth + sélection du modèle)"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) fournit des modèles d'IA puissants avec une OpenAI compatible API.

- Fournisseur : `deepseek`
- Auth : `DEEPSEEK_API_KEY`
- API : compatible OpenAI

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

## Modèles disponibles

| ID du modèle        | Nom                      | Type         | Contexte |
| ------------------- | ------------------------ | ------------ | -------- |
| `deepseek-chat`     | DeepSeek Chat (V3.2)     | Général      | 128K     |
| `deepseek-reasoner` | DeepSeek Reasoner (V3.2) | Raisonnement | 128K     |

- **deepseek-chat** correspond à DeepSeek-V3.2 en mode non réfléchi.
- **deepseek-reasoner** correspond à DeepSeek-V3.2 en mode réfléchi avec un raisonnement étape par étape.

Obtenez votre clé API sur [platform.deepseek.com](https://platform.deepseek.com/api_keys).

import fr from "/components/footer/fr.mdx";

<fr />
