/**
 * Script para extrair favicon_io.zip e copiar os arquivos para a pasta public/
 * Execute com: node extract-favicon.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const zipPath = path.join(__dirname, '..', '..', 'favicon_io.zip');
const extractDir = path.join(__dirname, '..', '..', 'favicon_io_extracted');
const publicDir = path.join(__dirname, 'public');

console.log('📦 Verificando ZIP em:', zipPath);

if (!fs.existsSync(zipPath)) {
  console.error('❌ Arquivo favicon_io.zip não encontrado em:', zipPath);
  console.log('   Baixe o arquivo em https://favicon.io/favicon-converter/ e coloque em Downloads');
  process.exit(1);
}

console.log('✅ ZIP encontrado! Extraindo...');

// Criar diretório de extração
if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir, { recursive: true });
}

// Extrair ZIP usando PowerShell (Windows)
try {
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'inherit' });
  console.log('✅ ZIP extraído com sucesso!');
} catch (err) {
  console.error('❌ Erro ao extrair ZIP:', err.message);
  process.exit(1);
}

// Copiar arquivos para public/
const filesToCopy = [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
];

console.log('\n📁 Copiando arquivos para public/...');
filesToCopy.forEach(file => {
  const src = path.join(extractDir, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} não encontrado no ZIP`);
  }
});

console.log('\n🎉 Favicon instalado com sucesso no Dashboard Costeleta!');
console.log('   Reinicie o servidor de desenvolvimento para ver as mudanças.');
