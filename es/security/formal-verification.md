---
title: Verificación formal (Modelos de seguridad)
summary: Modelos de seguridad verificados por máquina para las rutas de mayor riesgo de OpenClaw.
read_when:
  - Reviewing formal security model guarantees or limits
  - Reproducing or updating TLA+/TLC security model checks
permalink: /security/formal-verification/
---

# Verificación formal (Modelos de seguridad)

Esta página rastrea los **modelos de seguridad formales** de OpenClaw (TLA+/TLC hoy; más según sea necesario).

> Nota: algunos enlaces antiguos pueden referirse al nombre anterior del proyecto.

**Objetivo (estrella polar):** proporcionar un argumento verificado por máquina de que OpenClaw hace cumplir su
política de seguridad prevista (autorización, aislamiento de sesión, filtrado de herramientas y
seguridad contra configuraciones erróneas), bajo suposiciones explícitas.

**Lo que esto es (hoy):** una **suite de regresión de seguridad** ejecutable y dirigida por el atacante:

- Cada afirmación tiene una verificación de modelo ejecutable sobre un espacio de estados finito.
- Muchas afirmaciones tienen un **modelo negativo** emparejado que produce un rastro de contraejemplo para una clase de error realista.

**Lo que esto no es (todavía):** una prueba de que "OpenClaw es seguro en todos los aspectos" o de que la implementación completa en TypeScript es correcta.

## Dónde residen los modelos

Los modelos se mantienen en un repositorio separado: [vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models).

## Advertencias importantes

- Estos son **modelos**, no la implementación completa en TypeScript. Es posible una deriva entre el modelo y el código.
- Los resultados están limitados por el espacio de estado explorado por TLC; "verde" no implica seguridad más allá de las suposiciones y límites modelados.
- Algunas afirmaciones se basan en suposiciones ambientales explícitas (p. ej., implementación correcta, entradas de configuración correctas).

## Reproducción de resultados

Hoy, los resultados se reproducen clonando el repositorio de modelos localmente y ejecutando TLC (ver abajo). Una iteración futura podría ofrecer:

- modelos ejecutados por CI con artefactos públicos (rastros de contraejemplo, registros de ejecución)
- un flujo de trabajo alojado "ejecutar este modelo" para verificaciones pequeñas y delimitadas

Para empezar:

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Exposición de la puerta de enlace y configuración errónea de la puerta de enlace abierta

**Afirmación:** vincular más allá del loopback sin autenticación puede hacer posible el compromiso remoto / aumenta la exposición; el token/contraseña bloquea atacantes no autorizados (según las suposiciones del modelo).

- Ejecuciones en verde:
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- Rojo (esperado):
  - `make gateway-exposure-v2-negative`

Ver también: `docs/gateway-exposure-matrix.md` en el repositorio de modelos.

### Canalización de Nodes.run (capacidad de mayor riesgo)

**Afirmación:** `nodes.run` requiere (a) una lista blanca de comandos de nodo además de comandos declarados y (b) aprobación en vivo cuando esté configurado; las aprobaciones se tokenizan para evitar la repetición (en el modelo).

- Ejecuciones verdes:
  - `make nodes-pipeline`
  - `make approvals-token`
- Rojo (esperado):
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### Almacenamiento de emparejamiento (control de DM)

**Afirmación:** las solicitudes de emparejamiento respetan el TTL y los límites de solicitudes pendientes.

- Ejecuciones verdes:
  - `make pairing`
  - `make pairing-cap`
- Rojo (esperado):
  - `make pairing-negative`
  - `make pairing-cap-negative`

### Control de ingreso (menciones + omisión de comando de control)

**Afirmación:** en contextos grupales que requieren mención, un "comando de control" no autorizado no puede omitir el control de mención.

- Verde:
  - `make ingress-gating`
- Rojo (esperado):
  - `make ingress-gating-negative`

### Aislamiento de enrutamiento/clave de sesión

**Afirmación:** los MD de distintos pares no colapsan en la misma sesión a menos que estén explícitamente vinculados/configurados.

- Verde:
  - `make routing-isolation`
- Rojo (esperado):
  - `make routing-isolation-negative`

## v1++: modelos delimitados adicionales (concurrencia, reintentos, corrección de rastros)

Estos son modelos de seguimiento que ajustan la fidelidad en torno a los modos de falla del mundo real (actualizaciones no atómicas, reintentos y difusión de mensajes).

### Concurrencia / idempotencia del almacenamiento de emparejamiento

**Afirmación:** un almacenamiento de emparejamiento debe hacer cumplir `MaxPending` y la idempotencia incluso bajo intercalaciones (es decir, "verificar-antes-de-escribir" debe ser atómico/bloqueado; la actualización no debería crear duplicados).

Lo que significa:

- Bajo solicitudes simultáneas, no puedes exceder `MaxPending` para un canal.
- Las solicitudes/actualizaciones repetidas para el mismo `(channel, sender)` no deben crear filas pendientes duplicadas en vivo.

- Ejecuciones verdes:
  - `make pairing-race` (verificación de límite atómico/bloqueado)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- Rojo (esperado):
  - `make pairing-race-negative` (carrera de límite begin/commit no atómico)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### Correlación de rastros de ingreso / idempotencia

**Afirmación:** la ingesta debe preservar la correlación de trazas a través de la distribución (fan-out) y ser idempotente bajo los reintentos del proveedor.

Lo que significa:

- Cuando un evento externo se convierte en múltiples mensajes internos, cada parte mantiene la misma identidad de traza/evento.
- Los reintentos no dan lugar a un procesamiento doble.
- Si faltan los IDs de eventos del proveedor, la deduplicación recurre a una clave segura (por ejemplo, ID de traza) para evitar descartar eventos distintos.

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

**Afirmación:** el enrutamiento debe mantener las sesiones DM aisladas de forma predeterminada y solo colapsar sesiones cuando esté configurado explícitamente (precedencia de canal + enlaces de identidad).

Lo que significa:

- Las invalidaciones específicas del canal de dmScope deben tener prioridad sobre los valores predeterminados globales.
- identityLinks solo debería colapsar dentro de grupos vinculados explícitos, no entre pares no relacionados.

- Verde:
  - `make routing-precedence`
  - `make routing-identitylinks`
- Rojo (esperado):
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

import es from "/components/footer/es.mdx";

<es />
