import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../projects/presentation/screens/projects_list_screen.dart';
import '../workspace_providers.dart';

class WorkspaceDashboardScreen extends ConsumerWidget {
  const WorkspaceDashboardScreen({super.key, required this.workspaceId});

  final String workspaceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspaceAsync = ref.watch(workspaceProvider(workspaceId));

    return workspaceAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (workspace) => Scaffold(
        appBar: AppBar(
          title: Text(workspace.name),
          actions: [
            IconButton(
              icon: const Icon(Icons.group_outlined),
              tooltip: 'Members',
              onPressed: () =>
                  context.push('/workspace/$workspaceId/members'),
            ),
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              tooltip: 'Settings',
              onPressed: () =>
                  context.push('/workspace/$workspaceId/settings'),
            ),
          ],
        ),
        body: ProjectsListScreen(workspaceId: workspaceId, embedded: true),
        bottomNavigationBar: NavigationBar(
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.folder_outlined), label: 'Projects'),
            NavigationDestination(
                icon: Icon(Icons.task_outlined), label: 'My Tasks'),
            NavigationDestination(
                icon: Icon(Icons.description_outlined), label: 'Docs'),
          ],
          onDestinationSelected: (i) {
            switch (i) {
              case 1:
                context.push('/workspace/$workspaceId/tasks');
              case 2:
                context.push('/workspace/$workspaceId/docs');
            }
          },
        ),
      ),
    );
  }
}
