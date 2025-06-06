# Unibet 2025 Client

## Environment Setup

To ensure the client application connects to the correct API endpoint, create a `.env.local` file in the client directory with the following content:

```
REACT_APP_API_URL=https://unibet-2025-api.onrender.com
```

This configuration ensures that all API requests are directed to the Render.com hosted backend instead of the relative paths that would work in a development environment with both frontend and backend running on the same origin.

## Development

For local development, you can set the API URL to your local backend server:

```
REACT_APP_API_URL=http://localhost:5004
```

## Authentication

The application uses JWT authentication with tokens stored in localStorage. Make sure you're logged in as an admin user to access protected routes.

Admin credentials:
- Email: simple@bookid.ee, Password: password123
- Email: admin@example.com, Password: 123
- Email: info@bookid.ee, Password: AdminUus123
