import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:provider/provider.dart';

class FocusView extends StatefulWidget {
  const FocusView({super.key});

  @override
  State<FocusView> createState() => _FocusViewState();
}

class _FocusViewState extends State<FocusView> {
  late FocusService _focusService;

  @override
  void initState() {
    super.initState();
  }



  @override
  Widget build(BuildContext context) {
    _focusService = Provider.of<FocusService>(context);
    
    return Scaffold(
      body: Column(
        children: [
          // Timer display - 使用圆形进度条，类似Kotlin demo的样式
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // 圆形进度条
                    SizedBox(
                      width: 300,
                      height: 300,
                      child: CircularProgressIndicator(
                        value: _focusService.state.mode == FocusMode.work 
                            ? (_focusService.state.minWorkDuration > 0 
                                ? 1.0 - (_focusService.state.timeInSeconds / _focusService.state.minWorkDuration) 
                                : 0)
                            : (_focusService.state.breakTotalDuration > 0 
                                ? 1.0 - (_focusService.state.timeInSeconds / _focusService.state.breakTotalDuration) 
                                : 0),
                        strokeWidth: 12,
                        backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _focusService.state.mode == FocusMode.work
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.tertiary,
                        ),
                      ),
                    ),
                    // 时间文本显示在中心
                    Text(
                      _focusService.formattedTime,
                      style: const TextStyle(
                        fontSize: 64,
                        fontWeight: FontWeight.bold,
                        fontFeatures: [FontFeature.tabularFigures()], // 确保数字等宽
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Controls area - 使用新的状态机来构建UI
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(20),
              child: _buildControls(_focusService.state.uiState),
            ),
          ),
          
          // Bottom action buttons - 类似Google时钟的底部按钮布局
          _buildBottomActionButtons(_focusService.state.uiState),
        ],
      ),
      // 移除FAB，将所有操作按钮统一到底部操作区
    );
  }

  // 构建主控制按钮（FAB）
  Widget? _buildFab(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return FloatingActionButton(
          onPressed: _focusService.startFocus,
          child: const Icon(Icons.play_arrow),
        );
      case FocusUiState.runningFocus:
        // 在运行专注时，显示暂停按钮
        return FloatingActionButton(
          onPressed: _focusService.pauseFocus,
          child: const Icon(Icons.pause),
        );
      case FocusUiState.runningRest:
        return FloatingActionButton(
          onPressed: _focusService.pauseRest,
          child: const Icon(Icons.pause),
        );
      case FocusUiState.pausedFocus:
      case FocusUiState.pausedRest:
        // 不应该出现这个状态，因为我们直接转到调整模式
        return null; 
      case FocusUiState.adjusting:
        return null; // 调整时隐藏主按钮
      case FocusUiState.goalMet:
        // 在目标达成时，显示开始休息按钮
        return FloatingActionButton(
          onPressed: _focusService.startBreak,
          child: const Icon(Icons.free_breakfast),
          backgroundColor: Colors.green,
        );
    }
  }

  // 通用按钮行组件 - 支持左右两个按钮
  Widget _buildButtonRow(Widget leftButton, Widget rightButton) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        leftButton,
        rightButton,
      ],
    );
  }

  // 通用按钮组件 - 简化按钮创建过程
  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    Color? backgroundColor,
  }) {
    return ElevatedButton.icon(
      icon: Icon(icon),
      label: Text(label),
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        minimumSize: const Size(120, 56),
      ),
    );
  }

  // 构建辅助控制按钮区域
  Widget _buildControls(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return const SizedBox.shrink(); // 空容器，因为按钮已移动到底部

      case FocusUiState.adjusting:
        return SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(onPressed: () => _focusService.adjustTime(-30), child: const Text('-30s')),
                  const SizedBox(width: 16),
                  Text(
                    '${_focusService.deltaAdjustmentInSeconds >= 0 ? '+' : ''}${_focusService.deltaAdjustmentInSeconds}s', 
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton(onPressed: () => _focusService.adjustTime(30), child: const Text('+30s')),
                ],
              ),
            ],
          ),
        );

      case FocusUiState.goalMet:
        return Center(
          child: _buildActionButton(
            icon: Icons.free_breakfast,
            label: 'Start Rest',
            onPressed: _focusService.startBreak,
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          ),
        );

      case FocusUiState.runningFocus:
      case FocusUiState.runningRest:
        // 在计时运行时，使用底部按钮，主区域为空
        return const SizedBox.shrink();
      case FocusUiState.pausedFocus:
        // 不应该出现这个状态，因为我们直接转到调整模式
        return const SizedBox.shrink(); 
      case FocusUiState.pausedRest:
        // 在暂停休息时显示调整控件
        return SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(onPressed: () => _focusService.adjustTime(-30), child: const Text('-30s')),
                  const SizedBox(width: 16),
                  Text(
                    '${_focusService.deltaAdjustmentInSeconds >= 0 ? '+' : ''}${_focusService.deltaAdjustmentInSeconds}s', 
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton(onPressed: () => _focusService.adjustTime(30), child: const Text('+30s')),
                ],
              ),
              const SizedBox(height: 16),
              _buildActionButton(
                icon: Icons.check,
                label: 'Apply',
                onPressed: _focusService.applyTimeAdjustment,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              ),
            ],
          ),
        );
    }
  }

  void _showSetGoalDialog() {
    int minutes = (_focusService.state.minWorkDuration ~/ 60);
    final controller = TextEditingController(text: minutes.toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Set Min Focus Time'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            hintText: 'Enter minutes',
            labelText: 'Min Focus Time (minutes)',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final value = int.tryParse(controller.text);
              if (value != null && value > 0) {
                _focusService.setMinFocusTime(value * 60); // 转换为秒
              }
              Navigator.pop(context);
            },
            child: const Text('Set'),
          ),
        ],
      ),
    );
  }

  // 构建底部操作按钮 - 类似Kotlin demo的布局
  Widget _buildBottomActionButtons(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Tooltip(
                message: 'Set Goal',
                child: FloatingActionButton(
                  onPressed: _showSetGoalDialog,
                  child: const Icon(Icons.settings),
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                ),
              ),
              Tooltip(
                message: 'Start',
                child: FloatingActionButton(
                  onPressed: _focusService.startFocus,
                  child: const Icon(Icons.play_arrow),
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                ),
              ),
            ],
          ),
        );
      case FocusUiState.runningFocus:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Tooltip(
                message: 'Pause',
                child: FloatingActionButton(
                  onPressed: _focusService.pauseFocus,
                  child: _focusService.state.isActive ? const Icon(Icons.pause) : const Icon(Icons.play_arrow),
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                  elevation: 0, // 移除按钮阴影
                  highlightElevation: 1, // 按下时的 elevation
                ),
              ),
              // 休息按钮（根据是否解锁显示不同状态）
              Tooltip(
                message: _focusService.state.isBreakUnlocked 
                    ? 'Rest (${(_focusService.state.earnedBreakSeconds ~/ 60).toString().padLeft(2, '0')}:${(_focusService.state.earnedBreakSeconds % 60).toString().padLeft(2, '0')})' 
                    : 'Rest Locked',
                child: ElevatedButton.icon(
                  icon: Icon(
                    _focusService.state.isBreakUnlocked ? Icons.free_breakfast : Icons.lock,
                    // 添加视觉提示：未解锁时图标更暗淡
                    color: _focusService.state.isBreakUnlocked 
                        ? null 
                        : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
                  label: const SizedBox.shrink(), // 隐藏标签文字
                  onPressed: _focusService.state.isBreakUnlocked 
                      ? _focusService.startBreak 
                      : null, // 按钮禁用状态更明确
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _focusService.state.isBreakUnlocked 
                        ? Theme.of(context).colorScheme.primaryContainer 
                        : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                    minimumSize: const Size(60, 60), // 调整为圆形按钮大小
                    elevation: 0, // 移除按钮阴影
                    shape: const CircleBorder(), // 圆形按钮
                  ),
                ),
              ),
            ],
          ),
        );
      case FocusUiState.runningRest:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Tooltip(
                message: 'Back to Focus',
                child: FloatingActionButton(
                  onPressed: _focusService.endBreak,
                  child: const Icon(Icons.assignment),
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  elevation: 0, // 移除按钮阴影
                  highlightElevation: 1, // 按下时的 elevation
                ),
              ),
              Tooltip(
                message: 'Skip & Focus',
                child: FloatingActionButton(
                  onPressed: () {
                    _focusService.endBreak();
                    _focusService.startFocus();
                  },
                  child: const Icon(Icons.fast_forward),
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                  elevation: 0, // 移除按钮阴影
                  highlightElevation: 1, // 按下时的 elevation
                ),
              ),
            ],
          ),
        );
      case FocusUiState.adjusting:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 跳过并休息按钮
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: Tooltip(
                  message: 'Skip to Rest',
                  child: FloatingActionButton(
                    onPressed: _focusService.advancedBreak,
                    child: const Icon(Icons.fast_forward),
                    backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
                    elevation: 0, // 移除按钮阴影
                    highlightElevation: 1, // 按下时的 elevation
                  ),
                ),
              ),
              // 取消和应用按钮行
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Tooltip(
                    message: 'Discard',
                    child: FloatingActionButton(
                      onPressed: _focusService.discardTimeAdjustment,
                      child: const Icon(Icons.close),
                      backgroundColor: Theme.of(context).colorScheme.errorContainer,
                      elevation: 0, // 移除按钮阴影
                      highlightElevation: 1, // 按下时的 elevation
                    ),
                  ),
                  Tooltip(
                    message: 'Apply',
                    child: FloatingActionButton(
                      onPressed: _focusService.applyTimeAdjustment,
                      child: const Icon(Icons.check),
                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                      elevation: 0, // 移除按钮阴影
                      highlightElevation: 1, // 按下时的 elevation
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      case FocusUiState.goalMet:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Tooltip(
                message: 'Start Rest',
                child: FloatingActionButton(
                  onPressed: _focusService.startBreak,
                  child: const Icon(Icons.free_breakfast),
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  elevation: 0, // 移除按钮阴影
                  highlightElevation: 1, // 按下时的 elevation
                ),
              ),
            ],
          ),
        );
      case FocusUiState.pausedFocus:
        // 不应该出现这个状态，因为我们直接转到调整模式
        return Container(); 
      case FocusUiState.pausedRest:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Tooltip(
                message: 'Discard',
                child: FloatingActionButton(
                  onPressed: _focusService.discardTimeAdjustment,
                  child: const Icon(Icons.close),
                  backgroundColor: Theme.of(context).colorScheme.errorContainer,
                  elevation: 0, // 移除按钮阴影
                  highlightElevation: 1, // 按下时的 elevation
                ),
              ),
              Tooltip(
                message: 'Resume',
                child: FloatingActionButton(
                  onPressed: () {
                    _focusService.resumeRest();
                  },
                  child: const Icon(Icons.play_arrow),
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  elevation: 0, // 移除按钮阴影
                  highlightElevation: 1, // 按下时的 elevation
                ),
              ),
            ],
          ),
        );
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}