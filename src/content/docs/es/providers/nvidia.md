---
summary: "Usa la API compatible con OpenAI de NVIDIA en OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA proporciona una API compatible con OpenAI en `https://integrate.api.nvidia.com/v1` para modelos abiertos de forma gratuita. Autentícate con una clave API de [build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Configuración de CLI

Exporta la clave una vez, luego ejecuta la incorporación (onboarding) y establece un modelo NVIDIA:

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
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
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## IDs de modelo

| Ref. de modelo                             | Nombre                       | Contexto | Salida máxima |
| ------------------------------------------ | ---------------------------- | -------- | ------------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192         |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192         |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608  | 8,192         |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752  | 8,192         |

## Notas

- Punto final `/v1` compatible con OpenAI; usa una clave API de [build.nvidia.com](https://build.nvidia.com/).
- El proveedor se activa automáticamente cuando se establece `NVIDIA_API_KEY`.
- El catálogo incluido es estático; los costos predeterminados son `0` en la fuente.
