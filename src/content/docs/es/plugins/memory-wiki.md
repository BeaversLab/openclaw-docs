---
summary: "memory-wiki: bóveda de conocimiento compilada con procedencia, afirmaciones, cuadros de mando y modo puente"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Wiki de memoria"
---

`memory-wiki` es un complemento incluido que convierte la memoria duradera en una bóveda de conocimiento compilada.

No **reemplaza** al complemento de memoria activa. El complemento de memoria activa aún posee la recuperación, la promoción, la indexación y la ensoñación. `memory-wiki` se encuentra junto a él y compila el conocimiento duradero en una wiki navegable con páginas deterministas, afirmaciones estructuradas, procedencia, cuadros de mando y resúmenes legibles por máquina.

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

Si el complemento de memoria activa expone artefactos de recuperación compartidos, OpenClaw puede buscar en ambas capas de una sola vez con `memory_search corpus=all`.

Cuando necesite clasificación específica del wiki, procedencia o acceso directo a páginas, utilice
las herramientas nativas del wiki en su lugar.

## Patrón híbrido recomendado

Un valor predeterminado sólido para configuraciones con prioridad local es:

- QMD como backend de memoria activa para el recuerdo y la búsqueda semántica amplia
- `memory-wiki` en modo `bridge` para páginas de conocimiento sintetizado duradero

Esa división funciona bien porque cada capa mantiene su enfoque:

- QMD mantiene las notas sin procesar, las exportaciones de sesión y las colecciones adicionales buscables
- `memory-wiki` compila entidades estables, afirmaciones, cuadros de mando y páginas de origen

Regla práctica:

- use `memory_search` cuando desee un paso de recuperación amplio en toda la memoria
- use `wiki_search` y `wiki_get` cuando desee resultados de wiki con conocimiento de procedencia
- use `memory_search corpus=all` cuando desee que la búsqueda compartida abarque ambas capas

Si el modo puente indica cero artefactos exportados, el complemento de memoria activa aún no está exponiendo entradas de puente público. Ejecute `openclaw wiki doctor` primero, luego confirme que el complemento de memoria activa soporta artefactos públicos.

Cuando el modo puente está activo y `bridge.readMemoryArtifacts` está habilitado, `openclaw wiki status`, `openclaw wiki doctor` y `openclaw wiki bridge import` leen a través de Gateway en ejecución. Esto mantiene las comprobaciones de puente de CLI alineadas con el contexto del complemento de memoria en tiempo de ejecución. Si el puente está deshabilitado o las lecturas de artefactos están desactivadas, esos comandos mantienen su comportamiento local/desconectado.

## Modos de bóveda

`memory-wiki` soporta tres modos de bóveda:

### `isolated`

Bóveda propia, fuentes propias, sin dependencia de `memory-core`.

Úselo cuando desee que el wiki sea su propio almacén de conocimiento curado.

### `bridge`

Lee artefactos de memoria públicos y eventos de memoria del complemento de memoria activa a través de costuras públicas del SDK del complemento.

Use esto cuando desee que el wiki compile y organice los artefactos exportados del complemento de memoria sin acceder a los internos privados del complemento.

El modo puente puede indexar:

- artefactos de memoria exportados
- informes de sueños
- notas diarias
- archivos raíz de memoria
- registros de eventos de memoria

### `unsafe-local`

Mecanismo de escape explícito en la misma máquina para rutas privadas locales.

Este modo es intencionalmente experimental y no portátil. Úselo solo cuando comprenda el límite de confianza y necesite específicamente acceso al sistema de archivos local que el modo puente no puede proporcionar.

## Diseño de la bóveda

El complemento inicializa una bóveda así:

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

El contenido administrado se mantiene dentro de bloques generados. Los bloques de notas humanas se preservan.

Los grupos principales de páginas son:

- `sources/` para material en bruto importado y páginas respaldadas por puente
- `entities/` para cosas duraderas, personas, sistemas, proyectos y objetos
- `concepts/` para ideas, abstracciones, patrones y políticas
- `syntheses/` para resúmenes compilados y agregados mantenidos
- `reports/` para cuadros de mando generados

## Reclamaciones y evidencias estructuradas

Las páginas pueden llevar frontmatter `claims` estructurado, no solo texto libre.

Cada reclamación puede incluir:

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

Las entradas de evidencia pueden incluir:

- `kind`
- `sourceId`
- `path`
- `lines`
- `weight`
- `confidence`
- `privacyTier`
- `note`
- `updatedAt`

Esto es lo que hace que la wiki actúe más como una capa de creencias que como un vertido de notas pasivo.
Las afirmaciones se pueden rastrear, puntuar, impugnar y resolver hasta las fuentes.

## Metadatos de entidad orientados al agente

Las páginas de entidad también pueden llevar metadatos de enrutamiento para uso del agente. Esto es un frontmatter genérico,
por lo que funciona para personas, equipos, sistemas, proyectos o cualquier otro
tipo de entidad.

Los campos comunes incluyen:

- `entityType`: por ejemplo `person`, `team`, `system`, o `project`
- `canonicalId`: clave de identidad estable utilizada a través de alias e importaciones
- `aliases`: nombres, identificadores o etiquetas que deben resolver a la misma página
- `privacyTier`: `public`, `local-private`, `sensitive`, o `confirm-before-use`
- `bestUsedFor` / `notEnoughFor`: sugerencias de enrutamiento compactas
- `lastRefreshedAt`: marca de tiempo de actualización de origen separada del tiempo de edición de la página
- `personCard`: tarjeta de enrutamiento opcional específica de la persona con identificadores, redes sociales,
  correos electrónicos, zona horaria, carril, pedir-evitar-pedir, confianza y privacidad
- `relationships`: bordes tipados a páginas relacionadas con objetivo, tipo, peso,
  confianza, tipo de evidencia, nivel de privacidad y nota

Para un wiki de personas, el agente generalmente debería comenzar con
`reports/person-agent-directory.md`, luego abrir la página de la persona con `wiki_get`
antes de usar los detalles de contacto o hechos inferidos.

Ejemplo:

```yaml
pageType: entity
entityType: person
id: entity.brad-groux
canonicalId: maintainer.brad-groux
aliases:
  - Brad
  - bgroux
privacyTier: local-private
bestUsedFor:
  - Microsoft Teams and Azure routing
notEnoughFor:
  - legal approval
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@bgroux"
  socials:
    - "https://x.example/bgroux"
  emails:
    - brad@example.com
  timezone: America/Chicago
  lane: Microsoft ecosystem
  askFor:
    - Teams rollout questions
  avoidAskingFor:
    - unrelated billing decisions
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.alice
    targetTitle: Alice
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.brad.teams
    text: Brad is useful for Microsoft Teams routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```

## Canal de compilación

El paso de compilación lee las páginas del wiki, normaliza los resúmenes y emite artefactos
estables orientados a la máquina bajo:

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Estos resúmenes existen para que los agentes y el código en tiempo de ejecución no tengan que extraer
información de las páginas Markdown.

La salida compilada también potencia:

- indexación de wiki de primer paso para flujos de búsqueda/obtención
- búsqueda de id de reclamo hacia las páginas propietarias
- suplementos de indicadores compactos
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
- `reports/person-agent-directory.md`
- `reports/relationship-graph.md`
- `reports/provenance-coverage.md`
- `reports/privacy-review.md`

Estos informes rastrean cosas como:

- clústeres de notas contradictorias
- clústeres de reclamos competitivos
- reclamos que carecen de evidencia estructurada
- páginas y reclamos de baja confianza
- frescura obsoleta o desconocida
- páginas con preguntas sin resolver
- tarjetas de enrutamiento de persona/entidad
- bordes de relación estructurada
- cobertura de clase de evidencia
- niveles de privacidad no públicos que necesitan revisión antes de su uso

## Búsqueda y recuperación

`memory-wiki` admite dos backends de búsqueda:

- `shared`: usar el flujo de búsqueda de memoria compartida cuando esté disponible
- `local`: buscar el wiki localmente

También admite tres corpus:

- `wiki`
- `memory`
- `all`

Comportamiento importante:

- `wiki_search` y `wiki_get` usan resúmenes compilados como primera pasada cuando es posible
- los IDs de reclamaciones pueden resolver de vuelta a la página propietaria
- las reclamaciones controvertidas/obsoletas/recientes influyen en la clasificación
- las etiquetas de procedencia pueden sobrevivir en los resultados
- el modo de búsqueda puede sesgar la clasificación para búsqueda de personas, enrutamiento de preguntas, evidencia de origen o reclamaciones sin procesar

Regla práctica:

- use `memory_search corpus=all` para una pasada de recuperación amplia
- use `wiki_search` + `wiki_get` cuando le importe la clasificación específica de la wiki, la procedencia o la estructura de creencias a nivel de página

Modos de búsqueda:

- `auto`: equilibrado por defecto
- `find-person`: impulsa entidades similares a personas, alias, identificadores, redes sociales e IDs canónicos
- `route-question`: impulsa tarjetas de agente, sugerencias de "ask-for", sugerencias de "best-used-for" y contexto de relación
- `source-evidence`: impulsa páginas de origen y metadatos de evidencia estructurada
- `raw-claim`: impulsa reclamaciones estructuradas coincidentes y devuelve metadatos de reclamación/evidencia en los resultados

Cuando un resultado coincide con una reclamación estructurada, `wiki_search` puede devolver
`matchedClaimId`, `matchedClaimStatus`, `matchedClaimConfidence`,
`evidenceKinds` y `evidenceSourceIds` en su carga útil de detalles. La salida de texto
también incluye líneas compactas de `Claim:` y `Evidence:` cuando están disponibles.

## Herramientas de agente

El complemento registra estas herramientas:

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

Lo que hacen:

- `wiki_status`: modo de bóveda actual, estado, disponibilidad de CLI de Obsidian
- `wiki_search`: busca páginas wiki y, cuando está configurado, corpus de memoria compartida;
  acepta `mode` para búsqueda de personas, enrutamiento de preguntas, evidencia de origen o profundización en reclamaciones sin procesar
- `wiki_get`: lee una página wiki por id/ruta o recurre al corpus de memoria compartida
- `wiki_apply`: mutaciones de metadatos/síntesis estrechas sin cirugía de página de forma libre
- `wiki_lint`: comprobaciones estructurales, lagunas de procedencia, contradicciones, preguntas abiertas

El complemento también registra un suplemento de corpus de memoria no exclusivo, de modo que
`memory_search` y `memory_get` compartidos pueden acceder a la wiki cuando el complemento de
memoria activa admite la selección de corpus.

## Comportamiento del prompt y del contexto

Cuando `context.includeCompiledDigestPrompt` está habilitado, las secciones del prompt de memoria
adjuntan una instantánea compilada compacta de `agent-digest.json`.

Esa instantánea es intencionalmente pequeña y de alta señal:

- solo las páginas principales
- solo las afirmaciones principales
- recuento de contradicciones
- recuento de preguntas
- calificadores de confianza/novedad

Esto es opcional porque cambia la forma del prompt y es principalmente útil para
motores de contexto o ensamblaje de prompts heredados que consumen explícitamente suplementos de memoria.

## Configuración

Pon la configuración bajo `plugins.entries.memory-wiki.config`:

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
- `search.corpus`: `wiki`, `memory` o `all`
- `context.includeCompiledDigestPrompt`: adjuntar una instantánea compacta del resumen a las secciones del prompt de memoria
- `render.createBacklinks`: generar bloques relacionados deterministas
- `render.createDashboards`: generar páginas de tablero

### Ejemplo: QMD + modo puente

Úselo cuando quiera QMD para el recuerdo y `memory-wiki` para una capa de
conocimiento mantenida:

```json5
{
  memory: {
    backend: "qmd",
  },
  plugins: {
    entries: {
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

- QMD a cargo del recuerdo de la memoria activa
- `memory-wiki` centrado en páginas compiladas y tableros
- forma del prompt sin cambios hasta que habilite intencionalmente los prompts de resumen compilados

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

Consulte [CLI: wiki](/es/cli/wiki) para la referencia completa de comandos.

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

1. Mantenga su complemento de memoria activa para recordar/promoción/soñar.
2. Habilite `memory-wiki`.
3. Comience con el modo `isolated` a menos que explícitamente desee el modo puente.
4. Use `wiki_search` / `wiki_get` cuando la procedencia sea importante.
5. Use `wiki_apply` para síntesis estrechas o actualizaciones de metadatos.
6. Ejecute `wiki_lint` después de cambios significativos.
7. Active los paneles si desea visibilidad de datos obsoletos/contradicciones.

## Documentos relacionados

- [Resumen de memoria](/es/concepts/memory)
- [CLI: memory](/es/cli/memory)
- [CLI: wiki](/es/cli/wiki)
- [Resumen del SDK de complementos](/es/plugins/sdk-overview)
