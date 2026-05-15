---
summary: "Canalización de formato Markdown para canales de salida"
read_when:
  - You are changing markdown formatting or chunking for outbound channels
  - You are adding a new channel formatter or style mapping
  - You are debugging formatting regressions across channels
title: "Formato Markdown"
---

OpenClaw formatea el Markdown de salida convirtiéndolo en una representación
intermedia (IR) compartida antes de renderizar la salida específica del canal.
La IR mantiene el texto de origen intacto mientras lleva intervalos de estilo/enlaces
de modo que la fragmentación y el renderizado pueden mantenerse consistentes en los canales.

## Objetivos

- **Coherencia:** un paso de análisis, múltiples renderizadores.
- **Fragmentación segura:** dividir el texto antes de renderizar para que el formato en línea
  nunca se rompa entre fragmentos.
- **Adaptación al canal:** asignar la misma IR al mrkdwn de Slack, HTML de Telegram y
  rangos de estilo de Signal sin volver a analizar el Markdown.

## Canalización

1. **Analizar Markdown -> IR**
   - La IR es texto plano más intervalos de estilo (negrita/cursiva/tachado/código/espóiler) e intervalos de enlace.
   - Los desplazamientos son unidades de código UTF-16 para que los rangos de estilo de Signal se alineen con su API.
   - Las tablas se analizan solo cuando un canal opta por la conversión de tablas.
2. **Fragmentar IR (formato primero)**
   - La fragmentación ocurre en el texto de la IR antes del renderizado.
   - El formato en línea no se divide entre fragmentos; los intervalos se dividen por fragmento.
3. **Renderizar por canal**
   - **Slack:** tokens mrkdwn (negrita/cursiva/tachado/código), enlaces como `<url|label>`.
   - **Telegram:** etiquetas HTML (`<b>`, `<i>`, `<s>`, `<code>`, `<pre><code>`, `<a href>`).
   - **Signal:** texto sin formato + rangos `text-style`; los enlaces se convierten en `label (url)` cuando la etiqueta es diferente.

## Ejemplo de IR

Entrada Markdown:

```markdown
Hello **world** - see [docs](https://docs.openclaw.ai).
```

IR (esquemático):

```json
{
  "text": "Hello world - see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## Dónde se usa

- Los adaptadores de salida de Slack, Telegram y Signal renderizan desde la IR.
- Otros canales (WhatsApp, iMessage, Microsoft Teams, Discord) todavía usan texto plano o
  sus propias reglas de formato, con la conversión de tablas Markdown aplicada antes de
  la fragmentación cuando está habilitada.

## Manejo de tablas

Las tablas de Markdown no son compatibles de manera coherente en los clientes de chat. Use
`markdown.tables` para controlar la conversión por canal (y por cuenta).

- `code`: representar las tablas como bloques de código (predeterminado para la mayoría de los canales).
- `bullets`: convertir cada fila en viñetas (predeterminado para Signal + WhatsApp).
- `off`: deshabilitar el análisis y la conversión de tablas; el texto de la tabla sin procesar se pasa tal cual.

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

- Los límites de fragmentación provienen de los adaptadores/configuraciones del canal y se aplican al texto IR.
- Los bloques de código se conservan como un solo bloque con una nueva línea al final para que los canales
  los representen correctamente.
- Los prefijos de lista y de cita en bloque son parte del texto IR, por lo que la fragmentación
  no los divide a mitad del prefijo.
- Los estilos en línea (negrita/cursiva/tachado/código en línea/spoiler) nunca se dividen entre
  fragmentos; el renderizador vuelve a abrir los estilos dentro de cada fragmento.

Si necesita más información sobre el comportamiento de fragmentación entre canales, consulte
[Streaming + chunking](/es/concepts/streaming).

## Política de enlaces

- **Slack:** `[label](url)` -> `<url|label>`; las URL simples permanecen simples. El autoenlace
  está deshabilitado durante el análisis para evitar enlaces dobles.
- **Telegram:** `[label](url)` -> `<a href="url">label</a>` (modo de análisis HTML).
- **Signal:** `[label](url)` -> `label (url)` a menos que la etiqueta coincida con la URL.

## Spoilers

Los marcadores de spoilers (`||spoiler||`) solo se analizan para Signal, donde se asignan a
rangos de estilo SPOILER. Otros canales los tratan como texto sin formato.

## Cómo agregar o actualizar un formateador de canal

1. **Analizar una vez:** use el asistente compartido `markdownToIR(...)` con las opciones
   adecuadas para el canal (autoenlace, estilo de encabezado, prefijo de cita en bloque).
2. **Renderizar:** implemente un renderizador con `renderMarkdownWithMarkers(...)` y un
   mapa de marcadores de estilo (o rangos de estilo Signal).
3. **Fragmentar:** llame a `chunkMarkdownIR(...)` antes de renderizar; renderice cada fragmento.
4. **Conectar adaptador:** actualiza el adaptador de salida del canal para usar el nuevo fragmentador
   y renderizador.
5. **Probar:** agrega o actualiza las pruebas de formato y una prueba de entrega de salida si el
   canal usa fragmentación.

## Errores comunes

- Los tokens de corchetes angulares de Slack (`<@U123>`, `<#C123>`, `<https://...>`) deben
  conservarse; escaping seguro de HTML sin formato.
- El HTML de Telegram requiere escapar el texto fuera de las etiquetas para evitar un marcado roto.
- Los rangos de estilo de Signal dependen de los desplazamientos UTF-16; no uses desplazamientos de puntos de código.
- Conserva las nuevas líneas al final para los bloques de código cercados para que los marcadores de cierre caigan en
  su propia línea.

## Relacionado

<CardGroup cols={2}>
  <Card title="Transmisión y fragmentación" href="/es/concepts/streaming" icon="bars-staggered">
    Comportamiento de transmisión saliente, límites de fragmento y entrega específica del canal.
  </Card>
  <Card title="Prompt del sistema" href="/es/concepts/system-prompt" icon="message-lines">
    Lo que ve el modelo antes de la conversación, incluidos los archivos del espacio de trabajo inyectados.
  </Card>
</CardGroup>
