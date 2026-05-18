---
summary: "Instalar, configurar y administrar complementos de OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Complementos"
sidebarTitle: "Comenzando"
doc-schema-version: 1
---

Los complementos extienden OpenClaw con canales, proveedores de modelos, arneses de agentes, herramientas,
habilidades, voz, transcripción en tiempo real, voz, comprensión de medios, generación,
recuperación web, búsqueda web y otras capacidades de tiempo de ejecución.

Use esta página cuando desee instalar un complemento, reiniciar el Gateway, verificar
que el tiempo de ejecución lo haya cargado y solucionar fallos comunes de configuración. Para ver ejemplos
solo de comandos, consulte [Administrar complementos](/es/plugins/manage-plugins). Para ver el inventario generado
de complementos integrados, externos oficiales y solo de origen, consulte
[Inventario de complementos](/es/plugins/plugin-inventory).

## Requisitos

Antes de instalar un complemento, asegúrese de tener:

- una copia o instalación de OpenClaw con la CLI `openclaw` disponible
- acceso de red a la fuente seleccionada, como ClawHub, npm o un host git
- cualquier credencial específica del complemento, claves de configuración o herramientas del sistema operativo nombradas
  en la documentación de configuración de ese complemento
- permiso para que el Gateway que sirve sus canales se recargue o reinicie

## Inicio rápido

<Steps>
  <Step title="Busque el complemento">
    Busque paquetes de complementos públicos en [ClawHub](/es/clawhub):

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub es la superficie principal de descubrimiento para complementos de la comunidad. Durante el

corte de lanzamiento, las especificaciones ordinarias de paquetes básicos todavía se instalan desde npm. Use un
prefijo explícito cuando necesite una fuente.

  </Step>

  <Step title="Instale el complemento">
    ```bash
    # From ClawHub.
    openclaw plugins install clawhub:<package>

    # From npm.
    openclaw plugins install npm:<package>

    # From git.
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # From a local development checkout.
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    Trate las instalaciones de complementos como si estuviera ejecutando código. Prefiera versiones fijadas cuando

necesite instalaciones de producción reproducibles.

  </Step>

  <Step title="Configúrelo y actívelo">
    Configure los ajustes específicos del complemento bajo `plugins.entries.<id>.config`.
    Active el complemento si aún no está habilitado:

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    Si su configuración utiliza una lista `plugins.allow` restrictiva, el id del
    complemento instalado debe estar presente antes de que el complemento pueda cargarse.
    `openclaw plugins install` añade el id instalado a una lista
    `plugins.allow` existente y elimina el mismo id de `plugins.deny` para que
    la instalación explícita pueda cargar después del reinicio.

  </Step>

  <Step title="Permita que el Gateway se recargue">
    La instalación, actualización o desinstalación del código del complemento requiere un
    reinicio del Gateway. Cuando un Gateway administrado ya se está ejecutando con la recarga
    de configuración habilitada, OpenClaw detecta el registro de instalación del complemento cambiado y reinicia el
    Gateway automáticamente. Si el Gateway no está administrado o la recarga está deshabilitada,
    reinícielo usted mismo:

    ```bash
    openclaw gateway restart
    ```

    Las operaciones de habilitar y deshabilitar actualizan la configuración y actualizan el registro en frío.
    Una inspección en tiempo de ejecución sigue siendo la ruta de verificación más clara para las superficies
    de tiempo de ejecución en vivo.

  </Step>

  <Step title="Verifique el registro en tiempo de ejecución">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    Use `--runtime` cuando necesite probar herramientas, ganchos, servicios,
    métodos del Gateway o comandos de CLI propiedad del complemento registrados. `inspect` simple es una
    verificación de manifiesto y registro en frío.

  </Step>
</Steps>

## Configuración

### Elija una fuente de instalación

| Fuente      | Úselo cuando                                                                                          | Ejemplo                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | Desea descubrimiento nativo de OpenClaw, escaneos, metadatos de versión e indicaciones de instalación | `openclaw plugins install clawhub:<package>`                   |
| npm         | Necesita flujos de trabajo directos del registro npm o etiquetas de distribución                      | `openclaw plugins install npm:<package>`                       |
| git         | Necesita una rama, etiqueta o confirmación de un repositorio                                          | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| ruta local  | Está desarrollando o probando un complemento en la misma máquina                                      | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | Está instalando un complemento de marketplace compatible con Claude                                   | `openclaw plugins install <plugin> --marketplace <source>`     |

Las especificaciones de paquetes básicos tienen un comportamiento de compatibilidad especial. Si el nombre básico coincide con un ID de complemento incluido, OpenClaw usa esa fuente incluida. Si coincide con un ID de complemento externo oficial, OpenClaw usa el catálogo de paquetes oficial. Otras especificaciones de paquetes básicos ordinarios se instalan a través de npm durante el transitorio de lanzamiento. Use `clawhub:`, `npm:`, `git:` o `npm-pack:` cuando necesite una selección de fuente determinista. Consulte [`openclaw plugins`](/es/cli/plugins#install) para el contrato completo del comando.

### Configurar la política de complementos

La forma común de configuración del complemento es:

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Reglas clave de la política:

- `plugins.enabled: false` deshabilita todos los complementos y omite el trabajo de descubrimiento/carga de complementos. Las referencias a complementos obsoletos están inactivas mientras esto está activo; vuelva a habilitar los complementos antes de ejecutar la limpieza del médico cuando desee que se eliminen los IDs obsoletos.
- `plugins.deny` tiene prioridad sobre la lista de permitidos y la habilitación por complemento.
- `plugins.allow` es una lista de permitidos exclusiva. Las herramientas propiedad de complementos fuera de la lista de permitidos permanecen no disponibles, incluso cuando `tools.allow` incluye `"*"`.
- `plugins.entries.<id>.enabled: false` deshabilita un complemento conservando su configuración.
- `plugins.load.paths` agrega archivos o directorios locales de complementos explícitos.
- Los complementos de origen del espacio de trabajo están deshabilitados de forma predeterminada; habilítelos o agréquelos explícitamente a la lista de permitidos antes de usar el código local del espacio de trabajo.
- Los complementos incluidos siguen sus metadatos integrados de activado/desactivado de forma predeterminada, a menos que la configuración los anule explícitamente.
- `plugins.slots.<slot>` elige un complemento para categorías exclusivas como motores de memoria y contexto. La selección de ranuras fuerza la habilitación del complemento seleccionado para esa ranura al contar como activación explícita; puede cargarse incluso cuando de otra manera sería opcional. `plugins.deny` y `plugins.entries.<id>.enabled: false` todavía lo bloquean.
- Los complementos opcionales incluidos pueden activarse automáticamente cuando la configuración nombra una de sus superficies propiedad, como una referencia de proveedor/modelo, configuración de canal, backend de CLI o tiempo de ejecución de arnés de agente.
- El enrutamiento de Codex de la familia OpenAI mantiene los límites del proveedor y del complemento de tiempo de ejecución separados: `openai-codex/*` es la configuración heredada del proveedor de OpenAI, mientras que el complemento `codex` incluido posee el tiempo de ejecución del servidor de aplicaciones Codex para referencias canónicas de agente `openai/*`, `agentRuntime.id: "codex"` explícitas y referencias heredadas `codex/*`.

Ejecute `openclaw doctor` o `openclaw doctor --fix` cuando la validación de la configuración reporte identificadores de complemento obsoletos, discordancias en la lista de permisos/herramientas o rutas heredadas de complementos incluidos.

## Entender los formatos de complemento

OpenClaw reconoce dos formatos de complemento:

| Formato                        | Cómo se carga                                                                                     | Usar cuando                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Complemento nativo de OpenClaw | `openclaw.plugin.json` más un módulo de tiempo de ejecución cargado en proceso                    | Está instalando o construyendo capacidades de tiempo de ejecución específicas de OpenClaw |
| Paquete compatible             | Diseño de complemento de Codex, Claude o Cursor mapeado al inventario de complementos de OpenClaw | Está reutilizando habilidades, comandos, ganchos o metadatos de paquetes compatibles      |

Ambos formatos aparecen en `openclaw plugins list`, `openclaw plugins inspect`,
`openclaw plugins enable` y `openclaw plugins disable`. Consulte
[Plugin bundles](/es/plugins/bundles) para conocer el límite de compatibilidad del paquete y
[Building plugins](/es/plugins/building-plugins) para la creación de complementos nativos.

## Verificar el Gateway activo

`openclaw plugins list` y `openclaw plugins inspect` plano leen la configuración en frío,
el manifiesto y el estado del registro. No prueban que un Gateway ya en ejecución
haya importado el mismo código de complemento.

Cuando un complemento aparece instalado pero el tráfico del chat en vivo no lo utiliza:

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

Los Gateways administrados se reinician automáticamente después de cambios de instalación, actualización y desinstalación del complemento que alteran su origen. En instalaciones de VPS o contenedores, asegúrese de que cualquier reinicio manual apunte al hijo `openclaw gateway run` real que
atiende sus canales, no solo a un contenedor o supervisor.

## Solución de problemas

| Síntoma                                                                                         | Verificar                                                                                                                                                     | Solución                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| El complemento aparece en `plugins list` pero los ganchos de tiempo de ejecución no se ejecutan | Use `openclaw plugins inspect <id> --runtime --json` y confirme el Gateway activo con `gateway status --deep --require-rpc`                                   | Reinicie el Gateway en vivo después de cambios de instalación, actualización, configuración o fuente                                    |
| Aparecen diagnósticos de propiedad duplicada de canal o herramienta                             | Ejecute `openclaw plugins list --enabled --verbose`, inspeccione cada plugin sospechoso con `--runtime --json` y compare la propiedad del canal o herramienta | Deshabilite un propietario, elimine instalaciones obsoletas o use el manifiesto `preferOver` para un reemplazo intencional              |
| La configuración indica que falta un plugin                                                     | Consulte [Inventario de plugins](/es/plugins/plugin-inventory) para ver si está incluido, es externo oficial o solo de origen                                 | Instale el paquete externo, habilite el plugin incluido o elimine la configuración obsoleta                                             |
| La configuración no es válida durante la instalación                                            | Lea el mensaje de validación y ejecute `openclaw doctor --fix` cuando indique un estado de plugin obsoleto                                                    | El Doctor puede poner en cuarentena la configuración de plugin no válida deshabilitando la entrada y eliminando la carga útil no válida |
| La ruta del plugin está bloqueada por propiedad o permisos sospechosos                          | Inspeccione el diagnóstico antes del error de configuración                                                                                                   | Corrija la propiedad/permisos del sistema de archivos y luego ejecute `openclaw plugins registry --refresh`                             |
| `OPENCLAW_NIX_MODE=1` bloquea los comandos del ciclo de vida                                    | Confirme que la instalación está administrada por Nix                                                                                                         | Cambie la selección de plugins en el origen de Nix en lugar de usar comandos de modificación de plugins                                 |
| Error de importación de dependencia en tiempo de ejecución                                      | Verifique si el plugin se instaló a través de npm/git/ClawHub o se cargó desde una ruta local                                                                 | Ejecute `openclaw plugins update <id>`, reinstale el origen o instale las dependencias del plugin local usted mismo                     |

Cuando la configuración obsoleta del plugin todavía nombra un plugin de canal que ya no es detectable,
el inicio de Gateway omite ese canal respaldado por el plugin en lugar de bloquear todos los
demás canales. Ejecute `openclaw doctor --fix` para eliminar las entradas obsoletas del plugin y del canal.
Las claves de canal desconocidas sin evidencia de plugin obsoleto aún fallan
la validación para que los errores tipográficos sean visibles.

Para el reemplazo intencional de canal, el plugin preferido debe declarar
`channelConfigs.<channel-id>.preferOver` con el id del plugin heredado o de menor prioridad.
Si ambos plugins están explícitamente habilitados, OpenClaw mantiene esa solicitud
y reporta diagnósticos de canal o herramienta duplicados en lugar de elegir silenciosamente
un propietario.

Si un paquete instalado informa que `requires compiled runtime output for
TypeScript entry ...`, el paquete se publicó sin los archivos JavaScript que
OpenClaw necesita en tiempo de ejecución. Actualice o reinstale después de que el
editor publique el JavaScript compilado, o deshabilite/desinstale el plugin hasta
entonces.

### Propiedad de la ruta del plugin bloqueada

Si los diagnósticos del plugin dicen
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
y la validación de la configuración continúa con `plugin present but blocked`, OpenClaw encontró
archivos de plugin propiedad de un usuario de Unix diferente al proceso que los está
cargando. Mantenga la configuración del plugin en su lugar; repare la propiedad del
sistema de archivos o ejecute OpenClaw como el mismo usuario que posee el directorio
de estado.

Para las instalaciones de Docker, la imagen oficial se ejecuta como `node` (uid `1000`), por lo que los directorios de configuración y espacio de trabajo de OpenClaw montados con bind en el host normalmente deberían ser propiedad del uid `1000`:

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si ejecuta intencionalmente OpenClaw como root, repare la raíz del plugin gestionado
para que sea propiedad de root en su lugar:

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Después de corregir la propiedad, vuelva a ejecutar `openclaw doctor --fix` o
`openclaw plugins registry --refresh` para que el registro persistente del plugin coincida
con los archivos reparados.

### Configuración lenta de herramientas de plugin

Si los turnos del agente parecen detenerse mientras preparan las herramientas, active
el registro de seguimiento y busque líneas de tiempo de fábrica de herramientas de
plugin:

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Busque:

```text
[trace:plugin-tools] factory timings ...
```

El resumen enumera el tiempo total de fábrica y las fábricas de herramientas de plugin
más lentas, incluyendo el id del plugin, los nombres de herramientas declarados, la
forma del resultado y si la herramienta es opcional. Las líneas lentas se promueven a
advertencias cuando una sola fábrica tarda al menos 1s o la preparación total de la
fábrica de herramientas del plugin tarda al menos 5s.

OpenClaw almacena en caché los resultados exitosos de la fábrica de herramientas de
plugin para resoluciones repetidas con el mismo contexto de solicitud efectivo. La
clave de caché incluye la configuración de tiempo de ejecución efectiva, el espacio de
trabajo, los ids de agente/sesión, la política de sandbox, la configuración del
navegador, el contexto de entrega, la identidad del solicitante y el estado de
propiedad, por lo que las fábricas que dependen de esos campos de confianza se
vuelven a ejecutar cuando cambia el contexto. Si los tiempos se mantienen altos, es
posible que el plugin esté realizando un trabajo costoso antes de devolver sus
definiciones de herramienta.

Si un plugin domina el tiempo, inspeccione sus registros en tiempo de ejecución:

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Luego actualice, reinstale o deshabilite ese complemento. Los autores de complementos deben mover la carga de dependencias costosas detrás de la ruta de ejecución de la herramienta en lugar de hacerlo dentro de la fábrica de herramientas.

Para conocer las raíces de dependencia, la validación de metadatos de paquetes, los registros del registro, el comportamiento de recarga al inicio y la limpieza heredada, consulte
[Resolución de dependencias de complementos](/es/plugins/dependency-resolution).

## Relacionado

- [Administrar complementos](/es/plugins/manage-plugins) - ejemplos de comandos para listar, instalar, actualizar, desinstalar y publicar
- [`openclaw plugins`](/es/cli/plugins) - referencia completa de la CLI
- [Inventario de complementos](/es/plugins/plugin-inventory) - lista generada de complementos integrados y externos
- [Referencia de complementos](/es/plugins/reference) - páginas de referencia generadas por complemento
- [Complementos comunitarios](/es/plugins/community) - descubrimiento de ClawHub y política de PR de documentación
- [Resolución de dependencias de complementos](/es/plugins/dependency-resolution) - raíces de instalación, registros del registro y límites de tiempo de ejecución
- [Compilación de complementos](/es/plugins/building-plugins) - guía de creación de complementos nativos
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview) - registro en tiempo de ejecución, enlaces y campos de API
- [Manifiesto de complementos](/es/plugins/manifest) - manifiesto y metadatos de paquetes
