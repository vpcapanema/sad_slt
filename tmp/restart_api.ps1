$c = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($c) {
    $c | Select-Object OwningProcess -Unique | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "killed PID $($_.OwningProcess)"
    }
} else {
    Write-Host "no listener"
}
Start-Sleep -Seconds 2
$proc = Start-Process -FilePath ".\.venv\Scripts\python.exe" -ArgumentList "-m","api.server" -WindowStyle Hidden -PassThru
Write-Host "started PID $($proc.Id)"
for ($i=0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/health" -TimeoutSec 2 -UseBasicParsing
        Write-Host "UP: $($r.StatusCode) after $i tries"
        exit 0
    } catch {
        Start-Sleep -Milliseconds 1000
    }
}
Write-Host "timeout waiting for API"
exit 1
