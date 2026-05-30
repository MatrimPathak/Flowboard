import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'task_model.freezed.dart';
part 'task_model.g.dart';

enum TaskStatus {
  BACKLOG,
  TODO,
  IN_PROGRESS,
  UNDER_REVIEW,
  DONE;

  String get label => switch (this) {
        TaskStatus.BACKLOG => 'Backlog',
        TaskStatus.TODO => 'To Do',
        TaskStatus.IN_PROGRESS => 'In Progress',
        TaskStatus.UNDER_REVIEW => 'Under Review',
        TaskStatus.DONE => 'Done',
      };
}

enum TaskPriority {
  CRITICAL,
  HIGH,
  MEDIUM,
  LOW;

  String get label => switch (this) {
        TaskPriority.CRITICAL => 'Critical',
        TaskPriority.HIGH => 'High',
        TaskPriority.MEDIUM => 'Medium',
        TaskPriority.LOW => 'Low',
      };
}

enum IssueType {
  EPIC,
  STORY,
  SPIKE,
  BUG,
  TASK;

  String get label => switch (this) {
        IssueType.EPIC => 'Epic',
        IssueType.STORY => 'Story',
        IssueType.SPIKE => 'Spike',
        IssueType.BUG => 'Bug',
        IssueType.TASK => 'Task',
      };
}

enum LinkType {
  BLOCKS,
  IS_BLOCKED_BY,
  RELATES_TO,
  DUPLICATES;

  String get label => switch (this) {
        LinkType.BLOCKS => 'Blocks',
        LinkType.IS_BLOCKED_BY => 'Is blocked by',
        LinkType.RELATES_TO => 'Relates to',
        LinkType.DUPLICATES => 'Duplicates',
      };
}

@freezed
class TaskModel with _$TaskModel {
  const factory TaskModel({
    required String id,
    required String name,
    required TaskStatus status,
    required String workspaceId,
    required String projectId,
    String? assigneeId,
    DateTime? dueDate,
    @Default(1000) int position,
    String? description,
    String? acceptanceCriteria,
    IssueType? issueType,
    TaskPriority? priority,
    String? parentId,
    @Default([]) List<String> labels,
    String? sprintId,
    int? storyPoints,
    String? epicId,
    String? fixVersionId,
    int? originalEstimate,
    int? remainingEstimate,
    int? timeSpent,
    String? rca,
    @Default([]) List<String> watcherIds,
    DateTime? createdAt,
  }) = _TaskModel;

  factory TaskModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;

    TaskStatus parseStatus(String? raw) {
      if (raw == null) return TaskStatus.BACKLOG;
      try {
        return TaskStatus.values.byName(raw);
      } catch (_) {
        return TaskStatus.BACKLOG;
      }
    }

    TaskPriority? parsePriority(String? raw) {
      if (raw == null) return null;
      // Handle legacy priorities from the web app
      if (raw == 'BLOCKER') return TaskPriority.CRITICAL;
      if (raw == 'TRIVIAL') return TaskPriority.LOW;
      try {
        return TaskPriority.values.byName(raw);
      } catch (_) {
        return null;
      }
    }

    return TaskModel(
      id: doc.id,
      name: data['name'] as String? ?? '',
      status: parseStatus(data['status'] as String?),
      workspaceId: data['workspaceId'] as String? ?? '',
      projectId: data['projectId'] as String? ?? '',
      assigneeId: data['assigneeId'] as String?,
      dueDate: parseDate(data['dueDate']),
      position: (data['position'] as num?)?.toInt() ?? 1000,
      description: data['description'] as String?,
      acceptanceCriteria: data['acceptanceCriteria'] as String?,
      issueType: data['issueType'] != null
          ? IssueType.values.byName(data['issueType'] as String)
          : null,
      priority: parsePriority(data['priority'] as String?),
      parentId: data['parentId'] as String?,
      labels: (data['labels'] as List<dynamic>?)?.cast<String>() ?? [],
      sprintId: data['sprintId'] as String?,
      storyPoints: (data['storyPoints'] as num?)?.toInt(),
      epicId: data['epicId'] as String?,
      fixVersionId: data['fixVersionId'] as String?,
      originalEstimate: (data['originalEstimate'] as num?)?.toInt(),
      remainingEstimate: (data['remainingEstimate'] as num?)?.toInt(),
      timeSpent: (data['timeSpent'] as num?)?.toInt(),
      rca: data['rca'] as String?,
      watcherIds:
          (data['watcherIds'] as List<dynamic>?)?.cast<String>() ?? [],
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory TaskModel.fromJson(Map<String, dynamic> json) =>
      _$TaskModelFromJson(json);
}
