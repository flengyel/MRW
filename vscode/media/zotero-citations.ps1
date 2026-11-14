# Read-only exact-key citation lookup. No library write or arbitrary RPC method.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$raw = [Console]::In.ReadToEnd()
if ([System.Text.Encoding]::UTF8.GetByteCount($raw) -gt 131072) { throw 'Citation request too large' }
$p = $raw | ConvertFrom-Json
if ($p.jsonrpc -ne '2.0' -or $p.method -cne 'item.pandoc_filter' -or $p.id -notmatch '^[a-f0-9-]{36}$') { throw 'Unsupported citation request' }
if (@($p.PSObject.Properties.Name).Count -ne 4 -or $p.params.Count -lt 2 -or $p.params.Count -gt 3 -or $p.params[1] -isnot [bool] -or -not $p.params[1]) { throw 'Invalid citation parameters' }
$keys = @($p.params[0])
if ($keys.Count -lt 1 -or $keys.Count -gt 128) { throw 'Invalid citation keys' }
foreach ($key in $keys) {
  if ($key -isnot [string] -or $key.Length -lt 1 -or [System.Text.Encoding]::UTF8.GetByteCount($key) -gt 512 -or $key -match '[\x00-\x1f\x7f]') { throw 'Invalid citation key' }
}
if ($p.params.Count -eq 3) {
  $libraries = @($p.params[2])
  if ($libraries.Count -lt 1 -or $libraries.Count -gt 8) { throw 'Invalid library scope' }
  foreach ($library in $libraries) { if ([string]$library -notmatch '^[1-9][0-9]{0,9}$' -or [long]$library -gt 2147483647) { throw 'Invalid library identity' } }
}
$r = [System.Net.HttpWebRequest]::Create('http://127.0.0.1:23119/better-bibtex/json-rpc')
$r.Method = 'POST'; $r.Proxy = $null; $r.AllowAutoRedirect = $false
$r.Timeout = 8000; $r.ReadWriteTimeout = 8000; $r.ContentType = 'application/json'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($raw); $r.ContentLength = $bytes.Length
$stream = $r.GetRequestStream()
try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
$response = $null
try { $response = $r.GetResponse() }
catch [System.Net.WebException] { if ($_.Exception.Response) { $response = $_.Exception.Response } else { throw } }
try {
  $stream = $response.GetResponseStream(); $memory = New-Object System.IO.MemoryStream
  try {
    $buffer = New-Object byte[] 65536
    while (($count = $stream.Read($buffer,0,$buffer.Length)) -gt 0) {
      if ($memory.Length + $count -gt 4194304) { throw 'Citation response exceeds 4 MiB' }
      $memory.Write($buffer,0,$count)
    }
    @{status=[int]$response.StatusCode;body=[System.Text.Encoding]::UTF8.GetString($memory.ToArray())} | ConvertTo-Json -Compress
  } finally { $stream.Dispose(); $memory.Dispose() }
} finally { $response.Dispose() }
