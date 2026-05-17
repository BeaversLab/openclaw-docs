---
summary: "Cómo OpenClaw rota los perfiles de autenticación y cambia a otros modelos"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Conmutación por error de modelo"
sidebarTitle: "Conmutación por error de modelo"
---

OpenClaw gestiona los fallos en dos etapas:

1. **Rotación de perfiles de autenticación** dentro del proveedor actual.
2. **Cambio a otro modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Este documento explica las reglas de tiempo de ejecución y los datos que las respaldan.

## Flujo de ejecución

Para una ejecución de texto normal, OpenClaw evalúa los candidatos en este orden:

<Steps>
  <Step title="Resolver estado de sesión">Resolver el modelo de sesión activo y la preferencia de perfil de autenticación.</Step>
  <Step title="Construir cadena de candidatos">
    Construir la cadena de candidatos de modelos a partir de la selección de modelo actual y la política de conmutación por error para esa fuente de selección. Los valores predeterminados configurados, los principales de trabajos cron y los modelos de conmutación por error seleccionados automáticamente pueden usar conmutaciones por error configuradas; las selecciones explícitas de sesión de
    usuario son estrictas.
  </Step>
  <Step title="Probar el proveedor actual">Probar el proveedor actual con las reglas de rotación/período de enfriamiento del perfil de autenticación.</Step>
  <Step title="Avanzar ante errores de conmutación por error">Si ese proveedor se agota con un error que justifica la conmutación por error, pasar al siguiente candidato de modelo.</Step>
  <Step title="Persistir anulación de conmutación por error">Persistir la anulación de conmutación por error seleccionada antes de que comience el reintento para que otros lectores de la sesión vean el mismo proveedor/modelo que el ejecutor está a punto de usar. La anulación del modelo persistente se marca como `modelOverrideSource: "auto"`.</Step>
  <Step title="Revertir de forma limitada en caso de error">Si el candidato de conmutación por error falla, revertir solo los campos de anulación de sesión propiedad de la conmutación por error cuando todavía coincidan con ese candidato fallido.</Step>
  <Step title="Lanzar FallbackSummaryError si se agota">Si todos los candidatos fallan, lanzar un `FallbackSummaryError` con detalles por intento y la caducidad del período de enfriamiento más próxima cuando se conozca una.</Step>
</Steps>

Esto es intencionalmente más limitado que "guardar y restaurar toda la sesión". El ejecutor de respuestas solo persiste los campos de selección de modelo que posee para el respaldo:

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Eso evita que un reintento de reserva fallido sobrescriba mutaciones de sesión más nuevas no relacionadas, como cambios manuales de `/model` o actualizaciones de rotación de sesión que ocurrieron mientras se ejecutaba el intento.

## Política de fuente de selección

OpenClaw separa el proveedor/modelo seleccionado del por qué fue seleccionado. Esa fuente controla si se permite la cadena de conmutación por error:

- **Predeterminado configurado**: `agents.defaults.model.primary` usa `agents.defaults.model.fallbacks`.
- **Principal del agente**: `agents.list[].model` es estricto a menos que ese objeto de modelo de agente incluya su propio `fallbacks`. Use `fallbacks: []` para hacer explícito el comportamiento estricto, o proporcione una lista no vacía para optar por que ese agente participe en la reserva del modelo.
- **Anulación de reserva automática**: una reserva en tiempo de ejecución escribe `providerOverride`, `modelOverride`, `modelOverrideSource: "auto"` y el modelo de origen seleccionado antes de reintentar. Esa anulación automática puede seguir recorriendo la cadena de reserva configurada y se borra mediante `/new`, `/reset` y `sessions.reset`. Las ejecuciones de Heartbeat sin un `heartbeat.model` explícito también borran una anulación automática directa cuando su origen ya no coincide con el predeterminado configurado actual.
- **Anulación de sesión de usuario**: `/model`, el selector de modelo, `session_status(model=...)` y `sessions.patch` escriben `modelOverrideSource: "user"`. Esa es una selección exacta de sesión. Si el proveedor/modelo seleccionado falla antes de producir una respuesta, OpenClaw informa del error en lugar de responder desde una reserva configurada no relacionada.
- **Anulación de sesión heredada**: las entradas de sesión más antiguas pueden tener `modelOverride` sin `modelOverrideSource`. OpenClaw las trata como anulaciones de usuario para que una selección antigua explícita no se convierta silenciosamente en comportamiento de reserva.
- **Modelo de carga de Cron**: un trabajo cron `payload.model` / `--model` es un principal del trabajo, no una anulación de sesión de usuario. Usa las reservas configuradas a menos que el trabajo proporcione `payload.fallbacks`; `payload.fallbacks: []` hace que la ejecución del cron sea estricta.

## Almacenamiento de autenticación (claves + OAuth)

OpenClaw utiliza **perfiles de autenticación** tanto para claves de API como para tokens de OAuth.

- Los secretos residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (heredado: `~/.openclaw/agent/auth-profiles.json`).
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

Los perfiles viven en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene múltiples perfiles, OpenClaw elige un orden de la siguiente manera:

<Steps>
  <Step title="Configuración explícita">`auth.order[provider]` (si está configurado).</Step>
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
  Los perfiles fijados automáticamente (seleccionados por el enrutador de sesión) se tratan como una **preferencia**: se prueban primero, pero OpenClaw puede rotar a otro perfil en límites de tasa/tiempos de espera. Cuando el perfil original vuelve a estar disponible, las nuevas ejecuciones pueden preferirlo nuevamente sin cambiar el modelo o el tiempo de ejecución seleccionados. Los perfiles
  fijados por el usuario permanecen bloqueados en ese perfil; si falla y se configuran reservas de modelo, OpenClaw pasa al siguiente modelo en lugar de cambiar de perfil.
</Note>

### Suscripción de OpenAI Codex más copia de seguridad de clave de API

Para los modelos de agente de OpenAI, la autenticación y el tiempo de ejecución son independientes. `openai/gpt-*` permanece en
el arnés de Codex mientras que la autenticación puede rotar entre un perfil de suscripción a Codex y
una copia de seguridad de clave API de OpenAI.

Use `auth.order.openai` para el orden orientado al usuario:

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Los perfiles de suscripción a Codex existentes todavía pueden usar el id. de perfil
`openai-codex:*` heredado. La copia de seguridad de clave API ordenada puede ser un perfil
de clave API `openai:*` normal. Cuando la suscripción alcanza un límite de uso de Codex,
OpenClaw registra la hora exacta de restablecimiento cuando Codex proporciona una, intenta el siguiente
perfil de autenticación ordenado y mantiene la ejecución dentro del arnés de Codex. Una vez que pasa la hora
de restablecimiento, el perfil de suscripción vuelve a ser elegible y la siguiente selección
automática puede volver a él.

Use un perfil anclado por el usuario solo cuando desee forzar una cuenta/clave para esa
sesión. Los perfiles anclados por el usuario son intencionalmente estrictos y no saltan
silenciosamente a otro perfil.

## Períodos de enfriamiento

Cuando un perfil falla debido a errores de autenticación/límite de velocidad (o un tiempo de espera que parece limitación de velocidad), OpenClaw lo marca en período de enfriamiento y pasa al siguiente perfil.

<AccordionGroup>
  <Accordion title="Lo que se incluye en el depósito de límites de velocidad / tiempo de espera">
    Ese depósito de límites de velocidad es más amplio que el simple `429`: también incluye mensajes del proveedor como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted` y límites periódicos de ventana de uso como `weekly/monthly limit reached`.

    Los errores de formato/solicitud no válida suelen ser terminales porque reintentar la misma carga fallaría de la misma manera, por lo que OpenClaw los muestra en lugar de rotar los perfiles de autenticación. Las rutas conocidas de reparación por reintento pueden participar explícitamente: por ejemplo, los errores de validación del ID de llamada a herramienta de Cloud Code Assist se sanean y se reintentan una vez a través de la política `allowFormatRetry`. Los errores de motivo de detención compatibles con OpenAI, como `Unhandled stop reason: error`, `stop reason: error` y `reason: error`, se clasifican como señales de tiempo de espera/failover.

    El texto genérico del servidor también puede caer en ese depósito de tiempo de espera cuando el origen coincide con un patrón transitorio conocido. Por ejemplo, el mensaje simple de envoltura de flujo pi-ai `An unknown error occurred` se trata como digno de failover para todos los proveedores porque pi-ai lo emite cuando los flujos del proveedor terminan con `stopReason: "aborted"` o `stopReason: "error"` sin detalles específicos. Las cargas JSON `api_error` con texto de servidor transitorio como `internal server error`, `unknown error, 520`, `upstream error` o `backend error` también se tratan como tiempos de espera dignos de failover.

    El texto genérico ascendente específico de OpenRouter, como el simple `Provider returned error`, se trata como tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto genérico de respaldo interno, como `LLM request failed with an unknown error.`, se mantiene conservador y no activa el failover por sí solo.

  </Accordion>
  <Accordion title="Límites de reintento posterior del SDK">
    Algunos SDK de proveedores pueden permanecer inactivos durante una ventana `Retry-After` prolongada antes de devolver el control a OpenClaw. Para los SDK basados en Stainless, como Anthropic y OpenAI, OpenClaw limita las esperas `retry-after-ms` / `retry-after` internas del SDK a 60 segundos de forma predeterminada y muestra las respuestas reintentables más largas de inmediato para que se pueda ejecutar esta ruta de conmutación por error. Ajuste o desactive el límite con `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`; consulte [Comportamiento de reintento](/es/concepts/retry).
  </Accordion>
  <Accordion title="Períodos de inactividad con ámbito de modelo">
    Los períodos de inactividad por límite de velocidad también pueden tener ámbito de modelo:

    - OpenClaw registra `cooldownModel` para los fallos de límite de velocidad cuando se conoce el id del modelo que falló.
    - Todavía se puede intentar un modelo hermano en el mismo proveedor cuando el período de inactividad está limitado a un modelo diferente.
    - Las ventanas de facturación/deshabilitadas siguen bloqueando todo el perfil entre modelos.

  </Accordion>
</AccordionGroup>

Los períodos de inactividad utilizan retroceso exponencial:

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

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como aptos para conmutación por error, pero por lo general no son transitorios. En lugar de un breve período de inactividad, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

<Note>
No todas las respuestas con forma de facturación son `402`, y no todos los errores HTTP `402` terminan aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un proveedor devuelve `401` o `403` en su lugar, pero los comparadores específicos del proveedor permanecen limitados al proveedor que los posee (por ejemplo, OpenRouter `403 Key limit exceeded`).

Mientras tanto, los errores temporales de ventana de uso de `402` y límites de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` o `organization spending limit exceeded`). Esos errores permanecen en la ruta de enfriamiento/cambio de modelo breve en lugar de la ruta larga de desactivación por facturación.

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

- El retroceso de facturación comienza en **5 horas**, se duplica por cada fallo de facturación y tiene un máximo de **24 horas**.
- Los contadores de retroceso se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos por sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes del cambio de modelo.
- Los reintentos por sobrecarga usan **0 ms de retroceso** de forma predeterminada.

## Cambio de modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en `agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan el cambio de modelo). Los errores del proveedor que no exponen suficientes detalles aún se etiquetan con precisión en el estado de cambio de modelo: `empty_response` significa que el proveedor no devolvió ningún mensaje o estado utilizable, `no_error_details` significa que el proveedor devolvió explícitamente `Unknown error (no error details in response)` y `unclassified` significa que OpenClaw conservó la vista previa sin procesar pero ningún clasificador la ha coincidido aún.

Los errores de sobrecarga y límite de velocidad se manejan de manera más agresiva que los períodos de enfriamiento de facturación. De manera predeterminada, OpenClaw permite un reintento del perfil de autenticación del mismo proveedor y luego cambia al modelo de respaldo configurado siguiente sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo de sobrecarga. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza desde el principal predeterminado configurado, un principal de trabajo cron, un principal de agente con respaldos explícitos o una anulación de respaldo seleccionada automáticamente, OpenClaw puede recorrer la cadena de respaldo configurada coincidente. Los principales de agente sin respaldos explícitos y las selecciones explícitas del usuario (por ejemplo `/model ollama/qwen3.5:27b`, el selector de modelo, `sessions.patch`, o anulaciones de proveedor/modelo de CLI únicas) son estrictas: si ese proveedor/modelo es inalcanzable o falla antes de producir una respuesta, OpenClaw informa el fallo en lugar de responder desde un respaldo no relacionado.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente más los respaldos configurados.

<AccordionGroup>
  <Accordion title="Reglas">
    - El modelo solicitado siempre es el primero.
    - Los respaldos configurados explícitos se deduplican pero no se filtran por la lista de permitidos del modelo. Se tratan como una intención explícita del operador.
    - Si la ejecución actual ya está en un respaldo configurado en la misma familia de proveedores, OpenClaw sigue utilizando la cadena configurada completa.
    - Cuando no se proporciona una anulación de respaldo explícita, se intentan los respaldos configurados antes que el principal configurado, incluso si el modelo solicitado utiliza un proveedor diferente.
    - Cuando no se proporciona una anulación de respaldo explícita al ejecutor de respaldo, el principal configurado se agrega al final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten los candidatos anteriores.
    - Cuando un llamador proporciona `fallbacksOverride`, el ejecutor usa exactamente el modelo solicitado más esa lista de anulación. Una lista vacía deshabilita el respaldo del modelo y evita que el principal configurado se agregue como un objetivo de reintento oculto.

  </Accordion>
</AccordionGroup>

### Qué errores avanzan el respaldo

<Tabs>
  <Tab title="Continues on">
    - fallos de autenticación
    - límites de tasa y agotamiento del tiempo de espera
    - errores de sobrecarga/proveedor ocupado
    - errores de conmutación por error con forma de tiempo de espera agotado
    - deshabilitaciones de facturación
    - `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que un modelo persistente obsoleto no cree un bucle de reinterno externo
    - otros errores no reconocidos cuando aún quedan candidatos

  </Tab>
  <Tab title="Does not continue on">
    - interrupciones explícitas que no tienen forma de tiempo de espera agotado o conmutación por error
    - errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, o `ollama error: context length exceeded`)
    - un error final desconocido cuando no quedan candidatos

  </Tab>
</Tabs>

### Omisión de tiempo de espera frente al comportamiento de sondeo

Cuando todos los perfiles de autenticación de un proveedor ya están en tiempo de espera, OpenClaw no omite automáticamente ese proveedor para siempre. Toma una decisión por candidato:

<AccordionGroup>
  <Accordion title="Per-candidate decisions">
    - Los fallos de autenticación persistentes omiten todo el proveedor inmediatamente.
    - Las deshabilitaciones de facturación generalmente se omiten, pero el candidato principal aún se puede sondear en una limitación para que la recuperación sea posible sin reiniciar.
    - El candidato principal se puede sondear cerca de la expiración del tiempo de espera, con una limitación por proveedor.
    - Se pueden intentar hermanos de conmutación por error del mismo proveedor a pesar del tiempo de espera cuando el fallo parece transitorio (`rate_limit`, `overloaded`, o desconocido). Esto es especialmente relevante cuando un límite de tasa está limitado al modelo y un modelo hermano aún puede recuperarse inmediatamente.
    - Los sondeos de tiempo de espera transitorios se limitan a uno por proveedor por ejecución de conmutación por error para que un solo proveedor no detenga la conmutación por error entre proveedores.

  </Accordion>
</AccordionGroup>

## Sobrescrituras de sesión y cambio de modelo en vivo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`, las actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben partes de la misma entrada de sesión.

Eso significa que los reintentos de conmutación por error deben coordinarse con el cambio de modelo en vivo:

- Solo los cambios de modelo explícitos impulsados por el usuario marcan un cambio en vivo pendiente. Esto incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo impulsados por el sistema, como la rotación por recuperación, las anulaciones de latido o la compactación, nunca marcan por sí solos un cambio en vivo pendiente.
- Las anulaciones de modelo impulsadas por el usuario se tratan como selecciones exactas para la política de recuperación, por lo que un proveedor seleccionado inalcanzable se manifiesta como un error en lugar de ocultarse mediante `agents.defaults.model.fallbacks`.
- Antes de que comience un reintento de recuperación, el ejecutor de respuestas persiste los campos de anulación de recuperación seleccionados en la entrada de la sesión.
- Las anulaciones automáticas de recuperación permanecen seleccionadas en turnos posteriores para que OpenClaw no sondee un primario defectuoso conocido en cada mensaje. `/new`, `/reset` y `sessions.reset` borran las anulaciones de origen automático y devuelven la sesión al valor predeterminado configurado.
- `/status` muestra el modelo seleccionado y, cuando el estado de recuperación difiere, el modelo de recuperación activo y el motivo.
- La conciliación de sesión en vivo prefiere las anulaciones de sesión persistidas sobre los campos de modelo de tiempo de ejecución obsoletos.
- Si un error de cambio en vivo apunta a un candidato posterior en la cadena de recuperación activa, OpenClaw salta directamente a ese modelo seleccionado en lugar de recorrer primero candidatos no relacionados.
- Si el intento de recuperación falla, el ejecutor revierte solo los campos de anulación que escribió, y solo si todavía coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

<Steps>
  <Step title="Fallo del primario">El modelo primario seleccionado falla.</Step>
  <Step title="Recovery elegido en memoria">El candidato de recuperación se elige en memoria.</Step>
  <Step title="El almacén de sesión sigue indicando el primario anterior">El almacén de sesión todavía refleja el primario anterior.</Step>
  <Step title="La conciliación en vivo lee el estado obsoleto">La conciliación de sesión en vivo lee el estado obsoleto de la sesión.</Step>
  <Step title="Reintentoo restaurado al anterior">El reintento se restaura al modelo anterior antes de que comience el intento de conmutación por error.</Step>
</Steps>

La invalidación de la conmutación por error persistida cierra esa ventana, y la reversión limitada mantiene intactos los cambios manuales o de sesión en tiempo de ejecución más recientes.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por intento que alimentan los registros y los mensajes de enfriamiento visibles para el usuario:

- proveedor/modelo intentado
- motivo (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y motivos de conmutación por error similares)
- estado/código opcional
- resumen del error legible por humanos

Los registros estructurados `model_fallback_decision` también incluyen campos planos `fallbackStep*` cuando un candidato falla, se omite o una conmutación por error posterior tiene éxito. Estos campos hacen explícita la transición intentada (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) para que los exportadores de registros y diagnósticos puedan reconstruir el fallo principal incluso cuando la conmutación por error final también falla.

Cuando fallan todos los candidatos, OpenClaw lanza `FallbackSummaryError`. El ejecutor de respuestas externo puede usarlo para construir un mensaje más específico como "todos los modelos están temporalmente limitados por tasa" e incluir la expiración del enfriamiento más próxima cuando se conoce una.

Ese resumen de enfriamiento es consciente del modelo:

- se ignoran los límites de tasa de ámbito de modelo no relacionados para la cadena de proveedor/modelo intentada
- si el bloqueo restante es un límite de tasa de ámbito de modelo coincidente, OpenClaw informa la última expiración coincidente que aún bloquea ese modelo

## Configuración relacionada

Consulte [Configuración de la puerta de enlace](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una visión general más amplia de la selección y reserva de modelos.
