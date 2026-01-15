# PowerShell script to start Chroma server using Docker

Write-Host "Starting Chroma server with Docker..." -ForegroundColor Green

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if container already exists
$containerExists = docker ps -a --filter "name=rag-chroma" --format "{{.Names}}"

if ($containerExists -eq "rag-chroma") {
    Write-Host "Chroma container already exists. Starting it..." -ForegroundColor Yellow
    docker start rag-chroma
} else {
    Write-Host "Creating and starting Chroma container..." -ForegroundColor Yellow
    docker-compose up -d chroma
}

# Wait for Chroma to be ready
Write-Host "Waiting for Chroma server to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    Start-Sleep -Seconds 2
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/heartbeat" -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
            Write-Host "Chroma server is ready!" -ForegroundColor Green
        }
    } catch {
        Write-Host "." -NoNewline
    }
}

if (-not $ready) {
    Write-Host "`nWarning: Chroma server may not be ready yet. Check with: docker logs rag-chroma" -ForegroundColor Yellow
} else {
    Write-Host "`nChroma server is running at http://localhost:8000" -ForegroundColor Green
    Write-Host "To view logs: docker logs -f rag-chroma" -ForegroundColor Cyan
    Write-Host "To stop: docker stop rag-chroma" -ForegroundColor Cyan
}
