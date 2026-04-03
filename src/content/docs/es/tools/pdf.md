---
title: "Herramienta PDF"
summary: "Analice uno o más documentos PDF con compatibilidad con el proveedor nativo y alternativa de extracción"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

# Herramienta PDF

`pdf` analiza uno o más documentos PDF y devuelve texto.

Comportamiento rápido:

- Modo de proveedor nativo para los proveedores de modelos Anthropic y Google.
- Modo de alternativa de extracción para otros proveedores (extrae texto primero, luego imágenes de página cuando sea necesario).
- Admite entrada única (`pdf`) o múltiple (`pdfs`), máximo 10 PDF por llamada.

## Disponibilidad

La herramienta solo se registra cuando OpenClaw puede resolver una configuración de modelo capaz de PDF para el agente:

1. `agents.defaults.pdfModel`
2. alternativa a `agents.defaults.imageModel`
3. alternativa a los valores predeterminados del proveedor de mejor esfuerzo basados en la autenticación disponible

Si no se puede resolver ningún modelo utilizable, no se expone la herramienta `pdf`.

## Referencia de entrada

- `pdf` (`string`): una ruta o URL de PDF
- `pdfs` (`string[]`): múltiples rutas o URL de PDF, hasta 10 en total
- `prompt` (`string`): aviso de análisis, predeterminado `Analyze this PDF document.`
- `pages` (`string`): filtro de página como `1-5` o `1,3,7-9`
- `model` (`string`): invalidación opcional del modelo (`provider/model`)
- `maxBytesMb` (`number`): límite de tamaño por PDF en MB

Notas de entrada:

- `pdf` y `pdfs` se fusionan y se deduplican antes de cargar.
- Si no se proporciona ninguna entrada de PDF, la herramienta genera un error.
- `pages` se analiza como números de página basados en 1, se deduplican, se ordenan y se limitan al máximo de páginas configurado.
- `maxBytesMb` por defecto es `agents.defaults.pdfMaxBytesMb` o `10`.

## Referencias de PDF admitidas

- ruta de archivo local (incluida la expansión `~`)
- URL `file://`
- `http://` y `https://` URL

Notas de referencia:

- Otros esquemas de URI (por ejemplo `ftp://`) se rechazan con `unsupported_pdf_reference`.
- En modo sandbox, las URLs `http(s)` remotas se rechazan.
- Con la política de solo espacio de trabajo habilitada, se rechazan las rutas de archivos locales fuera de las raíces permitidas.

## Modos de ejecución

### Modo de proveedor nativo

El modo nativo se usa para el proveedor `anthropic` y `google`.
La herramienta envía bytes PDF sin procesar directamente a las API del proveedor.

Límites del modo nativo:

- `pages` no es compatible. Si se establece, la herramienta devuelve un error.

### Modo de reserva por extracción

El modo de reserva se usa para proveedores no nativos.

Flujo:

1. Extraer texto de las páginas seleccionadas (hasta `agents.defaults.pdfMaxPages`, por defecto `20`).
2. Si la longitud del texto extraído es inferior a `200` caracteres, renderice las páginas seleccionadas como imágenes PNG e inclúyalas.
3. Enviar contenido extraído más el prompt al modelo seleccionado.

Detalles de la reserva:

- La extracción de imágenes de páginas utiliza un presupuesto de píxeles de `4,000,000`.
- Si el modelo objetivo no admite entrada de imagen y no hay texto extraíble, la herramienta genera un error.
- La reserva por extracción requiere `pdfjs-dist` (y `@napi-rs/canvas` para el renderizado de imágenes).

## Configuración

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

Consulte [Referencia de configuración](/en/gateway/configuration-reference) para obtener detalles completos de los campos.

## Detalles de la salida

La herramienta devuelve texto en `content[0].text` y metadatos estructurados en `details`.

Campos comunes de `details`:

- `model`: referencia de modelo resuelta (`provider/model`)
- `native`: `true` para el modo de proveedor nativo, `false` para la reserva
- `attempts`: intentos de reserva que fallaron antes del éxito

Campos de ruta:

- entrada de un solo PDF: `details.pdf`
- múltiples entradas PDF: `details.pdfs[]` con `pdf` entradas
- metadatos de reescritura de ruta de sandbox (cuando corresponda): `rewrittenFrom`

## Comportamiento de error

- Falta de entrada PDF: lanza `pdf required: provide a path or URL to a PDF document`
- Demasiados PDFs: devuelve un error estructurado en `details.error = "too_many_pdfs"`
- Esquema de referencia no compatible: devuelve `details.error = "unsupported_pdf_reference"`
- Modo nativo con `pages`: lanza un error `pages is not supported with native PDF providers` claro

## Ejemplos

PDF único:

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

Múltiples PDFs:

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

Modelo alternativo filtrado por páginas:

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## Relacionado

- [Resumen de herramientas](/en/tools) — todas las herramientas de agente disponibles
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — configuración de pdfMaxBytesMb y pdfMaxPages
