import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/constants/firestore_paths.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/id_generator.dart';
import '../domain/task_attachment_model.dart';
import '../domain/task_comment_model.dart';
import '../domain/task_link_model.dart';
import '../domain/task_model.dart';
import '../domain/task_activity_model.dart';
import '../domain/work_log_model.dart';

part 'task_repository.g.dart';

@riverpod
TaskRepository taskRepository(TaskRepositoryRef ref) =>
    TaskRepository(FirebaseFirestore.instance);

class TaskFilters {
  const TaskFilters({
    this.status,
    this.priority,
    this.issueType,
    this.assigneeId,
    this.sprintId,
    this.epicId,
    this.search,
  });

  final TaskStatus? status;
  final TaskPriority? priority;
  final IssueType? issueType;
  final String? assigneeId;
  final String? sprintId;
  final String? epicId;
  final String? search;

  bool matches(TaskModel task) {
    if (status != null && task.status != status) return false;
    if (priority != null && task.priority != priority) return false;
    if (issueType != null && task.issueType != issueType) return false;
    if (assigneeId != null && task.assigneeId != assigneeId) return false;
    if (sprintId != null && task.sprintId != sprintId) return false;
    if (epicId != null && task.epicId != epicId) return false;
    if (search != null && search!.isNotEmpty) {
      return task.name.toLowerCase().contains(search!.toLowerCase()) ||
          task.id.toLowerCase().contains(search!.toLowerCase());
    }
    return true;
  }
}

class TaskRepository {
  TaskRepository(this._db);

  final FirebaseFirestore _db;

  // ── Queries ────────────────────────────────────────────────────────────────

  Stream<List<TaskModel>> watchProjectTasks(
    String workspaceId,
    String projectId, {
    TaskFilters? filters,
  }) {
    return FirestorePaths.tasks(_db, workspaceId, projectId)
        .orderBy('position')
        .snapshots()
        .map((snap) => snap.docs
            .map(TaskModel.fromFirestore)
            .where((t) => filters?.matches(t) ?? true)
            .toList());
  }

  Stream<List<TaskModel>> watchWorkspaceTasks(String workspaceId) {
    // All tasks across projects — uses collectionGroup.
    // Requires a collectionGroup index on 'tasks' for workspaceId.
    return _db
        .collectionGroup('tasks')
        .where('workspaceId', isEqualTo: workspaceId)
        .snapshots()
        .map((snap) =>
            snap.docs.map(TaskModel.fromFirestore).toList());
  }

  Future<TaskModel> getTask(
      String workspaceId, String projectId, String taskId) async {
    final doc =
        await FirestorePaths.task(_db, workspaceId, projectId, taskId).get();
    if (!doc.exists) throw Exception('Task not found');
    return TaskModel.fromFirestore(doc);
  }

  Future<TaskModel> createTask({
    required String workspaceId,
    required String projectId,
    required String name,
    required TaskStatus status,
    IssueType? issueType,
    TaskPriority? priority,
    String? assigneeId,
    String? description,
    String? epicId,
    String? sprintId,
    String? fixVersionId,
    DateTime? dueDate,
    int? storyPoints,
    int? originalEstimate,
    String? acceptanceCriteria,
    String? rca,
  }) async {
    final type = issueType ?? IssueType.task;
    final taskId = generateTaskId(type);
    final now = isoNow();

    final data = <String, dynamic>{
      'name': name,
      'status': status.name,
      'workspaceId': workspaceId,
      'projectId': projectId,
      '\$createdAt': now,
      'position': DateTime.now().millisecondsSinceEpoch,
    };

    if (issueType != null) data['issueType'] = issueType.name;
    if (priority != null) data['priority'] = priority.name;
    if (assigneeId != null) data['assigneeId'] = assigneeId;
    if (description != null) data['description'] = description;
    if (epicId != null) data['epicId'] = epicId;
    if (sprintId != null) data['sprintId'] = sprintId;
    if (fixVersionId != null) data['fixVersionId'] = fixVersionId;
    if (dueDate != null) data['dueDate'] = dueDate.toIso8601String();
    if (storyPoints != null) data['storyPoints'] = storyPoints;
    if (originalEstimate != null) data['originalEstimate'] = originalEstimate;
    if (acceptanceCriteria != null) data['acceptanceCriteria'] = acceptanceCriteria;
    if (rca != null) data['rca'] = rca;

    await FirestorePaths.task(_db, workspaceId, projectId, taskId).set(data);
    return getTask(workspaceId, projectId, taskId);
  }

  Future<void> updateTask(
    String workspaceId,
    String projectId,
    String taskId,
    Map<String, dynamic> updates, {
    String? memberId,
    String? memberName,
  }) async {
    await FirestorePaths.task(_db, workspaceId, projectId, taskId)
        .update(updates);
    // Log activity for field changes
    if (memberId != null && memberName != null) {
      for (final entry in updates.entries) {
        await _logActivity(
          workspaceId: workspaceId,
          projectId: projectId,
          taskId: taskId,
          memberId: memberId,
          memberName: memberName,
          type: ActivityType.FIELD_CHANGE,
          field: entry.key,
          newValue: entry.value?.toString(),
        );
      }
    }
  }

  Future<void> deleteTask(
      String workspaceId, String projectId, String taskId) async {
    await FirestorePaths.task(_db, workspaceId, projectId, taskId).delete();
  }

  // Bulk update status + position (for kanban drag-and-drop)
  Future<void> bulkUpdateTasks(
    String workspaceId,
    String projectId,
    List<({String taskId, TaskStatus status, int position})> updates,
  ) async {
    final batch = _db.batch();
    for (final u in updates) {
      batch.update(
        FirestorePaths.task(_db, workspaceId, projectId, u.taskId),
        {'status': u.status.name, 'position': u.position},
      );
    }
    await batch.commit();
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  Stream<List<TaskCommentModel>> watchComments(
      String workspaceId, String projectId, String taskId) {
    return FirestorePaths.taskComments(_db, workspaceId, projectId, taskId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map(TaskCommentModel.fromFirestore).toList());
  }

  Future<void> addComment(
    String workspaceId,
    String projectId,
    String taskId,
    String authorId,
    String authorName,
    String authorEmail,
    String content,
  ) async {
    final commentId = generateCommentId();
    await FirestorePaths.taskComments(_db, workspaceId, projectId, taskId)
        .doc(commentId)
        .set({
      'taskId': taskId,
      'authorId': authorId,
      'content': content,
      'author': {'name': authorName, 'email': authorEmail},
      '\$createdAt': isoNow(),
    });
  }

  Future<void> deleteComment(String workspaceId, String projectId,
      String taskId, String commentId) async {
    await FirestorePaths.taskComments(_db, workspaceId, projectId, taskId)
        .doc(commentId)
        .delete();
  }

  // ── Work logs ──────────────────────────────────────────────────────────────

  Stream<List<WorkLogModel>> watchWorklogs(
      String workspaceId, String projectId, String taskId) {
    return FirestorePaths.taskWorklogs(_db, workspaceId, projectId, taskId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map(WorkLogModel.fromFirestore).toList());
  }

  Future<void> logWork(
    String workspaceId,
    String projectId,
    String taskId,
    String memberId,
    String memberName,
    int timeSpent,
    DateTime date, {
    String? description,
  }) async {
    final worklogId = generateWorklogId();
    final batch = _db.batch();

    batch.set(
      FirestorePaths.taskWorklogs(_db, workspaceId, projectId, taskId)
          .doc(worklogId),
      {
        'taskId': taskId,
        'memberId': memberId,
        'memberName': memberName,
        'timeSpent': timeSpent,
        'date': date.toIso8601String(),
        if (description != null) 'description': description,
        '\$createdAt': isoNow(),
      },
    );

    // Increment timeSpent and decrement remainingEstimate on the task
    batch.update(
      FirestorePaths.task(_db, workspaceId, projectId, taskId),
      {
        'timeSpent': FieldValue.increment(timeSpent),
        'remainingEstimate': FieldValue.increment(-timeSpent),
      },
    );

    await batch.commit();
  }

  Future<void> deleteWorklog(String workspaceId, String projectId,
      String taskId, String worklogId, int timeSpent) async {
    final batch = _db.batch();
    batch.delete(
        FirestorePaths.taskWorklogs(_db, workspaceId, projectId, taskId)
            .doc(worklogId));
    batch.update(
      FirestorePaths.task(_db, workspaceId, projectId, taskId),
      {'timeSpent': FieldValue.increment(-timeSpent)},
    );
    await batch.commit();
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  Stream<List<TaskAttachmentModel>> watchAttachments(
      String workspaceId, String projectId, String taskId) {
    return FirestorePaths.taskAttachments(_db, workspaceId, projectId, taskId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map(TaskAttachmentModel.fromFirestore).toList());
  }

  Future<void> addAttachment(
    String workspaceId,
    String projectId,
    String taskId,
    String memberId,
    String url,
    String name,
    String storagePath, {
    String? fileType,
    int? fileSize,
  }) async {
    final attId = generateAttachmentId();
    await FirestorePaths.taskAttachments(_db, workspaceId, projectId, taskId)
        .doc(attId)
        .set({
      'taskId': taskId,
      'uploadedByMemberId': memberId,
      'url': url,
      'name': name,
      'storagePath': storagePath,
      if (fileType != null) 'fileType': fileType,
      if (fileSize != null) 'fileSize': fileSize,
      '\$createdAt': isoNow(),
    });
  }

  Future<void> deleteAttachment(String workspaceId, String projectId,
      String taskId, String attachmentId) async {
    await FirestorePaths.taskAttachments(_db, workspaceId, projectId, taskId)
        .doc(attachmentId)
        .delete();
  }

  // ── Task links ─────────────────────────────────────────────────────────────

  Stream<List<TaskLinkModel>> watchLinks(
      String workspaceId, String projectId, String taskId) {
    return FirestorePaths.taskLinks(_db, workspaceId, projectId, taskId)
        .snapshots()
        .map((snap) =>
            snap.docs.map(TaskLinkModel.fromFirestore).toList());
  }

  Future<void> addLink(
    String workspaceId,
    String projectId,
    String taskId,
    String targetTaskId,
    LinkType type,
  ) async {
    final linkId = generateLinkId();
    await FirestorePaths.taskLinks(_db, workspaceId, projectId, taskId)
        .doc(linkId)
        .set({
      'taskId': taskId,
      'targetTaskId': targetTaskId,
      'type': type.name,
      '\$createdAt': isoNow(),
    });
  }

  Future<void> deleteLink(String workspaceId, String projectId,
      String taskId, String linkId) async {
    await FirestorePaths.taskLinks(_db, workspaceId, projectId, taskId)
        .doc(linkId)
        .delete();
  }

  // ── Watchers ───────────────────────────────────────────────────────────────

  Future<void> addWatcher(String workspaceId, String projectId,
      String taskId, String memberId) async {
    await FirestorePaths.task(_db, workspaceId, projectId, taskId).update({
      'watcherIds': FieldValue.arrayUnion([memberId]),
    });
  }

  Future<void> removeWatcher(String workspaceId, String projectId,
      String taskId, String memberId) async {
    await FirestorePaths.task(_db, workspaceId, projectId, taskId).update({
      'watcherIds': FieldValue.arrayRemove([memberId]),
    });
  }

  // ── Activity ───────────────────────────────────────────────────────────────

  Stream<List<TaskActivityModel>> watchActivity(
      String workspaceId, String projectId, String taskId) {
    return FirestorePaths.taskActivity(_db, workspaceId, projectId, taskId)
        .orderBy('\$createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map(TaskActivityModel.fromFirestore).toList());
  }

  Future<void> _logActivity({
    required String workspaceId,
    required String projectId,
    required String taskId,
    required String memberId,
    required String memberName,
    required ActivityType type,
    String? field,
    String? oldValue,
    String? newValue,
  }) async {
    final activityId = generateActivityId();
    await FirestorePaths.taskActivity(_db, workspaceId, projectId, taskId)
        .doc(activityId)
        .set({
      'taskId': taskId,
      'memberId': memberId,
      'memberName': memberName,
      'type': type.name,
      if (field != null) 'field': field,
      if (oldValue != null) 'oldValue': oldValue,
      if (newValue != null) 'newValue': newValue,
      '\$createdAt': isoNow(),
    });
  }
}
