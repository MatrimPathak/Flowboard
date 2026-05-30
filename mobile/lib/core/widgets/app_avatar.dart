import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

class AppAvatar extends StatelessWidget {
  const AppAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = 36,
  });

  final String name;
  final String? imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final initials = _initials(name);
    final color = _colorForName(name, context);

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size / 2),
        child: CachedNetworkImage(
          imageUrl: imageUrl!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorWidget: (_, __, ___) => _initialsWidget(initials, color, size),
        ),
      );
    }
    return _initialsWidget(initials, color, size);
  }

  static Widget _initialsWidget(String initials, Color color, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.35,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (name.length >= 2) return name.substring(0, 2).toUpperCase();
    return name.toUpperCase();
  }

  static Color _colorForName(String name, BuildContext context) {
    const colors = [
      Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFF3B82F6),
      Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFFEF4444),
      Color(0xFFEC4899), Color(0xFF14B8A6),
    ];
    final idx = name.codeUnits.fold(0, (sum, c) => sum + c) % colors.length;
    return colors[idx];
  }
}
