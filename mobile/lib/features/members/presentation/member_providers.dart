import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../auth/presentation/auth_providers.dart';
import '../data/member_repository.dart';
import '../domain/member_model.dart';

part 'member_providers.g.dart';

@riverpod
Stream<List<MemberModel>> workspaceMembers(
    WorkspaceMembersRef ref, String workspaceId) {
  return ref
      .watch(memberRepositoryProvider)
      .watchWorkspaceMembers(workspaceId);
}

@riverpod
Future<MemberModel?> currentMember(
    CurrentMemberRef ref, String workspaceId) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  return ref
      .watch(memberRepositoryProvider)
      .getMemberByUserId(workspaceId, user.uid);
}

@riverpod
Stream<List<MemberModel>> projectMembers(
    ProjectMembersRef ref, String workspaceId, String projectId) {
  return ref
      .watch(memberRepositoryProvider)
      .watchProjectMembers(workspaceId, projectId);
}
