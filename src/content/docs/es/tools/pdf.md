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
3. volver al modelo de sesión/predeterminado resuelto del agente
4. si los proveedores de PDF nativos están respaldados por autenticación, preferirlos antes que los candidatos de reserva de imagen genéricos

Si no se puede resolver ningún modelo utilizable, la herramienta `pdf` no se expone.

Notas de disponibilidad:

- La cadena de reserva es consciente de la autenticación. Un `provider/model` configurado solo cuenta si
  OpenClaw puede autenticar realmente ese proveedor para el agente.
- Los proveedores de PDF nativos son actualmente **Anthropic** y **Google**.
- Si el proveedor de sesión/predeterminado resuelto ya tiene un modelo de visión/PDF
  configurado, la herramienta de PDF reutiliza ese antes de recurrir a otros proveedores
  respaldados por autenticación.

## Referencia de entrada

- `pdf` (`string`): una ruta o URL de PDF
- `pdfs` (`string[]`): múltiples rutas o URL de PDF, hasta 10 en total
- `prompt` (`string`): mensaje de análisis, por defecto `Analyze this PDF document.`
- `pages` (`string`): filtro de páginas como `1-5` o `1,3,7-9`
- `model` (`string`): anulación opcional del modelo (`provider/model`)
- `maxBytesMb` (`number`): límite de tamaño por PDF en MB

Notas de entrada:

- `pdf` y `pdfs` se fusionan y deduplican antes de cargar.
- Si no se proporciona ninguna entrada de PDF, la herramienta da un error.
- `pages` se analiza como números de página basados en 1, se deduplican, ordenan y limitan al máximo de páginas configurado.
- `maxBytesMb` por defecto es `agents.defaults.pdfMaxBytesMb` o `10`.

## Referencias de PDF admitidas

- ruta de archivo local (incluida la expansión `~`)
- URL `file://`
- URL `http://` y `https://`

Notas de referencia:

- Otros esquemas de URI (por ejemplo `ftp://`) se rechazan con `unsupported_pdf_reference`.
- En modo sandbox, las URL remotas `http(s)` se rechazan.
- Con la política de solo espacio de trabajo habilitada, se rechazan las rutas de archivos locales fuera de las raíces permitidas.

## Modos de ejecución

### Modo de proveedor nativo

El modo nativo se utiliza para el proveedor `anthropic` y `google`.
La herramienta envía bytes PDF sin procesar directamente a las API del proveedor.

Límites del modo nativo:

- `pages` no es compatible. Si se establece, la herramienta devuelve un error.
- Se admite la entrada de varios PDF; cada PDF se envía como un bloque de documento nativo /
  parte PDF en línea antes del mensaje.

### Modo de respaldo de extracción

El modo de respaldo se utiliza para proveedores no nativos.

Flujo:

1. Extraer texto de las páginas seleccionadas (hasta `agents.defaults.pdfMaxPages`, por defecto `20`).
2. Si la longitud del texto extraído es inferior a `200` caracteres, renderiza las páginas seleccionadas como imágenes PNG y las incluye.
3. Envía el contenido extraído más el mensaje al modelo seleccionado.

Detalles del respaldo:

- La extracción de imágenes de páginas utiliza un presupuesto de píxeles de `4,000,000`.
- Si el modelo de destino no admite la entrada de imágenes y no hay texto extraíble, la herramienta genera un error.
- Si la extracción de texto tiene éxito pero la extracción de imágenes requeriría visión en un
  modelo solo de texto, OpenClaw descarta las imágenes renderizadas y continúa con el
  texto extraído.
- El respaldo de extracción requiere `pdfjs-dist` (y `@napi-rs/canvas` para el renderizado de imágenes).

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

Consulte [Referencia de configuración](/en/gateway/configuration-reference) para obtener detalles completos de los campos.

## Detalles de la salida

La herramienta devuelve texto en `content[0].text` y metadatos estructurados en `details`.

Campos comunes de `details`:

- `model`: referencia del modelo resuelta (`provider/model`)
- `native`: `true` para el modo de proveedor nativo, `false` para el respaldo
- `attempts`: intentos de respaldo que fallaron antes del éxito

Campos de ruta:

- entrada de un solo PDF: `details.pdf`
- entradas de múltiples PDF: `details.pdfs[]` con `pdf` entradas
- metadatos de reescritura de ruta de sandbox (cuando sea aplicable): `rewrittenFrom`

## Comportamiento de error

- Falta la entrada PDF: lanza `pdf required: provide a path or URL to a PDF document`
- Demasiados PDFs: devuelve un error estructurado en `details.error = "too_many_pdfs"`
- Esquema de referencia no admitido: devuelve `details.error = "unsupported_pdf_reference"`
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

Modelo de respaldo con filtro de páginas:

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

## Relacionado

- [Resumen de herramientas](/en/tools) — todas las herramientas de agente disponibles
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — configuración pdfMaxBytesMb y pdfMaxPages
