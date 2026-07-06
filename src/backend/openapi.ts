import { config } from "./config";

export function createOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Local LLM Chatbot Backend API",
      version: "1.0.0",
      description:
        "Backend API documentation for health checks and chatbot responses.",
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Local backend server",
      },
    ],
    tags: [
      {
        name: "Backend",
        description: "Core backend endpoints",
      },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Backend"],
          summary: "Health check",
          description: "Returns backend status and configured model.",
          responses: {
            "200": {
              description: "Backend is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["status", "model"],
                    properties: {
                      status: {
                        type: "string",
                        example: "ok",
                      },
                      model: {
                        type: "string",
                        example: config.model,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/chat": {
        post: {
          tags: ["Backend"],
          summary: "Generate chatbot response",
          description:
            "Validates input and calls the local model service to generate a reply.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: {
                      type: "string",
                      minLength: 1,
                      maxLength: 2000,
                      example: "Say hello in one short sentence.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful model response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["reply", "latencyMs"],
                    properties: {
                      reply: {
                        type: "string",
                        example: "Hello! Nice to meet you.",
                      },
                      latencyMs: {
                        type: "number",
                        example: 842,
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid request payload",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: {
                        type: "string",
                        example: "message is required",
                      },
                    },
                  },
                },
              },
            },
            "429": {
              description: "Model rate limit reached",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: {
                        type: "string",
                        example:
                          "the model rate limit was reached, please wait a moment and try again",
                      },
                    },
                  },
                },
              },
            },
            "502": {
              description: "Unexpected upstream failure",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: {
                        type: "string",
                        example: "failed to generate a response",
                      },
                    },
                  },
                },
              },
            },
            "503": {
              description: "Local model service unavailable",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: {
                        type: "string",
                        example:
                          "the local model service is temporarily unavailable, please try again later",
                      },
                    },
                  },
                },
              },
            },
            "504": {
              description: "Model request timed out",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: {
                        type: "string",
                        example: "the model took too long to respond",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
