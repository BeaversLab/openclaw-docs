---
summary: "Contratos de compatibilidad de complementos, metadatos de obsolescencia y expectativas de migración"
title: "Compatibilidad de complementos"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw mantiene los contratos de complementos antiguos conectados a través de adaptadores de compatibilidad con nombre antes de eliminarlos. Esto protege los complementos integrados y externos existentes mientras evolucionan los contratos del SDK, manifiesto, configuración y tiempo de ejecución del agente.

## Registro de compatibilidad

Los contratos de compatibilidad de complementos se rastrean en el registro central en
`src/plugins/compat/registry.ts`.

Cada registro tiene:

- un código de compatibilidad estable
- estado: `active`, `deprecated`, `removal-pending`, o `removed`
- propietario: SDK, configuración, configuración inicial, canal, proveedor, ejecución de complementos, tiempo de ejecución del agente,
  o núcleo
- fechas de introducción y obsolescencia cuando corresponda
- orientación de reemplazo
- documentos, diagnósticos y pruebas que cubran el comportamiento antiguo y nuevo

El registro es la fuente para la planificación del mantenedor y las verificaciones futuras del inspector de complementos. Si cambia un comportamiento orientado al complemento, agregue o actualice el registro de compatibilidad en el mismo cambio que agrega el adaptador.

La compatibilidad de reparación y migración de Doctor se rastrea por separado en
`src/commands/doctor/shared/deprecation-compat.ts`. Esos registros cubren formas antiguas
de configuración, diseños de libro mayor de instalación y shims de reparación que pueden necesitar mantenerse
disponibles después de que se elimine la ruta de compatibilidad del tiempo de ejecución.

Las barridas de lanzamiento deben verificar ambos registros. No elimine una migración de doctor
solo porque el registro de compatibilidad de tiempo de ejecución o configuración correspondiente haya caducado; primero
verifique que no haya una ruta de actualización compatible que aún necesite la reparación. Además
vuelva a validar cada anotación de reemplazo durante la planificación del lanzamiento porque la
propiedad del complemento y la huella de configuración pueden cambiar a medida que los proveedores y canales salen del
núcleo.

## Paquete del inspector de complementos

El inspector de complementos debe residir fuera del repositorio central de OpenClaw como un paquete/repositorio
separado respaldado por los contratos de compatibilidad y manifiesto con versiones.

La CLI del primer día debe ser:

```sh
openclaw-plugin-inspector ./my-plugin
```

Debe emitir:

- validación de manifiesto/esquema
- la versión de compatibilidad del contrato que se está verificando
- verificaciones de metadatos de instalación/fuente
- verificaciones de importación de ruta en frío
- advertencias de obsolescencia y compatibilidad

Use `--json` para una salida estable legible por máquina en anotaciones de CI. OpenClaw core debe exponer contratos y fixtures que el inspector pueda consumir, pero no debe publicar el binario del inspector desde el paquete principal `openclaw`.

## Política de obsolescencia

OpenClaw no debe eliminar un contrato de plugin documentado en la misma versión que introduce su reemplazo.

La secuencia de migración es:

1. Añadir el nuevo contrato.
2. Mantener el comportamiento antiguo conectado a través de un adaptador de compatibilidad con nombre.
3. Emitir diagnósticos o advertencias cuando los autores de los plugins puedan actuar.
4. Documentar el reemplazo y la línea de tiempo.
5. Probar tanto las rutas antiguas como las nuevas.
6. Esperar durante la ventana de migración anunciada.
7. Eliminar solo con la aprobación explícita de una versión breaking.

Los registros obsoletos deben incluir una fecha de inicio de la advertencia, un reemplazo, un enlace a la documentación y una fecha de eliminación final no más de tres meses después de que comience la advertencia. No añada una ruta de compatibilidad obsoleta con una ventana de eliminación abierta a menos que los mantenedores decidan explícitamente que es una compatibilidad permanente y la marquen como `active` en su lugar.

## Áreas de compatibilidad actuales

Los registros de compatibilidad actuales incluyen:

- importaciones amplias heredadas del SDK como `openclaw/plugin-sdk/compat`
- formas de plugin heredadas solo de hook y `before_agent_start`
- puntos de entrada de plugin `activate(api)` heredados mientras los plugins migran a `register(api)`
- alias heredados del SDK como `openclaw/extension-api`, `openclaw/plugin-sdk/channel-runtime`, `openclaw/plugin-sdk/command-auth` constructores de estado, `openclaw/plugin-sdk/test-utils`, y los alias de tipo `ClawdbotConfig` / `OpenClawSchemaType`
- lista de permitidos (allowlist) de plugins agrupados y comportamiento de habilitación
- metadatos de manifiesto de variables de entorno heredadas de proveedor/canal
- hooks y alias de tipo de plugin de proveedor heredados mientras los proveedores se mueven a hooks explícitos de catálogo, autenticación, pensamiento, reproducción y transporte
- alias de tiempo de ejecución heredados como `api.runtime.taskFlow`, `api.runtime.subagent.getSession`, `api.runtime.stt`, y `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)` obsoletos
- registro dividido de plugin de memoria heredado mientras los plugins de memoria se mueven a `registerMemoryCapability`
- asistentes del SDK del canal heredado para esquemas de mensajes nativos, bloqueo de menciones,
  formato de sobre entrante y anidamiento de capacidades de aprobación
- sugerencias de activación que están siendo reemplazadas por la propiedad de las contribuciones del manifiesto
- reserva de ejecución (runtime) de `setup-api` mientras los descriptores de configuración se mueven a metadatos
  en frío `setup.requiresRuntime: false`
- ganchos (hooks) del proveedor `discovery` mientras los ganchos del catálogo de proveedores se mueven a
  `catalog.run(...)`
- metadatos del canal `showConfigured` / `showInSetup` mientras los paquetes de canal se mueven
  a `openclaw.channel.exposure`
- claves de configuración de política de ejecución (runtime-policy) heredadas mientras doctor migra los operadores a
  `agentRuntime`
- reserva de metadatos de configuración de canal incluido generado mientras los metadatos
  `channelConfigs` con prioridad de registro llegan
- indicadores de entorno de desactivación del registro de complementos y migración de instalación persistidos mientras
  los flujos de reparación migran a los operadores a `openclaw plugins registry --refresh` y
  `openclaw doctor --fix`
- rutas de configuración de búsqueda web, recuperación web y x_search propiedad de complementos heredadas mientras
  doctor las migra a `plugins.entries.<plugin>.config`
- configuración creada por `plugins.installs` heredada y alias de ruta de carga de complementos incluidos
  mientras los metadatos de instalación se mueven al libro mayor de complementos gestionados por estado

El nuevo código de complementos debe preferir el reemplazo enumerado en el registro y en la
nguía de migración específica. Los complementos existentes pueden seguir usando una ruta de compatibilidad
hasta que los documentos, los diagnósticos y las notas de la versión anuncien un período de eliminación.

## Notas de la versión

Las notas de la versión deben incluir las próximas obsolescencias de complementos con fechas objetivo y
enlaces a la documentación de migración. Esa advertencia debe ocurrir antes de que una ruta de compatibilidad
pase a `removal-pending` o `removed`.
