# Script para configurar autenticação do GitHub

# Configurar Git com suas credenciais
git config --global user.name "brunabi-cyber"
git config --global user.email "bruna.bi@verdetec.com"

# Configurar Git Credential Helper para usar o Windows Credential Manager
git config --global credential.helper wincred

# Testar a configuração
Write-Host "`nConfigurações do Git:" -ForegroundColor Green
Write-Host "Nome: $(git config --global user.name)" -ForegroundColor Yellow
Write-Host "Email: $(git config --global user.email)" -ForegroundColor Yellow
Write-Host "`nAutenticação configurada com sucesso!" -ForegroundColor Green
Write-Host "Quando você tentar fazer git push/pull, será solicitada a autenticação." -ForegroundColor Cyan
