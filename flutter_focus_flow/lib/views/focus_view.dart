import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/timer_service.dart';
import 'package:provider/provider.dart';

class FocusView extends StatefulWidget {
  const FocusView({super.key});

  @override
  State<FocusView> createState() => _FocusViewState();
}

class _FocusViewState extends State<FocusView> {
  late TimerService _timerService;

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
    if (!_timerService.state.isBreakUnlocked) {
      _showNotification('Goal not reached yet! Keep focusing to unlock break.');
    } else {
      _timerService.startBreak();
    }
  }

  // 尝试高级休息的方法
  void _tryAdvancedBreak() {
    if (_timerService.state.mode == TimerMode.rest) {
      _showNotification('Cannot use advanced break during rest mode.');
    } else if (_timerService.state.isActive) {
      _showNotification('Please pause first to use advanced break.');
    } else {
      _timerService.advancedBreak();
    }
  }

  @override
  Widget build(BuildContext context) {
    _timerService = Provider.of<TimerService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Focus Timer'),
        centerTitle: true,
        actions: [
          // Debug flag in the top right corner
          IconButton(
            icon: const Icon(Icons.bug_report),
            onPressed: () {
              // Debug functionality can be added here
              print('Debug mode activated');
              print('Timer State: ${_timerService.state}');
              print('Time Adjusted: ${_timerService.state.timeAdjustment}');
              print('Mode: ${_timerService.state.mode}');
              print('Is Active: ${_timerService.state.isActive}');
            },
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
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _timerService.formattedTime,
                    style: const TextStyle(
                      fontSize: 64,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    _timerService.state.mode == TimerMode.work 
                      ? (_timerService.state.isActive 
                          ? 'Focus Time' 
                          : _timerService.isAdjustedGoalReached 
                              ? 'Goal Reached!' 
                              : 'Focus Time')
                      : 'Rest Time',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 10),
                  // 显示赚取的休息时间
                  if (_timerService.state.mode == TimerMode.work && _timerService.state.timeInSeconds > 0)
                    Text(
                      'Earned Rest: ${(_timerService.state.earnedBreakSeconds ~/ 60).toString().padLeft(2, '0')}:${(_timerService.state.earnedBreakSeconds % 60).toString().padLeft(2, '0')}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  // 显示是否解锁休息
                  if (_timerService.state.mode == TimerMode.work)
                    Text(
                      _timerService.state.isBreakUnlocked ? 'Break Unlocked!' : 'Work to unlock break',
                      style: TextStyle(
                        color: _timerService.state.isBreakUnlocked ? Colors.green : Colors.grey,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Controls area - 使用AnimatedSwitcher保持布局稳定
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (Widget child, Animation<double> animation) {
                return SizeTransition(
                  sizeFactor: animation,
                  child: child,
                );
              },
              child: 
                // 调整时间界面
                _timerService.state.mode == TimerMode.work && 
                !_timerService.state.isActive && 
                _timerService.state.timeAdjustment != null
                ? Container(
                    key: const ValueKey('adjustment-controls'),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        // 时间调整按钮组（以0为界）
                        const Text(
                          'Time Adjustment',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8.0,
                          runSpacing: 8.0,
                          children: [
                            // 减少调整时间
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(-300), // 减少5分钟
                              icon: const Icon(Icons.remove, size: 18),
                              label: const Text('-5m'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(-60), // 减少1分钟
                              icon: const Icon(Icons.remove, size: 18),
                              label: const Text('-1m'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(-10), // 减少10秒
                              icon: const Icon(Icons.remove, size: 18),
                              label: const Text('-10s'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(-1), // 减少1秒
                              icon: const Icon(Icons.remove, size: 18),
                              label: const Text('-1s'),
                            ),
                            // 重置调整（以0为界）
                            FilledButton.icon(
                              onPressed: () {
                                // 重置到当前时间
                                _timerService.discardTimeAdjustment();
                                _timerService.beginTimeAdjustment();
                              },
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text('Reset'),
                            ),
                            // 增加调整时间
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(1), // 增加1秒
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('+1s'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(10), // 增加10秒
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('+10s'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(60), // 增加1分钟
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('+1m'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _timerService.adjustTime(300), // 增加5分钟
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('+5m'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        // 操作按钮组
                        const Text(
                          'Actions',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8.0,
                          runSpacing: 8.0,
                          children: [
                            // 应用调整
                            FilledButton.icon(
                              onPressed: _timerService.applyTimeAdjustment,
                              icon: Icon(Icons.check, size: 18),
                              label: const Text('Apply & Resume'),
                            ),
                            // 丢弃调整
                            OutlinedButton.icon(
                              onPressed: _timerService.discardTimeAdjustment,
                              icon: Icon(Icons.close, size: 18),
                              label: const Text('Discard & Resume'),
                            ),
                            // 高级休息
                            FilledButton.icon(
                              onPressed: _tryAdvancedBreak,
                              icon: Icon(Icons.free_breakfast, size: 18),
                              label: const Text('Advanced Break'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  )
                // 暂停状态但未在调整时间时显示开始按钮
                : _timerService.state.mode == TimerMode.work && 
                  !_timerService.state.isActive && 
                  _timerService.state.timeAdjustment == null
                  ? Container(
                      key: const ValueKey('pause-controls'),
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          FilledButton.icon(
                            onPressed: () => _timerService.beginTimeAdjustment(),
                            icon: const Icon(Icons.edit),
                            label: const Text('Adjust Time'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(56),
                            ),
                          ),
                          const SizedBox(height: 16),
                          FilledButton.icon(
                            onPressed: _tryAdvancedBreak,
                            icon: const Icon(Icons.free_breakfast),
                            label: const Text('Advanced Break'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(56),
                            ),
                          ),
                        ],
                      ),
                    )
                // 其他状态（如计时期间或休息期间）显示空内容
                : Container(
                    key: const ValueKey('no-controls'),
                    padding: const EdgeInsets.all(20),
                    child: const SizedBox.shrink(),
                  ),
            ),
          ),
        ],
      ),
      // 使用FAB作为开始/暂停按钮
      floatingActionButton: _timerService.state.mode == TimerMode.work
          ? FloatingActionButton(
              onPressed: _timerService.toggleTimer,
              child: Icon(_timerService.state.isActive ? Icons.pause : Icons.play_arrow),
            )
          : FloatingActionButton(
              onPressed: () {
                // 在休息模式下，如果尝试结束休息但有时间调整，需要处理
                _timerService.endBreak();
              },
              child: const Icon(Icons.stop),
            ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  void _showSetGoalDialog() {
    int minutes = (_timerService.state.minWorkDuration ~/ 60);
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
                _timerService.setMinFocusTime(value * 60); // 转换为秒
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