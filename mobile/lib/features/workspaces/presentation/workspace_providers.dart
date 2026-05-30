import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../auth/presentation/auth_providers.dart';
import '../data/workspace_repository.dart';
import '../domain/workspace_model.dart';

part 'workspace_providers.g.dart';

@riverpod
Stream<List<WorkspaceModel>> userWorkspaces(UserWorkspacesRef ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return Stream.value([]);
  return ref.watch(workspaceRepositoryProvider).watchUserWorkspaces(user.uid);
}

@riverpod
Future<WorkspaceModel> workspace(WorkspaceRef ref, String workspaceId) {
  return ref.watch(workspaceRepositoryProvider).getWorkspace(workspaceId);
}
