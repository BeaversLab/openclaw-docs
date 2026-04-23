---
summary: "Configurar Moonshot K2 vs Kimi Coding (proveedores separados + claves)"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot proporciona la API de Kimi con puntos de conexión compatibles con OpenAI. Configure el proveedor y establezca el modelo predeterminado en `moonshot/kimi-k2.6`, o use Kimi Coding con `kimi/kimi-code`.

<Warning>Moonshot y Kimi Coding son **proveedores separados**. Las claves no son intercambiables, los puntos de conexión difieren y las referencias de los modelos difieren (`moonshot/...` vs `kimi/...`).</Warning>

## Catálogo de modelos integrados

[//]: # "moonshot-kimi-k2-ids:start"

| Ref. de modelo                    | Nombre                 | Razonamiento | Entrada       | Contexto | Salida máxima |
| --------------------------------- | ---------------------- | ------------ | ------------- | -------- | ------------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6              | No           | texto, imagen | 262,144  | 262,144       |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | No           | texto, imagen | 262,144  | 262,144       |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | Sí           | texto         | 262,144  | 262,144       |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | Sí           | texto         | 262,144  | 262,144       |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | No           | texto         | 256,000  | 16,384        |

[//]: # "moonshot-kimi-k2-ids:end"

Las estimaciones de costos incluidas para los modelos K2 actuales alojados por Moonshot utilizan las tarifas de pago por uso publicadas por Moonshot: Kimi K2.6 es $0.16/MTok con acierto en caché, $0.95/MTok de entrada y $4.00/MTok de salida; Kimi K2.5 es $0.10/MTok con acierto en caché, $0.60/MTok de entrada y $3.00/MTok de salida. Otras entradas de catálogo heredadas mantienen marcadores de posición de costo cero a menos que las anules en la configuración.

## Introducción

Elija su proveedor y siga los pasos de configuración.

<Tabs>
  <Tab title="Moonshot API">
    **Lo mejor para:** Modelos Kimi K2 a través de Moonshot Open Platform.

    <Steps>
      <Step title="Elija su región de punto final">
        | Elección de autenticación            | Punto final                       | Región        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | Internacional |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | China         |
      </Step>
      <Step title="Ejecutar onboarding">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        O para el punto final de China:

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.6" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar que los modelos están disponibles">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
      <Step title="Ejecutar una prueba de humo en vivo">
        Utilice un directorio de estado aislado cuando desee verificar el acceso al modelo y el seguimiento de costos
        sin tocar sus sesiones normales:

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking off \
          --json
        ```

        La respuesta JSON debe informar `provider: "moonshot"` y
        `model: "kimi-k2.6"`. La entrada de la transcripción del asistente almacena el uso normalizado de
        tokens más el costo estimado bajo `usage.cost` cuando Moonshot devuelve
        metadatos de uso.
      </Step>
    </Steps>

    ### Ejemplo de configuración

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.6": { alias: "Kimi K2.6" },
            "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
            "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
            "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
            "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
            // moonshot-kimi-k2-aliases:end
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              // moonshot-kimi-k2-models:start
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.6, output: 3, cacheRead: 0.1, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking",
                name: "Kimi K2 Thinking",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking-turbo",
                name: "Kimi K2 Thinking Turbo",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-turbo",
                name: "Kimi K2 Turbo",
                reasoning: false,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 16384,
              },
              // moonshot-kimi-k2-models:end
            ],
          },
        },
      },
    }
    ```

  </Tab>

  <Tab title="Kimi Coding">
    **Lo mejor para:** tareas centradas en el código a través del punto de conexión de Kimi Coding.

    <Note>
    Kimi Coding utiliza una clave de API y un prefijo de proveedor (`kimi/...`) diferentes a los de Moonshot (`moonshot/...`). La referencia de modelo heredada `kimi/k2p5` sigue siendo aceptada como id. de compatibilidad.
    </Note>

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice kimi-code-api-key
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "kimi/kimi-code" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider kimi
        ```
      </Step>
    </Steps>

    ### Ejemplo de configuración

    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-code" },
          models: {
            "kimi/kimi-code": { alias: "Kimi" },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## Búsqueda web de Kimi

OpenClaw también incluye **Kimi** como proveedor `web_search`, con respaldo en la búsqueda
web de Moonshot.

<Steps>
  <Step title="Ejecutar configuración interactiva de búsqueda web">
    ```bash
    openclaw configure --section web
    ```

    Elija **Kimi** en la sección de búsqueda web para almacenar
    `plugins.entries.moonshot.config.webSearch.*`.

  </Step>
  <Step title="Configurar la región y el modelo de búsqueda web">
    La configuración interactiva solicita:

    | Configuración             | Opciones                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | Región de la API          | `https://api.moonshot.ai/v1` (internacional) o `https://api.moonshot.cn/v1` (China) |
    | Modelo de búsqueda web    | El valor predeterminado es `kimi-k2.6`                                             |

  </Step>
</Steps>

La configuración se encuentra en `plugins.entries.moonshot.config.webSearch`:

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## Avanzado

<AccordionGroup>
  <Accordion title="Modo de pensamiento nativo">
    Moonshot Kimi admite el pensamiento nativo binario:

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    Configúrelo por modelo mediante `agents.defaults.models.<provider/model>.params`:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "disabled" },
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw también asigna los niveles de tiempo de ejecución `/think` para Moonshot:

    | nivel `/think`       | Comportamiento de Moonshot          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | Cualquier nivel no off    | `thinking.type=enabled`    |

    <Warning>
    Cuando el pensamiento de Moonshot está habilitado, `tool_choice` debe ser `auto` o `none`. OpenClaw normaliza los valores incompatibles de `tool_choice` a `auto` para compatibilidad.
    </Warning>

    Kimi K2.6 también acepta un campo opcional `thinking.keep` que controla
    la retención multivuelta de `reasoning_content`. Establézcalo en `"all"` para mantener todo
    el razonamiento entre turnos; omítalo (o déjelo como `null`) para usar la estrategia
    predeterminada del servidor. OpenClaw solo reenvía `thinking.keep` para
    `moonshot/kimi-k2.6` y lo elimina de otros modelos.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "enabled", keep: "all" },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Compatibilidad de uso en streaming">
    Los puntos finales nativos de Moonshot (`https://api.moonshot.ai/v1` y
    `https://api.moonshot.cn/v1`) anuncian compatibilidad de uso en streaming en el
    transporte compartido `openai-completions`. OpenClaw activa esas capacidades del punto final,
    por lo que los ID de proveedores personalizados compatibles que apuntan a los mismos hosts
    nativos de Moonshot heredan el mismo comportamiento de uso en streaming.

    Con los precios incluidos de K2.6, el uso en streaming que incluye tokens de entrada, salida,
    y de lectura de caché también se convierte en un costo estimado local en USD para
    `/status`, `/usage full`, `/usage cost`, y la contabilidad de sesiones
    respaldada por transcripciones.

  </Accordion>

  <Accordion title="Referencia de punto de conexión y de modelo">
    | Proveedor   | Prefijo de referencia de modelo | Punto de conexión                      | Variable de entorno de autenticación        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Punto de conexión Kimi Coding          | `KIMI_API_KEY`      |
    | Búsqueda web | N/A              | Igual que la región de la API Moonshot   | `KIMI_API_KEY` o `MOONSHOT_API_KEY` |

    - La búsqueda web de Kimi utiliza `KIMI_API_KEY` o `MOONSHOT_API_KEY`, y por defecto es `https://api.moonshot.ai/v1` con el modelo `kimi-k2.6`.
    - Anule los precios y los metadatos de contexto en `models.providers` si es necesario.
    - Si Moonshot publica diferentes límites de contexto para un modelo, ajuste `contextWindow` en consecuencia.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Búsqueda web" href="/es/tools/web-search" icon="magnifying-glass">
    Configuración de proveedores de búsqueda web, incluido Kimi.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo para proveedores, modelos y complementos.
  </Card>
  <Card title="Plataforma abierta de Moonshot" href="https://platform.moonshot.ai" icon="globe">
    Gestión de claves de API de Moonshot y documentación.
  </Card>
</CardGroup>
