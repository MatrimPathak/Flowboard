import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../domain/task_model.dart';
import '../task_providers.dart';
import '../widgets/kanban_board.dart';
import '../widgets/task_card.dart';

enum _ViewMode { list, kanban }

class TasksListScreen extends ConsumerStatefulWidget {
  const TasksListScreen({
    super.key,
    required this.workspaceId,
    this.projectId,
    this.filters,
  });

  final String workspaceId;
  final String? projectId;
  final TaskFilters? filters;

  @override
  ConsumerState<TasksListScreen> createState() => _TasksListScreenState();
}

class _TasksListScreenState extends ConsumerState<TasksListScreen> {
  _ViewMode _viewMode = _ViewMode.list;
  TaskFilters _filters = const TaskFilters();

  @override
  Widget build(BuildContext context) {
    final tasksAsync = widget.projectId != null
        ? ref.watch(projectTasksProvider(
            widget.workspaceId, widget.projectId!,
            filters: _filters))
        : ref.watch(workspaceTasksProvider(widget.workspaceId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        actions: [
          IconButton(
            icon: Icon(_viewMode == _ViewMode.list
                ? Icons.view_kanban_outlined
                : Icons.list),
            onPressed: () => setState(() => _viewMode =
                _viewMode == _ViewMode.list
                    ? _ViewMode.kanban
                    : _ViewMode.list),
          ),
          if (widget.projectId != null)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => context.push(
                '/task/create?workspaceId=${widget.workspaceId}'
                '&projectId=${widget.projectId}',
              ),
            ),
        ],
      ),
      body: tasksAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorView(error: e),
        data: (tasks) {
          if (tasks.isEmpty) {
            return const Center(child: Text('No tasks yet'));
          }
          return _viewMode == _ViewMode.kanban && widget.projectId != null
              ? KanbanBoard(
                  tasks: tasks,
                  workspaceId: widget.workspaceId,
                  projectId: widget.projectId!,
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: tasks.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (_, i) => TaskCard(
                    task: tasks[i],
                    onTap: () => context.push(
                      '/task/${tasks[i].id}'
                      '?workspaceId=${widget.workspaceId}'
                      '&projectId=${tasks[i].projectId}',
                    ),
                  ),
                );
        },
      ),
    );
  }
}
