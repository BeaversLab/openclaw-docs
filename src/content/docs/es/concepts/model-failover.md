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
- El estado de enrutamiento de autenticación en tiempo de ejecución reside en `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- Config `auth.profiles` / `auth.order` son **solo metadatos + enrutamiento** (sin secretos).
- Archivo de OAuth heredado de solo importación: `~/.openclaw/credentials/oauth.json` (importado en `auth-profiles.json` en el primer uso).

Más detalles: [/concepts/oauth](/es/concepts/oauth)

Tipos de credenciales:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para algunos proveedores)

## ID de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que varias cuentas puedan coexistir.

- Predeterminado: `provider:default` cuando no hay correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo `google-antigravity:user@gmail.com`).

Los perfiles residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene múltiples perfiles, OpenClaw elige un orden de la siguiente manera:

1. **Configuración explícita**: `auth.order[provider]` (si está configurado).
2. **Perfiles configurados**: `auth.profiles` filtrados por proveedor.
3. **Perfiles almacenados**: entradas en `auth-profiles.json` para el proveedor.

Si no se configura ningún orden explícito, OpenClaw utiliza un orden round‑robin:

- **Clave primaria:** tipo de perfil (**OAuth antes que las claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (el más antiguo primero, dentro de cada tipo).
- Los **perfiles en período de espera/deshabilitados** se mueven al final, ordenados por la expiración más próxima.

### Persistencia de sesión (amigable con el caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener los cachés del proveedor calientes.
**No** rota en cada solicitud. El perfil fijado se reutiliza hasta que:

- la sesión se restablece (`/new` / `/reset`)
- se completa una compactación (el recuento de compactaciones se incrementa)
- el perfil está en período de espera/deshabilitado

La selección manual a través de `/model …@<profileId>` establece una **anulación del usuario** para esa sesión
y no se rota automáticamente hasta que comienza una nueva sesión.

Los perfiles auto fijados (seleccionados por el enrutador de sesiones) se tratan como una **preferencia**:
se intentan primero, pero OpenClaw puede rotar a otro perfil en caso de límites de tasa/tiempos de espera.
Los perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y los modelos alternativos
están configurados, OpenClaw pasa al siguiente modelo en lugar de cambiar de perfiles.

### Por qué OAuth puede "parecer perdido"

Si tienes tanto un perfil de OAuth como un perfil de clave de API para el mismo proveedor, el round-robin puede cambiar entre ellos en diferentes mensajes a menos que estén fijados. Para forzar un único perfil:

- Fija con `auth.order[provider] = ["provider:profileId"]`, o
- Usa un override por sesión a través de `/model …` con un override de perfil (cuando sea soportado por tu interfaz de usuario/superficie de chat).

## Períodos de enfriamiento

Cuando un perfil falla debido a errores de autenticación/límite de tasa (o un tiempo de espera que parece
un límite de tasa), OpenClaw lo marca en período de enfriamiento y pasa al siguiente perfil.
Ese depósito de límite de tasa es más amplio que el simple `429`: también incluye mensajes del
proveedor como `Too many concurrent requests`, `ThrottlingException`,
`concurrency limit reached`, `workers_ai ... quota limit exceeded`,
`throttled`, `resource exhausted` y límites periódicos de ventana de uso como
`weekly/monthly limit reached`.
Los errores de formato/solicitud no válida (por ejemplo, fallos de validación del ID de llamada de herramienta de Cloud Code Assist)
se tratan como susceptibles de conmutación por error y utilizan los mismos períodos de enfriamiento.
Los errores de motivo de detención compatibles con OpenAI, como `Unhandled stop reason: error`,
`stop reason: error` y `reason: error`, se clasifican como señales de tiempo de espera/conmutación por error.
El texto genérico del servidor con ámbito de proveedor también puede caer en ese depósito de tiempo de espera cuando
el origen coincide con un patrón transitorio conocido. Por ejemplo, `An unknown error occurred` simple de Anthropic
y payloads JSON `api_error` con texto de servidor transitorio como `internal server error`, `unknown error, 520`, `upstream error`,
o `backend error` se tratan como tiempos de espera susceptibles de conmutación por error. El texto genérico
ascendente específico de OpenRouter, como `Provider returned error` simple, también se trata como
tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto de reserva interno
genérico como `LLM request failed with an unknown error.` se mantiene
conservador y no activa la conmutación por error por sí solo.

De lo contrario, algunos SDK de proveedores podrían permanecer inactivos durante una `Retry-After` larga antes de
devolver el control a OpenClaw. Para los SDK basados en Stainless, como Anthropic y
OpenAI, OpenClaw limita las esperas internas del SDK de `retry-after-ms` / `retry-after` a 60
segundos de forma predeterminada y expone inmediatamente las respuestas reintentables más largas para que
se pueda ejecutar esta ruta de conmutación por error. Ajuste o desactive el límite con
`OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`; consulte [/concepts/retry](/es/concepts/retry).

Los períodos de enfriamiento por límite de tasa también pueden estar limitados al modelo:

- OpenClaw registra `cooldownModel` para los fallos de límite de tasa cuando se conoce
  el id del modelo fallido.
- Aún se puede intentar un modelo hermano en el mismo proveedor cuando el enfriamiento está
  limitado a un modelo diferente.
- Las ventanas de facturación/deshabilitadas siguen bloqueando todo el perfil entre modelos.

Los períodos de enfriamiento utilizan retroceso exponencial:

- 1 minuto
- 5 minutos
- 25 minutos
- 1 hora (límite)

El estado se almacena en `auth-state.json` bajo `usageStats`:

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

## Deshabilitaciones por facturación

Los fallos de facturación/crédito (por ejemplo, “créditos insuficientes” / “saldo de crédito demasiado bajo”) se tratan como aptos para la conmutación por error, pero por lo general no son transitorios. En lugar de un enfriamiento breve, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

No todas las respuestas con forma de facturación son `402`, y no todos los `402` HTTP
cal aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un
proveedor devuelve `401` o `403` en su lugar, pero los comparadores específicos del proveedor se
mantienen limitados al proveedor que los posee (por ejemplo, la ventana de uso de OpenRouter `403 Key limit
exceeded`). Meanwhile temporary `402` y
los errores de límite de gasto de la organización/espacio de trabajo se clasifican como `rate_limit` cuando
el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`).
Esos se mantienen en la ruta de enfriamiento/conmutación por error breve en lugar de en la ruta larga
de deshabilitación de facturación.

El estado se almacena en `auth-state.json`:

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

- El retroceso de facturación comienza en **5 horas**, se duplica por cada error de facturación y tiene un máximo de **24 horas**.
- Los contadores de retroceso se restablecen si el perfil no ha tenido errores durante **24 horas** (configurable).
- Los reintentos de sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes de la recuperación del modelo.
- Los reintentos de sobrecarga usan **0 ms de retroceso** de forma predeterminada.

## Recuperación del modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en
`agents.defaults.model.fallbacks`. Esto se aplica a errores de autenticación, límites de velocidad y
tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan la recuperación).

Los errores de sobrecarga y límite de velocidad se manejan de manera más agresiva que los
períodos de inactividad por facturación. De forma predeterminada, OpenClaw permite un reintento de perfil de autenticación del mismo proveedor,
luego cambia a la siguiente recuperación de modelo configurada sin esperar.
Las señales de proveedor ocupado, como `ModelNotReadyException`, entran en ese depósito de sobrecarga.
Ajuste esto con `auth.cooldowns.overloadedProfileRotations`,
`auth.cooldowns.overloadedBackoffMs` y
`auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza con una anulación de modelo (hooks o CLI), las recuperaciones aún terminan en
`agents.defaults.model.primary` después de intentar cualquier recuperación configurada.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente
más las recuperaciones configuradas.

Reglas:

- El modelo solicitado siempre es el primero.
- Las recuperaciones configuradas explícitamente se deduplican pero no se filtran por la lista
  permitida del modelo. Se tratan como una intención explícita del operador.
- Si la ejecución actual ya está en una recuperación configurada en la misma familia
  de proveedor, OpenClaw sigue usando la cadena configurada completa.
- Si la ejecución actual está en un proveedor diferente al de la configuración y ese modelo
  actual aún no es parte de la cadena de recuperación configurada, OpenClaw no
  agrega recuperaciones configuradas no relacionadas de otro proveedor.
- Cuando la ejecución comenzó desde una anulación, el principal configurado se agrega al
  final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten
  los candidatos anteriores.

### Qué errores avanzan la recuperación

La recuperación del modelo continúa con:

- errores de autenticación
- límites de velocidad y agotamiento del período de inactividad
- errores de sobrecarga/proveedor ocupado
- errores de recuperación con forma de tiempo de espera
- desactivaciones por facturación
- `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que
  un modelo persistente obsoleto no cree un bucle de reinterno externo
- otros errores no reconocidos cuando todavía quedan candidatos

La conmutación por error del modelo no continúa en:

- interrupciones explícitas que no son de tiempo de espera o forma de conmutación por error
- errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento
  (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`)
- un error desconocido final cuando no quedan candidatos

### Omisión de tiempo de recuperación frente a comportamiento de sonda

Cuando todos los perfiles de autenticación de un proveedor ya están en tiempo de recuperación, OpenClaw no
omite automáticamente ese proveedor para siempre. Toma una decisión por candidato:

- Los fallos persistentes de autenticación omiten todo el proveedor inmediatamente.
- Las deshabilitaciones de facturación generalmente se omiten, pero el candidato principal todavía puede sondearse
  en una limitación para que la recuperación sea posible sin reiniciar.
- El candidato principal puede sondearse cerca de la expiración del tiempo de recuperación, con una limitación
  por proveedor.
- Los hermanos de conmutación por error del mismo proveedor pueden intentarse a pesar del tiempo de recuperación cuando el
  fallo parece transitorio (`rate_limit`, `overloaded`, o desconocido). Esto es
  especialmente relevante cuando un límite de tasa está en el ámbito del modelo y un modelo hermano puede
  aún recuperarse inmediatamente.
- Las sondas de tiempo de recuperación transitorio se limitan a una por proveedor por ejecución de conmutación por error para que
  un solo proveedor no detenga la conmutación por error entre proveedores.

## Anulaciones de sesión y cambio en vivo de modelo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`,
las actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben
partes de la misma entrada de sesión.

Eso significa que los reintentos de conmutación por error deben coordinarse con el cambio en vivo de modelo:

- Solo los cambios explícitos de modelo impulsados por el usuario marcan un cambio en vivo pendiente. Eso
  incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo impulsados por el sistema, como la rotación de reserva, las anulaciones de latido (heartbeat) o la compactación, nunca marcan por sí mismos un cambio en vivo pendiente.
- Antes de que comience un reintento de reserva (fallback), el ejecutor de respuestas (reply runner) persiste los campos de anulación de reserva seleccionados en la entrada de sesión.
- La conciliación de sesión en vivo prefiere las anulaciones de sesión persistidas sobre los campos de modelo de tiempo de ejecución obsoletos.
- Si el intento de reserva falla, el ejecutor revierte solo los campos de anulación que escribió, y solo si todavía coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

1. El principal falla.
2. El candidato de reserva se elige en memoria.
3. El almacén de sesión todavía indica el principal anterior.
4. La conciliación de sesión en vivo lee el estado de sesión obsoleto.
5. El reintento se revierte al modelo anterior antes de que comience el intento de reserva.

La anulación de reserva persistida cierra esa ventana, y la reversión limitada mantiene intactos los cambios manuales o de sesión de tiempo de ejecución más recientes.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por intento que alimentan los registros y los mensajes de enfriamiento (cooldown) orientados al usuario:

- proveedor/modelo intentado
- motivo (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y motivos de conmutación por error similares)
- estado/código opcional
- resumen de error legible por humanos

Cuando fallan todos los candidatos, OpenClaw lanza `FallbackSummaryError`. El ejecutor de respuestas externo puede usar esto para construir un mensaje más específico, como "todos los modelos están temporalmente limitados por tasa", e incluir la caducidad de enfriamiento más próxima cuando se conoce una.

Ese resumen de enfriamiento es consciente del modelo:

- se ignoran los límites de tasa con ámbito de modelo no relacionados para la cadena de proveedor/modelo intentada
- si el bloque restante es un límite de tasa con ámbito de modelo coincidente, OpenClaw informa la última caducidad coincidente que todavía bloquea ese modelo

## Configuración relacionada

Consulte [Configuración de la puerta de enlace](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- Enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una visión general más amplia de la selección y reserva de modelos.
