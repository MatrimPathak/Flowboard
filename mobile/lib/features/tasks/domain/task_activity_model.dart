import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'task_activity_model.freezed.dart';
part 'task_activity_model.g.dart';

enum ActivityType {
  FIELD_CHANGE,
  COMMENT_ADDED,
  ATTACHMENT_ADDED,
  ATTACHMENT_REMOVED,
  WATCHER_ADDED,
  WATCHER_REMOVED,
  LINK_ADDED,
  LINK_REMOVED,
  WORK_LOGGED,
  WORKLOG_DELETED;
}

@freezed
class TaskActivityModel with _$TaskActivityModel {
  const factory TaskActivityModel({
    required String id,
    required String taskId,
    required String memberId,
    required String memberName,
    required ActivityType type,
    String? field,
    String? oldValue,
    String? newValue,
    DateTime? createdAt,
  }) = _TaskActivityModel;

  factory TaskActivityModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    ActivityType parseType(String? raw) {
      try {
        return ActivityType.values.byName(raw ?? 'FIELD_CHANGE');
      } catch (_) {
        return ActivityType.FIELD_CHANGE;
      }
    }

    return TaskActivityModel(
      id: doc.id,
      taskId: data['taskId'] as String? ?? '',
      memberId: data['memberId'] as String? ?? '',
      memberName: data['memberName'] as String? ?? '',
      type: parseType(data['type'] as String?),
      field: data['field'] as String?,
      oldValue: data['oldValue'] as String?,
      newValue: data['newValue'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory TaskActivityModel.fromJson(Map<String, dynamic> json) =>
      _$TaskActivityModelFromJson(json);
}
