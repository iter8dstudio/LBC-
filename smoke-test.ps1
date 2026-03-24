$b = "https://testlbc-production.up.railway.app"
$o = "https://eclectic-sunburst-977ac5.netlify.app"
$results = @()

function Test-Endpoint($label, $method, $url, $body=$null) {
    try {
        $params = @{
            Uri = $url
            Method = $method
            TimeoutSec = 15
            Headers = @{"Origin"=$o}
        }
        if ($body) {
            $params.ContentType = "application/json"
            $params.Body = $body
        }
        $r = Invoke-WebRequest @params -UseBasicParsing
        $cors = $r.Headers["Access-Control-Allow-Origin"]
        $script:results += "PASS | $label | $($r.StatusCode) | CORS:$(if($cors){$cors}else{'MISSING'})"
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $code = [int]$resp.StatusCode
            $cors = $resp.Headers["Access-Control-Allow-Origin"]
            $stream = $resp.GetResponseStream()
            $bodyText = if($stream) { (New-Object System.IO.StreamReader $stream).ReadToEnd() } else { "" }
            # 4xx = expected (not a server error), 5xx = real failure
            $status = if($code -lt 500) { "PASS" } else { "FAIL" }
            $script:results += "$status | $label | $code | CORS:$(if($cors){$cors}else{'MISSING'}) | $($bodyText.Substring(0,[Math]::Min(120,$bodyText.Length)))"
        } else {
            $script:results += "FAIL | $label | NETWORK_ERROR | $($_.Exception.Message)"
        }
    }
}

Write-Host "`n========== LBC SMOKE TEST $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==========`n"

Test-Endpoint "GET  /api/health"              "GET"  "$b/api/health"
Test-Endpoint "GET  /api/listings"            "GET"  "$b/api/listings"
Test-Endpoint "GET  /api/stores"              "GET"  "$b/api/stores"
Test-Endpoint "GET  /api/listings/search"     "GET"  "$b/api/listings/search?q=test"
Test-Endpoint "POST /api/auth/register"       "POST" "$b/api/auth/register" '{"name":"Smoke Test","email":"smoketest99@lbc.ng","password":"TestPass123!","phone":"08099999999"}'
Test-Endpoint "POST /api/auth/login (bad)"    "POST" "$b/api/auth/login"    '{"email":"nobody@lbc.ng","password":"Wrong123!"}'
Test-Endpoint "GET  /api/users/me (unauth)"   "GET"  "$b/api/users/me"
Test-Endpoint "OPTIONS /api/auth/register"    "OPTIONS" "$b/api/auth/register"

$pass = ($results | Where-Object { $_ -match '^PASS' }).Count
$fail = ($results | Where-Object { $_ -match '^FAIL' }).Count

$results | ForEach-Object { Write-Host $_ }
Write-Host "`n========== RESULT: $pass PASS / $fail FAIL ==========`n"
