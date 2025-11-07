# PowerShell deployment script for Windows

Write-Host "Starting deployment to AWS Lambda..." -ForegroundColor Green

# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if (-not $name.StartsWith('#')) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}

# Build the Next.js application
Write-Host " Building Next.js application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy using Serverless Framework
Write-Host "  Deploying to AWS Lambda..." -ForegroundColor Yellow
npx serverless deploy --stage prod

if ($LASTEXITCODE -eq 0) {
    Write-Host " Deployment successful!" -ForegroundColor Green
    Write-Host " Your application is now live on AWS Lambda" -ForegroundColor Cyan
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}


