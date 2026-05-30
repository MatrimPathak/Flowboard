import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../data/sprint_repository.dart';
import '../domain/sprint_model.dart';

part 'sprint_providers.g.dart';

@riverpod
Stream<List<SprintModel>> projectSprints(
    ProjectSprintsRef ref, String workspaceId, String projectId) {
  return ref
      .watch(sprintRepositoryProvider)
      .watchSprints(workspaceId, projectId);
}

@riverpod
Future<SprintModel?> activeSprint(
    ActiveSprintRef ref, String workspaceId, String projectId) {
  return ref
      .watch(sprintRepositoryProvider)
      .getActiveSprint(workspaceId, projectId);
}
