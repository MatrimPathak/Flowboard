import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'workspace_model.freezed.dart';
part 'workspace_model.g.dart';

@freezed
class WorkspaceModel with _$WorkspaceModel {
  const factory WorkspaceModel({
    required String id,
    required String name,
    required String userId,
    String? imageUrl,
    String? inviteCode,
    DateTime? createdAt,
  }) = _WorkspaceModel;

  factory WorkspaceModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return WorkspaceModel(
      id: doc.id,
      name: data['name'] as String? ?? '',
      userId: data['userId'] as String? ?? '',
      imageUrl: data['imageUrl'] as String?,
      inviteCode: data['inviteCode'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory WorkspaceModel.fromJson(Map<String, dynamic> json) =>
      _$WorkspaceModelFromJson(json);
}
