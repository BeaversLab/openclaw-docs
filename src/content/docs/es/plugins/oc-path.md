---
summary: "Complemento `oc-path` incluido: proporciona la CLI `openclaw path` para el esquema de direccionamiento de archivos de espacio de trabajo `oc://`"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "Complemento OC Path"
---

El complemento incluido `oc-path` añade la CLI [`openclaw path`](/es/cli/path) para el
esquema de direccionamiento de archivos de espacio de trabajo `oc://`. Se incluye en el repositorio de OpenClaw bajo
`extensions/oc-path/` pero es opcional: la instalación/compilación lo deja inactivo hasta que
lo active.

Las direcciones `oc://` apuntan a una única hoja (o un conjunto comodín de hojas) dentro
de un archivo de espacio de trabajo. El complemento entiende cuatro tipos de archivos hoy en día:

- **markdown** (`.md`, `.mdx`): frontmatter, secciones, elementos, campos
- **c** (`.jsonc`, `.json5`, `.json`): comentarios y formato preservados
- **l** (`.jsonl`, `.ndjson`): registros orientados a líneas
- **yaml** (`.yaml`, `.yml`, `.lobster`): nodos mapa/secuencia/escalar a través de
  la API de documentos YAML

Los alojadores propios y las extensiones del editor utilizan la CLI para leer o escribir una sola hoja
sin programar directamente contra el SDK; los agentes y los enlaces lo tratan como un
sustrato determinista para que los viajes de ida y vuelta con fidelidad de bytes y la protección
del centinela de redacción se apliquen de manera uniforme entre tipos.

## Por qué activarlo

Active `oc-path` cuando desee que los scripts, enlaces o herramientas de agente locales apunten
a una pieza precisa del estado del espacio de trabajo sin tener que inventar un analizador para cada formato
de archivo. Una sola dirección `oc://` puede nombrar una clave de frontmatter de markdown, un elemento
de sección, una hoja de configuración JSONC, un campo de evento JSONL o un paso de flujo de trabajo YAML.

Esto es importante para los flujos de trabajo de los mantenedores, donde el cambio debe ser pequeño,
auditable y repetible: inspeccionar un valor, buscar registros coincidentes, hacer una prueba
de escritura y luego aplicar solo esa hoja dejando los comentarios, los finales de línea y
el formato cercano intactos. Mantener esto como un complemento opcional da a los usuarios avanzados el
sustrato de direccionamiento sin poner dependencias de analizador o superficie de CLI en
el núcleo para instalaciones que nunca lo necesitan.

Razones comunes para activarlo:

- **Automatización local**: los scripts de shell pueden resolver o actualizar un valor del espacio de trabajo
  con `openclaw path … --json` en lugar de llevar código de análisis separado para markdown, JSONC,
  JSONL y YAML.
- **Ediciones visibles para el agente**: un agente puede mostrar una diferencia de prueba para una hoja
  direccionada antes de escribir, lo cual es más fácil de revisar que una reescritura libre del archivo.
- **Integraciones del editor**: un editor puede asignar `oc://AGENTS.md/tools/gh` al
  nodo de markdown exacto y número de línea sin tener que adivinar a partir del texto del encabezado.
- **Diagnósticos**: `emit` realiza un viaje de ida y vuelta (round-trip) de un archivo a través del analizador y el emisor, por lo que
  puede verificar si un tipo de archivo es estable a nivel de bytes antes de confiar en las ediciones
  automatizadas.

Ejemplos concretos:

```bash
# Is the GitHub plugin enabled in this config?
openclaw path resolve 'oc://config.jsonc/plugins/github/enabled' --json

# Which tool-call names appear in this session log?
openclaw path find 'oc://session.jsonl/[event=tool_call]/name' --json

# What bytes would this tiny config edit write?
openclaw path set 'oc://config.jsonc/plugins/github/enabled' 'true' --dry-run
```

El complemento (plugin) intencionalmente no es el dueño de la semántica de nivel superior. Los complementos
de memoria siguen siendo dueños de las escrituras de memoria, los comandos de configuración siguen siendo dueños de la gestión
completa de la configuración, y la lógica LKG sigue siendo dueña de la restauración/promoción. `oc-path` es la capa de
operaciones de archivo de direccionamiento limitado y preservador de bytes sobre la cual esas herramientas de nivel superior
pueden construir.

## Dónde se ejecuta

El complemento se ejecuta **en proceso dentro de la CLI de `openclaw`** en el host donde usted
invoca el comando. No necesita un Gateway en ejecución y no abre ningún
socket de red; cada verbo es una transformación pura sobre un archivo al que usted le apunta.

Los metadatos del complemento viven en `extensions/oc-path/openclaw.plugin.json`:

```json
{
  "id": "oc-path",
  "name": "OC Path",
  "activation": {
    "onStartup": false,
    "onCommands": ["path"]
  },
  "commandAliases": [{ "name": "path", "kind": "cli" }]
}
```

`onStartup: false` mantiene al complemento fuera de la ruta activa (hot path) del Gateway. `onCommands:
["path"]` le indica a la CLI que cargue el complemento de forma perezosa la primera vez que ejecute
`openclaw path …`, por lo que las instalaciones que nunca usan el verbo no incurren en ningún costo.

## Habilitar

```bash
openclaw plugins enable oc-path
```

Reinicie el Gateway (si ejecuta uno) para que la instantánea del manifiesto recoja el nuevo
estado. Las invocaciones directas de `openclaw path` funcionan inmediatamente en el mismo host —
la CLI carga el complemento bajo demanda.

Deshabilitar con:

```bash
openclaw plugins disable oc-path
```

## Dependencias

Todas las dependencias del analizador son locales del complemento; habilitar `oc-path` no introduce
nuevos paquetes en el tiempo de ejecución principal (core runtime):

| Dependencia    | Propósito                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `commander`    | Cableado de subcomandos para `resolve`, `find`, `set`, `validate`, `emit`.                     |
| `jsonc-parser` | Análisis JSONC + ediciones de hoja manteniendo los comentarios y las comas finales.            |
| `markdown-it`  | Tokenización de Markdown para el modelo de sección / elemento / campo.                         |
| `yaml`         | YAML `Document` análisis / emisión / edición manteniendo los comentarios y el estilo de flujo. |

JSONL se mantiene implementado manualmente; el análisis orientado a líneas es más simple que cualquier
dependencia, y el análisis JSONC por línea ya pasa a través de `jsonc-parser`.

## Lo que proporciona

| Superficie                                      | Proporcionado por                                       |
| ----------------------------------------------- | ------------------------------------------------------- |
| CLI `openclaw path`                             | `extensions/oc-path/cli-registration.ts`                |
| analizador / formateador `oc://`                | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| Análisis / emisión / edición por tipo           | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl,yaml}`  |
| Resolución / búsqueda / configuración universal | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| Guardián de centinela de redacción              | `extensions/oc-path/src/oc-path/sentinel.ts`            |

La CLI es la única superficie pública hoy. Los verbos del sustrato son privados del
complemento; los consumidores usan la CLI (o crean su propio complemento contra el SDK).

## Relación con otros complementos

- **`memory-*`**: las escrituras en memoria pasan a través de los complementos de memoria, no `oc-path`.
  `oc-path` es un sustrato de archivo genérico; los complementos de memoria superponen sus propios
  semánticas encima.
- **LKG**: `path` no sabe sobre la restauración de configuración Last-Known-Good. Si un
  archivo es rastreado por LKG, la siguiente llamada `observe` decide si promover o
  recuperar; `set --batch` para configuración múltiple atómica a través del ciclo de vida
  de promoción/recuperación de LKG está planeado junto con el sustrato de recuperación LKG.

## Seguridad

`set` escribe bytes sin procesar a través de la ruta de emisión del sustrato, que aplica el
guardián de centinela de redacción automáticamente. Se rechaza una hoja que lleva
`__OPENCLAW_REDACTED__` (literalmente o como una subcadena) en el momento de la escritura
con `OC_EMIT_SENTINEL`. La CLI también elimina el centinela literal de cualquier
salida humana o JSON que imprime, reemplazándolo con `[REDACTED]` para que las
capturas de terminal y las tuberías nunca filtren el marcador.

## Relacionado

- [Referencia de la CLI `openclaw path`](/es/cli/path)
- [Administrar complementos](/es/plugins/manage-plugins)
- [Construir complementos](/es/plugins/building-plugins)
