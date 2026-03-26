---
summary: "Canalización de formato Markdown para canales de salida"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Formato Markdown"
---

# Formato Markdown

OpenClaw da formato al Markdown de salida convirtiéndolo en una representación
intermedia (IR) compartida antes de renderizar la salida específica del canal. La
IR mantiene el texto de origen intacto mientras lleva intervalos de estilo/enlace
de modo que la fragmentación y el renderizado pueden mantenerse consistentes
entre canales.

## Objetivos

- **Coherencia:** un paso de análisis, múltiples renderizadores.
- **Fragmentación segura:** dividir el texto antes de renderizar para que el formato
  en línea nunca se rompa entre fragmentos.
- **Adaptación al canal:** asignar la misma IR a mrkdwn de Slack, HTML de Telegram
  y rangos de estilo de Signal sin volver a analizar Markdown.

## Canalización

1. **Analizar Markdown -> IR**
   - La IR es texto plano más intervalos de estilo (negrita/cursiva/tachado/código/espóiler)
     e intervalos de enlace.
   - Los desplazamientos son unidades de código UTF-16 para que los rangos de estilo
     de Signal se alineen con su API.
   - Las tablas se analizan solo cuando un canal acepta la conversión de tablas.
2. **Fragmentar IR (formato primero)**
   - La fragmentación ocurre en el texto de IR antes del renderizado.
   - El formato en línea no se divide entre fragmentos; los intervalos se dividen
     por fragmento.
3. **Renderizar por canal**
   - **Slack:** tokens mrkdwn (negrita/cursiva/tachado/código), enlaces como `<url|label>`.
   - **Telegram:** etiquetas HTML (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`).
   - **Signal:** texto plano + rangos `text-style`; los enlaces se convierten
     en `label (url)` cuando la etiqueta es diferente.

## Ejemplo de IR

Entrada Markdown:

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR (esquemático):

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## Dónde se usa

- Los adaptadores de salida de Slack, Telegram y Signal renderizan desde la IR.
- Otros canales (WhatsApp, iMessage, Microsoft Teams, Discord) siguen usando texto plano o
  sus propias reglas de formato, con la conversión de tablas de Markdown aplicada antes
  de la fragmentación cuando está habilitada.

## Manejo de tablas

Las tablas Markdown no son compatibles de manera consistente en los clientes de
chat. Use `markdown.tables` para controlar la conversión por canal
(y por cuenta).

- `code`: renderizar tablas como bloques de código (predeterminado
  para la mayoría de los canales).
- `bullets`: convierte cada fila en viñetas (predeterminado para Signal + WhatsApp).
- `off`: desactiva el análisis y la conversión de tablas; el texto de la tabla sin procesar se pasa directamente.

Claves de configuración:

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## Reglas de fragmentación

- Los límites de fragmentación provienen de los adaptadores/configuración del canal y se aplican al texto del RI.
- Los bloques de código se conservan como un solo bloque con una nueva línea final para que los canales
  los rendericen correctamente.
- Los prefijos de lista y de cita en bloque son parte del texto del RI, por lo que la fragmentación
  no se divide en medio de un prefijo.
- Los estilos en línea (negrita/cursiva/tachado/código en línea/spoiler) nunca se dividen entre
  fragmentos; el renderizador vuelve a abrir los estilos dentro de cada fragmento.

Si necesita más información sobre el comportamiento de la fragmentación entre canales, consulte
[Streaming + chunking](/es/concepts/streaming).

## Política de enlaces

- **Slack:** `[label](url)` -> `<url|label>`; las URL desnudas permanecen desnudas. Autolink
  está desactivado durante el análisis para evitar el doble enlace.
- **Telegram:** `[label](url)` -> `<a href="url">label</a>` (modo de análisis HTML).
- **Signal:** `[label](url)` -> `label (url)` a menos que la etiqueta coincida con la URL.

## Spoilers

Los marcadores de spoiler (`||spoiler||`) solo se analizan para Signal, donde se asignan a
rangos de estilo SPOILER. Otros canales los tratan como texto sin formato.

## Cómo agregar o actualizar un formateador de canal

1. **Analizar una vez:** use el asistente compartido `markdownToIR(...)` con opciones
   apropiadas para el canal (enlace automático, estilo de encabezado, prefijo de cita en bloque).
2. **Renderizar:** implemente un renderizador con `renderMarkdownWithMarkers(...)` y un
   mapa de marcadores de estilo (o rangos de estilo de Signal).
3. **Fragmentar:** llame a `chunkMarkdownIR(...)` antes de renderizar; renderice cada fragmento.
4. **Adaptador de conexión:** actualice el adaptador de salida del canal para usar el nuevo fragmentador
   y renderizador.
5. **Probar:** agregue o actualice pruebas de formato y una prueba de entrega de salida si el
   canal usa fragmentación.

## Problemas comunes

- Los tokens de corchetes angulares de Slack (`<@U123>`, `<#C123>`, `<https://...>`) deben ser
  conservados; escape el HTML sin formato de manera segura.
- El HTML de Telegram requiere escapar el texto fuera de las etiquetas para evitar marcado dañado.
- Los rangos de estilo de Signal dependen de los desplazamientos UTF-16; no use desplazamientos de puntos de código.
- Preserve trailing newlines for fenced code blocks so closing markers land on
  their own line.

import es from "/components/footer/es.mdx";

<es />
