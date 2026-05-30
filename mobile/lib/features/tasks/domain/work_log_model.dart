import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'work_log_model.freezed.dart';
part 'work_log_model.g.dart';

@freezed
class WorkLogModel with _$WorkLogModel {
  const factory WorkLogModel({
    required String id,
    required String taskId,
    required String memberId,
    required String memberName,
    required int timeSpent, // minutes
    required DateTime date,
    String? description,
    DateTime? createdAt,
  }) = _WorkLogModel;

  factory WorkLogModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return WorkLogModel(
      id: doc.id,
      taskId: data['taskId'] as String? ?? '',
      memberId: data['memberId'] as String? ?? '',
      memberName: data['memberName'] as String? ?? '',
      timeSpent: (data['timeSpent'] as num?)?.toInt() ?? 0,
      date: parseDate(data['date']) ?? DateTime.now(),
      description: data['description'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory WorkLogModel.fromJson(Map<String, dynamic> json) =>
      _$WorkLogModelFromJson(json);
}
