import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../members/presentation/member_providers.dart';

class ProjectMembersScreen extends ConsumerWidget {
  const ProjectMembersScreen({
    super.key,
    required this.workspaceId,
    required this.projectId,
  });

  final String workspaceId;
  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync =
        ref.watch(projectMembersProvider(workspaceId, projectId));

    return Scaffold(
      appBar: AppBar(title: const Text('Project members')),
      body: membersAsync.when(
        loading: () => const ShimmerList(),
        error: (e, _) => ErrorView(error: e),
        data: (members) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: members.length,
          separatorBuilder: (_, __) => const SizedBox(height: 4),
          itemBuilder: (_, i) => ListTile(
            leading: AppAvatar(
              name: members[i].name ?? members[i].email ?? '?',
              size: 36,
            ),
            title: Text(members[i].name ?? members[i].email ?? 'Unknown'),
            trailing: Chip(
              label: Text(members[i].role.label),
              visualDensity: VisualDensity.compact,
            ),
          ),
        ),
      ),
    );
  }
}
