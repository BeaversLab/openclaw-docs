---
summary: "Sidecar de búsqueda con prioridad local con BM25, vectores, reranking y expansión de consultas"
title: "Motor de memoria QMD"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

[QMD](https://github.com/tobi/qmd) es un sidecar de búsqueda con prioridad local que se ejecuta junto a OpenClaw. Combina BM25, búsqueda vectorial y reranking en un solo binario, y puede indexar contenido más allá de los archivos de memoria de su espacio de trabajo.

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

- OpenClaw crea colecciones a partir de los archivos de memoria de su espacio de trabajo y cualquier `memory.qmd.paths` configurado, luego ejecuta `qmd update` cuando se abre el administrador de QMD y periódicamente después (predeterminado cada 5 minutos). Estas actualizaciones se ejecutan a través de subprocesos de QMD, no un rastreo del sistema de archivos en proceso. Los modos semánticos también ejecutan `qmd embed`.
- La colección del espacio de trabajo predeterminada rastrea `MEMORY.md` más el árbol `memory/`.
  `memory.md` en minúsculas no se indexa como un archivo de memoria raíz.
- El propio escáner de QMD ignora las rutas ocultas y los directorios comunes de dependencias/construcción como `.git`, `.cache`, `node_modules`, `vendor`, `dist` y `build`. El inicio de Gateway no inicializa QMD de manera predeterminada, por lo que el arranque en frío evita importar el tiempo de ejecución de memoria o crear el observador de larga duración antes de que se use la memoria por primera vez.
- Si de todos modos desea una actualización al iniciar el gateway, configure `memory.qmd.update.startup` en `idle` o `immediate`. La actualización de inicio opcional utiliza una ruta de subproceso QMD de un solo uso en lugar de crear el observador completo de larga duración en proceso.
- Las búsquedas utilizan el `searchMode` configurado (predeterminado: `search`; también admite `vsearch` y `query`). `search` es solo BM25, por lo que OpenClaw omite las sondas de preparación de vectores semánticos y el mantenimiento de incrustaciones en ese modo. Si un modo falla, OpenClaw reintentará con `qmd query`.
- Con las versiones de QMD que anuncian filtros de múltiples colecciones, OpenClaw agrupa las colecciones de la misma fuente en una sola invocación de búsqueda QMD. Las versiones anteriores de QMD mantienen la alternativa compatible por colección.
- Si QMD falla por completo, OpenClaw recurre al motor SQLite incorporado. Los intentos repetidos de turnos de chat se retrasan brevemente después de un fallo de apertura para que un binario faltante o una dependencia sidecar rota no cree una tormenta de reintentos; `openclaw memory status` y las sondas de CLI de un solo uso todavía verifican QMD directamente.

<Info>La primera búsqueda puede ser lenta -- QMD descarga automáticamente modelos GGUF (~2 GB) para reranking y expansión de consultas en la primera ejecución `qmd query`.</Info>

## Rendimiento y compatibilidad de la búsqueda

OpenClaw mantiene la ruta de búsqueda de QMD compatible con las instalaciones
de QMD tanto actuales como antiguas.

Al iniciarse, OpenClaw comprueba el texto de ayuda de QMD instalado una vez por gestor. Si el
binario anuncia soporte para múltiples filtros de colección, OpenClaw busca todas
las colecciones de la misma fuente con un solo comando:

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

Esto evita iniciar un subproceso QMD para cada colección de memoria duradera.
Las colecciones de transcripciones de sesión permanecen en su propio grupo de origen, por lo que las búsquedas
mixtas de `memory` + `sessions` todavía aportan al diversificador de resultados entradas de ambas
fuentes.

Las compilaciones antiguas de QMD solo aceptan un filtro de colección. Cuando OpenClaw detecta una
de esas compilaciones, mantiene la ruta de compatibilidad y busca cada colección
por separado antes de fusionar y deduplicar los resultados.

Para inspeccionar manualmente el contrato instalado, ejecute:

```bash
qmd --help | grep -i collection
```

La ayuda actual de QMD indica que los filtros de colección pueden apuntar a una o más colecciones.
La ayuda antigua generalmente describe una sola colección.

## Anulaciones de modelos

Las variables de entorno del modelo QMD se pasan sin cambios desde el proceso
del gateway, por lo que puede ajustar QMD globalmente sin añadir una nueva configuración de OpenClaw:

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

Después de cambiar el modelo de incrustación (embedding), vuelva a ejecutar las incrustaciones para que el índice coincida con el
nuevo espacio vectorial.

## Indexar rutas adicionales

Apunte QMD a directorios adicionales para que se puedan buscar:

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
de la colección correcta.

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

Las transcripciones se exportan como turnos de Usuario/Ayudante saneados a una colección QMD
dedicada bajo `~/.openclaw/agents/<id>/qmd/sessions/`.

## Alcance de la búsqueda

De forma predeterminada, los resultados de búsqueda de QMD se muestran en sesiones directas y de canal
(no en grupos). Configure `memory.qmd.scope` para cambiar esto:

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

Cuando el alcance deniega una búsqueda, OpenClaw registra una advertencia con el canal derivado y el
tipo de chat para que sea más fácil depurar los resultados vacíos.

## Citas

Cuando `memory.citations` es `auto` o `on`, los fragmentos de búsqueda incluyen un
pie de página `Source: <path#line>`. Establezca `memory.citations = "off"` para omitir el pie de página
mientras se pasa la ruta internamente al agente.

## Cuándo usar

Elija QMD cuando necesite:

- Reranking para obtener resultados de mayor calidad.
- Para buscar documentación del proyecto o notas fuera del espacio de trabajo.
- Para recordar conversaciones de sesiones pasadas.
- Búsqueda completamente local sin claves de API.

Para configuraciones más simples, el [motor integrado](/es/concepts/memory-builtin) funciona bien
sin dependencias adicionales.

## Solución de problemas

**¿No se encuentra QMD?** Asegúrese de que el binario esté en la `PATH` de la puerta de enlace. Si OpenClaw
se ejecuta como servicio, cree un enlace simbólico:
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`.

Si `qmd --version` funciona en su shell pero OpenClaw aún informa
`spawn qmd ENOENT`, es probable que el proceso de la puerta de enlace tenga una `PATH` diferente a la de su
shell interactivo. Fije el binario explícitamente:

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

Use `command -v qmd` en el entorno donde QMD está instalado, luego verifique
nuevamente con `openclaw memory status --deep`.

**¿La primera búsqueda es muy lenta?** QMD descarga modelos GGUF en el primer uso. Precaliente
con `qmd query "test"` usando los mismos directorios XDG que usa OpenClaw.

**¿Muchos subprocesos de QMD durante la búsqueda?** Actualice QMD si es posible. OpenClaw usa
un proceso para búsquedas de múltiples colecciones de la misma fuente solo cuando el QMD
instalado anuncia soporte para múltiples filtros `-c`; de lo contrario, mantiene la alternativa
antigua por colección para garantizar la corrección.

**¿QMD solo BM25 aún intenta construir llama.cpp?** Establezca
`memory.qmd.searchMode = "search"`. OpenClaw trata ese modo como solo léxico,
no ejecuta sondas de estado vectorial de QMD ni mantenimiento de incrustaciones, y deja
las comprobaciones de preparación semántica a configuraciones `vsearch` o `query`.

**¿La búsqueda agota el tiempo de espera?** Aumente `memory.qmd.limits.timeoutMs` (predeterminado: 4000ms).
Establézcalo en `120000` para hardware más lento.

**¿Resultados vacíos en chats grupales?** Verifique `memory.qmd.scope` -- el predeterminado solo
permite sesiones directas y de canales.

**¿La búsqueda de memoria raíz se volvió repentinamente demasiado amplia?** Reinicie la puerta de enlace o espere a la próxima conciliación de inicio. OpenClaw recrea colecciones gestionadas obsoletas de vuelta a los patrones canónicos `MEMORY.md` y `memory/` cuando detecta un conflicto de nombres.

**¿Los repositorios temporales visibles en el espacio de trabajo causan `ENAMETOOLONG` o una indexación rota?** Actualmente, el recorrido de QMD sigue el comportamiento del escáner QMD subyacente en lugar de las reglas de enlaces simbólicos integradas de OpenClaw. Mantenga los desgloses temporales de monorepositorios en directorios ocultos como `.tmp/` o fuera de las raíces QMD indexadas hasta que QMD exponga un recorrido seguro contra ciclos o controles de exclusión explícitos.

## Configuración

Para conocer toda la superficie de configuración (`memory.qmd.*`), los modos de búsqueda, los intervalos de actualización, las reglas de alcance y todos los demás controles, consulte la [referencia de configuración de memoria](/es/reference/memory-config).

## Relacionado

- [Descripción general de la memoria](/es/concepts/memory)
- [Motor de memoria integrado](/es/concepts/memory-builtin)
- [Memoria de Honcho](/es/concepts/memory-honcho)
