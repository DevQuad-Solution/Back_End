# SlashIt Backend API

A collaborative purchasing platform backend that allows users to create group buying pools ("slashes") for products through various distribution hubs.

## Overview

SlashIt is a Node.js/Express.js backend service built with TypeScript that manages:

- **User Authentication** - Registration, verification, and account management
- **Product Management** - Browse and manage products available for group buying
- **Slash Management** - Create, join, and manage group buying pools
- **Hub Management** - Manage distribution points and hub attendants
- **Payments** - Integration with Monnify for wallet management and transactions
- **Notifications** - Real-time notifications for users
- **Admin Dashboard** - Comprehensive admin controls for platform management

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.2
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io for WebSocket communication
- **Payments**: Monnify integration
- **Email**: Handlebars templating for email notifications
- **Validation**: Joi schema validation
- **Rate Limiting**: Express Rate Limit
- **Security**: Helmet, CORS, Bcrypt

## Project Structure

```
src/
├── app.ts                      # Express app configuration
├── config/
│   ├── cors.ts                # CORS configuration
│   └── db.ts                  # MongoDB connection
├── controllers/               # Route controllers
│   ├── admin/                # Admin-specific controllers
│   ├── attendant/            # Attendant dashboard
│   ├── auth/                 # Authentication logic
│   ├── hub/                  # Hub management
│   ├── notification/         # Notification handling
│   ├── product/              # Product management
│   ├── slash/                # Group buying logic
│   └── transaction/          # Payment handling
├── middlewares/              # Express middlewares
│   ├── authMiddleware.ts    # JWT authentication
│   ├── roleMiddleware.ts    # Role-based access control
│   └── rateLimiter.ts       # Rate limiting
├── models/                   # MongoDB schemas
│   ├── account.ts           # User accounts
│   ├── product.ts           # Products
│   ├── slash.ts             # Group buying pools
│   ├── transaction.ts       # Transactions & notifications
│   ├── otp.ts               # One-time passwords
│   ├── dispute.ts           # Disputes
│   └── hubAttendant.ts      # Hubs & attendants
├── routes/                   # Route definitions
│   ├── authRoutes.ts
│   ├── adminRoutes.ts
│   ├── productRoutes.ts
│   ├── notificationRoutes.ts
│   ├── attendantRoutes.ts
│   ├── hubRoutes.ts
│   ├── slashRoutes.ts
│   └── transactionRoutes.ts
├── utils/                    # Utility functions
│   ├── tokenService.ts      # JWT token generation/verification
│   ├── otpService.ts        # OTP management
│   ├── paymentService.ts    # Monnify integration
│   ├── notificationService.ts
│   ├── validationSchema.ts  # Joi validation schemas
│   ├── encryption.ts        # Data encryption
│   ├── responseService.ts   # Response formatting
│   ├── websocket.ts         # Socket.io setup
│   └── dbBackup.ts          # Database backup
├── mails/                    # Email templates
├── public/                   # Static files
│   └── docs.html           # API documentation
└── hooks/                    # Custom hooks
```

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB 5.0+
- Environment variables configured

### Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment variables**
   Create a `.env` file in the root directory:

```env
# Server
PORT=5004
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/slashit

# JWT
ACCESS_SECRET=your_access_secret_key
REFRESH_SECRET=your_refresh_secret_key

# Monnify Payment
MONNIFY_API_KEY=your_monnify_api_key
MONNIFY_SECRET=your_monnify_secret
MONNIFY_CONTRACT_CODE=your_contract_code

# Email
SMTP_HOST=your_smtp_host
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# OTP
OTP_EXPIRY=600000

# Amount per transaction
AMT_PER_TRX=100
```

3. **Start the development server**

```bash
npm run dev
```

## Available Scripts

```bash
# Development
npm run dev                # Start with nodemon auto-reload

# Production
npm run build              # Compile TypeScript to JavaScript
npm start                  # Run compiled JavaScript

# Code Quality
npm run lint              # Check code with ESLint
npm run format            # Format code with Prettier

# Cleanup
npm run clean             # Remove dist folder
```

## API Documentation

### Interactive Documentation

The API provides interactive documentation via Swagger UI. Access it at:

```
http://localhost:5004/api/v1/docs
```

### Health Check Endpoints

- **Root**: `GET /` - Basic server health check
- **Health**: `GET /health` - Detailed health status with timestamp
- **API Test**: `GET /api/test` - API functionality test

### Core API Routes

#### Authentication (`/api/auth/`)

- `POST /auth/` - User signup
- `POST /auth/signin` - User login
- `POST /auth/code` - Request verification code
- `POST /auth/verify-code` - Verify OTP code
- `POST /auth/onboarding` - Complete user onboarding
- `POST /auth/reset-password` - Reset password
- `GET /auth/me` - Get authenticated user profile

#### Products (`/api/products/`)

- `GET /products` - List all products (public)
- `POST /products` - Create product (admin only)
- `PUT /products/status` - Update product status (admin only)

#### Slash (Group Buying) (`/api/slash/`)

- `GET /slash/` - Get user's slashes
- `GET /slash/search` - Search slashes
- `POST /slash/` - Create slash
- `GET /slash/{id}` - Get slash details
- `PUT /slash/{id}` - Edit slash
- `PATCH /slash/{id}` - Leave slash
- `DELETE /slash/{id}` - Delete slash
- `POST /slash/{id}` - Join slash
- `GET /slash/qr/{id}` - Get QR code
- `POST /slash/v/qr` - Verify QR code

#### Hubs (`/api/hub/`)

- `GET /hub/` - Get all states with hubs
- `GET /hub/{state}` - Get cities in state
- `GET /hub/{state}/{city}` - Get hubs in city
- `GET /hub/{hubId}/ratings` - Get hub ratings
- `POST /hub/{hubId}/rating` - Rate hub

#### Attendant (`/api/attendant/`)

- `GET /attendant/dashboard` - Attendant dashboard

#### Notifications (`/api/notifications/`)

- `GET /notifications` - Get all notifications (admin only)
- `GET /notifications/me` - Get user notifications

#### Transactions (`/api/transaction/`)

- `GET /transaction` - Get transaction history
- `POST /transaction/webhook` - Payment webhook (Monnify)

#### Admin Management (`/api/admin/`)

**Users:**

- `GET /admin/users` - List all users
- `GET /admin/users/search` - Search users
- `GET /admin/users/{id}` - Get user details
- `PATCH /admin/users/{id}/suspend` - Suspend user

**Dashboard:**

- `GET /admin/stats` - Platform statistics

**Slashes:**

- `GET /admin/slashes/search` - Search slashes
- `DELETE /admin/slashes/{id}/dissolve` - Dissolve slash

**Hubs:**

- `GET /admin/hubs` - List hubs
- `POST /admin/hubs` - Create hub
- `GET /admin/hubs/{id}` - Get hub details
- `PATCH /admin/hubs/{id}/status` - Change hub status
- `POST /admin/hubs/{hubId}/attendant` - Assign attendant

**Attendants:**

- `GET /admin/attendants` - List attendants
- `POST /admin/attendants` - Create attendant
- `PATCH /admin/attendants/{id}/pin` - Reset attendant PIN
- `PATCH /admin/attendants/{id}/status` - Change attendant status

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### User Roles

The API supports three main roles:

- **user** - Regular platform users
- **admin** - Platform administrators with full access
- **attendant** - Hub attendants for order fulfillment

## Response Format

All API responses follow this standard format:

```json
{
  "status": 200,
  "type": "success",
  "message": "Operation successful",
  "error": null,
  "data": {...},
  "timestamp": "2024-04-28T10:30:45.123Z"
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse. Default limits:

- General endpoints: 100 requests per 15 minutes per IP

## WebSocket Events (Real-time)

The API supports real-time updates via Socket.io for:

- Live notifications
- Slash status updates
- Message delivery

## Database Models

### Account (User)

User profiles with wallet and verification status

### Product

Items available for group buying

### Slash

Active group buying pools

### Hub

Physical distribution points

### Attendant

Hub staff members

### Transaction

Payment history and wallet transactions

### Notification

System and user notifications

### OTP

One-time passwords for verification

## Payment Integration

The API integrates with Monnify for:

- Wallet top-ups
- Payment verification
- Transaction settlements
- Webhook processing

## Email Notifications

Automated email notifications for:

- Account creation
- Email verification
- Password reset
- Payment received
- Slash updates

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ESLint configuration for code quality
- Prettier for consistent formatting
- Run `npm run format` before committing

### Testing

```bash
npm run test
```

### Building

```bash
npm run build
```

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

The compiled application will be in the `dist/` directory.

## Environment Variables Reference

| Variable              | Required | Description                             |
| --------------------- | -------- | --------------------------------------- |
| PORT                  | Yes      | Server port (default: 5004)             |
| NODE_ENV              | Yes      | Environment (development/production)    |
| MONGODB_URI           | Yes      | MongoDB connection string               |
| ACCESS_SECRET         | Yes      | JWT access token secret                 |
| REFRESH_SECRET        | Yes      | JWT refresh token secret                |
| MONNIFY_API_KEY       | Yes      | Monnify API key                         |
| MONNIFY_SECRET        | Yes      | Monnify secret                          |
| MONNIFY_CONTRACT_CODE | Yes      | Monnify contract code                   |
| SMTP_HOST             | Yes      | Email SMTP host                         |
| SMTP_USER             | Yes      | Email SMTP user                         |
| SMTP_PASS             | Yes      | Email SMTP password                     |
| OTP_EXPIRY            | No       | OTP expiry time in ms (default: 600000) |
| AMT_PER_TRX           | No       | Amount per transaction (default: 100)   |

## Troubleshooting

### Database Connection Issues

- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify network connectivity

### Authentication Errors

- Verify JWT secrets in .env
- Check token expiration
- Ensure Authorization header format is correct

### Email Issues

- Verify SMTP credentials
- Check email service provider settings
- Review email templates in `/src/mails`

## API Version

Current Version: **1.0.0**

## Support

For issues and feature requests, contact the development team.

## License

ISC
