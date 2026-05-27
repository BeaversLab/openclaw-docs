---
summary: "Instalar paquetes compatibles con Codex, Claude y Cursor como complementos de OpenClaw"
read_when:
  - You want to install a Codex, Claude, or Cursor-compatible bundle
  - You need to know which bundle features OpenClaw executes
  - You are debugging bundle detection, MCP tools, LSP defaults, or missing capabilities
title: "Paquetes de complementos"
doc-schema-version: 1
---

Los paquetes de complementos permiten a OpenClaw reutilizar diseños de complementos compatibles de Codex, Claude y Cursor sin cargarlos como módulos de ejecución nativos de OpenClaw. Use esta página cuando tenga un paquete existente y necesite instalarlo, verificar cómo OpenClaw lo clasificó y entender qué partes se convierten en habilidades, ganchos, herramientas MCP, configuraciones o diagnósticos de OpenClaw.

<Info>Los paquetes no son complementos nativos de OpenClaw. Los complementos nativos se ejecutan en proceso y pueden registrar capacidades de OpenClaw directamente. Los paquetes son paquetes de contenido y metadatos que OpenClaw asigna selectivamente a superficies compatibles.</Info>

## Elegir el formato de complemento adecuado

Use un paquete cuando ya tenga un paquete compatible con Codex, Claude o Cursor
y desee que OpenClaw asigne su contenido compatible a habilidades, paquetes de ganchos,
herramientas MCP, configuraciones o valores predeterminados de LSP sin reescribirlo como un complemento nativo.
Construya un complemento nativo de OpenClaw cuando la integración deba registrar un canal,
proveedor, servicio, ruta HTTP, método de Gateway, comando de CLI propiedad del complemento u
otra capacidad de tiempo de ejecución.

| Necesidad                                                                                                                    | Uso                |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Reutilizar habilidades, markdown de comandos, configuración MCP o valores predeterminados de LSP de un ecosistema compatible | Paquete            |
| Ejecutar código arbitrario de tiempo de ejecución del complemento en OpenClaw                                                | Complemento nativo |
| Publicar una capacidad completa de OpenClaw                                                                                  | Complemento nativo |
| Portar un paquete de comandos existente de Claude o Cursor                                                                   | Paquete            |

Consulte [Building plugins](/es/plugins/building-plugins) para la creación de complementos nativos
y [Plugins](/es/tools/plugin) para el flujo de trabajo de instalación principal.

## Instalar y verificar un paquete

<Steps>
  <Step title="Instalar el paquete">
    Instale desde un directorio local, un archivo o una fuente de mercado compatible:

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

  <Step title="Verificar la detección">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    Un paquete compatible aparece con `Format: bundle` y un subtipo `codex`, `claude`,
    o `cursor`.

  </Step>

  <Step title="Reiniciar el Gateway">
    ```bash
    openclaw gateway restart
    ```

    La instalación o actualización del código del complemento requiere reiniciar el Gateway.

  </Step>
</Steps>

## Lo que OpenClaw asigna desde los paquetes

No todas las características de los paquetes se ejecutan en OpenClaw hoy. OpenClaw asigna el contenido admitido a superficies nativas e informa el contenido de solo detección en los diagnósticos del complemento.

### Admitido actualmente

| Característica           | Cómo se asigna                                                                                                                      | Se aplica a          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Contenido de habilidades | Las raíces de habilidades del paquete se cargan como habilidades normales de OpenClaw                                               | Todos los formatos   |
| Comandos                 | `commands/` y `.cursor/commands/` se tratan como raíces de habilidades                                                              | Claude, Cursor       |
| Paquetes de hooks        | Diseños `HOOK.md` y `handler.ts` o `handler.js` estilo OpenClaw                                                                     | Principalmente Codex |
| Herramientas MCP         | La configuración MCP del paquete se fusiona con la configuración de Pi integrada; los servidores stdio y HTTP admitidos se cargan   | Todos los formatos   |
| Servidores LSP           | Claude `.lsp.json` y `lspServers` declarados en el manifiesto se fusionan con los valores predeterminados de LSP de Pi integrado    | Claude               |
| Configuración            | Claude `settings.json` se importa como valores predeterminados de Pi integrado después de eliminar las claves de anulación de shell | Claude               |

### Contenido de habilidades

Las raíces de habilidades del paquete se cargan como raíces de habilidades normales de OpenClaw. Claude `commands/` y
Cursor `.cursor/commands/` se cargan a través de la misma ruta.

### Paquetes de hooks

Las raíces de hooks del paquete se ejecutan **solo** cuando usan el diseño de paquete de hooks normal de OpenClaw:
`HOOK.md` con `handler.ts` o `handler.js`. Hoy en día, este es principalmente el
caso compatible con Codex.

### Herramientas MCP

Los paquetes habilitados pueden contribuir con la configuración del servidor MCP a Pi integrado como `mcpServers`.
Los servidores stdio y HTTP admitidos pueden exponer herramientas durante los turnos de Pi integrado. Los
perfiles de herramientas `coding` y `messaging` incluyen herramientas MCP de paquetes de forma predeterminada; use
`tools.deny: ["bundle-mcp"]` para optar por no participar para un agente o Gateway.

### Configuración de Pi integrado

Claude `settings.json` se importa como configuración predeterminada de Pi integrado cuando el paquete está
habilitado. OpenClaw elimina las claves de anulación de shell antes de aplicarlas.

### LSP de Pi integrado

Claude `.lsp.json` y `lspServers` declarados en el manifiesto se fusionan en los valores predeterminados del LSP Pi integrado. Se pueden ejecutar los servidores LSP compatibles respaldados por stdio.

### Detectado pero no ejecutado

OpenClaw informa de estos en los diagnósticos pero no los ejecuta:

- Claude `agents`, `hooks/hooks.json`, `outputStyles`
- Cursor `.cursor/agents`, `.cursor/hooks.json`, `.cursor/rules`
- Aplicación Codex o metadatos en línea

## Formatos de bundles y detección

OpenClaw comprueba los marcadores de complementos nativos antes que los marcadores de bundles. Un directorio con
`openclaw.plugin.json` o una entrada `package.json` `openclaw.extensions` válida se
trata como un complemento nativo, incluso si también contiene archivos de bundle. Esto evita
que los paquetes de formato dual se carguen parcialmente a través de la ruta de bundle.

Tras la detección nativa, OpenClaw reconoce estos diseños de bundle:

<AccordionGroup>
  <Accordion title="Bundles de Codex">
    Marcador: `.codex-plugin/plugin.json`

    Contenido mapeado admitido: informes de capacidades de `skills/`, `hooks/`, `.mcp.json` y `.app.json`.

    Los bundles de Codex se adaptan mejor a OpenClaw cuando utilizan raíces de habilidades y directorios de paquetes de hook (hook-pack) estilo OpenClaw.

  </Accordion>

  <Accordion title="Paquetes de Claude">
    Modos de detección:

    - **Basado en manifiesto:** `.claude-plugin/plugin.json`
    - **Sin manifiesto:** diseño predeterminado de Claude con `skills/`, `commands/`,
      `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, o
      `settings.json`

    Contenido mapeado admitido: `skills/`, `commands/`, `settings.json`,
    `.mcp.json`, `.lsp.json`, `mcpServers` declarado en el manifiesto y
    `lspServers` declarado en el manifiesto.

    Contenido de solo detección: `agents`, `hooks/hooks.json` y `outputStyles`.

  </Accordion>

  <Accordion title="Paquetes de Cursor">
    Marcador: `.cursor-plugin/plugin.json`

    Contenido mapeado admitido: `skills/`, `.cursor/commands/` y `.mcp.json`.

    Contenido de solo detección: `.cursor/agents`, `.cursor/hooks.json` y
    `.cursor/rules`.

  </Accordion>
</AccordionGroup>

Las rutas de componentes del manifiesto de Claude son aditivas. Declarar rutas personalizadas extiende las rutas predeterminadas que existen en el paquete en lugar de reemplazarlas.

## Referencia de configuración de MCP

Las herramientas MCP del paquete usan la clave de complemento sintético `bundle-mcp` para el filtrado de perfiles.
Para optar por no participar para un agente o Gateway, deniegue esa clave:

```json5
{
  tools: {
    deny: ["bundle-mcp"],
  },
}
```

La configuración integrada de Pi local al proyecto todavía se aplica después de los valores predeterminados del paquete, por lo que la configuración del espacio de trabajo puede anular las entradas MCP del paquete cuando sea necesario.

### Estructura de configuración de MCP

Los archivos MCP del paquete pueden usar `mcpServers`, `servers` o un mapa de servidor de nivel superior. Los servidores Stdio lanzan un proceso secundario:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "PORT": "3000" }
    }
  }
}
```

Los servidores HTTP se conectan a través de `sse` de forma predeterminada, o `streamable-http` cuando se solicita:

```json
{
  "mcpServers": {
    "my-server": {
      "url": "http://localhost:3100/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer local-dev-token"
      },
      "connectionTimeoutMs": 30000
    }
  }
}
```

Reglas:

- `transport` puede ser `"sse"` o `"streamable-http"`. Cuando se omite, OpenClaw
  usa `sse`.
- `type: "http"` es un alias descendiente nativo de CLI. Se prefiere
  `transport: "streamable-http"` en la configuración del paquete; `openclaw mcp set` y
  `openclaw doctor --fix` normalizan el alias.
- Solo se admiten URL `http:` y `https:`.
- `headers` debe ser un objeto JSON con valores compatibles con cadenas.
- Una entrada de servidor con `command` se trata como stdio. Una entrada de servidor con `url`
  y sin comando se trata como HTTP.
- Las credenciales de la URL, incluida la información del usuario y los parámetros de consulta, se redactan de las descripciones
  de herramientas y los registros.
- `connectionTimeoutMs` anula el tiempo de espera de conexión predeterminado de 30 segundos para
  los transportes stdio y HTTP.

Por seguridad en el inicio de stdio, las entradas de variables de entorno no admitidas se ignoran
con diagnósticos en lugar de pasarse ciegamente.

### Rutas y nombres de herramientas MCP

La configuración MCP respaldada por archivo se resuelve en relación con el archivo de paquete que la declaró.
Los valores relativos explícitos `command`, `args`, `cwd` y `workingDirectory`
se expanden contra el directorio de ese archivo. La configuración del paquete de Claude también puede usar
`${CLAUDE_PLUGIN_ROOT}` para referirse a la raíz del paquete.

OpenClaw registra las herramientas MCP del paquete con nombres seguros para el proveedor:

```text
serverName__toolName
```

Reglas de nomenclatura:

- Los caracteres fuera de `A-Za-z0-9_-` se convierten en `-`.
- Los prefijos del servidor deben comenzar con una letra; las claves de servidor numéricas obtienen un prefijo `mcp-`
  .
- Los nombres de servidor vacíos recurren a `mcp`.
- Los prefijos del servidor están limitados a 30 caracteres.
- Los nombres completos de las herramientas están limitados a 64 caracteres.
- Los nombres sanitizados que colisionan obtienen sufijos numéricos.
- Las herramientas expuestas se ordenan de manera determinista por nombre seguro para que los turnos repetidos de Pi
  mantengan bloques de herramientas estables.
- Las listas de permitidos y bloqueados del perfil pueden nombrar herramientas individuales expuestas o
  la clave del complemento `bundle-mcp`.

## Configuración de Pi incrustada y valores predeterminados de LSP

Los paquetes de Claude habilitados pueden contribuir con valores predeterminados `settings.json` al tiempo de ejecución de Pi integrado. OpenClaw aplica esos ajustes antes que los configurados localmente en el proyecto y, a continuación, sanea las claves de anulación de shell para que los ajustes del paquete o del espacio de trabajo no puedan modificar el comportamiento de ejecución del shell.

Claves saneadas:

- `shellPath`
- `shellCommandPrefix`

Los paquetes de Claude habilitados también pueden aportar configuración del servidor LSP a través de `.lsp.json` o `lspServers` declarado en el manifiesto. OpenClaw fusiona esas entradas en los valores predeterminados de LSP de Pi integrado. Los servidores LSP compatibles con stdio pueden ejecutarse; las entradas de servidores no compatibles aún aparecen en los diagnósticos de `openclaw plugins inspect <id>`.

## Dependencias de tiempo de ejecución y limpieza

Los paquetes de terceros compatibles no reciben reparación de `npm install` al inicio. Instálelos con `openclaw plugins install` e incluya todos los archivos de tiempo de ejecución que necesiten dentro del directorio del complemento instalado.

Los complementos empaquetados propiedad de OpenClaw se distribuyen de forma ligera en el núcleo o se pueden descargar a través del instalador de complementos. El inicio de Gateway no ejecuta un gestor de paquetes para ellos. `openclaw doctor --fix` puede eliminar los directorios de dependencias preparados (staged) heredados y recuperar los complementos descargables que la configuración referencia pero que faltan en el índice local de complementos.

## Límite de seguridad

Los paquetes tienen un límite de tiempo de ejecución más estricto que los complementos nativos:

- OpenClaw no carga módulos de tiempo de ejecución arbitrarios del paquete en el proceso.
- Las raíces de habilidades (skill roots), las rutas de paquetes de enganches (hook-packs), los archivos de configuración, los archivos MCP y los archivos LSP se leen con comprobaciones de límites en la raíz del complemento.
- Los paquetes de enganches estilo OpenClaw deben permanecer dentro de la raíz del complemento.
- Los servidores MCP compatibles con stdio aún pueden iniciar subprocesos.

Trate los paquetes de terceros como contenido de confianza para las características asignadas que exponen, especialmente los servidores MCP y los paquetes de enganches.

## Solución de problemas

| Síntoma                                                         | Verificación                                                                                      | Solución                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| La capacidad está listada pero no se ejecuta                    | Ejecute `openclaw plugins inspect <id>` y compruebe si está marcado como no conectado (not wired) | Este es un límite actual del producto, no una instalación rota                                      |
| Los archivos de comandos de Claude no aparecen como habilidades | Compruebe que los archivos markdown están dentro de `commands/` o una ruta de comandos declarada  | Mueve los archivos bajo una raíz `commands/` o `skills/` detectada, habilita el paquete y reinicia  |
| `settings.json` de Claude no se aplica                          | Verifica que el paquete esté habilitado e inspecciona los diagnósticos                            | Solo se importan las configuraciones de Pi integradas; las claves de anulación de shell se eliminan |
| Los hooks de Claude no se ejecutan                              | Comprueba si el paquete solo tiene `hooks/hooks.json`                                             | Usa un diseño de paquete de hooks de OpenClaw o envía un complemento nativo                         |

## Relacionado

- [Complementos](/es/tools/plugin) - instalar, configurar y solucionar problemas de complementos
- [Administrar complementos](/es/plugins/manage-plugins) - ejemplos comunes de CLI de complementos
- [Inventario de complementos](/es/plugins/plugin-inventory) - lista generada de complementos integrados y externos
- [Manifiesto de complementos](/es/plugins/manifest) - esquema de manifiesto de complementos nativos
- [Construcción de complementos](/es/plugins/building-plugins) - crear un complemento nativo
