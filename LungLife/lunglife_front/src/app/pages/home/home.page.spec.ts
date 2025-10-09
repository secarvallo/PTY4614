import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HomePage} from './home.page';
import {AuthService} from '../../services/auth.service';
import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {Router} from '@angular/router';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  const mockAuth: Partial<AuthService> = {
    getCurrentUser: () => null,
    logout: () => Promise.resolve()
  };
  const mockLoading: Partial<LoadingService> = {
    startLoading: () => {
    },
    stopLoading: () => {
    }
  };
  const mockToast: Partial<ToastService> = {
    showInfo: () => Promise.resolve(),
    showWarning: () => Promise.resolve(),
    showSuccess: () => Promise.resolve(),
    showError: () => Promise.resolve(),
    showActionToast: () => Promise.resolve()
  };
  const mockAnimation: Partial<AnimationService> = {
    pulse: () => ({
      play: () => {
      }
    } as any),
    staggerAnimation: () => ({
      play: () => {
      }
    } as any)
  };
  const mockRouter: Partial<Router> = {
    navigate: () => Promise.resolve(true)
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        {provide: AuthService, useValue: mockAuth},
        {provide: LoadingService, useValue: mockLoading},
        {provide: ToastService, useValue: mockToast},
        {provide: AnimationService, useValue: mockAnimation},
        {provide: Router, useValue: mockRouter}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
