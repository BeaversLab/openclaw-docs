---
summary: "Refactorización de Clawnet: unificar protocolo de red, roles, autenticación, aprobaciones, identidad"
read_when:
  - Planificación de un protocolo de red unificado para nodos + clientes de operadores
  - Reelaboración de aprobaciones, emparejamiento, TLS y presencia en todos los dispositivos
title: "Refactorización de Clawnet"
---

# Refactorización de Clawnet (unificación de protocolo y autenticación)

## Hola

Hola Peter: gran dirección; esto permite una UX más sencilla y una seguridad más sólida.

## Propósito

Un único y riguroso documento para:

- Estado actual: protocolos, flujos, límites de confianza.
- Puntos de dolor: aprobaciones, enrutamiento multi‑salto, duplicación de interfaz de usuario.
- Nuevo estado propuesto: un protocolo, roles con ámbito, autenticación/emparejamiento unificados, anclaje TLS.
- Modelo de identidad: IDs estables + slugs bonitos.
- Plan de migración, riesgos, preguntas abiertas.

## Objetivos (de la discusión)

- Un protocolo para todos los clientes (app de Mac, CLI, iOS, Android, nodo sin interfaz).
- Todos los participantes de la red autenticados y emparejados.
- Claridad de roles: nodos frente a operadores.
- Aprobaciones centrales enrutadas a donde esté el usuario.
- Cifrado TLS + anclaje opcional para todo el tráfico remoto.
- Duplicación mínima de código.
- Una sola máquina debe aparecer una vez (sin entrada duplicada de interfaz de usuario/nodo).

## No objetivos (explícitos)

- Eliminar la separación de capacidades (aún se necesita el principio de mínimo privilegio).
- Exponer el plano de control completo de la puerta de enlace sin comprobaciones de ámbito.
- Hacer que la autenticación dependa de etiquetas humanas (los slugs siguen sin ser de seguridad).

---

# Estado actual (tal cual)

## Dos protocolos

### 1) WebSocket de puerta de enlace (plano de control)

- Superficie de API completa: configuración, canales, modelos, sesiones, ejecuciones de agentes, registros, nodos, etc.
- Enlace predeterminado: loopback. Acceso remoto a través de SSH/Tailscale.
- Autenticación: token/contraseña mediante `connect`.
- Sin anclaje TLS (depende de loopback/túnel).
- Código:
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Puente (transporte de nodo)

- Superficie de lista de permitidos estrecha, identidad del nodo + emparejamiento.
- JSONL sobre TCP; TLS opcional + anclaje de huella digital del certificado.
- TLS anuncia la huella digital en el TXT de descubrimiento.
- Código:
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## Clientes del plano de control hoy en día

- CLI → Gateway WS mediante `callGateway` (`src/gateway/call.ts`).
- Interfaz de usuario de la app de macOS → Gateway WS (`GatewayConnection`).
- Interfaz de usuario de control web → Gateway WS.
- ACP → Gateway WS.
- El control del navegador utiliza su propio servidor de control HTTP.

## Nodos hoy

- La aplicación de macOS en modo nodo se conecta al puente Gateway (`MacNodeBridgeSession`).
- Las aplicaciones de iOS/Android se conectan al puente Gateway.
- Emparejamiento + token por nodo almacenado en el gateway.

## Flujo de aprobación actual (exec)

- El agente usa `system.run` a través del Gateway.
- El Gateway invoca al nodo a través del puente.
- El tiempo de ejecución del nodo decide la aprobación.
- Prompt de UI mostrado por la aplicación de Mac (cuando el nodo == aplicación de Mac).
- El nodo devuelve `invoke-res` al Gateway.
- Multi‑hop, UI vinculada al host del nodo.

## Presencia + identidad hoy

- Entradas de presencia del Gateway desde clientes WS.
- Entradas de presencia del nodo desde el puente.
- La aplicación de Mac puede mostrar dos entradas para la misma máquina (UI + nodo).
- Identidad del nodo almacenada en el almacén de emparejamiento; identidad de UI separada.

---

# Problemas / puntos dolorosos

- Dos pilas de protocolos que mantener (WS + Puente).
- Aprobaciones en nodos remotos: el aviso aparece en el host del nodo, no donde está el usuario.
- TLS pinning solo existe para el puente; WS depende de SSH/Tailscale.
- Duplicación de identidad: la misma máquina se muestra como múltiples instancias.
- Roles ambiguos: las capacidades de UI + nodo + CLI no están claramente separadas.

---

# Nuevo estado propuesto (Clawnet)

## Un protocolo, dos roles

Único protocolo WS con rol + alcance.

- **Rol: node** (host de capacidades)
- **Rol: operator** (plano de control)
- **Alcance** opcional para el operador:
  - `operator.read` (estado + visualización)
  - `operator.write` (ejecución de agente, envíos)
  - `operator.admin` (config, canales, modelos)

### Comportamientos de rol

**Node**

- Puede registrar capacidades (`caps`, `commands`, permisos).
- Puede recibir comandos `invoke` (`system.run`, `camera.*`, `canvas.*`, `screen.record`, etc).
- Puede enviar eventos: `voice.transcript`, `agent.request`, `chat.subscribe`.
- No puede llamar a las APIs del plano de control de config/models/channels/sessions/agent.

**Operator**

- API completa del plano de control, restringida por el alcance.
- Recibe todas las aprobaciones.
- No ejecuta acciones del sistema operativo directamente; enruta a los nodos.

### Regla clave

El rol es por conexión, no por dispositivo. Un dispositivo puede abrir ambos roles, por separado.

---

# Autenticación unificada + emparejamiento

## Identidad del cliente

Cada cliente proporciona:

- `deviceId` (estable, derivado de la clave del dispositivo).
- `displayName` (nombre legible).
- `role` + `scope` + `caps` + `commands`.

## Flujo de emparejamiento (unificado)

- El cliente se conecta sin autenticar.
- La puerta de enlace crea una **solicitud de emparejamiento** para ese `deviceId`.
- El operador recibe una solicitud; aprueba/deniega.
- La puerta de enlace emite credenciales vinculadas a:
  - clave pública del dispositivo
  - rol(es)
  - ámbito(s)
  - capacidades/comandos
- El cliente guarda el token, se vuelve a conectar autenticado.

## Autenticación vinculada al dispositivo (evitar la repetición de tokens de portador)

Preferido: pares de claves de dispositivo.

- El dispositivo genera un par de claves una sola vez.
- `deviceId = fingerprint(publicKey)`.
- La puerta de enlace envía un nonce; el dispositivo firma; la puerta de enlace verifica.
- Los tokens se emiten a una clave pública (prueba de posesión), no a una cadena.

Alternativas:

- mTLS (certificados de cliente): el más fuerte, más complejidad operativa.
- Tokens de portador de corta duración solo como una fase temporal (rotar + revocar antes).

## Aprobación silenciosa (heurística SSH)

Definirlo con precisión para evitar un eslabón débil. Preferir uno:

- **Solo local**: emparejar automáticamente cuando el cliente se conecta a través de loopback/Unix socket.
- **Desafío a través de SSH**: la puerta de enlace emite un nonce; el cliente demuestra SSH recuperándolo.
- **Ventana de presencia física**: después de una aprobación local en la interfaz de usuario del host de la puerta de enlace, permitir el emparejamiento automático durante una ventana corta (por ejemplo, 10 minutos).

Registrar siempre + grabar autoaprobaciones.

---

# TLS en todas partes (desarrollo + producción)

## Reutilizar TLS de puente existente

Usar el tiempo de ejecución TLS actual + fijación de huella digital:

- `src/infra/bridge/server/tls.ts`
- lógica de verificación de huella digital en `src/node-host/bridge-client.ts`

## Aplicar a WS

- El servidor WS soporta TLS con el mismo certificado/clave + huella digital.
- Los clientes WS pueden fijar la huella digital (opcional).
- El descubrimiento anuncia TLS + huella digital para todos los puntos finales.
  - El descubrimiento son solo pistas de localización; nunca un ancla de confianza.

## Por qué

- Reducir la dependencia de SSH/Tailscale para la confidencialidad.
- Hacer que las conexiones móviles remotas sean seguras de forma predeterminada.

---

# Rediseño de aprobaciones (centralizado)

## Actual

La aprobación ocurre en el host del nodo (tiempo de ejecución del nodo de la aplicación Mac). La solicitud aparece donde se ejecuta el nodo.

## Propuesto

La aprobación está **alojada en la puerta de enlace**, la interfaz de usuario se entrega a los clientes del operador.

### Nuevo flujo

1. Gateway recibe intención `system.run` (agente).
2. Gateway crea registro de aprobación: `approval.requested`.
3. Las interfaces de usuario del operador muestran un aviso.
4. Decisión de aprobación enviada al gateway: `approval.resolve`.
5. Gateway invoca el comando del nodo si se aprueba.
6. El nodo se ejecuta, devuelve `invoke-res`.

### Semántica de aprobación (endurecimiento)

- Transmisión a todos los operadores; solo la interfaz de usuario activa muestra un modal (los demás reciben una notificación).
- Gana la primera resolución; el gateway rechaza las resoluciones posteriores por ya estar resuelto.
- Tiempo de espera predeterminado: denegar después de N segundos (por ejemplo, 60s), registrar el motivo.
- La resolución requiere el alcance `operator.approvals`.

## Beneficios

- El aviso aparece donde esté el usuario (mac/teléfono).
- Aprobaciones consistentes para nodos remotos.
- El tiempo de ejecución del nodo permanece sin cabeza (headless); sin dependencia de la interfaz de usuario.

---

# Ejemplos de claridad de roles

## Aplicación de iPhone

- **Rol de nodo** para: micrófono, cámara, chat de voz, ubicación, pulsar para hablar.
- **operator.read** opcional para el estado y la vista de chat.
- **operator.write/admin** opcional solo cuando se habilita explícitamente.

## Aplicación de macOS

- Rol de operador por defecto (interfaz de usuario de control).
- Rol de nodo cuando "Nodo Mac" está habilitado (system.run, pantalla, cámara).
- Mismo deviceId para ambas conexiones → entrada de interfaz de usuario combinada.

## Línea de comandos (CLI)

- Rol de operador siempre.
- Alcance derivado por subcomando:
  - `status`, `logs` → lectura
  - `agent`, `message` → escritura
  - `config`, `channels` → administrador
  - aprobaciones + emparejamiento → `operator.approvals` / `operator.pairing`

---

# Identidad + slugs

## ID estable

Requerido para autenticación; nunca cambia.
Preferido:

- Huella del par de claves (hash de clave pública).

## Slug bonito (tema de langosta)

Solo etiqueta humana.

- Ejemplo: `scarlet-claw`, `saltwave`, `mantis-pinch`.
- Almacenado en el registro del gateway, editable.
- Manejo de colisiones: `-2`, `-3`.

## Agrupación de interfaz de usuario

Mismo `deviceId` entre roles → una sola fila "Instancia":

- Insignia: `operator`, `node`.
- Muestra capacidades + última vez visto.

---

# Estrategia de migración

## Fase 0: Documentar + alinear

- Publicar este documento.
- Inventariar todas las llamadas de protocolo + flujos de aprobación.

## Fase 1: Añadir roles/ámbitos a WS

- Ampliar los parámetros `connect` con `role`, `scope`, `deviceId`.
- Añadir puertas de lista blanca para el rol de nodo.

## Fase 2: Compatibilidad del puente

- Mantener el puente en ejecución.
- Añadir soporte de nodo WS en paralelo.
- Limitar las características detrás de una bandera de configuración.

## Fase 3: Aprobaciones centrales

- Añadir eventos de solicitud y resolución de aprobación en WS.
- Actualizar la interfaz de usuario de la aplicación mac para solicitar + responder.
- El tiempo de ejecución del nodo deja de solicitar en la interfaz de usuario.

## Fase 4: Unificación TLS

- Añadir configuración TLS para WS usando el tiempo de ejecución TLS del puente.
- Añadir anclaje a los clientes.

## Fase 5: Deprecar el puente

- Migrar el nodo iOS/Android/mac a WS.
- Mantener el puente como respaldo; eliminar una vez que sea estable.

## Fase 6: Autenticación vinculada al dispositivo

- Requerir identidad basada en claves para todas las conexiones no locales.
- Añadir interfaz de usuario de revocación + rotación.

---

# Notas de seguridad

- Rol/lista blanca aplicado en el límite de la puerta de enlace.
- Ningún cliente obtiene la API "completa" sin el ámbito de operador.
- Emparejamiento requerido para _todas_ las conexiones.
- TLS + anclaje reduce el riesgo MITM para móviles.
- La aprobación silenciosa de SSH es una conveniencia; aún se registra y es revocable.
- El descubrimiento nunca es un ancla de confianza.
- Las afirmaciones de capacidad se verifican contra las listas blancas del servidor por plataforma/tipo.

# Transmisión + cargas útiles grandes (medios del nodo)

El plano de control WS está bien para mensajes pequeños, pero los nodos también hacen:

- clips de cámara
- grabaciones de pantalla
- transmisiones de audio

Opciones:

1. Tramas binarias WS + fragmentación + reglas de contrapresión.
2. Punto final de transmisión separado (aún TLS + autenticación).
3. Mantener el puente por más tiempo para comandos con mucho contenido multimedia, migrar al final.

Elegir uno antes de la implementación para evitar desviaciones.

# Política de capacidades + comandos

- Las capacidades/comandos reportados por el nodo se tratan como **afirmaciones**.
- La puerta de enlace hace cumplir las listas blancas por plataforma.
- Cualquier comando nuevo requiere la aprobación del operador o un cambio explícito en la lista blanca.
- Auditar cambios con marcas de tiempo.

# Auditoría + limitación de tasa

- Registro: solicitudes de emparejamiento, aprobaciones/denegaciones, emisión/rotación/revocación de tokens.
- Limitar la tasa de spam de emparejamiento y avisos de aprobación.

# Higiene del protocolo

- Versión explícita del protocolo + códigos de error.
- Reglas de reconexión + política de latido.
- TTL de presencia y semántica de última actividad.

---

# Preguntas abiertas

1. Dispositivo único ejecutando ambos roles: modelo de token
   - Se recomiendan tokens separados por rol (nodo vs operador).
   - Mismo deviceId; diferentes alcances; revocación más clara.

2. Granularidad del alcance del operador
   - lectura/escritura/admin + aprobaciones + emparejamiento (mínimo viable).
   - Considerar alcances por función más adelante.

3. Rotación de tokens + UX de revocación
   - Rotación automática al cambiar el rol.
   - Interfaz de usuario para revocar por deviceId + rol.

4. Descubrimiento
   - Extender el Bonjour TXT actual para incluir la huella digital de WS TLS + pistas de rol.
   - Tratar solo como pistas de localización.

5. Aprobación entre redes
   - Transmitir a todos los clientes del operador; la interfaz de usuario activa muestra un modal.
   - Gana la primera respuesta; la puerta de enlace impone la atomicidad.

---

# Resumen (TL;DR)

- Hoy: plano de control WS + transporte de nodo Bridge.
- Dolor: aprobaciones + duplicación + dos pilas.
- Propuesta: un protocolo WS con roles y alcances explícitos, emparejamiento unificado + anclaje TLS, aprobaciones alojadas en la puerta de enlace, IDs de dispositivo estables + slugs bonitos.
- Resultado: UX más simple, seguridad más fuerte, menos duplicación, mejor enrutamiento móvil.

import en from "/components/footer/en.mdx";

<en />
