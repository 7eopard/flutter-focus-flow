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
  bool _isLongPressActive = false;
  Timer? _longPressTimer;

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    _timerService = Provider.of<TimerService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Focus Timer'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _timerService.resetTimer,
            tooltip: 'Reset Timer',
          ),
        ],
      ),
      body: Column(
        children: [
          // Timer display
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
                          : _timerService.isGoalReached 
                              ? 'Goal Reached!' 
                              : 'Focus Time')
                      : 'Rest Time',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 10),
                  // 显示赚取的休息时间
                  if (_timerService.state.mode == TimerMode.work && _timerService.state.timeInSeconds > 0)
                    Text(
                      'Earned Rest: ${(_timerService.earnedBreakDuration ~/ 60).toString().padLeft(2, '0')}:${(_timerService.earnedBreakDuration % 60).toString().padLeft(2, '0')}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ),
          
          // Controls
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // 主要操作按钮 - 根据状态显示不同按钮
                  if (_timerService.state.mode == TimerMode.work)
                    _buildWorkModeButton()
                  else
                    _buildRestModeButton(),
                  
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: _showSetGoalDialog,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(56),
                    ),
                    child: const Text('Set Goal'),
                  ),
                  const SizedBox(height: 16),
                  // 显示会话统计信息
                  Text(
                    'Pauses: ${_timerService.state.sessionPauseCount}, Adjustments: ${_timerService.state.sessionAdjustments.length}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkModeButton() {
    if (_timerService.isGoalReached && !_timerService.state.isActive) {
      // 目标已达到，显示长按开始休息按钮
      return _buildLongPressRestButton();
    } else {
      // 显示开始/暂停按钮
      return FilledButton(
        onPressed: _timerService.toggleTimer,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
        ),
        child: Text(
          _timerService.state.isActive ? 'Pause' : 'Start',
        ),
      );
    }
  }

  Widget _buildRestModeButton() {
    return FilledButton(
      onPressed: _timerService.endBreak,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
      ),
      child: const Text('End Rest'),
    );
  }

  Widget _buildLongPressRestButton() {
    return Container(
      width: double.infinity,
      height: 56,
      child: Stack(
        children: [
          // 背景进度条
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: _isLongPressActive ? 100.0 : 0.0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.3),
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          // 主按钮
          Positioned.fill(
            child: GestureDetector(
              onLongPressStart: (details) {
                _startLongPressAction();
              },
              onLongPressEnd: (details) {
                _endLongPressAction();
              },
              child: Container(
                decoration: BoxDecoration(
                  color: _isLongPressActive ? Colors.orange : Colors.orange.shade200,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    _isLongPressActive ? 'Releasing...' : 'Hold to Start Break',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: _isLongPressActive ? Colors.white : Colors.black54,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _startLongPressAction() {
    _isLongPressActive = true;
    
    _longPressTimer = Timer(Duration(milliseconds: _timerService.state.longPressThreshold), () {
      if (_isLongPressActive) {
        _timerService.startBreak();
        _isLongPressActive = false;
      }
    });
  }

  void _endLongPressAction() {
    _isLongPressActive = false;
    _longPressTimer?.cancel();
  }

  void _showSetGoalDialog() {
    int minutes = (_timerService.state.minWorkDuration ~/ 60);
    final controller = TextEditingController(text: minutes.toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Set Focus Goal'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            hintText: 'Enter minutes',
            labelText: 'Focus Goal (minutes)',
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
                _timerService.setGoal(value * 60); // 转换为秒
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
    _longPressTimer?.cancel();
    super.dispose();
  }
}