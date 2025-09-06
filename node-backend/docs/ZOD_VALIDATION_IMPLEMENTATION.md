# Zod Validation Implementation

## Overview

This document describes the comprehensive Zod validation implementation for the Node.js/Express backend contract routes. The validation system ensures type safety, request validation, and consistent error handling across all API endpoints.

## Architecture

### Validation Layers

1. **Contract Validation Schemas** (`src/schemas/contractValidation.ts`)
   - Flask API contract-compatible validation schemas
   - Request body, query parameters, and route parameters validation
   - Response format validation for contract testing

2. **Validation Middleware** (`src/middleware/validation.ts`)
   - `validateRequest()` - Comprehensive request validation
   - `validateBody()`, `validateQuery()`, `validateParams()` - Specific validators
   - Error formatting and logging

3. **Route Integration**
   - All contract routes use Zod validation middleware
   - Consistent error responses across all endpoints
   - Type-safe request/response handling

## Validation Schemas

### Authentication Schemas

#### `AuthLoginContractSchema`
```typescript
{
  username: string (required, min 1 char)
  password: string (required, min 1 char)
}
```

#### `AuthRegisterContractSchema`
```typescript
{
  username: string (3-50 chars, alphanumeric + underscore)
  password: string (min 8 chars)
  email?: string (valid email format)
}
```

#### `AuthChangePasswordContractSchema`
```typescript
{
  current_password: string (required)
  new_password: string (min 8 chars)
  confirm_password: string (must match new_password)
}
```

### Server Management Schemas

#### `ServerCreateContractSchema`
```typescript
{
  server_name: string (1-100 chars, alphanumeric + underscore + hyphen)
  version: string (required)
  port: number (1-65535)
  memory_mb: number (512-16384, default 1024)
  motd?: string (max 100 chars)
  max_players: number (1-1000, default 20)
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard' (default 'normal')
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator' (default 'survival')
  pvp: boolean (default true)
  spawn_monsters: boolean (default true)
  hardcore: boolean (default false)
}
```

#### `ServerUpdateContractSchema`
- Same as `ServerCreateContractSchema` but all fields optional

#### `ServerBackupContractSchema`
```typescript
{
  name?: string (1-100 chars)
  description?: string (max 500 chars)
}
```

### Admin Management Schemas

#### `AdminCreateUserContractSchema`
```typescript
{
  username: string (3-50 chars, alphanumeric + underscore)
  password: string (min 8 chars)
  is_admin?: boolean (default false)
}
```

#### `AdminUpdateUserContractSchema`
```typescript
{
  username?: string (3-50 chars, alphanumeric + underscore)
  is_admin?: boolean
}
```

#### `AdminSystemConfigContractSchema`
```typescript
{
  max_total_memory_mb?: number (min 1024)
  default_server_memory_mb?: number (min 512)
  min_server_memory_mb?: number (min 512)
  max_server_memory_mb?: number (min 512)
}
```

### Parameter Validation Schemas

#### `IdParamSchema`
```typescript
{
  id: string (numeric, transformed to number)
}
```

#### `UserIdParamSchema`
```typescript
{
  user_id: string (numeric, transformed to number)
}
```

#### `ServerIdParamSchema`
```typescript
{
  id: string (numeric, transformed to number)
}
```

### Query Parameter Schemas

#### `PaginationQuerySchema`
```typescript
{
  page: string (numeric, default '1', transformed to number)
  limit: string (numeric, default '10', transformed to number)
}
```

#### `ServerListQuerySchema`
```typescript
{
  page: string (numeric, default '1')
  limit: string (numeric, default '10')
  search?: string
  status?: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'
  sort_by: 'name' | 'status' | 'port' | 'version' | 'memory' | 'created_at' (default 'created_at')
  sort_order: 'asc' | 'desc' (default 'desc')
}
```

#### `UserListQuerySchema`
```typescript
{
  page: string (numeric, default '1')
  limit: string (numeric, default '10')
  search?: string
  is_admin?: 'true' | 'false' (transformed to boolean)
  sort_by: 'username' | 'is_admin' | 'created_at' (default 'created_at')
  sort_order: 'asc' | 'desc' (default 'desc')
}
```

## Response Validation Schemas

### Contract Response Schemas

All response schemas are designed to match the Flask API contract exactly:

- `AuthResponseContractSchema`
- `ServerResponseContractSchema`
- `ServerListResponseContractSchema`
- `UserResponseContractSchema`
- `UserListResponseContractSchema`
- `SystemConfigResponseContractSchema`
- `SystemStatsResponseContractSchema`
- `ErrorResponseContractSchema`

## Implementation Details

### Route Integration

Each contract route uses the `validateRequest` middleware:

```typescript
import { validateRequest } from '../middleware/validation';
import { AuthLoginContractSchema } from '../schemas/contractValidation';

router.post('/login',
  validateRequest({ body: AuthLoginContractSchema }),
  async (req: Request, res: Response) => {
    // Route handler with validated request body
  }
);
```

### Error Handling

Validation errors are automatically handled by the middleware:

```typescript
// 400 Bad Request with validation details
{
  "success": false,
  "message": "Request validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "username",
      "message": "Username must be at least 3 characters",
      "code": "too_small",
      "received": "ab"
    }
  ]
}
```

### Type Safety

All validated data is automatically typed:

```typescript
// req.body is automatically typed as AuthLoginContract
const { username, password } = req.body; // TypeScript knows these are strings
```

## Testing

### Validation Testing Script

The `test-zod-validation.ts` script provides comprehensive testing:

```bash
npm run test:zod:validation
```

#### Test Categories

1. **Authentication Validation**
   - Valid/invalid login data
   - Valid/invalid change password data

2. **Server Management Validation**
   - Valid/invalid server creation data
   - Valid/invalid backup data

3. **Admin Validation**
   - Valid/invalid user creation data
   - Valid/invalid system configuration data

4. **Parameter Validation**
   - Invalid ID parameters
   - Invalid query parameters

#### Test Results

The script provides detailed test results:

```
🧪 Starting Zod Validation Tests...

🔐 Testing Authentication Validation...
✅ /api/v1/auth/login - Valid Data: Valid login data accepted
✅ /api/v1/auth/login - Invalid Data: Invalid login data properly rejected

📊 Test Summary:
================
Total Tests: 20
✅ Passed: 20
❌ Failed: 0
Success Rate: 100.0%
```

## Benefits

### 1. Type Safety
- Full TypeScript integration
- Compile-time type checking
- Automatic type inference

### 2. Request Validation
- Comprehensive input validation
- Consistent error responses
- Security against malformed requests

### 3. Contract Compatibility
- Exact Flask API contract matching
- Consistent request/response formats
- Seamless migration support

### 4. Developer Experience
- Clear validation error messages
- Automatic request transformation
- Comprehensive testing framework

### 5. Security
- Input sanitization
- Type coercion protection
- Malformed request rejection

## Usage Examples

### Basic Route with Validation

```typescript
import { validateRequest } from '../middleware/validation';
import { ServerCreateContractSchema } from '../schemas/contractValidation';

router.post('/servers',
  validateRequest({ body: ServerCreateContractSchema }),
  async (req: Request, res: Response) => {
    // req.body is validated and typed as ServerCreateContract
    const { server_name, version, port, memory_mb } = req.body;
    
    // Create server logic here
  }
);
```

### Route with Multiple Validations

```typescript
import { validateRequest } from '../middleware/validation';
import { 
  ServerIdParamSchema, 
  ServerBackupContractSchema 
} from '../schemas/contractValidation';

router.post('/servers/:id/backup',
  validateRequest({ 
    params: ServerIdParamSchema,
    body: ServerBackupContractSchema 
  }),
  async (req: Request, res: Response) => {
    // req.params.id is validated and typed as number
    // req.body is validated and typed as ServerBackupContract
    const serverId = req.params.id; // number
    const { name, description } = req.body; // typed fields
  }
);
```

### Query Parameter Validation

```typescript
import { validateRequest } from '../middleware/validation';
import { ServerListQuerySchema } from '../schemas/contractValidation';

router.get('/servers',
  validateRequest({ query: ServerListQuerySchema }),
  async (req: Request, res: Response) => {
    // req.query is validated and typed as ServerListQuery
    const { page, limit, search, status } = req.query;
  }
);
```

## Error Response Format

All validation errors follow a consistent format:

```typescript
{
  "success": false,
  "message": "Request validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "field_name",
      "message": "Human readable error message",
      "code": "zod_error_code",
      "received": "actual_value_received"
    }
  ]
}
```

## Performance Considerations

- Validation happens before route handlers
- Minimal performance impact
- Early rejection of invalid requests
- Reduced server load from malformed requests

## Future Enhancements

1. **Custom Validation Rules**
   - Business logic validation
   - Cross-field validation
   - Database constraint validation

2. **Response Validation**
   - Automatic response validation
   - Contract compliance checking
   - API documentation generation

3. **Advanced Error Handling**
   - Localized error messages
   - Custom error codes
   - Error recovery suggestions

## Conclusion

The Zod validation implementation provides a robust, type-safe, and contract-compatible validation system for all API endpoints. It ensures data integrity, improves security, and provides excellent developer experience while maintaining full compatibility with the Flask API contract.
