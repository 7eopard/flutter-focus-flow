import 'package:flutter/material.dart';

class SettingsView extends StatelessWidget {
  const SettingsView({super.key});

  @override
  Widget build(BuildContext context) {
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
              title: const Text('Timer Duration'),
              subtitle: const Text('25 minutes'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
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
}