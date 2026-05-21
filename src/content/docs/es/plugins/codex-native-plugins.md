---
summary: "Configure migrated native Codex plugins for Codex-mode OpenClaw agents"
title: "Native Codex plugins"
read_when:
  - You want Codex-mode OpenClaw agents to use native Codex plugins
  - You are migrating source-installed openai-curated Codex plugins
  - You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics
---

La compatibilidad con complementos nativos de Codex permite que un agente OpenClaw en modo Codex utilice las capacidades de aplicación y complemento propias del servidor de aplicaciones Codex dentro del mismo hilo de Codex que maneja el turno de OpenClaw.

OpenClaw no traduce los complementos de Codex en herramientas dinámicas `codex_plugin_*`
de OpenClaw sintéticas. Las llamadas a los complementos se mantienen en la transcripción nativa de Codex y
Codex app-server es el propietario de la ejecución de MCP respaldada por la aplicación.

Use esta página después de que el [arnés de Codex](/es/plugins/codex-harness) base esté funcionando.

## Requisitos

- El tiempo de ejecución del agente OpenClaw seleccionado debe ser el arnés nativo de Codex.
- `plugins.entries.codex.enabled` debe ser verdadero.
- `plugins.entries.codex.config.codexPlugins.enabled` debe ser verdadero.
- V1 solo admite complementos `openai-curated` que la migración observó como
  instalados desde la fuente en el hogar de Codex de origen.
- El servidor de aplicaciones Codex de destino debe poder ver el mercado,
  el complemento y el inventario de aplicaciones esperados.

`codexPlugins` no tiene efecto en las ejecuciones de PI, las ejecuciones normales del proveedor de OpenAI, los enlaces de conversación de ACP
u otros arneses porque esas rutas no crean
hilos de Codex app-server con configuración `apps` nativa.

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

La migración escribe entradas `codexPlugins` explícitas para los complementos elegibles y llama
a Codex app-server `plugin/install` para los complementos seleccionados. Una configuración migrada
típica tiene el siguiente aspecto:

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

Después de cambiar `codexPlugins`, las nuevas conversaciones de Codex recuperan el conjunto de aplicaciones
actualizado automáticamente. Use `/new` o `/reset` para actualizar la conversación actual.
No es necesario reiniciar la puerta de enlace para los cambios de habilitación o deshabilitación de complementos.

## Administrar complementos desde el chat

Use `/codex plugins` cuando desee inspeccionar o cambiar los complementos nativos de Codex configurados
desde el mismo chat donde opera el arnés de Codex:

```text
/codex plugins
/codex plugins list
/codex plugins disable google-calendar
/codex plugins enable google-calendar
```

`/codex plugins` es un alias de `/codex plugins list`. La salida de la lista muestra
las claves del complemento configurado, el estado de encendido/apagado, el nombre del complemento de Codex y el mercado
de `plugins.entries.codex.config.codexPlugins.plugins`.

`enable` y `disable` solo escriben en la configuración de OpenClaw en
`~/.openclaw/openclaw.json`; no editan `~/.codex/config.toml` ni instalan
nuevos complementos de Codex. Solo el propietario o un cliente de puerta de enlace con el
alcance `operator.admin` puede cambiar el estado del complemento.

Habilitar un complemento configurado también activa el interruptor global `codexPlugins.enabled`. Si el complemento se escribió como deshabilitado porque la migración devolvió `auth_required`, vuelve a autorizar la aplicación en Codex antes de habilitarla en OpenClaw.

## Cómo funciona la configuración de complementos nativos

La integración tiene tres estados separados:

- Instalado: Codex tiene el paquete del complemento local en el tiempo de ejecución del servidor de aplicaciones de destino.
- Habilitado: La configuración de OpenClaw está dispuesta a poner el complemento a disposición de los turnos del arnés de Codex.
- Accesible: El servidor de aplicaciones de Codex confirma que las entradas de la aplicación del complemento están disponibles para la cuenta activa y se pueden asignar a la identidad del complemento migrado.

La migración es el paso duradero de instalación/elegibilidad. Durante la planificación, OpenClaw lee los detalles de `plugin/read` de Codex de origen y comprueba que la respuesta de la cuenta del servidor de aplicaciones de Codex de origen es una cuenta de suscripción a ChatGPT. Las respuestas de cuenta que no son de ChatGPT o que faltan omiten los complementos respaldados por aplicaciones con `codex_subscription_required`. De forma predeterminada, la migración no llama a `app/list` de origen; los complementos de origen respaldados por aplicaciones que pasan la puerta de cuenta se planifican sin verificación de accesibilidad de la aplicación de origen, y los errores de transporte de búsqueda de cuenta se omiten con `codex_account_unavailable`. Con `--verify-plugin-apps`, la migración toma una nueva instantánea de `app/list` de origen y requiere que cada aplicación propiedad del usuario esté presente, habilitada y accesible antes de planificar la activación nativa. En ese modo, los errores de transporte de búsqueda de cuenta pasan a la puerta de inventario de aplicaciones de origen. El inventario de aplicaciones en tiempo de ejecución es la verificación de accesibilidad de la sesión de destino después de la migración. La configuración de la sesión del arnés de Codex luego calcula una configuración de aplicación de hilo restrictiva para las aplicaciones de complementos habilitadas y accesibles.

La configuración de la aplicación del hilo se calcula cuando OpenClaw establece una sesión del arnés de Codex o reemplaza un enlace de hilo de Codex obsoleto. No se recalcula en cada turno, por lo que `/codex plugins enable` y `/codex plugins disable` afectan a las nuevas conversaciones de Codex. Usa `/new` o `/reset` cuando la conversación actual deba adoptar el conjunto de aplicaciones actualizado.

## Límite de soporte de V1

V1 es intencionalmente limitado:

- Solo los complementos `openai-curated` que ya estaban instalados en el inventario del servidor de aplicaciones Codex de origen son elegibles para la migración.
- Los complementos de origen respaldados por aplicaciones deben pasar la puerta de suscripción en el momento de la migración. `--verify-plugin-apps` añade la puerta del inventario de aplicaciones de origen. Las cuentas con puerta de suscripción, más, en modo de verificación, aplicaciones de origen inaccesibles, deshabilitadas o faltantes, o fallos de actualización del inventario de aplicaciones de origen, se reportan como elementos manuales omitidos en lugar de entradas de configuración habilitadas. Los detalles del complemento ilegibles se omiten antes de la puerta del inventario de aplicaciones de origen.
- La migración escribe identidades de complemento explícitas con `marketplaceName` y `pluginName`; no escribe rutas de caché `marketplacePath` locales.
- `codexPlugins.enabled` es el interruptor de habilitación global.
- No hay ningún comodín `plugins["*"]` ni ninguna clave de configuración que otorgue autoridad de instalación arbitraria.
- Los mercados no admitidos, los paquetes de complementos en caché, los enlaces y los archivos de configuración de Codex se conservan en el informe de migración para su revisión manual.

## Inventario de aplicaciones y propiedad

OpenClaw lee el inventario de aplicaciones de Codex a través del `app/list` del servidor de aplicaciones, lo almacena en caché durante una hora y actualiza las entradas obsoletas o faltantes de forma asíncrona. La caché está solo en memoria; al reiniciar la CLI o la puerta de enlace se elimina, y OpenClaw la reconstruye a partir de la siguiente lectura `app/list`.

La migración y el tiempo de ejecución utilizan claves de caché separadas:

- La verificación de la migración de origen utiliza las opciones de inicio del servidor de aplicaciones de origen y el hogar de Codex de origen. Esto se ejecuta solo cuando se establece `--verify-plugin-apps` y fuerza un recorrido fresco del `app/list` de origen para esa ejecución de planificación.
- La configuración del tiempo de ejecución de destino utiliza la identidad del servidor de aplicaciones Codex del agente de destino cuando crea la configuración de la aplicación del hilo de Codex. La activación del complemento invalida esa clave de caché de destino y luego la fuerza a actualizarla después de `plugin/install`.

Una aplicación de complemento se expone solo cuando OpenClaw puede asignarla nuevamente al complemento migrado a través de una propiedad estable:

- id de aplicación exacto del detalle del complemento
- nombre conocido del servidor MCP
- metadatos estables únicos

Se excluye la propiedad solo de nombre para mostrar o ambigua hasta que la próxima actualización del inventario demuestre la propiedad.

## Configuración de la aplicación del hilo

OpenClaw inyecta un parche `config.apps` restrictivo para el hilo de Codex:
`_default` está deshabilitado y solo las aplicaciones propiedad de complementos migrados habilitados están
habilitadas.

OpenClaw establece `destructive_enabled` a nivel de aplicación desde la política `allow_destructive_actions` global efectiva o por complemento y permite que Codex haga cumplir los metadatos de herramientas destructivas desde sus anotaciones de herramientas de aplicaciones nativas. La configuración de aplicación `_default`
está deshabilitada con `open_world_enabled: false`. Las aplicaciones de complementos habilitadas
se emiten con `open_world_enabled: true`; OpenClaw no expone un control de política de mundo abierto separado para complementos y no mantiene listas de denegación de nombres de herramientas destructivas por complemento.

El modo de aprobación de herramientas es automático por defecto para las aplicaciones de complementos, por lo que las herramientas de lectura no destructivas pueden ejecutarse sin una interfaz de usuario de aprobación en el mismo hilo. Las herramientas destructivas siguen controladas por la política `destructive_enabled` de cada aplicación.

## Política de acción destructiva

Las elicitaciones de complementos destructivos se permiten por defecto para los complementos de Codex migrados, mientras que los esquemas no seguros y la propiedad ambigua aún fallan de forma cerrada:

- El `allow_destructive_actions` global tiene como valor predeterminado `true`.
- El `allow_destructive_actions` por complemento anula la política global para ese
  complemento.
- Cuando la política es `false`, OpenClaw devuelve una declinación determinista.
- Cuando la política es `true`, OpenClaw acepta automáticamente solo esquemas seguros que pueda asignar a
  una respuesta de aprobación, como un campo de aprobación booleano.
- Falta la identidad del complemento, propiedad ambigua, falta un id de turno, un id de turno incorrecto
  o un esquema de elicitation no seguro; se declina en lugar de solicitar.

## Solución de problemas

**`auth_required`:** la migración instaló el complemento, pero una de sus aplicaciones aún
necesita autenticación. La entrada explícita del complemento se escribe deshabilitada hasta que
la autorice y la habilite nuevamente.

**`app_inaccessible`, `app_disabled` o `app_missing`:**
la migración no instaló el complemento porque el inventario de aplicaciones de Codex de origen no
mostraba todas las aplicaciones propiedad como presentes, habilitadas y accesibles mientras
`--verify-plugin-apps` estaba configurado. Vuelve a autorizar o habilita la aplicación en Codex y luego
vuelve a ejecutar la migración con `--verify-plugin-apps`.

**`app_inventory_unavailable`:** la migración no instaló el complemento porque
se solicitó una verificación estricta de la aplicación de origen y la actualización del
inventario de aplicaciones de Codex de origen falló. Soluciona el acceso al servidor de aplicaciones de Codex de origen o reintenta sin
`--verify-plugin-apps` si aceptas el plan más rápido limitado a la cuenta.

**`codex_subscription_required`:** la migración no instaló el complemento respaldado por la aplicación
porque la cuenta del servidor de aplicaciones de Codex de origen no había iniciado sesión con una
cuenta de suscripción a ChatGPT. Inicia sesión en la aplicación de Codex con la autenticación de suscripción,
luego vuelve a ejecutar la migración.

**`codex_account_unavailable`:** la migración no instaló el complemento respaldado por la aplicación
porque no se pudo leer la cuenta del servidor de aplicaciones de Codex de origen. Soluciona la autenticación del servidor de aplicaciones de Codex de origen
o vuelve a ejecutar con `--verify-plugin-apps` si deseas que el inventario de aplicaciones de origen
decida la elegibilidad cuando falla la búsqueda de la cuenta.

**`marketplace_missing` o `plugin_missing`:** el servidor de aplicaciones de Codex de destino
no puede ver el mercado o complemento `openai-curated` esperado. Vuelve a ejecutar la migración
contra el tiempo de ejecución de destino o inspecciona el estado del complemento del servidor de aplicaciones de Codex.

**`app_inventory_missing` o `app_inventory_stale`:** la preparación de la aplicación provenía de un
caché vacío o obsoleto. OpenClaw programa una actualización asíncrona y excluye las aplicaciones de complemento
hasta que se conozca la propiedad y la preparación.

**`app_ownership_ambiguous`:** el inventario de aplicaciones coincidió solo por el nombre para mostrar, por lo que
la aplicación no está expuesta al hilo de Codex.

**Configuración cambiada pero el agente no puede ver el complemento:** usa `/codex plugins
list` to confirm the configured state, then use `/new` or `/reset`. Los enlaces
existentes de hilos de Codex mantienen la configuración de la aplicación con la que comenzaron hasta que OpenClaw
establece una nueva sesión de arnés o reemplaza un enlace obsoleto.

**Se declina la acción destructiva:** verifique los valores globales y por complemento de `allow_destructive_actions`. Incluso cuando la política es verdadera, los esquemas de elicitación inseguros y la identidad ambigua del complemento todavía fallan de forma cerrada.

## Relacionado

- [Arnés de Codex](/es/plugins/codex-harness)
- [Referencia del arnés de Codex](/es/plugins/codex-harness-reference)
- [Tiempo de ejecución del arnés de Codex](/es/plugins/codex-harness-runtime)
- [Referencia de configuración](/es/gateway/configuration-reference#codex-harness-plugin-config)
- [Migrar CLI](/es/cli/migrate)
