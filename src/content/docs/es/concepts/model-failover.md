---
summary: "Cómo OpenClaw rota los perfiles de autenticación y cambia a modelos alternativos"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Conmutación por error de modelos"
---

# Conmutación por error de modelos

OpenClaw gestiona los fallos en dos etapas:

1. **Rotación de perfiles de autenticación** dentro del proveedor actual.
2. **Conmutación por error de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Este documento explica las reglas de tiempo de ejecución y los datos que las respaldan.

## Flujo de ejecución

Para una ejecución de texto normal, OpenClaw evalúa los candidatos en este orden:

1. El modelo de sesión actualmente seleccionado.
2. `agents.defaults.model.fallbacks` configurados en orden.
3. El modelo principal configurado al final cuando la ejecución comenzó desde una anulación.

Dentro de cada candidato, OpenClaw intenta la conmutación por error de perfil de autenticación antes de pasar al
siguiente candidato de modelo.

Secuencia de alto nivel:

1. Resolver el modelo de sesión activo y la preferencia de perfil de autenticación.
2. Construir la cadena de candidatos de modelo.
3. Intentar el proveedor actual con las reglas de rotación/período de enfriamiento del perfil de autenticación.
4. Si ese proveedor se agota con un error que justifica la conmutación por error, pasar al siguiente
   candidato de modelo.
5. Persistir la anulación de conmutación por error seleccionada antes de que comience el reintento para que otros
   lectores de sesión vean el mismo proveedor/modelo que el ejecutor está a punto de usar.
6. Si falla el candidato de conmutación por error, revertir solo los campos de anulación de sesión
   propiedad de la conmutación por error cuando aún coinciden con ese candidato fallido.
7. Si fallan todos los candidatos, lanzar un `FallbackSummaryError` con detalles por intento
   y la expiración del período de enfriamiento más próxima cuando se conoce una.

Esto es intencionalmente más restrictivo que "guardar y restaurar toda la sesión". El
ejecutor de réplicas solo persiste los campos de selección de modelo que posee para la conmutación por error:

- `providerOverride`
- `modelOverride`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Eso evita que un reintento de conmutación por error fallido sobrescriba mutaciones de sesión más recientes y no relacionadas,
tales como cambios manuales de `/model` o actualizaciones de rotación de sesión que
ocurrieron mientras se ejecutaba el intento.

## Almacenamiento de autenticación (claves + OAuth)

OpenClaw utiliza **perfiles de autenticación** tanto para claves de API como para tokens OAuth.

- Los secretos residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (heredado: `~/.openclaw/agent/auth-profiles.json`).
- Config `auth.profiles` / `auth.order` son **solo metadatos + enrutamiento** (sin secretos).
- Archivo OAuth heredado de solo importación: `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso).

Más detalles: [/concepts/oauth](/en/concepts/oauth)

Tipos de credenciales:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para algunos proveedores)

## IDs de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que varias cuentas puedan coexistir.

- Predeterminado: `provider:default` cuando no hay correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo `google-antigravity:user@gmail.com`).

Los perfiles residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene varios perfiles, OpenClaw elige un orden de la siguiente manera:

1. **Configuración explícita**: `auth.order[provider]` (si está establecido).
2. **Perfiles configurados**: `auth.profiles` filtrados por proveedor.
3. **Perfiles almacenados**: entradas en `auth-profiles.json` para el proveedor.

Si no se configura un orden explícito, OpenClaw usa un orden round‑robin:

- **Clave primaria:** tipo de perfil (**OAuth antes que claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (el más antiguo primero, dentro de cada tipo).
- Los **perfiles en período de espera/deshabilitados** se mueven al final, ordenados por el vencimiento más próximo.

### Persistencia de sesión (amigable con el caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener las cachés del proveedor calientes.
**No** rota en cada solicitud. El perfil fijado se reutiliza hasta que:

- la sesión se restablece (`/new` / `/reset`)
- se completa una compactación (el contador de compactaciones se incrementa)
- el perfil está en período de espera/deshabilitado

La selección manual mediante `/model …@<profileId>` establece una **anulación de usuario** para esa sesión
y no se rota automáticamente hasta que comienza una nueva sesión.

Los perfiles autofijados (seleccionados por el enrutador de sesión) se tratan como una **preferencia**:
se prueban primero, pero OpenClaw puede rotar a otro perfil en caso de límites de tasa/tiempos de espera agotados.
Los perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y se configuran
reservas de modelo, OpenClaw pasa al siguiente modelo en lugar de cambiar de perfil.

### Por qué OAuth puede "parecer perdido"

Si tiene tanto un perfil de OAuth como un perfil de clave de API para el mismo proveedor, el sistema round‑robin puede cambiar entre ellos en los mensajes a menos que se fije. Para forzar un solo perfil:

- Fije con `auth.order[provider] = ["provider:profileId"]`, o
- Use a per-session override via `/model …` with a profile override (when supported by your UI/chat surface).

## Cooldowns

Cuando un perfil falla debido a errores de autenticación/límites de tasa (o un tiempo de espera que parece
un límite de tasa), OpenClaw lo marca en enfriamiento y pasa al siguiente perfil.
Ese cubo de límite de tasa es más amplio que el simple `429`: también incluye mensajes del
proveedor como `Too many concurrent requests`, `ThrottlingException`,
`concurrency limit reached`, `workers_ai ... quota limit exceeded`,
`throttled`, `resource exhausted`, y límites periódicos de ventana de uso como
`weekly/monthly limit reached`.
Los errores de formato/solicitud inválida (por ejemplo, fallos de validación del ID de llamada de herramienta de Cloud Code Assist) se tratan como aptos para conmutación por error y usan los mismos períodos de enfriamiento.
Los errores de motivo de detención compatibles con OpenAI, como `Unhandled stop reason: error`,
`stop reason: error` y `reason: error` se clasifican como señales de tiempo de espera/conmutación por error.
El texto genérico del servidor con alcance al proveedor también puede caer en ese cubo de tiempo de espera cuando
la fuente coincide con un patrón transitorio conocido. Por ejemplo, `An unknown error occurred` simple de Anthropic
y cargas JSON `api_error` con texto de servidor transitorio como `internal server error`, `unknown error, 520`, `upstream error`,
o `backend error` se tratan como tiempos de espera aptos para conmutación por error. El texto genérico
ascendente específico de OpenRouter, como `Provider returned error` simple, también se trata como
tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto de reserva
interno genérico como `LLM request failed with an unknown error.` se mantiene
conservador y no activa la conmutación por error por sí solo.

Los períodos de enfriamiento por límites de tasa también pueden tener alcance de modelo:

- OpenClaw registra `cooldownModel` para fallos por límites de tasa cuando el id del
  modelo que falló se conoce.
- Se puede intentar un modelo hermano en el mismo proveedor cuando el enfriamiento está
  limitado a un modelo diferente.
- Las ventanas de facturación/deshabilitado siguen bloqueando todo el perfil entre modelos.

Los enfriamientos usan retroceso exponencial:

- 1 minuto
- 5 minutos
- 25 minutos
- 1 hora (límite)

El estado se almacena en `auth-profiles.json` bajo `usageStats`:

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## Desactivaciones de facturación

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como dignos de conmutación por error, pero por lo general no son transitorios. En lugar de un enfriamiento corto, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

No todas las respuestas con forma de facturación son `402`, y no todos los `402` de HTTP aterrizan
aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un
proveedor devuelve `401` o `403` en su lugar, pero los detectores específicos del proveedor se mantienen
limitados al proveedor que los posee (por ejemplo, la ventana de uso `403 Key limit
exceeded`). Meanwhile temporary `402` de OpenRouter y
los errores de límite de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando
el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `límite
diario alcanzado, se restablece mañana`, or `límite de gasto de la organización excedido`).
Esos permanecen en la ruta de enfriamiento/conmutación por error corta en lugar de la ruta larga
de desactivación de facturación.

El estado se almacena en `auth-profiles.json`:

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

Valores predeterminados:

- El retroceso de facturación comienza en **5 horas**, se duplica por cada fallo de facturación y se limita a **24 horas**.
- Los contadores de retroceso se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos por sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes de la reserva del modelo.
- Los reintentos por sobrecarga usan **0 ms de retroceso** de forma predeterminada.

## Reserva del modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en
`agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y
tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan la reserva).

Los errores de sobrecarga y límite de velocidad se manejan de manera más agresiva que los períodos de enfriamiento de facturación. De forma predeterminada, OpenClaw permite un reintento del perfil de autenticación del mismo proveedor, luego cambia al siguiente modelo de respaldo configurado sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo de sobrecarga. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza con una anulación de modelo (hooks o CLI), las reservas aún terminan en `agents.defaults.model.primary` después de intentar cualquier reserva configurada.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente más las reservas configuradas.

Reglas:

- El modelo solicitado siempre es el primero.
- Las reservas configuradas explícitamente se deduplican pero no se filtran por la lista blanca de modelos. Se tratan como una intención explícita del operador.
- Si la ejecución actual ya está en una reserva configurada en la misma familia de proveedores, OpenClaw sigue usando la cadena configurada completa.
- Si la ejecución actual está en un proveedor diferente al de la configuración y ese modelo actual aún no es parte de la cadena de reserva configurada, OpenClaw no añade reservas configuradas no relacionadas de otro proveedor.
- Cuando la ejecución comenzó desde una anulación, el principal configurado se añade al final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten los candidatos anteriores.

### Qué errores avanzan la reserva

La reserva del modelo continúa en:

- fallos de autenticación
- límites de velocidad y agotamiento del período de enfriamiento
- errores de sobrecarga/proveedor ocupado
- errores de conmutación por error con forma de tiempo de espera
- inhabilitaciones de facturación
- `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que un modelo persistente obsoleto no cree un bucle de reintento externo
- otros errores no reconocidos cuando todavía hay candidatos restantes

La reserva del modelo no continúa en:

- interrupciones explícitas que no tienen forma de tiempo de espera/conmutación por error
- errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento
  (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`)
- un error final desconocido cuando no quedan candidatos

### Omisión de período de espera vs. comportamiento de sondeo

Cuando todos los perfiles de autenticación de un proveedor ya están en período de espera, OpenClaw no
omite ese proveedor automáticamente para siempre. Toma una decisión por candidato:

- Los fallos persistentes de autenticación omiten todo el proveedor inmediatamente.
- Las deshabilitaciones de facturación generalmente omiten, pero el candidato principal aún puede ser sondeado
  en una limitación para que la recuperación sea posible sin reiniciar.
- El candidato principal puede ser sondeado cerca de la expiración del período de espera, con una limitación
  por proveedor.
- Se pueden intentar hermanos de reserva del mismo proveedor a pesar del período de espera cuando el
  fallo parece transitorio (`rate_limit`, `overloaded` o desconocido). Esto es
  especialmente relevante cuando un límite de tasa está limitado al modelo y un modelo hermano aún
  puede recuperarse inmediatamente.
- Las sondas de período de espera transitorio se limitan a una por proveedor por ejecución de reserva, para que
  un solo proveedor no detenga la reserva entre proveedores.

## Sobrescrituras de sesión y cambio de modelo en vivo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`,
las actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben
partes de la misma entrada de sesión.

Eso significa que los reintentos de reserva deben coordinarse con el cambio de modelo en vivo:

- Solo los cambios explícitos de modelo impulsados por el usuario marcan un cambio en vivo pendiente. Eso
  incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo impulsados por el sistema, como la rotación de reserva, las sobrescrituras de latido
  o la compactación, nunca marcan un cambio en vivo pendiente por sí mismos.
- Antes de que comience un reintento de reserva, el ejecutor de respuesta persiste los campos
  de sobrescritura de reserva seleccionados en la entrada de sesión.
- La conciliación de sesión en vivo prefiere las sobrescrituras de sesión persistidas sobre los campos
  de modelo en tiempo de ejecución obsoletos.
- Si el intento de fallback falla, el ejecutor (runner) revierte solo los campos de sobrescritura
  que escribió, y solo si todavía coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

1. El principal falla.
2. Se elige un candidato de respaldo en memoria.
3. El almacén de sesión todavía indica el principal anterior.
4. La reconciliación de sesión en vivo lee el estado de sesión obsoleto.
5. El reintento se revierte al modelo anterior antes de que el intento de fallback
   comience.

La sobrescritura de fallback persistente cierra esa ventana, y la reversión estrecha
mantiene intactos los cambios manuales o de tiempo de ejecución de sesión más recientes.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por cada intento que alimentan los registros y
los mensajes de cooldown orientados al usuario:

- proveedor/modelo intentado
- razón (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y
  razones de failover similares)
- estado/código opcional
- resumen de error legible por humanos

Cuando falla cada candidato, OpenClaw lanza `FallbackSummaryError`. El ejecutor
de respuestas externo puede usar eso para construir un mensaje más específico, como "todos los modelos
están temporalmente limitados por tasa", e incluir la expiración del cooldown más próxima cuando se
conozca una.

Ese resumen de cooldown es consciente del modelo:

- se ignoran los límites de tasa de ámbito de modelo no relacionados para la cadena
  proveedor/modelo intentada
- si el bloqueo restante es un límite de tasa de ámbito de modelo coincidente, OpenClaw
  informa la última expiración coincidente que aún bloquea ese modelo

## Configuración relacionada

Consulte [Configuración de la puerta de enlace](/en/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/en/concepts/models) para obtener una visión general más amplia de la selección y el respaldo de modelos.
