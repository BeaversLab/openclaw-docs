---
summary: "Usa la API compatible con OpenAI de NVIDIA en OpenClaw"
read_when:
  - You want to use NVIDIA models in OpenClaw
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA proporciona una API compatible con OpenAI en `https://integrate.api.nvidia.com/v1` para los modelos Nemotron y NeMo. Autentíquese con una clave de API de [NVIDIA NGC](https://catalog.ngc.nvidia.com/).

## Configuración de CLI

Exporta la clave una vez, luego ejecuta la incorporación (onboarding) y establece un modelo NVIDIA:

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
```

Si aún pasas `--token`, recuerda que queda en el historial de la shell y en la salida de `ps`; prefiere la variable de entorno cuando sea posible.

## Fragmento de configuración

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/llama-3.1-nemotron-70b-instruct" },
    },
  },
}
```

## IDs de modelo

| Ref. de modelo                                       | Nombre                                   | Contexto | Salida máxima |
| ---------------------------------------------------- | ---------------------------------------- | -------- | ------------- |
| `nvidia/nvidia/llama-3.1-nemotron-70b-instruct`      | NVIDIA Llama 3.1 Nemotron 70B Instruct   | 131,072  | 4,096         |
| `nvidia/meta/llama-3.3-70b-instruct`                 | Meta Llama 3.3 70B Instruct              | 131,072  | 4,096         |
| `nvidia/nvidia/mistral-nemo-minitron-8b-8k-instruct` | NVIDIA Mistral NeMo Minitron 8B Instruct | 8,192    | 2,048         |

## Notas

- Endpoint `/v1` compatible con OpenAI; use una clave de API de NVIDIA NGC.
- El proveedor se activa automáticamente cuando se establece `NVIDIA_API_KEY`.
- El catálogo incluido es estático; los costos predeterminados son `0` en el origen.
