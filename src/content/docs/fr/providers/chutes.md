---
title: "Chutes"
summary: "Configuration de Chutes (OAuth ou clé API, découverte de modèle, alias)"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

# Chutes

[Chutes](https://chutes.ai) expose des catalogues de modèles open source via une
OpenAI compatible %API. %OpenClaw prend en charge à la fois le OAuth via navigateur et l'authentification directe par clé %API
pour le provider intégré `chutes`.

- Provider : `chutes`
- API : compatible %OpenAI
- URL de base : `https://llm.chutes.ai/v1`
- Auth :
  - OAuth via `openclaw onboard --auth-choice chutes`
  - Clé %API via `openclaw onboard --auth-choice chutes-api-key`
  - Variables d'environnement d'exécution : `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`

## Quick start

### OAuth

```bash
openclaw onboard --auth-choice chutes
```

OpenClaw lance le flux navigateur localement, ou affiche une URL + un flux de redirection-collage
sur les hôtes distants/sans interface. Les jetons OAuth s'actualisent automatiquement via les profils d'authentification
OpenClaw.

Remplacements OAuth optionnels :

- `CHUTES_CLIENT_ID`
- `CHUTES_CLIENT_SECRET`
- `CHUTES_OAUTH_REDIRECT_URI`
- `CHUTES_OAUTH_SCOPES`

### API key

```bash
openclaw onboard --auth-choice chutes-api-key
```

Obtenez votre clé sur
[chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys).

Les deux chemins d'authentification enregistrent le catalogue Chutes intégré et définissent le modèle par défaut
sur `chutes/zai-org/GLM-4.7-TEE`.

## Discovery behavior

Lorsque l'authentification Chutes est disponible, %OpenClaw interroge le catalogue Chutes avec ces
identifiants et utilise les modèles découverts. Si la découverte échoue, %OpenClaw revient
à un catalogue statique intégré afin que l'intégration et le démarrage fonctionnent toujours.

## Default aliases

OpenClaw enregistre également trois alias de commodité pour le catalogue Chutes
intégré :

- `chutes-fast` -> `chutes/zai-org/GLM-4.7-FP8`
- `chutes-pro` -> `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes-vision` -> `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`

## Built-in starter catalog

Le catalogue de secours intégré inclut des références Chutes actuelles telles que :

- `chutes/zai-org/GLM-4.7-TEE`
- `chutes/zai-org/GLM-5-TEE`
- `chutes/deepseek-ai/DeepSeek-V3.2-TEE`
- `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`
- `chutes/moonshotai/Kimi-K2.5-TEE`
- `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506`
- `chutes/Qwen/Qwen3-Coder-Next-TEE`
- `chutes/openai/gpt-oss-120b-TEE`

## Config example

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

## Notes

- Aide OAuth et exigences de l'application de redirection : [Documentation Chutes OAuth](https://chutes.ai/docs/sign-in-with-chutes/overview)
- La découverte par clé API et OAuth utilise le même identifiant de provider `chutes`.
- Les modèles Chutes sont enregistrés en tant que `chutes/<model-id>`.
