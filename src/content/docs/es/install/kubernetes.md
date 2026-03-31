---
summary: "Implementa OpenClaw Gateway en un clúster de Kubernetes con Kustomize"
read_when:
  - You want to run OpenClaw on a Kubernetes cluster
  - You want to test OpenClaw in a Kubernetes environment
title: "Kubernetes"
---

# OpenClaw en Kubernetes

Un punto de partida mínimo para ejecutar OpenClaw en Kubernetes; no es una implementación lista para producción. Cubre los recursos principales y está pensado para ser adaptado a su entorno.

## ¿Por qué no Helm?

OpenClaw es un solo contenedor con algunos archivos de configuración. La personalización interesante está en el contenido del agente (archivos markdown, habilidades, anulaciones de configuración), no en las plantillas de infraestructura. Kustomize gestiona las superposiciones sin la sobrecarga de un gráfico de Helm. Si su implementación se vuelve más compleja, se puede añadir un gráfico de Helm encima de estos manifiestos.

## Lo que necesita

- Un clúster de Kubernetes en ejecución (AKS, EKS, GKE, k3s, kind, OpenShift, etc.)
- `kubectl` conectado a su clúster
- Una clave de API para al menos un proveedor de modelos

## Inicio rápido

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

Recupere el token de la puerta de enlace y péguelo en la Interfaz de Control:

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

Para la depuración local, `./scripts/k8s/deploy.sh --show-token` imprime el token después de la implementación.

## Pruebas locales con Kind

Si no tiene un clúster, cree uno localmente con [Kind](https://kind.sigs.k8s.io/):

```bash
./scripts/k8s/create-kind.sh           # auto-detects docker or podman
./scripts/k8s/create-kind.sh --delete  # tear down
```

Luego implemente como de costumbre con `./scripts/k8s/deploy.sh`.

## Paso a paso

### 1) Implementar

**Opción A** — clave de API en el entorno (un paso):

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

El script crea un Secreto de Kubernetes con la clave de API y un token de puerta de enlace autogenerado, y luego implementa. Si el Secreto ya existe, conserva el token de puerta de enlace actual y cualquier clave de proveedor que no se esté cambiando.

**Opción B** — crear el secreto por separado:

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

Use `--show-token` con cualquiera de los dos comandos si desea que el token se imprima en stdout para pruebas locales.

### 2) Acceder a la puerta de enlace

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## Qué se implementa

```
Namespace: openclaw (configurable via OPENCLAW_NAMESPACE)
├── Deployment/openclaw        # Single pod, init container + gateway
├── Service/openclaw           # ClusterIP on port 18789
├── PersistentVolumeClaim      # 10Gi for agent state and config
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # Gateway token + API keys
```

## Personalización

### Instrucciones del agente

Edite el `AGENTS.md` en `scripts/k8s/manifests/configmap.yaml` y vuelva a implementar:

```bash
./scripts/k8s/deploy.sh
```

### Configuración de la puerta de enlace

Edite `openclaw.json` en `scripts/k8s/manifests/configmap.yaml`. Consulte [Configuración de la puerta de enlace](/en/gateway/configuration) para obtener la referencia completa.

### Añadir proveedores

Vuelva a ejecutar con claves adicionales exportadas:

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

Las claves de proveedor existentes permanecen en el Secreto a menos que las sobrescriba.

O aplique el parche al Secreto directamente:

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### Espacio de nombres personalizado

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### Imagen personalizada

Edite el campo `image` en `scripts/k8s/manifests/deployment.yaml`:

```yaml
image: ghcr.io/openclaw/openclaw:latest # or pin to a specific version from https://github.com/openclaw/openclaw/releases
```

### Exponer más allá del reenvío de puertos

Los manifiestos predeterminados vinculan la puerta de enlace al loopback dentro del pod. Esto funciona con `kubectl port-forward`, pero no funciona con un `Service` de Kubernetes o una ruta de Ingress que necesite alcanzar la IP del pod.

Si desea exponer la puerta de enlace a través de un Ingress o un balanceador de carga:

- Cambie el enlace de la puerta de enlace en `scripts/k8s/manifests/configmap.yaml` de `loopback` a un enlace que no sea de loopback que coincida con su modelo de implementación
- Mantenga la autenticación de la puerta de enlace habilitada y use un punto de entrada terminado correctamente con TLS
- Configure la interfaz de usuario de Control para el acceso remoto usando el modelo de seguridad web compatible (por ejemplo, HTTPS/Tailscale Serve y orígenes permitidos explícitos cuando sea necesario)

## Volver a implementar

```bash
./scripts/k8s/deploy.sh
```

Esto aplica todos los manifiestos y reinicia el pod para recoger cualquier cambio de configuración o secreto.

## Desmontar

```bash
./scripts/k8s/deploy.sh --delete
```

Esto elimina el espacio de nombres y todos los recursos en él, incluyendo el PVC.

## Notas de arquitectura

- La puerta de enlace se vincula al loopback dentro del pod de forma predeterminada, por lo que la configuración incluida es para `kubectl port-forward`
- Sin recursos con alcance de clúster; todo reside en un solo espacio de nombres
- Seguridad: `readOnlyRootFilesystem`, capacidades `drop: ALL`, usuario no root (UID 1000)
- La configuración predeterminada mantiene la interfaz de usuario de Control en la ruta de acceso local más segura: enlace de loopback más `kubectl port-forward` a `http://127.0.0.1:18789`
- Si avanza más allá del acceso localhost, use el modelo remoto compatible: HTTPS/Tailscale más la configuración de enlace de puerta de enlace y de origen de la interfaz de usuario de Control adecuada
- Los secretos se generan en un directorio temporal y se aplican directamente al clúster; no se escribe ningún material secreto en la copia del repositorio

## Estructura de archivos

```
scripts/k8s/
├── deploy.sh                   # Creates namespace + secret, deploys via kustomize
├── create-kind.sh              # Local Kind cluster (auto-detects docker/podman)
└── manifests/
    ├── kustomization.yaml      # Kustomize base
    ├── configmap.yaml          # openclaw.json + AGENTS.md
    ├── deployment.yaml         # Pod spec with security hardening
    ├── pvc.yaml                # 10Gi persistent storage
    └── service.yaml            # ClusterIP on 18789
```
