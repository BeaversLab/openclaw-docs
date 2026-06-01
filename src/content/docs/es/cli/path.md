---
summary: "Referencia de CLI para `openclaw path` (inspeccionar y editar archivos del espacio de trabajo mediante el esquema de direccionamiento `oc://`)"
read_when:
  - You want to read or write a leaf inside a workspace file from the terminal
  - You're scripting against workspace state and want a stable, kind-agnostic addressing scheme
  - You're debugging a `oc://` path (validate the syntax, see what it resolves to)
title: "Ruta"
---

# `openclaw path`

Acceso a shell proporcionado por el complemento al sustrato de direccionamiento `oc://`: un
esquema de ruta con despacho por tipo para inspeccionar y editar archivos del espacio de direccionables
(markdown, c, l, yaml/yml/lobster). Los autohospedadores, autores de complementos
y extensiones del editor lo usan para leer, buscar o actualizar una ubicación específica
sin tener que crear analizadores específicos para cada archivo.

La CLI refleja los verbos públicos del sustrato:

- `resolve` es concreto y de coincidencia única.
- `find` es el verbo de coincidencia múltiple para comodines, uniones, predicados y
  expansión posicional.
- `set` solo acepta rutas concretas o marcadores de inserción; los patrones de comodines son
  rechazados antes de escribir.

`path` es proporcionado por el complemento opcional incluido `oc-path`. Actívelo antes
del primer uso:

```bash
openclaw plugins enable oc-path
```

## Por qué usarlo

El estado de OpenClaw se distribuye entre markdown editado por humanos, configuración JSONC comentada,
registros JSONL de solo anexión y archivos de flujo de trabajo/especificación YAML. Los scripts de shell, los ganchos
y los agentes a menudo necesitan un pequeño valor de esos archivos: una clave de frontmatter, una
configuración de complemento, un campo de registro, un paso YAML o un elemento de viñeta bajo una sección
con nombre.

`openclaw path` proporciona a esos llamadores una dirección estable en lugar de un grep, regex
o analizador único para cada tipo de archivo. La misma ruta `oc://` puede ser validada,
resuelta, buscada, ejecutada en seco y escrita desde la terminal, lo que hace que la automatización
estrecha sea más fácil de revisar y más segura de reproducir. Es especialmente útil cuando
desea actualizar una hoja mientras se preservan los comentarios, finales de línea
y el formato circundante del resto del archivo.

Úselo cuando lo que desea tiene una dirección lógica, pero la forma física del
archivo varía:

- Un gancho desea leer una configuración de JSONC comentado sin perder comentarios
  cuando escribe el valor de vuelta.
- Un script de mantenimiento desea encontrar cada campo de evento coincidente en un registro JSONL
  sin cargar todo el registro en un analizador personalizado.
- Una extensión de editor quiere saltar a una sección de markdown o a un elemento de viñeta mediante
  slug, y luego representar la línea exacta que resolvió.
- Un agente quiere realizar una simulación de una edición pequeña en el espacio de trabajo antes de aplicarla, con los
  bytes cambiados visibles en la revisión.

Probablemente no necesite `openclaw path` para ediciones ordinarias de archivos completos, migraciones
de configuración complejas o escrituras específicas de memoria. Esas deben usar el comando
propietario o el complemento. `path` es para operaciones de archivos pequeñas y direccionables donde un
comando de terminal repetible es más claro que otro analizador personalizado.

## Cómo se usa

Leer un valor de un archivo de configuración editado por humanos:

```bash
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled'
```

Vista previa de una escritura sin tocar el disco:

```bash
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

Encontrar registros coincidentes en un registro JSONL de solo adición:

```bash
openclaw path find 'oc://session.jsonl/[event=tool_call]/name'
```

Direccionar una instrucción en markdown por sección y elemento en lugar de por
número de línea:

```bash
openclaw path resolve 'oc://AGENTS.md/runtime-safety/openclaw-gateway'
```

Validar una ruta en CI o en un script previo al vuelo antes de que el script lea o escriba:

```bash
openclaw path validate 'oc://AGENTS.md/tools/$last/risk'
```

Esos comandos están pensados para ser copiados en scripts de shell. Use `--json` cuando un
llamador necesite salida estructurada y `--human` cuando una persona esté inspeccionando el
resultado.

## Cómo funciona

`openclaw path` hace cuatro cosas:

1. Analiza la dirección `oc://` en ranuras: archivo, sección, elemento, campo y
   sesión opcional.
2. Elige el adaptador de tipo de archivo a partir de la extensión de destino (`.md`, `.jsonc`,
   `.jsonl`, `.yaml`, `.yml`, `.lobster` y alias relacionados).
3. Resuelve las ranuras contra el AST de ese tipo de archivo: encabezados/elementos de markdown,
   claves de objeto/índices de matriz JSONC, registros de línea JSONL o nodos de mapa/secuencia
   YAML.
4. Para `set`, emite bytes editados a través del mismo adaptador para que las partes
   intactas del archivo conserven sus comentarios, finales de línea y formato cercano
   donde el tipo lo soporte.

`resolve` y `set` requieren un objetivo concreto. `find` es el verbo
exploratorio: expande comodines, uniones, predicados y ordinales en las coincidencias
concretas que puede inspeccionar antes de elegir una para escribir.

## Subcomandos

| Subcomando              | Propósito                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `resolve <oc-path>`     | Imprime la coincidencia concreta en la ruta (o "no encontrado").                                                       |
| `find <pattern>`        | Enumera las coincidencias para una ruta con comodín / unión / predicado.                                               |
| `set <oc-path> <value>` | Escribe una hoja o objetivo de inserción en una ruta concreta. Soporta `--dry-run`.                                    |
| `validate <oc-path>`    | Solo análisis; imprime el desglose estructural (archivo / sección / elemento / campo).                                 |
| `emit <file>`           | Realiza un viaje de ida y vuelta de un archivo a través de `parseXxx` + `emitXxx` (diagnóstico de fidelidad de bytes). |

## Marcas globales

| Marca           | Propósito                                                                                |
| --------------- | ---------------------------------------------------------------------------------------- |
| `--cwd <dir>`   | Resuelve la ranura del archivo contra este directorio (predeterminado: `process.cwd()`). |
| `--file <path>` | Anula la ruta resuelta de la ranura del archivo (acceso absoluto).                       |
| `--json`        | Forzar salida JSON (predeterminado cuando stdout no es un TTY).                          |
| `--human`       | Forzar salida humana (predeterminado cuando stdout es un TTY).                           |
| `--dry-run`     | (solo en `set`) imprime los bytes que se escribirían sin escribir.                       |
| `--diff`        | (con `set --dry-run`) imprime un diff unificado en lugar de los bytes completos.         |

## Sintaxis de `oc://`

```
oc://FILE/SECTION/ITEM/FIELD?session=SCOPE
```

Reglas de ranuras: `field` requiere `item`, y `item` requiere `section`. En las cuatro
ranuras:

- **Segmentos entre comillas** — `"a/b.c"` sobrevive a los separadores `/` y `.`.
  El contenido es literal de bytes; `"` y `\` no están permitidos dentro de las comillas.
  La ranura de archivo también reconoce las comillas: `oc://"skills/email-drafter"/Tools/$last`
  trata `skills/email-drafter` como una única ruta de archivo.
- **Predicados** — `[k=v]`, `[k!=v]`, `[k<v]`, `[k<=v]`, `[k>v]`,
  `[k>=v]`. Las operaciones numéricas requieren que ambos lados se coaccionen a números finitos.
- **Uniones** — `{a,b,c}` coincide con cualquiera de las alternativas.
- **Comodines** — `*` (subsegmento único) y `**` (cero o más,
  recursivo). `find` acepta estos; `resolve` y `set` los rechazan por ser
  ambiguos.
- **Posicional** — `$first` / `$last` se resuelven en el primer / último índice o
  clave declarada.
- **Ordinal** — `#N` para la n-ésima coincidencia por orden de documento.
- **Marcadores de inserción** — `+`, `+key`, `+nnn` para inserción con clave / indexada
  (usar con `set`).
- **Ámbito de sesión** — `?session=cron-daily`, etc. Ortogonal al anidamiento de
  ranuras. Los valores de sesión son brutos, no decodificados por porcentaje; no pueden contener
  caracteres de control ni delimitadores de consulta reservados (`?`, `&`, `%`).

Los caracteres reservados (`?`, `&`, `%`) fuera de segmentos entre comillas, predicados o de unión son rechazados. Los caracteres de control (U+0000-U+001F, U+007F) son rechazados en cualquier lugar, incluido el valor de la consulta `session`.

Se garantiza `formatOcPath(parseOcPath(path)) === path` para las rutas canónicas.
Los parámetros de consulta no canónicos se ignoran, excepto el primer valor `session=` no vacío.

## Direccionamiento por tipo de archivo

| Tipo              | Modelo de direccionamiento                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Markdown          | Secciones H2 por slug, elementos de viñeta por slug o `#N`, frontmatter a través de `[frontmatter]`.                     |
| JSONC/JSON        | Claves de objeto e índices de array; los puntos dividen subsegmentos anidados a menos que estén entre comillas.          |
| JSONL             | Direcciones de línea de nivel superior (`L1`, `L2`, `$first`, `$last`) y luego descenso estilo JSONC dentro de la línea. |
| YAML/YML/.lobster | Claves de mapa e índices de secuencia; los comentarios y el estilo de flujo son manejados por la API del documento YAML. |

`resolve` devuelve una coincidencia estructurada: `root`, `node`, `leaf` o
`insertion-point`, con un número de línea basado en 1. Los valores hoja se muestran como texto
más un `leafType` para que los autores de complementos puedan representar vistas previas sin depender de
la forma del AST específica de cada tipo.

## Contrato de mutación

`set` escribe un objetivo concreto:

- Los valores de frontmatter de Markdown y los campos de elementos `- key: value` son hojas de cadena.
  Las inserciones de Markdown añaden secciones, claves de frontmatter o elementos de sección y
  representan una forma canónica de Markdown para el archivo modificado.
- Las escrituras de hojas JSONC fuerzan el valor de cadena al tipo de hoja existente
  (`string`, `number` finito, `true`/`false`, o `null`). Use `--value-json`
  cuando un reemplazo de hoja JSONC/JSON/JSONL deba analizar `<value>` como JSON y
  pueda cambiar de forma, como reemplazar un atajo de cadena SecretRef con un
  objeto. Las inserciones de objetos y matrices JSONC analizan `<value>` como JSON y usan la
  ruta de edición `jsonc-parser` para escrituras de hojas ordinarias, preservando comentarios y
  formato cercano.
- Las escrituras de hojas JSONL fuerzan como JSONC dentro de una línea. El reemplazo de línea completa y
  el anexo analizan `<value>` como JSON. El JSONL renderizado preserva la convención dominante
  de final de línea LF/CRLF del archivo.
- Las escrituras de hojas YAML fuerzan al tipo escalar existente (`string`, `number` finito,
  `true`/`false`, o `null`). Las inserciones YAML usan la API de documentos del paquete incluido
  `yaml` para actualizaciones de mapas/secuencias. Los documentos YAML malformados
  con errores de análisis se rechazan antes de la mutación con `parse-error`.

Use `--dry-run` antes de las escrituras visibles para el usuario cuando los bytes exactos importen. El
sustrato preserva una salida idéntica a bytes para viajes de ida y vuelta de análisis/emisión, pero una
mutación puede canonificar la región editada o el archivo dependiendo del tipo.
Agregue `--diff` cuando desee la vista previa como un parche antes/después enfocado en lugar
del archivo renderizado completo.

## Ejemplos

```bash
# Validate a path (no filesystem access)
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk'

# Read a leaf
openclaw path resolve 'oc://gateway.jsonc/version'

# Wildcard search
openclaw path find 'oc://session.jsonl/*/event' --file ./logs/session.jsonl

# Dry-run a write
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run

# Dry-run a write as a unified diff
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff

# Apply the write
openclaw path set 'oc://gateway.jsonc/version' '2.0'

# Byte-fidelity round-trip (diagnostic)
openclaw path emit ./AGENTS.md
```

Más ejemplos de gramática:

```bash
# Quote keys containing / or .
openclaw path resolve 'oc://config.jsonc/agents.defaults.models/"anthropic/claude-opus-4-7"/alias'

# Deep JSON/JSONC paths can use slash segments; they normalize to dotted subsegments
openclaw path set 'oc://openclaw.json/agents/list/0/tools/exec/security' 'allowlist' --dry-run

# Replace a JSONC leaf with a parsed object
openclaw path set 'oc://openclaw.json/gateway/auth/token' '{"source":"file","provider":"secrets","id":"/test"}' --value-json --dry-run

# Predicate search over JSONC children
openclaw path find 'oc://config.jsonc/plugins/[enabled=true]/id'

# Insert into a JSONC array
openclaw path set 'oc://config.jsonc/items/+1' '{"id":"new","enabled":true}' --dry-run

# Insert a JSONC object key
openclaw path set 'oc://config.jsonc/plugins/+github' '{"enabled":true}' --dry-run

# Append a JSONL event
openclaw path set 'oc://session.jsonl/+' '{"event":"checkpoint","ok":true}' --file ./logs/session.jsonl

# Resolve the last JSONL value line
openclaw path resolve 'oc://session.jsonl/$last/event' --file ./logs/session.jsonl

# Resolve a YAML workflow step
openclaw path resolve 'oc://workflow.yaml/steps/0/id'

# Update a YAML scalar
openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --dry-run

# Address markdown frontmatter
openclaw path resolve 'oc://AGENTS.md/[frontmatter]/name'

# Insert markdown frontmatter
openclaw path set 'oc://AGENTS.md/[frontmatter]/+description' 'Agent instructions' --dry-run

# Find markdown item fields
openclaw path find 'oc://SKILL.md/Tools/*/send_email'

# Validate a session-scoped path
openclaw path validate 'oc://AGENTS.md/Tools/$last/risk?session=cron-daily'
```

## Recetas por tipo de archivo

Los mismos cinco verbos funcionan en todos los tipos; el esquema de direccionamiento se despacha según la
extensión del archivo. Los ejemplos a continuación utilizan los accesorios de la descripción del PR.

### Markdown

```text
<!-- frontmatter.md -->
---
name: drafter
description: email drafting agent
tier: core
---
## Tools
- gh: GitHub CLI
- curl: HTTP client
- send_email: enabled
```

```bash
$ openclaw path resolve 'oc://x.md/[frontmatter]/tier' --file frontmatter.md --human
leaf @ L4: "core" (string)

$ openclaw path resolve 'oc://x.md/tools/gh/gh' --file frontmatter.md --human
leaf @ L9: "GitHub CLI" (string)

$ openclaw path find 'oc://x.md/tools/*' --file frontmatter.md --human
3 matches for oc://x.md/tools/*:
  oc://x.md/tools/gh           →  node @ L9 [md-item]
  oc://x.md/tools/curl         →  node @ L10 [md-item]
  oc://x.md/tools/send-email   →  node @ L11 [md-item]
```

El predicado `[frontmatter]` direcciona el bloque de frontmatter YAML; `tools`
coincide con el encabezado `## Tools` a través del slug, y las hojas de elementos mantienen su forma de slug
even cuando la fuente usa guiones bajos (`send_email` → `send-email`).

### JSONC

```text
// config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": false, "role": "chat"}
  }
}
```

```bash
$ openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --file config.jsonc --human
leaf @ L4: "true" (boolean)

$ openclaw path set 'oc://config.jsonc/plugins/slack/enabled' 'true' --file config.jsonc --dry-run
--dry-run: would write 142 bytes to /…/config.jsonc
{
  "plugins": {
    "github": {"enabled": true, "role": "vcs"},
    "slack":  {"enabled": true, "role": "chat"}
  }
}
```

Las ediciones JSONC pasan a través de `jsonc-parser`, por lo que los comentarios y los espacios en blanco sobreviven a un
`set`. Ejecute primero con `--dry-run` para inspeccionar los bytes antes de confirmar.

### JSONL

```text
{"event":"start","userId":"u1","ts":1}
{"event":"action","userId":"u1","ts":2}
{"event":"end","userId":"u1","ts":3}
```

```bash
$ openclaw path find 'oc://session.jsonl/[event=action]/userId' --file session.jsonl --human
1 match for oc://session.jsonl/[event=action]/userId:
  oc://session.jsonl/L2/userId  →  leaf @ L2: "u1" (string)

$ openclaw path resolve 'oc://session.jsonl/L2/ts' --file session.jsonl --human
leaf @ L2: "2" (number)
```

Cada línea es un registro. Diríjase por predicado (`[event=action]`) cuando no
conozca el número de línea, o por el segmento canónico `LN` cuando lo conozca.

### YAML

```text
# workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify
    command: openclaw.invoke
```

```bash
$ openclaw path resolve 'oc://workflow.yaml/steps/0/id' --file workflow.yaml --human
leaf @ L3: "fetch" (string)

$ openclaw path set 'oc://workflow.yaml/steps/$last/id' 'classify-renamed' --file workflow.yaml --dry-run
--dry-run: would write 99 bytes to /…/workflow.yaml
name: inbox-triage
steps:
  - id: fetch
    command: gmail.search
  - id: classify-renamed
    command: openclaw.invoke
```

YAML utiliza la API `Document` del paquete `yaml` en lugar de un analizador (parser)
hecho a mano, por lo que los viajes de ida y vuelta (round-trips) de análisis/emisión ordinarios
conservan los comentarios y la forma de creación, mientras que las rutas resueltas utilizan el
mismo modelo de clave de mapa / índice de secuencia que JSONC. El mismo adaptador maneja archivos
`.yaml`, `.yml` y `.lobster`.

## Referencia de subcomandos

### `resolve <oc-path>`

Leer una sola hoja o nodo. Los comodines son rechazados; use `find` para ellos.
Sale con `0` si hay coincidencia, con `1` si no hay coincidencia limpia y con
`2` en caso de error de análisis o patrón rechazado.

```bash
openclaw path resolve 'oc://AGENTS.md/tools/gh/risk' --human
openclaw path resolve 'oc://gateway.jsonc/server/port' --json
```

### `find <pattern>`

Enumerar cada coincidencia para un patrón de comodín / predicado / unión. Sale con `0`
si hay al menos una coincidencia y con `1` si hay cero. Los comodines de ranura de archivo se
rechazan con `OC_PATH_FILE_WILDCARD_UNSUPPORTED`; pase un archivo concreto (la búsqueda global
multi-archivo es una característica futura).

```bash
openclaw path find 'oc://AGENTS.md/tools/**/risk'
openclaw path find 'oc://session.jsonl/[event=action]/userId'
openclaw path find 'oc://config.jsonc/plugins/{github,slack}/enabled'
```

### `set <oc-path> <value>`

Escribir una hoja. Combine con `--dry-run` para obtener una vista previa de los bytes que se
escribirían sin tocar el archivo. Agregue `--diff` para una vista previa de diff unificada.
Sale con `0` en una escritura exitosa, con `1` si el sustrato se niega (por ejemplo,
golpe de guardia centinela), con `2` en errores de análisis.

```bash
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run
openclaw path set 'oc://gateway.jsonc/version' '2.0' --dry-run --diff
openclaw path set 'oc://gateway.jsonc/version' '2.0'
openclaw path set 'oc://AGENTS.md/Tools/+gh/risk' 'low'
```

El marcador de inserción `+key` crea el hijo con nombre si aún no
existe; `+nnn` y el `+` simple funcionan para la inserción indexada
y de adición respectivamente.

### `validate <oc-path>`

Verificación solo de análisis. Sin acceso al sistema de archivos. Útil cuando desea confirmar que
una ruta de plantilla está bien formada antes de sustituir variables, o cuando desea
el desglose estructural para depuración:

```bash
$ openclaw path validate 'oc://AGENTS.md/tools/gh' --human
valid: oc://AGENTS.md/tools/gh
  file:    AGENTS.md
  section: tools
  item:    gh
```

Sale con `0` cuando es válido, con `1` cuando no es válido (con un `code` estructurado y
`message`), con `2` en errores de argumento.

### `emit <file>`

Realiza un recorrido de ida y vuelta de un archivo a través del analizador y emisor por tipo. La salida debería
ser idéntica a nivel de byte con la entrada en un archivo sound — la divergencia indica un
error del analizador o un golpe de centinela. Útil para depurar el comportamiento del sustrato en
entradas del mundo real.

```bash
openclaw path emit ./AGENTS.md
openclaw path emit ./gateway.jsonc --json
```

## Códigos de salida

| Código | Significado                                                                          |
| ------ | ------------------------------------------------------------------------------------ |
| `0`    | Éxito. (`resolve` / `find`: al menos una coincidencia. `set`: escritura exitosa.)    |
| `1`    | Sin coincidencias, o `set` rechazada por el sustrato (sin error a nivel de sistema). |
| `2`    | Error de argumento o de análisis.                                                    |

## Modo de salida

`openclaw path` es consciente de TTY: salida legible por humanos en una terminal, JSON cuando
stdout se canaliza o redirige. `--json` y `--human` anulan la
detección automática.

## Notas

- `set` escribe bytes a través de la ruta de emisión del sustrato, que aplica la
  protección de redacción-sentinela automáticamente. Una hoja que contenga
  `__OPENCLAW_REDACTED__` (literalmente o como una subcadena) se rechaza en el momento de la escritura.
- El análisis JSONC y las ediciones de hojas utilizan la dependencia `jsonc-parser`
  local del complemento, por lo que los comentarios y el formato se conservan en las escrituras
  de hojas ordinarias en lugar de pasar por una ruta de análisis/re-renderizado personalizado.
- `path` no conoce LKG. Si el archivo está rastreado por LKG, la siguiente
  llamada de observación decide si promover/recuperar. `set --batch` para
  un conjunto múltiple atómico a través del ciclo de vida de promoción/recuperación de LKG está planeado
  junto con el sustrato de recuperación de LKG.

## Relacionado

- [Referencia de CLI](/es/cli)
