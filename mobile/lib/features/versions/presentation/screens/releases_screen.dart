import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/utils/date_utils.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../data/version_repository.dart';
import '../../domain/version_model.dart';
import '../version_providers.dart';

class ReleasesScreen extends ConsumerWidget {
  const ReleasesScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final versionsAsync =
        ref.watch(projectVersionsProvider(workspaceId, projectId));

    return Scaffold(
      appBar: AppBar(title: const Text('Releases')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context, ref),
        child: const Icon(Icons.add),
      ),
      body: versionsAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorView(error: e),
        data: (versions) => versions.isEmpty
            ? const Center(child: Text('No releases yet'))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: versions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _VersionCard(
                  version: versions[i],
                  workspaceId: workspaceId,
                  projectId: projectId,
                ),
              ),
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final nameCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Create release'),
        content: TextField(
          controller: nameCtrl,
          decoration: const InputDecoration(
              labelText: 'Version name (e.g. v1.0.0)'),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              await ref.read(versionRepositoryProvider).createVersion(
                    workspaceId,
                    projectId,
                    nameCtrl.text.trim(),
                  );
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class _VersionCard extends ConsumerWidget {
  const _VersionCard({
    required this.version,
    required this.workspaceId,
    required this.projectId,
  });

  final VersionModel version;
  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(versionRepositoryProvider);

    return Card(
      child: ListTile(
        title: Text(version.name,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: version.releaseDate != null
            ? Text('Released ${formatDate(version.releaseDate!)}')
            : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _StatusBadge(status: version.status),
            PopupMenuButton(
              itemBuilder: (_) => [
                if (version.status == VersionStatus.UNRELEASED)
                  PopupMenuItem(
                    onTap: () => repo.releaseVersion(
                        workspaceId, projectId, version.id),
                    child: const Text('Release'),
                  ),
                if (version.status != VersionStatus.ARCHIVED)
                  PopupMenuItem(
                    onTap: () => repo.archiveVersion(
                        workspaceId, projectId, version.id),
                    child: const Text('Archive'),
                  ),
                PopupMenuItem(
                  onTap: () => repo.deleteVersion(
                      workspaceId, projectId, version.id),
                  child: const Text('Delete',
                      style: TextStyle(color: Colors.red)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final VersionStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      VersionStatus.UNRELEASED => Colors.blue,
      VersionStatus.RELEASED => Colors.green,
      VersionStatus.ARCHIVED => Colors.grey,
    };
    return Chip(
      label: Text(status.label,
          style: TextStyle(color: color, fontSize: 11)),
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.3)),
      visualDensity: VisualDensity.compact,
    );
  }
}
