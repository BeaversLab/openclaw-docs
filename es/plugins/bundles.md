---
summary: "Guía del formato de paquete unificado para paquetes de Codex, Claude y Cursor en OpenClaw"
read_when:
  - Deseas instalar o depurar un paquete compatible con Codex, Claude o Cursor
  - Necesitas entender cómo OpenClaw mapea el contenido del paquete a características nativas
  - Estás documentando la compatibilidad de paquetes o los límites de soporte actual
title: "Paquetes de complementos"
---

# Paquetes de complementos

OpenClaw soporta una clase compartida de paquetes de complementos externos: **complementos
de paquete**.

Hoy eso significa tres ecosistemas estrechamente relacionados:

- Paquetes de Codex
- Paquetes de Claude
- Paquetes de Cursor

OpenClaw muestra todos ellos como `Format: bundle` en `openclaw plugins list`.
La salida detallada y `openclaw plugins inspect <id>` también muestran el subtipo
(`codex`, `claude` o `cursor`).

Relacionado:

- Resumen del sistema de complementos: [Complementos](/es/tools/plugin)
- Flujos de instalación/lista de la CLI: [complementos](/es/cli/plugins)
- Esquema de manifiesto nativo: [Manifiesto de complemento](/es/plugins/manifest)

## Qué es un paquete

Un paquete es un **paquete de contenido/metadatos**, no un complemento nativo en proceso
de OpenClaw.

Hoy, OpenClaw **no** ejecuta el código de tiempo de ejecución del paquete en proceso. En su lugar,
detecta archivos de paquete conocidos, lee los metadatos y mapea el contenido del paquete
soportado a superficies nativas de OpenClaw como habilidades, paquetes de hooks, configuración MCP
y configuraciones de Pi integradas.

Ese es el límite de confianza principal:

- complemento nativo de OpenClaw: el módulo de tiempo de ejecución se ejecuta en proceso
- paquete: paquete de contenido/metadatos, con mapeo de características selectivo

## Modelo de paquete compartido

Los paquetes de Codex, Claude y Cursor son lo suficientemente similares como para que OpenClaw los trate
como un modelo normalizado.

Idea compartida:

- un pequeño archivo de manifiesto, o una estructura de directorios predeterminada
- una o más raíces de contenido como `skills/` o `commands/`
- metadatos opcionales de herramientas/tiempo de ejecución como MCP, hooks, agentes o LSP
- instalar como directorio o archivo, y luego habilitar en la lista normal de complementos

Comportamiento común de OpenClaw:

- detectar el subtipo del paquete
- normalizarlo en un registro de paquete interno
- mapear las partes soportadas a características nativas de OpenClaw
- reportar las partes no soportadas como capacidades detectadas pero no conectadas

En la práctica, la mayoría de los usuarios no necesitan pensar primero en el
formato específico del proveedor. La pregunta más útil es: ¿qué superficies
del paquete mapea OpenClaw hoy?

## Orden de detección

OpenClaw prefiere los diseños nativos de complementos/paquetes de OpenClaw
antes que el manejo de paquetes.

Efecto práctico:

- `openclaw.plugin.json` gana sobre la detección de paquetes
- las instalaciones de paquetes con `package.json` válido +
  `openclaw.extensions` usan la ruta de instalación nativa
- si un directorio contiene metadatos tanto nativos como de paquete, OpenClaw
  lo trata como nativo primero

Esto evita instalar parcialmente un paquete de doble formato como un paquete
y luego cargarlo más tarde como un complemento nativo.

## Lo que funciona hoy

OpenClaw normaliza los metadatos del paquete en un registro interno de paquete
y luego mapea las superficies compatibles al comportamiento nativo existente.

### Compatible ahora

#### Contenido de habilidades (skills)

- las raíces de habilidades del paquete se cargan como raíces de habilidades
normales de OpenClaw
- las raíces `commands` de Claude se tratan como raíces de
habilidades adicionales
- las raíces `.cursor/commands` de Cursor se tratan como raíces de
habilidades adicionales

Esto significa que los archivos de comandos de markdown de Claude funcionan a
través del cargador de habilidades normal de OpenClaw. Los comandos de
markdown de Cursor funcionan a través de la misma ruta.

#### Paquetes de ganchos (Hook packs)

- las raíces de ganchos del paquete funcionan **solo** cuando usan el diseño de
  paquete de ganchos normal de OpenClaw. Hoy esto es principalmente el caso
  compatible con Codex:
  - `HOOK.md`
  - `handler.ts` o `handler.js`

#### MCP para Pi

- los paquetes habilitados pueden contribuir con la configuración del servidor MCP
- OpenClaw fusiona la configuración MCP del paquete en la configuración efectiva
  de Pi integrada como `mcpServers`
- OpenClaw también expone las herramientas MCP de paquetes compatibles durante
los turnos del agente de Pi integrado lanzando servidores MCP stdio compatibles
como subprocesos
- la configuración local del proyecto de Pi todavía se aplica después de los
valores predeterminados del paquete, por lo que la configuración del espacio de
trabajo puede anular las entradas MCP del paquete cuando sea necesario

#### Configuración de Pi integrada

- `settings.json` de Claude se importa como configuración
predeterminada de Pi integrada cuando el paquete está habilitado
- OpenClaw sanea las claves de anulación de shell antes de aplicarlas

Claves saneadas:

- `shellPath`
- `shellCommandPrefix`

### Detectado pero no ejecutado

Estas superficies se detectan, se muestran en las capacidades del paquete y pueden aparecer en la salida de diagnóstico/información, pero OpenClaw aún no las ejecuta:

- Claude `agents`
- Automatización de Claude `hooks.json`
- Claude `lspServers`
- Claude `outputStyles`
- Cursor `.cursor/agents`
- Cursor `.cursor/hooks.json`
- Cursor `.cursor/rules`
- Metadatos inline/app de Codex más allá del informe de capacidades

## Informe de capacidades

`openclaw plugins inspect <id>` muestra las capacidades del paquete desde el registro de paquete normalizado.

Las capacidades compatibles se cargan silenciosamente. Las capacidades no compatibles generan una advertencia como:

```text
bundle capability detected but not wired into OpenClaw yet: agents
```

Excepciones actuales:

- Claude `commands` se considera compatible porque se asigna a skills
- Claude `settings` se considera compatible porque se asigna a la configuración incrustada de Pi
- Cursor `commands` se considera compatible porque se asigna a skills
- El MCP del paquete se considera compatible porque se asigna a la configuración incrustada de Pi y expone herramientas stdio compatibles a Pi incrustado
- Codex `hooks` se considera compatible solo para los diseños de paquetes de enganches (hook-pack) de OpenClaw

## Diferencias de formato

Los formatos son similares, pero no idénticos byte a byte. Estas son las diferencias prácticas que importan en OpenClaw.

### Codex

Marcadores típicos:

- `.codex-plugin/plugin.json`
- opcional `skills/`
- opcional `hooks/`
- opcional `.mcp.json`
- opcional `.app.json`

Los paquetes de Codex se adaptan mejor a OpenClaw cuando usan raíces de habilidades y directorios de paquetes de enganches (hook-pack) al estilo de OpenClaw.

### Claude

OpenClaw es compatible con ambos:

- paquetes de Claude basados en manifiesto: `.claude-plugin/plugin.json`
- paquetes de Claude sin manifiesto que utilizan el diseño predeterminado de Claude

Marcadores del diseño predeterminado de Claude que reconoce OpenClaw:

- `skills/`
- `commands/`
- `agents/`
- `hooks/hooks.json`
- `.mcp.json`
- `.lsp.json`
- `settings.json`

Notas específicas de Claude:

- `commands/` se trata como contenido de habilidad
- `settings.json` se importa en la configuración integrada de Pi
- `.mcp.json` y el manifiesto `mcpServers` pueden exponer herramientas stdio compatibles a
  Pi integrado
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
  de solo detección hoy

## Rutas personalizadas de Claude

Los manifiestos de paquetes de Claude pueden declarar rutas de componentes personalizadas. OpenClaw trata
esas rutas como **aditivas**, no reemplazan las predeterminadas.

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

La compatibilidad con paquetes es intencionalmente más limitada que la compatibilidad con complementos nativos.

Comportamiento actual:

- el descubrimiento de paquetes lee los archivos dentro de la raíz del complemento con comprobaciones de límites
- las rutas de habilidades y paquetes de enganches (hook-packs) deben permanecer dentro de la raíz del complemento
- los archivos de configuración de paquetes se leen con las mismas comprobaciones de límites
- los servidores MCP de paquetes stdio compatibles pueden iniciarse como subprocesos para
  llamadas a herramientas de Pi integrado
- OpenClaw no carga módulos de tiempo de ejecución de paquetes arbitrarios en proceso

Esto hace que la compatibilidad con paquetes sea más segura por defecto que los módulos de complementos nativos, pero aún
debería tratar los paquetes de terceros como contenido de confianza para las características que
exponen.

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

Si el directorio es un complemento/paquete nativo de OpenClaw, la ruta de instalación nativa
todavía tiene prioridad.

Para los nombres del marketplace de Claude, OpenClaw lee el registro local de marketplace conocido de Claude en `~/.claude/plugins/known_marketplaces.json`. Las entradas del marketplace
pueden resolverse a directorios/archivos compatibles con paquetes o a fuentes de complementos
nativos; después de la resolución, las reglas normales de instalación todavía se aplican.

## Solución de problemas

### El paquete se detecta pero las capacidades no se ejecutan

Verifique `openclaw plugins inspect <id>`.

Si la capacidad está listada pero OpenClaw dice que aún no está conectada, eso es un
límite real del producto, no una instalación rota.

### Los archivos de comandos de Claude no aparecen

Asegúrese de que el paquete esté habilitado y los archivos markdown estén dentro de una raíz
`commands` detectada o una raíz `skills` detectada.

### La configuración de Claude no se aplica

El soporte actual se limita a la configuración Pi integrada de `settings.json`.
OpenClaw no trata la configuración del paquete como parches de configuración sin procesar de OpenClaw.

### Los hooks de Claude no se ejecutan

`hooks/hooks.json` solo se detecta hoy.

Si necesita hooks de paquetes ejecutables hoy, use el diseño normal de paquetes de hooks de OpenClaw
a través de una raíz de hooks de Codex compatible o envíe un complemento nativo de OpenClaw.

import en from "/components/footer/en.mdx";

<en />
