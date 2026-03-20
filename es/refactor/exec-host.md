---
summary: "Plan de refactorización: enrutamiento de host de ejecución, aprobaciones de nodos y ejecutor sin interfaz gráfica"
read_when:
  - Diseñando el enrutamiento de host de ejecución o aprobaciones de ejecución
  - Implementando el ejecutor de nodos + IPC de interfaz de usuario
  - Añadiendo modos de seguridad de host de ejecución y comandos de barra
title: "Refactorización de host de ejecución"
---

# Plan de refactorización del host de ejecución

## Objetivos

- Añadir `exec.host` + `exec.security` para enrutar la ejecución a través de **sandbox**, **gateway** y **node**.
- Mantener los valores predeterminados **seguros**: sin ejecución entre hosts a menos que se habilite explícitamente.
- Dividir la ejecución en un **servicio de ejecutor sin interfaz gráfica** con interfaz de usuario opcional (aplicación macOS) mediante IPC local.
- Proporcionar política **por agente**, lista de permitidos, modo de consulta y vinculación de nodos.
- Soportar **modos de consulta** que funcionen _con_ o _sin_ listas de permitidos.
- Multiplataforma: socket Unix + autenticación de token (paridad macOS/Linux/Windows).

## No objetivos

- Sin migración de listas de permitidos heredadas ni soporte de esquema heredado.
- Sin PTY/transmisión para la ejecución de nodos (solo salida agregada).
- Ninguna nueva capa de red más allá del Puente y la Pasarela existentes.

## Decisiones (bloqueadas)

- **Claves de configuración:** `exec.host` + `exec.security` (se permite la anulación por agente).
- **Elevación:** mantener `/elevated` como un alias para acceso completo a la pasarela.
- **Predeterminado de consulta:** `on-miss`.
- **Almacén de aprobaciones:** `~/.openclaw/exec-approvals.json` (JSON, sin migración heredada).
- **Ejecutor:** servicio del sistema sin interfaz gráfica; la aplicación de interfaz de usuario aloja un socket Unix para aprobaciones.
- **Identidad del nodo:** usar `nodeId` existente.
- **Autenticación de socket:** socket Unix + token (multiplataforma); dividir más tarde si es necesario.
- **Estado del host del nodo:** `~/.openclaw/node.json` (id de nodo + token de emparejamiento).
- **Host de ejecución macOS:** ejecutar `system.run` dentro de la aplicación macOS; el servicio de host del nodo reenvía solicitudes a través de IPC local.
- **Sin asistente XPC:** ceñirse a socket Unix + token + verificaciones de pares.

## Conceptos clave

### Host

- `sandbox`: exec de Docker (comportamiento actual).
- `gateway`: exec en el host de la pasarela.
- `node`: exec en el ejecutor del nodo a través del Puente (`system.run`).

### Modo de seguridad

- `deny`: siempre bloquear.
- `allowlist`: permitir solo coincidencias.
- `full`: permitir todo (equivalente a elevado).

### Modo de consulta (Ask mode)

- `off`: nunca preguntar.
- `on-miss`: preguntar solo cuando la lista blanca no coincida.
- `always`: preguntar siempre.

La consulta es **independiente** de la lista blanca; la lista blanca se puede usar con `always` o `on-miss`.

### Resolución de políticas (por ejecución)

1. Resolver `exec.host` (parámetro de herramienta → anulación del agente → valor predeterminado global).
2. Resolver `exec.security` y `exec.ask` (misma precedencia).
3. Si el host es `sandbox`, proceder con la ejecución en el espacio aislado local.
4. Si el host es `gateway` o `node`, aplicar la política de seguridad + consulta en ese host.

## Seguridad predeterminada

- `exec.host = sandbox` predeterminado.
- `exec.security = deny` predeterminado para `gateway` y `node`.
- `exec.ask = on-miss` predeterminado (solo relevante si la seguridad lo permite).
- Si no se establece ningún enlace de nodo, **el agente puede dirigirse a cualquier nodo**, pero solo si la política lo permite.

## Superficie de configuración

### Parámetros de herramienta

- `exec.host` (opcional): `sandbox | gateway | node`.
- `exec.security` (opcional): `deny | allowlist | full`.
- `exec.ask` (opcional): `off | on-miss | always`.
- `exec.node` (opcional): ID/nombre del nodo que se usará cuando `host=node`.

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
- `/elevated off` = restablece la configuración de ejecución anterior para la sesión del agente.

## Almacén de aprobaciones (JSON)

Ruta: `~/.openclaw/exec-approvals.json`

Propósito:

- Política local + listas de permitidos para el **host de ejecución** (puerta de enlace o node runner).
- Respaldo de pedir (Ask) cuando no hay una UI disponible.
- Credenciales IPC para clientes de UI.

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

- No hay formatos heredados de listas de permitidos.
- `askFallback` se aplica solo cuando `ask` es obligatorio y no se puede alcanzar ninguna UI.
- Permisos de archivo: `0600`.

## Servicio Runner (headless)

### Rol

- Hacer cumplir `exec.security` + `exec.ask` localmente.
- Ejecutar comandos del sistema y devolver la salida.
- Emitir eventos de Bridge para el ciclo de vida de ejecución (opcional pero recomendado).

### Ciclo de vida del servicio

- Launchd/daemon en macOS; servicio del sistema en Linux/Windows.
- El JSON de aprobaciones es local para el host de ejecución.
- La UI aloja un socket Unix local; los runners se conectan bajo demanda.

## Integración de UI (aplicación macOS)

### IPC

- Socket Unix en `~/.openclaw/exec-approvals.sock` (0600).
- Token almacenado en `exec-approvals.json` (0600).
- Verificaciones de pares: solo mismo UID.
- Desafío/respuesta: nonce + HMAC(token, request-hash) para prevenir reenvío.
- TTL corto (ej. 10s) + carga útil máxima + límite de velocidad.

### Flujo de Ask (host de ejecución de aplicación macOS)

1. El servicio de nodo recibe `system.run` de la puerta de enlace.
2. El servicio de nodo se conecta al socket local y envía la solicitud de prompt/ejecución.
3. La aplicación valida par + token + HMAC + TTL, luego muestra el diálogo si es necesario.
4. La aplicación ejecuta el comando en el contexto de la UI y devuelve la salida.
5. El servicio de nodo devuelve la salida a la puerta de enlace.

Si falta la UI:

- Aplicar `askFallback` (`deny|allowlist|full`).

### Diagrama (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## Identidad de nodo + enlace

- Usar `nodeId` existente del emparejamiento de Bridge.
- Modelo de enlace:
  - `tools.exec.node` restringe el agente a un nodo específico.
  - Si no está establecido, el agente puede elegir cualquier nodo (la política aún impone los valores predeterminados).
- Resolución de selección de nodo:
  - Coincidencia exacta `nodeId`
  - `displayName` (normalizado)
  - `remoteIp`
  - Prefijo `nodeId` (>= 6 caracteres)

## Generación de eventos

### Quién ve los eventos

- Los eventos del sistema son **por sesión** y se muestran al agente en el siguiente prompt.
- Almacenados en la cola en memoria de la puerta de enlace (`enqueueSystemEvent`).

### Texto del evento

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + cola de salida opcional
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### Transporte

Opción A (recomendada):

- Runner envía tramas `exec.started` / `exec.finished` de Bridge `event`.
- El `handleBridgeEvent` de Gateway las asigna a `enqueueSystemEvent`.

Opción B:

- La herramienta `exec` de Gateway gestiona el ciclo de vida directamente (solo síncrono).

## Flujos de ejecución

### Host de Sandbox

- Comportamiento existente de `exec` (Docker o host cuando no está en sandbox).
- PTY compatible solo en modo sin sandbox.

### Host de Gateway

- El proceso de Gateway se ejecuta en su propia máquina.
- Aplica `exec-approvals.json` local (seguridad/ask/allowlist).

### Host de nodo

- Gateway llama a `node.invoke` con `system.run`.
- Runner aplica aprobaciones locales.
- Runner devuelve stdout/stderr agregados.
- Eventos opcionales de Bridge para inicio/fin/denegación.

## Límites de salida

- Limitar stdout+stderr combinado en **200k**; mantener **tail 20k** para eventos.
- Truncar con un sufijo claro (p. ej., `"… (truncated)"`).

## Comandos de barra

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- Invalidaciones por agente y por sesión; no persistentes a menos que se guarden mediante config.
- `/elevated on|off|ask|full` sigue siendo un acceso directo para `host=gateway security=full` (con `full` omitiendo aprobaciones).

## Historia multiplataforma

- El servicio runner es el objetivo de ejecución portátil.
- La interfaz de usuario es opcional; si falta, se aplica `askFallback`.
- Windows/Linux admiten el mismo JSON de aprobaciones + protocolo de socket.

## Fases de implementación

### Fase 1: configuración + enrutamiento exec

- Añadir esquema de configuración para `exec.host`, `exec.security`, `exec.ask`, `exec.node`.
- Actualizar la infraestructura de herramientas para respetar `exec.host`.
- Añadir el comando de barra `/exec` y mantener el alias `/elevated`.

### Fase 2: almacén de aprobaciones + aplicación de gateway

- Implementar lector/escritor de `exec-approvals.json`.
- Aplicar modos allowlist + ask para el host `gateway`.
- Añadir límites de salida.

### Fase 3: aplicación de node runner

- Actualizar el node runner para forzar la lista de permitidos + ask.
- Añadir el puente de solicitud de socket Unix a la interfaz de usuario de la aplicación de macOS.
- Conectar `askFallback`.

### Fase 4: eventos

- Añadir eventos del puente de nodo → gateway para el ciclo de vida de exec.
- Asignar a `enqueueSystemEvent` para las solicitudes del agente.

### Fase 5: pulido de la interfaz de usuario

- Aplicación Mac: editor de lista de permitidos, selector por agente, interfaz de política de preguntas.
- Controles de vinculación de nodo (opcional).

## Plan de pruebas

- Pruebas unitarias: coincidencia de lista de permitidos (glob + sin distinción de mayúsculas y minúsculas).
- Pruebas unitarias: precedencia de resolución de políticas (parámetro de herramienta → anulación del agente → global).
- Pruebas de integración: flujos de denegación/permiso/pregunta del node runner.
- Pruebas de eventos del puente: enrutamiento de eventos de nodo → evento del sistema.

## Riesgos abiertos

- Indisponibilidad de la interfaz de usuario: asegurar que se respete `askFallback`.
- Comandos de larga duración: confiar en el tiempo de espera + límites de salida.
- Ambigüedad multinodo: error a menos que haya vinculación de nodo o parámetro de nodo explícito.

## Documentación relacionada

- [Herramienta Exec](/es/tools/exec)
- [Aprobaciones Exec](/es/tools/exec-approvals)
- [Nodos](/es/nodes)
- [Modo elevado](/es/tools/elevated)

import en from "/components/footer/en.mdx";

<en />
