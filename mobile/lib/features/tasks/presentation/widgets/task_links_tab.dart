import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../domain/task_model.dart';
import '../../domain/task_link_model.dart';
import '../task_providers.dart';
import 'task_attachments_tab.dart';
import 'task_status_chip.dart';

class TaskLinksAttachmentsTab extends ConsumerWidget {
  const TaskLinksAttachmentsTab({
    super.key,
    required this.workspaceId,
    required this.projectId,
    required this.taskId,
  });

  final String workspaceId;
  final String projectId;
  final String taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final linksAsync =
        ref.watch(taskLinksProvider(workspaceId, projectId, taskId));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Linked issues',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        linksAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(error: e),
          data: (links) => links.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('No links'),
                )
              : Column(
                  children: links.map((link) => _LinkTile(link: link)).toList(),
                ),
        ),
        const Divider(height: 32),
        Text('Attachments',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        TaskAttachmentsTab(
          workspaceId: workspaceId,
          projectId: projectId,
          taskId: taskId,
          embedded: true,
        ),
      ],
    );
  }
}

class _LinkTile extends StatelessWidget {
  const _LinkTile({required this.link});

  final TaskLinkModel link;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(link.targetTaskName ?? link.targetTaskId),
      subtitle: Text(link.type.label,
          style: Theme.of(context).textTheme.bodySmall),
      trailing: link.targetTaskStatus != null
          ? TaskStatusChip(status: link.targetTaskStatus!)
          : null,
    );
  }
}
