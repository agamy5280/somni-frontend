import { NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
// Material imports
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

import { ChatbotContainerComponent } from './components/chatbot/chatbot-container/chatbot-container.component';
import { ChatbotSidebarComponent } from './components/chatbot/chatbot-sidebar/chatbot-sidebar.component';
import { ChatbotConversationComponent } from './components/chatbot/chatbot-conversation/chatbot-conversation.component';
import { ChatbotMessageComponent } from './components/chatbot/chatbot-message/chatbot-message.component';
import { ChatbotHeaderComponent } from './components/chatbot/chatbot-header/chatbot-header.component';
import { LoginComponent } from './components/user/login/login.component';
import { RegisterComponent } from './components/user/register/register.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatbotContainerComponent,
    ChatbotSidebarComponent,
    ChatbotConversationComponent,
    ChatbotMessageComponent,
    ChatbotHeaderComponent,
    LoginComponent,
    RegisterComponent,
    PageNotFoundComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    BrowserAnimationsModule,
  ],
  providers: [provideClientHydration(withEventReplay()), provideHttpClient()],
  bootstrap: [AppComponent],
})
export class AppModule {}
