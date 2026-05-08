param(
  [string]$Source = "docs/design/claude design",
  [string]$Destination = "apps/web/design"
)

$srcRoot = (Resolve-Path $Source).Path
$dstRoot = (Resolve-Path $Destination).Path

$src = Get-ChildItem -Recurse -File $srcRoot | ForEach-Object {
  $rel = $_.FullName.Substring($srcRoot.Length + 1)
  [PSCustomObject]@{
    Rel = $rel
    Hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
  }
}

$dstMap = @{}
Get-ChildItem -Recurse -File $dstRoot | ForEach-Object {
  $rel = $_.FullName.Substring($dstRoot.Length + 1)
  $dstMap[$rel] = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
}

$mismatches = @()
foreach ($item in $src) {
  if (-not $dstMap.ContainsKey($item.Rel)) {
    $mismatches += "MISSING: $($item.Rel)"
    continue
  }
  if ($dstMap[$item.Rel] -ne $item.Hash) {
    $mismatches += "DIFF: $($item.Rel)"
  }
}

if ($mismatches.Count -gt 0) {
  Write-Host "Mismatch detected:"
  $mismatches | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "MATCH_ALL_FILES"
Write-Host "TOTAL_FILES=$($src.Count)"
