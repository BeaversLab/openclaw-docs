---
summary: "Visor de diferencias de solo lectura y renderizador de archivos para agentes (herramienta de complemento opcional)"
title: "Diferencias"
sidebarTitle: "Diferencias"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` es una herramienta de complemento opcional con una guía del sistema integrada breve y una habilidad complementaria que convierte el contenido de cambios en un artefacto de diferencias de solo lectura para agentes.

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
      <Tab title="ver">
        Flujos con prioridad de lienzo: los agentes llaman a `diffs` con `mode: "view"` y abren `details.viewerUrl` con `canvas present`.
      </Tab>
      <Tab title="archivo">
        Entrega de archivos en el chat: los agentes llaman a `diffs` con `mode: "file"` y envían `details.filePath` con `message` usando `path` o `filePath`.
      </Tab>
      <Tab title="ambos">
        Combinado: los agentes llaman a `diffs` con `mode: "both"` para obtener ambos artefactos en una sola llamada.
      </Tab>
    </Tabs>
  </Step>
</Steps>

## Deshabilitar la guía del sistema integrada

Si desea mantener la herramienta `diffs` habilitada pero deshabilitar su guía de prompt del sistema integrada, establezca `plugins.entries.diffs.hooks.allowPromptInjection` en `false`:

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

Esto bloquea el gancho `before_prompt_build` del complemento de diferencias mientras mantiene el complemento, la herramienta y la habilidad complementaria disponibles.

Si desea deshabilitar tanto la guía como la herramienta, deshabilite el complemento en su lugar.

## Flujo de trabajo típico del agente

<Steps>
  <Step title="Llamar a diferencias">El agente llama a la herramienta `diffs` con entrada.</Step>
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
  Texto original. Obligatorio con `after` cuando se omite `patch`.
</ParamField>
<ParamField path="after" type="string">
  Texto actualizado. Obligatorio con `before` cuando se omite `patch`.
</ParamField>
<ParamField path="patch" type="string">
  Texto de diff unificado. Mutuamente exclusivo con `before` y `after`.
</ParamField>
<ParamField path="path" type="string">
  Nombre de archivo a mostrar para el modo antes y después.
</ParamField>
<ParamField path="lang" type="string">
  Sugerencia de anulación de idioma para el modo antes y después. Los valores desconocidos vuelven al texto sin formato.
</ParamField>
<ParamField path="title" type="string">
  Anulación del título del visor.
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  Modo de salida. El valor predeterminado es el del complemento `defaults.mode`. Alias obsoleto: `"image"` se comporta como `"file"` y todavía se acepta por compatibilidad con versiones anteriores.
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  Tema del visor. El valor predeterminado es el del complemento `defaults.theme`.
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  Diseño del diff. El valor predeterminado es el del complemento `defaults.layout`.
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  Expandir secciones sin cambios cuando el contexto completo está disponible. Opción solo por llamada (no una clave predeterminada del complemento).
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  Formato de archivo renderizado. El valor predeterminado es el del complemento `defaults.fileFormat`.
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  Ajuste preestablecido de calidad para la representación PNG o PDF.
</ParamField>
<ParamField path="fileScale" type="number">
  Anulación de la escala del dispositivo (`1`-`4`).
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  Ancho máximo de representación en píxeles CSS (`640`-`2400`).
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  TTL del artefacto en segundos para las salidas del visor y de archivo independiente. Máximo 21600.
</ParamField>
<ParamField path="baseUrl" type="string">
  Anulación del origen de la URL del visor. Anula el complemento `viewerBaseUrl`. Debe ser `http` o `https`, sin consulta/hash.
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
    - `before` y `after` cada uno máximo 512 KiB.
    - `patch` máximo 2 MiB.
    - `path` máximo 2048 bytes.
    - `lang` máximo 128 bytes.
    - `title` máximo 1024 bytes.
    - Límite de complejidad del parche: máximo 128 archivos y 120000 líneas en total.
    - `patch` y `before` o `after` juntos se rechazan.
    - Límites de seguridad de archivos renderizados (aplican a PNG y PDF):
      - `fileQuality: "standard"`: máximo 8 MP (8,000,000 píxeles renderizados).
      - `fileQuality: "hq"`: máximo 14 MP (14,000,000 píxeles renderizados).
      - `fileQuality: "print"`: máximo 24 MP (24,000,000 píxeles renderizados).
      - PDF también tiene un máximo de 50 páginas.
  </Accordion>
</AccordionGroup>

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
    Campos de archivo cuando se representa PNG o PDF:

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path` (mismo valor que `filePath`, para compatibilidad con la herramienta de mensajes)
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="Alias de compatibilidad">
    También se devuelve para las llamadas existentes:

    - `format` (mismo valor que `fileFormat`)
    - `imagePath` (mismo valor que `filePath`)
    - `imageBytes` (mismo valor que `fileBytes`)
    - `imageQuality` (mismo valor que `fileQuality`)
    - `imageScale` (mismo valor que `fileScale`)
    - `imageMaxWidth` (mismo valor que `fileMaxWidth`)

  </Accordion>
</AccordionGroup>

Resumen del comportamiento del modo:

| Modo     | Lo que se devuelve                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"view"` | Solo campos del visor.                                                                                                                            |
| `"file"` | Solo campos de archivo, sin artefacto del visor.                                                                                                  |
| `"both"` | Campos del visor más campos de archivo. Si la representación del archivo falla, el visor aún se devuelve con el alias `fileError` y `imageError`. |

## Secciones sin cambios colapsadas

- El visor puede mostrar filas como `N unmodified lines`.
- Los controles de expansión en esas filas son condicionales y no se garantizan para cada tipo de entrada.
- Los controles de expansión aparecen cuando el diff representado tiene datos de contexto expandibles, lo cual es típico para la entrada antes y después.
- Para muchas entradas de parches unificados, los cuerpos de contexto omitidos no están disponibles en los fragmentos de parche analizados, por lo que la fila puede aparecer sin controles de expansión. Este es un comportamiento esperado.
- `expandUnchanged` se aplica solo cuando existe un contexto expandible.

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
          },
        },
      },
    },
  },
}
```

Valores predeterminados compatibles:

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

Los parámetros explícitos de la herramienta anulan estos valores predeterminados.

### Configuración de URL del visor persistente

<ParamField path="viewerBaseUrl" type="string">
  Alternativa de propiedad del complemento para los enlaces del visor devueltos cuando una llamada a la herramienta no pasa `baseUrl`. Debe ser `http` o `https`, sin consulta/hash.
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
  `false`: se deniegan las solicitudes que no son de bucle local a las rutas del visor. `true`: se permiten visores remotos si la ruta tokenizada es válida.
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
- La limpieza de respaldo elimina las carpetas obsoletas de más de 24 horas cuando faltan los metadatos.

## Comportamiento de la URL del visor y de la red

Ruta del visor:

- `/plugins/diffs/view/{artifactId}/{token}`

Recursos del visor:

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

El documento del visor resuelve esos recursos en relación con la URL del visor, por lo que también se preserva un prefijo de ruta `baseUrl` opcional para ambas solicitudes de recursos.

Comportamiento de la construcción de URL:

- Si se proporciona `baseUrl` en la llamada a la herramienta, se usa después de una validación estricta.
- De lo contrario, si el complemento `viewerBaseUrl` está configurado, se utiliza.
- Sin ninguna de estas anulaciones, la URL del visor predeterminada es el bucle local `127.0.0.1`.
- Si el modo de enlace de la puerta de enlace es `custom` y se establece `gateway.customBindHost`, se utiliza ese host.

`baseUrl` reglas:

- Debe ser `http://` o `https://`.
- La consulta y el hash son rechazados.
- Se permite el origen más una ruta base opcional.

## Modelo de seguridad

<AccordionGroup>
  <Accordion title="Endurecimiento del visor">
    - Solo bucle local de manera predeterminada. - Rutas de visor tokenizadas con validación estricta de ID y token. - CSP de respuesta del visor: - `default-src 'none'` - scripts y activos solo del propio origen (self) - sin `connect-src` saliente - Limitación de fallos remotos cuando el acceso remoto está habilitado: - 40 fallos por 60 segundos - bloqueo de 60 segundos (`429 Too Many Requests`)
  </Accordion>
  <Accordion title="Endurecimiento del renderizado de archivos">- El enrutamiento de solicitudes del navegador para capturas de pantalla es denegar de manera predeterminada. - Solo se permiten los activos locales del visor de `http://127.0.0.1/plugins/diffs/assets/*`. - Las solicitudes de red externas están bloqueadas.</Accordion>
</AccordionGroup>

## Requisitos del navegador para el modo de archivo

`mode: "file"` y `mode: "both"` necesitan un navegador compatible con Chromium.

Orden de resolución:

<Steps>
  <Step title="Config">`browser.executablePath` en la configuración de OpenClaw.</Step>
  <Step title="Variables de entorno">- `OPENCLAW_BROWSER_EXECUTABLE_PATH` - `BROWSER_EXECUTABLE_PATH` - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`</Step>
  <Step title="Respaldo de plataforma">Respaldo de descubrimiento de comando/ruta de la plataforma.</Step>
</Steps>

Texto de fallo común:

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Solución: instale Chrome, Chromium, Edge o Brave, o configure una de las opciones de ruta ejecutable mencionadas anteriormente.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Errores de validación de entrada">
    - `Provide patch or both before and after text.` — incluya tanto `before` como `after`, o proporcione `patch`. - `Provide either patch or before/after input, not both.` — no mezcle modos de entrada. - `Invalid baseUrl: ...` — use el origen `http(s)` con una ruta opcional, sin consulta/hash. - `{field} exceeds maximum size (...)` — reduzca el tamaño de la carga útil. - Rechazo de parche grande
    — reduzca el recuento de archivos de parche o el total de líneas.
  </Accordion>
  <Accordion title="Accesibilidad del visor">
    - La URL del visor se resuelve a `127.0.0.1` de forma predeterminada. - Para escenarios de acceso remoto, haga lo siguiente: - configure el `viewerBaseUrl` del complemento, o - pase `baseUrl` por cada llamada a la herramienta, o - use `gateway.bind=custom` y `gateway.customBindHost` - Si `gateway.trustedProxies` incluye bucle local para un proxy del mismo host (por ejemplo, Tailscale Serve),
    las solicitudes de visor de bucle local sin encabezados de IP de cliente reenviados fallan cerradas por diseño. - Para esa topología de proxy: - prefiera `mode: "file"` o `mode: "both"` cuando solo necesite un archivo adjunto, o - habilite intencionalmente `security.allowRemoteViewer` y configure el `viewerBaseUrl` del complemento o pase un `baseUrl` proxy/público cuando necesite una URL de
    visor compartible - Habilite `security.allowRemoteViewer` solo cuando tenga previsto el acceso externo al visor.
  </Accordion>
  <Accordion title="La fila de líneas sin modificar no tiene botón de expandir">Esto puede suceder para la entrada de parche cuando el parche no lleva contexto expandible. Esto es esperado y no indica una falla del visor.</Accordion>
  <Accordion title="Artefacto no encontrado">- El artefacto expiró debido al TTL. - El token o la ruta cambiaron. - La limpieza eliminó los datos obsoletos.</Accordion>
</AccordionGroup>

## Guía operacional

- Prefiera `mode: "view"` para revisiones interactivas locales en el lienzo.
- Prefiera `mode: "file"` para canales de chat salientes que necesiten un archivo adjunto.
- Mantenga `allowRemoteViewer` deshabilitado a menos que su implementación requiera URLs de visor remotas.
- Establezca `ttlSeconds` cortos y explícitos para diffs confidenciales.
- Evite enviar secretos en la entrada de diff cuando no sea necesario.
- Si su canal comprime las imágenes de forma agresiva (por ejemplo, Telegram o WhatsApp), prefiera la salida PDF (`fileFormat: "pdf"`).

<Note>Motor de renderizado de diff impulsado por [Diffs](https://diffs.com).</Note>

## Relacionado

- [Browser](/es/tools/browser)
- [Plugins](/es/tools/plugin)
- [Resumen de herramientas](/es/tools)
