import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

class AudioService extends ChangeNotifier {
  final AudioPlayer _audioPlayer = AudioPlayer();

  Future<void> playNotificationSound() async {
    try {
      // Use a free online sound effect or default system sound
      // In a real application, you might want to add local audio resources to assets
      await _audioPlayer.play(AssetSource('audio/ding.mp3'));
    } catch (e) {
      print('Error playing notification sound: $e');
      // If network audio cannot be played, try system default method
    }
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }
}