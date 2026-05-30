import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../core/utils/date_utils.dart';

part 'member_model.freezed.dart';
part 'member_model.g.dart';

enum MemberRole {
  ADMIN,
  MEMBER;

  String get label => switch (this) {
        MemberRole.ADMIN => 'Admin',
        MemberRole.MEMBER => 'Member',
      };
}

@freezed
class MemberModel with _$MemberModel {
  const factory MemberModel({
    required String id,
    required String workspaceId,
    required String userId,
    required MemberRole role,
    String? name,
    String? email,
    String? imageUrl,
    DateTime? createdAt,
  }) = _MemberModel;

  factory MemberModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return MemberModel(
      id: doc.id,
      workspaceId: data['workspaceId'] as String,
      userId: data['userId'] as String,
      role: MemberRole.values.byName(
          (data['role'] as String?) ?? MemberRole.MEMBER.name),
      name: data['name'] as String?,
      email: data['email'] as String?,
      imageUrl: data['imageUrl'] as String?,
      createdAt: parseDate(data['\$createdAt'] ?? data['createdAt']),
    );
  }

  factory MemberModel.fromJson(Map<String, dynamic> json) =>
      _$MemberModelFromJson(json);
}
