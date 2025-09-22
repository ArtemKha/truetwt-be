# TrueTweet Backend

A mini-blogging platform backend built with TypeScript, Express.js, SQLite, and Redis, following Hexagonal Architecture principles.

## Features

- **User Management**: Registration, authentication, profile management
- **Posts**: Create, read, delete posts with 280 character limit
- **Comments**: Comment system for posts
- **Mentions**: @username mentions with linking
- **Timeline Cache**: Redis-based timeline caching for performance
- **Real-time Updates**: Optimized timeline serving from cache
- **Security**: JWT authentication, rate limiting, input validation
- **API Documentation**: Swagger/OpenAPI 3.0 specification

## Architecture

This project follows **Hexagonal Architecture** (Ports & Adapters) pattern:

```
src/
├── domain/                # Business entities and rules
├── application/           # Use cases and application services
├── infrastructure/        # External adapters (DB, cache, auth)
├── presentation/         # HTTP controllers and routes
└── shared/               # Common utilities and configuration
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with better-sqlite3
- **Cache**: Redis (with in-memory fallback)
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Documentation**: Swagger UI
- **Testing**: Vitest
- **Code Quality**: Biome

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Redis (optional - falls back to in-memory cache)

### Development Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd truetweet-backend
npm install
```

2. **Environment setup**:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start development server**:
```bash
# With Docker (recommended)
docker-compose up

# Or locally
npm run dev
```

4. **Access the application**:
- API: http://localhost:3000/api
- Documentation: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/api/health

### Docker Setup

**Development**:
```bash
docker-compose up
```

**Production**:
```bash
docker-compose -f docker-compose.prod.yml up
```

## Environment Variables

Key environment variables (see `env.example`):

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=./data/database.sqlite

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List users (paginated)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/search` - Search users

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `DELETE /api/posts/:id` - Delete post
- `GET /api/posts/user/:userId` - Get user posts

### Timeline
- `GET /api/timeline` - Get global timeline
- `POST /api/timeline/refresh` - Refresh cache
- `GET /api/timeline/stats` - Cache statistics

### Comments
- `POST /api/posts/:id/comments` - Create comment
- `GET /api/posts/:id/comments` - Get post comments
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

## Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build for production
npm start           # Start production server

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint        # Check code quality
npm run lint:fix    # Fix linting issues
npm run format      # Format code
```

## Database Schema

### Users
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password_hash`
- `created_at`, `updated_at`

### Posts
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `content` (max 280 chars)
- `created_at`, `updated_at`
- `is_deleted` (Soft delete)

### Comments
- `id` (Primary Key)
- `post_id`, `user_id` (Foreign Keys)
- `content`
- `created_at`, `updated_at`
- `is_deleted`

### Mentions
- `id` (Primary Key)
- `post_id`, `mentioned_user_id` (Foreign Keys)
- `created_at`

## Caching Strategy

The application uses a **Redis sorted set** for timeline caching:

```
Key: "timeline:global"
Score: timestamp (for chronological ordering)
Value: JSON post data
```

**Operations**:
- New posts automatically added to cache
- Deleted posts removed from cache
- Falls back to database if cache unavailable
- Cache can be refreshed via API

## Security Features

- **JWT Authentication** with refresh tokens
- **Password hashing** with bcrypt (12 rounds)
- **Rate limiting** (100 requests per 15 minutes)
- **Input validation** with Zod schemas
- **CORS** protection
- **Helmet** security headers
- **SQL injection** prevention
- **XSS** protection

## Performance Considerations

- **Timeline caching** for fast reads
- **Database indexing** on frequently queried fields
- **Pagination** for all list endpoints
- **Connection pooling** with SQLite WAL mode
- **Graceful shutdown** handling

## Error Handling

Structured error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { ... }
  }
}
```

## Monitoring

- **Health check** endpoint: `/api/health`
- **Structured logging** with Winston
- **Cache statistics** via `/api/timeline/stats`
- **Docker health checks**

## Deployment

### Production Checklist

1. Set secure environment variables
2. Use production database
3. Configure Redis properly
4. Set up SSL/TLS
5. Configure reverse proxy (Nginx)
6. Set up monitoring and logging
7. Configure backup strategy

### Docker Production

```bash
# Set environment variables
export JWT_SECRET="your-secure-secret"
export CORS_ORIGIN="https://yourdomain.com"

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Follow TypeScript strict mode
2. Write tests for new features
3. Use conventional commits
4. Ensure all linting passes
5. Update documentation

## License

MIT
