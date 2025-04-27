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
import { ChatbotContainerComponent } from './components/chatbot/chatbot-container/chatbot-container.component';
import { ChatbotSidebarComponent } from './components/chatbot/chatbot-sidebar/chatbot-sidebar.component';
import { ChatbotConversationComponent } from './components/chatbot/chatbot-conversation/chatbot-conversation.component';
import { ChatbotMessageComponent } from './components/chatbot/chatbot-message/chatbot-message.component';
import { ChatbotHeaderComponent } from './components/chatbot/chatbot-header/chatbot-header.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatbotContainerComponent,
    ChatbotSidebarComponent,
    ChatbotConversationComponent,
    ChatbotMessageComponent,
    ChatbotHeaderComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  providers: [provideClientHydration(withEventReplay()), provideHttpClient()],
  bootstrap: [AppComponent],
})
export class AppModule {}
