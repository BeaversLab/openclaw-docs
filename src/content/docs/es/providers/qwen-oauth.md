---
summary: "Use el id de proveedor de Qwen Portal con OpenClaw"
read_when:
  - You want to configure the qwen-oauth provider id
  - You previously used Qwen Portal OAuth credentials
  - You need the Qwen Portal endpoint or migration guidance
title: "Qwen OAuth / Portal"
---

`qwen-oauth` es el id de proveedor de Qwen Portal. Apunta al endpoint de Qwen Portal
y mantiene accesibles las configuraciones anteriores de Qwen OAuth / portal a través de un
id de proveedor distinto.

Use este proveedor cuando específicamente tenga un token actual de Qwen Portal para
`https://portal.qwen.ai/v1`, o cuando esté migrando una configuración anterior de Qwen Portal /
Qwen CLI y quiera mantener esas credenciales separadas del proveedor
canónico de Qwen Cloud. No es la primera opción recomendada para nuevos usuarios de Qwen.

Para nuevas configuraciones de Qwen Cloud, prefiera [Qwen](/es/providers/qwen) con el endpoint estándar
de ModelStudio a menos que específicamente tenga un token actual de Qwen Portal.

## Configuración

Proporcione su token de portal a través de la incorporación:

```bash
openclaw onboard --auth-choice qwen-oauth
```

O configure:

```bash
export QWEN_API_KEY="<your-qwen-portal-token>" # pragma: allowlist secret
```

## Valores predeterminados

- Proveedor: `qwen-oauth`
- Alias: `qwen-portal`, `qwen-cli`
- URL base: `https://portal.qwen.ai/v1`
- Var de entorno: `QWEN_API_KEY`
- Estilo de API: Compatible con OpenAI
- Modelo predeterminado: `qwen-oauth/qwen3.5-plus`

## Cómo esto difiere de Qwen

OpenClaw tiene dos ids de proveedor orientados a Qwen:

| Proveedor    | Familia de endpoints                                      | Mejor para                                                                                                         |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `qwen`       | Endpoints de Qwen Cloud / Alibaba DashScope y Coding Plan | Nuevas configuraciones de clave API, Pago por uso estándar, Coding Plan, características multimodales de DashScope |
| `qwen-oauth` | Endpoint de Qwen Portal en `portal.qwen.ai/v1`            | Tokens existentes de Qwen Portal y configuraciones heredadas de Qwen OAuth / CLI                                   |

Ambos proveedores utilizan formatos de solicitud compatibles con OpenAI, pero son superficies de autenticación
separadas. Un token almacenado para `qwen-oauth` no debe tratarse como una clave de DashScope
o ModelStudio, y una nueva clave de DashScope debería usar el proveedor canónico `qwen`
en su lugar.

## Cuándo elegir Qwen OAuth / Portal

- Ya tiene un token de Qwen Portal funcional.
- Está conservando un flujo de trabajo heredado de Qwen OAuth o Qwen CLI mientras se traslada al
  modelo de proveedor de OpenClaw.
- Necesita probar la compatibilidad específicamente con el endpoint de Qwen Portal.

Elija [Qwen](/es/providers/qwen) para una nueva configuración, opciones de puntos de conexión más amplias, ModelStudio estándar, Plan de codificación y el catálogo completo de Qwen incluido.

## Modelos

El catálogo incluido predeterminado del Qwen Portal:

- `qwen-oauth/qwen3.5-plus`

La disponibilidad depende de la cuenta y el token actuales de Qwen Portal. Si su cuenta utiliza claves de API de ModelStudio / DashScope en su lugar, configure el proveedor canónico `qwen`:

```bash
openclaw onboard --auth-choice qwen-standard-api-key
openclaw models set qwen/qwen3-coder-plus
```

## Migración

Es posible que los perfiles heredados de OAuth de Qwen Portal no se puedan actualizar. Si un perfil de portal deja de funcionar, vuelva a autenticarse con un token actual o cambie al proveedor estándar de Qwen:

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

ModelStudio global estándar utiliza:

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## Solución de problemas

- Fallos de actualización de OAuth del portal: es posible que los perfiles heredados de OAuth de Qwen Portal no se puedan actualizar. Vuelva a ejecutar la incorporación con un token actual.
- Errores de punto de conexión incorrecto: confirme que la referencia del modelo comienza con `qwen-oauth/` cuando use un token de portal. Use referencias `qwen/` solo para el proveedor canónico de Qwen.
- Confusión con `QWEN_API_KEY`: ambas páginas de Qwen mencionan esta variable de entorno, pero la incorporación almacena las credenciales bajo el ID de proveedor seleccionado. Prefiera la incorporación cuando mantenga tanto `qwen` como `qwen-oauth` disponibles en la misma máquina.

## Relacionado

- [Qwen](/es/providers/qwen)
- [Alibaba Model Studio](/es/providers/alibaba)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Todos los proveedores](/es/providers/index)
