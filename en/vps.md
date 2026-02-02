---
summary: "VPS hosting hub for OpenClaw (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - You want to run the Gateway in the cloud
  - You need a quick map of VPS/hosting guides
title: "VPS Hosting"
---

# VPS hosting

This hub links to the supported VPS/hosting guides and explains how cloud
deployments work at a high level.

## Pick a provider

- **Railway** (one‑click + browser setup): [Railway](/en/railway)
- **Northflank** (one‑click + browser setup): [Northflank](/en/northflank)
- **Oracle Cloud (Always Free)**: [Oracle](/en/platforms/oracle) — $0/month (Always Free, ARM; capacity/signup can be finicky)
- **Fly.io**: [Fly.io](/en/platforms/fly)
- **Hetzner (Docker)**: [Hetzner](/en/platforms/hetzner)
- **GCP (Compute Engine)**: [GCP](/en/platforms/gcp)
- **exe.dev** (VM + HTTPS proxy): [exe.dev](/en/platforms/exe-dev)
- **AWS (EC2/Lightsail/free tier)**: works well too. Video guide:
  https://x.com/techfrenAJ/status/2014934471095812547

## How cloud setups work

- The **Gateway runs on the VPS** and owns state + workspace.
- You connect from your laptop/phone via the **Control UI** or **Tailscale/SSH**.
- Treat the VPS as the source of truth and **back up** the state + workspace.
- Secure default: keep the Gateway on loopback and access it via SSH tunnel or Tailscale Serve.
  If you bind to `lan`/`tailnet`, require `gateway.auth.token` or `gateway.auth.password`.

Remote access: [Gateway remote](/en/gateway/remote)  
Platforms hub: [Platforms](/en/platforms)

## Using nodes with a VPS

You can keep the Gateway in the cloud and pair **nodes** on your local devices
(Mac/iOS/Android/headless). Nodes provide local screen/camera/canvas and `system.run`
capabilities while the Gateway stays in the cloud.

Docs: [Nodes](/en/nodes), [Nodes CLI](/en/cli/nodes)
