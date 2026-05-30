import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/task_repository.dart';
import '../../domain/task_model.dart';
import 'task_card.dart';
import 'task_status_chip.dart';

class KanbanBoard extends ConsumerWidget {
  const KanbanBoard({
    super.key,
    required this.tasks,
    required this.workspaceId,
    required this.projectId,
  });

  final List<TaskModel> tasks;
  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: TaskStatus.values
            .map((status) => _KanbanColumn(
                  status: status,
                  tasks: tasks.where((t) => t.status == status).toList(),
                  workspaceId: workspaceId,
                  projectId: projectId,
                  onTaskDropped: (taskId, position) async {
                    await ref.read(taskRepositoryProvider).bulkUpdateTasks(
                          workspaceId,
                          projectId,
                          [
                            (
                              taskId: taskId,
                              status: status,
                              position: position,
                            )
                          ],
                        );
                  },
                ))
            .toList(),
      ),
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  const _KanbanColumn({
    required this.status,
    required this.tasks,
    required this.workspaceId,
    required this.projectId,
    required this.onTaskDropped,
  });

  final TaskStatus status;
  final List<TaskModel> tasks;
  final String workspaceId;
  final String projectId;
  final Future<void> Function(String taskId, int position) onTaskDropped;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      margin: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            child: Row(
              children: [
                TaskStatusChip(status: status),
                const SizedBox(width: 8),
                Text(
                  '${tasks.length}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          DragTarget<String>(
            onAcceptWithDetails: (details) {
              final position = tasks.length * 1000;
              onTaskDropped(details.data, position);
            },
            builder: (context, candidateData, rejectedData) {
              return Container(
                decoration: BoxDecoration(
                  color: candidateData.isNotEmpty
                      ? Theme.of(context)
                          .colorScheme
                          .primaryContainer
                          .withOpacity(0.3)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                constraints: const BoxConstraints(minHeight: 100),
                child: Column(
                  children: tasks
                      .map((task) => Draggable<String>(
                            data: task.id,
                            feedback: Material(
                              elevation: 4,
                              borderRadius: BorderRadius.circular(8),
                              child: SizedBox(
                                width: 260,
                                child: TaskCard(task: task, onTap: () {}),
                              ),
                            ),
                            childWhenDragging: Opacity(
                              opacity: 0.3,
                              child: TaskCard(task: task, onTap: () {}),
                            ),
                            child: TaskCard(
                              task: task,
                              onTap: () => context.push(
                                '/task/${task.id}'
                                '?workspaceId=$workspaceId'
                                '&projectId=$projectId',
                              ),
                            ),
                          ))
                      .toList(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
