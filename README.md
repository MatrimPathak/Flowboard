# FlowBoard

FlowBoard is a modern project management application designed for team collaboration and task tracking. Built with Next.js, Firebase, and the Model Context Protocol (MCP), it offers a premium user experience with real-time updates and AI-ready integrations.

## Features

### Core Functionality

- **Workspace Management**: Organize projects and teams into isolated workspaces.
- **Task Tracking**: Assign, manage, and visualize tasks with Kanban boards, calendars, and list views.
- **User Roles**: Comprehensive role-based access control (Admin/Member).
- **Team Collaboration**: invite members to workspaces via unique invite codes.
- **Real-time Updates**: Powered by Google Cloud Firestore.

### Advanced Features
- **AI-Powered (MCP)**: Built-in Model Context Protocol server allowing AI agents to interact with your projects and tasks.
- **Analytics Dashboard**: Visual insights into project progress, task status, and team performance.
- **File Storage**: Secure image uploads for workspace and project avatars via Firebase Storage.
- **Social Auth**: Support for Google and GitHub authentication.
- **Modern UI**: Dark/Light mode support with a premium, responsive design.

## Tech Stack

### Front-End
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

### Back-End
- **Runtime**: [Node.js](https://nodejs.org/)
- **API Framework**: [Hono](https://hono.dev/) (Running as Next.js API Routes)
- **Database**: [Google Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth) with Session Cookies
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)

### AI Integration
- **Protocol**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- **Server**: Custom MCP server supporting both SSE (HTTP) and STDIO transports.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project

### Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/MatrimPathak/FlowBoard.git
   cd FlowBoard
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory based on `.env.example`:

   ```bash
   # Frontend
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

   # Backend (Admin SDK)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="your_private_key"

   # MCP (Optional)
   MCP_USER_ID=your_user_id_for_mcp_actions
   MCP_SECRET=dev_bypass_secret
   ```

4. **Initialize Firebase**:
   - Enable **Firestore**, **Authentication** (Email, Google, GitHub), and **Storage** in the Firebase Console.
   - Generate a New Private Key from **Project Settings > Service Accounts**.
   - Copy the private key and other details into your `.env` file.

5. **Run the development server**:

   ```bash
   npm run dev
   ```

## MCP Server Usage

FlowBoard includes a Model Context Protocol server that exposes its project management capabilities to AI agents (like Claude Desktop or Gemini).

### Standalone (STDIO)
To use the MCP server locally with an agent:

```bash
npx tsx mcp-server.ts
```

### Over HTTP (SSE)
The MCP server is also available at `/api/mcp` for web-based agent integrations. Authentication is handled via Personal Access Tokens generated in the application settings.

## Contributing
Contributions are welcome! Please open an issue or pull request for any changes.

## License
MIT License - see [LICENSE](LICENSE) for details.
