---
summary: "code_execution: ejecuta análisis remoto de Python en sandbox con xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Ejecución de código"
---

`code_execution` ejecuta un análisis remoto de Python en sandbox en la API de Respuestas de xAI. Está registrado por el complemento incluido `xai` (bajo el contrato `tools`) y despacha al mismo punto final `https://api.x.ai/v1/responses` utilizado por `x_search`.

| Propiedad                       | Valor                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Nombre de la herramienta        | `code_execution`                                                                               |
| Complemento de proveedor        | `xai` (incluido, `enabledByDefault: true`)                                                     |
| Autenticación                   | perfil de autenticación de xAI, `XAI_API_KEY`, o `plugins.entries.xai.config.webSearch.apiKey` |
| Modelo predeterminado           | `grok-4-1-fast`                                                                                |
| Tiempo de espera predeterminado | 30 segundos                                                                                    |
| `maxTurns` predeterminado       | sin establecer (xAI aplica su propio límite interno)                                           |

Esto es diferente de [`exec`](/es/tools/exec) local:

- `exec` ejecuta comandos de shell en tu máquina o nodo emparejado.
- `code_execution` ejecuta Python en el sandbox remoto de xAI.

Usa `code_execution` para:

- Cálculos.
- Tabulación.
- Estadísticas rápidas.
- Análisis de tipo gráfico.
- Analizar datos devueltos por `x_search` o `web_search`.

**No** lo uses cuando necesites archivos locales, tu shell, tu repositorio o dispositivos emparejados. Usa [`exec`](/es/tools/exec) para eso.

## Configuración

<Steps>
  <Step title="Proporcionar una clave de API de xAI">
    Ejecuta `openclaw onboard --auth-choice xai-api-key` para `code_execution` y
    `x_search`, o establece `XAI_API_KEY` / configura la clave bajo el complemento xAI
    cuando también quieras que la búsqueda web de Grok use la misma credencial:

    ```bash
    export XAI_API_KEY=xai-...
    ```

    O vía configuración:

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
    La herramienta está limitada por `plugins.entries.xai.config.codeExecution.enabled`. El valor predeterminado es desactivado.

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

  <Step title="Reiniciar la pasarela">
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

La herramienta toma internamente un único parámetro `task`, por lo que el agente debe enviar la solicitud completa de análisis y cualquier dato en línea en un solo aviso.

## Errores

Cuando la herramienta se ejecuta sin autenticación, devuelve un error estructurado `missing_xai_api_key` que señala el perfil de autenticación, la variable de entorno y las opciones de configuración. El error es JSON, no una excepción lanzada, por lo que el agente puede autocorregirse:

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution needs an xAI API key. Run openclaw onboard --auth-choice xai-api-key, set XAI_API_KEY in the Gateway environment, or configure plugins.entries.xai.config.webSearch.apiKey.",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## Límites

- Esto es una ejecución remota de xAI, no una ejecución de procesos locales.
- Trate los resultados como un análisis efímero, no como una sesión de notebook persistente.
- No asuma el acceso a archivos locales ni a su espacio de trabajo.
- Para obtener datos frescos de X, use primero [`x_search`](/es/tools/web#x_search) y canalice el resultado en `code_execution`.

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
