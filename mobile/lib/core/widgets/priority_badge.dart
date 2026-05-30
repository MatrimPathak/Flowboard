import 'package:flutter/material.dart';

import '../../app/theme/colors.dart';
import '../../features/tasks/domain/task_model.dart';

class PriorityBadge extends StatelessWidget {
  const PriorityBadge({super.key, required this.priority});

  final TaskPriority priority;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, size: 12, color: _color),
          const SizedBox(width: 4),
          Text(
            priority.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: _color,
            ),
          ),
        ],
      ),
    );
  }

  Color get _color => switch (priority) {
        TaskPriority.critical => FlowboardColors.critical,
        TaskPriority.high => FlowboardColors.high,
        TaskPriority.medium => FlowboardColors.medium,
        TaskPriority.low => FlowboardColors.low,
      };

  IconData get _icon => switch (priority) {
        TaskPriority.critical => Icons.keyboard_double_arrow_up,
        TaskPriority.high => Icons.keyboard_arrow_up,
        TaskPriority.medium => Icons.remove,
        TaskPriority.low => Icons.keyboard_arrow_down,
      };
}
