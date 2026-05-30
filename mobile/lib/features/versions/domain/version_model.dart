import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'version_model.freezed.dart';
part 'version_model.g.dart';

enum VersionStatus {
  UNRELEASED,
  RELEASED,
  ARCHIVED;

  String get label => switch (this) {
        VersionStatus.UNRELEASED => 'Unreleased',
        VersionStatus.RELEASED => 'Released',
        VersionStatus.ARCHIVED => 'Archived',
      };
}

@freezed
class VersionModel with _$VersionModel {
  const factory VersionModel({
    required String id,
    required String name,
    required VersionStatus status,
    required String workspaceId,
    required String projectId,
    String? description,
    DateTime? startDate,
    DateTime? releaseDate,
    DateTime? createdAt,
  }) = _VersionModel;

  factory VersionModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return VersionModel(
      id: doc.id,
      name: data['name'] as String? ?? '',
      status: VersionStatus.values.byName(
          (data['status'] as String?) ?? VersionStatus.UNRELEASED.name),
      workspaceId: data['workspaceId'] as String? ?? '',
      projectId: data['projectId'] as String? ?? '',
      description: data['description'] as String?,
      startDate: parseDate(data['startDate']),
      releaseDate: parseDate(data['releaseDate']),
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory VersionModel.fromJson(Map<String, dynamic> json) =>
      _$VersionModelFromJson(json);
}
