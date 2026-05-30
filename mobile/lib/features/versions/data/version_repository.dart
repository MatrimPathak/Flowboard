import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/id_generator.dart';
import '../domain/version_model.dart';

part 'version_repository.g.dart';

@riverpod
VersionRepository versionRepository(VersionRepositoryRef ref) =>
    VersionRepository(FirebaseFirestore.instance);

class VersionRepository {
  VersionRepository(this._db);

  final FirebaseFirestore _db;

  Stream<List<VersionModel>> watchVersions(
      String workspaceId, String projectId) {
    return FirestorePaths.versions(_db, workspaceId, projectId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map(VersionModel.fromFirestore).toList());
  }

  Future<VersionModel> createVersion(
    String workspaceId,
    String projectId,
    String name, {
    String? description,
    DateTime? startDate,
    DateTime? releaseDate,
  }) async {
    final versionId = generateReleaseId();
    final data = <String, dynamic>{
      'name': name,
      'status': VersionStatus.UNRELEASED.name,
      'workspaceId': workspaceId,
      'projectId': projectId,
      '\$createdAt': isoNow(),
    };
    if (description != null) data['description'] = description;
    if (startDate != null) data['startDate'] = startDate.toIso8601String();
    if (releaseDate != null) {
      data['releaseDate'] = releaseDate.toIso8601String();
    }

    await FirestorePaths.version(_db, workspaceId, projectId, versionId)
        .set(data);
    final doc = await FirestorePaths.version(
            _db, workspaceId, projectId, versionId)
        .get();
    return VersionModel.fromFirestore(doc);
  }

  Future<void> updateVersion(String workspaceId, String projectId,
      String versionId, Map<String, dynamic> updates) async {
    await FirestorePaths.version(_db, workspaceId, projectId, versionId)
        .update(updates);
  }

  Future<void> releaseVersion(String workspaceId, String projectId,
      String versionId) async {
    await FirestorePaths.version(_db, workspaceId, projectId, versionId)
        .update({
      'status': VersionStatus.RELEASED.name,
      'releaseDate': isoNow(),
    });
  }

  Future<void> archiveVersion(String workspaceId, String projectId,
      String versionId) async {
    await FirestorePaths.version(_db, workspaceId, projectId, versionId)
        .update({'status': VersionStatus.ARCHIVED.name});
  }

  Future<void> deleteVersion(String workspaceId, String projectId,
      String versionId) async {
    await FirestorePaths.version(_db, workspaceId, projectId, versionId)
        .delete();
  }
}
