# Azure Functions Complete Recreation Script
param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionAppName,
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    [Parameter(Mandatory=$true)]
    [string]$StorageAccountName,
    [string]$Location = "West Europe"
)

Write-Host "🔄 AZURE FUNCTION COMPLETE RECREATION" -ForegroundColor Cyan
Write-Host "This will DELETE and RECREATE your Azure Function!" -ForegroundColor Red
Write-Host "Function App: $FunctionAppName" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan

# Confirmation
$confirmation = Read-Host "Are you sure you want to DELETE and recreate the function? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Red
    exit 0
}

# Step 1: Delete existing function app
Write-Host "1️⃣ Deleting existing Function App..." -ForegroundColor Red
az functionapp delete --name $FunctionAppName --resource-group $ResourceGroupName
Write-Host "   ✅ Function App deleted" -ForegroundColor Gray

# Step 2: Create new function app
Write-Host "2️⃣ Creating new Function App..." -ForegroundColor Green
az functionapp create `
    --name $FunctionAppName `
    --resource-group $ResourceGroupName `
    --storage-account $StorageAccountName `
    --consumption-plan-location $Location `
    --runtime node `
    --runtime-version 20 `
    --functions-version 4 `
    --os-type Windows

Write-Host "   ✅ New Function App created" -ForegroundColor Gray

# Step 3: Configure app settings
Write-Host "3️⃣ Configuring app settings..." -ForegroundColor Green
az functionapp config appsettings set --name $FunctionAppName --resource-group $ResourceGroupName --settings `
    "WEBSITE_NODE_DEFAULT_VERSION=20.x" `
    "WEBSITE_NPM_DEFAULT_VERSION=latest" `
    "SCM_DO_BUILD_DURING_DEPLOYMENT=true" `
    "ENABLE_ORYX_BUILD=true"

Write-Host "   ✅ App settings configured" -ForegroundColor Gray

# Step 4: Deploy clean API
Write-Host "4️⃣ Deploying clean API..." -ForegroundColor Green
.\clean-deploy.ps1 -FunctionAppName $FunctionAppName -Force

Write-Host "✅ RECREATION COMPLETED!" -ForegroundColor Green
