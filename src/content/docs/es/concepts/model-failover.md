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
  <Step title="Construir cadena de candidatos">
    Construir la cadena de modelos candidatos a partir de la selección de modelo actual y la política de conmutación por error para esa fuente de selección. Los valores predeterminados configurados, los principales de trabajos cron y los modelos de conmutación por error seleccionados automáticamente pueden usar las conmutaciones por error configuradas; las selecciones explícitas de sesión de
    usuario son estrictas.
  </Step>
  <Step title="Probar el proveedor actual">Prueba el proveedor actual con las reglas de rotación/enfriamiento del perfil de autenticación.</Step>
  <Step title="Avanzar en errores de conmutación">Si ese proveedor se agota con un error que justifica la conmutación, pasa al siguiente modelo candidato.</Step>
  <Step title="Persistir anulación de conmutación por error">Persistir la anulación de conmutación por error seleccionada antes de que comience el reintento para que otros lectores de la sesión vean el mismo proveedor/modelo que el ejecutor está a punto de usar. La anulación del modelo persistida se marca como `modelOverrideSource: "auto"`.</Step>
  <Step title="Revertir de forma limitada en caso de error">Si el candidato de respaldo falla, revierte solo los campos de anulación de sesión propiedad del respaldo cuando aún coinciden con ese candidato fallido.</Step>
  <Step title="Lanzar FallbackSummaryError si se agota">Si todos los candidatos fallan, lanzar un `FallbackSummaryError` con detalles por intento y la caducidad de enfriamiento más próxima cuando se conozca una.</Step>
</Steps>

Esto es intencionalmente más limitado que "guardar y restaurar toda la sesión". El ejecutor de respuestas solo persiste los campos de selección de modelo que posee para el respaldo:

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Eso evita que un reintento de conmutación por error fallido sobrescriba mutaciones de sesión más nuevas y no relacionadas, como cambios manuales de `/model` o actualizaciones de rotación de sesión que ocurrieron mientras se ejecutaba el intento.

## Política de fuente de selección

OpenClaw separa el proveedor/modelo seleccionado del por qué fue seleccionado. Esa fuente controla si se permite la cadena de conmutación por error:

- **Predeterminado configurado**: `agents.defaults.model.primary` usa `agents.defaults.model.fallbacks`.
- **Principal del agente**: `agents.list[].model` es estricto a menos que ese objeto de modelo de agente incluya su propio `fallbacks`. Use `fallbacks: []` para hacer explícito el comportamiento estricto, o proporcione una lista no vacía para optar por ese agente en la conmutación por error de modelo.
- **Anulación automática de conmutación por error**: una conmutación por error en tiempo de ejecución escribe `providerOverride`, `modelOverride` y `modelOverrideSource: "auto"` antes de reintentar. Esa anulación automática puede continuar recorriendo la cadena de conmutación por error configurada y se borra mediante `/new`, `/reset` y `sessions.reset`.
- **Invalidación de sesión de usuario**: `/model`, el selector de modelo, `session_status(model=...)` y `sessions.patch` escriben `modelOverrideSource: "user"`. Esa es una selección exacta de sesión. Si el proveedor/modelo seleccionado falla antes de producir una respuesta, OpenClaw informa del fallo en lugar de responder desde una alternativa de respaldo configurada no relacionada.
- **Invalidación de sesión heredada**: las entradas de sesión antiguas pueden tener `modelOverride` sin `modelOverrideSource`. OpenClaw las trata como invalidaciones de usuario para que una selección antigua explícita no se convierta silenciosamente en un comportamiento de respaldo.
- **Modelo de carga útil de Cron**: un trabajo cron `payload.model` / `--model` es un principal del trabajo, no una invalidación de sesión de usuario. Utiliza alternativas de respaldo configuradas a menos que el trabajo proporcione `payload.fallbacks`; `payload.fallbacks: []` hace que la ejecución del cron sea estricta.

## Almacenamiento de autenticación (claves + OAuth)

OpenClaw utiliza **perfiles de autenticación** tanto para claves de API como para tokens de OAuth.

- Los secretos residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (legado: `~/.openclaw/agent/auth-profiles.json`).
- El estado de enrutamiento de autenticación en tiempo de ejecución reside en `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- Config `auth.profiles` / `auth.order` son **solo metadatos + enrutamiento** (sin secretos).
- Archivo de OAuth heredado de solo importación: `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso).

Más detalles: [OAuth](/es/concepts/oauth)

Tipos de credenciales:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para algunos proveedores)

## ID de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que puedan coexistir múltiples cuentas.

- Predeterminado: `provider:default` cuando no hay correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo `google-antigravity:user@gmail.com`).

Los perfiles residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene múltiples perfiles, OpenClaw elige un orden de la siguiente manera:

<Steps>
  <Step title="Configuración explícita">`auth.order[provider]` (si está establecido).</Step>
  <Step title="Perfiles configurados">`auth.profiles` filtrados por proveedor.</Step>
  <Step title="Perfiles almacenados">Entradas en `auth-profiles.json` para el proveedor.</Step>
</Steps>

Si no se configura ningún orden explícito, OpenClaw utiliza un orden de round-robin:

- **Clave principal:** tipo de perfil (**OAuth antes que claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (el más antiguo primero, dentro de cada tipo).
- Los **perfiles en período de enfriamiento/deshabilitados** se mueven al final, ordenados por la caducidad más cercana.

### Persistencia de sesión (amigable con el caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener los cachés del proveedor calientes. **No** rota en cada solicitud. El perfil fijado se reutiliza hasta que:

- la sesión se restablece (`/new` / `/reset`)
- se completa una compactación (el contador de compactaciones se incrementa)
- el perfil está en período de enfriamiento/deshabilitado

La selección manual a través de `/model …@<profileId>` establece una **anulación del usuario** para esa sesión y no se rota automáticamente hasta que comienza una nueva sesión.

<Note>
  Los perfiles fijados automáticamente (seleccionados por el enrutador de sesión) se tratan como una **preferencia**: se prueban primero, pero OpenClaw puede rotar a otro perfil en caso de límites de tasa/tiempos de espera. Los perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y se configuran respaldos de modelo, OpenClaw pasa al siguiente modelo en lugar de cambiar de
  perfiles.
</Note>

### Por qué OAuth puede "parecer perdido"

Si tiene tanto un perfil de OAuth como un perfil de clave de API para el mismo proveedor, el round-robin puede cambiar entre ellos a través de los mensajes a menos que estén fijados. Para forzar un solo perfil:

- Fijar con `auth.order[provider] = ["provider:profileId"]`, o
- Use una anulación por sesión a través de `/model …` con una anulación de perfil (cuando sea compatible con su superficie de interfaz de usuario/chat).

## Períodos de enfriamiento

Cuando un perfil falla debido a errores de autenticación/límite de tasa (o un tiempo de espera que parece un límite de tasa), OpenClaw lo marca en período de enfriamiento y pasa al siguiente perfil.

<AccordionGroup>
  <Accordion title="Lo que entra en el cubo de límites de tasa / tiempo de espera">
    Ese cubo de límites de tasa es más amplio que el simple `429`: también incluye mensajes del proveedor como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, y límites periódicos de ventana de uso como `weekly/monthly limit reached`.

    Los errores de formato/solicitud no válida suelen ser terminales porque reintentar la misma carga fallaría de la misma manera, por lo que OpenClaw los expone en lugar de rotar los perfiles de autenticación. Las rutas conocidas de reintento y reparación pueden optar explícitamente: por ejemplo, los fallos de validación de ID de llamada de herramienta de Cloud Code Assist se sanitizan y se reintentan una vez a través de la política `allowFormatRetry`. Los errores de motivo de detención compatibles con OpenAI como `Unhandled stop reason: error`, `stop reason: error` y `reason: error` se clasifican como señales de tiempo de espera/failover.

    El texto genérico del servidor también puede entrar en ese cubo de tiempo de espera cuando el origen coincide con un patrón transitorio conocido. Por ejemplo, el mensaje simple del contenedor de flujo de pi-ai `An unknown error occurred` se trata como digno de failover para todos los proveedores porque pi-ai lo emite cuando los flujos del proveedor terminan con `stopReason: "aborted"` o `stopReason: "error"` sin detalles específicos. Las cargas JSON `api_error` con texto transitorio del servidor como `internal server error`, `unknown error, 520`, `upstream error` o `backend error` también se tratan como tiempos de espera dignos de failover.

    El texto genérico de aguas arriba específico de OpenRouter, como el simple `Provider returned error`, se trata como un tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto de reserva interno genérico como `LLM request failed with an unknown error.` se mantiene conservador y no activa el failover por sí solo.

  </Accordion>
  <Accordion title="Límites de reintento después del SDK">
    De lo contrario, algunos SDK de proveedores podrían permanecer inactivos durante una ventana larga de `Retry-After` antes de devolver el control a OpenClaw. Para los SDK basados en Stainless, como Anthropic y OpenAI, OpenClaw limita a 60 segundos por defecto las esperas internas del SDK de `retry-after-ms` / `retry-after` y expone inmediatamente las respuestas reintentables más largas para que se pueda ejecutar esta ruta de conmutación por error. Ajuste o desactive el límite con `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`; consulte [Retry behavior](/es/concepts/retry).
  </Accordion>
  <Accordion title="Períodos de enfriamiento con alcance de modelo">
    Los períodos de enfriamiento por límite de tasa también pueden tener alcance de modelo:

    - OpenClaw registra `cooldownModel` para fallos por límite de tasa cuando se conoce el id del modelo fallido.
    - Todavía se puede intentar un modelo hermano en el mismo proveedor cuando el período de enfriamiento está limitado a un modelo diferente.
    - Las ventanas de facturación/deshabilitado aún bloquean todo el perfil entre modelos.

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

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como susceptibles de conmutación por error, pero generalmente no son transitorios. En lugar de un período de enfriamiento corto, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

<Note>
No todas las respuestas con forma de facturación son `402`, y no todos los errores HTTP `402` aterrizan aquí. OpenClaw mantiene el texto explícito de facturación en el carril de facturación incluso cuando un proveedor devuelve `401` o `403` en su lugar, pero los coincididores específicos del proveedor permanecen limitados al proveedor que los posee (por ejemplo, OpenRouter `403 Key limit exceeded`).

Mientras tanto, los errores temporales de `402` de ventana de uso y límite de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `daily limit reached, resets tomorrow`, o `organization spending limit exceeded`). Esos se mantienen en la ruta de enfriamiento/failover corta en lugar de la ruta larga de deshabilitación de facturación.

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

- El retroceso de facturación comienza en **5 horas**, se duplica por cada falla de facturación y se limita a **24 horas**.
- Los contadores de retroceso se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos por sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes del respaldo del modelo.
- Los reintentos por sobrecarga usan **0 ms de retroceso** de forma predeterminada.

## Respaldo del modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en `agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan el respaldo). Los errores del proveedor que no exponen suficientes detalles todavía se etiquetan con precisión en el estado de respaldo: `empty_response` significa que el proveedor no devolvió ningún mensaje o estado utilizable, `no_error_details` significa que el proveedor devolvió explícitamente `Unknown error (no error details in response)`, y `unclassified` significa que OpenClaw preservó la vista previa sin procesar pero ningún clasificador la ha coincidido aún.

Los errores de sobrecarga y límite de velocidad se manejan de manera más agresiva que los períodos de enfriamiento de facturación. De forma predeterminada, OpenClaw permite un reintento del perfil de autenticación del mismo proveedor y luego cambia al siguiente modelo de reserva configurado sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo de sobrecarga. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza desde el principal predeterminado configurado, un principal de trabajo programado, un principal de agente con reservas explícitas o una reserva de anulación seleccionada automáticamente, OpenClaw puede recorrer la cadena de reservas configurada coincidente. Los principales de agente sin reservas explícitas y las selecciones explícitas del usuario (por ejemplo, `/model ollama/qwen3.5:27b`, el selector de modelos, `sessions.patch` o anulaciones únicas de proveedor/modelo de CLI) son estrictos: si ese proveedor/modelo es inalcanzable o falla antes de producir una respuesta, OpenClaw informa el error en lugar de responder desde una reserva no relacionada.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente más las reservas configuradas.

<AccordionGroup>
  <Accordion title="Reglas">
    - El modelo solicitado siempre es el primero.
    - Las reservas configuradas explícitamente se deduplican pero no se filtran por la lista de permitidos del modelo. Se tratan como una intención explícita del operador.
    - Si la ejecución actual ya está en una reserva configurada en la misma familia de proveedores, OpenClaw sigue usando la cadena configurada completa.
    - Si la ejecución actual está en un proveedor diferente al de la configuración y ese modelo actual ya no es parte de la cadena de reserva configurada, OpenClaw no agrega reservas configuradas no relacionadas de otro proveedor.
    - Cuando no se proporciona una anulación de reserva explícita al ejecutor de reserva, el principal configurado se agrega al final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten los candidatos anteriores.
    - Cuando un llamador proporciona `fallbacksOverride`, el ejecutor usa exactamente el modelo solicitado más esa lista de anulación. Una lista vacía deshabilita la reserva del modelo y evita que el principal configurado se agregue como un objetivo de reintento oculto.

  </Accordion>
</AccordionGroup>

### Qué errores avanzan la reserva

<Tabs>
  <Tab title="Continúa en">
    - fallos de autenticación
    - límites de tasa y agotamiento del tiempo de espera
    - errores de sobrecarga/proveedor ocupado
    - errores de conmutación por error con forma de tiempo de espera
    - desactivaciones de facturación
    - `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que un modelo persistente obsoleto no cree un bucle de reinterno externo
    - otros errores no reconocidos cuando aún quedan candidatos

  </Tab>
  <Tab title="No continúa en">
    - cancelaciones explícitas que no tienen forma de tiempo de espera/conmutación por error
    - errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, o `ollama error: context length exceeded`)
    - un error final desconocido cuando no quedan candidatos

  </Tab>
</Tabs>

### Omisión de tiempo de espera vs comportamiento de sondeo

Cuando todos los perfiles de autenticación de un proveedor ya están en tiempo de espera, OpenClaw no omite automáticamente ese proveedor para siempre. Toma una decisión por candidato:

<AccordionGroup>
  <Accordion title="Decisiones por candidato">
    - Los fallos persistentes de autenticación omiten todo el proveedor inmediatamente.
    - Las desactivaciones de facturación generalmente se omiten, pero el candidato principal aún puede sondearse con una limitación para que la recuperación sea posible sin reiniciar.
    - El candidato principal puede sondearse cerca de la expiración del tiempo de espera, con una limitación por proveedor.
    - Los hermanos de conmutación por error del mismo proveedor pueden intentarse a pesar del tiempo de espera cuando el fallo parece transitorio (`rate_limit`, `overloaded`, o desconocido). Esto es especialmente relevante cuando un límite de tasa está limitado al modelo y un modelo hermano aún puede recuperarse inmediatamente.
    - Los sondeos de tiempo de espera transitorios se limitan a uno por proveedor por ejecución de conmutación por error para que un solo proveedor no detenga la conmutación por error entre proveedores.

  </Accordion>
</AccordionGroup>

## Sobrescrituras de sesión y cambio en vivo de modelo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`, las actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben partes de la misma entrada de sesión.

Eso significa que los reintentos de conmutación por error tienen que coordinarse con el cambio en vivo de modelo:

- Solo los cambios de modelo explícitos iniciados por el usuario marcan un cambio en vivo pendiente. Esto incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo iniciados por el sistema, como la rotación de respaldo, las anulaciones de latido o la compactación, nunca marcan por sí mismos un cambio en vivo pendiente.
- Las anulaciones de modelo iniciadas por el usuario se tratan como selecciones exactas para la política de respaldo, por lo que un proveedor seleccionado inalcanzable se manifiesta como un error en lugar de ocultarse mediante `agents.defaults.model.fallbacks`.
- Antes de que comience un reintento de respaldo, el ejecutor de respuestas conserva los campos de anulación de respaldo seleccionados en la entrada de sesión.
- Las anulaciones automáticas de respaldo permanecen seleccionadas en turnos posteriores para que OpenClaw no sondee un primario defectuoso conocido en cada mensaje. `/new`, `/reset` y `sessions.reset` borran las anulaciones de origen automático y devuelven la sesión al valor predeterminado configurado.
- `/status` muestra el modelo seleccionado y, cuando el estado de respaldo difiere, el modelo de respaldo activo y el motivo.
- La conciliación de sesiones en vivo prefiere las anulaciones de sesión persistentes sobre los campos de modelo de tiempo de ejecución obsoletos.
- Si un error de cambio en vivo apunta a un candidato posterior en la cadena de respaldo activa, OpenClaw salta directamente a ese modelo seleccionado en lugar de recorrer primero candidatos no relacionados.
- Si el intento de respaldo falla, el ejecutor revierte solo los campos de anulación que escribió, y solo si todavía coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

<Steps>
  <Step title="Falla el principal">El modelo principal seleccionado falla.</Step>
  <Step title="Respaldo elegido en memoria">Se elige el candidato de respaldo en memoria.</Step>
  <Step title="El almacén de sesión sigue indicando el principal antiguo">El almacén de sesión todavía refleja el principal antiguo.</Step>
  <Step title="La conciliación en vivo lee un estado obsoleto">La conciliación de sesiones en vivo lee el estado de sesión obsoleto.</Step>
  <Step title="Reintentos revertidos">El reintento se revierte al modelo anterior antes de que comience el intento de conmutación por error.</Step>
</Steps>

La anulación de conmutación por error persistente cierra esa ventana, y la reversión limitada mantiene los cambios manuales o de sesión en tiempo de ejecución más recientes intactos.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por intento que alimentan los registros y los mensajes de enfriamiento visibles para el usuario:

- proveedor/modelo intentado
- motivo (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y motivos similares de conmutación por error)
- estado/código opcional
- resumen de error legible por humanos

Los registros estructurados de `model_fallback_decision` también incluyen campos planos `fallbackStep*` cuando un candidato falla, se omite o una conmutación por error posterior tiene éxito. Estos campos hacen explícita la transición intentada (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) para que los exportadores de registros y diagnósticos puedan reconstruir el fallo principal incluso cuando la conmutación por error terminal también falla.

Cuando todos los candidatos fallan, OpenClaw lanza `FallbackSummaryError`. El ejecutor de respuestas externo puede usar esto para construir un mensaje más específico, como "todos los modelos están temporalmente limitados por tasa", e incluir la caducidad de enfriamiento más próxima cuando se conoce una.

Ese resumen de enfriamiento es consciente del modelo:

- se ignoran los límites de tasa con alcance de modelo no relacionados para la cadena de proveedor/modelo intentada
- si el bloqueo restante es un límite de tasa con alcance de modelo coincidente, OpenClaw informa la última caducidad coincidente que aún bloquea ese modelo

## Configuración relacionada

Consulte [Configuración de la puerta de enlace](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una visión general más amplia de la selección y la conmutación por error de modelos.
