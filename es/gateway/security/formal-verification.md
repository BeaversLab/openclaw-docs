---
title: Verificación Formal (Modelos de Seguridad)
summary: Modelos de seguridad verificados por máquina para las rutas de mayor riesgo de OpenClaw.
permalink: /security/formal-verification/
---

# Verificación Formal (Modelos de Seguridad)

Esta página rastrea los **modelos de seguridad formales** de OpenClaw (TLA+/TLC hoy; más según sea necesario).

> Nota: algunos enlaces antiguos pueden referirse al nombre anterior del proyecto.

**Objetivo (estrella polar):** proporcionar un argumento verificado por máquina de que OpenClaw cumple con su
política de seguridad prevista (autorización, aislamiento de sesión, filtrado de herramientas y
seguridad contra configuraciones erróneas), bajo suposiciones explícitas.

**Lo que esto es (hoy):** un **conjunto de regresiones de seguridad** ejecutable y dirigido por un atacante:

- Cada afirmación tiene una verificación de modelo ejecutable sobre un espacio de estados finito.
- Muchas afirmaciones tienen un **modelo negativo** emparejado que produce un rastro contraejemplo para una clase de error realista.

**Lo que esto no es (todavía):** una prueba de que "OpenClaw es seguro en todos los aspectos" o de que la implementación completa de TypeScript es correcta.

## Dónde residen los modelos

Los modelos se mantienen en un repositorio separado: [vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models).

## Advertencias importantes

- Estos son **modelos**, no la implementación completa de TypeScript. Es posible que haya una deriva entre el modelo y el código.
- Los resultados están limitados por el espacio de estados explorado por TLC; "verde" no implica seguridad más allá de las suposiciones y límites modelados.
- Algunas afirmaciones se basan en suposiciones ambientales explícitas (por ejemplo, despliegue correcto, entradas de configuración correctas).

## Reproduciendo resultados

Hoy, los resultados se reproducen clonando localmente el repositorio de modelos y ejecutando TLC (ver abajo). Una iteración futura podría ofrecer:

- Modelos ejecutados por CI con artefactos públicos (rastros contraejemplo, registros de ejecución)
- un flujo de trabajo alojado de "ejecutar este modelo" para verificaciones pequeñas y acotadas

Para empezar:

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Exposición de la puerta de enlace y configuración errónea de puerta de enlace abierta

**Afirmación:** vincularse más allá de loopback sin autenticación puede permitir que el compromiso remoto sea posible / aumenta la exposición; el token/contraseña bloquea a los atacantes no autenticados (según las suposiciones del modelo).

- Ejecuciones verdes:
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- Rojas (esperado):
  - `make gateway-exposure-v2-negative`

Ver también: `docs/gateway-exposure-matrix.md` en el repositorio de modelos.

### Canalización de Nodes.run (capacidad de mayor riesgo)

**Reclamación:** `nodes.run` requiere (a) lista de permitidos de comandos de nodo más comandos declarados y (b) aprobación en vivo cuando se configura; las aprobaciones se tokenizan para evitar la repetición (en el modelo).

- Ejecuciones verdes:
  - `make nodes-pipeline`
  - `make approvals-token`
- Rojo (esperado):
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### Almacenamiento de emparejamiento (bloqueo DM)

**Reclamación:** las solicitudes de emparejamiento respetan el TTL y los límites de solicitudes pendientes.

- Ejecuciones verdes:
  - `make pairing`
  - `make pairing-cap`
- Rojo (esperado):
  - `make pairing-negative`
  - `make pairing-cap-negative`

### Bloqueo de entrada (menciones + omisión de comandos de control)

**Reclamación:** en contextos de grupo que requieren mención, un "comando de control" no autorizado no puede omitir el bloqueo de mención.

- Verde:
  - `make ingress-gating`
- Rojo (esperado):
  - `make ingress-gating-negative`

### Aislamiento de enrutamiento/clave de sesión

**Reclamación:** los MD de distintos pares no colapsan en la misma sesión a menos que se vinculen/configuren explícitamente.

- Verde:
  - `make routing-isolation`
- Rojo (esperado):
  - `make routing-isolation-negative`

## v1++: modelos acotados adicionales (concurrencia, reintentos, corrección de traza)

Estos son modelos posteriores que ajustan la fidelidad en torno a los modos de falla del mundo real (actualizaciones no atómicas, reintentos y difusión de mensajes).

### Concurrencia del almacenamiento de emparejamiento / idempotencia

**Reclamación:** un almacenamiento de emparejamiento debe hacer cumplir `MaxPending` y la idempotencia incluso bajo intercalaciones (es decir, "verificar-then-escribir" debe ser atómico/bloqueado; la actualización no debería crear duplicados).

Lo que significa:

- Bajo solicitudes concurrentes, no puedes exceder `MaxPending` para un canal.
- Las solicitudes/actualizaciones repetidas para el mismo `(channel, sender)` no deberían crear filas pendientes duplicadas en vivo.

- Ejecuciones verdes:
  - `make pairing-race` (verificación de límite atómico/bloqueado)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- Rojo (esperado):
  - `make pairing-race-negative` (condición de carrera de límite no atómico begin/commit)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### Correlación de traza de entrada / idempotencia

**Afirmación:** la ingesta debe preservar la correlación de trazas a través de la distribución y ser idempotente bajo los reintentos del proveedor.

Lo que significa:

- Cuando un evento externo se convierte en múltiples mensajes internos, cada parte mantiene la misma identidad de traza/evento.
- Los reintentos no resultan en un procesamiento doble.
- Si faltan los IDs de eventos del proveedor, la deduplicación recurre a una clave segura (p. ej., ID de traza) para evitar descartar eventos distintos.

- Verde:
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- Rojo (esperado):
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### Precedencia de dmScope de enrutamiento + identityLinks

**Afirmación:** el enrutamiento debe mantener las sesiones DM aisladas de forma predeterminada y solo colapsar las sesiones cuando se configure explícitamente (precedencia de canal + enlaces de identidad).

Lo que significa:

- Las anulaciones de dmScope específicas del canal deben tener prioridad sobre los valores predeterminados globales.
- identityLinks solo debe colapsar dentro de grupos vinculados explícitos, no entre pares no relacionados.

- Verde:
  - `make routing-precedence`
  - `make routing-identitylinks`
- Rojo (esperado):
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

import es from "/components/footer/es.mdx";

<es />
