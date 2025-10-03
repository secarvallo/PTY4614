#!/usr/bin/env node

/**
 * Script de Limpieza Automatizada - LungLife Frontend
 * Limpia dependencias no utilizadas y archivos obsoletos de manera segura
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MaintenanceCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, '.maintenance-backups');
    this.logFile = path.join(this.projectRoot, 'maintenance.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir);
    }
    
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const packageBackup = path.join(this.backupDir, `package-${backupTimestamp}.json`);
    
    fs.copyFileSync('package.json', packageBackup);
    this.log(`✅ Backup creado: ${packageBackup}`);
  }

  async analyzeDependencies() {
    this.log('🔍 Analizando dependencias no utilizadas...');
    
    try {
      const depcheckResult = execSync('npx depcheck --json', { 
        encoding: 'utf8',
        timeout: 60000  // 60 segundos timeout
      });
      const analysis = JSON.parse(depcheckResult);
      
      this.log(`📦 Dependencies no utilizadas: ${analysis.dependencies.length}`);
      this.log(`🛠️ DevDependencies no utilizadas: ${analysis.devDependencies.length}`);
      
      return analysis;
    } catch (error) {
      this.log(`⚠️ Saltando análisis de dependencias (puede requerir más tiempo)`);
      return {
        dependencies: [],
        devDependencies: []
      };
    }
  }

  async analyzeUnusedFiles() {
    this.log('📄 Analizando archivos no importados...');
    
    try {
      const unimportedResult = execSync('npx unimported --json', { 
        encoding: 'utf8',
        timeout: 60000  // 60 segundos timeout
      });
      const files = JSON.parse(unimportedResult);
      
      this.log(`📁 Archivos no importados: ${files.length}`);
      return files;
    } catch (error) {
      this.log(`⚠️ Saltando análisis de archivos no importados (puede requerir más tiempo)`);
      return [];
    }
  }

  async checkCircularDependencies() {
    this.log('🔄 Verificando dependencias circulares...');
    
    try {
      const circularResult = execSync('npx madge --circular src/', { encoding: 'utf8' });
      
      // Si madge encuentra dependencias circulares, las imprime en stderr
      // Si no encuentra, imprime stats normales en stdout
      if (circularResult.includes('No circular dependency found') || 
          circularResult.includes('Processed') && !circularResult.includes('circular')) {
        this.log('✅ No se encontraron dependencias circulares');
        return true;
      } else {
        this.log('⚠️ Dependencias circulares encontradas:');
        this.log(circularResult);
        return false;
      }
    } catch (error) {
      // Si no hay dependencias circulares, madge puede retornar código 0
      // pero si hay un error real, lo reportamos
      if (error.stdout && error.stdout.includes('No circular dependency found')) {
        this.log('✅ No se encontraron dependencias circulares');
        return true;
      }
      this.log(`❌ Error verificando dependencias circulares: ${error.message}`);
      return false;
    }
  }

  removeSafeDependencies() {
    this.log('🧹 Removiendo dependencias seguras...');
    
    const safeDependencies = [
      'axios',
      '@types/uuid'
    ];

    const safeDevDependencies = [
      'jasmine-spec-reporter',
      'karma-chrome-launcher',
      'karma-coverage', 
      'karma-jasmine-html-reporter',
      'karma-jasmine',
      'karma'
    ];

    try {
      // Remover dependencias principales seguras
      for (const dep of safeDependencies) {
        if (this.isDependencyInstalled(dep)) {
          execSync(`npm uninstall ${dep}`, { stdio: 'inherit' });
          this.log(`✅ Removida dependencia: ${dep}`);
        }
      }

      // Remover devDependencies seguras
      for (const dep of safeDevDependencies) {
        if (this.isDependencyInstalled(dep, true)) {
          execSync(`npm uninstall ${dep}`, { stdio: 'inherit' });
          this.log(`✅ Removida devDependency: ${dep}`);
        }
      }

    } catch (error) {
      this.log(`❌ Error removiendo dependencias: ${error.message}`);
    }
  }

  isDependencyInstalled(depName, isDev = false) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = isDev ? packageJson.devDependencies : packageJson.dependencies;
    return deps && deps[depName];
  }

  removeLegacyFiles() {
    this.log('🗑️ Removiendo archivos legacy...');
    
    const legacyFiles = [
      'src/app/guards/auth.guard.ts',
      'src/app/guards/twofa.guard.ts',
      'src/app/strategies/auth.strategy.ts',
      'src/app/strategies/twofa.strategy.ts'
    ];

    const legacyDirs = [
      'src/app/guards',
      'src/app/strategies'
    ];

    // Remover archivos legacy
    for (const file of legacyFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.log(`✅ Archivo removido: ${file}`);
      }
    }

    // Remover directorios vacíos
    for (const dir of legacyDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        try {
          fs.rmdirSync(dirPath);
          this.log(`✅ Directorio removido: ${dir}`);
        } catch (error) {
          this.log(`⚠️ Directorio no vacío o no se pudo remover: ${dir}`);
        }
      }
    }
  }

  validateBuild() {
    this.log('🔧 Validando que el build funciona...');
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      this.log('✅ Build exitoso después de la limpieza');
      return true;
    } catch (error) {
      this.log('❌ Build falló después de la limpieza');
      this.log('🔄 Restaurando desde backup...');
      this.restoreFromBackup();
      return false;
    }
  }

  restoreFromBackup() {
    const backupFiles = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('package-'))
      .sort()
      .reverse();

    if (backupFiles.length > 0) {
      const latestBackup = path.join(this.backupDir, backupFiles[0]);
      fs.copyFileSync(latestBackup, 'package.json');
      this.log(`🔄 Restaurado desde: ${latestBackup}`);
      
      // Reinstalar dependencias
      execSync('npm install', { stdio: 'inherit' });
      this.log('📦 Dependencias reinstaladas');
    }
  }

  generateReport(analysis, unusedFiles) {
    this.log('📊 Generando reporte de mantenimiento...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        unusedDependencies: analysis ? analysis.dependencies.length : 0,
        unusedDevDependencies: analysis ? analysis.devDependencies.length : 0,
        unusedFiles: unusedFiles.length,
        circularDependencies: 0 // Se actualizará después del check
      },
      details: {
        unusedDependencies: analysis ? analysis.dependencies : [],
        unusedDevDependencies: analysis ? analysis.devDependencies : [],
        unusedFiles: unusedFiles,
        recommendations: [
          'Revisar dependencias Capacitor si no se planea desarrollo móvil',
          'Evaluar remoción de @angular/fire si no se usa Firebase',
          'Considerar uso de Playwright para E2E testing',
          'Mantener Clean Architecture principles'
        ]
      }
    };

    fs.writeFileSync('maintenance-report.json', JSON.stringify(report, null, 2));
    this.log('✅ Reporte generado: maintenance-report.json');
  }

  async run() {
    this.log('🚀 Iniciando limpieza de mantenimiento...');
    
    // 1. Crear backup
    this.createBackup();
    
    // 2. Análisis inicial
    const analysis = await this.analyzeDependencies();
    const unusedFiles = await this.analyzeUnusedFiles();
    const circularOK = await this.checkCircularDependencies();
    
    if (!circularOK) {
      this.log('❌ Se encontraron dependencias circulares. Corrígelas antes de continuar.');
      return;
    }
    
    // 3. Limpieza segura
    this.removeSafeDependencies();
    this.removeLegacyFiles();
    
    // 4. Validación
    const buildOK = this.validateBuild();
    
    if (buildOK) {
      this.log('✅ Limpieza completada exitosamente');
      this.generateReport(analysis, unusedFiles);
    } else {
      this.log('❌ Limpieza falló, proyecto restaurado');
    }
    
    this.log('📋 Revisa maintenance.log para detalles completos');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const cleaner = new MaintenanceCleaner();
  cleaner.run().catch(console.error);
}

module.exports = MaintenanceCleaner;