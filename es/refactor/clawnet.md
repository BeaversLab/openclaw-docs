---
summary: "Clawnet refactor: unify network protocol, roles, auth, approvals, identity"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Clawnet Refactor"
---

# Clawnet refactor (protocol + auth unification)

## Hola

Hola Peter: gran dirección; esto habilita una UX más simple + una seguridad más fuerte.

## Propósito

Documento único y riguroso para:

- Estado actual: protocolos, flujos, límites de confianza.
- Puntos de dolor: aprobaciones, enrutamiento multi‑salto, duplicación de UI.
- Nuevo estado propuesto: un protocolo, roles con alcance, autenticación/emparejamiento unificado, fijación de TLS.
- Modelo de identidad: IDs estables + slugs bonitos.
- Plan de migración, riesgos, preguntas abiertas.

## Objetivos (de la discusión)

- Un protocolo para todos los clientes (app de Mac, CLI, iOS, Android, nodo sin interfaz).
- Cada participante de la red autenticado y emparejado.
- Claridad de roles: nodos vs operadores.
- Aprobaciones centrales enrutadas a donde está el usuario.
- Cifrado TLS + fijación opcional para todo el tráfico remoto.
- Mínima duplicación de código.
- Una sola máquina debe aparecer una vez (sin entrada duplicada de UI/nodo).

## No objetivos (explícitos)

- Eliminar la separación de capacidades (aún se necesita el privilegio mínimo).
- Exponer el plano de control completo de la puerta de enlace sin verificaciones de alcance.
- Hacer que la autenticación dependa de las etiquetas humanas (los slugs siguen siendo no seguros).

---

# Estado actual (tal cual)

## Dos protocolos

### 1) WebSocket de puerta de enlace (plano de control)

- Superficie de API completa: configuración, canales, modelos, sesiones, ejecuciones de agentes, registros, nodos, etc.
- Enlace predeterminado: loopback. Acceso remoto a través de SSH/Tailscale.
- Autenticación: token/contraseña mediante `connect`.
- Sin fijación TLS (depende de loopback/túnel).
- Código:
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Puente (transporte de nodo)

- Superficie de lista de permitidos estrecha, identidad de nodo + emparejamiento.
- JSONL sobre TCP; TLS opcional + fijación de huella digital del certificado.
- TLS anuncia la huella digital en el TXT de descubrimiento.
- Código:
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## Clientes del plano de control hoy

- CLI → Gateway WS a través de `callGateway` (`src/gateway/call.ts`).
- Interfaz de usuario de la aplicación macOS → Gateway WS (`GatewayConnection`).
- Interfaz de usuario de control web → Gateway WS.
- ACP → Gateway WS.
- El control del navegador utiliza su propio servidor de control HTTP.

## Nodos hoy

- La aplicación de macOS en modo de nodo se conecta al puente de Gateway (`MacNodeBridgeSession`).
- Las aplicaciones de iOS/Android se conectan al puente de Gateway.
- Emparejamiento + token por nodo almacenado en el gateway.

## Flujo de aprobación actual (exec)

- El agente utiliza `system.run` a través del Gateway.
- El Gateway invoca al nodo a través del puente.
- El tiempo de ejecución del nodo decide la aprobación.
- Prompt de UI mostrado por la aplicación de Mac (cuando node == mac app).
- El nodo devuelve `invoke-res` al Gateway.
- Multi‑hop, UI vinculada al host del nodo.

## Presencia + identidad hoy

- Entradas de presencia del Gateway desde clientes WS.
- Entradas de presencia del nodo desde el puente.
- La aplicación de Mac puede mostrar dos entradas para la misma máquina (UI + nodo).
- Identidad del nodo almacenada en el almacén de emparejamiento; identidad de la UI separada.

---

# Problemas / puntos dolorosos

- Dos pilas de protocolos que mantener (WS + Bridge).
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
  - `operator.write` (ejecución del agente, envíos)
  - `operator.admin` (config, canales, modelos)

### Comportamientos de los roles

**Node**

- Puede registrar capacidades (`caps`, `commands`, permisos).
- Puede recibir comandos de `invoke` (`system.run`, `camera.*`, `canvas.*`, `screen.record`, etc).
- Puede enviar eventos: `voice.transcript`, `agent.request`, `chat.subscribe`.
- No puede llamar a las APIs del plano de control de config/models/channels/sessions/agent.

**Operator**

- API completa del plano de control, restringida por el alcance.
- Recibe todas las aprobaciones.
- No ejecuta acciones del sistema operativo directamente; enruta a los nodos.

### Regla clave

El rol es por conexión, no por dispositivo. Un dispositivo puede abrir ambos roles, por separado.

---

# Autenticación y emparejamiento unificados

## Identidad del cliente

Cada cliente proporciona:

- `deviceId` (estable, derivado de la clave del dispositivo).
- `displayName` (nombre humano).
- `role` + `scope` + `caps` + `commands`.

## Flujo de emparejamiento (unificado)

- El cliente se conecta sin autenticar.
- Gateway crea una **solicitud de emparejamiento** para ese `deviceId`.
- El operador recibe el aviso; aprueba/deniega.
- Gateway emite credenciales vinculadas a:
  - clave pública del dispositivo
  - rol(es)
  - alcance(s)
  - capacidades/comandos
- El cliente guarda el token, se reconecta autenticado.

## Autenticación vinculada al dispositivo (evitar reutilización de bearer token)

Preferido: pares de claves del dispositivo.

- El dispositivo genera el par de claves una vez.
- `deviceId = fingerprint(publicKey)`.
- Gateway envía un nonce; dispositivo firma; gateway verifica.
- Los tokens se emiten a una clave pública (prueba de posesión), no a una cadena.

Alternativas:

- mTLS (certificados de cliente): el más fuerte, más complejidad operativa.
- Bearer tokens de corta duración solo como fase temporal (rotar + revocar antes).

## Aprobación silenciosa (heurística SSH)

Definirlo con precisión para evitar un eslabón débil. Preferir uno:

- **Solo local**: auto‑emparejar cuando el cliente se conecta a través de loopback/Unix socket.
- **Desafío vía SSH**: gateway emite un nonce; cliente prueba SSH recuperándolo.
- **Ventana de presencia física**: después de una aprobación local en la interfaz de usuario del host del gateway, permitir auto‑emparejamiento por una ventana breve (ej. 10 minutos).

Registrar siempre + grabar auto‑aprobaciones.

---

# TLS en todas partes (desarrollo + producción)

## Reutilizar TLS de puente existente

Usar el tiempo de ejecución TLS actual + fijación de huella digital:

- `src/infra/bridge/server/tls.ts`
- lógica de verificación de huella digital en `src/node-host/bridge-client.ts`

## Aplicar a WS

- El servidor WS soporta TLS con el mismo cert/clave + huella digital.
- Los clientes WS pueden fijar la huella digital (opcional).
- El descubrimiento anuncia TLS + huella digital para todos los endpoints.
  - El descubrimiento es solo sugerencias de localización; nunca un ancla de confianza.

## Por qué

- Reducir la dependencia en SSH/Tailscale para la confidencialidad.
- Hacer seguras por defecto las conexiones móviles remotas.

---

# Rediseño de aprobaciones (centralizado)

## Actual

La aprobación ocurre en el host del nodo (mac app node runtime). El aviso aparece donde se ejecuta el nodo.

## Propuesto

La aprobación está **alojada en el gateway**, la interfaz de usuario se entrega a los clientes del operador.

### Nuevo flujo

1. Gateway recibe `system.run` intención (agente).
2. Gateway crea registro de aprobación: `approval.requested`.
3. La(s) interfaz(es) de operador muestran un aviso.
4. Decisión de aprobación enviada al gateway: `approval.resolve`.
5. Gateway invoca el comando del nodo si se aprueba.
6. El nodo se ejecuta, devuelve `invoke-res`.

### Semántica de aprobación (endurecimiento)

- Transmisión a todos los operadores; solo la interfaz de usuario activa muestra un modal (los demás reciben una notificación toast).
- Gana la primera resolución; el gateway rechaza las resoluciones posteriores por estar ya resueltas.
- Tiempo de espera predeterminado: denegar después de N segundos (p. ej. 60s), registrar motivo.
- La resolución requiere el alcance `operator.approvals`.

## Beneficios

- El aviso aparece donde esté el usuario (mac/teléfono).
- Aprobaciones coherentes para nodos remotos.
- El tiempo de ejecución del nodo permanece sin interfaz (headless); sin dependencia de la interfaz de usuario.

---

# Ejemplos de claridad de roles

## Aplicación de iPhone

- **Rol de nodo** para: micrófono, cámara, chat de voz, ubicación, pulsar para hablar (push‑to‑talk).
- **operator.read** opcional para el estado y la vista de chat.
- **operator.write/admin** opcional solo cuando se habilita explícitamente.

## Aplicación de macOS

- Rol de operador por defecto (interfaz de control).
- Rol de nodo cuando se habilita “Mac node” (system.run, pantalla, cámara).
- Mismo deviceId para ambas conexiones → entrada de interfaz unificada.

## Línea de comandos (CLI)

- Rol de operador siempre.
- Alcance derivado por subcomando:
  - `status`, `logs` → read
  - `agent`, `message` → write
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

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

## Agrupación de interfaz

Mismo `deviceId` entre roles → fila única de “Instancia”:

- Insignia: `operator`, `node`.
- Muestra capacidades + última vez visto.

---

# Estrategia de migración

## Fase 0: Documentar + alinear

- Publicar este documento.
- Inventariar todas las llamadas al protocolo + flujos de aprobación.

## Fase 1: Añadir roles/alcances a WS

- Extender los parámetros `connect` con `role`, `scope`, `deviceId`.
- Añadir control de lista blanca para el rol de nodo.

## Fase 2: Compatibilidad con el puente

- Mantener el puente en ejecución.
- Añadir soporte de nodo WS en paralelo.
- Limitar las funciones detrás de una bandera de configuración.

## Fase 3: Aprobaciones centralizadas

- Añadir eventos de solicitud de aprobación + resolución en WS.
- Actualizar la interfaz de usuario de la aplicación Mac para solicitar + responder.
- El tiempo de ejecución del nodo deja de solicitar a la interfaz de usuario.

## Fase 4: Unificación de TLS

- Añadir configuración TLS para WS usando el tiempo de ejecución TLS del puente.
- Añadir anclaje (pinning) a los clientes.

## Fase 5: Deprecar el puente

- Migrar el nodo iOS/Android/mac a WS.
- Mantener el puente como reserva; eliminar una vez que sea estable.

## Fase 6: Autenticación vinculada al dispositivo

- Requerir identidad basada en clave para todas las conexiones no locales.
- Añadir interfaz de usuario de revocación + rotación.

---

# Notas de seguridad

- Rol/lista blanca aplicado en el límite de la puerta de enlace.
- Ningún cliente obtiene la API "completa" sin el alcance de operador.
- Emparejamiento requerido para _todas_ las conexiones.
- TLS + anclaje reduce el riesgo MITM para móviles.
- La aprobación silenciosa de SSH es una conveniencia; aun así se registra y es revocable.
- El descubrimiento nunca es un ancla de confianza.
- Las reclamaciones de capacidad se verifican contra las listas blancas del servidor por plataforma/tipo.

# Transmisión + cargas útiles grandes (medios del nodo)

El plano de control WS está bien para mensajes pequeños, pero los nodos también hacen:

- clips de cámara
- grabaciones de pantalla
- transmisiones de audio

Opciones:

1. Marcos binarios WS + fragmentación + reglas de contrapresión.
2. Endpoint de transmisión separado (todavía TLS + autenticación).
3. Mantener el puente más tiempo para comandos con muchos medios, migrar al final.

Elegir uno antes de la implementación para evitar desviaciones.

# Política de capacidad + comando

- Las capacidades/comandos reportados por el nodo se tratan como **reclamaciones**.
- La puerta de enlace aplica listas blancas por plataforma.
- Cualquier comando nuevo requiere aprobación del operador o cambio explícito en la lista blanca.
- Auditar cambios con marcas de tiempo.

# Auditoría + limitación de velocidad

- Registro: solicitudes de emparejamiento, aprobaciones/denegaciones, emisión/rotación/revocación de tokens.
- Limitar la velocidad del spam de emparejamiento y las solicitudes de aprobación.

# Higiene del protocolo

- Versión de protocolo explícita + códigos de error.
- Reglas de reconexión + política de latido.
- TTL de presencia y semántica de última visita.

---

# Preguntas abiertas

1. Dispositivo único ejecutando ambos roles: modelo de token
   - Se recomiendan tokens separados por rol (nodo vs operador).
   - Mismo deviceId; diferentes alcances; revocación más clara.

2. Granularidad del alcance del operador
   - lectura/escritura/admin + aprobaciones + emparejamiento (mínimo viable).
   - Considerar alcances por función más adelante.

3. Rotación de token + UX de revocación
   - Rotación automática al cambiar el rol.
   - Interfaz de usuario para revocar por deviceId + rol.

4. Descubrimiento
   - Extender el Bonjour TXT actual para incluir la huella digital de TLS de WS + pistas de rol.
   - Tratar solo como pistas de localización.

5. Aprobación entre redes
   - Transmitir a todos los clientes operadores; la interfaz de usuario activa muestra un modal.
   - Gana la primera respuesta; la puerta de enlace impone la atomicidad.

---

# Resumen (TL;DR)

- Hoy: plano de control WS + transporte de nodo Bridge.
- Problema: aprobaciones + duplicación + dos pilas.
- Propuesta: un protocolo WS con roles explícitos + alcances, emparejamiento unificado + anclaje TLS, aprobaciones alojadas en la puerta de enlace, IDs de dispositivo estables + slugs bonitos.
- Resultado: UX más simple, seguridad más fuerte, menos duplicación, mejor enrutamiento móvil.

import es from "/components/footer/es.mdx";

<es />
