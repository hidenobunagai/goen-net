$dbUrl = "https://goen-net-db-hidenobunagai.aws-ap-northeast-1.turso.io"
$authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTg5OTE4NTcsImlkIjoiYmFlYWE5OTMtN2Q0Mi00ZTczLWE5MGEtMWM1MzhlNGNhNDkzIiwicmlkIjoiNzE5MTIxZGMtNGE1OC00NzQxLTgwMjYtM2FkZGJjYjYxNzhiIn0.oz7EUKYqeNzDmfrfTF-V87Mrvh_EFjaeBNbbo6-Lbs3MlhVq_7SH04nzThC9PFXdv4Fx1Xyx5H1NdPHkzcG-AA"

$sql = "CREATE INDEX IF NOT EXISTS idx_worksheets_uid_role ON worksheets(uid, role)"

$body = @{
    statements = @($sql)
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $dbUrl -Method Post -Headers $headers -Body $body
    Write-Host "✅ worksheets index created successfully" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error creating index:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
