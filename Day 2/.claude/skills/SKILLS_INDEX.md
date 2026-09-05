# ALCOA+ QA Project Skills

Project-specific skills for the ALCOA+ QA Management System (Eli Lilly).

## Available Skills

### 🚀 Development

**[start-dev-server](./start-dev-server.md)**
- Start Vite dev server on localhost:3000
- Hot module reloading enabled
- For local development and testing

**[build-production](./build-production.md)**
- Create optimized production bundle
- Output to dist/ directory
- Ready for deployment

### 🧪 Testing & Validation

**[run-api-tests](./run-api-tests.md)**
- Run API service tests
- Test React hooks
- Validate functionality with mock data

### 🔍 Code Review

**[backend-review](./backend-review.md)**
- Comprehensive backend code review
- Security audit and ALCOA+ compliance check
- Database schema and API endpoint validation
- Generates detailed findings report

### 🗄️ Database

**[setup-database](./setup-database.md)**
- Setup PostgreSQL (Docker or native)
- Create alcoa_qa_db database
- Configure connection string

**[setup-backend-api](./setup-backend-api.md)**
- Configure backend API integration
- Set environment variables
- Connect frontend to backend services

## Quick Start

1. **Development**
   ```bash
   npm install
   npm run dev
   # Visit http://localhost:3000
   ```

2. **Production Build**
   ```bash
   npm run build
   npm run preview
   ```

3. **Backend Integration**
   - Follow: setup-database → setup-backend-api
   - See: BACKEND_SECURITY.md

## Related Documentation

- **CLAUDE.md** - Developer guidance
- **BACKEND_SECURITY.md** - API security rules
- **ENV_SETUP.md** - Environment configuration
- **settings.json** - Project settings
- **src/api/** - API service layer

## Environment

- **Node.js**: 16+
- **Package Manager**: npm
- **Build Tool**: Vite
- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
