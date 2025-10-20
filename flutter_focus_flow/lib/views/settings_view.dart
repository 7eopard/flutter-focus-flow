import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/timer_service.dart';
import 'package:provider/provider.dart';

class SettingsView extends StatelessWidget {
  const SettingsView({super.key});

  @override
  Widget build(BuildContext context) {
    final timerService = Provider.of<TimerService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.notifications),
              title: const Text('Notifications'),
              trailing: Switch(
                value: true,
                onChanged: (bool value) {},
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.timer),
              title: const Text('Goal'),
              subtitle: Text('${timerService.state.minWorkDuration ~/ 60} minutes'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showGoalTimeDialog(context, timerService),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.color_lens),
              title: const Text('Theme'),
              subtitle: const Text('System'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.language),
              title: const Text('Language'),
              subtitle: const Text('English'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.info),
              title: const Text('About'),
              onTap: () {},
            ),
          ),
        ],
      ),
    );
  }

  void _showGoalTimeDialog(BuildContext context, TimerService timerService) {
    int initialMinutes = (timerService.state.minWorkDuration ~/ 60);
    int selectedMinutes = initialMinutes;

    // 预定义的时间选项
    final timeOptions = [
      {'label': '5 min', 'value': 5},
      {'label': '10 min', 'value': 10},
      {'label': '15 min', 'value': 15},
      {'label': '20 min', 'value': 20},
      {'label': '25 min', 'value': 25},
      {'label': '30 min', 'value': 30},
      {'label': '45 min', 'value': 45},
      {'label': '60 min', 'value': 60},
    ];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Set Goal'),
        content: StatefulBuilder(
          builder: (context, setState) {
            return SizedBox(
              height: 250,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 时间选择滑块
                  Text(
                    '${selectedMinutes} minutes',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Slider(
                    value: selectedMinutes.toDouble(),
                    min: 1,
                    max: 120,
                    divisions: 119,
                    label: selectedMinutes.round().toString(),
                    onChanged: (value) {
                      setState(() {
                        selectedMinutes = value.round();
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  // 快速选择按钮
                  Wrap(
                    spacing: 8.0,
                    runSpacing: 8.0,
                    children: timeOptions.map(
                      (option) => FilterChip(
                        label: Text(option['label'] as String),
                        selected: selectedMinutes == (option['value'] as int),
                        onSelected: (selected) {
                          setState(() {
                            selectedMinutes = option['value'] as int;
                          });
                        },
                      ),
                    ).toList(),
                  ),
                ],
              ),
            );
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              timerService.setMinFocusTime(selectedMinutes * 60); // 转换为秒
              Navigator.pop(context);
            },
            child: const Text('Set'),
          ),
        ],
      ),
    );
  }
}