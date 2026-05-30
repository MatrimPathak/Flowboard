import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/task_repository.dart';
import '../../domain/task_model.dart';

class CreateTaskScreen extends ConsumerStatefulWidget {
  const CreateTaskScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  ConsumerState<CreateTaskScreen> createState() => _CreateTaskScreenState();
}

class _CreateTaskScreenState extends ConsumerState<CreateTaskScreen> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  IssueType _issueType = IssueType.story;
  TaskStatus _status = TaskStatus.BACKLOG;
  TaskPriority? _priority;
  bool _loading = false;
  Object? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => (_loading = true, _error = null));
    try {
      final task = await ref.read(taskRepositoryProvider).createTask(
            workspaceId: widget.workspaceId,
            projectId: widget.projectId,
            name: _nameCtrl.text.trim(),
            status: _status,
            issueType: _issueType,
            priority: _priority,
            description: _descCtrl.text.trim().isNotEmpty
                ? _descCtrl.text.trim()
                : null,
          );
      if (mounted) {
        context.go(
          '/task/${task.id}'
          '?workspaceId=${widget.workspaceId}'
          '&projectId=${widget.projectId}',
        );
      }
    } catch (e) {
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create task')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(_error.toString(),
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error)),
              ),

            // Issue type
            DropdownButtonFormField<IssueType>(
              value: _issueType,
              decoration: const InputDecoration(labelText: 'Type'),
              items: IssueType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                  .toList(),
              onChanged: (v) => setState(() => _issueType = v!),
            ),
            const SizedBox(height: 12),

            // Name
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Title'),
              autofocus: true,
              validator: (v) =>
                  v != null && v.isNotEmpty ? null : 'Required',
            ),
            const SizedBox(height: 12),

            // Status
            DropdownButtonFormField<TaskStatus>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: TaskStatus.values
                  .map((s) =>
                      DropdownMenuItem(value: s, child: Text(s.label)))
                  .toList(),
              onChanged: (v) => setState(() => _status = v!),
            ),
            const SizedBox(height: 12),

            // Priority
            DropdownButtonFormField<TaskPriority?>(
              value: _priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: [
                const DropdownMenuItem(value: null, child: Text('None')),
                ...TaskPriority.values.map((p) =>
                    DropdownMenuItem(value: p, child: Text(p.label))),
              ],
              onChanged: (v) => setState(() => _priority = v),
            ),
            const SizedBox(height: 12),

            // Description
            TextFormField(
              controller: _descCtrl,
              decoration:
                  const InputDecoration(labelText: 'Description (optional)'),
              minLines: 3,
              maxLines: 6,
            ),
            const SizedBox(height: 24),

            FilledButton(
              onPressed: _loading ? null : _create,
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Create task'),
            ),
          ],
        ),
      ),
    );
  }
}
