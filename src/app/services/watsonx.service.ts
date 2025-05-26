import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DataService } from './data.service';

export interface QueryResponse {
  sql?: string;
  result?: any[];
  summary: string;
  title?: string;
  is_sql_query?: boolean;
  chat_summary?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WatsonxService {
  // Use relative URL for development, full URL for production
  private readonly API_URL = '/watsonx'; // This will be proxied in development mode

  constructor(private http: HttpClient, private dataService: DataService) {}

  /**
   * Send a natural language query to the Flask backend
   * @param query The natural language query
   * @param isNewChat Whether this is a new chat (for title generation)
   * @param chatHistory The tokenized chat history (only sent for existing chats)
   */
  sendQuery(
    query: string,
    isNewChat: boolean = false,
    chatHistory: any[] = []
  ): Observable<QueryResponse> {
    // Get current user's preferred model
    const currentUser = this.dataService.getCurrentUser();
    const preferredModel =
      currentUser?.preferredModel || this.dataService.getDefaultModel().key;

    // Only include chatHistory if this is NOT a new chat
    const payload: any = {
      query: query,
      isNewChat: isNewChat,
      modelPreference: preferredModel, // Include user's model preference
    };

    // Only add chat history for existing conversations
    if (!isNewChat && chatHistory.length > 0) {
      payload.chatHistory = chatHistory;
    }

    // Add user context for backend logging
    if (currentUser) {
      payload.userId = currentUser.id;
      payload.userEmail = currentUser.email;
    }

    // Add CORS headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    console.log(
      'Sending query to backend with model preference:',
      preferredModel
    );

    return this.http
      .post<QueryResponse>(`${this.API_URL}/query`, payload, { headers })
      .pipe(
        tap((response) => {
          console.log('Received response from backend:', response);
        }),
        catchError((error) => {
          console.error('Error in WatsonX query:', error);
          throw error;
        })
      );
  }

  /**
   * Tokenize chat history to approximately last 200 tokens
   * @param messages Full chat history
   * @returns Tokenized chat history with just text and sender info
   */
  tokenizeHistory(messages: any[]): any[] {
    if (!messages || messages.length === 0) {
      return [];
    }

    // A simple tokenization approach:
    // 1. Reverse messages to start from most recent
    // 2. Calculate tokens (roughly words count)
    // 3. Include messages until we reach token limit
    const TOKEN_LIMIT = 200;
    let tokenCount = 0;
    const tokenizedHistory = [];

    // Clone and reverse messages to start from the most recent
    const reversedMessages = [...messages].reverse();

    for (const message of reversedMessages) {
      // Skip any message without text content
      if (!message.content) {
        continue;
      }

      // Simplify message to just text and sender
      const simplifiedMessage = {
        text: message.content,
        sender: message.type === 'user' ? 'user' : 'bot',
      };

      // Rough token count (words + some overhead)
      const messageTokens = simplifiedMessage.text.split(/\s+/).length;

      // If adding this message would exceed our limit and we already have some messages
      if (
        tokenCount + messageTokens > TOKEN_LIMIT &&
        tokenizedHistory.length > 0
      ) {
        break;
      }

      // Add message to our tokenized history
      tokenizedHistory.unshift(simplifiedMessage); // Add to beginning to restore order
      tokenCount += messageTokens;
    }

    return tokenizedHistory;
  }

  /**
   * Get the current user's preferred model info
   */
  getCurrentUserModelInfo() {
    return this.dataService.getCurrentUserModel();
  }

  /**
   * Update user's model preference
   */
  updateUserModelPreference(modelKey: string): Observable<any> {
    const currentUser = this.dataService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    return this.dataService.updateUserModel(currentUser.id, modelKey);
  }
}
