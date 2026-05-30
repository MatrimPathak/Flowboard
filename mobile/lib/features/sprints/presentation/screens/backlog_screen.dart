import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../tasks/domain/task_model.dart';
import '../../../tasks/presentation/task_providers.dart';
import '../../../tasks/presentation/widgets/task_card.dart';
import '../../domain/sprint_model.dart';
import '../sprint_providers.dart';
import '../widgets/sprint_header.dart';

class BacklogScreen extends ConsumerWidget {
  const BacklogScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync =
        ref.watch(projectTasksProvider(workspaceId, projectId));
    final sprintsAsync =
        ref.watch(projectSprintsProvider(workspaceId, projectId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Backlog'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push(
                '/task/create?workspaceId=$workspaceId&projectId=$projectId'),
          ),
        ],
      ),
      body: tasksAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorView(error: e),
        data: (allTasks) => sprintsAsync.when(
          loading: () => const ShimmerList(),
          error: (e, _) => ErrorView(error: e),
          data: (sprints) {
            final backlogTasks = allTasks
                .where((t) => t.sprintId == null)
                .toList();

            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                // Sprint sections
                ...sprints.where((s) => s.status != SprintStatus.COMPLETED).map(
                      (sprint) => _SprintSection(
                        sprint: sprint,
                        tasks: allTasks
                            .where((t) => t.sprintId == sprint.id)
                            .toList(),
                        workspaceId: workspaceId,
                        projectId: projectId,
                      ),
                    ),

                // Backlog section
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text('Backlog (${backlogTasks.length})',
                      style: Theme.of(context).textTheme.titleSmall),
                ),
                ...backlogTasks.map((task) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: TaskCard(
                        task: task,
                        onTap: () => context.push(
                          '/task/${task.id}'
                          '?workspaceId=$workspaceId'
                          '&projectId=$projectId',
                        ),
                      ),
                    )),
                if (backlogTasks.isEmpty)
                  const Center(
                      child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('No backlog items'))),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SprintSection extends ConsumerWidget {
  const _SprintSection({
    required this.sprint,
    required this.tasks,
    required this.workspaceId,
    required this.projectId,
  });

  final SprintModel sprint;
  final List<TaskModel> tasks;
  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SprintHeader(
          sprint: sprint,
          taskCount: tasks.length,
          workspaceId: workspaceId,
          projectId: projectId,
        ),
        ...tasks.map((task) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: TaskCard(
                task: task,
                onTap: () => context.push(
                  '/task/${task.id}'
                  '?workspaceId=$workspaceId'
                  '&projectId=$projectId',
                ),
              ),
            )),
        const SizedBox(height: 16),
      ],
    );
  }
}
