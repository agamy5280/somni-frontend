import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError, tap, switchMap } from 'rxjs/operators';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isSqlQuery?: boolean; // Added for SQL queries
  rawSql?: string; // Added to store raw SQL
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly API_URL = 'http://localhost:3000'; // JSON Server URL
  private readonly CURRENT_USER_KEY = 'chat_app_current_user';

  private currentUser: User | null = null;

  constructor(private http: HttpClient) {
    // Load current user from localStorage
    try {
      const storedUser = localStorage.getItem(this.CURRENT_USER_KEY);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        // Ensure we don't have corrupt data
        if (!this.currentUser || !this.currentUser.id) {
          this.currentUser = null;
          localStorage.removeItem(this.CURRENT_USER_KEY);
        }
      }
    } catch (e) {
      console.error('Error parsing stored user data', e);
      this.currentUser = null;
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }

  // Authentication methods

  login(email: string, password: string): Observable<User> {
    // Get users from JSON Server
    return this.http.get<User[]>(`${this.API_URL}/users`).pipe(
      map((users) => {
        // Find user with matching email
        const userWithEmail = users.find((u) => u.email === email);

        if (!userWithEmail) {
          throw new Error('Email not registered. Please sign up first.');
        }

        // Check password
        if (userWithEmail.password !== password) {
          throw new Error('Invalid password. Please try again.');
        }

        // Set current user
        this.setCurrentUser(userWithEmail);
        return userWithEmail;
      }),
      delay(500) // Simulate network delay
    );
  }

  register(
    fullName: string,
    email: string,
    password: string
  ): Observable<User> {
    // First check if email already exists
    return this.http.get<User[]>(`${this.API_URL}/users`).pipe(
      map((users) => {
        // Check if email already exists
        if (users.some((u) => u.email === email)) {
          throw new Error('Email already registered');
        }

        // Create new user
        const newUser: User = {
          id: this.generateId(),
          fullName,
          email,
          password,
        };

        return newUser;
      }),
      // Post new user to JSON Server
      switchMap((newUser) => {
        return this.http.post<User>(`${this.API_URL}/users`, newUser).pipe(
          tap((user) => {
            // Initialize empty chats for this user
            this.http
              .patch(`${this.API_URL}/chats`, { [user.id]: [] })
              .subscribe();

            // Set as current user
            this.setCurrentUser(user);
          })
        );
      }),
      delay(500) // Simulate network delay
    );
  }

  logout(): Observable<boolean> {
    try {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    } catch (e) {
      console.error('Error removing user from localStorage', e);
    }
    this.currentUser = null;
    return of(true);
  }

  isLoggedIn(): boolean {
    // If already have user in memory, return true
    if (this.currentUser && this.currentUser.id) {
      return true;
    }

    // Double-check localStorage as a fallback
    try {
      const storedUser = localStorage.getItem(this.CURRENT_USER_KEY);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        return !!this.currentUser && !!this.currentUser.id;
      }
    } catch (e) {
      console.error('Error checking login status', e);
    }

    return false;
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      try {
        const storedUser = localStorage.getItem(this.CURRENT_USER_KEY);
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
        }
      } catch (e) {
        console.error('Error getting current user', e);
      }
    }
    return this.currentUser;
  }

  // Chat methods

  getChats(): Observable<Chat[]> {
    if (!this.isLoggedIn()) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.http.get<any>(`${this.API_URL}/chats`).pipe(
      map((chats) => {
        const userChats = chats[this.currentUser!.id] || [];

        // Convert string timestamps to Date objects
        return userChats.map((chat: any) => ({
          ...chat,
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
      }),
      catchError((error) => {
        console.error('Error fetching chats:', error);
        return throwError(() => new Error('Failed to load chats'));
      }),
      delay(300) // Simulate network delay
    );
  }

  getChatById(chatId: string): Observable<Chat> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.getChats().pipe(
      map((chats) => {
        const chat = chats.find((c) => c.id === chatId);
        if (!chat) {
          throw new Error('Chat not found');
        }
        return chat;
      }),
      delay(300) // Simulate network delay
    );
  }

  createChat(title: string): Observable<Chat> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    // First get current chats
    return this.http.get<any>(`${this.API_URL}/chats`).pipe(
      map((allChats) => {
        const userChats = allChats[this.currentUser!.id] || [];

        // Create new chat
        const newChat: Chat = {
          id: this.generateId(),
          title: title || 'New Chat',
          messages: [],
        };

        // Add to user's chats
        userChats.push(newChat);

        // Update chats in database
        return { allChats, newChat, userChats };
      }),
      switchMap(({ allChats, newChat, userChats }) => {
        allChats[this.currentUser!.id] = userChats;

        // Save updated chats
        return this.http
          .put(`${this.API_URL}/chats`, allChats)
          .pipe(map(() => newChat));
      }),
      catchError((error) => {
        console.error('Error creating chat:', error);
        return throwError(() => new Error('Failed to create chat'));
      }),
      delay(300) // Simulate network delay
    );
  }

  // Enhanced updateChatTitle method with improved persistence
  updateChatTitle(chatId: string, newTitle: string): Observable<Chat> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    // Get current chats
    return this.http.get<any>(`${this.API_URL}/chats`).pipe(
      map((allChats) => {
        // Make sure we have the current user chats
        if (!allChats[this.currentUser!.id]) {
          console.warn('User chats not found in database, creating new entry');
          allChats[this.currentUser!.id] = [];
        }

        const userChats = allChats[this.currentUser!.id];
        const chatIndex = userChats.findIndex((c: any) => c.id === chatId);

        if (chatIndex === -1) {
          throw new Error(
            `Chat with ID ${chatId} not found for user ${this.currentUser!.id}`
          );
        }
        userChats[chatIndex].title = newTitle || 'Untitled Chat'; // Prevent empty titles
        allChats[this.currentUser!.id] = userChats;

        return { allChats, updatedChat: userChats[chatIndex] };
      }),
      switchMap(({ allChats, updatedChat }) => {
        // Make sure to save the complete chats object to the server with explicit PUT
        return this.http.put(`${this.API_URL}/chats`, allChats).pipe(
          tap(() => {}),
          map(() => {
            // Make a clean copy with proper Date objects for timestamps
            return {
              ...updatedChat,
              messages: updatedChat.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
            };
          })
        );
      }),
      // Add retry logic for database saving
      switchMap((updatedChat) => {
        // Verify the update was saved by re-fetching
        return this.http.get<any>(`${this.API_URL}/chats`).pipe(
          map((refreshedChats) => {
            const userChats = refreshedChats[this.currentUser!.id] || [];
            const savedChat = userChats.find((c: any) => c.id === chatId);

            if (!savedChat) {
              console.error('Chat not found after update!');
              return updatedChat;
            }

            if (savedChat.title !== newTitle) {
              console.warn(
                `Title mismatch after save! DB has "${savedChat.title}" but expected "${newTitle}"`
              );
              // Could trigger another save here if needed
            } else {
            }

            return updatedChat;
          }),
          catchError((error) => {
            console.warn(
              'Verification check failed but update may have succeeded:',
              error
            );
            return of(updatedChat);
          })
        );
      }),
      catchError((error) => {
        console.error('Error updating chat title:', error);
        return throwError(
          () => new Error(`Failed to update chat title: ${error.message}`)
        );
      }),
      delay(300) // Simulate network delay
    );
  }

  deleteChat(chatId: string): Observable<boolean> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    // Get current chats
    return this.http.get<any>(`${this.API_URL}/chats`).pipe(
      map((allChats) => {
        const userChats = allChats[this.currentUser!.id] || [];
        const filteredChats = userChats.filter((c: any) => c.id !== chatId);

        if (filteredChats.length === userChats.length) {
          throw new Error('Chat not found');
        }

        // Update chats
        allChats[this.currentUser!.id] = filteredChats;
        return allChats;
      }),
      switchMap((allChats) => {
        // Save updated chats
        return this.http
          .put(`${this.API_URL}/chats`, allChats)
          .pipe(map(() => true));
      }),
      catchError((error) => {
        console.error('Error deleting chat:', error);
        return throwError(() => new Error('Failed to delete chat'));
      }),
      delay(300) // Simulate network delay
    );
  }

  // Message methods

  sendMessage(chatId: string, text: string): Observable<Message> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    const message: Message = {
      id: this.generateId(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    return this.addMessageToChat(chatId, message);
  }

  private handleError(error: any, errorMessage: string): Observable<never> {
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  getBotResponse(userText: string): Observable<string> {
    // Simple bot response logic
    let response = '';
    const lowerText = userText.toLowerCase();

    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      response = 'Hello! How can I help you today?';
    } else if (lowerText.includes('how are you')) {
      response = "I'm just a demo chatbot, but I'm working fine. How are you?";
    } else if (lowerText.includes('thank')) {
      response = "You're welcome! Anything else I can help with?";
    } else if (lowerText.includes('bye')) {
      response = 'Goodbye! Have a great day!';
    } else {
      const responses = [
        'I understand. Can you tell me more?',
        'Interesting. What else would you like to discuss?',
        'I see. How does that make you feel?',
        'Thanks for sharing that. What else is on your mind?',
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    return of(response).pipe(delay(1000)); // Simulate thinking time
  }

  // Updated to accept SQL metadata
  sendBotMessage(
    chatId: string,
    text: string,
    isSqlQuery?: boolean,
    rawSql?: string
  ): Observable<Message> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    const message: Message = {
      id: this.generateId(),
      text,
      sender: 'bot',
      timestamp: new Date(),
      isSqlQuery, // Store SQL flag
      rawSql, // Store raw SQL
    };

    return this.addMessageToChat(chatId, message);
  }

  // Private helper methods

  private setCurrentUser(user: User): void {
    this.currentUser = user;
    try {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user to localStorage', e);
    }
  }

  private addMessageToChat(
    chatId: string,
    message: Message
  ): Observable<Message> {
    if (!this.currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    // Get current chats
    return this.http.get<any>(`${this.API_URL}/chats`).pipe(
      map((allChats) => {
        const userChats = allChats[this.currentUser!.id] || [];
        const chatIndex = userChats.findIndex((c: any) => c.id === chatId);

        if (chatIndex === -1) {
          throw new Error('Chat not found');
        }

        // Convert message timestamp to string for storage
        const messageToStore = {
          ...message,
          timestamp: message.timestamp.toISOString(),
        };

        // Add message to chat
        userChats[chatIndex].messages.push(messageToStore);
        allChats[this.currentUser!.id] = userChats;

        return { allChats, message };
      }),
      switchMap(({ allChats, message }) => {
        // Save updated chats
        return this.http
          .put(`${this.API_URL}/chats`, allChats)
          .pipe(map(() => message));
      }),
      catchError((error) => {
        console.error('Error adding message:', error);
        return throwError(() => new Error('Failed to send message'));
      }),
      delay(300) // Simulate network delay
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
