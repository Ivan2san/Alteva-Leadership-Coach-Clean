# Overview

This is a comprehensive AI-powered leadership development platform built as a mobile-first Progressive Web App (PWA). The application delivers personalized coaching experiences through the Alteva Growth methodology, combining structured leadership assessments, knowledge base integration, and AI-powered conversations to support professional growth and development.

The platform provides a complete leadership development ecosystem: users authenticate and access their personalized dashboard, complete LGP360 professional assessments for AI personalization, upload knowledge base resources, engage with 8 core leadership topics through curated prompts, participate in real-time streaming AI conversations, and track their progress through comprehensive analytics and conversation history management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using **React 18** with **TypeScript** and follows a modern component-based architecture. The application uses **Wouter** for lightweight client-side routing, managing three main routes: home (`/`), prompt selection (`/prompts/:topic`), and chat interface (`/chat/:topic`). State management is handled through **TanStack Query** for server state and React hooks for local state.

The UI is built on **shadcn/ui** components with **Tailwind CSS** for styling, ensuring a consistent design system throughout the application. The design follows a mobile-first approach with responsive layouts optimized for touch interactions.

## Backend Architecture
The server uses **Express.js** with TypeScript in ESM mode. The architecture follows a service-oriented pattern with dedicated modules for OpenAI integration and storage management. The backend provides RESTful API endpoints for chat interactions and conversation persistence.

**Key backend components:**
- **OpenAI Service**: Handles all AI interactions using OpenAI's API with support for vector store integration for knowledge base retrieval
- **Storage Layer**: Implements an in-memory storage system with interfaces designed for easy database migration
- **Route Handlers**: Clean separation of concerns with dedicated endpoints for chat and conversation management

## Data Storage
The application uses **Drizzle ORM** configured for PostgreSQL with a flexible schema design. Currently implements in-memory storage for development, but the architecture supports easy migration to persistent databases through the storage interface pattern.

**Database Schema:**
- **Users**: Basic user management with username/password authentication structure
- **Conversations**: Stores chat history with JSON-based message storage, including topic categorization and timestamps

## Authentication & Authorization
The current implementation includes basic user schema preparation but operates without authentication for simplified access. The architecture supports future implementation of session-based authentication with PostgreSQL session storage via `connect-pg-simple`.

## Progressive Web App Features
The application is configured as a PWA with:
- **Service Worker**: Implements caching strategies for offline functionality
- **Web App Manifest**: Provides native app-like installation and appearance
- **Mobile Optimization**: Touch-friendly interface with proper viewport configuration

## AI Integration Architecture
The system integrates with **OpenAI's API** using a sophisticated prompt engineering approach:
- **Topic-Specific Responses**: Each of the 8 leadership topics has tailored system prompts
- **Vector Store Support**: Prepared for knowledge base integration using OpenAI's vector store functionality
- **Conversation Context**: Maintains chat history for contextual AI responses
- **Error Handling**: Robust error management with user-friendly fallback messages

# External Dependencies

## Core AI Services
- **OpenAI API**: Primary AI service for generating leadership coaching responses
- **OpenAI Vector Store**: Planned integration for knowledge base retrieval (currently configured but not actively used)

## Database & Storage
- **PostgreSQL**: Target database system (configured via Drizzle but currently using in-memory storage)
- **Neon Database**: Serverless PostgreSQL provider for production deployment

## Frontend Libraries
- **React Query (@tanstack/react-query)**: Server state management and API interaction
- **Radix UI**: Comprehensive component library for accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Wouter**: Lightweight React router
- **React Hook Form**: Form state management with Zod validation

## Development & Build Tools
- **Vite**: Fast build tool and development server with React plugin
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Production build optimization for server bundling
- **PostCSS**: CSS processing with Autoprefixer

## Session & State Management
- **connect-pg-simple**: PostgreSQL session store (prepared for future authentication)
- **Drizzle Kit**: Database migration and schema management tools

## Additional Integrations
- **Replit Platform**: Integrated development environment with specialized plugins for cartographer and runtime error handling
- **Service Worker**: Custom implementation for PWA functionality and offline support

# Recent Changes

## October 7, 2025 - New 3-Tab Navigation Architecture

### Journey 2 Disabled
- Updated `.env` file: Changed `VITE_JOURNEY_V2=1` to `VITE_JOURNEY_V2=0`
- Journey 2 routes are now disabled in App.tsx
- Application reverts to v1 routes (home, dashboard, chat, etc.)
- Note: Browser hard refresh (Ctrl+Shift+R / Cmd+Shift+R) may be needed to clear cached bundle

### New Navigation Structure - INTEGRATED ✅
Created and integrated `client/src/components/MainNavigation.tsx` - A 3-tab navigation component with:
- **Profile Tab**: Routes to `/profile` - Shows user's leadership profile dashboard
- **Chat Tab**: Routes to `/chat/general` - Enhanced chat interface  
- **Conversations Tab**: Routes to `/conversations` - Conversation tools hub (Prepare, Role Play, Pulse)

The MainNavigation component is now fully integrated and displayed on:
- Profile page (`/profile`)
- Chat page (`/chat/:topic`)
- Conversations page (`/conversations`)

Navigation uses Tabs component from `@/components/ui/tabs` with clean, simple styling. Users can seamlessly switch between the three main sections of the app.