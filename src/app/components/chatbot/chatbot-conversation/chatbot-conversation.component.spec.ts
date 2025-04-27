import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotConversationComponent } from './chatbot-conversation.component';

describe('ChatbotConversationComponent', () => {
  let component: ChatbotConversationComponent;
  let fixture: ComponentFixture<ChatbotConversationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChatbotConversationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatbotConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
