---
summary: "Cómo OpenClaw rota los perfiles de autenticación y cambia a modelos alternativos"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Conmutación por error de modelos"
sidebarTitle: "Conmutación por error de modelos"
---

OpenClaw gestiona los fallos en dos etapas:

1. **Rotación de perfiles de autenticación** dentro del proveedor actual.
2. **Cambio a modelo alternativo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Este documento explica las reglas de tiempo de ejecución y los datos que las respaldan.

## Flujo de ejecución

Para una ejecución de texto normal, OpenClaw evalúa los candidatos en este orden:

<Steps>
  <Step title="Resolver estado de sesión">Resolver el modelo de sesión activo y la preferencia del perfil de autenticación.</Step>
  <Step title="Construir cadena de candidatos">
    Construir la cadena de modelos candidatos a partir de la selección de modelo actual y la política de reserva para esa fuente de selección. Los valores predeterminados configurados, los principales del trabajo programado y los modelos de reserva seleccionados automáticamente pueden usar las reservas configuradas; las selecciones explícitas de sesión del usuario son estrictas.
  </Step>
  <Step title="Probar el proveedor actual">Probar el proveedor actual con las reglas de rotación/período de inactividad del perfil de autenticación.</Step>
  <Step title="Avanzar ante errores de conmutación por error">Si ese proveedor se agota con un error que justifica la conmutación por error, pasar al siguiente modelo candidato.</Step>
  <Step title="Persistir anulación de reserva">Persistir la anulación de reserva seleccionada antes de que comience el reintento para que otros lectores de la sesión vean el mismo proveedor/modelo que el ejecutor está a punto de usar. La anulación del modelo persistente se marca como `modelOverrideSource: "auto"`.</Step>
  <Step title="Revertir de forma limitada en caso de fallo">Si el candidato de reserva falla, revertir solo los campos de anulación de sesión propiedad de la reserva cuando todavía coinciden con ese candidato fallido.</Step>
  <Step title="Lanzar FallbackSummaryError si se agota">Si falla cada candidato, lanzar un `FallbackSummaryError` con detalles de cada intento y la fecha de caducidad del período de inactividad más próxima cuando se conozca una.</Step>
</Steps>

Esto es intencionalmente más limitado que "guardar y restaurar toda la sesión". El ejecutor de respuestas solo persiste los campos de selección de modelo que posee para el respaldo:

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Eso evita que un reintento de fallback fallido sobrescriba mutaciones de sesión más nuevas y no relacionadas, como cambios manuales de `/model` o actualizaciones de rotación de sesión que ocurrieron mientras se ejecutaba el intento.

## Política de fuente de selección

OpenClaw separa el proveedor/modelo seleccionado del por qué fue seleccionado. Esa fuente controla si se permite la cadena de conmutación por error:

- **Predeterminado configurado**: `agents.defaults.model.primary` usa `agents.defaults.model.fallbacks`.
- **Principal del agente**: `agents.list[].model` es estricto a menos que ese objeto de modelo de agente incluya su propio `fallbacks`. Use `fallbacks: []` para hacer que el comportamiento estricto sea explícito, o proporcione una lista no vacía para optar por que ese agente use el fallback del modelo.
- **Anulación de fallback automático**: un fallback en tiempo de ejecución escribe `providerOverride`, `modelOverride`, `modelOverrideSource: "auto"` y el modelo de origen seleccionado antes de reintentar. Esa anulación automática puede continuar recorriendo la cadena de fallback configurada sin sondear el principal en cada mensaje, pero OpenClaw sondea periódicamente el origen configurado nuevamente y borra la anulación automática cuando se recupera. `/new`, `/reset` y `sessions.reset` también borran las anulaciones originadas automáticamente. Heartbeat se ejecuta sin un `heartbeat.model` explícito; borra las anulaciones automáticas directas cuando su origen ya no coincide con el valor predeterminado configurado actual.
- **Anulación de sesión de usuario**: `/model`, el selector de modelo, `session_status(model=...)` y `sessions.patch` escriben `modelOverrideSource: "user"`. Esa es una selección exacta de sesión. Si el proveedor/modelo seleccionado falla antes de producir una respuesta, OpenClaw informa el error en lugar de responder desde un fallback configurado no relacionado.
- **Anulación de sesión heredada**: las entradas de sesión más antiguas pueden tener `modelOverride` sin `modelOverrideSource`. OpenClaw las trata como anulaciones de usuario para que una selección antigua explícita no se convierta silenciosamente en un comportamiento de fallback.
- **Modelo de carga útil de Cron**: un trabajo cron `payload.model` / `--model` es un principal del trabajo, no una anulación de sesión de usuario. Usa fallbacks configurados a menos que el trabajo proporcione `payload.fallbacks`; `payload.fallbacks: []` hace que la ejecución del cron sea estricta.

El intervalo de la sonda principal de la conmutación por error automática es de cinco minutos y no es configurable. OpenClaw recuerda las sondas recientes por sesión y modelo principal, por lo que un principal que falla no se reintentará en cada turno. OpenClaw envía un aviso visible cuando una sesión pasa a la conmutación por error y otro aviso cuando regresa al principal seleccionado; no repite el aviso en cada turno de conmutación por error persistente.

## Avisos de conmutación por error visibles para el usuario

Cuando una sesión pasa a una conmutación por error seleccionada automáticamente, OpenClaw envía un aviso de estado en la misma superficie de respuesta:

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

Cuando una sonda posterior tiene éxito y la sesión regresa al principal seleccionado, OpenClaw envía:

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

Estos avisos son mensajes operativos, no contenido del asistente. Se entregan una vez por cambio de estado, incluyendo turnos de solo efectos secundarios cuando es factible, pero los turnos de conmutación por error persistente no los repiten. La entrega omite la supresión normal de respuesta de origen, el aviso no consume el primer espacio de respuesta del asistente para canales con hilos y se excluye de la conversión de texto a voz y la extracción de compromisos.

## Almacenamiento de autenticación (claves + OAuth)

OpenClaw utiliza **perfiles de autenticación** tanto para claves de API como para tokens de OAuth.

- Los secretos residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (legado: `~/.openclaw/agent/auth-profiles.json`).
- El estado de enrutamiento de autenticación en tiempo de ejecución reside en `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La configuración `auth.profiles` / `auth.order` es **solo metadatos + enrutamiento** (sin secretos).
- Archivo de OAuth heredado de solo importación: `~/.openclaw/credentials/oauth.json` (importado a `auth-profiles.json` en el primer uso).

Más detalles: [OAuth](/es/concepts/oauth)

Tipos de credenciales:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para algunos proveedores)

## Identificadores de perfil

Los inicios de sesión de OAuth crean perfiles distintos para que puedan coexistir varias cuentas.

- Predeterminado: `provider:default` cuando no hay ningún correo electrónico disponible.
- OAuth con correo electrónico: `provider:<email>` (por ejemplo `google-antigravity:user@gmail.com`).

Los perfiles residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` bajo `profiles`.

## Orden de rotación

Cuando un proveedor tiene múltiples perfiles, OpenClaw elige un orden así:

<Steps>
  <Step title="Configuración explícita">`auth.order[provider]` (si está configurado).</Step>
  <Step title="Perfiles configurados">`auth.profiles` filtrados por proveedor.</Step>
  <Step title="Perfiles almacenados">Entradas en `auth-profiles.json` para el proveedor.</Step>
</Steps>

Si no se configura ningún orden explícito, OpenClaw utiliza un orden round-robin:

- **Clave principal:** tipo de perfil (**OAuth antes que claves de API**).
- **Clave secundaria:** `usageStats.lastUsed` (el más antiguo primero, dentro de cada tipo).
- **Perfiles en período de enfriamiento/deshabilitados** se mueven al final, ordenados por la fecha de vencimiento más próxima.

### Persistencia de sesión (amigable con el caché)

OpenClaw **fija el perfil de autenticación elegido por sesión** para mantener los cachés del proveedor calientes. **No** rota en cada solicitud. El perfil fijo se reutiliza hasta que:

- se restablezca la sesión (`/new` / `/reset`)
- se complete una compactación (el contador de compactación se incrementa)
- el perfil esté en período de enfriamiento/deshabilitado

La selección manual a través de `/model …@<profileId>` establece una **anulación del usuario** para esa sesión y no se rota automáticamente hasta que comience una nueva sesión.

<Note>
  Los perfiles fijados automáticamente (seleccionados por el enrutador de sesión) se tratan como una **preferencia**: se prueban primero, pero OpenClaw puede rotar a otro perfil en caso de límites de velocidad/ tiempos de espera. Cuando el perfil original vuelve a estar disponible, las nuevas ejecuciones pueden preferirlo nuevamente sin cambiar el modelo seleccionado ni el tiempo de ejecución. Los
  perfiles fijados por el usuario permanecen bloqueados en ese perfil; si falla y se configuran respaldos del modelo, OpenClaw pasa al siguiente modelo en lugar de cambiar de perfiles.
</Note>

### Suscripción de OpenAI Codex más respaldo de clave de API

Para los modelos de agente de OpenAI, la autenticación y el tiempo de ejecución son independientes. `openai/gpt-*` se mantiene en
el arnés de Codex mientras que la autenticación puede rotar entre un perfil de suscripción a Codex y
un respaldo de clave de API de OpenAI.

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

Los perfiles de suscripción de Codex existentes aún pueden usar el id. de perfil heredado
`openai-codex:*`. La copia de seguridad ordenada de la clave de API puede ser un perfil de clave de API normal
`openai:*`. Cuando la suscripción alcanza un límite de uso de Codex,
OpenClaw registra la hora exacta de restablecimiento cuando Codex proporciona una, prueba el siguiente
perfil de autenticación ordenado y mantiene la ejecución dentro del arnés de Codex. Una vez que pasa la hora
de restablecimiento, el perfil de suscripción vuelve a ser elegible y la siguiente selección
automática puede volver a él.

Use un perfil fijado por el usuario solo cuando desee forzar una cuenta/clave para esa
sesión. Los perfiles fijados por el usuario son intencionalmente estrictos y no saltan
silenciosamente a otro perfil.

## Períodos de espera

Cuando un perfil falla debido a errores de autenticación/límite de tasa (o un tiempo de espera que parece limitación de tasa), OpenClaw lo marca en período de espera y pasa al siguiente perfil.

<AccordionGroup>
  <Accordion title="Lo que entra en el cubo de límite de velocidad / tiempo de espera">
    Ese cubo de límite de velocidad es más amplio que el simple `429`: también incluye mensajes de proveedores como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted` y límites periódicos de ventana de uso como `weekly/monthly limit reached`.

    Los errores de formato/solicitud no válida suelen ser terminales porque reintentar la misma carga fallaría de la misma manera, por lo que OpenClaw los muestra en lugar de rotar los perfiles de autenticación. Las rutas conocidas de reparación por reintento pueden optar explícitamente: por ejemplo, los fallos de validación del ID de llamada de herramienta de Cloud Code Assist se sanitizan y se reintentan una vez a través de la política `allowFormatRetry`. Los errores de motivo de detención compatibles con OpenAI como `Unhandled stop reason: error`, `stop reason: error` y `reason: error` se clasifican como señales de tiempo de espera/conmutación por error.

    El texto genérico del servidor también puede entrar en ese cubo de tiempo de espera cuando el origen coincide con un patrón transitorio conocido. Por ejemplo, el mensaje de contenedor de transmisión simple de pi-ai `An unknown error occurred` se trata como digno de conmutación por error para todos los proveedores porque pi-ai lo emite cuando las transmisiones del proveedor terminan con `stopReason: "aborted"` o `stopReason: "error"` sin detalles específicos. Las cargas útiles JSON `api_error` con texto de servidor transitorio como `internal server error`, `unknown error, 520`, `upstream error` o `backend error` también se tratan como tiempos de espera dignos de conmutación por error.

    El texto genérico de upstream específico de OpenRouter, como el simple `Provider returned error`, se trata como un tiempo de espera solo cuando el contexto del proveedor es realmente OpenRouter. El texto genérico de conmutación por error interno, como `LLM request failed with an unknown error.`, se mantiene conservador y no activa la conmutación por error por sí mismo.

  </Accordion>
  <Accordion title="Límites de reintentos posteriores del SDK">
    Algunos SDK de proveedores podrían permanecer inactivos durante una ventana de tiempo larga `Retry-After` antes de devolver el control a OpenClaw. Para los SDK basados en Stainless, como Anthropic y OpenAI, OpenClaw limita a 60 segundos por defecto las esperas internas del SDK de `retry-after-ms` / `retry-after` y muestra respuestas reintentables más largas inmediatamente para que se pueda ejecutar esta ruta de conmutación por error. Ajuste o desactive el límite con `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`; consulte [Comportamiento de reintento](/es/concepts/retry).
  </Accordion>
  <Accordion title="Períodos de enfriamiento con ámbito de modelo">
    Los períodos de enfriamiento por límite de velocidad también pueden tener un ámbito de modelo:

    - OpenClaw registra `cooldownModel` para fallos por límite de velocidad cuando se conoce el id del modelo que falló.
    - Un modelo hermano en el mismo proveedor aún se puede intentar cuando el período de enfriamiento está limitado a un modelo diferente.
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

Los fallos de facturación/crédito (por ejemplo, "créditos insuficientes" / "saldo de crédito demasiado bajo") se tratan como aptos para la conmutación por error, pero generalmente no son transitorios. En lugar de un período de enfriamiento corto, OpenClaw marca el perfil como **deshabilitado** (con un retroceso más largo) y cambia al siguiente perfil/proveedor.

<Note>
No todas las respuestas con forma de facturación son `402`, y no todos los HTTP `402` llegan aquí. OpenClaw mantiene el texto de facturación explícito en el carril de facturación incluso cuando un proveedor devuelve `401` o `403` en su lugar, pero los comparadores específicos del proveedor permanecen limitados al proveedor que los posee (por ejemplo, OpenRouter `403 Key limit exceeded`).

Mientras tanto, los errores temporales de ventana de uso `402` y límite de gasto de organización/espacio de trabajo se clasifican como `rate_limit` cuando el mensaje parece reintentable (por ejemplo, `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` o `organization spending limit exceeded`). Esos se mantienen en la ruta de enfriamiento/conmutación por error corta en lugar de la ruta de deshabilitación de facturación larga.

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

- La retirada de facturación comienza en **5 horas**, se duplica por cada error de facturación y tiene un máximo de **24 horas**.
- Los contadores de retirada se restablecen si el perfil no ha fallado durante **24 horas** (configurable).
- Los reintentos por sobrecarga permiten **1 rotación de perfil del mismo proveedor** antes de la conmutación por error del modelo.
- Los reintentos por sobrecarga usan **0 ms de retirada** de forma predeterminada.

## Conmutación por error del modelo

Si fallan todos los perfiles de un proveedor, OpenClaw pasa al siguiente modelo en `agents.defaults.model.fallbacks`. Esto se aplica a fallos de autenticación, límites de tasa y tiempos de espera que agotaron la rotación de perfiles (otros errores no avanzan la conmutación por error). Los errores del proveedor que no exponen suficientes detalles todavía se etiquetan con precisión en el estado de conmutación por error: `empty_response` significa que el proveedor no devolvió ningún mensaje o estado utilizable, `no_error_details` significa que el proveedor devolvió explícitamente `Unknown error (no error details in response)`, y `unclassified` significa que OpenClaw conservó la vista previa sin procesar pero ningún clasificador la ha coincidido todavía.

Los errores de sobrecarga y límite de tasa se manejan de manera más agresiva que los períodos de enfriamiento de facturación. De forma predeterminada, OpenClaw permite un reintento de perfil de autenticación del mismo proveedor y luego cambia a la siguiente alternativa de modelo configurada sin esperar. Las señales de proveedor ocupado, como `ModelNotReadyException`, caen en ese grupo de sobrecarga. Ajuste esto con `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` y `auth.cooldowns.rateLimitedProfileRotations`.

Cuando una ejecución se inicia desde el principal predeterminado configurado, un trabajo cron principal, un agente principal con alternativas explícitas o una anulación de alternativa seleccionada automáticamente, OpenClaw puede recorrer la cadena de alternativas configurada coincidente. Los agentes principales sin alternativas explícitas y las selecciones explícitas del usuario (por ejemplo `/model ollama/qwen3.5:27b`, el selector de modelos, `sessions.patch` o anulaciones de proveedor/modelo de CLI únicas) son estrictas: si ese proveedor/modelo es inalcanzable o falla antes de producir una respuesta, OpenClaw informa el error en lugar de responder desde una alternativa no relacionada.

### Reglas de la cadena de candidatos

OpenClaw construye la lista de candidatos a partir del `provider/model` solicitado actualmente más las alternativas configuradas.

<AccordionGroup>
  <Accordion title="Reglas">
    - El modelo solicitado siempre es el primero.
    - Las alternativas configuradas explícitas se deduplican pero no se filtran por la lista blanca de modelos. Se tratan como una intención explícita del operador.
    - Si la ejecución actual ya está en una alternativa configurada en la misma familia de proveedores, OpenClaw sigue usando la cadena configurada completa.
    - Cuando no se suministra una anulación de alternativa explícita, se prueban las alternativas configuradas antes que el principal configurado, incluso si el modelo solicitado utiliza un proveedor diferente.
    - Cuando no se suministra una anulación de alternativa explícita al ejecutor de alternativas, el principal configurado se añade al final para que la cadena pueda volver al valor predeterminado normal una vez que se agoten los candidatos anteriores.
    - Cuando un solicitante suministra `fallbacksOverride`, el ejecutor usa exactamente el modelo solicitado más esa lista de anulación. Una lista vacía deshabilita la alternativa de modelo y evita que el principal configurado se añada como un objetivo de reintento oculto.

  </Accordion>
</AccordionGroup>

### Qué errores avanzan la alternativa

<Tabs>
  <Tab title="Continúa en">
    - fallos de autenticación
    - límites de velocidad y agotamiento del tiempo de espera
    - errores de sobrecarga/proveedor ocupado
    - errores de conmutación por error de forma de tiempo de espera
    - deshabilitaciones de facturación
    - `LiveSessionModelSwitchError`, que se normaliza en una ruta de conmutación por error para que un modelo persistente obsoleto no cree un bucle de reinterno externo
    - otros errores no reconocidos cuando todavía quedan candidatos

  </Tab>
  <Tab title="No continúa en">
    - interrupciones explícitas que no son de tiempo de espera o de forma de conmutación por error
    - errores de desbordamiento de contexto que deben permanecer dentro de la lógica de compactación/reintento (por ejemplo, `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model` o `ollama error: context length exceeded`)
    - un error desconocido final cuando no quedan candidatos

  </Tab>
</Tabs>

### Omisión de tiempo de espera frente al comportamiento de sondeo

Cuando todos los perfiles de autenticación de un proveedor ya están en tiempo de espera, OpenClaw no omite automáticamente ese proveedor para siempre. Toma una decisión por candidato:

<AccordionGroup>
  <Accordion title="Decisiones por candidato">
    - Los fallos persistentes de autenticación omiten todo el proveedor inmediatamente.
    - Las deshabilitaciones de facturación generalmente se omiten, pero el candidato principal aún se puede sondear en un acelerador para que la recuperación sea posible sin reiniciar.
    - El candidato principal se puede sondear cerca de la expiración del tiempo de espera, con un acelerador por proveedor.
    - Los hermanos de conmutación por error del mismo proveedor se pueden intentar a pesar del tiempo de espera cuando el fallo parece transitorio (`rate_limit`, `overloaded` o desconocido). Esto es especialmente relevante cuando un límite de velocidad está limitado al modelo y un modelo hermano aún puede recuperarse inmediatamente.
    - Las sondas de tiempo de espera transitorias se limitan a una por proveedor por ejecución de conmutación por error para que un solo proveedor no detenga la conmutación por error entre proveedores.

  </Accordion>
</AccordionGroup>

## Invalidaciones de sesión y cambio en vivo de modelo

Los cambios de modelo de sesión son un estado compartido. El ejecutor activo, el comando `/model`, las actualizaciones de compactación/sesión y la conciliación de sesión en vivo todos leen o escriben partes de la misma entrada de sesión.

Esto significa que los reintentos de conmutación por error deben coordinarse con el cambio en vivo de modelo:

- Solo los cambios de modelo explícitos iniciados por el usuario marcan un cambio en vivo pendiente. Esto incluye `/model`, `session_status(model=...)` y `sessions.patch`.
- Los cambios de modelo iniciados por el sistema, como la rotación de respaldo (fallback), las anulaciones de latido (heartbeat) o la compactación, nunca marcan por sí solos un cambio en vivo pendiente.
- Las anulaciones de modelo iniciadas por el usuario se tratan como selecciones exactas para la política de respaldo, por lo que un proveedor seleccionado inalcanzable se manifiesta como un error en lugar de ocultarse mediante `agents.defaults.model.fallbacks`.
- Antes de que comience un reintento de respaldo, el ejecutor de respuestas persiste los campos de anulación de respaldo seleccionados en la entrada de la sesión.
- Las anulaciones de respaldo automático permanecen seleccionadas en los turnos posteriores para que OpenClaw no sondee un primario defectuoso conocido en cada mensaje. OpenClaw sondea periódicamente el origen configurado nuevamente y borra la anulación automática cuando se recupera; `/new`, `/reset` y `sessions.reset` borran las anulaciones de origen automático inmediatamente.
- Las respuestas del usuario anuncian las transiciones de respaldo y la recuperación tras el borrado del respaldo una vez por cada cambio de estado. Los turnos de respaldo fijo (sticky) no repiten el aviso.
- `/status` muestra el modelo seleccionado y, cuando el estado de respaldo difiere, el modelo de respaldo activo y el motivo.
- La conciliación de sesiones en vivo prefiere las anulaciones de sesión persistidas sobre los campos de modelo de tiempo de ejecución obsoletos.
- Si un error de cambio en vivo apunta a un candidato posterior en la cadena de respaldo activa, OpenClaw salta directamente a ese modelo seleccionado en lugar de recorrer primero candidatos no relacionados.
- Si el intento de respaldo falla, el ejecutor revierte solo los campos de anulación que escribió, y solo si aún coinciden con ese candidato fallido.

Esto evita la condición de carrera clásica:

<Steps>
  <Step title="Falla el principal">El modelo principal seleccionado falla.</Step>
  <Step title="Respaldo elegido en memoria">Se elige el candidato de respaldo en memoria.</Step>
  <Step title="El almacén de sesión sigue indicando el antiguo principal">El almacén de sesión aún refleja el antiguo principal.</Step>
  <Step title="La conciliación en vivo lee el estado obsoleto">La conciliación de la sesión en vivo lee el estado de sesión obsoleto.</Step>
  <Step title="El reintento vuelve atrás">El reintento se retrotrae al modelo anterior de que comience el intento de conmutación por error.</Step>
</Steps>

La invalidación persistente de conmutación por error cierra esa ventana, y la reversión limitada mantiene los cambios manuales más recientes o de la sesión de ejecución intactos.

## Observabilidad y resúmenes de fallos

`runWithModelFallback(...)` registra detalles por intento que alimentan los registros y los mensajes de tiempo de espera visibles para el usuario:

- proveedor/modelo intentado
- motivo (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` y motivos similares de conmutación por error)
- estado/código opcional
- resumen del error legible por humanos

Los registros estructurados de `model_fallback_decision` también incluyen campos planos de `fallbackStep*` cuando un candidato falla, se omite o una conmutación por error posterior tiene éxito. Estos campos hacen explícita la transición intentada (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) para que los exportadores de registros y diagnósticos puedan reconstruir el fallo principal incluso cuando la conmutación por error terminal también falla.

Cuando todos los candidatos fallan, OpenClaw lanza `FallbackSummaryError`. El ejecutor de respuestas externo puede usarlo para construir un mensaje más específico, como "todos los modelos están temporalmente limitados por tasa", e incluir la caducidad del tiempo de espera más próxima cuando se conozca una.

Ese resumen de tiempo de espera es consciente del modelo:

- se ignoran los límites de tasa de alcance de modelo no relacionados para la cadena de proveedor/modelo intentada
- si el bloqueo restante es un límite de tasa de alcance de modelo coincidente, OpenClaw informa la última caducidad coincidente que aún bloquea ese modelo

## Configuración relacionada

Consulte [Configuración de la puerta de enlace](/es/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- enrutamiento `agents.defaults.imageModel`

Consulte [Modelos](/es/concepts/models) para obtener una visión general más amplia de la selección y conmutación por error de modelos.
