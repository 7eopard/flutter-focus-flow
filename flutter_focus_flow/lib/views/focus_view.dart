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
              // 设置目标按钮
              FloatingActionButton.extended(
                onPressed: _showSetGoalDialog,
                label: const Text('Set Goal'),
                icon: const Icon(Icons.settings),
                backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
              ),
              // 开始按钮
              FloatingActionButton.extended(
                onPressed: _focusService.startFocus,
                label: const Text('Start'),
                icon: const Icon(Icons.play_arrow),
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
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
              // 暂停按钮
              FloatingActionButton.extended(
                onPressed: _focusService.pauseFocus,
                label: const Text('Pause'),
                icon: _focusService.state.isActive ? const Icon(Icons.pause) : const Icon(Icons.play_arrow),
                backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
              ),
              // 休息按钮（根据是否解锁显示不同状态）
              ElevatedButton.icon(
                icon: Icon(
                  _focusService.state.isBreakUnlocked ? Icons.free_breakfast : Icons.lock,
                  // 添加视觉提示：未解锁时图标更暗淡
                  color: _focusService.state.isBreakUnlocked 
                      ? null 
                      : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                ),
                label: Text(
                  _focusService.state.isBreakUnlocked 
                      ? 'Rest (${(_focusService.state.earnedBreakSeconds ~/ 60).toString().padLeft(2, '0')}:${(_focusService.state.earnedBreakSeconds % 60).toString().padLeft(2, '0')})' 
                      : 'Rest (00:00)', // 显示"Rest"但用不同样式来表示锁定状态
                  style: TextStyle(
                    color: _focusService.state.isBreakUnlocked 
                        ? null 
                        : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
                onPressed: _focusService.state.isBreakUnlocked 
                    ? _focusService.startBreak 
                    : null, // 按钮禁用状态更明确
                style: ElevatedButton.styleFrom(
                  backgroundColor: _focusService.state.isBreakUnlocked 
                      ? Theme.of(context).colorScheme.primaryContainer 
                      : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                  minimumSize: const Size(120, 56),
                  shape: RoundedRectangleBorder( // 确保一致的圆角
                    borderRadius: BorderRadius.circular(12),
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
              // 返回专注按钮
              FloatingActionButton.extended(
                onPressed: _focusService.endBreak,
                label: const Text('Back to Focus'),
                icon: const Icon(Icons.assignment),
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              ),
              // 跳过休息并专注按钮
              FloatingActionButton.extended(
                onPressed: () {
                  _focusService.endBreak();
                  _focusService.startFocus();
                },
                label: const Text('Skip & Focus'),
                icon: const Icon(Icons.fast_forward),
                backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
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
                child: FloatingActionButton.extended(
                  onPressed: _focusService.advancedBreak,
                  label: const Text('Skip to Rest'),
                  icon: const Icon(Icons.fast_forward),
                  backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
                ),
              ),
              // 取消和应用按钮行
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // 取消并恢复按钮
                  FloatingActionButton.extended(
                    onPressed: _focusService.discardTimeAdjustment,
                    label: const Text('Discard'),
                    icon: const Icon(Icons.close),
                    backgroundColor: Theme.of(context).colorScheme.errorContainer,
                  ),
                  // 应用并恢复按钮
                  FloatingActionButton.extended(
                    onPressed: _focusService.applyTimeAdjustment,
                    label: const Text('Apply'),
                    icon: const Icon(Icons.check),
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
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
              // 开始休息按钮
              FloatingActionButton.extended(
                onPressed: _focusService.startBreak,
                label: const Text('Start Rest'),
                icon: const Icon(Icons.free_breakfast),
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
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
              // 取消并恢复按钮
              FloatingActionButton.extended(
                onPressed: _focusService.discardTimeAdjustment,
                label: const Text('Discard'),
                icon: const Icon(Icons.close),
                backgroundColor: Theme.of(context).colorScheme.errorContainer,
              ),
              // 恢复休息按钮
              FloatingActionButton.extended(
                onPressed: () {
                  _focusService.resumeRest();
                },
                label: const Text('Resume'),
                icon: const Icon(Icons.play_arrow),
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
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