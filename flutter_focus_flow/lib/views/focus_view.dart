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
      appBar: AppBar(
        title: const Text('Focus Flow'),
        centerTitle: true,
        actions: [
          // 显示undo按钮在apply后或调整状态时
          if (_focusService.previousState != null && 
              (_focusService.deltaAdjustmentInSeconds != 0 || _focusService.hasAppliedAdjustment))
            TextButton(
              onPressed: _focusService.undo,
              child: const Text('Undo'),
            ),
        ],
      ),
      body: Column(
        children: [
          // Timer display - 主显示区域始终占用固定比例空间
          Expanded(
            flex: 2,
            child: Container(
              margin: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _focusService.formattedTime,
                        style: const TextStyle(
                          fontSize: 64,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        _focusService.state.mode == FocusMode.work 
                          ? (_focusService.state.isActive 
                              ? 'Focus Time' 
                              : _focusService.isAdjustedGoalReached 
                                  ? 'Goal Reached!' 
                                  : 'Focus Time')
                          : (_focusService.state.isActive ? 'Rest Time' : 'Rest Time'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 10),
                      // 显示赚取的休息时间（始终占据空间以保持布局稳定）
                      SizedBox(
                        height: _focusService.state.mode == FocusMode.work && _focusService.state.timeInSeconds > 0 ? null : 0,
                        child: Text(
                          _focusService.state.mode == FocusMode.work && _focusService.state.timeInSeconds > 0
                            ? 'Earned Rest: ${(_focusService.state.earnedBreakSeconds ~/ 60).toString().padLeft(2, '0')}:${(_focusService.state.earnedBreakSeconds % 60).toString().padLeft(2, '0')}'
                            : '',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                      // 显示是否解锁休息（始终占据空间以保持布局稳定）
                      SizedBox(
                        height: _focusService.state.mode == FocusMode.work ? null : 0,
                        child: Text(
                          _focusService.state.mode == FocusMode.work
                            ? (_focusService.state.isBreakUnlocked ? 'Break Unlocked!' : 'Work to unlock break')
                            : '',
                          style: TextStyle(
                            color: _focusService.state.isBreakUnlocked 
                                ? Theme.of(context).colorScheme.primary 
                                : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
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
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: _buildButtonRow(
            _buildActionButton(
              icon: Icons.settings,
              label: 'Set Goal',
              onPressed: _showSetGoalDialog,
            ),
            _buildActionButton(
              icon: Icons.play_arrow,
              label: 'Start',
              onPressed: _focusService.startFocus,
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            ),
          ),
        );

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
                  Text(_focusService.formattedDeltaAdjustment, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 16),
                  OutlinedButton(onPressed: () => _focusService.adjustTime(30), child: const Text('+30s')),
                ],
              ),
              const SizedBox(height: 16),
              _buildActionButton(
                icon: Icons.fast_forward,
                label: 'Complete & Rest',
                onPressed: _focusService.advancedBreak,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
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
      case FocusUiState.pausedFocus:
        return const SizedBox.shrink(); // 运行时，辅助区域为空
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
                  Text(_focusService.formattedDeltaAdjustment, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
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

  // 构建底部操作按钮 - 类似Google时钟的布局
  Widget _buildBottomActionButtons(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return Container(); // 空容器
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
                icon: const Icon(Icons.pause),
                backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
              ),
              // 开始休息按钮（根据是否解锁显示不同状态）
              _buildActionButton(
                icon: _focusService.state.isBreakUnlocked ? Icons.free_breakfast : Icons.lock,
                label: _focusService.state.isBreakUnlocked ? 'Rest' : 'Lock',
                onPressed: _focusService.state.isBreakUnlocked 
                    ? _focusService.startBreak 
                    : () {}, // 空函数，按钮不可用但仍可点击，或者使用下面的方法禁用
                backgroundColor: _focusService.state.isBreakUnlocked 
                    ? Theme.of(context).colorScheme.primaryContainer 
                    : Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
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
              // 返回专注按钮 (backtofocus)
              FloatingActionButton.extended(
                onPressed: _focusService.endBreak,
                label: const Text('Back to Focus'),
                icon: const Icon(Icons.assignment),
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              ),
              // 跳过休息并专注按钮 (skipandfocus)
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
              // 应用并恢复按钮
              FloatingActionButton.extended(
                onPressed: _focusService.applyTimeAdjustment,
                label: const Text('Apply'),
                icon: const Icon(Icons.check),
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
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