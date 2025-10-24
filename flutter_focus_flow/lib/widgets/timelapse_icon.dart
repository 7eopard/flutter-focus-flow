import 'package:flutter/material.dart';

class TimelapseIcon extends StatelessWidget {
  final double size;
  final Color color;
  final bool filled;

  const TimelapseIcon({
    Key? key,
    this.size = 24.0,
    this.color = Colors.black,
    this.filled = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _TimelapsePainter(
        color: color,
        filled: filled,
      ),
    );
  }
}

class _TimelapsePainter extends CustomPainter {
  final Color color;
  final bool filled;

  _TimelapsePainter({
    required this.color,
    required this.filled,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..style = filled ? PaintingStyle.fill : PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final double centerX = size.width / 2;
    final double centerY = size.height / 2;
    final double radius = size.width * 0.35;

    // 绘制时钟外圆
    final Offset center = Offset(centerX, centerY);
    canvas.drawCircle(center, radius, paint);

    // 绘制时钟顶部的小圆圈
    final double smallCircleRadius = size.width * 0.08;
    final Offset smallCircleCenter = Offset(centerX, centerY - radius - smallCircleRadius - size.width * 0.05);
    canvas.drawCircle(smallCircleCenter, smallCircleRadius, paint);

    // 绘制时钟指针
    final Paint handPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    // 时针（较短）
    final double hourHandLength = radius * 0.5;
    final Offset hourHandEnd = Offset(
      centerX + hourHandLength * 0.5,
      centerY - hourHandLength * 0.866, // 60度角
    );
    canvas.drawLine(center, hourHandEnd, handPaint);

    // 分针（较长）
    final double minuteHandLength = radius * 0.7;
    final Offset minuteHandEnd = Offset(
      centerX,
      centerY - minuteHandLength,
    );
    canvas.drawLine(center, minuteHandEnd, handPaint);

    // 如果是填充版本，添加一些额外的视觉效果
    if (filled) {
      // 在时钟中心添加一个小圆点
      final Paint centerPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, size.width * 0.05, centerPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return oldDelegate is _TimelapsePainter &&
        (oldDelegate.color != color || oldDelegate.filled != filled);
  }
}