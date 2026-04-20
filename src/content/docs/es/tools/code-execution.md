---
summary: "code_execution -- ejecuta análisis remoto de Python en un entorno aislado con xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Ejecución de Código"
---

# Ejecución de Código

`code_execution` ejecuta análisis remoto de Python en un entorno aislado en la API de Responses de xAI.
Esto es diferente de [`exec`](/es/tools/exec) local:

- `exec` ejecuta comandos de shell en tu máquina o nodo
- `code_execution` ejecuta Python en el sandbox remoto de xAI

Usa `code_execution` para:

- cálculos
- tabulación
- estadísticas rápidas
- análisis de estilo gráfico
- analizar datos devueltos por `x_search` o `web_search`

**No** lo uses cuando necesites archivos locales, tu shell, tu repositorio o dispositivos
emparejados. Usa [`exec`](/es/tools/exec) para eso.

## Configuración

Necesitas una clave de API de xAI. Cualquiera de estos funciona:

- `XAI_API_KEY`
- `plugins.entries.xai.config.webSearch.apiKey`

Ejemplo:

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...",
          },
          codeExecution: {
            enabled: true,
            model: "grok-4-1-fast",
            maxTurns: 2,
            timeoutSeconds: 30,
          },
        },
      },
    },
  },
}
```

## Cómo Usarlo

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

La herramienta toma internamente un único parámetro `task`, por lo que el agente debe enviar
la solicitud de análisis completa y cualquier dato en línea en un solo mensaje.

## Límites

- Esta es una ejecución remota de xAI, no una ejecución de proceso local.
- Debe tratarse como un análisis efímero, no como un cuaderno persistente.
- No asumas acceso a archivos locales o a tu espacio de trabajo.
- Para datos frescos de X, usa primero [`x_search`](/es/tools/web#x_search).

## Véase También

- [Herramientas web](/es/tools/web)
- [Exec](/es/tools/exec)
- [xAI](/es/providers/xai)
