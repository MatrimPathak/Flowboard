import 'package:flutter/material.dart';

import '../../../../core/widgets/app_avatar.dart';
import '../../domain/workspace_model.dart';

class WorkspaceCard extends StatelessWidget {
  const WorkspaceCard({
    super.key,
    required this.workspace,
    required this.onTap,
  });

  final WorkspaceModel workspace;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: AppAvatar(
          name: workspace.name,
          imageUrl: workspace.imageUrl,
          size: 40,
        ),
        title: Text(workspace.name,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
