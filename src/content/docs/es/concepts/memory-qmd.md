---
summary: "Sidecar de búsqueda con prioridad local con BM25, vectores, reranking y expansión de consultas"
title: "Motor de memoria QMD"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

[QMD](https://github.com/tobi/qmd) es un sidecar de búsqueda con prioridad local que se ejecuta
junto a OpenClaw. Combina BM25, búsqueda vectorial y reranking en un solo
binario, y puede indexar contenido más allá de los archivos de memoria de su espacio de trabajo.

## Lo que añade sobre el integrado

- **Reranking y expansión de consultas** para una mejor recuperación.
- **Indexar directorios adicionales** -- documentación del proyecto, notas del equipo, cualquier cosa en el disco.
- **Indexar transcripciones de sesión** -- recuerde conversaciones anteriores.
- **Totalmente local** -- se ejecuta con el paquete de tiempo de ejecución opcional node-llama-cpp y
  descarga automáticamente modelos GGUF.
- **Respaldo automático** -- si QMD no está disponible, OpenClaw recurre al
  motor integrado sin problemas.

## Para empezar

### Requisitos previos

- Instale QMD: `npm install -g @tobilu/qmd` o `bun install -g @tobilu/qmd`
- Compilación de SQLite que permite extensiones (`brew install sqlite` en macOS).
- QMD debe estar en el `PATH` de la puerta de enlace.
- macOS y Linux funcionan de fábrica. Windows es mejor compatible a través de WSL2.

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
automáticamente -- las colecciones, actualizaciones y ejecuciones de incrustaciones se manejan por usted.
Prefiere las formas actuales de colección QMD y consulta MCP, pero aún recurre a
indicadores de patrón de colección alternativos y nombres de herramientas MCP más antiguos cuando es necesario.
La conciliación en el momento del arranque también recrea colecciones administradas obsoletas de vuelta a sus
patrones canónicos cuando aún está presente una colección QMD anterior con el mismo nombre.

## Cómo funciona el sidecar

- OpenClaw crea colecciones a partir de los archivos de memoria de su espacio de trabajo y cualquier
  `memory.qmd.paths` configurado, luego ejecuta `qmd update` al arrancar y
  periódicamente (por defecto cada 5 minutos). Los modos semánticos también ejecutan `qmd embed`.
- La colección del espacio de trabajo predeterminada rastrea `MEMORY.md` más el árbol `memory/`.
  `memory.md` en minúsculas no se indexa como un archivo de memoria raíz.
- La actualización al inicio se ejecuta en segundo plano para que el inicio del chat no se bloquee.
- Las búsquedas utilizan el `searchMode` configurado (predeterminado: `search`; también admite `vsearch` y `query`). `search` es solo BM25, por lo que OpenClaw omite las sondas de preparación de vectores semánticos y el mantenimiento de incrustaciones en ese modo. Si un modo falla, OpenClaw reintentará con `qmd query`.
- Con las versiones de QMD que anuncian filtros de múltiples colecciones, OpenClaw agrupa las colecciones de la misma fuente en una sola invocación de búsqueda de QMD. Las versiones antiguas de QMD mantienen la alternativa compatible por colección.
- Si QMD falla por completo, OpenClaw recurre al motor SQLite integrado.

<Info>La primera búsqueda puede ser lenta; QMD descarga automáticamente modelos GGUF (~2 GB) para la reordenación y la expansión de consultas en la primera ejecución de `qmd query`.</Info>

## Rendimiento y compatibilidad de la búsqueda

OpenClaw mantiene la ruta de búsqueda de QMD compatible con instalaciones de QMD actuales y antiguas.

Al iniciarse, OpenClaw verifica el texto de ayuda de QMD instalado una vez por administrador. Si el binario anuncia soporte para múltiples filtros de colección, OpenClaw busca todas las colecciones de la misma fuente con un solo comando:

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

Esto evita iniciar un subproceso de QMD para cada colección de memoria duradera. Las colecciones de transcripciones de sesión se mantienen en su propio grupo de origen, por lo que las búsquedas mixtas de `memory` + `sessions` aún proporcionan al diversificador de resultados entradas de ambas fuentes.

Las compilaciones antiguas de QMD solo aceptan un filtro de colección. Cuando OpenClaw detecta una de esas compilaciones, mantiene la ruta de compatibilidad y busca cada colección por separado antes de fusionar y deduplicar los resultados.

Para inspeccionar manualmente el contrato instalado, ejecute:

```bash
qmd --help | grep -i collection
```

La ayuda actual de QMD indica que los filtros de colección pueden apuntar a una o más colecciones. La ayuda antigua generalmente describe una sola colección.

## Anulación de modelos

Las variables de entorno del modelo QMD se pasan sin cambios desde el proceso de la puerta de enlace, por lo que puede ajustar QMD globalmente sin agregar una nueva configuración de OpenClaw:

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

Después de cambiar el modelo de incrustación, vuelva a ejecutar las incrustaciones para que el índice coincida con el nuevo espacio vectorial.

## Indexación de rutas adicionales

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

Los fragmentos de rutas adicionales aparecen como `qmd/<collection>/<relative-path>` en los resultados de búsqueda. `memory_get` entiende este prefijo y lee desde la raíz de la colección correcta.

## Indexar transcripciones de sesión

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

Las transcripciones se exportan como turnos de Usuario/Ayudante saneados a una
colección QMD dedicada bajo `~/.openclaw/agents/<id>/qmd/sessions/`.

## Ámbito de búsqueda

De forma predeterminada, los resultados de búsqueda de QMD se muestran en sesiones
directas y de canal (no en grupos). Configure `memory.qmd.scope` para cambiar esto:

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

Cuando el ámbito deniega una búsqueda, OpenClaw registra una advertencia con el canal
derivado y el tipo de chat para que sea más fácil depurar los resultados vacíos.

## Citas

Cuando `memory.citations` es `auto` o `on`, los fragmentos de búsqueda incluyen
un pie de página `Source: <path#line>`. Establezca `memory.citations = "off"` para omitir el pie de página
mientras sigue pasando la ruta al agente internamente.

## Cuándo usar

Elija QMD cuando necesite:

- Reranking para resultados de mayor calidad.
- Para buscar documentos o notas del proyecto fuera del espacio de trabajo.
- Para recordar conversaciones de sesiones pasadas.
- Búsqueda completamente local sin claves de API.

Para configuraciones más simples, el [motor integrado](/es/concepts/memory-builtin) funciona bien
sin dependencias adicionales.

## Solución de problemas

**¿No se encuentra QMD?** Asegúrese de que el binario esté en la `PATH` de la puerta de enlace. Si OpenClaw
se ejecuta como servicio, cree un enlace simbólico:
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`.

Si `qmd --version` funciona en su shell pero OpenClaw aún reporta
`spawn qmd ENOENT`, es probable que el proceso de la puerta de enlace tenga una `PATH` diferente a la de
su shell interactivo. Fije el binario explícitamente:

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      command: "/absolute/path/to/qmd",
    },
  },
}
```

Use `command -v qmd` en el entorno donde QMD está instalado, luego verifique de nuevo
con `openclaw memory status --deep`.

**¿La primera búsqueda muy lenta?** QMD descarga modelos GGUF en el primer uso. Precaliente
con `qmd query "test"` usando los mismos directorios XDG que usa OpenClaw.

**¿Muchos subprocesos de QMD durante la búsqueda?** Actualice QMD si es posible. OpenClaw usa
un proceso para búsquedas de múltiples colecciones de la misma fuente solo cuando el QMD
instalado anuncia soporte para múltiples filtros `-c`; de lo contrario, mantiene la alternativa
antigua por colección para asegurar la corrección.

**¿QMD solo con BM25 sigue intentando compilar llama.cpp?** Establezca
`memory.qmd.searchMode = "search"`. OpenClaw trata ese modo como solo léxico,
no ejecuta sondas de estado vectorial de QMD ni mantenimiento de incrustaciones, y deja
las comprobaciones de preparación semántica a configuraciones de `vsearch` o `query`.

**¿La búsqueda agota el tiempo de espera?** Aumente `memory.qmd.limits.timeoutMs` (predeterminado: 4000ms).
Establézcalo en `120000` para hardware más lento.

**¿Resultados vacíos en chats de grupo?** Compruebe `memory.qmd.scope` -- el valor predeterminado solo
permite sesiones directas y de canal.

**¿La búsqueda de memoria raíz de repente se volvió demasiado amplia?** Reinicie la puerta de enlace o espere a
la siguiente conciliación de inicio. OpenClaw recrea colecciones administradas obsoletas
volviendo a patrones canónicos de `MEMORY.md` y `memory/` cuando detecta un conflicto de
mismo nombre.

**¿Los repositorios temporales visibles en el espacio de trabajo están causando `ENAMETOOLONG` o indexación rota?**
El recorrido de QMD actualmente sigue el comportamiento del escáner QMD subyacente en lugar de
las reglas de enlace simbólico integradas de OpenClaw. Mantenga las confirmaciones temporales de monorepositorios
en directorios ocultos como `.tmp/` o fuera de las raíces QMD indexadas hasta que QMD exponga
un recorrido seguro contra ciclos o controles de exclusión explícitos.

## Configuración

Para obtener la superficie completa de configuración (`memory.qmd.*`), modos de búsqueda, intervalos de actualización,
reglas de alcance y todos los demás controles, consulte la
[Referencia de configuración de memoria](/es/reference/memory-config).

## Relacionado

- [Descripción general de la memoria](/es/concepts/memory)
- [Motor de memoria integrado](/es/concepts/memory-builtin)
- [Memoria de Honcho](/es/concepts/memory-honcho)
