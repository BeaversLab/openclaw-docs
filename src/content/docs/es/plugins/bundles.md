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

    Los paquetes se muestran como `Format: bundle` con un subtipo de `codex`, `claude` o `cursor`.

  </Step>

  <Step title="Reinicia y usa">
    ```bash
    openclaw gateway restart
    ```

    Las características asignadas (habilidades, ganchos, herramientas MCP, valores predeterminados de LSP) están disponibles en la siguiente sesión.

  </Step>
</Steps>

## Lo que OpenClaw asigna desde los bundles

Hoy en día, no todas las características de los bundles se ejecutan en OpenClaw. Esto es lo que funciona y lo que
detecta pero aún no está conectado.

### Compatible ahora

| Característica           | Cómo se asigna                                                                                                                | Aplica a           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Contenido de habilidades | Las raíces de habilidades del bundle se cargan como habilidades normales de OpenClaw                                          | Todos los formatos |
| Comandos                 | `commands/` y `.cursor/commands/` tratados como raíces de habilidades                                                         | Claude, Cursor     |
| Paquetes de enlaces      | Diseños `HOOK.md` + `handler.ts` estilo OpenClaw                                                                              | Codex              |
| Herramientas MCP         | Configuración MCP del paquete fusionada con la configuración integrada de Pi; servidores stdio y HTTP compatibles cargados    | Todos los formatos |
| Servidores LSP           | Claude `.lsp.json` y `lspServers` declarados en el manifiesto se fusionan en los valores predeterminados LSP de Pi integrados | Claude             |
| Configuración            | Claude `settings.json` importado como valores predeterminados de Pi integrados                                                | Claude             |

#### Contenido de habilidades

- las raíces de habilidades del paquete se cargan como raíces de habilidades normales de OpenClaw
- las raíces `commands` de Claude se tratan como raíces de habilidades adicionales
- las raíces `.cursor/commands` de Cursor se tratan como raíces de habilidades adicionales

Esto significa que los archivos de comandos de markdown de Claude funcionan a través del cargador de habilidades normal de OpenClaw. Los comandos de markdown de Cursor funcionan a través de la misma ruta.

#### Paquetes de ganchos

- las raíces de ganchos del paquete funcionan **solo** cuando usan el diseño normal de paquete de ganchos de OpenClaw.
  Hoy en día, este es principalmente el caso compatible con Codex:
  - `HOOK.md`
  - `handler.ts` o `handler.js`

#### MCP para Pi

- los paquetes habilitados pueden contribuir con la configuración del servidor MCP
- OpenClaw fusiona la configuración MCP del paquete en la configuración efectiva de Pi integrada como
  `mcpServers`
- OpenClaw expone las herramientas MCP de paquetes compatibles durante los turnos del agente Pi integrado al
  iniciar servidores stdio o conectarse a servidores HTTP
- la configuración local de proyecto de Pi todavía se aplica después de los valores predeterminados del paquete, por lo que la configuración
  del espacio de trabajo puede anular las entradas MCP del paquete cuando sea necesario
- los catálogos de herramientas MCP del paquete se ordenan de manera determinista antes del registro, por lo que
  los cambios en el orden `listTools()` ascendente no afectan negativamente a los bloques de herramientas del caché de avisos

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

**HTTP** se conecta a un servidor MCP en ejecución a través de `sse` de forma predeterminada, o `streamable-http` cuando se solicita:

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

- `transport` puede configurarse como `"streamable-http"` o `"sse"`; cuando se omite, OpenClaw usa `sse`
- solo se permiten los esquemas de URL `http:` y `https:`
- `headers` valores soportan `${ENV_VAR}` interpolación
- una entrada de servidor con ambos `command` y `url` es rechazada
- las credenciales de URL (información de usuario y parámetros de consulta) se redactan de las descripciones de herramientas y registros
- `connectionTimeoutMs` anula el tiempo de espera de conexión predeterminado de 30 segundos para transportes stdio y HTTP

##### Nomenclatura de herramientas

OpenClaw registra herramientas MCP de paquete con nombres seguros para el proveedor en la forma `serverName__toolName`. Por ejemplo, un servidor con clave `"vigil-harbor"` que expone una herramienta `memory_search` se registra como `vigil-harbor__memory_search`.

- los caracteres fuera de `A-Za-z0-9_-` se reemplazan con `-`
- los prefijos del servidor están limitados a 30 caracteres
- los nombres completos de las herramientas están limitados a 64 caracteres
- los nombres de servidor vacíos usan por defecto `mcp`
- los nombres saneados que colisionan se desambiguan con sufijos numéricos
- el orden final de las herramientas expuestas es determinista por nombre seguro para mantener los turnos de Pi repetidos estables en caché

#### Configuración de Pi integrada

- Claude `settings.json` se importa como configuración de Pi integrada predeterminada cuando el paquete está habilitado
- OpenClaw sanea las claves de anulación de shell antes de aplicarlas

Claves saneadas:

- `shellPath`
- `shellCommandPrefix`

#### LSP de Pi integrada

- los paquetes Claude habilitados pueden contribuir con la configuración del servidor LSP
- OpenClaw carga `.lsp.json` más cualquier ruta `lspServers` declarada en el manifiesto
- la configuración LSP del paquete se fusiona con los valores predeterminados efectivos de la LSP de Pi integrada
- solo los servidores LSP compatibles con stdio se pueden ejecutar hoy; los transportes no compatibles aún aparecen en `openclaw plugins inspect <id>`

### Detectado pero no ejecutado

Estos se reconocen y muestran en los diagnósticos, pero OpenClaw no los ejecuta:

- Claude `agents`, automatización `hooks.json`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- metadatos en línea/de aplicación de Codex más allá del informe de capacidades

## Formatos de paquete

<AccordionGroup>
  <Accordion title="Paquetes Codex">
    Marcadores: `.codex-plugin/plugin.json`

    Contenido opcional: `skills/`, `hooks/`, `.mcp.json`, `.app.json`

    Los paquetes Codex se adaptan mejor a OpenClaw cuando usan raíces de habilidades y directorios de paquetes de hook estilo OpenClaw (`HOOK.md` + `handler.ts`).

  </Accordion>

  <Accordion title="Paquetes Claude">
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

  <Accordion title="Paquetes Cursor">
    Marcadores: `.cursor-plugin/plugin.json`

    Contenido opcional: `skills/`, `.cursor/commands/`, `.cursor/agents/`, `.cursor/rules/`, `.cursor/hooks.json`, `.mcp.json`

    - `.cursor/commands/` se trata como contenido de habilidad
    - `.cursor/rules/`, `.cursor/agents/` y `.cursor/hooks.json` son solo de detección

  </Accordion>
</AccordionGroup>

## Precedencia de detección

OpenClaw comprueba primero el formato de complemento nativo:

1. `openclaw.plugin.json` o `package.json` válido con `openclaw.extensions` — tratado como **complemento nativo**
2. Marcadores de paquete (`.codex-plugin/`, `.claude-plugin/` o diseño predeterminado de Claude/Cursor) — tratado como **paquete**

Si un directorio contiene ambos, OpenClaw usa la ruta nativa. Esto evita que
los paquetes de formato dual se instalen parcialmente como paquetes.

## Seguridad

Los paquetes tienen un límite de confianza más estricto que los complementos nativos:

- OpenClaw **no** carga módulos de tiempo de ejecución de paquetes arbitrarios en proceso
- Las rutas de habilidades y paquetes de enlaces deben permanecer dentro de la raíz del complemento (verificado por límites)
- Los archivos de configuración se leen con las mismas verificaciones de límites
- Los servidores MCP stdio compatibles pueden lanzarse como subprocesos

Esto hace que los paquetes sean más seguros de forma predeterminada, pero aún debe tratar los
paquetes de terceros como contenido de confianza para las funciones que exponen.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Se detecta el paquete pero las capacidades no se ejecutan">
    Ejecute `openclaw plugins inspect <id>`. Si una capacidad está listada pero marcada como
    no conectada, ese es un límite del producto, no una instalación rota.
  </Accordion>

<Accordion title="Los archivos de comandos de Claude no aparecen">Asegúrese de que el paquete esté habilitado y los archivos markdown estén dentro de una raíz `commands/` o `skills/` detectada.</Accordion>

<Accordion title="La configuración de Claude no se aplica">Solo se admiten las configuraciones Pi integradas de `settings.json`. OpenClaw no trata la configuración del paquete como parches de configuración sin procesar.</Accordion>

  <Accordion title="Los enlaces de Claude no se ejecutan">
    `hooks/hooks.json` es solo de detección. Si necesita enlaces ejecutables, use el
    diseño de paquete de enlaces de OpenClaw o envíe un complemento nativo.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Instalar y configurar complementos](/es/tools/plugin)
- [Crear complementos](/es/plugins/building-plugins) — crear un complemento nativo
- [Manifiesto de complemento](/es/plugins/manifest) — esquema de manifiesto nativo
