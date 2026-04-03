---
summary: "Expone un endpoint HTTP /v1/chat/completions compatible con OpenAI desde el Gateway"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

La Gateway de OpenClaw puede servir un pequeño endpoint de Chat Completions compatible con OpenAI.

Este endpoint está **deshabilitado de forma predeterminada**. Habilítelo primero en la configuración.

- `POST /v1/chat/completions`
- Mismo puerto que el Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/v1/chat/completions`

Cuando la superficie HTTP compatible con OpenAI del Gateway está habilitada, también sirve:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

Bajo el capó, las solicitudes se ejecutan como una ejecución de agente normal del Gateway (misma ruta de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con tu Gateway.

## Autenticación

Utiliza la configuración de autenticación del Gateway. Envíe un token de portador (bearer token):

- `Authorization: Bearer <token>`

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el endpoint devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este endpoint como una superficie de **acceso completo de operador** para la instancia del gateway.

- La autenticación HTTP bearer aquí no es un modelo de ámbito estrecho por usuario.
- Un token/contraseña válido del Gateway para este endpoint debe tratarse como una credencial de propietario operador.
- Las solicidades se ejecutan a través de la misma ruta de agente del plano de control que las acciones de operador de confianza.
- No hay un límite de herramienta separado de no propietario/por usuario en este endpoint; una vez que el autor de la llamada pasa la autenticación del Gateway aquí, OpenClaw trata a ese autor de la llamada como un operador de confianza para este gateway.
- Para los modos de autenticación de secreto compartido (`token` y `password`), el punto de conexión restaura los valores predeterminados completos del operador normales, incluso si el remitente envía un encabezado `x-openclaw-scopes` más restrictivo.
- Los modos HTTP de identidad confiable (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"`) aún respetan los ámbitos de operador declarados en la solicitud.
- Si la política del agente de destino permite herramientas confidenciales, este punto de conexión puede usarlas.
- Mantenga este punto de conexión solo en loopback/tailnet/ingreso privado; no lo exponga directamente a Internet pública.

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador de la puerta de enlace
  - ignora `x-openclaw-scopes` más restrictivo
  - restaura el conjunto completo de ámbitos de operador predeterminados
  - trata los turnos de chat en este punto de conexión como turnos de remitente propietario
- modos HTTP de identidad confiable (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"` en ingreso privado)
  - autentican alguna identidad externa de confianza o límite de implementación
  - respetan el encabezado `x-openclaw-scopes` declarado
  - obtienen semántica de propietario solo cuando `operator.admin` está realmente presente en esos ámbitos declarados

Consulte [Seguridad](/en/gateway/security) y [Acceso remoto](/en/gateway/remote).

## Contrato de modelo primero el agente

OpenClaw trata el campo `model` de OpenAI como un **objetivo de agente**, no como una identificación de modelo de proveedor sin procesar.

- `model: "openclaw"` se enruta al agente predeterminado configurado.
- `model: "openclaw/default"` también se enruta al agente predeterminado configurado.
- `model: "openclaw/<agentId>"` se enruta a un agente específico.

Encabezados de solicitud opcionales:

- `x-openclaw-model: <provider/model-or-bare-id>` anula el modelo de backend para el agente seleccionado.
- `x-openclaw-agent-id: <agentId>` sigue siendo compatible como anulación de compatibilidad.
- `x-openclaw-session-key: <sessionKey>` controla completamente el enrutamiento de la sesión.
- `x-openclaw-message-channel: <channel>` establece el contexto de canal de ingreso sintético para políticas y avisos conscientes del canal.

Alias de compatibilidad aún aceptados:

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## Habilitar el punto de conexión

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

## Deshabilitar el punto de conexión

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

De forma predeterminada, el punto de conexión es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena `user` de OpenAI, Gateway deriva una clave de sesión estable a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Por qué esta superficie es importante

Este es el conjunto de compatibilidad de mayor impacto para frontends y herramientas autohospedadas:

- La mayoría de las configuraciones de Open WebUI, LobeChat y LibreChat esperan `/v1/models`.
- Muchos sistemas RAG esperan `/v1/embeddings`.
- Los clientes de chat de OpenAI existentes generalmente pueden comenzar con `/v1/chat/completions`.
- Los clientes más nativos de agentes cada vez prefieren más `/v1/responses`.

## Lista de modelos y enrutamiento de agentes

<AccordionGroup>
  <Accordion title="¿Qué devuelve `/v1/models`?">
    Una lista de destinos de agente de OpenClaw.

    Los ids devueltos son entradas `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
    Úselos directamente como valores `model` de OpenAI.

  </Accordion>
  <Accordion title="¿`/v1/models` enumera agentes o sub-agentes?">
    Enumera los objetivos de agentes de nivel superior, no los modelos del proveedor de backend ni los sub-agentes.

    Los sub-agentes siguen siendo una topología de ejecución interna. No aparecen como pseudo-modelos.

  </Accordion>
  <Accordion title="¿Por qué se incluye `openclaw/default`?">
    `openclaw/default` es el alias estable para el agente predeterminado configurado.

    Eso significa que los clientes pueden seguir usando un id predecible incluso si el id real del agente predeterminado cambia entre entornos.

  </Accordion>
  <Accordion title="¿Cómo anulo el modelo del backend?">
    Use `x-openclaw-model`.

    Ejemplos:
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.4`

    Si lo omite, el agente seleccionado se ejecuta con su elección de modelo configurada normalmente.

  </Accordion>
  <Accordion title="¿Cómo encajan los embeddings en este contrato?">
    `/v1/embeddings` utiliza los mismos ids de destino de agente `model`.

    Use `model: "openclaw/default"` o `model: "openclaw/<agentId>"`.
    Cuando necesite un modelo de embedding específico, envíelo en `x-openclaw-model`.
    Sin ese encabezado, la solicitud se transmite a la configuración de embedding normal del agente seleccionado.

  </Accordion>
</AccordionGroup>

## Transmisión (SSE)

Establezca `stream: true` para recibir Server-Sent Events (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `data: <json>`
- La transmisión termina con `data: [DONE]`

## Configuración rápida de Open WebUI

Para una conexión básica de Open WebUI:

- URL base: `http://127.0.0.1:18789/v1`
- URL base de Docker en macOS: `http://host.docker.internal:18789/v1`
- Clave de API: su token de portador de Gateway
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

Transmisión:

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

Crear embeddings:

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

- `/v1/models` devuelve objetivos de agente de OpenClaw, no catálogos de proveedores sin procesar.
- `openclaw/default` siempre está presente para que un id estable funcione en todos los entornos.
- Las anulaciones de proveedor/modelo de backend pertenecen a `x-openclaw-model`, no al campo OpenAI `model`.
- `/v1/embeddings` soporta `input` como una cadena o matriz de cadenas.
