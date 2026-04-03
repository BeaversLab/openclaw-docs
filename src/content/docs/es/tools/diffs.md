---
title: "Diffs"
summary: "Visor de diffs de solo lectura y renderizador de archivos para agentes (herramienta de complemento opcional)"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# Diffs

`diffs` es una herramienta de complemento opcional con una guía del sistema incorporada corta y una habilidad complementaria que convierte el contenido de cambios en un artefacto de diff de solo lectura para los agentes.

Acepta cualquiera:

- texto `before` y `after`
- un `patch` unificado

Puede devolver:

- una URL de visor de puerta de enlace para la presentación en el lienzo
- una ruta de archivo renderizada (PNG o PDF) para la entrega de mensajes
- ambas salidas en una sola llamada

Cuando está habilitado, el complemento antepone una guía de uso concisa en el espacio del prompt del sistema y también expone una habilidad detallada para los casos en los que el agente necesita instrucciones más completas.

## Inicio rápido

1. Habilite el complemento.
2. Llame a `diffs` con `mode: "view"` para flujos principales de lienzo.
3. Llame a `diffs` con `mode: "file"` para flujos de entrega de archivos de chat.
4. Llame a `diffs` con `mode: "both"` cuando necesite ambos artefactos.

## Habilitar el complemento

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

## Deshabilitar la guía del sistema incorporada

Si desea mantener la herramienta `diffs` habilitada pero deshabilitar su guía de prompt del sistema incorporada, establezca `plugins.entries.diffs.hooks.allowPromptInjection` en `false`:

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

1. El agente llama a `diffs`.
2. El agente lee los campos `details`.
3. El agente:
   - abre `details.viewerUrl` con `canvas present`
   - envía `details.filePath` con `message` usando `path` o `filePath`
   - hace ambas cosas

## Ejemplos de entrada

Antes y después:

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

Parche:

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## Referencia de entrada de herramienta

Todos los campos son opcionales a menos que se indique lo contrario:

- `before` (`string`): texto original. Se requiere con `after` cuando se omite `patch`.
- `after` (`string`): texto actualizado. Obligatorio con `before` cuando se omite `patch`.
- `patch` (`string`): texto de diff unificado. Mutuamente excluyente con `before` y `after`.
- `path` (`string`): nombre de archivo a mostrar para el modo antes y después.
- `lang` (`string`): sugerencia de anulación de idioma para el modo antes y después. Los valores desconocidos vuelven al texto sin formato.
- `title` (`string`): anulación del título del visor.
- `mode` (`"view" | "file" | "both"`): modo de salida. Por defecto es el predeterminado del complemento `defaults.mode`.
  Alias obsoleto: `"image"` se comporta como `"file"` y aún se acepta por compatibilidad con versiones anteriores.
- `theme` (`"light" | "dark"`): tema del visor. Por defecto es el predeterminado del complemento `defaults.theme`.
- `layout` (`"unified" | "split"`): disposición del diff. Por defecto es el predeterminado del complemento `defaults.layout`.
- `expandUnchanged` (`boolean`): expandir secciones sin cambios cuando el contexto completo esté disponible. Solo opción por llamada (no es una clave predeterminada del complemento).
- `fileFormat` (`"png" | "pdf"`): formato de archivo renderizado. Por defecto es el predeterminado del complemento `defaults.fileFormat`.
- `fileQuality` (`"standard" | "hq" | "print"`): preajuste de calidad para el renderizado PNG o PDF.
- `fileScale` (`number`): anulación de la escala del dispositivo (`1`-`4`).
- `fileMaxWidth` (`number`): ancho máximo de renderizado en píxeles CSS (`640`-`2400`).
- `ttlSeconds` (`number`): TTL del artefacto del visor en segundos. Predeterminado 1800, máximo 21600.
- `baseUrl` (`string`): anulación del origen de la URL del visor. Debe ser `http` o `https`, sin consulta/hash.

Validación y límites:

- `before` y `after` máx 512 KiB cada uno.
- `patch` máx 2 MiB.
- `path` máx 2048 bytes.
- `lang` máx 128 bytes.
- `title` máx 1024 bytes.
- Límite de complejidad del parche: máx 128 archivos y 120000 líneas en total.
- `patch` y `before` o `after` juntos se rechazan.
- Límites de seguridad de archivos renderizados (aplicable a PNG y PDF):
  - `fileQuality: "standard"`: máx 8 MP (8.000.000 píxeles renderizados).
  - `fileQuality: "hq"`: máx 14 MP (14.000.000 píxeles renderizados).
  - `fileQuality: "print"`: máx 24 MP (24.000.000 píxeles renderizados).
  - El PDF también tiene un máximo de 50 páginas.

## Contrato de detalles de salida

La herramienta devuelve metadatos estructurados en `details`.

Campos compartidos para modos que crean un visor:

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`
- `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` cuando estén disponibles)

Campos de archivo cuando se renderiza PNG o PDF:

- `artifactId`
- `expiresAt`
- `filePath`
- `path` (mismo valor que `filePath`, para compatibilidad con la herramienta de mensajes)
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

Resumen del comportamiento del modo:

- `mode: "view"`: solo campos del visor.
- `mode: "file"`: solo campos de archivo, sin artefacto de visor.
- `mode: "both"`: campos del visor más campos del archivo. Si falla la representación del archivo, el visor aún se devuelve con `fileError`.

## Secciones sin cambios contraídas

- El visor puede mostrar filas como `N unmodified lines`.
- Los controles de expansión en esas filas son condicionales y no se garantizan para cada tipo de entrada.
- Los controles de expansión aparecen cuando el diff renderizado tiene datos de contexto expandibles, lo cual es típico para la entrada antes y después.
- Para muchas entradas de parche unificadas, los cuerpos de contexto omitidos no están disponibles en los fragmentos del parche analizados, por lo que la fila puede aparecer sin controles de expansión. Este es un comportamiento esperado.
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

Los parámetros explícitos de la herramienta anulan estos valores predeterminados.

## Configuración de seguridad

- `security.allowRemoteViewer` (`boolean`, valor predeterminado `false`)
  - `false`: se deniegan las solicitudes que no son de bucle local a las rutas del visor.
  - `true`: se permiten visores remotos si la ruta tokenizada es válida.

Ejemplo:

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

- Los artefactos se almacenan en la subcarpeta temp: `$TMPDIR/openclaw-diffs`.
- Los metadatos del artefacto del visor contienen:
  - ID de artefacto aleatorio (20 caracteres hexadecimales)
  - token aleatorio (48 caracteres hexadecimales)
  - `createdAt` y `expiresAt`
  - ruta `viewer.html` almacenada
- El TTL predeterminado del visor es de 30 minutos cuando no se especifica.
- El TTL máximo aceptado del visor es de 6 horas.
- La limpieza se ejecuta de manera oportunista después de la creación del artefacto.
- Los artefactos caducados se eliminan.
- La limpieza de emergencia elimina carpetas obsoletas de más de 24 horas cuando faltan los metadatos.

## URL del visor y comportamiento de red

Ruta del visor:

- `/plugins/diffs/view/{artifactId}/{token}`

Recursos del visor:

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

El documento del visor resuelve esos activos en relación con la URL del visor, por lo que también se conserva un prefijo de ruta opcional `baseUrl` para ambas solicitudes de activos.

Comportamiento de construcción de URL:

- Si se proporciona `baseUrl`, se usa después de una validación estricta.
- Sin `baseUrl`, la URL del visor por defecto es loopback `127.0.0.1`.
- Si el modo de enlace de gateway es `custom` y se establece `gateway.customBindHost`, se usa ese host.

Reglas de `baseUrl`:

- Debe ser `http://` o `https://`.
- Query y hash son rechazados.
- Se permite el origen más una ruta base opcional.

## Modelo de seguridad

Endurecimiento del visor:

- Solo loopback por defecto.
- Rutas de visor tokenizadas con validación estricta de ID y token.
- CSP de respuesta del visor:
  - `default-src 'none'`
  - scripts y activos solo de self
  - sin `connect-src` saliente
- Limitación de fallos remotos cuando el acceso remoto está habilitado:
  - 40 fallos por 60 segundos
  - bloqueo de 60 segundos (`429 Too Many Requests`)

Endurecimiento del renderizado de archivos:

- El enrutamiento de solicitudes del navegador de captura de pantalla es de denegación por defecto.
- Solo se permiten los activos locales del visor de `http://127.0.0.1/plugins/diffs/assets/*`.
- Las solicitudes de red externas están bloqueadas.

## Requisitos del navegador para el modo de archivo

`mode: "file"` y `mode: "both"` necesitan un navegador compatible con Chromium.

Orden de resolución:

1. `browser.executablePath` en la configuración de OpenClaw.
2. Variables de entorno:
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. Respaldo de descubrimiento de comando/ruta de la plataforma.

Texto de fallo común:

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Solución instalando Chrome, Chromium, Edge o Brave, o estableciendo una de las opciones de ruta ejecutable anteriores.

## Solución de problemas

Errores de validación de entrada:

- `Provide patch or both before and after text.`
  - Incluya tanto `before` como `after`, o proporcione `patch`.
- `Provide either patch or before/after input, not both.`
  - No mezcle los modos de entrada.
- `Invalid baseUrl: ...`
  - Use el origen `http(s)` con una ruta opcional, sin consulta/hash.
- `{field} exceeds maximum size (...)`
  - Reduzca el tamaño de la carga útil.
- Rechazo de parche grande
  - Reduzca el recuento de archivos de parche o el total de líneas.

Problemas de accesibilidad del visor:

- La URL del visor se resuelve a `127.0.0.1` de forma predeterminada.
- Para escenarios de acceso remoto, ya sea:
  - pase `baseUrl` por llamada a la herramienta, o
  - use `gateway.bind=custom` y `gateway.customBindHost`
- Habilite `security.allowRemoteViewer` solo cuando pretenda acceso externo al visor.

La fila de líneas sin modificar no tiene botón de expandir:

- Esto puede ocurrir para la entrada de parche cuando el parche no lleva contexto expandible.
- Esto es esperado y no indica un fallo del visor.

Artefacto no encontrado:

- El artefacto expiró debido al TTL.
- El token o la ruta cambiaron.
- La limpieza eliminó los datos obsoletos.

## Guía operacional

- Prefiera `mode: "view"` para revisiones interactivas locales en el lienzo.
- Prefiera `mode: "file"` para canales de chat salientes que necesitan un archivo adjunto.
- Mantenga `allowRemoteViewer` deshabilitado a menos que su implementación requiera URLs de visor remoto.
- Establezca un `ttlSeconds` corto explícito para diffs sensibles.
- Evite enviar secretos en la entrada de diff cuando no sea necesario.
- Si su canal comprime las imágenes de forma agresiva (por ejemplo, Telegram o WhatsApp), prefiera la salida PDF (`fileFormat: "pdf"`).

Motor de renderizado de diff:

- Funciona con [Diffs](https://diffs.com).

## Documentos relacionados

- [Descripción general de herramientas](/en/tools)
- [Complementos](/en/tools/plugin)
- [Navegador](/en/tools/browser)
