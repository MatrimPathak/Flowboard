import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'sprint_model.freezed.dart';
part 'sprint_model.g.dart';

enum SprintStatus {
  PLANNED,
  ACTIVE,
  COMPLETED;

  String get label => switch (this) {
        SprintStatus.PLANNED => 'Planned',
        SprintStatus.ACTIVE => 'Active',
        SprintStatus.COMPLETED => 'Completed',
      };
}

@freezed
class SprintModel with _$SprintModel {
  const factory SprintModel({
    required String id,
    required String name,
    required SprintStatus status,
    required String workspaceId,
    required String projectId,
    String? goal,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? createdAt,
  }) = _SprintModel;

  factory SprintModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return SprintModel(
      id: doc.id,
      name: data['name'] as String? ?? '',
      status: SprintStatus.values.byName(
          (data['status'] as String?) ?? SprintStatus.PLANNED.name),
      workspaceId: data['workspaceId'] as String? ?? '',
      projectId: data['projectId'] as String? ?? '',
      goal: data['goal'] as String?,
      startDate: parseDate(data['startDate']),
      endDate: parseDate(data['endDate']),
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory SprintModel.fromJson(Map<String, dynamic> json) =>
      _$SprintModelFromJson(json);
}
