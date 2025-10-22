import { Injectable, ErrorHandler } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Global error:', error);
  }
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  handleError(error: any) {
    console.error('Error service:', error);
  }

  handleHttpError(error: any, context?: string): void {
    if (context) {
      console.error(`HTTP Error in ${context}:`, error);
    } else {
      console.error('HTTP Error:', error);
    }
  }
}