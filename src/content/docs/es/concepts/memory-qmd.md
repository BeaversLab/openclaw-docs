---
title: "Motor de Memoria QMD"
summary: "Sidecar de búsqueda con prioridad local con BM25, vectores, reranking y expansión de consultas"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

# Motor de Memoria QMD

[QMD](https://github.com/tobi/qmd) es un sidecar de búsqueda con prioridad local que se ejecuta
junto a OpenClaw. Combina BM25, búsqueda vectorial y reranking en un único
binario, y puede indexar contenido más allá de los archivos de memoria de su espacio de trabajo.

## Lo que añade sobre el integrado

- **Reranking y expansión de consultas** para una mejor recuperación.
- **Indexar directorios adicionales** -- documentación del proyecto, notas del equipo, cualquier cosa en el disco.
- **Indexar transcripciones de sesión** -- recordar conversaciones anteriores.
- **Totalmente local** -- se ejecuta a través de Bun + node-llama-cpp, descarga automáticamente modelos GGUF.
- **Respaldo automático** -- si QMD no está disponible, OpenClaw vuelve al motor
  integrado sin problemas.

## Comenzando

### Requisitos previos

- Instalar QMD: `bun install -g @tobilu/qmd`
- Compilación de SQLite que permita extensiones (`brew install sqlite` en macOS).
- QMD debe estar en el `PATH` de la puerta de enlace.
- macOS y Linux funcionan de inmediato. Windows se admite mejor a través de WSL2.

### Habilitar

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw crea un hogar QMD autónomo bajo
`~/.openclaw/agents/<agentId>/qmd/` y gestiona el ciclo de vida del sidecar
automáticamente -- las colecciones, actualizaciones y ejecuciones de incrustación se manejan por usted.

## Cómo funciona el sidecar

- OpenClaw crea colecciones a partir de los archivos de memoria de su espacio de trabajo y cualquier
  `memory.qmd.paths` configurado, luego ejecuta `qmd update` + `qmd embed` al iniciar
  y periódicamente (por defecto cada 5 minutos).
- La actualización al inicio se ejecuta en segundo plano para que el inicio del chat no se bloquee.
- Las búsquedas utilizan el `searchMode` configurado (por defecto: `search`; también admite
  `vsearch` y `query`). Si un modo falla, OpenClaw reintenta con `qmd query`.
- Si QMD falla por completo, OpenClaw vuelve al motor SQLite integrado.

<Info>La primera búsqueda puede ser lenta -- QMD descarga automáticamente modelos GGUF (~2 GB) para reranking y expansión de consultas en la primera ejecución de `qmd query`.</Info>

## Indexar rutas adicionales

Apunte QMD a directorios adicionales para hacerlos buscables:

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

Los fragmentos de rutas adicionales aparecen como `qmd/<collection>/<relative-path>` en
los resultados de búsqueda. `memory_get` entiende este prefijo y lee desde la raíz
dela colección correcta.

## Indexar transcripciones de sesiones

Habilite la indexación de sesiones para recordar conversaciones anteriores:

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

Las transcripciones se exportan como turnos de Usuario/Ayudante saneados a una colección QMD
dedicada bajo `~/.openclaw/agents/<id>/qmd/sessions/`.

## Alcance de la búsqueda

De forma predeterminada, los resultados de búsqueda de QMD solo se muestran en sesiones de MD (no en grupos o
canales). Configure `memory.qmd.scope` para cambiar esto:

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

Cuando el alcance deniega una búsqueda, OpenClaw registra una advertencia con el canal derivado y
el tipo de chat para que sea más fácil depurar los resultados vacíos.

## Citas

Cuando `memory.citations` es `auto` o `on`, los fragmentos de búsqueda incluyen un
pie de página `Source: <path#line>`. Establezca `memory.citations = "off"` para omitir el pie de página
mientras sigue pasando la ruta al agente internamente.

## Cuándo usar

Elija QMD cuando necesite:

- Reranking para resultados de mayor calidad.
- Buscar documentación del proyecto o notas fuera del espacio de trabajo.
- Recordar conversaciones de sesiones pasadas.
- Búsqueda completamente local sin claves de API.

Para configuraciones más simples, el [motor integrado](/en/concepts/memory-builtin) funciona bien
sin dependencias adicionales.

## Solución de problemas

**¿No se encontró QMD?** Asegúrese de que el binario esté en la `PATH` de la puerta de enlace. Si OpenClaw
se ejecuta como servicio, cree un enlace simbólico:
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`.

**¿La primera búsqueda es muy lenta?** QMD descarga modelos GGUF en el primer uso. Precaliente
con `qmd query "test"` usando los mismos directorios XDG que usa OpenClaw.

**¿La búsqueda agota el tiempo de espera?** Aumente `memory.qmd.limits.timeoutMs` (predeterminado: 4000ms).
Establézcalo en `120000` para hardware más lento.

**¿Resultados vacíos en chats grupales?** Verifique `memory.qmd.scope` -- el valor predeterminado solo
permite sesiones de MD.

**¿Repositorios temporales visibles en el espacio de trabajo causan `ENAMETOOLONG` o indexación rota?**
El recorrido de QMD actualmente sigue el comportamiento del escáner QMD subyacente en lugar de
las reglas de enlaces simbólicos integradas de OpenClaw. Mantenga las comprobaciones temporales de monorepositorios
en directorios ocultos como `.tmp/` o fuera de las raíces QMD indexadas hasta que QMD exponga
un recorrido seguro ante ciclos o controles de exclusión explícitos.

## Configuración

Para obtener la superficie completa de configuración (`memory.qmd.*`), modos de búsqueda, intervalos de actualización,
reglas de alcance y todos los demás controles, consulte la
[Referencia de configuración de memoria](/en/reference/memory-config).
