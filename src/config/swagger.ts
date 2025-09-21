import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BE App Management API',
      version: '1.0.0',
      description: `API Documentation for Backend App Management System
      
## Authentication
Most endpoints require authentication. Use the login endpoint to get access tokens.

## Test Credentials
- Email: admin@example.com
- Password: password123

## Usage Examples
1. Login: \`curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email": "admin@example.com", "password": "password123"}'\`
2. Get Profile: \`curl -X GET http://localhost:3000/api/profile -H "Authorization: Bearer YOUR_ACCESS_TOKEN"\`
3. List Users: \`curl -X GET "http://localhost:3000/api/app-management/user?page=1&limit=10" -H "Authorization: Bearer YOUR_ACCESS_TOKEN"\`

## Features
- User Management (CRUD operations)
- Role Management (CRUD operations)  
- Menu Management (CRUD operations, hierarchical structure)
- Role-Menu Assignment
- JWT Authentication with refresh tokens`,
      contact: {
        name: 'Ardiansyah Pratama',
        email: 'ardiansyah.pratama@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Access token stored in cookie'
        }
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@example.com'
            },
            password: {
              type: 'string',
              example: 'password123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success'
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                user: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'number',
                      example: 1
                    },
                    email: {
                      type: 'string',
                      example: 'admin@example.com'
                    },
                    name: {
                      type: 'string',
                      example: 'Admin User'
                    },
                    role: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'number',
                          example: 1
                        },
                        name: {
                          type: 'string',
                          example: 'Admin'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Validation error message']
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              example: 1
            },
            limit: {
              type: 'number',
              example: 10
            },
            total: {
              type: 'number',
              example: 100
            },
            totalPage: {
              type: 'number',
              example: 10
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              example: 1
            },
            email: {
              type: 'string',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            gender: {
              type: 'string',
              enum: ['Male', 'Female'],
              example: 'Male'
            },
            birthdate: {
              type: 'string',
              format: 'date',
              example: '1990-01-01'
            },
            photo: {
              type: 'string',
              nullable: true,
              example: 'profile.jpg'
            },
            active: {
              type: 'string',
              enum: ['Active', 'Inactive', 'Take Out'],
              example: 'Active'
            },
            role_id: {
              type: 'number',
              nullable: true,
              example: 1
            },
            role: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  example: 1
                },
                name: {
                  type: 'string',
                  example: 'Admin'
                }
              }
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Admin'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        Menu: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              example: 1
            },
            key_menu: {
              type: 'string',
              example: 'dashboard'
            },
            name: {
              type: 'string',
              example: 'Dashboard'
            },
            order_number: {
              type: 'number',
              example: 1
            },
            url: {
              type: 'string',
              nullable: true,
              example: '/dashboard'
            },
            menu_id: {
              type: 'number',
              nullable: true,
              example: null
            },
            active: {
              type: 'string',
              enum: ['Active', 'Inactive'],
              example: 'Active'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ]
  },
  apis: ['./src/router/**/*.ts', './src/controller/**/*.ts'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BE App Management API Documentation'
  }));
};

export default specs;
