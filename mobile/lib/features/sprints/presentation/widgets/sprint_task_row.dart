import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../tasks/domain/task_model.dart';
import '../../../tasks/presentation/widgets/task_status_chip.dart';

class SprintTaskRow extends StatelessWidget {
  const SprintTaskRow({
    super.key,
    required this.task,
    required this.workspaceId,
    required this.projectId,
  });

  final TaskModel task;
  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: () => context.push(
          '/task/${task.id}?workspaceId=$workspaceId&projectId=$projectId'),
      title: Text(task.name),
      subtitle: Text(task.id,
          style: Theme.of(context).textTheme.bodySmall),
      trailing: TaskStatusChip(status: task.status),
    );
  }
}
