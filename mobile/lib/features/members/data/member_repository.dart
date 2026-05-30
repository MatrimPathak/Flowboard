import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../domain/member_model.dart';

part 'member_repository.g.dart';

@riverpod
MemberRepository memberRepository(MemberRepositoryRef ref) =>
    MemberRepository(FirebaseFirestore.instance);

class MemberRepository {
  MemberRepository(this._db);

  final FirebaseFirestore _db;

  Stream<List<MemberModel>> watchWorkspaceMembers(String workspaceId) {
    return FirestorePaths.members(_db)
        .where('workspaceId', isEqualTo: workspaceId)
        .snapshots()
        .map((snap) =>
            snap.docs.map(MemberModel.fromFirestore).toList());
  }

  Future<MemberModel?> getMemberByUserId(
      String workspaceId, String userId) async {
    final snap = await FirestorePaths.members(_db)
        .where('workspaceId', isEqualTo: workspaceId)
        .where('userId', isEqualTo: userId)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) return null;
    return MemberModel.fromFirestore(snap.docs.first);
  }

  Future<void> updateMemberRole(
      String memberId, MemberRole role) async {
    await FirestorePaths.members(_db)
        .doc(memberId)
        .update({'role': role.name});
  }

  Future<void> removeMember(String memberId) async {
    await FirestorePaths.members(_db).doc(memberId).delete();
  }

  Stream<List<MemberModel>> watchProjectMembers(
      String workspaceId, String projectId) {
    return FirestorePaths.projectMembers(_db, workspaceId, projectId)
        .snapshots()
        .map((snap) =>
            snap.docs.map(MemberModel.fromFirestore).toList());
  }
}
