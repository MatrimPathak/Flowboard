import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../members/domain/member_model.dart';
import '../../../members/presentation/member_providers.dart';

class WorkspaceMembersScreen extends ConsumerWidget {
  const WorkspaceMembersScreen({super.key, required this.workspaceId});

  final String workspaceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(workspaceMembersProvider(workspaceId));

    return Scaffold(
      appBar: AppBar(title: const Text('Members')),
      body: membersAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorView(error: e),
        data: (members) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: members.length,
          separatorBuilder: (_, __) => const SizedBox(height: 4),
          itemBuilder: (_, i) => _MemberTile(member: members[i]),
        ),
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member});

  final MemberModel member;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: AppAvatar(
        name: member.name ?? member.email ?? '?',
        size: 36,
      ),
      title: Text(member.name ?? member.email ?? 'Unknown'),
      subtitle: member.email != null ? Text(member.email!) : null,
      trailing: Chip(
        label: Text(member.role.label),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
