---
summary: "Referencia de CLI para `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secretos"
---

# `openclaw secrets`

Use `openclaw secrets` para administrar SecretRefs y mantener la instantánea de runtime activa sana.

Roles de comando:

- `reload`: RPC de gateway (`secrets.reload`) que resuelve nuevamente las referencias e intercambia la instantánea de runtime solo si tiene éxito total (no escribe configuración).
- `audit`: escaneo de solo lectura de los almacenes de configuración/autenticación/modelo-generado y residuos heredados para texto sin formato, referencias sin resolver y deriva de precedencia (las referencias de ejecución se omiten a menos que se establezca `--allow-exec`).
- `configure`: planificador interactivo para la configuración del proveedor, mapeo de destino y verificación previa (se requiere TTY).
- `apply`: ejecuta un plan guardado (`--dry-run` para validación únicamente; la ejecución en seco omite las verificaciones de ejecución de forma predeterminada, y el modo de escritura rechaza los planes que contienen ejecuciones a menos que se establezca `--allow-exec`), y luego depura los residuos de texto sin formato objetivo.

Bucle de operador recomendado:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Si su plan incluye `exec` SecretRefs/proveedores, pase `--allow-exec` en los comandos de aplicación de ejecución en seco y de escritura.

Nota del código de salida para CI/compuertas:

- `audit --check` devuelve `1` en los hallazgos.
- las referencias no resueltas devuelven `2`.

Relacionado:

- Guía de Secrets: [Secrets Management](/es/gateway/secrets)
- Superficie de credenciales: [SecretRef Credential Surface](/es/reference/secretref-credential-surface)
- Guía de seguridad: [Security](/es/gateway/security)

## Recargar instantánea de tiempo de ejecución

Resolver referencias de secretos nuevamente e intercambiar la instantánea de tiempo de ejecución de forma atómica.

```bash
openclaw secrets reload
openclaw secrets reload --json
```

Notas:

- Usa el método RPC de puerta de enlace `secrets.reload`.
- Si la resolución falla, la puerta de enlace mantiene la última instantánea conocida como buena y devuelve un error (sin activación parcial).
- La respuesta JSON incluye `warningCount`.

## Auditoría

Escanear el estado de OpenClaw para:

- almacenamiento de secretos en texto sin formato
- referencias sin resolver
- precedencia de deriva (`auth-profiles.json` credenciales de sombreado `openclaw.json` refs)
- residuos `agents/*/agent/models.json` generados (valores `apiKey` del proveedor y cabeceras sensibles del proveedor)
- residuos heredados (entradas de almacén de autenticación heredadas, recordatorios de OAuth)

Nota sobre residuos de cabecera:

- La detección de cabeceras sensibles del proveedor se basa en heurística de nombres (nombres comunes de cabeceras de autenticación/credenciales y fragmentos como `authorization`, `x-api-key`, `token`, `secret`, `password` y `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

Comportamiento de salida:

- `--check` sale con un valor distinto de cero si hay hallazgos.
- las referencias no resueltas salen con un código distinto de cero de mayor prioridad.

Aspectos destacados del informe:

- `status`: `clean | findings | unresolved`
- `resolution`: `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary`: `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- códigos de hallazgo:
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurar (asistente interactivo)

Cree cambios de proveedor y SecretRef de forma interactiva, ejecute una verificación previa y, opcionalmente, aplíquelos:

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

Flujo:

- Primero la configuración del proveedor (`add/edit/remove` para los alias `secrets.providers`).
- Segundo el mapeo de credenciales (seleccione campos y asigne referencias `{source, provider, id}`).
- Último, la verificación previa y la aplicación opcional.

Opciones:

- `--providers-only`: configure `secrets.providers` only, skip credential mapping.
- `--skip-provider-setup`: skip provider setup and map credentials to existing providers.
- `--agent <id>`: scope `auth-profiles.json` target discovery and writes to one agent store.
- `--allow-exec`: allow exec SecretRef checks during preflight/apply (may execute provider commands).

Notas:

- Requiere un TTY interactivo.
- No puedes combinar `--providers-only` con `--skip-provider-setup`.
- `configure` apunta a campos con secretos en `openclaw.json` más `auth-profiles.json` para el alcance de agente seleccionado.
- `configure` admite la creación de nuevos mapeos de `auth-profiles.json` directamente en el flujo del selector.
- Superficie canónica soportada: [SecretRef Credential Surface](/es/reference/secretref-credential-surface).
- Realiza la resolución previa al vuelo antes de aplicar.
- Si la verificación previa o la aplicación incluye referencias exec, mantenga `--allow-exec` configurado para ambos pasos.
- Los planes generados por defecto a las opciones de limpieza (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` todos habilitados).
- La ruta de aplicación es unidireccional para los valores de texto plano limpiados.
- Sin `--apply`, la CLI aún solicita `Apply this plan now?` después de la verificación previa.
- Con `--apply` (y sin `--yes`), la CLI solicita una confirmación irreversible adicional.

Nota de seguridad del proveedor Exec:

- Las instalaciones de Homebrew a menudo exponen binarios enlazados simbólicamente bajo `/opt/homebrew/bin/*`.
- Establezca `allowSymlinkCommand: true` solo cuando sea necesario para rutas de administradores de paquetes de confianza, y combínelo con `trustedDirs` (por ejemplo `["/opt/homebrew"]`).
- En Windows, si la verificación de ACL no está disponible para una ruta de proveedor, OpenClaw falla de forma cerrada. Solo para rutas de confianza, establezca `allowInsecurePath: true` en ese proveedor para omitir las comprobaciones de seguridad de la ruta.

## Aplicar un plan guardado

Aplique o realice un vuelo de prueba de un plan generado previamente:

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Comportamiento de ejecución:

- `--dry-run` valida el vuelo de prueba sin escribir archivos.
- Las comprobaciones de exec SecretRef se omiten de forma predeterminada en la ejecución en seco.
- el modo de escritura rechaza los planes que contienen exec SecretRefs/proveedores a menos que se establezca `--allow-exec`.
- Use `--allow-exec` para aceptar las comprobaciones/ejecución del proveedor exec en cualquiera de los dos modos.

Detalles del contrato del plan (rutas de destino permitidas, reglas de validación y semántica de fallas):

- [Contrato del plan de aplicación de Secrets](/es/gateway/secrets-plan-contract)

Qué puede actualizar `apply`:

- `openclaw.json` (objetivos SecretRef + inserciones/eliminaciones de proveedores)
- `auth-profiles.json` (limpieza del objetivo del proveedor)
- residuos `auth.json` heredados
- `~/.openclaw/.env` claves secretas conocidas cuyos valores fueron migrados

## Por qué no hay copias de seguridad de reversión

`secrets apply` intencionalmente no escribe copias de seguridad de reversión que contengan valores de texto sin cifrar antiguos.

La seguridad proviene de una verificación previa estricta + una aplicación casi atómica con una restauración en memoria de mejor esfuerzo en caso de fallo.

## Ejemplo

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` todavía informa de hallazgos de texto sin cifrar, actualice las rutas de destino informadas restantes y vuelva a ejecutar la auditoría.
