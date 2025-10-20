import 'dart:async';
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

  // 显示通知的方法
  void _showNotification(String message) {
    // 为简单起见，使用SnackBar，但可以自定义为在navbar上方显示
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.grey[800],
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(
          bottom: 80, // 80是大致的navbar高度
          left: 16,
          right: 16,
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // 尝试开始休息的方法（当没有解锁时会失败）
  void _tryStartBreak() {
    if (!_focusService.state.isBreakUnlocked) {
      _showNotification('Goal not reached yet! Keep focusing to unlock break.');
    } else {
      _focusService.startBreak();
    }
  }

  // 检查是否可以进行交互（开始后且暂停时）
  bool _canInteract() {
    // 只有在计时器已开始（timeInSeconds > 0）且当前处于暂停状态时才能交互
    return _focusService.state.timeInSeconds > 0 && !_focusService.state.isActive;
  }

  // 尝试高级休息的方法
  void _tryAdvancedBreak() {
    if (!_canInteract()) {
      _showNotification('Timer must be started and paused to use advanced break.');
    } else if (_focusService.state.mode == FocusMode.rest) {
      _showNotification('Cannot use advanced break during rest mode.');
    } else {
      _focusService.advancedBreak();
    }
  }

  @override
  Widget build(BuildContext context) {
    _focusService = Provider.of<FocusService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Focus Flow'),
        centerTitle: true,
        actions: [
          if (_focusService.previousState != null)
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
                          : 'Rest Time',
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
                            color: _focusService.state.isBreakUnlocked ? Colors.green : Colors.grey,
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
        ],
      ),
      // 使用FAB作为主要的交互按钮
      floatingActionButton: _buildFab(_focusService.state.uiState),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  // 构建主控制按钮（FAB）
  Widget? _buildFab(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
      case FocusUiState.paused:
        return FloatingActionButton(
          onPressed: _focusService.startFocus,
          child: const Icon(Icons.play_arrow),
        );
      case FocusUiState.running:
      case FocusUiState.goalMet:
        return FloatingActionButton(
          onPressed: _focusService.pauseFocus,
          child: const Icon(Icons.pause),
        );
      case FocusUiState.restingRunning:
        return FloatingActionButton(
          onPressed: _focusService.pauseRest,
          child: const Icon(Icons.pause),
        );
      case FocusUiState.restingPaused:
        return FloatingActionButton(
          onPressed: _focusService.resumeRest,
          child: const Icon(Icons.play_arrow),
        );
      case FocusUiState.adjusting:
        return null; // 调整时隐藏主按钮
    }
  }

  // 构建辅助控制按钮区域
  Widget _buildControls(FocusUiState uiState) {
    switch (uiState) {
      case FocusUiState.idle:
        return Center(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.settings),
            label: const Text('Set Goal'),
            onPressed: _showSetGoalDialog,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(200, 56),
            ),
          ),
        );

      case FocusUiState.paused:
        return SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton.icon(
                icon: const Icon(Icons.edit),
                label: const Text('Adjust Time'),
                onPressed: _focusService.beginTimeAdjustment,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(200, 56),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.fast_forward),
                label: const Text('Complete & Rest'),
                onPressed: _focusService.advancedBreak,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(200, 56),
                ),
              ),
            ],
          ),
        );

      case FocusUiState.adjusting:
        return SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Adjust Time', style: TextStyle(fontSize: 18)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton(onPressed: () => _focusService.adjustTime(-30), child: const Text('-30s')),
                  const SizedBox(width: 16),
                  Text(_focusService.formattedAdjustedTime, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 16),
                  OutlinedButton(onPressed: () => _focusService.adjustTime(30), child: const Text('+30s')),
                ],
              ),
              const SizedBox(height: 24),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8.0,
                runSpacing: 8.0,
                children: [
                  FilledButton.icon(
                    onPressed: _focusService.applyTimeAdjustment, // 已包含恢复逻辑
                    icon: const Icon(Icons.check),
                    label: const Text('Apply & Resume'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _focusService.discardTimeAdjustment, // 已包含恢复逻辑
                    icon: const Icon(Icons.close),
                    label: const Text('Discard & Resume'),
                  ),
                ],
              )
            ],
          ),
        );

      case FocusUiState.goalMet:
        return Center(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.free_breakfast),
            label: const Text('Start Rest'),
            onPressed: _focusService.startBreak,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              minimumSize: const Size(200, 56),
            ),
          ),
        );

      case FocusUiState.restingPaused:
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.stop),
              label: const Text('Stop Rest'),
              onPressed: _focusService.endBreak,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.withOpacity(0.8),
              ),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.play_circle_fill),
              label: const Text('Focus Now'),
              onPressed: _focusService.startNextFocusSession,
            ),
          ],
        );

      case FocusUiState.running:
      case FocusUiState.restingRunning:
      default:
        return const SizedBox.shrink(); // 运行时和休息时，辅助区域为空
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

  @override
  void dispose() {
    super.dispose();
  }
}