---
summary: "Visor de diffs de solo lectura y renderizador de archivos para agentes (herramienta de complemento opcional)"
title: "Diffs"
sidebarTitle: "Diffs"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` es una herramienta de complemento opcional con una guía del sistema integrada corta y una habilidad complementaria que convierte el contenido de cambios en un artefacto de diff de solo lectura para agentes.

Acepta cualquiera:

- texto `before` y `after`
- un `patch` unificado

Puede devolver:

- una URL de visor de puerta de enlace para la presentación en el lienzo
- una ruta de archivo renderizada (PNG o PDF) para la entrega de mensajes
- ambas salidas en una sola llamada

Cuando está habilitado, el complemento antepone una guía de uso concisa en el espacio del prompt del sistema y también expone una habilidad detallada para los casos en los que el agente necesita instrucciones más completas.

## Inicio rápido

<Steps>
  <Step title="Instalar el complemento">
    ```bash
    openclaw plugins install diffs
    ```
  </Step>
  <Step title="Habilitar el complemento">
    ```json5
    {
      plugins: {
        entries: {
          diffs: {
            enabled: true,
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Elegir un modo">
    <Tabs>
      <Tab title="view">
        Flujos con prioridad de Canvas: los agentes llaman a `diffs` con `mode: "view"` y abren `details.viewerUrl` con `canvas present`.
      </Tab>
      <Tab title="file">
        Entrega de archivos de chat: los agentes llaman a `diffs` con `mode: "file"` y envían `details.filePath` con `message` usando `path` o `filePath`.
      </Tab>
      <Tab title="both">
        Combinado: los agentes llaman a `diffs` con `mode: "both"` para obtener ambos artefactos en una sola llamada.
      </Tab>
    </Tabs>
  </Step>
</Steps>

## Deshabilitar la guía del sistema integrada

Si desea mantener la herramienta `diffs` habilitada pero deshabilitar su guía del sistema integrada, establezca `plugins.entries.diffs.hooks.allowPromptInjection` en `false`:

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
      },
    },
  },
}
```

Esto bloquea el hook `before_prompt_build` del complemento diffs mientras mantiene el complemento, la herramienta y la habilidad complementaria disponibles.

Si desea deshabilitar tanto la guía como la herramienta, deshabilite el complemento en su lugar.

## Flujo de trabajo típico del agente

<Steps>
  <Step title="Llamar a diffs">El agente llama a la herramienta `diffs` con entrada.</Step>
  <Step title="Leer detalles">El agente lee los campos `details` de la respuesta.</Step>
  <Step title="Presentar">El agente abre `details.viewerUrl` con `canvas present`, envía `details.filePath` con `message` usando `path` o `filePath`, o hace ambas cosas.</Step>
</Steps>

## Ejemplos de entrada

<Tabs>
  <Tab title="Antes y después">
    ```json
    {
      "before": "# Hello\n\nOne",
      "after": "# Hello\n\nTwo",
      "path": "docs/example.md",
      "mode": "view"
    }
    ```
  </Tab>
  <Tab title="Parche">
    ```json
    {
      "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
      "mode": "both"
    }
    ```
  </Tab>
</Tabs>

## Referencia de entrada de la herramienta

Todos los campos son opcionales a menos que se indique lo contrario.

<ParamField path="before" type="string">
  Texto original. Requerido con `after` cuando se omite `patch`.
</ParamField>
<ParamField path="after" type="string">
  Texto actualizado. Requerido con `before` cuando se omite `patch`.
</ParamField>
<ParamField path="patch" type="string">
  Texto de diff unificado. Mutuamente excluyente con `before` y `after`.
</ParamField>
<ParamField path="path" type="string">
  Nombre de archivo a mostrar para el modo antes y después.
</ParamField>
<ParamField path="lang" type="string">
  Sugerencia de anulación de idioma para el modo antes y después. Los valores desconocidos y los idiomas fuera del conjunto de visores predeterminados vuelven al texto plano a menos que esté instalado el complemento Diff Viewer Language Pack.
</ParamField>

<ParamField path="title" type="string">
  Título del visor personalizado.
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  Modo de salida. El valor predeterminado es el del complemento `defaults.mode`. Alias obsoleto: `"image"` se comporta como `"file"` y aún se acepta por compatibilidad con versiones anteriores.
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  Tema del visor. El valor predeterminado es el del complemento `defaults.theme`.
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  Disposición del diff. El valor predeterminado es el del complemento `defaults.layout`.
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  Expandir secciones sin cambios cuando el contexto completo esté disponible. Opción solo por llamada (no una clave predeterminada del complemento).
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  Formato de archivo renderizado. El valor predeterminado es el del complemento `defaults.fileFormat`.
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  Ajuste de calidad para el renderizado de PNG o PDF.
</ParamField>
<ParamField path="fileScale" type="number">
  Personalización de la escala del dispositivo (`1`-`4`).
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  Ancho máximo de renderizado en píxeles CSS (`640`-`2400`).
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  TTL del artefacto en segundos para las salidas del visor y de archivos independientes. Máximo 21600.
</ParamField>
<ParamField path="baseUrl" type="string">
  Personalización del origen de la URL del visor. Anula la configuración del complemento `viewerBaseUrl`. Debe ser `http` o `https`, sin consulta/hash.
</ParamField>

<AccordionGroup>
  <Accordion title="Alias de entrada heredados">
    Todavía se aceptan por compatibilidad con versiones anteriores:

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="Validación y límites">
    - `before` y `after` máximo 512 KiB cada uno.
    - `patch` máximo 2 MiB.
    - `path` máximo 2048 bytes.
    - `lang` máximo 128 bytes.
    - `title` máximo 1024 bytes.
    - Límite de complejidad del parche: máximo 128 archivos y 120000 líneas en total.
    - `patch` junto con `before` o `after` se rechazan.
    - Límites de seguridad de archivos renderizados (aplican a PNG y PDF):
      - `fileQuality: "standard"`: máximo 8 MP (8,000,000 píxeles renderizados).
      - `fileQuality: "hq"`: máximo 14 MP (14,000,000 píxeles renderizados).
      - `fileQuality: "print"`: máximo 24 MP (24,000,000 píxeles renderizados).
      - PDF también tiene un máximo de 50 páginas.

  </Accordion>
</AccordionGroup>

## Resaltado de sintaxis

OpenClaw incluye resaltado de sintaxis para lenguajes comunes de código fuente, configuración y documentación:

`javascript`, `typescript`, `tsx`, `jsx`, `json`, `markdown`, `yaml`, `css`, `html`, `sh`, `python`, `go`, `rust`, `java`, `c`, `cpp`, `csharp`, `php`, `sql`, `docker`, `ruby`, `swift`, `kotlin`, `r`, `dart`, `lua`, `powershell`, `xml`, y `toml`.

Los alias comunes como `js`, `ts`, `bash`, `md`, `yml`, `c++`, `dockerfile`, `rb`, `kt` y `ps1` se normalizan a esos idiomas predeterminados.

Instale el complemento Diff Viewer Language Pack para resaltar otros idiomas:

```bash
openclaw plugins install diffs-language-pack
```

Con el paquete de idioma disponible, OpenClaw lo usa automáticamente para idiomas fuera de la lista predeterminada. Sin él, esos archivos permanecen legibles como texto sin formato.

## Contrato de detalles de salida

La herramienta devuelve metadatos estructurados bajo `details`.

<AccordionGroup>
  <Accordion title="Campos del visor">
    Campos compartidos para los modos que crean un visor:

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` cuando estén disponibles)

  </Accordion>
  <Accordion title="Campos de archivo">
    Campos de archivo cuando se renderiza PNG o PDF:

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path` (mismo valor que `filePath`, para compatibilidad con herramientas de mensajes)
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="Alias de compatibilidad">
    También devueltos para los llamadores existentes:

    - `format` (mismo valor que `fileFormat`)
    - `imagePath` (mismo valor que `filePath`)
    - `imageBytes` (mismo valor que `fileBytes`)
    - `imageQuality` (mismo valor que `fileQuality`)
    - `imageScale` (mismo valor que `fileScale`)
    - `imageMaxWidth` (mismo valor que `fileMaxWidth`)

  </Accordion>
</AccordionGroup>

Resumen del comportamiento del modo:

| Modo     | Lo que se devuelve                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `"view"` | Solo campos del visor.                                                                                                                         |
| `"file"` | Solo campos de archivo, sin artefacto de visor.                                                                                                |
| `"both"` | Campos del visor más campos de archivo. Si falla el renderizado del archivo, el visor aún se devuelve con el alias `fileError` y `imageError`. |

## Secciones sin cambios colapsadas

- El visor puede mostrar filas como `N unmodified lines`.
- Los controles de expansión en esas filas son condicionales y no se garantizan para todos los tipos de entrada.
- Los controles de expansión aparecen cuando el diff renderizado tiene datos de contexto expandibles, lo cual es típico para entradas antes y después.
- Para muchas entradas de parches unificadas, los cuerpos de contexto omitidos no están disponibles en los fragmentos de parche analizados, por lo que la fila puede aparecer sin controles de expansión. Este es el comportamiento esperado.
- `expandUnchanged` se aplica solo cuando existe contexto expandible.

## Valores predeterminados del complemento

Establezca los valores predeterminados de todo el complemento en `~/.openclaw/openclaw.json`:

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          defaults: {
            fontFamily: "Fira Code",
            fontSize: 15,
            lineSpacing: 1.6,
            layout: "unified",
            showLineNumbers: true,
            diffIndicators: "bars",
            wordWrap: true,
            background: true,
            theme: "dark",
            fileFormat: "png",
            fileQuality: "standard",
            fileScale: 2,
            fileMaxWidth: 960,
            mode: "both",
            ttlSeconds: 21600,
          },
        },
      },
    },
  },
}
```

Valores predeterminados admitidos:

- `fontFamily`
- `fontSize`
- `lineSpacing`
- `layout`
- `showLineNumbers`
- `diffIndicators`
- `wordWrap`
- `background`
- `theme`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`
- `mode`
- `ttlSeconds`

Los parámetros explícitos de la herramienta anulan estos valores predeterminados.

### Configuración de URL del visor persistente

<ParamField path="viewerBaseUrl" type="string">
  Alternativa propiedad del complemento para los enlaces del visor devueltos cuando una llamada a la herramienta no pasa `baseUrl`. Debe ser `http` o `https`, sin consulta/hash.
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          viewerBaseUrl: "https://gateway.example.com/openclaw",
        },
      },
    },
  },
}
```

## Configuración de seguridad

<ParamField path="security.allowRemoteViewer" type="boolean" default="false">
  `false`: se deniegan las solicitudes que no son de bucle invertido a las rutas del visor. `true`: se permiten visores remotos si la ruta tokenizada es válida.
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          security: {
            allowRemoteViewer: false,
          },
        },
      },
    },
  },
}
```

## Ciclo de vida y almacenamiento de artefactos

- Los artefactos se almacenan en la subcarpeta temporal: `$TMPDIR/openclaw-diffs`.
- Los metadatos del artefacto del visor contienen:
  - ID de artefacto aleatorio (20 caracteres hexadecimales)
  - token aleatorio (48 caracteres hexadecimales)
  - `createdAt` y `expiresAt`
  - ruta `viewer.html` almacenada
- El TTL predeterminado del artefacto es de 30 minutos cuando no se especifica.
- El TTL máximo aceptado para el visor es de 6 horas.
- La limpieza se ejecuta oportunamente después de la creación del artefacto.
- Los artefactos caducados se eliminan.
- La limpieza de respaldo elimina carpetas obsoletas de más de 24 horas cuando faltan los metadatos.

## Comportamiento de la URL del visor y de la red

Ruta del visor:

- `/plugins/diffs/view/{artifactId}/{token}`

Recursos del visor:

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`
- `/plugins/diffs-language-pack/assets/viewer.js` cuando el diff utiliza un idioma del paquete de idiomas del visor de diffs

El documento del visor resuelve esos recursos en relación con la URL del visor, por lo que un prefijo de ruta opcional `baseUrl` también se conserva para ambas solicitudes de recursos.

Comportamiento de construcción de URL:

- Si se proporciona `baseUrl` de la llamada a la herramienta, se utiliza tras una validación estricta.
- De lo contrario, si el `viewerBaseUrl` del complemento está configurado, se utiliza.
- Sin ninguna de esas sustituciones, la URL del visor predeterminada es loopback `127.0.0.1`.
- Si el modo de enlace de la puerta de enlace es `custom` y `gateway.customBindHost` está configurado, se utiliza ese host.

Reglas de `baseUrl`:

- Debe ser `http://` o `https://`.
- La consulta y el hash se rechazan.
- Se permite el origen más una ruta base opcional.

## Modelo de seguridad

<AccordionGroup>
  <Accordion title="Endurecimiento del visor">
    - Solo loopback por defecto.
    - Rutas del visor tokenizadas con validación estricta de ID y token.
    - CSP de respuesta del visor:
      - `default-src 'none'`
      - scripts y recursos solo de self
      - sin `connect-src` saliente
    - Limitación de fallos remotos cuando el acceso remoto está habilitado:
      - 40 fallos por 60 segundos
      - bloqueo de 60 segundos (`429 Too Many Requests`)

  </Accordion>
  <Accordion title="Endurecimiento del renderizado de archivos">
    - El enrutamiento de solicitudes del navegador de captura de pantalla es de denegación por defecto.
    - Solo se permiten los recursos del visor local de `http://127.0.0.1/plugins/diffs/assets/*`.
    - Las solicitudes de red externas están bloqueadas.

  </Accordion>
</AccordionGroup>

## Requisitos del navegador para el modo de archivo

`mode: "file"` y `mode: "both"` necesitan un navegador compatible con Chromium.

Orden de resolución:

<Steps>
  <Step title="Config">
    `browser.executablePath` en la configuración de OpenClaw.
  </Step>
  <Step title="Variables de entorno">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="Alternativa de plataforma">
    Alternativa de descubrimiento de comando/ruta de plataforma.
  </Step>
</Steps>

Texto de error común:

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Solución: instala Chrome, Chromium, Edge o Brave, o configura una de las opciones de ruta ejecutable mencionadas anteriormente.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Errores de validación de entrada">
    - `Provide patch or both before and after text.` — incluye tanto `before` como `after`, o proporciona `patch`.
    - `Provide either patch or before/after input, not both.` — no mezcles modos de entrada.
    - `Invalid baseUrl: ...` — usa un origen `http(s)` con una ruta opcional, sin consulta/hash.
    - `{field} exceeds maximum size (...)` — reduce el tamaño de la carga útil.
    - Rechazo de parche grande — reduce la cantidad de archivos de parche o el total de líneas.

  </Accordion>
  <Accordion title="Accesibilidad del visor">
    - La URL del visor se resuelve a `127.0.0.1` de manera predeterminada.
    - Para escenarios de acceso remoto, puedes:
      - configurar el complemento `viewerBaseUrl`, o
      - pasar `baseUrl` por cada llamada a la herramienta, o
      - usar `gateway.bind=custom` y `gateway.customBindHost`
    - Si `gateway.trustedProxies` incluye loopback para un proxy del mismo host (por ejemplo, Tailscale Serve), las solicitudes de visor de loopback sin encabezados de IP de cliente reenviados fallan cerradas por diseño.
    - Para esa topología de proxy:
      - prefiere `mode: "file"` o `mode: "both"` cuando solo necesites un adjunto, o
      - habilita intencionalmente `security.allowRemoteViewer` y configura el complemento `viewerBaseUrl` o pasa un `baseUrl` proxy/público cuando necesites una URL de visor compartible
    - Habilita `security.allowRemoteViewer` solo cuando tengas la intención de permitir el acceso externo al visor.

  </Accordion>
  <Accordion title="La fila de líneas sin modificar no tiene botón de expandir">
    Esto puede ocurrir para una entrada de parche cuando el parche no lleva contexto expandible. Esto es esperado y no indica un fallo del visor.
  </Accordion>
  <Accordion title="Artefacto no encontrado">
    - El artefacto expiró por TTL.
    - El token o la ruta cambiaron.
    - La limpieza eliminó los datos obsoletos.

  </Accordion>
</AccordionGroup>

## Guía operacional

- Prefiera `mode: "view"` para revisiones interactivas locales en el lienzo.
- Prefiera `mode: "file"` para canales de chat salientes que necesiten un archivo adjunto.
- Mantenga `allowRemoteViewer` deshabilitado a menos que su despliegue requiera URLs de visor remotas.
- Establezca un `ttlSeconds` corto y explícito para diffs sensibles.
- Evite enviar secretos en la entrada de diff cuando no sea necesario.
- Si su canal comprime las imágenes de forma agresiva (por ejemplo, Telegram o WhatsApp), prefiera la salida en PDF (`fileFormat: "pdf"`).

<Note>Motor de renderizado de diffs impulsado por [Diffs](https://diffs.com).</Note>

## Relacionado

- [Navegador](/es/tools/browser)
- [Complementos](/es/tools/plugin)
- [Resumen de herramientas](/es/tools)
