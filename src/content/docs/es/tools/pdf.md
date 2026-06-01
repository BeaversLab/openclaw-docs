---
summary: "Analice uno o más documentos PDF con soporte de proveedor nativo y respaldo de extracción"
title: "Herramienta PDF"
read_when:
  - You want to analyze PDFs from agents
  - You need exact pdf tool parameters and limits
  - You are debugging native PDF mode vs extraction fallback
---

`pdf` analiza uno o más documentos PDF y devuelve texto.

Comportamiento rápido:

- Modo de proveedor nativo para los proveedores de modelos Anthropic y Google.
- Modo de respaldo de extracción para otros proveedores (extrae texto primero, luego imágenes de página cuando sea necesario).
- Admite entrada única (`pdf`) o múltiple (`pdfs`), máximo 10 PDFs por llamada.

## Disponibilidad

La herramienta solo se registra cuando OpenClaw puede resolver una configuración de modelo con capacidad PDF para el agente:

1. `agents.defaults.pdfModel`
2. cambiar a `agents.defaults.imageModel`
3. respaldo al modelo de sesión/predeterminado resuelto del agente
4. si los proveedores de PDF nativos están respaldados por autenticación, preferirlos antes que los candidatos de respaldo de imagen genéricos

Si no se puede resolver ningún modelo utilizable, la herramienta `pdf` no se expone.

Notas de disponibilidad:

- La cadena de respaldo es consciente de la autenticación. Un `provider/model` configurado solo cuenta si
  OpenClaw puede autenticar realmente ese proveedor para el agente.
- Los proveedores de PDF nativos son actualmente **Anthropic** y **Google**.
- Si el proveedor de sesión/predeterminado resuelto ya tiene un modelo de visión/PDF
  configurado, la herramienta PDF reutiliza eso antes de recurrir a otros proveedores
  respaldados por autenticación.

## Referencia de entrada

<ParamField path="pdf" type="string">
  Una ruta o URL de PDF.
</ParamField>

<ParamField path="pdfs" type="string[]">
  Múltiples rutas o URL de PDF, hasta un total de 10.
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
  Prompt de análisis.
</ParamField>

<ParamField path="pages" type="string"
Filtro de páginas como `1-5` o `1,3,7-9`.
</ParamField>

<ParamField path="password" type="string">
  Contraseña para PDFs cifrados en el modo de respaldo de extracción.
</ParamField>

<ParamField path="model" type="string">
  Anulación opcional del modelo en formato `provider/model`.
</ParamField>

<ParamField path="maxBytesMb" type="number">
  Límite de tamaño por PDF en MB. Por defecto es `agents.defaults.pdfMaxBytesMb` o `10`.
</ParamField>

Notas de entrada:

- `pdf` y `pdfs` se fusionan y se deduplican antes de cargar.
- Si no se proporciona ninguna entrada de PDF, la herramienta genera un error.
- `pages` se analiza como números de página basados en 1, se deduplican, ordenan y limitan al máximo de páginas configurado.
- `password` se aplica a cada PDF en la solicitud y solo lo usa el modo de respaldo de extracción.
- `maxBytesMb` el valor predeterminado es `agents.defaults.pdfMaxBytesMb` o `10`.

## Referencias de PDF compatibles

- ruta de archivo local (incluida la expansión de `~`)
- URL `file://`
- URL `http://` y `https://`
- referencias entrantes administradas por OpenClaw, como `media://inbound/<id>`

Notas sobre las referencias:

- Otros esquemas de URI (por ejemplo `ftp://`) se rechazan con `unsupported_pdf_reference`.
- En modo sandbox, las URL `http(s)` remotas se rechazan.
- Con la política de solo espacio de trabajo habilitada, se rechazan las rutas de archivos locales fuera de las raíces permitidas.
- Las referencias entrantes administradas y las rutas reproducidas bajo el almacén de medios entrantes de OpenClaw están permitidas con la política de solo espacio de trabajo.

## Modos de ejecución

### Modo de proveedor nativo

El modo nativo se utiliza para el proveedor `anthropic` y `google`.
La herramienta envía bytes PDF brutos directamente a las API del proveedor.

Límites del modo nativo:

- `pages` no es compatible. Si se establece, la herramienta devuelve un error.
- `password` no es compatible. Utilice un modelo no nativo para analizar PDF cifrados.
- Se admite la entrada de múltiples PDF; cada PDF se envía como un bloque de documento nativo /
  parte PDF en línea antes del mensaje.

### Modo de respaldo por extracción

El modo de respaldo se utiliza para proveedores no nativos.

Flujo:

1. Extraer texto de las páginas seleccionadas (hasta `agents.defaults.pdfMaxPages`, predeterminado `20`).
2. Si la longitud del texto extraído es inferior a `200` caracteres, renderice las páginas seleccionadas como imágenes PNG e inclúyalas.
3. Envíe el contenido extraído más el mensaje al modelo seleccionado.

Detalles del respaldo:

- La extracción de imágenes de páginas utiliza un presupuesto de píxeles de `4,000,000`.
- Los PDF cifrados se pueden abrir con el parámetro de nivel superior `password`.
- Si el modelo de destino no admite entrada de imagen y no hay texto extraíble, la herramienta produce un error.
- Si la extracción de texto tiene éxito pero la extracción de imágenes requeriría visión en un
  modelo solo de texto, OpenClaw descarta las imágenes renderizadas y continúa con el
  texto extraído.
- La alternativa de extracción utiliza el complemento `document-extract` incluido. El complemento posee
  `clawpdf`, que proporciona extracción de texto y renderizado de imágenes a través de PDFium
  WebAssembly.

## Configuración

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

Consulte [Referencia de configuración](/es/gateway/configuration-reference) para obtener detalles completos de los campos.

## Detalles de la salida

La herramienta devuelve texto en `content[0].text` y metadatos estructurados en `details`.

Campos comunes de `details`:

- `model`: referencia del modelo resuelta (`provider/model`)
- `native`: `true` para el modo de proveedor nativo, `false` para la alternativa
- `attempts`: intentos de alternativa que fallaron antes del éxito

Campos de ruta:

- entrada de un solo PDF: `details.pdf`
- entradas de múltiples PDFs: `details.pdfs[]` con entradas `pdf`
- metadatos de reescritura de ruta de sandbox (cuando sea aplicable): `rewrittenFrom`

## Comportamiento de error

- Falta de entrada PDF: lanza `pdf required: provide a path or URL to a PDF document`
- Demasiados PDFs: devuelve un error estructurado en `details.error = "too_many_pdfs"`
- Esquema de referencia no compatible: devuelve `details.error = "unsupported_pdf_reference"`
- Modo nativo con `pages`: lanza un error claro `pages is not supported with native PDF providers`

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
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

PDF cifrado con alternativa de extracción:

```json
{
  "pdf": "/tmp/locked.pdf",
  "password": "example-password",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Summarize this contract"
}
```

## Relacionado

- [Descripción general de herramientas](/es/tools) - todas las herramientas de agente disponibles
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) - configuración de pdfMaxBytesMb y pdfMaxPages
