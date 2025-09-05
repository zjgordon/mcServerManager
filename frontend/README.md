# Minecraft Server Manager - Frontend

Modern React frontend for the Minecraft Server Manager application.

## Overview

This is a React + TypeScript frontend built with Vite, designed to work with the Flask backend API. It provides a modern, responsive interface for managing Minecraft servers.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── contexts/           # React contexts (Auth, etc.)
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── hooks/              # Custom React hooks
```

## Development

### Prerequisites

- Node.js 20.19+ (currently using 18.20.4 - may have compatibility issues)
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The development server will start on `http://localhost:3000` and proxy API requests to the Flask backend at `http://localhost:5000`.

### Building for Production

```bash
npm run build
```

This creates a `dist/` folder with the production build.

### Preview Production Build

```bash
npm run preview
```

## API Integration

The frontend communicates with the Flask backend through a comprehensive REST API:

- **Authentication**: Login, logout, user management
- **Server Management**: Create, start, stop, configure servers
- **Admin Functions**: User management, system configuration

### API Service

The `src/services/api.ts` file contains the complete API client with:
- Type-safe API calls
- Automatic CSRF token handling
- Error handling and authentication redirects
- Full coverage of all backend endpoints

## Features

### Current Implementation

- ✅ **Authentication System**: Login/logout with session management
- ✅ **Server List**: Display and manage Minecraft servers
- ✅ **Server Actions**: Start/stop server functionality
- ✅ **Responsive Design**: Mobile-friendly interface
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **API Integration**: Complete backend integration

### Planned Features

- 🔄 **Server Creation**: Create new Minecraft servers
- 🔄 **Server Configuration**: Edit server settings
- 🔄 **User Management**: Admin user management interface
- 🔄 **System Monitoring**: Real-time server status
- 🔄 **Backup Management**: Server backup functionality

## Configuration

### Vite Configuration

The `vite.config.ts` file is configured to:
- Run on port 3000
- Proxy `/api` requests to `http://localhost:5000`
- Enable source maps for debugging

### Tailwind CSS

Tailwind CSS is configured for styling with:
- Custom utility classes
- Responsive design utilities
- Component-specific styles

## Backend Integration

The frontend is designed to work seamlessly with the Flask backend:

1. **CORS Support**: Backend configured for cross-origin requests
2. **Session Authentication**: Shared session cookies
3. **API Documentation**: Complete OpenAPI specification
4. **Error Handling**: Consistent error response format

## Development Notes

### Node.js Version

The current Node.js version (18.20.4) is below the recommended version (20.19+) for Vite 7. This may cause:
- Development server startup issues
- Some compatibility warnings
- Build process works correctly

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- Type-only imports for better tree-shaking
- Strict type checking
- Modern ES modules

## Deployment

The frontend can be deployed as static files:

1. Build the project: `npm run build`
2. Serve the `dist/` folder with any static file server
3. Configure the server to proxy API requests to the Flask backend

## Contributing

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Maintain type safety throughout
4. Test API integration thoroughly
5. Follow React best practices

## License

Same as the main project - see parent directory for details.