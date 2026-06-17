import { NextResponse } from "next/server";
import { ApiError } from "./apiError";

type RouteHandler = (req: Request, context: any) => Promise<Response> | Response;

/**
 * A higher-order function that wraps Next.js App Router API handlers.
 * It automatically intercepts exceptions, logs diagnostic traces, and formats
 * standard JSON error responses (utilizing status codes and metadata from ApiError).
 */
export function apiHandler(handler: RouteHandler) {
  return async (req: Request, context: any) => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      console.error("[API ERROR INTERCEPTOR]:", error);

      // Operational expected API Error
      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            success: false,
            message: error.message,
            ...(error.errors ? { errors: error.errors } : {}),
          },
          { status: error.statusCode }
        );
      }

      // Unhandled/Unexpected application crash (Strict Error-State Philosophy)
      return NextResponse.json(
        {
          success: false,
          message: "Twin architecture encountered an anomaly. Safe mode engaged.",
        },
        { status: 500 }
      );
    }
  };
}
