import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../data/doc_repository.dart';
import '../doc_providers.dart';

class DocEditorScreen extends ConsumerStatefulWidget {
  const DocEditorScreen({
    super.key,
    required this.workspaceId,
    required this.docId,
    this.projectId,
  });

  final String workspaceId;
  final String docId;
  final String? projectId;

  @override
  ConsumerState<DocEditorScreen> createState() => _DocEditorScreenState();
}

class _DocEditorScreenState extends ConsumerState<DocEditorScreen> {
  late TextEditingController _ctrl;
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(docRepositoryProvider).updateDoc(
            widget.workspaceId,
            widget.docId,
            {'contentMarkdown': _ctrl.text},
            projectId: widget.projectId,
          );
      setState(() => _editing = false);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final docAsync = ref.watch(
        docProvider(widget.workspaceId, widget.docId,
            projectId: widget.projectId));

    return docAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(body: ErrorView(error: e)),
      data: (doc) {
        if (!_editing && _ctrl.text.isEmpty) {
          _ctrl.text = doc.contentMarkdown ?? '';
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(doc.title),
            actions: [
              if (_editing)
                IconButton(
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.check),
                  onPressed: _saving ? null : _save,
                )
              else
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => setState(() => _editing = true),
                ),
            ],
          ),
          body: _editing
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _ctrl,
                    decoration: const InputDecoration.collapsed(
                        hintText: 'Write in markdown…'),
                    maxLines: null,
                    expands: true,
                    style: const TextStyle(fontFamily: 'monospace'),
                    keyboardType: TextInputType.multiline,
                  ),
                )
              : Markdown(
                  data: doc.contentMarkdown ?? '_Empty document_',
                  padding: const EdgeInsets.all(16),
                ),
        );
      },
    );
  }
}
