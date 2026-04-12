---
title: "Arnés de Codex"
summary: "Ejecuta turnos de agente integrados de OpenClaw a través del arnés del servidor de aplicaciones Codex incluido"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Arnés de Codex

El complemento `codex` incluido permite que OpenClaw ejecute turnos de agente integrados a través del
servidor de aplicaciones Codex en lugar del arnés PI integrado.

Use esto cuando quiera que Codex sea el propietario de la sesión de agente de bajo nivel: descubrimiento de modelos,
reanudación de subprocesos nativos, compactación nativa y ejecución del servidor de aplicaciones.
OpenClaw sigue siendo el propietario de los canales de chat, los archivos de sesión, la selección de modelos, las herramientas,
las aprobaciones, la entrega de medios y el espejo de la transcripción visible.

El arnés está desactivado de forma predeterminada. Se selecciona solo cuando el complemento `codex` está
habilitado y el modelo resuelto es un modelo `codex/*`, o cuando fuerza explícitamente
`embeddedHarness.runtime: "codex"` o `OPENCLAW_AGENT_RUNTIME=codex`.
Si nunca configura `codex/*`, las ejecuciones existentes de PI, OpenAI, Anthropic, Gemini, locales
y de proveedores personalizados mantienen su comportamiento actual.

## Elija el prefijo de modelo correcto

OpenClaw tiene rutas separadas para el acceso con forma de OpenAI y Codex:

| Referencia de modelo   | Ruta de tiempo de ejecución                                    | Usar cuando                                                                                  |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `openai/gpt-5.4`       | Proveedor de OpenAI a través de la canalización de OpenClaw/PI | Desea acceso directo a la API de la plataforma OpenAI con `OPENAI_API_KEY`.                  |
| `openai-codex/gpt-5.4` | Proveedor de OAuth de OpenAI Codex a través de PI              | Desea ChatGPT/Codex OAuth sin el arnés del servidor de aplicaciones Codex.                   |
| `codex/gpt-5.4`        | Proveedor de Codex incluido más arnés de Codex                 | Desea ejecución nativa del servidor de aplicaciones Codex para el turno de agente integrado. |

El arnés de Codex solo reclama referencias de modelos `codex/*`. Las referencias de proveedores `openai/*`,
`openai-codex/*`, Anthropic, Gemini, xAI, locales y personalizados existentes mantienen
sus rutas normales.

## Requisitos

- OpenClaw con el complemento `codex` incluido disponible.
- Servidor de aplicaciones Codex `0.118.0` o más reciente.
- Autenticación de Codex disponible para el proceso del servidor de aplicaciones.

El complemento bloquea los protocolos de enlace de servidores de aplicaciones antiguos o sin versión. Esto mantiene
a OpenClaw en la superficie del protocolo contra la que se ha probado.

Para pruebas en vivo y de humo de Docker, la autenticación generalmente proviene de `OPENAI_API_KEY`, más
archivos opcionales de la CLI de Codex como `~/.codex/auth.json` y
`~/.codex/config.toml`. Use el mismo material de autenticación que su servidor de aplicaciones Codex local
usa.

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

## Agregar Codex sin reemplazar otros modelos

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

Deshabilite la alternativa de PI cuando necesite demostrar que cada turno de agente integrado usa
el arnés Codex:

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
auto-selección normal:

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

Use comandos de sesión normales para cambiar de agentes y modelos. `/new` crea una nueva
sesión de OpenClaw y el arnés Codex crea o reanuda su subproceso sidecar del servidor de aplicaciones
según sea necesario. `/reset` borra el enlace de sesión de OpenClaw para ese subproceso.

## Descubrimiento de modelos

De forma predeterminada, el complemento Codex solicita al servidor de aplicaciones los modelos disponibles. Si el
descubrimiento falla o agota el tiempo de espera, utiliza el catálogo de reserva incluido:

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

Puedes ajustar el descubrimiento bajo `plugins.entries.codex.config.discovery`:

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

Deshabilita el descubrimiento cuando quieras que el inicio evite sondear Codex y se apegue al
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

Por defecto, el complemento inicia Codex localmente con:

```bash
codex app-server --listen stdio://
```

Puedes mantener ese valor predeterminado y solo ajustar la política nativa de Codex:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            approvalPolicy: "on-request",
            sandbox: "workspace-write",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Para un servidor de aplicaciones que ya se está ejecutando, usa el transporte WebSocket:

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

Campos `appServer` compatibles:

| Campo               | Predeterminado                           | Significado                                                                                       |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` genera Codex; `"websocket"` se conecta a `url`.                                         |
| `command`           | `"codex"`                                | Ejecutable para el transporte stdio.                                                              |
| `args`              | `["app-server", "--listen", "stdio://"]` | Argumentos para el transporte stdio.                                                              |
| `url`               | sin establecer                           | URL del servidor de aplicaciones WebSocket.                                                       |
| `authToken`         | sin establecer                           | Token de portador para el transporte WebSocket.                                                   |
| `headers`           | `{}`                                     | Encabezados WebSocket adicionales.                                                                |
| `requestTimeoutMs`  | `60000`                                  | Tiempo de espera para las llamadas al plano de control del servidor de aplicaciones.              |
| `approvalPolicy`    | `"never"`                                | Política de aprobación nativa de Codex enviada al inicio/reanudación/turno del hilo.              |
| `sandbox`           | `"workspace-write"`                      | Modo de espacio aislado (sandbox) nativo de Codex enviado al inicio/reanudación del hilo.         |
| `approvalsReviewer` | `"user"`                                 | Usa `"guardian_subagent"` para permitir que el guardián de Codex revise las aprobaciones nativas. |
| `serviceTier`       | sin establecer                           | Nivel de servicio de Codex opcional, por ejemplo `"priority"`.                                    |

Las variables de entorno antiguas aún funcionan como respaldo para pruebas locales cuando
el campo de configuración coincidente no está establecido:

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`
- `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`

Se prefiere la configuración para implementaciones repetibles.

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

Validación del arnés solo de Codex, con reserva de PI deshabilitada:

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

El cambio de modelo permanece controlado por OpenClaw. Cuando una sesión de OpenClaw está adjunta a un hilo de Codex existente, el siguiente turno envía el modelo `codex/*`, proveedor, política de aprobación, sandbox y nivel de servicio actualmente seleccionados al servidor de aplicaciones nuevamente. Cambiar de `codex/gpt-5.4` a `codex/gpt-5.2` mantiene el enlace del hilo pero pide a Codex que continúe con el modelo recién seleccionado.

## Comando Codex

El plugin incluido registra `/codex` como un comando de barra autorizado. Es genérico y funciona en cualquier canal que soporte comandos de texto de OpenClaw.

Formas comunes:

- `/codex status` muestra la conectividad en vivo del servidor de aplicaciones, modelos, cuenta, límites de velocidad, servidores MCP y habilidades.
- `/codex models` enumera los modelos del servidor de aplicaciones de Codex en vivo.
- `/codex threads [filter]` enumera los hilos de Codex recientes.
- `/codex resume <thread-id>` adjunta la sesión actual de OpenClaw a un hilo de Codex existente.
- `/codex compact` pide al servidor de aplicaciones de Codex que compacte el hilo adjunto.
- `/codex review` inicia la revisión nativa de Codex para el hilo adjunto.
- `/codex account` muestra el estado de la cuenta y los límites de velocidad.
- `/codex mcp` enumera el estado del servidor MCP del servidor de aplicaciones de Codex.
- `/codex skills` enumera las habilidades del servidor de aplicaciones de Codex.

`/codex resume` escribe el mismo archivo de enlace sidecar que el arnés usa para turnos normales. En el siguiente mensaje, OpenClaw reanuda ese hilo de Codex, pasa el modelo `codex/*` de OpenClaw seleccionado actualmente al servidor de aplicaciones y mantiene el historial extendido habilitado.

La superficie de comandos requiere el servidor de aplicaciones de Codex `0.118.0` o más reciente. Los métodos de control individuales se reportan como `unsupported by this Codex app-server` si un servidor de aplicaciones futuro o personalizado no expone ese método JSON-RPC.

## Herramientas, medios y compactación

El arnés de Codex cambia solo el ejecutor del agente integrado de bajo nivel.

OpenClaw todavía construye la lista de herramientas y recibe resultados dinámicos de herramientas desde el arnés. El texto, las imágenes, el video, la música, el TTS, las aprobaciones y el resultado de la herramienta de mensajería continúan a través de la ruta de entrega normal de OpenClaw.

Cuando el modelo seleccionado utiliza el arnés de Codex, la compactación de subprocesos nativos se delega al servidor de aplicaciones de Codex. OpenClaw mantiene un espejo de transcripción para el historial del canal, la búsqueda, `/new`, `/reset` y el cambio futuro de modelo o arnés. El espejo incluye el mensaje del usuario, el texto final del asistente y registros ligeros de razonamiento o planificación de Codex cuando el servidor de aplicaciones los emite.

La generación de medios no requiere PI. La imagen, el video, la música, el PDF, el TTS y la comprensión de medios continúan utilizando la configuración de proveedor/modelo coincidente, como `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` y `messages.tts`.

## Solución de problemas

**Codex no aparece en `/model`:** habilite `plugins.entries.codex.enabled`, establezca una referencia de modelo `codex/*`, o verifique si `plugins.allow` excluye `codex`.

**OpenClaw vuelve a PI:** establezca `embeddedHarness.fallback: "none"` o `OPENCLAW_AGENT_HARNESS_FALLBACK=none` mientras realiza pruebas.

**El servidor de aplicaciones es rechazado:** actualice Codex para que el protocolo de enlace del servidor de aplicaciones reporte la versión `0.118.0` o más reciente.

**El descubrimiento de modelos es lento:** reduzca `plugins.entries.codex.config.discovery.timeoutMs` o deshabilite el descubrimiento.

**El transporte WebSocket falla inmediatamente:** verifique `appServer.url`, `authToken` y que el servidor de aplicaciones remoto hable la misma versión del protocolo del servidor de aplicaciones de Codex.

**Un modelo que no es de Codex usa PI:** eso es esperado. El arnés de Codex solo reclama referencias de modelo `codex/*`.

## Relacionado

- [Complementos de arnés de agente](/en/plugins/sdk-agent-harness)
- [Proveedores de modelos](/en/concepts/model-providers)
- [Referencia de configuración](/en/gateway/configuration-reference)
- [Pruebas](/en/help/testing#live-codex-app-server-harness-smoke)
