# Azure Functions Clean Deployment Script
param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionAppName,
    [switch]$Force
)

Write-Host "🧹 AZURE FUNCTIONS CLEAN DEPLOYMENT" -ForegroundColor Cyan
Write-Host "Function App: $FunctionAppName" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan

# Step 1: Clean local build
Write-Host "1️⃣ Cleaning local environment..." -ForegroundColor Green
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "   ✅ Removed node_modules" -ForegroundColor Gray
}

# Step 2: Install only production dependencies
Write-Host "2️⃣ Installing production dependencies..." -ForegroundColor Green
npm ci --only=production --silent
Write-Host "   ✅ Production dependencies installed" -ForegroundColor Gray

# Step 3: Verify function structure
Write-Host "3️⃣ Verifying function structure..." -ForegroundColor Green
$requiredFolders = @("health", "infer", "upload-url", "shared")
foreach ($folder in $requiredFolders) {
    if (Test-Path $folder) {
        Write-Host "   ✅ $folder" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ $folder MISSING!" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Show what will be deployed
Write-Host "4️⃣ Files to be deployed:" -ForegroundColor Green
Get-ChildItem -Recurse -File | Where-Object { 
    $_.FullName -notmatch "tests|\.test\.|\.spec\.|node_modules" 
} | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
    Write-Host "   📄 $relativePath" -ForegroundColor Gray
}

# Step 5: Deploy to Azure
Write-Host "5️⃣ Deploying to Azure..." -ForegroundColor Green
if ($Force) {
    Write-Host "   🚀 Force deployment initiated..." -ForegroundColor Yellow
    func azure functionapp publish $FunctionAppName --force --build remote --javascript
} else {
    Write-Host "   🚀 Standard deployment initiated..." -ForegroundColor Yellow
    func azure functionapp publish $FunctionAppName --build remote --javascript
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "🌐 Function App URL: https://$FunctionAppName.azurewebsites.net" -ForegroundColor Cyan
} else {
    Write-Host "❌ DEPLOYMENT FAILED!" -ForegroundColor Red
    exit 1
}

Write-Host "======================================" -ForegroundColor Cyan
