import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotHeaderComponent } from './chatbot-header.component';

describe('ChatbotHeaderComponent', () => {
  let component: ChatbotHeaderComponent;
  let fixture: ComponentFixture<ChatbotHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChatbotHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatbotHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
