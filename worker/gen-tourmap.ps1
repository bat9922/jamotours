# worker.js の TOUR_CATALOG から、wp-content/ai-chat.js のツアー名表を作り直します。
#
#   PS> cd <repo のルート>
#   PS> powershell -File worker\gen-tourmap.ps1
#
# ツアーを増やした / 減らした / URLを変えたら、worker.js を直したあとに
# これを実行してください。チャットの「参考リンク」に出る名前がこの表から来ます。
#
# 【重要】このファイルは必ず BOM 付き UTF-8 で保存してください。
# Windows PowerShell 5.1 は BOM なし UTF-8 を cp932 として読むため、
# コメントの中の日本語ですら文字化けし、運が悪いと引用符を飲み込んで
# スクリプト全体が構文エラーになります。BOM があればその事故は起きません。

$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$enc  = New-Object Text.UTF8Encoding($false)
$wjs  = Join-Path $root 'worker\worker.js'
$ajs  = Join-Path $root 'wp-content\ai-chat.js'

foreach ($f in @($wjs, $ajs)) {
  if (-not (Test-Path -LiteralPath $f)) { throw "not found: $f  (run this from the repo root)" }
}

$w = [IO.File]::ReadAllText($wjs, $enc)
$m = [regex]::Match($w, 'const TOUR_CATALOG = `([\s\S]*?)`;')
if (-not $m.Success) { throw 'TOUR_CATALOG not found in worker.js' }

$SECTION = [char]0x25A0   # the section heading marker used inside the catalog

$pairs = New-Object System.Collections.ArrayList
$dupes = New-Object System.Collections.ArrayList
$seen  = @{}

foreach ($raw in ($m.Groups[1].Value -split "`n")) {
  $line = $raw.Trim()
  if (-not $line) { continue }
  if ($line.StartsWith($SECTION)) { continue }
  $i = $line.IndexOf('/')
  if ($i -lt 1) { continue }
  $name = $line.Substring(0, $i).Trim()
  $path = $line.Substring($i).Trim()
  if (-not $name -or -not $path.StartsWith('/')) { continue }
  if ($seen.ContainsKey($path)) {
    [void]$dupes.Add($path + "  (kept '" + $seen[$path] + "', skipped '" + $name + "')")
    continue
  }
  $seen[$path] = $name
  [void]$pairs.Add([pscustomobject]@{ path = $path; name = $name })
}
if ($pairs.Count -eq 0) { throw 'parsed 0 tours - the catalog format must have changed' }

# warn about links that do not exist on disk
$missing = New-Object System.Collections.ArrayList
foreach ($p in $pairs) {
  $rel = $p.path.TrimStart('/').Replace('/', '\')
  if ($p.path.EndsWith('/')) { $file = Join-Path $root ($rel + 'index.html') }
  else                       { $file = Join-Path $root $rel }
  if (-not (Test-Path -LiteralPath $file)) { [void]$missing.Add($p.path) }
}

function JsStr($s) { '"' + ($s -replace '\\', '\\' -replace '"', '\"') + '"' }

$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine('  /* TOUR-MAP-START */')
[void]$sb.AppendLine('  var TOURS = {')
for ($k = 0; $k -lt $pairs.Count; $k++) {
  $comma = ''
  if ($k -lt $pairs.Count - 1) { $comma = ',' }
  [void]$sb.AppendLine('    ' + (JsStr $pairs[$k].path) + ': ' + (JsStr $pairs[$k].name) + $comma)
}
[void]$sb.AppendLine('  };')
[void]$sb.Append('  /* TOUR-MAP-END */')

$a = [IO.File]::ReadAllText($ajs, $enc)
$pattern = '(?s)[ \t]*/\* TOUR-MAP-START \*/.*?/\* TOUR-MAP-END \*/'
if (-not [regex]::IsMatch($a, $pattern)) { throw 'TOUR-MAP markers not found in wp-content/ai-chat.js' }
$new = [regex]::Replace($a, $pattern, { param($x) $sb.ToString() }, 1)
[IO.File]::WriteAllText($ajs, $new, $enc)

"tours written   : $($pairs.Count)"
"duplicate paths : $($dupes.Count)"
$dupes | ForEach-Object { "   $_" }
"missing on disk : $($missing.Count)"
$missing | ForEach-Object { "   $_   <- the AI would link to a 404" }
"updated         : wp-content/ai-chat.js"
