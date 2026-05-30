import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'doc_model.freezed.dart';
part 'doc_model.g.dart';

@freezed
class DocModel with _$DocModel {
  const factory DocModel({
    required String id,
    required String title,
    required String workspaceId,
    String? projectId,
    // contentMarkdown is the canonical format — both web TipTap and mobile
    // Quill editors read/write markdown. The legacy 'content' field stores
    // TipTap JSON which mobile ignores.
    String? contentMarkdown,
    String? parentId,
    String? createdByMemberId,
    @Default([]) List<String> collaboratorIds,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _DocModel;

  factory DocModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return DocModel(
      id: doc.id,
      title: data['title'] as String? ?? 'Untitled',
      workspaceId: data['workspaceId'] as String? ?? '',
      projectId: data['projectId'] as String?,
      contentMarkdown: data['contentMarkdown'] as String?,
      parentId: data['parentId'] as String?,
      createdByMemberId: data['createdByMemberId'] as String?,
      collaboratorIds:
          (data['collaboratorIds'] as List<dynamic>?)?.cast<String>() ?? [],
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
      updatedAt: parseDate(data['updatedAt']),
    );
  }

  factory DocModel.fromJson(Map<String, dynamic> json) =>
      _$DocModelFromJson(json);
}
