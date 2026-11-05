import 'dart:math' as math;
import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';

class GlassPanel extends StatelessWidget {
  const GlassPanel({super.key, required this.child, this.padding = const EdgeInsets.all(18)});
  final Widget child; final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => ClipRRect(borderRadius: BorderRadius.circular(22), child: BackdropFilter(
    filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
    child: Container(padding: padding, decoration: BoxDecoration(
      gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [Color(0xCC1B2A3D), Color(0xB30C1421), Color(0xC9101927)]),
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: const Color(0xFF78BFFF).withValues(alpha: .16)),
      boxShadow: [BoxShadow(color: const Color(0xFF3B9CEB).withValues(alpha: .055), blurRadius: 24)],
    ), child: child),
  ));
}

class GlassStatsCard extends StatelessWidget {
  const GlassStatsCard({super.key, required this.title, required this.value, required this.note, required this.icon, required this.color});
  final String title, value, note; final IconData icon; final Color color;
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: .96, end: 1), duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic,
    builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
    child: GlassPanel(padding: const EdgeInsets.all(13), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Row(children: [
        Container(width: 34, height: 34, decoration: BoxDecoration(color: color.withValues(alpha: .14), borderRadius: BorderRadius.circular(11)), child: Icon(icon, color: color, size: 18)),
        const Spacer(), Icon(Icons.north_east_rounded, color: color.withValues(alpha: .7), size: 15),
      ]),
      const SizedBox(height: 10),
      Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFFF4F7FC))),
      Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFF4F7FC))),
      Text(note, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 9, color: Color(0xFFA6B4C7))),
    ])),
  );
}

class ApexMiniBars extends StatelessWidget {
  const ApexMiniBars({super.key, required this.labels, required this.values});
  final List<String> labels; final List<double> values;
  @override
  Widget build(BuildContext context) {
    final maxValue = values.fold<double>(0, (max, v) => math.max(max, v));
    return Row(crossAxisAlignment: CrossAxisAlignment.end, children: List.generate(values.length, (i) => Expanded(child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
        Text(values[i] == 0 ? '—' : _shortNumber(values[i]), style: const TextStyle(color: Color(0xFFA6B4C7), fontSize: 8)),
        const SizedBox(height: 6),
        Expanded(child: Align(alignment: Alignment.bottomCenter, child: FractionallySizedBox(
          heightFactor: maxValue == 0 ? .025 : (values[i] / maxValue).clamp(.08, 1),
          child: Container(decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF9BDEFF), Color(0xFF347BCE), Color(0xFF244A82)]),
            boxShadow: [BoxShadow(color: const Color(0xFF69BFFF).withValues(alpha: .22), blurRadius: 12)],
          )),
        ))),
        const SizedBox(height: 7), Text(labels[i], style: const TextStyle(color: Color(0xFFA6B4C7), fontSize: 9)),
      ]),
    ))));
  }
}
String _shortNumber(double v) => v >= 1000000 ? '${(v/1000000).toStringAsFixed(1)}m' : v >= 1000 ? '${(v/1000).toStringAsFixed(1)}k' : v.toStringAsFixed(0);

class ApexDonut extends StatelessWidget {
  const ApexDonut({super.key, required this.values});
  final List<double> values;
  @override
  Widget build(BuildContext context) => SizedBox(width: 132, height: 132, child: CustomPaint(painter: _DonutPainter(values)));
}
class _DonutPainter extends CustomPainter {
  const _DonutPainter(this.values);
  final List<double> values;
  static const colors = [Color(0xFF70D9A4), Color(0xFFFFC46B), Color(0xFFFF6D72)];
  @override
  void paint(Canvas canvas, Size size) {
    final total = values.fold<double>(0, (s, v) => s + v);
    final rect = Offset.zero & size;
    final p = Paint()..style = PaintingStyle.stroke..strokeWidth = 15..strokeCap = StrokeCap.round..color = const Color(0xFF26364A);
    canvas.drawArc(rect.deflate(9), -math.pi/2, math.pi*2, false, p);
    if (total <= 0) return;
    var start = -math.pi/2;
    for (var i=0; i<values.length && i<colors.length; i++) {
      if (values[i] <= 0) continue;
      final sweep = values[i] / total * math.pi*2;
      canvas.drawArc(rect.deflate(9), start, math.max(0, sweep-.035), false, p..color=colors[i]);
      start += sweep;
    }
  }
  @override
  bool shouldRepaint(covariant _DonutPainter old) => old.values != values;
}
