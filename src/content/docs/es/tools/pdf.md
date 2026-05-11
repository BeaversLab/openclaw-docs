---
summary: "Analiza uno o más documentos PDF con soporte de proveedor nativo y respaldo de extracción"
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
2. respaldo a `agents.defaults.imageModel`
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
  Múltiples rutas o URLs de PDF, hasta 10 en total.
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
  Prompt de análisis.
</ParamField>

<ParamField path="pages" type="string">
  Filtro de página como `1-5` o `1,3,7-9`.
</ParamField>

<ParamField path="model" type="string">
  Anulación opcional de modelo en forma `provider/model`.
</ParamField>

<ParamField path="maxBytesMb" type="number">
  Límite de tamaño por PDF en MB. El valor predeterminado es `agents.defaults.pdfMaxBytesMb` o `10`.
</ParamField>

Notas de entrada:

- `pdf` y `pdfs` se combinan y se eliminan los duplicados antes de la carga.
- Si no se proporciona ninguna entrada de PDF, la herramienta devuelve un error.
- `pages` se analiza como números de página basados en 1, se eliminan duplicados, se ordenan y se limitan al máximo de páginas configurado.
- `maxBytesMb` tiene como valor predeterminado `agents.defaults.pdfMaxBytesMb` o `10`.

## Referencias de PDF admitidas

- ruta de archivo local (incluida la expansión de `~`)
- URL `file://`
- URL `http://` y `https://`
- Referencias entrantes gestionadas por OpenClaw, como `media://inbound/<id>`

Notas de referencia:

- Otros esquemas de URI (por ejemplo, `ftp://`) se rechazan con `unsupported_pdf_reference`.
- En modo sandbox, se rechazan las URLs remotas de `http(s)`.
- Con la política de solo espacio de trabajo habilitada, se rechazan las rutas de archivos locales fuera de las raíces permitidas.
- Se permiten las referencias entrantes gestionadas y las rutas reproducidas en el almacén de medios entrantes de OpenClaw con una política de archivos solo del espacio de trabajo.

## Modos de ejecución

### Modo de proveedor nativo

El modo nativo se utiliza para los proveedores `anthropic` y `google`.
La herramienta envía los bytes PDF brutos directamente a las API del proveedor.

Límites del modo nativo:

- `pages` no es compatible. Si se establece, la herramienta devuelve un error.
- Se admite la entrada de varios PDF; cada PDF se envía como un bloque de documento nativo /
  parte PDF en línea antes del prompt.

### Modo de alternativa de extracción

El modo de alternativa se utiliza para proveedores no nativos.

Flujo:

1. Extraer texto de las páginas seleccionadas (hasta `agents.defaults.pdfMaxPages`, valor predeterminado `20`).
2. Si la longitud del texto extraído es inferior a `200` caracteres, representar las páginas seleccionadas como imágenes PNG e incluirlas.
3. Enviar el contenido extraído más el prompt al modelo seleccionado.

Detalles de la alternativa:

- La extracción de imágenes de páginas utiliza un presupuesto de píxeles de `4,000,000`.
- Si el modelo de destino no admite entrada de imagen y no hay texto extraíble, la herramienta devuelve un error.
- Si la extracción de texto tiene éxito pero la extracción de imágenes requeriría visión en un
  modelo de solo texto, OpenClaw descarta las imágenes renderizadas y continúa con el
  texto extraído.
- El respaldo de extracción utiliza el complemento incluido `document-extract`. El complemento es propietario de
  `pdfjs-dist`; `@napi-rs/canvas` se usa solo cuando el respaldo de renderizado de imágenes está
  disponible.

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

- `model`: referencia de modelo resuelta (`provider/model`)
- `native`: `true` para el modo de proveedor nativo, `false` para el respaldo
- `attempts`: intentos de respaldo que fallaron antes del éxito

Campos de ruta:

- entrada de un solo PDF: `details.pdf`
- entradas de múltiples PDFs: `details.pdfs[]` con `pdf` entradas
- metadatos de reescritura de ruta de sandbox (cuando corresponda): `rewrittenFrom`

## Comportamiento de error

- Falta la entrada del PDF: lanza `pdf required: provide a path or URL to a PDF document`
- Demasiados PDFs: devuelve un error estructurado en `details.error = "too_many_pdfs"`
- Esquema de referencia no admitido: devuelve `details.error = "unsupported_pdf_reference"`
- Modo nativo con `pages`: lanza un error `pages is not supported with native PDF providers` claro

## Ejemplos

Un solo PDF:

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

Modelo de respaldo filtrado por páginas:

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## Relacionado

- [Descripción general de herramientas](/es/tools) — todas las herramientas de agente disponibles
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) — configuración de pdfMaxBytesMb y pdfMaxPages
