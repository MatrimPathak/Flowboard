import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../domain/task_activity_model.dart';
import '../task_providers.dart';

class TaskActivityTab extends ConsumerWidget {
  const TaskActivityTab({
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
    final activityAsync =
        ref.watch(taskActivityProvider(workspaceId, projectId, taskId));

    return activityAsync.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(error: e),
      data: (activities) => activities.isEmpty
          ? const Center(child: Text('No activity yet'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: activities.length,
              itemBuilder: (_, i) => _ActivityItem(activity: activities[i]),
            ),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  const _ActivityItem({required this.activity});

  final TaskActivityModel activity;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppAvatar(name: activity.memberName, size: 28),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RichText(
                  text: TextSpan(
                    style: DefaultTextStyle.of(context).style,
                    children: [
                      TextSpan(
                        text: activity.memberName,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      TextSpan(text: ' ${_description(activity)}'),
                    ],
                  ),
                ),
                if (activity.createdAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      timeago.format(activity.createdAt!),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _description(TaskActivityModel a) {
    return switch (a.type) {
      ActivityType.FIELD_CHANGE =>
        'changed ${a.field ?? 'field'} to "${a.newValue ?? ''}"',
      ActivityType.COMMENT_ADDED => 'added a comment',
      ActivityType.ATTACHMENT_ADDED => 'uploaded an attachment',
      ActivityType.ATTACHMENT_REMOVED => 'removed an attachment',
      ActivityType.WATCHER_ADDED => 'started watching',
      ActivityType.WATCHER_REMOVED => 'stopped watching',
      ActivityType.LINK_ADDED => 'added a link',
      ActivityType.LINK_REMOVED => 'removed a link',
      ActivityType.WORK_LOGGED => 'logged work',
      ActivityType.WORKLOG_DELETED => 'deleted a work log',
    };
  }
}
