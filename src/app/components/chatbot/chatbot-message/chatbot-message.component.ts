import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chatbot-message',
  standalone: false,
  templateUrl: './chatbot-message.component.html',
  styleUrl: './chatbot-message.component.scss',
})
export class ChatbotMessageComponent {
  @Input() message: any;
}
