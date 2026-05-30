import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../auth/presentation/auth_providers.dart';
import '../../../members/presentation/member_providers.dart';
import '../../data/task_repository.dart';
import '../task_providers.dart';

class TaskCommentsTab extends ConsumerStatefulWidget {
  const TaskCommentsTab({
    super.key,
    required this.workspaceId,
    required this.projectId,
    required this.taskId,
  });

  final String workspaceId;
  final String projectId;
  final String taskId;

  @override
  ConsumerState<TaskCommentsTab> createState() => _TaskCommentsTabState();
}

class _TaskCommentsTabState extends ConsumerState<TaskCommentsTab> {
  final _ctrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_ctrl.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    try {
      final user = ref.read(currentUserProvider)!;
      final member = await ref
          .read(memberRepositoryProvider)
          .getMemberByUserId(widget.workspaceId, user.uid);
      await ref.read(taskRepositoryProvider).addComment(
            widget.workspaceId,
            widget.projectId,
            widget.taskId,
            member?.id ?? user.uid,
            user.displayName ?? '',
            user.email ?? '',
            _ctrl.text.trim(),
          );
      _ctrl.clear();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final commentsAsync = ref.watch(taskCommentsProvider(
        widget.workspaceId, widget.projectId, widget.taskId));

    return Column(
      children: [
        Expanded(
          child: commentsAsync.when(
            loading: () => const LoadingView(),
            error: (e, _) => ErrorView(error: e),
            data: (comments) => comments.isEmpty
                ? const Center(child: Text('No comments yet'))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    reverse: true,
                    itemCount: comments.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final c = comments[i];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AppAvatar(
                              name: c.authorName ?? c.authorEmail ?? '?',
                              size: 32),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      c.authorName ?? c.authorEmail ?? 'User',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(width: 8),
                                    if (c.createdAt != null)
                                      Text(
                                        timeago.format(c.createdAt!),
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall,
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(c.content),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: EdgeInsets.only(
            left: 12,
            right: 12,
            bottom: MediaQuery.of(context).viewInsets.bottom + 8,
            top: 8,
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  decoration: const InputDecoration(
                    hintText: 'Add a comment…',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  minLines: 1,
                  maxLines: 4,
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
