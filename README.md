# FlowBoard

FlowBoard is a fully functional project management application designed to enhance team collaboration and streamline task tracking. The platform provides a user-friendly interface, responsive design, and a variety of features tailored to manage projects efficiently.

## Project Structure

The project is organized as follows:

- **`public/`**: Static assets such as images and fonts.
- **`src/`**: Contains the main application components and pages.
  - **`components/`**: Reusable UI components used throughout the application.
  - **`pages/`**: Application pages.
  - **`features/`**: Feature-specific logic.
  - **`store/`**: Redux store setup and management.
  - **`styles/`**: Global styles.
  - **`utils/`**: Utility functions.
  - **`hooks/`**: Custom hooks.
  - **`api/`**: API calls and services.

## Features

### Core Functionality

- **Project Management**: Create and manage multiple projects with ease.
- **Task Tracking**: Assign and track tasks across different teams and individuals.
- **User Management**: Handle team members, roles, and permissions.
- **Team Collaboration**: Simplified communication within teams.

### Advanced Features

- **Search Functionality**: Quickly locate projects, users, or teams.
- **Timeline Views**: Visualize project progress with timelines.
- **Dark and Light Modes**: Toggle between themes for user convenience.
- **Email Authentication**: Secure login with email/password authentication.
- **Analytics Dashboard**: Access insights with dynamic charts and reports.

## Tech Stack

### Front-End

- **Next.js**: Optimized for performance and SEO with server-side rendering.
- **TypeScript**: Ensures robust and type-safe code.
- **TailwindCSS**: Enables rapid UI development with a modern design system.
- **MaterialUI**: Pre-designed components for enhanced UI/UX.
- **Recharts**: Provides dynamic, interactive data visualizations.

### Back-End

- **Node.js**: Server-side runtime for building scalable applications.
- **Express.js**: Simplifies API development.
- **MongoDB**: NoSQL database for flexible and scalable data storage.
- **Mongoose**: ODM for MongoDB, providing a schema-based solution to model data.

## Node Version

This project is built using Node.js version `16.x` or higher. Ensure you have the correct version installed to avoid compatibility issues.

## Getting Started

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
   - Add the required credentials for your database and other integrations.
4. Run the development server:  
   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m "Add feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Next.js for the front-end framework.
- TailwindCSS for responsive design.

## Repository

You can find the project repository at [FlowBoard GitHub Repository](https://github.com/MatrimPathak/Flowboard).
