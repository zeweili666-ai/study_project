$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataFile = Join-Path $root "data.json"
$port = 5177
$hostUrl = "http://127.0.0.1:$port/"

if (-not (Test-Path $dataFile)) {
  '{"courses":[],"tasks":[],"exams":[]}' | Set-Content -LiteralPath $dataFile -Encoding UTF8
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  $Stream.Write($Body, 0, $Body.Length)
}

function Send-Text {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [string]$Text,
    [string]$ContentType = "text/plain; charset=utf-8",
    [int]$StatusCode = 200,
    [string]$StatusText = "OK"
  )

  $body = [System.Text.Encoding]::UTF8.GetBytes($Text)
  Send-Response -Stream $Stream -StatusCode $StatusCode -StatusText $StatusText -ContentType $ContentType -Body $body
}

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".md" { "text/markdown; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Read-Request {
  param([System.Net.Sockets.NetworkStream]$Stream)

  $headerBytes = [System.Collections.Generic.List[byte]]::new()
  $one = New-Object byte[] 1

  while ($true) {
    $read = $Stream.Read($one, 0, 1)
    if ($read -le 0) { break }
    $headerBytes.Add($one[0])
    $count = $headerBytes.Count
    if ($count -ge 4 -and
        $headerBytes[$count - 4] -eq 13 -and
        $headerBytes[$count - 3] -eq 10 -and
        $headerBytes[$count - 2] -eq 13 -and
        $headerBytes[$count - 1] -eq 10) {
      break
    }
  }

  $headerText = [System.Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
  $lines = $headerText -split "`r`n"
  $requestParts = $lines[0] -split " "
  $headers = @{}

  foreach ($line in $lines | Select-Object -Skip 1) {
    if (-not $line.Contains(":")) { continue }
    $index = $line.IndexOf(":")
    $name = $line.Substring(0, $index).Trim().ToLowerInvariant()
    $value = $line.Substring($index + 1).Trim()
    $headers[$name] = $value
  }

  $contentLength = 0
  if ($headers.ContainsKey("content-length")) {
    $contentLength = [int]$headers["content-length"]
  }

  $bodyBytes = New-Object byte[] $contentLength
  $offset = 0
  while ($offset -lt $contentLength) {
    $read = $Stream.Read($bodyBytes, $offset, $contentLength - $offset)
    if ($read -le 0) { break }
    $offset += $read
  }

  return @{
    Method = $requestParts[0]
    Path = $requestParts[1]
    Body = [System.Text.Encoding]::UTF8.GetString($bodyBytes)
  }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $port)

try {
  $listener.Start()
} catch {
  Write-Host "Failed to start. Port $port may be busy."
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "Semester Study Planner backend is running."
Write-Host "Open in browser: $hostUrl"
Write-Host "Data file: $dataFile"
Write-Host "Stop server: press Ctrl + C in this window."

while ($true) {
  $client = $listener.AcceptTcpClient()
  $stream = $client.GetStream()

  try {
    $request = Read-Request -Stream $stream
    $path = ($request.Path -split "\?")[0]

    if ($path -eq "/api/state" -and $request.Method -eq "GET") {
      $json = Get-Content -LiteralPath $dataFile -Raw -Encoding UTF8
      Send-Text -Stream $stream -Text $json -ContentType "application/json; charset=utf-8"
      continue
    }

    if ($path -eq "/api/state" -and $request.Method -eq "PUT") {
      try {
        $parsed = $request.Body | ConvertFrom-Json
        if ($null -eq $parsed.courses -or $null -eq $parsed.tasks -or $null -eq $parsed.exams) {
          throw "Invalid state shape"
        }
      } catch {
        Send-Text -Stream $stream -Text '{"error":"invalid json"}' -ContentType "application/json; charset=utf-8" -StatusCode 400 -StatusText "Bad Request"
        continue
      }

      $request.Body | Set-Content -LiteralPath $dataFile -Encoding UTF8
      Send-Text -Stream $stream -Text '{"ok":true}' -ContentType "application/json; charset=utf-8"
      continue
    }

    if ($path -eq "/") {
      $filePath = Join-Path $root "index.html"
    } else {
      $relative = [System.Uri]::UnescapeDataString($path.TrimStart("/"))
      $filePath = Join-Path $root $relative
    }

    $resolvedRoot = [System.IO.Path]::GetFullPath($root)
    $resolvedFile = [System.IO.Path]::GetFullPath($filePath)

    if (-not $resolvedFile.StartsWith($resolvedRoot)) {
      Send-Text -Stream $stream -Text "Forbidden" -StatusCode 403 -StatusText "Forbidden"
      continue
    }

    if (-not (Test-Path -LiteralPath $resolvedFile -PathType Leaf)) {
      Send-Text -Stream $stream -Text "Not found" -StatusCode 404 -StatusText "Not Found"
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($resolvedFile)
    Send-Response -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType (Get-ContentType -Path $resolvedFile) -Body $bytes
  } catch {
    Send-Text -Stream $stream -Text "Server error: $($_.Exception.Message)" -StatusCode 500 -StatusText "Server Error"
  } finally {
    $stream.Close()
    $client.Close()
  }
}
