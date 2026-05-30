import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'task_attachment_model.freezed.dart';
part 'task_attachment_model.g.dart';

@freezed
class TaskAttachmentModel with _$TaskAttachmentModel {
  const factory TaskAttachmentModel({
    required String id,
    required String taskId,
    required String url,
    required String name,
    String? fileType,
    int? fileSize,
    String? storagePath,
    String? uploadedByMemberId,
    DateTime? createdAt,
  }) = _TaskAttachmentModel;

  factory TaskAttachmentModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return TaskAttachmentModel(
      id: doc.id,
      taskId: data['taskId'] as String? ?? '',
      url: data['url'] as String? ?? '',
      name: data['name'] as String? ?? '',
      fileType: data['fileType'] as String?,
      fileSize: (data['fileSize'] as num?)?.toInt(),
      storagePath: data['storagePath'] as String?,
      uploadedByMemberId: data['uploadedByMemberId'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory TaskAttachmentModel.fromJson(Map<String, dynamic> json) =>
      _$TaskAttachmentModelFromJson(json);
}
