---
summary: "Usa modelos MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

El proveedor MiniMax de OpenClaw usa por defecto **MiniMax M2.7**.

## Línea de modelos

- `MiniMax-M2.7`: modelo de texto alojado por defecto.
- `MiniMax-M2.7-highspeed`: nivel de texto M2.7 más rápido.

## Elige una configuración

### MiniMax OAuth (Plan de codificación) - recomendado

**Mejor para:** configuración rápida con el Plan de codificación MiniMax a través de OAuth, no se requiere clave de API.

Habilita el complemento OAuth incluido y autentícate:

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Se te pedirá que selecciones un punto de conexión:

- **Global** - Usuarios internacionales (`api.minimax.io`)
- **CN** - Usuarios en China (`api.minimaxi.com`)

Consulta el [LÉEME del complemento MiniMax](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) para obtener detalles.

### MiniMax M2.7 (clave de API)

**Mejor para:** MiniMax alojado con API compatible con Anthropic.

Configurar a través de CLI:

- Ejecuta `openclaw configure`
- Selecciona **Modelo/autenticación**
- Elige una opción de autenticación **MiniMax**

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
        ],
      },
    },
  },
}
```

### MiniMax M2.7 como alternativa (ejemplo)

**Mejor para:** mantener tu modelo más potente de última generación como principal, cambiar a MiniMax M2.7 en caso de error.
El siguiente ejemplo usa Opus como un principal concreto; cámbialo por tu modelo principal de última generación preferido.

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

## Configurar a través de `openclaw configure`

Usa el asistente de configuración interactivo para establecer MiniMax sin editar JSON:

1. Ejecuta `openclaw configure`.
2. Selecciona **Modelo/autenticación**.
3. Elige una opción de autenticación de **MiniMax**.
4. Elige tu modelo predeterminado cuando se te solicite.

## Opciones de configuración

- `models.providers.minimax.baseUrl`: prefiere `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.api`: prefiere `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.apiKey`: clave de API de MiniMax (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: define `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: crea alias para los modelos que quieras en la lista de permitidos.
- `models.mode`: mantén `merge` si quieres agregar MiniMax junto a los integrados.

## Notas

- Las referencias de modelo son `minimax/<model>`.
- Modelo de texto predeterminado: `MiniMax-M2.7`.
- Modelo de texto alternativo: `MiniMax-M2.7-highspeed`.
- API de uso del Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de coding plan).
- Actualice los valores de precios en `models.json` si necesita un seguimiento exacto de costos.
- Enlace de referencia para el MiniMax Coding Plan (10% de descuento): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Vea [/concepts/model-providers](/en/concepts/model-providers) para las reglas del proveedor.
- Use `openclaw models list` y `openclaw models set minimax/MiniMax-M2.7` para cambiar.

## Solución de problemas

### "Modelo desconocido: minimax/MiniMax-M2.7"

Esto generalmente significa que **el proveedor MiniMax no está configurado** (no se encontró ninguna entrada de proveedor
ni clave de perfil/env de autenticación de MiniMax). Una solución para esta detección está en
**2026.1.12**. Solución:

- Actualizando a **2026.1.12** (o ejecutando desde la fuente `main`) y luego reiniciando la puerta de enlace.
- Ejecutando `openclaw configure` y seleccionando una opción de autenticación **MiniMax**, o
- Añadiendo el bloque `models.providers.minimax` manualmente, o
- Configurando `MINIMAX_API_KEY` (o un perfil de autenticación MiniMax) para que el proveedor pueda ser inyectado.

Asegúrese de que el ID del modelo sea **sensible a mayúsculas y minúsculas**:

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

Luego verifique nuevamente con:

```bash
openclaw models list
```
