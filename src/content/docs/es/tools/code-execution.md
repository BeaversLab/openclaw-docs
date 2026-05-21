---
summary: "code_execution: ejecuta análisis remoto de Python en entorno aislado con xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Ejecución de código"
---

`code_execution` ejecuta análisis remoto de Python en entorno aislado en la API de Responses de xAI. Está registrado por el complemento `xai` incluido (bajo el contrato `tools`) y envía al mismo punto final `https://api.x.ai/v1/responses` que utiliza `x_search`.

| Propiedad                       | Valor                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Nombre de la herramienta        | `code_execution`                                                                               |
| Complemento de proveedor        | `xai` (incluido, `enabledByDefault: true`)                                                     |
| Autenticación                   | Perfil de autenticación de xAI, `XAI_API_KEY`, o `plugins.entries.xai.config.webSearch.apiKey` |
| Modelo predeterminado           | `grok-4-1-fast`                                                                                |
| Tiempo de espera predeterminado | 30 segundos                                                                                    |
| `maxTurns` predeterminado       | sin establecer (xAI aplica su propio límite interno)                                           |

Esto es diferente del [`exec`](/es/tools/exec) local:

- `exec` ejecuta comandos de shell en tu máquina o nodo emparejado.
- `code_execution` ejecuta Python en el entorno aislado remoto de xAI.

Usa `code_execution` para:

- Cálculos.
- Tabulación.
- Estadísticas rápidas.
- Análisis de tipo gráfico.
- Analizar datos devueltos por `x_search` o `web_search`.

**No** lo uses cuando necesites archivos locales, tu shell, tu repositorio o dispositivos emparejados. Usa [`exec`](/es/tools/exec) para eso.

## Configuración

<Steps>
  <Step title="Proporcionar credenciales de xAI">
    Inicia sesión con Grok OAuth utilizando una suscripción elegible a SuperGrok o X Premium,
    usa el flujo de código de dispositivo compatible con sistemas remotos, o almacena una clave de API. OAuth funciona
    para `code_execution` y `x_search`; `XAI_API_KEY` o la configuración de búsqueda web
    del complemento también pueden potenciar Grok `web_search`.

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw models auth login --provider xai --device-code
    ```

    Durante una instalación nueva, las mismas opciones de autenticación están disponibles dentro
    de la incorporación:

    ```bash
    openclaw onboard --install-daemon
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    O usa una clave de API:

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

    O a través de la configuración:

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              webSearch: {
                apiKey: "xai-...",
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Habilitar y ajustar code_execution">
    `code_execution` está disponible cuando las credenciales de xAI están disponibles. Establezca
    `plugins.entries.xai.config.codeExecution.enabled` en `false` para deshabilitarlo,
    o use el mismo bloque para ajustar el modelo y el tiempo de espera.

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast", // override the default xAI code-execution model
                maxTurns: 2,            // optional cap on internal tool turns
                timeoutSeconds: 30,     // request timeout (default: 30)
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Reiniciar el Gateway">
    ```bash
    openclaw gateway restart
    ```

    `code_execution` aparece en la lista de herramientas del agente una vez que el complemento de xAI se vuelve a registrar con `enabled: true`.

  </Step>
</Steps>

## Cómo usarlo

Pregunta de forma natural y haz explícita la intención del análisis:

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

La herramienta toma internamente un único parámetro `task`, por lo que el agente debe enviar la solicitud de análisis completa y cualquier dato en línea en un solo mensaje.

## Errores

Cuando la herramienta se ejecuta sin autenticación, devuelve un error estructurado `missing_xai_api_key` que señala el perfil de autenticación, la variable de entorno y las opciones de configuración. El error es JSON, no una excepción lanzada, por lo que el agente puede autocorregirse:

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution needs xAI credentials. Run `openclaw onboard --auth-choice xai-oauth` to sign in with Grok, run `openclaw onboard --auth-choice xai-api-key`, set `XAI_API_KEY` in the Gateway environment, or configure `plugins.entries.xai.config.webSearch.apiKey`.",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## Límites

- Esto es una ejecución remota de xAI, no una ejecución de procesos locales.
- Trate los resultados como un análisis efímero, no como una sesión de notebook persistente.
- No asuma el acceso a archivos locales ni a su espacio de trabajo.
- Para obtener datos frescos de X, use [`x_search`](/es/tools/web#x_search) primero y canalice el resultado en `code_execution`.

## Relacionado

<CardGroup cols={2}>
  <Card title="Herramienta Exec" href="/es/tools/exec" icon="terminal">
    Ejecución de shell local en su máquina o nodo emparejado.
  </Card>
  <Card title="Aprobaciones de Exec" href="/es/tools/exec-approvals" icon="shield">
    Política de permitir/denegar para la ejecución de shell.
  </Card>
  <Card title="Herramientas web" href="/es/tools/web" icon="globe">
    `web_search`, `x_search` y `web_fetch`.
  </Card>
  <Card title="Proveedor xAI" href="/es/providers/xai" icon="microchip">
    Modelos Grok, búsqueda web/x y configuración de ejecución de código.
  </Card>
</CardGroup>
