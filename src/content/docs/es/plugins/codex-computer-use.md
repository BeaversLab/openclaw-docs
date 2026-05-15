---
summary: "Configure Codex Computer Use para agentes OpenClaw en modo Codex"
title: "Codex Computer Use"
read_when:
  - You want Codex-mode OpenClaw agents to use Codex Computer Use
  - You are deciding between Codex Computer Use, PeekabooBridge, and direct cua-driver MCP
  - You are deciding between Codex Computer Use and a direct cua-driver MCP setup
  - You are configuring computerUse for the bundled Codex plugin
  - You are troubleshooting /codex computer-use status or install
---

Computer Use es un complemento MCP nativo de Codex para el control del escritorio local. OpenClaw
distribuye la aplicación de escritorio, ejecuta acciones de escritorio por sí mismo ni elude
los permisos de Codex. El complemento incluido `codex` solo prepara el servidor de aplicaciones de Codex:
habilita el soporte de complementos de Codex, busca o instala el complemento configurado de
Codex Computer Use, verifica que el servidor MCP `computer-use` esté disponible y
luego permite que Codex sea el propietario de las llamadas a herramientas MCP nativas durante los turnos en modo Codex.

Use esta página cuando OpenClaw ya esté usando el arnés nativo de Codex. Para la
configuración del tiempo de ejecución en sí, consulte [Codex harness](/es/plugins/codex-harness).

## OpenClaw.app y Peekaboo

La integración de Peekaboo en OpenClaw.app es independiente de Codex Computer Use. La
aplicación de macOS puede alojar un socket PeekabooBridge para que la CLI `peekaboo` pueda reutilizar los
permisos locales de Accesibilidad y Grabación de pantalla de la aplicación para las propias
herramientas de automatización de Peekaboo. Ese puente no instala ni representa Codex Computer Use, y
Codex Computer Use no llama a través del socket PeekabooBridge.

Use [Peekaboo bridge](/es/platforms/mac/peekaboo) cuando desee que OpenClaw.app sea
un host con conocimientos de permisos para la automatización de CLI de Peekaboo. Use esta página cuando un
agente OpenClaw en modo Codex deba tener el complemento MCP nativo `computer-use` de Codex
disponible antes de que comience el turno.

## App de iOS

La aplicación de iOS es independiente de Codex Computer Use. No instala ni representa
el servidor MCP `computer-use` de Codex y no es un backend de control de escritorio.
En su lugar, la aplicación de iOS se conecta como un nodo OpenClaw y expone capacidades
móviles a través de comandos de nodo como `canvas.*`, `camera.*`, `screen.*`,
`location.*` y `talk.*`.

Use [iOS](/es/platforms/ios) cuando desee que un agente controle un nodo iPhone a través
del enlace. Use esta página cuando un agente en modo Codex deba controlar el escritorio
local de macOS a través del complemento nativo Computer Use de Codex.

## cua-driver MCP directo

Codex Computer Use no es la única forma de exponer el control del escritorio. Si desea
que los tiempos de ejecución gestionados por OpenClaw llamen al controlador de TryCua directamente, use el servidor
`cua-driver mcp` ascendente a través del registro MCP de OpenClaw en lugar del
flujo del marketplace específico de Codex.

Después de instalar `cua-driver`, pídale el comando de OpenClaw:

```bash
cua-driver mcp-config --client openclaw
```

o registre el servidor stdio usted mismo:

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

Ese camino mantiene intacta la superficie de la herramienta MCP ascendente, incluyendo los esquemas
del controlador y las respuestas MCP estructuradas. Úselo cuando desee que el controlador
CUA esté disponible como un servidor MCP normal de OpenClaw. Use la configuración de Codex Computer Use en
esta página cuando el servidor de aplicaciones de Codex debe ser propietario de la instalación del complemento, las recargas MCP
y las llamadas a herramientas nativas dentro de turnos del modo Codex.

El controlador de CUA es específico de macOS y todavía requiere los permisos locales de macOS
que su aplicación solicita, como Accesibilidad y Grabación de pantalla. OpenClaw
no instala `cua-driver`, concede esos permisos, ni evita el modelo de
seguridad del controlador ascendente.

## Configuración rápida

Establezca `plugins.entries.codex.config.computerUse` cuando los turnos del modo Codex deban tener
Computer Use disponible antes de que inicie un hilo:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Con esta configuración, OpenClaw verifica el servidor de aplicaciones de Codex antes de cada turno del modo Codex.
Si falta Computer Use pero el servidor de aplicaciones de Codex ya ha descubierto un
marketplace instalable, OpenClaw solicita al servidor de aplicaciones de Codex que instale o vuelva a habilitar
el complemento y recargue los servidores MCP. En macOS, cuando no hay un marketplace coincidente
registrado y existe el paquete de aplicación estándar de Codex, OpenClaw también intenta
registrar el marketplace de Codex incluido desde
`/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` antes de que
falle. Si la configuración aún no puede hacer que el servidor MCP esté disponible, el turno falla
antes de que inicie el hilo.

Después de cambiar la configuración de Computer Use, use `/new` o `/reset` en el chat afectado
antes de probar si ya se ha iniciado un hilo de Codex existente.

## Comandos

Use los comandos `/codex computer-use` desde cualquier superficie de chat donde la superficie de comandos
del complemento `codex` esté disponible. Estos son comandos de chat/tiempo de ejecución de OpenClaw,
no subcomandos de la CLI `openclaw codex ...`:

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` es de solo lectura. No añade fuentes de marketplace, instala complementos o habilita el soporte de complementos de Codex.

`install` habilita el soporte de complementos del servidor de aplicaciones de Codex, opcionalmente añade una fuente de marketplace configurada, instala o reactiva el complemento configurado a través del servidor de aplicaciones de Codex, recarga los servidores MCP y verifica que el servidor MCP exponga herramientas.

## Opciones de Marketplace

OpenClaw utiliza la misma API del servidor de aplicaciones que expone el propio Codex. Los campos de marketplace eligen dónde debe encontrar Codex `computer-use`.

| Campo                    | Usar cuando                                                                            | Soporte de instalación                                                      |
| ------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Sin campo de marketplace | Quiere que el servidor de aplicaciones de Codex use los marketplaces que ya conoce.    | Sí, cuando el servidor de aplicaciones devuelve un marketplace local.       |
| `marketplaceSource`      | Tiene una fuente de marketplace de Codex que el servidor de aplicaciones puede añadir. | Sí, para `/codex computer-use install` explícito.                           |
| `marketplacePath`        | Ya conoces la ruta del archivo del marketplace local en el host.                       | Sí, para la instalación explícita y la autoinstalación al inicio del turno. |
| `marketplaceName`        | Deseas seleccionar un marketplace ya registrado por nombre.                            | Sí solo cuando el marketplace seleccionado tiene una ruta local.            |

Los nuevos directorios de inicio de Codex pueden necesitar un breve momento para poblar sus marketplaces oficiales.
Durante la instalación, OpenClaw sondea `plugin/list` por hasta
`marketplaceDiscoveryTimeoutMs` milisegundos. El valor predeterminado es 60 segundos.

Si varios marketplaces conocidos contienen Computer Use, OpenClaw prefiere
`openai-bundled`, luego `openai-curated`, luego `local`. Las coincidencias ambiguas desconocidas
fallan de forma segura y te piden que configures `marketplaceName` o `marketplacePath`.

## Marketplace incluido de macOS

Las compilaciones recientes de escritorio de Codex incluyen Computer Use aquí:

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

Cuando `computerUse.autoInstall` es true y no hay ningún marketplace que contenga
`computer-use` registrado, OpenClaw intenta agregar la raíz del marketplace
del paquete estándar automáticamente:

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

También puede registrarlo explícitamente desde un shell con Codex:

```bash
codex plugin marketplace add /Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

Si usa una ruta de aplicación de Codex no estándar, establezca `computerUse.marketplacePath` en una
ruta de archivo de marketplace local o ejecute `/codex computer-use install --source
<marketplace-source>` una vez.

## Límite del catálogo remoto

El servidor de aplicaciones de Codex puede listar y leer entradas de catálogo solo remotas, pero actualmente no
admite `plugin/install` remoto. Eso significa que `marketplaceName` puede
seleccionar un marketplace solo remoto para verificaciones de estado, pero las instalaciones y reactivaciones
aún necesitan un marketplace local a través de `marketplaceSource` o `marketplacePath`.

Si el estado indica que el complemento está disponible en un mercado remoto de Codex pero la instalación remota no es compatible, ejecute install con una fuente o ruta local:

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## Referencia de configuración

| Campo                           | Predeterminado | Significado                                                                                              |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| `enabled`                       | inferido       | Requerir Computer Use. El valor predeterminado es true cuando se establece otro campo de Computer Use.   |
| `autoInstall`                   | false          | Instalar o volver a habilitar desde mercados ya descubiertos al inicio del turno.                        |
| `marketplaceDiscoveryTimeoutMs` | 60000          | Cuánto tiempo espera la instalación el descubrimiento del mercado del servidor de aplicaciones de Codex. |
| `marketplaceSource`             | sin establecer | Cadena de origen pasada al servidor de aplicaciones de Codex `marketplace/add`.                          |
| `marketplacePath`               | sin establecer | Ruta de archivo del mercado local de Codex que contiene el complemento.                                  |
| `marketplaceName`               | sin establecer | Nombre del mercado de Codex registrado para seleccionar.                                                 |
| `pluginName`                    | `computer-use` | Nombre del complemento del mercado de Codex.                                                             |
| `mcpServerName`                 | `computer-use` | Nombre del servidor MCP expuesto por el complemento instalado.                                           |

La instalación automática al inicio del turno rechaza intencionalmente los valores configurados `marketplaceSource`. Agregar una nueva fuente es una operación de configuración explícita, así que use `/codex computer-use install --source <marketplace-source>` una vez y luego deje que `autoInstall` maneje las reactivaciones futuras desde los mercados locales descubiertos. La instalación automática al inicio del turno puede usar un `marketplacePath` configurado, porque ya es una ruta local en el host.

## Lo que verifica OpenClaw

OpenClaw informa internamente una razón de configuración estable y formatea el estado visible para el usuario para el chat:

| Motivo                       | Significado                                                                    | Siguiente paso                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `disabled`                   | `computerUse.enabled` se resolvió a falso.                                     | Establezca `enabled` u otro campo de Computer Use.                    |
| `marketplace_missing`        | No había ningún marketplace coincidente disponible.                            | Configure la fuente, la ruta o el nombre del marketplace.             |
| `plugin_not_installed`       | El marketplace existe, pero el complemento no está instalado.                  | Ejecute install o habilite `autoInstall`.                             |
| `plugin_disabled`            | El complemento está instalado pero deshabilitado en la configuración de Codex. | Ejecute install para volver a habilitarlo.                            |
| `remote_install_unsupported` | El marketplace seleccionado es solo remoto.                                    | Use `marketplaceSource` o `marketplacePath`.                          |
| `mcp_missing`                | El complemento está habilitado, pero el servidor MCP no está disponible.       | Verifique los permisos de Codex Computer Use y del sistema operativo. |
| `ready`                      | El complemento y las herramientas MCP están disponibles.                       | Inicie el turno en modo Codex.                                        |
| `check_failed`               | Una solicitud de app-server de Codex falló durante la verificación de estado.  | Verifique la conectividad y los registros del app-server.             |
| `auto_install_blocked`       | La configuración al inicio del turno necesitaría añadir una nueva fuente.      | Ejecute primero una instalación explícita.                            |

La salida del chat incluye el estado del complemento, el estado del servidor MCP, el mercado, las herramientas
si están disponibles, y el mensaje específico para el paso de configuración fallido.

## Permisos de macOS

Computer Use es específico de macOS. El servidor MCP propiedad de Codex puede necesitar permisos del sistema operativo local
antes de poder inspeccionar o controlar aplicaciones. Si OpenClaw indica que Computer Use
está instalado pero el servidor MCP no está disponible, verifique primero la configuración de Computer Use
del lado de Codex:

- El app-server de Codex se está ejecutando en el mismo host donde debería
  ocurrir el control del escritorio.
- El complemento Computer Use está habilitado en la configuración de Codex.
- El servidor MCP `computer-use` aparece en el estado MCP del app-server de Codex.
- macOS ha otorgado los permisos necesarios para la aplicación de control del escritorio.
- La sesión del host actual puede acceder al escritorio que se está controlando.

OpenClaw falla intencionalmente de forma cerrada cuando `computerUse.enabled` es verdadero. Un turno en modo Codex no debe proceder silenciosamente sin las herramientas de escritorio nativas que la configuración requería.

## Solución de problemas

**El estado indica que no está instalado.** Ejecute `/codex computer-use install`. Si no se descubre el mercado, pase `--source` o `--marketplace-path`.

**El estado indica que está instalado pero deshabilitado.** Ejecute `/codex computer-use install` nuevamente. La instalación del servidor de aplicaciones de Codex vuelve a escribir la configuración del complemento como habilitada.

**El estado indica que la instalación remota no es compatible.** Utilice una fuente o ruta de mercado local. Las entradas del catálogo solo remotas se pueden inspeccionar pero no instalar a través de la API actual del servidor de aplicaciones.

**El estado indica que el servidor MCP no está disponible.** Vuelva a ejecutar la instalación una vez para que los servidores MCP se recarguen. Si sigue sin estar disponible, repare la aplicación Codex Computer Use, el estado MCP del servidor de aplicaciones Codex o los permisos de macOS.

**El estado o una sonda agotan el tiempo de espera en `computer-use.list_apps`.** El complemento y el servidor MCP están presentes, pero el puente local de Computer Use no respondió. Cierre o reinicie Codex Computer Use, relance Codex Desktop si es necesario y luego vuelva a intentarlo en una sesión nueva de OpenClaw.

**Una herramienta de Computer Use indica `Native hook relay unavailable`.** El enlace de herramienta nativo de Codex no pudo alcanzar un relevo activo de OpenClaw a través del puente local o la alternativa de Gateway. Inicie una sesión nueva de OpenClaw con `/new` o `/reset`. Si sigue sucediendo, reinicie la puerta de enlace para que se eliminen los subprocesos antiguos del servidor de aplicaciones y los registros de enlaces, y luego vuelva a intentarlo.

**La autoinstalación al inicio del turno rechaza una fuente.** Esto es intencional. Agregue la fuente con `/codex computer-use install --source <marketplace-source>`
explícito primero, y luego la autoinstalación al inicio de turnos futuros podrá utilizar el mercado local descubierto.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Puente Peekaboo](/es/platforms/mac/peekaboo)
- [Aplicación iOS](/es/platforms/ios)
