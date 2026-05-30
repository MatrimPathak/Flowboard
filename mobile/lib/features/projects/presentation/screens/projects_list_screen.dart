import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../domain/project_model.dart';
import '../project_providers.dart';

class ProjectsListScreen extends ConsumerWidget {
  const ProjectsListScreen({
    super.key,
    required this.workspaceId,
    this.embedded = false,
  });

  final String workspaceId;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(workspaceProjectsProvider(workspaceId));

    Widget body = projectsAsync.when(
      loading: () => const ShimmerList(),
      error: (e, _) => ErrorView(error: e),
      data: (projects) => projects.isEmpty
          ? _EmptyState(
              onCreateTap: () => context
                  .push('/workspace/$workspaceId/project/create'),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: projects.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _ProjectCard(
                project: projects[i],
                onTap: () => context.push(
                    '/workspace/$workspaceId/project/${projects[i].id}'),
              ),
            ),
    );

    if (embedded) return body;

    return Scaffold(
      appBar: AppBar(title: const Text('Projects')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () =>
            context.push('/workspace/$workspaceId/project/create'),
        icon: const Icon(Icons.add),
        label: const Text('New project'),
      ),
      body: body,
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, required this.onTap});

  final ProjectModel project;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: AppAvatar(name: project.name, imageUrl: project.imageUrl),
        title: Text(project.name,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCreateTap});

  final VoidCallback onCreateTap;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.folder_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('No projects yet'),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onCreateTap,
            icon: const Icon(Icons.add),
            label: const Text('Create project'),
          ),
        ],
      ),
    );
  }
}
