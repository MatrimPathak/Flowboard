import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../auth/presentation/auth_providers.dart';
import '../../../members/presentation/member_providers.dart';
import '../../data/doc_repository.dart';
import '../../domain/doc_model.dart';
import '../doc_providers.dart';

class DocsListScreen extends ConsumerWidget {
  const DocsListScreen({
    super.key,
    required this.workspaceId,
    this.projectId,
  });

  final String workspaceId;
  final String? projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync =
        ref.watch(docsProvider(workspaceId, projectId: projectId));

    return Scaffold(
      appBar: AppBar(title: const Text('Docs')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createDoc(context, ref),
        child: const Icon(Icons.add),
      ),
      body: docsAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorView(error: e),
        data: (docs) => docs.isEmpty
            ? const Center(child: Text('No documents yet'))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: docs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 4),
                itemBuilder: (_, i) => _DocTile(
                  doc: docs[i],
                  onTap: () {
                    final base = projectId != null
                        ? '/workspace/$workspaceId/project/$projectId/docs'
                        : '/workspace/$workspaceId/docs';
                    context.push('$base/${docs[i].id}');
                  },
                ),
              ),
      ),
    );
  }

  Future<void> _createDoc(BuildContext context, WidgetRef ref) async {
    final titleCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('New document'),
        content: TextField(
          controller: titleCtrl,
          decoration: const InputDecoration(labelText: 'Title'),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              final title = titleCtrl.text.trim();
              if (title.isEmpty) return;
              final user = ref.read(currentUserProvider);
              final member = user != null
                  ? await ref
                      .read(memberRepositoryProvider)
                      .getMemberByUserId(workspaceId, user.uid)
                  : null;
              final doc = await ref.read(docRepositoryProvider).createDoc(
                    workspaceId,
                    title,
                    projectId: projectId,
                    createdByMemberId: member?.id,
                  );
              if (context.mounted) {
                Navigator.pop(context);
                final base = projectId != null
                    ? '/workspace/$workspaceId/project/$projectId/docs'
                    : '/workspace/$workspaceId/docs';
                context.push('$base/${doc.id}');
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class _DocTile extends StatelessWidget {
  const _DocTile({required this.doc, required this.onTap});

  final DocModel doc;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: const Icon(Icons.description_outlined),
      title: Text(doc.title),
      trailing: const Icon(Icons.chevron_right),
    );
  }
}
