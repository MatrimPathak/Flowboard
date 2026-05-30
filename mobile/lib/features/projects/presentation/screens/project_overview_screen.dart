import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../tasks/presentation/task_providers.dart';
import '../../../tasks/domain/task_model.dart';
import '../project_providers.dart';

class ProjectOverviewScreen extends ConsumerWidget {
  const ProjectOverviewScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectAsync = ref.watch(projectProvider(workspaceId, projectId));
    final tasksAsync = ref.watch(projectTasksProvider(workspaceId, projectId));

    return projectAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (project) => Scaffold(
        appBar: AppBar(
          title: Text(project.name),
          actions: [
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              onPressed: () => context.push(
                  '/workspace/$workspaceId/project/$projectId/settings'),
            ),
          ],
        ),
        body: Column(
          children: [
            // Analytics summary
            tasksAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (tasks) => _AnalyticsSummary(tasks: tasks),
            ),
            // Quick nav
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _NavTile(
                    icon: Icons.list_alt_outlined,
                    title: 'Backlog',
                    onTap: () => context.push(
                        '/workspace/$workspaceId/project/$projectId/backlog'),
                  ),
                  _NavTile(
                    icon: Icons.bolt_outlined,
                    title: 'Active Sprint',
                    onTap: () => context.push(
                        '/workspace/$workspaceId/project/$projectId/sprint'),
                  ),
                  _NavTile(
                    icon: Icons.task_alt_outlined,
                    title: 'All tasks',
                    onTap: () => context.push(
                        '/workspace/$workspaceId/project/$projectId/tasks'),
                  ),
                  _NavTile(
                    icon: Icons.local_offer_outlined,
                    title: 'Releases',
                    onTap: () => context.push(
                        '/workspace/$workspaceId/project/$projectId/releases'),
                  ),
                  _NavTile(
                    icon: Icons.group_outlined,
                    title: 'Members',
                    onTap: () => context.push(
                        '/workspace/$workspaceId/project/$projectId/members'),
                  ),
                  _NavTile(
                    icon: Icons.description_outlined,
                    title: 'Docs',
                    onTap: () => context.push(
                        '/workspace/$workspaceId/project/$projectId/docs'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnalyticsSummary extends StatelessWidget {
  const _AnalyticsSummary({required this.tasks});

  final List<TaskModel> tasks;

  @override
  Widget build(BuildContext context) {
    final done = tasks.where((t) => t.status == TaskStatus.DONE).length;
    final total = tasks.length;
    final inProgress =
        tasks.where((t) => t.status == TaskStatus.IN_PROGRESS).length;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          _Stat(label: 'Total', value: total.toString()),
          _Stat(label: 'In Progress', value: inProgress.toString()),
          _Stat(label: 'Done', value: done.toString()),
          _Stat(
            label: 'Progress',
            value: total == 0
                ? '—'
                : '${(done / total * 100).round()}%',
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Text(value,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      )),
              const SizedBox(height: 4),
              Text(label,
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
