---
summary: "Usar Qwen Cloud a través del proveedor qwen incluido en OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth ha sido eliminado.** La integración OAuth de nivel gratuito
(`qwen-portal`) que utilizaba endpoints `portal.qwen.ai` ya no está disponible.
Consulte el [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) para obtener
antecedentes.

</Warning>

## Recomendado: Qwen Cloud

OpenClaw ahora trata a Qwen como un proveedor incluido de primera clase con id canónico
`qwen`. El proveedor incluido tiene como objetivo los endpoints de Qwen Cloud / Alibaba DashScope y
del Coding Plan y mantiene los ids `modelstudio` heredados funcionando como
un alias de compatibilidad.

- Proveedor: `qwen`
- Variable de entorno preferida: `QWEN_API_KEY`
- También aceptados por compatibilidad: `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Estilo de API: Compatible con OpenAI

Si desea `qwen3.6-plus`, prefiera el endpoint **Estándar (pago por uso)**.
El soporte del Coding Plan puede ir por detrás del catálogo público.

```bash
# Global Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key

# China Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key-cn

# Global Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key

# China Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key-cn
```

Los ids de elección de autenticación `modelstudio-*` heredados y las referencias de modelo `modelstudio/...` todavía
funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deben preferir los ids de elección de autenticación
canónicos `qwen-*` y las referencias de modelo `qwen/...`.

Después del registro, configure un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "qwen/qwen3.5-plus" },
    },
  },
}
```

## Tipos de plan y endpoints

| Plan                      | Región | Opción de autenticación    | Endpoint                                         |
| ------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| Estándar (pago por uso)   | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Estándar (pago por uso)   | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (suscripción) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (suscripción) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

El proveedor selecciona automáticamente el endpoint según su elección de autenticación. Las opciones
canónicas utilizan la familia `qwen-*`; `modelstudio-*` permanece solo para compatibilidad.
Puede anularlo con un `baseUrl` personalizado en la configuración.

Los puntos de conexión nativos de Model Studio anuncian compatibilidad de uso de streaming en el transporte `openai-completions` compartido. Las claves de OpenClaw que ahora inhabilitan las capacidades del punto de conexión, por lo que los ID de proveedor personalizados compatibles con DashScope que apuntan a los mismos hosts nativos heredan el mismo comportamiento de uso de streaming en lugar de requerir específicamente el ID de proveedor `qwen` incorporado.

## Obtén tu clave de API

- **Gestionar claves**: [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys)
- **Documentación**: [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)

## Catálogo incorporado

Actualmente, OpenClaw incluye este catálogo de Qwen:

| Ref. de modelo              | Entrada       | Contexto  | Notas                                                                |
| --------------------------- | ------------- | --------- | -------------------------------------------------------------------- |
| `qwen/qwen3.5-plus`         | texto, imagen | 1,000,000 | Modelo predeterminado                                                |
| `qwen/qwen3.6-plus`         | texto, imagen | 1,000,000 | Prefiera los puntos de conexión Estándar cuando necesite este modelo |
| `qwen/qwen3-max-2026-01-23` | texto         | 262,144   | Línea Qwen Max                                                       |
| `qwen/qwen3-coder-next`     | texto         | 262,144   | Codificación                                                         |
| `qwen/qwen3-coder-plus`     | texto         | 1,000,000 | Codificación                                                         |
| `qwen/MiniMax-M2.5`         | texto         | 1,000,000 | Razonamiento habilitado                                              |
| `qwen/glm-5`                | texto         | 202,752   | GLM                                                                  |
| `qwen/glm-4.7`              | texto         | 202,752   | GLM                                                                  |
| `qwen/kimi-k2.5`            | texto, imagen | 262,144   | Moonshot AI vía Alibaba                                              |

La disponibilidad aún puede variar según el punto de conexión y el plan de facturación, incluso cuando un modelo está presente en el catálogo incluido.

La compatibilidad de uso de streaming nativo se aplica tanto a los hosts del Plan de Codificación como a los hosts estándar compatibles con DashScope:

- `https://coding.dashscope.aliyuncs.com/v1`
- `https://coding-intl.dashscope.aliyuncs.com/v1`
- `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

## Disponibilidad de Qwen 3.6 Plus

`qwen3.6-plus` está disponible en los puntos de conexión de Model Studio Estándar (pago por uso):

- China: `dashscope.aliyuncs.com/compatible-mode/v1`
- Global: `dashscope-intl.aliyuncs.com/compatible-mode/v1`

Si los puntos de conexión del Plan de Codificación devuelven un error de "modelo no compatible" para `qwen3.6-plus`, cambie a Estándar (pago por uso) en lugar del par punto de conexión/clave del Plan de Codificación.

## Plan de capacidades

La extensión `qwen` se está posicionando como el proveedor principal para toda la superficie de Qwen Cloud, no solo para modelos de codificación/texto.

- Modelos de texto/chat: incluidos ahora
- Llamada a herramientas, salida estructurada, pensamiento: heredados del transporte compatible con OpenAI
- Generación de imágenes: planificada en la capa del complemento del proveedor
- Comprensión de imagen/video: incluida ahora en el endpoint Estándar
- Voz/audio: planificado en la capa del complemento del proveedor
- Incrustaciones/reranking de memoria: planificados a través de la superficie del adaptador de incrustaciones
- Generación de video: incluida ahora a través de la capacidad compartida de generación de video

## Complementos multimodales

La extensión `qwen` ahora también expone:

- Comprensión de video a través de `qwen-vl-max-latest`
- Generación de video Wan a través de:
  - `wan2.6-t2v` (predeterminado)
  - `wan2.6-i2v`
  - `wan2.6-r2v`
  - `wan2.6-r2v-flash`
  - `wan2.7-r2v`

Estas superficies multimodales utilizan los endpoints **Estándar** de DashScope, no los
endpoints del Plan de Codificación.

- URL base Estándar Global/Intl: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- URL base Estándar China: `https://dashscope.aliyuncs.com/compatible-mode/v1`

Para la generación de video, OpenClaw asigna la región de Qwen configurada al host AIGC de DashScope correspondiente
antes de enviar el trabajo:

- Global/Intl: `https://dashscope-intl.aliyuncs.com`
- China: `https://dashscope.aliyuncs.com`

Eso significa que un `models.providers.qwen.baseUrl` normal que apunte a los hosts Qwen del
Plan de Codificación o Estándar aún mantiene la generación de video en el endpoint de video
de DashScope regional correcto.

Para la generación de video, establezca un modelo predeterminado explícitamente:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

Límites actuales de generación de video de Qwen incluidos:

- Hasta **1** video de salida por solicitud
- Hasta **1** imagen de entrada
- Hasta **4** videos de entrada
- Duración de hasta **10 segundos**
- Admite `size`, `aspectRatio`, `resolution`, `audio` y `watermark`
- El modo de imagen/video de referencia actualmente requiere **URL http(s) remotas**. Las rutas
  de archivos locales se rechazan de inmediato porque el endpoint de video de DashScope no
  acepta búferes locales cargados para esas referencias.

Consulte [Video Generation](/en/tools/video-generation) para conocer los parámetros de la herramienta compartida,
selección del proveedor y comportamiento de conmutación por error.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `QWEN_API_KEY` esté
disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).
