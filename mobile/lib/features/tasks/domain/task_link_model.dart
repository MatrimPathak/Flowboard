import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';
import 'task_model.dart';

part 'task_link_model.freezed.dart';
part 'task_link_model.g.dart';

@freezed
class TaskLinkModel with _$TaskLinkModel {
  const factory TaskLinkModel({
    required String id,
    required String taskId,
    required String targetTaskId,
    required LinkType type,
    String? targetTaskName,
    TaskStatus? targetTaskStatus,
    TaskPriority? targetTaskPriority,
    String? targetWorkspaceId,
    String? targetProjectId,
    DateTime? createdAt,
  }) = _TaskLinkModel;

  factory TaskLinkModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    final target = data['targetTask'] as Map<String, dynamic>?;
    return TaskLinkModel(
      id: doc.id,
      taskId: data['taskId'] as String? ?? '',
      targetTaskId: data['targetTaskId'] as String? ?? '',
      type: LinkType.values.byName(data['type'] as String? ?? 'RELATES_TO'),
      targetTaskName: target?['name'] as String?,
      targetTaskStatus: target?['status'] != null
          ? TaskStatus.values.byName(target!['status'] as String)
          : null,
      targetWorkspaceId: data['targetWorkspaceId'] as String?,
      targetProjectId: data['targetProjectId'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory TaskLinkModel.fromJson(Map<String, dynamic> json) =>
      _$TaskLinkModelFromJson(json);
}
