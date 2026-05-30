import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/utils/date_utils.dart';
import '../../data/sprint_repository.dart';
import '../../domain/sprint_model.dart';

class SprintHeader extends ConsumerWidget {
  const SprintHeader({
    super.key,
    required this.sprint,
    required this.taskCount,
    required this.workspaceId,
    required this.projectId,
  });

  final SprintModel sprint;
  final int taskCount;
  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(sprintRepositoryProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          _StatusDot(status: sprint.status),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sprint.name,
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
                if (sprint.endDate != null)
                  Text(
                    'Ends ${formatDate(sprint.endDate!)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ),
          Text('$taskCount tasks',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(width: 8),
          if (sprint.status == SprintStatus.PLANNED)
            TextButton(
              onPressed: () => repo.startSprint(
                workspaceId,
                projectId,
                sprint.id,
                DateTime.now(),
                DateTime.now().add(const Duration(days: 14)),
              ),
              child: const Text('Start'),
            ),
          if (sprint.status == SprintStatus.ACTIVE)
            TextButton(
              onPressed: () =>
                  repo.completeSprint(workspaceId, projectId, sprint.id),
              child: const Text('Complete'),
            ),
        ],
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.status});

  final SprintStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      SprintStatus.PLANNED => Colors.grey,
      SprintStatus.ACTIVE => Colors.blue,
      SprintStatus.COMPLETED => Colors.green,
    };
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
