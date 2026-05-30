import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/utils/date_utils.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/priority_badge.dart';
import '../../../auth/presentation/auth_providers.dart';
import '../../../members/presentation/member_providers.dart';
import '../../data/task_repository.dart';
import '../../domain/task_model.dart';
import '../task_providers.dart';
import '../widgets/task_activity_tab.dart';
import '../widgets/task_attachments_tab.dart';
import '../widgets/task_comments_tab.dart';
import '../widgets/task_links_tab.dart';
import '../widgets/task_status_chip.dart';
import '../widgets/task_time_tracking_tab.dart';

class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({
    super.key,
    required this.taskId,
    required this.workspaceId,
    required this.projectId,
  });

  final String taskId;
  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskAsync =
        ref.watch(taskProvider(workspaceId, projectId, taskId));

    return taskAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (task) => _TaskDetailView(task: task),
    );
  }
}

class _TaskDetailView extends ConsumerWidget {
  const _TaskDetailView({required this.task});

  final TaskModel task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(task.id,
                  style: const TextStyle(
                      fontSize: 11, color: Colors.grey)),
              Text(task.name,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w600)),
            ],
          ),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Comments'),
              Tab(text: 'Time'),
              Tab(text: 'Links & Files'),
              Tab(text: 'Activity'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _OverviewTab(task: task),
            TaskCommentsTab(
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              taskId: task.id,
            ),
            TaskTimeTrackingTab(
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              taskId: task.id,
            ),
            TaskLinksAttachmentsTab(
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              taskId: task.id,
            ),
            TaskActivityTab(
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              taskId: task.id,
            ),
          ],
        ),
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.task});

  final TaskModel task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync =
        ref.watch(workspaceMembersProvider(task.workspaceId));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status row
        _DetailRow(
          label: 'Status',
          child: TaskStatusChip(
            status: task.status,
            onChanged: (newStatus) => ref
                .read(taskRepositoryProvider)
                .updateTask(
                    task.workspaceId,
                    task.projectId,
                    task.id,
                    {'status': newStatus.name}),
          ),
        ),

        if (task.priority != null)
          _DetailRow(
              label: 'Priority',
              child: PriorityBadge(priority: task.priority!)),

        if (task.issueType != null)
          _DetailRow(
              label: 'Type',
              child: Text(task.issueType!.label)),

        // Assignee
        _DetailRow(
          label: 'Assignee',
          child: membersAsync.when(
            loading: () => const Text('—'),
            error: (_, __) => const Text('—'),
            data: (members) {
              final assignee = members
                  .where((m) => m.id == task.assigneeId)
                  .firstOrNull;
              if (assignee == null) return const Text('Unassigned');
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppAvatar(
                      name: assignee.name ?? assignee.email ?? '?',
                      size: 20),
                  const SizedBox(width: 6),
                  Text(assignee.name ?? assignee.email ?? '?'),
                ],
              );
            },
          ),
        ),

        if (task.dueDate != null)
          _DetailRow(
              label: 'Due date',
              child: Text(formatDate(task.dueDate!))),

        if (task.storyPoints != null)
          _DetailRow(
              label: 'Story points',
              child: Text(task.storyPoints.toString())),

        if (task.originalEstimate != null)
          _DetailRow(
              label: 'Estimate',
              child: Text(formatDuration(task.originalEstimate!))),

        const Divider(height: 24),

        if (task.description != null && task.description!.isNotEmpty) ...[
          Text('Description',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Text(task.description!),
          const SizedBox(height: 16),
        ],

        if (task.acceptanceCriteria != null &&
            task.acceptanceCriteria!.isNotEmpty) ...[
          Text('Acceptance criteria',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Text(task.acceptanceCriteria!),
          const SizedBox(height: 16),
        ],

        // Bug-specific: RCA
        if (task.issueType == IssueType.bug &&
            task.rca != null &&
            task.rca!.isNotEmpty) ...[
          Text('Root cause analysis',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Text(task.rca!),
        ],
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5),
                  ),
            ),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}
