import { Component, inject, OnInit, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
    analytics,
    arrowBack,
    home,
    heart,
    lockClosed,
    people,
    checkmarkCircle,
    chevronForward
} from 'ionicons/icons';

export interface OnboardingCard {
    id: string;
    title: string;
    description: string;
    details: string[];
    icon: string;
    color: string;
    gradient: string;
    illustration: string; // SVG illustration
}

@Component({
    selector: 'app-onboarding',
    templateUrl: 'onboarding.page.html',
    styleUrls: ['onboarding.page.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OnboardingPage implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    currentCardId = signal<string>('detection');

    cards: OnboardingCard[] = [
        {
            id: 'detection',
            title: 'Detección Temprana',
            description: 'Análisis avanzado con Inteligencia Artificial',
            details: [
                'Algoritmos de ML entrenados con datos clínicos',
                'Evaluación de factores de riesgo personalizados',
                'Alertas tempranas basadas en tu perfil',
                'Integración con historial médico'
            ],
            icon: 'analytics',
            color: 'primary',
            gradient: 'linear-gradient(135deg, #007AFF 0%, #0055D4 100%)',
            illustration: 'detection'
        },
        {
            id: 'tracking',
            title: 'Seguimiento Personalizado',
            description: 'Monitoreo continuo de tu salud pulmonar',
            details: [
                'Registro diario de hábitos de tabaquismo',
                'Seguimiento de síntomas respiratorios',
                'Progreso visible con estadísticas',
                'Planes adaptados a tus objetivos'
            ],
            icon: 'heart',
            color: 'tertiary',
            gradient: 'linear-gradient(135deg, #AF52DE 0%, #8E44AD 100%)',
            illustration: 'tracking'
        },
        {
            id: 'security',
            title: 'Seguridad de Datos',
            description: 'Tu información médica protegida',
            details: [
                'Encriptación de extremo a extremo',
                'Autenticación de dos factores (2FA)',
                'Cumplimiento con normativas de salud',
                'Control total sobre tus datos'
            ],
            icon: 'lock-closed',
            color: 'warning',
            gradient: 'linear-gradient(135deg, #FFCC00 0%, #FF9500 100%)',
            illustration: 'security'
        },
        {
            id: 'community',
            title: 'Comunidad de Apoyo',
            description: 'Conecta con profesionales y pacientes',
            details: [
                'Directorio de especialistas en salud pulmonar',
                'Red de apoyo entre pacientes',
                'Recursos educativos verificados',
                'Comunicación segura con tu médico'
            ],
            icon: 'people',
            color: 'success',
            gradient: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',
            illustration: 'community'
        }
    ];

    constructor() {
        addIcons({
            analytics,
            heart,
            lockClosed,
            people,
            arrowBack,
            home,
            checkmarkCircle,
            chevronForward
        });
    }

    ngOnInit() {
        // Read card ID from route params
        this.route.params.subscribe(params => {
            if (params['cardId'] && this.cards.find(c => c.id === params['cardId'])) {
                this.currentCardId.set(params['cardId']);
            }
        });
    }

    get currentCard(): OnboardingCard {
        return this.cards.find(c => c.id === this.currentCardId()) || this.cards[0];
    }

    get currentIndex(): number {
        return this.cards.findIndex(c => c.id === this.currentCardId());
    }

    selectCard(cardId: string): void {
        this.currentCardId.set(cardId);
    }

    navigateHome(): void {
        this.router.navigate(['/home']);
    }

    navigateToRegister(): void {
        this.router.navigate(['/auth/register']);
    }

    navigateToLogin(): void {
        this.router.navigate(['/auth/login']);
    }
}
