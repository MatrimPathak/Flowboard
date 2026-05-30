import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/id_generator.dart';
import '../domain/doc_model.dart';

part 'doc_repository.g.dart';

@riverpod
DocRepository docRepository(DocRepositoryRef ref) =>
    DocRepository(FirebaseFirestore.instance);

class DocRepository {
  DocRepository(this._db);

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> _collection(
      String workspaceId, String? projectId) {
    return projectId != null
        ? FirestorePaths.projectDocs(_db, workspaceId, projectId)
        : FirestorePaths.workspaceDocs(_db, workspaceId);
  }

  Stream<List<DocModel>> watchDocs(String workspaceId,
      {String? projectId}) {
    return _collection(workspaceId, projectId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map(DocModel.fromFirestore).toList());
  }

  Future<DocModel> getDoc(String workspaceId, String docId,
      {String? projectId}) async {
    final doc =
        await _collection(workspaceId, projectId).doc(docId).get();
    if (!doc.exists) throw Exception('Document not found');
    return DocModel.fromFirestore(doc);
  }

  Future<DocModel> createDoc(
    String workspaceId,
    String title, {
    String? projectId,
    String? parentId,
    String? createdByMemberId,
  }) async {
    final docId = generateDocId();
    final data = <String, dynamic>{
      'title': title,
      'workspaceId': workspaceId,
      'contentMarkdown': '',
      '\$createdAt': isoNow(),
      'updatedAt': isoNow(),
    };
    if (projectId != null) data['projectId'] = projectId;
    if (parentId != null) data['parentId'] = parentId;
    if (createdByMemberId != null) {
      data['createdByMemberId'] = createdByMemberId;
    }

    await _collection(workspaceId, projectId).doc(docId).set(data);
    return getDoc(workspaceId, docId, projectId: projectId);
  }

  Future<void> updateDoc(String workspaceId, String docId,
      Map<String, dynamic> updates, {String? projectId}) async {
    await _collection(workspaceId, projectId).doc(docId).update({
      ...updates,
      'updatedAt': isoNow(),
    });
  }

  Future<void> deleteDoc(String workspaceId, String docId,
      {String? projectId}) async {
    await _collection(workspaceId, projectId).doc(docId).delete();
  }
}
