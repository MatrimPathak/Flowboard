import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/id_generator.dart';
import '../../tasks/domain/task_model.dart';
import '../domain/sprint_model.dart';

part 'sprint_repository.g.dart';

@riverpod
SprintRepository sprintRepository(SprintRepositoryRef ref) =>
    SprintRepository(FirebaseFirestore.instance);

class SprintRepository {
  SprintRepository(this._db);

  final FirebaseFirestore _db;

  Stream<List<SprintModel>> watchSprints(
      String workspaceId, String projectId) {
    return FirestorePaths.sprints(_db, workspaceId, projectId)
        .orderBy('\$createdAt', descending: false)
        .snapshots()
        .map((snap) =>
            snap.docs.map(SprintModel.fromFirestore).toList());
  }

  Future<SprintModel?> getActiveSprint(
      String workspaceId, String projectId) async {
    final snap = await FirestorePaths.sprints(_db, workspaceId, projectId)
        .where('status', isEqualTo: SprintStatus.ACTIVE.name)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) return null;
    return SprintModel.fromFirestore(snap.docs.first);
  }

  Future<SprintModel> createSprint(
    String workspaceId,
    String projectId,
    String name, {
    String? goal,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final sprintId = generateSprintId();
    final now = isoNow();
    final data = <String, dynamic>{
      'name': name,
      'status': SprintStatus.PLANNED.name,
      'workspaceId': workspaceId,
      'projectId': projectId,
      '\$createdAt': now,
    };
    if (goal != null) data['goal'] = goal;
    if (startDate != null) data['startDate'] = startDate.toIso8601String();
    if (endDate != null) data['endDate'] = endDate.toIso8601String();

    await FirestorePaths.sprint(_db, workspaceId, projectId, sprintId)
        .set(data);

    final doc = await FirestorePaths.sprint(
            _db, workspaceId, projectId, sprintId)
        .get();
    return SprintModel.fromFirestore(doc);
  }

  Future<void> updateSprint(String workspaceId, String projectId,
      String sprintId, Map<String, dynamic> updates) async {
    await FirestorePaths.sprint(_db, workspaceId, projectId, sprintId)
        .update(updates);
  }

  Future<void> startSprint(String workspaceId, String projectId,
      String sprintId, DateTime startDate, DateTime endDate) async {
    await FirestorePaths.sprint(_db, workspaceId, projectId, sprintId)
        .update({
      'status': SprintStatus.ACTIVE.name,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
    });
  }

  // Complete sprint: move incomplete tasks back to backlog (no sprintId)
  Future<void> completeSprint(
      String workspaceId, String projectId, String sprintId) async {
    final batch = _db.batch();

    // Mark sprint completed
    batch.update(
      FirestorePaths.sprint(_db, workspaceId, projectId, sprintId),
      {'status': SprintStatus.COMPLETED.name},
    );

    // Move non-DONE tasks back to backlog
    final incompleteTasks = await FirestorePaths.tasks(
            _db, workspaceId, projectId)
        .where('sprintId', isEqualTo: sprintId)
        .where('status', isNotEqualTo: TaskStatus.DONE.name)
        .get();

    for (final doc in incompleteTasks.docs) {
      batch.update(doc.reference, {
        'sprintId': null,
        'status': TaskStatus.BACKLOG.name,
      });
    }

    await batch.commit();
  }

  Future<void> deleteSprint(
      String workspaceId, String projectId, String sprintId) async {
    // Only PLANNED sprints can be deleted
    await FirestorePaths.sprint(_db, workspaceId, projectId, sprintId)
        .delete();
  }
}
