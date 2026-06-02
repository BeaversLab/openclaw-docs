---
summary: "Usa la API compatible con OpenAI de GMI Cloud con OpenClaw"
read_when:
  - You want to run OpenClaw with GMI Cloud models
  - You need the GMI provider id, key, or endpoint
title: "GMI Cloud"
---

GMI Cloud es una plataforma de inferencia alojada para modelos frontera y de peso abierto detrás de una API compatible con OpenAI. En OpenClaw es un proveedor de modelos incluido, lo que significa que puedes seleccionarlo con el id de proveedor `gmi`, almacenar credenciales a través de la autenticación normal de modelos y usar referencias de modelos como `gmi/google/gemini-3.1-flash-lite`.

Usa GMI cuando quieras una clave de API para varias familias de modelos alojados, incluyendo las rutas de Google, Anthropic, OpenAI, DeepSeek, Moonshot y Z.AI expuestas por el catálogo de GMI. Es útil como proveedor secundario para la reserva de modelos (fallback), para comparar rutas alojadas entre diferentes proveedores, o cuando GMI tiene un modelo disponible antes que tu proveedor principal.

Este proveedor utiliza semánticas de chat compatibles con OpenAI. OpenClaw posee el id del proveedor, el perfil de autenticación, los alias, la semilla del catálogo de modelos y la URL base; GMI posee la disponibilidad del modelo en vivo, la facturación, los límites de velocidad y cualquier política de enrutamiento del lado del proveedor.

## Configuración

Crea una clave de API en GMI Cloud y luego ejecuta:

```bash
openclaw onboard --auth-choice gmi-api-key
```

O establece:

```bash
export GMI_API_KEY="<your-gmi-api-key>" # pragma: allowlist secret
```

## Valores predeterminados

- Proveedor: `gmi`
- Alias: `gmi-cloud`, `gmicloud`
- URL base: `https://api.gmi-serving.com/v1`
- Variable de entorno: `GMI_API_KEY`
- Modelo predeterminado: `gmi/google/gemini-3.1-flash-lite`

## Cuándo elegir GMI

- Quieres un punto de conexión compatible con OpenAI alojado en lugar de un servidor de modelos local.
- Quieres probar varias familias de modelos comerciales y de peso abierto a través de una cuenta de proveedor.
- Quieres un proveedor de reserva con un enrutamiento ascendente diferente al de OpenRouter, DeepInfra, Together o las API directas del proveedor.
- Necesitas ids de modelos, precios o controles de cuenta específicos de GMI.

Elige el proveedor directo del proveedor en su lugar cuando necesites funciones nativas del proveedor que GMI no expone a través de su ruta compatible con OpenAI. Elige un proveedor local como Ollama, LM Studio, vLLM o SGLang cuando la localidad de los datos o el control de la GPU local importen más que la comodidad del alojamiento.

## Modelos

El catálogo incluido semilla ids de ruta de GMI Cloud comúnmente disponibles, incluyendo:

- `gmi/zai-org/GLM-5.1-FP8`
- `gmi/deepseek-ai/DeepSeek-V3.2`
- `gmi/moonshotai/Kimi-K2.5`
- `gmi/google/gemini-3.1-flash-lite`
- `gmi/anthropic/claude-sonnet-4.6`
- `gmi/openai/gpt-5.4`

El catálogo es una semilla, no una promesa de que cada cuenta pueda llamar a cada modelo en
todo momento. Utiliza el comando de listado de modelos de OpenClaw para ver lo que el proveedor
configurado informa en tu entorno:

```bash
openclaw models list --provider gmi
```

## Solución de problemas

- `401` o `403`: verifica que `GMI_API_KEY` esté configurado para el proceso que ejecuta
  OpenClaw, o vuelve a ejecutar el onboarding para guardar la clave en el perfil de autenticación del proveedor.
- Errores de modelo desconocido: confirma que el modelo exista en tu cuenta de GMI y utiliza la
  referencia completa `gmi/<route-id>` que se muestra en `openclaw models list --provider gmi`.
- Errores intermitentes del proveedor: prueba una ruta diferente de GMI o configura GMI como
  alternativa en lugar de ser el único proveedor de modelos principal.

## Relacionado

- [Proveedores de modelos](/es/concepts/model-providers)
- [Todos los proveedores](/es/providers/index)
