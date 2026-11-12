# Read-only Windows loopback bridge. Input is JSON, never interpolated code.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$inputRecord = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ($inputRecord.path.Length -gt 8192 -or $inputRecord.path -notmatch '^/(users/\d+/(groups|items(/top|/[A-Z0-9]{8}(/children|/file/view/url)?)?)|groups/\d+/items(/top|/[A-Z0-9]{8}(/children|/file/view/url)?)?)?(\?[^#\s]*)?$') { throw 'Invalid API path' }
$request = [System.Net.HttpWebRequest]::Create('http://127.0.0.1:23119/api' + $inputRecord.path)
$request.Method = 'GET'
$request.Proxy = $null
$request.AllowAutoRedirect = $false
$request.Timeout = 8000
$request.ReadWriteTimeout = 8000
$request.Headers['Zotero-API-Version'] = '3'
if ($inputRecord.serverId) {
  if ($inputRecord.serverId -notmatch '^[\w-]{1,128}$') { throw 'Invalid server identity' }
  $request.Headers['Zotero-Server-ID'] = $inputRecord.serverId
}
$response = $null
try { $response = $request.GetResponse() }
catch [System.Net.WebException] { if ($_.Exception.Response) { $response = $_.Exception.Response } else { throw } }
try {
  $stream = $response.GetResponseStream()
  $buffer = New-Object byte[] 65536
  $memory = New-Object System.IO.MemoryStream
  try {
    while (($count = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      if ($memory.Length + $count -gt 4194304) { throw 'Zotero response exceeds 4 MiB' }
      $memory.Write($buffer, 0, $count)
    }
    $headers = @{}
    foreach ($name in @('Zotero-API-Version','Zotero-Schema-Version','Zotero-Server-ID','X-Zotero-Version')) { $headers[$name.ToLower()] = $response.Headers[$name] }
    @{status=[int]$response.StatusCode; headers=$headers; body=[System.Text.Encoding]::UTF8.GetString($memory.ToArray())} | ConvertTo-Json -Compress
  } finally { $stream.Dispose(); $memory.Dispose() }
} finally { $response.Dispose() }
