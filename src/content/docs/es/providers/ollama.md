---
summary: "Ejecutar OpenClaw con Ollama (modelos en la nube y locales)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw se integra con la API nativa de Ollama (`/api/chat`) para modelos alojados en la nube y servidores Ollama locales/autoalojados. Puedes usar Ollama en tres modos: `Cloud + Local` a través de un host Ollama accesible, `Cloud only` contra `https://ollama.com`, o `Local only` contra un host Ollama accesible.

<Warning>**Usuarios de Ollama remoto**: No usen la URL compatible con OpenAI `/v1` (`http://host:11434/v1`) con OpenClaw. Esto rompe la llamada a herramientas y los modelos pueden generar el JSON sin procesar de las herramientas como texto plano. En su lugar, usen la URL de la API nativa de Ollama: `baseUrl: "http://host:11434"` (sin `/v1`).</Warning>

La configuración del proveedor Ollama usa `baseUrl` como clave canónica. OpenClaw también acepta `baseURL` para compatibilidad con ejemplos de estilo SDK de OpenAI, pero la nueva configuración debería preferir `baseUrl`.

## Reglas de autenticación

<AccordionGroup>
  <Accordion title="Hosts locales y de LAN">
    Los hosts Ollama locales y de LAN no necesitan un token de portador real. OpenClaw usa el marcador local `ollama-local` solo para URL base de Ollama de bucle invertido, red privada, `.local` y nombre de host simple.
  </Accordion>
  <Accordion title="Hosts remotos y de Ollama Cloud">
    Los hosts públicos remotos y Ollama Cloud (`https://ollama.com`) requieren una credencial real a través de `OLLAMA_API_KEY`, un perfil de autenticación o el `apiKey` del proveedor.
  </Accordion>
  <Accordion title="Custom provider ids">
    Los IDs de proveedor personalizados que establecen `api: "ollama"` siguen las mismas reglas. Por ejemplo, un proveedor `ollama-remote` que apunte a un host Ollama de LAN privada puede usar `apiKey: "ollama-local"` y los subagentes resolverán ese marcador a través del enlace del proveedor Ollama en lugar de tratarlo como una credencial faltante. La búsqueda de memoria también puede establecer `agents.defaults.memorySearch.provider` en ese ID de proveedor personalizado para que los incrustaciones utilicen el punto final de Ollama correspondiente.
  </Accordion>
  <Accordion title="Auth profiles">
    `auth-profiles.json` almacena la credencial para un ID de proveedor. Coloque la configuración del punto final (`baseUrl`, `api`, IDs de modelo, encabezados, tiempos de espera) en `models.providers.<id>`. Los archivos de perfil de autenticación planos antiguos como `{ "ollama-windows": { "apiKey": "ollama-local" } }` no son un formato de tiempo de ejecución; ejecute `openclaw doctor --fix` para reescribirlos al perfil de clave de API canónico `ollama-windows:default` con una copia de seguridad. `baseUrl` en ese archivo es ruido de compatibilidad y debe moverse a la configuración del proveedor.
  </Accordion>
  <Accordion title="Memory embedding scope">
    Cuando Ollama se usa para incrustaciones de memoria, la autenticación de portador está limitada al host donde se declaró:

    - Una clave de nivel de proveedor se envía solo al host Ollama de ese proveedor.
    - `agents.*.memorySearch.remote.apiKey` se envía solo a su host de incrustación remoto.
    - Un valor de entorno `OLLAMA_API_KEY` puro se trata como la convención de Ollama Cloud, no se envía a hosts locales o autoalojados por defecto.

  </Accordion>
</AccordionGroup>

## Comenzando

Elija su método de configuración y modo preferidos.

<Tabs>
  <Tab title="Incorporación (recomendado)">
    **Mejor para:** la ruta más rápida hacia una configuración funcional de Ollama en la nube o local.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard
        ```

        Seleccione **Ollama** de la lista de proveedores.
      </Step>
      <Step title="Elija su modo">
        - **Nube + Local** — host local de Ollama más modelos en la nube enrutados a través de ese host
        - **Solo nube** — modelos alojados de Ollama a través de `https://ollama.com`
        - **Solo local** — solo modelos locales

      </Step>
      <Step title="Seleccione un modelo">
        `Cloud only` solicita `OLLAMA_API_KEY` y sugiere valores predeterminados alojados en la nube. `Cloud + Local` y `Local only` solicitan una URL base de Ollama, descubren los modelos disponibles y extraen automáticamente el modelo local seleccionado si aún no está disponible. Cuando Ollama informa una etiqueta `:latest` instalada como `gemma4:latest`, la configuración muestra ese modelo instalado una vez en lugar de mostrar tanto `gemma4` como `gemma4:latest` o volver a extraer el alias básico. `Cloud + Local` también verifica si ese host de Ollama ha iniciado sesión para el acceso a la nube.
      </Step>
      <Step title="Verificar que el modelo está disponible">
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
    **Lo mejor para:** control total de la configuración en la nube o local.

    <Steps>
      <Step title="Elegir nube o local">
        - **Nube + Local**: instalar Ollama, iniciar sesión con `ollama signin` y enrutar las solicitudes de la nube a través de ese host
        - **Solo nube**: usar `https://ollama.com` con una `OLLAMA_API_KEY`
        - **Solo local**: instalar Ollama desde [ollama.com/download](https://ollama.com/download)

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

        O establecer el valor predeterminado en la configuración:

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
    `Cloud + Local` usa un host Ollama accesible como punto de control tanto para modelos locales como en la nube. Este es el flujo híbrido preferido de Ollama.

    Use **Nube + Local** durante la configuración. OpenClaw solicita la URL base de Ollama, descubre modelos locales desde ese host y comprueba si el host ha iniciado sesión para el acceso en la nube con `ollama signin`. Cuando el host ha iniciado sesión, OpenClaw también sugiere valores predeterminados en la nube alojados, como `kimi-k2.5:cloud`, `minimax-m2.7:cloud` y `glm-5.1:cloud`.

    Si el host aún no ha iniciado sesión, OpenClaw mantiene la configuración solo local hasta que ejecute `ollama signin`.

  </Tab>

  <Tab title="Solo en la nube">
    `Cloud only` se ejecuta contra la API alojada de Ollama en `https://ollama.com`.

    Use **Solo en la nube** durante la configuración. OpenClaw solicita `OLLAMA_API_KEY`, establece `baseUrl: "https://ollama.com"` y llena la lista de modelos en la nube alojados. Esta ruta **no** requiere un servidor Ollama local ni `ollama signin`.

    La lista de modelos en la nube que se muestra durante `openclaw onboard` se completa en tiempo real desde `https://ollama.com/api/tags`, limitada a 500 entradas, por lo que el selector refleja el catálogo alojado actual en lugar de una semilla estática. Si `ollama.com` es inalcanzable o no devuelve modelos en el momento de la configuración, OpenClaw recurre a las sugerencias codificadas anteriormente para que la incorporación aún se complete.

  </Tab>

  <Tab title="Solo local">
    En el modo solo local, OpenClaw descubre modelos desde la instancia de Ollama configurada. Esta ruta es para servidores Ollama locales o autoalojados.

    OpenClaw actualmente sugiere `gemma4` como el valor predeterminado local.

  </Tab>
</Tabs>

## Descubrimiento de modelos (proveedor implícito)

Cuando configura `OLLAMA_API_KEY` (o un perfil de autenticación) y **no** define `models.providers.ollama` u otro proveedor remoto personalizado con `api: "ollama"`, OpenClaw descubre modelos desde la instancia local de Ollama en `http://127.0.0.1:11434`.

| Comportamiento            | Detalle                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consulta de catálogo      | Consultas `/api/tags`                                                                                                                                                                                         |
| Detección de capacidades  | Utiliza búsquedas de `/api/show` de mejor esfuerzo para leer `contextWindow`, parámetros de Modelfile expandidos `num_ctx` y capacidades que incluyen visión/herramientas                                     |
| Modelos de visión         | Los modelos con una capacidad `vision` reportada por `/api/show` se marcan como capaces de procesar imágenes (`input: ["text", "image"]`), por lo que OpenClaw inyecta automáticamente imágenes en el mensaje |
| Detección de razonamiento | Utiliza capacidades de `/api/show` cuando están disponibles, incluyendo `thinking`; recurre a un heurístico basado en el nombre del modelo (`r1`, `reasoning`, `think`) cuando Ollama omite las capacidades   |
| Límites de tokens         | Establece `maxTokens` en el límite máximo de tokens predeterminado de Ollama utilizado por OpenClaw                                                                                                           |
| Costos                    | Establece todos los costos en `0`                                                                                                                                                                             |

Esto evita las entradas de modelo manuales manteniendo el catálogo alineado con la instancia local de Ollama. Puedes usar una referencia completa como `ollama/<pulled-model>:latest` en `infer model run` local; OpenClaw resuelve ese modelo instalado desde el catálogo en vivo de Ollama sin requerir una entrada `models.json` escrita manualmente.

Para hosts de Ollama con sesión iniciada, algunos modelos `:cloud` pueden ser usables a través de `/api/chat`
y `/api/show` antes de que aparezcan en `/api/tags`. Cuando seleccionas explícitamente una
referencia completa `ollama/<model>:cloud`, OpenClaw valida ese modelo faltante exacto con
`/api/show` y lo añade al catálogo en tiempo de ejecución solo si Ollama confirma los metadatos
del modelo. Los errores tipográficos seguirán fallando como modelos desconocidos en lugar de autocrearse.

```bash
# See what models are available
ollama list
openclaw models list
```

Para una prueba de humo de generación de texto limitada que evite la superficie completa de herramientas del agente,
usa `infer model run` local con una referencia completa de modelo Ollama:

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

Esa ruta todavía usa el proveedor configurado, la autenticación y el transporte nativo de Ollama
de OpenClaw, pero no inicia un turno de agente de chat ni carga el contexto MCP/herramientas. Si
esto tiene éxito mientras que las respuestas normales del agente fallan, soluciona problemas de la capacidad del agente
prompt/herramientas del modelo a continuación.

Para una prueba de humo de modelo de visión limitada en el mismo camino simplificado, añade uno o más
archivos de imagen a `infer model run`. Esto envía el prompt y la imagen directamente al
modelo de visión Ollama seleccionado sin cargar herramientas de chat, memoria o contexto
de sesión previo:

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` acepta archivos detectados como `image/*`, incluyendo entradas PNG,
JPEG y WebP comunes. Los archivos que no son imágenes se rechazan antes de llamar a Ollama.
Para el reconocimiento de voz, usa `openclaw infer audio transcribe` en su lugar.

Cuando cambias una conversación con `/model ollama/<model>`, OpenClaw lo trata
como una selección exacta del usuario. Si el `baseUrl` de Ollama configurado
es inalcanzable, la siguiente respuesta fallará con el error del proveedor en lugar de responder
silenciosamente desde otro modelo de respaldo configurado.

Los trabajos cron aislados realizan una verificación de seguridad local adicional antes de iniciar el turno del agente. Si el modelo seleccionado se resuelve en un proveedor Ollama local, de red privada o `.local` y `/api/tags` es inalcanzable, OpenClaw registra esa ejecución cron como `skipped` con el `ollama/<model>` seleccionado en el texto de error. La verificación previa del endpoint se almacena en caché durante 5 minutos, por lo que varios trabajos cron dirigidos al mismo demonio Ollama detenido no inician todos solicitudes fallidas de modelo.

Verifique en vivo la ruta de texto local, la ruta de transmisión nativa y los incrustamientos (embeddings)
contra Ollama local con:

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

Para las pruebas de humo de la clave de API de Ollama Cloud, dirija la prueba en vivo a `https://ollama.com` y elija un modelo alojado del catálogo actual:

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

La prueba de humo en la nube ejecuta texto, transmisión nativa y búsqueda web. Omite las incrustaciones de forma predeterminada para `https://ollama.com` porque las claves de API de Ollama Cloud pueden no autorizar `/api/embed`. Establezca `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1` cuando desee explícitamente que la prueba en vivo falle si la clave de nube configurada no puede usar el endpoint de incrustación.

Para agregar un nuevo modelo, simplemente extráigalo con Ollama:

```bash
ollama pull mistral
```

El nuevo modelo se descubrirá automáticamente y estará disponible para su uso.

<Note>
  Si establece `models.providers.ollama` explícitamente, o configura un proveedor remoto personalizado como `models.providers.ollama-cloud` con `api: "ollama"`, se omite el descubrimiento automático y debe definir los modelos manualmente. Los proveedores personalizados de bucle de retorno como `http://127.0.0.2:11434` aún se tratan como locales. Vea la sección de configuración explícita a
  continuación.
</Note>

## Visión y descripción de imágenes

El complemento Ollama incluido registra Ollama como un proveedor de comprensión de medios con capacidad de imagen. Esto permite que OpenClaw enrute solicitudes explícitas de descripción de imágenes y valores predeterminados de modelo de imagen configurados a través de modelos de visión de Ollama locales o alojados.

Para la visión local, extraiga un modelo que admita imágenes:

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

Luego verifique con la CLI de inferencia:

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` debe ser una referencia completa `<provider/model>`. Cuando se establece, `openclaw infer image describe` ejecuta ese modelo directamente en lugar de omitir la descripción porque el modelo admite visión nativa.

Use `infer image describe` cuando desees el flujo de proveedor de comprensión de imágenes de OpenClaw, configurado `agents.defaults.imageModel`, y la forma de salida de descripción de imágenes. Use `infer model run --file` cuando desees una sonda de modelo multimodal sin procesar con un mensaje personalizado y una o más imágenes.

Para que Ollama sea el modelo de comprensión de imágenes predeterminado para los medios entrantes, configure `agents.defaults.imageModel`:

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

Prefiera la referencia completa `ollama/<model>`. Si el mismo modelo aparece listado bajo `models.providers.ollama.models` con `input: ["text", "image"]` y ningún otro proveedor de imágenes configurado expone ese ID de modelo básico, OpenClaw también normaliza una referencia básica `imageModel` como `qwen2.5vl:7b` a `ollama/qwen2.5vl:7b`. Si más de un proveedor de imágenes configurado tiene el mismo ID básico, use el prefijo del proveedor explícitamente.

Los modelos de visión locales lentos pueden necesitar un tiempo de espera de comprensión de imágenes más largo que los modelos en la nube. También pueden bloquearse o detenerse cuando Ollama intenta asignar el contexto de visión completo anunciado en hardware limitado. Configure un tiempo de espera de capacidad y limite `num_ctx` en la entrada del modelo cuando solo necesite un turno de descripción de imágenes normal:

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

Este tiempo de espera se aplica a la comprensión de imágenes entrantes y a la herramienta explícita `image` que el agente puede llamar durante un turno. El `models.providers.ollama.timeoutSeconds` a nivel de proveedor todavía controla el guardia de solicitud HTTP subyacente de Ollama para llamadas de modelo normales.

Verifique en vivo la herramienta de imagen explícita contra Ollama local con:

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

Si define `models.providers.ollama.models` manualmente, marque los modelos de visión con soporte de entrada de imagen:

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw rechaza las solicitudes de descripción de imágenes para modelos que no están marcados como capaces de procesar imágenes. Con el descubrimiento implícito, OpenClaw lee esto de Ollama cuando `/api/show` informa una capacidad de visión.

## Configuración

<Tabs>
  <Tab title="Básico (descubrimiento implícito)">
    La ruta de habilitación más simple solo para local es a través de la variable de entorno:

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` está establecido, puedes omitir `apiKey` en la entrada del proveedor y OpenClaw lo rellenará para las comprobaciones de disponibilidad.
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
    Si Ollama se está ejecutando en un host o puerto diferente (la configuración explícita deshabilita el autodescubrimiento, por lo que debes definir los modelos manualmente):

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
    No añadas `/v1` a la URL. La ruta `/v1` usa el modo compatible con OpenAI, donde la llamada a herramientas no es fiable. Usa la URL base de Ollama sin un sufijo de ruta.
    </Warning>

  </Tab>
</Tabs>

## Recetas comunes

Usa estos como puntos de partida y reemplaza los IDs de los modelos con los nombres exactos de `ollama list` o `openclaw models list --provider ollama`.

<AccordionGroup>
  <Accordion title="Modelo local con autodescubrimiento">
    Usa esto cuando Ollama se ejecuta en la misma máquina que la Gateway y quieres que OpenClaw descubra automáticamente los modelos instalados.

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    Esta ruta mantiene la configuración al mínimo. No añadas un bloque `models.providers.ollama` a menos que quieras definir modelos manualmente.

  </Accordion>

  <Accordion title="Host Ollama en LAN con modelos manuales">
    Usa las URLs nativas de Ollama para hosts de LAN. No añadas `/v1`.

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

    `contextWindow` es el presupuesto de contexto del lado de OpenClaw. `params.num_ctx` se envía a Ollama para la solicitud. Mantenlos alineados cuando tu hardware no pueda ejecutar el contexto completo anunciado del modelo.

  </Accordion>

  <Accordion title="Solo Ollama Cloud">
    Use esto cuando no ejecute un demonio local y desee modelos de Ollama alojados directamente.

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
    Use esto cuando un demonio de Ollama local o de LAN haya iniciado sesión con `ollama signin` y deba servir tanto modelos locales como modelos `:cloud`.

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
    Use ID de proveedor personalizados cuando tenga más de un servidor de Ollama. Cada proveedor obtiene su propio host, modelos, autenticación, tiempo de espera y referencias de modelo.

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

    Cuando OpenClaw envía la solicitud, el prefijo del proveedor activo se elimina, por lo que `ollama-large/qwen3.5:27b` llega a Ollama como `qwen3.5:27b`.

  </Accordion>

  <Accordion title="Perfil de modelo local ligero">
    Algunos modelos locales pueden responder indicaciones simples pero tienen dificultades con la superficie completa de herramientas del agente. Comience limitando las herramientas y el contexto antes de cambiar la configuración global de tiempo de ejecución.

    ```json5
    {
      agents: {
        list: [
          {
            id: "local",
            experimental: {
              localModelLean: true,
            },
            model: { primary: "ollama/gemma4" },
          },
        ],
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

    Use `compat.supportsTools: false` solo cuando el modelo o el servidor falla de manera confiable en los esquemas de herramientas. Intercambia la capacidad del agente por estabilidad.
    `localModelLean` elimina las herramientas del navegador, cron y mensajes de la superficie del agente, pero no cambia el contexto de tiempo de ejecución o el modo de pensamiento de Ollama. Combínelo con `params.num_ctx` y `params.thinking: false` explícitos para modelos pequeños de pensamiento estilo Qwen que entran en bucles o gastan su presupuesto de respuesta en razonamiento oculto.

  </Accordion>
</AccordionGroup>

### Selección de modelo

Una vez configurado, todos sus modelos de Ollama están disponibles:

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

También se admiten ID de proveedor de Ollama personalizados. Cuando una referencia de modelo usa el prefijo
proveedor activo, como `ollama-spark/qwen3:32b`, OpenClaw elimina solo ese
prefijo antes de llamar a Ollama para que el servidor reciba `qwen3:32b`.

Para modelos locales lentos, prefiera el ajuste de solicitudes con ámbito de proveedor antes de aumentar
todo el tiempo de espera de ejecución del agente:

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

`timeoutSeconds` se aplica a la solicitud HTTP del modelo, incluyendo la configuración de conexión,
encabezados, transmisión del cuerpo y la cancelación total de la búsqueda protegida. `params.keep_alive`
se reenvía a Ollama como `keep_alive` de nivel superior en las solicitudes `/api/chat` nativas;
establézcalo por modelo cuando el tiempo de carga del primer turno sea el cuello de botella.

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

Para hosts remotos, reemplace `127.0.0.1` con el host utilizado en `baseUrl`. Si `curl` funciona pero OpenClaw no, verifique si el Gateway se ejecuta en una máquina diferente, contenedor o cuenta de servicio.

## Búsqueda web de Ollama

OpenClaw admite **Búsqueda web de Ollama** como proveedor `web_search` incluido.

| Propiedad     | Detalle                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host          | Utiliza su host de Ollama configurado (`models.providers.ollama.baseUrl` si está configurado, de lo contrario `http://127.0.0.1:11434`); `https://ollama.com` utiliza la API alojada directamente                   |
| Autenticación | Sin clave para hosts locales de Ollama con sesión iniciada; `OLLAMA_API_KEY` o autenticación de proveedor configurada para búsqueda `https://ollama.com` directa o hosts protegidos por autenticación               |
| Requisito     | Los hosts locales/autohospedados deben estar ejecutándose y con sesión iniciada con `ollama signin`; la búsqueda alojada directa requiere `baseUrl: "https://ollama.com"` además de una clave de API real de Ollama |

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

Para un demonio local con sesión iniciada, OpenClaw utiliza el proxy `/api/experimental/web_search` del demonio. Para `https://ollama.com`, llama al punto final `/api/web_search` alojado directamente.

<Note>Para obtener detalles completos sobre la configuración y el comportamiento, consulte [Búsqueda web de Ollama](/es/tools/ollama-search).</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo compatible con OpenAI heredado">
    <Warning>
    **Las llamadas a herramientas no son fiables en el modo compatible con OpenAI.** Use este modo solo si necesita el formato OpenAI para un proxy y no depende del comportamiento nativo de llamadas a herramientas.
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

    Este modo puede no admitir streaming y llamadas a herramientas simultáneamente. Es posible que deba desactivar el streaming con `params: { streaming: false }` en la configuración del modelo.

    Cuando se usa `api: "openai-completions"` con Ollama, OpenClaw inyecta `options.num_ctx` de forma predeterminada para que Ollama no regrese silenciosamente a una ventana de contexto de 4096. Si su proxy/upstream rechaza campos `options` desconocidos, desactive este comportamiento:

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
    Para los modelos descubiertos automáticamente, OpenClaw utiliza la ventana de contexto reportada por Ollama cuando está disponible, incluyendo valores más grandes de `PARAMETER num_ctx` de archivos Modelfiles personalizados. De lo contrario, recurre a la ventana de contexto predeterminada de Ollama utilizada por OpenClaw.

    Puede establecer los valores predeterminados a nivel de proveedor de `contextWindow`, `contextTokens` y `maxTokens` para cada modelo bajo ese proveedor Ollama, y luego anularlos por modelo cuando sea necesario. `contextWindow` es el presupuesto de prompt y compactación de OpenClaw. Las solicitudes nativas de Ollaman dejan `options.num_ctx` sin establecer a menos que configure explícitamente `params.num_ctx`, por lo que Ollama puede aplicar su propio modelo, `OLLAMA_CONTEXT_LENGTH`, o valor predeterminado basado en VRAM. Para limitar o forzar el contexto de ejecución por solicitud de Ollama sin reconstruir un Modelfile, establezca `params.num_ctx`; se ignoran los valores no válidos, cero, negativos y no finitos. Si actualizó una configuración anterior que usaba solo `contextWindow` o `maxTokens` para forzar un contexto de solicitud nativo de Ollama, ejecute `openclaw doctor --fix` para copiar esos presupuestos explícitos de proveedor o modelo en `params.num_ctx`. El adaptador Ollama compatible con OpenAI todavía inyecta `options.num_ctx` por defecto desde el `params.num_ctx` configurado o `contextWindow`; desactívelo con `injectNumCtxForOpenAICompat: false` si su upstream rechaza `options`.

    Las entradas de modelos nativos de Ollama también aceptan las opciones comunes de ejecución de Ollama bajo `params`, incluyendo `temperature`, `top_p`, `top_k`, `min_p`, `num_predict`, `stop`, `repeat_penalty`, `num_batch`, `num_thread` y `use_mmap`. OpenClaw solo reenvía las claves de solicitud de Ollama, por lo que los parámetros de ejecución de OpenClaw como `streaming` no se filtran a Ollama. Use `params.think` o `params.thinking` para enviar `think` de nivel superior de Ollama; `false` desactiva el pensamiento a nivel de API para modelos de pensamiento estilo Qwen.

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

    El `agents.defaults.models["ollama/<model>"].params.num_ctx` por modelo también funciona. Si ambos están configurados, la entrada del modelo de proveedor explícito tiene prioridad sobre el valor predeterminado del agente.

  </Accordion>

  <Accordion title="Control de pensamiento">
    Para los modelos nativos de Ollama, OpenClaw reenvía el control de pensamiento como Ollama espera: `think` de nivel superior, no `options.think`. Los modelos descubiertos automáticamente cuya respuesta `/api/show` incluye la capacidad `thinking` exponen `/think low`, `/think medium`, `/think high` y `/think max`; los modelos no pensantes exponen solo `/think off`.

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

    El `params.think` o `params.thinking` por modelo puede desactivar o forzar el pensamiento de la API de Ollama para un modelo configurado específico. OpenClaw conserva esos parámetros explícitos del modelo cuando la ejecución activa solo tiene el `off` predeterminado implícito; los comandos de tiempo de ejecución no desactivados como `/think medium` todavía anulan la ejecución activa.

  </Accordion>

  <Accordion title="Modelos de razonamiento">
    OpenClaw trata los modelos con nombres como `deepseek-r1`, `reasoning` o `think` como capaces de razonamiento de forma predeterminada.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    No se necesita configuración adicional. OpenClaw los marca automáticamente.

  </Accordion>

<Accordion title="Costos del modelo">Ollama es gratuito y se ejecuta localmente, por lo que todos los costos del modelo se establecen en $0. Esto se aplica tanto a los modelos descubiertos automáticamente como a los definidos manualmente.</Accordion>

  <Accordion title="Incrustaciones de memoria">
    El complemento Ollama incluido registra un proveedor de incrustaciones de memoria para
    [búsqueda de memoria](/es/concepts/memory). Utiliza la URL base de Ollama configurada
    y la clave de API, llama al punto de conexión actual de Ollama `/api/embed` y agrupa
    múltiples fragmentos de memoria en una sola solicitud `input` cuando es posible.

    Cuando `proxy.enabled=true`, las solicitudes de incrustación de memoria de Ollama al origen de bucle local del host exacto derivado de `baseUrl` configurado utilizan
    la ruta directa protegida de OpenClaw en lugar del proxy de reenvío administrado. El
    nombre de host configurado debe ser `localhost` o una IP de bucle local literal;
    los nombres DNS que simplemente se resuelven a bucle local aún usan la ruta del proxy administrado.
    Los hosts Ollama de LAN, tailnet, red privada y pública también se mantienen en la
    ruta del proxy administrado. Los redireccionamientos a otro host o puerto no heredan la confianza.
    Los operadores aún pueden configurar la configuración global `proxy.loopbackMode: "proxy"` para
    enviar tráfico de bucle local a través del proxy, o `proxy.loopbackMode: "block"`
    para denegar conexiones de bucle local antes de abrir una conexión; consulte
    [Proxy administrado](/es/security/network-proxy#gateway-loopback-mode) para conocer el
    efecto en todo el proceso de esta configuración.

    | Propiedad      | Valor               |
    | ------------- | ------------------- |
    | Modelo predeterminado | `nomic-embed-text`  |
    | Extracción automática     | Sí: el modelo de incrustación se extrae automáticamente si no está presente localmente |

    Las incrustaciones en el momento de la consulta utilizan prefijos de recuperación para modelos que los requieren o recomiendan, incluyendo `nomic-embed-text`, `qwen3-embedding` y `mxbai-embed-large`. Los lotes de documentos de memoria permanecen sin procesar para que los índices existentes no necesiten una migración de formato.

    Para seleccionar Ollama como proveedor de incrustación de búsqueda de memoria:

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              // Default for Ollama. Raise on larger hosts if reindexing is too slow.
              nonBatchConcurrency: 1,
            },
          },
        },
      },
    }
    ```

    Para un host de incrustación remoto, mantenga la autenticación limitada a ese host:

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            model: "nomic-embed-text",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              apiKey: "ollama-local",
              nonBatchConcurrency: 2,
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuración de streaming">
    La integración de Ollama de OpenClaw utiliza la **API nativa de Ollama** (`/api/chat`) de forma predeterminada, lo que permite compatibilidad total con streaming y llamadas a herramientas simultáneamente. No se necesita ninguna configuración especial.

    Para las solicitudes nativas de `/api/chat`, OpenClaw también reenvía el control de pensamiento directamente a Ollama: `/think off` y `openclaw agent --thinking off` envían `think: false` de nivel superior a menos que se configure un valor de modelo `params.think`/`params.thinking` explícito, mientras que `/think low|medium|high` envían la cadena de esfuerzo `think` de nivel superior correspondiente. `/think max` se asigna al mayor esfuerzo nativo de Ollama, `think: "high"`.

    <Tip>
    Si necesita usar el endpoint compatible con OpenAI, consulte la sección "Modo heredado compatible con OpenAI" anterior. El streaming y las llamadas a herramientas pueden no funcionar simultáneamente en ese modo.
    </Tip>

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Bucle de bloqueo de WSL2 (reinicios repetidos)">
    En WSL2 con NVIDIA/CUDA, el instalador oficial de Ollama para Linux crea una unidad de `ollama.service` systemd con `Restart=always`. Si ese servicio se inicia automáticamente y carga un modelo con GPU durante el arranque de WSL2, Ollama puede fijar la memoria del host mientras se carga el modelo. La recuperación de memoria de Hyper-V no siempre puede recuperar esas páginas fijadas, por lo que Windows puede terminar la máquina virtual de WSL2, systemd inicia Ollama nuevamente y el bucle se repite.

    Evidencia común:

    - reinicios o terminaciones repetidas de WSL2 desde el lado de Windows
    - alto uso de CPU en `app.slice` o `ollama.service` poco después del inicio de WSL2
    - SIGTERM de systemd en lugar de un evento del OOM-killer de Linux

    OpenClaw registra una advertencia de inicio cuando detecta WSL2, `ollama.service` habilitado con `Restart=always` y marcadores CUDA visibles.

    Mitigación:

    ```bash
    sudo systemctl disable ollama
    ```

    Añada esto a `%USERPROFILE%\.wslconfig` en el lado de Windows y luego ejecute `wsl --shutdown`:

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    Configure un keep-alive más corto en el entorno del servicio Ollama, o inicie Ollama manualmente solo cuando lo necesite:

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    Consulte [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317).

  </Accordion>

  <Accordion title="Ollama no detectado">
    Asegúrese de que Ollama se esté ejecutando y de que haya configurado `OLLAMA_API_KEY` (o un perfil de autenticación), y de que **no** haya definido una entrada explícita de `models.providers.ollama`:

    ```bash
    ollama serve
    ```

    Verifique que la API sea accesible:

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="No hay modelos disponibles">
    Si su modelo no aparece en la lista, extráigalo localmente o defínalo explícitamente en `models.providers.ollama`.

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
    Verifique desde la misma máquina y entorno de ejecución que ejecuta el Gateway:

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    Causas comunes:

    - `baseUrl` apunta a `localhost`, pero el Gateway se ejecuta en Docker o en otro host.
    - La URL usa `/v1`, lo cual selecciona el comportamiento compatible con OpenAI en lugar del nativo de Ollama.
    - El host remoto necesita cambios en el firewall o en la vinculación de LAN en el lado de Ollama.
    - El modelo está presente en el demonio de su laptop pero no en el demonio remoto.

  </Accordion>

  <Accordion title="El modelo devuelve JSON de herramientas como texto">
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

    Si un modelo local pequeño todavía falla en los esquemas de herramientas, establezca `compat.supportsTools: false` en esa entrada del modelo y vuelva a probar.

  </Accordion>

  <Accordion title="Kimi o GLM devuelven símbolos ilegibles">
    Las respuestas alojadas de Kimi/GLM que son ejecuciones largas de símbolos no lingüísticos se tratan como salida fallida del proveedor en lugar de una respuesta exitosa del asistente. Eso permite que la gestión normal de reintentos, alternativas o errores tome el control sin persistir el texto corrupto en la sesión.

    Si sucede repetidamente, capture el nombre sin formato del modelo, el archivo de sesión actual y si la ejecución usó `Cloud + Local` o `Cloud only`, luego intente una sesión nueva y un modelo alternativo:

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="El modelo local en frío agota el tiempo de espera">
    Los modelos locales grandes pueden necesitar una carga inicial larga antes de que comience la transmisión. Mantenga el tiempo de espera limitado al proveedor de Ollama y, opcionalmente, pida a Ollama que mantenga el modelo cargado entre turnos:

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

    Si el host mismo es lento para aceptar conexiones, `timeoutSeconds` también extiende el tiempo de espera de conexión protegido de Undici para este proveedor.

  </Accordion>

  <Accordion title="El modelo de contexto largo es demasiado lento o se queda sin memoria">
    Muchos modelos de Ollama anuncian contextos que son más grandes de lo que su hardware puede ejecutar cómodamente. Ollama nativo utiliza el contexto de ejecución predeterminado de Ollama a menos que establezca `params.num_ctx`. Limite tanto el presupuesto de OpenClaw como el contexto de solicitud de Ollama cuando desee una latencia predecible del primer token:

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

    Reduzca `contextWindow` primero si OpenClaw está enviando demasiado mensaje. Reduzca `params.num_ctx` si Ollama está cargando un contexto de ejecución que es demasiado grande para la máquina. Reduzca `maxTokens` si la generación se ejecuta durante demasiado tiempo.

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
    Detalles completos de configuración y comportamiento para la búsqueda web con tecnología de Ollama.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
