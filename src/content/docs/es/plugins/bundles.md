---
summary: "Instala y usa paquetes de Codex, Claude y Cursor como complementos de OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "Paquetes de complementos"
---

# Bundles de complementos

OpenClaw puede instalar complementos de tres ecosistemas externos: **Codex**, **Claude**
y **Cursor**. Estos se denominan **bundles** — paquetes de contenido y metadatos que
OpenClaw asigna a características nativas como habilidades, enlaces y herramientas MCP.

<Info>Los paquetes **no** son lo mismo que los complementos nativos de OpenClaw. Los complementos nativos se ejecutan en proceso y pueden registrar cualquier capacidad. Los paquetes son paquetes de contenido con mapeo de características selectivo y un límite de confianza más estrecho.</Info>

## Por qué existen los bundles

Muchos complementos útiles se publican en formato Codex, Claude o Cursor. En lugar
de requerir que los autores los reescriban como complementos nativos de OpenClaw, OpenClaw
detecta estos formatos y asigna su contenido compatible al conjunto de características
nativo. Esto significa que puede instalar un paquete de comandos de Claude o un bundle de habilidades de Codex
y usarlo inmediatamente.

## Instalar un bundle

<Steps>
  <Step title="Instalar desde un directorio, archivo o mercado">
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

    Los paquetes se muestran como `Format: bundle` con un subtipo de `codex`, `claude` o `cursor`.

  </Step>

  <Step title="Reiniciar y usar">
    ```bash
    openclaw gateway restart
    ```

    Las funciones asignadas (habilidades, hooks, herramientas MCP, valores predeterminados de LSP) están disponibles en la siguiente sesión.

  </Step>
</Steps>

## Lo que OpenClaw asigna de los paquetes

No todas las funciones de los paquetes se ejecutan en OpenClaw hoy. Aquí tienes lo que funciona y lo
que se detecta pero aún no está conectado.

### Soportado ahora

| Característica           | Cómo se asigna                                                                                                                      | Aplica a           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Contenido de habilidades | Las raíces de habilidades del paquete se cargan como habilidades normales de OpenClaw                                               | Todos los formatos |
| Comandos                 | `commands/` y `.cursor/commands/` tratados como raíces de habilidades                                                               | Claude, Cursor     |
| Paquetes de hooks        | Disposición `HOOK.md` + `handler.ts` estilo OpenClaw                                                                                | Codex              |
| Herramientas MCP         | Configuración MCP del paquete fusionada con la configuración integrada de Pi; se cargan los servidores stdio y HTTP compatibles     | Todos los formatos |
| Servidores LSP           | `.lsp.json` de Claude y `lspServers` declarados en el manifiesto fusionados con los valores predeterminados de LSP de Pi integrados | Claude             |
| Configuración            | `settings.json` de Claude importados como valores predeterminados de Pi integrados                                                  | Claude             |

#### Contenido de habilidades

- las raíces de habilidades del paquete se cargan como raíces de habilidades normales de OpenClaw
- Las raíces `commands` de Claude se tratan como raíces de habilidades adicionales
- Las raíces `.cursor/commands` de Cursor se tratan como raíces de habilidades adicionales

Esto significa que los archivos de comandos de markdown de Claude funcionan a través del cargador de habilidades
normal de OpenClaw. El markdown de comandos de Cursor funciona a través de la misma ruta.

#### Paquetes de hooks

- las raíces de hooks del paquete funcionan **solo** cuando usan la disposición de paquetes de hooks
  normal de OpenClaw. Hoy en día, este es principalmente el caso compatible con Codex:
  - `HOOK.md`
  - `handler.ts` o `handler.js`

#### MCP para Pi

- los paquetes habilitados pueden contribuir con la configuración del servidor MCP
- OpenClaw fusiona la configuración MCP del paquete en la configuración efectiva de Pi integrada como
  `mcpServers`
- OpenClaw expone las herramientas MCP de paquetes admitidas durante los turnos del agente Pi integrado
  iniciando servidores stdio o conectándose a servidores HTTP
- la configuración de Pi local al proyecto todavía se aplica después de los valores predeterminados del paquete, por lo que
  la configuración del espacio de trabajo puede anular las entradas MCP del paquete cuando sea necesario
- los catálogos de herramientas MCP del paquete se ordenan de manera determinista antes del registro, por lo que los cambios de orden en `listTools()`
  no desestabilizan los bloques de herramientas de caché de avisos

##### Transportes

Los servidores MCP pueden usar transporte stdio o HTTP:

**Stdio** inicia un proceso secundario:

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "PORT": "3000" }
      }
    }
  }
}
```

**HTTP** se conecta a un servidor MCP en ejecución a través de `sse` de manera predeterminada, o `streamable-http` cuando se solicita:

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "http://localhost:3100/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${MY_SECRET_TOKEN}"
        },
        "connectionTimeoutMs": 30000
      }
    }
  }
}
```

- `transport` puede establecerse en `"streamable-http"` o `"sse"`; cuando se omite, OpenClaw usa `sse`
- solo se permiten los esquemas de URL `http:` y `https:`
- los valores de `headers` admiten la interpolación de `${ENV_VAR}`
- se rechaza una entrada de servidor con `command` y `url`
- las credenciales de URL (userinfo y parámetros de consulta) se redactan de las descripciones de herramientas
  y los registros
- `connectionTimeoutMs` anula el tiempo de espera de conexión predeterminado de 30 segundos para
  los transportes stdio y HTTP

##### Nomenclatura de herramientas

OpenClaw registra las herramientas MCP del paquete con nombres seguros para el proveedor en la forma
`serverName__toolName`. Por ejemplo, un servidor con clave `"vigil-harbor"` que exponga una
herramienta `memory_search` se registra como `vigil-harbor__memory_search`.

- los caracteres fuera de `A-Za-z0-9_-` se reemplazan con `-`
- los prefijos del servidor se limitan a 30 caracteres
- los nombres completos de las herramientas se limitan a 64 caracteres
- los nombres de servidor vacíos vuelven a `mcp`
- los nombres saneados que colisionan se desambiguan con sufijos numéricos
- el orden final de las herramientas expuestas es determinista por nombre seguro para mantener los turnos Pi
  repetidos estables en caché

#### Configuración de Pi integrada

- Se importa Claude `settings.json` como configuración Pi incorporada predeterminada cuando se
  habilita el bundle
- OpenClaw sanea las claves de anulación de shell antes de aplicarlas

Claves saneadas:

- `shellPath`
- `shellCommandPrefix`

#### LSP de Pi incorporado

- los bundles de Claude habilitados pueden aportar configuración del servidor LSP
- OpenClaw carga `.lsp.json` más cualquier ruta `lspServers` declarada en el manifiesto
- la configuración LSP del bundle se fusiona con los valores predeterminados efectivos del LSP de Pi incorporado
- solo se pueden ejecutar hoy los servidores LSP compatibles con stdio; los transportes no compatibles
  todavía aparecen en `openclaw plugins inspect <id>`

### Detectado pero no ejecutado

Estos se reconocen y muestran en los diagnósticos, pero OpenClaw no los ejecuta:

- Claude `agents`, automatización `hooks.json`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- Metadatos de aplicación/en línea de Codex más allá del informe de capacidades

## Formatos de bundles

<AccordionGroup>
  <Accordion title="Bundles de Codex">
    Marcadores: `.codex-plugin/plugin.json`

    Contenido opcional: `skills/`, `hooks/`, `.mcp.json`, `.app.json`

    Los bundles de Codex se adaptan mejor a OpenClaw cuando usan raíces de habilidades y directorios de paquetes de "hook" estilo OpenClaw
    (`HOOK.md` + `handler.ts`).

  </Accordion>

  <Accordion title="Claude bundles">
    Dos modos de detección:

    - **Basado en manifiesto:** `.claude-plugin/plugin.json`
    - **Sin manifiesto:** diseño predeterminado de Claude (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `settings.json`)

    Comportamiento específico de Claude:

    - `commands/` se trata como contenido de habilidad
    - `settings.json` se importa en la configuración de Pi integrado (las claves de anulación de shell se sanitizan)
    - `.mcp.json` expone las herramientas stdio compatibles a Pi integrado
    - `.lsp.json` más las rutas `lspServers` declaradas en el manifiesto se cargan en los valores predeterminados del LSP de Pi integrado
    - `hooks/hooks.json` se detecta pero no se ejecuta
    - Las rutas de componentes personalizados en el manifiesto son aditivas (extienden los valores predeterminados, no los reemplazan)

  </Accordion>

  <Accordion title="Cursor bundles">
    Marcadores: `.cursor-plugin/plugin.json`

    Contenido opcional: `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` se trata como contenido de habilidad
    - `.cursor/rules/`, `.cursor/agents/` y `.cursor/hooks.json` son solo de detección

  </Accordion>
</AccordionGroup>

## Precedencia de detección

OpenClaw verifica primero el formato de complemento nativo:

1. `openclaw.plugin.json` o `package.json` válido con `openclaw.extensions` — tratado como **complemento nativo**
2. Marcadores de paquete (`.codex-plugin/`, `.claude-plugin/`, o diseño predeterminado de Claude/Cursor) — tratado como **paquete**

Si un directorio contiene ambos, OpenClaw usa la ruta nativa. Esto evita que los paquetes de doble formato se instalen parcialmente como paquetes.

## Seguridad

Los paquetes tienen un límite de confianza más estrecho que los complementos nativos:

- OpenClaw **no** carga módulos de tiempo de ejecución de paquetes arbitrarios en proceso
- Las rutas de las habilidades y los paquetes de ganchos deben permanecer dentro de la raíz del complemento (verificación de límites)
- Los archivos de configuración se leen con las mismas verificaciones de límites
- Los servidores MCP stdio compatibles pueden lanzarse como subprocesos

Esto hace que los paquetes sean más seguros por defecto, pero aún debes tratar los paquetes de terceros como contenido de confianza para las funciones que exponen.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Se detecta el paquete pero las capacidades no se ejecutan">
    Ejecuta `openclaw plugins inspect <id>`. Si se lista una capacidad pero se marca como
    no conectada, ese es un límite del producto, no una instalación rota.
  </Accordion>

<Accordion title="Los archivos de comandos de Claude no aparecen">Asegúrate de que el paquete esté habilitado y que los archivos markdown estén dentro de una raíz `commands/` o `skills/` detectada.</Accordion>

<Accordion title="La configuración de Claude no se aplica">Solo se admiten las configuraciones Pi integradas de `settings.json`. OpenClaw no trata la configuración del paquete como parches de configuración sin procesar.</Accordion>

  <Accordion title="Los ganchos de Claude no se ejecutan">
    `hooks/hooks.json` es solo de detección. Si necesitas ganchos ejecutables, usa el
    diseño de paquete de ganchos de OpenClaw o envía un complemento nativo.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Instalar y configurar complementos](/es/tools/plugin)
- [Crear complementos](/es/plugins/building-plugins) — crear un complemento nativo
- [Manifiesto del complemento](/es/plugins/manifest) — esquema de manifiesto nativo
