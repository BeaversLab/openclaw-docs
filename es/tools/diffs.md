---
title: "Diffs"
summary: "Visor de diffs de solo lectura y renderizador de archivos para agentes (herramienta de complemento opcional)"
description: "Use el complemento opcional Diffs para representar texto anterior y posterior o parches unificados como una vista de diff alojada en la puerta de enlace, un archivo (PNG o PDF), o ambos."
read_when:
  - Quiere que los agentes muestren ediciones de código o markdown como diffs
  - Quiere una URL de visora lista para el lienzo (canvas) o un archivo diff renderizado
  - Necesita artefactos de diff temporales y controlados con valores predeterminados seguros
---

# Diffs

`diffs` es una herramienta de complemento opcional con una guía del sistema integrada breve y una habilidad complementaria que convierte el contenido de cambios en un artefacto de diff de solo lectura para agentes.

Acepta:

- texto `before` y `after`
- un `patch` unificado

Puede devolver:

- una URL de visora de puerta de enlace para la presentación en el lienzo (canvas)
- una ruta de archivo renderizado (PNG o PDF) para la entrega de mensajes
- ambas salidas en una sola llamada

Cuando se habilita, el complemento antepone una guía de uso concisa en el espacio del prompt del sistema y también expone una habilidad detallada para casos en los que el agente necesita instrucciones más completas.

## Inicio rápido

1. Habilite el complemento.
2. Llame a `diffs` con `mode: "view"` para flujos priorizados para el lienzo (canvas).
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

## Deshabilitar la guía integrada del sistema

Si desea mantener la herramienta `diffs` habilitada pero deshabilitar su guía del prompt del sistema integrada, establezca `plugins.entries.diffs.hooks.allowPromptInjection` en `false`:

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

Esto bloquea el gancho `before_prompt_build` del complemento diffs mientras mantiene el complemento, la herramienta y la habilidad complementaria disponibles.

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

## Referencia de entrada de la herramienta

Todos los campos son opcionales, a menos que se indique lo contrario:

- `before` (`string`): texto original. Requerido con `after` cuando se omite `patch`.
- `after` (`string`): texto actualizado. Requerido con `before` cuando se omite `patch`.
- `patch` (`string`): texto de diff unificado. Mutuamente excluyente con `before` y `after`.
- `path` (`string`): nombre de archivo que se mostrará para el modo antes y después.
- `lang` (`string`): sugerencia de anulación de idioma para el modo antes y después.
- `title` (`string`): anulación del título del visor.
- `mode` (`"view" | "file" | "both"`): modo de salida. El valor predeterminado es el valor predeterminado del complemento `defaults.mode`.
- `theme` (`"light" | "dark"`): tema del visor. El valor predeterminado es el valor predeterminado del complemento `defaults.theme`.
- `layout` (`"unified" | "split"`): diseño del diff. El valor predeterminado es el valor predeterminado del complemento `defaults.layout`.
- `expandUnchanged` (`boolean`): expandir las secciones sin cambios cuando el contexto completo esté disponible. Opción solo por llamada (no es una clave predeterminada del complemento).
- `fileFormat` (`"png" | "pdf"`): formato de archivo renderizado. El valor predeterminado es el valor predeterminado del complemento `defaults.fileFormat`.
- `fileQuality` (`"standard" | "hq" | "print"`): preajuste de calidad para el renderizado PNG o PDF.
- `fileScale` (`number`): anulación de la escala del dispositivo (`1`-`4`).
- `fileMaxWidth` (`number`): ancho de renderizado máximo en píxeles CSS (`640`-`2400`).
- `ttlSeconds` (`number`): TTL del artefacto del visor en segundos. Valor predeterminado 1800, máximo 21600.
- `baseUrl` (`string`): anulación del origen de la URL del visor. Debe ser `http` o `https`, sin consulta/hash.

Validación y límites:

- `before` y `after` cada uno máximo 512 KiB.
- `patch` máximo 2 MiB.
- `path` máximo 2048 bytes.
- `lang` máximo 128 bytes.
- `title` máximo 1024 bytes.
- Límite de complejidad del parche: máximo 128 archivos y 120000 líneas en total.
- `patch` y `before` o `after` juntos se rechazan.
- Límites de seguridad del archivo renderizado (aplicable a PNG y PDF):
  - `fileQuality: "standard"`: máximo 8 MP (8.000.000 píxeles renderizados).
  - `fileQuality: "hq"`: máximo 14 MP (14.000.000 píxeles renderizados).
  - `fileQuality: "print"`: máximo 24 MP (24.000.000 píxeles renderizados).
  - El PDF también tiene un máximo de 50 páginas.

## Contrato de detalles de salida

La herramienta devuelve metadatos estructurados bajo `details`.

Campos compartidos para los modos que crean un visor:

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`

Campos de archivo cuando se renderiza PNG o PDF:

- `filePath`
- `path` (mismo valor que `filePath`, para compatibilidad con la herramienta de mensajes)
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

Resumen del comportamiento del modo:

- `mode: "view"`: solo campos del visor.
- `mode: "file"`: solo campos de archivo, sin artefacto del visor.
- `mode: "both"`: campos del visor más campos de archivo. Si falla el renderizado del archivo, el visor aún se devuelve con `fileError`.

## Secciones sin cambios colapsadas

- El visor puede mostrar filas como `N unmodified lines`.
- Los controles de expansión en esas filas son condicionales y no se garantizan para todos los tipos de entrada.
- Los controles de expansión aparecen cuando el diff renderizado tiene datos de contexto expandibles, lo cual es típico para la entrada de antes y después.
- Para muchas entradas de parches unificados, los cuerpos de contexto omitidos no están disponibles en los fragmentos de parche analizados, por lo que la fila puede aparecer sin controles de expansión. Este es un comportamiento esperado.
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

## Configuración de seguridad

- `security.allowRemoteViewer` (`boolean`, predeterminado `false`)
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

- Los artefactos se almacenan en la subcarpeta temporal: `$TMPDIR/openclaw-diffs`.
- Los metadatos del artefacto del visor contienen:
  - ID de artefacto aleatorio (20 caracteres hexadecimales)
  - token aleatorio (48 caracteres hexadecimales)
  - `createdAt` y `expiresAt`
  - ruta `viewer.html` almacenada
- El TTL predeterminado del visor es de 30 minutos cuando no se especifica.
- El TTL máximo aceptado para el visor es de 6 horas.
- La limpieza se ejecuta de manera oportunista después de la creación del artefacto.
- Los artefactos caducados se eliminan.
- La limpieza de reserva elimina las carpetas obsoletas de más de 24 horas cuando faltan los metadatos.

## URL del visor y comportamiento de la red

Ruta del visor:

- `/plugins/diffs/view/{artifactId}/{token}`

Activos del visor:

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

Comportamiento de la construcción de la URL:

- Si se proporciona `baseUrl`, se usa tras una validación estricta.
- Sin `baseUrl`, la URL del visor por defecto es loopback `127.0.0.1`.
- Si el modo de enlace de la puerta de enlace es `custom` y se establece `gateway.customBindHost`, se usa ese host.

Reglas de `baseUrl`:

- Debe ser `http://` o `https://`.
- La consulta y el hash son rechazados.
- Se permite el origen más la ruta base opcional.

## Modelo de seguridad

Endurecimiento del visor:

- Solo loopback por defecto.
- Rutas de visor tokenizadas con validación estricta de ID y token.
- CSP de respuesta del visor:
  - `default-src 'none'`
  - scripts y assets solo del propio origen
  - sin `connect-src` saliente
- Limitación de fallos remotos cuando el acceso remoto está habilitado:
  - 40 fallos por 60 segundos
  - bloqueo de 60 segundos (`429 Too Many Requests`)

Endurecimiento del renderizado de archivos:

- El enrutamiento de solicitudes del navegador de captura de pantalla es de denegación por defecto.
- Solo se permiten los assets locales del visor de `http://127.0.0.1/plugins/diffs/assets/*`.
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
  - No mezcle modos de entrada.
- `Invalid baseUrl: ...`
  - Use el origen `http(s)` con ruta opcional, sin consulta/hash.
- `{field} exceeds maximum size (...)`
  - Reduzca el tamaño de la carga útil.
- Rechazo de parche grande
  - Reduzca la cantidad de archivos de parche o el total de líneas.

Problemas de accesibilidad del visor:

- La URL del visor se resuelve a `127.0.0.1` de forma predeterminada.
- Para escenarios de acceso remoto:
  - pase `baseUrl` por cada llamada a la herramienta, o
  - use `gateway.bind=custom` y `gateway.customBindHost`
- Habilite `security.allowRemoteViewer` solo cuando pretenda permitir el acceso externo al visor.

La fila de líneas sin modificar no tiene botón de expandir:

- Esto puede ocurrir para la entrada de parche cuando el parche no lleva un contexto expandible.
- Esto es esperado y no indica un fallo del visor.

Artefacto no encontrado:

- El artefacto expiró debido al TTL.
- El token o la ruta cambiaron.
- La limpieza eliminó datos obsoletos.

## Guía operativa

- Prefiera `mode: "view"` para revisiones interactivas locales en el lienzo.
- Prefiera `mode: "file"` para canales de chat salientes que necesiten un archivo adjunto.
- Mantenga `allowRemoteViewer` deshabilitado a menos que su implementación requiera URLs de visor remotas.
- Establezca un `ttlSeconds` corto y explícito para diffs sensibles.
- Evite enviar secretos en la entrada del diff cuando no sea necesario.
- Si su canal comprime las imágenes de forma agresiva (por ejemplo, Telegram o WhatsApp), prefiera la salida PDF (`fileFormat: "pdf"`).

Motor de renderizado de diff:

- Desarrollado por [Diffs](https://diffs.com).

## Documentos relacionados

- [Descripción general de herramientas](/es/tools)
- [Complementos](/es/tools/plugin)
- [Navegador](/es/tools/browser)

import es from "/components/footer/es.mdx";

<es />
