---
summary: "Ejecuta OpenClaw con Ollama (modelos en la nube y locales)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

OpenClaw se integra con la API nativa de Ollama (`/api/chat`) para modelos alojados en la nube y servidores Ollama locales/autoalojados. Puedes usar Ollama en tres modos: `Cloud + Local` a través de un host Ollama accesible, `Cloud only` contra `https://ollama.com`, o `Local only` contra un host Ollama accesible.

<Warning>**Usuarios de Ollama remoto**: No utilicen la URL compatible con OpenAI `/v1` (`http://host:11434/v1`) con OpenClaw. Esto interrumpe la llamada de herramientas y los modelos pueden generar el JSON de la herramienta como texto sin formato. Utilicen la URL de la API nativa de Ollama en su lugar: `baseUrl: "http://host:11434"` (sin `/v1`).</Warning>

## Comenzando

Elige tu método de configuración y modo preferidos.

<Tabs>
  <Tab title="Incorporación (recomendado)">
    **Lo mejor para:** la ruta más rápida hacia una configuración funcional de Ollama en la nube o local.

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
        `Cloud only` solicita `OLLAMA_API_KEY` y sugiere valores predeterminados en la nube alojados. `Cloud + Local` y `Local only` solicitan una URL base de Ollama, descubren los modelos disponibles y extraen automáticamente el modelo local seleccionado si aún no está disponible. `Cloud + Local` también verifica si ese host de Ollama ha iniciado sesión para el acceso a la nube.
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
    **Lo mejor para:** control total sobre la configuración en la nube o local.

    <Steps>
      <Step title="Elegir nube o local">
        - **Nube + Local**: instale Ollama, inicie sesión con `ollama signin` y enrute las solicitudes de la nube a través de ese host
        - **Solo nube**: use `https://ollama.com` con una `OLLAMA_API_KEY`
        - **Solo local**: instale Ollama desde [ollama.com/download](https://ollama.com/download)
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
        Para `Cloud only`, use su `OLLAMA_API_KEY` real. Para configuraciones respaldadas por host, cualquier valor de marcador de posición funciona:

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspeccionar y configurar su modelo">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        O establezca el predeterminado en la configuración:

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

    Use **Nube + Local** durante la configuración. OpenClaw solicita la URL base de Ollama, descubre modelos locales de ese host y verifica si el host ha iniciado sesión para el acceso en la nube con `ollama signin`. Cuando el host ha iniciado sesión, OpenClaw también sugiere valores predeterminados en la nube alojados, como `kimi-k2.5:cloud`, `minimax-m2.7:cloud` y `glm-5.1:cloud`.

    Si el host aún no ha iniciado sesión, OpenClaw mantiene la configuración solo local hasta que ejecute `ollama signin`.

  </Tab>

  <Tab title="Solo nube">
    `Cloud only` se ejecuta en la API alojada de Ollama en `https://ollama.com`.

    Use **Solo nube** durante la configuración. OpenClaw solicita `OLLAMA_API_KEY`, establece `baseUrl: "https://ollama.com"` y carga la lista de modelos en la nube alojados. Esta ruta **no** requiere un servidor Ollama local ni `ollama signin`.

  </Tab>

  <Tab title="Solo local">
    En el modo de solo local, OpenClaw descubre modelos desde la instancia de Ollama configurada. Esta ruta es para servidores Ollama locales o autoalojados.

    Actualmente, OpenClaw sugiere `gemma4` como el valor predeterminado local.

  </Tab>
</Tabs>

## Descubrimiento de modelos (proveedor implícito)

Cuando estableces `OLLAMA_API_KEY` (o un perfil de autenticación) y **no** defines `models.providers.ollama`, OpenClaw descubre modelos desde la instancia local de Ollama en `http://127.0.0.1:11434`.

| Comportamiento            | Detalle                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Consulta de catálogo      | Consulta `/api/tags`                                                                                                                                                                                         |
| Detección de capacidades  | Utiliza búsquedas de `/api/show` de mejor esfuerzo para leer `contextWindow` y detectar capacidades (incluida la visión)                                                                                     |
| Modelos de visión         | Los modelos con una capacidad `vision` reportada por `/api/show` se marcan como capaces de procesar imágenes (`input: ["text", "image"]`), por lo que OpenClaw inyecta automáticamente imágenes en el prompt |
| Detección de razonamiento | Marca `reasoning` con un heurístico de nombre de modelo (`r1`, `reasoning`, `think`)                                                                                                                         |
| Límites de tokens         | Establece `maxTokens` al límite máximo de tokens predeterminado de Ollama utilizado por OpenClaw                                                                                                             |
| Costos                    | Establece todos los costos en `0`                                                                                                                                                                            |

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

<Note>Si estableces `models.providers.ollama` explícitamente, se omite el autodescubrimiento y debes definir los modelos manualmente. Consulta la sección de configuración explícita a continuación.</Note>

## Configuración

<Tabs>
  <Tab title="Básico (descubrimiento implícito)">
    La ruta más simple para habilitar solo localmente es a través de una variable de entorno:

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` está configurada, puedes omitir `apiKey` en la entrada del proveedor y OpenClaw la completará para las verificaciones de disponibilidad.
    </Tip>

  </Tab>

  <Tab title="Explícito (modelos manuales)">
    Usa la configuración explícita cuando quieras una configuración en la nube alojada, Ollama se ejecuta en otro host/puerto, quieres forzar ventanas de contexto específicas o listas de modelos, o quieres definiciones de modelos totalmente manuales.

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
    Si Ollama se está ejecutando en un host o puerto diferente (la configuración explícita deshabilita el descubrimiento automático, así que define los modelos manualmente):

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
    No agregues `/v1` a la URL. La ruta `/v1` usa el modo compatible con OpenAI, donde la llamada a herramientas no es confiable. Usa la URL base de Ollama sin un sufijo de ruta.
    </Warning>

  </Tab>
</Tabs>

### Selección de modelo

Una vez configurado, todos tus modelos de Ollama están disponibles:

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

OpenClaw admite la **Búsqueda web de Ollama** como un proveedor `web_search` incluido.

| Propiedad     | Detalle                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Host          | Usa tu host de Ollama configurado (`models.providers.ollama.baseUrl` si está configurado, de lo contrario `http://127.0.0.1:11434`) |
| Autenticación | Sin clave                                                                                                                           |
| Requisito     | Ollama debe estar ejecutándose y haber iniciado sesión con `ollama signin`                                                          |

Elige **Búsqueda web de Ollama** durante `openclaw onboard` o `openclaw configure --section web`, o establece:

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

<Note>Para obtener detalles completos sobre la configuración y el comportamiento, consulta [Búsqueda web de Ollama](/es/tools/ollama-search).</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo compatible con OpenAI heredado">
    <Warning>
    **La llamada a herramientas no es fiable en el modo compatible con OpenAI.** Use este modo solo si necesita el formato OpenAI para un proxy y no depende del comportamiento nativo de llamada a herramientas.
    </Warning>

    Si necesita usar el endpoint compatible con OpenAI en su lugar (por ejemplo, detrás de un proxy que solo admite el formato OpenAI), establezca `api: "openai-completions"` explícitamente:

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

    Este modo puede no admitir el streaming y la llamada a herramientas simultáneamente. Es posible que necesite desactivar el streaming con `params: { streaming: false }` en la configuración del modelo.

    Cuando `api: "openai-completions"` se usa con Ollama, OpenClaw inyecta `options.num_ctx` de manera predeterminada para que Ollama no vuelva silenciosamente a una ventana de contexto de 4096. Si su proxy/servidor rechaza campos `options` desconocidos, desactive este comportamiento:

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
    Para los modelos descubiertos automáticamente, OpenClaw usa la ventana de contexto reportada por Ollama cuando está disponible; de lo contrario, vuelve a la ventana de contexto predeterminada de Ollama usada por OpenClaw.

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
    OpenClaw trata los modelos con nombres como `deepseek-r1`, `reasoning` o `think` como con capacidad de razonamiento de forma predeterminada.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    No se necesita configuración adicional: OpenClaw los marca automáticamente.

  </Accordion>

<Accordion title="Costos de los modelos">Ollama es gratuito y se ejecuta localmente, por lo que todos los costos de los modelos se establecen en $0. Esto se aplica tanto a los modelos descubiertos automáticamente como a los definidos manualmente.</Accordion>

  <Accordion title="Incrustaciones de memoria">
    El complemento Ollama incluido registra un proveedor de incrustaciones de memoria para
    [búsqueda de memoria](/es/concepts/memory). Utiliza la URL base de Ollama configurada
    y la clave de API.

    | Propiedad      | Valor               |
    | ------------- | ------------------- |
    | Modelo por defecto | `nomic-embed-text`  |
    | Auto-pull     | Sí — el modelo de incrustación se descarga automáticamente si no está presente localmente |

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
    La integración de Ollama de OpenClaw utiliza la **API nativa de Ollama** (`/api/chat`) de forma predeterminada, la cual admite completamente el streaming y la llamada a herramientas simultáneamente. No se necesita ninguna configuración especial.

    <Tip>
    Si necesita utilizar el endpoint compatible con OpenAI, consulte la sección "Modo heredado compatible con OpenAI" anterior. El streaming y la llamada a herramientas pueden no funcionar simultáneamente en ese modo.
    </Tip>

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Ollama no detectado">
    Asegúrese de que Ollama se esté ejecutando y de que haya configurado `OLLAMA_API_KEY` (o un perfil de autenticación), y de que **no** haya definido una entrada explícita `models.providers.ollama`:

    ```bash
    ollama serve
    ```

    Verifique que la API sea accesible:

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="No hay modelos disponibles">
    Si su modelo no aparece en la lista, descargue el modelo localmente o defínalo explícitamente en `models.providers.ollama`.

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
    Detalles completos de configuración y comportamiento para la búsqueda web potenciada por Ollama.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
