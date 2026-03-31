---
summary: "code_execution -- ejecuta análisis remoto de Python en un entorno seguro con xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Ejecución de Código"
---

# Ejecución de Código

`code_execution` ejecuta análisis remoto de Python en un entorno seguro en la API de Respuestas de xAI.
Esto es diferente de [`exec`](/en/tools/exec) local:

- `exec` ejecuta comandos de shell en tu máquina o nodo
- `code_execution` ejecuta Python en el entorno seguro remoto de xAI

Use `code_execution` para:

- cálculos
- tabulación
- estadísticas rápidas
- análisis de estilo gráfico
- analizar datos devueltos por `x_search` o `web_search`

**No** lo use cuando necesite archivos locales, su shell, su repositorio o dispositivos
emparejados. Use [`exec`](/en/tools/exec) para eso.

## Configuración

Necesita una clave de API de xAI. Cualquiera de estos funciona:

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

## Cómo usarlo

Pregunte de forma natural y haga explícita la intención del análisis:

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

La herramienta toma internamente un solo parámetro `task`, por lo que el agente debe enviar
la solicitud de análisis completa y cualquier dato en línea en un solo mensaje.

## Límites

- Esta es una ejecución remota de xAI, no una ejecución de procesos local.
- Debe tratarse como un análisis efímero, no como un cuaderno persistente.
- No asuma acceso a archivos locales o a su espacio de trabajo.
- Para obtener datos frescos de X, use primero [`x_search`](/en/tools/web#x_search).

## Vea también

- [Herramientas web](/en/tools/web)
- [Exec](/en/tools/exec)
- [xAI](/en/providers/xai)
