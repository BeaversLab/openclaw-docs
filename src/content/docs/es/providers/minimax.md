---
summary: "Usa modelos MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

El proveedor MiniMax de OpenClaw utiliza por defecto **MiniMax M2.7** y mantiene
**MiniMax M2.5** en el catálogo por compatibilidad.

## Línea de modelos

- `MiniMax-M2.7`: modelo de texto alojado predeterminado.
- `MiniMax-M2.7-highspeed`: nivel de texto M2.7 más rápido.
- `MiniMax-M2.5`: modelo de texto anterior, aún disponible en el catálogo de MiniMax.
- `MiniMax-M2.5-highspeed`: nivel de texto M2.5 más rápido.
- `MiniMax-VL-01`: modelo de visión para entradas de texto + imagen.

## Elige una configuración

### MiniMax OAuth (Plan de código) - recomendado

**Lo mejor para:** configuración rápida con el Plan de código MiniMax mediante OAuth, no se requiere clave API.

Habilita el plugin OAuth incluido y autentícate:

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Se te pedirá que selecciones un punto final:

- **Global** - Usuarios internacionales (`api.minimax.io`)
- **CN** - Usuarios en China (`api.minimaxi.com`)

Consulta el [README del plugin MiniMax](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) para obtener más detalles.

### MiniMax M2.7 (clave API)

**Lo mejor para:** MiniMax alojado con API compatible con Anthropic.

Configura a través de CLI:

- Ejecuta `openclaw configure`
- Selecciona **Modelo/autorización**
- Elige una opción de autorización **MiniMax**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5-highspeed",
            name: "MiniMax M2.5 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### MiniMax M2.7 como respaldo (ejemplo)

**Lo mejor para:** mantener tu modelo más potente de última generación como principal, pasar a MiniMax M2.7 en caso de fallo.
El ejemplo de abajo usa Opus como principal concreto; cámbialo por tu modelo principal de última generación preferido.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

### Opcional: Local vía LM Studio (manual)

**Lo mejor para:** inferencia local con LM Studio.
Hemos visto resultados sólidos con MiniMax M2.5 en hardware potente (p. ej., un
escritorio/servidor) usando el servidor local de LM Studio.

Configura manualmente a través de `openclaw.json`:

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Configura vía `openclaw configure`

Usa el asistente de configuración interactivo para establecer MiniMax sin editar JSON:

1. Ejecuta `openclaw configure`.
2. Selecciona **Modelo/autorización**.
3. Elige una opción de autorización **MiniMax**.
4. Elige tu modelo predeterminado cuando se te solicite.

## Opciones de configuración

- `models.providers.minimax.baseUrl`: prefiere `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.api`: preferir `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.apiKey`: clave de API de MiniMax (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: definir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: alias de los modelos que desee en la lista de permitidos.
- `models.mode`: mantenga `merge` si desea agregar MiniMax junto con los integrados.

## Notas

- Las referencias de modelos son `minimax/<model>`.
- Modelo de texto predeterminado: `MiniMax-M2.7`.
- Modelos de texto alternativos: `MiniMax-M2.7-highspeed`, `MiniMax-M2.5`, `MiniMax-M2.5-highspeed`.
- API de uso del Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave del plan de código).
- Actualice los valores de precios en `models.json` si necesita un seguimiento exacto de los costos.
- Enlace de referido para el MiniMax Coding Plan (10% de descuento): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Consulte [/concepts/model-providers](/es/concepts/model-providers) para obtener las reglas del proveedor.
- Use `openclaw models list` y `openclaw models set minimax/MiniMax-M2.7` para cambiar.

## Solución de problemas

### "Unknown model: minimax/MiniMax-M2.7"

Esto generalmente significa que **el proveedor de MiniMax no está configurado** (no se encontró ninguna entrada de proveedor ni ningún perfil de autenticación/clave de entorno de MiniMax). Una corrección para esta detección está en **2026.1.12**. Corregir mediante:

- Actualizando a **2026.1.12** (o ejecutando desde la fuente `main`) y luego reiniciando la puerta de enlace.
- Ejecutando `openclaw configure` y seleccionando una opción de autenticación **MiniMax**, o
- Agregando el bloque `models.providers.minimax` manualmente, o
- Configurando `MINIMAX_API_KEY` (o un perfil de autenticación de MiniMax) para que se pueda inyectar el proveedor.

Asegúrese de que el ID del modelo distinga entre mayúsculas y minúsculas:

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`
- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

Luego vuelva a verificar con:

```bash
openclaw models list
```
