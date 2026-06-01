---
title: Claw Supervisor
description: Plan de supervisión de flotas para sesiones del servidor de aplicaciones Codex controladas por OpenClaw.
readWhen:
  - Designing Codex fleet supervision
  - Building OpenClaw tools that read, steer, or spawn Codex sessions
  - Choosing between local, Cloudflare, and VPS deployment for supervised Codex
---

# Claw Supervisor

## Objetivo

Claw Supervisor permite que una instancia OpenClaw siempre activa monitoree y controle una flota de sesiones de Codex sin alterar la experiencia normal del usuario de Codex. Un usuario puede acceder por SSH a un host, iniciar Codex, trabajar en la interfaz de usuario de terminal (TUI) y aun así tener al supervisor leyendo la sesión, dirigiéndola, interrumpiéndola, generando sesiones relacionadas y aceptando transferencias. Las sesiones de Codex también pueden realizar llamadas de retorno a OpenClaw a través de MCP.

## Modelo de producto

Codex sigue siendo la superficie de trabajo principal. OpenClaw supervisa a Codex en lugar de ocultar a Codex dentro de un subagente opaco de OpenClaw.

El complemento de OpenClaw se denomina `codex-supervisor`. `crabfleet` sigue siendo el perfil de implementación y flota de hosts para las máquinas CRAB, en lugar del nombre del complemento reutilizable.

El modelo tiene tres roles:

- Codex adjunto a humano: una interfaz de usuario de terminal (TUI) interactiva normal de Codex iniciada a través de un servidor de aplicaciones compartido.
- Codex autónomo: un hilo del servidor de aplicaciones de Codex generado por el supervisor al que un humano puede adjuntarse más tarde.
- Claw Supervisor: un agente OpenClaw siempre activo con herramientas para el estado de la flota, lectura de transcripciones, dirección, interrupción, generación y transferencia.

OpenClaw puede usar su maquinaria de subagente existente internamente, pero el contrato externo es una sesión de Codex adjuntable con un ID de hilo de Codex.

## Arquitectura

```text
user SSH session
  -> codex --remote unix://... or ws://...
      -> local codex app-server daemon
          <-> host sidecar / supervisor connector
              <-> OpenClaw fleet supervisor
                  <-> supervisor MCP exposed back to Codex
```

Cada host compatible con Codex ejecuta:

- Demonio del servidor de aplicaciones de Codex.
- Un iniciador que siempre inicia Codex interactivo con `--remote`.
- Un conector que registra los puntos finales del servidor de aplicaciones y los hilos activos con el supervisor.

El supervisor ejecuta:

- Registro de puntos finales.
- Registro de sesiones.
- Grupo de clientes JSON-RPC del servidor de aplicaciones de Codex.
- Servidor MCP para llamadas de Codex a Claw.
- Herramientas OpenClaw para el control de Claw a Codex.
- Motor de políticas para acciones autónomas, aprobaciones y prevención de bucles.

## Contrato del servidor de aplicaciones de Codex

Utilice las API del servidor de aplicaciones de Codex como el plano de control canónico:

- `initialize`, `initialized`
- `thread/loaded/list`
- `thread/list`
- `thread/read`
- `thread/resume`
- `thread/start`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `model/list`

Se debe lanzar Codex interactivo con `codex --remote <endpoint>` para que la interfaz de usuario (TUI) y el supervisor se conecten al mismo servidor de aplicaciones. `codex exec` independiente no es una sesión compartida en vivo hoy; use las API del servidor de aplicaciones para trabajo autónomo hasta que Codex admita `exec --remote`.

## Registro de Sesiones

El supervisor almacena un registro por cada hilo de Codex observado:

```json
{
  "sessionId": "codex-thread-id",
  "endpointId": "host-a",
  "host": "host-a.example",
  "workspace": "/workspace/repo",
  "repo": "owner/repo",
  "branch": "feature/example",
  "source": "vscode",
  "status": "idle",
  "humanAttached": true,
  "lastSeenAt": "2026-05-28T10:00:00.000Z",
  "summary": "Short working-state summary"
}
```

La implementación local puede derivar la mayoría de los campos de los metadatos del hilo de Codex. El despliegue de flota debería enriquecer los registros con la identidad del host, el estado de conexión del usuario, el estado de git y la salud del sidecar.

## Superficie MCP para Codex

Cada Codex supervisado obtiene un servidor MCP llamado `openclaw-codex-supervisor`.

Herramientas:

- `codex_sessions_list`: listar las sesiones de Codex visibles.
- `codex_session_read`: leer una transcripción.
- `codex_session_send`: enviar un mensaje a un hilo inactivo o dirigir un hilo activo.
- `codex_session_interrupt`: interrumpir el turno activo.
- `codex_endpoint_probe`: verificar la conectividad del endpoint.
- `claw_report_progress`: publicar el estado actual de la tarea en el supervisor.
- `claw_ask`: pedir ayuda o delegación al supervisor.
- `codex_spawn`: crear una nueva sesión autónoma de Codex.
- `codex_handoff`: solicitar la toma de control por parte de un humano o un par.

Recursos:

- `codex://sessions`
- `codex://sessions/{sessionId}`
- `codex://sessions/{sessionId}/transcript`

## Superficie de Control de Claw

El Claw siempre activo obtiene las mismas primitivas que las herramientas internas:

- listar sesiones y endpoints
- leer transcripciones
- enviar/dirigir texto
- interrumpir trabajo activo
- generar nuevas sesiones
- resumir y asignar sesiones
- difundir instrucciones a un grupo filtrado
- marcar sesiones como bloqueadas, terminadas o abandonadas

Comportamiento de la herramienta:

- Si un hilo de destino está inactivo, `codex_session_send` se asigna a `turn/start`.
- Si un hilo de destino está activo y un id de turno en progreso es visible, se asigna a `turn/steer`.
- Si no se puede identificar el turno activo, la herramienta falla de forma segura en lugar de crear un turno no relacionado.
- Los controles de escritura MCP expuestos por Codex permanecen deshabilitados a menos que una política confiable solo para el supervisor los habilite.
- Las lecturas de transcripciones sin procesar permanecen deshabilitadas a menos que una política confiable exclusiva del supervisor las habilite.
- Las aprobaciones autónomas deniegan por defecto las aprobaciones de herramientas/archivos a menos que una política explícita indique lo contrario.

## Flujo de inicio

Inicio de sesión interactivo en el host:

1. El usuario accede por SSH a un host CRAB.
2. El servicio SSH inicia o verifica `codex app-server daemon start`.
3. El contenedor de inicio de sesión lanza `codex --remote unix:// --cd <workspace>`.
4. El conector del host registra el endpoint y el hilo cargado.
5. El supervisor emite un evento de flota de alta prioridad: nueva sesión de Codex, espacio de trabajo, estado de conexión humana, vista previa de la tarea actual.
6. El Claw del supervisor puede leer y dirigir inmediatamente.

Generación autónoma:

1. El supervisor selecciona el host y el espacio de trabajo.
2. El conector del host abre o reanuda un hilo del servidor de aplicaciones de Codex.
3. El supervisor inicia el primer turno con el texto de la tarea y la configuración de MCP.
4. El registro de sesiones lo marca como autónomo y conectable.
5. El humano puede conectarse más tarde con `codex --remote <endpoint> resume <threadId>` una vez que Codex admita esa UX exacta, o mediante el flujo de reanudación actual en el mismo servidor de aplicaciones.

## Despliegue

Plano de control preferido:

- Los conectores del host mantienen conexiones WebSocket salientes hacia el supervisor.
- El estado del supervisor reside en el almacenamiento de OpenClaw Gateway.
- El servidor de aplicaciones de Codex permanece local en cada host; nunca exponga un servidor de aplicaciones sin autenticar a Internet pública.

Viabilidad de Cloudflare:

- Adecuado para registro, objetos duraderos, fan-in de WebSocket, enrutamiento de eventos ligeros y endpoints públicos de MCP/gateway.
- No es suficiente por sí solo para el control directo de hosts privados porque los Workers no pueden marcar sockets Unix privados arbitrarios ni servidores de aplicaciones de bucle local.
- Use Cloudflare cuando cada conector de host se comunique a casa a través de WebSocket saliente.

Alternativa de VPS:

- Use un servicio de Hetzner cuando se necesite control de procesos de larga duración, túneles SSH, enrutamiento de red privada o acceso al sistema de archivos local.
- Mantenga el mismo protocolo: conectores de host salientes, registro de supervisor central, servidor de aplicaciones de Codex local.

## Seguridad

- El enlace predeterminado es un socket Unix local.
- El servidor de aplicaciones remoto utiliza token o autenticación de portador firmada.
- El conector del host se autentica con el supervisor mediante un token de host con alcance.
- Las herramientas del supervisor aplican la política por sesión: leer, dirigir, interrumpir, generar, aprobar.
- Los mensajes entre agentes incluyen `originSessionId`; el eco propio se descarta.
- La difusión requiere un filtro explícito y un número limitado de objetivos.
- Las lecturas de la transcripción redactan secretos en el límite de OpenClaw.
- Las solicitudes de aprobación por defecto se deniegan para los turnos originados por el supervisor a menos que la política los permita.

## Plan de Implementación

Fase 1: MVP de supervisor local

- Añadir cliente JSON-RPC del servidor de aplicaciones de Codex para proxy stdio y endpoints WebSocket.
- Añadir endpoint de supervisor/registro de sesiones.
- Añadir herramientas MCP: list, read, send, interrupt, probe.
- Añadir configuración de entorno local para endpoints.
- Añadir pruebas de servidor de aplicaciones falso y una prueba de humo de servidor de aplicaciones local en vivo.

Fase 2: Integración con OpenClaw

- Registrar herramientas del supervisor en el complemento `codex-supervisor`.
- Inyectar MCP del supervisor en la configuración del hilo de Codex.
- Añadir resúmenes de sesión al contexto del agente.
- Añadir notificaciones de eventos cuando aparecen nuevos hilos de Codex.
- Añadir configuración de política para envío/interrupción/creación autónomos.

Fase 3: Conector de flota

- El sidecar del host registra el endpoint del servidor de aplicaciones, los metadatos del host, los metadatos de git/espacio de trabajo y el estado de conexión humana.
- Añadir conector WebSocket de salida para el plano de control de Cloudflare o VPS.
- Añadir reconexión, latido y limpieza de sesiones obsoletas.
- Añadir contenedor (wrapper) del lanzador SSH de CRAB.

Fase 4: Operación autónoma

- Añadir flujos de generación/reanudación/toma de control.
- Añadir difusión y delegación.
- Añadir informes de progreso y resúmenes de estado de tareas.
- Añadir prevención de bucles y límites de tasa.
- Añadir vistas del panel de control.

Fase 5: Multi-Claw

- Particionar sesiones por grupo.
- Añadir liderazgo/arrendamiento para cada sesión.
- Añadir registro de auditoría y repetición.
- Añadir escalado entre grupos de Claw.

## Pruebas de aceptación

- Un humano lanza la interfaz de usuario de terminal (TUI) de Codex a través de un servidor de aplicaciones compartido.
- El supervisor lista el hilo en vivo a través de `thread/loaded/list`.
- El supervisor lee la transcripción a través de `thread/read`.
- El supervisor envía texto a un hilo inactivo a través de `turn/start`.
- El supervisor dirige un hilo activo a través de `turn/steer`.
- La interrupción del supervisor detiene un turno activo a través de `turn/interrupt`.
- Codex llama al MCP del supervisor y enumera las sesiones homólogas.
- Se inicia un Codex autónomo y más tarde se le adjunta un humano.
- El conector del host perdido marca las sesiones como obsoletas sin eliminar el historial.

## Preguntas abiertas

- UX exacta de adjuntar a la TUI de Codex para un hilo del servidor de aplicaciones iniciado sin una TUI.
- Si Codex debe agregar `exec --remote` para ejecuciones compartidas en vivo sin interfaz gráfica.
- Propietario del estado duradero: OpenClaw Gateway DB, Cloudflare Durable Object o base de datos de VPS.
- Granularidad de la política de aprobación para los turnos originados por el supervisor.
- Cuánto resumen de la transcripción debe inyectarse en el contexto de Claw siempre activo frente a mantenerse como una herramienta/recurso.
