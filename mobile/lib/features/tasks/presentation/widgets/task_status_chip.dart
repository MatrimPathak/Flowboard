import 'package:flutter/material.dart';

import '../../../../app/theme/colors.dart';
import '../../domain/task_model.dart';

class TaskStatusChip extends StatelessWidget {
  const TaskStatusChip({super.key, required this.status, this.onChanged});

  final TaskStatus status;
  final ValueChanged<TaskStatus>? onChanged;

  @override
  Widget build(BuildContext context) {
    if (onChanged != null) {
      return PopupMenuButton<TaskStatus>(
        initialValue: status,
        onSelected: onChanged,
        child: _chip(context),
        itemBuilder: (_) => TaskStatus.values
            .map((s) => PopupMenuItem(value: s, child: Text(s.label)))
            .toList(),
      );
    }
    return _chip(context);
  }

  Widget _chip(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color.withOpacity(0.3)),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: _color,
        ),
      ),
    );
  }

  Color get _color => switch (status) {
        TaskStatus.BACKLOG => FlowboardColors.backlog,
        TaskStatus.TODO => FlowboardColors.todo,
        TaskStatus.IN_PROGRESS => FlowboardColors.inProgress,
        TaskStatus.UNDER_REVIEW => FlowboardColors.underReview,
        TaskStatus.DONE => FlowboardColors.done,
      };
}
