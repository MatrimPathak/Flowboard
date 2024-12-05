# FlowBoard

FlowBoard is a fully functional project management application designed to enhance team collaboration and streamline task tracking. The platform provides a user-friendly interface, responsive design, and a variety of features tailored to manage projects efficiently.

## Features

### Core Functionality
- **Project Management:** Create and manage multiple projects with ease.
- **Task Tracking:** Assign and track tasks across different teams and individuals.
- **User Management:** Handle team members, roles, and permissions.
- **Team Collaboration:** Simplified communication within teams.

### Advanced Features
- **Search Functionality:** Quickly locate projects, users, or teams.
- **Timeline Views:** Visualize project progress with timelines.
- **Dark and Light Modes:** Toggle between themes for user convenience.
- **Email Authentication:** Secure login with email/password authentication.
- **Analytics Dashboard:** Access insights with dynamic charts and reports.

## Technology Stack

### Front-End
- **Next.js**: Optimized for performance and SEO with server-side rendering.
- **TypeScript**: Ensures robust and type-safe code.
- **TailwindCSS**: Enables rapid UI development with a modern design system.
- **MaterialUI**: Pre-designed components for enhanced UI/UX.
- **Recharts**: Provides dynamic, interactive data visualizations.

### Back-End
- **Node.js**: Server-side runtime for building scalable applications.
- **Express.js**: Simplifies API development.
- **Prisma**: ORM for seamless database interactions.
- **PostgreSQL**: Reliable and scalable relational database.
- **AWS Services**: EC2, RDS, Amplify, and S3 for hosting, database management, and storage.
- **Cognito**: Handles authentication securely.

## Installation

To set up FlowBoard locally, follow these steps:

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/MatrimPathak/FlowBoard.git
   cd FlowBoard
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory.
   - Add the required credentials for AWS services, PostgreSQL, and other integrations.

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Folder Structure

```plaintext
FlowBoard/
├── public/           # Static assets
├── src/
│   ├── components/   # Reusable components
│   ├── pages/        # Application pages
│   ├── features/     # Feature-specific logic
│   ├── store/        # Redux store setup and management
│   ├── styles/       # Global styles
│   ├── utils/        # Utility functions
│   ├── hooks/        # Custom hooks
│   └── api/          # API calls and services
├── package.json      # Project dependencies and scripts
└── README.md         # Project documentation
```

## Contributing

Contributions are welcome! If you'd like to contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- [Next.js](https://nextjs.org/) for the front-end framework.
- [TailwindCSS](https://tailwindcss.com/) for responsive design.
- [AWS](https://aws.amazon.com/) for robust cloud services.
- [Prisma](https://www.prisma.io/) for efficient database management.

---

For any questions or support, feel free to reach out via the repository's [Issues](https://github.com/MatrimPathak/FlowBoard/issues) section.
