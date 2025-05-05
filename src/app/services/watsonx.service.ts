import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface QueryResponse {
  sql?: string;
  result?: any[];
  summary: string;
  title?: string;
  is_sql_query?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WatsonxService {
  private readonly API_URL = 'http://localhost:5000'; // Flask server URL

  constructor(private http: HttpClient) {}

  /**
   * Send a natural language query to the Flask backend
   * @param query The natural language query
   * @param isNewChat Whether this is a new chat (for title generation)
   */
  sendQuery(
    query: string,
    isNewChat: boolean = false
  ): Observable<QueryResponse> {
    return this.http
      .post<QueryResponse>(`${this.API_URL}/query`, {
        query: query,
        isNewChat: isNewChat,
      })
      .pipe(
        tap((response) => {}),
        catchError((error) => {
          console.error('Error in WatsonX query:', error);
          throw error;
        })
      );
  }
}
