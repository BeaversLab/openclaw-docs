---
summary: "Configurar complementos nativos de Codex migrados para agentes OpenClaw en modo Codex"
title: "Complementos nativos de Codex"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La compatibilidad con complementos nativos de Codex permite que un agente OpenClaw en modo Codex utilice las capacidades de aplicación y complemento propias del servidor de aplicaciones Codex dentro del mismo hilo de Codex que maneja el turno de OpenClaw.

OpenClaw no traduce los complementos de Codex en herramientas dinámicas `codex_plugin_*`
de OpenClaw sintéticas. Las llamadas a los complementos permanecen en la transcripción nativa de Codex y
Codex app-server es el propietario de la ejecución de MCP respaldada por la aplicación.

Use esta página después de que el [arnés de Codex](/es/plugins/codex-harness) base esté funcionando.

## Requisitos

- El tiempo de ejecución del agente OpenClaw seleccionado debe ser el arnés nativo de Codex.
- `plugins.entries.codex.enabled` debe ser true.
- `plugins.entries.codex.config.codexPlugins.enabled` debe ser true.
- V1 solo admite complementos `openai-curated` que la migración observó como
  instalados desde la fuente en el hogar de Codex de origen.
- El servidor de aplicaciones Codex de destino debe poder ver el mercado,
  el complemento y el inventario de aplicaciones esperados.

`codexPlugins` no tiene ningún efecto en las ejecuciones de PI, las ejecuciones normales del proveedor de OpenAI, los enlaces de conversación de ACP
u otros arneses porque esas rutas no crean
hilos de Codex app-server con configuración nativa `apps`.

## Inicio rápido

Vista previa de la migración desde el origen de Codex:

```bash
openclaw migrate codex --dry-run
```

Use la verificación estricta de la aplicación de origen cuando desee que la migración verifique la accesibilidad de la aplicación de origen
antes de planificar la activación del complemento nativo:

```bash
openclaw migrate codex --dry-run --verify-plugin-apps
```

Aplique la migración cuando el plan parezca correcto:

```bash
openclaw migrate apply codex --yes
```

La migración escribe entradas explícitas `codexPlugins` para los complementos elegibles y llama
a Codex app-server `plugin/install` para los complementos seleccionados. Una configuración migrada
típica se ve así:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

Después de cambiar `codexPlugins`, use `/new`, `/reset`, o reinicie la puerta de enlace para
que las sesiones futuras del arnés de Codex comiencen con el conjunto de aplicaciones actualizado.

## Cómo funciona la configuración de complementos nativos

La integración tiene tres estados separados:

- Instalado: Codex tiene el paquete de complementos locales en el tiempo de ejecución del servidor de aplicaciones de destino.
- Habilitado: La configuración de OpenClaw está dispuesta a hacer que el complemento esté disponible para los turnos
  del arnés de Codex.
- Accesible: Codex app-server confirma que las entradas de la aplicación del complemento están disponibles
  para la cuenta activa y se pueden asignar a la identidad del complemento migrado.

La migración es el paso duradero de instalación/elegibilidad. Durante la planificación, OpenClaw
lee los detalles de `plugin/read` de Codex de origen y comprueba que la respuesta de cuenta
del servidor de aplicaciones Codex de origen sea una cuenta de suscripción a ChatGPT. Las respuestas de cuenta
que no son de ChatGPT o que faltan omiten los complementos respaldados por aplicaciones con
`codex_subscription_required`. De forma predeterminada, la migración no llama a `app/list` de origen;
los complementos de origen respaldados por aplicaciones que pasan el filtro de cuenta se planifican
sin verificación de accesibilidad a la aplicación de origen, y los fallos de transporte de búsqueda de cuenta
se omiten con `codex_account_unavailable`. Con `--verify-plugin-apps`,
la migración toma una instantánea fresca de `app/list` de origen y requiere que cada aplicación
propiedad esté presente, habilitada y accesible antes de planificar la activación nativa. En
ese modo, los fallos de transporte de búsqueda de cuenta se transmiten al filtro
de inventario de aplicaciones de origen. El inventario de aplicaciones en tiempo de ejecución es la verificación de accesibilidad
de la sesión de destino después de la migración. La configuración de sesión del arnés de Codex luego calcula una configuración
de aplicaciones de hilo restrictiva para las aplicaciones de complemento habilitadas y accesibles.

La configuración de aplicaciones de hilo se calcula cuando OpenClaw establece una sesión del arnés de Codex
o reemplaza un enlace de hilo de Codex obsoleto. No se recalcula en cada turno.

## Límite de soporte de V1

V1 es intencionalmente estrecho:

- Solo los complementos `openai-curated` que ya estaban instalados en el inventario
  del servidor de aplicaciones Codex de origen son elegibles para la migración.
- Los complementos de origen respaldados por aplicaciones deben pasar el filtro de suscripción
  en el momento de la migración. `--verify-plugin-apps` agrega el filtro de inventario de
  aplicaciones de origen. Las cuentas con filtro de suscripción más, en modo de verificación, aplicaciones de origen
  inaccesibles, deshabilitadas o faltantes, o fallos de actualización del inventario de aplicaciones de origen, se informan como elementos
  manuales omitidos en lugar de entradas de configuración habilitadas. Los detalles del complemento ilegibles se omiten
  antes del filtro de inventario de aplicaciones de origen.
- La migración escribe identidades de complementos explícitas con `marketplaceName` y
  `pluginName`; no escribe rutas de caché `marketplacePath` locales.
- `codexPlugins.enabled` es el interruptor de habilitación global.
- No hay ningún comodín `plugins["*"]` ni ninguna clave de configuración que otorgue
  autoridad de instalación arbitraria.
- Los mercados no compatibles, los paquetes de plugins en caché, los hooks y los archivos de configuración de Codex
  se conservan en el informe de migración para su revisión manual.

## Inventario de aplicaciones y propiedad

OpenClaw lee el inventario de aplicaciones de Codex a través de `app/list`, lo almacena en caché durante
una hora y actualiza las entradas obsoletas o faltantes de forma asíncrona. La caché es
solo en memoria; al reiniciar la CLI o la puerta de enlace se elimina, y OpenClaw la reconstruye
a partir de la siguiente lectura de `app/list`.

La migración y el tiempo de ejecución usan claves de caché separadas:

- La verificación de la migración de origen utiliza las opciones de inicio del servidor de aplicaciones de Codex de origen y el hogar de Codex de origen.
  Esto solo se ejecuta cuando se establece `--verify-plugin-apps`, y obliga
  a un recorrido fresco del origen `app/list` para esa ejecución de planificación.
- La configuración del tiempo de ejecución de destino utiliza la identidad del servidor de aplicaciones de Codex del agente de destino cuando
  construye la configuración de la aplicación del hilo de Codex. La activación del plugin invalida esa clave de
  caché de destino y luego la fuerza a actualizar después de `plugin/install`.

Una aplicación de plugin se expone solo cuando OpenClaw puede asignarla de nuevo al plugin
migrado a través de una propiedad estable:

- id de aplicación exacto del detalle del plugin
- nombre de servidor MCP conocido
- metadatos únicos y estables

La propiedad de solo nombre para mostrar o ambigua se excluye hasta que la próxima actualización del
inventario demuestre la propiedad.

## Configuración de la aplicación del hilo

OpenClaw inyecta un parche `config.apps` restrictivo para el hilo de Codex:
`_default` está deshabilitado y solo las aplicaciones propiedad de plugins migrados habilitados están
habilitadas.

OpenClaw establece `destructive_enabled` a nivel de aplicación desde la política global efectiva o
por plugin `allow_destructive_actions` y permite que Codex haga cumplir
los metadatos de herramientas destructivas desde sus anotaciones de herramientas de aplicaciones nativas. La configuración de la aplicación
`_default`
está deshabilitada con `open_world_enabled: false`. Las aplicaciones de plugin
habilitadas se emiten con `open_world_enabled: true`; OpenClaw no expone un control separado
de política de mundo abierto para plugins y no mantiene listas de denegación de nombres de herramientas destructivas
por plugin.

El modo de aprobación de herramientas es automático de forma predeterminada para las aplicaciones de plugin, de modo que las herramientas de lectura
no destructivas pueden ejecutarse sin una interfaz de usuario de aprobación en el mismo hilo. Las herramientas destructivas permanecen
controladas por la política `destructive_enabled` de cada aplicación.

## Política de acciones destructivas

Las elicitaciones de complementos destructivas están permitidas de forma predeterminada para los complementos de Codex migrados, mientras que los esquemas no seguros y la propiedad ambigua aún fallan de forma cerrada:

- Lo `allow_destructive_actions` global se establece de forma predeterminada en `true`.
- El `allow_destructive_actions` por complemento anula la política global para ese complemento.
- Cuando la política es `false`, OpenClaw devuelve una denegación determinista.
- Cuando la política es `true`, OpenClaw acepta automáticamente solo los esquemas seguros que puede asignar a una respuesta de aprobación, como un campo de aprobación booleano.
- La falta de identidad del complemento, la propiedad ambigua, un ID de turno faltante, un ID de turno incorrecto o un esquema de elicitación no seguro se rechazan en lugar de pedir confirmación.

## Solución de problemas

**`auth_required`:** la migración instaló el complemento, pero una de sus aplicaciones aún necesita autenticación. La entrada explícita del complemento se escribe como deshabilitada hasta que la autorice y la habilite.

**`app_inaccessible`, `app_disabled` o `app_missing`:** la migración no instaló el complemento porque el inventario de aplicaciones de Codex de origen no mostraba todas las aplicaciones propiedad como presentes, habilitadas y accesibles mientras `--verify-plugin-apps` estaba configurado. Autorice nuevamente o habilite la aplicación en Codex y luego vuelva a ejecutar la migración con `--verify-plugin-apps`.

**`app_inventory_unavailable`:** la migración no instaló el complemento porque se solicitó una verificación estricta de la aplicación de origen y falló la actualización del inventario de aplicaciones de Codex de origen. Corrija el acceso al servidor de aplicaciones de Codex de origen o reintente sin `--verify-plugin-apps` si acepta el plan más rápido limitado a la cuenta.

**`codex_subscription_required`:** la migración no instaló el complemento respaldado por la aplicación porque la cuenta del servidor de aplicaciones de Codex de origen no había iniciado sesión con una cuenta de suscripción a ChatGPT. Inicie sesión en la aplicación de Codex con la autenticación de suscripción y luego vuelva a ejecutar la migración.

**`codex_account_unavailable`:** la migración no instaló el complemento respaldado por la aplicación porque no se pudo leer la cuenta del servidor de aplicaciones de Codex de origen. Corrija la autenticación del servidor de aplicaciones de Codex de origen o vuelva a ejecutar con `--verify-plugin-apps` si desea que el inventario de aplicaciones de origen decida la elegibilidad cuando falla la búsqueda de la cuenta.

**`marketplace_missing` o `plugin_missing`:** el servidor de aplicaciones Codex de destino
no puede ver el mercado de `openai-curated` o el complemento esperado. Vuelva a ejecutar la migración
contra el tiempo de ejecución de destino o inspeccione el estado del complemento del servidor de aplicaciones Codex.

**`app_inventory_missing` o `app_inventory_stale`:** la preparación de la aplicación provenía de un
caché vacío o obsoleto. OpenClaw programa una actualización asíncrona y excluye las aplicaciones de complemento
hasta que se conozcan la propiedad y la preparación.

**`app_ownership_ambiguous`:** el inventario de aplicaciones solo coincidió por el nombre para mostrar, por lo que
la aplicación no está expuesta al hilo de Codex.

**Se cambió la configuración pero el agente no puede ver el complemento:** use `/new`, `/reset`, o
reinicie la puerta de enlace. Los enlaces de hilos de Codex existentes mantienen la configuración de la aplicación
con la que comenzaron hasta que OpenClaw establece una nueva sesión de arnés o reemplaza un
enlace obsoleto.

**Se rechazó la acción destructiva:** verifique los valores `allow_destructive_actions` globales y por complemento.
Incluso cuando la política es verdadera, los esquemas de elicitación inseguros
y la identidad ambigua del complemento aún fallan cerrados.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Referencia del arnés de Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Referencia de configuración](/es/gateway/configuration-reference#codex-harness-plugin-config)
- [CLI de Migración](/es/cli/migrate)
