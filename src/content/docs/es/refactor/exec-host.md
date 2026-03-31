---
summary: "Plan de refactorización: enrutamiento de host de ejecución, aprobaciones de nodos y ejecutor sin interfaz gráfica"
read_when:
  - Designing exec host routing or exec approvals
  - Implementing node runner + UI IPC
  - Adding exec host security modes and slash commands
title: "Refactorización del host de ejecución"
---

# Plan de refactorización del host de ejecución

## Objetivos

- Añadir `exec.host` + `exec.security` para enrutar la ejecución a través de **sandbox**, **gateway** y **node**.
- Mantener los valores predeterminados **seguros**: sin ejecución entre hosts a menos que se habilite explícitamente.
- Dividir la ejecución en un **servicio de ejecución sin interfaz gráfica** con una interfaz de usuario opcional (aplicación macOS) a través de IPC local.
- Proporcionar política **por agente**, lista de permitidos, modo de solicitud y vinculación de nodos.
- Soportar **modos de solicitud** que funcionen _con_ o _sin_ listas de permitidos.
- Multiplataforma: socket Unix + autenticación por token (paridad macOS/Linux/Windows).

## No objetivos

- Sin migración de lista de permitidos heredada ni soporte de esquema heredado.
- Sin PTY/transmisión para la ejecución de nodos (solo salida agregada).
- Sin nueva capa de red más allá del Bridge + Gateway existente.

## Decisiones (bloqueadas)

- **Claves de configuración:** `exec.host` + `exec.security` (se permite la anulación por agente).
- **Elevación:** mantener `/elevated` como un alias para el acceso completo a la puerta de enlace.
- **Solicitud predeterminada:** `on-miss`.
- **Almacén de aprobaciones:** `~/.openclaw/exec-approvals.json` (JSON, sin migración heredada).
- **Ejecutor:** servicio del sistema sin interfaz gráfica; la aplicación de la interfaz de usuario aloja un socket Unix para las aprobaciones.
- **Identidad del nodo:** usar `nodeId` existente.
- **Autenticación de socket:** socket Unix + token (multiplataforma); dividir más tarde si es necesario.
- **Estado del host del nodo:** `~/.openclaw/node.json` (id del nodo + token de emparejamiento).
- **Host de ejecución macOS:** ejecutar `system.run` dentro de la aplicación macOS; el servicio de host del nodo reenvía las solicitudes a través de IPC local.
- **Sin auxiliar XPC:** ceñirse al socket Unix + token + verificaciones de pares.

## Conceptos clave

### Host

- `sandbox`: exec de Docker (comportamiento actual).
- `gateway`: exec en el host de la puerta de enlace.
- `node`: exec en el ejecutor del nodo a través de Bridge (`system.run`).

### Modo de seguridad

- `deny`: bloquear siempre.
- `allowlist`: permitir solo coincidencias.
- `full`: permitir todo (equivalente a elevado).

### Modo de solicitud

- `off`: nunca preguntar.
- `on-miss`: preguntar solo cuando la lista blanca no coincida.
- `always`: preguntar cada vez.

Preguntar es **independiente** de la lista blanca; la lista blanca se puede usar con `always` o `on-miss`.

### Resolución de políticas (por ejecución)

1. Resolver `exec.host` (parámetro de herramienta → anulación de agente → predeterminado global).
2. Resolver `exec.security` y `exec.ask` (misma prioridad).
3. Si el host es `sandbox`, proceder con ejecución en sandbox local.
4. Si el host es `gateway` o `node`, aplicar política de seguridad + preguntar en ese host.

## Seguridad predeterminada

- `exec.host = sandbox` predeterminado.
- `exec.security = deny` predeterminado para `gateway` y `node`.
- `exec.ask = on-miss` predeterminado (solo relevante si la seguridad lo permite).
- Si no se establece ningún enlace de nodo, **el agente puede apuntar a cualquier nodo**, pero solo si la política lo permite.

## Superficie de configuración

### Parámetros de herramienta

- `exec.host` (opcional): `sandbox | gateway | node`.
- `exec.security` (opcional): `deny | allowlist | full`.
- `exec.ask` (opcional): `off | on-miss | always`.
- `exec.node` (opcional): id/nombre del nodo a usar cuando `host=node`.

### Claves de configuración (global)

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node` (enlace de nodo predeterminado)

### Claves de configuración (por agente)

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### Alias

- `/elevated on` = establece `tools.exec.host=gateway`, `tools.exec.security=full` para la sesión del agente.
- `/elevated off` = restaura la configuración de ejecución anterior para la sesión del agente.

## Almacén de aprobaciones (JSON)

Ruta: `~/.openclaw/exec-approvals.json`

Propósito:

- Política local + listas blancas para el **host de ejecución** (gateway o node runner).
- Alternativa de preguntar cuando no hay una interfaz de usuario disponible.
- Credenciales IPC para clientes de interfaz de usuario.

Esquema propuesto (v1):

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64-opaque-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "agent-id-1": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        {
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 0,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

Notas:

- No hay formatos de lista de permitidos (allowlist) heredados.
- `askFallback` se aplica solo cuando `ask` es obligatorio y no se puede acceder a ninguna interfaz de usuario.
- Permisos de archivo: `0600`.

## Servicio de ejecución (headless)

### Rol

- Aplicar `exec.security` + `exec.ask` localmente.
- Ejecutar comandos del sistema y devolver la salida.
- Emitir eventos de Bridge para el ciclo de vida de ejecución (opcional pero recomendado).

### Ciclo de vida del servicio

- Launchd/daemon en macOS; servicio del sistema en Linux/Windows.
- El JSON de aprobaciones es local para el host de ejecución.
- La interfaz de usuario aloja un socket Unix local; los ejecutores se conectan bajo demanda.

## Integración de la interfaz de usuario (aplicación macOS)

### IPC

- Socket Unix en `~/.openclaw/exec-approvals.sock` (0600).
- Token almacenado en `exec-approvals.json` (0600).
- Verificación de pares (peer checks): solo mismo UID.
- Desafío/respuesta: nonce + HMAC(token, hash de solicitud) para evitar retransmisiones.
- TTL corto (p. ej., 10 s) + carga útil máxima + límite de tasa.

### Flujo de solicitud (Ask flow) (host de ejecución de la aplicación macOS)

1. El servicio de nodo recibe `system.run` de la puerta de enlace.
2. El servicio de nodo se conecta al socket local y envía la solicitud de prompt/ejecución.
3. La aplicación valida el par + token + HMAC + TTL y luego muestra un cuadro de diálogo si es necesario.
4. La aplicación ejecuta el comando en el contexto de la interfaz de usuario y devuelve la salida.
5. El servicio de nodo devuelve la salida a la puerta de enlace.

Si falta la interfaz de usuario:

- Aplicar `askFallback` (`deny|allowlist|full`).

### Diagrama (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## Identidad de nodo + vinculación

- Usar `nodeId` existente del emparejamiento de Bridge.
- Modelo de vinculación:
  - `tools.exec.node` restringe el agente a un nodo específico.
  - Si no está configurado, el agente puede elegir cualquier nodo (la política aún aplica los valores predeterminados).
- Resolución de selección de nodo:
  - Coincidencia exacta de `nodeId`
  - `displayName` (normalizado)
  - `remoteIp`
  - Prefijo de `nodeId` (>= 6 caracteres)

## Generación de eventos

### Quién ve los eventos

- Los eventos del sistema son **por sesión** y se muestran al agente en el siguiente mensaje.
- Almacenados en la cola en memoria de la puerta de enlace (`enqueueSystemEvent`).

### Texto del evento

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + cola de salida opcional
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### Transporte

Opción A (recomendada):

- Runner envía tramas Bridge `event` `exec.started` / `exec.finished`.
- El `handleBridgeEvent` de Gateway las mapea a `enqueueSystemEvent`.

Opción B:

- La herramienta `exec` de Gateway gestiona el ciclo de vida directamente (solo síncrono).

## Flujos de ejecución

### Host de sandbox

- Comportamiento `exec` existente (Docker o host cuando no está en sandbox).
- PTY soportado solo en modo no sandbox.

### Host de puerta de enlace (Gateway)

- El proceso de Gateway se ejecuta en su propia máquina.
- Fuerza `exec-approvals.json` locales (security/ask/allowlist).

### Host de nodo

- Gateway llama a `node.invoke` con `system.run`.
- Runner fuerza aprobaciones locales.
- Runner devuelve stdout/stderr agregados.
- Eventos opcionales de Bridge para inicio/fin/denegación.

## Límites de salida

- Limitar stdout+stderr combinado a **200k**; mantener **tail 20k** para eventos.
- Truncar con un sufijo claro (p. ej., `"… (truncated)"`).

## Comandos de barra diagonal

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- Anulaciones por agente y por sesión; no persistentes a menos que se guarden vía configuración.
- `/elevated on|off|ask|full` sigue siendo un acceso directo para `host=gateway security=full` (con `full` saltando aprobaciones).

## Historia multiplataforma

- El servicio runner es el objetivo de ejecución portable.
- La UI es opcional; si falta, se aplica `askFallback`.
- Windows/Linux soportan el mismo JSON de aprobaciones + protocolo de socket.

## Fases de implementación

### Fase 1: configuración + enrutamiento de ejecución

- Añadir esquema de configuración para `exec.host`, `exec.security`, `exec.ask`, `exec.node`.
- Actualizar la infraestructura de herramientas para respetar `exec.host`.
- Añadir el comando de barra `/exec` y mantener el alias `/elevated`.

### Fase 2: almacén de aprobaciones + aplicación en Gateway

- Implementar lector/escritor de `exec-approvals.json`.
- Forzar modos de allowlist + ask para el host `gateway`.
- Añadir límites de salida.

### Fase 3: aplicación en node runner

- Actualizar node runner para forzar allowlist + ask.
- Conectar puente de solicitud de socket Unix a la UI de la aplicación macOS.
- Conectar `askFallback`.

### Fase 4: eventos

- Agregar eventos de Bridge de nodo → puerta de enlace para el ciclo de vida de exec.
- Mapear a `enqueueSystemEvent` para las sugerencias del agente.

### Fase 5: pulido de la interfaz de usuario

- Aplicación Mac: editor de lista de permitidos, selector por agente, interfaz de usuario de política de solicitud.
- Controles de vinculación de nodo (opcional).

## Plan de pruebas

- Pruebas unitarias: coincidencia de lista de permitidos (glob + sin distinción de mayúsculas y minúsculas).
- Pruebas unitarias: precedencia de resolución de políticas (parámetro de herramienta → anulación de agente → global).
- Pruebas de integración: flujos de denegación/permiso/solicitud del node runner.
- Pruebas de eventos de Bridge: enrutamiento de evento de nodo → evento del sistema.

## Riesgos abiertos

- Indisponibilidad de la interfaz de usuario: asegurar que se respete `askFallback`.
- Comandos de larga duración: depender de límites de tiempo y de salida.
- Ambigüedad multinodo: error a menos que haya vinculación de nodo o parámetro de nodo explícito.

## Documentación relacionada

- [Exec tool](/en/tools/exec)
- [Exec approvals](/en/tools/exec-approvals)
- [Nodes](/en/nodes)
- [Elevated mode](/en/tools/elevated)
