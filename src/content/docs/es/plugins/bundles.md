---
summary: "Instala y usa paquetes de Codex, Claude y Cursor como complementos de OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to understand how OpenClaw maps bundle content into native features
  - You are debugging bundle detection or missing capabilities
title: "Paquetes de complementos"
---

OpenClaw puede instalar complementos de tres ecosistemas externos: **Codex**, **Claude**
y **Cursor**. Estos se denominan **paquetes** (bundles): paquetes de contenido y metadatos que
OpenClaw asigna a características nativas como habilidades, enlaces y herramientas de MCP.

<Info>Los paquetes **no** son lo mismo que los complementos nativos de OpenClaw. Los complementos nativos se ejecutan en proceso y pueden registrar cualquier capacidad. Los paquetes son paquetes de contenido con asignación de características selectiva y un límite de confianza más estrecho.</Info>

## Por qué existen los paquetes

Muchos complementos útiles se publican en formato Codex, Claude o Cursor. En lugar de
requerir que los autores los reescriban como complementos nativos de OpenClaw, OpenClaw
detecta estos formatos y asigna su contenido admitido al conjunto de características
nativas. Esto significa que puede instalar un paquete de comandos de Claude o un paquete de habilidades de Codex
y usarlo de inmediato.

## Instalar un paquete

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

| Característica           | Cómo se asigna                                                                                                                            | Aplica a           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Contenido de habilidades | Las raíces de habilidades del bundle se cargan como habilidades normales de OpenClaw                                                      | Todos los formatos |
| Comandos                 | `commands/` y `.cursor/commands/` tratados como raíces de habilidades                                                                     | Claude, Cursor     |
| Paquetes de enlaces      | Diseños `HOOK.md` + `handler.ts` estilo OpenClaw                                                                                          | Codex              |
| Herramientas MCP         | Configuración MCP del paquete fusionada en la configuración de OpenClaw integrado; servidores stdio y HTTP compatibles cargados           | Todos los formatos |
| Servidores LSP           | `.lsp.json` de Claude y `lspServers` declarados en el manifiesto se fusionan en los valores predeterminados del LSP de OpenClaw integrado | Claude             |
| Configuración            | `settings.json` de Claude importado como valores predeterminados de OpenClaw integrado                                                    | Claude             |

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

#### MCP para OpenClaw integrado

- los paquetes habilitados pueden contribuir con la configuración del servidor MCP
- OpenClaw fusiona la configuración MCP del paquete en la configuración efectiva de OpenClaw integrado como
  `mcpServers`
- OpenClaw expone las herramientas MCP del paquete compatibles durante los turnos del agente de OpenClaw integrado
  iniciando servidores stdio o conectándose a servidores HTTP
- los perfiles de herramientas `coding` y `messaging` incluyen herramientas MCP de paquetes por
  defecto; use `tools.deny: ["bundle-mcp"]` para optar por no participar para un agente o puerta de enlace
- la configuración del agente integrado local del proyecto todavía se aplica después de los valores predeterminados del paquete, por lo que la configuración del espacio de trabajo puede anular las entradas MCP del paquete cuando sea necesario
- los catálogos de herramientas MCP de paquetes se ordenan de forma determinista antes del registro, por lo que
  los cambios en el orden `listTools()` aguas arriba no alteran los bloques de herramientas de caché de aviso

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
- `type: "http"` es una forma descendente nativa de CLI; use `transport: "streamable-http"` en la configuración de OpenClaw. `openclaw mcp set` y `openclaw doctor --fix` normalizan el alias común.
- solo se permiten los esquemas de URL `http:` y `https:`
- los valores `headers` admiten la interpolación `${ENV_VAR}`
- se rechaza una entrada de servidor con ambos `command` y `url`
- las credenciales de URL (información de usuario y parámetros de consulta) se redactan de las descripciones de herramientas y los registros
- `connectionTimeoutMs` anula el tiempo de espera de conexión predeterminado de 30 segundos
  tanto para transportes stdio como HTTP

##### Nomenclatura de herramientas

OpenClaw registra las herramientas MCP de los paquetes con nombres seguros para el proveedor en el formato
`serverName__toolName`. Por ejemplo, un servidor con clave `"vigil-harbor"` que exponga una
herramienta `memory_search` se registra como `vigil-harbor__memory_search`.

- los caracteres fuera de `A-Za-z0-9_-` se reemplazan por `-`
- los fragmentos que comenzarían con una letra que no es una letra reciben un prefijo de letra, por lo que las claves de servidor numéricas como `12306` se convierten en prefijos de herramientas seguros para el proveedor
- los prefijos de servidor tienen un límite de 30 caracteres
- los nombres completos de las herramientas tienen un límite de 64 caracteres
- los nombres de servidor vacíos vuelven a `mcp`
- los nombres saneados que colisionan se desambiguan con sufijos numéricos
- el orden final de las herramientas expuestas es determinista por nombre seguro para mantener los turnos repetidos del agente integrado estables en caché
- el filtrado de perfiles trata todas las herramientas de un servidor MCP de un paquete como propiedad del complemento `bundle-mcp`, por lo que las listas de permitidos y denegados del perfil pueden incluir nombres de herramientas expuestas individuales o la clave del complemento `bundle-mcp`

#### Configuración de OpenClaw integrado

- `settings.json` de Claude se importa como configuración predeterminada de OpenClaw integrado cuando el
  paquete está habilitado
- OpenClaw sanea las claves de anulación de shell antes de aplicarlas

Claves saneadas:

- `shellPath`
- `shellCommandPrefix`

#### LSP de OpenClaw integrado

- los paquetes Claude habilitados pueden contribuir con la configuración del servidor LSP
- OpenClaw carga `.lsp.json` más cualquier ruta `lspServers` declarada en el manifiesto
- la configuración LSP del paquete se fusiona en los valores predeterminados efectivos del LSP de OpenClaw integrado
- solo los servidores LSP compatibles con stdio son ejecutables hoy; los transportes no compatibles aún aparecen en `openclaw plugins inspect <id>`

### Detectado pero no ejecutado

Estos se reconocen y muestran en los diagnósticos, pero OpenClaw no los ejecuta:

- Claude `agents`, automatización `hooks.json`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- metadatos en línea/aplicación de Codex más allá del informe de capacidades

## Formatos de paquete

<AccordionGroup>
  <Accordion title="Paquetes de Codex">
    Marcadores: `.codex-plugin/plugin.json`

    Contenido opcional: `skills/`, `hooks/`, `.mcp.json`, `.app.json`

    Los paquetes de Codex se adaptan mejor a OpenClaw cuando utilizan raíces de habilidades y directorios de paquetes de enganches (hook packs) al estilo de OpenClaw (`HOOK.md` + `handler.ts`).

  </Accordion>

  <Accordion title="Paquetes de Claude">
    Dos modos de detección:

    - **Basado en manifiesto:** `.claude-plugin/plugin.json`
    - **Sin manifiesto:** diseño predeterminado de Claude (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`, `.lsp.json`, `settings.json`)

    Comportamiento específico de Claude:

    - `commands/` se trata como contenido de habilidad
    - `settings.json` se importa en la configuración de OpenClaw integrado (las claves de anulación de shell se sanitizan)
    - `.mcp.json` expone herramientas stdio compatibles a OpenClaw integrado
    - `.lsp.json` más las rutas `lspServers` declaradas en el manifiesto se cargan en los valores predeterminados del LSP de OpenClaw integrado
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

OpenClaw comprueba primero el formato de complemento nativo:

1. `openclaw.plugin.json` o `package.json` válido con `openclaw.extensions` — tratado como **plugin nativo**
2. Marcadores de paquete (`.codex-plugin/`, `.claude-plugin/`, o diseño predeterminado de Claude/Cursor) — tratado como **paquete**

Si un directorio contiene ambos, OpenClaw utiliza la ruta nativa. Esto evita
que los paquetes de doble formato se instalen parcialmente como paquetes.

## Dependencias de tiempo de ejecución y limpieza

- Los paquetes compatibles de terceros no reciben reparación de `npm install` al inicio. Deben
  instalarse a través de `openclaw plugins install` e incluir todo lo que
  necesitan en el directorio del plugin instalado.
- Los plugins empaquetados propiedad de OpenClaw se envían de forma ligera en el núcleo o
  se pueden descargar a través del instalador de plugins. El inicio de Gateway nunca ejecuta un
  gestor de paquetes para ellos.
- `openclaw doctor --fix` elimina los directorios de dependencias preparados heredados y puede
  recuperar plugins descargables que faltan en el índice de plugins local cuando
  la configuración los referencia.

## Seguridad

Los paquetes tienen un límite de confianza más estrecho que los plugins nativos:

- OpenClaw **no** carga módulos de tiempo de ejecución de paquetes arbitrarios dentro del proceso
- Las rutas de habilidades y paquetes de hooks deben permanecer dentro de la raíz del plugin (verificadas por límites)
- Los archivos de configuración se leen con las mismas comprobaciones de límites
- Los servidores MCP stdio compatibles pueden lanzarse como subprocesos

Esto hace que los paquetes sean más seguros por defecto, pero aún debe tratar los paquetes
de terceros como contenido de confianza para las características que exponen.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Se detecta el paquete pero las capacidades no se ejecutan">
    Ejecute `openclaw plugins inspect <id>`. Si una capacidad está listada pero marcada como
no conectada, es un límite del producto — no una instalación rota.
  </Accordion>

<Accordion title="Los archivos de comandos de Claude no aparecen">Asegúrese de que el paquete esté habilitado y que los archivos markdown estén dentro de una raíz `commands/` o `skills/` detectada.</Accordion>

<Accordion title="Claude settings do not apply">Solo se admiten la configuración incorporada de OpenClaw de `settings.json`. OpenClaw no trata la configuración de los paquetes como parches de configuración sin procesar.</Accordion>

  <Accordion title="Los hooks de Claude no se ejecutan">
    `hooks/hooks.json` es solo de detección. Si necesita hooks ejecutables, use el
    diseño de paquete de hooks de OpenClaw o envíe un complemento nativo.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Instalar y configurar complementos](/es/tools/plugin)
- [Construcción de complementos](/es/plugins/building-plugins) — crear un complemento nativo
- [Manifiesto de complementos](/es/plugins/manifest) — esquema de manifiesto nativo
