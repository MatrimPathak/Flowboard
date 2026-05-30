import 'package:flutter/material.dart';

import '../../../../core/widgets/app_avatar.dart';
import '../../domain/member_model.dart';

class MemberAvatar extends StatelessWidget {
  const MemberAvatar({super.key, required this.member, this.size = 36});

  final MemberModel member;
  final double size;

  @override
  Widget build(BuildContext context) => AppAvatar(
        name: member.name ?? member.email ?? '?',
        imageUrl: member.imageUrl,
        size: size,
      );
}
