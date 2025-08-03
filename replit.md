# Overview

This is an Intelligent Monitoring Framework (IMF) Dashboard - a full-stack web application for monitoring server systems, analyzing logs, and managing problems through an extensible plugin architecture. The application combines a React frontend with an Express.js backend, integrates with a Python monitoring framework, and uses PostgreSQL for data persistence. The system is designed to be a comprehensive monitoring solution with real-time capabilities, automated problem detection, and plugin-based extensibility.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Custom WebSocket hook for live updates
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with real-time WebSocket support
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Python Integration**: Child process communication with Python monitoring framework
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions

## Data Architecture
- **Database**: PostgreSQL with Drizzle schema definitions
- **Schema Design**: Separate tables for users, problems, metrics, log entries, plugins, and framework configuration
- **Real-time Data**: WebSocket broadcasting for live updates of problems, metrics, and log entries
- **Data Validation**: Shared Zod schemas between frontend and backend

## Plugin System
- **Plugin Types**: Collectors (data gathering), Detectors (problem identification), Remediators (automated fixes)
- **Plugin Management**: Database-tracked plugin status and configuration
- **Extensibility**: Python-based plugin framework with configurable parameters

## Monitoring Architecture
- **System Metrics**: CPU, memory, disk usage, load average, network connections
- **Log Analysis**: Multi-source log parsing with configurable severity levels
- **Problem Detection**: Automated issue identification with severity classification (LOW, MEDIUM, HIGH, CRITICAL)
- **Real-time Updates**: Live dashboard updates via WebSocket connections

## Development Tools
- **Build System**: Vite for frontend, esbuild for backend production builds
- **Type Safety**: Full TypeScript coverage with shared types between frontend/backend
- **Database Migrations**: Drizzle Kit for schema management
- **Development Experience**: Hot reloading, runtime error overlays, and Replit integration

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for database connections
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

## Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives (dialogs, dropdowns, form controls)
- **class-variance-authority**: Utility for creating component variant APIs
- **cmdk**: Command palette component for enhanced user interactions
- **date-fns**: Date manipulation and formatting utilities
- **embla-carousel-react**: Carousel component for data visualization

## Backend Dependencies
- **express**: Web server framework for API endpoints
- **connect-pg-simple**: PostgreSQL session store for user sessions
- **ws**: WebSocket server implementation for real-time communication
- **psutil**: Python library for system metrics collection (via Python framework)

## Development Dependencies
- **vite**: Frontend build tool and development server
- **tsx**: TypeScript execution for Node.js development
- **tailwindcss**: Utility-first CSS framework
- **postcss**: CSS processing with autoprefixer plugin

## Python Framework Integration
- **External Python Process**: Monitoring framework runs as separate Python process
- **Inter-process Communication**: JSON-based messaging between Node.js and Python
- **System Monitoring**: Python psutil for hardware metrics collection
- **Log Processing**: Python-based log parsing and analysis engines