---
title: "Herramienta PDF"
summary: "Analiza uno o más documentos PDF con soporte nativo del proveedor y respaldo de extracción"
read_when:
  - Quieres analizar PDFs desde agentes
  - Necesitas parámetros exactos y límites de la herramienta pdf
  - Estás depurando el modo nativo de PDF frente al modo de respaldo de extracción
---

# Herramienta PDF

`pdf` analiza uno o más documentos PDF y devuelve texto.

Comportamiento rápido:

- Modo de proveedor nativo para los proveedores de modelos Anthropic y Google.
- Modo de respaldo de extracción para otros proveedores (extrae texto primero, luego imágenes de páginas cuando sea necesario).
- Soporta entrada única (`pdf`) o múltiple (`pdfs`), máximo 10 PDFs por llamada.

## Disponibilidad

La herramienta solo se registra cuando OpenClaw puede resolver una configuración de modelo capaz de PDF para el agente:

1. `agents.defaults.pdfModel`
2. alternativa a `agents.defaults.imageModel`
3. alternativa a los valores predeterminados del proveedor de mejor esfuerzo basados en la autenticación disponible

Si no se puede resolver ningún modelo utilizable, la herramienta `pdf` no se expone.

## Referencia de entrada

- `pdf` (`string`): una ruta o URL de PDF
- `pdfs` (`string[]`): múltiples rutas o URL de PDF, hasta un total de 10
- `prompt` (`string`): prompt de análisis, predeterminado `Analyze this PDF document.`
- `pages` (`string`): filtro de página como `1-5` o `1,3,7-9`
- `model` (`string`): anulación de modelo opcional (`provider/model`)
- `maxBytesMb` (`number`): límite de tamaño por PDF en MB

Notas de entrada:

- `pdf` y `pdfs` se fusionan y se deduplican antes de cargar.
- Si no se proporciona ninguna entrada de PDF, la herramienta genera un error.
- `pages` se analiza como números de página basados en 1, se deduplican, se ordenan y se limitan a las páginas máximas configuradas.
- `maxBytesMb` tiene como valor predeterminado `agents.defaults.pdfMaxBytesMb` o `10`.

## Referencias de PDF compatibles

- ruta de archivo local (incluida la expansión de `~`)
- `file://` URL
- `http://` y `https://` URL

Notas de referencia:

- Otros esquemas de URI (por ejemplo `ftp://`) se rechazan con `unsupported_pdf_reference`.
- En modo sandbox, se rechazan las URL `http(s)` remotas.
- Con la política de solo espacio de trabajo habilitada, se rechazan las rutas de archivos locales fuera de las raíces permitidas.

## Modos de ejecución

### Modo de proveedor nativo

El modo nativo se utiliza para el proveedor `anthropic` y `google`.
La herramienta envía bytes PDF brutos directamente a las API del proveedor.

Límites del modo nativo:

- `pages` no es compatible. Si se establece, la herramienta devuelve un error.

### Modo de respaldo de extracción

El modo de respaldo se utiliza para proveedores no nativos.

Flujo:

1. Extraer texto de las páginas seleccionadas (hasta `agents.defaults.pdfMaxPages`, por defecto `20`).
2. Si la longitud del texto extraído es inferior a `200` caracteres, renderice las páginas seleccionadas como imágenes PNG e inclúyalas.
3. Enviar contenido extraído más el aviso al modelo seleccionado.

Detalles del respaldo:

- La extracción de imágenes de páginas utiliza un presupuesto de píxeles de `4,000,000`.
- Si el modelo de destino no admite la entrada de imágenes y no hay texto extraíble, la herramienta genera un error.
- El respaldo de extracción requiere `pdfjs-dist` (y `@napi-rs/canvas` para el renderizado de imágenes).

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

Consulte [Referencia de configuración](/es/gateway/configuration-reference) para obtener detalles completos de los campos.

## Detalles de salida

La herramienta devuelve texto en `content[0].text` y metadatos estructurados en `details`.

Campos `details` comunes:

- `model`: referencia del modelo resuelta (`provider/model`)
- `native`: `true` para el modo de proveedor nativo, `false` para el respaldo
- `attempts`: intentos de respaldo que fallaron antes del éxito

Campos de ruta:

- entrada de un solo PDF: `details.pdf`
- entrada de múltiples PDF: `details.pdfs[]` con `pdf` entradas
- metadatos de reescritura de ruta de sandbox (cuando corresponda): `rewrittenFrom`

## Comportamiento de error

- Falta de entrada de PDF: lanza `pdf required: provide a path or URL to a PDF document`
- Demasiados PDF: devuelve un error estructurado en `details.error = "too_many_pdfs"`
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

Múltiples PDF:

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

Modelo de reserva con filtrado de páginas:

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

import en from "/components/footer/en.mdx";

<en />
