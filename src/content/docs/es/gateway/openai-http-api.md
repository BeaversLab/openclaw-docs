---
summary: "Expone un endpoint HTTP /v1/chat/completions compatible con OpenAI desde el Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

El Gateway de OpenClaw puede servir un pequeño punto de conexión de Chat Completions compatible con OpenAI.

Este punto final está **deshabilitado por defecto**. Habilítelo primero en la configuración.

- `POST /v1/chat/completions`
- Mismo puerto que la puerta de enlace (WS + HTTP multiplex): `http://<gateway-host>:<port>/v1/chat/completions`

Cuando la superficie HTTP compatible con OpenAI del Gateway está habilitada, también sirve:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal de la puerta de enlace (mismo camino de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con su puerta de enlace.

## Autenticación

Utiliza la configuración de autenticación de la puerta de enlace.

Rutas comunes de autenticación HTTP:

- autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`):
  `Authorization: Bearer <token-or-password>`
- autenticación HTTP de identidad confiable (`gateway.auth.mode="trusted-proxy"`):
  enrute a través del proxy con conocimiento de identidad configurado y déjelo inyectar los
  encabezados de identidad requeridos
- autenticación abierta de ingreso privado (`gateway.auth.mode="none"`):
  no se requiere encabezado de autenticación

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Cuando `gateway.auth.mode="trusted-proxy"`, la solicitud HTTP debe provenir de una
  fuente de proxy de confianza configurada; los proxies de bucle de retorno del mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito.
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados errores de autenticación, el punto de conexión devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este punto final como una superficie de **acceso completo de operador** para la instancia de la puerta de enlace.

- La autenticación de portador HTTP aquí no es un modelo de alcance estrecho por usuario.
- Un token/contraseña de puerta de enlace válido para este punto final debe tratarse como una credencial de propietario operador.
- Las solicidades se ejecutan a través del mismo camino de agente del plano de control que las acciones de operador confiables.
- No existe un límite de herramientas independiente para no propietarios/por usuario en este punto final; una vez que un autor de la llamada pasa la autenticación del Gateway aquí, OpenClaw trata a ese autor de la llamada como un operador de confianza para este gateway.
- Para los modos de autenticación de secreto compartido (`token` y `password`), el punto de conexión restaura los valores predeterminados normales completos del operador incluso si el llamador envía un encabezado `x-openclaw-scopes` más restringido.
- Los modos HTTP de identidad de confianza (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"`) respetan `x-openclaw-scopes` cuando está presente y, de lo contrario, recurren al conjunto predeterminado de ámbito del operador normal.
- Si la política del agente de destino permite herramientas confidenciales, este punto final puede usarlas.
- Mantenga este punto final solo en loopback/tailnet/ingreso privado; no lo exponga directamente a la Internet pública.

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador del gateway
  - ignora `x-openclaw-scopes` más restringido
  - restaura el conjunto completo de ámbitos predeterminados del operador:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - trata los turnos de chat en este punto final como turnos de remitente propietario
- modos HTTP de identidad de confianza (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"` en ingreso privado)
  - autentica alguna identidad de confianza externa o límite de implementación
  - respetan `x-openclaw-scopes` cuando el encabezado está presente
  - vuelve al conjunto de alcances predeterminados del operador normal cuando el encabezado está ausente
  - solo pierden la semántica de propietario cuando el llamador restringe explícitamente los ámbitos y omite `operator.admin`

Consulte [Seguridad](/es/gateway/security) y [Acceso remoto](/es/gateway/remote).

## Contrato de modelo centrado en agentes

OpenClaw trata el campo `model` de OpenAI como un **objetivo de agente**, no como una identificación de modelo de proveedor sin procesar.

- `model: "openclaw"` se enruta al agente predeterminado configurado.
- `model: "openclaw/default"` también se enruta al agente predeterminado configurado.
- `model: "openclaw/<agentId>"` se enruta a un agente específico.

Encabezados de solicitud opcionales:

- `x-openclaw-model: <provider/model-or-bare-id>` anula el modelo de backend para el agente seleccionado.
- `x-openclaw-agent-id: <agentId>` sigue siendo compatible como una anulación de compatibilidad.
- `x-openclaw-session-key: <sessionKey>` controla completamente el enrutamiento de la sesión.
- `x-openclaw-message-channel: <channel>` establece el contexto sintético del canal de entrada para prompts y políticas conscientes del canal.

Alias de compatibilidad aún aceptados:

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## Habilitar el endpoint

Establezca `gateway.http.endpoints.chatCompletions.enabled` en `true`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## Deshabilitar el endpoint

Establezca `gateway.http.endpoints.chatCompletions.enabled` en `false`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## Comportamiento de la sesión

Por defecto, el endpoint es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena `user` de OpenAI, la Gateway deriva una clave de sesión estable a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Por qué esta superficie es importante

Este es el conjunto de compatibilidad de mayor impacto para frontends y herramientas autohospedadas:

- La mayoría de las configuraciones de Open WebUI, LobeChat y LibreChat esperan `/v1/models`.
- Muchos sistemas RAG esperan `/v1/embeddings`.
- Los clientes de chat existentes de OpenAI generalmente pueden comenzar con `/v1/chat/completions`.
- Los clientes más nativos de agentes prefieren cada vez más `/v1/responses`.

## Lista de modelos y enrutamiento de agentes

<AccordionGroup>
  <Accordion title="¿Qué devuelve `/v1/models`?">
    Una lista de objetivos de agente de OpenClaw.

    Los ids devueltos son entradas `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
    Úselos directamente como valores de OpenAI `model`.

  </Accordion>
  <Accordion title="¿`/v1/models` enumera agentes o sub-agentes?">
    Enumera objetivos de agente de nivel superior, no modelos de proveedores de backend ni sub-agentes.

    Los sub-agentes permanecen como topología de ejecución interna. No aparecen como pseudomodelos.

  </Accordion>
  <Accordion title="¿Por qué se incluye `openclaw/default`?">
    `openclaw/default` es el alias estable para el agente predeterminado configurado.

    Eso significa que los clientes pueden seguir usando un id predecible, incluso si el id real del agente predeterminado cambia entre entornos.

  </Accordion>
  <Accordion title="¿Cómo anulo el modelo del backend?">
    Use `x-openclaw-model`.

    Ejemplos:
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    Si lo omite, el agente seleccionado se ejecuta con su opción de modelo configurada normal.

  </Accordion>
  <Accordion title="¿Cómo encajan las incrustaciones en este contrato?">
    `/v1/embeddings` utiliza los mismos ids de destino de agente `model`.

    Use `model: "openclaw/default"` o `model: "openclaw/<agentId>"`.
    Cuando necesite un modelo de incrustación específico, envíelo en `x-openclaw-model`.
    Sin ese encabezado, la solicitud se transmite a la configuración de incrustación normal del agente seleccionado.

  </Accordion>
</AccordionGroup>

## Transmisión (SSE)

Establezca `stream: true` para recibir eventos enviados por el servidor (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `data: <json>`
- El flujo termina con `data: [DONE]`

## Configuración rápida de Open WebUI

Para una conexión básica de Open WebUI:

- URL base: `http://127.0.0.1:18789/v1`
- Docker en macOS URL base: `http://host.docker.internal:18789/v1`
- Clave API: su token de portador (bearer token) de Gateway
- Modelo: `openclaw/default`

Comportamiento esperado:

- `GET /v1/models` debería listar `openclaw/default`
- Open WebUI debería usar `openclaw/default` como el id del modelo de chat
- Si desea un proveedor/modelo de backend específico para ese agente, configure el modelo predeterminado normal del agente o envíe `x-openclaw-model`

Prueba rápida:

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Si eso devuelve `openclaw/default`, la mayoría de las configuraciones de Open WebUI pueden conectarse con la misma URL base y token.

## Ejemplos

Sin transmisión:

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Con transmisión:

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Listar modelos:

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Obtener un modelo:

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Crear incrustaciones (embeddings):

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

Notas:

- `/v1/models` devuelve objetivos de agente OpenClaw, no catálogos de proveedores sin procesar.
- `openclaw/default` siempre está presente para que un id estable funcione en diferentes entornos.
- Las anulaciones de proveedor/modelo de backend pertenecen a `x-openclaw-model`, no al campo `model` de OpenAI.
- `/v1/embeddings` admite `input` como una cadena o matriz de cadenas.

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [OpenAI](/es/providers/openai)
