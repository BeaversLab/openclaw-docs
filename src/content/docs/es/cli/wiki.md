---
summary: "Referencia de CLI para `openclaw wiki` (estado del almacén memory-wiki, búsqueda, compilación, lint, aplicación, puente y asistentes de Obsidian)"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

Inspecciona y mantiene el almacén `memory-wiki`.

Proporcionado por el complemento `memory-wiki` incluido.

Relacionado:

- [Complemento Memory Wiki](/es/plugins/memory-wiki)
- [Resumen de memoria](/es/concepts/memory)
- [CLI: memory](/es/cli/memory)

## Para qué sirve

Use `openclaw wiki` cuando desee un almacén de conocimiento compilado con:

- búsqueda y lectura de páginas nativas de la wiki
- síntesis ricas en procedencia
- informes de contradicción y novedad
- importaciones de puente desde el complemento de memoria activo
- ayudantes de CLI de Obsidian opcionales

## Comandos comunes

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "who should I ask about Teams?" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "Short synthesis body" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "Still active?"

openclaw wiki bridge import
openclaw wiki unsafe-local import

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## Comandos

### `wiki status`

Inspeccionar el modo actual de la bóveda, su estado y la disponibilidad de la CLI de Obsidian.

Use esto primero cuando no esté seguro de si la bóveda está inicializada, si el modo
puente está sano o si la integración con Obsidian está disponible.

Cuando el modo puente está activo y configurado para leer artefactos de memoria, este comando
consulta el Gateway en ejecución para que vea el mismo contexto del complemento de memoria activo que
la memoria del agente/tiempo de ejecución.

### `wiki doctor`

Ejecuta comprobaciones de estado del wiki y muestra problemas de configuración o del almacén.

Cuando el modo puente está activo y configurado para leer artefactos de memoria, este comando
consulta el Gateway en ejecución antes de generar el informe. Las importaciones de puente deshabilitadas
y las configuraciones de puente que no leen artefactos de memoria permanecen locales/fuera de línea.

Los problemas típicos incluyen:

- modo puente habilitado sin artefactos de memoria públicos
- diseño de almacén no válido o faltante
- falta la CLI externa de Obsidian cuando se espera el modo Obsidian

### `wiki init`

Crea el diseño del almacén wiki y las páginas iniciales.

Esto inicializa la estructura raíz, incluyendo índices de nivel superior y directorios
de caché.

### `wiki ingest <path-or-url>`

Importa contenido a la capa de origen del wiki.

Notas:

- La ingesta de URL está controlada por `ingest.allowUrlIngest`
- las páginas de origen importadas mantienen la procedencia en el frontmatter
- la compilación automática ejecutarse después de la ingesta cuando está habilitada

### `wiki compile`

Reconstruye índices, bloques relacionados, tableros y resúmenes compilados.

Esto escribe artefactos estables orientados a máquinas en:

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Si `render.createDashboards` está habilitado, la compilación también actualiza las páginas de informes.

### `wiki lint`

Realiza lint al almacén e informa:

- problemas estructurales
- lagunas de procedencia
- contradicciones
- preguntas abiertas
- páginas/afirmaciones de baja confianza
- páginas/afirmaciones obsoletas

Ejecute esto después de actualizaciones significativas de la wiki.

### `wiki search <query>`

Buscar contenido de la wiki.

El comportamiento depende de la configuración:

- `search.backend`: `shared` o `local`
- `search.corpus`: `wiki`, `memory` o `all`
- `--mode`: `auto`, `find-person`, `route-question`, `source-evidence` o
  `raw-claim`

Use `wiki search` cuando desee detalles de clasificación o procedencia específicos de la wiki.
Para una pasada de recuperación compartida amplia, prefiera `openclaw memory search` cuando el
complemento de memoria activo exponga la búsqueda compartida.

Los modos de búsqueda ayudan al agente a elegir la superficie correcta:

- `find-person`: alias, identificadores, redes sociales, IDs canónicos y páginas de personas
- `route-question`: sugerencias de pedir-para/mejor-usado-para y contexto de relación
- `source-evidence`: páginas de origen y campos de evidencia estructurados
- `raw-claim`: texto de afirmación estructurado con metadatos de afirmación/evidencia

Ejemplos:

```bash
openclaw wiki search "bgroux" --mode find-person
openclaw wiki search "who knows Teams rollout?" --mode route-question
openclaw wiki search "maintainer-whois" --mode source-evidence
openclaw wiki search "strong route Teams" --mode raw-claim --json
```

La salida de texto incluye líneas `Claim:` y `Evidence:` cuando un resultado coincide con una
afirmación estructurada. La salida JSON también expone `matchedClaimId`,
`matchedClaimStatus`, `matchedClaimConfidence`, `evidenceKinds` y
`evidenceSourceIds` para el análisis detallado del lado del agente.

### `wiki get <lookup>`

Leer una página de la wiki por id o ruta relativa.

Ejemplos:

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

Aplicar mutaciones estrechas sin cirugía de página de forma libre.

Los flujos compatibles incluyen:

- crear/actualizar una página de síntesis
- actualizar metadatos de página
- adjuntar ids de origen
- añadir preguntas
- añadir contradicciones
- actualizar confianza/estado
- escribir afirmaciones estructuradas

Este comando existe para que la wiki pueda evolucionar de forma segura sin editar manualmente
los bloques administrados.

### `wiki bridge import`

Importa artefactos de memoria pública del complemento de memoria activo a las páginas de origen respaldadas por puente.

Usa esto en el modo `bridge` cuando quieras que los últimos artefactos de memoria exportados se incorporen al almacén wiki.

Para las lecturas activas de artefactos de puente, la CLI enruta la importación a través de Gateway RPC para que la importación utilice el contexto del complemento de memoria en tiempo de ejecución. Si las importaciones de puente están desactivadas o las lecturas de artefactos están apagadas, el comando mantiene el comportamiento de importación cero local/sin conexión.

### `wiki unsafe-local import`

Importar desde rutas locales configuradas explícitamente en el modo `unsafe-local`.

Esto es intencionalmente experimental y solo para la misma máquina.

### `wiki obsidian ...`

Comandos auxiliares de Obsidian para almacenes que se ejecutan en modo compatible con Obsidian.

Subcomandos:

- `status`
- `search`
- `open`
- `command`
- `daily`

Estos requieren la CLI oficial de `obsidian` en `PATH` cuando
`obsidian.useOfficialCli` está activado.

## Guía de uso práctico

- Usa `wiki search` + `wiki get` cuando importen la procedencia y la identidad de la página.
- Usa `wiki apply` en lugar de editar manualmente las secciones generadas gestionadas.
- Usa `wiki lint` antes de confiar en contenido contradictorio o de baja confianza.
- Usa `wiki compile` después de importaciones masivas o cambios de origen cuando quieras
  dashboards frescos y resúmenes compilados inmediatamente.
- Usa `wiki bridge import` cuando el modo puente dependa de artefactos de memoria
  recién exportados.

## Relaciones con la configuración

El comportamiento de `openclaw wiki` está determinado por:

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

Consulta [Memory Wiki plugin](/es/plugins/memory-wiki) para el modelo de configuración completo.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Memory wiki](/es/plugins/memory-wiki)
