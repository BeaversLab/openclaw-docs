---
summary: "Roles de operador, alcances y verificaciones en el momento de aprobación para clientes de Gateway"
read_when:
  - Debugging missing operator scope errors
  - Reviewing device or node pairing approvals
  - Adding or classifying Gateway RPC methods
title: "Alcances de operador"
---

Los alcances de operador definen lo que un cliente de Gateway puede hacer después de autenticarse.
Son una barrera de seguridad del plano de control dentro de un dominio de operador de Gateway confiable,
no un aislamiento multiinquilino hostil. Si necesita una separación sólida entre
personas, equipos o máquinas, ejecute Gateways separados bajo usuarios de sistema operativo o
hosts separados.

Relacionado: [Seguridad](/es/gateway/security), [Protocolo de Gateway](/es/gateway/protocol),
[Emparejamiento de Gateway](/es/gateway/pairing), [CLI de Dispositivos](/es/cli/devices).

## Roles

Los clientes WebSocket de Gateway se conectan con un rol:

- `operator`: clientes del plano de control como CLI, Interfaz de usuario de control, automatización y
  procesos auxiliares de confianza.
- `node`: hosts de capacidades como macOS, iOS, Android o nodos sin cabeza que
  exponen comandos a través de `node.invoke`.

Los métodos RPC de operador requieren el rol `operator`. Los métodos originados por nodos
requieren el rol `node`.

## Niveles de alcance

| Alcance                 | Significado                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`         | Estado de solo lectura, listas, catálogo, registros, lecturas de sesión y otras llamadas de control de plano no mutantes.                                                                                                              |
| `operator.write`        | Acciones de operador mutantes normales como enviar mensajes, invocar herramientas, actualizar la configuración de talk/voz y retransmisión de comandos de nodo. También satisface `operator.read`.                                     |
| `operator.admin`        | Acceso de control de plano administrativo. Satisface cada alcance `operator.*`. Requerido para la mutación de configuración, actualizaciones, enlaces nativos, espacios de nombres reservados sensibles y aprobaciones de alto riesgo. |
| `operator.pairing`      | Gestión de emparejamiento de dispositivos y nodos, incluyendo listado, aprobación, rechazo, eliminación, rotación y revocación de registros de emparejamiento o tokens de dispositivo.                                                 |
| `operator.approvals`    | API de aprobación de ejecución y complementos.                                                                                                                                                                                         |
| `operator.talk.secrets` | Lectura de la configuración de Talk incluyendo los secretos.                                                                                                                                                                           |

Los alcances `operator.*` futuros desconocidos requieren una coincidencia exacta a menos que la persona que llama tenga
`operator.admin`.

## El alcance del método es solo la primera puerta

Cada RPC de Gateway tiene un alcance de método de mínimo privilegio. Ese alcance de método decide
si la solicitud puede alcanzar el controlador (handler). Algunos controladores luego aplican comprobaciones
estrictas en el momento de la aprobación basándose en lo concreto que se está aprobando o modificando.

Ejemplos:

- `device.pair.approve` es accesible con `operator.pairing`, pero aprobar un
  dispositivo de operador solo puede crear o conservar alcances que la persona que llama ya posee.
- `node.pair.approve` es accesible con `operator.pairing`, luego deriva alcances de
  aprobación adicionales de la lista de comandos pendientes del nodo.
- `chat.send` es normalmente un método con alcance de escritura, pero `/config set`
  persistentes y `/config unset` requieren `operator.admin` a nivel de comando.

Esto permite que los operadores con menor alcance realicen acciones de emparejamiento de bajo riesgo sin convertir
todas las aprobaciones de emparejamiento en exclusivas para administradores.

## Aprobaciones de emparejamiento de dispositivos

Los registros de emparejamiento de dispositivos son la fuente duradera de roles y alcances aprobados.
Los dispositivos ya emparejados no obtienen acceso más amplio silenciosamente: las reconexiones que solicitan
un rol más amplio o alcances más amplios crean una nueva solicitud de actualización pendiente.

Al aprobar una solicitud de dispositivo:

- Una solicitud sin rol de operador no necesita aprobación de alcance de token de operador.
- Una solicitud para `operator.read`, `operator.write`, `operator.approvals`,
  `operator.pairing` o `operator.talk.secrets` requiere que la persona que llamada posea
  esos alcances, o `operator.admin`.
- Una solicitud para `operator.admin` requiere `operator.admin`.
- Una solicitud de reparación sin alcances explícitos puede heredar los alcances del token de
  operador existente. Si ese token existente tiene alcance de administrador, la aprobación aún requiere
  `operator.admin`.

Para las sesiones de token de dispositivo emparejado, la gestión es de autoalcance (self-scoped) a menos que la persona que llama
también tenga `operator.admin`: las personas que no son administradores solo ven sus propias entradas de emparejamiento,
pueden aprobar o rechazar solo su propia solicitud pendiente, y pueden rotar, revocar o
eliminar solo su propia entrada de dispositivo.

## Aprobaciones de emparejamiento de nodos

El `node.pair.*` heredado utiliza un almacén de emparejamiento de nodos propiedad del Gateway separado. Los nodos WS utilizan el emparejamiento de dispositivos con `role: node`, pero se aplica el mismo vocabulario de nivel de aprobación.

`node.pair.approve` utiliza la lista de comandos de solicitud pendiente para derivar alcances adicionales requeridos:

- Solicitud sin comandos: `operator.pairing`
- Comandos de nodo no exec: `operator.pairing` + `operator.write`
- `system.run`, `system.run.prepare` o `system.which`:
  `operator.pairing` + `operator.admin`

El emparejamiento de nodos establece la identidad y la confianza. No reemplaza la política de aprobación exec `system.run` propia del nodo.

## Autenticación de secreto compartido

La autenticación mediante token/contraseña compartida del Gateway se trata como acceso de operador de confianza para ese Gateway. Las superficies HTTP compatibles con OpenAI y `/tools/invoke` restauran el conjunto normal de alcances predeterminados completo del operador para la autenticación de portador de secreto compartido, incluso si un llamador envía alcances declarados más limitados.

Los modos con identidad, como la autenticación de proxy de confianza o `none` de ingreso privado, aún pueden respetar los alcances declarados explícitos. Utilice Gateways separados para una separación real de los límites de confianza.
