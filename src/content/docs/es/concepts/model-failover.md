---
summary: "Cómo OpenClaw rota los perfiles de autenticación y cambia a modelos alternativos"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Conmutación por error de modelo"
sidebarTitle: "Conmutación por error de modelo"
---

OpenClaw gestiona los fallos en dos etapas:

1. **Rotación de perfiles de autenticación** dentro del proveedor actual.
2. **Respaldo de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Este documento explica las reglas de tiempo de ejecución y los datos que las respaldan.

## Flujo de ejecución

Para una ejecución de texto normal, OpenClaw evalúa los candidatos en este orden:

<Steps>
  <Step title="Resolver estado de sesión">Resuelve el modelo de sesión activo y la preferencia de perfil de autenticación.</Step>
  <Step title="Construir cadena de candidatos">Construye la cadena de modelos candidatos a partir del modelo de sesión seleccionado actualmente, luego `agents.defaults.model.fallbacks` en orden, terminando con el principal configurado cuando la ejecución comenzó desde una anulación.</Step>
  <Step title="Probar el proveedor actual">Prueba el proveedor actual con las reglas de rotación/enfriamiento del perfil de autenticación.</Step>
  <Step title="Avanzar en errores de conmutación">Si ese proveedor se agota con un error que justifica la conmutación, pasa al siguiente modelo candidato.</Step>
  <Step title="Persistir anulación de respaldo">Persiste la anulación de respaldo seleccionada antes de que comience el reintento para que otros lectores de la sesión vean el mismo proveedor/modelo que el ejecutor está a punto de usar. La anulación del modelo persistida se marca como `modelOverrideSource: "auto"`.</Step>
  <Step title="Revertir de forma limitada en caso de error">Si el candidato de respaldo falla, revierte solo los campos de anulación de sesión propiedad del respaldo cuando aún coinciden con ese candidato fallido.</Step>
  <Step title="Lanzar FallbackSummaryError si se agota">Si todos los candidatos fallan, lanza un `FallbackSummaryError` con el detalle de cada intento y la caducidad de enfriamiento más próxima cuando se conoce una.</Step>
</Steps>

Esto es intencionalmente más limitado que "guardar y restaurar toda la sesión". El ejecutor de respuestas solo persiste los campos de selección de modelo que posee para el respaldo:

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Eso evita que un reintento de reserva fallido sobrescriba mutaciones de sesión más recientes y no relacionadas, como cambios manuales de `/model` o actualizaciones de rotación de sesión que ocurrieron mientras se ejecutaba el intento.

## Almacenamiento de autenticación (claves + OAuth)

OpenClaw utiliza **perfiles de autenticación** tanto para claves de API como para tokens de OAuth.

- Los secretos residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (legado: `~/.openclaw/agent/auth-profiles.json`).
- El estado de enrutamiento de autenticación en tiempo de ejecución reside en `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La configuración `auth.profiles` / `auth.order` es **solo metadatos + enrutamiento** (sin secretos).
- Archivo OAuth de solo importación heredado: `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso).

Más detalles: [OAuth](/es/concepts/oauth)

Tipos de credenciales:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para algunos proveedores)

## Identificadores de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que puedan coexistir múltiples cuentas.

- Predeterminado: `provider:default` cuando no hay ningún correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo `google-antigravity:user@gmail.com`).

Los perfiles residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene múltiples perfiles, OpenClaw elige un orden de la siguiente manera:

<Steps>
  <Step title="Configuración explícita">`auth.order[provider]` (si está configurado).</Step>
  <Step title="Perfiles configurados">`auth.profiles` filtrados por proveedor.</Step>
  <Step title="Perfiles almacenados">Entradas en `auth-profiles.json` para el proveedor.</Step>
</Steps>

Si no se configura un orden explícito, OpenClaw utiliza un orden round‑robin:

- **Clave primaria:** tipo de perfil (**OAuth antes que las claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (el más antiguo primero, dentro de cada tipo).
- Los **perfiles en período de espera/deshabilitados** se mueven al final, ordenados por la expiración más próxima.

### Adherencia de sesión (amigable con el caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener las cachés del proveedor calientes. **No** rota en cada solicitud. El perfil fijado se reutiliza hasta que:

- la sesión se restablece (`/new` / `/reset`)
- se completa una compactación (el contador de compactación se incrementa)
- el perfil está en modo de enfriamiento/deshabilitado

La selección manual mediante `/model …@<profileId>` establece una **anulación del usuario** para esa sesión y no se rota automáticamente hasta que comience una nueva sesión.

<Note>
  Los perfiles fijados automáticamente (seleccionados por el enrutador de sesión) se tratan como una **preferencia**: se intentan primero, pero OpenClaw puede rotar a otro perfil debido a límites de velocidad/tiempos de espera. Los perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y se configuran modelos de reserva, OpenClaw pasa al siguiente modelo en lugar de cambiar
  de perfil.
</Note>

### Por qué OAuth puede "parecer perdido"

Si tiene tanto un perfil de OAuth como un perfil de clave de API para el mismo proveedor, el round-robin puede cambiar entre ellos en los mensajes a menos que se fijen. Para forzar un solo perfil:

- Fijar con `auth.order[provider] = ["provider:profileId"]`, o
- Utilizar una anulación por sesión mediante `/model …` con una anulación de perfil (cuando su interfaz de usuario/superficie de chat lo admita).

## Períodos de enfriamiento

Cuando un perfil falla debido a errores de autenticación/límites de velocidad (o un tiempo de espera que parece un límite de velocidad), OpenClaw lo marca en modo de enfriamiento y pasa al siguiente perfil.

<AccordionGroup>
  <Accordion title="Lo que entra en el cubo de límite de tasa / tiempo de espera">
    Ese cubo de límite de tasa es más amplio que el simple `429`: también incluye mensajes del proveedor como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted` y límites periódicos de la ventana de uso como `weekly/monthly limit reached`.

    Los errores de formato/solicitud no válida (por ejemplo, fallos de validación del ID de llamada de herramienta de Cloud Code Assist) se tratan como susceptibles de conmutación por error y usan los mismos períodos de enfriamiento. Los errores de motivo de detención compatibles con OpenAI, como `Unhandled stop reason: error`, `stop reason: error` y `reason: error`, se clasifican como señales de tiempo de espera/conmutación por error.

    El texto genérico del servidor también puede caer en ese cubo de tiempo de espera cuando el origen coincide con un patrón transitorio conocido. Por ejemplo, el mensaje simple de contenedor de flujo de pi-ai `An unknown error occurred` se trata como susceptible de conmutación por error para cada proveedor porque pi-ai lo emite cuando los flujos del proveedor terminan con `stopReason: "aborted"` o `stopReason: "error"` sin detalles específicos. Las cargas útiles JSON `api_error` con texto de servidor transitorio como `internal server error`, `unknown error, 520`, `upstream error` o `backend error` también se tratan como tiempos de espera susceptibles de conmutación por error.

    El texto genérico ascendente específico de OpenRouter, como el simple `Provider returned error`, se trata como un tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto genérico de conmutación por error interno, como `LLM request failed with an unknown error.`, se mantiene conservador y no activa la conmutación por error por sí solo.

  </Accordion>
  <Accordion title="Límites de reintento posterior del SDK">
    Algunos SDK de proveedores podrían permanecer inactivos durante una ventana `Retry-After` larga antes de devolver el control a OpenClaw. Para los SDK basados en Stainless, como Anthropic y OpenAI, OpenClaw limita las esperas internas del SDK de `retry-after-ms` / `retry-after` a 60 segundos de forma predeterminada y expone inmediatamente las respuestas reintentables más largas para que se pueda ejecutar esta ruta de conmutación por error. Ajuste o desactive el límite con `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`; consulte [Comportamiento de reintento](/es/concepts/retry).
  </Accordion>
  <Accordion title="Períodos de enfriamiento con alcance de modelo">
    Los períodos de enfriamiento por límite de tasa también pueden tener alcance de modelo:

    - OpenClaw registra `cooldownModel` para los fallos de límite de tasa cuando se conoce el id del modelo fallido.
    - Todavía se puede intentar un modelo hermano en el mismo proveedor cuando el período de enfriamiento tiene alcance en un modelo diferente.
    - Las ventanas de facturación/deshabilitadas siguen bloqueando todo el perfil entre modelos.

  </Accordion>
</AccordionGroup>

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

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como susceptibles de conmutación por error, pero generalmente no son transitorios. En lugar de un período de enfriamiento corto, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota hacia el siguiente perfil/proveedor.

<Note>
No todas las respuestas con forma de facturación son `402`, y no todos los HTTP `402` aterrizan aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un proveedor devuelve `401` o `403` en su lugar, pero los comparadores específicos del proveedor permanecen limitados al proveedor que los posee (por ejemplo, OpenRouter `403 Key limit exceeded`).

Mientras tanto, los errores temporales de ventana de uso `402` y límite de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` o `organization spending limit exceeded`). Esos permanecen en la ruta de enfriamiento corto/failover en lugar de la ruta larga de deshabilitación de facturación.

</Note>

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

- La retirada de facturación comienza en **5 horas**, se duplica por cada fallo de facturación y tiene un límite de **24 horas**.
- Los contadores de retirada se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos por sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes de la reserva del modelo.
- Los reintentos por sobrecarga usan **0 ms de retirada** de forma predeterminada.

## Reserva del modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en `agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan la reserva). Los errores del proveedor que no exponen suficiente detalle todavía se etiquetan con precisión en el estado de reserva: `empty_response` significa que el proveedor no devolvió ningún mensaje o estado utilizable, `no_error_details` significa que el proveedor devolvió explícitamente `Unknown error (no error details in response)`, y `unclassified` significa que OpenClaw conservó la vista previa sin procesar pero ningún clasificador la ha emparejado aún.

Los errores de sobrecarga y límite de tasa se manejan de manera más agresiva que los períodos de espera de facturación. De forma predeterminada, OpenClaw permite un reintento del perfil de autenticación del mismo proveedor y luego cambia al siguiente respaldo de modelo configurado sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo de sobrecarga. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza con una anulación de modelo (ganchos o CLI), las conmutaciones por error aún terminan en `agents.defaults.model.primary` después de intentar cualquier respaldo configurado.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente más los respaldos configurados.

<AccordionGroup>
  <Accordion title="Reglas">
    - El modelo solicitado siempre es el primero. - Los respaldos configurados explícitamente se deduplican pero no se filtran por la lista blanca de modelos. Se tratan como una intención explícita del operador. - Si la ejecución actual ya está en un respaldo configurado en la misma familia de proveedores, OpenClaw sigue utilizando la cadena configurada completa. - Si la ejecución actual está en
    un proveedor diferente al de la configuración y ese modelo actual aún no forma parte de la cadena de respaldo configurada, OpenClaw no agrega respaldos configurados no relacionados de otro proveedor. - Cuando la ejecución se inició desde una anulación, el principal configurado se agrega al final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten los candidatos
    anteriores.
  </Accordion>
</AccordionGroup>

### Qué errores avanzan la conmutación por error

<Tabs>
  <Tab title="Continúa en">
    - fallos de autenticación - límites de tasa y agotamiento de períodos de espera - errores de sobrecarga/proveedor ocupado - errores de conmutación por error con forma de tiempo de espera - desactivaciones de facturación - `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que un modelo persistido obsoleto no cree un bucle de reintento externo - otros
    errores no reconocidos cuando todavía hay candidatos restantes
  </Tab>
  <Tab title="No continúa en">
    - interrupciones explícitas que no tienen forma de tiempo de espera/failover - errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, o `ollama
    error: context length exceeded`) - un error final desconocido cuando no quedan candidatos
  </Tab>
</Tabs>

### Omisión de período de enfriamiento frente al comportamiento de sondeo

Cuando todos los perfiles de autenticación de un proveedor ya están en período de enfriamiento, OpenClaw no omite automáticamente ese proveedor para siempre. Toma una decisión por candidato:

<AccordionGroup>
  <Accordion title="Decisiones por candidato">
    - Los fallos de autenticación persistentes omiten todo el proveedor inmediatamente. - Las desactivaciones de facturación generalmente se omiten, pero el candidato principal aún se puede sondear en una limitación para que la recuperación sea posible sin reiniciar. - El candidato principal puede sondearse cerca de la expiración del período de enfriamiento, con una limitación por proveedor. - Se
    pueden intentar alternos de conmutación por error del mismo proveedor a pesar del período de enfriamiento cuando el fallo parece transitorio (`rate_limit`, `overloaded`, o desconocido). Esto es especialmente relevante cuando un límite de velocidad está limitado al modelo y un modelo alterno aún puede recuperarse inmediatamente. - Los sondeos de período de enfriamiento transitorios se limitan a
    uno por proveedor por ejecución de conmutación por error para que un solo proveedor no detenga la conmutación por error entre proveedores.
  </Accordion>
</AccordionGroup>

## Sobrescrituras de sesión y cambio de modelo en vivo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`, las actualizaciones de compactación/sesión y la conciliación de sesiones en vivo todos leen o escriben partes de la misma entrada de sesión.

Eso significa que los reintentos de conmutación por error deben coordinarse con el cambio de modelo en vivo:

- Solo los cambios de modelo explícitos impulsados por el usuario marcan un cambio en vivo pendiente. Esto incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo impulsados por el sistema, como la rotación por conmutación por error, las sobrescrituras de latido o la compactación, nunca marcan un cambio en vivo pendiente por sí mismos.
- Antes de que comience un reintento de conmutación por error, el ejecutor de respuestas persiste los campos de sobrescritura de conmutación por_error seleccionados en la entrada de sesión.
- Las anulaciones de reserva automática permanecen seleccionadas en los turnos subsiguientes para que OpenClaw no sondee un primario defectuoso conocido en cada mensaje. `/new`, `/reset` y `sessions.reset` borran las anulaciones originadas automáticamente y devuelven la sesión al valor predeterminado configurado.
- `/status` muestra el modelo seleccionado y, cuando el estado de reserva es diferente, el modelo de reserva activo y el motivo.
- La conciliación de sesión en vivo prefiere las anulaciones de sesión persistidas sobre los campos obsoletos del modelo en tiempo de ejecución.
- Si un error de conmutación en vivo señala a un candidato posterior en la cadena de reserva activa, OpenClaw salta directamente a ese modelo seleccionado en lugar de examinar primero candidatos no relacionados.
- Si el intento de reserva falla, el ejecutor revierte solo los campos de anulación que escribió, y solo si todavía coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

<Steps>
  <Step title="Fallo del primario">El modelo primario seleccionado falla.</Step>
  <Step title="Reserva elegida en memoria">Se elige el candidato de reserva en memoria.</Step>
  <Step title="El almacenamiento de sesión aún indica el primario antiguo">El almacenamiento de sesión todavía refleja el primario antiguo.</Step>
  <Step title="La conciliación en vivo lee el estado obsoleto">La conciliación de sesión en vivo lee el estado obsoleto de la sesión.</Step>
  <Step title="Reintento revertido">El reintento se revierte al modelo antiguo antes de que comience el intento de reserva.</Step>
</Steps>

La anulación de reserva persistida cierra esa ventana, y la reversión limitada mantiene intactos los cambios de sesión manuales o en tiempo de ejecución más recientes.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por intento que alimentan los registros y los mensajes de tiempo de espera visibles para el usuario:

- proveedor/modelo intentado
- motivo (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y motivos de reserva similares)
- estado/código opcional
- resumen del error legible por humanos

Los registros estructurados `model_fallback_decision` también incluyen campos planos `fallbackStep*` cuando un candidato falla, se omite o una reserva posterior tiene éxito. Estos campos hacen explícita la transición intentada (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) para que los exportadores de registros y diagnósticos puedan reconstruir el fallo principal incluso cuando la reserva terminal también falla.

Cuando todos los candidatos fallan, OpenClaw lanza `FallbackSummaryError`. El ejecutor de respuestas externo puede utilizarlo para construir un mensaje más específico, como "todos los modelos están temporalmente limitados por velocidad" e incluir la expiración de enfriamiento más próxima cuando se conozca una.

Ese resumen de enfriamiento es consciente del modelo:

- se ignoran los límites de velocidad de ámbito de modelo no relacionados para la cadena de proveedor/modelo intentada
- si el bloqueo restante es un límite de velocidad de ámbito de modelo coincidente, OpenClaw informa la última expiración coincidente que aún bloquea ese modelo

## Configuración relacionada

Consulte la [Configuración de la puerta de enlace](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una descripción general más amplia de la selección y reserva de modelos.
