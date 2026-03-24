# Todo App

A beautiful, serverless Node.js Todo application with an in-memory SQLite database using sql.js.

## Features

- ✨ Clean and intuitive user interface
- 🗄️ SQLite database (pure JavaScript, no native dependencies)
- 🚀 Express.js backend
- 📦 Lightweight and fast
- 🐳 Docker support for easy deployment
- 💾 Persistent data storage

## Prerequisites

- Node.js 18 or higher
- npm

## Installation

1. Clone or download the project:
```bash
cd todo-app
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Run locally

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Docker

### Build the Docker image

```bash
docker build -t todo-app .
```

### Run the container

```bash
docker run -p 3000:3000 todo-app
```

The application will be accessible at `http://localhost:3000`

### With volume mount (to persist data)

```bash
docker run -p 3000:3000 -v todo-data:/app todo-app
```

## Project Structure

```
todo-app/
├── server.js           # Express server and API routes
├── package.json        # Project dependencies
├── Dockerfile          # Docker configuration
├── .dockerignore        # Docker build exclusions
├── public/
│   └── index.html      # Frontend UI
└── todos.db            # SQLite database (created at runtime)
```

## API Endpoints

The backend provides RESTful endpoints for managing todos (accessible through the frontend interface).

## Database

The app uses **sql.js**, a pure JavaScript implementation of SQLite that:
- Runs entirely in memory
- Persists data to disk automatically
- Requires no native C++ bindings or compilation

## Development

The application uses:
- **Express.js** - Web server framework
- **sql.js** - SQL database engine
- **Node.js** - JavaScript runtime

## License

MIT
