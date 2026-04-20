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

Los períodos de enfriamiento por límite de tasa también pueden tener ámbito de modelo:

- OpenClaw registra `cooldownModel` para los fallos de límite de tasa cuando el id del
  modelo con fallos es conocido.
- Un modelo hermano en el mismo proveedor aún se puede intentar cuando el período de enfriamiento está
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

## Desactivaciones de facturación

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como susceptibles de conmutación por error (failover), pero por lo general no son transitorios. En lugar de un periodo de enfriamiento breve, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

No todas las respuestas con forma de facturación son `402`, y no todos los HTTP `402` aterrizan aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un proveedor devuelve `401` o `403` en su lugar, pero los comparadores específicos del proveedor permanecen limitados al proveedor que los posee (por ejemplo, OpenRouter `403 Key limit exceeded`). Meanwhile temporary `402` ventana de uso y los errores de límite de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando el mensaje parece reintentable (por ejemplo `weekly usage limit exhausted`, `daily limit reached, resets tomorrow`, or `organization spending limit exceeded`). Esos permanecen en la ruta de conmutación por error/enfriamiento breve en lugar de la ruta larga de deshabilitación por facturación.

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

- El retroceso de facturación comienza en **5 horas**, se duplica por cada fallo de facturación y se limita a **24 horas**.
- Los contadores de retroceso se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos sobrecargados permiten **1 rotación de perfil del mismo proveedor** antes de la reserva del modelo (model fallback).
- Los reintentos sobrecargados usan **0 ms de retroceso** de forma predeterminada.

## Reserva del modelo (Model fallback)

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en `agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan la reserva).

Los errores sobrecargados y de límite de velocidad se manejan de manera más agresiva que los períodos de enfriamiento de facturación. De forma predeterminada, OpenClaw permite un reintento de perfil de autenticación del mismo proveedor y luego cambia a la siguiente reserva de modelo configurada sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo sobrecargado. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza con una anulación de modelo (hooks o CLI), las alternativas aún terminan en
`agents.defaults.model.primary` después de intentar cualquier alternativa configurada.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente
más las alternativas configuradas.

Reglas:

- El modelo solicitado siempre es el primero.
- Las alternativas configuradas explícitamente se deduplican pero no se filtran por la lista blanca de
  modelos. Se tratan como una intención explícita del operador.
- Si la ejecución actual ya está en una alternativa configurada en la misma familia
  de proveedores, OpenClaw sigue usando la cadena configurada completa.
- Si la ejecución actual está en un proveedor diferente al de la configuración y ese modelo
  actual aún no es parte de la cadena de alternativa configurada, OpenClaw no
  añade alternativas configuradas no relacionadas de otro proveedor.
- Cuando la ejecución comenzó desde una anulación, el principal configurado se añade al
  final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten
  los candidatos anteriores.

### Qué errores avanzan la alternativa

La alternativa del modelo continúa en:

- fallos de autenticación
- límites de frecuencia y agotamiento de enfriamiento
- errores de sobrecarga/proveedor ocupado
- errores de alternativa con forma de tiempo de espera
- desactivaciones de facturación
- `LiveSessionModelSwitchError`, que se normaliza en una ruta de alternativa para que
  un modelo persistente obsoleto no cree un bucle de reinterno externo
- otros errores no reconocidos cuando aún quedan candidatos restantes

La alternativa del modelo no continúa en:

- interrupciones explícitas que no tienen forma de tiempo de espera/alternativa
- errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento
  (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`)
- un error desconocido final cuando no quedan candidatos

### Salto de enfriamiento vs comportamiento de sondeo

Cuando todos los perfiles de autenticación de un proveedor ya están en enfriamiento, OpenClaw no
salta ese proveedor para siempre automáticamente. Toma una decisión por candidato:

- Los fallos de autenticación persistentes saltan todo el proveedor inmediatamente.
- Las desactivaciones de facturación generalmente se saltan, pero el candidato principal aún puede sondearse
  con limitación para que la recuperación sea posible sin reiniciar.
- El candidato principal puede sondearse cerca de la expiración del enfriamiento, con una limitación
  por proveedor.
- Se pueden intentar hermanos de reserva del mismo proveedor a pesar del enfriamiento cuando el
  fallo parece transitorio (`rate_limit`, `overloaded`, o desconocido). Esto es
  especialmente relevante cuando un límite de tasa está limitado al modelo y un modelo hermano puede
  aún recuperarse inmediatamente.
- Los sondeos de enfriamiento transitorio se limitan a uno por proveedor por ejecución de reserva para que
  un solo proveedor no detenga la reserva entre proveedores.

## Sobrescrituras de sesión y cambio en vivo de modelo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, comando `/model`,
actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben
partes de la misma entrada de sesión.

Esto significa que los reintentos de reserva deben coordinarse con el cambio en vivo de modelo:

- Solo los cambios de modelo explícitos impulsados por el usuario marcan un cambio en vivo pendiente. Eso
  incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo impulsados por el sistema, como la rotación de reserva, las sobrescrituras de latido,
  o la compactación nunca marcan un cambio en vivo pendiente por sí mismos.
- Antes de que comience un reintento de reserva, el ejecutor de respuesta persiste los campos
  de sobrescritura de reserva seleccionados en la entrada de sesión.
- La conciliación de sesión en vivo prefiere las sobrescrituras de sesión persistentes sobre los campos
  de modelo de ejecución obsoletos.
- Si el intento de reserva falla, el ejecutor revierte solo los campos de sobrescritura
  que escribió, y solo si aún coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

1. El principal falla.
2. El candidato de reserva se elige en memoria.
3. El almacenamiento de sesión sigue indicando el principal anterior.
4. La conciliación de sesión en vivo lee el estado de sesión obsoleto.
5. El reintento se regresa al modelo anterior antes de que comience el intento
   de reserva.

La sobrescritura de reserva persistente cierra esa ventana, y la reversión limitada
mantiene intactos los cambios de sesión manuales más nuevos o de ejecución.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por intento que alimentan los registros y
mensajes de enfriamiento visibles para el usuario:

- proveedor/modelo intentado
- razón (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, y
  razones de conmutación por error similares)
- estado/código opcional
- resumen de errores legible por humanos

Cuando fallan todos los candidatos, OpenClaw lanza `FallbackSummaryError`. El ejecutor
externo de respuestas puede usarlo para construir un mensaje más específico, como "todos los modelos
están temporalmente limitados por tasa" e incluir la expiración del período de enfriamiento más próxima cuando se
conozca una.

Ese resumen del período de enfriamiento es consciente del modelo:

- se ignoran los límites de tasa no relacionados con el ámbito del modelo para la cadena
  proveedor/modelo intentada
- si el bloqueo restante es un límite de tasa coincidente con el ámbito del modelo, OpenClaw
  informa la última expiración coincidente que aún bloquee ese modelo

## Configuración relacionada

Consulte [Configuración de Gateway](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una descripción general más amplia de la selección y reserva de modelos.
