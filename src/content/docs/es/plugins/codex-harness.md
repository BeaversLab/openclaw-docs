---
title: "Arnés de Codex"
summary: "Ejecuta turnos de agentes integrados de OpenClaw a través del arnés del servidor de aplicaciones Codex incluido"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Arnés de Codex

El complemento `codex` incluido permite a OpenClaw ejecutar turnos de agentes integrados a través del
servidor de aplicaciones Codex en lugar del arnés PI integrado.

Use esto cuando quiera que Codex sea el propietario de la sesión de agente de bajo nivel: descubrimiento de modelos,
reanudación de subprocesos nativos, compactación nativa y ejecución del servidor de aplicaciones.
OpenClaw sigue siendo el propietario de los canales de chat, los archivos de sesión, la selección de modelos, las herramientas,
las aprobaciones, la entrega de medios y el espejo de la transcripción visible.

Los turnos nativos de Codex también respetan los enlaces de complementos compartidos, por lo que los shims de indicaciones,
la automatización consciente de la compactación, el middleware de herramientas y los observadores del ciclo de vida se mantienen
alineados con el arnés PI:

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `tool_result`, `after_tool_call`
- `before_message_write`
- `agent_end`

Los complementos incluidos también pueden registrar una fábrica de extensión del servidor de aplicaciones Codex para agregar
middleware asíncrono `tool_result`, y las escrituras de transcripciones reflejadas de Codex se enrutan
a través de `before_message_write`.

El arnés está desactivado de forma predeterminada. Se selecciona solo cuando el complemento `codex` está
habilitado y el modelo resuelto es un modelo `codex/*`, o cuando forzas explícitamente
`embeddedHarness.runtime: "codex"` o `OPENCLAW_AGENT_RUNTIME=codex`.
Si nunca configuras `codex/*`, las ejecuciones existentes de PI, OpenAI, Anthropic, Gemini, locales
y de proveedores personalizados mantienen su comportamiento actual.

## Elige el prefijo de modelo correcto

OpenClaw tiene rutas separadas para el acceso de tipo OpenAI y Codex:

| Referencia de modelo   | Ruta de tiempo de ejecución                                    | Usar cuando                                                                                       |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `openai/gpt-5.4`       | Proveedor de OpenAI a través de la canalización de OpenClaw/PI | Deseas acceso directo a la API de la plataforma de OpenAI con `OPENAI_API_KEY`.                   |
| `openai-codex/gpt-5.4` | Proveedor de OAuth de OpenAI Codex a través de PI              | Deseas ChatGPT/Codex OAuth sin el arnés del servidor de aplicaciones Codex.                       |
| `codex/gpt-5.4`        | Proveedor de Codex incluido más arnés de Codex                 | Deseas la ejecución nativa del servidor de aplicaciones Codex para el turno del agente integrado. |

El arnés de Codex solo reclama referencias de modelos `codex/*`. Las referencias de proveedores existentes `openai/*`,
`openai-codex/*`, Anthropic, Gemini, xAI, locales y personalizados mantienen
sus rutas normales.

## Requisitos

- OpenClaw con el complemento incluido `codex` disponible.
- Codex app-server `0.118.0` o más reciente.
- Autenticación de Codex disponible para el proceso del servidor de aplicaciones.

El complemento bloquea los protocolos de enlace del servidor de aplicaciones antiguos o sin versión. Esto mantiene
a OpenClaw en la superficie del protocolo contra la que se ha probado.

Para pruebas de humo en vivo y con Docker, la autenticación generalmente proviene de `OPENAI_API_KEY`, además
de archivos opcionales de la CLI de Codex como `~/.codex/auth.json` y
`~/.codex/config.toml`. Utilice el mismo material de autenticación que utiliza su servidor de aplicaciones Codex local.

## Configuración mínima

Use `codex/gpt-5.4`, habilite el complemento incluido y fuerce el arnés `codex`:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

Si su configuración usa `plugins.allow`, incluya `codex` allí también:

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Establecer `agents.defaults.model` o un modelo de agente en `codex/<model>` también
habilita automáticamente el complemento incluido `codex`. La entrada explícita del complemento sigue
siendo útil en configuraciones compartidas porque hace obvia la intención de implementación.

## Añadir Codex sin reemplazar otros modelos

Mantenga `runtime: "auto"` cuando desee Codex para modelos `codex/*` y PI para
todo lo demás:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: "codex/gpt-5.4",
        fallbacks: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
      },
      models: {
        "codex/gpt-5.4": { alias: "codex" },
        "codex/gpt-5.4-mini": { alias: "codex-mini" },
        "openai/gpt-5.4": { alias: "gpt" },
        "anthropic/claude-opus-4-6": { alias: "opus" },
      },
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
  },
}
```

Con esta forma:

- `/model codex` o `/model codex/gpt-5.4` usa el arnés del servidor de aplicaciones Codex.
- `/model gpt` o `/model openai/gpt-5.4` usa la ruta del proveedor OpenAI.
- `/model opus` usa la ruta del proveedor Anthropic.
- Si se selecciona un modelo que no sea Codex, PI sigue siendo el arnés de compatibilidad.

## Implementaciones solo de Codex

Deshabilite la alternativa (fallback) de PI cuando necesite probar que cada turno de agente integrado usa
el arnés de Codex:

```json5
{
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

Anulación de entorno:

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Con la alternativa deshabilitada, OpenClaw falla temprano si el complemento Codex está deshabilitado,
el modelo solicitado no es una referencia `codex/*`, el servidor de aplicaciones es demasiado antiguo o el
servidor de aplicaciones no puede iniciarse.

## Codex por agente

Puede hacer que un agente sea solo Codex mientras que el agente predeterminado mantiene la
selección automática normal:

```json5
{
  agents: {
    defaults: {
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "codex/gpt-5.4",
        embeddedHarness: {
          runtime: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

Use los comandos de sesión normales para cambiar de agentes y modelos. `/new` crea una nueva sesión
de OpenClaw y el harness de Codex crea o reanuda su subproceso del servidor de aplicaciones
sidecar según sea necesario. `/reset` borra el enlace de la sesión de OpenClaw para ese subproceso.

## Descubrimiento de modelos

De forma predeterminada, el complemento Codex solicita al servidor de aplicaciones los modelos disponibles. Si
descubrimiento falla o agota el tiempo de espera, utiliza el catálogo de respaldo incluido:

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

Puede ajustar el descubrimiento en `plugins.entries.codex.config.discovery`:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

Deshabilite el descubrimiento cuando desee que el inicio evite sondear Codex y se mantenga en el
catálogo de respaldo:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## Conexión y política del servidor de aplicaciones

De forma predeterminada, el complemento inicia Codex localmente con:

```bash
codex app-server --listen stdio://
```

De forma predeterminada, OpenClaw inicia sesiones locales del harness Codex en modo YOLO:
`approvalPolicy: "never"`, `approvalsReviewer: "user"` y
`sandbox: "danger-full-access"`. Esta es la postura de operador local confiable utilizada
para latidos autónomos: Codex puede usar herramientas de shell y red sin
detenerse en indicadores de aprobación nativos a los que nadie está alrededor para responder.

Para optar por aprobaciones revisadas por el guardián de Codex, establezca `appServer.mode:
"guardian"`:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

El modo Guardian se expande a:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

Guardian es un revisor de aprobaciones nativo de Codex. Cuando Codex pide salir del
sandbox, escribir fuera del espacio de trabajo o agregar permisos como el acceso a la red,
Codex enruta esa solicitud de aprobación a un subagente revisor en lugar de un
indicador humano. El revisor recopila contexto y aplica el marco de riesgo de Codex, luego
aprueba o deniega la solicitud específica. Guardian es útil cuando desea más
salvaguardas que el modo YOLO pero aún necesita agentes y latidos sin supervisión para
progresar.

El harness vivo de Docker incluye una sonda Guardian cuando
`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`. Inicia el harness Codex en
modo Guardian, verifica que un comando de shell escalado benigno sea aprobado, y
verifica que una carga de un secreto falso a un destino externo que no es de confianza sea
denegada para que el agente solicite aprobación explícita.

Los campos de política individuales todavía tienen prioridad sobre `mode`, por lo que las implementaciones avanzadas pueden
mezclar la configuración preestablecida con opciones explícitas.

Para un servidor de aplicaciones ya en ejecución, utilice el transporte WebSocket:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Campos `appServer` admitidos:

| Campo               | Predeterminado                           | Significado                                                                                                                              |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` inicia Codex; `"websocket"` se conecta a `url`.                                                                                |
| `command`           | `"codex"`                                | Ejecutable para transporte stdio.                                                                                                        |
| `args`              | `["app-server", "--listen", "stdio://"]` | Argumentos para transporte stdio.                                                                                                        |
| `url`               | sin establecer                           | URL del servidor de aplicaciones WebSocket.                                                                                              |
| `authToken`         | sin establecer                           | Token de portador para transporte WebSocket.                                                                                             |
| `headers`           | `{}`                                     | Encabezados adicionales de WebSocket.                                                                                                    |
| `requestTimeoutMs`  | `60000`                                  | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.                                                     |
| `mode`              | `"yolo"`                                 | Preajuste para ejecución YOLO o revisada por guardián.                                                                                   |
| `approvalPolicy`    | `"never"`                                | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo.                                                     |
| `sandbox`           | `"danger-full-access"`                   | Modo de sandbox nativo de Codex enviado al inicio/reanudación del hilo.                                                                  |
| `approvalsReviewer` | `"user"`                                 | Use `"guardian_subagent"` para permitir que Codex Guardian revise los avisos.                                                            |
| `serviceTier`       | sin establecer                           | Nivel de servicio opcional del servidor de aplicaciones Codex: `"fast"`, `"flex"` o `null`. Se ignoran los valores heredados no válidos. |

Las variables de entorno más antiguas todavía funcionan como alternativas para pruebas locales cuando
el campo de configuración coincidente no está establecido:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` se eliminó. Use
`plugins.entries.codex.config.appServer.mode: "guardian"` en su lugar, o
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` para pruebas locales puntuales. Se prefiere la configuración
para despliegues repetibles porque mantiene el comportamiento del plugin en el
mismo archivo revisado que el resto de la configuración del arnés Codex.

## Recetas comunes

Codex local con transporte stdio predeterminado:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Validación de arnés solo Codex, con reserva de PI deshabilitada:

```json5
{
  embeddedHarness: {
    fallback: "none",
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Aprobaciones de Codex revisadas por Guardian:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

Servidor de aplicaciones remoto con encabezados explícitos:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

El cambio de modelo permanece controlado por OpenClaw. Cuando una sesión de OpenClaw está adjunta
a un hilo Codex existente, el siguiente turno envía el modelo `codex/*` actualmente seleccionado,
proveedor, política de aprobación, sandbox y nivel de servicio al
servidor de aplicaciones nuevamente. Cambiar de `codex/gpt-5.4` a `codex/gpt-5.2` mantiene el
vinculo del hilo pero pide a Codex que continúe con el modelo recién seleccionado.

## Comando Codex

El plugin incluido registra `/codex` como un comando de barra autorizado. Es
genérico y funciona en cualquier canal que soporte comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` muestra la conectividad en vivo del servidor de aplicaciones, modelos, cuenta, límites de velocidad, servidores MCP y habilidades.
- `/codex models` lista los modelos en vivo del servidor de aplicaciones Codex.
- `/codex threads [filter]` lista los hilos Codex recientes.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un hilo Codex existente.
- `/codex compact` pide al servidor de aplicaciones Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex account` muestra el estado de la cuenta y los límites de velocidad.
- `/codex mcp` lista el estado del servidor MCP del servidor de aplicaciones Codex.
- `/codex skills` lista las habilidades del servidor de aplicaciones Codex.

`/codex resume` escribe el mismo archivo de vinculación lateral que el arnés usa para
los turnos normales. En el siguiente mensaje, OpenClaw reanuda ese hilo Codex, pasa el
modelo `codex/*` actualmente seleccionado de OpenClaw al servidor de aplicaciones, y mantiene el historial
extendido habilitado.

La superficie de comandos requiere Codex app-server `0.118.0` o más reciente. Los métodos de control individuales se reportan como `unsupported by this Codex app-server` si un app-server futuro o personalizado no expone ese método JSON-RPC.

## Herramientas, medios y compactación

El arnés de Codex cambia solo el ejecutor de agentes integrado de bajo nivel.

OpenClaw todavía construye la lista de herramientas y recibe resultados dinámicos de herramientas del arnés. El texto, las imágenes, el video, la música, el TTS, las aprobaciones y la salida de herramientas de mensajería continúan a través de la ruta de entrega normal de OpenClaw.

Las elicitudes de aprobación de herramientas de Codex MCP se enrutan a través del flujo de aprobación de complementos de OpenClaw cuando Codex marca `_meta.codex_approval_kind` como `"mcp_tool_call"`; otras solicitudes de elicitud y de entrada de forma libre aún fallan cerradas.

Cuando el modelo seleccionado usa el arnés de Codex, la compactación de hilos nativos se delega al Codex app-server. OpenClaw mantiene un espejo de transcripción para el historial del canal, búsqueda, `/new`, `/reset` y futuros cambios de modelo o arnés. El espejo incluye el aviso del usuario, el texto final del asistente y registros de razonamiento o plan ligeros de Codex cuando el app-server los emite. Hoy, OpenClaw solo registra señales de inicio y finalización de compactación nativa. Aún no expone un resumen de compactación legible por humanos ni una lista auditable de las entradas que Codex mantuvo después de la compactación.

La generación de medios no requiere PI. La imagen, el video, la música, el PDF, el TTS y la comprensión de medios continúan usando la configuración de proveedor/modelo coincidente, como `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` y `messages.tts`.

## Solución de problemas

**Codex no aparece en `/model`:** habilite `plugins.entries.codex.enabled`, establezca una referencia de modelo `codex/*`, o verifique si `plugins.allow` excluye `codex`.

**OpenClaw usa PI en lugar de Codex:** si ningún harness de Codex reclama la ejecución,
OpenClaw puede usar PI como backend de compatibilidad. Establezca
`embeddedHarness.runtime: "codex"` para forzar la selección de Codex durante las pruebas, o
`embeddedHarness.fallback: "none"` para fallar cuando no coincida ningún harness de complemento. Una vez
que se selecciona el servidor de aplicaciones de Codex, sus fallos se muestran directamente sin configuración
de respaldo adicional.

**El servidor de aplicaciones es rechazado:** actualice Codex para que el protocolo de enlace del servidor de aplicaciones
indique la versión `0.118.0` o más reciente.

**El descubrimiento de modelos es lento:** reduzca `plugins.entries.codex.config.discovery.timeoutMs`
o desactive el descubrimiento.

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken`,
y que el servidor de aplicaciones remoto hable la misma versión del protocolo del servidor de aplicaciones de Codex.

**Un modelo que no es de Codex usa PI:** eso es esperado. El harness de Codex solo reclama
referencias de modelos `codex/*`.

## Relacionado

- [Complementos de Harness de Agente](/es/plugins/sdk-agent-harness)
- [Proveedores de Modelos](/es/concepts/model-providers)
- [Referencia de Configuración](/es/gateway/configuration-reference)
- [Pruebas](/es/help/testing#live-codex-app-server-harness-smoke)
