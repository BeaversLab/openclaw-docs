---
summary: "Usar MiniMax M2.5 en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

MiniMax es una empresa de IA que crea la familia de modelos **M2/M2.5**. El lanzamiento actual centrado en codificación es **MiniMax M2.5** (23 de diciembre de 2025), diseñado para tareas complejas del mundo real.

Fuente: [Nota de lanzamiento de MiniMax M2.5](https://www.minimax.io/news/minimax-m25)

## Resumen del modelo (M2.5)

MiniMax destaca estas mejoras en M2.5:

- **Codificación en varios idiomas** más fuerte (Rust, Java, Go, C++, Kotlin, Objective-C, TS/JS).
- Mejor **desarrollo de web/aplicaciones** y calidad de salida estética (incluyendo móviles nativos).
- Manejo mejorado de **instrucciones compuestas** para flujos de trabajo de estilo oficina, basándose en pensamiento entrelazado y ejecución integrada de restricciones.
- **Respuestas más concisas** con menor uso de tokens y bucles de iteración más rápidos.
- Compatibilidad y gestión de contexto más fuertes con **marcos de herramientas/agentes** (Claude Code, Droid/Factory AI, Cline, Kilo Code, Roo Code, BlackBox).
- Salidas de **diálogo y redacción técnica** de mayor calidad.

## MiniMax M2.5 vs MiniMax M2.5 Highspeed

- **Velocidad:** `MiniMax-M2.5-highspeed` es el nivel rápido oficial en la documentación de MiniMax.
- **Costo:** La lista de precios de MiniMax indica el mismo costo de entrada y un costo de salida más alto para highspeed.
- **ID de modelos actuales:** use `MiniMax-M2.5` o `MiniMax-M2.5-highspeed`.

## Elegir una configuración

### MiniMax OAuth (Plan de Codificación) — recomendado

**Lo mejor para:** configuración rápida con el Plan de Codificación de MiniMax a través de OAuth, no se requiere clave de API.

Habilite el complemento OAuth incluido y autentíquese:

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Se le pedirá que seleccione un punto final:

- **Global** - Usuarios internacionales (`api.minimax.io`)
- **CN** - Usuarios en China (`api.minimaxi.com`)

Consulte el [README del complemento MiniMax](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) para obtener más detalles.

### MiniMax M2.5 (clave de API)

**Lo mejor para:** MiniMax alojado con API compatible con Anthropic.

Configurar a través de CLI:

- Ejecutar `openclaw configure`
- Seleccione **Modelo/autorización**
- Elija **MiniMax M2.5**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.5" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
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

### MiniMax M2.5 como alternativa (ejemplo)

**Lo mejor para:** mantener su modelo más fuerte de última generación como principal, pasar a MiniMax M2.5 como alternativa.
El siguiente ejemplo usa Opus como un principal concreto; cámbielo por su modelo principal de última generación preferido.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
    },
  },
}
```

### Opcional: Local vía LM Studio (manual)

**Lo mejor para:** inferencia local con LM Studio.
Hemos visto resultados sólidos con MiniMax M2.5 en hardware potente (p. ej. un
escritorio/servidor) usando el servidor local de LM Studio.

Configure manualmente vía `openclaw.json`:

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

## Configurar vía `openclaw configure`

Use el asistente de configuración interactivo para configurar MiniMax sin editar JSON:

1. Ejecute `openclaw configure`.
2. Seleccione **Model/auth**.
3. Elija **MiniMax M2.5**.
4. Elija su modelo predeterminado cuando se le solicite.

## Opciones de configuración

- `models.providers.minimax.baseUrl`: prefiera `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.api`: prefiera `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.apiKey`: clave de API de MiniMax (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: defina `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: asigne alias a los modelos que desee en la lista de permitidos.
- `models.mode`: mantenga `merge` si desea agregar MiniMax junto con los integrados.

## Notas

- Las referencias del modelo son `minimax/<model>`.
- ID de modelo recomendados: `MiniMax-M2.5` y `MiniMax-M2.5-highspeed`.
- API de uso de Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de plan de código).
- Actualice los valores de precios en `models.json` si necesita un seguimiento exacto de los costos.
- Enlace de referencia para MiniMax Coding Plan (10% de descuento): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Consulte [/concepts/model-providers](/es/concepts/model-providers) para conocer las reglas del proveedor.
- Use `openclaw models list` y `openclaw models set minimax/MiniMax-M2.5` para cambiar.

## Solución de problemas

### “Unknown model: minimax/MiniMax-M2.5”

Esto generalmente significa que el **proveedor de MiniMax no está configurado** (no se encontró ninguna entrada de proveedor ni ninguna clave de perfil/env de autenticación de MiniMax). Una solución para esta detección está en la versión **2026.1.12** (no publicada en el momento de escribir esto). Solución mediante:

- Actualizar a la versión **2026.1.12** (o ejecutar desde el código fuente `main`) y luego reiniciar la puerta de enlace.
- Ejecutar `openclaw configure` y seleccionar **MiniMax M2.5**, o
- Añadir el bloque `models.providers.minimax` manualmente, o
- Configurar `MINIMAX_API_KEY` (o un perfil de autenticación de MiniMax) para que se pueda inyectar el proveedor.

Asegúrese de que el id del modelo sea **sensible a mayúsculas y minúsculas**:

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

Luego verifique nuevamente con:

```bash
openclaw models list
```

import es from "/components/footer/es.mdx";

<es />
