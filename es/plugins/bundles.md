---
summary: "Guía del formato de paquete unificado para paquetes de Codex, Claude y Cursor en OpenClaw"
read_when:
  - You want to install or debug a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are documenting bundle compatibility or current support limits
title: "Paquetes de plugins"
---

# Paquetes de plugins

OpenClaw es compatible con una clase compartida de paquetes de plugins externos: **plugins de paquete**.

Hoy en día, esto significa tres ecosistemas estrechamente relacionados:

- Paquetes de Codex
- Paquetes de Claude
- Paquetes de Cursor

OpenClaw muestra todos ellos como `Format: bundle` en `openclaw plugins list`.
La salida detallada y `openclaw plugins inspect <id>` también muestran el subtipo
(`codex`, `claude` o `cursor`).

Relacionado:

- Resumen del sistema de complementos: [Complementos](/es/tools/plugin)
- Flujos de instalación/lista de CLI: [complementos](/es/cli/plugins)
- Esquema de manifiesto nativo: [Manifiesto de complemento](/es/plugins/manifest)

## Qué es un paquete

Un paquete es un **paquete de contenido/metadatos**, no un plugin nativo dentro del proceso de OpenClaw.

Hoy en día, OpenClaw **no** ejecuta código de tiempo de ejecución del paquete dentro del proceso. En su lugar,
detecta archivos de paquetes conocidos, lee los metadatos y asigna el contenido del paquete compatible
a superficies nativas de OpenClaw, como habilidades, paquetes de hooks, configuración de MCP
y configuraciones integradas de Pi.

Ese es el límite de confianza principal:

- plugin nativo de OpenClaw: el módulo de tiempo de ejecución se ejecuta dentro del proceso
- paquete: paquete de metadatos/contenido, con mapeo de características selectivo

## Modelo de paquete compartido

Los paquetes de Codex, Claude y Cursor son lo suficientemente similares como para que OpenClaw los trate
como un modelo normalizado.

Idea compartida:

- un pequeño archivo de manifiesto o una estructura de directorios predeterminada
- una o más raíces de contenido como `skills/` o `commands/`
- metadatos opcionales de herramientas/tiempo de ejecución como MCP, hooks, agentes o LSP
- instalar como un directorio o archivo y luego habilitar en la lista normal de plugins

Comportamiento común de OpenClaw:

- detectar el subtipo de paquete
- normalizarlo en un registro interno de paquete
- asignar las partes compatibles a características nativas de OpenClaw
- reportar las partes no compatibles como capacidades detectadas pero no conectadas

En la práctica, la mayoría de los usuarios no necesitan pensar primero en el formato específico del proveedor.
La pregunta más útil es: ¿qué superficies de paquete asigna OpenClaw
hoy?

## Orden de detección

OpenClaw prefiere los diseños nativos de complementos/paquetes de OpenClaw antes que el manejo de paquetes.

Efecto práctico:

- `openclaw.plugin.json` tiene prioridad sobre la detección de paquetes
- las instalaciones de paquetes con `package.json` válido + `openclaw.extensions` usan
  la ruta de instalación nativa
- si un directorio contiene metadatos tanto nativos como de paquete, OpenClaw lo trata
  como nativo primero

Eso evita instalar parcialmente un paquete de formato dual como un paquete y luego
cargarlo más tarde como un complemento nativo.

## Lo que funciona hoy

OpenClaw normaliza los metadatos del paquete en un registro interno de paquete, y luego asigna
las superficies compatibles al comportamiento nativo existente.

### Compatible actualmente

#### Contenido de habilidades

- las raíces de habilidades del paquete se cargan como raíces de habilidades normales de OpenClaw
- las raíces `commands` de Claude se tratan como raíces de habilidades adicionales
- las raíces `.cursor/commands` de Cursor se tratan como raíces de habilidades adicionales

Esto significa que los archivos de comandos markdown de Claude funcionan a través del cargador de habilidades
normal de OpenClaw. El markdown de comandos de Cursor funciona a través de la misma ruta.

#### Paquetes de hooks

- las raíces de hooks del paquete funcionan **solo** cuando usan el diseño normal de paquetes de hooks
  de OpenClaw. Hoy este es principalmente el caso compatible con Codex:
  - `HOOK.md`
  - `handler.ts` o `handler.js`

#### MCP para Pi

- los paquetes habilitados pueden contribuir con la configuración del servidor MCP
- OpenClaw fusiona la configuración MCP del paquete en la configuración efectiva de Pi incrustada como
  `mcpServers`
- OpenClaw también expone las herramientas MCP del paquete admitidas durante los turnos del agente Pi incrustado
  iniciando los servidores MCP stdio admitidos como subprocesos
- la configuración Pi local del proyecto todavía se aplica después de los valores predeterminados del paquete, por lo que la configuración
  del espacio de trabajo puede anular las entradas MCP del paquete cuando sea necesario

#### Configuración Pi incrustada

- Claude `settings.json` se importa como configuración Pi incrustada predeterminada cuando el
  paquete está habilitado
- OpenClaw sanea las claves de anulación de shell antes de aplicarlas

Claves saneadas:

- `shellPath`
- `shellCommandPrefix`

### Detectado pero no ejecutado

Estas superficies se detectan, se muestran en las capacidades del paquete y pueden aparecer en
la salida de diagnóstico/información, pero OpenClaw aún no las ejecuta:

- Claude `agents`
- Automatización Claude `hooks.json`
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- Metadatos en línea/aplicación de Codex más allá del informe de capacidades

## Informe de capacidades

`openclaw plugins inspect <id>` muestra las capacidades del paquete desde el registro de
paquete normalizado.

Las capacidades compatibles se cargan silenciosamente. Las capacidades no compatibles generan una advertencia como:

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

Excepciones actuales:

- Claude `commands` se considera admitido porque se asigna a habilidades
- Claude `settings` se considera admitido porque se asigna a la configuración de Pi incrustada
- Cursor `commands` se considera admitido porque se asigna a habilidades
- el MCP del paquete se considera admitido porque se asigna a la configuración de Pi incrustada
  y expone herramientas stdio admitidas a Pi incrustado
- Codex `hooks` se considera admitido solo para diseños de paquetes de enlace de OpenClaw

## Diferencias de formato

Los formatos son similares, pero no idénticos byte por byte. Estas son las diferencias prácticas que importan en OpenClaw.

### Codex

Marcadores típicos:

- `.codex-plugin/plugin.json`
- opcional `skills/`
- opcional `hooks/`
- opcional `.mcp.json`
- opcional `.app.json`

Los paquetes de Codex se adaptan mejor a OpenClaw cuando utilizan raíces de habilidades (skill roots) y directorios de paquetes de enganches (hook-pack) estilo OpenClaw.

### Claude

OpenClaw admite ambos:

- paquetes Claude basados en manifiesto: `.claude-plugin/plugin.json`
- paquetes de Claude sin manifiesto que utilizan el diseño predeterminado de Claude

Marcadores del diseño predeterminado de Claude que OpenClaw reconoce:

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Notas específicas de Claude:

- `commands/` se trata como contenido de habilidad
- `settings.json` se importa a la configuración incrustada de Pi
- `.mcp.json` y el manifiesto `mcpServers` pueden exponer herramientas stdio compatibles a
  Pi incrustado
- `hooks/hooks.json` se detecta, pero no se ejecuta como automatización de Claude

### Cursor

Marcadores típicos:

- `.cursor-plugin/plugin.json`
- opcional `skills/`
- opcional `.cursor/commands/`
- opcional `.cursor/agents/`
- opcional `.cursor/rules/`
- opcional `.cursor/hooks.json`
- opcional `.mcp.json`

Notas específicas de Cursor:

- `.cursor/commands/` se trata como contenido de habilidad
- `.cursor/rules/`, `.cursor/agents/` y `.cursor/hooks.json` son
  solo detección hoy

## Rutas personalizadas de Claude

Los manifiestos de paquetes de Claude pueden declarar rutas de componentes personalizadas. OpenClaw trata
esas rutas como **aditivas**, no reemplazando los valores predeterminados.

Claves de ruta personalizadas reconocidas actualmente:

- `skills`
- `commands`
- `agents`
- `hooks`
- `mcpServers`
- `lspServers`
- `outputStyles`

Ejemplos:

- `commands/` predeterminado más el manifiesto `commands: "extra-commands"` =>
  OpenClaw escanea ambos
- `skills/` predeterminado más el manifiesto `skills: ["team-skills"]` =>
  OpenClaw escanea ambos

## Modelo de seguridad

El soporte de paquetes es intencionalmente más limitado que el soporte de complementos nativos.

Comportamiento actual:

- el descubrimiento de paquetes lee archivos dentro de la raíz del complemento con comprobaciones de límites
- las rutas de habilidades y paquetes de enlaces deben permanecer dentro de la raíz del complemento
- los archivos de configuración del paquete se leen con las mismas comprobaciones de límites
- los servidores MCP de paquetes stdio compatibles pueden lanzarse como subprocesos para las llamadas a herramientas Pi integradas
- OpenClaw no carga módulos de tiempo de ejecución de paquetes arbitrarios en proceso

Esto hace que la compatibilidad con paquetes sea más segura por defecto que los módulos de complementos nativos, pero aún debe tratar los paquetes de terceros como contenido de confianza para las funciones que sí exponen.

## Ejemplos de instalación

```bash
openclaw plugins install ./my-codex-bundle
openclaw plugins install ./my-claude-bundle
openclaw plugins install ./my-cursor-bundle
openclaw plugins install ./my-bundle.tgz
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
openclaw plugins inspect my-bundle
```

Si el directorio es un complemento/paquete nativo de OpenClaw, la ruta de instalación nativa aún tiene prioridad.

Para los nombres del mercado de Claude, OpenClaw lee el registro local known-marketplace de Claude en `~/.claude/plugins/known_marketplaces.json`. Las entradas del mercado pueden resolver a directorios/archivos compatibles con paquetes o a fuentes de complementos nativos; después de la resolución, las reglas de instalación normales aún se aplican.

## Solución de problemas

### Se detecta el paquete pero las capacidades no se ejecutan

Verifique `openclaw plugins inspect <id>`.

Si la capacidad está listada pero OpenClaw dice que aún no está conectada, ese es un límite real del producto, no una instalación rota.

### Los archivos de comandos de Claude no aparecen

Asegúrese de que el paquete esté habilitado y que los archivos markdown estén dentro de una raíz `commands` detectada o una raíz `skills` detectada.

### La configuración de Claude no se aplica

La compatibilidad actual se limita a la configuración Pi integrada de `settings.json`. OpenClaw no trata la configuración del paquete como parches de configuración sin procesar de OpenClaw.

### Los enlaces (hooks) de Claude no se ejecutan

`hooks/hooks.json` solo se detecta hoy.

Si necesita enlaces de paquetes ejecutables hoy, use el diseño normal de paquetes de enlaces de OpenClaw a través de una raíz de enlaces de Codex compatible o envíe un complemento nativo de OpenClaw.

import es from "/components/footer/es.mdx";

<es />
