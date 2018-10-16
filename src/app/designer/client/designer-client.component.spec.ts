import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DesignerClientComponent } from './designer-client.component';

describe('DesignerClientComponent', () => {
  let component: DesignerClientComponent;
  let fixture: ComponentFixture<DesignerClientComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DesignerClientComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DesignerClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
