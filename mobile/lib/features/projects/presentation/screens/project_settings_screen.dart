import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/confirm_dialog.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../data/project_repository.dart';
import '../project_providers.dart';

class ProjectSettingsScreen extends ConsumerWidget {
  const ProjectSettingsScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectAsync = ref.watch(projectProvider(workspaceId, projectId));

    return projectAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (project) => Scaffold(
        appBar: AppBar(title: const Text('Project settings')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: ListTile(
                title: const Text('Delete project',
                    style: TextStyle(color: Colors.red)),
                leading:
                    const Icon(Icons.delete_outline, color: Colors.red),
                onTap: () async {
                  final confirmed = await showConfirmDialog(
                    context,
                    title: 'Delete project',
                    message:
                        'This will permanently delete "${project.name}" and all its data.',
                  );
                  if (!confirmed) return;
                  await ref
                      .read(projectRepositoryProvider)
                      .deleteProject(workspaceId, projectId);
                  if (context.mounted) {
                    context.go('/workspace/$workspaceId');
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
