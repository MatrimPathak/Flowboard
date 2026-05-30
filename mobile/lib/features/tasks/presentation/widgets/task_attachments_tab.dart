import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as path;

import '../../../../core/constants/firestore_paths.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../auth/presentation/auth_providers.dart';
import '../../../members/presentation/member_providers.dart';
import '../../data/task_repository.dart';
import '../task_providers.dart';

class TaskAttachmentsTab extends ConsumerStatefulWidget {
  const TaskAttachmentsTab({
    super.key,
    required this.workspaceId,
    required this.projectId,
    required this.taskId,
    this.embedded = false,
  });

  final String workspaceId;
  final String projectId;
  final String taskId;
  final bool embedded;

  @override
  ConsumerState<TaskAttachmentsTab> createState() =>
      _TaskAttachmentsTabState();
}

class _TaskAttachmentsTabState extends ConsumerState<TaskAttachmentsTab> {
  bool _uploading = false;

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      type: FileType.any,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.path == null) return;

    setState(() => _uploading = true);
    try {
      final user = ref.read(currentUserProvider)!;
      final member = await ref
          .read(memberRepositoryProvider)
          .getMemberByUserId(widget.workspaceId, user.uid);
      final filename = '${DateTime.now().millisecondsSinceEpoch}-${file.name}';
      final storagePath = FirestorePaths.taskAttachment(
          widget.workspaceId, widget.taskId, filename);
      final ref2 = FirebaseStorage.instance.ref(storagePath);
      await ref2.putFile(File(file.path!));
      final url = await ref2.getDownloadURL();

      await ref.read(taskRepositoryProvider).addAttachment(
            widget.workspaceId,
            widget.projectId,
            widget.taskId,
            member?.id ?? user.uid,
            url,
            file.name,
            storagePath,
            fileType: file.extension,
            fileSize: file.size,
          );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final attachmentsAsync = ref.watch(taskAttachmentsProvider(
        widget.workspaceId, widget.projectId, widget.taskId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        attachmentsAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(error: e),
          data: (attachments) => attachments.isEmpty
              ? const Text('No attachments')
              : Column(
                  children: attachments
                      .map((a) => ListTile(
                            contentPadding: widget.embedded
                                ? EdgeInsets.zero
                                : null,
                            leading: const Icon(Icons.attach_file),
                            title: Text(a.name),
                            subtitle: a.fileSize != null
                                ? Text(
                                    '${(a.fileSize! / 1024).toStringAsFixed(1)} KB')
                                : null,
                          ))
                      .toList(),
                ),
        ),
        const SizedBox(height: 8),
        if (!widget.embedded)
          FilledButton.icon(
            onPressed: _uploading ? null : _pickAndUpload,
            icon: _uploading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.upload),
            label: const Text('Upload file'),
          )
        else
          TextButton.icon(
            onPressed: _uploading ? null : _pickAndUpload,
            icon: const Icon(Icons.upload, size: 16),
            label: const Text('Upload'),
          ),
      ],
    );
  }
}
