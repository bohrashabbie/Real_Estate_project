# Dev smoke test against a running API on :8000. Usage:
#   powershell -File scripts\smoke.ps1
$ErrorActionPreference = "Stop"
$base = "http://localhost:8000"

Write-Host "== /health"
Invoke-RestMethod "$base/health" | ConvertTo-Json -Compress

Write-Host "== login"
$login = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/login" -ContentType "application/json" -Body (@{email = "owner@kwt25.com"; password = "Kwt25!Owner#2026"} | ConvertTo-Json)
$headers = @{Authorization = "Bearer $($login.access_token)"}
Write-Host "token ok: $($login.access_token.Substring(0,20))..."

Write-Host "== GET /api/v1/auth/me"
(Invoke-RestMethod -Uri "$base/api/v1/auth/me" -Headers $headers).email

Write-Host "== GET /api/v1/properties"
$props = Invoke-RestMethod -Uri "$base/api/v1/properties" -Headers $headers
Write-Host "admin properties: $($props.items.Count) items, next_cursor=$($props.next_cursor)"

Write-Host "== GET /public/v1/properties?locale=ar"
$pub = Invoke-RestMethod -Uri "$base/public/v1/properties?locale=ar"
Write-Host "public properties: $($pub.items.Count) items; first: $($pub.items[0].title) / $($pub.items[0].price) $($pub.items[0].currency)"

Write-Host "== GET /public/v1/properties/featured"
$feat = Invoke-RestMethod -Uri "$base/public/v1/properties/featured"
Write-Host "featured: $($feat.items.Count) items"

Write-Host "== POST /public/v1/inquiries"
$inq = Invoke-RestMethod -Method Post -Uri "$base/public/v1/inquiries" -ContentType "application/json; charset=utf-8" -Body (@{name = "Test User"; phone = "+96599112233"; message = "Interested in this property"; property_id = $pub.items[0].id; source = "property"} | ConvertTo-Json)
Write-Host "inquiry created: id=$($inq.id) status=$($inq.status)"

Write-Host "== POST /public/v1/smart-search"
$ss = Invoke-RestMethod -Method Post -Uri "$base/public/v1/smart-search?locale=en" -ContentType "application/json" -Body (@{purpose = "rent"; type = "apartment"; budget_max = 500; rooms = 2} | ConvertTo-Json)
Write-Host "smart-search: $($ss.items.Count) items, relaxed=[$($ss.relaxed -join ', ')]"

Write-Host "== ALL SMOKE TESTS PASSED"
