---
title: "Voice Wake"
summary: "mac 应用中的语音唤醒与按住说话模式及路由细节"
read_when:
  - 开发语音唤醒或 PTT 路径
---
# 语音唤醒与按住说话

## 模式
- **唤醒词模式**（默认）：常驻语音识别器等待触发词（`swabbleTriggerWords`）。匹配后开始捕获，显示带 partial 文本的覆盖层，并在静默后自动发送。
- **按住说话（右 Option 按住）**：按住右 Option 键立即开始捕获——无需触发词。按住期间显示覆盖层；松开后在短暂延迟后完成并转发，以便你微调文本。

## 运行时行为（唤醒词）
- 语音识别器位于 `VoiceWakeRuntime`。
- 仅当唤醒词与后续词之间存在 **明显停顿** 时才触发（约 0.55s 间隔）。覆盖层/提示音可能在命令开始前就因停顿而触发。
- 静默窗口：语音流动时 2.0s；若只听到触发词则 5.0s。
- 硬性终止：120s，防止会话失控。
- 会话间去抖：350ms。
- 覆盖层由 `VoiceWakeOverlayController` 驱动，含已提交/临时文本配色。
- 发送后识别器干净重启以继续监听下一次触发。

## 生命周期不变量
- 若启用 Voice Wake 且已授权，唤醒词识别器应保持监听（除显式按住说话捕获期间）。
- 覆盖层可见性（包括通过 X 手动关闭）不得阻止识别器恢复。

## 覆盖层卡住的故障模式（历史）
此前若覆盖层卡住且你手动关闭它，Voice Wake 可能看起来“失效”，因为运行时的重启被覆盖层可见性阻塞，且之后没有再次调度重启。

加固：
- 唤醒运行时重启不再受覆盖层可见性阻塞。
- 覆盖层 dismiss 完成会通过 `VoiceSessionCoordinator` 触发 `VoiceWakeRuntime.refresh(...)`，确保手动 X 关闭后总能恢复监听。

## 按住说话细节
- 热键检测使用全局 `.flagsChanged` 监听 **右 Option**（`keyCode 61` + `.option`）。只监听事件（不吞掉）。
- 捕获管线在 `VoicePushToTalk`：立即启动 Speech，向覆盖层流式传 partial，并在松开时调用 `VoiceWakeForwarder`。
- 按住说话开始时暂停唤醒词运行时，避免音频 tap 互相竞争；松开后自动重启。
- 权限：需要 Microphone + Speech；要看到事件还需 Accessibility/Input Monitoring 授权。
- 外接键盘：部分键盘可能不会按预期暴露右 Option——若用户反馈遗漏，提供备用快捷键。

## 面向用户的设置
- **Voice Wake** 开关：启用唤醒词运行时。
- **Hold Cmd+Fn to talk**：启用按住说话监听。在 macOS < 26 上禁用。
- 语言与麦克风选择器、实时电平表、触发词表、测试器（仅本地；不转发）。
- 麦克风选择器在设备断开时保留上次选择，显示断开提示，并暂时回退系统默认，直到设备恢复。
- **Sounds**：触发检测与发送提示音；默认 macOS “Glass” 系统音。每个事件可选择任意 `NSSound` 可加载的文件（如 MP3/WAV/AIFF）或选择 **No Sound**。

## 转发行为
- 启用 Voice Wake 时，转写会转发到当前 active 的 gateway/agent（与 mac 应用其他功能使用同样的本地/远程模式）。
- 回复会发送到 **最近使用的主提供商**（WhatsApp/Telegram/Discord/WebChat）。若发送失败，会记录错误，但仍可在 WebChat/session 日志中查看该运行。

## 转发负载
- `VoiceWakeForwarder.prefixedTranscript(_:)` 在发送前添加机器提示。唤醒词与按住说话路径共用。

## 快速验证
- 打开按住说话，按住 Cmd+Fn，说话，松开：覆盖层应显示 partial 并发送。
- 按住期间菜单栏耳朵应保持放大（使用 `triggerVoiceEars(ttl:nil)`）；松开后恢复。
