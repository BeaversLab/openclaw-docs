---
summary: "Ejecutar OpenClaw con Ollama (modelos en la nube y locales)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

# Ollama

OpenClaw se integra con la API nativa de Ollama (`/api/chat`) para modelos alojados en la nube y servidores Ollama locales/autoalojados. Puede usar Ollama en tres modos: `Cloud + Local` a través de un host Ollama accesible, `Cloud only` contra `https://ollama.com`, o `Local only` contra un host Ollama accesible.

<Warning>**Usuarios de Ollama remoto**: No use la URL compatible con OpenAI `/v1` (`http://host:11434/v1`) con OpenClaw. Esto rompe la llamada a herramientas y los modelos pueden generar JSON de herramientas sin procesar como texto plano. Use la URL de la API nativa de Ollama en su lugar: `baseUrl: "http://host:11434"` (sin `/v1`).</Warning>

## Comenzando

Elige tu método de configuración y modo preferidos.

<Tabs>
  <Tab title="Incorporación (recomendado)">
    **Mejor para:** la ruta más rápida hacia una configuración en la nube o local de Ollama funcional.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard
        ```

        Seleccione **Ollama** de la lista de proveedores.
      </Step>
      <Step title="Elija su modo">
        - **Nube + Local** — host local de Ollama más modelos en la nube enrutados a través de ese host
        - **Solo nube** — modelos de Ollama alojados a través de `https://ollama.com`
        - **Solo local** — solo modelos locales
      </Step>
      <Step title="Seleccione un modelo">
        `Cloud only` solicita `OLLAMA_API_KEY` y sugiere valores predeterminados en la nube alojados. `Cloud + Local` y `Local only` piden una URL base de Ollama, descubren los modelos disponibles y extraen automáticamente el modelo local seleccionado si aún no está disponible. `Cloud + Local` también verifica si ese host de Ollama ha iniciado sesión para el acceso a la nube.
      </Step>
      <Step title="Verifique que el modelo esté disponible">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### Modo no interactivo

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    Opcionalmente especifique una URL base o modelo personalizado:

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="Configuración manual">
    **Ideal para:** control total sobre la configuración en la nube o local.

    <Steps>
      <Step title="Elegir nube o local">
        - **Nube + Local**: instala Ollama, inicia sesión con `ollama signin` y enruta las solicitudes de la nube a través de ese host
        - **Solo nube**: usa `https://ollama.com` con un `OLLAMA_API_KEY`
        - **Solo local**: instala Ollama desde [ollama.com/download](https://ollama.com/download)
      </Step>
      <Step title="Extraer un modelo local (solo local)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="Habilitar Ollama para OpenClaw">
        Para `Cloud only`, usa tu `OLLAMA_API_KEY` real. Para configuraciones respaldadas por host, cualquier valor de marcador de posición funciona:

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspeccionar y establecer tu modelo">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        O establece el predeterminado en la configuración:

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Modelos en la nube

<Tabs>
  <Tab title="Nube + Local">
    `Cloud + Local` utiliza un host Ollama accesible como punto de control tanto para modelos locales como en la nube. Este es el flujo híbrido preferido de Ollama.

    Usa **Nube + Local** durante la configuración. OpenClaw solicita la URL base de Ollama, descubre modelos locales de ese host y verifica si el host ha iniciado sesión para el acceso en la nube con `ollama signin`. Cuando el host ha iniciado sesión, OpenClaw también sugiere valores predeterminados en la nube alojados, como `kimi-k2.5:cloud`, `minimax-m2.7:cloud` y `glm-5.1:cloud`.

    Si el host aún no ha iniciado sesión, OpenClaw mantiene la configuración solo local hasta que ejecutes `ollama signin`.

  </Tab>

  <Tab title="Solo en la nube">
    `Cloud only` se ejecuta contra la API alojada de Ollama en `https://ollama.com`.

    Use **Solo en la nube** durante la configuración. OpenClaw solicita `OLLAMA_API_KEY`, establece `baseUrl: "https://ollama.com"` y precarga la lista de modelos en la nube alojados. Esta ruta **no** requiere un servidor Ollama local ni `ollama signin`.

    La lista de modelos en la nube que se muestra durante `openclaw onboard` se completa en vivo desde `https://ollama.com/api/tags`, limitada a 500 entradas, por lo que el selector refleja el catálogo alojado actual en lugar de una semilla estática. Si `ollama.com` es inalcanzable o no devuelve modelos en el momento de la configuración, OpenClaw recurre a las sugerencias codificadas anteriores para que la incorporación se complete.

  </Tab>

  <Tab title="Solo local">
    En el modo solo local, OpenClaw descubre modelos desde la instancia de Ollama configurada. Esta ruta es para servidores Ollama locales o autoalojados.

    Actualmente, OpenClaw sugiere `gemma4` como el valor predeterminado local.

  </Tab>
</Tabs>

## Descubrimiento de modelos (proveedor implícito)

Cuando establece `OLLAMA_API_KEY` (o un perfil de autenticación) y **no** define `models.providers.ollama`, OpenClaw descubre modelos desde la instancia local de Ollama en `http://127.0.0.1:11434`.

| Comportamiento            | Detalle                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consulta de catálogo      | Consultas `/api/tags`                                                                                                                                                                                   |
| Detección de capacidades  | Utiliza búsquedas de `/api/show` de mejor esfuerzo para leer `contextWindow` y detectar capacidades (incluida la visión)                                                                                |
| Modelos de visión         | Los modelos con una capacidad `vision` reportada por `/api/show` se marcan como con capacidad de imagen (`input: ["text", "image"]`), por lo que OpenClaw inyecta automáticamente imágenes en el prompt |
| Detección de razonamiento | Marca `reasoning` con un heurístico de nombre de modelo (`r1`, `reasoning`, `think`)                                                                                                                    |
| Límites de tokens         | Establece `maxTokens` al límite máximo de tokens predeterminado de Ollama utilizado por OpenClaw                                                                                                        |
| Costos                    | Establece todos los costos en `0`                                                                                                                                                                       |

Esto evita entradas de modelo manuales manteniendo el catálogo alineado con la instancia local de Ollama.

```bash
# See what models are available
ollama list
openclaw models list
```

Para añadir un nuevo modelo, simplemente descárgalo con Ollama:

```bash
ollama pull mistral
```

El nuevo modelo se descubrirá automáticamente y estará disponible para su uso.

<Note>Si establece `models.providers.ollama` explícitamente, el descubrimiento automático se omite y debe definir modelos manualmente. Consulte la sección de configuración explícita a continuación.</Note>

## Visión y descripción de imágenes

El complemento Ollama incluido registra Ollama como un proveedor de comprensión de medios con capacidad para imágenes. Esto permite que OpenClaw enrute solicitudes explícitas de descripción de imágenes y valores predeterminados de modelos de imágenes configurados a través de modelos de visión de Ollama locales o alojados.

Para la visión local, extrae un modelo que admita imágenes:

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

Luego verifica con la CLI de inferencia:

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` debe ser una referencia completa de `<provider/model>`. Cuando se configura, `openclaw infer image describe` ejecuta ese modelo directamente en lugar de omitir la descripción porque el modelo admite visión nativa.

Para convertir Ollama en el modelo de comprensión de imágenes predeterminado para los medios entrantes, configura `agents.defaults.imageModel`:

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

Si defines `models.providers.ollama.models` manualmente, marca los modelos de visión con soporte de entrada de imagen:

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw rechaza las solicitudes de descripción de imágenes para los modelos que no están marcados como con capacidad de imagen. Con el descubrimiento implícito, OpenClaw lee esto de Ollama cuando `/api/show` informa una capacidad de visión.

## Configuración

<Tabs>
  <Tab title="Básico (descubrimiento implícito)">
    La ruta de habilitación más simple solo local es a través de una variable de entorno:

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` está configurado, puedes omitir `apiKey` en la entrada del proveedor y OpenClaw la completará para las verificaciones de disponibilidad.
    </Tip>

  </Tab>

  <Tab title="Explícito (modelos manuales)">
    Usa la configuración explícita cuando desees una configuración en la nube alojada, Ollama se ejecuta en otro host/puerto, deseas forzar ventanas de contexto específicas o listas de modelos, o deseas definiciones de modelos completamente manuales.

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab title="URL base personalizada">
    Si Ollama se está ejecutando en un host o puerto diferente (la configuración explícita deshabilita el descubrimiento automático, por lo que debes definir los modelos manualmente):

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
          },
        },
      },
    }
    ```

    <Warning>
    No agregues `/v1` a la URL. La ruta `/v1` usa el modo compatible con OpenAI, donde la llamada a herramientas no es confiable. Usa la URL base de Ollama sin sufijo de ruta.
    </Warning>

  </Tab>
</Tabs>

### Selección de modelo

Una vez configurados, todos tus modelos de Ollama están disponibles:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## Búsqueda web de Ollama

OpenClaw es compatible con **Búsqueda web de Ollama** como proveedor `web_search` incluido.

| Propiedad     | Detalle                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Host          | Utiliza tu host de Ollama configurado (`models.providers.ollama.baseUrl` cuando está configurado, de lo contrario `http://127.0.0.1:11434`) |
| Autenticación | Sin clave                                                                                                                                   |
| Requisito     | Ollama debe estar ejecutándose y haber iniciado sesión con `ollama signin`                                                                  |

Elija **Búsqueda web de Ollama** durante `openclaw onboard` o `openclaw configure --section web`, o establezca:

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

<Note>Para obtener los detalles completos de configuración y comportamiento, consulte [Búsqueda web de Ollama](/es/tools/ollama-search).</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo compatible con OpenAI heredado">
    <Warning>
    **La llamada a herramientas no es fiable en el modo compatible con OpenAI.** Utilice este modo solo si necesita el formato OpenAI para un proxy y no depende del comportamiento nativo de llamada a herramientas.
    </Warning>

    Si necesita utilizar el endpoint compatible con OpenAI en su lugar (por ejemplo, detrás de un proxy que solo admite el formato OpenAI), establezca `api: "openai-completions"` explícitamente:

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // default: true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    Este modo puede no admitir la transmisión y la llamada a herramientas simultáneamente. Es posible que necesite deshabilitar la transmisión con `params: { streaming: false }` en la configuración del modelo.

    Cuando se usa `api: "openai-completions"` con Ollama, OpenClaw inyecta `options.num_ctx` de forma predeterminada para que Ollama no retroceda silenciosamente a una ventana de contexto de 4096. Si su proxy/servidor rechaza campos `options` desconocidos, deshabilite este comportamiento:

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="Ventanas de contexto">
    Para los modelos descubiertos automáticamente, OpenClaw utiliza la ventana de contexto reportada por Ollama cuando está disponible, de lo contrario recurre a la ventana de contexto predeterminada de Ollama utilizada por OpenClaw.

    Puede anular `contextWindow` y `maxTokens` en la configuración explícita del proveedor:

    ```json5
    {
      models: {
        providers: {
          ollama: {
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
              }
            ]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="Modelos de razonamiento">
    OpenClaw trata por defecto los modelos con nombres como `deepseek-r1`, `reasoning` o `think` como capaces de razonamiento.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    No se necesita ninguna configuración adicional: OpenClaw los marca automáticamente.

  </Accordion>

<Accordion title="Costos de los modelos">Ollama es gratuito y se ejecuta localmente, por lo que todos los costos de los modelos se establecen en $0. Esto se aplica tanto a los modelos descubiertos automáticamente como a los definidos manualmente.</Accordion>

  <Accordion title="Incrustaciones de memoria">
    El complemento Ollama incluido registra un proveedor de incrustaciones de memoria para
    [búsqueda de memoria](/es/concepts/memory). Utiliza la URL base configurada de Ollama
    y la clave API.

    | Propiedad      | Valor               |
    | ------------- | ------------------- |
    | Modelo predeterminado | `nomic-embed-text`  |
    | Auto-pull     | Sí: el modelo de incrustación se extrae automáticamente si no está presente localmente |

    Para seleccionar Ollama como proveedor de incrustaciones de búsqueda de memoria:

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuración de streaming">
    La integración de Ollama de OpenClaw utiliza la **API nativa de Ollama** (`/api/chat`) de forma predeterminada, que admite totalmente el streaming y la llamada a herramientas simultáneamente. No se necesita ninguna configuración especial.

    Para las solicitudes nativas de `/api/chat`, OpenClaw también reenvía el control de pensamiento directamente a Ollama: `/think off` y `openclaw agent --thinking off` envían `think: false` de nivel superior, mientras que los niveles de pensamiento no `off` envían `think: true`.

    <Tip>
    Si necesita utilizar el endpoint compatible con OpenAI, consulte la sección "Modo heredado compatible con OpenAI" anterior. Es posible que el streaming y la llamada a herramientas no funcionen simultáneamente en ese modo.
    </Tip>

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Ollama no detectado">
    Asegúrese de que Ollama se esté ejecutando y de que haya configurado `OLLAMA_API_KEY` (o un perfil de autenticación), y de que **no** haya definido una entrada `models.providers.ollama` explícita:

    ```bash
    ollama serve
    ```

    Verifique que la API sea accesible:

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="No hay modelos disponibles">
    Si su modelo no aparece en la lista, descárguelo localmente o defínalo explícitamente en `models.providers.ollama`.

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="Conexión rechazada">
    Compruebe que Ollama se esté ejecutando en el puerto correcto:

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/models" icon="brain">
    Cómo elegir y configurar modelos.
  </Card>
  <Card title="Búsqueda web de Ollama" href="/es/tools/ollama-search" icon="magnifying-glass">
    Detalles completos de configuración y comportamiento de la búsqueda web con tecnología de Ollama.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
