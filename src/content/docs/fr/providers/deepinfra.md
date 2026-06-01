---
summary: "APIOpenClawUtilisez l'API unifiée de DeepInfra pour accéder aux modèles open source et de pointe les plus populaires dans OpenClaw"
read_when:
  - You want a single API key for the top open source LLMs
  - You want to run models via DeepInfra's API in OpenClaw
title: "DeepInfra"
---

DeepInfra fournit une **API unifiée** qui achemine les demandes vers les modèles open source et de pointe les plus populaires derrière un seul point de terminaison et une seule clé API. Elle est compatible OpenAI, la plupart des SDK OpenAI fonctionnent donc en changeant l'URL de base.

## Obtenir une clé API

1. Accédez à [https://deepinfra.com/](https://deepinfra.com/)
2. Connectez-vous ou créez un compte
3. Accédez à Dashboard / Keys et générez une nouvelle clé API ou utilisez celle créée automatiquement

## Configuration de la CLI

```bash
openclaw onboard --deepinfra-api-key <key>
```

Ou définissez la variable d'environnement :

```bash
export DEEPINFRA_API_KEY="<your-deepinfra-api-key>" # pragma: allowlist secret
```

## Extrait de configuration

```json5
{
  env: { DEEPINFRA_API_KEY: "<your-deepinfra-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "deepinfra/deepseek-ai/DeepSeek-V4-Flash" },
    },
  },
}
```

## Surfaces OpenClaw prises en charge

Le plugin inclus enregistre toutes les surfaces DeepInfra qui correspondent aux contrats actuels du fournisseur OpenClaw. Le chat, la génération d'images et la génération de vidéos actualisent leurs catalogues de modèles en direct à partir de `/v1/openai/models?sort_by=openclaw&filter=with_meta`
lorsque `DEEPINFRA_API_KEY` est configuré ; les autres surfaces utilisent les paramètres statiques sélectionnés ci-dessous.

| Surface                      | Modèle par défaut                                                                                                             | Config/tool OpenClaw                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Chat / fournisseur de modèle | première entrée étiquetée pour le chat à partir du catalogue en direct (secours du manifeste `deepseek-ai/DeepSeek-V4-Flash`) | `agents.defaults.model`                                  |
| Génération/édition d'images  | première entrée étiquetée `image-gen` à partir du catalogue en direct (secours statique `black-forest-labs/FLUX-1-schnell`)   | `image_generate`, `agents.defaults.imageGenerationModel` |
| Compréhension des médias     | `moonshotai/Kimi-K2.5` pour les images                                                                                        | compréhension des images entrantes                       |
| Speech-to-text               | `openai/whisper-large-v3-turbo`                                                                                               | transcription audio entrante                             |
| Text-to-speech               | `hexgrad/Kokoro-82M`                                                                                                          | `messages.tts.provider: "deepinfra"`                     |
| Génération vidéo             | première entrée étiquetée `video-gen` à partir du catalogue en direct (secours statique `Pixverse/Pixverse-T2V`)              | `video_generate`, `agents.defaults.videoGenerationModel` |
| Intégrations de mémoire      | `BAAI/bge-m3`                                                                                                                 | `agents.defaults.memorySearch.provider: "deepinfra"`     |

DeepInfra expose également le reranking, la classification, la détection d'objets et d'autres types de modèles natifs. OpenClaw ne dispose pas actuellement de contrats de fournisseur de premier ordre pour ces catégories, ce plugin ne les enregistre donc pas encore.

## Modèles disponibles

OpenClaw découvre dynamiquement les modèles DeepInfra disponibles au démarrage. Utilisez
`/models deepinfra` pour voir la liste complète des modèles disponibles.

Tout modèle disponible sur [DeepInfra.com](https://deepinfra.com/) peut être utilisé avec le préfixe `deepinfra/` :

```
deepinfra/deepseek-ai/DeepSeek-V4-Flash
deepinfra/deepseek-ai/DeepSeek-V3.2
deepinfra/MiniMaxAI/MiniMax-M2.5
deepinfra/moonshotai/Kimi-K2.5
deepinfra/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B
deepinfra/zai-org/GLM-5.1
...and many more
```

## Notes

- Les références de modèle sont `deepinfra/<provider>/<model>` (par ex., `deepinfra/Qwen/Qwen3-Max`).
- Modèle par défaut : `deepinfra/deepseek-ai/DeepSeek-V4-Flash`
- URL de base : `https://api.deepinfra.com/v1/openai`
- La génération vidéo native utilise `https://api.deepinfra.com/v1/inference/<model>`.

## Connexes

- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [Tous les fournisseurs](/fr/providers/index)
