---
summary: "memory-wiki: bóveda de conocimiento compilada con procedencia, afirmaciones, cuadros de mando y modo puente"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Wiki de memoria"
---

`memory-wiki` es un complemento incluido que convierte la memoria duradera en una
bóveda de conocimiento compilada.

No reemplaza al complemento de memoria activa. El complemento de memoria activa aún
se encarga del recuerdo, la promoción, la indexación y la generación de sueños. `memory-wiki` se ubica junto a él
y compila el conocimiento duradero en un wiki navegable con páginas deterministas,
reclamaciones estructuradas, procedencia, paneles y resúmenes legibles por máquina.

Úselo cuando desee que la memoria se comporte más como una capa de conocimiento mantenida y
menos como una pila de archivos Markdown.

## Lo que añade

- Una bóveda wiki dedicada con un diseño de página determinista
- Metadatos estructurados de reclamos y evidencias, no solo prosa
- Procedencia a nivel de página, confianza, contradicciones y preguntas abiertas
- Resúmenes compilados para consumidores de agentes/tiempo de ejecución
- Herramientas de búsqueda/obtención/aplicación/revisión nativas del wiki
- Modo puente opcional que importa artefactos públicos del complemento de memoria activa
- Modo de renderizado opcional compatible con Obsidian e integración con CLI

## Cómo se integra con la memoria

Piense en la división de la siguiente manera:

| Capa                                                             | Es propietario de                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Complemento de memoria activa (`memory-core`, QMD, Honcho, etc.) | Recuerdo, búsqueda semántica, promoción, generación de sueños, tiempo de ejecución de memoria                       |
| `memory-wiki`                                                    | Páginas wiki compiladas, síntesis ricas en procedencia, paneles, búsqueda/obtención/aplicación específicas del wiki |

Si el complemento de memoria activa expone artefactos de recuerdo compartidos, OpenClaw puede buscar
ambas capas en una sola pasada con `memory_search corpus=all`.

Cuando necesite clasificación específica del wiki, procedencia o acceso directo a páginas, utilice
las herramientas nativas del wiki en su lugar.

## Patrón híbrido recomendado

Un valor predeterminado sólido para configuraciones con prioridad local es:

- QMD como backend de memoria activa para el recuerdo y la búsqueda semántica amplia
- `memory-wiki` en modo `bridge` para páginas de conocimiento sintetizado duradero

Esa división funciona bien porque cada capa mantiene su enfoque:

- QMD mantiene las notas sin procesar, las exportaciones de sesión y las colecciones adicionales buscables
- `memory-wiki` compila entidades estables, reclamos, paneles y páginas de origen

Regla práctica:

- use `memory_search` cuando desee una pasada de recuerdo amplia a través de la memoria
- use `wiki_search` y `wiki_get` cuando desees resultados de wiki con conocimiento de procedencia
- use `memory_search corpus=all` cuando desees que la búsqueda compartida abarque ambas capas

Si el modo puente informa de cero artefactos exportados, el plugin de memoria activa aún no está exponiendo entradas de puente públicas. Ejecute primero `openclaw wiki doctor` y luego confirme que el plugin de memoria activa admite artefactos públicos.

## Modos de bóveda

`memory-wiki` admite tres modos de bóveda:

### `isolated`

Bóveda propia, fuentes propias, sin dependencia de `memory-core`.

Use esto cuando desee que la wiki sea su propio almacén de conocimiento curado.

### `bridge`

Lee artefactos de memoria públicos y eventos de memoria del plugin de memoria activa a través de costuras públicas del SDK de plugins.

Use esto cuando desee que la wiki compile y organice los artefactos exportados del plugin de memoria sin acceder a los internos privados del plugin.

El modo puente puede indexar:

- artefactos de memoria exportados
- informes de sueños
- notas diarias
- archivos raíz de memoria
- registros de eventos de memoria

### `unsafe-local`

Escapatoria explícita de la misma máquina para rutas privadas locales.

Este modo es intencionalmente experimental y no portátil. Úselo solo cuando comprenda el límite de confianza y necesite específicamente acceso al sistema de archivos local que el modo puente no puede proporcionar.

## Diseño de la bóveda

El plugin inicializa una bóveda así:

```text
<vault>/
  AGENTS.md
  WIKI.md
  index.md
  inbox.md
  entities/
  concepts/
  syntheses/
  sources/
  reports/
  _attachments/
  _views/
  .openclaw-wiki/
```

El contenido administrado se mantiene dentro de los bloques generados. Los bloques de notas humanas se conservan.

Los grupos principales de páginas son:

- `sources/` para material crudo importado y páginas respaldadas por puente
- `entities/` para cosas duraderas, personas, sistemas, proyectos y objetos
- `concepts/` para ideas, abstracciones, patrones y políticas
- `syntheses/` para resúmenes compilados y agregados mantenidos
- `reports/` para tableros generados

## Reclamaciones estructuradas y evidencia

Las páginas pueden llevar frontmatter estructurado `claims`, no solo texto libre.

Cada reclamo puede incluir:

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

Las entradas de evidencia pueden incluir:

- `sourceId`
- `path`
- `lines`
- `weight`
- `note`
- `updatedAt`

Esto es lo que hace que la wiki actúe más como una capa de creencias que como un vertedero
de notas pasivo. Las afirmaciones se pueden rastrear, puntuar, impugnar y resolver de nuevo a las fuentes.

## Canal de compilación

El paso de compilación lee las páginas de la wiki, normaliza los resúmenes y emite artefactos
estables orientados a la máquina en:

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Estos resúmenes existen para que los agentes y el código en tiempo de ejecución no tengan que extraer
páginas Markdown.

La salida compilada también potencia:

- indexación de wiki de primer paso para flujos de búsqueda/obtención
- búsqueda de ID de reclamación de vuelta a las páginas propietarias
- suplementos de prompt compactos
- generación de informes/tableros

## Tableros e informes de estado

Cuando `render.createDashboards` está habilitado, la compilación mantiene tableros en
`reports/`.

Los informes integrados incluyen:

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

Estos informes rastrean cosas como:

- clústeres de notas de contradicción
- clústeres de reclamaciones competitivas
- reclamaciones que carecen de evidencia estructurada
- páginas y reclamaciones de baja confianza
- frescura obsoleta o desconocida
- páginas con preguntas sin resolver

## Búsqueda y recuperación

`memory-wiki` admite dos motores de búsqueda:

- `shared`: usa el flujo de búsqueda de memoria compartida cuando está disponible
- `local`: busca en la wiki localmente

También admite tres corpus:

- `wiki`
- `memory`
- `all`

Comportamiento importante:

- `wiki_search` y `wiki_get` usan resúmenes compilados como primera pasada cuando es posible
- los IDs de reclamación pueden resolver de vuelta a la página propietaria
- las reclamaciones impugnadas/obsoletas/frescas influyen en la clasificación
- las etiquetas de procedencia pueden sobrevivir en los resultados

Regla práctica:

- usa `memory_search corpus=all` para un pase de recuperación amplio
- use `wiki_search` + `wiki_get` cuando le importe la clasificación específica de la wiki,
  la procedencia o la estructura de creencias a nivel de página

## Herramientas del agente

El complemento registra estas herramientas:

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

Lo que hacen:

- `wiki_status`: modo de bóveda actual, estado, disponibilidad de la CLI de Obsidian
- `wiki_search`: buscar páginas wiki y, cuando esté configurado, corpus de memoria compartida
- `wiki_get`: leer una página wiki por id/ruta o recurrir al corpus de memoria compartida
- `wiki_apply`: mutaciones de síntesis/metadatos estrechas sin cirugía de página de forma libre
- `wiki_lint`: comprobaciones estructurales, lagunas de procedencia, contradicciones, preguntas abiertas

El complemento también registra un suplemento de corpus de memoria no exclusivo, por lo que el `memory_search` compartido
y el `memory_get` pueden llegar a la wiki cuando el complemento de memoria activa
admite la selección de corpus.

## Comportamiento del mensaje y el contexto

Cuando `context.includeCompiledDigestPrompt` está habilitado, las secciones de mensaje de memoria
añaden una instantánea compilada compacta de `agent-digest.json`.

Esa instantánea es intencionalmente pequeña y de alta señal:

- solo las páginas principales
- solo las afirmaciones principales
- recuento de contradicciones
- recuento de preguntas
- calificadores de confianza/novedad

Esto es opcional porque cambia la forma del mensaje y es principalmente útil para motores
de contexto o ensamblaje de mensajes heredados que consumen explícitamente suplementos de memoria.

## Configuración

Ponga la configuración bajo `plugins.entries.memory-wiki.config`:

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "isolated",
          vault: {
            path: "~/.openclaw/wiki/main",
            renderMode: "obsidian",
          },
          obsidian: {
            enabled: true,
            useOfficialCli: true,
            vaultName: "OpenClaw Wiki",
            openAfterWrites: false,
          },
          bridge: {
            enabled: false,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          ingest: {
            autoCompile: true,
            maxConcurrentJobs: 1,
            allowUrlIngest: true,
          },
          search: {
            backend: "shared",
            corpus: "wiki",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
          render: {
            preserveHumanBlocks: true,
            createBacklinks: true,
            createDashboards: true,
          },
        },
      },
    },
  },
}
```

Interruptores clave:

- `vaultMode`: `isolated`, `bridge`, `unsafe-local`
- `vault.renderMode`: `native` o `obsidian`
- `bridge.readMemoryArtifacts`: importar artefactos públicos del complemento de memoria activa
- `bridge.followMemoryEvents`: incluir registros de eventos en modo puente
- `search.backend`: `shared` o `local`
- `search.corpus`: `wiki`, `memory`, o `all`
- `context.includeCompiledDigestPrompt`: añadir instantánea compacta del resumen a las secciones del prompt de memoria
- `render.createBacklinks`: generar bloques relacionados deterministas
- `render.createDashboards`: generar páginas de tablero

### Ejemplo: QMD + modo puente

Úselo cuando desee QMD para la recuperación y `memory-wiki` para una capa de
conocimiento mantenida:

```json5
{
  memory: {
    backend: "qmd",
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          search: {
            backend: "shared",
            corpus: "all",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
        },
      },
    },
  },
}
```

Esto mantiene:

- QMD a cargo de la recuperación de la memoria activa
- `memory-wiki` centrado en páginas compiladas y tableros
- la forma del prompt sin cambios hasta que habilite intencionalmente los prompts de resumen compilados

## CLI

`memory-wiki` también expone una superficie de CLI de nivel superior:

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki get entity.alpha
openclaw wiki apply synthesis "Alpha Summary" --body "..." --source-id source.alpha
openclaw wiki bridge import
openclaw wiki obsidian status
```

Consulte [CLI: wiki](/es/cli/wiki) para la referencia completa de comandos.

## Soporte de Obsidian

Cuando `vault.renderMode` es `obsidian`, el complemento escribe Markdown
compatible con Obsidian y opcionalmente puede usar la CLI oficial de `obsidian`.

Los flujos de trabajo compatibles incluyen:

- sondeo de estado
- búsqueda en la bóveda
- abrir una página
- invocar un comando de Obsidian
- saltar a la nota diaria

Esto es opcional. El wiki aún funciona en modo nativo sin Obsidian.

## Flujo de trabajo recomendado

1. Mantenga su complemento de memoria activa para recuperación/promoción/soñación (dreaming).
2. Habilite `memory-wiki`.
3. Comience con el modo `isolated` a menos que explícitamente desee el modo puente.
4. Use `wiki_search` / `wiki_get` cuando la procedencia importe.
5. Use `wiki_apply` para síntesis estrechas o actualizaciones de metadatos.
6. Ejecute `wiki_lint` después de cambios significativos.
7. Active los tableros si desea visibilidad de datos obsoletos/contradicciones.

## Documentos relacionados

- [Resumen de memoria](/es/concepts/memory)
- [CLI: memory](/es/cli/memory)
- [CLI: wiki](/es/cli/wiki)
- [Resumen del SDK de complementos](/es/plugins/sdk-overview)
