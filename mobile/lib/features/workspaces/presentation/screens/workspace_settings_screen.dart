import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/confirm_dialog.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../data/workspace_repository.dart';
import '../workspace_providers.dart';

class WorkspaceSettingsScreen extends ConsumerWidget {
  const WorkspaceSettingsScreen({super.key, required this.workspaceId});

  final String workspaceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspaceAsync = ref.watch(workspaceProvider(workspaceId));

    return workspaceAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (workspace) => Scaffold(
        appBar: AppBar(title: const Text('Workspace settings')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Invite code',
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            workspace.inviteCode ?? '—',
                            style: Theme.of(context)
                                .textTheme
                                .bodyLarge
                                ?.copyWith(fontFamily: 'monospace'),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy),
                          onPressed: () {
                            if (workspace.inviteCode == null) return;
                            Clipboard.setData(ClipboardData(
                                text: workspace.inviteCode!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Invite code copied')),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () async {
                        await ref
                            .read(workspaceRepositoryProvider)
                            .resetInviteCode(workspaceId);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Invite code reset')),
                          );
                        }
                      },
                      child: const Text('Reset invite code'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                title: const Text('Delete workspace',
                    style: TextStyle(color: Colors.red)),
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                onTap: () async {
                  final confirmed = await showConfirmDialog(
                    context,
                    title: 'Delete workspace',
                    message:
                        'This will permanently delete "${workspace.name}" and all its data.',
                    confirmLabel: 'Delete',
                  );
                  if (!confirmed) return;
                  await ref
                      .read(workspaceRepositoryProvider)
                      .deleteWorkspace(workspaceId);
                  if (context.mounted) context.go('/');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
