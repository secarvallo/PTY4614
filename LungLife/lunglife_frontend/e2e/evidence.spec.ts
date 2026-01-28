import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BACKEND_URL = 'http://localhost:3001'; // Default backend port
const EVIDENCE_DIR = path.join(__dirname, '../../evidence_outputs');
const BACKEND_DIR = path.join(__dirname, '../../lunglife_backend/src');

test.describe('Evidence Generation', () => {

    test.beforeAll(async () => {
        // Create evidence directory if it doesn't exist
        if (!fs.existsSync(EVIDENCE_DIR)) {
            fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
        }
        console.log(`Evidence directory: ${EVIDENCE_DIR}`);
    });

    test('B2 - API de Autenticación (Swagger)', async ({ page }) => {
        await page.goto(`${BACKEND_URL}/api-docs`);
        await page.waitForLoadState('networkidle');

        // Expand Auth section if needed (Swagger UI usually keeps them verified/open or collapsed)
        // We try to locate the auth section. 
        // Usually Swagger UI has ids like 'operations-tag-Auth'
        const authSection = page.locator('#operations-tag-Authentication');
        if (await authSection.isVisible()) {
            await authSection.scrollIntoViewIfNeeded();
            // Allow time for animation/expand
            await page.waitForTimeout(1000);
        }

        await page.screenshot({
            path: path.join(EVIDENCE_DIR, 'B2_Auth_API_Swagger.png'),
            fullPage: true
        });
    });

    test('B3 - Sistema RBAC Backend (Code Copy)', async () => {
        const sourcePath = path.join(BACKEND_DIR, 'shared/rbac/rbac.constants.ts');
        const destPath = path.join(EVIDENCE_DIR, 'B3_rbac.constants.ts');

        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            console.log('Copied rbac.constants.ts');
        } else {
            console.error(`File not found: ${sourcePath}`);
        }
    });

    test('B4 - API Directorio Médico (Swagger)', async ({ page }) => {
        await page.goto(`${BACKEND_URL}/api-docs`);
        await page.waitForLoadState('networkidle');

        // Locate Directory section
        // Check capitalization in Swagger, usually derived from tag
        const section = page.locator('#operations-tag-Directory'); // Adjust based on actual tag name
        if (await section.isVisible()) {
            await section.scrollIntoViewIfNeeded();
            // Click to expand if it's not the only one? Swagger expands all by default usually or verify config
            await page.waitForTimeout(500);
        }

        await page.screenshot({
            path: path.join(EVIDENCE_DIR, 'B4_Directory_API_Swagger.png'),
            fullPage: true
        });
    });

    test('B5 - API Perfil Clínico (Swagger)', async ({ page }) => {
        await page.goto(`${BACKEND_URL}/api-docs`);
        await page.waitForLoadState('networkidle');

        // Tag might be 'Clinical_Profile' or 'Clinical Profile', Swagger usually replaces spaces with underscores
        // We'll try to find the text 'Clinical Profile'
        const sectionLink = page.getByRole('button', { name: 'Clinical Profile', exact: false });
        if (await sectionLink.isVisible()) {
            await sectionLink.scrollIntoViewIfNeeded();
        }

        await page.screenshot({
            path: path.join(EVIDENCE_DIR, 'B5_Clinical_Profile_API_Swagger.png'),
            fullPage: true
        });
    });

    test('B6 - Repositorios UoW Pattern (Code Copy)', async () => {
        const sourcePath = path.join(BACKEND_DIR, 'infrastructure/repositories/patient.repository.ts');
        const destPath = path.join(EVIDENCE_DIR, 'B6_patient.repository.ts');

        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            console.log('Copied patient.repository.ts');
        } else {
            console.error(`File not found: ${sourcePath}`);
        }
    });

    test('B7 - Health Check Endpoint', async ({ page }) => {
        await page.goto(`${BACKEND_URL}/api/health`);
        // Basic JSON view in browser
        await page.waitForLoadState('networkidle');

        // Taking a screenshot of the raw JSON response
        await page.screenshot({
            path: path.join(EVIDENCE_DIR, 'B7_Health_Check_Response.png')
        });
    });

});
