import 'package:flutter/material.dart';
import 'package:flutter_focus_flow/services/focus_service.dart';
import 'package:flutter_focus_flow/services/notification_service.dart';
import 'package:provider/provider.dart';

class DevView extends StatelessWidget {
  const DevView({super.key});

  @override
  Widget build(BuildContext context) {
    final focusService = Provider.of<FocusService>(context, listen: false);
    final notificationService = NotificationService();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Developer Options'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          const Text(
            'Notifications',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Divider(),
          ListTile(
            title: const Text('Request Permissions'),
            subtitle: const Text('Request permission to show notifications.'),
            onTap: () async {
              await notificationService.requestPermissions();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Permission request sent.')),
                );
              }
            },
          ),
          ListTile(
            title: const Text('Show Test Alert'),
            subtitle: const Text('Shows a standard notification.'),
            onTap: () {
              notificationService.showStandardNotification(
                title: 'Test Alert',
                body: 'This is a test notification.',
              );
            },
          ),
          ListTile(
            title: const Text('Show Test Progress Notification'),
            subtitle: const Text('Shows a progress notification for 5 seconds.'),
            onTap: () async {
              const maxProgress = 100;
              for (int i = 0; i <= maxProgress; i += 10) {
                await notificationService.showProgressNotification(
                  title: 'Test Progress',
                  body: '$i% complete',
                  maxProgress: maxProgress,
                  progress: i,
                );
                await Future.delayed(const Duration(milliseconds: 500));
              }
              await notificationService.cancelOngoingNotification();
            },
          ),
          ListTile(
            title: const Text('Cancel All Notifications'),
            onTap: () {
              notificationService.cancelAllNotifications();
            },
          ),
          const SizedBox(height: 24),
          const Text(
            'State Management',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Divider(),
          ListTile(
            title: const Text('Reset Focus State'),
            subtitle: const Text('Resets the timer and all stats.'),
            onTap: () {
              focusService.resetFocus();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Focus state has been reset.')),
              );
            },
          ),
        ],
      ),
    );
  }
}
