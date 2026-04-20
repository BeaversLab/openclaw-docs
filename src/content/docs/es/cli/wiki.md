---
summary: "Referencia de CLI para `openclaw wiki` (estado de la bóveda memory-wiki, búsqueda, compilación, lint, aplicación, puente y ayudantes de Obsidian)"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "wiki"
---

# `openclaw wiki`

Inspeccionar y mantener la bóveda `memory-wiki`.

Proporcionado por el complemento `memory-wiki` incluido.

Relacionado:

- [Complemento Memory Wiki](/es/plugins/memory-wiki)
- [Resumen de memoria](/es/concepts/memory)
- [CLI: memory](/es/cli/memory)

## Para qué sirve

Use `openclaw wiki` cuando desee una bóveda de conocimiento compilada con:

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

### `wiki doctor`

Ejecutar comprobaciones de salud de la wiki y revelar problemas de configuración o de la bóveda.

Los problemas típicos incluyen:

- modo puente habilitado sin artefactos de memoria públicos
- diseño de bóveda inválido o faltante
- falta de CLI externa de Obsidian cuando se espera el modo Obsidian

### `wiki init`

Crear el diseño de la bóveda de la wiki y las páginas iniciales.

Esto inicializa la estructura raíz, incluidos los índices de nivel superior y los directorios
de caché.

### `wiki ingest <path-or-url>`

Importar contenido a la capa de origen de la wiki.

Notas:

- La ingesta de URL está controlada por `ingest.allowUrlIngest`
- las páginas de origen importadas mantienen la procedencia en el frontmatter
- la auto-compilación puede ejecutarse después de la ingesta cuando está habilitada

### `wiki compile`

Reconstruir índices, bloques relacionados, paneles y resúmenes compilados.

Esto escribe artefactos estables orientados a máquinas en:

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Si `render.createDashboards` está habilitado, la compilación también actualiza las páginas de informes.

### `wiki lint`

Revisar la bóveda e informar:

- problemas estructurales
- brechas de procedencia
- contradicciones
- preguntas abiertas
- páginas/reclamaciones de baja confianza
- páginas/reclamaciones obsoletas

Ejecute esto después de actualizaciones significativas de la wiki.

### `wiki search <query>`

Buscar contenido de la wiki.

El comportamiento depende de la configuración:

- `search.backend`: `shared` o `local`
- `search.corpus`: `wiki`, `memory`, o `all`

Use `wiki search` cuando desee detalles de clasificación específicos de la wiki o procedencia.
Para un pase de recuperación amplio y compartido, prefiera `openclaw memory search` cuando el
complemento de memoria activa exponga búsqueda compartida.

### `wiki get <lookup>`

Leer una página de la wiki por id o ruta relativa.

Ejemplos:

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

Aplique mutaciones estrechas sin cirugía de página de forma libre.

Los flujos admitidos incluyen:

- crear/actualizar una página de síntesis
- actualizar metadatos de página
- adjuntar ids de origen
- añadir preguntas
- añadir contradicciones
- actualizar confianza/estado
- escribir reclamaciones estructuradas

Este comando existe para que la wiki pueda evolucionar de forma segura sin editar manualmente
bloques gestionados.

### `wiki bridge import`

Importar artefactos de memoria pública del complemento de memoria activa a páginas de origen
destinadas a puentes (bridge-backed).

Use esto en modo `bridge` cuando desee que los últimos artefactos de memoria exportados
se introduzcan en la caja fuerte de la wiki.

### `wiki unsafe-local import`

Importar desde rutas locales configuradas explícitamente en modo `unsafe-local`.

Esto es intencionalmente experimental y solo para la misma máquina.

### `wiki obsidian ...`

Comandos auxiliares de Obsidian para cajas fuertes que se ejecutan en modo compatible con Obsidian.

Subcomandos:

- `status`
- `search`
- `open`
- `command`
- `daily`

Estos requieren la CLI oficial de `obsidian` en `PATH` cuando
`obsidian.useOfficialCli` está habilitado.

## Guía de uso práctico

- Use `wiki search` + `wiki get` cuando la procedencia y la identidad de la página importen.
- Use `wiki apply` en lugar de editar manualmente secciones generadas gestionadas.
- Use `wiki lint` antes de confiar en contenido contradictorio o de baja confianza.
- Use `wiki compile` después de importaciones masivas o cambios en la fuente cuando desee
  dashboards frescos y resúmenes compilados inmediatamente.
- Use `wiki bridge import` cuando el modo puente dependa de artefactos de memoria
  exportados recientemente.

## Vínculos de configuración

El comportamiento de `openclaw wiki` está determinado por:

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

Consulte [Memory Wiki plugin](/es/plugins/memory-wiki) para ver el modelo de configuración completo.
