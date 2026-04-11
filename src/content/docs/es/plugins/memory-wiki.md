---
summary: "memory-wiki: bóveda de conocimiento compilada con procedencia, afirmaciones, paneles y modo puente"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Wiki de Memoria"
---

# Wiki de Memoria

`memory-wiki` es un complemento incluido que convierte la memoria duradera en una bóveda de conocimiento compilada.

**No** reemplaza al complemento de memoria activa. El complemento de memoria activa aún se encarga del recuerdo, la promoción, la indexación y el ensoñación. `memory-wiki` se sitúa junto a él y compila el conocimiento duradero en un wiki navegable con páginas deterministas, afirmaciones estructuradas, procedencia, paneles y resúmenes legibles por máquina.

Úselo cuando desee que la memoria se comporte más como una capa de conocimiento mantenida y menos como una pila de archivos Markdown.

## Lo que añade

- Una bóveda wiki dedicada con un diseño de página determinista
- Metadatos estructurados de afirmaciones y evidencias, no solo prosa
- Procedencia, confianza, contradicciones y preguntas abiertas a nivel de página
- Resúmenes compilados para consumidores de agentes/tiempo de ejecución
- Herramientas de búsqueda/obtención/aplicación/verificación nativas del wiki
- Modo puente opcional que importa artefactos públicos del complemento de memoria activa
- Modo de representación compatible con Obsidian opcional e integración con CLI

## Cómo se ajusta a la memoria

Piense en la división de esta manera:

| Capa                                                             | Propietario                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Complemento de memoria activa (`memory-core`, QMD, Honcho, etc.) | Recuerdo, búsqueda semántica, promoción, ensoñación, tiempo de ejecución de memoria                                 |
| `memory-wiki`                                                    | Páginas wiki compiladas, síntesis ricas en procedencia, paneles, búsqueda/obtención/aplicación específicas del wiki |

Si el complemento de memoria activa expone artefactos de recuerdo compartidos, OpenClaw puede buscar en ambas capas en una sola pasada con `memory_search corpus=all`.

Cuando necesite una clasificación específica del wiki, procedencia o acceso directo a la página, utilice las herramientas nativas del wiki en su lugar.

## Modos de bóveda

`memory-wiki` admite tres modos de bóveda:

### `isolated`

Propia bóveda, propias fuentes, sin dependencia de `memory-core`.

Úselo cuando desee que el wiki sea su propio almacén de conocimiento curado.

### `bridge`

Lee artefactos de memoria públicos y eventos de memoria del complemento de memoria activa a través de costuras públicas del SDK del complemento.

Use esto cuando desee que el wiki compile y organice los artefactos exportados
por el plugin de memoria sin acceder a los internos privados del plugin.

El modo puente puede indexar:

- artefactos de memoria exportados
- informes de sueño (dream reports)
- notas diarias
- archivos raíz de memoria
- registros de eventos de memoria

### `unsafe-local`

Mecanismo de escape explícito en la misma máquina para rutas privadas locales.

Este modo es intencionalmente experimental y no portátil. Úselo solo cuando
entienda el límite de confianza (trust boundary) y necesite específicamente acceso
al sistema de archivos local que el modo puente no puede proporcionar.

## Diseño de la bóveda (Vault layout)

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

El contenido administrado permanece dentro de bloques generados. Los bloques de notas humanas se conservan.

Los grupos principales de páginas son:

- `sources/` para material prima importada y páginas respaldadas por puente (bridge-backed)
- `entities/` para cosas duraderas, personas, sistemas, proyectos y objetos
- `concepts/` para ideas, abstracciones, patrones y políticas
- `syntheses/` para resúmenes compilados y agregados mantenidos
- `reports/` para cuadros de mando generados

## Reclamaciones estructuradas y evidencia

Las páginas pueden llevar frontmatter `claims` estructurado, no solo texto libre.

Cada reclamación puede incluir:

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

Esto es lo que hace que el wiki actúe más como una capa de creencias que como un
volcado de notas pasivo. Las reclamaciones pueden rastrearse, puntuarse, impugnarse y
resolverse hasta las fuentes.

## Canalización de compilación (Compile pipeline)

El paso de compilación lee las páginas del wiki, normaliza los resúmenes y emite
artefactos estables orientados a la máquina bajo:

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Estos resúmenes (digests) existen para que los agentes y el código en tiempo de
ejecución no tengan que extraer (scrapear) páginas Markdown.

La salida compilada también potencia:

- indexación de primera pasada del wiki para flujos de búsqueda/obtención
- búsqueda de ID de reclamación hacia las páginas propietarias
- suplementos de prompt compactos
- generación de informes/tableros

## Tableros e informes de estado

Cuando `render.createDashboards` está habilitado, la compilación mantiene tableros bajo
`reports/`.

Los informes integrados incluyen:

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

Estos informes rastrean cosas como:

- clústeres de notas de contradicción
- clústeres de reclitos competidores
- reclitos sin evidencia estructurada
- páginas y reclitos de baja confianza
- obsoleto o frescura desconocida
- páginas con preguntas sin resolver

## Búsqueda y recuperación

`memory-wiki` admite dos motores de búsqueda:

- `shared`: utilizar el flujo de búsqueda de memoria compartida cuando esté disponible
- `local`: buscar en el wiki localmente

También admite tres corpus:

- `wiki`
- `memory`
- `all`

Comportamiento importante:

- `wiki_search` y `wiki_get` utilizan resúmenes compilados como primera pasada cuando es posible
- los ids de reclitos pueden resolverse de nuevo a la página propietaria
- los reclitos disputados/obsoletos/frescos influyen en la clasificación
- las etiquetas de procedencia pueden sobrevivir en los resultados

Regla práctica:

- use `memory_search corpus=all` para un pase de recuperación amplio
- use `wiki_search` + `wiki_get` cuando le importe la clasificación específica del wiki,
  procedencia o estructura de creencias a nivel de página

## Herramientas del agente

El complemento registra estas herramientas:

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

Lo que hacen:

- `wiki_status`: modo de bóveda actual, estado, disponibilidad de CLI de Obsidian
- `wiki_search`: buscar páginas wiki y, cuando está configurado, corpus de memoria compartida
- `wiki_get`: leer una página wiki por id/ruta o recurrir al corpus de memoria compartida
- `wiki_apply`: mutaciones de síntesis/metadatos estrechas sin cirugía de página de forma libre
- `wiki_lint`: comprobaciones estructurales, lagunas de procedencia, contradicciones, preguntas abiertas

El complemento también registra un suplemento de corpus de memoria no exclusivo, de modo que `memory_search` y `memory_get` compartidos pueden acceder al wiki cuando el complemento de memoria activa admite la selección de corpus.

## Comportamiento del prompt y del contexto

Cuando `context.includeCompiledDigestPrompt` está habilitado, las secciones de memoria del prompt añaden una instantánea compilada compacta de `agent-digest.json`.

Esa instantánea es intencionalmente pequeña y de alta señal:

- solo las páginas principales
- solo las afirmaciones principales
- recuento de contradicciones
- recuento de preguntas
- calificadores de confianza/actualidad

Esto es opcional porque cambia la forma del prompt y es principalmente útil para motores de contexto o ensamblajes de prompts heredados que consumen explícitamente suplementos de memoria.

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
- `bridge.followMemoryEvents`: incluir registros de eventos en el modo puente
- `search.backend`: `shared` o `local`
- `search.corpus`: `wiki`, `memory` o `all`
- `context.includeCompiledDigestPrompt`: añadir una instantánea compacta del resumen a las secciones de memoria del prompt
- `render.createBacklinks`: generar bloques relacionados deterministas
- `render.createDashboards`: generar páginas de panel de control

## CLI

`memory-wiki` también expone una superficie CLI de nivel superior:

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

Consulte [CLI: wiki](/en/cli/wiki) para obtener la referencia completa de comandos.

## Soporte de Obsidian

Cuando `vault.renderMode` es `obsidian`, el complemento escribe Markdown compatible con Obsidian y opcionalmente puede usar la CLI oficial `obsidian`.

Los flujos de trabajo compatibles incluyen:

- sondeo de estado
- búsqueda en la bóveda
- abrir una página
- invocar un comando de Obsidian
- saltar a la nota diaria

Esto es opcional. El wiki todavía funciona en modo nativo sin Obsidian.

## Flujo de trabajo recomendado

1. Mantén tu plugin de memoria activa para recuperación/promociño/soñar.
2. Activa `memory-wiki`.
3. Comienza con el modo `isolated` a menos que explícitamente desees el modo puente.
4. Usa `wiki_search` / `wiki_get` cuando la procedencia importe.
5. Usa `wiki_apply` para síntesis estrechas o actualizaciones de metadatos.
6. Ejecuta `wiki_lint` después de cambios significativos.
7. Activa los tableros si quieres visibilidad de obsolescencia/contradicciones.

## Documentos relacionados

- [Resumen de memoria](/en/concepts/memory)
- [CLI: memory](/en/cli/memory)
- [CLI: wiki](/en/cli/wiki)
- [Resumen del SDK de plugins](/en/plugins/sdk-overview)
