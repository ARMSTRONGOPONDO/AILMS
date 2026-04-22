import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
};

export function apiHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      const result = await handler(...args);
      
      // If the handler returns a NextResponse, return it directly
      if (result instanceof NextResponse) {
        return result;
      }

      // Otherwise wrap the result in a consistent shape
      return NextResponse.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('API Error:', error);

      if (error instanceof ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        }, { status: 400 });
      }

      // Handle specific error types (Auth, Mongo, etc)
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';

      return NextResponse.json({
        success: false,
        error: message
      }, { status });
    }
  };
}
