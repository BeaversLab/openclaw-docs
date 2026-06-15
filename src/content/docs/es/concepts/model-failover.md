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
2. **Conmutación por error de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Este documento explica las reglas de tiempo de ejecución y los datos que las respaldan.

## Flujo de ejecución

Para una ejecución de texto normal, OpenClaw evalúa los candidatos en este orden:

<Steps>
  <Step title="Resolver estado de la sesión">Resolver el modelo de sesión activo y la preferencia del perfil de autenticación.</Step>
  <Step title="Construir cadena de candidatos">
    Construir la cadena de modelos candidatos a partir de la selección de modelo actual y la política de conmutación por error para esa fuente de selección. Los valores predeterminados configurados, los principales de trabajos cron y los modelos de conmutación por_error seleccionados automáticamente pueden usar conmutaciones por_error configuradas; las selecciones explícitas de sesión de usuario
    son estrictas.
  </Step>
  <Step title="Probar el proveedor actual">Probar el proveedor actual con las reglas de rotación/enfriamiento del perfil de autenticación.</Step>
  <Step title="Avanzar ante errores aptos para conmutación por_error">Si ese proveedor se agota con un error apto para conmutación por_error, pasar al siguiente modelo candidato.</Step>
  <Step title="Persistir la anulación de conmutación por_error">Persistir la anulación de conmutación por_error seleccionada antes de que comience el reintento para que otros lectores de la sesión vean el mismo proveedor/modelo que el ejecutor está a punto de usar. La anulación del modelo persistida está marcada como `modelOverrideSource: "auto"`.</Step>
  <Step title="Revertir de forma limitada ante fallos">Si el candidato de conmutación por_error falla, revertir solo los campos de anulación de sesión propiedad de la conmutación por_error cuando aún coincidan con ese candidato fallido.</Step>
  <Step title="Lanzar FallbackSummaryError si se agota">Si todos los candidatos fallan, lanzar un `FallbackSummaryError` con el detalle de cada intento y la caducidad de enfriamiento más próxima cuando se conozca una.</Step>
</Steps>

Esto es intencionalmente más limitado que "guardar y restaurar toda la sesión". El ejecutor de respuestas solo persiste los campos de selección de modelo que posee para el respaldo:

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Eso evita que un reintento de reserva fallido sobrescriba mutaciones de sesión más recientes y no relacionadas, como cambios manuales de `/model` o actualizaciones de rotación de sesión que ocurrieron mientras se ejecutaba el intento.

## Política de fuente de selección

OpenClaw separa el proveedor/modelo seleccionado del por qué fue seleccionado. Esa fuente controla si se permite la cadena de conmutación por error:

- **Predeterminado configurado**: `agents.defaults.model.primary` usa `agents.defaults.model.fallbacks`.
- **Agente principal**: `agents.list[].model` es estricto a menos que ese objeto de modelo de agente incluya su propio `fallbacks`. Use `fallbacks: []` para hacer que el comportamiento estricto sea explícito, o proporcione una lista no vacía para optar por que ese agente use la reserva del modelo.
- **Invalidación de reserva automática**: una reserva en tiempo de ejecución escribe `providerOverride`, `modelOverride`, `modelOverrideSource: "auto"` y el modelo de origen seleccionado antes de reintentar. Esa invalidación automática puede seguir recorriendo la cadena de reserva configurada sin sondear el principal en cada mensaje, pero OpenClaw sondea periódicamente el origen configurado nuevamente y borra la invalidación automática cuando se recupera. `/new`, `/reset` y `sessions.reset` también borran las invalidaciones de origen automático. El latido se ejecuta sin un `heartbeat.model` explícito borra las invalidaciones automáticas directas cuando su origen ya no coincide con el predeterminado configurado actual.
- **Invalidación de sesión de usuario**: `/model`, el selector de modelo, `session_status(model=...)` y `sessions.patch` escriben `modelOverrideSource: "user"`. Esa es una selección exacta de sesión. Si el proveedor/modelo seleccionado falla antes de producir una respuesta, OpenClaw informa el error en lugar de responder desde una reserva configurada no relacionada.
- **Invalidación de sesión heredada**: las entradas de sesión más antiguas pueden tener `modelOverride` sin `modelOverrideSource`. OpenClaw las trata como invalidaciones de usuario para que una selección antigua explícita no se convierta silenciosamente en un comportamiento de reserva.
- **Modelo de carga útil de Cron**: un trabajo cron `payload.model` / `--model` es un principal del trabajo, no una invalidación de sesión de usuario. Usa reservas configuradas a menos que el trabajo proporcione `payload.fallbacks`; `payload.fallbacks: []` hace que la ejecución del cron sea estricta.

El intervalo de la sonda principal de la conmutación por error automática es de cinco minutos y no es configurable. OpenClaw recuerda las sondas recientes por sesión y modelo principal, por lo que un principal que falla no se reintentará en cada turno. OpenClaw envía un aviso visible cuando una sesión pasa a la conmutación por error y otro aviso cuando regresa al principal seleccionado; no repite el aviso en cada turno de conmutación por error persistente.

## Omitir caché de fallos de autenticación

De forma predeterminada, cada nuevo turno mantiene el comportamiento de reintento de fallback existente: OpenClaw
intentará cada candidato de fallback configurado de nuevo, incluyendo candidatos no primarios
que fallaron recientemente con `auth` o `auth_permanent`.

Los operadores que prefieran suprimir esos fallos de autenticación repetidos pueden optar por:

```bash
OPENCLAW_FALLBACK_SKIP_TTL_MS=60000
```

Cuando está habilitado, OpenClaw registra un marcador de omisión con alcance de sesión en memoria para un
candidato de fallback no primario después de un fallo de clase de autenticación. El marcador está indexado
por id de sesión, proveedor y modelo. Los candidatos primarios nunca se omiten, por lo que una
selección explícita de modelo por parte del usuario aún muestra el error de autenticación real. La caché es
local del proceso y se borra al reiniciar el Gateway.

El valor es un TTL en milisegundos. `0` o un valor no establecido deshabilita la caché.
Los valores positivos se limitan entre 1 segundo y 10 minutos.

## Avisos de fallback visibles para el usuario

Cuando una sesión pasa a un fallback seleccionado automáticamente, OpenClaw envía un aviso de estado en la misma superficie de respuesta:

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

Cuando una prueba posterior tiene éxito y la sesión regresa al primario seleccionado, OpenClaw envía:

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

Estos avisos son mensajes operativos, no contenido del asistente. Se entregan una vez por cambio de estado, incluyendo turnos de solo efectos secundarios cuando es factible, pero los turnos de fallback persistentes no los repiten. La entrega omite la supresión normal de respuesta de origen, el aviso no consume el primer espacio de respuesta del asistente para canales con hilos y se excluye de la conversión de texto a voz y la extracción de compromisos.

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

## ID de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que puedan coexistir varias cuentas.

- Predeterminado: `provider:default` cuando no hay ningún correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo, `google-antigravity:user@gmail.com`).

Los perfiles se almacenan en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene varios perfiles, OpenClaw elige un orden de la siguiente manera:

<Steps>
  <Step title="Configuración explícita">`auth.order[provider]` (si está configurado).</Step>
  <Step title="Perfiles configurados">`auth.profiles` filtrados por proveedor.</Step>
  <Step title="Perfiles almacenados">Entradas en `auth-profiles.json` para el proveedor.</Step>
</Steps>

Si no se configura un orden explícito, OpenClaw utiliza un orden round-robin:

- **Clave principal:** tipo de perfil (**OAuth antes que las claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (el más antiguo primero, dentro de cada tipo).
- Los **perfiles en período de espera/deshabilitados** se mueven al final, ordenados por la fecha de vencimiento más próxima.

### Persistencia de sesión (compatible con caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener las cachés del proveedor activas. **No** rota en cada solicitud. El perfil fijado se reutiliza hasta que:

- se restablece la sesión (`/new` / `/reset`)
- se completa una compactación (el contador de compactaciones se incrementa)
- el perfil está en período de espera/deshabilitado

La selección manual a través de `/model …@<profileId>` establece una **anulación del usuario** para esa sesión y no se rota automáticamente hasta que comienza una nueva sesión.

<Note>
  Los perfiles fijados automáticamente (seleccionados por el enrutador de sesión) se tratan como una **preferencia**: se intentan primero, pero OpenClaw puede rotar a otro perfil en caso de límites de tasa/tiempos de espera. Cuando el perfil original vuelve a estar disponible, las nuevas ejecuciones pueden volver a preferirlo sin cambiar el modelo seleccionado ni el tiempo de ejecución. Los
  perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y se configuran modelos de respaldo, OpenClaw pasa al siguiente modelo en lugar de cambiar de perfil.
</Note>

### Suscripción de OpenAI Codex más copia de seguridad con clave de API

Para los modelos de agente de OpenAI, la autenticación y el tiempo de ejecución son independientes. `openai/gpt-*` se mantiene en
el arnés de Codex mientras que la autenticación puede rotar entre un perfil de suscripción a Codex y
una copia de seguridad con clave de API de OpenAI.

Use `auth.order.openai` para el orden orientado al usuario:

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Use `openai:*` tanto para los perfiles OAuth de ChatGPT/Codex como para los perfiles de
clave de API de OpenAI. Cuando la suscripción alcanza un límite de uso de Codex,
OpenClaw registra la hora exacta de restablecimiento cuando Codex proporciona una, intenta el siguiente
perfil de autenticación ordenado y mantiene la ejecución dentro del arnés de Codex. Una vez que pasa la hora de
restablecimiento, el perfil de suscripción vuelve a ser elegible y la siguiente selección
automática puede volver a él.

Use un perfil fijado por el usuario solo cuando desee forzar una cuenta/clave para esa
sesión. Los perfiles fijados por el usuario son intencionalmente estrictos y no saltan
silenciosamente a otro perfil.

## Períodos de enfriamiento

Cuando un perfil falla debido a errores de autenticación/límite de tasa (o un tiempo de espera que parece un límite de tasa), OpenClaw lo marca en enfriamiento y pasa al siguiente perfil.

<AccordionGroup>
  <Accordion title="Lo que entra en el cubo de límites de velocidad / tiempo de espera agotado">
    Ese cubo de límites de velocidad es más amplio que el simple `429`: también incluye mensajes del proveedor como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, y límites periódicos de la ventana de uso como `weekly/monthly limit reached`.

    Los errores de formato/solicitud no válida suelen ser terminales porque reintentar la misma carga útil fallaría de la misma manera, por lo que OpenClaw los expone en lugar de rotar los perfiles de autenticación. Las rutas conocidas de reparación por reintento pueden optar explícitamente: por ejemplo, los fallos de validación del ID de llamada de herramienta de Cloud Code Assist se sanean y se reintentan una vez a través de la política `allowFormatRetry`. Los errores de motivo de parada compatibles con OpenAI como `Unhandled stop reason: error`, `stop reason: error` y `reason: error` se clasifican como señales de tiempo de espera/conmutación por error.

    El texto genérico del servidor también puede entrar en ese cubo de tiempo de espera cuando el origen coincide con un patrón transitorio conocido. Por ejemplo, el mensaje simple del contenedor de flujo (stream-wrapper) del tiempo de ejecución del modelo `An unknown error occurred` se trata como digno de conmutación por error para cada proveedor porque el tiempo de ejecución del modelo compartido lo emite cuando los flujos del proveedor terminan con `stopReason: "aborted"` o `stopReason: "error"` sin detalles específicos. Las cargas útiles JSON `api_error` con texto de servidor transitorio como `internal server error`, `unknown error, 520`, `upstream error` o `backend error` también se tratan como tiempos de espera dignos de conmutación por error.

    El texto genérico ascendente específico de OpenRouter, como el `Provider returned error` simple, se trata como tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto genérico de conmutación por error interno como `LLM request failed with an unknown error.` se mantiene conservador y no desencadena la conmutación por error por sí mismo.

  </Accordion>
  <Accordion title="Límites de reintentos posteriores del SDK">
    Algunos SDK de proveedores podrían, de otro modo, permanecer inactivos durante una ventana larga `Retry-After` antes de devolver el control a OpenClaw. Para SDK basados en Stainless como Anthropic y OpenAI, OpenClaw limita las esperas internas del SDK de `retry-after-ms` / `retry-after` a 60 segundos de forma predeterminada y muestra respuestas reintentables más largas de inmediato para que se pueda ejecutar esta ruta de conmutación por error. Ajuste o desactive el límite con `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`; consulte [Comportamiento de reintento](/es/concepts/retry).
  </Accordion>
  <Accordion title="Períodos de inactividad con ámbito de modelo">
    Los períodos de inactividad por límite de tasa también pueden tener ámbito de modelo:

    - OpenClaw registra `cooldownModel` para fallos de límite de tasa cuando se conoce el id del modelo fallido.
    - Un modelo hermano en el mismo proveedor aún puede intentarse cuando el período de inactividad está limitado a un modelo diferente.
    - Las ventanas de facturación/deshabilitado siguen bloqueando todo el perfil entre modelos.

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

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como aptos para conmutación por error, pero por lo general no son transitorios. En lugar de un período de inactividad breve, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y rota al siguiente perfil/proveedor.

<Note>
No todas las respuestas con forma de facturación son `402`, y no todos los `402` HTTP terminan aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un proveedor devuelve `401` o `403` en su lugar, pero los comparadores específicos del proveedor se mantienen limitados al proveedor que los posee (por ejemplo, OpenRouter `403 Key limit exceeded`).

Mientras tanto, los errores temporales de ventana de uso `402` y límite de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` o `organization spending limit exceeded`). Esos errores se mantienen en la ruta de enfriamiento breve/conmutación por error en lugar de la ruta larga de deshabilitación de facturación.

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

- La retirada de facturación comienza en **5 horas**, se duplica por cada error de facturación y se limita a **24 horas**.
- Los contadores de retirada se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos por sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes de la conmutación por error del modelo.
- Los reintentos por sobrecarga usan **0 ms de retirada** de forma predeterminada.

## Conmutación por error del modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en `agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de velocidad y tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan la conmutación por error). Los errores del proveedor que no exponen suficientes detalles aún se etiquetan con precisión en el estado de conmutación por error: `empty_response` significa que el proveedor no devolvió ningún mensaje o estado utilizable, `no_error_details` significa que el proveedor devolvió explícitamente `Unknown error (no error details in response)`, y `unclassified` significa que OpenClaw conservó la vista previa sin procesar pero ningún clasificador la ha coincidido todavía.

Los errores de sobrecarga y límite de velocidad se manejan de manera más agresiva que los períodos de enfriamiento de facturación. De forma predeterminada, OpenClaw permite un reintento del perfil de autenticación del mismo proveedor y luego cambia a la siguiente reserva de modelo configurada sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo de sobrecarga. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución comienza desde el principal predeterminado configurado, un principal de trabajo cron, un principal de agente con reservas explícitas o una anulación de reserva seleccionada automáticamente, OpenClaw puede recorrer la cadena de reservas configuradas coincidentes. Los principales de agente sin reservas explícitas y las selecciones explícitas del usuario (por ejemplo `/model ollama/qwen3.5:27b`, el selector de modelos, `sessions.patch` o anulaciones de proveedor/modelo de CLI de una sola vez) son estrictas: si ese proveedor/modelo es inalcanzable o falla antes de producir una respuesta, OpenClaw informa el error en lugar de responder desde una reserva no relacionada.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente más las reservas configuradas.

<AccordionGroup>
  <Accordion title="Reglas">
    - El modelo solicitado siempre es el primero.
    - Las reservas configuradas explícitamente se deduplican pero no se filtran por la lista de permitidos del modelo. Se tratan como una intención explícita del operador.
    - Si la ejecución actual ya está en una reserva configurada en la misma familia de proveedores, OpenClaw sigue usando la cadena completa configurada.
    - Cuando no se proporciona una anulación de reserva explícita, se intentan las reservas configuradas antes que el principal configurado, incluso si el modelo solicitado utiliza un proveedor diferente.
    - Cuando no se proporciona una anulación de reserva explícita al ejecutor de reservas, el principal configurado se agrega al final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten los candidatos anteriores.
    - Cuando un solicitante proporciona `fallbacksOverride`, el ejecutor usa exactamente el modelo solicitado más esa lista de anulación. Una lista vacía deshabilita la reserva del modelo y evita que el principal configurado se agregue como un objetivo de reintento oculto.

  </Accordion>
</AccordionGroup>

### Qué errores avanzan la reserva

<Tabs>
  <Tab title="Continúa en">
    - fallos de autenticación
    - límites de tasa y agotamiento del tiempo de espera
    - errores de sobrecarga/proveedor ocupado
    - errores de conmutación por error con forma de tiempo de espera agotado
    - deshabilitaciones de facturación
    - `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que un modelo persistente obsoleto no cree un bucle de reintorno externo
    - otros errores no reconocidos cuando aún quedan candidatos

  </Tab>
  <Tab title="No continúa en">
    - interrupciones explícitas que no tienen forma de tiempo de espera agotado/conmutación por error
    - errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento (por ejemplo `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, o `ollama error: context length exceeded`)
    - un error final desconocido cuando no quedan candidatos

  </Tab>
</Tabs>

### Omisión de tiempo de espera vs comportamiento de sonda

Cuando todos los perfiles de autenticación de un proveedor ya están en tiempo de espera, OpenClaw no omite automáticamente ese proveedor para siempre. Toma una decisión por candidato:

<AccordionGroup>
  <Accordion title="Decisiones por candidato">
    - Los fallos persistentes de autenticación omiten todo el proveedor inmediatamente.
    - Las deshabilitaciones de facturación generalmente se omiten, pero el candidato principal aún puede sondearse con una limitación para que la recuperación sea posible sin reiniciar.
    - El candidato principal puede ser sondeado cerca de la expiración del tiempo de espera, con una limitación por proveedor.
    - Los hermanos de conmutación por error del mismo proveedor pueden intentarse a pesar del tiempo de espera cuando el fallo parece transitorio (`rate_limit`, `overloaded`, o desconocido). Esto es especialmente relevante cuando un límite de tasa está limitado al modelo y un modelo hermano aún puede recuperarse inmediatamente.
    - Las sondas transitorias de tiempo de espera se limitan a una por proveedor por ejecución de conmutación por error para que un solo proveedor no detenga la conmutación por error entre proveedores.

  </Accordion>
</AccordionGroup>

## Sobrescrituras de sesión y cambio dinámico de modelo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`, las actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben partes de la misma entrada de sesión.

Eso significa que los reintentos de conmutación por error deben coordinarse con el cambio dinámico de modelo:

- Solo los cambios explícitos de modelo impulsados por el usuario marcan un cambio en vivo pendiente. Esto incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo impulsados por el sistema, como la rotación por reserva (fallback), las anulaciones de latido o la compactación, nunca marcan por sí mismos un cambio en vivo pendiente.
- Las anulaciones de modelo impulsadas por el usuario se tratan como selecciones exactas para la política de reserva, por lo que un proveedor seleccionado inalcanzable se manifiesta como un error en lugar de quedar enmascarado por `agents.defaults.model.fallbacks`.
- Antes de que comience un reintento de reserva, el ejecutor de respuestas persiste los campos de anulación de reserva seleccionados en la entrada de la sesión.
- Las anulaciones de reserva automática permanecen seleccionadas en los turnos subsiguientes para que OpenClaw no sondee un primario con fallo conocido en cada mensaje. OpenClaw sondea periódicamente el origen configurado de nuevo y borra la anulación automática cuando se recupera; `/new`, `/reset` y `sessions.reset` borran las anulaciones de origen automático inmediatamente.
- Las respuestas del usuario anuncian las transiciones de reserva y la recuperación cuando se borra la reserva una vez por cambio de estado. Los turnos de reserva persistente (sticky) no repiten el aviso.
- `/status` muestra el modelo seleccionado y, cuando el estado de reserva difiere, el modelo de reserva activo y el motivo.
- La conciliación de la sesión en vivo prefiere las anulaciones de sesión persistidas sobre los campos de modelo de tiempo de ejecución obsoletos.
- Si un error de cambio en vivo apunta a un candidato posterior en la cadena de reserva activa, OpenClaw salta directamente a ese modelo seleccionado en lugar de recorrer primero candidatos no relacionados.
- Si el intento de reserva falla, el ejecutor revierte solo los campos de anulación que escribió, y solo si aún coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

<Steps>
  <Step title="Fallo en el primario">El modelo primario seleccionado falla.</Step>
  <Step title="Reserva elegida en memoria">El candidato de reserva se elige en memoria.</Step>
  <Step title="El almacén de sesión todavía dice el primario antiguo">El almacén de sesión todavía refleja el primario antiguo.</Step>
  <Step title="La reconciliación en vivo lee el estado obsoleto">La reconciliación de sesión en vivo lee el estado de sesión obsoleto.</Step>
  <Step title="El reintento vuelve a la versión anterior">El reintento vuelve al modelo anterior antes de que comience el intento de conmutación por error.</Step>
</Steps>

La sustitución de conmutación por error persistente cierra esa ventana, y la reversión limitada mantiene intactos los cambios manuales o de sesión en tiempo más recientes.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles de cada intento que alimentan los registros y los mensajes de tiempo de espera visibles para el usuario:

- proveedor/modelo intentado
- motivo (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y motivos similares de conmutación por error)
- estado/código opcional
- resumen de error legible por humanos

Los registros estructurados `model_fallback_decision` también incluyen campos planos `fallbackStep*` cuando un candidato falla, se omite o una conmutación por error posterior tiene éxito. Estos campos hacen explícita la transición intentada (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) para que los exportadores de registros y diagnósticos puedan reconstruir el fallo principal incluso cuando la conmutación por error terminal también falla.

Cuando todos los candidatos fallan, OpenClaw lanza `FallbackSummaryError`. El ejecutor de respuestas externo puede usarlo para construir un mensaje más específico, como "todos los modelos están temporalmente limitados por tasa", e incluir la expiración del tiempo de espera más próxima cuando se conoce una.

Ese resumen de tiempo de espera es consciente del modelo:

- se ignoran los límites de tasa de ámbito de modelo no relacionados para la cadena de proveedor/modelo intentada
- si el bloqueo restante es un límite de tasa de ámbito de modelo coincidente, OpenClaw informa la última expiración coincidente que aún bloquea ese modelo

## Configuración relacionada

Consulte [Configuración de Gateway](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una descripción general más amplia de la selección y conmutación por error de modelos.
