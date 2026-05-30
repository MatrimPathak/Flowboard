import 'package:flutter/material.dart';

import '../../../../core/utils/date_utils.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/priority_badge.dart';
import '../../domain/task_model.dart';
import 'task_status_chip.dart';

class TaskCard extends StatelessWidget {
  const TaskCard({super.key, required this.task, required this.onTap});

  final TaskModel task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (task.issueType != null) ...[
                    _IssueTypeBadge(type: task.issueType!),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    task.id,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.5),
                        ),
                  ),
                  const Spacer(),
                  TaskStatusChip(status: task.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                task.name,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w500),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (task.priority != null || task.dueDate != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (task.priority != null)
                      PriorityBadge(priority: task.priority!),
                    const Spacer(),
                    if (task.dueDate != null)
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_outlined,
                              size: 12, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            formatDate(task.dueDate!),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.grey),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _IssueTypeBadge extends StatelessWidget {
  const _IssueTypeBadge({required this.type});

  final IssueType type;

  @override
  Widget build(BuildContext context) {
    final color = switch (type) {
      IssueType.epic => const Color(0xFF8B5CF6),
      IssueType.story => const Color(0xFF3B82F6),
      IssueType.bug => const Color(0xFFEF4444),
      IssueType.spike => const Color(0xFFF59E0B),
      IssueType.task => const Color(0xFF6366F1),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        type.label,
        style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
