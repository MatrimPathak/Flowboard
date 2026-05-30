import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../data/project_repository.dart';
import '../domain/project_model.dart';

part 'project_providers.g.dart';

@riverpod
Stream<List<ProjectModel>> workspaceProjects(
    WorkspaceProjectsRef ref, String workspaceId) {
  return ref
      .watch(projectRepositoryProvider)
      .watchProjects(workspaceId);
}

@riverpod
Future<ProjectModel> project(
    ProjectRef ref, String workspaceId, String projectId) {
  return ref
      .watch(projectRepositoryProvider)
      .getProject(workspaceId, projectId);
}
