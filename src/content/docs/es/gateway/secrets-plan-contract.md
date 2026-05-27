---
summary: "Contrato para planes de `secrets apply`: validación de destino, coincidencia de rutas y `auth-profiles.json` alcance de destino"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Contrato del plan de aplicación de Secrets"
---

Esta página define el contrato estricto aplicado por `openclaw secrets apply`.

Si un destino no coincide con estas reglas, la aplicación falla antes de mutar la configuración.

## Formato del archivo de plan

`openclaw secrets apply --from <plan.json>` espera una matriz `targets` de destinos del plan:

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

## Actualizaciones y eliminaciones de proveedores

Los planes también pueden incluir dos campos opcionales de nivel superior que modifican el mapa
`secrets.providers` junto con las escrituras por destino:

- `providerUpserts` — un objeto con clave por alias de proveedor. Cada valor es una
  definición de proveedor (la misma forma aceptada debajo de
  `secrets.providers.<alias>` en `openclaw.json`, p. ej., un proveedor `exec` o `file`).
- `providerDeletes` — una matriz de alias de proveedor para eliminar.

`providerUpserts` se ejecuta antes que `targets`, por lo que un `target.ref.provider` puede
hacer referencia a un alias de proveedor que el mismo plan introduce en
`providerUpserts`. Sin esto, los planes que hacen referencia a un alias aún no
configurado en `openclaw.json` fallan con `provider "<alias>" is not
configured`.

```json5
{
  version: 1,
  protocolVersion: 1,
  providerUpserts: {
    onepassword_anthropic: {
      source: "exec",
      command: "/usr/bin/op",
      args: ["read", "op://Vault/Anthropic/credential"],
    },
  },
  providerDeletes: ["legacy_unused_alias"],
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.anthropic.apiKey",
      pathSegments: ["models", "providers", "anthropic", "apiKey"],
      providerId: "anthropic",
      ref: { source: "exec", provider: "onepassword_anthropic", id: "credential" },
    },
  ],
}
```

Los proveedores de ejecución introducidos a través de `providerUpserts` todavía están sujetos a las
reglas de consentimiento de ejecución en [Comportamiento de consentimiento del proveedor de ejecución](#exec-provider-consent-behavior):
los planes que contienen proveedores de ejecución requieren `--allow-exec` en modo de escritura.

## Ámbito de destino admitido

Los destinos del plan se aceptan para rutas de credenciales admitidas en:

- [Superficie de credenciales de SecretRef](/es/reference/secretref-credential-surface)

## Comportamiento del tipo de destino

Regla general:

- `target.type` debe ser reconocido y debe coincidir con la forma normalizada `target.path`.

Los alias de compatibilidad siguen siendo aceptados para los planes existentes:

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## Reglas de validación de ruta

Cada destino se valida con todo lo siguiente:

- `type` debe ser un tipo de destino reconocido.
- `path` debe ser una ruta de puntos no vacía.
- `pathSegments` se puede omitir. Si se proporciona, debe normalizarse exactamente a la misma ruta que `path`.
- Los segmentos prohibidos son rechazados: `__proto__`, `prototype`, `constructor`.
- La ruta normalizada debe coincidir con la forma de ruta registrada para el tipo de destino.
- Si `providerId` o `accountId` está configurado, debe coincidir con el id codificado en la ruta.
- Los destinos `auth-profiles.json` requieren `agentId`.
- Al crear una nueva asignación `auth-profiles.json`, incluya `authProfileProvider`.

## Comportamiento de fallo

Si un destino falla la validación, apply sale con un error como:

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

No se confirman escrituras para un plan no válido.

## Comportamiento de consentimiento del proveedor de ejecución

- `--dry-run` omite las comprobaciones de exec SecretRef por defecto.
- Los planes que contienen exec SecretRefs/proveedores son rechazados en modo de escritura a menos que `--allow-exec` esté configurado.
- Al validar/aplicar planes que contienen exec, pase `--allow-exec` tanto en comandos de simulación como de escritura.

## Notas sobre el alcance de ejecución y auditoría

- Las entradas `auth-profiles.json` solo de referencia (`keyRef`/`tokenRef`) se incluyen en la resolución de tiempo de ejecución y la cobertura de auditoría.
- `secrets apply` escribe destinos `openclaw.json` compatibles, destinos `auth-profiles.json` compatibles y destinos de limpieza opcionales.

## Verificaciones del operador

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

Si apply falla con un mensaje de ruta de destino no válida, regenere el plan con `openclaw secrets configure` o corrija la ruta de destino a una forma compatible anteriormente.

## Documentos relacionados

- [Gestión de secretos](/es/gateway/secrets)
- [CLI `secrets`](/es/cli/secrets)
- [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)
- [Referencia de configuración](/es/gateway/configuration-reference)
