import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TagEditor } from './tag-editor';

describe('TagEditor', () => {
  let component: TagEditor;
  let fixture: ComponentFixture<TagEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TagEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
