---
summary: "Instalar y usar bundles de Codex, Claude y Cursor como complementos de OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "Bundles de complementos"
---

# Bundles de complementos

OpenClaw puede instalar complementos de tres ecosistemas externos: **Codex**, **Claude**
y **Cursor**. Estos se denominan **bundles** — paquetes de contenido y metadatos que
OpenClaw asigna a características nativas como habilidades, enlaces y herramientas MCP.

<Info>Los bundles **no** son lo mismo que los plugins nativos de OpenClaw. Los plugins nativos se ejecutan en proceso y pueden registrar cualquier capacidad. Los bundles son paquetes de contenido con asignación selectiva de características y un límite de confianza más estrecho.</Info>

## Por qué existen los bundles

Muchos complementos útiles se publican en formato Codex, Claude o Cursor. En lugar
de requerir que los autores los reescriban como complementos nativos de OpenClaw, OpenClaw
detecta estos formatos y asigna su contenido compatible al conjunto de características
nativo. Esto significa que puede instalar un paquete de comandos de Claude o un bundle de habilidades de Codex
y usarlo inmediatamente.

## Instalar un bundle

<Steps>
  <Step title="Install from a directory, archive, or marketplace">
    ```bash
    # Local directory
    openclaw plugins install ./my-bundle

    # Archive
    openclaw plugins install ./my-bundle.tgz

    # Claude marketplace
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="Verificar detección">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    Los bundles aparecen como `Format: bundle` con un subtipo de `codex`, `claude` o `cursor`.

  </Step>

  <Step title="Reiniciar y usar">
    ```bash
    openclaw gateway restart
    ```

    Las características asignadas (habilidades, enlaces, herramientas MCP) están disponibles en la siguiente sesión.

  </Step>
</Steps>

## Lo que OpenClaw asigna desde los bundles

Hoy en día, no todas las características de los bundles se ejecutan en OpenClaw. Esto es lo que funciona y lo que
detecta pero aún no está conectado.

### Compatible ahora

| Característica           | Cómo se asigna                                                                                                                       | Aplica a           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Contenido de habilidades | Las raíces de habilidades del bundle se cargan como habilidades normales de OpenClaw                                                 | Todos los formatos |
| Comandos                 | `commands/` y `.cursor/commands/` tratados como raíces de habilidades                                                                | Claude, Cursor     |
| Paquetes de enlaces      | Diseños `HOOK.md` + `handler.ts` estilo OpenClaw                                                                                     | Codex              |
| Herramientas MCP         | Configuración MCP del bundle fusionada con la configuración incrustada de Pi; servidores stdio compatibles lanzados como subprocesos | Todos los formatos |
| Configuración            | `settings.json` de Claude importado como valores predeterminados de Pi incrustados                                                   | Claude             |

### Detectado pero no ejecutado

Estos se reconocen y muestran en el diagnóstico, pero OpenClaw no los ejecuta:

- Claude `agents`, `hooks.json` automatización, `lspServers`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- Metadatos en línea/de aplicación de Codex más allá del informe de capacidades

## Formatos de paquetes

<AccordionGroup>
  <Accordion title="Paquetes de Codex">
    Marcadores: `.codex-plugin/plugin.json`

    Contenido opcional: `skills/`, `hooks/`, `.mcp.json`, `.app.json`

    Los paquetes de Codex se adaptan mejor a OpenClaw cuando usan raíces de habilidades y directorios de paquetes de enlace estilo OpenClaw (`HOOK.md` + `handler.ts`).

  </Accordion>

  <Accordion title="Paquetes de Claude">
    Dos modos de detección:

    - **Basado en manifiesto:** `.claude-plugin/plugin.json`
    - **Sin manifiesto:** diseño predeterminado de Claude (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `settings.json`)

    Comportamiento específico de Claude:

    - `commands/` se trata como contenido de habilidad
    - `settings.json` se importa a la configuración de Pi integrada (las claves de anulación de shell se sanitizan)
    - `.mcp.json` expone las herramientas stdio compatibles a Pi integrado
    - `hooks/hooks.json` se detecta pero no se ejecuta
    - Las rutas de componentes personalizados en el manifiesto son aditivas (extienden los valores predeterminados, no los reemplazan)

  </Accordion>

  <Accordion title="Paquetes de Cursor">
    Marcadores: `.cursor-plugin/plugin.json`

    Contenido opcional: `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` se trata como contenido de habilidad
    - `.cursor/rules/`, `.cursor/agents/` y `.cursor/hooks.json` son solo de detección

  </Accordion>
</AccordionGroup>

## Precedencia de detección

OpenClaw verifica primero el formato de complemento nativo:

1. `openclaw.plugin.json` o `package.json` válido con `openclaw.extensions` — se trata como **complemento nativo**
2. Marcadores de paquete (`.codex-plugin/`, `.claude-plugin/` o diseño predeterminado de Claude/Cursor) — se trata como **paquete**

Si un directorio contiene ambos, OpenClaw utiliza la ruta nativa. Esto evita
que los paquetes de formato dual se instalen parcialmente como paquetes.

## Seguridad

Los paquetes tienen un límite de confianza más estrecho que los complementos nativos:

- OpenClaw **no** carga módulos de tiempo de ejecución de paquetes arbitrarios dentro del proceso
- Las rutas de habilidades y paquetes de ganchos deben permanecer dentro de la raíz del complemento (verificación de límites)
- Los archivos de configuración se leen con las mismas verificaciones de límites
- Los servidores MCP stdio admitidos pueden iniciarse como subprocesos

Esto hace que los paquetes sean más seguros por defecto, pero aún debes tratar los
paquetes de terceros como contenido de confianza para las características que exponen.

## Solución de problemas

<AccordionGroup>
  <Accordion title="El paquete se detecta pero las capacidades no se ejecutan">
    Ejecuta `openclaw plugins inspect <id>`. Si una capacidad está listada pero marcada como
no conectada, ese es un límite del producto — no una instalación rota.
  </Accordion>

<Accordion title="Los archivos de comandos de Claude no aparecen">Asegúrese de que el bundle esté habilitado y que los archivos markdown estén dentro de una raíz `commands/` o `skills/` detectada.</Accordion>

<Accordion title="La configuración de Claude no se aplica">Solo se admiten las configuraciones Pi incrustadas de `settings.json`. OpenClaw no trata la configuración de los bundles como parches de configuración sin procesar.</Accordion>

  <Accordion title="Los hooks de Claude no se ejecutan">
    `hooks/hooks.json` es solo de detección. Si necesitas hooks ejecutables, usa el
    diseño de paquetes de hooks de OpenClaw o envía un plugin nativo.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Instalar y configurar plugins](/en/tools/plugin)
- [Construcción de plugins](/en/plugins/building-plugins) — crear un plugin nativo
- [Manifiesto del plugin](/en/plugins/manifest) — esquema de manifiesto nativo
