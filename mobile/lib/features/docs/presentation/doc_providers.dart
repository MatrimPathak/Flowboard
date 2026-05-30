import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../data/doc_repository.dart';
import '../domain/doc_model.dart';

part 'doc_providers.g.dart';

@riverpod
Stream<List<DocModel>> docs(
    DocsRef ref, String workspaceId, {String? projectId}) {
  return ref
      .watch(docRepositoryProvider)
      .watchDocs(workspaceId, projectId: projectId);
}

@riverpod
Future<DocModel> doc(
    DocRef ref, String workspaceId, String docId, {String? projectId}) {
  return ref
      .watch(docRepositoryProvider)
      .getDoc(workspaceId, docId, projectId: projectId);
}
