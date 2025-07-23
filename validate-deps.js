#!/usr/bin/env node

/**
 * Dependency Validation Script for Train at Trails
 * Checks if all required dependencies are properly installed and configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const requiredNodeVersion = 18;
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function checkNodeVersion() {
  log('\n🔍 Checking Node.js version...', 'blue');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= requiredNodeVersion) {
    log(`✅ Node.js ${nodeVersion} (required: ${requiredNodeVersion}+)`, 'green');
    return true;
  } else {
    log(`❌ Node.js ${nodeVersion} is too old. Required: ${requiredNodeVersion}+`, 'red');
    return false;
  }
}

function checkPackageJson(location, name) {
  log(`\n🔍 Checking ${name} package.json...`, 'blue');
  const packagePath = path.join(location, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    log(`❌ package.json not found in ${location}`, 'red');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
    
    log(`✅ ${name} package.json found`, 'green');
    log(`   📦 Dependencies: ${depCount}`, 'green');
    log(`   🔧 Dev Dependencies: ${devDepCount}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Invalid package.json in ${location}: ${error.message}`, 'red');
    return false;
  }
}

function checkNodeModules(location, name) {
  log(`\n🔍 Checking ${name} node_modules...`, 'blue');
  const nodeModulesPath = path.join(location, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log(`❌ node_modules not found in ${location}`, 'red');
    log(`   💡 Run: npm install in ${location}`, 'yellow');
    return false;
  }
  
  const nodeModulesSize = fs.readdirSync(nodeModulesPath).length;
  log(`✅ ${name} node_modules found (${nodeModulesSize} packages)`, 'green');
  return true;
}

function checkEnvironmentFiles() {
  log('\n🔍 Checking environment files...', 'blue');
  
  const backendEnvExample = path.join('backend', '.env.example');
  const frontendEnvExample = path.join('frontend', '.env.example');
  const backendEnv = path.join('backend', '.env');
  const frontendEnv = path.join('frontend', '.env');
  
  let allGood = true;
  
  // Check example files exist
  if (fs.existsSync(backendEnvExample)) {
    log('✅ backend/.env.example found', 'green');
  } else {
    log('❌ backend/.env.example missing', 'red');
    allGood = false;
  }
  
  if (fs.existsSync(frontendEnvExample)) {
    log('✅ frontend/.env.example found', 'green');
  } else {
    log('❌ frontend/.env.example missing', 'red');
    allGood = false;
  }
  
  // Check actual env files
  if (fs.existsSync(backendEnv)) {
    log('✅ backend/.env found', 'green');
  } else {
    log('⚠️  backend/.env missing', 'yellow');
    log('   💡 Copy from backend/.env.example', 'yellow');
  }
  
  if (fs.existsSync(frontendEnv)) {
    log('✅ frontend/.env found', 'green');
  } else {
    log('⚠️  frontend/.env missing', 'yellow');
    log('   💡 Copy from frontend/.env.example', 'yellow');
  }
  
  return allGood;
}

function checkDatabase() {
  log('\n🔍 Checking database setup...', 'blue');
  
  const schemaPath = path.join('backend', 'prisma', 'schema.prisma');
  const dbPath = path.join('backend', 'prisma', 'dev.db');
  
  if (!fs.existsSync(schemaPath)) {
    log('❌ Prisma schema not found', 'red');
    return false;
  }
  
  log('✅ Prisma schema found', 'green');
  
  if (fs.existsSync(dbPath)) {
    log('✅ SQLite database found', 'green');
  } else {
    log('⚠️  SQLite database not found', 'yellow');
    log('   💡 Run: cd backend && npm run db:migrate', 'yellow');
  }
  
  return true;
}

function checkCriticalDependencies() {
  log('\n🔍 Checking critical dependencies...', 'blue');
  
  const criticalBackendDeps = [
    '@prisma/client',
    'express',
    'jsonwebtoken',
    'bcryptjs',
    'cors',
    'dotenv'
  ];
  
  const criticalFrontendDeps = [
    'react',
    'react-dom',
    'react-router-dom',
    'axios',
    'tailwindcss'
  ];
  
  let allGood = true;
  
  // Check backend
  try {
    const backendPackage = JSON.parse(fs.readFileSync(path.join('backend', 'package.json'), 'utf8'));
    const allBackendDeps = { ...backendPackage.dependencies, ...backendPackage.devDependencies };
    
    criticalBackendDeps.forEach(dep => {
      if (allBackendDeps[dep]) {
        log(`✅ Backend: ${dep}@${allBackendDeps[dep]}`, 'green');
      } else {
        log(`❌ Backend: ${dep} missing`, 'red');
        allGood = false;
      }
    });
  } catch (error) {
    log('❌ Cannot read backend package.json', 'red');
    allGood = false;
  }
  
  // Check frontend
  try {
    const frontendPackage = JSON.parse(fs.readFileSync(path.join('frontend', 'package.json'), 'utf8'));
    const allFrontendDeps = { ...frontendPackage.dependencies, ...frontendPackage.devDependencies };
    
    criticalFrontendDeps.forEach(dep => {
      if (allFrontendDeps[dep]) {
        log(`✅ Frontend: ${dep}@${allFrontendDeps[dep]}`, 'green');
      } else {
        log(`❌ Frontend: ${dep} missing`, 'red');
        allGood = false;
      }
    });
  } catch (error) {
    log('❌ Cannot read frontend package.json', 'red');
    allGood = false;
  }
  
  return allGood;
}

function main() {
  log('🚂 Train at Trails - Dependency Validation', 'blue');
  log('==========================================', 'blue');
  
  let allChecks = true;
  
  // Run all checks
  allChecks &= checkNodeVersion();
  allChecks &= checkPackageJson('.', 'Root');
  allChecks &= checkPackageJson('backend', 'Backend');
  allChecks &= checkPackageJson('frontend', 'Frontend');
  allChecks &= checkNodeModules('.', 'Root');
  allChecks &= checkNodeModules('backend', 'Backend');
  allChecks &= checkNodeModules('frontend', 'Frontend');
  allChecks &= checkEnvironmentFiles();
  allChecks &= checkDatabase();
  allChecks &= checkCriticalDependencies();
  
  log('\n==========================================', 'blue');
  
  if (allChecks) {
    log('🎉 All dependency checks passed!', 'green');
    log('   You can now run: npm run dev', 'green');
  } else {
    log('⚠️  Some issues found. Please fix them before proceeding.', 'yellow');
    log('   💡 Try running the setup script: setup.bat (Windows) or ./setup.sh (Mac/Linux)', 'yellow');
  }
  
  log('==========================================', 'blue');
}

// Run the validation
main();
