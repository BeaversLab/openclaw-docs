---
summary: "Plan de eliminación primero para mover el pegamento de entrada de canal repetido al núcleo."
read_when:
  - Auditing why the channel ingress refactor added too much code
  - Moving route, command, event, activation, or access-group policy from bundled plugins into core
  - Reviewing whether a channel ingress helper actually deletes bundled plugin code
title: "Plan de eliminación del núcleo de Ingress"
sidebarTitle: "Eliminación del núcleo de Ingress"
---

# Plan de eliminación del núcleo de Ingress

La refactorización de entrada no es saludable mientras agrega miles de líneas netas. La centralización del núcleo solo cuenta cuando el código de producción del complemento empaquetado se reduce y la compatibilidad con SDK de terceros antiguos se pone en cuarentena en shims de SDK/núcleo.

Forma de tiempo de ejecución deseada:

```text
bundled plugin event
  -> extract platform facts locally
  -> resolve shared ingress once when facts are available
  -> branch on generic ingress projections/outcomes
  -> perform platform side effects locally

old third-party helper
  -> SDK compatibility shim
  -> shared ingress-compatible projection where possible
  -> old return shape preserved
```

Los complementos empaquetados no deberían traducir la entrada de nuevo a formas locales `AccessResult`,
`GroupAccessDecision`, `CommandAuthDecision`, `DmCommandAccess` o
`{ allowed, reasonCode }` a menos que ese tipo sea una API pública de complemento.

## Presupuesto

Medido contra la base de fusión del PR con `origin/main`, incluyendo archivos no rastreados.

```text
merge-base            1671e7532adb

current:
core production       +3,922 / -546    = +3,376
docs                  +601 / -17       = +584
other                 +145 / -2        = +143
plugin production     +4,148 / -5,388  = -1,240
tests                 +2,326 / -2,414  = -88
total                 +11,142 / -8,367 = +2,775

required:
plugin production     <= -1,500
core production       <= +1,500, or paid for by larger plugin deletion
tests                 <= +1,000
total                 <= +2,000

stretch:
plugin production     <= -2,500
core production       <= +1,200
total                 <= 0
```

Limpieza restante mínima:

```text
plugin production     needs 260 more net deleted lines
total                 needs 775 more net deleted lines
core production       still +1,876 over standalone budget, unless paid down by plugin deletion
```

La eliminación de solo comentarios no cuenta como limpieza. El pase de presupuesto anterior fue demasiado generoso porque incluía comentarios explicativos restaurados de QQBot; este documento rastrea solo el movimiento de código ejecutable/documentación/pruebas.

Volver a medir después de cada ola de limpieza:

```sh
base=$(git merge-base HEAD origin/main)
git diff --shortstat "$base"
git diff --numstat "$base" -- src/channels/message-access src/plugin-sdk extensions | sort -nr -k1 | head -n 80
pnpm lint:extensions:no-deprecated-channel-access
```

## Diagnóstico

El primer pase agregó el kernel de entrada compartido, luego dejó demasiada autorización local del complemento junto a él:

```text
platform facts
  -> shared ingress state and decision
  -> plugin-local DTO or legacy projection
  -> plugin-local if/else ladder
```

Eso duplica el modelo. La producción del núcleo creció en aproximadamente 3,376 líneas, mientras que la producción del complemento empaquetado es 1,240 líneas más pequeña. Eso es mejor que el primer pase, pero no está dentro del presupuesto mínimo. La solución sigue siendo eliminación primero:

- eliminar DTOs de complemento que solo renombran campos de entrada
- eliminar pruebas que solo afirman la forma del contenedor
- agregar ayudantes del núcleo solo cuando el mismo parche elimina código de complemento empaquetado
- mantener la compatibilidad con el SDK antiguo solo en shims de SDK/núcleo
- reempaquetar el núcleo después de que la eliminación del contenedor exponga la forma estable

## Puntos críticos

Archivos de producción empaquetados positivos que aún necesitan reducirse:

```text
extensions/telegram/src/ingress.ts                        +126
extensions/discord/src/monitor/dm-command-auth.ts         +101
extensions/signal/src/monitor/access-policy.ts             +92
extensions/feishu/src/policy.ts                            +85
extensions/slack/src/monitor/auth.ts                       +64
extensions/googlechat/src/monitor-access.ts                +59
extensions/nextcloud-talk/src/inbound.ts                   +51
extensions/matrix/src/matrix/monitor/access-state.ts       +49
extensions/irc/src/inbound.ts                              +44
extensions/imessage/src/monitor/inbound-processing.ts      +36
extensions/qa-channel/src/inbound.ts                       +34
extensions/qqbot/src/bridge/sdk-adapter.ts                 +33
extensions/tlon/src/monitor/utils.ts                       +30
extensions/twitch/src/access-control.ts                    +22
extensions/qqbot/src/engine/commands/slash-command-handler.ts +20
extensions/telegram/src/bot-handlers.runtime.ts            +19
```

La rama aún no está dentro del presupuesto mínimo. El trabajo restante relevante para la revisión debería eliminar el flujo de autorización repetido, el andamiaje de giro o las pruebas de contenedor antes de agregar otra abstracción del núcleo.

## Lectura de código actual

El límite (seam) principal saludable ya existe en `src/channels/message-access/runtime.ts`:
posee adaptadores de identidad, listas de permitidos efectivas, lecturas del almacén de emparejamiento, descriptores
de ruta, preajustes de comandos/eventos, grupos de acceso y la proyección `ResolvedChannelMessageIngress` final resuelta.

El crecimiento restante es principalmente código pegamento (glue) del complemento superpuesto sobre ese límite:

- `extensions/telegram/src/ingress.ts` envuelve las decisiones principales en ayudantes de
  comandos/eventos específicos de Telegram, luego los sitios de llamada todavía pasan listas de permitidos
  normalizadas precalculadas y listas de propietarios.
- `extensions/discord/src/monitor/dm-command-auth.ts`,
  `extensions/feishu/src/policy.ts`, `extensions/googlechat/src/monitor-access.ts`,
  y `extensions/matrix/src/matrix/monitor/access-state.ts` todavía mantienen
  DTOs de política local o nombres de decisiones heredados junto al ingress.
- `extensions/signal/src/monitor/access-policy.ts` mantiene correctamente la normalización de
  identidad de Signal y las respuestas de emparejamiento de forma local, pero todavía tiene un límite
  de envoltorio que debería colapsar en un consumo directo del ingress.
- `extensions/nextcloud-talk/src/inbound.ts`, `extensions/irc/src/inbound.ts`,
  `extensions/qa-channel/src/inbound.ts`, `extensions/zalo/src/monitor.ts`, y
  `extensions/zalouser/src/monitor.ts` todavía repiten el ensamblaje de ruta/sobre/turno
  que puede moverse a ayudantes de turnos compartidos fuera del núcleo del ingress.

Conclusión: mover más código al núcleo solo es útil si elimina estas
capas de envoltorio del complemento en el mismo parche. Agregar otra abstracción mientras
se dejan los retornos del envoltorio en su lugar repite el error.

## Límite

El núcleo posee la política genérica:

- normalización y coincidencia de listas de permitidos
- expansión y diagnóstico de grupos de acceso
- lecturas de listas de permitidos de DM del almacén de emparejamiento
- compuertas (gates) de ruta, remitente, comando, evento y activación
- mapeo de admisión: despacho, descarte, omisión, observación, emparejamiento
- estado redactado, decisiones, diagnósticos y proyecciones de compatibilidad del SDK
- descriptores genéricos reutilizables para identidad, ruta, comando, evento, activación
  y resultados

Los complementos poseen los hechos del transporte y los efectos secundarios:

- autenticidad de webhook/socket/solicitud
- extracción de identidad de la plataforma y búsquedas de API
- valores predeterminados de política específicos del canal
- entrega de desafíos de emparejamiento, respuestas, acks, reacciones, escritura, medios, historial,
  configuración, doctor, estado, registros y textos visibles para el usuario

Core debe permanecer agnóstico al canal: sin Discord, Slack, Telegram, Matrix, sala, gremio, espacio, cliente de API o predeterminado específico del complemento en `src/channels/message-access`.

## Regla de Aceptación

Cada nuevo asistente del núcleo debe eliminar inmediatamente el código de producción del complemento empaquetado.

```text
one bundled caller        reject; keep plugin-local
two bundled callers       accept only if plugin production LOC drops
three or more callers     plugin deletion must be at least 2x new core LOC
compatibility-only helper SDK/core shim only; never bundled hot paths
```

Deténgase y rediseñe si:

- las líneas de código de producción del complemento aumentan
- las pruebas crecen más rápido de lo que se reduce la producción
- una ruta activa empaquetada devuelve un DTO que solo cambia el nombre de `ResolvedChannelMessageIngress`
- un asistente del núcleo necesita una identificación de canal, objeto de plataforma, cliente de API o un valor predeterminado específico del canal

## Paquetes de Trabajo

1. Congelar el presupuesto.
   Poner las líneas de código en el PR, mantener el lint de deprecated-ingress en verde e incluir líneas de código antes/después en las confirmaciones de limpieza.

2. Eliminar las costuras finas de DTO.
   Reemplazar los retornos de contenedores locales del complemento con `ResolvedChannelMessageIngress`,
   `senderAccess`, `commandAccess`, `routeAccess` o `ingress` directamente. Comenzar
   con QQBot, Telegram, Slack, Discord, Signal, Feishu, Matrix, iMessage y
   Tlon. Eliminar las pruebas de forma de contenedor; mantener las pruebas de comportamiento.

3. Agregar clasificación de resultados solo con eliminaciones.
   Un clasificador genérico puede exponer `dispatch`, `pairing-required`,
   `skip-activation`, `drop-command`, `drop-route`, `drop-sender` y
   `drop-ingress`. Debe derivarse del gráfico de decisiones, no de cadenas de razones,
   y migrar al menos tres complementos en el mismo parche.

4. Agregar constructores de descriptores de ruta solo con eliminaciones.
   Los asistentes genéricos de destino de ruta y remitente de ruta son aceptables solo si
   reducen inmediatamente los complementos con muchas rutas: Google Chat, IRC, Microsoft Teams,
   Nextcloud Talk, Mattermost, Slack, Zalo y Zalo Personal.

5. Agregar preajustes de comando/evento solo con eliminaciones.
   Centralizar las formas de comando de texto, comando nativo, devolución de llamada y origen-sujeto.
   Los consumidores de comandos deben ser no autorizados por defecto cuando no se ejecutó ninguna puerta de comando;
   los eventos no deben comenzar el emparejamiento.

6. Agregar preajustes de identidad solo donde eliminen el texto estándar.
   Los asistentes de id estable, id estable más alias, teléfono/e164 e identificador múltiple
   están permitidos cuando los valores sin procesar ingresan solo a la entrada del adaptador y el estado redactado mantiene
   ids/recuentos opacos.

7. Compartir el montaje de turnos autorizados.
   Fuera del núcleo de ingreso (ingress kernel), eliminar el andamiaje repetido de route/envelope/context/reply
   de QA Channel, IRC, Nextcloud Talk, Zalo y Zalo Personal.
   El núcleo puede ser propietario de la secuenciación de route/session/envelope/dispatch; los complementos mantienen
   la entrega y el contexto específico del canal.

8. Poner en cuarentena la compatibilidad.
   Los auxiliares del SDK en desuso siguen siendo compatibles con el código fuente, pero las rutas críticas (hot paths) empaquetadas no deben
   importar fachadas de ingreso (ingress) o autenticación de comandos (command-auth) en desuso. Las pruebas de compatibilidad deben
   utilizar complementos de terceros falsos, no internos de complementos empaquetados.

9. Reempaquetar el núcleo.
   Después de la eliminación de envoltorios, colapsar módulos de un solo uso, eliminar exportaciones no utilizadas, mover
   la proyección de compatibilidad fuera de las rutas críticas y mantener pruebas enfocadas para identidad,
   route, command/event, activation, grupos de acceso y shims de compatibilidad.

## Oleadas de eliminación

Ejecutar estas en orden. Cada oleada debe reducir las líneas de código (LOC) de producción empaquetadas.

1. Colapso de envoltorios, delta esperado de complemento: -400 a -600.
   Reemplazar los tipos de resultado `resolveXAccess`, `resolveXCommandAccess` y
   `accessFromIngress` locales del complemento con lecturas directas de
   `ResolvedChannelMessageIngress`. Primeros objetivos: autenticación de comandos de Discord DM,
   política de Feishu, estado de acceso de Matrix, ingreso de Telegram, política de acceso de Signal,
   adaptador SDK de QQBot.

2. Auxiliares de resultado compartidos, delta esperado de complemento: -200 a -350.
   Agregar un clasificador genérico solo si elimina las escaleras repetidas de
   `shouldBlockControlCommand`, emparejamiento (pairing), omisión de activación, bloqueo de ruta y bloqueo de remitente
   en al menos tres complementos.

3. Constructores de descriptores de ruta, delta esperado de complemento: -200 a -350.
   Mover el ensamblaje repetido de descriptores de destino de ruta y remitente de ruta a auxiliares
   del núcleo. Primeros objetivos: Google Chat, IRC, Microsoft Teams, Nextcloud Talk,
   Mattermost, Slack, Zalo, Zalo Personal.

4. Uso compartido de montaje de turnos, delta esperado de complemento: -250 a -450.
   Utilizar una secuenciación común de route/session/envelope/dispatch para complementos de entrada
   simples. Primeros objetivos: QA Channel, IRC, Nextcloud Talk, Zalo, Zalo Personal.

5. Reempaquetado del núcleo, delta esperado del núcleo: -300 a -700.
   Después de que los complementos consuman proyecciones de tiempo de ejecución directamente, eliminar módulos de un solo uso,
   fusionar archivos pequeños de nuevo en `runtime.ts` o hermanos enfocados, y mantener los archivos
   de compatibilidad del SDK separados de las rutas críticas empaquetadas.

6. Poda de pruebas, delta de pruebas esperado: -300 a -600.
   Elimina las pruebas que solo afirman formas de contenedor eliminadas. Mantén las pruebas de comportamiento para
   denegación de comandos, respaldo de grupo, coincidencia de origen-sujeto, omisión de activación,
   grupos de acceso, emparejamiento y redacción.

Forma mínima de aterrizaje esperada después de estas olas:

```text
plugin production     <= -1,500
core production       about +1,800 to +2,200 before final repack
tests                 <= +500
total                 <= +2,000
```

## No Mover

No muevas los valores predeterminados de configuración de la plataforma, la experiencia de usuario de configuración, el texto de doctor/fix, búsquedas de API,
comprobaciones de presencia del propietario en Slack, manejo de alias/verificación en Matrix, análisis de devolución de llamada en
Telegram, análisis de sintaxis de comandos, registro de comandos nativos, análisis de carga útil de reacciones,
respuestas de emparejamiento, respuestas de comandos, acks, escritura, medios, historial
o registros.

## Verificación

Bucle local dirigido:

```sh
pnpm lint:extensions:no-deprecated-channel-access
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts src/plugin-sdk/access-groups.test.ts
pnpm test extensions/<changed-plugin>/src/...
pnpm plugin-sdk:api:check
pnpm config:docs:check
pnpm check:docs
git diff --check
```

Usa Testbox para pruebas amplias de puertas cambiadas/prueba de suite completa una vez que la tendencia de LOC esté
dentro del presupuesto.

Cada paquete de trabajo registra:

- LOC antes/después por categoría
- contenedores de complementos eliminados
- nuevos LOC del asistente central, si los hay
- pruebas dirigidas ejecutadas
- lista de puntos calientes restantes

## Criterios de Salida

- las importaciones de producción agrupadas no utilizan fachadas en desuso de acceso a canales o autenticación de comandos
- el código de compatibilidad está aislado en costuras de SDK/núcleo
- los complementos agrupados consumen proyecciones de entrada o resultados genéricos directamente
- el LOC de producción del complemento es al menos 1.500 netos negativos frente a `origin/main`
- el LOC de producción del núcleo es <= +1.500, o cualquier exceso se paga mientras el total se mantiene
  <= +2.000
- las pruebas representativas cubren la redacción, la ruta, el comando/evento, la activación,
  el grupo de acceso y el comportamiento de respaldo específico del canal
