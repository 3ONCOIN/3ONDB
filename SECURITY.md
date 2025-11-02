# 3ONDB Security Guide

This document outlines the security features and best practices for 3ONDB.

## Security Features

### 1. SQL Injection Prevention

**Implemented Measures:**
- All user inputs use parameterized queries
- Table name whitelist validation (`src/utils/security.js`)
- Database name format validation
- Time range input validation

**Important Notes:**
- The `postgres.query()` and `sqlite.run/get/all()` methods are intentionally designed to execute arbitrary SQL
- These methods are internal database interfaces, not directly exposed to users
- User queries through the API (`POST /api/query`) go through the query controller which logs all operations
- Always use parameterized queries (the `params` array) for user input

### 2. Rate Limiting

**Implemented Rate Limits:**

| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 attempts | 15 minutes |
| Expensive Operations | 10 requests | 15 minutes |

**Rate-Limited Operations:**
- User registration and login (5/15min)
- Query execution (10/15min)
- Backup operations (10/15min)
- Database sync operations (10/15min)
- User CRUD operations (100/15min)

**Configuration:**
Rate limits are defined in `src/middleware/rateLimiter.js` and can be adjusted as needed.

### 3. Authentication & Authorization

**JWT-Based Authentication:**
- Secure token generation with configurable expiry
- Bearer token authentication
- Required for sensitive operations

**Protected Endpoints:**
- All backup operations
- Force sync operations
- User management (except registration/login)

### 4. CORS Configuration

**Development:**
- Allows all origins for easier testing

**Production:**
- Requires explicit whitelist in `ALLOWED_ORIGINS` environment variable
- Rejects requests from non-whitelisted origins
- Logs unauthorized CORS attempts

**Configuration:**
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 5. Secrets Management

**JWT Secret:**
- Must be set via `JWT_SECRET` environment variable
- Production startup fails if using default value
- Minimum 32 characters recommended

**Database Credentials:**
- Never commit credentials to git
- Use environment variables for all sensitive data
- Keep `.env` file secure (already in `.gitignore`)

## Production Deployment Checklist

- [ ] Set strong `JWT_SECRET` (min 32 chars)
- [ ] Configure `ALLOWED_ORIGINS` with specific domains
- [ ] Set `NODE_ENV=production`
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Review and adjust rate limits
- [ ] Enable AI repair and backups
- [ ] Configure backup retention policy
- [ ] Set up log rotation
- [ ] Disable debug logging

## Security Best Practices

### For API Users

1. **Always Use Parameterized Queries:**
   ```json
   {
     "query": "SELECT * FROM users WHERE email = $1",
     "params": ["user@example.com"]
   }
   ```

2. **Protect Your JWT Tokens:**
   - Store securely (HttpOnly cookies recommended)
   - Never expose in logs or URLs
   - Implement token refresh if needed

3. **Rate Limit Your Clients:**
   - Respect the API rate limits
   - Implement exponential backoff on 429 errors

### For Administrators

1. **Regular Security Updates:**
   - Keep Node.js and dependencies updated
   - Monitor for security advisories
   - Run `npm audit` regularly

2. **Backup Security:**
   - Encrypt backup files
   - Store backups securely
   - Test restore procedures
   - Implement off-site backups

3. **Monitoring:**
   - Monitor failed authentication attempts
   - Watch for unusual query patterns
   - Track rate limit violations
   - Review error logs regularly

4. **Database Security:**
   - Use strong PostgreSQL passwords
   - Limit PostgreSQL network access
   - Enable PostgreSQL SSL/TLS
   - Regular security audits

## Reporting Security Issues

If you discover a security vulnerability in 3ONDB:

1. **DO NOT** open a public GitHub issue
2. Contact the maintainers privately
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

## Known Limitations

### Query Execution Endpoint

The `/api/query` endpoint intentionally allows arbitrary SQL execution for authenticated users. This is by design as 3ONDB is a database engine. Consider:

- Implementing additional authorization layers for production
- Creating user roles with query restrictions
- Auditing all query executions (already logged)
- Implementing query whitelisting for untrusted users

### Rate Limiting

Current rate limiting is IP-based, which has limitations:

- Shared IPs (corporate networks, VPNs) may hit limits faster
- Can be bypassed by using multiple IPs
- Consider implementing user-based rate limiting for authenticated endpoints

### CORS in Development

Development mode allows all origins. Never use development mode in production.

## Security Audit History

- Initial security implementation: 2024-10
- SQL injection fixes: 2024-10
- Rate limiting added: 2024-10
- CORS hardening: 2024-10

## Compliance

3ONDB includes features that can help with:

- **Audit Logging:** All queries are logged with timestamps and user IDs
- **Data Integrity:** AI-based auto-repair detects and fixes data issues
- **Backup/Recovery:** Automated backup system with retention policies
- **Access Control:** JWT-based authentication and authorization

Organizations should implement additional controls as needed for specific compliance requirements (GDPR, HIPAA, SOC 2, etc.).
