---
summary: "Usar MiniMax M2.5 en OpenClaw"
read_when:
  - Quieres modelos MiniMax en OpenClaw
  - Necesitas orientación para la configuración de MiniMax
title: "MiniMax"
---

# MiniMax

MiniMax es una empresa de inteligencia artificial que desarrolla la familia de modelos **M2/M2.5**. El lanzamiento actual
 centrado en la programación es **MiniMax M2.5** (23 de diciembre de 2025), diseñado para
 tareas complejas del mundo real.

Fuente: [MiniMax M2.5 release note](https://www.minimax.io/news/minimax-m25)

## Resumen del modelo (M2.5)

MiniMax destaca estas mejoras en M2.5:

- Mayor capacidad de **programación en múltiples idiomas** (Rust, Java, Go, C++, Kotlin, Objective-C, TS/JS).
- Mejor **desarrollo web/aplicaciones** y calidad estética de la salida (incluido el móvil nativo).
- Manejo mejorado de **instrucciones compuestas** para flujos de trabajo de tipo oficina, basándose en
  el pensamiento entrelazado y la ejecución integrada de restricciones.
- **Respuestas más concisas** con un menor uso de tokens y bucles de iteración más rápidos.
- Mayor compatibilidad con **marcos de herramientas/agentes** y gestión del contexto (Claude Code,
  Droid/Factory AI, Cline, Kilo Code, Roo Code, BlackBox).
- Salidas de **diálogo y escritura técnica** de mayor calidad.

## MiniMax M2.5 vs MiniMax M2.5 Highspeed

- **Velocidad:** `MiniMax-M2.5-highspeed` es el nivel rápido oficial en la documentación de MiniMax.
- **Coste:** La tarificación de MiniMax indica el mismo coste de entrada y un coste de salida mayor para highspeed.
- **Identificadores de modelo actuales:** usa `MiniMax-M2.5` o `MiniMax-M2.5-highspeed`.

## Elegir una configuración

### MiniMax OAuth (Coding Plan) - recomendado

**Lo mejor para:** configuración rápida con MiniMax Coding Plan a través de OAuth, no se requiere clave de API.

Habilita el plugin OAuth incluido y autentícate:

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Se te pedirá que selecciones un punto de conexión:

- **Global** - Usuarios internacionales (`api.minimax.io`)
- **CN** - Usuarios en China (`api.minimaxi.com`)

Consulta el [README del plugin MiniMax](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) para más detalles.

### MiniMax M2.5 (clave de API)

**Lo mejor para:** MiniMax alojado con API compatible con Anthropic.

Configurar a través de la CLI:

- Ejecuta `openclaw configure`
- Selecciona **Model/auth**
- Elige **MiniMax M2.5**

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

### MiniMax M2.5 como respaldo (ejemplo)

**Lo mejor para:** mantener tu modelo de última generación más potente como principal, cambiar a MiniMax M2.5 como respaldo.
El ejemplo de abajo usa Opus como un principal concreto; cambia a tu modelo principal de última generación preferido.

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

### Opcional: Local a través de LM Studio (manual)

**Mejor para:** inferencia local con LM Studio.
Hemos observado resultados sólidos con MiniMax M2.5 en hardware potente (p. ej., un
escritorio/servidor) usando el servidor local de LM Studio.

Configure manualmente a través de `openclaw.json`:

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

## Configure a través de `openclaw configure`

Use el asistente de configuración interactivo para establecer MiniMax sin editar JSON:

1. Ejecute `openclaw configure`.
2. Seleccione **Model/auth**.
3. Elija **MiniMax M2.5**.
4. Elija su modelo predeterminado cuando se le solicite.

## Opciones de configuración

- `models.providers.minimax.baseUrl`: prefiera `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.api`: prefiera `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.apiKey`: clave de API de MiniMax (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: defina `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: use alias para los modelos que desee en la lista de permitidos.
- `models.mode`: mantenga `merge` si desea agregar MiniMax junto con los integrados.

## Notas

- Las referencias de modelo son `minimax/<model>`.
- IDs de modelo recomendados: `MiniMax-M2.5` y `MiniMax-M2.5-highspeed`.
- API de uso del Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de plan de código).
- Actualice los valores de precios en `models.json` si necesita un seguimiento exacto de costos.
- Enlace de referencia para el MiniMax Coding Plan (10% de descuento): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Vea [/concepts/model-providers](/es/concepts/model-providers) para las reglas del proveedor.
- Use `openclaw models list` y `openclaw models set minimax/MiniMax-M2.5` para cambiar.

## Solución de problemas

### "Unknown model: minimax/MiniMax-M2.5"

Esto generalmente significa que el **proveedor MiniMax no está configurado** (no se encontró ninguna entrada de proveedor
ni ningún perfil de autenticación/clave de entorno de MiniMax). Una corrección para esta detección está en
**2026.1.12** (no publicada en el momento de escribir esto). Corrija mediante:

- Actualizar a **2026.1.12** (o ejecutar desde el código fuente `main`) y luego reiniciar la puerta de enlace.
- Ejecutar `openclaw configure` y seleccionar **MiniMax M2.5**, o
- Añadir el bloque `models.providers.minimax` manualmente, o
- Configurar `MINIMAX_API_KEY` (o un perfil de autenticación de MiniMax) para que se pueda inyectar el proveedor.

Asegúrese de que el identificador del modelo sea **sensible a mayúsculas y minúsculas**:

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

Luego verifique de nuevo con:

```bash
openclaw models list
```

import en from "/components/footer/en.mdx";

<en />
