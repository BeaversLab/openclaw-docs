---
title: "Location command（nodes）"
summary: "Nodes 的定位命令（location.get）、权限模式与后台行为"
read_when:
  - 添加定位 node 支持或权限 UI
  - 设计后台定位 + 推送流程
---

# Location command（nodes）

## TL;DR
- `location.get` 是 node 命令（通过 `node.invoke`）。
- 默认关闭。
- 设置项为选择器：Off / While Using / Always。
- 另有独立开关：Precise Location。

## 为什么用选择器（而不是单个开关）

OS 权限是多级的。我们可以在应用内提供选择器，但实际授权仍由 OS 决定。
- iOS/macOS：用户可在系统提示/设置中选择 **While Using** 或 **Always**。应用可请求升级，但 OS 可能要求用户进入设置。
- Android：后台定位是独立权限；Android 10+ 通常需要进入设置流程。
- 精确定位是独立授权（iOS 14+ 的 “Precise”，Android 的 “fine” vs “coarse”）。

UI 中的选择器驱动我们的请求模式；实际授权来自 OS 设置。

## 设置模型

每个 node 设备：
- `location.enabledMode`: `off | whileUsing | always`
- `location.preciseEnabled`: bool

UI 行为：
- 选择 `whileUsing` 时请求前台权限。
- 选择 `always` 时先确保 `whileUsing`，再请求后台（必要时引导到设置）。
- 如果 OS 拒绝请求级别，回退到已授予的最高级别并显示状态。

## 权限映射（node.permissions）

可选。macOS node 会通过 permissions map 上报 `location`；iOS/Android 可能不提供。

## 命令：`location.get`

通过 `node.invoke` 调用。

参数（建议）：
```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

响应 payload：
```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

错误（稳定码）：
- `LOCATION_DISABLED`：选择器为 off。
- `LOCATION_PERMISSION_REQUIRED`：缺少请求模式所需权限。
- `LOCATION_BACKGROUND_UNAVAILABLE`：应用在后台，且仅允许 While Using。
- `LOCATION_TIMEOUT`：超时未定位。
- `LOCATION_UNAVAILABLE`：系统错误 / 无可用提供方。

## 后台行为（未来）

目标：模型可在 node 后台时请求定位，但仅在满足以下条件时：
- 用户选择 **Always**。
- OS 授予后台定位权限。
- 应用允许后台定位运行（iOS 后台模式 / Android 前台服务或特殊许可）。

推送触发流程（未来）：
1) Gateway 向 node 发送推送（静默推送或 FCM data）。
2) Node 短暂唤醒并请求定位。
3) Node 将 payload 发送回 Gateway。

注意：
- iOS：需 Always 权限 + 后台定位模式。静默推送可能被限流；预计会间歇失败。
- Android：后台定位可能需要前台服务，否则可能被拒绝。

## 模型/工具集成
- 工具面：`nodes` 工具添加 `location_get` action（需要 node）。
- CLI：`openclaw nodes location get --node <id>`。
- Agent 指南：仅在用户启用定位且理解范围时调用。

## UX 文案（建议）
- Off：“Location sharing is disabled.”
- While Using：“Only when OpenClaw is open.”
- Always：“Allow background location. Requires system permission.”
- Precise：“Use precise GPS location. Toggle off to share approximate location.”
