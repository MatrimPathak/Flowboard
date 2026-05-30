import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'project_model.freezed.dart';
part 'project_model.g.dart';

@freezed
class ProjectModel with _$ProjectModel {
  const factory ProjectModel({
    required String id,
    required String name,
    required String workspaceId,
    String? imageUrl,
    bool? membersBootstrapped,
    DateTime? createdAt,
  }) = _ProjectModel;

  factory ProjectModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return ProjectModel(
      id: doc.id,
      name: data['name'] as String? ?? '',
      workspaceId: data['workspaceId'] as String? ?? '',
      imageUrl: data['imageUrl'] as String?,
      membersBootstrapped: data['membersBootstrapped'] as bool?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory ProjectModel.fromJson(Map<String, dynamic> json) =>
      _$ProjectModelFromJson(json);
}
