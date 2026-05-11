---
summary: "Ejecutar OpenClaw con Ollama (modelos en la nube y locales)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw se integra con la API nativa de Ollama (`/api/chat`) para modelos en la nube alojados y servidores Ollama locales/autoalojados. Puede usar Ollama en tres modos: `Cloud + Local` a través de un host Ollama accesible, `Cloud only` contra `https://ollama.com`, o `Local only` contra un host Ollama accesible.

<Warning>**Usuarios de Ollama remoto**: No use la URL compatible con OpenAI `/v1` (`http://host:11434/v1`) con OpenClaw. Esto rompe la llamada a herramientas y los modelos pueden generar JSON de herramientas sin procesar como texto plano. Use la URL de la API nativa de Ollama en su lugar: `baseUrl: "http://host:11434"` (sin `/v1`).</Warning>

La configuración del proveedor Ollama usa `baseUrl` como clave canónica. OpenClaw también acepta `baseURL` para compatibilidad con ejemplos de estilo SDK de OpenAI, pero la nueva configuración debería preferir `baseUrl`.

## Reglas de autenticación

<AccordionGroup>
  <Accordion title="Hosts locales y de LAN">
    Los hosts Ollama locales y de LAN no necesitan un token de portador real. OpenClaw usa el marcador local `ollama-local` solo para URL base de Ollama de bucle invertido, red privada, `.local` y nombre de host simple.
  </Accordion>
  <Accordion title="Hosts remotos y Ollama Cloud">
    Los hosts públicos remotos y Ollama Cloud (`https://ollama.com`) requieren una credencial real a través de `OLLAMA_API_KEY`, un perfil de autenticación o el `apiKey` del proveedor.
  </Accordion>
  <Accordion title="Custom provider ids">
    Los ids de proveedor personalizados que establecen `api: "ollama"` siguen las mismas reglas. Por ejemplo, un proveedor `ollama-remote` que apunte a un host Ollama de LAN privada puede usar `apiKey: "ollama-local"` y los sub-agentes resolverán ese marcador a través del gancho del proveedor Ollama en lugar de tratarlo como una credencial faltante.
  </Accordion>
  <Accordion title="Memory embedding scope">
    Cuando Ollama se usa para incrustaciones de memoria, la autenticación bearer está limitada al host donde fue declarada:

    - Una clave a nivel de proveedor se envía solo al host Ollama de ese proveedor.
    - `agents.*.memorySearch.remote.apiKey` se envía solo a su host de incrustación remoto.
    - Un valor de entorno `OLLAMA_API_KEY` puro se trata como la convención de Ollama Cloud, no se envía a hosts locales o autoalojados por defecto.

  </Accordion>
</AccordionGroup>

## Cómo empezar

Elige tu método de configuración y modo preferidos.

<Tabs>
  <Tab title="Incorporación (recomendado)">
    **Lo mejor para:** el camino más rápido hacia una configuración funcional de Ollama en la nube o local.

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
        `Cloud only` solicita `OLLAMA_API_KEY` y sugiere valores predeterminados de nube alojados. `Cloud + Local` y `Local only` solicitan una URL base de Ollama, descubren los modelos disponibles y extraen automáticamente el modelo local seleccionado si aún no está disponible. Cuando Ollama informa una etiqueta `:latest` instalada como `gemma4:latest`, la configuración muestra ese modelo instalado una vez en lugar de mostrar tanto `gemma4` como `gemma4:latest` o volver a extraer el alias simple. `Cloud + Local` también verifica si ese host de Ollama ha iniciado sesión para el acceso a la nube.
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
        - **Solo nube**: usa `https://ollama.com` con una `OLLAMA_API_KEY`
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
        Para `Cloud only`, usa tu `OLLAMA_API_KEY` real. Para configuraciones respaldadas por host, funciona cualquier valor de marcador de posición:

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspeccionar y configurar tu modelo">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        O establece el valor predeterminado en la configuración:

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

    Utiliza **Nube + Local** durante la configuración. OpenClaw solicita la URL base de Ollama, descubre modelos locales de ese host y comprueba si el host ha iniciado sesión para el acceso a la nube con `ollama signin`. Cuando el host ha iniciado sesión, OpenClaw también sugiere valores predeterminados en la nube alojados, como `kimi-k2.5:cloud`, `minimax-m2.7:cloud` y `glm-5.1:cloud`.

    Si el host aún no ha iniciado sesión, OpenClaw mantiene la configuración solo local hasta que ejecutes `ollama signin`.

  </Tab>

  <Tab title="Solo en la nube">
    `Cloud only` se ejecuta contra la API alojada de Ollama en `https://ollama.com`.

    Use **Solo en la nube** durante la configuración. OpenClaw solicita `OLLAMA_API_KEY`, establece `baseUrl: "https://ollama.com"` y siembra la lista de modelos en la nube alojados. Esta ruta **no** requiere un servidor local de Ollama ni `ollama signin`.

    La lista de modelos en la nube que se muestra durante `openclaw onboard` se completa en tiempo real desde `https://ollama.com/api/tags`, limitada a 500 entradas, por lo que el selector refleja el catálogo alojado actual en lugar de una semilla estática. Si `ollama.com` es inalcanzable o no devuelve modelos en el momento de la configuración, OpenClaw recurre a las sugerencias previas codificadas para que la incorporación aún se complete.

  </Tab>

  <Tab title="Solo local">
    En modo solo local, OpenClaw descubre modelos desde la instancia de Ollama configurada. Esta ruta es para servidores locales o autoalojados de Ollama.

    Actualmente, OpenClaw sugiere `gemma4` como el valor predeterminado local.

  </Tab>
</Tabs>

## Descubrimiento de modelos (proveedor implícito)

Cuando configura `OLLAMA_API_KEY` (o un perfil de autenticación) y **no** define `models.providers.ollama` u otro proveedor remoto personalizado con `api: "ollama"`, OpenClaw descubre modelos de la instancia local de Ollama en `http://127.0.0.1:11434`.

| Comportamiento            | Detalle                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Consulta de catálogo      | Consultas `/api/tags`                                                                                                                                                                                        |
| Detección de capacidades  | Utiliza búsquedas de `/api/show` de mejor esfuerzo para leer `contextWindow`, parámetros expandidos del archivo de modelo `num_ctx` y capacidades que incluyen visión/herramientas                           |
| Modelos de visión         | Los modelos con una capacidad `vision` reportada por `/api/show` se marcan como con capacidad de imagen (`input: ["text", "image"]`), por lo que OpenClaw inyecta automáticamente las imágenes en el mensaje |
| Detección de razonamiento | Marca `reasoning` con un heurístico de nombre de modelo (`r1`, `reasoning`, `think`)                                                                                                                         |
| Límites de tokens         | Establece `maxTokens` al límite máximo de tokens predeterminado de Ollama utilizado por OpenClaw                                                                                                             |
| Costos                    | Establece todos los costos en `0`                                                                                                                                                                            |

Esto evita entradas manuales de modelos manteniendo el catálogo alineado con la instancia local de Ollama.

```bash
# See what models are available
ollama list
openclaw models list
```

Para añadir un modelo nuevo, simplemente descárgalo con Ollama:

```bash
ollama pull mistral
```

El nuevo modelo se detectará automáticamente y estará disponible para su uso.

<Note>
  Si estableces `models.providers.ollama` explícitamente, o configuras un proveedor remoto personalizado como `models.providers.ollama-cloud` con `api: "ollama"`, se omitirá el descubrimiento automático y debes definir los modelos manualmente. Los proveedores personalizados de bucle de retorno (loopback) como `http://127.0.0.2:11434` todavía se tratan como locales. Consulta la sección de
  configuración explícita a continuación.
</Note>

## Visión y descripción de imágenes

El complemento Ollama incluido registra Ollama como un proveedor de comprensión de medios con capacidad de imagen. Esto permite que OpenClaw enrute solicitudes explícitas de descripción de imágenes y valores predeterminados de modelos de imagen configurados a través de modelos de visión de Ollama locales o alojados.

Para la visión local, descarga un modelo que admita imágenes:

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

`--model` debe ser una referencia completa de `<provider/model>`. Cuando se establece, `openclaw infer image describe` ejecuta ese modelo directamente en lugar de omitir la descripción porque el modelo admite visión nativa.

Para hacer de Ollama el modelo de comprensión de imágenes predeterminado para los medios entrantes, configura `agents.defaults.imageModel`:

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

Los modelos de visión locales lentos pueden necesitar un tiempo de espera de comprensión de imágenes más largo que los modelos en la nube. También pueden bloquearse o detenerse cuando Ollama intenta asignar el contexto de visión completo anunciado en hardware con recursos limitados. Establezca un tiempo de espera de capacidad y limite `num_ctx` en la entrada del modelo cuando solo necesite un turno de descripción de imagen normal:

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

Este tiempo de espera se aplica a la comprensión de imágenes entrantes y a la herramienta explícita `image` que el agente puede llamar durante un turno. El `models.providers.ollama.timeoutSeconds` a nivel de proveedor todavía controla el guardia de solicitud HTTP de Ollama subyacente para llamadas de modelos normales.

Verifica en vivo la herramienta de imagen explícita contra Ollama local con:

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
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

OpenClaw rechaza las solicitudes de descripción de imágenes para modelos que no están marcados como capaces de procesar imágenes. Con el descubrimiento implícito, OpenClaw lee esto de Ollama cuando `/api/show` informa de una capacidad de visión.

## Configuración

<Tabs>
  <Tab title="Básico (descubrimiento implícito)">
    La ruta de habilitación más sencilla solo local es a través de una variable de entorno:

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` está configurado, puede omitir `apiKey` en la entrada del proveedor y OpenClaw lo rellenará para las comprobaciones de disponibilidad.
    </Tip>

  </Tab>

  <Tab title="Explícito (modelos manuales)">
    Use la configuración explícita cuando desee una configuración en la nube alojada, Ollama se ejecuta en otro host/puerto, desea forzar ventanas de contexto específicas o listas de modelos, o desea definiciones de modelos completamente manuales.

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
    Si Ollama se está ejecutando en un host o puerto diferente (la configuración explícita deshabilita el descubrimiento automático, por lo que debe definir los modelos manualmente):

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
            timeoutSeconds: 300, // Optional: give cold local models longer to connect and stream
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // Optional: keep the model loaded between turns
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    No añada `/v1` a la URL. La ruta `/v1` utiliza el modo compatible con OpenAI, donde la llamada a herramientas no es fiable. Use la URL base de Ollama sin un sufijo de ruta.
    </Warning>

  </Tab>
</Tabs>

## Recetas comunes

Úselas como puntos de partida y reemplace los ID de modelo con los nombres exactos de `ollama list` o `openclaw models list --provider ollama`.

<AccordionGroup>
  <Accordion title="Modelo local con descubrimiento automático">
    Úselo cuando Ollama se ejecuta en la misma máquina que la Gateway y desea que OpenClaw descubra los modelos instalados automáticamente.

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    Esta ruta mantiene la configuración al mínimo. No añada un bloque `models.providers.ollama` a menos que desee definir modelos manualmente.

  </Accordion>

  <Accordion title="Host de Ollama en LAN con modelos manuales">
    Use las URL nativas de Ollama para hosts en LAN. No agregue `/v1`.

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` es el presupuesto de contexto del lado de OpenClaw. `params.num_ctx` se envía a Ollama para la solicitud. Manténgalos alineados cuando su hardware no pueda ejecutar el contexto completo anunciado del modelo.

  </Accordion>

  <Accordion title="Solo Ollama Cloud">
    Use esto cuando no ejecuta un demonio local y desea modelos de Ollama alojados directamente.

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

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
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Nube más local a través de un demonio con sesión iniciada">
    Use esto cuando un demonio Ollama local o de LAN haya iniciado sesión con `ollama signin` y deba servir tanto modelos locales como modelos `:cloud`.

    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Múltiples hosts de Ollama">
    Use ID de proveedor personalizados cuando tenga más de un servidor Ollama. Cada proveedor obtiene su propio host, modelos, autenticación, tiempo de espera y referencias de modelos.

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    Cuando OpenClaw envía la solicitud, el prefijo del proveedor activo se elimina para que `ollama-large/qwen3.5:27b` llegue a Ollama como `qwen3.5:27b`.

  </Accordion>

  <Accordion title="Perfil de modelo local ligero">
    Algunos modelos locales pueden responder indicaciones simples pero tienen dificultades con la superficie completa de herramientas del agente. Comience limitando las herramientas y el contexto antes de cambiar la configuración global de tiempo de ejecución.

    ```json5
    {
      agents: {
        defaults: {
          experimental: {
            localModelLean: true,
          },
          model: { primary: "ollama/gemma4" },
        },
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    Use `compat.supportsTools: false` solo cuando el modelo o el servidor falle de manera confiable en los esquemas de herramientas. Intercambia la capacidad del agente por estabilidad.
    `localModelLean` elimina las herramientas de navegador, cron y mensajes de la superficie del agente, pero no cambia el contexto de tiempo de ejecución ni el modo de pensamiento de Ollama. Combínelo con `params.num_ctx` y `params.thinking: false` explícitos para modelos de pensamiento pequeños estilo Qwen que entran en bucle o gastan su presupuesto de respuesta en razonamiento oculto.

  </Accordion>
</AccordionGroup>

### Selección de modelo

Una vez configurados, todos sus modelos de Ollama están disponibles:

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

También se admiten ids de proveedores Ollama personalizados. Cuando una referencia de modelo usa el prefijo del proveedor activo, como `ollama-spark/qwen3:32b`, OpenClaw elimina solo ese prefijo antes de llamar a Ollama para que el servidor reciba `qwen3:32b`.

Para modelos locales lentos, prefiera el ajuste de solicitudes con alcance de proveedor antes de aumentar el tiempo de espera de ejecución de todo el agente:

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` se aplica a la solicitud HTTP del modelo, incluida la configuración de la conexión, los encabezados, la transmisión del cuerpo y la interrupción total de la recuperación protegida. `params.keep_alive` se reenvía a Ollama como `keep_alive` de nivel superior en solicitudes `/api/chat` nativas; configúrelo por modelo cuando el tiempo de carga del primer turno sea el cuello de botella.

### Verificación rápida

```bash
# Ollama daemon visible to this machine
curl http://127.0.0.1:11434/api/tags

# OpenClaw catalog and selected model
openclaw models list --provider ollama
openclaw models status

# Direct model smoke
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

Para hosts remotos, reemplace `127.0.0.1` con el host utilizado en `baseUrl`. Si `curl` funciona pero OpenClaw no, verifique si la Gateway se ejecuta en una máquina, contenedor o cuenta de servicio diferente.

## Búsqueda web de Ollama

OpenClaw admite **Búsqueda web de Ollama** como proveedor `web_search` incluido.

| Propiedad     | Detalle                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host          | Usa su host de Ollama configurado (`models.providers.ollama.baseUrl` cuando está configurado, de lo contrario `http://127.0.0.1:11434`); `https://ollama.com` usa la API alojada directamente      |
| Autenticación | Sin clave para hosts locales de Ollama conectados; `OLLAMA_API_KEY` o autenticación de proveedor configurada para búsqueda `https://ollama.com` directa o hosts protegidos por autenticación       |
| Requisito     | Los hosts locales/autoalojados deben estar ejecutándose y conectados con `ollama signin`; la búsqueda alojada directa requiere `baseUrl: "https://ollama.com"` más una clave de API real de Ollama |

Elija **Búsqueda web de Ollama** durante `openclaw onboard` o `openclaw configure --section web`, o configure:

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

Para búsqueda alojada directa a través de Ollama Cloud:

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

Para un demonio local conectado, OpenClaw utiliza el proxy `/api/experimental/web_search` del demonio. Para `https://ollama.com`, llama directamente al endpoint alojado `/api/web_search`.

<Note>Para obtener detalles completos sobre la configuración y el comportamiento, consulte [Búsqueda web de Ollama](/es/tools/ollama-search).</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo compatible con OpenAI heredado">
    <Warning>
    **La llamada a herramientas no es confiable en el modo compatible con OpenAI.** Use este modo solo si necesita el formato OpenAI para un proxy y no depende del comportamiento nativo de llamadas a herramientas.
    </Warning>

    Si necesita usar el endpoint compatible con OpenAI en su lugar (por ejemplo, detrás de un proxy que solo admite el formato OpenAI), configure `api: "openai-completions"` explícitamente:

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

    Este modo puede no admitir streaming y llamadas a herramientas simultáneamente. Es posible que necesite desactivar el streaming con `params: { streaming: false }` en la configuración del modelo.

    Cuando se usa `api: "openai-completions"` con Ollama, OpenClaw inyecta `options.num_ctx` de manera predeterminada para que Ollama no vuelva silenciosamente a una ventana de contexto de 4096. Si su proxy/corriente arriba rechaza campos `options` desconocidos, desactive este comportamiento:

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
    Para los modelos detectados automáticamente, OpenClaw utiliza la ventana de contexto reportada por Ollama cuando está disponible, incluidos los valores más grandes de `PARAMETER num_ctx` de archivos de modelo (Modelfiles) personalizados. De lo contrario, recurre a la ventana de contexto predeterminada de Ollama utilizada por OpenClaw.

    Puede establecer los valores predeterminados a nivel de proveedor para `contextWindow`, `contextTokens` y `maxTokens` para cada modelo bajo ese proveedor Ollama, y luego anularlos por modelo cuando sea necesario. `contextWindow` es el presupuesto de prompt y compactación de OpenClaw. Las solicitudes nativas de Ollama dejan `options.num_ctx` sin configurar a menos que configure explícitamente `params.num_ctx`, para que Ollama pueda aplicar su propio modelo, `OLLAMA_CONTEXT_LENGTH`, o valor predeterminado basado en VRAM. Para limitar o forzar el contexto de tiempo de ejecución por solicitud de Ollama sin reconstruir un archivo de modelo (Modelfile), configure `params.num_ctx`; se ignoran los valores no válidos, cero, negativos y no finitos. El adaptador compatible con OpenAI de Ollama todavía inyecta `options.num_ctx` de manera predeterminada desde el `params.num_ctx` configurado o el `contextWindow`; desactívelo con `injectNumCtxForOpenAICompat: false` si su upstream rechaza `options`.

    Las entradas de modelos nativos de Ollama también aceptan las opciones comunes de tiempo de ejecución de Ollama bajo `params`, incluidas `temperature`, `top_p`, `top_k`, `min_p`, `num_predict`, `stop`, `repeat_penalty`, `num_batch`, `num_thread` y `use_mmap`. OpenClaw solo reenvía claves de solicitud de Ollama, por lo que los parámetros de tiempo de ejecución de OpenClaw como `streaming` no se filtran a Ollama. Use `params.think` o `params.thinking` para enviar `think` de Ollama de nivel superior; `false` desactiva el "thinking" a nivel de API para modelos de estilo Qwen.

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    El `agents.defaults.models["ollama/<model>"].params.num_ctx` por modelo también funciona. Si ambos están configurados, la entrada explícita del modelo del proveedor tiene prioridad sobre el valor predeterminado del agente.

  </Accordion>

  <Accordion title="Control de razonamiento">
    Para los modelos nativos de Ollama, OpenClaw reenvía el control de razonamiento como Ollama espera: `think` de nivel superior, no `options.think`.

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    También puedes establecer un valor predeterminado para el modelo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    `params.think` o `params.thinking` por modelo pueden desactivar o forzar el razonamiento de la API de Ollama para un modelo configurado específico. Los comandos de tiempo de ejecución como `/think off` siguen aplicándose a la ejecución activa.

  </Accordion>

  <Accordion title="Modelos de razonamiento">
    OpenClaw trata los modelos con nombres como `deepseek-r1`, `reasoning` o `think` como capaces de razonamiento de forma predeterminada.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    No se necesita ninguna configuración adicional. OpenClaw los marca automáticamente.

  </Accordion>

<Accordion title="Costos del modelo">Ollama es gratuito y se ejecuta localmente, por lo que todos los costos de los modelos se establecen en $0. Esto se aplica tanto a los modelos descubiertos automáticamente como a los definidos manualmente.</Accordion>

  <Accordion title="Incrustaciones de memoria">
    El complemento Ollama incluido registra un proveedor de incrustaciones de memoria para
    [búsqueda de memoria](/es/concepts/memory). Utiliza la URL base configurada de Ollama
    y la clave de API, llama al endpoint actual `/api/embed` de Ollama y agrupa
    varios fragmentos de memoria en una sola solicitud `input` cuando es posible.

    | Propiedad      | Valor               |
    | ------------- | ------------------- |
    | Modelo predeterminado | `nomic-embed-text`  |
    | Extracción automática     | Sí: el modelo de incrustación se extrae automáticamente si no está presente localmente |

    Las incrustaciones en el momento de la consulta utilizan prefijos de recuperación para modelos que los requieren o recomiendan, incluyendo `nomic-embed-text`, `qwen3-embedding` y `mxbai-embed-large`. Los lotes de documentos de memoria permanecen sin procesar para que los índices existentes no necesiten una migración de formato.

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

    Para un host de incrustaciones remoto, mantenga la autenticación limitada a ese host:

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              model: "nomic-embed-text",
              apiKey: "ollama-local",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuración de transmisión">
    La integración de Ollama en OpenClaw utiliza la **API nativa de Ollama** (`/api/chat`) de forma predeterminada, que admite completamente la transmisión y la llamada de herramientas simultáneamente. No se necesita ninguna configuración especial.

    Para las solicitudes nativas `/api/chat`, OpenClaw también reenvía el control de pensamiento directamente a Ollama: `/think off` y `openclaw agent --thinking off` envían `think: false` de nivel superior, mientras que `/think low|medium|high` envían la cadena de esfuerzo `think` de nivel superior coincidente. `/think max` se asigna al esfuerzo nativo más alto de Ollama, `think: "high"`.

    <Tip>
    Si necesita utilizar el endpoint compatible con OpenAI, consulte la sección "Modo heredado compatible con OpenAI" más arriba. La transmisión y la llamada de herramientas pueden no funcionar simultáneamente en ese modo.
    </Tip>

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Bucle de fallos de WSL2 (reinicios repetidos)">
    En WSL2 con NVIDIA/CUDA, el instalador oficial de Ollama para Linux crea una unidad `ollama.service` de systemd con `Restart=always`. Si ese servicio se inicia automáticamente y carga un modelo con GPU durante el arranque de WSL2, Ollama puede fijar la memoria del host mientras se carga el modelo. Hyper-V memory reclaim no siempre puede recuperar esas páginas fijadas, por lo que Windows puede terminar la máquina virtual WSL2, systemd inicia Ollama de nuevo y el bucle se repite.

    Evidencias comunes:

    - reinicios repetidos de WSL2 o finalizaciones desde el lado de Windows
    - alto uso de CPU en `app.slice` o `ollama.service` poco después del inicio de WSL2
    - SIGTERM de systemd en lugar de un evento del OOM-killer de Linux

    OpenClaw registra una advertencia de inicio cuando detecta WSL2, `ollama.service` habilitado con `Restart=always` y marcadores CUDA visibles.

    Mitigación:

    ```bash
    sudo systemctl disable ollama
    ```

    Añada esto a `%USERPROFILE%\.wslconfig` en el lado de Windows y, a continuación, ejecute `wsl --shutdown`:

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    Establezca un keep-alive más corto en el entorno del servicio Ollama o inicie Ollama manualmente solo cuando lo necesite:

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    Consulte [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317).

  </Accordion>

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
    Si su modelo no aparece en la lista, extráigalo (pull) localmente o defínalo explícitamente en `models.providers.ollama`.

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

  <Accordion title="El host remoto funciona con curl pero no con OpenClaw">
    Verifique desde la misma máquina y tiempo de ejecución que ejecuta el Gateway:

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    Causas comunes:

    - `baseUrl` apunta a `localhost`, pero el Gateway se ejecuta en Docker o en otro host.
    - La URL usa `/v1`, que selecciona el comportamiento compatible con OpenAI en lugar de Ollama nativo.
    - El host remoto necesita cambios en el firewall o en el enlace de LAN en el lado de Ollama.
    - El modelo está presente en el demonio de su computadora portátil, pero no en el demonio remoto.

  </Accordion>

  <Accordion title="El modelo genera JSON de herramienta como texto">
    Esto generalmente significa que el proveedor está usando el modo compatible con OpenAI o que el modelo no puede manejar esquemas de herramientas.

    Prefiera el modo nativo de Ollama:

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    Si un modelo local pequeño aún falla en los esquemas de herramientas, establezca `compat.supportsTools: false` en esa entrada de modelo y vuelva a probar.

  </Accordion>

  <Accordion title="El modelo local en frío agota el tiempo de espera">
    Los modelos locales grandes pueden necesitar una carga inicial larga antes de que comience el streaming. Mantenga el tiempo de espera limitado al proveedor de Ollama y, opcionalmente, pida a Ollama que mantenga el modelo cargado entre turnos:

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    Si el host mismo es lento para aceptar conexiones, `timeoutSeconds` también extiende el tiempo de espera de conexión de Undici protegido para este proveedor.

  </Accordion>

  <Accordion title="El modelo de contexto grande es demasiado lento o se queda sin memoria">
    Muchos modelos de Ollama anuncian contextos que son más grandes de lo que su hardware puede ejecutar cómodamente. Ollama nativo usa el contexto de ejecución predeterminado de Ollama a menos que establezca `params.num_ctx`. Limite tanto el presupuesto de OpenClaw como el contexto de solicitud de Ollama cuando desee una latencia predecible del primer token:

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    Reduzca `contextWindow` primero si OpenClaw está enviando demasiado prompt. Reduzca `params.num_ctx` si Ollama está cargando un contexto de ejecución que es demasiado grande para la máquina. Reduzca `maxTokens` si la generación se ejecuta demasiado tiempo.

  </Accordion>
</AccordionGroup>

<Note>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Selección de modelos" href="/es/concepts/models" icon="brain">
    Cómo elegir y configurar modelos.
  </Card>
  <Card title="Búsqueda web de Ollama" href="/es/tools/ollama-search" icon="magnifying-glass">
    Detalles completos de configuración y comportamiento para la búsqueda web con tecnología de Ollama.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
