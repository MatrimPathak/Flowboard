import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../../core/utils/date_utils.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../auth/presentation/auth_providers.dart';
import '../../../members/presentation/member_providers.dart';
import '../../data/task_repository.dart';
import '../task_providers.dart';

class TaskTimeTrackingTab extends ConsumerStatefulWidget {
  const TaskTimeTrackingTab({
    super.key,
    required this.workspaceId,
    required this.projectId,
    required this.taskId,
  });

  final String workspaceId;
  final String projectId;
  final String taskId;

  @override
  ConsumerState<TaskTimeTrackingTab> createState() =>
      _TaskTimeTrackingTabState();
}

class _TaskTimeTrackingTabState extends ConsumerState<TaskTimeTrackingTab> {
  final _hoursCtrl = TextEditingController();
  final _minsCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _hoursCtrl.dispose();
    _minsCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _logWork() async {
    final hours = int.tryParse(_hoursCtrl.text) ?? 0;
    final mins = int.tryParse(_minsCtrl.text) ?? 0;
    final total = hours * 60 + mins;
    if (total <= 0) return;

    setState(() => _submitting = true);
    try {
      final user = ref.read(currentUserProvider)!;
      final member = await ref
          .read(memberRepositoryProvider)
          .getMemberByUserId(widget.workspaceId, user.uid);
      await ref.read(taskRepositoryProvider).logWork(
            widget.workspaceId,
            widget.projectId,
            widget.taskId,
            member?.id ?? user.uid,
            user.displayName ?? '',
            total,
            DateTime.now(),
            description: _descCtrl.text.trim().isNotEmpty
                ? _descCtrl.text.trim()
                : null,
          );
      _hoursCtrl.clear();
      _minsCtrl.clear();
      _descCtrl.clear();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final worklogsAsync = ref.watch(taskWorklogsProvider(
        widget.workspaceId, widget.projectId, widget.taskId));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Log work', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _hoursCtrl,
                decoration:
                    const InputDecoration(labelText: 'Hours', suffixText: 'h'),
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: _minsCtrl,
                decoration: const InputDecoration(
                    labelText: 'Minutes', suffixText: 'm'),
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _descCtrl,
          decoration: const InputDecoration(labelText: 'Description (optional)'),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _submitting ? null : _logWork,
          child: _submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Log work'),
        ),
        const Divider(height: 32),
        Text('Work log', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        worklogsAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(error: e),
          data: (logs) => logs.isEmpty
              ? const Text('No work logged yet.')
              : Column(
                  children: logs
                      .map((log) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(log.memberName),
                            subtitle: log.description != null
                                ? Text(log.description!)
                                : null,
                            trailing: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(formatDuration(log.timeSpent),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600)),
                                if (log.createdAt != null)
                                  Text(timeago.format(log.createdAt!),
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                              ],
                            ),
                          ))
                      .toList(),
                ),
        ),
      ],
    );
  }
}
