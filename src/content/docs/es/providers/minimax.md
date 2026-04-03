---
summary: "Usa modelos MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

El proveedor MiniMax de OpenClaw utiliza por defecto **MiniMax M2.7**.

## Línea de modelos

- `MiniMax-M2.7`: modelo de texto alojado predeterminado.
- `MiniMax-M2.7-highspeed`: nivel de texto M2.7 más rápido.
- `image-01`: modelo de generación de imágenes (generación y edición de imagen a imagen).

## Generación de imágenes

El complemento MiniMax registra el modelo `image-01` para la herramienta `image_generate`. Admite:

- **Generación de texto a imagen** con control de relación de aspecto.
- **Edición de imagen a imagen** (referencia de sujeto) con control de relación de aspecto.
- Relaciones de aspecto compatibles: `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`.

Para usar MiniMax para la generación de imágenes, configúrelo como proveedor de generación de imágenes:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

El complemento utiliza el mismo `MINIMAX_API_KEY` o autenticación OAuth que los modelos de texto. No se necesita configuración adicional si MiniMax ya está configurado.

## Elegir una configuración

### MiniMax OAuth (Coding Plan) - recomendado

**Ideal para:** configuración rápida con MiniMax Coding Plan a través de OAuth, no se requiere clave de API.

Habilite el complemento OAuth incluido y autentíquese:

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

Se le pedirá que seleccione un punto de conexión:

- **Global** - Usuarios internacionales (`api.minimax.io`)
- **CN** - Usuarios en China (`api.minimaxi.com`)

Consulte el archivo README del paquete del complemento MiniMax en el repositorio de OpenClaw para obtener más detalles.

### MiniMax M2.7 (clave de API)

**Ideal para:** MiniMax alojado con API compatible con Anthropic.

Configurar a través de CLI:

- Ejecutar `openclaw configure`
- Seleccione **Model/auth**
- Elija una opción de autenticación **MiniMax**

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

**Ideal para:** mantenga su modelo más potente de última generación como principal, cambie a MiniMax M2.7 como alternativa.
El ejemplo siguiente utiliza Opus como principal concreto; cámbielo por su modelo principal de última generación preferido.

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

## Configurar vía `openclaw configure`

Use el asistente de configuración interactivo para establecer MiniMax sin editar JSON:

1. Ejecutar `openclaw configure`.
2. Seleccione **Model/auth**.
3. Elija una opción de autenticación **MiniMax**.
4. Elija su modelo predeterminado cuando se le solicite.

## Opciones de configuración

- `models.providers.minimax.baseUrl`: prefiera `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.api`: prefiera `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.apiKey`: clave de API de MiniMax (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: defina `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: asigne un alias a los modelos que desee en la lista de permitidos.
- `models.mode`: mantenga `merge` si desea agregar MiniMax junto con los integrados.

## Notas

- Las referencias de modelos son `minimax/<model>`.
- Modelo de texto predeterminado: `MiniMax-M2.7`.
- Modelo de texto alternativo: `MiniMax-M2.7-highspeed`.
- API de uso del Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de plan de código).
- Actualice los valores de precios en `models.json` si necesita un seguimiento de costos exacto.
- Enlace de referencia para el MiniMax Coding Plan (10% de descuento): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Consulte [/concepts/model-providers](/en/concepts/model-providers) para obtener las reglas del proveedor.
- Use `openclaw models list` y `openclaw models set minimax/MiniMax-M2.7` para cambiar.

## Solución de problemas

### "Unknown model: minimax/MiniMax-M2.7"

Esto generalmente significa que el **proveedor de MiniMax no está configurado** (no se encontró ninguna entrada de proveedor
ni ninguna clave de perfil/entorno de autenticación de MiniMax). Una solución para esta detección está en
**2026.1.12**. Solución:

- Actualizando a **2026.1.12** (o ejecutando desde la fuente `main`) y luego reiniciando la puerta de enlace.
- Ejecutando `openclaw configure` y seleccionando una opción de autenticación **MiniMax**, o
- Agregando el bloque `models.providers.minimax` manualmente, o
- Configurando `MINIMAX_API_KEY` (o un perfil de autenticación de MiniMax) para que se pueda inyectar el proveedor.

Asegúrese de que el ID del modelo sea **sensible a mayúsculas y minúsculas**:

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

Luego vuelva a verificar con:

```bash
openclaw models list
```
