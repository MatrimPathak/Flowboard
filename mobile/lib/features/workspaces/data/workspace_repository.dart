import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/id_generator.dart';
import '../../members/domain/member_model.dart';
import '../domain/workspace_model.dart';

part 'workspace_repository.g.dart';

@riverpod
WorkspaceRepository workspaceRepository(WorkspaceRepositoryRef ref) =>
    WorkspaceRepository(FirebaseFirestore.instance);

class WorkspaceRepository {
  WorkspaceRepository(this._db);

  final FirebaseFirestore _db;

  Stream<List<WorkspaceModel>> watchUserWorkspaces(String userId) {
    // Query workspaces where the current user has a member doc
    // Since members is a root collection, we first get member docs for this
    // user, then fetch the corresponding workspaces.
    return FirestorePaths.members(_db)
        .where('userId', isEqualTo: userId)
        .snapshots()
        .asyncMap((memberSnap) async {
      if (memberSnap.docs.isEmpty) return [];
      final workspaceIds =
          memberSnap.docs.map((d) => d['workspaceId'] as String).toList();
      final futures = workspaceIds.map((id) =>
          FirestorePaths.workspace(_db, id).get());
      final results = await Future.wait(futures);
      return results
          .where((d) => d.exists)
          .map((d) => WorkspaceModel.fromFirestore(d))
          .toList();
    });
  }

  Future<WorkspaceModel> getWorkspace(String workspaceId) async {
    final doc = await FirestorePaths.workspace(_db, workspaceId).get();
    if (!doc.exists) throw Exception('Workspace not found');
    return WorkspaceModel.fromFirestore(doc);
  }

  Future<WorkspaceModel> createWorkspace(
      String name, String userId, String userEmail, String? userName) async {
    final workspaceId = generateWorkspaceId();
    final memberId = generateMemberId();
    final now = isoNow();
    final inviteCode = generateInviteCode();

    final batch = _db.batch();

    batch.set(FirestorePaths.workspace(_db, workspaceId), {
      'name': name,
      'userId': userId,
      'inviteCode': inviteCode,
      '\$createdAt': now,
    });

    batch.set(FirestorePaths.members(_db).doc(memberId), {
      'workspaceId': workspaceId,
      'userId': userId,
      'role': MemberRole.ADMIN.name,
      'name': userName,
      'email': userEmail,
      '\$createdAt': now,
    });

    await batch.commit();
    return getWorkspace(workspaceId);
  }

  Future<void> updateWorkspace(
      String workspaceId, Map<String, dynamic> updates) async {
    await FirestorePaths.workspace(_db, workspaceId).update(updates);
  }

  Future<void> deleteWorkspace(String workspaceId) async {
    // Note: This only deletes the workspace doc. Subcollection cleanup should
    // be handled via a Cloud Function or the web API for complete removal.
    await FirestorePaths.workspace(_db, workspaceId).delete();
  }

  Future<String> resetInviteCode(String workspaceId) async {
    final newCode = generateInviteCode();
    await FirestorePaths.workspace(_db, workspaceId)
        .update({'inviteCode': newCode});
    return newCode;
  }

  Future<WorkspaceModel> joinWithInviteCode(
      String workspaceId,
      String inviteCode,
      String userId,
      String userEmail,
      String? userName) async {
    final workspace = await getWorkspace(workspaceId);
    if (workspace.inviteCode != inviteCode) {
      throw Exception('Invalid invite code');
    }

    // Check if already a member
    final existing = await FirestorePaths.members(_db)
        .where('workspaceId', isEqualTo: workspaceId)
        .where('userId', isEqualTo: userId)
        .limit(1)
        .get();

    if (existing.docs.isNotEmpty) return workspace;

    final memberId = generateMemberId();
    await FirestorePaths.members(_db).doc(memberId).set({
      'workspaceId': workspaceId,
      'userId': userId,
      'role': MemberRole.MEMBER.name,
      'name': userName,
      'email': userEmail,
      '\$createdAt': isoNow(),
    });

    return workspace;
  }
}
