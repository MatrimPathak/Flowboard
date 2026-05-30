import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'task_comment_model.freezed.dart';
part 'task_comment_model.g.dart';

@freezed
class TaskCommentModel with _$TaskCommentModel {
  const factory TaskCommentModel({
    required String id,
    required String taskId,
    required String authorId,
    required String content,
    String? authorName,
    String? authorEmail,
    DateTime? createdAt,
  }) = _TaskCommentModel;

  factory TaskCommentModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    final author = data['author'] as Map<String, dynamic>?;
    return TaskCommentModel(
      id: doc.id,
      taskId: data['taskId'] as String? ?? '',
      authorId: data['authorId'] as String? ?? '',
      content: data['content'] as String? ?? '',
      authorName: author?['name'] as String?,
      authorEmail: author?['email'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory TaskCommentModel.fromJson(Map<String, dynamic> json) =>
      _$TaskCommentModelFromJson(json);
}
