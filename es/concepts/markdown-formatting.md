---
summary: "Canalización de formato Markdown para canales de salida"
read_when:
  - Estás cambiando el formato o la fragmentación de Markdown para canales de salida
  - Estás agregando un nuevo formateador de canal o mapeo de estilos
  - Estás depurando regresiones de formato en varios canales
title: "Formato Markdown"
---

# Formato Markdown

OpenClaw da formato al Markdown de salida convirtiéndolo en una representación intermedia compartida (IR) antes de generar la salida específica del canal. El IR mantiene el texto fuente intacto mientras transporta los tramos de estilo/enlace, de modo que la fragmentación y el renderizado pueden mantenerse consistentes entre canales.

## Objetivos

- **Consistencia:** un paso de análisis, múltiples renderizadores.
- **Fragmentación segura:** divide el texto antes de renderizar para que el formato en línea nunca se rompa entre fragmentos.
- **Adaptación al canal:** mapea el mismo IR a mrkdwn de Slack, HTML de Telegram y rangos de estilo de Signal sin volver a analizar Markdown.

## Canalización

1. **Analizar Markdown -> IR**
   - El IR es texto plano más tramos de estilo (negrita/cursiva/tachado/código/spoiler) y tramos de enlace.
   - Los desplazamientos son unidades de código UTF-16 para que los rangos de estilo de Signal se alineen con su API.
   - Las tablas solo se analizan cuando un canal opta por la conversión de tablas.
2. **Fragmentar IR (formato primero)**
   - La fragmentación ocurre en el texto IR antes del renderizado.
   - El formato en línea no se divide entre fragmentos; los tramos se cortan por fragmento.
3. **Renderizar por canal**
   - **Slack:** tokens mrkdwn (negrita/cursiva/tachado/código), enlaces como `<url|label>`.
   - **Telegram:** etiquetas HTML (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`).
   - **Signal:** texto plano + rangos `text-style`; los enlaces se convierten en `label (url)` cuando la etiqueta es diferente.

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

- Los adaptadores de salida de Slack, Telegram y Signal renderizan desde el IR.
- Otros canales (WhatsApp, iMessage, MS Teams, Discord) aún usan texto plano o sus propias reglas de formato, con la conversión de tablas Markdown aplicada antes de la fragmentación cuando está habilitada.

## Manejo de tablas

Las tablas Markdown no son compatibles de manera consistente en los clientes de chat. Usa `markdown.tables` para controlar la conversión por canal (y por cuenta).

- `code`: renderizar tablas como bloques de código (predeterminado para la mayoría de los canales).
- `bullets`: convertir cada fila en viñetas (predeterminado para Signal + WhatsApp).
- `off`: desactivar el análisis y la conversión de tablas; el texto sin formato de la tabla pasa a través.

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

- Los límites de fragmentos provienen de los adaptadores/configuraciones del canal y se aplican al texto IR.
- Las cercas de código (code fences) se conservan como un solo bloque con una nueva línea al final para que los canales las rendericen correctamente.
- Los prefijos de lista y de bloque de cita son parte del texto IR, por lo que la fragmentación no divide a la mitad del prefijo.
- Los estilos en línea (negrita/cursiva/tachado/código en línea/spoiler) nunca se dividen entre fragmentos; el renderizador vuelve a abrir los estilos dentro de cada fragmento.

Si necesita más información sobre el comportamiento de la fragmentación entre canales, consulte [Streaming + chunking](/es/concepts/streaming).

## Política de enlaces

- **Slack:** `[label](url)` -> `<url|label>`; las URL desnudas permanecen desnudas. El autoenlace se desactiva durante el análisis para evitar el doble enlace.
- **Telegram:** `[label](url)` -> `<a href="url">label</a>` (modo de análisis HTML).
- **Signal:** `[label](url)` -> `label (url)` a menos que la etiqueta coincida con la URL.

## Spoilers

Los marcadores de spoiler (`||spoiler||`) se analizan solo para Signal, donde se asignan a rangos de estilo SPOILER. Otros canales los tratan como texto sin formato.

## Cómo agregar o actualizar un formateador de canal

1. **Analizar una vez:** use el asistente compartido `markdownToIR(...)` con opciones apropiadas para el canal (autoenlace, estilo de encabezado, prefijo de bloque de cita).
2. **Renderizar:** implemente un renderizador con `renderMarkdownWithMarkers(...)` y un mapa de marcadores de estilo (o rangos de estilo de Signal).
3. **Fragmentar:** llame a `chunkMarkdownIR(...)` antes de renderizar; renderice cada fragmento.
4. **Conectar adaptador:** actualice el adaptador de salida del canal para usar el nuevo fragmentador y renderizador.
5. **Probar:** agregue o actualice las pruebas de formato y una prueba de entrega de salida si el canal usa fragmentación.

## Errores comunes

- Los tokens de corchetes angulares de Slack (`<@U123>`, `<#C123>`, `<https://...>`) deben conservarse; escapar del HTML sin formato de forma segura.
- HTML de Telegram requiere escapar el texto fuera de las etiquetas para evitar marcadores rotos.
- Los rangos de estilo de Signal dependen de los desplazamientos UTF-16; no use desplazamientos de puntos de código.
- Preserve las nuevas líneas finales para los bloques de código cercados para que los marcadores de cierre queden en su propia línea.

import es from "/components/footer/es.mdx";

<es />
