import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../tasks/data/task_repository.dart';
import '../../../tasks/domain/task_model.dart';
import '../../../tasks/presentation/task_providers.dart';
import '../../../tasks/presentation/widgets/kanban_board.dart';
import '../sprint_providers.dart';

class ActiveSprintScreen extends ConsumerWidget {
  const ActiveSprintScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeSprintAsync =
        ref.watch(activeSprintProvider(workspaceId, projectId));

    return activeSprintAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (sprint) {
        if (sprint == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Active Sprint')),
            body: const Center(
              child: Text('No active sprint. Start one from the Backlog.'),
            ),
          );
        }

        final tasksAsync = ref.watch(projectTasksProvider(
          workspaceId,
          projectId,
          filters: TaskFilters(sprintId: sprint.id),
        ));

        return Scaffold(
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Active Sprint',
                    style: TextStyle(fontSize: 12, color: Colors.grey)),
                Text(sprint.name,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          body: tasksAsync.when(
            loading: () => const ShimmerList(),
            error: (e, _) => ErrorView(error: e),
            data: (tasks) => KanbanBoard(
              tasks: tasks,
              workspaceId: workspaceId,
              projectId: projectId,
            ),
          ),
        );
      },
    );
  }
}
