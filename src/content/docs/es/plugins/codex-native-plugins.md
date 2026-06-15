---
summary: "Configurar complementos nativos de Codex migrados para agentes OpenClaw en modo Codex"
title: "Complementos nativos de Codex"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are configuring first-party Codex plugin marketplaces
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La compatibilidad con complementos nativos de Codex permite que un agente OpenClaw en modo Codex utilice las capacidades de aplicación y complemento propias del servidor de aplicaciones Codex dentro del mismo hilo de Codex que maneja el turno de OpenClaw.

OpenClaw no traduce los complementos de Codex en `codex_plugin_*`
herramientas dinámicas sintéticas de OpenClaw. Las llamadas a complementos permanecen en la transcripción nativa de Codex y
Codex app-server es el propietario de la ejecución de MCP respaldada por la aplicación.

Utilice esta página después de que el [arnés de Codex](/es/plugins/codex-harness) base esté funcionando.

## Requisitos

- El tiempo de ejecución del agente OpenClaw seleccionado debe ser el arnés nativo de Codex.
- `plugins.entries.codex.enabled` debe ser verdadero (true).
- `plugins.entries.codex.config.codexPlugins.enabled` debe ser verdadero (true).
- V1 soporta mercados de complementos de Codex de primera parte: `openai-curated`,
  `openai-bundled` y `openai-primary-runtime`.
- La migración solo descubre automáticamente los complementos `openai-curated` que observó como
  instalados desde la fuente en el origen de Codex.
- El servidor de aplicaciones de Codex de destino debe poder ver el mercado esperado,
  el complemento y el inventario de aplicaciones.

`codexPlugins` no tiene efecto en las ejecuciones de OpenClaw, las ejecuciones normales del proveedor de OpenAI, los enlaces de conversación de ACP
u otros arneses porque esas rutas no crean
hilos de servidor de aplicaciones de Codex con configuración nativa `apps`.

El acceso a Codex del lado de OpenAI, la disponibilidad de aplicaciones y los controles de complementos/aplicaciones del espacio de trabajo
provienen de la cuenta de Codex iniciada. Para la cuenta de OpenAI y el modelo de administrador,
consulte [Uso de Codex con su plan ChatGPT](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan).

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

Aplique la migración cuando el plan se vea correcto:

```bash
openclaw migrate apply codex --yes
```

La migración escribe entradas explícitas `codexPlugins` para complementos curados elegibles
y llama a `plugin/install` del servidor de aplicaciones de Codex para los complementos seleccionados. La configuración
explícita también puede hacer referencia a los mercados de primera parte incluidos y de tiempo de ejecución principal de Codex
cuando el inventario del servidor de aplicaciones de destino expone esas aplicaciones de complemento. Una
configuración migrada típica tiene este aspecto:

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

Después de cambiar `codexPlugins`, las nuevas conversaciones de Codex adoptan automáticamente el conjunto de aplicaciones actualizado. Use `/new` o `/reset` para actualizar la conversación actual.
No es necesario reiniciar el gateway para los cambios de habilitación o deshabilitación de complementos.

## Entradas manuales de marketplace de primera parte

La migración escribe entradas `openai-curated` para los complementos instalados por fuente elegibles.
Para los complementos de primera parte que residen en los marketplaces integrados o de tiempo de ejecución principal de Codex, agregue entradas explícitas después de confirmar que el inventario del servidor de aplicaciones Codex de destino expone ese marketplace y complemento.

Use la misma forma de configuración para cada marketplace de primera parte:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            plugins: {
              chrome: {
                enabled: true,
                marketplaceName: "openai-bundled",
                pluginName: "chrome",
              },
              documents: {
                enabled: true,
                marketplaceName: "openai-primary-runtime",
                pluginName: "documents",
              },
            },
          },
        },
      },
    },
  },
}
```

La clave bajo `plugins` es la clave de configuración local de OpenClaw. `pluginName` y
`marketplaceName` deben coincidir exactamente con el inventario del servidor de aplicaciones de Codex. Si el
complemento no aparece en `/codex plugins list` o en el diagnóstico de aplicaciones de Codex, OpenClaw
mantiene la entrada configurada pero no puede exponer sus aplicaciones a los turnos de Codex.

## Gestionar complementos desde el chat

Use `/codex plugins` cuando desee inspeccionar o cambiar los complementos nativos de Codex configurados
desde el mismo chat donde opera el arnés de Codex:

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` es un alias para `/codex plugins list`. La salida de la lista muestra
las claves de complemento configuradas, el estado activado/desactivado, el nombre del complemento de Codex y el marketplace
de `plugins.entries.codex.config.codexPlugins.plugins`.

`enable` y `disable` escriben solo en la configuración de OpenClaw en
`~/.openclaw/openclaw.json`; no editan `~/.codex/config.toml` ni instalan
nuevos complementos de Codex. Solo el propietario o un cliente de gateway con el
alcance `operator.admin` puede cambiar el estado del complemento.

Habilitar un complemento configurado también activa el interruptor global
`codexPlugins.enabled`. Si el complemento se escribió como deshabilitado porque
la migración devolvió `auth_required`, autorice nuevamente la aplicación en Codex antes de habilitarla
en OpenClaw.

## Cómo funciona la configuración de complementos nativos

La integración tiene tres estados separados:

- Instalado: Codex tiene el paquete de complemento local en el tiempo de ejecución del servidor de aplicaciones de destino.
- Habilitado: La configuración de OpenClaw está dispuesta a hacer que el complemento esté disponible para los
  turnos del arnés de Codex.
- Accesible: el servidor de aplicaciones Codex confirma que las entradas de la aplicación del complemento están disponibles para la cuenta activa y se pueden asignar a la identidad del complemento migrado.

La migración es el paso duradero de instalación/elegibilidad. Durante la planificación, OpenClaw lee los detalles del `plugin/read` de Codex fuente y verifica que la respuesta de la cuenta del servidor de aplicaciones Codex fuente sea una cuenta de suscripción a ChatGPT. Las respuestas de cuenta que no son de ChatGPT o que faltan omiten los complementos respaldados por aplicaciones con `codex_subscription_required`. De manera predeterminada, la migración no llama al `app/list` fuente; los complementos fuente respaldados por aplicaciones que pasan la puerta de cuenta se planifican sin verificación de accesibilidad de la aplicación fuente, y los fallos de transporte de búsqueda de cuenta se omiten con `codex_account_unavailable`. Con `--verify-plugin-apps`, la migración toma una instantánea fresca del `app/list` fuente y requiere que cada aplicación propiedad del usuario esté presente, habilitada y accesible antes de planificar la activación nativa. En ese modo, los fallos de transporte de búsqueda de cuenta pasan a la puerta de inventario de aplicaciones fuente. El inventario de aplicaciones en tiempo de ejecución es la verificación de accesibilidad de la sesión de destino después de la migración. La configuración de la sesión del arnés Codex calcula luego una configuración restrictiva de aplicaciones de subproceso para las aplicaciones de complemento habilitadas y accesibles.

La configuración de la aplicación del subproceso se calcula cuando OpenClaw establece una sesión del arnés Codex o reemplaza un enlace de subproceso Codex obsoleto. No se recalcula en cada turno, por lo que `/codex plugins enable` y `/codex plugins disable` afectan a las nuevas conversaciones de Codex. Use `/new` o `/reset` cuando la conversación actual deba adoptar el conjunto de aplicaciones actualizado.

## Límite de soporte de V1

V1 es intencionalmente limitado:

- La configuración en tiempo de ejecución acepta identidades de complemento `openai-curated`, `openai-bundled` y `openai-primary-runtime`.
- Solo los complementos `openai-curated` que ya estaban instalados en el inventario del servidor de aplicaciones Codex fuente son elegibles para la migración automática.
- Los complementos de origen respaldados por aplicaciones deben pasar la puerta de suscripción de migración.
  `--verify-plugin-apps` añade la puerta de inventario de aplicaciones de origen. Las cuentas con puerta de suscripción,
  además, en modo de verificación, las aplicaciones de origen inaccesibles, deshabilitadas, faltantes
  o los fallos de actualización del inventario de aplicaciones de origen se reportan como elementos manuales omitidos
  en lugar de entradas de configuración habilitadas. Los detalles del complemento ilegibles se omiten
  antes de la puerta de inventario de aplicaciones de origen.
- La migración escribe identidades de complementos explícitas con `marketplaceName` y
  `pluginName`; no escribe rutas de caché `marketplacePath` locales.
- `codexPlugins.enabled` es el interruptor de habilitación global.
- No hay ningún comodín `plugins["*"]` ni ninguna clave de configuración que otorgue
  autoridad de instalación arbitraria.
- Los mercados no compatibles, los paquetes de complementos en caché, los ganchos y los archivos de configuración de Codex
  se conservan en el informe de migración para su revisión manual. Los complementos de primera parte
  empaquetados y de tiempo de ejecución principal aún se pueden añadir manualmente a través de
  configuración explícita `codexPlugins`.

## Inventario y propiedad de aplicaciones

OpenClaw lee el inventario de aplicaciones de Codex a través de `app/list` del servidor de aplicaciones, lo almacena en caché durante
una hora y actualiza las entradas obsoletas o faltantes de forma asíncrona. La caché está
solo en memoria; al reiniciar la CLI o la puerta de enlace se elimina, y OpenClaw la reconstruye
desde la siguiente lectura `app/list`.

La migración y el tiempo de ejecución usan claves de caché separadas:

- La verificación de migración de origen utiliza las opciones de inicio del directorio de origen de Codex y del servidor de aplicaciones de origen.
  Esto se ejecuta solo cuando `--verify-plugin-apps` está establecido, y fuerza
  un recorrido fresco del origen `app/list` para esa ejecución de planificación.
- La configuración del tiempo de ejecución de destino utiliza la identidad del servidor de aplicaciones de Codex del agente de destino cuando
  construye la configuración de la aplicación del hilo de Codex. La activación del complemento invalida esa clave de
  caché de destino y luego la fuerza a actualizarla después de `plugin/install`.

Una aplicación de complemento se expone solo cuando OpenClaw puede asignarla de nuevo al complemento migrado
a través de una propiedad estable:

- identificación exacta de la aplicación desde el detalle del complemento
- nombre de servidor MCP conocido
- metadatos únicos y estables

Se excluye la propiedad solo de nombre para mostrar o ambigua hasta que la próxima actualización
del inventario demuestre la propiedad.

## Configuración de la aplicación del hilo

OpenClaw inyecta un parche restrictivo `config.apps` para el hilo de Codex:
`_default` está deshabilitado y solo las aplicaciones propiedad de complementos migrados habilitados están
habilitadas.

OpenClaw establece `destructive_enabled` a nivel de aplicación a partir de la política global efectiva o
`allow_destructive_actions` por complemento y permite que Codex haga cumplir
los metadatos de herramientas destructivas desde sus anotaciones nativas de herramientas de aplicación. La configuración de aplicación `_default`
está deshabilitada con `open_world_enabled: false`. Las aplicaciones de complementos habilitadas
se emiten con `open_world_enabled: true`; OpenClaw no expone un control
de política de mundo abierto separado para complementos y no mantiene listas de denegación
de nombres de herramientas destructivas por complemento.

El modo de aprobación de herramientas es automático de forma predeterminada para las aplicaciones de complementos, para que las herramientas de lectura no destructivas
puedan ejecutarse sin una interfaz de usuario de aprobación en el mismo hilo. Las herramientas destructivas siguen
controladas por la política `destructive_enabled` de cada aplicación.

## Política de acciones destructivas

Las elicitaciones de complementos destructivas están permitidas de forma predeterminada para los complementos de Codex
migrados, mientras que los esquemas no seguros y la propiedad ambigua aún fallan de forma cerrada:

- El `allow_destructive_actions` global es `true` de forma predeterminada.
- El `allow_destructive_actions` por complemento anula la política global para ese
  complemento.
- Cuando la política es `false`, OpenClaw devuelve una declinación determinista.
- Cuando la política es `true`, OpenClaw acepta automáticamente solo esquemas seguros que pueda asignar a
  una respuesta de aprobación, como un campo de aprobación booleano.
- La falta de identidad del complemento, la propiedad ambigua, un id de turno faltante, un id de turno incorrecto
  o un esquema de elicitación no seguro se declinan en lugar de solicitarlo.

## Solución de problemas

**`auth_required`:** la migración instaló el complemento, pero una de sus aplicaciones aún
necesita autenticación. La entrada explícita del complemento se escribe deshabilitada hasta que
la autorice y la habilite nuevamente.

**`app_inaccessible`, `app_disabled` o `app_missing`:**
la migración no instaló el complemento porque el inventario de aplicaciones de Codex de origen no
mostró todas las aplicaciones propiedad como presentes, habilitadas y accesibles mientras
`--verify-plugin-apps` estaba configurado. Vuelve a autorizar o habilitar la aplicación en Codex y luego
vuelve a ejecutar la migración con `--verify-plugin-apps`.

**`app_inventory_unavailable`:** la migración no instaló el complemento porque
se solicitó una verificación estricta de la aplicación de origen y la actualización del
inventario de aplicaciones de Codex de origen falló. Soluciona el acceso al servidor de aplicaciones de Codex de origen o vuelve a intentarlo sin
`--verify-plugin-apps` si aceptas el plan más rápido limitado a la cuenta.

**`codex_subscription_required`:** la migración no instaló el complemento respaldado por aplicación
porque la cuenta del servidor de aplicaciones de Codex de origen no había iniciado sesión con una
cuenta de suscripción a ChatGPT. Inicia sesión en la aplicación de Codex con autenticación de suscripción,
luego vuelve a ejecutar la migración.

**`codex_account_unavailable`:** la migración no instaló el complemento respaldado por aplicación
porque no se pudo leer la cuenta del servidor de aplicaciones de Codex de origen. Soluciona la autenticación del
servidor de aplicaciones de Codex de origen o vuelve a ejecutar con `--verify-plugin-apps` si deseas que el inventario de aplicaciones de origen
decida la elegibilidad cuando falle la búsqueda de cuenta.

**`marketplace_missing` o `plugin_missing`:** el servidor de aplicaciones de Codex de destino
no puede ver el mercado de primera parte esperado o el complemento. Vuelve a ejecutar la migración
contra el tiempo de ejecución de destino, inspecciona el estado del complemento del servidor de aplicaciones de Codex, o confirma
que el `marketplaceName` explícito sea uno de `openai-curated`, `openai-bundled`, o
`openai-primary-runtime`.

**`app_inventory_missing` o `app_inventory_stale`:** la disponibilidad de la aplicación provino de una
caché vacía o obsoleta. OpenClaw programa una actualización asíncrona y excluye las aplicaciones de complemento
hasta que se conozca la propiedad y la disponibilidad.

**`app_ownership_ambiguous`:** el inventario de aplicaciones solo coincidió por el nombre para mostrar, por lo que
la aplicación no está expuesta al hilo de Codex.

**Configuración cambiada pero el agente no puede ver el complemento:** use `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`. Los enlaces
de hilos de Codex existentes mantienen la configuración de la aplicación con la que comenzaron hasta que OpenClaw
establece una nueva sesión de arnés o reemplaza un enlace obsoleto.

**Acción destructiva rechazada:** compruebe los valores globales y por complemento de
`allow_destructive_actions`. Incluso cuando la política es verdadera, los esquemas de elicitación no seguros
y la identidad ambigua del complemento siguen fallando de forma cerrada.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Referencia del arnés de Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Referencia de configuración](/es/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrar CLI](/es/cli/migrate)
