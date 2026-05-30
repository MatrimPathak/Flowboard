import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/id_generator.dart';
import '../domain/project_model.dart';

part 'project_repository.g.dart';

@riverpod
ProjectRepository projectRepository(ProjectRepositoryRef ref) =>
    ProjectRepository(FirebaseFirestore.instance);

class ProjectRepository {
  ProjectRepository(this._db);

  final FirebaseFirestore _db;

  Stream<List<ProjectModel>> watchProjects(String workspaceId) {
    return FirestorePaths.projects(_db, workspaceId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map(ProjectModel.fromFirestore).toList());
  }

  Future<ProjectModel> getProject(
      String workspaceId, String projectId) async {
    final doc =
        await FirestorePaths.project(_db, workspaceId, projectId).get();
    if (!doc.exists) throw Exception('Project not found');
    return ProjectModel.fromFirestore(doc);
  }

  Future<ProjectModel> createProject(
      String workspaceId, String name) async {
    final projectId = generateProjectId();
    final now = isoNow();
    await FirestorePaths.project(_db, workspaceId, projectId).set({
      'name': name,
      'workspaceId': workspaceId,
      '\$createdAt': now,
    });
    return getProject(workspaceId, projectId);
  }

  Future<void> updateProject(String workspaceId, String projectId,
      Map<String, dynamic> updates) async {
    await FirestorePaths.project(_db, workspaceId, projectId)
        .update(updates);
  }

  Future<void> deleteProject(
      String workspaceId, String projectId) async {
    await FirestorePaths.project(_db, workspaceId, projectId).delete();
  }
}
