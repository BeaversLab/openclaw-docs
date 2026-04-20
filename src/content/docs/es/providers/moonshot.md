---
summary: "Configurar Moonshot K2 vs Kimi Coding (proveedores independientes + claves)"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot proporciona la API de Kimi con puntos de conexión compatibles con OpenAI. Configure el
proveedor y establezca el modelo predeterminado en `moonshot/kimi-k2.5`, o use
Kimi Coding con `kimi/kimi-code`.

<Warning>Moonshot y Kimi Coding son **proveedores independientes**. Las claves no son intercambiables, los puntos de conexión son diferentes y las referencias de los modelos también (`moonshot/...` vs `kimi/...`).</Warning>

## Catálogo de modelos integrados

[//]: # "moonshot-kimi-k2-ids:start"

| Ref. de modelo                    | Nombre                 | Razonamiento | Entrada       | Contexto | Salida máxima |
| --------------------------------- | ---------------------- | ------------ | ------------- | -------- | ------------- |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | No           | texto, imagen | 262,144  | 262,144       |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | Sí           | texto         | 262,144  | 262,144       |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | Sí           | texto         | 262,144  | 262,144       |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | No           | texto         | 256,000  | 16,384        |

[//]: # "moonshot-kimi-k2-ids:end"

## Introducción

Elija su proveedor y siga los pasos de configuración.

<Tabs>
  <Tab title="API de Moonshot">
    **Lo mejor para:** Modelos Kimi K2 a través de la Moonshot Open Platform.

    <Steps>
      <Step title="Elija su región de punto de conexión">
        | Elección de autenticación            | Punto de conexión                       | Región        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | Internacional |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | China         |
      </Step>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        O para el punto de conexión de China:

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.5" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar que los modelos estén disponibles">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
    </Steps>

    ### Ejemplo de configuración

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.5" },
          models: {
            // moonshot-kimi-k2-aliases:start
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
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
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
    **Ideal para:** tareas centradas en código a través del punto de conexión Kimi Coding.

    <Note>
    Kimi Coding utiliza una clave de API y un prefijo de proveedor diferentes (`kimi/...`) a los de Moonshot (`moonshot/...`). La referencia de modelo heredada `kimi/k2p5` sigue siendo aceptada como un ID de compatibilidad.
    </Note>

    <Steps>
      <Step title="Ejecutar la incorporación">
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

OpenClaw también incluye **Kimi** como proveedor `web_search`, con respaldo de búsqueda
web de Moonshot.

<Steps>
  <Step title="Ejecutar la configuración interactiva de búsqueda web">
    ```bash
    openclaw configure --section web
    ```

    Elija **Kimi** en la sección de búsqueda web para almacenar
    `plugins.entries.moonshot.config.webSearch.*`.

  </Step>
  <Step title="Configurar la región y el modelo de búsqueda web">
    La configuración interactiva solicita:

    | Configuración        | Opciones                                                              |
    | -------------------- | -------------------------------------------------------------------- |
    | Región de API        | `https://api.moonshot.ai/v1` (internacional) o `https://api.moonshot.cn/v1` (China) |
    | Modelo de búsqueda web | El valor predeterminado es `kimi-k2.5`                                             |

  </Step>
</Steps>

La configuración reside bajo `plugins.entries.moonshot.config.webSearch`:

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
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
    Moonshot Kimi admite pensamiento nativo binario:

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    Configúrelo por modelo a través de `agents.defaults.models.<provider/model>.params`:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.5": {
              params: {
                thinking: { type: "disabled" },
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw también asigna los niveles de `/think` en tiempo de ejecución para Moonshot:

    | Nivel de `/think`       | Comportamiento de Moonshot          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | Cualquier nivel no off    | `thinking.type=enabled`    |

    <Warning>
    Cuando el pensamiento de Moonshot está habilitado, `tool_choice` debe ser `auto` o `none`. OpenClaw normaliza los valores de `tool_choice` incompatibles a `auto` para compatibilidad.
    </Warning>

  </Accordion>

<Accordion title="Compatibilidad de uso en streaming">
  Los endpoints nativos de Moonshot (`https://api.moonshot.ai/v1` y `https://api.moonshot.cn/v1`) anuncian compatibilidad de uso en streaming en el transporte `openai-completions` compartido. OpenClaw activa las capacidades del endpoint, por lo que los ids de proveedores personalizados compatibles que apuntan a los mismos hosts nativos de Moonshot heredan el mismo comportamiento de uso en
  streaming.
</Accordion>

  <Accordion title="Referencia de endpoint y referencia de modelo">
    | Proveedor   | Prefijo de referencia de modelo | Endpoint                      | Var. de entorno de autenticación        |
    | ---------- | ---------------- | ----------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Endpoint de Kimi Coding          | `KIMI_API_KEY`      |
    | Búsqueda web | N/A              | Igual que la región de la API de Moonshot   | `KIMI_API_KEY` o `MOONSHOT_API_KEY` |

    - La búsqueda web de Kimi usa `KIMI_API_KEY` o `MOONSHOT_API_KEY`, y por defecto usa `https://api.moonshot.ai/v1` con el modelo `kimi-k2.5`.
    - Anule los metadatos de precios y contexto en `models.providers` si es necesario.
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
  <Card title="Plataforma abierta Moonshot" href="https://platform.moonshot.ai" icon="globe">
    Gestión de claves de API de Moonshot y documentación.
  </Card>
</CardGroup>
