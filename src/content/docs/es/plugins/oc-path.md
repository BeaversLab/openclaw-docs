---
summary: "Complemento `oc-path` incluido: proporciona la CLI `openclaw path` para el esquema de direccionamiento de archivos de espacio de trabajo `oc://`"
read_when:
  - You want to inspect or edit a single leaf inside a workspace file from the terminal
  - You are scripting against workspace state and need a stable, kind-agnostic addressing scheme
  - You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway
title: "Complemento OC Path"
---

El complemento incluido `oc-path` añade la CLI [`openclaw path`](/es/cli/path) para el
esquema de direccionamiento de archivos de espacio de trabajo `oc://`. Se incluye en el repositorio OpenClaw bajo
`extensions/oc-path/` pero es opcional: la instalación/compilación lo deja inactivo hasta que
lo active.

Las direcciones `oc://` apuntan a una sola hoja (o un conjunto comodín de hojas) dentro
de un archivo de espacio de trabajo. El complemento entiende tres tipos de archivos hoy:

- **markdown** (`.md`, `.mdx`): frontmatter, secciones, elementos, campos
- **c** (`.jsonc`, `.json5`, `.json`): comentarios y formato preservados
- **l** (`.jsonl`, `.ndjson`): registros orientados a líneas

Los autoalojados y las extensiones del editor utilizan la CLI para leer o escribir una sola hoja
sin programar directamente contra el SDK; los agentes y los ganchos lo tratan como un
sustrato determinista para que los viajes de ida y vuelta con fidelidad de bytes y la protección
del centinela de redacción se apliquen de manera uniforme entre tipos.

## Por qué activarlo

Active `oc-path` cuando desee que scripts, ganchos o herramientas de agentes locales apunten
a una pieza precisa del estado del espacio de trabajo sin inventar un analizador para cada forma
de archivo. Una sola dirección `oc://` puede nombrar una clave de frontmatter markdown, un elemento
de sección, una hoja de configuración JSONC o un campo de evento JSONL.

Esto es importante para los flujos de trabajo de los mantenedores donde el cambio debe ser pequeño,
auditable y repetible: inspeccionar un valor, buscar registros coincidentes, hacer una prueba de
escritura y luego aplicar solo esa hoja dejando los comentarios, finales de línea y
el formato cercano intactos. Mantener esto como un complemento opcional da a los usuarios avanzados el
sustrato de direccionamiento sin poner dependencias de analizador o superficie de CLI en
el núcleo para instalaciones que nunca lo necesitan.

Razones comunes para activarlo:

- **Automatización local**: los scripts de shell pueden resolver o actualizar un valor del espacio de trabajo
  con `openclaw path … --json` en lugar de llevar código de análisis separado para markdown, JSONC,
  y JSONL.
- **Ediciones visibles para el agente**: un agente puede mostrar una diferencia de prueba (dry-run) para una hoja direccionada
  antes de escribir, lo cual es más fácil de revisar que una reescritura de archivo libre.
- **Integraciones con editores**: un editor puede asignar `oc://AGENTS.md/tools/gh` al
  nodo de markdown y número de línea exactos sin adivinar a partir del texto del encabezado.
- **Diagnósticos**: `emit` hace un viaje de ida y vuelta (round-trip) de un archivo a través del analizador y el emisor, por lo que
  puede verificar si un tipo de archivo es estable a nivel de byte antes de confiar en ediciones
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

El complemento intencionalmente no es el propietario de la semántica de nivel superior. Los complementos de memoria
siguen siendo propietarios de las escrituras de memoria, los comandos de configuración siguen siendo propietarios de la gestión completa de
configuración, y la lógica LKG sigue siendo propietaria de la restauración/promoción. `oc-path` es la capa estrecha de
direccionamiento y operación de archivo que preserva bytes sobre la cual esas herramientas de nivel superior
pueden construir.

## Dónde se ejecuta

El complemento se ejecuta **en proceso dentro de la CLI de `openclaw`** en el host donde usted
invoca el comando. No necesita un Gateway en ejecución y no abre ningún
socket de red — cada verbo es una transformación pura sobre un archivo al que usted lo señala.

Los metadatos del complemento residen en `extensions/oc-path/openclaw.plugin.json`:

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

`onStartup: false` mantiene el complemento fuera de la ruta crítica (hot path) del Gateway. `onCommands:
["path"]` le indica a la CLI que cargue el complemento de manera perezosa la primera vez que ejecute
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

Todas las dependencias del analizador son locales del complemento — habilitar `oc-path` no extrae
nuevos paquetes al tiempo de ejecución central:

| Dependencia    | Propósito                                                                        |
| -------------- | -------------------------------------------------------------------------------- |
| `commander`    | Cableado de subcomandos para `resolve`, `find`, `set`, `validate`, `emit`.       |
| `jsonc-parser` | Análisis JSONC + ediciones de hojas con comentarios y comas finales conservadas. |
| `markdown-it`  | Tokenización Markdown para el modelo de sección / elemento / campo.              |

JSONL se mantiene hecho a mano — el análisis orientado a líneas es más simple que cualquier
dependencia, y el análisis JSONC por línea ya pasa a través de `jsonc-parser`.

## Lo que proporciona

| Superficie                                        | Proporcionado por                                       |
| ------------------------------------------------- | ------------------------------------------------------- |
| CLI `openclaw path`                               | `extensions/oc-path/cli-registration.ts`                |
| Analizador / formateador `oc://`                  | `extensions/oc-path/src/oc-path/oc-path.ts`             |
| Análisis / emisión / edición por tipo             | `extensions/oc-path/src/oc-path/{md,jsonc,jsonl}`       |
| Resolución / búsqueda / establecimiento universal | `extensions/oc-path/src/oc-path/{resolve,find,edit}.ts` |
| Guardián de centinela de redacción                | `extensions/oc-path/src/oc-path/sentinel.ts`            |

La CLI es la única superficie pública hoy en día. Los verbos del sustrato son privados del
complemento; los consumidores usan la CLI (o construyen su propio complemento con el SDK).

## Relación con otros complementos

- **`memory-*`**: las escrituras en memoria pasan a través de los complementos de memoria, no de `oc-path`.
  `oc-path` es un sustrato de archivo genérico; los complementos de memoria superponen sus propias
  semánticas encima.
- **LKG**: `path` no sabe nada sobre la restauración de la configuración Last-Known-Good (Última Buena Conocida). Si un
  archivo tiene seguimiento LKG, la siguiente llamada `observe` decide si promover o
  recuperar; `set --batch` para múltiples conjuntos atómicos a través del ciclo de vida
  de promoción/recuperación de LKG está planificado junto con el sustrato de recuperación LKG.

## Seguridad

`set` escribe bytes sin procesar a través de la ruta de emisión del sustrato, que aplica el
guardián de centinela de redacción automáticamente. Una hoja que contenga
`__OPENCLAW_REDACTED__` (literalmente o como una subcadena) se rechaza en el momento de escritura
con `OC_EMIT_SENTINEL`. La CLI también elimina el centinela literal de cualquier
salida humana o JSON que imprime, reemplazándolo con `[REDACTED]` para que las
capturas de terminal y las tuberías nunca filtren el marcador.

## Relacionado

- [Referencia de la CLI `openclaw path`](/es/cli/path)
- [Administrar complementos](/es/plugins/manage-plugins)
- [Construir complementos](/es/plugins/building-plugins)
