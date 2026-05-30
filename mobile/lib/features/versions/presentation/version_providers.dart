import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../data/version_repository.dart';
import '../domain/version_model.dart';

part 'version_providers.g.dart';

@riverpod
Stream<List<VersionModel>> projectVersions(
    ProjectVersionsRef ref, String workspaceId, String projectId) {
  return ref
      .watch(versionRepositoryProvider)
      .watchVersions(workspaceId, projectId);
}
