---
summary: "Plan de migración para hacer explícita la propiedad de la sesión ACP y el proceso ACPX"
read_when:
  - Refactoring ACP session lifecycle or ACPX process cleanup
  - Debugging ACPX orphan processes, PID reuse, or multi-gateway cleanup safety
  - Changing sessions_list visibility for spawned ACP or subagent sessions
  - Designing ownership metadata for background tasks, ACP sessions, or process leases
title: "Refactorización del ciclo de vida de ACP"
sidebarTitle: "Refactorización del ciclo de vida de ACP"
---

Actualmente, el ciclo de vida de ACP funciona, pero gran parte del mismo se deduce a posteriori.
La limpieza de procesos reconstruye la propiedad a partir de los PIDs, cadenas de comandos, rutas del contenedor (wrapper)
y la tabla de procesos en vivo. La visibilidad de la sesión reconstruye la propiedad
a partir de cadenas de clave de sesión más búsquedas secundarias `sessions.list({ spawnedBy })`.
Eso permite soluciones específicas, pero también facilita pasar por alto casos extremos:
la reutilización de PIDs, comandos entre comillas, nietos de adaptadores, raíces de estado de múltiples pasarelas,
visibilidad de `cancel` frente a `close`, y `tree` frente a `all`, todo ello se convierte en lugares
separados para redescubrir las mismas reglas de propiedad.

Esta refactorización convierte la propiedad en un elemento de primera clase. El objetivo no es una nueva superficie de producto ACP;
es un contrato interno más seguro para el comportamiento existente de ACP y ACPX.

## Objetivos

- La limpieza nunca señala un proceso a menos que la evidencia en vivo actual coincida con un
  arrendamiento propiedad de OpenClaw.
- `cancel`, `close` y la recolección (reaping) al inicio tienen intenciones de ciclo de vida distintas.
- `sessions_list`, `sessions_history`, `sessions_send` y las comprobaciones de estado utilizan
  el mismo modelo de sesión propiedad del solicitante.
- Las instalaciones con múltiples pasarelas no pueden recolectar los contenedores (wrappers) ACPX entre sí.
- Los registros antiguos de sesión ACPX siguen funcionando durante la migración.
- El tiempo de ejecución sigue siendo propiedad del complemento (plugin); el núcleo no obtiene detalles del paquete ACPX.

## No objetivos

- Reemplazar ACPX o cambiar la superficie del comando público `/acp`.
- Mover el comportamiento del adaptador ACP específico del proveedor al núcleo.
- Requerir que los usuarios limpien el estado manualmente antes de actualizar.
- Hacer que `cancel` cierre las sesiones ACP reutilizables.

## Modelo objetivo

### Identidad de la instancia de la pasarela

Cada proceso de la pasarela debe tener un id de instancia de tiempo de ejecución estable:

```ts
type GatewayInstanceId = string;
```

Se puede generar al iniciar Gateway y persistir en el estado durante la vida de esa instalación. No es un secreto de seguridad; es un discriminador de propiedad utilizado para evitar confundir los procesos ACP de un Gateway con los procesos de otro Gateway.

### Propiedad de la sesión ACP

Cada sesión ACP generada debe tener metadatos de propiedad normalizados:

```ts
type AcpSessionOwner = {
  sessionKey: string;
  spawnedBy?: string;
  parentSessionKey?: string;
  ownerSessionKey: string;
  agentId: string;
  backend: "acpx";
  gatewayInstanceId: GatewayInstanceId;
  createdAt: number;
};
```

El Gateway debe devolver estos campos en las filas de sesión donde se conocen. El filtrado de visibilidad debe ser una verificación pura sobre los metadatos de la fila:

```ts
canSeeSessionRow({
  row,
  requesterSessionKey,
  visibility,
  a2aPolicy,
});
```

Eso elimina las llamadas secundarias ocultas `sessions.list({ spawnedBy })` de las verificaciones de visibilidad. Un hijo ACP generado entre agentes pertenece al solicitante porque la fila lo dice, no porque una segunda consulta coincida en encontrarlo.

### Concesiones de procesos ACPX

Cada lanzamiento de wrapper generado debe crear un registro de concesión:

```ts
type AcpxProcessLease = {
  leaseId: string;
  gatewayInstanceId: GatewayInstanceId;
  sessionKey: string;
  wrapperRoot: string;
  wrapperPath: string;
  rootPid: number;
  processGroupId?: number;
  commandHash: string;
  startedAt: number;
  state: "open" | "closing" | "closed" | "lost";
};
```

El proceso del wrapper debe recibir el id de concesión y el id de instancia de gateway en su entorno:

```sh
OPENCLAW_ACPX_LEASE_ID=...
OPENCLAW_GATEWAY_INSTANCE_ID=...
```

Cuando la plataforma lo permite, la verificación debe preferir metadatos de procesos en vivo que no puedan ser confundidos por el entrecomillado de comandos:

- el PID raíz todavía existe
- la ruta del wrapper en vivo está bajo `wrapperRoot`
- el grupo de procesos coincide con la concesión cuando está disponible
- el entorno contiene el id de concesión esperado cuando es legible
- el hash del comando o la ruta del ejecutable coincide con la concesión

Si el proceso en vivo no puede ser verificado, la limpieza falla de forma cerrada.

## Controlador de ciclo de vida

Introducir un controlador de ciclo de vida ACPX que posea las concesiones de procesos y la política de limpieza:

```ts
interface AcpxLifecycleController {
  ensureSession(input: AcpRuntimeEnsureInput): Promise<AcpRuntimeHandle>;
  cancelTurn(handle: AcpRuntimeHandle): Promise<void>;
  closeSession(input: { handle: AcpRuntimeHandle; discardPersistentState?: boolean; reason?: string }): Promise<void>;
  reapStartupOrphans(): Promise<void>;
  verifyOwnedTree(lease: AcpxProcessLease): Promise<OwnedProcessTree | null>;
}
```

las solicitudes `cancelTurn` solo giran la cancelación. No debe recolectar procesos de wrapper o adaptador reutilizables.

`closeSession` tiene permiso para recolectar, pero solo después de cargar el registro de sesión, cargar la concesión y verificar que el árbol de procesos en vivo todavía pertenezca a esa concesión.

`reapStartupOrphans` comienza desde concesiones abiertas en el estado. Puede usar la tabla de procesos para encontrar descendientes, pero no debe escanear primero comandos arbitrarios que parezcan ACP y luego decidir que probablemente son nuestros.

## Contrato del Wrapper

Los wrappers generados deben mantenerse pequeños. Deben:

- iniciar el adaptador en un grupo de procesos donde sea compatible
- reenviar señales de terminación normales al grupo de procesos
- detectar la muerte del padre
- al morir el padre, enviar SIGTERM y luego mantener el wrapper vivo hasta que se ejecute el respaldo SIGKILL
- reportar el PID raíz y el id del grupo de procesos de vuelta al controlador de ciclo de vida cuando eso esté disponible

Los wrappers no deben decidir la política de sesión. Solo aplican la limpieza local del árbol de procesos para su propio grupo de adaptadores.

## Contrato de visibilidad de sesión

La visibilidad debe usar la propiedad de fila normalizada:

```ts
type SessionVisibilityInput = {
  requesterSessionKey: string;
  row: {
    key: string;
    agentId: string;
    ownerSessionKey?: string;
    spawnedBy?: string;
    parentSessionKey?: string;
  };
  visibility: "self" | "tree" | "agent" | "all";
  a2aPolicy: AgentToAgentPolicy;
};
```

Reglas:

- `self`: solo la sesión solicitante.
- `tree`: sesión solicitante más filas propiedad de o generadas desde el solicitante.
- `all`: todas las filas del mismo agente, filas entre agentes permitidas por a2a, y filas entre agentes generadas y propiedad del solicitante, incluso cuando a2a general está deshabilitado.
- `agent`: solo el mismo agente, a menos que una relación de propietario explícita indique que la fila pertenece al solicitante.

Esto hace que `tree` y `all` sean monótonos: `all` no debe ocultar un hijo propiedad que `tree` mostraría.

## Plan de migración

### Fase 1: Agregar identidad y arrendamientos

- Agregar `gatewayInstanceId` al estado de Gateway.
- Agregar un almacén de arrendamientos ACPX bajo el directorio de estado ACPX.
- Escribir un arrendamiento antes de generar un wrapper generado.
- Almacenar `leaseId` en los nuevos registros de sesión ACPX.
- Mantener los campos de PID y comando existentes para registros antiguos.

### Fase 2: Limpieza primero con arrendamiento

- Cambiar la limpieza de cierre para cargar `leaseId` primero.
- Verificar la propiedad del proceso en vivo contra el arrendamiento antes de señalar.
- Mantener el PID raíz actual y la alternativa de wrapper-root solo para registros heredados.
- Marcar los arrendamientos `closed` después de la limpieza verificada.
- Marcar los arrendamientos `lost` cuando el proceso ha desaparecido antes de la limpieza.

### Fase 3: Limpieza al inicio primero con arrendamiento

- La limpieza al inicio escanea los arrendamientos abiertos.
- Para cada arrendamiento, verificar el proceso raíz y recopilar los descendientes.
- Limpiar los árboles verificados hijos primero.
- Expirar los arrendamientos antiguos `closed` y `lost` con una ventana de retención delimitada.
- Mantener el escaneo de marcadores de comando solo como una alternativa heredada temporal, protegida por wrapper root e instancia de Gateway cuando sea posible.

### Fase 4: Filas de propiedad de sesión

- Agregar metadatos de propiedad a las filas de sesión de Gateway.
- Enseñar a los escritores de ACPX, subagente, tareas en segundo plano y almacén de sesiones a poblar `ownerSessionKey` o `spawnedBy`.
- Convertir las comprobaciones de visibilidad de sesión para usar metadatos de fila.
- Eliminar búsquedas secundarias `sessions.list({ spawnedBy })` en tiempo de visibilidad.

### Fase 5: Eliminar heurísticas heredadas

Después de una ventana de lanzamiento:

- dejar de confiar en las cadenas de comandos raíz almacenadas para la limpieza de ACPX no heredado
- eliminar los escaneos de inicio del marcador de comandos
- eliminar las búsquedas de lista de reserva de visibilidad
- mantener el comportamiento defensivo de falla cerrada para concesiones faltantes o no verificables

## Pruebas

Añadir dos conjuntos impulsados por tablas.

Simulador de ciclo de vida del proceso:

- PID reutilizado por un proceso no relacionado
- PID reutilizado por la raíz del wrapper de otra puerta de enlace
- el comando de wrapper almacenado está entre comillas de shell, el comando `ps` en vivo no
- el hijo del adaptador sale, el nieto permanece en el grupo de procesos
- la reserva SIGTERM por muerte del padre llega a SIGKILL
- listado de procesos no disponible
- concesión obsoleta con proceso faltante
- huérfano de inicio con wrapper, hijo del adaptador y nieto

Matriz de visibilidad de sesión:

- `self`, `tree`, `agent`, `all`
- a2a habilitado y deshabilitado
- fila del mismo agente
- fila entre agentes
- fila ACP entre agentes generada y propiedad del solicitante
- solicitante en sandbox limitado a `tree`
- acciones de lista, historial, envío y estado

El invariante importante: un hijo generado propiedad del solicitante es visible donde sea
que la visibilidad configurada incluya el árbol de sesiones del solicitante, y `all` no es
menos capaz que `tree`.

## Notas de compatibilidad

Los registros de sesión antiguos pueden no tener `leaseId`. Deben usar la ruta de
limpieza heredada de falla cerrada:

- requerir un proceso raíz en vivo
- requerir propiedad de raíz de wrapper cuando se espera un wrapper generado
- requerir acuerdo de comando para raíces que no son wrapper
- nunca enviar señales basándose solo en metadatos de PID almacenados obsoletos

Si no se puede verificar un registro heredado, déjelo como está. La limpieza de concesiones
al inicio y la siguiente ventana de lanzamiento deberían retirar finalmente la reserva.

## Criterios de éxito

- Cerrar una sesión ACPX antigua o obsoleta no puede matar el proceso de otra puerta de enlace.
- La muerte del padre no deja nietos de adaptadores obstinados ejecutándose.
- `cancel` aborta el turno activo sin cerrar sesiones reutilizables.
- `sessions_list` puede mostrar elementos secundarios ACP entre agentes y propiedad del solicitante bajo `tree` y `all`.
- La limpieza de inicio está impulsada por concesiones, no por escaneos amplios de cadenas de comandos.
- Las pruebas enfocadas en el proceso y en la matriz de visibilidad cubren todos los casos extremos que anteriormente requerían correcciones de revisión puntuales.
